import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testSlugGeneration() {
  try {
    const userId = 'cmc0kk0tl00003ticymp64vga';
    const projectName = 'car chuno';
    
    console.log('Testing slug generation for:', projectName);
    
    const baseSlug = projectName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      .substring(0, 50);

    console.log('Base slug:', baseSlug);

    // Find all existing slugs with this pattern
    const existingSlugs = await prisma.project.findMany({
      where: {
        slug: {
          startsWith: baseSlug
        },
        userId
      },
      select: {
        slug: true
      }
    });

    console.log(`Found ${existingSlugs.length} existing slugs:`);
    existingSlugs.forEach(p => console.log(' -', p.slug));

    // Extract numbers from existing slugs and find the highest
    let maxNumber = 0;
    const slugNumbers = existingSlugs
      .map(p => p.slug)
      .filter(slug => slug.match(new RegExp(`^${baseSlug}(-\\d+)?$`)))
      .map(slug => {
        const match = slug.match(/(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      });

    console.log('Numbers found:', slugNumbers);

    if (slugNumbers.length > 0) {
      maxNumber = Math.max(...slugNumbers);
    }

    const newSlug = `${baseSlug}-${maxNumber + 1}`;
    console.log(`Next available slug should be: ${newSlug}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSlugGeneration();
