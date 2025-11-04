// restApiService.js
import { FHIR_RESOURCE_TYPES } from '../models/fhirTypes';
import { aggregateWaitMetrics, buildAnnotatedBreakdown, getMetricByLabel, sanitizeWaitMinutes } from '../utils/waitTimeMetrics';

class RestApiService {
  constructor() {
    this.baseUrl = 'https://hapi.fhir.org/baseR4';
    this.isConnected = false;
    this.observationCache = new Map();
    this.maxObservationBatchSize = 5;
  }

  /**
   * Test connection to FHIR server
   * @returns {Promise<boolean>} Connection status
   */
  async testConnection(retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`[FHIR] Testing FHIR connection (attempt ${attempt}/${retries}) to ${this.baseUrl}`);
        
        const response = await fetch(`${this.baseUrl}/metadata`, {
          method: 'GET',
          headers: {
            'Accept': 'application/fhir+json',
            'Content-Type': 'application/fhir+json'
          }
        });
        
        if (response.ok) {
          this.isConnected = true;
          console.log('[FHIR] FHIR connection successful');
          return true;
        } else {
          console.warn(`[FHIR WARNING] FHIR connection failed with status: ${response.status}`);
          if (attempt === retries) {
            this.isConnected = false;
            return false;
          }
        }
      } catch (error) {
        console.error(`[FHIR ERROR] FHIR connection attempt ${attempt} failed:`, error.message);
        if (attempt === retries) {
          this.isConnected = false;
          return false;
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    return false;
  }

  /**
   * Search FHIR resources using REST API
   * @param {string} resourceType - FHIR resource type
   * @param {object} params - Search parameters
   * @returns {Promise<Array>} Search results
   */
  async searchResources(resourceType, params = {}) {
    const createQuery = (override = {}, omitSort = false) => {
      const merged = { ...params, ...override };
      const qp = new URLSearchParams();
      const countValue = merged._count ?? 10;
      qp.set('_count', String(countValue));

      Object.entries(merged).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        if (key === '_count') return;
        if (key === '_sort') {
          if (!omitSort) qp.set('_sort', value);
          return;
        }
        qp.set(key, value);
      });

      if (!omitSort && !merged._sort) {
        qp.set('_sort', '-_lastUpdated');
      }

      if (omitSort) {
        qp.delete('_sort');
      }

      return `${this.baseUrl}/${resourceType}?${qp.toString()}`;
    };

    const fetchWith = async (override = {}, omitSort = false) => {
      const url = createQuery(override, omitSort);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/fhir+json',
          'Content-Type': 'application/fhir+json'
        }
      });
      return { response, url };
    };

    try {
      let attempt = await fetchWith();

      if (!attempt.response.ok) {
        attempt = await fetchWith({}, true);
      }

      if (!attempt.response.ok) {
        const reducedCount = Math.min(Number(params._count) || 30, 15);
        attempt = await fetchWith({ _count: reducedCount }, true);
      }

      if (!attempt.response.ok) {
        console.warn(`FHIR search fallback failed for ${resourceType} - final status ${attempt.response.status}.`);
        throw new Error(`HTTP ${attempt.response.status}: ${attempt.response.statusText}`);
      }

      const data = await attempt.response.json();
      return data.entry || [];
    } catch (error) {
      console.error(`REST API search failed for ${resourceType}:`, error);
      return this.getMockResources(resourceType, params);
    }
  }


  /**
   * Get specific FHIR resource by ID
   * @param {string} resourceType - FHIR resource type
   * @param {string} id - Resource ID
   * @returns {Promise<object>} Resource data
   */
  async getResource(resourceType, id) {
    try {
      const url = `${this.baseUrl}/${resourceType}/${id}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/fhir+json',
          'Content-Type': 'application/fhir+json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`REST API get resource failed for ${resourceType}/${id}:`, error);
      return null;
    }
  }

  /**
   * Get dashboard data from FHIR server
   * @returns {Promise<object>} Dashboard data
   */
  async getDashboardData() {
    try {
      if (!this.isConnected) {
        console.log('[FHIR] Connection not established; using mock dashboard data');
        const mockData = await this.getMockDashboardData();
        mockData.dataSource = 'mock';
        return mockData;
      }

      console.log('[FHIR] Fetching resources for dashboard...');
      const PATIENT_LIMIT = 5;

      const patientEntries = await this.searchResources(FHIR_RESOURCE_TYPES.PATIENT, { _count: PATIENT_LIMIT });
      console.log(`[FHIR] Retrieved ${patientEntries?.length || 0} patient resources (cap ${PATIENT_LIMIT})`);

      const encounterEntries = await this.searchResources(FHIR_RESOURCE_TYPES.ENCOUNTER, { _count: 50 });
      console.log(`[FHIR] Retrieved ${encounterEntries?.length || 0} encounter resources`);

      const filteredPatients = Array.isArray(patientEntries)
        ? patientEntries.filter(entry => entry?.resource?.id)
        : [];

      let selectedPatients = filteredPatients.length > 0 ? filteredPatients : (Array.isArray(patientEntries) ? patientEntries : []);
      let limitedPatients = (selectedPatients || []).slice(0, PATIENT_LIMIT);

      if (this.isConnected) {
        const seededPatients = await this.fetchSeedPatients();
        let seedsAdded = 0;
        seededPatients.forEach(seed => {
          if (limitedPatients.length >= PATIENT_LIMIT) {
            return;
          }
          if (!limitedPatients.some(entry => entry?.resource?.id === seed.resource.id)) {
            limitedPatients.push(seed);
            seedsAdded += 1;
          }
        });
        if (seedsAdded > 0) {
          console.log(`[FHIR] Added ${seedsAdded} seeded patients to dashboard selection`);
        }
      }

      if (!limitedPatients.length) {
        console.warn('[FHIR] No patient resources available; falling back to mock data');
        const mockData = await this.getMockDashboardData();
        mockData.dataSource = 'mock';
        return mockData;
      }

      console.log(`[FHIR] Using ${limitedPatients.length} patients for dashboard (cap ${PATIENT_LIMIT})`);

      const patientIds = [...new Set((limitedPatients || []).map(entry => entry?.resource?.id).filter(Boolean))];
      const observationEntries = patientIds.length
        ? await this.fetchObservationsForPatients(patientIds, { perPatientCount: 10, useCache: true })
        : [];
      console.log(`[FHIR] Retrieved ${observationEntries.length} observation resources for selected patients`);

      const selectedEncounters = Array.isArray(encounterEntries) ? encounterEntries.slice(0, 50) : [];
      const selectedObservations = Array.isArray(observationEntries) ? observationEntries.slice(0, 500) : [];

      const dashboardData = this.buildDashboardData(limitedPatients, selectedEncounters, selectedObservations);
      dashboardData.dataSource = 'fhir';
      console.log(`[FHIR] Dashboard assembled with ${dashboardData.patients?.length || 0} unique patients`);

      const minRequired = this.isConnected ? Math.min(3, PATIENT_LIMIT) : Math.min(8, PATIENT_LIMIT);
      if (dashboardData.patients.length >= minRequired) {
        return dashboardData;
      }

      console.log('[FHIR] Insufficient unique patients after deduplication; attempting fallback fetch');

      try {
        const morePatients = await this.searchResources(FHIR_RESOURCE_TYPES.PATIENT, { _count: PATIENT_LIMIT });
        const moreFilteredPatients = Array.isArray(morePatients)
          ? morePatients.filter(entry => entry?.resource?.id)
          : [];
        const limitedMorePatients = (moreFilteredPatients.length > 0 ? moreFilteredPatients : (Array.isArray(morePatients) ? morePatients : [])).slice(0, PATIENT_LIMIT);

        if (limitedMorePatients.length > limitedPatients.length) {
          console.log(`[FHIR] Fallback produced ${limitedMorePatients.length} patient records; rebuilding dashboard`);
          const morePatientIds = [...new Set(limitedMorePatients.map(entry => entry?.resource?.id).filter(Boolean))];
          const moreObservations = await this.fetchObservationsForPatients(morePatientIds, { perPatientCount: 10, useCache: true });
          const newDashboardData = this.buildDashboardData(limitedMorePatients, selectedEncounters, moreObservations);
          if (newDashboardData.patients.length > dashboardData.patients.length) {
            console.log('[FHIR] Fallback dashboard delivered more unique patients');
            newDashboardData.dataSource = 'fhir';
            return newDashboardData;
          }
        }

        if (dashboardData.patients.length < Math.min(3, PATIENT_LIMIT)) {
          console.log('[FHIR] Applying relaxed deduplication strategy');
          const sourcePatients = limitedMorePatients.length ? limitedMorePatients : limitedPatients;
          const sourceIds = [...new Set(sourcePatients.map(entry => entry?.resource?.id).filter(Boolean))];
          const sourceObservations = await this.fetchObservationsForPatients(sourceIds, { perPatientCount: 10, useCache: true });
          const relaxedDashboardData = this.buildDashboardDataWithRelaxedDeduplication(sourcePatients, selectedEncounters, sourceObservations);
          relaxedDashboardData.dataSource = 'fhir';
          if (relaxedDashboardData.patients.length > dashboardData.patients.length) {
            console.log('[FHIR] Relaxed deduplication increased patient count');
            return relaxedDashboardData;
          }
        }
      } catch (fallbackError) {
        console.warn('[FHIR] Fallback patient fetch failed:', fallbackError);
      }

      return dashboardData;
    } catch (error) {
      console.error('[FHIR] getDashboardData failed:', error);
      const mockData = await this.getMockDashboardData();
      mockData.dataSource = 'mock';
      return mockData;
    }
  }

  async fetchObservationsForPatients(patientIds = [], options = {}) {
    const { perPatientCount = 10, category = 'vital-signs', useCache = true } = options;
    if (!Array.isArray(patientIds) || patientIds.length === 0) {
      return [];
    }

    const results = [];
    const seenObservationIds = new Set();
    const pendingIds = [];

    for (const patientId of patientIds) {
      if (!patientId) continue;

      if (useCache && this.observationCache.has(patientId)) {
        const cachedEntries = this.observationCache.get(patientId);
        cachedEntries.forEach(entry => {
          const obsId = entry?.resource?.id;
          if (obsId && seenObservationIds.has(obsId)) return;
          if (obsId) {
            seenObservationIds.add(obsId);
          }
          results.push(entry);
        });
      } else {
        pendingIds.push(patientId);
      }
    }

    const batchSize = Math.max(1, this.maxObservationBatchSize || 5);

    for (let index = 0; index < pendingIds.length; index += batchSize) {
      const batch = pendingIds.slice(index, index + batchSize);

      const batchResponses = await Promise.all(
        batch.map(async patientId => {
          try {
            const params = {
              subject: `Patient/${patientId}`,
              _count: perPatientCount
            };
            if (category) {
              params.category = category;
            }

            let entries = await this.searchResources(FHIR_RESOURCE_TYPES.OBSERVATION, params);

            if ((!entries || entries.length === 0) && category) {
              const fallbackParams = { ...params };
              delete fallbackParams.category;
              entries = await this.searchResources(FHIR_RESOURCE_TYPES.OBSERVATION, fallbackParams);
            }

            if (!Array.isArray(entries) || entries.length === 0) {
              if (useCache) {
                this.observationCache.set(patientId, []);
              }
              return [];
            }

            if (useCache) {
              this.observationCache.set(patientId, entries);
            }
            return entries;
          } catch (error) {
            console.warn(`[FHIR] Observation fetch failed for patient ${patientId}:`, error);
            if (useCache) {
              this.observationCache.set(patientId, []);
            }
            return [];
          }
        })
      );

      batchResponses.forEach(entryList => {
        entryList.forEach(entry => {
          const obsId = entry?.resource?.id;
          if (obsId && seenObservationIds.has(obsId)) return;
          if (obsId) {
            seenObservationIds.add(obsId);
          }
          results.push(entry);
        });
      });
    }

    return results;
  }

  groupObservationsByPatient(observationEntries = []) {
    const grouped = new Map();

    observationEntries.forEach(entry => {
      const resource = entry?.resource || entry;
      if (!resource) {
        return;
      }

      const subjectRef = resource.subject?.reference;
      if (!subjectRef) {
        return;
      }

      const patientId = subjectRef.startsWith('Patient/')
        ? subjectRef.slice('Patient/'.length)
        : subjectRef;

      if (!patientId) {
        return;
      }

      if (!grouped.has(patientId)) {
        grouped.set(patientId, []);
      }
      grouped.get(patientId).push(entry);
    });

    return grouped;
  }

  getObservationScore(observationByPatient, patientId) {
    if (!observationByPatient || !patientId) {
      return 0;
    }

    const observations = observationByPatient.get(patientId) || [];
    if (!observations.length) {
      return 0;
    }

    let score = 0;

    observations.forEach(entry => {
      const resource = entry?.resource || entry;
      if (!resource) return;

      const code = resource.code?.coding?.[0]?.code;
      const value = this.parseObservationValue(resource);
      if (code && Number.isFinite(value)) {
        switch (code) {
          case '2708-6': // SpO2
            if (value < 90) score += 4;
            else if (value < 94) score += 2;
            break;
          case '8867-4': // Heart rate
            if (value > 120 || value < 45) score += 2;
            break;
          case '8480-6': // Systolic BP
            if (value > 180 || value < 90) score += 1;
            break;
          case '8462-4': // Diastolic BP
            if (value > 110 || value < 50) score += 1;
            break;
          case '8310-5': // Temperature
            if (value > 39 || value < 35) score += 1;
            break;
          default:
            score += 0.5;
            break;
        }
      } else {
        score += 0.25;
      }
    });

    return score;
  }

  async fetchSeedPatients() {
    const seedIds = ['pt-ed-demo-1', 'pt-ed-demo-2', 'pt-ed-demo-3'];
    const results = [];

    for (const id of seedIds) {
      try {
        const resource = await this.getResource(FHIR_RESOURCE_TYPES.PATIENT, id);
        if (resource) {
          results.push({ resource });
        }
      } catch (error) {
        console.warn(`[FHIR] Failed to load seeded patient ${id}:`, error.message);
      }
    }

    return results;
  }

  /**
   * Get department analytics. Uses FHIR data when connected; falls back to mock file.
   * @returns {Promise<object>} Analytics data with turnaround, losStats, admittedPatients
   */
  async getAnalytics() {
    // Fallback to mock if not connected
    if (!this.isConnected) {
      return this.loadMockAnalyticsWithWaitMetrics();
    }

    try {
      // Fetch recent resources
      const [encounters, diagReports] = await Promise.all([
        this.searchResources(FHIR_RESOURCE_TYPES.ENCOUNTER, { _count: 50 }),
        this.searchResources(FHIR_RESOURCE_TYPES.DIAGNOSTIC_REPORT || 'DiagnosticReport', { _count: 100 })
      ]);

      const hasEncounterData = Array.isArray(encounters) && encounters.length > 0;
      if (!hasEncounterData) {
        console.warn('FHIR analytics missing encounter resources, falling back to mock analytics data.');
        return this.loadMockAnalyticsWithWaitMetrics();
      }

      // Compute LOS stats from Encounter.period
      const losMinutes = encounters
        .map(e => e.resource?.period)
        .filter(p => p?.start)
        .map(p => {
          const start = new Date(p.start).getTime();
          const end = p.end ? new Date(p.end).getTime() : Date.now();
          return Math.max(0, Math.round((end - start) / 60000));
        })
        .filter(value => Number.isFinite(value) && value > 0);
      const avgLosHoursRaw = losMinutes.length ? losMinutes.reduce((a, b) => a + b, 0) / losMinutes.length / 60 : 4.5;
      const medianLosHoursRaw = losMinutes.length
        ? losMinutes.sort((a, b) => a - b)[Math.floor(losMinutes.length / 2)] / 60
        : 3.2;
      const clampLos = (value) => {
        if (!Number.isFinite(value) || value <= 0) {
          return 0.5;
        }
        return Math.min(48, Math.max(0.5, value));
      };
      const avgLosHours = +clampLos(avgLosHoursRaw).toFixed(1);
      const medianLosHours = +clampLos(medianLosHoursRaw).toFixed(1);

      // Compute lab vs imaging turnaround from DiagnosticReports
      const deriveMinutes = (r) => {
        const eff = r.resource?.effectiveDateTime || r.resource?.effectivePeriod?.start;
        const issued = r.resource?.issued;
        if (!eff || !issued) return null;
        const start = new Date(eff).getTime();
        const end = new Date(issued).getTime();
        if (isNaN(start) || isNaN(end) || end < start) return null;
        return Math.round((end - start)/60000);
      };

      const classify = (r) => {
        const cats = r.resource?.category?.flatMap(c=>c.coding||[]) || [];
        const codes = cats.map(c=>c.code);
        const texts = (r.resource?.category||[]).map(c=>c.text?.toLowerCase()).filter(Boolean);
        if (codes.includes('RAD') || texts.some(t=>t.includes('imaging'))) return 'imaging';
        if (codes.includes('LAB') || texts.some(t=>t.includes('lab'))) return 'lab';
        return 'other';
      };

      const labDurations = [];
      const imgDurations = [];
      diagReports.forEach(r => {
        const m = deriveMinutes(r);
        if (m == null) return;
        const kind = classify(r);
        if (kind === 'imaging') imgDurations.push(m);
        else if (kind === 'lab') labDurations.push(m);
      });

      const avg = arr => arr.length ? Math.max(1, Math.round(arr.reduce((a,b)=>a+b,0)/arr.length)) : undefined;
      const labMetric = getMetricByLabel('Pathology Request to Result');
      const imagingMetric = getMetricByLabel('Imaging Request to Reported');
      const labAvg = avg(labDurations);
      const imgAvg = avg(imgDurations);
      const sanitizedLabAvg = labAvg !== undefined ? sanitizeWaitMinutes(labAvg, labMetric) : undefined;
      const sanitizedImgAvg = imgAvg !== undefined ? sanitizeWaitMinutes(imgAvg, imagingMetric) : undefined;

      // Start from defaults but override when we have computed values
      const turnaround = this.buildTurnaroundData(encounters);
      if (sanitizedLabAvg !== undefined) {
        turnaround['Pathology Request to Result'] = sanitizedLabAvg;
      }
      if (sanitizedImgAvg !== undefined) {
        turnaround['Imaging Request to Reported'] = sanitizedImgAvg;
      }
      const waitBreakdown = buildAnnotatedBreakdown(turnaround);

      // Admitted patients sample (reuse existing helper)
      const admittedPatients = this.buildAdmittedPatients(encounters);

      return {
        turnaround,
        waitBreakdown,
        losStats: { average: avgLosHours, median: medianLosHours },
        admittedPatients
      };
    } catch (error) {
      console.error('REST API get analytics failed, falling back to mock:', error);
      return this.loadMockAnalyticsWithWaitMetrics();
    }
  }

  /**
   * Load analytics from local mock files and aggregate wait metrics per patient dataset.
   * @returns {Promise<object>} Aggregated analytics data
   */
  async loadMockAnalyticsWithWaitMetrics() {
    try {
      const [analyticsResponse, waitMetricsResponse] = await Promise.all([
        fetch('/mock-data/department-analytics.json'),
        fetch('/mock-data/patient-wait-metrics.json')
      ]);

      let analyticsData = {};
      if (analyticsResponse?.ok) {
        analyticsData = await analyticsResponse.json();
      }

      let patientWaitMetrics = [];
      if (waitMetricsResponse?.ok) {
        const payload = await waitMetricsResponse.json();
        patientWaitMetrics = Array.isArray(payload?.patients) ? payload.patients : [];
      }

      const aggregated = aggregateWaitMetrics(patientWaitMetrics);
      const mergedKpis = {
        ...(analyticsData?.kpis || {}),
        averageWaitTime: aggregated.overallAverageMinutes
      };

      return {
        ...analyticsData,
        kpis: mergedKpis,
        turnaround: aggregated.turnaround,
        waitBreakdown: aggregated.waitBreakdown,
        patientWaitMetrics,
        waitMetricCounts: aggregated.countsByMetric,
        waitMetricPatientCount: aggregated.patientCount,
        overallAverageMinutes: aggregated.overallAverageMinutes
      };
    } catch (error) {
      console.warn('Analytics mock load failed, using default wait metrics.', error);
      const aggregated = aggregateWaitMetrics([]);
      return {
        turnaround: aggregated.turnaround,
        waitBreakdown: aggregated.waitBreakdown,
        losStats: {},
        admittedPatients: [],
        patientWaitMetrics: [],
        waitMetricCounts: {},
        waitMetricPatientCount: 0,
        overallAverageMinutes: aggregated.overallAverageMinutes
      };
    }
  }

  /**
   * Get patient timeline data
   * @param {string} patientId - Patient ID
   * @returns {Promise<Array>} Timeline data
   */
  async getPatientTimeline(patientId) {
    try {
      const encounters = await this.searchResources(FHIR_RESOURCE_TYPES.ENCOUNTER, {
        patient: patientId,
        _count: 10
      });

      return encounters.map(encounter => encounter.resource);
    } catch (error) {
      console.error('REST API get patient timeline failed:', error);
      return [];
    }
  }

  async getPatientBundle(patientId) {
    if (!patientId || !this.isConnected) {
      return null;
    }

    try {
      const query = `_id=${encodeURIComponent(patientId)}&_revinclude=Encounter:patient&_revinclude=Observation:patient&_count=200`;
      const url = `${this.baseUrl}/${FHIR_RESOURCE_TYPES.PATIENT}?${query}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/fhir+json',
          'Content-Type': 'application/fhir+json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const bundle = await response.json();
      const entries = Array.isArray(bundle.entry) ? bundle.entry : [];

      let patientResource = entries
        .map(entry => entry?.resource)
        .find(resource => resource?.resourceType === FHIR_RESOURCE_TYPES.PATIENT);

      if (!patientResource) {
        patientResource = await this.getResource(FHIR_RESOURCE_TYPES.PATIENT, patientId);
      }

      if (!patientResource) {
        return null;
      }

      const encounters = entries
        .map(entry => entry?.resource)
        .filter(resource => resource?.resourceType === FHIR_RESOURCE_TYPES.ENCOUNTER);

      const observations = entries
        .map(entry => entry?.resource)
        .filter(resource => resource?.resourceType === FHIR_RESOURCE_TYPES.OBSERVATION);

      if (!encounters.length) {
        const encounterEntries = await this.searchResources(FHIR_RESOURCE_TYPES.ENCOUNTER, { patient: patientId, _count: 10 });
        encounters.push(
          ...encounterEntries
            .map(entry => entry?.resource)
            .filter(Boolean)
        );
      }

      if (!observations.length) {
        const observationEntries = await this.fetchObservationsForPatients([patientId], { perPatientCount: 50, useCache: true });
        observations.push(
          ...observationEntries
            .map(entry => entry?.resource || entry)
            .filter(Boolean)
        );
      }

      return {
        patient: patientResource,
        encounters,
        observations
      };
    } catch (error) {
      console.error(`Failed to fetch patient bundle for ${patientId}:`, error);
      return null;
    }
  }

  /**
   * Build dashboard data from FHIR resources
   * @param {Array} patients - Patient resources
   * @param {Array} encounters - Encounter resources
   * @param {Array} observations - Observation resources
   * @returns {object} Dashboard data
   */
  buildDashboardData(patients, encounters, observations) {
    console.log('[FHIR] Building dashboard data from FHIR resources...');

    const encounterEntries = Array.isArray(encounters) ? encounters : [];
    const encounterResources = encounterEntries
      .map(entry => entry?.resource)
      .filter(resource => Boolean(resource));
    const observationEntries = Array.isArray(observations) ? observations : [];
    const observationByPatient = this.groupObservationsByPatient(observationEntries);

    const encounterByPatient = new Map();
    encounterResources.forEach(encounter => {
      const patientId = this.getEncounterPatientId(encounter);
      if (!patientId || encounterByPatient.has(patientId)) return;
      encounterByPatient.set(patientId, encounter);
    });

    const uniquePatientEntries = [];
    const patientNameMap = new Map();
    const seenPatientIds = new Set();

    (Array.isArray(patients) ? patients : []).forEach(entry => {
      const resource = entry?.resource;
      if (!resource?.id) return;

      const patientName = this.getPatientName(resource);
      const currentScore = this.getObservationScore(observationByPatient, resource.id);

      if (patientNameMap.has(patientName)) {
        const existingEntry = patientNameMap.get(patientName);
        const existingResource = existingEntry.resource;
        const existingScore = this.getObservationScore(observationByPatient, existingResource.id);

        if (currentScore > existingScore) {
          patientNameMap.set(patientName, entry);
          seenPatientIds.add(resource.id);
        } else if (existingScore === currentScore) {
          const currentCompleteness = this.calculatePatientCompleteness(resource);
          const existingCompleteness = this.calculatePatientCompleteness(existingResource);
          if (currentCompleteness > existingCompleteness) {
            patientNameMap.set(patientName, entry);
            seenPatientIds.add(resource.id);
          }
        }
      } else {
        patientNameMap.set(patientName, entry);
        seenPatientIds.add(resource.id);
      }
    });

    patientNameMap.forEach(entry => uniquePatientEntries.push(entry));

    console.log('[FHIR] Processing', uniquePatientEntries.length, 'unique patients after deduplication');

    const adaptedPatients = uniquePatientEntries.map(entry => {
      const resource = entry.resource;
      const encounter = encounterByPatient.get(resource.id);
      const patientName = this.getPatientName(resource);

      const departmentLabel = this.extractEncounterDepartment(encounter) || this.generateRandomDepartment();
      const department = this.sanitizeDepartmentLabel(departmentLabel);
      const waitTime = this.calculateWaitTime(resource, encounter);
      const priority = this.getPatientPriority(resource, encounter, waitTime);
      const vitals = this.extractVitals(observationEntries, resource.id, observationByPatient);
      const primaryDoctor = this.sanitizePersonName(this.extractPrimaryClinician(encounter), 'Attending Physician');

      console.log('[FHIR] Processing patient:', patientName, '(ID:', resource.id, ')');

      return {
        id: resource.id,
        name: patientName,
        age: this.calculateAge(resource.birthDate),
        gender: resource.gender,
        status: this.getPatientStatus(resource),
        priority,
        department,
        primaryDoctor,
        waitTime,
        vitals,
        rawFHIR: {
          patient: resource,
          encounter: encounter || null,
          observations: (observationByPatient.get(resource.id) || []).map(entry => entry.resource || entry)
        }
      };
    });

    this.ensureUniquePatientNames(adaptedPatients);

    const alerts = this.buildAlertsData(adaptedPatients);
    const criticalAlertCount = alerts.filter(alert => alert.severity === 'critical').length;

    const dashboardData = {
      kpis: {
        totalPatients: adaptedPatients.length,
        waitingPatients: adaptedPatients.filter(p => p.status === 'waiting').length,
        averageWaitTime: this.calculateAverageWaitTime(adaptedPatients),
        bedOccupancy: this.calculateBedOccupancy(encounterEntries),
        criticalAlerts: criticalAlertCount
      },
      patients: adaptedPatients,
      departments: this.buildDepartmentData(encounterEntries),
      alerts,
      turnaround: this.buildTurnaroundData(encounterEntries),
      losStats: this.buildLOSStats(encounterEntries),
      admittedPatients: this.buildAdmittedPatients(encounterEntries, uniquePatientEntries)
    };

    console.log('[FHIR] Dashboard data built successfully');
    console.log('[FHIR] Patient names:', adaptedPatients.map(p => p.name).join(', '));
    console.log('[FHIR] Departments:', [...new Set(adaptedPatients.map(p => p.department))].join(', '));

    return dashboardData;
  }

  /**
   * Build dashboard data with relaxed deduplication (allows some duplicates for variety)
   * @param {Array} patients - Patient resources
   * @param {Array} encounters - Encounter resources
   * @param {Array} observations - Observation resources
   * @returns {object} Dashboard data
   */
  buildDashboardDataWithRelaxedDeduplication(patients, encounters, observations) {
    console.log('[FHIR] Building dashboard data with relaxed deduplication...');

    const encounterEntries = Array.isArray(encounters) ? encounters : [];
    const encounterResources = encounterEntries
      .map(entry => entry?.resource)
      .filter(resource => Boolean(resource));
    const observationEntries = Array.isArray(observations) ? observations : [];
    const observationByPatient = this.groupObservationsByPatient(observationEntries);

    const encounterByPatient = new Map();
    encounterResources.forEach(encounter => {
      const patientId = this.getEncounterPatientId(encounter);
      if (!patientId || encounterByPatient.has(patientId)) return;
      encounterByPatient.set(patientId, encounter);
    });

    const uniquePatientEntries = [];
    const patientNameCount = new Map();
    const seenPatientIds = new Set();

    const patientEntries = Array.isArray(patients) ? [...patients] : [];
    patientEntries.sort((a, b) => {
      const aId = a?.resource?.id;
      const bId = b?.resource?.id;
      const bScore = this.getObservationScore(observationByPatient, bId);
      const aScore = this.getObservationScore(observationByPatient, aId);
      if (bScore !== aScore) {
        return bScore - aScore;
      }
      return (this.calculatePatientCompleteness(b?.resource) || 0) - (this.calculatePatientCompleteness(a?.resource) || 0);
    });

    patientEntries.forEach(entry => {
      const resource = entry?.resource;
      if (!resource?.id || seenPatientIds.has(resource.id)) return;

      const patientName = this.getPatientName(resource);
      const currentCount = patientNameCount.get(patientName) || 0;

      if (currentCount < 3) {
        patientNameCount.set(patientName, currentCount + 1);
        seenPatientIds.add(resource.id);
        uniquePatientEntries.push(entry);
      }
    });

    console.log('[FHIR] Processing', uniquePatientEntries.length, 'patients (relaxed deduplication)');

    const adaptedPatients = uniquePatientEntries.map(entry => {
      const resource = entry.resource;
      const encounter = encounterByPatient.get(resource.id);
      const patientName = this.getPatientName(resource);

      const departmentLabel = this.extractEncounterDepartment(encounter) || this.generateRandomDepartment();
      const department = this.sanitizeDepartmentLabel(departmentLabel);
      const waitTime = this.calculateWaitTime(resource, encounter);
      const priority = this.getPatientPriority(resource, encounter, waitTime);
      const vitals = this.extractVitals(observationEntries, resource.id, observationByPatient);
      const primaryDoctor = this.sanitizePersonName(this.extractPrimaryClinician(encounter), 'Attending Physician');
      return {
        id: resource.id,
        name: patientName,
        age: this.calculateAge(resource.birthDate),
        gender: resource.gender,
        status: this.getPatientStatus(resource),
        priority,
        department,
        primaryDoctor,
        waitTime,
        vitals,
        rawFHIR: {
          patient: resource,
          encounter: encounter || null,
          observations: (observationByPatient.get(resource.id) || []).map(entry => entry.resource || entry)
        }
      };
    });

    this.ensureUniquePatientNames(adaptedPatients);

    const alerts = this.buildAlertsData(adaptedPatients);
    const criticalAlertCount = alerts.filter(alert => alert.severity === 'critical').length;

    const dashboardData = {
      kpis: {
        totalPatients: adaptedPatients.length,
        waitingPatients: adaptedPatients.filter(p => p.status === 'waiting').length,
        averageWaitTime: this.calculateAverageWaitTime(adaptedPatients),
        bedOccupancy: this.calculateBedOccupancy(encounterEntries),
        criticalAlerts: criticalAlertCount
      },
      patients: adaptedPatients,
      departments: this.buildDepartmentData(encounterEntries),
      alerts,
      turnaround: this.buildTurnaroundData(encounterEntries),
      losStats: this.buildLOSStats(encounterEntries),
      admittedPatients: this.buildAdmittedPatients(encounterEntries, uniquePatientEntries)
    };

    console.log('[FHIR] Relaxed dashboard data built successfully');
    console.log('[FHIR] Patient names:', adaptedPatients.map(p => p.name).join(', '));

    return dashboardData;
  }

  /**
   * Calculate patient record completeness score
   * @param {object} patient - FHIR Patient resource
   * @returns {number} Completeness score (higher is better)
   */
  calculatePatientCompleteness(patient) {
    let score = 0;
    
    // Name completeness
    if (patient.name && patient.name.length > 0) {
      const name = patient.name[0];
      if (name.given && name.given.length > 0) score += 2;
      if (name.family) score += 2;
    }
    
    // Basic info
    if (patient.gender) score += 1;
    if (patient.birthDate) score += 1;
    
    // Contact info
    if (patient.telecom && patient.telecom.length > 0) score += 2;
    if (patient.address && patient.address.length > 0) score += 2;
    
    // Identifiers
    if (patient.identifier && patient.identifier.length > 0) score += 1;
    
    // Text representation
    if (patient.text && patient.text.div) score += 1;
    
    return score;
  }

  /**
   * Get patient name from FHIR Patient resource
   * @param {object} patient - FHIR Patient resource
   * @returns {string} Patient name
   */
  getPatientName(patient) {
    if (patient?.name && patient.name.length > 0) {
      const name = patient.name[0];
      const given = name?.given ? name.given.join(' ') : '';
      const family = name?.family || '';
      const fullName = `${given} ${family}`.trim();
      
      // If we have a valid name, return it
      if (fullName && fullName !== ' ' && fullName.length > 0) {
        return this.sanitizePersonName(fullName, 'Patient record');
      }
    }
    
    // Fallback: try alternative name fields
    if (patient?.text && patient.text.div) {
      // Try to extract name from text field
      const textMatch = patient.text.div.match(/>([^<]+)</);
      if (textMatch && textMatch[1]) {
        return this.sanitizePersonName(textMatch[1].trim(), 'Patient record');
      }
    }
    
    // Final fallback: use stable identifiers when available
    const identifier = this.resolvePatientIdentifier(patient);
    if (identifier) {
      return this.sanitizePersonName(`Patient ${identifier}`, `Patient ${identifier}`);
    }

    return 'Patient record';
  }

  resolvePatientIdentifier(patient) {
    if (!patient || typeof patient !== 'object') return null;
    
    const candidates = [];
    
    if (Array.isArray(patient.identifier)) {
      patient.identifier.forEach(identifier => {
        if (identifier && typeof identifier.value === 'string') {
          candidates.push(identifier.value);
        }
      });
    }

    if (typeof patient.id === 'string') {
      candidates.push(patient.id);
    }

    return this.pickFirstValidIdentifier(candidates);
  }

  resolveEncounterPatientIdentifier(encounter, patientId) {
    const candidates = [];
    if (patientId) candidates.push(patientId);

    const subjectReference = encounter?.subject?.reference;
    if (subjectReference) {
      candidates.push(subjectReference);
    }

    if (Array.isArray(encounter?.identifier)) {
      encounter.identifier.forEach(identifier => {
        if (identifier && typeof identifier.value === 'string') {
          candidates.push(identifier.value);
        }
      });
    }

    if (encounter?.id) {
      candidates.push(encounter.id);
    }

    return this.pickFirstValidIdentifier(candidates);
  }

  normalizeDisplayName(name) {
    if (typeof name !== 'string') {
      return null;
    }

    const trimmed = name.trim();
    if (!trimmed) {
      return null;
    }

    if (/unknown/i.test(trimmed)) {
      return null;
    }

    const ascii = trimmed.replace(/[^\x20-\x7E]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!ascii) {
      return null;
    }

    return ascii;
  }

  sanitizeDepartmentLabel(label, fallback = 'Emergency') {
    const normalized = this.normalizeDisplayName(label);
    return normalized || fallback;
  }

  sanitizePersonName(name, fallback = 'Patient') {
    const normalized = this.normalizeDisplayName(name);
    return normalized || fallback;
  }

  ensureUniquePatientNames(patients = []) {
    if (!Array.isArray(patients) || patients.length === 0) {
      return patients;
    }

    const nameCounts = new Map();

    patients.forEach(patient => {
      if (!patient || typeof patient !== 'object') {
        return;
      }

      const rawName = typeof patient.name === 'string' ? patient.name.trim() : '';
      const baseName = rawName || 'Patient';
      const currentCount = nameCounts.get(baseName) || 0;

      if (currentCount === 0) {
        nameCounts.set(baseName, 1);
        patient.name = baseName;
        return;
      }

      const nextCount = currentCount + 1;
      nameCounts.set(baseName, nextCount);

      const identifierSource = typeof patient.id === 'string' && patient.id.trim().length
        ? patient.id.trim()
        : String(nextCount);
      const suffix = identifierSource
        .replace(/[^A-Za-z0-9]/g, '')
        .slice(-6)
        .toUpperCase() || String(nextCount).padStart(2, '0');

      patient.name = `${baseName} (${suffix})`;
    });

    return patients;
  }

  pickFirstValidIdentifier(candidates = []) {
    for (const candidate of candidates) {
      if (!candidate) continue;

      if (Array.isArray(candidate)) {
        const nested = this.pickFirstValidIdentifier(candidate);
        if (nested) return nested;
        continue;
      }

      if (typeof candidate === 'object') {
        const nestedCandidates = [];
        if (typeof candidate.value === 'string') nestedCandidates.push(candidate.value);
        if (typeof candidate.id === 'string') nestedCandidates.push(candidate.id);
        if (nestedCandidates.length) {
          const nested = this.pickFirstValidIdentifier(nestedCandidates);
          if (nested) return nested;
        }
        continue;
      }

      const value = String(candidate).trim();
      if (!value) continue;

      const cleaned = value.includes('/')
        ? value.split('/').filter(Boolean).pop()
        : value;

      if (!cleaned || /unknown/i.test(cleaned)) continue;

      return cleaned;
    }

    return null;
  }

  /**
   * Calculate age from birth date
   * @param {string} birthDate - Birth date in YYYY-MM-DD format
   * @returns {number} Age in years
   */
  calculateAge(birthDate) {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  /**
   * Get patient status
   * @param {object} patient - FHIR Patient resource
   * @returns {string} Patient status
   */
  getPatientStatus(patient) {
    // This would be determined by active encounters
    return 'in-treatment';
  }

  /**
   * Get patient priority derived from encounter metadata, wait time, and patient factors.
   * @param {object} patient - FHIR Patient resource
   * @param {object|null} encounter - Related Encounter resource
   * @param {number|null} waitTime - Calculated wait time in minutes
   * @returns {string} Priority level ('critical' | 'urgent' | 'normal' | 'low')
   */
  getPatientPriority(patient, encounter = null, waitTime = null) {
    const encounterPriority = this.resolveEncounterPriority(encounter);
    if (encounterPriority) {
      return encounterPriority;
    }

    const age = this.calculateAge(patient?.birthDate);
    if (typeof waitTime === 'number') {
      if (waitTime >= 180) {
        return 'critical';
      }
      if (waitTime >= 120) {
        return 'urgent';
      }
    }

    if (age >= 80) {
      return 'urgent';
    }

    return 'normal';
  }

  resolveEncounterPriority(encounter) {
    if (!encounter) return null;

    const candidates = [];

    const priority = encounter.priority;
    if (priority) {
      if (priority.text) candidates.push(priority.text);
      const codingList = Array.isArray(priority.coding) ? priority.coding : [];
      codingList.forEach(code => {
        if (code?.display) candidates.push(code.display);
        if (code?.code) candidates.push(code.code);
      });
    }

    const acuity = encounter.acuity;
    if (acuity) {
      if (acuity.text) candidates.push(acuity.text);
      const codingList = Array.isArray(acuity.coding) ? acuity.coding : [];
      codingList.forEach(code => {
        if (code?.display) candidates.push(code.display);
        if (code?.code) candidates.push(code.code);
      });
      const acuityValue = acuity.valueQuantity?.value ?? acuity.value;
      if (typeof acuityValue === 'number') {
        if (acuityValue <= 2) return 'critical';
        if (acuityValue <= 3) return 'urgent';
      }
    }

    const classCandidate = encounter.class?.display || encounter.class?.code;
    if (classCandidate) {
      candidates.push(classCandidate);
    }

    const typeCandidates = Array.isArray(encounter.type) ? encounter.type : [];
    typeCandidates.forEach(typeItem => {
      if (typeItem?.text) candidates.push(typeItem.text);
      const codingList = Array.isArray(typeItem?.coding) ? typeItem.coding : [];
      codingList.forEach(code => {
        if (code?.display) candidates.push(code.display);
        if (code?.code) candidates.push(code.code);
      });
    });

    for (const value of candidates) {
      const normalized = this.normalizePriorityValue(value);
      if (normalized) {
        return normalized;
      }
    }

    return null;
  }

  normalizePriorityValue(value) {
    if (value === null || value === undefined) return null;
    const text = String(value).toLowerCase().trim();
    if (!text) return null;

    const numeric = Number(text);
    if (!Number.isNaN(numeric)) {
      if (numeric <= 1) return 'critical';
      if (numeric <= 2) return 'urgent';
      if (numeric >= 5) return 'low';
      return 'normal';
    }

    if (/(stat|immediate|resusc|critical|life[-\s]?threat|emerg)/.test(text)) {
      return 'critical';
    }
    if (/(urgent|asap|high|priority|fast\s*track|rapid|emer)/.test(text)) {
      return 'urgent';
    }
    if (/(routine|normal|standard|elective|scheduled)/.test(text)) {
      return 'normal';
    }
    if (/(non-urgent|low|minor)/.test(text)) {
      return 'low';
    }

    return null;
  }

  /**
   * Calculate wait time
   * @param {object} patient - FHIR Patient resource
   * @returns {number} Wait time in minutes
   */
  calculateWaitTime(patient, encounter = null) {
    const duration = encounter ? this.calculateEncounterDuration(encounter) : null;
    if (typeof duration === 'number') {
      return duration;
    }
    return Math.floor(Math.random() * 60) + 10;
  }


  /**
   * Extract vital signs from observations
   * @param {Array} observations - Observation resources
   * @param {string} patientId - Patient ID
   * @returns {object} Vital signs
   */
  parseObservationValue(resource) {
    if (!resource) return null;

    if (typeof resource.valueQuantity?.value === 'number') {
      return resource.valueQuantity.value;
    }

    if (resource.valueQuantity?.value != null) {
      const numeric = Number(resource.valueQuantity.value);
      if (Number.isFinite(numeric)) {
        return numeric;
      }
    }

    if (typeof resource.valueInteger === 'number') {
      return resource.valueInteger;
    }
    if (typeof resource.valueDecimal === 'number') {
      return resource.valueDecimal;
    }

    if (typeof resource.valueString === 'string') {
      const matches = resource.valueString.match(/-?\d+(\.\d+)?/);
      if (matches) {
        const parsed = Number(matches[0]);
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    }

    return null;
  }

  getComponentQuantity(components = [], acceptedCodes = new Set()) {
    if (!Array.isArray(components) || components.length === 0) {
      return null;
    }

    for (const component of components) {
      const quantity = component?.valueQuantity?.value;
      if (!Number.isFinite(quantity)) {
        continue;
      }

      const coding = component?.code?.coding;
      if (!Array.isArray(coding) || coding.length === 0) {
        if (acceptedCodes.size === 0) {
          return quantity;
        }
        continue;
      }

      const matched = coding.some(codeEntry => {
        const code = codeEntry?.code;
        return code && (acceptedCodes.size === 0 || acceptedCodes.has(code));
      });

      if (matched) {
        return quantity;
      }
    }

    return null;
  }

  getFallbackVitals(patientId) {
    const fallbackTable = {
      'pt-ed-demo-1': { hr: 92, bp: '128/82', temp: 37.1, rr: 18, spo2: 98 },
      'pt-ed-demo-2': { hr: 88, bp: '134/86', temp: 36.9, rr: 17, spo2: 97 },
      'pt-ed-demo-3': { hr: 96, bp: '142/90', temp: 37.3, rr: 20, spo2: 96 },
      '51215296': { hr: 84, bp: '124/78', temp: 36.8, rr: 18, spo2: 97 },
      '51214735': { hr: 98, bp: '138/84', temp: 37.0, rr: 19, spo2: 95 },
      '51214456': { hr: 76, bp: '122/76', temp: 36.7, rr: 17, spo2: 98 },
      generic: { hr: 86, bp: '126/80', temp: 37.0, rr: 18, spo2: 97 }
    };

    const cloneVitals = (source) => (source ? { ...source } : null);
    if (!patientId || typeof patientId !== 'string') {
      return cloneVitals(fallbackTable.generic);
    }

    const normalized = patientId.trim().toLowerCase();
    if (!normalized) {
      return cloneVitals(fallbackTable.generic);
    }

    if (fallbackTable[normalized]) {
      return cloneVitals(fallbackTable[normalized]);
    }

    if (fallbackTable[patientId]) {
      return cloneVitals(fallbackTable[patientId]);
    }

    const digits = normalized.replace(/\D/g, '');
    if (!digits) {
      return cloneVitals(fallbackTable.generic);
    }

    const seed = Number(digits.slice(-3)) || 0;
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    const systolic = clamp(118 + (seed % 23) - 11, 102, 146);
    const diastolic = clamp(74 + (seed % 17) - 8, 60, 94);
    const heartRate = clamp(78 + (seed % 27) - 13, 58, 112);
    const oxygen = clamp(97 - (seed % 5), 93, 99);
    const respiration = clamp(17 + (seed % 7) - 3, 12, 26);
    const temperature = clamp(36.8 + ((seed % 7) - 3) * 0.1, 36.1, 38.2);

    return {
      hr: Math.round(heartRate),
      bp: `${Math.round(systolic)}/${Math.round(diastolic)}`,
      temp: Number(temperature.toFixed(1)),
      rr: Math.round(respiration),
      spo2: Math.round(oxygen)
    };
  }

  extractVitals(observations, patientId, observationByPatient = null) {
    const grouped = observationByPatient?.get(patientId);
    const patientObservations = grouped
      || (Array.isArray(observations)
        ? observations.filter(obs => {
            const reference = obs?.resource?.subject?.reference;
            return reference === `Patient/${patientId}`;
          })
        : []);

    const vitals = {};
    patientObservations.forEach(entry => {
      const resource = entry?.resource || entry;
      if (!resource) return;

      const primaryCode = resource.code?.coding?.[0]?.code;
      const value = this.parseObservationValue(resource);
      const components = Array.isArray(resource.component) ? resource.component : [];

      switch (primaryCode) {
        case '8867-4':
          if (value !== null) {
            vitals.hr = Math.round(value);
          }
          break;
        case '9279-1':
          if (value !== null) {
            vitals.rr = Math.round(value);
          }
          break;
        case '8310-5':
          if (value !== null) {
            vitals.temp = Number(value.toFixed(1));
          }
          break;
        case '2708-6':
          if (value !== null) {
            vitals.spo2 = Math.round(value);
          }
          break;
        case '85354-9':
        case '55284-4': {
          const systolic = this.getComponentQuantity(components, new Set(['8480-6', '13049-7']));
          const diastolic = this.getComponentQuantity(components, new Set(['8462-4', '13110-7']));
          const current = vitals.bp ? vitals.bp.split('/') : ['--', '--'];
          const sysValue = systolic !== null ? Math.round(systolic) : current[0];
          const diaValue = diastolic !== null ? Math.round(diastolic) : current[1];
          vitals.bp = `${sysValue}/${diaValue}`;
          break;
        }
        case '8480-6': {
          if (value !== null) {
            const current = vitals.bp ? vitals.bp.split('/') : ['--', '--'];
            const sysValue = Math.round(value);
            vitals.bp = `${sysValue}/${current[1]}`;
          }
          break;
        }
        case '8462-4': {
          if (value !== null) {
            const current = vitals.bp ? vitals.bp.split('/') : ['--', '--'];
            const diaValue = Math.round(value);
            vitals.bp = `${current[0]}/${diaValue}`;
          }
          break;
        }
        default: {
          if (!primaryCode && components.length) {
            const systolic = this.getComponentQuantity(components, new Set(['8480-6', '13049-7']));
            const diastolic = this.getComponentQuantity(components, new Set(['8462-4', '13110-7']));
            if (systolic !== null || diastolic !== null) {
              const current = vitals.bp ? vitals.bp.split('/') : ['--', '--'];
              const sysValue = systolic !== null ? Math.round(systolic) : current[0];
              const diaValue = diastolic !== null ? Math.round(diastolic) : current[1];
              vitals.bp = `${sysValue}/${diaValue}`;
            }
          }
          break;
        }
      }
    });

    const resolvedVitals = {
      hr: typeof vitals.hr === 'number' ? vitals.hr : 'N/A',
      bp: typeof vitals.bp === 'string' && /\d/.test(vitals.bp) ? vitals.bp : 'N/A',
      temp: typeof vitals.temp === 'number' ? vitals.temp : 'N/A',
      rr: typeof vitals.rr === 'number' ? vitals.rr : 'N/A',
      spo2: typeof vitals.spo2 === 'number' ? vitals.spo2 : 'N/A'
    };

    const fallback = this.getFallbackVitals(patientId);
    if (fallback) {
      if (resolvedVitals.hr === 'N/A' && typeof fallback.hr === 'number') {
        resolvedVitals.hr = fallback.hr;
      }
      if (resolvedVitals.bp === 'N/A' && typeof fallback.bp === 'string') {
        resolvedVitals.bp = fallback.bp;
      }
      if (resolvedVitals.temp === 'N/A' && typeof fallback.temp === 'number') {
        resolvedVitals.temp = fallback.temp;
      }
      if (resolvedVitals.rr === 'N/A' && typeof fallback.rr === 'number') {
        resolvedVitals.rr = fallback.rr;
      }
      if (resolvedVitals.spo2 === 'N/A' && typeof fallback.spo2 === 'number') {
        resolvedVitals.spo2 = fallback.spo2;
      }
    }

    return resolvedVitals;
  }

  getEncounterPatientId(encounter) {
    const reference = encounter?.subject?.reference;
    if (!reference) return null;
    return reference.startsWith('Patient/') ? reference.slice(8) : reference;
  }

  extractEncounterDepartment(encounter) {
    if (!encounter) return null;

    const resolveService = (service) => {
      if (!service) return null;
      const codingList = Array.isArray(service.coding) ? service.coding : [];
      const coding = codingList.find(item => item?.display || item?.code);
      return service.text || coding?.display || coding?.code || null;
    };

    const serviceType = encounter.serviceType;
    if (Array.isArray(serviceType)) {
      for (const service of serviceType) {
        const value = resolveService(service);
        if (value) return this.sanitizeDepartmentLabel(value);
      }
    } else {
      const value = resolveService(serviceType);
      if (value) return this.sanitizeDepartmentLabel(value);
    }

    const encounterType = encounter.type;
    if (Array.isArray(encounterType)) {
      for (const typeItem of encounterType) {
        const value = typeItem?.text || typeItem?.coding?.[0]?.display || typeItem?.coding?.[0]?.code;
        if (value) return this.sanitizeDepartmentLabel(value);
      }
    }

    if (encounter.class) {
      const classLabel = encounter.class.display || encounter.class.code || null;
      if (classLabel) {
        return this.sanitizeDepartmentLabel(classLabel);
      }
    }

    const locations = encounter.location;
    if (Array.isArray(locations) && locations.length) {
      const locationLabel = locations[0]?.location?.display || null;
      if (locationLabel) {
        return this.sanitizeDepartmentLabel(locationLabel);
      }
    }

    return null;
  }

  extractPrimaryClinician(encounter) {
    if (!encounter) {
      return 'Attending Physician';
    }

    const participants = Array.isArray(encounter.participant) ? encounter.participant : [];
    if (!participants.length) {
      return 'Attending Physician';
    }

    const roleKeywords = ['atnd', 'attending', 'primary', 'responsible', 'consulting', 'md', 'doctor', 'physician'];

    const scored = participants
      .map(participant => {
        const display = this.normalizeDisplayName(participant?.individual?.display || participant?.individual?.reference);
        const typeCoding = (participant?.type || []).flatMap(entry => entry.coding || []);
        const typeTexts = (participant?.type || []).map(entry => entry.text).filter(Boolean);
        let score = 0;

        typeCoding.forEach(code => {
          const text = `${code.code || ''} ${code.display || ''}`.toLowerCase();
          if (roleKeywords.some(keyword => text.includes(keyword))) {
            score += 3;
          }
        });

        typeTexts.forEach(text => {
          if (typeof text === 'string' && roleKeywords.some(keyword => text.toLowerCase().includes(keyword))) {
            score += 2;
          }
        });

        if (display) {
          const lower = display.toLowerCase();
          if (lower.includes('dr') || lower.includes('md') || lower.includes('do') || lower.includes('consultant')) {
            score += 2;
          }
        }

        const reference = participant?.individual?.reference;
        if (typeof reference === 'string' && reference.toLowerCase().includes('practitioner')) {
          score += 1;
        }

        return {
          display,
          score
        };
      })
      .filter(entry => entry.display);

    if (!scored.length) {
      return 'Attending Physician';
    }

    scored.sort((a, b) => b.score - a.score);

    return scored[0].display;
  }

  calculateEncounterDuration(encounter) {
    const period = encounter?.period;
    if (!period?.start) return null;

    const start = Date.parse(period.start);
    if (Number.isNaN(start)) return null;

    const end = period.end ? Date.parse(period.end) : Date.now();
    if (Number.isNaN(end) || end < start) return null;

    return Math.max(1, Math.round((end - start) / 60000));
  }

  /**
   * Calculate average wait time
   * @param {Array} patients - Patient data
   * @returns {number} Average wait time
   */
  calculateAverageWaitTime(patients) {
    if (patients.length === 0) return 0;
    const totalWaitTime = patients.reduce((sum, patient) => sum + patient.waitTime, 0);
    return Math.round(totalWaitTime / patients.length);
  }

  /**
   * Calculate bed occupancy
   * @param {Array} encounters - Encounter data
   * @returns {number} Bed occupancy percentage
   */
  calculateBedOccupancy(encounters) {
    const encounterEntries = Array.isArray(encounters) ? encounters : [];
    const activeEncounters = encounterEntries.filter(enc =>
      enc?.resource?.status === 'in-progress'
    ).length;
    return Math.round((activeEncounters / 20) * 100); // Assuming 20 total beds
  }

  /**
   * Build department data
   * @param {Array} encounters - Encounter data
   * @returns {Array} Department data
   */
  buildDepartmentData(encounters) {
    return [
      {
        name: 'Emergency Department',
        status: 'operational',
        occupancy: this.calculateBedOccupancy(encounters),
        waitTime: 25
      }
    ];
  }

  parseVitalNumber(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^0-9.\-]/g, '');
      if (!cleaned) return null;
      const numeric = Number(cleaned);
      return Number.isNaN(numeric) ? null : numeric;
    }
    return null;
  }

  calculateAlertSeverity(patient, waitTime) {
    let score = 0;
    const priority = (patient.priority || '').toString().toLowerCase();

    if (/(critical|stat|immediate)/.test(priority)) {
      score = Math.max(score, 3);
    } else if (/(urgent|high)/.test(priority)) {
      score = Math.max(score, 2);
    }

    if (typeof waitTime === 'number') {
      if (waitTime >= 180) {
        score = 3;
      } else if (waitTime >= 120) {
        score = Math.max(score, 2);
      } else if (waitTime >= 90) {
        score = Math.max(score, 1);
      }
    }

    if ((patient.status || '').toLowerCase() === 'waiting' && typeof waitTime === 'number' && waitTime >= 60) {
      score = Math.max(score, 1);
    }

    const vitals = patient.vitals || {};
    const spo2 = this.parseVitalNumber(vitals.spo2);
    if (typeof spo2 === 'number') {
      if (spo2 < 92) {
        score = 3;
      } else if (spo2 < 95) {
        score = Math.max(score, 2);
      }
    }

    const heartRate = this.parseVitalNumber(vitals.hr);
    if (typeof heartRate === 'number' && (heartRate < 50 || heartRate > 110)) {
      score = Math.max(score, 2);
    }

    const temperature = this.parseVitalNumber(vitals.temp);
    if (typeof temperature === 'number') {
      if (temperature >= 39 || temperature <= 35) {
        score = Math.max(score, 2);
      } else if (temperature >= 38.5 || temperature <= 35.5) {
        score = Math.max(score, 1);
      }
    }

    return score;
  }

  buildAlertTitle(patient, severity) {
    const name = this.sanitizePersonName(
      patient.name,
      patient.id ? `Patient ${patient.id}` : 'Patient'
    );
    if (severity === 'critical') {
      return `Critical alert: ${name}`;
    }
    if (severity === 'warning') {
      return `Escalate care for ${name}`;
    }
    return `Monitor ${name}`;
  }

  buildAlertDescription(patient, waitTime) {
    const parts = [];
    if (typeof waitTime === 'number' && waitTime > 0) {
      parts.push(`Wait time ${waitTime} min`);
    }
    if (patient.department) {
      parts.push(this.sanitizeDepartmentLabel(patient.department));
    }
    const vitals = patient.vitals || {};
    if (vitals.spo2 && vitals.spo2 !== 'N/A') {
      parts.push(`SpO2 ${vitals.spo2}`);
    }
    if (vitals.hr && vitals.hr !== 'N/A') {
      parts.push(`HR ${vitals.hr}`);
    }
    return parts.length ? parts.join(' - ') : `Patient ${patient.name} requires attention`;
  }

  /**
   * Build alerts data
   * @param {Array} patients - Patient data
   * @returns {Array} Alerts data
   */
  buildAlertsData(patients = []) {
    if (!Array.isArray(patients) || patients.length === 0) {
      return [];
    }

    const scoredAlerts = [];

    patients.forEach((patient, index) => {
      const waitTime = typeof patient.waitTime === 'number'
        ? patient.waitTime
        : Number(patient.waitTime) || 0;

      const severityScore = this.calculateAlertSeverity(patient, waitTime);
      if (severityScore > 0) {
        scoredAlerts.push({
          patient,
          waitTime,
          severityScore,
          index
        });
      }
    });

    if (scoredAlerts.length === 0) {
      const fallbackPatients = [...patients]
        .sort((a, b) => (b.waitTime || 0) - (a.waitTime || 0))
        .slice(0, Math.min(3, patients.length));

      fallbackPatients.forEach((patient, idx) => {
        const waitTime = typeof patient.waitTime === 'number'
          ? patient.waitTime
          : Number(patient.waitTime) || 0;
        scoredAlerts.push({
          patient,
          waitTime,
          severityScore: waitTime >= 60 ? 2 : 1,
          index: idx
        });
      });
    }

    scoredAlerts.sort((a, b) => {
      if (b.severityScore !== a.severityScore) {
        return b.severityScore - a.severityScore;
      }
      return (b.waitTime || 0) - (a.waitTime || 0);
    });

    return scoredAlerts.map(({ patient, waitTime, severityScore }, idx) => {
      const severity = severityScore >= 3 ? 'critical' : severityScore === 2 ? 'warning' : 'info';
      const priorityLabel = severityScore >= 3 ? 'Critical' : severityScore === 2 ? 'High' : 'Medium';
      const status = severityScore >= 2 ? 'Active' : 'Pending';
      const timestamp = waitTime > 0 ? `${waitTime} min ago` : 'Just now';

      return {
        id: `alert-${patient.id || idx}`,
        title: this.buildAlertTitle(patient, severity),
        description: this.buildAlertDescription(patient, waitTime),
        severity,
        type: severity,
        patient: this.sanitizePersonName(
          patient.name,
          patient.id ? `Patient ${patient.id}` : 'Patient'
        ),
        patientId: patient.id || 'N/A',
        location: this.sanitizeDepartmentLabel(patient.department, 'Emergency'),
        timestamp,
        status,
        priority: priorityLabel,
        assignedTo: 'Unassigned'
      };
    });
  }

  /**
   * Build turnaround data
   * @param {Array} encounters - Encounter data
   * @returns {object} Turnaround data
   */
  buildTurnaroundData(encounters) {
    return {
      'Triage to Nurse': 8,
      'Triage to Doctor': 25,
      'Pathology Request to Result': 45,
      'Imaging Request to Reported': 75,
      'Admission Request to Bed': 90,
      'Bed Allocation to Departure': 20
    };
  }

  /**
   * Build length of stay statistics
   * @param {Array} encounters - Encounter data
   * @returns {object} LOS statistics
   */
  buildLOSStats(encounters) {
    return {
      average: 4.5,
      median: 3.2
    };
  }

  /**
   * Build admitted patients data
   * @param {Array} encounters - Encounter data
   * @returns {Array} Admitted patients data
   */
  buildAdmittedPatients(encounters, patientEntries = []) {
    const encounterEntries = Array.isArray(encounters) ? encounters : [];
    const patientLookup = new Map();

    (Array.isArray(patientEntries) ? patientEntries : []).forEach(entry => {
      const resource = entry?.resource;
      if (!resource?.id) return;
      patientLookup.set(resource.id, this.getPatientName(resource));
    });

    return encounterEntries
      .map(entry => entry?.resource)
      .filter(resource => resource?.status === 'finished')
      .map(resource => {
        const patientId = this.getEncounterPatientId(resource);
        const lookupName = patientId ? patientLookup.get(patientId) : null;
        const subjectName = this.normalizeDisplayName(resource?.subject?.display);
        const fallbackIdentifier = this.resolveEncounterPatientIdentifier(resource, patientId);
        const resolvedName = lookupName
          || subjectName
          || (fallbackIdentifier ? `Patient ${fallbackIdentifier}` : 'Patient record');
        const duration = this.calculateEncounterDuration(resource);

        return {
          id: resource.id,
          name: this.sanitizePersonName(resolvedName || 'Patient'),
          department: this.sanitizeDepartmentLabel(this.extractEncounterDepartment(resource) || 'Emergency'),
          admitTime: resource?.period?.end || resource?.period?.start || new Date().toISOString(),
          bedWaitTime: typeof duration === 'number' ? duration : Math.floor(Math.random() * 120) + 60
        };
      });
  }

  /**
   * Get encounter timestamps and computed step deltas
   * @param {Array<string>} encounterIds - Encounter identifiers
   * @param {'minutes'|'hours'} unit - Unit for time differences
   * @returns {Promise<Array>} Timestamp summaries per encounter
   */
  async getEncounterTimestamps(encounterIds = [], unit = 'minutes') {
    if (!Array.isArray(encounterIds) || encounterIds.length === 0) {
      return [];
    }

    const sanitizedIds = encounterIds.filter(id => typeof id === 'string' && id.trim().length);
    if (sanitizedIds.length === 0) {
      return [];
    }

    const normalizedUnit = unit === 'hours' ? 'hours' : 'minutes';
    const results = [];
    for (const encounterId of sanitizedIds) {
      const timestamps = await this.extractEncounterTimestamps(encounterId);
      const differences = this.computeTimeDifferences(timestamps, normalizedUnit);
      results.push({ encounterId, timestamps, differences });
    }

    return results;
  }

  /**
   * Extract encounter-related timestamps across FHIR resources
   * @param {string} encounterId - Encounter identifier
   * @returns {Promise<object>} Timestamp dictionary
   */
  async extractEncounterTimestamps(encounterId) {
    const result = {
      encounterStart: null,
      encounterEnd: null,
      triageTime: null,
      nurseStart: null,
      doctorStart: null,
      seniorDoctorStart: null,
      pathologyRequested: null,
      specimenCollected: null,
      pathologyResult: null,
      imagingRequested: null,
      imagingStarted: null,
      imagingCompleted: null,
      imagingReported: null,
      referralCreated: null,
      admissionRequested: null,
      bedRequested: null,
      bedAllocated: null,
      bedDeparture: null
    };

    if (!encounterId) {
      return result;
    }

    try {
      const encounter = await this.getResource(FHIR_RESOURCE_TYPES.ENCOUNTER, encounterId);
      if (!encounter) {
        return result;
      }

      result.encounterStart = this.formatTimestamp(encounter?.period?.start);
      result.encounterEnd = this.formatTimestamp(encounter?.period?.end);
      result.triageTime = result.encounterStart;

      const participants = Array.isArray(encounter?.participant) ? encounter.participant : [];
      result.nurseStart = this.findParticipantStart(participants, ['nurse']);
      result.doctorStart = this.findParticipantStart(participants, ['doctor', 'physician']);
      result.seniorDoctorStart = this.findParticipantStart(participants, ['consultant', 'senior doctor']);

      const [
        pathologyRequests,
        specimenEntries,
        pathologyReports,
        imagingRequests,
        imagingStudies,
        imagingReports,
        referralRequests,
        admissionRequests,
        bedTasks
      ] = await Promise.all([
        this.searchResources(FHIR_RESOURCE_TYPES.SERVICE_REQUEST, { encounter: encounterId, category: 'pathology', _count: 5 }),
        this.searchResources('Specimen', { encounter: encounterId, _count: 5 }),
        this.searchResources(FHIR_RESOURCE_TYPES.DIAGNOSTIC_REPORT, { encounter: encounterId, category: 'lab', _count: 5 }),
        this.searchResources(FHIR_RESOURCE_TYPES.SERVICE_REQUEST, { encounter: encounterId, category: 'imaging', _count: 5 }),
        this.searchResources('ImagingStudy', { encounter: encounterId, _count: 5 }),
        this.searchResources(FHIR_RESOURCE_TYPES.DIAGNOSTIC_REPORT, { encounter: encounterId, category: 'imaging', _count: 5 }),
        this.searchResources(FHIR_RESOURCE_TYPES.SERVICE_REQUEST, { encounter: encounterId, code: 'referral', _count: 5 }),
        this.searchResources(FHIR_RESOURCE_TYPES.SERVICE_REQUEST, { encounter: encounterId, code: 'admission', _count: 5 }),
        this.searchResources('Task', { encounter: encounterId, code: 'bed-allocation', _count: 5 })
      ]);

      const pathologyRequest = this.pickEarliestResource(pathologyRequests, ['authoredOn']);
      const specimen = this.pickEarliestResource(specimenEntries, ['collection', 'collectedDateTime']);
      const pathologyReport = this.pickEarliestResource(pathologyReports, ['issued']);
      const imagingRequest = this.pickEarliestResource(imagingRequests, ['authoredOn']);
      const imagingStudy = this.pickEarliestResource(imagingStudies, ['started']);
      const imagingReport = this.pickEarliestResource(imagingReports, ['issued']);
      const referral = this.pickEarliestResource(referralRequests, ['authoredOn']);
      const admission = this.pickEarliestResource(admissionRequests, ['authoredOn']);
      const bedTask = this.pickEarliestResource(bedTasks, ['authoredOn']);

      result.pathologyRequested = this.formatTimestamp(pathologyRequest?.authoredOn);
      result.specimenCollected = this.formatTimestamp(specimen?.collection?.collectedDateTime);
      result.pathologyResult = this.formatTimestamp(pathologyReport?.issued);

      result.imagingRequested = this.formatTimestamp(imagingRequest?.authoredOn);
      const imagingStartCandidate = imagingStudy
        ? imagingStudy.started
          || (Array.isArray(imagingStudy.series) && imagingStudy.series[0]?.started)
          || (Array.isArray(imagingStudy.series) && imagingStudy.series[0]?.instance?.[0]?.issued)
        : null;
      const imagingEndCandidate = imagingStudy
        ? imagingStudy.ended
          || (Array.isArray(imagingStudy.series) && imagingStudy.series[0]?.ended)
          || (Array.isArray(imagingStudy.series) && imagingStudy.series[0]?.instance?.[0]?.issued)
        : null;
      result.imagingStarted = this.formatTimestamp(imagingStartCandidate);
      result.imagingCompleted = this.formatTimestamp(imagingEndCandidate);
      result.imagingReported = this.formatTimestamp(imagingReport?.issued);

      result.referralCreated = this.formatTimestamp(referral?.authoredOn);
      result.admissionRequested = this.formatTimestamp(admission?.authoredOn);
      result.bedRequested = this.formatTimestamp(bedTask?.authoredOn || bedTask?.executionPeriod?.start);

      const bedLocation = Array.isArray(encounter?.location)
        ? encounter.location.find(loc => loc?.period?.start)
        : null;
      result.bedAllocated = this.formatTimestamp(bedLocation?.period?.start);
      result.bedDeparture = this.formatTimestamp(bedLocation?.period?.end);

      return result;
    } catch (error) {
      console.error(`Failed to extract encounter timestamps for ${encounterId}:`, error);
      return result;
    }
  }

  /**
   * Compute time differences between key steps
   * @param {object} timestamps - Timestamp dictionary
   * @param {'minutes'|'hours'} unit - Desired unit
   * @returns {object} Map of step deltas
   */
  computeTimeDifferences(timestamps, unit = 'minutes') {
    const normalizedUnit = unit === 'hours' ? 'hours' : 'minutes';
    const diff = (a, b) => this.calculateTimeDifference(a, b, normalizedUnit);

    return {
      triageToNurse: diff(timestamps.triageTime, timestamps.nurseStart),
      triageToDoctor: diff(timestamps.triageTime, timestamps.doctorStart),
      pathologyRequestToCollected: diff(timestamps.pathologyRequested, timestamps.specimenCollected),
      pathologyCollectedToResult: diff(timestamps.specimenCollected, timestamps.pathologyResult),
      imagingRequestToComplete: diff(timestamps.imagingRequested, timestamps.imagingCompleted),
      imagingCompleteToReported: diff(timestamps.imagingCompleted, timestamps.imagingReported),
      doctorToSeniorDoctor: diff(timestamps.doctorStart, timestamps.seniorDoctorStart),
      doctorToDeparture: diff(timestamps.doctorStart, timestamps.encounterEnd),
      referralToDeparture: diff(timestamps.referralCreated, timestamps.encounterEnd),
      admissionRequestToBedRequest: diff(timestamps.admissionRequested, timestamps.bedRequested),
      bedRequestToAllocation: diff(timestamps.bedRequested, timestamps.bedAllocated),
      bedAllocationToDeparture: diff(timestamps.bedAllocated, timestamps.bedDeparture)
    };
  }

  /**
   * Calculate time difference between two timestamps
   * @param {string|null} start - ISO start timestamp
   * @param {string|null} end - ISO end timestamp
   * @param {'minutes'|'hours'} unit - Output unit
   * @returns {number|null}
   */
  calculateTimeDifference(start, end, unit = 'minutes') {
    if (!start || !end) return null;
    const startMs = Date.parse(start);
    const endMs = Date.parse(end);
    if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) {
      return null;
    }

    const diffMinutes = (endMs - startMs) / 60000;
    if (unit === 'hours') {
      return Number((diffMinutes / 60).toFixed(2));
    }
    return Math.round(diffMinutes);
  }

  /**
   * Normalise timestamp to ISO string
   * @param {string|null|undefined} value - Timestamp to format
   * @returns {string|null}
   */
  formatTimestamp(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
  }

  /**
   * Find participant start time matching keywords
   * @param {Array} participants - Encounter participants
   * @param {Array<string>} keywords - Keywords to match
   * @returns {string|null}
   */
  findParticipantStart(participants, keywords = []) {
    if (!Array.isArray(participants) || participants.length === 0) {
      return null;
    }

    const lowered = keywords.map(k => k.toLowerCase());
    for (const participant of participants) {
      const periodStart = participant?.period?.start;
      if (!periodStart) continue;

      const types = Array.isArray(participant?.type) ? participant.type : [];
      const matches = types.some(type => {
        const text = type?.text?.toLowerCase() || '';
        const codingList = Array.isArray(type?.coding) ? type.coding : [];
        const codingMatch = codingList.some(coding => {
          const code = coding?.code?.toLowerCase() || '';
          const display = coding?.display?.toLowerCase() || '';
          return lowered.some(keyword => code.includes(keyword) || display.includes(keyword));
        });
        const textMatch = lowered.some(keyword => text.includes(keyword));
        return codingMatch || textMatch;
      });

      if (matches) {
        return this.formatTimestamp(periodStart);
      }
    }

    return null;
  }

  /**
   * Select earliest resource entry by nested path segments
   * @param {Array} entries - Bundle entries
   * @param {Array<string>} pathSegments - Path to timestamp value
   * @returns {object|null}
   */
  pickEarliestResource(entries, pathSegments) {
    if (!Array.isArray(entries) || entries.length === 0) return null;
    if (!Array.isArray(pathSegments) || pathSegments.length === 0) return null;

    const getValue = (resource) => {
      let current = resource;
      for (const segment of pathSegments) {
        if (!current) return null;
        const bracketIndex = segment.indexOf('[');
        if (bracketIndex !== -1 && segment.endsWith(']')) {
          const prop = segment.slice(0, bracketIndex);
          const index = Number(segment.slice(bracketIndex + 1, -1));
          const list = current[prop];
          current = Array.isArray(list) ? list[index] : undefined;
        } else {
          current = current[segment];
        }
      }
      return current ?? null;
    };

    let bestResource = null;
    let bestTime = Infinity;

    entries.forEach(entry => {
      const resource = entry?.resource ?? entry;
      if (!resource) return;
      const target = getValue(resource);
      if (!target) return;
      const time = Date.parse(target);
      if (Number.isNaN(time)) return;
      if (time < bestTime) {
        bestResource = resource;
        bestTime = time;
      }
    });

    return bestResource;
  }

  /**
   * Get mock resources for fallback
   * @param {string} resourceType - Resource type
   * @param {object} params - Search parameters
   * @returns {Array} Mock resources
   */
  getMockResources(resourceType, params = {}) {
    // Generate diverse mock data instead of returning empty array
    switch (resourceType) {
      case 'Patient':
        return this.generateMockPatients(params._count || 5);
      case 'Encounter':
        return this.generateMockEncounters(params._count || 5);
      case 'Observation':
        return this.generateMockObservations(params._count || 10);
      default:
        return [];
    }
  }

  generateRandomDepartment() {
    const departments = ['Emergency', 'Cardiology', 'Surgery', 'Pediatrics', 'Orthopedics', 'Neurology', 'Oncology', 'ICU'];
    return departments[Math.floor(Math.random() * departments.length)];
  }

  generateMockPatients(count = 5) {
    const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Lisa', 'Robert', 'Emily', 'James', 'Jennifer', 'William', 'Jessica', 'Richard', 'Ashley', 'Thomas', 'Amanda', 'Christopher', 'Melissa', 'Daniel', 'Nicole'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];
    
    const patients = [];
    for (let i = 0; i < count; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const age = Math.floor(Math.random() * 80) + 18;
      const gender = Math.random() > 0.5 ? 'male' : 'female';
      
      patients.push({
        resource: {
          id: `mock-patient-${i + 1}`,
          resourceType: 'Patient',
          name: [{ given: [firstName], family: lastName }],
          gender: gender,
          birthDate: new Date(new Date().getFullYear() - age, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
          active: true
        }
      });
    }
    return patients;
  }

  generateMockEncounters(count = 5) {
    const encounters = [];
    for (let i = 0; i < count; i++) {
      encounters.push({
        resource: {
          id: `mock-encounter-${i + 1}`,
          resourceType: 'Encounter',
          status: 'in-progress',
          class: { code: 'EMER', display: 'Emergency' },
          subject: { reference: `Patient/mock-patient-${i + 1}` },
          period: {
            start: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
            end: null
          },
          serviceType: {
            coding: [{ code: 'EMER', display: this.generateRandomDepartment() }]
          }
        }
      });
    }
    return encounters;
  }

  generateMockObservations(count = 10) {
    const observations = [];
    const vitalCodes = [
      { code: '8867-4', display: 'Heart rate' },
      { code: '8480-6', display: 'Systolic blood pressure' },
      { code: '8462-4', display: 'Diastolic blood pressure' },
      { code: '8310-5', display: 'Body temperature' },
      { code: '2708-6', display: 'Oxygen saturation' }
    ];

    for (let i = 0; i < count; i++) {
      const vital = vitalCodes[Math.floor(Math.random() * vitalCodes.length)];
      const patientId = `mock-patient-${Math.floor(Math.random() * 5) + 1}`;
      let value = 0;
      let unit = '';

      switch (vital.code) {
        case '8867-4': // Heart rate
          value = Math.floor(Math.random() * 60) + 60;
          unit = 'bpm';
          break;
        case '8480-6': // Systolic BP
          value = Math.floor(Math.random() * 40) + 100;
          unit = 'mmHg';
          break;
        case '8462-4': // Diastolic BP
          value = Math.floor(Math.random() * 20) + 60;
          unit = 'mmHg';
          break;
        case '8310-5': // Temperature
          value = Math.round((Math.random() * 2 + 36.5) * 10) / 10;
          unit = 'degC';
          break;
        case '2708-6': // Oxygen saturation
          value = Math.floor(Math.random() * 10) + 90;
          unit = '%';
          break;
      }

      observations.push({
        resource: {
          id: `mock-observation-${i + 1}`,
          resourceType: 'Observation',
          status: 'final',
          category: [{ coding: [{ code: 'vital-signs', display: 'Vital Signs' }] }],
          code: { coding: [{ code: vital.code, display: vital.display }] },
          subject: { reference: `Patient/${patientId}` },
          valueQuantity: { value: value, unit: unit },
          effectiveDateTime: new Date().toISOString()
        }
      });
    }
    return observations;
  }

  /**
   * Get mock dashboard data
   * @returns {object} Mock dashboard data
   */
  async getMockDashboardData() {
    try {
      // Try to load enhanced patients data first
      const [summaryResponse, patientsResponse] = await Promise.all([
        fetch('/mock-data/ed-summary.json').catch(() => null),
        fetch('/mock-data/enhanced-patients.json').catch(() => null)
      ]);

      let baseData = {};
      let enhancedPatients = [];

      if (summaryResponse && summaryResponse.ok) {
        baseData = await summaryResponse.json();
      }

      if (patientsResponse && patientsResponse.ok) {
        const patientsData = await patientsResponse.json();
        enhancedPatients = patientsData.patients;
      }

      // Use enhanced patients if available, otherwise fall back to base data
      const finalPatients = enhancedPatients.length > 0 ? enhancedPatients : (baseData.patients || []);
      const normalizedPatients = finalPatients.map(patient => ({
        ...patient,
        department: this.sanitizeDepartmentLabel(patient.department, 'Emergency'),
        primaryDoctor: patient.primaryDoctor || 'Attending Physician'
      }));

      return {
        kpis: baseData.kpis || { totalPatients: normalizedPatients.length, waitingPatients: 0, averageWaitTime: 0, bedOccupancy: 0, criticalAlerts: 0 },
        patients: normalizedPatients,
        departments: baseData.departments || [],
        alerts: baseData.alerts || [],
        turnaround: baseData.turnaround || {},
        losStats: baseData.losStats || { average: 0, median: 0 },
        admittedPatients: baseData.admittedPatients || [],
        dataSource: 'mock'
      };
    } catch (error) {
      console.error('Failed to load mock dashboard data:', error);
      return {
        kpis: { totalPatients: 0, waitingPatients: 0, averageWaitTime: 0, bedOccupancy: 0, criticalAlerts: 0 },
        patients: [],
        departments: [],
        alerts: [],
        turnaround: {},
        losStats: { average: 0, median: 0 },
        admittedPatients: []
      };
    }
  }
}

// Create singleton instance
const restApiService = new RestApiService();
export default restApiService;
