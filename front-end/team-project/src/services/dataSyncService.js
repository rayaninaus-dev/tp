// dataSyncService.js
// Unified data synchronization service for FHIR and dashboard integration
// Handles real-time data updates and AI-generated timestamp integration

import restApiService from './restApiService';
import aiDataService from './aiDataService';
import { adaptDashboardData, adaptEncounterData } from '../utils/fhirAdapter';
import { aggregateWaitMetrics } from '../utils/waitTimeMetrics';

class DataSyncService {
  constructor() {
    this.isConnected = false;
    this.lastSyncTime = null;
    this.syncInterval = null;
    this.subscribers = new Set();
    this.fhirSnapshotLoaded = false;
    this.cachedData = {
      patients: [],
      encounters: [],
      observations: [],
      alerts: [],
      analytics: {},
      aiInsights: {}
    };
    this.aiTimestampData = new Map(); // Store AI-generated timestamp data
  }

  /**
   * Subscribe to data updates
   * @param {Function} callback - Callback function for data updates
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    if (typeof callback !== 'function') {
      console.error('DataSyncService.subscribe: callback must be a function');
      return () => {}; // Return empty function if callback is invalid
    }
    
    this.subscribers.add(callback);
    return () => {
      try {
        this.subscribers.delete(callback);
      } catch (error) {
        console.error('Error unsubscribing from data sync service:', error);
      }
    };
  }

  /**
   * Notify all subscribers of data changes
   * @param {Object} data - Updated data
   */
  notifySubscribers(data) {
    this.subscribers.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in data subscriber callback:', error);
      }
    });
  }

  /**
   * Initialize data synchronization
   * @param {boolean} useFHIR - Whether to use FHIR data
   */
  async initialize(useFHIR = false) {
    try {
      const targetFHIR = useFHIR && restApiService.isConnected;

      if (targetFHIR && this.fhirSnapshotLoaded) {
        this.isConnected = true;
        this.notifySubscribers(this.cachedData);
        console.log('DataSyncService initialized with cached FHIR snapshot');
        return;
      }

      this.isConnected = targetFHIR;

      await this.loadDashboardData({ force: targetFHIR && !this.fhirSnapshotLoaded });
      await this.loadAnalyticsData();

      if (this.isConnected) {
        this.fhirSnapshotLoaded = true;
      }

      console.log('DataSyncService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize DataSyncService:', error);
      throw error;
    }
  }

  /**
   * Load dashboard data from FHIR or mock sources
   */
  async loadDashboardData(options = {}) {
    const { force = false } = options;
    try {
      if (this.isConnected && this.fhirSnapshotLoaded && !force) {
        this.notifySubscribers(this.cachedData);
        return this.cachedData;
      }

      const rawData = this.isConnected
        ? await restApiService.getDashboardData()
        : await restApiService.getMockDashboardData();

      const usingFHIRSource = this.isConnected && rawData?.dataSource === 'fhir';

      const baseDashboard = usingFHIRSource
        ? rawData
        : adaptDashboardData(rawData, false);

      const enhancedData = await this.enhanceWithAITimestamps({ ...baseDashboard });

      this.cachedData = {
        ...this.cachedData,
        ...enhancedData,
        dataSource: usingFHIRSource ? 'fhir' : 'mock'
      };
      
      // Notify subscribers
      this.notifySubscribers(this.cachedData);
      
      this.lastSyncTime = new Date();

      if (usingFHIRSource) {
        this.fhirSnapshotLoaded = true;
      }

      return this.cachedData;
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      throw error;
    }
  }

  /**
   * Load analytics data
  */
  async loadAnalyticsData() {
    try {
      const analyticsSource = await restApiService.getAnalytics();
      if (!analyticsSource) {
        return null;
      }

      const analyticsPayload = this.normalizeAnalyticsPayload(analyticsSource);
      this.cachedData.analytics = analyticsPayload;

      const existingKpis = this.cachedData.kpis || {};
      const averageWaitTime = analyticsPayload.overallAverageMinutes;
      if (Number.isFinite(averageWaitTime)) {
        this.cachedData.kpis = {
          ...existingKpis,
          averageWaitTime
        };
      } else if (!this.cachedData.kpis) {
        this.cachedData.kpis = existingKpis;
      }

      this.notifySubscribers(this.cachedData);
      return analyticsPayload;
    } catch (error) {
      console.error('Failed to load analytics data:', error);
      return null;
    }
  }

  normalizeAnalyticsPayload(analyticsSource = {}) {
    const patientWaitMetrics = Array.isArray(analyticsSource.patientWaitMetrics)
      ? analyticsSource.patientWaitMetrics
      : [];
    const derivedAggregates = patientWaitMetrics.length > 0
      ? aggregateWaitMetrics(patientWaitMetrics)
      : null;

    const turnaround = analyticsSource.turnaround
      || derivedAggregates?.turnaround
      || {};
    const waitBreakdown = analyticsSource.waitBreakdown
      || derivedAggregates?.waitBreakdown
      || [];
    const overallAverageMinutes = analyticsSource.overallAverageMinutes
      ?? derivedAggregates?.overallAverageMinutes
      ?? this.deriveAverageWaitFromTurnaround(turnaround);

    return {
      ...analyticsSource,
      turnaround,
      waitBreakdown,
      patientWaitMetrics,
      waitMetricCounts: analyticsSource.waitMetricCounts
        || derivedAggregates?.countsByMetric
        || {},
      waitMetricPatientCount: analyticsSource.waitMetricPatientCount
        ?? (patientWaitMetrics.length > 0 ? patientWaitMetrics.length : derivedAggregates?.patientCount ?? 0),
      overallAverageMinutes
    };
  }

  deriveAverageWaitFromTurnaround(turnaround = {}) {
    const numericValues = Object.values(turnaround)
      .map(value => Number(value))
      .filter(Number.isFinite);
    if (numericValues.length === 0) {
      return undefined;
    }
    const total = numericValues.reduce((sum, value) => sum + value, 0);
    return Math.round(total / numericValues.length);
  }

  /**
   * Enhance data with AI-generated timestamps
   * @param {Object} data - Original data
   * @returns {Object} Enhanced data with AI timestamps
   */
  async enhanceWithAITimestamps(data) {
    try {
      // Simulate AI-generated timestamp data
      // In production, this would call an AI service
      const aiTimestamps = await this.generateAITimestamps(data);
      
      // Enhance patient data with AI timestamps
      if (data.patients) {
        data.patients = data.patients.map(patient => ({
          ...patient,
          aiTimestamps: aiTimestamps[patient.id] || [],
          lastAITimestamp: this.getLatestAITimestamp(aiTimestamps[patient.id])
        }));
      }
      
      // Enhance encounters with AI timeline data
      if (data.encounters) {
        data.encounters = data.encounters.map(encounter => ({
          ...encounter,
          aiTimeline: aiTimestamps[encounter.patientId] || [],
          timelineEvents: this.generateTimelineEvents(encounter, aiTimestamps[encounter.patientId])
        }));
      }
      
      return data;
    } catch (error) {
      console.error('Failed to enhance data with AI timestamps:', error);
      return data;
    }
  }

  /**
   * Generate AI timestamps for patients using AI Data Service
   * @param {Object} data - Patient data
   * @returns {Object} AI timestamp data
   */
  async generateAITimestamps(data) {
    const aiTimestamps = {};

    if (!data?.patients || data.patients.length === 0) {
      return aiTimestamps;
    }

    const generationTasks = data.patients.map(async (patient) => {
      const signature = this.createPatientSignature(patient);
      const cachedEntry = this.aiTimestampData.get(patient.id);

      if (cachedEntry && cachedEntry.signature === signature) {
        aiTimestamps[patient.id] = cachedEntry.timelineEvents;
        this.updateCachedInsights(patient.id, cachedEntry.insights);
        return;
      }

      try {
        const aiTimelineData = await aiDataService.generatePatientTimeline(patient);
        const timelineEvents = (aiTimelineData.timelineEvents || []).sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        );
        const normalizedInsights = this.normalizeAiInsights(aiTimelineData);

        aiTimestamps[patient.id] = timelineEvents;
        this.aiTimestampData.set(patient.id, {
          signature,
          timelineEvents,
          insights: normalizedInsights
        });
        this.updateCachedInsights(patient.id, normalizedInsights);
      } catch (error) {
        console.error(`Failed to generate AI data for patient ${patient.id}:`, error);
        const fallbackEvents = this.generatePatientAITimestamps(patient);
        aiTimestamps[patient.id] = fallbackEvents;
        this.aiTimestampData.set(patient.id, {
          signature,
          timelineEvents: fallbackEvents,
          insights: null
        });
        this.updateCachedInsights(patient.id, null);
      }
    });

    await Promise.all(generationTasks);
    return aiTimestamps;
  }

  createPatientSignature(patient = {}) {
    if (!patient || typeof patient !== 'object') {
      return '';
    }
    const {
      status,
      priority,
      waitTime,
      department,
      vitals,
      lastUpdated,
      updatedAt,
      encounterId
    } = patient;
    return JSON.stringify({
      status,
      priority,
      waitTime,
      department,
      vitals,
      lastUpdated: lastUpdated || updatedAt || null,
      encounterId: encounterId || null
    });
  }

  normalizeAiInsights(aiTimelineData) {
    if (!aiTimelineData || typeof aiTimelineData !== 'object') {
      return null;
    }
    const generatedAt = aiTimelineData.generatedAt
      ? new Date(aiTimelineData.generatedAt).toISOString()
      : new Date().toISOString();

    return {
      insights: Array.isArray(aiTimelineData.insights) ? aiTimelineData.insights : [],
      recommendations: Array.isArray(aiTimelineData.recommendations) ? aiTimelineData.recommendations : [],
      confidence: typeof aiTimelineData.confidence === 'number' ? aiTimelineData.confidence : null,
      generatedAt,
      modelVersion: aiTimelineData.modelVersion || null
    };
  }

  updateCachedInsights(patientId, insights) {
    if (!this.cachedData.aiInsights) {
      this.cachedData.aiInsights = {};
    }

    if (insights) {
      this.cachedData.aiInsights[patientId] = insights;
      return;
    }

    if (this.cachedData.aiInsights[patientId]) {
      delete this.cachedData.aiInsights[patientId];
    }
  }

  /**
   * Generate AI timestamps for a specific patient
   * @param {Object} patient - Patient data
   * @returns {Array} AI timestamp events
   */
  generatePatientAITimestamps(patient) {
    const now = new Date();
    const timestamps = [];
    
    // Generate realistic medical timeline events
    const events = [
      { type: 'admission', description: 'Patient admitted to emergency department', priority: 'high' },
      { type: 'vital_check', description: 'Vital signs checked', priority: 'medium' },
      { type: 'lab_order', description: 'Laboratory tests ordered', priority: 'medium' },
      { type: 'imaging', description: 'Diagnostic imaging scheduled', priority: 'high' },
      { type: 'consultation', description: 'Specialist consultation requested', priority: 'high' },
      { type: 'medication', description: 'Medication administered', priority: 'medium' },
      { type: 'discharge_plan', description: 'Discharge planning initiated', priority: 'low' }
    ];
    
    // Generate 3-7 random events for the patient
    const numEvents = Math.floor(Math.random() * 5) + 3;
    const selectedEvents = events.sort(() => 0.5 - Math.random()).slice(0, numEvents);
    
    selectedEvents.forEach((event, index) => {
      const eventTime = new Date(now.getTime() - (index * 15 + Math.random() * 30) * 60000);
      timestamps.push({
        id: `ai_${patient.id}_${index}`,
        timestamp: eventTime,
        type: event.type,
        description: event.description,
        priority: event.priority,
        source: 'ai_generated',
        confidence: Math.random() * 0.3 + 0.7, // 70-100% confidence
        patientId: patient.id,
        status: Math.random() > 0.2 ? 'completed' : 'pending'
      });
    });
    
    return timestamps.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get the latest AI timestamp for a patient
   * @param {Array} timestamps - AI timestamps array
   * @returns {Object|null} Latest timestamp
   */
  getLatestAITimestamp(timestamps) {
    if (!timestamps || timestamps.length === 0) return null;
    return timestamps[0]; // Already sorted by timestamp desc
  }

  /**
   * Generate timeline events from encounter and AI data
   * @param {Object} encounter - Encounter data
   * @param {Array} aiTimestamps - AI timestamp data
   * @returns {Array} Timeline events
   */
  generateTimelineEvents(encounter, aiTimestamps = []) {
    const events = [];
    
    // Add encounter events
    if (encounter.startTime) {
      events.push({
        id: `encounter_${encounter.id}_start`,
        timestamp: new Date(encounter.startTime),
        type: 'encounter_start',
        description: 'Encounter started',
        priority: 'high',
        source: 'fhir',
        patientId: encounter.patientId
      });
    }
    
    // Add AI-generated events
    events.push(...aiTimestamps);
    
    // Add encounter end event
    if (encounter.endTime) {
      events.push({
        id: `encounter_${encounter.id}_end`,
        timestamp: new Date(encounter.endTime),
        type: 'encounter_end',
        description: 'Encounter completed',
        priority: 'high',
        source: 'fhir',
        patientId: encounter.patientId
      });
    }
    
    return events.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Start periodic data synchronization
   */
  startPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    // Sync every 30 seconds
    this.syncInterval = setInterval(async () => {
      try {
        await this.loadDashboardData();
        console.log('Periodic sync completed');
      } catch (error) {
        console.error('Periodic sync failed:', error);
      }
    }, 30000);
  }

  /**
   * Stop periodic synchronization
   */
  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Get patient timeline with AI enhancement
   * @param {string} patientId - Patient ID
   * @returns {Array} Enhanced timeline
   */
  async getPatientTimeline(patientId) {
    const toIsoTimestamp = (value) => {
      if (!value) return null;
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return null;
      }
      return date.toISOString();
    };

    const normalizeEvents = (events = []) => {
      return events
        .map((event, index) => {
          const timestamp = toIsoTimestamp(event.timestamp || event.time || event.startTime);
          if (!timestamp) {
            return null;
          }

          return {
            id: event.id || `enc-${patientId}-${index}`,
            description: event.description || event.title || event.event || 'Encounter event',
            status: (event.status || 'completed').toLowerCase(),
            timestamp,
            priority: event.priority || 'medium',
            source: event.source || 'fhir',
            duration: Number.isFinite(event.duration) ? event.duration : 0
          };
        })
        .filter(Boolean)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    };

    try {
      let timelineData;

      if (this.isConnected) {
        timelineData = await restApiService.getPatientTimeline(patientId);
      } else {
        const paddedId = patientId.replace(/\D/g, '').slice(-3).padStart(3, '0');
        const response = await fetch(`/mock-data/encounter-${paddedId}.json`);
        if (!response.ok) {
          throw new Error(`Mock encounter data not found for ${patientId}`);
        }
        timelineData = await response.json();
      }

      const encounterEvents = this.isConnected
        ? (Array.isArray(timelineData)
            ? timelineData.flatMap(enc => adaptEncounterData(enc, true))
            : [])
        : Array.isArray(timelineData)
            ? timelineData.flatMap(enc => adaptEncounterData(enc, false))
            : adaptEncounterData(timelineData, false);

      const normalizedFHIR = normalizeEvents(encounterEvents);

      const aiEntry = this.aiTimestampData.get(patientId);
      const aiEvents = (aiEntry?.timelineEvents || []).map(event => ({
        ...event,
        id: event.id || `ai-${patientId}-${event.type || 'event'}`,
        timestamp: toIsoTimestamp(event.timestamp) || new Date().toISOString(),
        source: 'ai_generated'
      }));

      const combinedEvents = [...normalizedFHIR, ...aiEvents].sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );

      if (!combinedEvents.length) {
        return [];
      }

      const latestEvent = combinedEvents[0];
      const earliestEvent = combinedEvents[combinedEvents.length - 1];

      return [
        {
          id: `timeline-${patientId}`,
          patientId,
          status: latestEvent.status || 'in-progress',
          startTime: earliestEvent.timestamp,
          endTime: latestEvent.timestamp,
          timelineEvents: combinedEvents,
          aiTimeline: aiEvents
        }
      ];
    } catch (error) {
      console.error('Failed to get patient timeline:', error);
      return [];
    }
  }

  /**
   * Update AI timestamp data for a patient
   * @param {string} patientId - Patient ID
   * @param {Array} timestamps - New timestamp data
   */
  updateAITimestamps(patientId, timestamps) {
    const normalized = Array.isArray(timestamps)
      ? [...timestamps].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      : [];
    const existingEntry = this.aiTimestampData.get(patientId) || {};
    const updatedEntry = {
      signature: existingEntry.signature || null,
      timelineEvents: normalized,
      insights: existingEntry.insights || null
    };
    this.aiTimestampData.set(patientId, updatedEntry);
    if (updatedEntry.insights) {
      this.updateCachedInsights(patientId, updatedEntry.insights);
    }
    
    // Update cached data
    if (this.cachedData.patients) {
      const patientIndex = this.cachedData.patients.findIndex(p => p.id === patientId);
      if (patientIndex !== -1) {
        this.cachedData.patients[patientIndex].aiTimestamps = normalized;
        this.cachedData.patients[patientIndex].lastAITimestamp = this.getLatestAITimestamp(normalized);
      }
    }
    
    // Notify subscribers
    this.notifySubscribers(this.cachedData);
  }

  /**
   * Get current cached data
   * @returns {Object} Cached data
   */
  getCachedData() {
    return this.cachedData;
  }

  /**
   * Force refresh all data
   */
  async refresh(options = {}) {
    await this.loadDashboardData(options);
    await this.loadAnalyticsData();
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.stopPeriodicSync();
    this.subscribers.clear();
    this.aiTimestampData.clear();
  }
}

// Create singleton instance
const dataSyncService = new DataSyncService();
export default dataSyncService;
