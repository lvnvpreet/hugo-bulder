import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data (optional, be careful in production)
  await prisma.serviceTemplate.deleteMany();
  await prisma.businessCategory.deleteMany();
  await prisma.websiteStructure.deleteMany();
  await prisma.hugoTheme.deleteMany();

  // 1. Business Categories
  console.log('📂 Seeding business categories...');
  const businessCategories = await Promise.all([
    prisma.businessCategory.create({
      data: {
        name: 'technology',
        displayName: 'Technology & Software',
        description: 'Software development, IT services, and technology companies',
        icon: 'computer',
        industry: 'Technology',
        isActive: true,
      }
    }),
    prisma.businessCategory.create({
      data: {
        name: 'healthcare',
        displayName: 'Healthcare & Medical',
        description: 'Medical practices, healthcare providers, and wellness services',
        icon: 'medical',
        industry: 'Healthcare',
        isActive: true,
      }
    }),
    prisma.businessCategory.create({
      data: {
        name: 'professional',
        displayName: 'Professional Services',
        description: 'Legal, accounting, consulting, and other professional services',
        icon: 'briefcase',
        industry: 'Professional Services',
        isActive: true,
      }
    }),
    prisma.businessCategory.create({
      data: {
        name: 'restaurant',
        displayName: 'Restaurant & Food Service',
        description: 'Restaurants, cafes, catering, and food service businesses',
        icon: 'restaurant',
        industry: 'Food & Beverage',
        isActive: true,
      }
    }),
    prisma.businessCategory.create({
      data: {
        name: 'retail',
        displayName: 'Retail & E-commerce',
        description: 'Retail stores, e-commerce, and product sales',
        icon: 'shopping',
        industry: 'Retail',
        isActive: true,
      }
    }),
    prisma.businessCategory.create({
      data: {
        name: 'realestate',
        displayName: 'Real Estate',
        description: 'Real estate agencies, property management, and real estate services',
        icon: 'home',
        industry: 'Real Estate',
        isActive: true,
      }
    }),
    prisma.businessCategory.create({
      data: {
        name: 'education',
        displayName: 'Education & Training',
        description: 'Educational institutions, training providers, and tutoring services',
        icon: 'book',
        industry: 'Education',
        isActive: true,
      }
    }),
    prisma.businessCategory.create({
      data: {
        name: 'creative',
        displayName: 'Creative & Design',
        description: 'Design agencies, creative studios, and artistic services',
        icon: 'palette',
        industry: 'Creative',
        isActive: true,
      }
    }),
    prisma.businessCategory.create({
      data: {
        name: 'automotive',
        displayName: 'Automotive',
        description: 'Auto repair, car sales, and automotive services',
        icon: 'car',
        industry: 'Automotive',
        isActive: true,
      }
    }),
    prisma.businessCategory.create({
      data: {
        name: 'nonprofit',
        displayName: 'Non-Profit Organization',
        description: 'Non-profit organizations, charities, and community groups',
        icon: 'heart',
        industry: 'Non-Profit',
        isActive: true,
      }
    }),
  ]);

  // 2. Service Templates for each category
  console.log('🛠️ Seeding service templates...');
  
  // Technology Services
  const techCategory = businessCategories.find(c => c.name === 'technology')!;
  await Promise.all([
    prisma.serviceTemplate.create({
      data: {
        businessCategoryId: techCategory.id,
        name: 'Web Development',
        description: 'Custom website and web application development',
        features: ['Responsive Design', 'Modern Frameworks', 'Database Integration', 'API Development'],
        isPopular: true,
        sortOrder: 1,
        contentKeywords: ['web development', 'custom websites', 'web applications', 'responsive design'],
        defaultPricing: 'Starting from $2,500',
      }
    }),
    prisma.serviceTemplate.create({
      data: {
        businessCategoryId: techCategory.id,
        name: 'Mobile App Development',
        description: 'Native and cross-platform mobile application development',
        features: ['iOS Development', 'Android Development', 'Cross-Platform', 'App Store Optimization'],
        isPopular: true,
        sortOrder: 2,
        contentKeywords: ['mobile apps', 'iOS', 'Android', 'app development'],
        defaultPricing: 'Starting from $5,000',
      }
    }),
    prisma.serviceTemplate.create({
      data: {
        businessCategoryId: techCategory.id,
        name: 'IT Consulting',
        description: 'Strategic IT consulting and technology planning',
        features: ['Technology Strategy', 'Infrastructure Planning', 'Digital Transformation', 'Security Assessment'],
        isPopular: false,
        sortOrder: 3,
        contentKeywords: ['IT consulting', 'technology strategy', 'digital transformation'],
        defaultPricing: '$150/hour',
      }
    }),
  ]);

  // Healthcare Services
  const healthcareCategory = businessCategories.find(c => c.name === 'healthcare')!;
  await Promise.all([
    prisma.serviceTemplate.create({
      data: {
        businessCategoryId: healthcareCategory.id,
        name: 'General Practice',
        description: 'Comprehensive primary healthcare services',
        features: ['Preventive Care', 'Chronic Disease Management', 'Health Screenings', 'Family Medicine'],
        isPopular: true,
        sortOrder: 1,
        contentKeywords: ['family doctor', 'primary care', 'preventive medicine', 'health checkups'],
        defaultPricing: 'Insurance Accepted',
      }
    }),
    prisma.serviceTemplate.create({
      data: {
        businessCategoryId: healthcareCategory.id,
        name: 'Dentistry',
        description: 'Complete dental care and oral health services',
        features: ['Preventive Dentistry', 'Restorative Procedures', 'Cosmetic Dentistry', 'Emergency Care'],
        isPopular: true,
        sortOrder: 2,
        contentKeywords: ['dental care', 'teeth cleaning', 'dental procedures', 'oral health'],
        defaultPricing: 'Insurance Accepted',
      }
    }),
    prisma.serviceTemplate.create({
      data: {
        businessCategoryId: healthcareCategory.id,
        name: 'Physical Therapy',
        description: 'Rehabilitation and movement therapy services',
        features: ['Injury Rehabilitation', 'Pain Management', 'Movement Analysis', 'Exercise Therapy'],
        isPopular: false,
        sortOrder: 3,
        contentKeywords: ['physical therapy', 'rehabilitation', 'injury recovery', 'movement therapy'],
        defaultPricing: '$80 per session',
      }
    }),
  ]);

  // Professional Services
  const professionalCategory = businessCategories.find(c => c.name === 'professional')!;
  await Promise.all([
    prisma.serviceTemplate.create({
      data: {
        businessCategoryId: professionalCategory.id,
        name: 'Accounting Services',
        description: 'Complete accounting and bookkeeping services',
        features: ['Tax Preparation', 'Bookkeeping', 'Financial Planning', 'Business Consulting'],
        isPopular: true,
        sortOrder: 1,
        contentKeywords: ['accounting', 'tax preparation', 'bookkeeping', 'financial services'],
        defaultPricing: 'Contact for pricing',
      }
    }),
    prisma.serviceTemplate.create({
      data: {
        businessCategoryId: professionalCategory.id,
        name: 'Legal Services',
        description: 'Professional legal representation and consultation',
        features: ['Legal Consultation', 'Contract Review', 'Business Law', 'Estate Planning'],
        isPopular: true,
        sortOrder: 2,
        contentKeywords: ['legal services', 'attorney', 'legal consultation', 'law firm'],
        defaultPricing: '$250/hour',
      }
    }),
    prisma.serviceTemplate.create({
      data: {
        businessCategoryId: professionalCategory.id,
        name: 'Business Consulting',
        description: 'Strategic business consulting and management advice',
        features: ['Strategy Development', 'Process Improvement', 'Market Analysis', 'Growth Planning'],
        isPopular: false,
        sortOrder: 3,
        contentKeywords: ['business consulting', 'strategy', 'management consulting'],
        defaultPricing: '$200/hour',
      }
    }),
  ]);

  // Restaurant Services
  const restaurantCategory = businessCategories.find(c => c.name === 'restaurant')!;
  await Promise.all([
    prisma.serviceTemplate.create({
      data: {
        businessCategoryId: restaurantCategory.id,
        name: 'Dine-in Service',
        description: 'Full-service restaurant dining experience',
        features: ['Table Service', 'Full Menu', 'Wine Selection', 'Private Events'],
        isPopular: true,
        sortOrder: 1,
        contentKeywords: ['restaurant', 'dining', 'full service', 'table service'],
        defaultPricing: 'Menu pricing available',
      }
    }),
    prisma.serviceTemplate.create({
      data: {
        businessCategoryId: restaurantCategory.id,
        name: 'Takeout & Delivery',
        description: 'Convenient takeout and delivery services',
        features: ['Online Ordering', 'Fast Delivery', 'Pickup Service', 'Mobile App'],
        isPopular: true,
        sortOrder: 2,
        contentKeywords: ['takeout', 'delivery', 'online ordering', 'fast food'],
        defaultPricing: 'Delivery fees apply',
      }
    }),
    prisma.serviceTemplate.create({
      data: {
        businessCategoryId: restaurantCategory.id,
        name: 'Catering Services',
        description: 'Professional catering for events and special occasions',
        features: ['Event Catering', 'Corporate Catering', 'Special Events', 'Custom Menus'],
        isPopular: false,
        sortOrder: 3,
        contentKeywords: ['catering', 'event catering', 'corporate catering', 'special events'],
        defaultPricing: '$25 per person minimum',
      }
    }),
  ]);

  // 3. Website Structures
  console.log('🏗️ Seeding website structures...');
  await Promise.all([
    prisma.websiteStructure.create({
      data: {
        name: 'single-page-business',
        displayName: 'Single Page Business',
        description: 'All content on one scrollable page, perfect for small businesses',
        type: 'SINGLE_PAGE',
        defaultSections: ['hero', 'about', 'services', 'testimonials', 'contact'],
        defaultPages: [],
        suitableFor: ['business', 'startup', 'consulting'],
        isActive: true,
      }
    }),
    prisma.websiteStructure.create({
      data: {
        name: 'multi-page-business',
        displayName: 'Multi-Page Business',
        description: 'Traditional website with separate pages for different sections',
        type: 'MULTI_PAGE',
        defaultSections: [],
        defaultPages: ['home', 'about', 'services', 'blog', 'contact'],
        suitableFor: ['business', 'professional', 'enterprise'],
        isActive: true,
      }
    }),
    prisma.websiteStructure.create({
      data: {
        name: 'portfolio-single',
        displayName: 'Portfolio Single Page',
        description: 'Showcase your work and skills on one engaging page',
        type: 'SINGLE_PAGE',
        defaultSections: ['hero', 'projects', 'skills', 'about', 'contact'],
        defaultPages: [],
        suitableFor: ['portfolio', 'creative', 'freelancer'],
        isActive: true,
      }
    }),
    prisma.websiteStructure.create({
      data: {
        name: 'portfolio-multi',
        displayName: 'Portfolio Multi-Page',
        description: 'Detailed portfolio with separate pages for different aspects',
        type: 'MULTI_PAGE',
        defaultSections: [],
        defaultPages: ['home', 'projects', 'about', 'blog', 'contact'],
        suitableFor: ['portfolio', 'creative', 'professional'],
        isActive: true,
      }
    }),
    prisma.websiteStructure.create({
      data: {
        name: 'blog-structure',
        displayName: 'Blog Structure',
        description: 'Content-focused website optimized for blogging',
        type: 'MULTI_PAGE',
        defaultSections: [],
        defaultPages: ['home', 'posts', 'categories', 'about', 'contact'],
        suitableFor: ['blog', 'personal', 'content'],
        isActive: true,
      }
    }),
  ]);

  // 4. Hugo Themes
  console.log('🎨 Seeding Hugo themes...');
  await Promise.all([
    prisma.hugoTheme.create({
      data: {
        themeId: 'papermod',
        name: 'PaperMod',
        displayName: 'PaperMod',
        description: 'A fast, clean, responsive Hugo theme with great typography',
        category: 'blog',
        githubUrl: 'https://github.com/adityatelange/hugo-PaperMod',
        demoUrl: 'https://adityatelange.github.io/hugo-PaperMod/',
        documentationUrl: 'https://github.com/adityatelange/hugo-PaperMod/wiki',
        license: 'MIT',
        version: '7.0',
        suitableFor: ['blog', 'business', 'portfolio'],
        structureTypes: ['multi-page'],
        features: ['dark-mode', 'search', 'responsive', 'fast', 'seo-optimized'],
        colorSchemes: {
          default: { primary: '#1e40af', secondary: '#64748b' },
          dark: { primary: '#3b82f6', secondary: '#94a3b8' }
        },
        fontOptions: {
          heading: ['Inter', 'Roboto', 'Open Sans'],
          body: ['System UI', 'Georgia', 'Times']
        },
        downloadCount: 15420,
        popularityScore: 95,
        isActive: true,
        isFeatured: true,
        screenshots: [
          'https://raw.githubusercontent.com/adityatelange/hugo-PaperMod/exampleSite/static/images/papermod-cover.png'
        ],
      }
    }),
    prisma.hugoTheme.create({
      data: {
        themeId: 'ananke',
        name: 'Ananke',
        displayName: 'Ananke',
        description: 'A clean, simple theme with a focus on content and readability',
        category: 'business',
        githubUrl: 'https://github.com/theNewDynamic/gohugo-theme-ananke',
        demoUrl: 'https://gohugo-ananke-theme-demo.netlify.app/',
        license: 'MIT',
        version: '2.8.0',
        suitableFor: ['business', 'blog', 'portfolio'],
        structureTypes: ['multi-page', 'single-page'],
        features: ['responsive', 'customizable', 'clean-design'],
        colorSchemes: {
          default: { primary: '#357edd', secondary: '#5e72e4' }
        },
        fontOptions: {
          heading: ['Montserrat', 'Lato'],
          body: ['Source Sans Pro', 'Open Sans']
        },
        downloadCount: 12850,
        popularityScore: 85,
        isActive: true,
        isFeatured: true,
        screenshots: [],
      }
    }),
    prisma.hugoTheme.create({
      data: {
        themeId: 'academic',
        name: 'Academic',
        displayName: 'Academic',
        description: 'Perfect for academics, researchers, and professionals',
        category: 'portfolio',
        githubUrl: 'https://github.com/wowchemy/starter-hugo-academic',
        demoUrl: 'https://academic-demo.netlify.app/',
        license: 'MIT',
        version: '5.5.0',
        suitableFor: ['portfolio', 'academic', 'professional'],
        structureTypes: ['multi-page'],
        features: ['portfolio', 'publications', 'cv', 'responsive'],
        colorSchemes: {
          default: { primary: '#2962ff', secondary: '#424242' }
        },
        fontOptions: {
          heading: ['Montserrat', 'Roboto'],
          body: ['Source Sans Pro', 'Roboto']
        },
        downloadCount: 9250,
        popularityScore: 80,
        isActive: true,
        isFeatured: false,
        screenshots: [],
      }
    }),
    prisma.hugoTheme.create({
      data: {
        themeId: 'mainroad',
        name: 'Mainroad',
        displayName: 'Mainroad',
        description: 'A responsive, simple, clean Hugo theme for blogs',
        category: 'blog',
        githubUrl: 'https://github.com/Vimux/Mainroad',
        demoUrl: 'https://mainroad-demo.netlify.app/',
        license: 'GPL-2.0',
        version: '3.1.0',
        suitableFor: ['blog', 'personal'],
        structureTypes: ['multi-page'],
        features: ['blog-focused', 'sidebar', 'responsive', 'customizable'],
        colorSchemes: {
          default: { primary: '#e22d30', secondary: '#333' }
        },
        fontOptions: {
          heading: ['Open Sans', 'Arial'],
          body: ['Open Sans', 'Georgia']
        },
        downloadCount: 7650,
        popularityScore: 75,
        isActive: true,
        isFeatured: false,
        screenshots: [],
      }
    }),
    prisma.hugoTheme.create({
      data: {
        themeId: 'clarity',
        name: 'Clarity',
        displayName: 'Clarity',
        description: 'A technology-focused blog theme with great code highlighting',
        category: 'blog',
        githubUrl: 'https://github.com/chipzoller/hugo-clarity',
        demoUrl: 'https://clarity.staticmania.com/',
        license: 'MIT',
        version: '1.4.0',
        suitableFor: ['blog', 'technology'],
        structureTypes: ['multi-page'],
        features: ['dark-mode', 'code-highlighting', 'search', 'responsive'],
        colorSchemes: {
          default: { primary: '#1565c0', secondary: '#424242' },
          dark: { primary: '#42a5f5', secondary: '#757575' }
        },
        fontOptions: {
          heading: ['Inter', 'Roboto'],
          body: ['Source Sans Pro', 'System UI']
        },
        downloadCount: 5420,
        popularityScore: 70,
        isActive: true,
        isFeatured: false,
        screenshots: [],
      }
    }),
    prisma.hugoTheme.create({
      data: {
        themeId: 'terminal',
        name: 'Terminal',
        displayName: 'Terminal',
        description: 'A minimal, terminal-inspired theme for developers',
        category: 'portfolio',
        githubUrl: 'https://github.com/panr/hugo-theme-terminal',
        demoUrl: 'https://hugo-terminal.now.sh/',
        license: 'MIT',
        version: '2.0.0',
        suitableFor: ['portfolio', 'developer', 'minimal'],
        structureTypes: ['multi-page'],
        features: ['minimal', 'terminal-style', 'dark-theme', 'responsive'],
        colorSchemes: {
          default: { primary: '#00ff41', secondary: '#000' }
        },
        fontOptions: {
          heading: ['Fira Code', 'Monaco'],
          body: ['Fira Code', 'Courier New']
        },
        downloadCount: 4320,
        popularityScore: 65,
        isActive: true,
        isFeatured: false,
        screenshots: [],
      }
    }),
  ]);

  console.log('✅ Database seeding completed successfully!');
  console.log(`📊 Seeded:`);
  console.log(`   - ${businessCategories.length} business categories`);
  console.log(`   - ${await prisma.serviceTemplate.count()} service templates`);
  console.log(`   - ${await prisma.websiteStructure.count()} website structures`);
  console.log(`   - ${await prisma.hugoTheme.count()} Hugo themes`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });