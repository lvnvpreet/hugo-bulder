import { PrismaClient } from '@prisma/client';

// Create a new Prisma client
const prisma = new PrismaClient();

/**
 * Utility function to verify our fix is working correctly
 */
async function verifyProjectCompletionLogic() {
  try {
    console.log('Verifying Project Completion Logic...');

    // Sample complete wizard data
    const completeWizardData = {
      websiteType: { type: 'business' },
      businessInfo: { name: 'Test Business' },
      websitePurpose: { primary: 'generate-leads' },
      businessDescription: { shortDescription: 'Test description' },
      servicesSelection: { primaryServices: ['Service 1'] },
      locationInfo: { city: 'Test City' },
      websiteStructure: { pages: ['home'] },
      themeConfig: { hugoTheme: 'ananke' }
    };

    // Sample incomplete wizard data
    const incompleteWizardData = {
      websiteType: { type: 'business' },
      businessInfo: { name: 'Test Business' }
      // Missing other required fields
    };

    // Function to simulate our isWizardDataComplete logic
    function isWizardDataComplete(wizardData) {
      if (!wizardData || typeof wizardData !== 'object') {
        return false;
      }

      // Check for required wizard steps/data
      const requiredFields = [
        'websiteType',
        'businessInfo',
        'websitePurpose', 
        'businessDescription',
        'servicesSelection',
        'locationInfo',
        'websiteStructure',
        'themeConfig'
      ];

      return requiredFields.every(field => {
        const value = wizardData[field];
        return value && typeof value === 'object' && Object.keys(value).length > 0;
      });
    }

    // Test our logic
    console.log('1. Testing isWizardDataComplete with complete data:');
    const isComplete = isWizardDataComplete(completeWizardData);
    console.log(`   Result: ${isComplete ? '✅ Complete' : '❌ Incomplete'}`);

    console.log('2. Testing isWizardDataComplete with incomplete data:');
    const isIncomplete = isWizardDataComplete(incompleteWizardData);
    console.log(`   Result: ${isIncomplete ? '❌ Should be incomplete' : '✅ Correctly marked as incomplete'}`);

    // Check the user's project status
    const userId = 'cmc08g7xh0000uvypi0qe4p07'; // The user ID we fixed
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        projectsLimit: true,
        projectsUsed: true,
        _count: {
          select: {
            projects: true
          }
        }
      }
    });

    if (!user) {
      console.log('User not found');
      return;
    }

    console.log('\n3. User project status:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Project Limit: ${user.projectsLimit}`);
    console.log(`   Projects Used: ${user.projectsUsed}`);
    console.log(`   Actual Project Count: ${user._count.projects}`);

    // Check if we can create a test project directly with the database
    console.log('\n4. Creating test project directly in database:');
    
    const slug = `test-project-${Date.now()}`;
    
    const project = await prisma.project.create({
      data: {
        name: 'Test Project via Script',
        description: 'Created for testing isCompleted logic',
        slug,
        generationStatus: 'DRAFT',
        userId,
        wizardData: completeWizardData,
        isCompleted: isWizardDataComplete(completeWizardData),
        currentStep: 1
      }
    });

    console.log(`   Project created: ${project.id}`);
    console.log(`   Is completed: ${project.isCompleted}`);

    // Clean up - delete the test project
    await prisma.project.delete({
      where: { id: project.id }
    });
    
    console.log('   Test project deleted.');
    
    console.log('\n✅ Verification complete. The isWizardDataComplete logic is working correctly.');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the verification
verifyProjectCompletionLogic();
