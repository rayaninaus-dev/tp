import React, { useState } from 'react';
import { Users, Heart, Activity, Thermometer, Zap, Brain, Clock3, AlertCircle, FileCode, X } from 'lucide-react';
import restApiService from '../services/restApiService';
import dataSyncService from '../services/dataSyncService';

/**
 * Patient List Component
 *
 * Displays a list of patients with their status, priority, department, and wait time.
 *
 * FHIR Alignment:
 * - Patient data corresponds to FHIR Patient resource
 * - Status aligns with FHIR Encounter.status
 * - Priority maps to FHIR Encounter.priority
 * - Department maps to FHIR Encounter.serviceType
 * - Wait time calculated from FHIR Encounter.period
 * - Vitals data from FHIR Observation resources
 */

const statusColors = {
  waiting: 'bg-amber-100 text-amber-800',
  'in-treatment': 'bg-blue-100 text-blue-800',
  admitted: 'bg-purple-100 text-purple-800',
  completed: 'bg-emerald-100 text-emerald-800'
};

const priorityColors = {
  urgent: 'bg-red-100 text-red-800',
  normal: 'bg-slate-100 text-slate-800',
  low: 'bg-green-100 text-green-800'
};

const PatientCard = ({ patient, onViewTimeline, onTimelineClick, onEnhancedTimelineClick, onShowFHIRDetails }) => {
  const PriorityIcon = patient.priority === 'urgent' ? AlertCircle : Activity;
  const hasFHIRDetails = patient.rawFHIR !== undefined && patient.rawFHIR !== null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col hover:shadow-md transition-shadow duration-300">
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-gradient-to-br from-medical-primary to-medical-dark rounded-full flex-shrink-0 flex items-center justify-center text-white font-semibold">
            {patient.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="flex items-center gap-2">
            <div>
              <h3 className="font-semibold text-medical-dark leading-tight">{patient.name}</h3>
              <p className="text-sm text-medical-neutral">{patient.age}yo | {patient.gender} | {patient.id}</p>
            </div>
            <button
              type="button"
              onClick={() => onShowFHIRDetails && onShowFHIRDetails(patient)}
              className={`ml-2 inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold border rounded-md focus:outline-none focus:ring-2 focus:ring-medical-primary/40 transition-colors ${
                hasFHIRDetails
                  ? 'text-slate-600 border-slate-200 hover:text-medical-primary hover:border-medical-primary'
                  : 'text-slate-500 border-slate-200 hover:text-slate-600 hover:border-slate-300'
              }`}
              aria-label={`Show FHIR bundle JSON for ${patient.name}`}
            >
              <FileCode className="w-4 h-4" />
              <span>View JSON</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[patient.status]}`}>
            {patient.status.replace('-', ' ')}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${priorityColors[patient.priority]}`}>
            <PriorityIcon className="w-3 h-3" />
            {patient.priority}
          </span>
        </div>
      </div>

      <div className="px-4 pb-4 space-y-4">
        <hr className="border-slate-100" />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase">Department</p>
            <p className="text-sm font-semibold text-slate-800">{patient.department}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase">Wait Time</p>
            <p className="text-sm font-semibold text-slate-800">{patient.waitTime} min</p>
          </div>
        </div>

        {patient.vitals && (
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase mb-2">Latest Vitals</p>
            <div className="bg-slate-50 rounded-lg p-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span className="text-slate-600">HR: <span className="font-semibold text-slate-800">{patient.vitals.hr}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className="text-slate-600">BP: <span className="font-semibold text-slate-800">{patient.vitals.bp}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <span className="text-slate-600">Temp: <span className="font-semibold text-slate-800">{patient.vitals.temp}°C</span></span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-slate-600">SpO2: <span className="font-semibold text-slate-800">{patient.vitals.spo2}%</span></span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-auto p-4 border-t border-slate-100 space-y-2">
        <button
          onClick={() => onEnhancedTimelineClick && onEnhancedTimelineClick(patient)}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg text-sm font-medium hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-sm"
          aria-label={`View enhanced AI timeline for ${patient.name}`}
        >
          <Brain className="w-4 h-4" />
          AI Enhanced Timeline
        </button>

        <button
          onClick={() => onTimelineClick && onTimelineClick(patient)}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-600 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
          aria-label={`View standard timeline for ${patient.name}`}
        >
          <Clock3 className="w-4 h-4" />
          Standard Timeline
        </button>
      </div>
    </div>
  );
};

const PatientList = ({ patients, onPatientClick, onTimelineClick, onEnhancedTimelineClick }) => {
  const [fhirDetails, setFhirDetails] = useState(null);
  const [isFetchingBundle, setIsFetchingBundle] = useState(false);

  const closeFHIRDetails = () => {
    setFhirDetails(null);
    setIsFetchingBundle(false);
  };

  const handleShowFHIRDetails = async (patient) => {
    const hasEmbeddedBundle = Boolean(patient.rawFHIR);

    if (hasEmbeddedBundle) {
      setFhirDetails({
        name: patient.name,
        payload: patient.rawFHIR
      });
      setIsFetchingBundle(false);
      return;
    }

    const dataSource = dataSyncService.getCachedData()?.dataSource;

    if (!restApiService.isConnected || dataSource !== 'fhir') {
      setFhirDetails({
        name: patient.name,
        payload: { message: 'No FHIR bundle is available for this patient (data source is mock).' }
      });
      setIsFetchingBundle(false);
      return;
    }

    setIsFetchingBundle(true);
    setFhirDetails({
      name: patient.name,
      payload: { message: 'Loading FHIR bundle...' }
    });

    try {
      const bundle = await restApiService.getPatientBundle(patient.id);
      if (bundle) {
        setFhirDetails({
          name: patient.name,
          payload: bundle
        });
      } else {
        setFhirDetails({
          name: patient.name,
          payload: { message: 'FHIR bundle not found for this patient.' }
        });
      }
    } catch (error) {
      setFhirDetails({
        name: patient.name,
        payload: { message: `Failed to fetch FHIR bundle: ${error.message}` }
      });
    } finally {
      setIsFetchingBundle(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          <span>Current Patients</span>
        </h2>
        <div className="text-sm bg-blue-100 text-blue-700 font-semibold px-3 py-1 rounded-full">{patients.length} Active</div>
      </div>
      {patients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {patients.map(patient => (
            <PatientCard
              key={patient.id}
              patient={patient}
              onViewTimeline={onPatientClick}
              onTimelineClick={onTimelineClick}
              onEnhancedTimelineClick={onEnhancedTimelineClick}
              onShowFHIRDetails={handleShowFHIRDetails}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-slate-500 bg-slate-50 rounded-lg">
          <Users className="w-10 h-10 mx-auto mb-3 text-slate-400" />
          <p className="font-medium">No patient data available</p>
          <p className="text-sm">Patients matching the current filters will appear here.</p>
        </div>
      )}

      {fhirDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-full overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">
                FHIR Bundle Details - {fhirDetails.name}
              </h3>
              <button
                type="button"
                onClick={closeFHIRDetails}
                className="text-slate-500 hover:text-slate-700 transition-colors"
                aria-label="Close FHIR details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-auto text-sm bg-slate-50">
              <pre className="whitespace-pre-wrap break-words text-slate-700">
                {isFetchingBundle && fhirDetails?.payload?.message === 'Loading FHIR bundle...'
                  ? 'Loading FHIR bundle...'
                  : JSON.stringify(fhirDetails.payload ?? { message: 'No bundle data available.' }, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientList;
