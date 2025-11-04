// FHIRResourceViewer.js
import React from 'react';
import { X, User, Calendar, Activity, FileText, Database, Copy, Download } from 'lucide-react';
import { FHIR_RESOURCE_TYPES } from '../../models/fhirTypes';

const FHIRResourceViewer = ({ resource, onClose }) => {
  if (!resource) return null;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(resource, null, 2));
  };

  const downloadResource = () => {
    const blob = new Blob([JSON.stringify(resource, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${resource.resourceType}-${resource.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getResourceIcon = (type) => {
    switch (type) {
      case FHIR_RESOURCE_TYPES.PATIENT: return <User className="w-5 h-5" />;
      case FHIR_RESOURCE_TYPES.ENCOUNTER: return <Activity className="w-5 h-5" />;
      case FHIR_RESOURCE_TYPES.OBSERVATION: return <FileText className="w-5 h-5" />;
      default: return <Database className="w-5 h-5" />;
    }
  };

  const formatResourceData = (resource) => {
    const formatted = {
      resourceType: resource.resourceType,
      id: resource.id,
      meta: resource.meta,
      ...resource
    };
    return formatted;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {getResourceIcon(resource.resourceType)}
            <div>
              <h2 className="text-xl font-bold text-medical-dark">
                {resource.resourceType} Resource
              </h2>
              <p className="text-sm text-gray-600">ID: {resource.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyToClipboard}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              title="Copy to clipboard"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={downloadResource}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              title="Download JSON"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-6">
            {/* Resource Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-medical-dark mb-3">Resource Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Resource Type:</span>
                  <span className="ml-2 text-gray-900">{resource.resourceType}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">ID:</span>
                  <span className="ml-2 text-gray-900">{resource.id}</span>
                </div>
                {resource.meta?.lastUpdated && (
                  <div>
                    <span className="font-medium text-gray-600">Last Updated:</span>
                    <span className="ml-2 text-gray-900">
                      {new Date(resource.meta.lastUpdated).toLocaleString()}
                    </span>
                  </div>
                )}
                {resource.meta?.versionId && (
                  <div>
                    <span className="font-medium text-gray-600">Version:</span>
                    <span className="ml-2 text-gray-900">{resource.meta.versionId}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Raw JSON Data */}
            <div>
              <h3 className="text-lg font-semibold text-medical-dark mb-3">Raw JSON Data</h3>
              <div className="bg-gray-900 rounded-lg p-4 overflow-auto">
                <pre className="text-sm text-gray-100 whitespace-pre-wrap break-all">
                  {JSON.stringify(formatResourceData(resource), null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            FHIR R4 Resource • {resource.resourceType}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyToClipboard}
              className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copy JSON
            </button>
            <button
              onClick={downloadResource}
              className="px-4 py-2 text-sm bg-medical-primary text-white rounded-lg hover:bg-medical-primary/90 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FHIRResourceViewer;
