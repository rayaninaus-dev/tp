// AIIntelligencePanel.js
// AI Intelligence Panel for displaying AI-generated insights and recommendations
// Provides real-time AI analysis of patient data and care patterns

import React, { useState, useEffect } from 'react';
import { Brain, TrendingUp, AlertTriangle, CheckCircle, Clock, Users, Activity, Zap } from 'lucide-react';
import dataSyncService from '../services/dataSyncService';

const AIIntelligencePanel = ({ patientId, isOpen, onClose }) => {
  const [aiInsights, setAiInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    if (isOpen && patientId) {
      loadAIInsights();
    }
  }, [isOpen, patientId]);

  const loadAIInsights = async () => {
    setLoading(true);
    try {
      // Get AI insights from data sync service
      const cachedData = dataSyncService.getCachedData();
      const insights = cachedData.aiInsights?.[patientId];
      
      if (insights) {
        setAiInsights(insights);
      } else {
        // Generate new AI insights if not available
        console.log('Generating new AI insights for patient:', patientId);
        // This would trigger AI data generation
        setAiInsights(null);
      }
    } catch (error) {
      console.error('Failed to load AI insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (!isOpen || !patientId) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold">AI Intelligence Panel</h2>
                <p className="text-purple-100">Patient ID: {patientId}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'risk', label: 'Risk Assessment', icon: AlertTriangle },
              { id: 'recommendations', label: 'Recommendations', icon: CheckCircle },
              { id: 'patterns', label: 'Care Patterns', icon: TrendingUp }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    selectedTab === tab.id
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-96">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <span className="ml-3 text-gray-600">Loading AI insights...</span>
            </div>
          ) : !aiInsights ? (
            <div className="text-center py-8">
              <Brain className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No AI Insights Available</h3>
              <p className="text-gray-500">AI analysis is not available for this patient.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Overview Tab */}
              {selectedTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Activity className="w-8 h-8 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium text-blue-800">AI Confidence</p>
                          <p className="text-2xl font-bold text-blue-900">
                            {Math.round((aiInsights.confidence || 0) * 100)}%
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Clock className="w-8 h-8 text-green-600" />
                        <div>
                          <p className="text-sm font-medium text-green-800">Last Updated</p>
                          <p className="text-sm font-bold text-green-900">
                            {aiInsights.generatedAt ? 
                              new Date(aiInsights.generatedAt).toLocaleTimeString() : 
                              'Unknown'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Zap className="w-8 h-8 text-purple-600" />
                        <div>
                          <p className="text-sm font-medium text-purple-800">AI Model</p>
                          <p className="text-sm font-bold text-purple-900">Healthcare AI v1.2</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {aiInsights.insights && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">Key Insights</h3>
                      
                      {aiInsights.insights.riskAssessment && (
                        <div className={`p-4 rounded-lg border ${getRiskColor(aiInsights.insights.riskAssessment.level)}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-5 h-5" />
                            <span className="font-semibold">Risk Assessment</span>
                          </div>
                          <p className="text-sm">
                            {aiInsights.insights.riskAssessment.level.charAt(0).toUpperCase() + 
                             aiInsights.insights.riskAssessment.level.slice(1)} risk level 
                            (Score: {aiInsights.insights.riskAssessment.score})
                          </p>
                          {aiInsights.insights.riskAssessment.factors.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-medium mb-1">Risk Factors:</p>
                              <div className="flex flex-wrap gap-1">
                                {aiInsights.insights.riskAssessment.factors.map((factor, index) => (
                                  <span key={index} className="px-2 py-1 bg-white bg-opacity-50 rounded text-xs">
                                    {factor.replace('_', ' ')}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {aiInsights.insights.outcomePrediction && (
                        <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 p-4 rounded-lg border border-indigo-200">
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-5 h-5 text-indigo-600" />
                            <span className="font-semibold text-indigo-800">Outcome Prediction</span>
                          </div>
                          <p className="text-sm text-indigo-700">
                            Predicted outcome: <span className="font-semibold">
                              {aiInsights.insights.outcomePrediction.predicted}
                            </span>
                            {' '}({Math.round(aiInsights.insights.outcomePrediction.confidence * 100)}% confidence)
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Risk Assessment Tab */}
              {selectedTab === 'risk' && aiInsights.insights?.riskAssessment && (
                <div className="space-y-4">
                  <div className={`p-6 rounded-lg border-2 ${getRiskColor(aiInsights.insights.riskAssessment.level)}`}>
                    <div className="text-center">
                      <h3 className="text-2xl font-bold mb-2">Risk Level: {aiInsights.insights.riskAssessment.level.toUpperCase()}</h3>
                      <p className="text-lg">Risk Score: {aiInsights.insights.riskAssessment.score}/10</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Risk Factors</h4>
                      <div className="space-y-2">
                        {aiInsights.insights.riskAssessment.factors.map((factor, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span className="text-sm text-gray-700 capitalize">
                              {factor.replace('_', ' ')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Confidence</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Assessment Confidence</span>
                          <span>{Math.round(aiInsights.insights.riskAssessment.confidence * 100)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${aiInsights.insights.riskAssessment.confidence * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Recommendations Tab */}
              {selectedTab === 'recommendations' && aiInsights.recommendations && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">AI Recommendations</h3>
                  
                  {aiInsights.recommendations.map((rec, index) => (
                    <div key={index} className={`p-4 rounded-lg border-l-4 ${
                      rec.priority === 'critical' ? 'bg-red-50 border-red-400' :
                      rec.priority === 'high' ? 'bg-orange-50 border-orange-400' :
                      rec.priority === 'medium' ? 'bg-yellow-50 border-yellow-400' :
                      'bg-blue-50 border-blue-400'
                    }`}>
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full ${
                          rec.priority === 'critical' ? 'bg-red-100' :
                          rec.priority === 'high' ? 'bg-orange-100' :
                          rec.priority === 'medium' ? 'bg-yellow-100' :
                          'bg-blue-100'
                        }`}>
                          <CheckCircle className={`w-5 h-5 ${
                            rec.priority === 'critical' ? 'text-red-600' :
                            rec.priority === 'high' ? 'text-orange-600' :
                            rec.priority === 'medium' ? 'text-yellow-600' :
                            'text-blue-600'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-gray-900">{rec.title}</h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(rec.priority)}`}>
                              {rec.priority}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mb-3">{rec.description}</p>
                          
                          {rec.actions && rec.actions.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-gray-600 mb-2">Recommended Actions:</p>
                              <ul className="space-y-1">
                                {rec.actions.map((action, actionIndex) => (
                                  <li key={actionIndex} className="text-sm text-gray-700 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                                    {action}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Care Patterns Tab */}
              {selectedTab === 'patterns' && aiInsights.insights?.carePatterns && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Care Pattern Analysis</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Efficiency Score</h4>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600 mb-2">
                          {Math.round(aiInsights.insights.carePatterns.efficiency * 100)}%
                        </div>
                        <p className="text-sm text-gray-600">Overall Care Efficiency</p>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Care Gaps</h4>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-orange-600 mb-2">
                          {aiInsights.insights.carePatterns.gaps.length}
                        </div>
                        <p className="text-sm text-gray-600">Identified Gaps</p>
                      </div>
                    </div>
                  </div>

                  {aiInsights.insights.carePatterns.gaps.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="font-semibold text-yellow-800 mb-3">Identified Care Gaps</h4>
                      <div className="space-y-2">
                        {aiInsights.insights.carePatterns.gaps.map((gap, index) => (
                          <div key={index} className="text-sm text-yellow-700">
                            <span className="font-medium">{gap.type.replace('_', ' ')}:</span>
                            {' '}{gap.duration.toFixed(1)} hours between {gap.between.join(' and ')}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              AI-powered healthcare insights • Generated by Healthcare AI v1.2
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIIntelligencePanel;
