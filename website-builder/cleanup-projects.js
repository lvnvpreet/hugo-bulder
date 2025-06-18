const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupProjects() {
  try {
    // Delete any existing projects for this user
    const userId = 'cmc1k41nm0000rrw9oiold5cn'; // Your user ID
    
    const deletedProjects = await prisma.project.deleteMany({
      where: {
        userId: userId,
        name: {
          contains: 'car chuno'
        }
      }
    });
    
    console.log(`✅ Deleted ${deletedProjects.count} conflicting projects`);
    
    // Also clean up any partial projects
    const allUserProjects = await prisma.project.findMany({
      where: { userId: userId },
      select: { id: true, name: true, slug: true, createdAt: true }
    });
    
    console.log(`📊 Remaining projects: ${allUserProjects.length}`);
    allUserProjects.forEach(p => {
      console.log(`  - ${p.name} (${p.slug}) - ${p.createdAt}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupProjects();
