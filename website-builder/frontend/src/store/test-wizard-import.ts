// Test import from wizard store
import { useWizardStore } from './wizard';

console.log('Wizard store imported successfully:', useWizardStore);

export const testWizardStore = () => {
  const store = useWizardStore();
  console.log('Current step:', store.currentStep);
};
