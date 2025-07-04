/**
 * Theme Configuration Mapping System
 * Maps wizard data to theme-specific parameters and features
 */

export interface ThemeConfigMapping {
  id: string;
  name: string;
  displayName: string;
  businessCategories: string[];
  parameterMapping: {
    [wizardField: string]: string | ((wizardData: any) => any);
  };
  requiredParameters: string[];
  supportedFeatures: string[];
  pageLayouts: {
    [pageType: string]: {
      layout: string;
      frontMatterFields?: string[];
      sections?: string[];
    };
  };
}

/**
 * Transform wizard business hours to theme-specific format
 */
function transformBusinessHours(wizardData: any): any {
  const hours = wizardData.locationInfo?.businessHours || {};
  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  const transformedHours: any = {};
  
  daysOfWeek.forEach(day => {
    const dayData = hours[day];
    if (dayData?.isOpen) {
      transformedHours[day] = `${dayData.open} - ${dayData.close}`;
    } else {
      transformedHours[day] = 'Closed';
    }
  });
  
  return transformedHours;
}

/**
 * Transform wizard social links to theme format
 */
function transformSocialLinks(wizardData: any): any {
  const socialLinks = wizardData.businessInfo?.socialLinks || {};
  
  return {
    facebook: socialLinks.facebook || '',
    twitter: socialLinks.twitter || '',
    instagram: socialLinks.instagram || '',
    linkedin: socialLinks.linkedin || '',
    youtube: socialLinks.youtube || ''
  };
}

/**
 * Format address for theme display
 */
function formatAddress(wizardData: any): string {
  const address = wizardData.locationInfo?.address;
  
  if (!address) return '';
  
  if (wizardData.locationInfo?.isOnlineOnly) {
    return 'Online Services Available';
  }
  
  const parts = [
    address.street,
    `${address.city}, ${address.state} ${address.zipCode}`
  ].filter(Boolean);
  
  return parts.join(', ');
}

/**
 * Generate healthcare-specific statistics
 */
function generateHealthcareStats(wizardData: any): Array<{label: string, value: string}> {
  const establishedYear = wizardData.businessInfo?.established;
  const currentYear = new Date().getFullYear();
  
  const stats = [
    {
      label: 'Years Experience',
      value: establishedYear ? `${currentYear - parseInt(establishedYear)}+` : '10+'
    },
    {
      label: 'Happy Patients',
      value: '1,000+'
    },
    {
      label: 'Professional Staff',
      value: '5+'
    }
  ];
  
  // Add services count if available
  const servicesCount = wizardData.servicesSelection?.selectedServices?.length;
  if (servicesCount && servicesCount > 0) {
    stats.push({
      label: 'Services Offered',
      value: `${servicesCount}+`
    });
  }
  
  return stats;
}

/**
 * Configuration mappings for different themes
 */
export const THEME_CONFIGURATIONS: ThemeConfigMapping[] = [
  {
    id: 'health-wellness-theme',
    name: 'health-wellness-theme',
    displayName: 'Health & Wellness Theme',
    businessCategories: ['healthcare', 'medical', 'dental', 'wellness', 'clinic'],
    
    parameterMapping: {
      // Contact Information
      'locationInfo.contactInfo.phone': 'phone',
      'locationInfo.contactInfo.email': 'email',
      'locationInfo.address': formatAddress,
      
      // Business Hours
      'locationInfo.businessHours': (wizardData: any) => ({
        hours: transformBusinessHours(wizardData)
      }),
      
      // Social Media
      'businessInfo.socialLinks': (wizardData: any) => ({
        social: transformSocialLinks(wizardData)
      }),
      
      // Healthcare-specific
      'healthcareInfo.emergencyPhone': 'emergency_phone',
      'businessInfo.name': 'businessName',
      'businessDescription.shortDescription': 'aboutText',
      
      // SEO and Meta
      'businessDescription.longDescription': 'description',
      'seoData.keywords': 'keywords',
      
      // Theme assets
      'assets.logo': 'logo',
      'assets.favicon': 'favicon',
      'assets.heroImage': 'hero_image',
      'assets.aboutImage': 'aboutImage'
    },
    
    requiredParameters: [
      'phone',
      'email', 
      'address',
      'hours',
      'businessName'
    ],
    
    supportedFeatures: [
      'appointment-booking',
      'business-hours',
      'emergency-contact',
      'patient-portal',
      'service-cards',
      'testimonials',
      'team-profiles',
      'contact-forms',
      'healthcare-stats',
      'insurance-info'
    ],
    
    pageLayouts: {
      homepage: {
        layout: 'home',
        sections: ['hero', 'services-preview', 'about-preview', 'testimonials', 'cta']
      },
      about: {
        layout: 'about',
        frontMatterFields: ['subtitle', 'hero_image', 'mission', 'vision', 'stats'],
        sections: ['story', 'mission', 'team-preview', 'credentials']
      },
      services: {
        layout: 'services',
        frontMatterFields: ['services_count', 'has_individual_pages']
      },
      'service-single': {
        layout: 'single',
        frontMatterFields: ['icon', 'price', 'duration', 'benefits', 'process']
      },
      contact: {
        layout: 'contact',
        frontMatterFields: ['map_embed', 'appointment_booking', 'emergency_info'],
        sections: ['contact-form', 'location', 'hours', 'emergency-info']
      },
      team: {
        layout: 'team',
        sections: ['team-members', 'credentials']
      },
      'patient-portal': {
        layout: 'single',
        sections: ['portal-features', 'access-instructions']
      },
      appointments: {
        layout: 'appointment',
        sections: ['booking-options', 'contact-info', 'appointment-types']
      }
    }
  },
  
  // Future theme configurations can be added here
  {
    id: 'restaurant-theme',
    name: 'restaurant-theme',
    displayName: 'Restaurant Theme',
    businessCategories: ['restaurant', 'food', 'hospitality', 'catering'],
    
    parameterMapping: {
      'locationInfo.contactInfo.phone': 'phone',
      'locationInfo.contactInfo.email': 'email',
      'locationInfo.address': formatAddress,
      'locationInfo.businessHours': (wizardData: any) => ({
        hours: transformBusinessHours(wizardData)
      }),
      'businessInfo.socialLinks': (wizardData: any) => ({
        social: transformSocialLinks(wizardData)
      }),
      'restaurantInfo.menuUrl': 'menu_url',
      'restaurantInfo.reservationUrl': 'reservation_url'
    },
    
    requiredParameters: [
      'phone',
      'email',
      'address',
      'hours'
    ],
    
    supportedFeatures: [
      'menu-display',
      'online-reservations',
      'food-gallery',
      'delivery-integration',
      'reviews',
      'chef-profiles',
      'special-events'
    ],
    
    pageLayouts: {
      homepage: {
        layout: 'home',
        sections: ['hero', 'menu-preview', 'about-preview', 'gallery', 'reservations']
      },
      menu: {
        layout: 'menu',
        sections: ['menu-categories', 'featured-dishes']
      },
      about: {
        layout: 'about',
        sections: ['story', 'chef-team', 'philosophy']
      },
      contact: {
        layout: 'contact',
        sections: ['reservation-form', 'location', 'hours']
      }
    }
  },
  
  {
    id: 'tech-theme',
    name: 'tech-theme', 
    displayName: 'Technology Theme',
    businessCategories: ['technology', 'software', 'ai', 'saas', 'startup'],
    
    parameterMapping: {
      'locationInfo.contactInfo.email': 'email',
      'businessInfo.socialLinks': (wizardData: any) => ({
        social: transformSocialLinks(wizardData)
      }),
      'techInfo.githubUrl': 'github',
      'techInfo.demoUrl': 'demo_url',
      'techInfo.apiDocUrl': 'api_docs'
    },
    
    requiredParameters: [
      'email'
    ],
    
    supportedFeatures: [
      'product-showcase',
      'documentation',
      'api-integration',
      'demo-area',
      'developer-tools',
      'code-samples',
      'pricing-tables'
    ],
    
    pageLayouts: {
      homepage: {
        layout: 'home',
        sections: ['hero', 'features', 'demo', 'pricing', 'cta']
      },
      products: {
        layout: 'products',
        sections: ['product-grid', 'features-comparison']
      },
      documentation: {
        layout: 'docs',
        sections: ['api-reference', 'tutorials', 'examples']
      },
      about: {
        layout: 'about',
        sections: ['team', 'technology-stack', 'company-values']
      }
    }
  }
];

/**
 * Get theme configuration by ID
 */
export function getThemeConfiguration(themeId: string): ThemeConfigMapping | undefined {
  return THEME_CONFIGURATIONS.find(config => config.id === themeId);
}

/**
 * Get theme configurations by business category
 */
export function getThemeConfigurationsByCategory(category: string): ThemeConfigMapping[] {
  return THEME_CONFIGURATIONS.filter(config => 
    config.businessCategories.includes(category.toLowerCase())
  );
}

/**
 * Check if theme supports a specific feature
 */
export function themeSupportsFeature(themeId: string, feature: string): boolean {
  const config = getThemeConfiguration(themeId);
  return config ? config.supportedFeatures.includes(feature) : false;
}

/**
 * Get page layout configuration for a theme
 */
export function getPageLayoutConfig(
  themeId: string, 
  pageType: string
): { layout: string; frontMatterFields?: string[]; sections?: string[] } | undefined {
  const config = getThemeConfiguration(themeId);
  return config?.pageLayouts[pageType];
}
