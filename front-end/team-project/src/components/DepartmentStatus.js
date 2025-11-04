import React from 'react';
import { Bed } from 'lucide-react';

/**
 * DepartmentStatus Component
 * 
 * Displays the current status of a hospital department, including bed occupancy.
 * 
 * FHIR Alignment:
 * - Department data corresponds to FHIR Location resource (https://www.hl7.org/fhir/location.html)
 * - Occupancy data aligns with FHIR Location.operationalStatus
 * - Capacity information maps to FHIR Location.physicalType for bed counts
 */

const DepartmentStatus = ({ department }) => {
  const occupancyColor = department.occupancy >= 90 ? 'bg-medical-danger' : 
                         department.occupancy >= 75 ? 'bg-medical-accent' : 'bg-medical-success';
  
  // Calculate status text and color based on occupancy
  const getStatusText = () => {
    if (department.occupancy >= 90) return { text: 'Critical', color: 'text-medical-danger' };
    if (department.occupancy >= 75) return { text: 'Busy', color: 'text-medical-accent' };
    return { text: 'Normal', color: 'text-medical-success' };
  };
  
  const status = getStatusText();

  return (
    <div className="clinical-card rounded-xl shadow-clinical border-l-4 border-medical-primary p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-medical-dark flex items-center gap-2">
          <Bed className="w-5 h-5 text-medical-primary" />
          {department.name}
        </h3>
        <div className="text-right">
          <span className="text-2xl font-bold text-medical-dark">{department.patients}/{department.capacity}</span>
          <div className={`text-xs font-medium ${status.color} mt-1`}>{status.text}</div>
        </div>
      </div>
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-medical-neutral">Occupancy</span>
          <span className="font-medium text-medical-dark">{department.occupancy}%</span>
        </div>
        <div className="w-full bg-medical-light/50 rounded-full h-2.5">
          <div 
            className={`h-2.5 rounded-full transition-all duration-500 ${occupancyColor}`}
            style={{ width: `${department.occupancy}%` }}
          />
        </div>
      </div>
      <div className="text-xs text-medical-neutral mt-2 flex items-center justify-between">
        <span>{department.capacity - department.patients} beds available</span>
        <span className="text-xs bg-medical-light/50 px-2 py-0.5 rounded">
          FHIR: Location.status
        </span>
      </div>
    </div>
  );
};

export default DepartmentStatus;
