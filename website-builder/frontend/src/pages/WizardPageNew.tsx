import WizardLayoutNew from '../components/wizard/WizardLayoutNew';
import { useWizardStore } from '../store/wizardStore';
import Step1WebsiteType from '../components/wizard/steps/Step1WebsiteType';
import Step2BusinessCategory from '../components/wizard/steps/Step2BusinessCategory';
import Step3BusinessInfo from '../components/wizard/steps/Step3BusinessInfo';
import Step4WebsitePurpose from '../components/wizard/steps/Step4WebsitePurpose';
import Step5BusinessDescription from '../components/wizard/steps/Step5BusinessDescription';
import Step6ServicesSelection from '../components/wizard/steps/Step6ServicesSelection';
import Step7LocationInfo from '../components/wizard/steps/Step7LocationInfo';
import Step8WebsiteStructure from '../components/wizard/steps/Step8WebsiteStructure';
import Step9ThemeConfig from '../components/wizard/steps/Step9ThemeConfig';
import Step10Summary from '../components/wizard/steps/Step10Summary';

export const WizardPage = () => {
  const { currentStep, data } = useWizardStore();
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1WebsiteType />;
      case 2:
        // Only show business category if business or ecommerce type selected
        if (data.websiteType && ['business', 'ecommerce'].includes(data.websiteType.id)) {
          return <Step2BusinessCategory />;
        }
        // Skip to step 3 for other types
        return <Step3BusinessInfo />;
      case 3:
        return <Step3BusinessInfo />;
      case 4:
        return <Step4WebsitePurpose />;
      case 5:
        return <Step5BusinessDescription />;
      case 6:
        return <Step6ServicesSelection />;
      case 7:
        return <Step7LocationInfo />;      case 8:
        return <Step8WebsiteStructure />;
      case 9:
        return <Step9ThemeConfig />;
      case 10:
        return <Step10Summary />;
      default:
        return <Step1WebsiteType />;
    }
  };

  return (
    <WizardLayoutNew>
      {renderCurrentStep()}
    </WizardLayoutNew>
  );
};
