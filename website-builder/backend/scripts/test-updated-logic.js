import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// This matches the actual data structure from the frontend logs
const actualWizardData = {
  websiteStructure: {
    type: 'multi-page',
    selectedPages: ['home', 'about', 'services', 'contact'],
    navigationStyle: 'horizontal',
    hasGallery: false,
    hasBlog: false,
    hasEcommerce: false
  },
  themeConfig: {
    hugoTheme: 'business-pro',
    colorScheme: { primary: '#007bff' },
    typography: { headingFont: 'Arial' },
    layout: { style: 'modern' }
  },
  additionalRequirements: null,
  type: 'Business Website'
};

// Updated isWizardDataComplete function (matching our fix)
function isWizardDataComplete(wizardData) {
  if (!wizardData || typeof wizardData !== 'object') {
    return false;
  }

  // Check for essential wizard data fields based on actual frontend structure
  const hasWebsiteStructure = wizardData.websiteStructure && 
    typeof wizardData.websiteStructure === 'object' &&
    wizardData.websiteStructure.type && 
    Array.isArray(wizardData.websiteStructure.selectedPages) &&
    wizardData.websiteStructure.selectedPages.length > 0;

  const hasThemeConfig = wizardData.themeConfig && 
    typeof wizardData.themeConfig === 'object' &&
    typeof wizardData.themeConfig.hugoTheme === 'string' &&
    wizardData.themeConfig.hugoTheme.length > 0;

  // Check if we have the minimum required data for generation
  const hasMinimumData = hasWebsiteStructure && hasThemeConfig;

  console.log('Wizard data completeness check:', {
    hasWebsiteStructure,
    hasThemeConfig,
    hasMinimumData,
    websiteStructureType: wizardData.websiteStructure?.type,
    hugoTheme: wizardData.themeConfig?.hugoTheme
  });

  return hasMinimumData;
}

async function testUpdatedLogic() {
  try {
    console.log('Testing updated isWizardDataComplete logic...\n');
    
    // Test with actual frontend data
    console.log('1. Testing with actual frontend wizard data:');
    const result = isWizardDataComplete(actualWizardData);
    console.log(`   Result: ${result ? '✅ Complete' : '❌ Incomplete'}\n`);
    
    // Test with incomplete data
    console.log('2. Testing with incomplete data (missing hugoTheme):');
    const incompleteData = {
      websiteStructure: {
        type: 'multi-page',
        selectedPages: ['home']
      },
      themeConfig: {
        // Missing hugoTheme
        colorScheme: { primary: '#007bff' }
      }
    };
    const incompleteResult = isWizardDataComplete(incompleteData);
    console.log(`   Result: ${incompleteResult ? '❌ Should be incomplete' : '✅ Correctly incomplete'}\n`);
    
    // Test creating a project with this data
    console.log('3. Testing project creation with updated logic:');
    const userId = 'cmc08g7xh0000uvypi0qe4p07';
    const slug = `test-updated-logic-${Date.now()}`;
    
    const project = await prisma.project.create({
      data: {
        name: 'Test Updated Logic Project',
        description: 'Testing the updated isWizardDataComplete logic',
        slug,
        generationStatus: 'DRAFT',
        userId,
        wizardData: actualWizardData,
        isCompleted: isWizardDataComplete(actualWizardData),
        currentStep: 1
      }
    });
    
    console.log(`   Project created: ${project.id}`);
    console.log(`   Is completed: ${project.isCompleted ? '✅ TRUE' : '❌ FALSE'}`);
    
    // Clean up
    await prisma.project.delete({
      where: { id: project.id }
    });
    console.log('   Test project cleaned up.\n');
    
    console.log('✅ Updated logic test complete!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testUpdatedLogic();
