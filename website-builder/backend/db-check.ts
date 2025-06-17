import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabaseTables() {
  try {
    console.log('🔗 Connecting to database...');
    
    // Check database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    console.log('\n📊 Checking database tables and record counts:');
    console.log('=' .repeat(60));
    
    // Define table check function
    const checkTable = async (tableName: string, model: any) => {
      try {
        const count = await model.count();
        console.log(`✅ ${tableName}: ${count} records`);
        return true;
      } catch (error: any) {
        console.log(`❌ ${tableName}: Error - ${error.message}`);
        return false;
      }
    };
    
    // Check all tables
    const results = await Promise.allSettled([
      checkTable('Users', prisma.user),
      checkTable('Projects', prisma.project),
      checkTable('SiteGeneration', prisma.siteGeneration),
      checkTable('HugoTheme', prisma.hugoTheme),
      checkTable('BusinessCategory', prisma.businessCategory),
      checkTable('ServiceTemplate', prisma.serviceTemplate),
      checkTable('AssetUpload', prisma.assetUpload),
      checkTable('WizardStep', prisma.wizardStep),
      checkTable('GeneratedContent', prisma.generatedContent),
      checkTable('WebsiteStructure', prisma.websiteStructure),
    ]);
    
    console.log('\n📊 Sample Data Check:');
    console.log('-' .repeat(40));
    
    // Check for sample user data
    try {
      const userSample = await prisma.user.findFirst({
        select: { id: true, email: true, plan: true }
      });
      if (userSample) {
        console.log(`👤 Sample User: ${userSample.email} (${userSample.plan})`);
      } else {
        console.log(`👤 No users found - you'll need to create accounts`);
      }
    } catch (error: any) {
      console.log(`👤 User check failed: ${error.message}`);
    }
    
    // Check for sample project data
    try {
      const projectSample = await prisma.project.findFirst({
        select: { id: true, name: true, slug: true }
      });
      if (projectSample) {
        console.log(`📁 Sample Project: "${projectSample.name}" (${projectSample.slug})`);
      } else {
        console.log(`📁 No projects found - ready for new projects`);
      }
    } catch (error: any) {
      console.log(`📁 Project check failed: ${error.message}`);
    }
    
    // Check for sample themes
    try {
      const themeSample = await prisma.hugoTheme.findFirst({
        select: { id: true, name: true, isActive: true }
      });
      if (themeSample) {
        console.log(`🎨 Sample Theme: ${themeSample.name} ${themeSample.isActive ? '(active)' : '(inactive)'}`);
      } else {
        console.log(`🎨 No themes found - need to seed theme data`);
      }
    } catch (error: any) {
      console.log(`🎨 Theme check failed: ${error.message}`);
    }
    
    console.log('\n' + '=' .repeat(60));
    
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const totalTables = results.length;
    
    if (successCount === totalTables) {
      console.log(`✅ All ${totalTables} tables are present and accessible!`);
      console.log(`🚀 Database is ready for the website builder application.`);
    } else {
      console.log(`⚠️  ${successCount}/${totalTables} tables are working.`);
      console.log(`❌ Some tables may need to be created or have permission issues.`);
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.log('\n🔍 Possible issues:');
    console.log('   - Database server not running');
    console.log('   - Wrong connection credentials');
    console.log('   - Database does not exist');
    console.log('   - Network connectivity issues');
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
console.log('🔍 Website Builder Database Check');
console.log('=' .repeat(60));
checkDatabaseTables().catch(console.error);
