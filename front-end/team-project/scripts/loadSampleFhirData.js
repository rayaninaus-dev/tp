/**
 * Seed a handful of demo resources (Patient + Encounter + Observation)
 * into a FHIR server so the dashboard can pick up live data.
 *
 * Usage:
 *   node scripts/loadSampleFhirData.js
 *
 * Environment variables:
 *   FHIR_BASE_URL   (defaults to https://r4.smarthealthit.org)
 */

const BASE_URL = process.env.FHIR_BASE_URL || 'https://r4.smarthealthit.org';

const SAMPLE_PATIENTS = [
  {
    resourceType: 'Patient',
    id: 'pt-ed-demo-1',
    name: [{ family: 'Hughes', given: ['Alex'] }],
    gender: 'male',
    birthDate: '1985-03-12',
    telecom: [{ system: 'phone', value: '+1-555-0100' }],
    address: [
      {
        line: ['45 Emergency Way'],
        city: 'Boston',
        state: 'MA',
        postalCode: '02118',
        country: 'US'
      }
    ]
  },
  {
    resourceType: 'Patient',
    id: 'pt-ed-demo-2',
    name: [{ family: 'Garcia', given: ['Maria'] }],
    gender: 'female',
    birthDate: '1992-07-22',
    telecom: [{ system: 'phone', value: '+1-555-0200' }],
    address: [
      {
        line: ['220 Main Street'],
        city: 'Seattle',
        state: 'WA',
        postalCode: '98104',
        country: 'US'
      }
    ]
  },
  {
    resourceType: 'Patient',
    id: 'pt-ed-demo-3',
    name: [{ family: 'Okafor', given: ['Chidi'] }],
    gender: 'male',
    birthDate: '1978-11-02',
    telecom: [{ system: 'phone', value: '+1-555-0300' }],
    address: [
      {
        line: ['12 Harbor Avenue'],
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94107',
        country: 'US'
      }
    ]
  }
];

const SAMPLE_ENCOUNTERS = [
  {
    resourceType: 'Encounter',
    id: 'enc-ed-demo-1',
    status: 'in-progress',
    class: {
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: 'EMER',
      display: 'emergency'
    },
    subject: { reference: 'Patient/pt-ed-demo-1' },
    serviceType: {
      coding: [
        {
          system: 'http://snomed.info/sct',
          code: '50849002',
          display: 'Emergency medicine'
        }
      ]
    },
    period: {
      start: '2024-05-01T12:15:00Z'
    },
    reasonCode: [
      {
        coding: [
          {
            system: 'http://snomed.info/sct',
            code: '251146004',
            display: 'Chest pain'
          }
        ]
      }
    ]
  },
  {
    resourceType: 'Encounter',
    id: 'enc-ed-demo-2',
    status: 'in-progress',
    class: {
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: 'EMER'
    },
    subject: { reference: 'Patient/pt-ed-demo-2' },
    serviceType: {
      coding: [
        {
          system: 'http://snomed.info/sct',
          code: '394802001',
          display: 'Trauma surgery'
        }
      ]
    },
    period: {
      start: '2024-05-02T08:05:00Z'
    },
    reasonCode: [
      {
        coding: [
          {
            system: 'http://snomed.info/sct',
            code: '262542000',
            display: 'Fall on stairs'
          }
        ]
      }
    ]
  },
  {
    resourceType: 'Encounter',
    id: 'enc-ed-demo-3',
    status: 'finished',
    class: {
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: 'EMER'
    },
    subject: { reference: 'Patient/pt-ed-demo-3' },
    serviceType: {
      coding: [
        {
          system: 'http://snomed.info/sct',
          code: '422191005',
          display: 'General medical service'
        }
      ]
    },
    period: {
      start: '2024-04-29T19:20:00Z',
      end: '2024-04-29T22:45:00Z'
    },
    reasonCode: [
      {
        coding: [
          {
            system: 'http://snomed.info/sct',
            code: '195662009',
            display: 'Asthma attack'
          }
        ]
      }
    ]
  }
];

const SAMPLE_OBSERVATIONS = [
  {
    resourceType: 'Observation',
    id: 'obs-ed-demo-1',
    status: 'final',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'vital-signs'
          }
        ]
      }
    ],
    code: {
      coding: [
        {
          system: 'http://loinc.org',
          code: '8867-4',
          display: 'Heart rate'
        }
      ]
    },
    subject: { reference: 'Patient/pt-ed-demo-1' },
    encounter: { reference: 'Encounter/enc-ed-demo-1' },
    effectiveDateTime: '2024-05-01T12:25:00Z',
    valueQuantity: {
      value: 92,
      unit: 'beats/minute',
      system: 'http://unitsofmeasure.org',
      code: '/min'
    }
  },
  {
    resourceType: 'Observation',
    id: 'obs-ed-demo-2',
    status: 'final',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'vital-signs'
          }
        ]
      }
    ],
    code: {
      coding: [
        {
          system: 'http://loinc.org',
          code: '8480-6',
          display: 'Systolic blood pressure'
        }
      ]
    },
    subject: { reference: 'Patient/pt-ed-demo-2' },
    encounter: { reference: 'Encounter/enc-ed-demo-2' },
    effectiveDateTime: '2024-05-02T08:15:00Z',
    valueQuantity: {
      value: 138,
      unit: 'mmHg',
      system: 'http://unitsofmeasure.org',
      code: 'mm[Hg]'
    }
  },
  {
    resourceType: 'Observation',
    id: 'obs-ed-demo-3',
    status: 'final',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'vital-signs'
          }
        ]
      }
    ],
    code: {
      coding: [
        {
          system: 'http://loinc.org',
          code: '59408-5',
          display: 'Oxygen saturation in Arterial blood by Pulse oximetry'
        }
      ]
    },
    subject: { reference: 'Patient/pt-ed-demo-3' },
    encounter: { reference: 'Encounter/enc-ed-demo-3' },
    effectiveDateTime: '2024-04-29T19:45:00Z',
    valueQuantity: {
      value: 96,
      unit: '%',
      system: 'http://unitsofmeasure.org',
      code: '%'
    }
  }
];

const RESOURCES = [...SAMPLE_PATIENTS, ...SAMPLE_ENCOUNTERS, ...SAMPLE_OBSERVATIONS];

async function putResource(resource) {
  const url = `${BASE_URL}/${resource.resourceType}/${resource.id}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/fhir+json',
      Accept: 'application/fhir+json'
    },
    body: JSON.stringify(resource)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${response.statusText}\n${text}`);
  }
}

async function main() {
  console.log(`Seeding sample ED data into ${BASE_URL} ...`);

  for (const resource of RESOURCES) {
    try {
      await putResource(resource);
      console.log(`✔︎ Upserted ${resource.resourceType}/${resource.id}`);
    } catch (error) {
      console.error(`✖ Failed ${resource.resourceType}/${resource.id}:`, error.message);
    }
  }

  console.log('Done. Refresh the dashboard to pull the live data.');
}

main().catch((error) => {
  console.error('Unexpected error seeding FHIR data:', error);
  process.exit(1);
});
