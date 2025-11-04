/**
 * @file fhirValidator.js
 * @description tools for validating FHIR resources and bundles
 */

import { 
  FHIR_RESOURCE_TYPES, 
  ENCOUNTER_STATUS, 
  OBSERVATION_STATUS,
  GENDER_CODES,
  PATIENT_STATUS
} from '../models/fhirTypes';

/**
 * Validate FHIR resource basic structure
 * @param {object} resource - FHIR resource
 * @returns {object} Validation result
 */
export const validateFHIRResource = (resource) => {
  const errors = [];
  const warnings = [];

  if (!resource) {
    return {
      isValid: false,
      errors: ['RESOURCE CANNOT BE EMPTY'],
      warnings: []
    };
  }

  // check resourceType and id
  if (!resource.resourceType) {
    errors.push('MISSING resourceType FIELD');
  } else if (!Object.values(FHIR_RESOURCE_TYPES).includes(resource.resourceType)) {
    errors.push(`INVALID resourceType: ${resource.resourceType}`);
  }

  if (!resource.id) {
    errors.push('MISSING id FIELD');
  }

  // Validate specific fields based on resource type
  switch (resource.resourceType) {
    case FHIR_RESOURCE_TYPES.PATIENT:
      validatePatient(resource, errors, warnings);
      break;
    case FHIR_RESOURCE_TYPES.ENCOUNTER:
      validateEncounter(resource, errors, warnings);
      break;
    case FHIR_RESOURCE_TYPES.OBSERVATION:
      validateObservation(resource, errors, warnings);
      break;
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Validate Patient resource
 * @param {object} patient - Patient resource
 * @param {Array} errors - Error array
 * @param {Array} warnings - Warning array
 */
const validatePatient = (patient, errors, warnings) => {
  // Check name
  if (!patient.name || !Array.isArray(patient.name) || patient.name.length === 0) {
    errors.push('Patient resource must contain name FIELD');
  } else {
    const name = patient.name[0];
    if (!name.given || !Array.isArray(name.given) || name.given.length === 0) {
      errors.push('Patient name must contain given FIELD');
    }
    if (!name.family) {
      errors.push('Patient name must contain family FIELD');
    }
  }

  // Check gender
  if (patient.gender && !Object.values(GENDER_CODES).includes(patient.gender)) {
    warnings.push(`INVALID gender value: ${patient.gender}`);
  }

  // Check birth date
  if (patient.birthDate) {
    const birthDate = new Date(patient.birthDate);
    if (isNaN(birthDate.getTime())) {
      errors.push('INVALID birthDate format');
    } else if (birthDate > new Date()) {
      warnings.push('birthDate cannot be a future date');
    }
  }

  // Check status
  if (patient.active !== undefined && typeof patient.active !== 'boolean') {
    errors.push('active FIELD must be a boolean');
  }
};

/**
 * Validate Encounter resource
 * @param {object} encounter - Encounter resource
 * @param {Array} errors - Error array
 * @param {Array} warnings - Warning array
 */
const validateEncounter = (encounter, errors, warnings) => {
  // chechk status
  if (!encounter.status) {
    errors.push('Encounter resource must contain status FIELD');
  } else if (!Object.values(ENCOUNTER_STATUS).includes(encounter.status)) {
    warnings.push(`UNKNOWN encounter status: ${encounter.status}`);
  }

  // check class
  if (!encounter.class) {
    errors.push('Encounter resource must contain class FIELD');
  } else if (!encounter.class.code) {
    errors.push('Encounter class must contain code FIELD');
  }

  // check subject reference
  if (!encounter.subject || !encounter.subject.reference) {
    errors.push('Encounter resource must contain subject.reference FIELD');
  } else if (!encounter.subject.reference.startsWith('Patient/')) {
    warnings.push('subject.reference should reference Patient resource');
  }

  // chechk period
  if (encounter.period) {
    if (encounter.period.start) {
      const startDate = new Date(encounter.period.start);
      if (isNaN(startDate.getTime())) {
        errors.push('INVALID period.start format');
      }
    }
    if (encounter.period.end) {
      const endDate = new Date(encounter.period.end);
      if (isNaN(endDate.getTime())) {
        errors.push('INVALID period.end format');
      } else if (encounter.period.start) {
        const startDate = new Date(encounter.period.start);
        if (endDate < startDate) {
          errors.push('period.end cannot be earlier than period.start');
        }
      }
    }
  }
};

/**
 * Validate Observation resource
 * @param {object} observation - Observation resource
 * @param {Array} errors - Error array
 * @param {Array} warnings - Warning array
 */
const validateObservation = (observation, errors, warnings) => {
  // check status
  if (!observation.status) {
    errors.push('Observation resource must contain status FIELD');
  } else if (!Object.values(OBSERVATION_STATUS).includes(observation.status)) {
    warnings.push(`UNKNOWN observation status: ${observation.status}`);
  }

  // chechk code
  if (!observation.code) {
    errors.push('Observation resource must contain code FIELD');
  } else if (!observation.code.coding || !Array.isArray(observation.code.coding)) {
    errors.push('Observation code must contain coding array');
  } else if (observation.code.coding.length === 0) {
    errors.push('Observation code.coding cannot be empty');
  }

  // check subject reference
  if (!observation.subject || !observation.subject.reference) {
    errors.push('Observation resource must contain subject.reference FIELD');
  }

  // check value
  if (!observation.valueQuantity && !observation.valueString && !observation.valueBoolean) {
    warnings.push('Observation should contain value FIELD');
  }

  // check effective date/time
  if (!observation.effectiveDateTime && !observation.effectivePeriod) {
    warnings.push('Observation should contain effectiveDateTime FIELD');
  }
};

/**
 * Validate FHIR Bundle
 * @param {object} bundle - FHIR Bundle
 * @returns {object} Validation result
 */
export const validateFHIRBundle = (bundle) => {
  const errors = [];
  const warnings = [];
  const resourceResults = [];

  if (!bundle) {
    return {
      isValid: false,
      errors: ['Bundle cannot be empty'],
      warnings: [],
      resourceResults: []
    };
  }

  if (bundle.resourceType !== 'Bundle') {
    errors.push('NOT a valid FHIR Bundle');
  }

  if (!bundle.entry || !Array.isArray(bundle.entry)) {
    errors.push('Bundle must contain entry array');
  } else {
    bundle.entry.forEach((entry, index) => {
      if (!entry.resource) {
        errors.push(`Bundle entry ${index} MISSING resource FIELD`);
      } else {
        const result = validateFHIRResource(entry.resource);
        resourceResults.push({
          index,
          resourceId: entry.resource.id,
          resourceType: entry.resource.resourceType,
          ...result
        });
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    resourceResults
  };
};

/**
 * Validate FHIR server response
 * @param {object} response - FHIR server response
 * @returns {object} Validation result
 */
export const validateFHIRResponse = (response) => {
  const errors = [];
  const warnings = [];

  if (!response) {
    return {
      isValid: false,
      errors: ['Response cannot be empty'],
      warnings: []
    };
  }

  // chechk HTTP status
  if (response.status && response.status >= 400) {
    errors.push(`HTTP ERROR: ${response.status}`);
  }

  // check Content-Type
  if (response.headers && response.headers['content-type']) {
    const contentType = response.headers['content-type'];
    if (!contentType.includes('application/fhir+json') && !contentType.includes('application/json')) {
      warnings.push(`Unexpected Content-Type: ${contentType}`);
    }
  }

  // Check response body
  if (response.data) {
    if (response.data.resourceType === 'Bundle') {
      return validateFHIRBundle(response.data);
    } else {
      return validateFHIRResource(response.data);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Generate validation report
 * @param {object} validationResult - Validation result
 * @returns {string} Formatted validation report
 */
export const generateValidationReport = (validationResult) => {
  let report = '';

  if (validationResult.isValid) {
    report += '✅ Validation passed\n';
  } else {
    report += '❌ Validation failed\n';
  }

  if (validationResult.errors && validationResult.errors.length > 0) {
    report += '\nErrors:\n';
    validationResult.errors.forEach(error => {
      report += `  • ${error}\n`;
    });
  }

  if (validationResult.warnings && validationResult.warnings.length > 0) {
    report += '\nWarnings:\n';
    validationResult.warnings.forEach(warning => {
      report += `  • ${warning}\n`;
    });
  }

  if (validationResult.resourceResults) {
    report += '\nResource validation results:\n';
    validationResult.resourceResults.forEach(result => {
      const status = result.isValid ? '✅' : '❌';
      report += `  ${status} ${result.resourceType} (${result.resourceId})\n`;
      if (result.errors && result.errors.length > 0) {
        result.errors.forEach(error => {
          report += `    • ${error}\n`;
        });
      }
    });
  }

  return report;
};

export default {
  validateFHIRResource,
  validateFHIRBundle,
  validateFHIRResponse,
  generateValidationReport
};
