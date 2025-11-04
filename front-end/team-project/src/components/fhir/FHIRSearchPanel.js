// FHIRSearchPanel.js
import React, { useState } from 'react';
import { Search, Users, Activity, FileText, Database, AlertCircle } from 'lucide-react';
import restApiService from '../../services/restApiService';
import { FHIR_RESOURCE_TYPES } from '../../models/fhirTypes';

const FHIRSearchPanel = ({ onSearchResults, onResourceSelect }) => {
  const [resourceType, setResourceType] = useState(FHIR_RESOURCE_TYPES.PATIENT);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);

  const resourceOptions = [
    { value: FHIR_RESOURCE_TYPES.PATIENT, label: 'Patient', icon: Users },
    { value: FHIR_RESOURCE_TYPES.ENCOUNTER, label: 'Encounter', icon: Activity },
    { value: FHIR_RESOURCE_TYPES.OBSERVATION, label: 'Observation', icon: FileText },
  ];

  const performSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a search query');
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const results = await restApiService.searchResources(resourceType, { name: searchQuery, _count: 10 });
      setSearchResults(results);
      onSearchResults(results);
    } catch (err) {
      console.error('FHIR search failed:', err);
      setError(`Search failed: ${err.message}`);
      setSearchResults([]);
      onSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    performSearch();
  };

  const handleResourceClick = (resource) => {
    onResourceSelect(resource);
  };

  const getResourceIcon = (type) => {
    const option = resourceOptions.find(opt => opt.value === type);
    return option ? <option.icon className="w-4 h-4" /> : <Database className="w-4 h-4" />;
  };

  const formatResourceDisplay = (resource) => {
    switch (resource.resourceType) {
      case FHIR_RESOURCE_TYPES.PATIENT:
        const name = resource.name?.[0];
        const patientName = name ? `${name.given?.[0] || ''} ${name.family || ''}`.trim() : 'Unknown Patient';
        return `${patientName} (${resource.id})`;
      case FHIR_RESOURCE_TYPES.ENCOUNTER:
        const status = resource.status || 'Unknown';
        return `Encounter ${resource.id} - ${status}`;
      case FHIR_RESOURCE_TYPES.OBSERVATION:
        const code = resource.code?.coding?.[0]?.display || 'Unknown Observation';
        return `${code} (${resource.id})`;
      default:
        return `${resource.resourceType} ${resource.id}`;
    }
  };

  return (
    <div className="clinical-card rounded-xl shadow-clinical p-6">
      <h2 className="text-lg font-bold text-medical-dark mb-6 flex items-center gap-2">
        <Search className="w-5 h-5 text-medical-primary" />
        FHIR Resource Search
      </h2>

      <form onSubmit={handleSearchSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resource Type
            </label>
            <select
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary"
            >
              {resourceOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Query
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${resourceType}...`}
                className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSearching}
          className="w-full px-4 py-3 bg-medical-primary text-white rounded-lg hover:bg-medical-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSearching ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Searching...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              Search FHIR Resources
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="mt-6">
          <h3 className="text-md font-semibold text-medical-dark mb-4">
            Search Results ({searchResults.length})
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {searchResults.map((entry, index) => (
              <div
                key={entry.resource?.id || index}
                className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors border border-gray-200"
                onClick={() => handleResourceClick(entry.resource)}
              >
                <div className="flex items-center gap-3">
                  {getResourceIcon(entry.resource?.resourceType)}
                  <div>
                    <div className="font-medium text-gray-900">
                      {formatResourceDisplay(entry.resource)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {entry.resource?.resourceType} • {entry.resource?.id}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  Click to view details
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {searchResults.length === 0 && !isSearching && !error && (
        <div className="mt-6 text-center py-8">
          <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Enter a search query to find FHIR resources</p>
        </div>
      )}
    </div>
  );
};

export default FHIRSearchPanel;
