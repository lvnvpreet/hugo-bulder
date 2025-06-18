import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkProjects() {
  try {
    console.log('🔍 Checking database connection...');
    
    // Check if the project that was failing exists
    const specificProject = await prisma.project.findUnique({
      where: { id: 'cmc1ivrfw0005mlujmrlhp4w8' },
      select: { id: true, name: true, userId: true, createdAt: true }
    });
    
    if (specificProject) {
      console.log('🎯 Found the specific project:', specificProject);
    } else {
      console.log('❌ The project ID "cmc1ivrfw0005mlujmrlhp4w8" does NOT exist in database');
    }
    
    // Check recent projects
    const projects = await prisma.project.findMany({
      select: { id: true, name: true, userId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    console.log('\n📊 Recent projects in database:');
    if (projects.length === 0) {
      console.log('  No projects found in database');
    } else {
      projects.forEach(p => {
        console.log(`  - ID: ${p.id}, Name: ${p.name}, User: ${p.userId}, Created: ${p.createdAt}`);
      });
    }
    
    console.log(`\n✅ Total projects found: ${projects.length}`);
    
    // Check database schema
    const tableInfo = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'projects' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;
    
    console.log('\n🏗️ Project table schema:');
    console.log(tableInfo);
    
  } catch (error) {
    console.error('❌ Database operation failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProjects();
