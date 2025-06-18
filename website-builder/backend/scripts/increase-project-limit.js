/**
 * Utility script to increase project limits for users
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Configuration
const DEFAULT_INCREASE = 5;
const args = process.argv.slice(2);
const userEmail = args[0];
const increaseAmount = parseInt(args[1] || DEFAULT_INCREASE, 10);

async function increaseProjectLimit() {
  try {
    if (!userEmail) {
      console.error('Error: User email is required');
      console.log('Usage: node increase-project-limit.js <user-email> [increase-amount]');
      console.log('Example: node increase-project-limit.js user@example.com 10');
      return;
    }
    
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });
    
    if (!user) {
      console.error(`Error: User not found with email ${userEmail}`);
      return;
    }
    
    const currentLimit = user.projectsLimit;
    const newLimit = currentLimit + increaseAmount;
    
    // Update the user's project limit
    await prisma.user.update({
      where: { id: user.id },
      data: { projectsLimit: newLimit }
    });
    
    console.log(`Successfully updated project limit for ${userEmail}:`);
    console.log(`- Previous limit: ${currentLimit}`);
    console.log(`- New limit: ${newLimit}`);
    console.log(`- Current usage: ${user.projectsUsed}`);
    console.log(`- Available slots: ${newLimit - user.projectsUsed}`);
    
  } catch (error) {
    console.error('Error increasing project limit:', error);
  } finally {
    await prisma.$disconnect();
  }
}

increaseProjectLimit();
