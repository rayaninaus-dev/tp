import React, { useEffect, useRef } from 'react';
import { CheckCircle, Loader2, Clock3, AlertCircle } from 'lucide-react';

const TimelineModal = ({ patient, onClose }) => {
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }

      if (event.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements && focusableElements.length > 0) {
          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (event.shiftKey && document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          } else if (!event.shiftKey && document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    if (closeButtonRef.current) {
      closeButtonRef.current.focus();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const getStatusStyle = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'completed':
        return 'Completed';
      case 'in-progress':
        return 'In Progress';
      case 'pending':
        return 'Pending';
      default:
        return status || 'Unknown';
    }
  };

  const renderStatusIcon = (status) => {
    const normalized = (status || '').toLowerCase();
    if (normalized === 'completed') {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    }

    if (normalized === 'in-progress') {
      return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
    }

    if (normalized === 'pending') {
      return <Clock3 className="w-4 h-4 text-yellow-600" />;
    }

    return <AlertCircle className="w-4 h-4 text-slate-600" />;
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return 'Unknown time';
    }

    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (duration) => {
    if (!Number.isFinite(duration) || duration < 0) return 'Not available';
    if (duration === 0) return 'Instant';
    if (duration < 60) return `${duration} min`;

    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  };

  const timelineEvents = Array.isArray(patient.timeline) ? patient.timeline : [];

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={(event) => event.target === event.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="timeline-title"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 id="timeline-title" className="text-xl font-semibold text-gray-900">
              Patient Timeline
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {patient.name} ({patient.id})
            </p>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-full p-2 transition-colors duration-150"
            aria-label="Close timeline"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Patient Journey</h3>
            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
              Derived from encounter history
            </span>
          </div>

          {timelineEvents.length > 0 ? (
            <div className="space-y-4">
              {timelineEvents.map((event, index) => {
                const status = (event.status || 'completed').toLowerCase();
                return (
                  <div
                    key={event.id || `${patient.id}-timeline-${index}`}
                    className="flex items-start space-x-4 pb-4 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      {renderStatusIcon(status)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {event.title || event.event || `Timeline Event ${index + 1}`}
                          </h3>
                          <div className="text-xs text-gray-500">
                            Status: {getStatusText(status)}
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusStyle(status)}`}>
                          {getStatusText(status)}
                        </span>
                      </div>

                      <p className="text-gray-600 mb-3">
                        {event.description || 'No additional description available.'}
                      </p>

                      <div className="flex items-center justify-between space-x-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <Clock3 className="w-4 h-4" />
                            <span>{formatTimestamp(event.timestamp)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <AlertCircle className="w-4 h-4" />
                            <span>{formatDuration(event.duration)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-2">📋</div>
              <p>No timeline data available</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-150"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineModal;
