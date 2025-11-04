import React from 'react';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

/**
 * Medical UI Component Library
 * 
 * A collection of reusable UI components designed specifically for medical applications.
 * These components follow a consistent design language and incorporate medical-specific
 * styling and functionality.
 */

/**
 * MedicalCard - A styled card component for medical information
 */
export const MedicalCard = ({ children, className = '', borderColor = '', ...props }) => {
  const borderClass = borderColor ? `border-l-4 border-${borderColor}` : '';
  
  return (
    <div 
      className={`clinical-card p-4 ${borderClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * MedicalBadge - A badge component for status indicators
 */
export const MedicalBadge = ({ children, variant = 'primary', className = '', ...props }) => {
  const variantClasses = {
    primary: 'bg-medical-primary/20 text-medical-primary',
    secondary: 'bg-medical-secondary/20 text-medical-secondary',
    success: 'bg-medical-success/20 text-medical-success',
    danger: 'bg-medical-danger/20 text-medical-danger',
    accent: 'bg-medical-accent/20 text-medical-accent',
    neutral: 'bg-medical-neutral/20 text-medical-neutral',
  };
  
  return (
    <span 
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant] || variantClasses.primary} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

/**
 * MedicalButton - A styled button component
 */
export const MedicalButton = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  className = '', 
  ...props 
}) => {
  const variantClasses = {
    primary: 'bg-medical-primary hover:bg-medical-primary-dark text-white',
    secondary: 'bg-medical-secondary hover:bg-medical-secondary-dark text-white',
    accent: 'bg-medical-accent hover:bg-medical-accent-dark text-white',
    success: 'bg-medical-success hover:bg-medical-success-dark text-white',
    danger: 'bg-medical-danger hover:bg-medical-danger-dark text-white',
    outline: 'border border-medical-primary text-medical-primary hover:bg-medical-primary hover:text-white',
    ghost: 'text-medical-primary hover:bg-medical-primary/10',
  };
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };
  
  return (
    <button 
      className={`rounded-lg font-medium transition-colors ${variantClasses[variant] || variantClasses.primary} ${sizeClasses[size] || sizeClasses.md} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

/**
 * MedicalAlert - An alert component for notifications
 */
export const MedicalAlert = ({ 
  title, 
  message, 
  variant = 'info', 
  onClose,
  className = '', 
  ...props 
}) => {
  const variantClasses = {
    info: {
      bg: 'bg-medical-primary/10',
      border: 'border-medical-primary',
      text: 'text-medical-primary',
      icon: <Info className="h-5 w-5 text-medical-primary" />
    },
    success: {
      bg: 'bg-medical-success/10',
      border: 'border-medical-success',
      text: 'text-medical-success',
      icon: <CheckCircle className="h-5 w-5 text-medical-success" />
    },
    warning: {
      bg: 'bg-medical-accent/10',
      border: 'border-medical-accent',
      text: 'text-medical-accent',
      icon: <AlertTriangle className="h-5 w-5 text-medical-accent" />
    },
    error: {
      bg: 'bg-medical-danger/10',
      border: 'border-medical-danger',
      text: 'text-medical-danger',
      icon: <AlertTriangle className="h-5 w-5 text-medical-danger" />
    },
  };
  
  const variantStyle = variantClasses[variant] || variantClasses.info;
  
  return (
    <div 
      className={`rounded-lg border-l-4 ${variantStyle.bg} ${variantStyle.border} p-4 ${className}`}
      role="alert"
      {...props}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {variantStyle.icon}
        </div>
        <div className="ml-3 flex-1">
          {title && <h3 className={`text-sm font-medium ${variantStyle.text}`}>{title}</h3>}
          {message && <div className="mt-1 text-sm text-medical-dark">{message}</div>}
        </div>
        {onClose && (
          <button
            type="button"
            className="ml-auto -mx-1.5 -my-1.5 bg-white text-medical-neutral rounded-lg focus:ring-2 focus:ring-medical-primary p-1.5 inline-flex h-8 w-8 hover:bg-medical-light/50 hover:text-medical-dark"
            onClick={onClose}
            aria-label="Close"
          >
            <span className="sr-only">Close</span>
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * MedicalInput - A styled input component
 */
export const MedicalInput = ({ className = '', ...props }) => {
  return (
    <input
      className={`w-full px-4 py-2 border border-medical-light rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary ${className}`}
      {...props}
    />
  );
};

/**
 * MedicalSelect - A styled select component
 */
export const MedicalSelect = ({ children, className = '', ...props }) => {
  return (
    <select
      className={`w-full px-4 py-2 border border-medical-light rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary bg-white ${className}`}
      {...props}
    >
      {children}
    </select>
  );
};

/**
 * MedicalTag - A tag component for FHIR resources
 */
export const MedicalTag = ({ resource, className = '', ...props }) => {
  return (
    <span 
      className={`text-xs bg-medical-primary/10 text-medical-primary px-2 py-0.5 rounded ${className}`}
      {...props}
    >
      FHIR: {resource}
    </span>
  );
};

/**
 * MedicalStatCard - A card for displaying medical statistics
 */
export const MedicalStatCard = ({ title, value, icon, description, variant = 'primary', fhirTag, className = '', ...props }) => {
  const variantClasses = {
    primary: 'bg-medical-primary/10 text-medical-primary',
    secondary: 'bg-medical-secondary/10 text-medical-secondary',
    accent: 'bg-medical-accent/10 text-medical-accent',
    success: 'bg-medical-success/10 text-medical-success',
    danger: 'bg-medical-danger/10 text-medical-danger',
  };
  
  return (
    <div 
      className={`clinical-card p-4 rounded-xl ${className}`}
      {...props}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-medical-neutral mb-1">{title}</p>
          <p className="text-2xl font-semibold">{value}</p>
          {description && <p className="text-xs text-medical-neutral mt-1">{description}</p>}
          {fhirTag && <MedicalTag resource={fhirTag} className="mt-2" />}
        </div>
        {icon && (
          <div className={`p-2 rounded-full ${variantClasses[variant]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * MedicalProgressBar - A progress bar component
 */
export const MedicalProgressBar = ({ value, max = 100, variant = 'primary', label, showPercentage = true, className = '', ...props }) => {
  const percentage = Math.round((value / max) * 100);
  
  const variantClasses = {
    primary: 'bg-medical-primary',
    secondary: 'bg-medical-secondary',
    accent: 'bg-medical-accent',
    success: 'bg-medical-success',
    danger: 'bg-medical-danger',
  };
  
  return (
    <div className={`w-full ${className}`} {...props}>
      {label && <div className="flex justify-between mb-1">
        <span className="text-sm text-medical-dark">{label}</span>
        {showPercentage && <span className="text-sm text-medical-neutral">{percentage}%</span>}
      </div>}
      <div className="w-full bg-medical-light/50 rounded-full h-2.5">
        <div 
          className={`h-2.5 rounded-full ${variantClasses[variant] || variantClasses.primary}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};