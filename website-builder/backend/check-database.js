import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabaseTables() {
  try {
    console.log('🔗 Connecting to database...');
    
    // Check database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    console.log('\n📊 Checking database tables and data:');
    console.log('=' .repeat(60));
    
    // Check Users table
    try {
      const userCount = await prisma.user.count();
      const sampleUser = await prisma.user.findFirst({
        select: {
          id: true,
          email: true,
          name: true,
          plan: true,
          createdAt: true,
        }
      });
      console.log(`\n👥 Users table: ✅ (${userCount} records)`);
      if (sampleUser) {
        console.log(`   Sample: ${sampleUser.email} (${sampleUser.plan}) - ${sampleUser.createdAt}`);
      }
    } catch (error) {
      console.log(`\n👥 Users table: ❌ Error - ${(error as Error).message}`);
    }
    
    // Check Projects table
    try {
      const projectCount = await prisma.project.count();
      const sampleProject = await prisma.project.findFirst({
        select: {
          id: true,
          name: true,
          type: true,
          createdAt: true,
          user: {
            select: { email: true }
          }
        }
      });
      console.log(`\n📁 Projects table: ✅ (${projectCount} records)`);
      if (sampleProject) {
        console.log(`   Sample: "${sampleProject.name}" (${sampleProject.type}) by ${sampleProject.user.email}`);
      }
    } catch (error) {
      console.log(`\n📁 Projects table: ❌ Error - ${(error as Error).message}`);
    }
    
    // Check SiteGeneration table
    try {
      const generationCount = await prisma.siteGeneration.count();
      const sampleGeneration = await prisma.siteGeneration.findFirst({
        select: {
          id: true,
          status: true,
          createdAt: true,
          project: {
            select: { name: true }
          }
        }
      });
      console.log(`\n🏗️ SiteGeneration table: ✅ (${generationCount} records)`);
      if (sampleGeneration) {
        console.log(`   Sample: ${sampleGeneration.status} for "${sampleGeneration.project.name}"`);
      }
    } catch (error) {
      console.log(`\n🏗️ SiteGeneration table: ❌ Error - ${(error as Error).message}`);
    }
    
    // Check HugoTheme table
    try {
      const themeCount = await prisma.hugoTheme.count();
      const themes = await prisma.hugoTheme.findMany({
        select: {
          id: true,
          name: true,
          isActive: true
        },
        take: 3
      });
      console.log(`\n🎨 HugoTheme table: ✅ (${themeCount} records)`);
      themes.forEach(theme => {
        console.log(`   ${theme.id}: ${theme.name} ${theme.isActive ? '(active)' : ''}`);
      });
    } catch (error) {
      console.log(`\n🎨 HugoTheme table: ❌ Error - ${(error as Error).message}`);
    }
    
    // Check BusinessCategory table
    try {
      const categoryCount = await prisma.businessCategory.count();
      const categories = await prisma.businessCategory.findMany({
        select: {
          id: true,
          name: true,
          isActive: true
        },
        take: 3
      });
      console.log(`\n🏢 BusinessCategory table: ✅ (${categoryCount} records)`);
      categories.forEach(category => {
        console.log(`   ${category.id}: ${category.name} ${category.isActive ? '(active)' : ''}`);
      });
    } catch (error) {
      console.log(`\n🏢 BusinessCategory table: ❌ Error - ${(error as Error).message}`);
    }
    
    // Check ServiceTemplate table
    try {
      const serviceCount = await prisma.serviceTemplate.count();
      const services = await prisma.serviceTemplate.findMany({
        select: {
          id: true,
          name: true,
          category: true,
          isActive: true
        },
        take: 3
      });
      console.log(`\n🛠️ ServiceTemplate table: ✅ (${serviceCount} records)`);
      services.forEach(service => {
        console.log(`   ${service.id}: ${service.name} (${service.category}) ${service.isActive ? '(active)' : ''}`);
      });
    } catch (error) {
      console.log(`\n🛠️ ServiceTemplate table: ❌ Error - ${(error as Error).message}`);
    }
    
    // Check AssetUpload table
    try {
      const assetCount = await prisma.assetUpload.count();
      console.log(`\n📎 AssetUpload table: ✅ (${assetCount} records)`);
    } catch (error) {
      console.log(`\n📎 AssetUpload table: ❌ Error - ${(error as Error).message}`);
    }
    
    // Check WizardStep table
    try {
      const wizardCount = await prisma.wizardStep.count();
      console.log(`\n🧙 WizardStep table: ✅ (${wizardCount} records)`);
    } catch (error) {
      console.log(`\n🧙 WizardStep table: ❌ Error - ${(error as Error).message}`);
    }
    
    // Check GeneratedContent table
    try {
      const contentCount = await prisma.generatedContent.count();
      console.log(`\n📝 GeneratedContent table: ✅ (${contentCount} records)`);
    } catch (error) {
      console.log(`\n📝 GeneratedContent table: ❌ Error - ${(error as Error).message}`);
    }
    
    // Check WebsiteStructure table
    try {
      const structureCount = await prisma.websiteStructure.count();
      console.log(`\n🏗️ WebsiteStructure table: ✅ (${structureCount} records)`);
    } catch (error) {
      console.log(`\n🏗️ WebsiteStructure table: ❌ Error - ${(error as Error).message}`);
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('✅ Database schema check completed!');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseTables().catch(console.error);
