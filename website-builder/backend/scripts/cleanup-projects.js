/**
 * Utility script to clean up old projects during development
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupProjects() {
  try {
    console.log('Starting project cleanup...');
    
    // Get all users
    const users = await prisma.user.findMany();
    
    for (const user of users) {
      console.log(`Processing user ${user.id} (${user.email})`);
      
      // Get projects for this user, ordered by last modified
      const projects = await prisma.project.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: 'desc' },
        include: { siteGenerations: true }
      });
      
      if (projects.length <= user.projectsLimit) {
        console.log(`User ${user.email} has ${projects.length} projects, within limit of ${user.projectsLimit}`);
        continue;
      }
      
      console.log(`User ${user.email} has ${projects.length} projects, exceeding limit of ${user.projectsLimit}`);
      
      // Keep the most recent projects up to the limit
      const projectsToKeep = projects.slice(0, user.projectsLimit);
      const projectsToDelete = projects.slice(user.projectsLimit);
      
      console.log(`Keeping ${projectsToKeep.length} projects, deleting ${projectsToDelete.length} projects`);
      
      // Delete the older projects
      for (const project of projectsToDelete) {
        console.log(`Deleting project ${project.id}: ${project.name}`);
        
        // Delete in transaction to maintain data integrity
        await prisma.$transaction(async (tx) => {
          // Delete wizard steps
          await tx.wizardStep.deleteMany({ where: { projectId: project.id } });
          
          // Delete generated content
          await tx.generatedContent.deleteMany({ where: { projectId: project.id } });
          
          // Delete site generations
          await tx.siteGeneration.deleteMany({ where: { projectId: project.id } });
          
          // Delete assets
          await tx.assetUpload.deleteMany({ where: { projectId: project.id } });
          
          // Delete project
          await tx.project.delete({ where: { id: project.id } });
        });
      }
      
      // Update projectsUsed count for accuracy
      await prisma.user.update({
        where: { id: user.id },
        data: { projectsUsed: projectsToKeep.length }
      });
      
      console.log(`Successfully updated user ${user.email} - now has ${projectsToKeep.length} projects`);
    }
    
    console.log('Project cleanup completed successfully!');
  } catch (error) {
    console.error('Error during project cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupProjects();
