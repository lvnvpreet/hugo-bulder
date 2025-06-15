import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

async function validateConnection() {
  console.log('🔌 Validating database connection...');
  try {
    await prisma.$connect();
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

async function runMigrations() {
  console.log('🚀 Running database migrations...');
  try {
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('✅ Database migrations completed');
    return true;
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return false;
  }
}

async function generatePrismaClient() {
  console.log('⚙️ Generating Prisma client...');
  try {
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('✅ Prisma client generated');
    return true;
  } catch (error) {
    console.error('❌ Prisma client generation failed:', error);
    return false;
  }
}

async function seedDatabase() {
  console.log('🌱 Seeding database...');
  try {
    execSync('npx tsx prisma/seed.ts', { stdio: 'inherit' });
    console.log('✅ Database seeded successfully');
    return true;
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    return false;
  }
}

async function createIndexes() {
  console.log('📊 Creating performance indexes...');
  try {
    // Create additional indexes for performance
    await prisma.$executeRaw`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_user_status ON projects(user_id, generation_status);`;
    await prisma.$executeRaw`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_generated_content_project_type ON generated_content(project_id, content_type);`;
    await prisma.$executeRaw`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wizard_steps_project_step ON wizard_steps(project_id, step_number);`;
    await prisma.$executeRaw`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_site_generations_status ON site_generations(status, created_at);`;
    
    console.log('✅ Performance indexes created');
    return true;
  } catch (error) {
    console.error('❌ Index creation failed:', error);
    return false;
  }
}

async function validateData() {
  console.log('🔍 Validating data integrity...');
  try {
    const businessCategoryCount = await prisma.businessCategory.count();
    const serviceTemplateCount = await prisma.serviceTemplate.count();
    const websiteStructureCount = await prisma.websiteStructure.count();
    const hugoThemeCount = await prisma.hugoTheme.count();

    console.log(`📈 Data validation results:`);
    console.log(`   - Business Categories: ${businessCategoryCount}`);
    console.log(`   - Service Templates: ${serviceTemplateCount}`);
    console.log(`   - Website Structures: ${websiteStructureCount}`);
    console.log(`   - Hugo Themes: ${hugoThemeCount}`);

    if (businessCategoryCount === 0 || serviceTemplateCount === 0) {
      console.warn('⚠️ Warning: Missing reference data, consider running seed script');
    }

    return true;
  } catch (error) {
    console.error('❌ Data validation failed:', error);
    return false;
  }
}

async function setupDatabase() {
  console.log('🏗️ Starting database setup...');
  
  const steps = [
    { name: 'Database Connection', fn: validateConnection },
    { name: 'Prisma Client Generation', fn: generatePrismaClient },
    { name: 'Database Migrations', fn: runMigrations },
    { name: 'Database Seeding', fn: seedDatabase },
    { name: 'Performance Indexes', fn: createIndexes },
    { name: 'Data Validation', fn: validateData },
  ];

  let completedSteps = 0;
  
  for (const step of steps) {
    console.log(`\n📋 Step ${completedSteps + 1}/${steps.length}: ${step.name}`);
    const success = await step.fn();
    
    if (!success) {
      console.error(`❌ Setup failed at step: ${step.name}`);
      process.exit(1);
    }
    
    completedSteps++;
  }

  console.log('\n🎉 Database setup completed successfully!');
  console.log('📊 Setup Summary:');
  console.log(`   ✅ ${completedSteps}/${steps.length} steps completed`);
  console.log('   🚀 Database is ready for use');
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase()
    .catch((error) => {
      console.error('💥 Setup failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { setupDatabase, validateConnection, runMigrations, seedDatabase };
