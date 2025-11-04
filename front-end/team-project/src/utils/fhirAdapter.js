/**
 * @file fhirAdapter.js
 * @description Adapts FHIR resources to a structured format for UI components.
 * Supports both real FHIR data and mock data for development and testing.
 */

import { 
  FHIR_RESOURCE_TYPES, 
  ENCOUNTER_STATUS, 
  OBSERVATION_CATEGORIES,
  VITAL_SIGNS_CODES,
  PATIENT_DISPLAY_STATUS,
  TIMELINE_EVENT_TYPES,
  ALERT_TYPES,
  UNITS
} from '../models/fhirTypes';

/**
 * Adapt dashboard data
 * @param {object} rawData - Raw data (MAYBE FHIR Bundle or mock data)
 * @param {boolean} isFHIRData - Whether it is FHIR data
 * @returns {object} Adapted dashboard data
 */
export const adaptDashboardData = (rawData, isFHIRData = false) => {
  if (!rawData) return null;

  if (isFHIRData) {
    return adaptFHIRDashboardData(rawData);
  }

  // Handle mock data
  return {
    kpis: rawData.kpis,
    alerts: rawData.alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    departments: rawData.departments,
    patients: rawData.patients.map(patient => ({
      ...patient,
      vitals: patient.vitals || { hr: 'N/A', bp: 'N/A', temp: 'N/A', spo2: 'N/A' },
    })),
  };
};

/**
 * Adapt FHIR dashboard data
 * @param {object} fhirData - FHIR Bundle data
 * @returns {object} Adapted dashboard data
 */
const adaptFHIRDashboardData = (fhirData) => {
  const patients = extractPatients(fhirData);
  const encounters = extractEncounters(fhirData);
  const observations = extractObservations(fhirData);

  return {
    kpis: calculateKPIs(patients, encounters),
    alerts: generateAlerts(patients, encounters),
    departments: calculateDepartmentStatus(encounters),
    patients: patients.map(patient => ({
      ...patient,
      vitals: extractVitalsForPatient(observations, patient.id)
    })),
  };
};
  
/**
 * Adapt encounter timeline data
 * @param {object} encounterData - Encounter data (maybe FHIR Encounter or mock data)
 * @param {boolean} isFHIRData - Whether it is FHIR data
 * @returns {Array} Sorted and structured timeline array
 */
export const adaptEncounterData = (encounterData, isFHIRData = false) => {
  if (!encounterData) return [];

  if (isFHIRData) {
    return adaptFHIRTimelineData(encounterData);
  }

  // Handle mock data
  if (!encounterData.timeline) return [];

  return encounterData.timeline
    .map(event => ({
      id: event.id,
      title: event.event,
      description: event.description,
      status: mapStatus(event.status),
      timestamp: event.time,
      duration: event.duration,
      fhirResourceType: event.fhirResourceType || null,
    }))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

/**
 * Adapt FHIR timeline data
 * @param {object} fhirEncounter - FHIR Encounter resource
 * @returns {Array} Timeline event array
 */
const adaptFHIRTimelineData = (fhirEncounter) => {
  const timeline = [];
  
  // Add encounter start event
  if (fhirEncounter.period?.start) {
    timeline.push({
      id: `${fhirEncounter.id}-arrival`,
      title: 'Patient Arrival',
      description: 'Patient arrived at the Emergency Department',
      status: 'completed',
      timestamp: fhirEncounter.period.start,
      duration: 0,
      fhirResourceType: FHIR_RESOURCE_TYPES.ENCOUNTER,
    });
  }

  // Add encounter status change event
  if (fhirEncounter.status) {
    timeline.push({
      id: `${fhirEncounter.id}-status-${fhirEncounter.status}`,
      title: getEncounterStatusDisplay(fhirEncounter.status),
      description: `Encounter status: ${fhirEncounter.status}`,
      status: mapFHIRStatus(fhirEncounter.status),
      timestamp: fhirEncounter.period?.start || new Date().toISOString(),
      duration: 0,
      fhirResourceType: FHIR_RESOURCE_TYPES.ENCOUNTER,
    });
  }

  return timeline.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

// Helper functions
const extractPatients = (fhirData) => {
  if (!fhirData.entry) return [];
  
  return fhirData.entry
    .filter(entry => entry.resource?.resourceType === FHIR_RESOURCE_TYPES.PATIENT)
    .map(entry => adaptPatient(entry.resource));
};

const extractEncounters = (fhirData) => {
  if (!fhirData.entry) return [];
  
  return fhirData.entry
    .filter(entry => entry.resource?.resourceType === FHIR_RESOURCE_TYPES.ENCOUNTER)
    .map(entry => adaptEncounter(entry.resource));
};

const extractObservations = (fhirData) => {
  if (!fhirData.entry) return [];
  
  return fhirData.entry
    .filter(entry => entry.resource?.resourceType === FHIR_RESOURCE_TYPES.OBSERVATION)
    .map(entry => adaptObservation(entry.resource));
};

const adaptPatient = (patient) => {
  const name = patient.name?.[0];
  const givenName = name?.given?.[0] || '';
  const familyName = name?.family || '';
  
  return {
    id: patient.id,
    name: `${givenName} ${familyName}`.trim(),
    age: calculateAge(patient.birthDate),
    gender: patient.gender,
    status: patient.active ? PATIENT_DISPLAY_STATUS.IN_TREATMENT : PATIENT_DISPLAY_STATUS.DISCHARGED,
    priority: determinePriority(patient),
    department: 'Emergency',
    waitTime: 0,
    vitals: {}
  };
};

const adaptEncounter = (encounter) => {
  return {
    id: encounter.id,
    status: encounter.status,
    class: encounter.class?.code,
    subject: encounter.subject?.reference,
    period: encounter.period,
    location: encounter.location?.[0]?.location?.display
  };
};

const adaptObservation = (observation) => {
  return {
    id: observation.id,
    status: observation.status,
    category: observation.category?.[0]?.coding?.[0]?.code,
    code: observation.code?.coding?.[0]?.code,
    value: observation.valueQuantity?.value,
    unit: observation.valueQuantity?.unit,
    subject: observation.subject?.reference,
    effectiveDateTime: observation.effectiveDateTime
  };
};

const calculateAge = (birthDate) => {
  if (!birthDate) return 0;
  const today = new Date();
  const birth = new Date(birthDate);
  return today.getFullYear() - birth.getFullYear();
};

const determinePriority = (patient) => {
  // Here we can determine the priority based on the patient's conditions, allergies, etc.
  return 'normal';
};

const calculateKPIs = (patients, encounters) => {
  const activeEncounters = encounters.filter(e => e.status === ENCOUNTER_STATUS.IN_PROGRESS);
  
  return {
    totalPatients: patients.length,
    waitingPatients: activeEncounters.length,
    averageWaitTime: 45, // Here we should calculate the average wait time based on the actual data
    bedOccupancy: 85,
    criticalAlerts: 3
  };
};

const generateAlerts = (patients, encounters) => {
  const alerts = [];
  
  // Generate alerts based on the number of patients
  if (patients.length > 50) {
    alerts.push({
      id: 'high-patient-count',
      type: ALERT_TYPES.WARNING,
      message: 'High patient influx in Emergency Department',
      department: 'Emergency',
      timestamp: new Date().toISOString()
    });
  }
  
  return alerts;
};

const calculateDepartmentStatus = (encounters) => {
  const emergencyEncounters = encounters.filter(e => e.class === 'EMER');
  
  return [{
    name: 'Emergency Department',
    patients: emergencyEncounters.length,
    capacity: 20,
    occupancy: Math.round((emergencyEncounters.length / 20) * 100)
  }];
};

const extractVitalsForPatient = (observations, patientId) => {
  const patientObservations = observations.filter(o => 
    o.subject === `Patient/${patientId}` && 
    o.category === OBSERVATION_CATEGORIES.VITAL_SIGNS
  );

  const vitals = {};
  
  patientObservations.forEach(obs => {
    switch (obs.code) {
      case VITAL_SIGNS_CODES.HEART_RATE:
        vitals.hr = `${obs.value}${UNITS.BPM}`;
        break;
      case VITAL_SIGNS_CODES.BODY_TEMPERATURE:
        vitals.temp = `${obs.value}${UNITS.CELSIUS}`;
        break;
      case VITAL_SIGNS_CODES.OXYGEN_SATURATION:
        vitals.spo2 = `${obs.value}${UNITS.PERCENT}`;
        break;
      // Blood pressure needs special handling because it contains systolic and diastolic pressure
      case VITAL_SIGNS_CODES.BLOOD_PRESSURE_SYSTOLIC:
        vitals.bp = vitals.bp ? `${obs.value}/${vitals.bp.split('/')[1]}` : `${obs.value}/--`;
        break;
      case VITAL_SIGNS_CODES.BLOOD_PRESSURE_DIASTOLIC:
        vitals.bp = vitals.bp ? `${vitals.bp.split('/')[0]}/${obs.value}` : `--/${obs.value}`;
        break;
    }
  });

  return {
    hr: vitals.hr || 'N/A',
    bp: vitals.bp || 'N/A',
    temp: vitals.temp || 'N/A',
    spo2: vitals.spo2 || 'N/A'
  };
};

const getEncounterStatusDisplay = (status) => {
  const statusMap = {
    [ENCOUNTER_STATUS.ARRIVED]: 'Patient Arrival',
    [ENCOUNTER_STATUS.TRIAGED]: 'Triage Completed',
    [ENCOUNTER_STATUS.IN_PROGRESS]: 'Treatment In Progress',
    [ENCOUNTER_STATUS.FINISHED]: 'Treatment Completed',
    [ENCOUNTER_STATUS.CANCELLED]: 'Treatment Cancelled'
  };
  return statusMap[status] || status;
};

const mapStatus = (status) => {
  const s = status.toLowerCase();
  if (s.includes('complete')) return 'completed';
  if (s.includes('progress') || s.includes('active')) return 'in-progress';
  return 'pending';
};

const mapFHIRStatus = (status) => {
  const statusMap = {
    [ENCOUNTER_STATUS.FINISHED]: 'completed',
    [ENCOUNTER_STATUS.IN_PROGRESS]: 'in-progress',
    [ENCOUNTER_STATUS.CANCELLED]: 'cancelled'
  };
  return statusMap[status] || 'pending';
};