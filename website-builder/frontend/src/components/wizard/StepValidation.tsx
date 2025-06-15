import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWizardStore } from '../../store/wizardStore';
import { cn } from '../../utils';

interface StepValidationProps {
  step?: number;
  className?: string;
  showSuccess?: boolean;
}

interface ValidationRule {
  field: string;
  message: string;
  validator: (data: any) => boolean;
  isRequired?: boolean;
}

const StepValidation: React.FC<StepValidationProps> = ({
  step,
  className,
  showSuccess = true,
}) => {
  const { data, currentStep, stepCompletion, validateStep } = useWizardStore();
  const targetStep = step || currentStep;
  const completion = stepCompletion[targetStep];
  const errors = completion?.errors || [];
  const isValid = completion?.isValid || false;
  const isCompleted = completion?.isCompleted || false;

  // Real-time validation effect
  React.useEffect(() => {
    const timer = setTimeout(() => {
      validateStep(targetStep);
    }, 500); // Debounce validation

    return () => clearTimeout(timer);
  }, [data, targetStep, validateStep]);

  if (errors.length === 0 && !showSuccess) {
    return null;
  }

  return (
    <div className={cn("mt-4", className)}>
      <AnimatePresence mode="wait">
        {errors.length > 0 ? (
          <motion.div
            key="errors"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-red-50 border border-red-200 rounded-lg p-4"
          >
            <div className="flex items-start">
              <svg 
                className="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path 
                  fillRule="evenodd" 
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" 
                  clipRule="evenodd" 
                />
              </svg>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-red-800 mb-1">
                  {errors.length === 1 ? 'Please fix this issue:' : 'Please fix these issues:'}
                </h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {errors.map((error, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start"
                    >
                      <span className="text-red-400 mr-2">•</span>
                      <span>{error}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        ) : isValid && showSuccess ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-green-50 border border-green-200 rounded-lg p-4"
          >
            <div className="flex items-center">
              <svg 
                className="w-5 h-5 text-green-400 mr-3" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path 
                  fillRule="evenodd" 
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                  clipRule="evenodd" 
                />
              </svg>
              <span className="text-sm font-medium text-green-800">
                {isCompleted ? 'Step completed successfully!' : 'All required fields are filled correctly.'}
              </span>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

// Enhanced validation helper component for individual fields
interface FieldValidationProps {
  field: string;
  value: any;
  rules: ValidationRule[];
  className?: string;
}

export const FieldValidation: React.FC<FieldValidationProps> = ({
  field,
  value,
  rules,
  className,
}) => {
  const [errors, setErrors] = React.useState<string[]>([]);
  const [isValid, setIsValid] = React.useState(false);

  React.useEffect(() => {
    const fieldErrors: string[] = [];
    let valid = true;

    rules.forEach(rule => {
      if (rule.field === field && !rule.validator(value)) {
        fieldErrors.push(rule.message);
        valid = false;
      }
    });

    setErrors(fieldErrors);
    setIsValid(valid && value !== undefined && value !== '');
  }, [field, value, rules]);

  if (errors.length === 0 && !isValid) {
    return null;
  }

  return (
    <AnimatePresence>
      {errors.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          className={cn("mt-1", className)}
        >
          {errors.map((error, index) => (
            <p key={index} className="text-sm text-red-600 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </p>
          ))}
        </motion.div>
      ) : isValid ? (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          className={cn("mt-1", className)}
        >
          <p className="text-sm text-green-600 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Looks good!
          </p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

// Common validation rules
export const validationRules = {
  required: (field: string, message?: string): ValidationRule => ({
    field,
    message: message || `${field} is required`,
    validator: (value) => value !== undefined && value !== null && value !== '',
    isRequired: true,
  }),

  email: (field: string, message?: string): ValidationRule => ({
    field,
    message: message || 'Please enter a valid email address',
    validator: (value) => {
      if (!value) return true; // Let required rule handle empty values
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },
  }),

  minLength: (field: string, min: number, message?: string): ValidationRule => ({
    field,
    message: message || `${field} must be at least ${min} characters long`,
    validator: (value) => {
      if (!value) return true; // Let required rule handle empty values
      return value.length >= min;
    },
  }),

  maxLength: (field: string, max: number, message?: string): ValidationRule => ({
    field,
    message: message || `${field} must be no more than ${max} characters long`,
    validator: (value) => {
      if (!value) return true; // Let required rule handle empty values
      return value.length <= max;
    },
  }),

  phone: (field: string, message?: string): ValidationRule => ({
    field,
    message: message || 'Please enter a valid phone number',
    validator: (value) => {
      if (!value) return true; // Let required rule handle empty values
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      return phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''));
    },
  }),

  url: (field: string, message?: string): ValidationRule => ({
    field,
    message: message || 'Please enter a valid URL',
    validator: (value) => {
      if (!value) return true; // Let required rule handle empty values
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
  }),

  arrayMinLength: (field: string, min: number, message?: string): ValidationRule => ({
    field,
    message: message || `Please select at least ${min} ${min === 1 ? 'item' : 'items'}`,
    validator: (value) => {
      if (!Array.isArray(value)) return false;
      return value.length >= min;
    },
  }),
};

export default StepValidation;
