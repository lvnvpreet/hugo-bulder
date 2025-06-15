import * as React from 'react';
import { motion } from 'framer-motion';
import { useWizardStore } from '../../store/wizardStore';
import { cn } from '../../utils';

interface ProgressIndicatorProps {
  className?: string;
  showStepNames?: boolean;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ 
  className, 
  showStepNames = true 
}) => {
  const { currentStep, stepCompletion, getProgress, canNavigateToStep, goToStep } = useWizardStore();

  const steps = [
    { number: 1, title: "Type", shortTitle: "Type" },
    { number: 2, title: "Category", shortTitle: "Cat" },
    { number: 3, title: "Info", shortTitle: "Info" },
    { number: 4, title: "Purpose", shortTitle: "Goal" },
    { number: 5, title: "Description", shortTitle: "Desc" },
    { number: 6, title: "Services", shortTitle: "Svc" },
    { number: 7, title: "Location", shortTitle: "Loc" },
    { number: 8, title: "Structure", shortTitle: "Str" },
    { number: 9, title: "Theme", shortTitle: "Theme" },
    { number: 10, title: "Summary", shortTitle: "Done" },
  ];

  return (
    <div className={cn("w-full", className)}>
      {/* Progress Bar */}
      <div className="relative mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm font-medium text-blue-600">{getProgress()}%</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${getProgress()}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Step Indicators */}
      <div className="relative">
        {/* Connection Line */}
        <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-200 -z-10" />
        <motion.div
          className="absolute top-4 left-4 h-0.5 bg-blue-500 -z-10"
          initial={{ width: 0 }}
          animate={{ 
            width: `${Math.max(0, ((currentStep - 1) / 9) * 100)}%` 
          }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />

        {/* Desktop Step Circles */}
        <div className="hidden md:flex justify-between items-center">
          {steps.map((step) => {
            const completion = stepCompletion[step.number];
            const isCurrentStep = currentStep === step.number;
            const canNavigate = canNavigateToStep(step.number);
            const isCompleted = completion?.isCompleted;
            const hasErrors = completion?.errors && completion.errors.length > 0;

            return (
              <div key={step.number} className="flex flex-col items-center">
                <button
                  onClick={() => canNavigate && goToStep(step.number)}
                  disabled={!canNavigate}
                  className={cn(
                    "relative w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                    isCompleted 
                      ? "bg-green-500 text-white shadow-lg hover:bg-green-600" 
                      : isCurrentStep 
                        ? "bg-blue-500 text-white shadow-lg ring-2 ring-blue-200" 
                        : hasErrors
                          ? "bg-red-500 text-white hover:bg-red-600"
                          : canNavigate 
                            ? "bg-white border-2 border-gray-300 text-gray-600 hover:border-blue-300 hover:text-blue-600" 
                            : "bg-gray-100 border-2 border-gray-200 text-gray-400 cursor-not-allowed"
                  )}
                >
                  {isCompleted ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : hasErrors ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    step.number
                  )}
                </button>
                
                {showStepNames && (
                  <span className={cn(
                    "mt-2 text-xs font-medium text-center",
                    isCurrentStep 
                      ? "text-blue-600" 
                      : isCompleted 
                        ? "text-green-600" 
                        : hasErrors
                          ? "text-red-600"
                          : "text-gray-500"
                  )}>
                    {step.title}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile Step Indicator */}
        <div className="md:hidden">
          <div className="flex items-center justify-center space-x-2">
            {steps.map((step) => {
              const completion = stepCompletion[step.number];
              const isCurrentStep = currentStep === step.number;
              const isCompleted = completion?.isCompleted;
              const hasErrors = completion?.errors && completion.errors.length > 0;

              return (
                <div
                  key={step.number}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-200",
                    isCompleted 
                      ? "bg-green-500" 
                      : isCurrentStep 
                        ? "bg-blue-500 w-3 h-3" 
                        : hasErrors
                          ? "bg-red-500"
                          : "bg-gray-300"
                  )}
                />
              );
            })}
          </div>
          
          <div className="text-center mt-3">
            <span className="text-sm font-medium text-gray-900">
              Step {currentStep}: {steps[currentStep - 1]?.title}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressIndicator;
