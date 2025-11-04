import React from 'react';
import { Filter, X } from 'lucide-react';

const FilterPanel = ({ filters, onFiltersChange }) => {
  const handleFilterChange = (filterType, value) => {
    onFiltersChange({
      ...filters,
      [filterType]: value
    });
  };

  const filterOptions = {
    status: [
      { value: 'all', label: 'All Statuses' },
      { value: 'waiting', label: 'Waiting' },
      { value: 'in-treatment', label: 'In Treatment' },
      { value: 'admitted', label: 'Admitted' },
      { value: 'completed', label: 'Completed' }
    ],
    priority: [
      { value: 'all', label: 'All Priorities' },
      { value: 'urgent', label: 'Urgent' },
      { value: 'normal', label: 'Normal' },
      { value: 'low', label: 'Low' }
    ],
    department: [
      { value: 'all', label: 'All Departments' },
      { value: 'Emergency', label: 'Emergency' },
      { value: 'Internal Medicine', label: 'Internal Medicine' },
      { value: 'Surgery', label: 'Surgery' },
      { value: 'Pediatrics', label: 'Pediatrics' },
      { value: 'Obstetrics & Gynecology', label: 'Obstetrics & Gynecology' }
    ]
  };

  const clearAllFilters = () => {
    onFiltersChange({
      status: 'all',
      priority: 'all',
      department: 'all'
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== 'all');
  
  const renderSelect = (label, key, options) => (
    <div>
      <label htmlFor={`${key}-filter`} className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      <select
        id={`${key}-filter`}
        value={filters[key]}
        onChange={(e) => handleFilterChange(key, e.target.value)}
        className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150"
        aria-label={`Select ${label}`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sticky top-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Filters
        </h2>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
            aria-label="Clear all filters"
          >
            <X className="w-4 h-4" />
            Clear All
          </button>
        )}
      </div>
      
      <div className="space-y-6">
        {renderSelect('Patient Status', 'status', filterOptions.status)}
        {renderSelect('Priority', 'priority', filterOptions.priority)}
        {renderSelect('Department', 'department', filterOptions.department)}
      </div>
    </div>
  );
};

export default FilterPanel;