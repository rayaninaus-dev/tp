// ClinicalRecords.js
import React, { useState } from 'react';
import { FileText, Calendar, User, Search, Filter, Download, X } from 'lucide-react';

const ClinicalRecords = ({ data, fhirConnected = false }) => {
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const sanitizeToEnglish = (value, fallback = '') => {
    if (typeof value !== 'string') {
      return fallback;
    }
    const cleaned = value.replace(/[^\x20-\x7E]+/g, ' ').replace(/\s+/g, ' ').trim();
    return cleaned || fallback;
  };

  const resolveDoctorName = (patient = {}) => {
    const candidates = [
      patient.primaryDoctor,
      patient.attendingPhysician
    ].filter(Boolean);

    if (patient.rawFHIR?.encounter?.participant) {
      const participants = Array.isArray(patient.rawFHIR.encounter.participant)
        ? patient.rawFHIR.encounter.participant
        : [];
      participants.forEach(participant => {
        const display = participant?.individual?.display || participant?.individual?.reference;
        if (display) {
          candidates.push(display);
        }
      });
    }

    for (const candidate of candidates) {
      const sanitized = sanitizeToEnglish(candidate);
      if (sanitized) {
        const lower = sanitized.toLowerCase();
        if (lower.startsWith('dr') || lower.includes('md') || lower.includes('do')) {
          return sanitized;
        }
        return `Dr. ${sanitized}`;
      }
    }

    return 'Attending Physician';
  };

  const buildRecordSummary = (patient) => {
    const safeName = sanitizeToEnglish(patient.name, 'Patient');
    const genderLabel = patient.gender ? sanitizeToEnglish(patient.gender, 'unspecified') : 'unspecified';
    const departmentLabel = sanitizeToEnglish(patient.department, 'Emergency');
    const statusLabel = sanitizeToEnglish(patient.status, 'Under treatment');

    return `${safeName} (${patient.id}) • ${Number.isFinite(patient.age) ? `${patient.age} years old` : 'Age unavailable'} • ${genderLabel}. Status: ${statusLabel}. Department: ${departmentLabel}.`;
  };

  // Always use data from props, whether FHIR or mock
  const recordsData = data?.patients ? 
    data.patients.map(patient => ({
      id: patient.id,
      patientName: sanitizeToEnglish(patient.name, `Patient ${patient.id}`),
      patientId: patient.id,
      recordType: 'Patient Record',
      doctor: resolveDoctorName(patient),
      date: new Date().toISOString().split('T')[0],
      status: 'Completed',
      department: sanitizeToEnglish(patient.department, 'Emergency'),
      priority: patient.priority === 'critical' ? 'High' : 
                patient.priority === 'urgent' ? 'High' :
                patient.priority === 'high' ? 'Medium' : 'Low',
      content: buildRecordSummary(patient),
      diagnosis: sanitizeToEnglish(patient.diagnosis, 'Under evaluation'),
      treatment: sanitizeToEnglish(patient.treatment, 'Active treatment plan'),
      notes: sanitizeToEnglish(patient.notes, 'No additional notes available.')
    })) : [];

  const viewRecord = (record) => {
    setSelectedRecord(record);
    setIsViewModalOpen(true);
  };

  const editRecord = (record) => {
    setEditingRecord(record);
    setIsEditModalOpen(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'text-green-600 bg-green-100';
      case 'Pending Review': return 'text-yellow-600 bg-yellow-100';
      case 'Draft': return 'text-gray-600 bg-gray-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'text-red-600 bg-red-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'Low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-medical-dark">Clinical Records</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search records..."
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-medical-primary"
            />
          </div>
          <button className="px-4 py-2 bg-medical-primary text-white rounded-md hover:bg-medical-primary/90 transition-colors">
            <Filter className="w-4 h-4 mr-2 inline" />
            Filter
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recordsData.map((record) => (
          <div key={record.id} className="clinical-card rounded-xl shadow-clinical p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-medical-primary" />
                <span className="text-sm font-medium text-gray-600">{record.recordType}</span>
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(record.status)}`}>
                {record.status}
              </span>
            </div>

            <div className="mb-4">
              <h3 className="font-semibold text-medical-dark mb-2">{record.patientName}</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>ID: {record.patientId}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{record.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Department:</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(record.priority)}`}>
                    {record.department}
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-700 line-clamp-2">{record.content}</p>
            </div>

            <div className="flex items-center justify-between">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(record.priority)}`}>
                Priority: {record.priority}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => viewRecord(record)}
                  className="px-3 py-1 text-xs bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200 transition-colors"
                >
                  View
                </button>
                <button
                  onClick={() => editRecord(record)}
                  className="px-3 py-1 text-xs bg-green-100 text-green-600 rounded-md hover:bg-green-200 transition-colors"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {recordsData.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">No Records Found</h3>
          <p className="text-gray-500">No clinical records are available at the moment.</p>
        </div>
      )}

      {/* View Modal */}
      {isViewModalOpen && selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-medical-dark">Clinical Record Details</h3>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Patient Name</label>
                  <p className="text-gray-900">{selectedRecord.patientName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Patient ID</label>
                  <p className="text-gray-900">{selectedRecord.patientId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Record Type</label>
                  <p className="text-gray-900">{selectedRecord.recordType}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Doctor</label>
                  <p className="text-gray-900">{selectedRecord.doctor}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Date</label>
                  <p className="text-gray-900">{selectedRecord.date}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedRecord.status)}`}>
                    {selectedRecord.status}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Content</label>
                <p className="text-gray-900 mt-1 p-3 bg-gray-50 rounded-md">{selectedRecord.content}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Diagnosis</label>
                <p className="text-gray-900 mt-1 p-3 bg-gray-50 rounded-md">{selectedRecord.diagnosis}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Treatment</label>
                <p className="text-gray-900 mt-1 p-3 bg-gray-50 rounded-md">{selectedRecord.treatment}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Notes</label>
                <p className="text-gray-900 mt-1 p-3 bg-gray-50 rounded-md">{selectedRecord.notes}</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
              <button className="px-4 py-2 bg-medical-primary text-white rounded-md hover:bg-medical-primary/90 transition-colors">
                <Download className="w-4 h-4 mr-2 inline" />
                Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editingRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-medical-dark">Edit Clinical Record</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Patient Name</label>
                  <input
                    type="text"
                    value={editingRecord.patientName}
                    readOnly
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Patient ID</label>
                  <input
                    type="text"
                    value={editingRecord.patientId}
                    readOnly
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Diagnosis</label>
                <textarea
                  rows={3}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-medical-primary"
                  defaultValue={editingRecord.diagnosis}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Treatment</label>
                <textarea
                  rows={3}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-medical-primary"
                  defaultValue={editingRecord.treatment}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Notes</label>
                <textarea
                  rows={4}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-medical-primary"
                  defaultValue={editingRecord.notes}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-medical-primary text-white rounded-md hover:bg-medical-primary/90 transition-colors">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClinicalRecords;
