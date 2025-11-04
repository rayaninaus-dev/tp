// EnhancedTimelineModal.js
// Enhanced timeline modal with AI-generated timestamp integration
// Provides comprehensive patient timeline with FHIR and AI data

import React, { useState, useEffect } from 'react';
import { X, Clock, Activity, AlertCircle, CheckCircle, User, Calendar, MapPin, Stethoscope, Brain, Zap } from 'lucide-react';
import dataSyncService from '../services/dataSyncService';

const EnhancedTimelineModal = ({ patient, isOpen, onClose }) => {
  const [timelineData, setTimelineData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // all, fhir, ai, critical
  const [sortOrder, setSortOrder] = useState('desc'); // desc, asc
  const [aiInsights, setAiInsights] = useState(null);

  useEffect(() => {
    if (isOpen && patient) {
      loadTimelineData();
    }
  }, [isOpen, patient]);

  const loadTimelineData = async () => {
    if (!patient) return;
    
    setLoading(true);
    try {
      // Get enhanced timeline data with AI timestamps
      const timeline = await dataSyncService.getPatientTimeline(patient.id);
      setTimelineData(timeline);
      
      // Generate AI insights
      const insights = generateAIInsights(timeline);
      setAiInsights(insights);
    } catch (error) {
      console.error('Failed to load timeline data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAIInsights = (timeline) => {
    if (!timeline || timeline.length === 0) return null;

    const aiEvents = timeline.flatMap(encounter => 
      encounter.timelineEvents?.filter(event => event.source === 'ai_generated') || []
    );

    const fhirEvents = timeline.flatMap(encounter => 
      encounter.timelineEvents?.filter(event => event.source === 'fhir') || []
    );

    // Calculate insights
    const totalEvents = aiEvents.length + fhirEvents.length;
    const criticalEvents = aiEvents.filter(event => event.priority === 'high').length;
    const avgConfidence = aiEvents.reduce((sum, event) => sum + (event.confidence || 0), 0) / aiEvents.length || 0;
    
    // Generate timeline patterns
    const patterns = analyzeTimelinePatterns(timeline);
    
    return {
      totalEvents,
      aiEvents: aiEvents.length,
      fhirEvents: fhirEvents.length,
      criticalEvents,
      avgConfidence: Math.round(avgConfidence * 100),
      patterns,
      recommendations: generateRecommendations(patterns, aiEvents)
    };
  };

  const analyzeTimelinePatterns = (timeline) => {
    const patterns = {
      admissionTime: null,
      avgEventInterval: 0,
      criticalEventClusters: [],
      treatmentGaps: []
    };

    if (timeline.length === 0) return patterns;

    // Analyze admission patterns
    const admissions = timeline.filter(enc => enc.status === 'arrived');
    if (admissions.length > 0) {
      patterns.admissionTime = admissions[0].startTime;
    }

    // Analyze event intervals
    const allEvents = timeline.flatMap(enc => enc.timelineEvents || []);
    if (allEvents.length > 1) {
      const intervals = [];
      for (let i = 1; i < allEvents.length; i++) {
        const interval = new Date(allEvents[i-1].timestamp) - new Date(allEvents[i].timestamp);
        intervals.push(interval / (1000 * 60)); // Convert to minutes
      }
      patterns.avgEventInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    }

    return patterns;
  };

  const generateRecommendations = (patterns, aiEvents) => {
    const recommendations = [];

    // Critical event recommendations
    const criticalEvents = aiEvents.filter(event => event.priority === 'high');
    if (criticalEvents.length > 3) {
      recommendations.push({
        type: 'warning',
        message: 'High number of critical events detected. Consider immediate review.',
        priority: 'high'
      });
    }

    // Treatment gap recommendations
    if (patterns.avgEventInterval > 60) {
      recommendations.push({
        type: 'info',
        message: 'Long intervals between events detected. Consider increasing monitoring frequency.',
        priority: 'medium'
      });
    }

    // AI confidence recommendations
    const lowConfidenceEvents = aiEvents.filter(event => event.confidence < 0.8);
    if (lowConfidenceEvents.length > 0) {
      recommendations.push({
        type: 'warning',
        message: `${lowConfidenceEvents.length} AI events have low confidence. Manual review recommended.`,
        priority: 'medium'
      });
    }

    return recommendations;
  };

  const getEventIcon = (event) => {
    const iconMap = {
      'admission': <User className="w-4 h-4" />,
      'vital_check': <Activity className="w-4 h-4" />,
      'lab_order': <Stethoscope className="w-4 h-4" />,
      'imaging': <Activity className="w-4 h-4" />,
      'consultation': <User className="w-4 h-4" />,
      'medication': <Stethoscope className="w-4 h-4" />,
      'discharge_plan': <CheckCircle className="w-4 h-4" />,
      'encounter_start': <Calendar className="w-4 h-4" />,
      'encounter_end': <CheckCircle className="w-4 h-4" />
    };
    return iconMap[event.type] || <Clock className="w-4 h-4" />;
  };

  const getEventColor = (event) => {
    if (event.priority === 'high') return 'text-red-600 bg-red-50 border-red-200';
    if (event.priority === 'medium') return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-blue-600 bg-blue-50 border-blue-200';
  };

  const getSourceBadge = (event) => {
    if (event.source === 'ai_generated') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          <Brain className="w-3 h-3 mr-1" />
          AI
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <Zap className="w-3 h-3 mr-1" />
        FHIR
      </span>
    );
  };

  const filteredTimeline = timelineData.flatMap(encounter => 
    encounter.timelineEvents?.filter(event => {
      if (filter === 'all') return true;
      if (filter === 'fhir') return event.source === 'fhir';
      if (filter === 'ai') return event.source === 'ai_generated';
      if (filter === 'critical') return event.priority === 'high';
      return true;
    }) || []
  ).sort((a, b) => {
    const timeA = new Date(a.timestamp);
    const timeB = new Date(b.timestamp);
    return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
  });

  if (!isOpen || !patient) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-medical-primary to-medical-secondary p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Enhanced Patient Timeline</h2>
              <p className="text-medical-light mt-1">
                {patient.name} • {patient.id} • AI-Enhanced Timeline
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* AI Insights Panel */}
        {aiInsights && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 border-b">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{aiInsights.totalEvents}</div>
                <div className="text-sm text-gray-600">Total Events</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{aiInsights.aiEvents}</div>
                <div className="text-sm text-gray-600">AI Generated</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{aiInsights.fhirEvents}</div>
                <div className="text-sm text-gray-600">FHIR Events</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{aiInsights.criticalEvents}</div>
                <div className="text-sm text-gray-600">Critical Events</div>
              </div>
            </div>
            
            {/* AI Recommendations */}
            {aiInsights.recommendations.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-gray-800 mb-2">AI Recommendations:</h4>
                <div className="space-y-2">
                  {aiInsights.recommendations.map((rec, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border-l-4 ${
                        rec.priority === 'high' 
                          ? 'bg-red-50 border-red-400' 
                          : 'bg-yellow-50 border-yellow-400'
                      }`}
                    >
                      <div className="flex items-center">
                        <AlertCircle className="w-4 h-4 mr-2 text-yellow-600" />
                        <span className="text-sm font-medium">{rec.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="p-4 bg-gray-50 border-b">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Filter:</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Events</option>
                <option value="fhir">FHIR Only</option>
                <option value="ai">AI Generated</option>
                <option value="critical">Critical Only</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Sort:</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>

            <div className="ml-auto text-sm text-gray-600">
              {filteredTimeline.length} events found
            </div>
          </div>
        </div>

        {/* Timeline Content */}
        <div className="p-6 overflow-y-auto max-h-96">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-medical-primary"></div>
              <span className="ml-3 text-gray-600">Loading timeline...</span>
            </div>
          ) : filteredTimeline.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No timeline events found
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTimeline.map((event, index) => (
                <div
                  key={event.id || index}
                  className={`p-4 rounded-lg border ${getEventColor(event)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getEventIcon(event)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-gray-900">{event.description}</h4>
                          {getSourceBadge(event)}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {new Date(event.timestamp).toLocaleString()}
                        </p>
                        {event.confidence && (
                          <div className="text-xs text-gray-500">
                            AI Confidence: {Math.round(event.confidence * 100)}%
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        event.priority === 'high' 
                          ? 'bg-red-100 text-red-800' 
                          : event.priority === 'medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {event.priority}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Last updated: {new Date().toLocaleString()}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-medical-primary text-white rounded-md hover:bg-medical-primary/90 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedTimelineModal;
