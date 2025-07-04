// backend/src/services/ThemeDetectionService.ts
// Complete updated implementation with subcategory-based theme selection

import * as path from 'path';
import * as fs from 'fs';

export interface ThemeRecommendation {
  themeId: string;
  confidence: number;
  reasons: string[];
  websiteTypeMatch?: boolean;
  businessCategoryMatch?: boolean;
}

export interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

export interface ThemeConfig {
  id: string;
  name: string;
  displayName: string;
  categories: string[];
  websiteTypes: string[];
  features: string[];
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
  };
  suitability: {
    business: number;
    portfolio: number;
    blog: number;
    ecommerce: number;
    restaurant: number;
    medical: number;
    creative: number;
    technology: number;
  };
  githubUrl?: string;  // Optional for local themes
  isLocal?: boolean;   // Indicates if theme is local only
  installCommand: string;
}

// ⭐ THEME CONFIGURATION - Allow for default themes and custom themes
const USE_CUSTOM_THEMES_ONLY = false; // Set to false to allow default Hugo themes
const FORCE_THEME_SELECTION = false;  // Set to false to allow manual theme selection

const VERIFIED_THEMES: ThemeConfig[] = [
  // 🎯 DEFAULT HUGO THEME - Simple, clean, works for all business types
  {
    id: 'default-hugo',
    name: 'default-hugo',
    displayName: 'Default Hugo Theme - Clean & Simple',
    categories: ['business', 'portfolio', 'blog', 'general'],
    websiteTypes: ['business', 'portfolio', 'blog'],
    features: ['responsive', 'fast', 'seo-friendly', 'minimal', 'customizable'],
    colorScheme: { 
      primary: '#2563eb',   // Professional blue
      secondary: '#64748b', // Neutral gray
      accent: '#059669'     // Success green
    },
    suitability: {
      business: 80,
      portfolio: 85,
      blog: 90,
      ecommerce: 70,
      restaurant: 75,
      medical: 75,
      creative: 80,
      technology: 85
    },
    isLocal: false,
    installCommand: 'Default Hugo theme - no installation required'
  },
  
  // 🎯 YOUR CUSTOM HEALTHCARE THEME - Now available from GitHub
  {
    id: 'health-wellness-theme',
    name: 'health-wellness-theme',
    displayName: 'Health & Wellness - Medical Theme',
    categories: ['healthcare', 'medical', 'dental', 'wellness'],
    websiteTypes: ['business'],
    features: ['appointment-booking', 'patient-portal', 'medical-focus', 'healthcare-optimized', 'trust-building'],
    colorScheme: { 
      primary: '#0369a1',   // Medical blue
      secondary: '#0284c7', // Lighter blue
      accent: '#059669'     // Trust green
    },
    suitability: {
      business: 95,
      portfolio: 30,
      blog: 40,
      ecommerce: 20,
      restaurant: 10,
      medical: 98,          // ⭐ HIGHEST score for healthcare
      creative: 30,
      technology: 40
    },
    githubUrl: 'https://github.com/lvnvpreet/health-wellness-theme.git',
    isLocal: false,  // Now remote since it's on GitHub
    installCommand: 'Remote theme - cloning from GitHub repository'
  }
  
  // 🔮 TODO: Add more custom themes here
  
  // TODO: Restaurant & Food Services Theme
  // {
  //   id: 'custom-restaurant-theme',
  //   name: 'custom-restaurant-theme',
  //   displayName: 'Custom Restaurant - Food Service Theme',
  //   categories: ['restaurant', 'food', 'hospitality', 'catering'],
  //   websiteTypes: ['business'],
  //   features: ['menu-display', 'online-reservations', 'food-gallery', 'delivery-integration', 'reviews'],
  //   colorScheme: { primary: '#dc2626', secondary: '#ef4444', accent: '#f59e0b' },
  //   suitability: { business: 90, portfolio: 30, blog: 40, ecommerce: 70, restaurant: 98, medical: 10, creative: 60, technology: 30 },
  //   githubUrl: 'https://github.com/yourcompany/custom-restaurant-theme',
  //   installCommand: 'Custom theme - local installation'
  // },

  // TODO: E-commerce & Retail Theme
  // {
  //   id: 'custom-ecommerce-theme',
  //   name: 'custom-ecommerce-theme',
  //   displayName: 'Custom E-commerce - Online Store Theme',
  //   categories: ['ecommerce', 'retail', 'shop', 'store'],
  //   websiteTypes: ['business', 'ecommerce'],
  //   features: ['product-catalog', 'shopping-cart', 'payment-integration', 'inventory-management', 'customer-accounts'],
  //   colorScheme: { primary: '#059669', secondary: '#10b981', accent: '#f59e0b' },
  //   suitability: { business: 85, portfolio: 30, blog: 30, ecommerce: 98, restaurant: 40, medical: 20, creative: 50, technology: 60 },
  //   githubUrl: 'https://github.com/yourcompany/custom-ecommerce-theme',
  //   installCommand: 'Custom theme - local installation'
  // },

  // TODO: Technology & Software Theme
  // {
  //   id: 'custom-tech-theme',
  //   name: 'custom-tech-theme',
  //   displayName: 'Custom Technology - Software & Tech Theme',
  //   categories: ['technology', 'software', 'ai', 'saas', 'startup'],
  //   websiteTypes: ['business', 'portfolio'],
  //   features: ['product-showcase', 'documentation', 'api-integration', 'demo-area', 'developer-tools'],
  //   colorScheme: { primary: '#1e40af', secondary: '#3b82f6', accent: '#8b5cf6' },
  //   suitability: { business: 88, portfolio: 85, blog: 70, ecommerce: 60, restaurant: 30, medical: 40, creative: 75, technology: 98 },
  //   githubUrl: 'https://github.com/yourcompany/custom-tech-theme',
  //   installCommand: 'Custom theme - local installation'
  // },

  // TODO: Professional Services Theme
  // {
  //   id: 'custom-professional-theme',
  //   name: 'custom-professional-theme',
  //   displayName: 'Custom Professional - Business Services Theme',
  //   categories: ['professional', 'legal', 'finance', 'consulting', 'accounting'],
  //   websiteTypes: ['business'],
  //   features: ['service-pages', 'contact-forms', 'testimonials', 'case-studies', 'team-profiles'],
  //   colorScheme: { primary: '#1e40af', secondary: '#3b82f6', accent: '#6366f1' },
  //   suitability: { business: 95, portfolio: 70, blog: 60, ecommerce: 40, restaurant: 30, medical: 50, creative: 60, technology: 70 },
  //   githubUrl: 'https://github.com/yourcompany/custom-professional-theme',
  //   installCommand: 'Custom theme - local installation'
  // },

  // TODO: Creative & Portfolio Theme
  // {
  //   id: 'custom-creative-theme',
  //   name: 'custom-creative-theme',
  //   displayName: 'Custom Creative - Portfolio & Design Theme',
  //   categories: ['creative', 'design', 'art', 'photography', 'agency'],
  //   websiteTypes: ['portfolio', 'business'],
  //   features: ['portfolio-gallery', 'project-showcase', 'client-testimonials', 'creative-layouts', 'image-optimization'],
  //   colorScheme: { primary: '#7c3aed', secondary: '#8b5cf6', accent: '#f59e0b' },
  //   suitability: { business: 75, portfolio: 98, blog: 70, ecommerce: 50, restaurant: 60, medical: 30, creative: 98, technology: 60 },
  //   githubUrl: 'https://github.com/yourcompany/custom-creative-theme',
  //   installCommand: 'Custom theme - local installation'
  // },

  // TODO: Education & Training Theme
  // {
  //   id: 'custom-education-theme',
  //   name: 'custom-education-theme',
  //   displayName: 'Custom Education - Learning & Training Theme',
  //   categories: ['education', 'training', 'courses', 'school', 'university'],
  //   websiteTypes: ['business', 'blog'],
  //   features: ['course-catalog', 'student-portal', 'learning-management', 'instructor-profiles', 'certification'],
  //   colorScheme: { primary: '#0369a1', secondary: '#0284c7', accent: '#059669' },
  //   suitability: { business: 85, portfolio: 60, blog: 80, ecommerce: 40, restaurant: 30, medical: 50, creative: 60, technology: 75 },
  //   githubUrl: 'https://github.com/yourcompany/custom-education-theme',
  //   installCommand: 'Custom theme - local installation'
  // },

  // TODO: Real Estate Theme
  // {
  //   id: 'custom-realestate-theme',
  //   name: 'custom-realestate-theme',
  //   displayName: 'Custom Real Estate - Property & Listings Theme',
  //   categories: ['realestate', 'property', 'housing', 'rental'],
  //   websiteTypes: ['business'],
  //   features: ['property-listings', 'search-filters', 'virtual-tours', 'agent-profiles', 'mortgage-calculator'],
  //   colorScheme: { primary: '#059669', secondary: '#10b981', accent: '#f59e0b' },
  //   suitability: { business: 92, portfolio: 60, blog: 50, ecommerce: 70, restaurant: 30, medical: 30, creative: 50, technology: 60 },
  //   githubUrl: 'https://github.com/yourcompany/custom-realestate-theme',
  //   installCommand: 'Custom theme - local installation'
  // },

  // TODO: Fitness & Wellness Theme
  // {
  //   id: 'custom-fitness-theme',
  //   name: 'custom-fitness-theme',
  //   displayName: 'Custom Fitness - Health & Wellness Theme',
  //   categories: ['fitness', 'gym', 'wellness', 'spa', 'nutrition'],
  //   websiteTypes: ['business'],
  //   features: ['class-schedules', 'trainer-profiles', 'membership-plans', 'booking-system', 'progress-tracking'],
  //   colorScheme: { primary: '#059669', secondary: '#10b981', accent: '#f59e0b' },
  //   suitability: { business: 90, portfolio: 60, blog: 70, ecommerce: 60, restaurant: 40, medical: 70, creative: 60, technology: 50 },
  //   githubUrl: 'https://github.com/yourcompany/custom-fitness-theme',
  //   installCommand: 'Custom theme - local installation'
  // }
];

// ⭐ CUSTOM BUSINESS CATEGORY MAPPING - Only for custom themes (when enabled)
const CUSTOM_THEME_MAPPING: { [category: string]: string[] } = {
  // ✅ IMPLEMENTED: Healthcare categories - use custom theme (optional)
  'healthcare': FORCE_THEME_SELECTION ? ['health-wellness-theme'] : ['default-hugo', 'health-wellness-theme'],
  'medical': FORCE_THEME_SELECTION ? ['health-wellness-theme'] : ['default-hugo', 'health-wellness-theme'],
  'dental': FORCE_THEME_SELECTION ? ['health-wellness-theme'] : ['default-hugo', 'health-wellness-theme'],
  'wellness': FORCE_THEME_SELECTION ? ['health-wellness-theme'] : ['default-hugo', 'health-wellness-theme'],
  
  // Default fallback for all other categories
  'business': ['default-hugo'],
  'technology': ['default-hugo'],
  'professional': ['default-hugo'],
  'other': ['default-hugo']
  
  // TODO: Restaurant & Food Services - implement custom-restaurant-theme
  // 'restaurant': ['custom-restaurant-theme'],
  // 'food': ['custom-restaurant-theme'],
  // 'hospitality': ['custom-restaurant-theme'],
  // 'catering': ['custom-restaurant-theme'],
  
  // TODO: E-commerce & Retail - implement custom-ecommerce-theme
  // 'ecommerce': ['custom-ecommerce-theme'],
  // 'retail': ['custom-ecommerce-theme'],
  // 'shop': ['custom-ecommerce-theme'],
  // 'store': ['custom-ecommerce-theme'],
  
  // TODO: Technology & Software - implement custom-tech-theme
  // 'technology': ['custom-tech-theme'],
  // 'software': ['custom-tech-theme'],
  // 'ai': ['custom-tech-theme'],
  // 'saas': ['custom-tech-theme'],
  // 'startup': ['custom-tech-theme'],
  
  // TODO: Professional Services - implement custom-professional-theme
  // 'professional': ['custom-professional-theme'],
  // 'legal': ['custom-professional-theme'],
  // 'finance': ['custom-professional-theme'],
  // 'consulting': ['custom-professional-theme'],
  // 'accounting': ['custom-professional-theme'],
  
  // TODO: Creative & Portfolio - implement custom-creative-theme
  // 'creative': ['custom-creative-theme'],
  // 'design': ['custom-creative-theme'],
  // 'art': ['custom-creative-theme'],
  // 'photography': ['custom-creative-theme'],
  // 'agency': ['custom-creative-theme'],
  
  // TODO: Education & Training - implement custom-education-theme
  // 'education': ['custom-education-theme'],
  // 'training': ['custom-education-theme'],
  // 'courses': ['custom-education-theme'],
  // 'school': ['custom-education-theme'],
  // 'university': ['custom-education-theme'],
  
  // TODO: Real Estate - implement custom-realestate-theme
  // 'realestate': ['custom-realestate-theme'],
  // 'property': ['custom-realestate-theme'],
  // 'housing': ['custom-realestate-theme'],
  // 'rental': ['custom-realestate-theme'],
  
  // TODO: Fitness & Wellness - implement custom-fitness-theme
  // 'fitness': ['custom-fitness-theme'],
  // 'gym': ['custom-fitness-theme'],
  // 'spa': ['custom-fitness-theme'],
  // 'nutrition': ['custom-fitness-theme'],
  
  // ⚠️ NOTE: Categories without custom themes will return "no-theme-available"
};

// Industry-specific color schemes
const INDUSTRY_COLORS: { [key: string]: ColorScheme } = {
  // ✅ IMPLEMENTED: Healthcare colors
  healthcare: {
    primary: '#0369a1', secondary: '#0284c7', accent: '#059669',
    background: '#f0f9ff', text: '#1e293b'
  },
  medical: {
    primary: '#0369a1', secondary: '#0284c7', accent: '#059669',
    background: '#f0f9ff', text: '#1e293b'
  },
  
  // TODO: Restaurant & Food Services colors
  restaurant: {
    primary: '#dc2626', secondary: '#ef4444', accent: '#f59e0b',
    background: '#fef3c7', text: '#1f2937'
  },
  food: {
    primary: '#dc2626', secondary: '#ef4444', accent: '#f59e0b',
    background: '#fef3c7', text: '#1f2937'
  },
  
  // TODO: Technology & Software colors
  technology: {
    primary: '#1e40af', secondary: '#3b82f6', accent: '#8b5cf6',
    background: '#f8fafc', text: '#0f172a'
  },
  software: {
    primary: '#1e40af', secondary: '#3b82f6', accent: '#8b5cf6',
    background: '#f8fafc', text: '#0f172a'
  },
  
  // TODO: Professional Services colors
  professional: {
    primary: '#1e40af', secondary: '#3b82f6', accent: '#6366f1',
    background: '#f8fafc', text: '#0f172a'
  },
  legal: {
    primary: '#1e40af', secondary: '#3b82f6', accent: '#6366f1',
    background: '#f8fafc', text: '#0f172a'
  },
  finance: {
    primary: '#1e40af', secondary: '#3b82f6', accent: '#6366f1',
    background: '#f8fafc', text: '#0f172a'
  },
  
  // TODO: Creative & Portfolio colors
  creative: {
    primary: '#7c3aed', secondary: '#8b5cf6', accent: '#f59e0b',
    background: '#faf5ff', text: '#1f2937'
  },
  design: {
    primary: '#7c3aed', secondary: '#8b5cf6', accent: '#f59e0b',
    background: '#faf5ff', text: '#1f2937'
  },
  
  // TODO: E-commerce & Retail colors
  ecommerce: {
    primary: '#059669', secondary: '#10b981', accent: '#f59e0b',
    background: '#f0fdf4', text: '#1f2937'
  },
  retail: {
    primary: '#059669', secondary: '#10b981', accent: '#f59e0b',
    background: '#f0fdf4', text: '#1f2937'
  },
  
  // TODO: Education colors
  education: {
    primary: '#0369a1', secondary: '#0284c7', accent: '#059669',
    background: '#f0f9ff', text: '#1e293b'
  },
  
  // TODO: Real Estate colors
  realestate: {
    primary: '#059669', secondary: '#10b981', accent: '#f59e0b',
    background: '#f0fdf4', text: '#1f2937'
  },
  
  // TODO: Fitness & Wellness colors
  fitness: {
    primary: '#059669', secondary: '#10b981', accent: '#f59e0b',
    background: '#f0fdf4', text: '#1f2937'
  },
  
  // Legacy categories (keeping for compatibility)
  automotive: {
    primary: '#1f2937', secondary: '#374151', accent: '#dc2626',
    background: '#ffffff', text: '#111827'
  }
};

export class ThemeDetectionService {
  private themes: ThemeConfig[];
  private initialized = false;

  constructor() {
    this.themes = [...VERIFIED_THEMES];
  }

  async initialize() {
    if (!this.initialized) {
      this.themes = [...VERIFIED_THEMES];
      this.initialized = true;
      console.log(`✅ ThemeDetectionService initialized with ${this.themes.length} themes`);
    }
  }

  /**
   * ⭐ MAIN THEME DETECTION METHOD - Custom themes only
   */
  public async detectTheme(wizardData: any): Promise<ThemeRecommendation> {
    if (!this.initialized) {
      await this.initialize();
    }

    console.log('🎯 Starting custom theme detection with data:', {
      websiteType: wizardData.websiteType?.id || wizardData.websiteType?.category,
      businessCategory: wizardData.businessCategory?.id || wizardData.businessCategory?.name,
      subcategory: wizardData.businessCategory?.selectedSubCategory?.id || wizardData.businessInfo?.selectedSubcategory?.id
    });

    // Extract data
    const websiteType = this.extractWebsiteType(wizardData);
    const businessCategory = this.extractBusinessCategory(wizardData);
    const subcategory = this.extractSubcategory(wizardData);

    console.log('📊 Extracted data:', { websiteType, businessCategory, subcategory });

    // ⭐ ONLY METHOD 1: Custom theme selection with subcategory support
    const customTheme = this.selectCustomTheme(websiteType, businessCategory, subcategory);
    if (customTheme) {
      console.log(`✅ Theme selected: ${customTheme.themeId} (${customTheme.confidence}% confidence)`);
      
      return {
        themeId: customTheme.themeId,
        confidence: customTheme.confidence,
        reasons: [
          subcategory ? 
            `Match for ${subcategory} in ${businessCategory} industry` :
            `Good match for ${businessCategory || 'general'} businesses`,
          `Suitable for ${websiteType} websites`,
          customTheme.themeId === 'default-hugo' ? 
            'Clean, professional default theme' : 
            'Custom theme with specialized features'
        ],
        websiteTypeMatch: true,
        businessCategoryMatch: true
      };
    }

    // ⭐ Final fallback to default theme (should not reach here with current logic)
    console.log('🎛️ Using final fallback to default theme');
    
    return {
      themeId: 'default-hugo',
      confidence: 40,
      reasons: [
        'Default Hugo theme - clean and professional',
        'Works well for all business types',
        'Fast, responsive, and SEO-friendly'
      ],
      websiteTypeMatch: true,
      businessCategoryMatch: false
    };
  }

  /**
   * ⭐ CUSTOM THEME SELECTION - Enhanced with subcategory support and configurable behavior
   */
  private selectCustomTheme(websiteType: string, businessCategory: string | null, subcategory: string | null): { themeId: string; confidence: number } | null {
    
    // If forcing themes is disabled, provide default theme with lower confidence to allow choice
    if (!FORCE_THEME_SELECTION) {
      console.log('🎛️ Force theme selection is disabled - providing default theme option');
      return { themeId: 'default-hugo', confidence: 60 }; // Lower confidence allows user choice
    }
    
    // ✅ IMPLEMENTED: HEALTHCARE CATEGORY - Check subcategory for confidence boost
    if (websiteType === 'business' && businessCategory === 'healthcare') {
      
      // ⭐ HIGH CONFIDENCE (95%) for specific healthcare subcategories
      if (subcategory === 'dentists') {
        console.log('🦷 Dentist subcategory detected - selecting health-wellness-theme with 95% confidence');
        return { themeId: 'health-wellness-theme', confidence: 95 };
      }
      
      if (subcategory === 'doctors') {
        console.log('👨‍⚕️ Doctor subcategory detected - selecting health-wellness-theme with 95% confidence');
        return { themeId: 'health-wellness-theme', confidence: 95 };
      }
      
      if (subcategory === 'clinics') {
        console.log('🏥 Clinic subcategory detected - selecting health-wellness-theme with 95% confidence');
        return { themeId: 'health-wellness-theme', confidence: 95 };
      }
      
      if (subcategory === 'therapists') {
        console.log('🧠 Therapist subcategory detected - selecting health-wellness-theme with 95% confidence');
        return { themeId: 'health-wellness-theme', confidence: 95 };
      }
      
      // 📊 MEDIUM CONFIDENCE (75%) for healthcare without specific subcategory
      console.log('🏥 Healthcare category detected - selecting health-wellness-theme with 75% confidence');
      return { themeId: 'health-wellness-theme', confidence: 75 };
    }
    
    // TODO: RESTAURANT & FOOD SERVICES CATEGORY - implement custom-restaurant-theme
    // if (websiteType === 'business' && ['restaurant', 'food', 'hospitality', 'catering'].includes(businessCategory)) {
    //   
    //   // HIGH CONFIDENCE (95%) for specific restaurant subcategories
    //   if (subcategory === 'fine-dining') {
    //     console.log('🍽️ Fine dining subcategory detected - selecting custom-restaurant-theme with 95% confidence');
    //     return { themeId: 'custom-restaurant-theme', confidence: 95 };
    //   }
    //   
    //   if (subcategory === 'fast-food') {
    //     console.log('🍕 Fast food subcategory detected - selecting custom-restaurant-theme with 95% confidence');
    //     return { themeId: 'custom-restaurant-theme', confidence: 95 };
    //   }
    //   
    //   if (subcategory === 'cafe') {
    //     console.log('☕ Cafe subcategory detected - selecting custom-restaurant-theme with 95% confidence');
    //     return { themeId: 'custom-restaurant-theme', confidence: 95 };
    //   }
    //   
    //   if (subcategory === 'bakery') {
    //     console.log('🥖 Bakery subcategory detected - selecting custom-restaurant-theme with 95% confidence');
    //     return { themeId: 'custom-restaurant-theme', confidence: 95 };
    //   }
    //   
    //   // MEDIUM CONFIDENCE (75%) for restaurant without specific subcategory
    //   console.log('🍴 Restaurant category detected - selecting custom-restaurant-theme with 75% confidence');
    //   return { themeId: 'custom-restaurant-theme', confidence: 75 };
    // }
    
    // TODO: TECHNOLOGY & SOFTWARE CATEGORY - implement custom-tech-theme
    // if (websiteType === 'business' && ['technology', 'software', 'ai', 'saas', 'startup'].includes(businessCategory)) {
    //   
    //   // HIGH CONFIDENCE (95%) for specific tech subcategories
    //   if (subcategory === 'software-development') {
    //     console.log('💻 Software development subcategory detected - selecting custom-tech-theme with 95% confidence');
    //     return { themeId: 'custom-tech-theme', confidence: 95 };
    //   }
    //   
    //   if (subcategory === 'ai-ml') {
    //     console.log('🤖 AI/ML subcategory detected - selecting custom-tech-theme with 95% confidence');
    //     return { themeId: 'custom-tech-theme', confidence: 95 };
    //   }
    //   
    //   if (subcategory === 'saas') {
    //     console.log('☁️ SaaS subcategory detected - selecting custom-tech-theme with 95% confidence');
    //     return { themeId: 'custom-tech-theme', confidence: 95 };
    //   }
    //   
    //   if (subcategory === 'mobile-apps') {
    //     console.log('📱 Mobile apps subcategory detected - selecting custom-tech-theme with 95% confidence');
    //     return { themeId: 'custom-tech-theme', confidence: 95 };
    //   }
    //   
    //   // MEDIUM CONFIDENCE (75%) for technology without specific subcategory
    //   console.log('💻 Technology category detected - selecting custom-tech-theme with 75% confidence');
    //   return { themeId: 'custom-tech-theme', confidence: 75 };
    // }
    
    // TODO: PROFESSIONAL SERVICES CATEGORY - implement custom-professional-theme
    // if (websiteType === 'business' && ['professional', 'legal', 'finance', 'consulting', 'accounting'].includes(businessCategory)) {
    //   
    //   // HIGH CONFIDENCE (95%) for specific professional subcategories
    //   if (subcategory === 'law-firm') {
    //     console.log('⚖️ Law firm subcategory detected - selecting custom-professional-theme with 95% confidence');
    //     return { themeId: 'custom-professional-theme', confidence: 95 };
    //   }
    //   
    //   if (subcategory === 'financial-advisor') {
    //     console.log('💰 Financial advisor subcategory detected - selecting custom-professional-theme with 95% confidence');
    //     return { themeId: 'custom-professional-theme', confidence: 95 };
    //   }
    //   
    //   if (subcategory === 'management-consulting') {
    //     console.log('📊 Management consulting subcategory detected - selecting custom-professional-theme with 95% confidence');
    //     return { themeId: 'custom-professional-theme', confidence: 95 };
    //   }
    //   
    //   if (subcategory === 'accounting') {
    //     console.log('🧮 Accounting subcategory detected - selecting custom-professional-theme with 95% confidence');
    //     return { themeId: 'custom-professional-theme', confidence: 95 };
    //   }
    //   
    //   // MEDIUM CONFIDENCE (75%) for professional without specific subcategory
    //   console.log('💼 Professional services category detected - selecting custom-professional-theme with 75% confidence');
    //   return { themeId: 'custom-professional-theme', confidence: 75 };
    // }
    
    // TODO: E-COMMERCE & RETAIL CATEGORY - implement custom-ecommerce-theme
    // if (websiteType === 'business' && ['ecommerce', 'retail', 'shop', 'store'].includes(businessCategory)) {
    //   
    //   // HIGH CONFIDENCE (95%) for specific ecommerce subcategories
    //   if (subcategory === 'fashion') {
    //     console.log('👗 Fashion subcategory detected - selecting custom-ecommerce-theme with 95% confidence');
    //     return { themeId: 'custom-ecommerce-theme', confidence: 95 };
    //   }
    //   
    //   if (subcategory === 'electronics') {
    //     console.log('🔌 Electronics subcategory detected - selecting custom-ecommerce-theme with 95% confidence');
    //     return { themeId: 'custom-ecommerce-theme', confidence: 95 };
    //   }
    //   
    //   if (subcategory === 'home-garden') {
    //     console.log('🏡 Home & Garden subcategory detected - selecting custom-ecommerce-theme with 95% confidence');
    //     return { themeId: 'custom-ecommerce-theme', confidence: 95 };
    //   }
    //   
    //   // MEDIUM CONFIDENCE (75%) for ecommerce without specific subcategory
    //   console.log('🛒 E-commerce category detected - selecting custom-ecommerce-theme with 75% confidence');
    //   return { themeId: 'custom-ecommerce-theme', confidence: 75 };
    // }
    
    // TODO: CREATIVE & PORTFOLIO CATEGORY - implement custom-creative-theme
    // if ((websiteType === 'portfolio' || websiteType === 'business') && ['creative', 'design', 'art', 'photography', 'agency'].includes(businessCategory)) {
    //   
    //   // HIGH CONFIDENCE (95%) for specific creative subcategories
    //   if (subcategory === 'graphic-design') {
    //     console.log('🎨 Graphic design subcategory detected - selecting custom-creative-theme with 95% confidence');
    //     return { themeId: 'custom-creative-theme', confidence: 95 };
    //   }
    //   
    //   if (subcategory === 'photography') {
    //     console.log('📸 Photography subcategory detected - selecting custom-creative-theme with 95% confidence');
    //     return { themeId: 'custom-creative-theme', confidence: 95 };
    //   }
    //   
    //   if (subcategory === 'web-design') {
    //     console.log('💻 Web design subcategory detected - selecting custom-creative-theme with 95% confidence');
    //     return { themeId: 'custom-creative-theme', confidence: 95 };
    //   }
    //   
    //   // MEDIUM CONFIDENCE (75%) for creative without specific subcategory
    //   console.log('🎨 Creative category detected - selecting custom-creative-theme with 75% confidence');
    //   return { themeId: 'custom-creative-theme', confidence: 75 };
    // }
    
    // TODO: Add more business categories here...
    // - Education & Training
    // - Real Estate
    // - Fitness & Wellness
    // - Automotive
    // - Beauty & Personal Care
    // - Travel & Tourism
    // - Non-profit
    // - Manufacturing
    // - Agriculture
    
    console.log(`🎛️ No custom theme available for: ${websiteType} + ${businessCategory} - falling back to default theme`);
    return { themeId: 'default-hugo', confidence: 50 }; // Default theme fallback
  }

  /**
   * ⭐ EXTRACT SUBCATEGORY from wizard data
   */
  private extractSubcategory(wizardData: any): string | null {
    // Method 1: From businessCategory.selectedSubCategory
    if (wizardData.businessCategory?.selectedSubCategory?.id) {
      console.log('📋 Subcategory from businessCategory.selectedSubCategory:', wizardData.businessCategory.selectedSubCategory.id);
      return wizardData.businessCategory.selectedSubCategory.id;
    }
    
    // Method 2: From businessInfo.selectedSubcategory  
    if (wizardData.businessInfo?.selectedSubcategory?.id) {
      console.log('📋 Subcategory from businessInfo.selectedSubcategory:', wizardData.businessInfo.selectedSubcategory.id);
      return wizardData.businessInfo.selectedSubcategory.id;
    }
    
    // Method 3: From businessInfo.selectedSubCategory (alternative naming)
    if (wizardData.businessInfo?.selectedSubCategory?.id) {
      console.log('📋 Subcategory from businessInfo.selectedSubCategory:', wizardData.businessInfo.selectedSubCategory.id);
      return wizardData.businessInfo.selectedSubCategory.id;
    }
    
    console.log('📋 No subcategory found in wizard data');
    return null;
  }

  private extractWebsiteType(wizardData: any): string {
    return wizardData.websiteType?.id ||
      wizardData.websiteType?.category?.toLowerCase() ||
      'business';
  }

  private extractBusinessCategory(wizardData: any): string | null {
    return wizardData.businessCategory?.id ||
      wizardData.businessCategory?.industry?.toLowerCase() ||
      wizardData.businessCategory?.name?.toLowerCase() ||
      null;
  }

  public detectColorScheme(wizardData: any, themeId: string): ColorScheme {
    const businessCategory = this.extractBusinessCategory(wizardData);

    if (businessCategory && INDUSTRY_COLORS[businessCategory]) {
      return INDUSTRY_COLORS[businessCategory];
    }

    const theme = this.themes.find(t => t.id === themeId);
    if (theme) {
      return {
        primary: theme.colorScheme.primary,
        secondary: theme.colorScheme.secondary,
        accent: theme.colorScheme.accent,
        background: '#ffffff',
        text: '#1f2937'
      };
    }

    return {
      primary: '#2563eb',
      secondary: '#3b82f6',
      accent: '#60a5fa',
      background: '#ffffff',
      text: '#1f2937'
    };
  }

  public getAvailableThemes(): ThemeConfig[] {
    return this.themes;
  }

  public getThemeById(themeId: string): ThemeConfig | undefined {
    return this.themes.find(theme => theme.id === themeId);
  }

  /**
   * ⭐ ENHANCED THEME DETECTION - Uses new theme selection system
   */
  public async detectThemeEnhanced(wizardData: any): Promise<{
    themeId: string;
    themeName: string;
    confidence: number;
    isLocal: boolean;
    features: string[];
    parameterMapping: any;
    selectionReason: string;
  }> {
    try {
      // Import here to avoid circular dependencies
      const { ThemeBridgeService } = await import('./ThemeBridgeService');
      const themeBridge = new ThemeBridgeService();
      
      console.log('🎯 Enhanced theme detection starting...');
      
      // Get enhanced theme configuration
      const enhancedConfig = await themeBridge.getEnhancedThemeConfig(wizardData);
      
      return {
        themeId: enhancedConfig.selectedTheme.id,
        themeName: enhancedConfig.selectedTheme.name,
        confidence: enhancedConfig.compatibilityScore / 100, // Convert to 0-1 scale
        isLocal: enhancedConfig.selectedTheme.isLocal,
        features: enhancedConfig.supportedFeatures,
        parameterMapping: enhancedConfig.parameterMapping,
        selectionReason: enhancedConfig.selectionReason
      };
      
    } catch (error) {
      console.error('❌ Enhanced theme detection failed:', error);
      
      // Throw error instead of using fallback
      throw new Error(`Enhanced theme detection failed: ${error}. Please ensure the theme system is properly configured.`);
    }
  }
  
  /**
   * Calculate confidence score from enhanced theme selection
   */
  private calculateConfidence(selection: any): number {
    // The enhanced system gives us alternative themes with scores
    if (selection.alternativeThemes && selection.alternativeThemes.length > 0) {
      // If we have alternatives, we can gauge confidence by the gap
      const bestScore = selection.alternativeThemes[0]?.score || 0;
      const gap = Math.max(0, 100 - bestScore);
      return Math.min(0.95, (80 + gap) / 100); // 80-95% confidence range
    }
    
    // Default confidence based on selection reason
    if (selection.reason.includes('Best match')) {
      return 0.90;
    } else if (selection.reason.includes('Default')) {
      return 0.50;
    }
    
    return 0.75;
  }
}