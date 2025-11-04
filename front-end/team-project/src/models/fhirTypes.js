/**
 * @file fhirTypes.js
 * @description FHIR resource type definitions and constants
 * Based on FHIR R4 specification for core resource types
 */

// FHIR RESOURCE TYPES CONSTANTS
export const FHIR_RESOURCE_TYPES = {
  PATIENT: 'Patient',
  ENCOUNTER: 'Encounter',
  OBSERVATION: 'Observation',
  DIAGNOSTIC_REPORT: 'DiagnosticReport',
  SERVICE_REQUEST: 'ServiceRequest',
  MEDICATION_REQUEST: 'MedicationRequest',
  PROCEDURE: 'Procedure',
  CONDITION: 'Condition',
  ALLERGY_INTOLERANCE: 'AllergyIntolerance',
  ORGANIZATION: 'Organization',
  PRACTITIONER: 'Practitioner',
  LOCATION: 'Location'
};

// ENCOUNTER STATUS CONSTANTS
export const ENCOUNTER_STATUS = {
  PLANNED: 'planned',
  ARRIVED: 'arrived',
  TRIAGED: 'triaged',
  IN_PROGRESS: 'in-progress',
  ONLEAVE: 'onleave',
  FINISHED: 'finished',
  CANCELLED: 'cancelled',
  ENTERED_IN_ERROR: 'entered-in-error',
  UNKNOWN: 'unknown'
};

// ENCOUNTER CLASS CONSTANTS
export const ENCOUNTER_CLASS = {
  EMERGENCY: 'EMER',
  INPATIENT: 'IMP',
  OUTPATIENT: 'AMB',
  PRENATAL: 'PRENC',
  SHORT_STAY: 'SS'
};

// OBSERVATION STATUS CONSTANTS
export const OBSERVATION_STATUS = {
  REGISTERED: 'registered',
  PRELIMINARY: 'preliminary',
  FINAL: 'final',
  AMENDED: 'amended',
  CORRECTED: 'corrected',
  CANCELLED: 'cancelled',
  ENTERED_IN_ERROR: 'entered-in-error',
  UNKNOWN: 'unknown'
};

// VITAL SIGNS CODE CONSTANTS
export const VITAL_SIGNS_CODES = {
  HEART_RATE: '8867-4',
  BLOOD_PRESSURE_SYSTOLIC: '8480-6',
  BLOOD_PRESSURE_DIASTOLIC: '8462-4',
  BODY_TEMPERATURE: '8310-5',
  OXYGEN_SATURATION: '2708-6',
  RESPIRATORY_RATE: '9279-1',
  BODY_HEIGHT: '8302-2',
  BODY_WEIGHT: '29463-7'
};

// OBSERVATION CATEGORIES CONSTANTS
export const OBSERVATION_CATEGORIES = {
  VITAL_SIGNS: 'vital-signs',
  LABORATORY: 'laboratory',
  IMAGING: 'imaging',
  SURVEY: 'survey',
  EXAM: 'exam',
  THERAPY: 'therapy',
  ACTIVITY: 'activity'
};

// PRIORITY CONSTANTS
export const PRIORITY_CODES = {
  ROUTINE: 'routine',
  URGENT: 'urgent',
  ASAP: 'asap',
  STAT: 'stat'
};

// GENDER CONSTANTS
export const GENDER_CODES = {
  MALE: 'male',
  FEMALE: 'female',
  OTHER: 'other',
  UNKNOWN: 'unknown'
};

// PATIENT STATUS CONSTANTS
export const PATIENT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ENTERED_IN_ERROR: 'entered-in-error'
};

// DIAGNOSTIC REPORT STATUS CONSTANTS
export const DIAGNOSTIC_REPORT_STATUS = {
  REGISTERED: 'registered',
  PARTIAL: 'partial',
  PRELIMINARY: 'preliminary',
  FINAL: 'final',
  AMENDED: 'amended',
  CORRECTED: 'corrected',
  CANCELLED: 'cancelled',
  ENTERED_IN_ERROR: 'entered-in-error',
  UNKNOWN: 'unknown'
};

// SERVICE REQUEST STATUS CONSTANTS
export const SERVICE_REQUEST_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  ON_HOLD: 'on-hold',
  REVOKED: 'revoked',
  COMPLETED: 'completed',
  ENTERED_IN_ERROR: 'entered-in-error',
  UNKNOWN: 'unknown'
};

// SERVICE REQUEST INTENT CONSTANTS
export const SERVICE_REQUEST_INTENT = {
  PROPOSAL: 'proposal',
  PLAN: 'plan',
  ORDER: 'order',
  ORIGINAL_ORDER: 'original-order',
  REFLEX_ORDER: 'reflex-order',
  FILLER_ORDER: 'filler-order',
  INSTANCE_ORDER: 'instance-order',
  OPTION: 'option'
};

// EMERGENCY DEPARTMENT CONSTANTS
export const EMERGENCY_DEPARTMENT = {
  DEPARTMENT_CODE: 'ED',
  DEPARTMENT_DISPLAY: 'Emergency Department',
  LOCATION_TYPE: 'ED',
  ENCOUNTER_CLASS: ENCOUNTER_CLASS.EMERGENCY
};

// TIMELINE EVENT TYPES CONSTANTS
export const TIMELINE_EVENT_TYPES = {
  PATIENT_ARRIVAL: 'patient-arrival',
  TRIAGE: 'triage',
  PHYSICIAN_CONSULTATION: 'physician-consultation',
  VITAL_SIGNS: 'vital-signs',
  LABORATORY: 'laboratory',
  IMAGING: 'imaging',
  MEDICATION: 'medication',
  PROCEDURE: 'procedure',
  DISCHARGE: 'discharge',
  ADMISSION: 'admission'
};

// ALERT TYPES CONSTANTS
export const ALERT_TYPES = {
  CRITICAL: 'critical',
  WARNING: 'warning',
  INFO: 'info',
  SUCCESS: 'success'
};

// ALERT SOURCES CONSTANTS
export const ALERT_SOURCES = {
  SYSTEM: 'system',
  USER: 'user',
  AUTOMATED: 'automated',
  EXTERNAL: 'external'
};

// DEPARTMENT STATUS CONSTANTS
export const DEPARTMENT_STATUS = {
  OPERATIONAL: 'operational',
  OVERCROWDED: 'overcrowded',
  UNDERSTAFFED: 'understaffed',
  MAINTENANCE: 'maintenance',
  CLOSED: 'closed'
};

// BED STATUS CONSTANTS
export const BED_STATUS = {
  AVAILABLE: 'available',
  OCCUPIED: 'occupied',
  MAINTENANCE: 'maintenance',
  RESERVED: 'reserved',
  UNAVAILABLE: 'unavailable'
};

// PATIENT PRIORITY CONSTANTS
export const PATIENT_PRIORITY = {
  CRITICAL: 'critical',
  URGENT: 'urgent',
  HIGH: 'high',
  NORMAL: 'normal',
  LOW: 'low'
};

// PATIENT DISPLAY STATUS CONSTANTS
export const PATIENT_DISPLAY_STATUS = {
  WAITING: 'waiting',
  IN_TREATMENT: 'in-treatment',
  DISCHARGED: 'discharged',
  ADMITTED: 'admitted',
  TRANSFERRED: 'transferred'
};

// UNITS CONSTANTS
export const UNITS = {
  BPM: 'bpm', // Heart rate
  MMHG: 'mmHg', // Blood pressure
  CELSIUS: '°C', // Temperature
  PERCENT: '%', // Oxygen saturation
  MINUTES: 'min', // Minutes
  HOURS: 'h', // Hours
  DAYS: 'd' // Days
};

// STATUS COLORS CONSTANTS
export const STATUS_COLORS = {
  COMPLETED: 'emerald',
  IN_PROGRESS: 'blue',
  PENDING: 'amber',
  CANCELLED: 'red',
  CRITICAL: 'red',
  WARNING: 'yellow',
  INFO: 'blue',
  SUCCESS: 'green'
};

// STATUS ICONS CONSTANTS
export const STATUS_ICONS = {
  COMPLETED: 'CheckCircle',
  IN_PROGRESS: 'Loader',
  PENDING: 'AlertCircle',
  CANCELLED: 'XCircle',
  CRITICAL: 'AlertTriangle',
  WARNING: 'AlertCircle',
  INFO: 'Info',
  SUCCESS: 'CheckCircle'
};

export default {
  FHIR_RESOURCE_TYPES,
  ENCOUNTER_STATUS,
  ENCOUNTER_CLASS,
  OBSERVATION_STATUS,
  VITAL_SIGNS_CODES,
  OBSERVATION_CATEGORIES,
  PRIORITY_CODES,
  GENDER_CODES,
  PATIENT_STATUS,
  DIAGNOSTIC_REPORT_STATUS,
  SERVICE_REQUEST_STATUS,
  SERVICE_REQUEST_INTENT,
  EMERGENCY_DEPARTMENT,
  TIMELINE_EVENT_TYPES,
  ALERT_TYPES,
  ALERT_SOURCES,
  DEPARTMENT_STATUS,
  BED_STATUS,
  PATIENT_PRIORITY,
  PATIENT_DISPLAY_STATUS,
  UNITS,
  STATUS_COLORS,
  STATUS_ICONS
};
