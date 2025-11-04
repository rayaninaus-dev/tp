import React from 'react';
import { AlertTriangle, Clock, Activity, X, UserCheck } from 'lucide-react';

const alertStyles = {
  critical: 'bg-red-50 border-red-200 text-red-900',
  warning: 'bg-amber-50 border-amber-200 text-amber-900',
  info: 'bg-blue-50 border-blue-200 text-blue-900'
};

const alertIcons = {
  critical: AlertTriangle,
  warning: Clock,
  info: Activity
};

const AlertBanner = ({ alert, onDismiss }) => {
  const typeKey = (alert.type || '').toLowerCase();
  const Icon = alertIcons[typeKey] || AlertTriangle;
  const styleClass = alertStyles[typeKey] || alertStyles.info;
  const departmentLabel = typeof alert.department === 'string' && alert.department.trim().length
    ? alert.department.trim()
    : null;
  const timestampDate = alert.timestamp ? new Date(alert.timestamp) : null;
  const timestampLabel = timestampDate && !Number.isNaN(timestampDate.getTime())
    ? timestampDate.toLocaleTimeString()
    : 'Just now';
  const metaDetails = [departmentLabel, timestampLabel].filter(Boolean).join(' - ');

  return (
    <div className={`p-4 rounded-lg border-l-4 ${styleClass} mb-3`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-medium">{alert.message}</div>
            <div className="text-sm opacity-75 mt-1">
              {metaDetails || 'Details pending'}
            </div>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={() => onDismiss(alert.id)}
            className="text-current opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Dismiss alert"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

const AlertPanel = ({ alerts, onDismiss }) => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
    <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
      <AlertTriangle className="w-5 h-5 text-red-500" />
      System Alerts
    </h2>
    {alerts.length > 0 ? (
      <div className="space-y-3">
        {alerts.map(alert => (
          <AlertBanner key={alert.id} alert={alert} onDismiss={onDismiss} />
        ))}
      </div>
    ) : (
      <div className="text-center py-8 text-slate-500">
        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <UserCheck className="w-6 h-6 text-emerald-600" />
        </div>
        <p>All systems operational</p>
      </div>
    )}
  </div>
);

export default AlertPanel;