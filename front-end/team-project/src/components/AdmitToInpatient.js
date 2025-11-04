import React from 'react';

const AdmitToInpatient = ({ admittedPatients }) => {
  if (!admittedPatients || admittedPatients.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6 text-center text-gray-500">
        <p>No patients admitted to inpatient wards.</p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Admit to Inpatient</h2>
        <p className="text-sm text-gray-600 mt-1">Total admitted: {admittedPatients.length}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admit Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bed Wait Time</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {admittedPatients.map((patient) => (
              <tr key={patient.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{patient.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(patient.admitTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{patient.department}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{patient.bedWaitTime} min</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdmitToInpatient;
