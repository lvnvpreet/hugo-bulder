/**
 * Page Structure Definitions
 * 
 * This file defines the page structures for different business categories and themes.
 * Each configuration specifies what pages should be created, their file paths,
 * and how they should be organized based on user selections in the wizard.
 */

export interface PageDefinition {
  key: string;           // Unique identifier for the page
  title: string;         // Display title
  filePath: string;      // Relative path from content/ directory
  layout?: string;       // Hugo layout to use
  isRequired: boolean;   // Whether this page is always created
  dependsOn?: string[];  // Wizard data dependencies
  contentType: 'static' | 'dynamic' | 'generated'; // How content is created
  sections?: string[];   // For single-page layouts
}

export interface BlogStructure {
  enabled: boolean;
  indexPath: string;
  postPath: string;      // Template for individual posts
  yearFolders: boolean;  // Whether to organize by year
  samplePosts: number;   // Number of sample posts to create
}

export interface ServiceStructure {
  indexPath: string;
  individualPages: boolean;
  pathTemplate: string;  // Template for individual service pages
  maxServices?: number;  // Maximum number of individual service pages
}

export interface PageStructureConfig {
  id: string;
  name: string;
  description: string;
  businessCategory: string;
  theme: string;
  structureType: 'single-page' | 'multi-page' | 'both';
  
  // Core page definitions
  pages: PageDefinition[];
  
  // Services configuration
  services: ServiceStructure;
  
  // Blog configuration
  blog: BlogStructure;
  
  // Navigation structure
  navigation: {
    main: string[];      // Main navigation items
    footer: string[];    // Footer navigation items
  };
  
  // SEO and metadata
  seo: {
    titleTemplate: string;
    defaultDescription: string;
    keywords: string[];
  };
}

/**
 * Healthcare Category - Health Wellness Theme Configuration
 */
export const HEALTHCARE_HEALTH_WELLNESS_MULTIPAGE: PageStructureConfig = {
  id: 'healthcare-health-wellness-multipage',
  name: 'Healthcare Multi-Page Structure',
  description: 'Comprehensive multi-page structure for healthcare practices',
  businessCategory: 'healthcare',
  theme: 'health-wellness-theme',
  structureType: 'multi-page',
  
  pages: [
    {
      key: 'homepage',
      title: 'Home',
      filePath: '_index.md',
      layout: 'home',
      isRequired: true,
      contentType: 'generated',
      sections: ['hero', 'services-preview', 'about-preview', 'testimonials', 'cta']
    },
    {
      key: 'about',
      title: 'About Us',
      filePath: 'about/_index.md',
      layout: 'about',
      isRequired: true,
      contentType: 'generated',
      sections: ['story', 'mission', 'team-preview', 'credentials']
    },
    {
      key: 'services-index',
      title: 'Our Services',
      filePath: 'services/_index.md',
      layout: 'services',
      isRequired: true,
      dependsOn: ['servicesSelection'],
      contentType: 'generated'
    },
    {
      key: 'contact',
      title: 'Contact Us',
      filePath: 'contact/_index.md',
      layout: 'contact',
      isRequired: true,
      contentType: 'generated',
      sections: ['contact-form', 'location', 'hours', 'emergency-info']
    }
  ],
  
  services: {
    indexPath: 'services/_index.md',
    individualPages: true,
    pathTemplate: 'services/{serviceSlug}/index.md',
    maxServices: 15
  },
  
  blog: {
    enabled: true,
    indexPath: 'blog/_index.md',
    postPath: 'blog/{year}/{postSlug}.md',
    yearFolders: true,
    samplePosts: 6
  },
  
  navigation: {
    main: ['home', 'about', 'services', 'blog', 'contact'],
    footer: ['about', 'services', 'contact']
  },
  
  seo: {
    titleTemplate: '{pageTitle} | {businessName} - Healthcare Services',
    defaultDescription: 'Professional healthcare services with personalized care and modern facilities.',
    keywords: ['healthcare', 'medical', 'clinic', 'doctor', 'health services']
  }
};

/**
 * Healthcare Category - Health Wellness Theme Single Page Configuration
 */
export const HEALTHCARE_HEALTH_WELLNESS_SINGLEPAGE: PageStructureConfig = {
  id: 'healthcare-health-wellness-singlepage',
  name: 'Healthcare Single-Page Structure',
  description: 'Single-page structure for small healthcare practices',
  businessCategory: 'healthcare',
  theme: 'health-wellness-theme',
  structureType: 'single-page',
  
  pages: [
    {
      key: 'homepage',
      title: 'Home',
      filePath: '_index.md',
      layout: 'single-page',
      isRequired: true,
      contentType: 'generated',
      sections: [
        'hero',
        'about',
        'services',
        'testimonials',
        'location',
        'contact'
      ]
    }
  ],
  
  services: {
    indexPath: '_index.md', // Services included in main page
    individualPages: false,
    pathTemplate: '', // No individual pages for single-page
    maxServices: 10
  },
  
  blog: {
    enabled: false,
    indexPath: '',
    postPath: '',
    yearFolders: false,
    samplePosts: 0
  },
  
  navigation: {
    main: ['about', 'services', 'contact'], // Section links
    footer: ['contact']
  },
  
  seo: {
    titleTemplate: '{businessName} - Healthcare Services',
    defaultDescription: 'Professional healthcare services with personalized care.',
    keywords: ['healthcare', 'medical', 'clinic', 'doctor']
  }
};

/**
 * Technology Category - Tech Theme (Example for future expansion)
 */
export const TECHNOLOGY_TECH_THEME_MULTIPAGE: PageStructureConfig = {
  id: 'technology-tech-theme-multipage',
  name: 'Technology Multi-Page Structure',
  description: 'Multi-page structure for technology companies',
  businessCategory: 'technology',
  theme: 'tech-theme',
  structureType: 'multi-page',
  
  pages: [
    {
      key: 'homepage',
      title: 'Home',
      filePath: '_index.md',
      layout: 'home',
      isRequired: true,
      contentType: 'generated'
    },
    {
      key: 'about',
      title: 'About',
      filePath: 'about/_index.md',
      layout: 'about',
      isRequired: true,
      contentType: 'generated'
    },
    {
      key: 'services-index',
      title: 'Services',
      filePath: 'services/_index.md',
      layout: 'services',
      isRequired: true,
      contentType: 'generated'
    },
    {
      key: 'portfolio',
      title: 'Portfolio',
      filePath: 'portfolio/_index.md',
      layout: 'portfolio',
      isRequired: false,
      contentType: 'generated'
    },
    {
      key: 'contact',
      title: 'Contact',
      filePath: 'contact/_index.md',
      layout: 'contact',
      isRequired: true,
      contentType: 'generated'
    }
  ],
  
  services: {
    indexPath: 'services/_index.md',
    individualPages: true,
    pathTemplate: 'services/{serviceSlug}/index.md',
    maxServices: 20
  },
  
  blog: {
    enabled: true,
    indexPath: 'blog/_index.md',
    postPath: 'blog/{year}/{postSlug}.md',
    yearFolders: true,
    samplePosts: 8
  },
  
  navigation: {
    main: ['home', 'about', 'services', 'portfolio', 'blog', 'contact'],
    footer: ['about', 'services', 'portfolio', 'contact']
  },
  
  seo: {
    titleTemplate: '{pageTitle} | {businessName} - Technology Solutions',
    defaultDescription: 'Innovative technology solutions for modern businesses.',
    keywords: ['technology', 'software', 'development', 'IT services']
  }
};

/**
 * All available page structure configurations
 */
export const PAGE_STRUCTURE_CONFIGS: PageStructureConfig[] = [
  HEALTHCARE_HEALTH_WELLNESS_MULTIPAGE,
  HEALTHCARE_HEALTH_WELLNESS_SINGLEPAGE,
  TECHNOLOGY_TECH_THEME_MULTIPAGE,
  // Add more configurations as needed
];

/**
 * Helper function to get page structure configuration
 */
export function getPageStructureConfig(
  businessCategory: string,
  theme: string,
  structureType: 'single-page' | 'multi-page'
): PageStructureConfig | null {
  return PAGE_STRUCTURE_CONFIGS.find(config =>
    config.businessCategory === businessCategory &&
    config.theme === theme &&
    (config.structureType === structureType || config.structureType === 'both')
  ) || null;
}

/**
 * Helper function to resolve dynamic page paths with actual data
 */
export function resolvePagePaths(
  config: PageStructureConfig,
  wizardData: any
): {
  staticPages: { key: string; filePath: string; title: string }[];
  servicePages: { name: string; slug: string; filePath: string }[];
  blogPages: { title: string; slug: string; filePath: string; year: number }[];
} {
  const staticPages = config.pages.map(page => ({
    key: page.key,
    filePath: page.filePath,
    title: page.title
  }));

  const servicePages: { name: string; slug: string; filePath: string }[] = [];
  if (config.services.individualPages && wizardData.servicesSelection?.selectedServices) {
    wizardData.servicesSelection.selectedServices.forEach((service: any) => {
      const slug = slugify(service.name);
      const filePath = config.services.pathTemplate.replace('{serviceSlug}', slug);
      servicePages.push({
        name: service.name,
        slug,
        filePath
      });
    });
  }

  const blogPages: { title: string; slug: string; filePath: string; year: number }[] = [];
  if (config.blog.enabled) {
    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;
    
    // Create sample blog posts
    const sampleBlogTitles = generateSampleBlogTitles(config.businessCategory, config.blog.samplePosts);
    
    sampleBlogTitles.forEach((title, index) => {
      const year = index < 3 ? currentYear : previousYear; // Split between current and previous year
      const slug = slugify(title);
      const filePath = config.blog.postPath
        .replace('{year}', year.toString())
        .replace('{postSlug}', slug);
      
      blogPages.push({
        title,
        slug,
        filePath,
        year
      });
    });
  }

  return { staticPages, servicePages, blogPages };
}

/**
 * Helper function to create URL-friendly slugs
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Generate sample blog titles based on business category
 */
function generateSampleBlogTitles(businessCategory: string, count: number): string[] {
  const titleTemplates: { [key: string]: string[] } = {
    healthcare: [
      '5 Tips for Maintaining Good Health',
      'Understanding Preventive Care Benefits',
      'How to Prepare for Your Annual Check-up',
      'Managing Chronic Conditions Effectively',
      'The Importance of Regular Health Screenings',
      'Healthy Lifestyle Choices for Better Living'
    ],
    technology: [
      'Latest Trends in Software Development',
      'Cybersecurity Best Practices for Businesses',
      'The Future of Cloud Computing',
      'Digital Transformation Strategies',
      'AI and Machine Learning Applications',
      'Building Scalable Web Applications'
    ],
    // Add more categories as needed
  };

  const templates = titleTemplates[businessCategory] || [
    'Industry News and Updates',
    'Best Practices in Our Field',
    'Customer Success Stories',
    'Tips and Insights',
    'Latest Developments',
    'Expert Advice and Guidance'
  ];

  return templates.slice(0, count);
}
