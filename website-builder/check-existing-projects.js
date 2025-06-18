const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkExistingProjects() {
  try {
    const projects = await prisma.project.findMany({
      where: {
        userId: 'cmc1k41nm0000rrw9oiold5cn', // Your user ID from the login
      },
      select: { id: true, name: true, slug: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`Found ${projects.length} existing projects for user:`);
    projects.forEach(p => {
      console.log(`- ID: ${p.id}, Name: ${p.name}, Slug: ${p.slug}, Created: ${p.createdAt}`);
    });
    
    // Check specifically for car-chuno
    const carProject = projects.find(p => p.slug.includes('car'));
    if (carProject) {
      console.log('\n🎯 Found conflicting project:');
      console.log(`   Name: ${carProject.name}`);
      console.log(`   Slug: ${carProject.slug}`);
      console.log(`   ID: ${carProject.id}`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkExistingProjects();
