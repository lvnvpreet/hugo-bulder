import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUserProjects() {
  try {
    const userId = 'cmc0kk0tl00003ticymp64vga';
    console.log('Checking projects for user:', userId);
    
    const projects = await prisma.project.findMany({
      where: { userId },
      select: { id: true, name: true, slug: true },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('Found projects:', projects.length);
    
    // Look for car-chuno projects specifically
    const carChunoProjects = projects.filter(p => p.slug.startsWith('car-chuno'));
    console.log('Car Chuno projects:', carChunoProjects);
    
    // Check for the specific slug that's failing
    const existingSlug = await prisma.project.findFirst({
      where: { slug: 'car-chuno-26' }
    });
    
    console.log('Existing car-chuno-26 project:', existingSlug ? 'EXISTS' : 'NOT FOUND');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserProjects();
