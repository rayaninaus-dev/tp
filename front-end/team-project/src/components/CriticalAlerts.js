// CriticalAlerts.js
import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, X, Bell, Clock, User, Activity, Heart } from 'lucide-react';

const sanitizeText = (value, fallback) => {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.replace(/[^\x20-\x7E]+/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned || fallback;
};

const CriticalAlerts = ({ data, fhirConnected = false }) => {
  const initialAlertsData = useMemo(() => {
    if (fhirConnected && Array.isArray(data?.alerts)) {
      return data.alerts.map((alert, index) => ({
        id: alert.id || `alert-${index}`,
        type:
          alert.severity === 'critical'
            ? 'Critical'
            : alert.severity === 'warning'
            ? 'Warning'
            : 'Info',
        title: sanitizeText(alert.title, 'System Alert'),
        description: sanitizeText(alert.description, 'No description available'),
        patient: sanitizeText(alert.patient, 'Patient'),
        patientId: sanitizeText(alert.patientId, 'N/A'),
        location: sanitizeText(alert.location, 'Emergency'),
        timestamp: alert.timestamp || 'Just now',
        status: alert.status || 'Active',
        priority: alert.priority || 'Medium',
        assignedTo: alert.assignedTo || 'System'
      }));
    }

    return [
      {
        id: '1',
        type: 'Critical',
        title: 'Patient Code Blue',
        description: 'Patient P001 requires immediate resuscitation',
        patient: 'John Doe',
        patientId: 'P001',
        location: 'Room 101',
        timestamp: '2 minutes ago',
        status: 'Active',
        priority: 'Critical',
        assignedTo: 'Dr. Smith'
      },
      {
        id: '2',
        type: 'Warning',
        title: 'Vital Signs Alert',
        description: 'Patient P002 showing abnormal vital signs',
        patient: 'Jane Smith',
        patientId: 'P002',
        location: 'Room 102',
        timestamp: '5 minutes ago',
        status: 'Active',
        priority: 'High',
        assignedTo: 'Dr. Johnson'
      },
      {
        id: '3',
        type: 'Info',
        title: 'Medication Due',
        description: 'Patient P003 medication administration due',
        patient: 'Bob Johnson',
        patientId: 'P003',
        location: 'Room 103',
        timestamp: '10 minutes ago',
        status: 'Pending',
        priority: 'Medium',
        assignedTo: 'Nurse Brown'
      },
      {
        id: '4',
        type: 'Critical',
        title: 'Equipment Failure',
        description: 'Ventilator in Room 104 malfunctioning',
        patient: 'Alice Wilson',
        patientId: 'P004',
        location: 'Room 104',
        timestamp: '15 minutes ago',
        status: 'Resolved',
        priority: 'Critical',
        assignedTo: 'Tech Davis'
      }
    ];
  }, [data?.alerts, fhirConnected]);

  const [alerts, setAlerts] = useState(initialAlertsData);

  useEffect(() => {
    setAlerts(initialAlertsData);
  }, [initialAlertsData]);

  const displayData = alerts;

  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const getAlertIcon = (type) => {
    switch (type) {
      case 'Critical': return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'Warning': return <Bell className="w-5 h-5 text-yellow-500" />;
      case 'Info': return <Activity className="w-5 h-5 text-blue-500" />;
      default: return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getAlertColor = (type) => {
    switch (type) {
      case 'Critical': return 'border-red-200 bg-red-50';
      case 'Warning': return 'border-yellow-200 bg-yellow-50';
      case 'Info': return 'border-blue-200 bg-blue-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'text-red-600 bg-red-100';
      case 'Pending': return 'text-yellow-600 bg-yellow-100';
      case 'Resolved': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Critical': return 'text-red-600 bg-red-100';
      case 'High': return 'text-orange-600 bg-orange-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'Low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const filteredAlerts = displayData.filter(alert => {
    const matchesStatus = filterStatus === 'all' || alert.status === filterStatus;
    const matchesType = filterType === 'all' || alert.type === filterType;
    return matchesStatus && matchesType;
  });

  const handleDismiss = (alertId) => {
    setAlerts(prevAlerts => 
      prevAlerts.filter(alert => alert.id !== alertId)
    );
    console.log('Alert dismissed:', alertId);
  };

  const handleResolve = (alertId) => {
    setAlerts(prevAlerts =>
      prevAlerts.map(alert =>
        alert.id === alertId
          ? { ...alert, status: 'Resolved', timestamp: 'Just now' }
          : alert
      )
    );
    console.log('Alert resolved:', alertId);
  };

  const handleAcknowledge = (alertId) => {
    setAlerts(prevAlerts =>
      prevAlerts.map(alert =>
        alert.id === alertId
          ? { ...alert, status: 'Acknowledged', timestamp: 'Just now' }
          : alert
      )
    );
    console.log('Alert acknowledged:', alertId);
  };

  const handleEscalate = (alertId) => {
    setAlerts(prevAlerts =>
      prevAlerts.map(alert =>
        alert.id === alertId
          ? { 
              ...alert, 
              priority: 'Critical', 
              status: 'Escalated',
              assignedTo: 'Supervisor',
              timestamp: 'Just now' 
            }
          : alert
      )
    );
    console.log('Alert escalated:', alertId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-medical-dark">Critical Alerts</h2>
        <div className="flex items-center gap-2">
          <div className="text-sm text-gray-500">
            {filteredAlerts.filter(a => a.status === 'Active').length} Active Alerts
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="clinical-card rounded-xl shadow-clinical p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary"
          >
            <option value="all">All Status</option>
            <option value="Active">Active</option>
            <option value="Pending">Pending</option>
            <option value="Resolved">Resolved</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary"
          >
            <option value="all">All Types</option>
            <option value="Critical">Critical</option>
            <option value="Warning">Warning</option>
            <option value="Info">Info</option>
          </select>
        </div>
      </div>

      {/* Alerts List */}
        <div className="space-y-4">
        {filteredAlerts.map((alert) => (
          <div
              key={alert.id} 
            className={`clinical-card rounded-xl shadow-clinical p-6 border-l-4 ${getAlertColor(alert.type)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                {getAlertIcon(alert.type)}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-medical-dark">{alert.title}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(alert.status)}`}>
                      {alert.status}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(alert.priority)}`}>
                      {alert.priority}
                    </span>
                  </div>
                  
                  <p className="text-gray-700 mb-3">{alert.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Patient:</span>
                      <span className="font-medium">{alert.patient} ({alert.patientId})</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Location:</span>
                      <span className="font-medium">{alert.location}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Time:</span>
                      <span className="font-medium">{alert.timestamp}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Assigned:</span>
                      <span className="font-medium">{alert.assignedTo}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {alert.status === 'Active' && (
                  <>
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                    >
                      Acknowledge
                    </button>
                    <button
                      onClick={() => handleResolve(alert.id)}
                      className="px-3 py-1 text-sm bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                    >
                      Resolve
                    </button>
                    <button
                      onClick={() => handleEscalate(alert.id)}
                      className="px-3 py-1 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                    >
                      Escalate
                    </button>
                  </>
                )}
                {alert.status === 'Pending' && (
                  <>
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                    >
                      Acknowledge
                    </button>
                    <button
                      onClick={() => handleEscalate(alert.id)}
                      className="px-3 py-1 text-sm bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
                    >
                      Escalate
                    </button>
                  </>
                )}
                {alert.status === 'Acknowledged' && (
                  <>
                    <button
                      onClick={() => handleResolve(alert.id)}
                      className="px-3 py-1 text-sm bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                    >
                      Resolve
                    </button>
                    <button
                      onClick={() => handleEscalate(alert.id)}
                      className="px-3 py-1 text-sm bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
                    >
                      Escalate
                    </button>
                  </>
                )}
                {alert.status === 'Escalated' && (
                  <button
                    onClick={() => handleResolve(alert.id)}
                    className="px-3 py-1 text-sm bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                  >
                    Resolve
                  </button>
                )}
                {alert.status !== 'Resolved' && (
                  <button
                    onClick={() => handleDismiss(alert.id)}
                    className="px-3 py-1 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                  >
                    Dismiss
                  </button>
                )}
                <button
                  onClick={() => handleDismiss(alert.id)}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredAlerts.length === 0 && (
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No alerts found matching your criteria.</p>
        </div>
      )}
      </div>
  );
};

export default CriticalAlerts;
