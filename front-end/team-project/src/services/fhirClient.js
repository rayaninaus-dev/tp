/**
 * @file fhirClient.js
 * @description FHIR client service to interact with the FHIR server
 * Support for querying and operating on core resources such as Patient, Encounter, and Observation
 */

import client from 'fhirclient';

class FHIRClient {
  constructor() {
    this.client = null;
    this.isInitialized = false;
  }

  /**
   * Initialize FHIR client
   * @param {string} fhirServerUrl - FHIR server URL
   * @param {object} authConfig - Authentication configuration
   */
  async initialize(fhirServerUrl, authConfig = {}) {
    try {
      // Use smart client for FHIR server connection
      this.client = await client.oauth2.ready({
        clientId: 'your-client-id',
        scope: 'launch/patient openid fhirUser offline_access',
        redirectUri: window.location.origin + '/launch.html',
        iss: fhirServerUrl
      });
      this.isInitialized = true;
      console.log('FHIR client initialization successful');
    } catch (error) {
      console.error('FHIR client initialization failed:', error);
      // Fallback to direct FHIR server connection
      try {
        this.client = client({
          baseUrl: fhirServerUrl
        });
        this.isInitialized = true;
        console.log('FHIR client fallback initialization successful');
      } catch (fallbackError) {
        console.error('FHIR client fallback initialization failed:', fallbackError);
        this.isInitialized = false;
      }
    }
  }

  /**
   * Get patient list
   * @param {object} params - Query parameters
   * @returns {Promise<Array>} Patient list
   */
  async getPatients(params = {}) {
    if (!this.isInitialized) {
      return this.getMockPatients();
    }

    try {
      const response = await this.client.request({
        url: 'Patient',
        params: {
          _count: params.limit || 50,
          _sort: params.sort || '-_lastUpdated',
          ...params.filters
        }
      });
      return response.entry || [];
    } catch (error) {
      console.error('Get patient list failed:', error);
      return this.getMockPatients();
    }
  }

  /**
   * Get specific patient by ID
   * @param {string} patientId - Patient ID
   * @returns {Promise<Object>} Patient information
   */
  async getPatient(patientId) {
    if (!this.isInitialized) {
      return this.getMockPatient(patientId);
    }

    try {
      const response = await this.client.request(`Patient/${patientId}`);
      return response;
    } catch (error) {
      console.error('Get patient information failed:', error);
      return this.getMockPatient(patientId);
    }
  }

  /**
   * Get patient's encounter records
   * @param {string} patientId - Patient ID
   * @returns {Promise<Array>} Encounter records list
   */
  async getPatientEncounters(patientId) {
    if (!this.isInitialized) {
      return this.getMockEncounters(patientId);
    }

    try {
      const response = await this.client.request({
        url: 'Encounter',
        params: {
          patient: patientId,
          _sort: '-date',
          _count: 20
        }
      });
      return response.entry || [];
    } catch (error) {
      console.error('Get encounter records failed:', error);
      return this.getMockEncounters(patientId);
    }
  }

  /**
   * Get patient's observation data (vital signs, etc.)
   * @param {string} patientId - Patient ID
   * @param {string} encounterId - Encounter ID (optional)
   * @returns {Promise<Array>} Observation data list
   */
  async getPatientObservations(patientId, encounterId = null) {
    if (!this.isInitialized) {
      return this.getMockObservations(patientId);
    }

    try {
      const params = {
        patient: patientId,
        _sort: '-date',
        _count: 50
      };
      
      if (encounterId) {
        params.encounter = encounterId;
      }

      const response = await this.client.request({
        url: 'Observation',
        params
      });
      return response.entry || [];
    } catch (error) {
      console.error('access observation data failed:', error);
      return this.getMockObservations(patientId);
    }
  }

  /**
   * Get emergency department dashboard data
   * @returns {Promise<Object>} Dashboard data
   */
  async getDashboardData() {
    if (!this.isInitialized) {
      return this.getMockDashboardData();
    }

    try {
      // gain patients, encounters, and observations concurrently
      const [patients, encounters, observations] = await Promise.all([
        this.getPatients({ filters: { 'class': 'EMER' } }),
        this.getEncounters({ status: 'in-progress' }),
        this.getObservations({ category: 'vital-signs' })
      ]);

      return this.buildDashboardData(patients, encounters, observations);
    } catch (error) {
      console.error('access dashboard data failed:', error);
      return this.getMockDashboardData();
    }
  }

  /**
   * Get encounter records
   * @param {object} params - Query parameters
   * @returns {Promise<Array>} list of encounter records
   */
  async getEncounters(params = {}) {
    if (!this.isInitialized) {
      return this.getMockEncounters();
    }

    try {
      const response = await this.client.request({
        url: 'Encounter',
        params: {
          _count: params.limit || 50,
          _sort: '-date',
          ...params.filters
        }
      });
      return response.entry || [];
    } catch (error) {
      console.error('access encounter data failed:', error);
      return this.getMockEncounters();
    }
  }

  /**
   * Get observation data
   * @param {object} params - Query parameters
   * @returns {Promise<Array>} Observation data list
   */
  async getObservations(params = {}) {
    if (!this.isInitialized) {
      return this.getMockObservations();
    }

    try {
      const response = await this.client.request({
        url: 'Observation',
        params: {
          _count: params.limit || 100,
          _sort: '-date',
          ...params.filters
        }
      });
      return response.entry || [];
    } catch (error) {
      console.error('access observation data failed:', error);
      return this.getMockObservations();
    }
  }

  // Mock data method (for development and testing)
  async getMockPatients() {
    try {
      // Try enhanced patients data first
      const response = await fetch('/mock-data/enhanced-patients.json');
      if (response.ok) {
        const data = await response.json();
        return data.patients.map(patient => ({
          resource: {
            id: patient.id,
            resourceType: 'Patient',
            name: [{ given: [patient.name.split(' ')[0]], family: patient.name.split(' ')[1] }],
            gender: patient.gender.toLowerCase(),
            birthDate: new Date(new Date().getFullYear() - patient.age, 0, 1).toISOString().split('T')[0],
            active: true
          }
        }));
      }
    } catch (error) {
      console.warn('Enhanced patients data not available, falling back to ed-summary.json');
    }

    // Fallback to original data
    const response = await fetch('/mock-data/ed-summary.json');
    const data = await response.json();
    return data.patients.map(patient => ({
      resource: {
        id: patient.id,
        resourceType: 'Patient',
        name: [{ given: [patient.name.split(' ')[0]], family: patient.name.split(' ')[1] }],
        gender: patient.gender.toLowerCase(),
        birthDate: new Date(new Date().getFullYear() - patient.age, 0, 1).toISOString().split('T')[0],
        active: true
      }
    }));
  }

  async getMockPatient(patientId) {
    const patients = await this.getMockPatients();
    return patients.find(p => p.resource.id === patientId)?.resource || null;
  }

  async getMockEncounters(patientId = null) {
    const response = await fetch('/mock-data/encounter-001.json');
    const data = await response.json();
    
    if (patientId && data.patientId !== patientId) {
      return [];
    }

    return [{
      resource: {
        id: data.encounterId,
        resourceType: 'Encounter',
        status: 'in-progress',
        class: { code: 'EMER', display: 'Emergency' },
        subject: { reference: `Patient/${data.patientId}` },
        period: {
          start: data.timeline[0]?.time,
          end: data.timeline[data.timeline.length - 1]?.time
        }
      }
    }];
  }

  async getMockObservations(patientId = null) {
    const response = await fetch('/mock-data/ed-summary.json');
    const data = await response.json();
    
    const observations = [];
    data.patients.forEach(patient => {
      if (patientId && patient.id !== patientId) return;
      
      if (patient.vitals) {
        Object.entries(patient.vitals).forEach(([code, value]) => {
          observations.push({
            resource: {
              id: `${patient.id}-${code}`,
              resourceType: 'Observation',
              status: 'final',
              category: [{ coding: [{ code: 'vital-signs', display: 'Vital Signs' }] }],
              code: { coding: [{ code, display: this.getVitalSignDisplayName(code) }] },
              subject: { reference: `Patient/${patient.id}` },
              valueQuantity: { value: parseFloat(value), unit: this.getVitalSignUnit(code) },
              effectiveDateTime: new Date().toISOString()
            }
          });
        });
      }
    });

    return observations;
  }

  async getMockDashboardData() {
    const response = await fetch('/mock-data/ed-summary.json');
    return await response.json();
  }

  getVitalSignDisplayName(code) {
    const names = {
      'hr': 'Heart Rate',
      'bp': 'Blood Pressure',
      'temp': 'Body Temperature',
      'spo2': 'Oxygen Saturation'
    };
    return names[code] || code;
  }

  getVitalSignUnit(code) {
    const units = {
      'hr': 'bpm',
      'bp': 'mmHg',
      'temp': '°C',
      'spo2': '%'
    };
    return units[code] || '';
  }

  /**
   * Search FHIR resources
   * @param {string} resourceType - Resource type to search
   * @param {object} params - Search parameters
   * @returns {Promise<Array>} Search results
   */
  async search(resourceType, params = {}) {
    if (!this.isInitialized) {
      return this.getMockSearchResults(resourceType, params);
    }

    try {
      const response = await this.client.request({
        url: resourceType,
        params: {
          _count: params.limit || 10,
          _sort: params.sort || '-_lastUpdated',
          ...params
        }
      });
      return response.entry || [];
    } catch (error) {
      console.error(`FHIR search failed for ${resourceType}:`, error);
      // Return mock data when FHIR search fails
      return this.getMockSearchResults(resourceType, params);
    }
  }

  /**
   * Get mock search results for testing
   * @param {string} resourceType - Resource type
   * @param {object} params - Search parameters
   * @returns {Array} Mock search results
   */
  getMockSearchResults(resourceType, params = {}) {
    // Return mock data based on resource type
    switch (resourceType) {
      case 'Patient':
        return this.generateMockPatients(params.limit || 5);
      case 'Encounter':
        return this.generateMockEncounters(params.limit || 5);
      case 'Observation':
        return this.generateMockObservations(params.limit || 5);
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
          unit = '°C';
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

  buildDashboardData(patients, encounters, observations) {
    // Here we can build the dashboard data based on FHIR data
    // This is a simplified implementation
    return {
      kpis: {
        totalPatients: patients.length,
        waitingPatients: encounters.filter(e => e.resource.status === 'in-progress').length,
        averageWaitTime: 45,
        bedOccupancy: 85,
        criticalAlerts: 3
      },
      patients: patients.map(p => ({
        id: p.resource.id,
        name: `${p.resource.name[0].given[0]} ${p.resource.name[0].family}`,
        age: new Date().getFullYear() - new Date(p.resource.birthDate).getFullYear(),
        gender: p.resource.gender,
        status: 'in-treatment',
        priority: 'normal',
        department: this.generateRandomDepartment(),
        waitTime: 15,
        vitals: this.extractVitalsFromObservations(observations, p.resource.id)
      }))
    };
  }

  extractVitalsFromObservations(observations, patientId) {
    const patientObservations = observations.filter(o => 
      o.resource.subject.reference === `Patient/${patientId}`
    );

    const vitals = {};
    patientObservations.forEach(obs => {
      const code = obs.resource.code.coding[0].code;
      const value = obs.resource.valueQuantity?.value;
      if (value) {
        vitals[code] = value.toString();
      }
    });

    return {
      hr: vitals.hr || 'N/A',
      bp: vitals.bp || 'N/A',
      temp: vitals.temp || 'N/A',
      spo2: vitals.spo2 || 'N/A'
    };
  }
}

// Create singleton instance
const fhirClient = new FHIRClient();

export default fhirClient;
