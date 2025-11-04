// components/TurnaroundTimes.js

import React from 'react';
import { ArrowRight } from 'lucide-react';

const TurnaroundTimes = ({ turnaround }) => {
  if (!turnaround || Object.keys(turnaround).length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p>No turnaround time data available.</p>
      </div>
    );
  }

  // Map the project plan steps to user-friendly labels
  const processLabels = {
    'Triage to Nurse': 'Triage to Nurse',
    'Triage to Doctor': 'Triage to Doctor',
    'Pathology Request to Result': 'Pathology: Request to Result',
    'Imaging Request to Reported': 'Imaging: Request to Reported',
    'Doctor to Senior Doctor': 'Doctor to Senior Consult',
    'Admission Request to Bed': 'Admission: Request to Bed',
    'Bed Allocation to Departure': 'Bed Ready to ED Departure',
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Object.entries(turnaround).map(([process, avgTime]) => (
        <div key={process} className="bg-medical-light/60 p-4 rounded-lg border border-medical-primary/20">
          <div className="text-sm font-medium text-medical-neutral mb-2 flex items-center gap-2">
            <ArrowRight className="w-4 h-4 text-medical-primary" />
            <span>{processLabels[process] || process}</span>
          </div>
          <div className="text-2xl font-bold text-medical-dark">
            {avgTime} <span className="text-lg font-medium text-medical-neutral">min</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TurnaroundTimes;
