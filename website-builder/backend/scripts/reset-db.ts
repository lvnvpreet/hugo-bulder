import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function clearDatabase() {
  console.log('🗑️ Clearing database...');
  try {
    // Clear all data in the correct order to avoid foreign key constraints
    await prisma.siteGeneration.deleteMany();
    await prisma.generatedContent.deleteMany();
    await prisma.assetUpload.deleteMany();
    await prisma.wizardStep.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();
    await prisma.serviceTemplate.deleteMany();
    await prisma.businessCategory.deleteMany();
    await prisma.websiteStructure.deleteMany();
    await prisma.hugoTheme.deleteMany();

    console.log('✅ Database cleared');
    return true;
  } catch (error) {
    console.error('❌ Failed to clear database:', error);
    return false;
  }
}

async function resetMigrations() {
  console.log('🔄 Resetting migrations...');
  try {
    // Reset migrations
    execSync('npx prisma migrate reset --force', { stdio: 'inherit' });
    console.log('✅ Migrations reset');
    return true;
  } catch (error) {
    console.error('❌ Failed to reset migrations:', error);
    return false;
  }
}

async function clearUploadedFiles() {
  console.log('📁 Clearing uploaded files...');
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    
    if (fs.existsSync(uploadsDir)) {
      fs.rmSync(uploadsDir, { recursive: true, force: true });
      console.log('✅ Uploaded files cleared');
    } else {
      console.log('ℹ️ No uploads directory found');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to clear uploaded files:', error);
    return false;
  }
}

async function recreateUploadsDirectory() {
  console.log('📁 Recreating uploads directory...');
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      
      // Create subdirectories
      const subdirs = ['avatars', 'logos', 'images', 'documents'];
      subdirs.forEach(subdir => {
        fs.mkdirSync(path.join(uploadsDir, subdir), { recursive: true });
      });
      
      console.log('✅ Uploads directory structure created');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to create uploads directory:', error);
    return false;
  }
}

async function runFreshMigrations() {
  console.log('🚀 Running fresh migrations...');
  try {
    execSync('npx prisma generate', { stdio: 'inherit' });
    execSync('npx prisma db push', { stdio: 'inherit' });
    console.log('✅ Fresh migrations completed');
    return true;
  } catch (error) {
    console.error('❌ Fresh migrations failed:', error);
    return false;
  }
}

async function seedFreshData() {
  console.log('🌱 Seeding fresh data...');
  try {
    execSync('npx tsx prisma/seed.ts', { stdio: 'inherit' });
    console.log('✅ Fresh data seeded');
    return true;
  } catch (error) {
    console.error('❌ Fresh data seeding failed:', error);
    return false;
  }
}

async function resetDatabase() {
  console.log('🔥 Starting complete database reset...');
  console.log('⚠️  WARNING: This will permanently delete ALL data!');
  
  const steps = [
    { name: 'Clear Database', fn: clearDatabase },
    { name: 'Clear Uploaded Files', fn: clearUploadedFiles },
    { name: 'Reset Migrations', fn: resetMigrations },
    { name: 'Run Fresh Migrations', fn: runFreshMigrations },
    { name: 'Recreate Uploads Directory', fn: recreateUploadsDirectory },
    { name: 'Seed Fresh Data', fn: seedFreshData },
  ];

  let completedSteps = 0;
  
  for (const step of steps) {
    console.log(`\n📋 Step ${completedSteps + 1}/${steps.length}: ${step.name}`);
    const success = await step.fn();
    
    if (!success) {
      console.error(`❌ Reset failed at step: ${step.name}`);
      process.exit(1);
    }
    
    completedSteps++;
  }

  console.log('\n🎉 Database reset completed successfully!');
  console.log('📊 Reset Summary:');
  console.log(`   ✅ ${completedSteps}/${steps.length} steps completed`);
  console.log('   🗑️ All data cleared and reset');
  console.log('   🌱 Fresh data seeded');
  console.log('   🚀 Database is ready for development');
}

// Confirmation prompt for safety
function confirmReset(): boolean {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Database reset is not allowed in production!');
    return false;
  }

  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('🤔 Are you sure you want to reset the database? This will DELETE ALL DATA! (yes/no): ', (answer: string) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

// Run reset if this file is executed directly
if (require.main === module) {
  (async () => {
    const confirmed = await confirmReset();
    
    if (!confirmed) {
      console.log('ℹ️ Database reset cancelled');
      process.exit(0);
    }

    await resetDatabase();
  })()
    .catch((error) => {
      console.error('💥 Reset failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { resetDatabase, clearDatabase, clearUploadedFiles };
