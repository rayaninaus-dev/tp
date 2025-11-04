// FHIRConnectionManager.js
import React, { useState, useEffect } from 'react';
import { Wifi, Settings, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import restApiService from '../../services/restApiService';

const FHIRConnectionManager = ({ onConnectionChange }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [serverUrl, setServerUrl] = useState('https://hapi.fhir.org/baseR4');
  const [showSettings, setShowSettings] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);

  // Test FHIR servers
  const testServers = [
    { name: 'HAPI FHIR (Public)', url: 'https://hapi.fhir.org/baseR4' },
    { name: 'HAPI FHIR (R3)', url: 'https://hapi.fhir.org/baseR3' },
    { name: 'Firely (Public)', url: 'https://r3.smarthealthit.org' },
    { name: 'Firely (R4)', url: 'https://r4.smarthealthit.org' }
  ];

  const checkConnection = async (url = serverUrl) => {
    setIsChecking(true);
    setConnectionError(null);

    try {
      // Update REST API service base URL
      restApiService.baseUrl = url;

      // Test the connection
      const connected = await restApiService.testConnection();

      if (connected) {
        setIsConnected(true);
        onConnectionChange(true);
        setServerUrl(url);
        setLastChecked(new Date());
        try {
          localStorage.setItem('fhir.serverUrl', url);
          localStorage.setItem('fhir.connected', 'true');
        } catch {}
        console.log('REST API connection successful:', url);
      } else {
        throw new Error('Connection test failed');
      }
    } catch (error) {
      console.error('REST API connection failed:', error);
      setConnectionError(error.message);
      setIsConnected(false);
      onConnectionChange(false);
      setLastChecked(new Date());
      try {
        localStorage.setItem('fhir.connected', 'false');
      } catch {}
    } finally {
      setIsChecking(false);
    }
  };

  const handleServerSelect = (url) => {
    setServerUrl(url);
    checkConnection(url);
  };

  const handleManualConnect = () => {
    if (serverUrl.trim()) {
      checkConnection(serverUrl.trim());
    }
  };

  useEffect(() => {
    // Restore saved server URL and connection state
    try {
      const savedUrl = localStorage.getItem('fhir.serverUrl');
      const savedConnected = localStorage.getItem('fhir.connected') === 'true';
      if (savedUrl) {
        setServerUrl(savedUrl);
      }
      if (savedConnected && (savedUrl || serverUrl)) {
        checkConnection(savedUrl || serverUrl);
        return;
      }
    } catch {}
    // Default initial check
    checkConnection();
  }, []);

  const getStatusIcon = () => {
    if (isChecking) {
      return <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
    }
    if (isConnected) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    return <XCircle className="w-5 h-5 text-red-500" />;
  };

  const getStatusColor = () => {
    if (isChecking) return 'text-blue-600 bg-blue-100';
    if (isConnected) return 'text-green-600 bg-green-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="clinical-card rounded-xl shadow-clinical p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-medical-dark flex items-center gap-2">
          <Wifi className="w-5 h-5 text-medical-primary" />
          FHIR Connection Manager
        </h2>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          title="Connection Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Connection Status */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
              {isChecking ? 'Checking...' : isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <button
            onClick={() => checkConnection()}
            disabled={isChecking}
            className="px-3 py-1 text-sm bg-medical-primary text-white rounded-md hover:bg-medical-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isChecking ? 'Testing...' : 'Test Connection'}
          </button>
        </div>

        {connectionError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-700">Connection Error: {connectionError}</span>
            </div>
          </div>
        )}

        {lastChecked && (
          <div className="text-sm text-gray-600">
            Last checked: {lastChecked.toLocaleTimeString()}
          </div>
        )}

        {/* Connection Settings */}
        {showSettings && (
          <div className="border-t border-gray-200 pt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                FHIR Server URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="https://your-fhir-server.com/fhir"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-medical-primary"
                />
                <button
                  onClick={handleManualConnect}
                  disabled={isChecking || !serverUrl.trim()}
                  className="px-4 py-2 bg-medical-primary text-white rounded-md hover:bg-medical-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Connect
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Servers
              </label>
              <div className="grid grid-cols-1 gap-2">
                {testServers.map((server) => (
                  <button
                    key={server.url}
                    onClick={() => handleServerSelect(server.url)}
                    disabled={isChecking}
                    className={`p-2 text-left text-sm rounded-md border transition-colors ${
                      serverUrl === server.url
                        ? 'border-medical-primary bg-medical-primary/10 text-medical-primary'
                        : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className="font-medium">{server.name}</div>
                    <div className="text-xs text-gray-500">{server.url}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 rounded-md p-3">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Connection Tips</h4>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>Public servers may have rate limits</li>
                <li>Some servers require authentication</li>
                <li>Check server compatibility with FHIR R4</li>
                <li>Use HTTPS for production environments</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FHIRConnectionManager;