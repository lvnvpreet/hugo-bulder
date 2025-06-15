import * as React from 'react';
import { motion } from 'framer-motion';
import { useWizardStore } from '../../store/wizardStore';
import { cn } from '../../utils';

interface NavigationButtonsProps {
  className?: string;
  onSave?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  customNextText?: string;
  customPreviousText?: string;
  hideNext?: boolean;
  hidePrevious?: boolean;
  hideSave?: boolean;
}

const NavigationButtons: React.FC<NavigationButtonsProps> = ({
  className,
  onSave,
  onNext,
  onPrevious,
  customNextText,
  customPreviousText,
  hideNext = false,
  hidePrevious = false,
  hideSave = false,
}) => {  const { 
    currentStep, 
    nextStep, 
    previousStep, 
    validateStep, 
    getStepErrors
  } = useWizardStore();

  const [isValidating, setIsValidating] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  const errors = getStepErrors(currentStep);
  const canGoNext = currentStep < 10;
  const canGoPrevious = currentStep > 1;
  const isLastStep = currentStep === 10;

  const handleNext = async () => {
    if (onNext) {
      onNext();
      return;
    }

    setIsValidating(true);
    
    // Simulate validation delay for better UX
    await new Promise(resolve => setTimeout(resolve, 300));
    
    try {
      const isValid = validateStep(currentStep);
      if (isValid) {
        nextStep();
      }
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const handlePrevious = () => {
    if (onPrevious) {
      onPrevious();
      return;
    }
    previousStep();
  };

  const handleSave = async () => {
    if (onSave) {
      onSave();
      return;
    }

    setIsSaving(true);
    
    // Simulate save operation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsSaving(false);
  };

  const getNextButtonText = () => {
    if (customNextText) return customNextText;
    if (isLastStep) return "Generate Website";
    return "Continue";
  };

  const getPreviousButtonText = () => {
    if (customPreviousText) return customPreviousText;
    return "Previous";
  };

  return (
    <div className={cn("flex items-center justify-between", className)}>
      {/* Left Side - Previous Button */}
      <div className="flex items-center space-x-3">
        {!hidePrevious && canGoPrevious && (
          <motion.button
            onClick={handlePrevious}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {getPreviousButtonText()}
          </motion.button>
        )}

        {!hideSave && (
          <motion.button
            onClick={handleSave}
            disabled={isSaving}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <div className="animate-spin w-4 h-4 mr-2 border border-gray-400 border-t-gray-600 rounded-full" />
                Saving...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Save Draft
              </>
            )}
          </motion.button>
        )}
      </div>

      {/* Center - Error Messages */}
      <div className="flex-1 mx-4">
        {errors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-lg p-3"
          >
            <div className="flex items-start">
              <svg className="w-5 h-5 text-red-400 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-red-800">Please fix the following errors:</h4>
                <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Right Side - Next Button */}
      <div className="flex items-center">
        {!hideNext && canGoNext && (
          <motion.button
            onClick={handleNext}
            disabled={isValidating}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "inline-flex items-center px-6 py-2 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
              isLastStep
                ? "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 shadow-lg"
                : "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500"
            )}
          >
            {isValidating ? (
              <>
                <div className="animate-spin w-4 h-4 mr-2 border border-white border-t-transparent rounded-full" />
                Validating...
              </>
            ) : (
              <>
                {getNextButtonText()}
                {!isLastStep && (
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
                {isLastStep && (
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                )}
              </>
            )}
          </motion.button>
        )}
      </div>
    </div>
  );
};

export default NavigationButtons;
