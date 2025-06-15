import React from 'react';
import { WizardLayout } from '../components/wizard/WizardLayout';
import { ProjectBasicsStep } from '../components/wizard/ProjectBasicsStep';
import { DesignPreferencesStep } from '../components/wizard/DesignPreferencesStep';
import { FeaturesSelectionStep } from '../components/wizard/FeaturesSelectionStep';
import { ContentDetailsStep } from '../components/wizard/ContentDetailsStep';
import { GenerationStep } from '../components/wizard/GenerationStep';
import { CompletionStep } from '../components/wizard/CompletionStep';
import { useWizardStore } from '../store/wizard';

export const WizardPage = () => {
  const { currentStep, setCurrentStep, nextStep, previousStep } = useWizardStore();

  const steps = [
    {
      id: 1,
      name: 'basics',
      title: 'Project Basics',
      description: 'Basic information about your website',
      component: ProjectBasicsStep,
    },
    {
      id: 2,
      name: 'design',
      title: 'Design Preferences',
      description: 'Choose your design style and colors',
      component: DesignPreferencesStep,
    },
    {
      id: 3,
      name: 'features',
      title: 'Features & Integrations',
      description: 'Select the features you want',
      component: FeaturesSelectionStep,
    },
    {
      id: 4,
      name: 'content',
      title: 'Content Details',
      description: 'Provide your business information',
      component: ContentDetailsStep,
    },
    {
      id: 5,
      name: 'generation',
      title: 'Generate Website',
      description: 'Create your website with AI',
      component: GenerationStep,
    },
    {
      id: 6,
      name: 'completion',
      title: 'Completion',
      description: 'Your website is ready!',
      component: CompletionStep,
    },
  ];

  const currentStepData = steps.find(step => step.id === currentStep);
  const CurrentStepComponent = currentStepData?.component || ProjectBasicsStep;

  const handleNext = () => {
    if (currentStep < steps.length) {
      nextStep();
    } else {
      // Wizard complete - redirect to projects
      window.location.href = '/projects';
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      previousStep();
    }
  };
  return (
    <WizardLayout
      steps={steps}
      currentStep={currentStep}
      onStepClick={(stepId) => {
        // Allow navigation to any previous step or current step
        if (stepId <= currentStep) {
          setCurrentStep(stepId);
        }
      }}
    >
      <CurrentStepComponent
        onNext={handleNext}
        onPrevious={currentStep > 1 ? handlePrevious : undefined}
      />
    </WizardLayout>
  );
};
