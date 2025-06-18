// update-limit.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function updateLimit() {
  try {
    // Update all users to have a higher project limit
    const result = await prisma.user.updateMany({
      data: {
        projectsLimit: 25  // Set a generous limit for development
      }
    });
    
    console.log(`Updated ${result.count} users to have project limit of 25`);
    
    // Get the current user stats
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        projectsLimit: true,
        projectsUsed: true
      }
    });
    
    console.log('\nCurrent user stats:');
    users.forEach(user => {
      console.log(`- ${user.email}: ${user.projectsUsed}/${user.projectsLimit} projects used`);
    });
    
  } catch (error) {
    console.error('Error updating project limits:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateLimit();
