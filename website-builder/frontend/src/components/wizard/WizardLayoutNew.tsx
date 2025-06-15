import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWizardStore } from '../../store/wizardStore';
import ProgressIndicator from './ProgressIndicator';
import NavigationButtons from './NavigationButtons';
import { cn } from '../../utils';

interface WizardLayoutProps {
  children: React.ReactNode;
  className?: string;
}

const WizardLayout: React.FC<WizardLayoutProps> = ({ children, className }) => {
  const { currentStep, isGenerationComplete } = useWizardStore();  return (
    <div className={cn("min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800", className)}>
      {/* No header here - using main Layout header */}
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Progress Indicator - Hide when generation is complete */}
          {!isGenerationComplete && (
            <div className="mb-8">
              <ProgressIndicator />
            </div>
          )}

          {/* Main Content Area */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            {/* Step Content */}
            <div className="p-6 md:p-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="min-h-[400px]"
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </div>            {/* Navigation Footer - Hide when generation is complete */}
            {!isGenerationComplete && (
              <div className="bg-gray-50 dark:bg-gray-700 px-6 md:px-8 py-4 border-t border-gray-200 dark:border-gray-600">
                <NavigationButtons />
              </div>
            )}
          </div>

          {/* Progress Sidebar for Desktop - Hide when generation is complete */}
          {!isGenerationComplete && <ProgressSidebar className="hidden lg:block" />}
        </div>
      </div>
    </div>
  );
};

// Progress Sidebar for Desktop
interface ProgressSidebarProps {
  className?: string;
}

const ProgressSidebar: React.FC<ProgressSidebarProps> = ({ className }) => {
  const { currentStep, stepCompletion, canNavigateToStep, goToStep } = useWizardStore();

  const steps = [
    { number: 1, title: "Website Type", description: "Choose your website category" },
    { number: 2, title: "Business Category", description: "Select your industry" },
    { number: 3, title: "Basic Information", description: "Tell us about yourself" },
    { number: 4, title: "Website Purpose", description: "Define your goals" },
    { number: 5, title: "Description", description: "What do you offer?" },
    { number: 6, title: "Services", description: "Select your services" },
    { number: 7, title: "Location", description: "Where are you located?" },
    { number: 8, title: "Structure", description: "Choose your layout" },
    { number: 9, title: "Theme", description: "Pick your design" },
    { number: 10, title: "Summary", description: "Review and generate" },
  ];
  return (
    <div className={cn("fixed right-8 top-24 bottom-8 w-64 flex flex-col", className)}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-200 dark:border-gray-700 flex-1 overflow-y-auto">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Steps</h3>
        <div className="space-y-2">
          {steps.map((step) => {
            const completion = stepCompletion[step.number];
            const isCurrentStep = currentStep === step.number;
            const canNavigate = canNavigateToStep(step.number);
            
            return (
              <button
                key={step.number}
                onClick={() => canNavigate && goToStep(step.number)}
                disabled={!canNavigate}
                className={cn(
                  "w-full text-left p-3 rounded-lg transition-all duration-200",
                  isCurrentStep 
                    ? "bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500 dark:border-blue-400" 
                    : canNavigate 
                      ? "bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600" 
                      : "bg-gray-25 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 opacity-50 cursor-not-allowed"
                )}
              >
                <div className="flex items-center space-x-3">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                    completion?.isCompleted 
                      ? "bg-green-500 text-white" 
                      : isCurrentStep 
                        ? "bg-blue-500 text-white" 
                        : "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
                  )}>
                    {completion?.isCompleted ? "✓" : step.number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      "font-medium text-sm",
                      isCurrentStep ? "text-blue-900 dark:text-blue-100" : "text-gray-900 dark:text-white"
                    )}>
                      {step.title}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {step.description}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WizardLayout;
