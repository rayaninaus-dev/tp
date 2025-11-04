export const WAIT_TIME_METRICS = [
  {
    key: 'triageToNurse',
    label: 'Triage to Nurse',
    display: 'Triage -> Nurse',
    defaultValue: 8,
    mediumThreshold: 10,
    highThreshold: 15
  },
  {
    key: 'triageToDoctor',
    label: 'Triage to Doctor',
    display: 'Triage -> Doctor',
    defaultValue: 24,
    mediumThreshold: 30,
    highThreshold: 45
  },
  {
    key: 'pathologyRequestToResult',
    label: 'Pathology Request to Result',
    display: 'Pathology Request -> Result',
    defaultValue: 52,
    mediumThreshold: 60,
    highThreshold: 90
  },
  {
    key: 'imagingRequestToReported',
    label: 'Imaging Request to Reported',
    display: 'Imaging Request -> Reported',
    defaultValue: 78,
    mediumThreshold: 90,
    highThreshold: 120
  },
  {
    key: 'admissionRequestToBed',
    label: 'Admission Request to Bed',
    display: 'Admission Request -> Bed',
    defaultValue: 95,
    mediumThreshold: 120,
    highThreshold: 180
  },
  {
    key: 'bedAllocationToDeparture',
    label: 'Bed Allocation to Departure',
    display: 'Bed Allocation -> Departure',
    defaultValue: 22,
    mediumThreshold: 30,
    highThreshold: 60
  },
  {
    key: 'triageToPathologyRequest',
    label: 'Triage to Pathology Request',
    display: 'Triage -> Pathology Request',
    defaultValue: 30,
    mediumThreshold: 40,
    highThreshold: 65
  },
  {
    key: 'pathologyRequestToCollected',
    label: 'Pathology Request to Collected',
    display: 'Pathology Request -> Collected',
    defaultValue: 18,
    mediumThreshold: 30,
    highThreshold: 50
  },
  {
    key: 'pathologyCollectedToResult',
    label: 'Pathology Collected to Result',
    display: 'Pathology Collected -> Result',
    defaultValue: 24,
    mediumThreshold: 45,
    highThreshold: 70
  },
  {
    key: 'triageToImagingRequest',
    label: 'Triage to Imaging Request',
    display: 'Triage -> Imaging Request',
    defaultValue: 40,
    mediumThreshold: 45,
    highThreshold: 70
  },
  {
    key: 'imagingRequestToComplete',
    label: 'Imaging Request to Complete',
    display: 'Imaging Request -> Complete',
    defaultValue: 36,
    mediumThreshold: 60,
    highThreshold: 90
  },
  {
    key: 'imagingCompleteToReported',
    label: 'Imaging Complete to Reported',
    display: 'Imaging Complete -> Reported',
    defaultValue: 38,
    mediumThreshold: 50,
    highThreshold: 80
  },
  {
    key: 'doctorToSeniorDoctor',
    label: 'Doctor to Senior Doctor',
    display: 'Doctor -> Senior Doctor',
    defaultValue: 22,
    mediumThreshold: 25,
    highThreshold: 40
  },
  {
    key: 'doctorToDeparture',
    label: 'Doctor to Departure',
    display: 'Doctor -> Departure',
    defaultValue: 64,
    mediumThreshold: 70,
    highThreshold: 100
  },
  {
    key: 'doctorToReferral',
    label: 'Doctor to Referral',
    display: 'Doctor -> Referral',
    defaultValue: 30,
    mediumThreshold: 35,
    highThreshold: 60
  },
  {
    key: 'referralToDeparture',
    label: 'Referral to Departure',
    display: 'Referral -> Departure',
    defaultValue: 46,
    mediumThreshold: 60,
    highThreshold: 90
  },
  {
    key: 'referralToAdmissionRequest',
    label: 'Referral to Admission Request',
    display: 'Referral -> Admission Request',
    defaultValue: 34,
    mediumThreshold: 45,
    highThreshold: 65
  },
  {
    key: 'admissionRequestToBedRequest',
    label: 'Admission Request to Bed Request',
    display: 'Admission Request -> Bed Request',
    defaultValue: 48,
    mediumThreshold: 70,
    highThreshold: 110
  },
  {
    key: 'bedRequestToBedAllocation',
    label: 'Bed Request to Bed Allocation',
    display: 'Bed Request -> Bed Allocation',
    defaultValue: 26,
    mediumThreshold: 40,
    highThreshold: 60
  },
  {
    key: 'bedAllocationToBedDeparture',
    label: 'Bed Allocation to Bed Departure',
    display: 'Bed Allocation -> Bed Departure',
    defaultValue: 24,
    mediumThreshold: 30,
    highThreshold: 60
  }
];

export const PRIMARY_WAIT_KEYS = [
  { key: 'triageToNurse', weight: 0.15 },
  { key: 'triageToDoctor', weight: 0.2 },
  { key: 'triageToImagingRequest', weight: 0.1 },
  { key: 'imagingRequestToComplete', weight: 0.15 },
  { key: 'admissionRequestToBed', weight: 0.3 },
  { key: 'bedAllocationToDeparture', weight: 0.1 }
];

const metricsByKey = WAIT_TIME_METRICS.reduce((acc, metric) => {
  acc[metric.key] = metric;
  return acc;
}, {});

const metricsByLabel = WAIT_TIME_METRICS.reduce((acc, metric) => {
  acc[metric.label] = metric;
  return acc;
}, {});

export const sanitizeWaitMinutes = (rawValue, metric = null) => {
  const fallback = Number.isFinite(metric?.defaultValue) ? metric.defaultValue : 0;

  if (!Number.isFinite(rawValue)) {
    return fallback;
  }

  const rounded = Math.max(0, Math.round(rawValue));
  const highThreshold = Number.isFinite(metric?.highThreshold) && metric.highThreshold > 0
    ? metric.highThreshold
    : Math.max(fallback, 90);
  const cap = Math.max(highThreshold, fallback, 60);

  if (rounded > cap) {
    return cap;
  }

  return rounded;
};

export const buildDefaultTurnaround = () => {
  const defaults = {};
  WAIT_TIME_METRICS.forEach(metric => {
    defaults[metric.label] = metric.defaultValue;
  });
  return defaults;
};

export const buildAnnotatedBreakdown = (turnaround = {}) => {
  return WAIT_TIME_METRICS.map(metric => {
    const rawValue = typeof turnaround[metric.label] === 'number'
      ? turnaround[metric.label]
      : metric.defaultValue;
    const value = sanitizeWaitMinutes(rawValue, metric);
    return {
      step: metric.display,
      average: value,
      medium: metric.mediumThreshold,
      high: metric.highThreshold
    };
  });
};

export const aggregateWaitMetrics = (patients = []) => {
  if (!Array.isArray(patients) || patients.length === 0) {
    const fallbackTurnaround = buildDefaultTurnaround();
    return {
      turnaround: fallbackTurnaround,
      waitBreakdown: buildAnnotatedBreakdown(fallbackTurnaround),
      countsByMetric: {},
      patientCount: 0,
      overallAverageMinutes: computeOverallAverageWait([], fallbackTurnaround)
    };
  }

  const totals = {};
  const counts = {};

  patients.forEach(patient => {
    const metrics = patient?.waitMetrics;
    if (!metrics || typeof metrics !== 'object') {
      return;
    }

    Object.entries(metrics).forEach(([key, rawValue]) => {
      const value = Number(rawValue);
      if (!Number.isFinite(value)) {
        return;
      }
      const metric = metricsByKey[key];
      const sanitizedValue = sanitizeWaitMinutes(value, metric);
      totals[key] = (totals[key] || 0) + sanitizedValue;
      counts[key] = (counts[key] || 0) + 1;
    });
  });

  const turnaround = {};
  WAIT_TIME_METRICS.forEach(metric => {
    const total = totals[metric.key];
    const count = counts[metric.key];
    if (total !== undefined && count > 0) {
      const averaged = total / count;
      turnaround[metric.label] = sanitizeWaitMinutes(averaged, metric);
    } else {
      turnaround[metric.label] = metric.defaultValue;
    }
  });

  const waitBreakdown = buildAnnotatedBreakdown(turnaround);
  const overallAverageMinutes = computeOverallAverageWait(patients, turnaround);

  return {
    turnaround,
    waitBreakdown,
    countsByMetric: counts,
    patientCount: patients.length,
    overallAverageMinutes
  };
};

export const getMetricByDisplay = (displayLabel) => {
  return WAIT_TIME_METRICS.find(metric => metric.display === displayLabel);
};

export const getMetricByLabel = (label) => metricsByLabel[label];

export const getMetricDisplayFromLabel = (label) => metricsByLabel[label]?.display ?? label;

export const getMetricLabelFromKey = (key) => metricsByKey[key]?.label ?? key;

function computeOverallAverageWait(patients, fallbackTurnaround = null) {
  let cumulativeMinutes = 0;
  let patientCounter = 0;

  if (Array.isArray(patients) && patients.length > 0) {
    patients.forEach(patient => {
      const metrics = patient?.waitMetrics;
      if (!metrics || typeof metrics !== 'object') return;

      let weightedTotal = 0;
      let totalWeight = 0;

      PRIMARY_WAIT_KEYS.forEach(({ key, weight = 1 }) => {
        const value = Number(metrics[key]);
        if (Number.isFinite(value)) {
          const metric = metricsByKey[key];
          const sanitizedValue = sanitizeWaitMinutes(value, metric);
          weightedTotal += sanitizedValue * weight;
          totalWeight += weight;
        }
      });

      if (totalWeight > 0) {
        cumulativeMinutes += weightedTotal / totalWeight;
        patientCounter += 1;
      }
    });
  }

  if (patientCounter > 0) {
    return Math.round(cumulativeMinutes / patientCounter);
  }

  const reference = fallbackTurnaround || buildDefaultTurnaround();
  let totalWeight = 0;
  const totalFromDefaults = PRIMARY_WAIT_KEYS.reduce((sum, { key, weight = 1 }) => {
    const metric = metricsByKey[key];
    if (!metric) return sum;

    const label = metric.label;
    const fallbackValue = reference[label];
    totalWeight += weight;
    if (typeof fallbackValue === 'number') {
      return sum + fallbackValue * weight;
    }

    return sum + (metric.defaultValue || 0) * weight;
  }, 0);

  const normalizer = totalWeight > 0 ? totalWeight : 1;
  return Math.round(totalFromDefaults / normalizer);
}
