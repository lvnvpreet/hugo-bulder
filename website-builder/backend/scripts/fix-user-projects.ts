import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixUserProjects() {
  const userId = 'cmc08g7xh0000uvypi0qe4p07';
  
  try {
    // Get current user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
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

    console.log('Current user info:', {
      email: user.email,
      name: user.name,
      projectsLimit: user.projectsLimit,
      projectsUsed: user.projectsUsed,
      actualProjectCount: user._count.projects
    });

    // Get all projects for this user
    const projects = await prisma.project.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        generationStatus: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Found ${projects.length} projects:`);
    projects.forEach((project, index) => {
      console.log(`${index + 1}. ${project.name} (${project.generationStatus}) - ${project.createdAt}`);
    });

    // Fix the user's project count and increase limit for development
    const actualCount = projects.length;
    await prisma.user.update({
      where: { id: userId },
      data: {
        projectsUsed: actualCount,
        projectsLimit: 50 // Increase limit for development
      }
    });

    console.log('\n✅ Fixed user project count and increased limit to 50');
    
    // Verify the fix
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        projectsLimit: true,
        projectsUsed: true
      }
    });

    console.log('Updated user info:', updatedUser);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixUserProjects();
