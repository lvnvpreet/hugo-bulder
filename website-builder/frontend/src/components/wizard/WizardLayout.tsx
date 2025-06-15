import React from 'react';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Check } from 'lucide-react';

interface WizardStep {
  id: number;
  name: string;
  title: string;
  description: string;
  component: React.ComponentType<any>;
}

interface WizardLayoutProps {
  steps: WizardStep[];
  currentStep: number;
  onStepClick: (stepId: number) => void;
  children: React.ReactNode;
}

export const WizardLayout: React.FC<WizardLayoutProps> = ({
  steps,
  currentStep,
  onStepClick,
  children,
}) => {
  const currentStepIndex = steps.findIndex(step => step.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Website Builder</h1>
              <p className="text-muted-foreground">
                Create your website in just a few steps
              </p>
            </div>
            <Badge variant="secondary">
              Step {currentStepIndex + 1} of {steps.length}
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progress</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Steps */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <h2 className="font-semibold mb-4">Steps</h2>
              <nav className="space-y-2">
                {steps.map((step, index) => {
                  const isCompleted = index < currentStepIndex;
                  const isCurrent = step.id === currentStep;
                  const isAccessible = index <= currentStepIndex;

                  return (
                    <button
                      key={step.id}
                      onClick={() => isAccessible && onStepClick(step.id)}
                      disabled={!isAccessible}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        isCurrent
                          ? 'border-primary bg-primary/5 text-primary'
                          : isCompleted
                          ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20 text-green-700 dark:text-green-400'
                          : isAccessible
                          ? 'border-border hover:border-primary/50 hover:bg-muted/50'
                          : 'border-border opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div
                          className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                            isCurrent
                              ? 'bg-primary text-primary-foreground'
                              : isCompleted
                              ? 'bg-green-500 text-white'
                              : isAccessible
                              ? 'bg-muted text-muted-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            index + 1
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-medium ${
                              isCurrent ? 'text-primary' : isCompleted ? 'text-green-700 dark:text-green-400' : ''
                            }`}
                          >
                            {step.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="min-h-[600px]">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
