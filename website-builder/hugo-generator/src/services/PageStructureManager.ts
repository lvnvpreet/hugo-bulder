/**
 * Page Structure Manager
 * 
 * This service handles the selection and management of page structures
 * based on business category, theme, and user preferences.
 */

import { 
  PageStructureConfig, 
  PageDefinition, 
  getPageStructureConfig, 
  resolvePagePaths 
} from '../config/pageStructures';

export interface PageCreationPlan {
  config: PageStructureConfig;
  staticPages: { key: string; filePath: string; title: string; definition: PageDefinition }[];
  servicePages: { name: string; slug: string; filePath: string }[];
  blogPages: { title: string; slug: string; filePath: string; year: number }[];
  totalPages: number;
  estimatedContentSize: number;
}

export interface WizardData {
  businessCategory?: { id: string; name: string };
  websiteStructure?: { 
    type: 'single-page' | 'multi-page';
    selectedPages?: string[];
    selectedSections?: string[];
    navigationStyle?: string;
    footerStyle?: string;
    resolvedPages?: {
      static: Array<{ key: string; path: string }>;
      services: Array<{ name: string; path: string }>;
      blog: Array<{ title: string; path: string }>;
    };
  };
  themeConfig?: { hugoTheme: string };
  servicesSelection?: {
    selectedServices: Array<{ name: string; description: string }>;
    customServices?: Array<{ name: string; description: string }>;
  };
  businessInfo?: {
    name: string;
    description: string;
    teamSize?: string;
  };
  [key: string]: any;
}

export class PageStructureManager {
  
  /**
   * Determine the appropriate page structure configuration
   */
  public determinePageStructure(wizardData: WizardData): PageStructureConfig | null {
    console.log('🔍 Determining page structure from wizard data...');
    
    const businessCategory = wizardData.businessCategory?.id;
    const structureType = wizardData.websiteStructure?.type;
    const theme = wizardData.themeConfig?.hugoTheme;
    
    console.log('📊 Structure determination inputs:', {
      businessCategory,
      structureType, 
      theme
    });
    
    if (!businessCategory || !structureType) {
      console.warn('⚠️ Missing required data for page structure determination');
      return null;
    }
    
    // For now, we'll map themes to our structure configurations
    // In the future, this can be expanded to support multiple themes per category
    const mappedTheme = this.mapThemeToStructureTheme(theme, businessCategory);
    
    const config = getPageStructureConfig(businessCategory, mappedTheme, structureType);
    
    if (config) {
      console.log(`✅ Found page structure: ${config.name} (${config.id})`);
      console.log(`📄 Will create ${config.pages.length} static pages`);
      console.log(`🔧 Services config: ${config.services.individualPages ? 'individual pages' : 'index only'}`);
      console.log(`📝 Blog enabled: ${config.blog.enabled}`);
    } else {
      console.warn(`⚠️ No page structure found for: ${businessCategory} + ${mappedTheme} + ${structureType}`);
    }
    
    return config;
  }
  
  /**
   * Create a complete page creation plan
   */
  public createPageCreationPlan(
    config: PageStructureConfig, 
    wizardData: WizardData
  ): PageCreationPlan {
    console.log(`📋 Creating page creation plan for: ${config.name}`);
    
    // Resolve all page paths with actual wizard data
    const { staticPages, servicePages, blogPages } = resolvePagePaths(config, wizardData);
    
    // Enhance static pages with their definitions
    const enhancedStaticPages = staticPages.map(page => {
      const definition = config.pages.find(p => p.key === page.key)!;
      return { ...page, definition };
    });
    
    // Filter pages based on dependencies
    const filteredStaticPages = this.filterPagesByDependencies(enhancedStaticPages, wizardData);
    
    const totalPages = filteredStaticPages.length + servicePages.length + blogPages.length;
    const estimatedContentSize = this.estimateContentSize(config, servicePages.length, blogPages.length);
    
    const plan: PageCreationPlan = {
      config,
      staticPages: filteredStaticPages,
      servicePages,
      blogPages,
      totalPages,
      estimatedContentSize
    };
    
    console.log('📊 Page Creation Plan Summary:');
    console.log(`   Static Pages: ${plan.staticPages.length}`);
    console.log(`   Service Pages: ${plan.servicePages.length}`);
    console.log(`   Blog Pages: ${plan.blogPages.length}`);
    console.log(`   Total Pages: ${plan.totalPages}`);
    console.log(`   Estimated Size: ${plan.estimatedContentSize} KB`);
    
    // Log detailed page list
    console.log('📄 Static Pages to Create:');
    plan.staticPages.forEach(page => {
      console.log(`   - ${page.title}: ${page.filePath}`);
    });
    
    if (plan.servicePages.length > 0) {
      console.log('🔧 Service Pages to Create:');
      plan.servicePages.forEach(page => {
        console.log(`   - ${page.name}: ${page.filePath}`);
      });
    }
    
    if (plan.blogPages.length > 0) {
      console.log('📝 Blog Pages to Create:');
      plan.blogPages.forEach(page => {
        console.log(`   - ${page.title}: ${page.filePath}`);
      });
    }
    
    return plan;
  }
  
  /**
   * Update wizard data with the resolved page structure
   */
  public updateWizardDataWithPageStructure(
    wizardData: WizardData, 
    plan: PageCreationPlan
  ): WizardData {
    const updatedData = { ...wizardData };
    
    // Update websiteStructure with resolved page information
    if (!updatedData.websiteStructure) {
      updatedData.websiteStructure = { type: 'multi-page' };
    }
    
    updatedData.websiteStructure = {
      ...updatedData.websiteStructure,
      selectedPages: [
        ...plan.staticPages.map(p => p.key),
        ...plan.servicePages.map(p => p.slug),
        ...(plan.blogPages.length > 0 ? ['blog'] : [])
      ],
      selectedSections: plan.config.structureType === 'single-page' 
        ? plan.staticPages[0]?.definition.sections || []
        : [],
      navigationStyle: 'horizontal-header',
      footerStyle: 'comprehensive',
      // Add resolved file paths for tracking
      resolvedPages: {
        static: plan.staticPages.map(p => ({ key: p.key, path: p.filePath })),
        services: plan.servicePages.map(p => ({ name: p.name, path: p.filePath })),
        blog: plan.blogPages.map(p => ({ title: p.title, path: p.filePath }))
      }
    };
    
    console.log('✅ Updated wizard data with resolved page structure');
    if (updatedData.websiteStructure?.selectedPages) {
      console.log('📋 Selected pages:', updatedData.websiteStructure.selectedPages);
    }
    
    return updatedData;
  }
  
  /**
   * Map Hugo theme names to our structure theme names
   */
  private mapThemeToStructureTheme(hugoTheme: string | undefined, businessCategory: string): string {
    // Theme mapping logic - expand this as more themes are added
    const themeMappings: { [key: string]: { [category: string]: string } } = {
      'bigspring': {
        'healthcare': 'health-wellness-theme',
        'technology': 'tech-theme',
        'default': 'health-wellness-theme'
      },
      'clarity': {
        'technology': 'tech-theme',
        'default': 'tech-theme'
      },
      // Add more theme mappings
    };
    
    const themeMap = themeMappings[hugoTheme || 'bigspring'] || themeMappings['bigspring'];
    return themeMap[businessCategory] || themeMap['default'] || 'health-wellness-theme';
  }
  
  /**
   * Filter pages based on their dependencies
   */
  private filterPagesByDependencies(
    pages: Array<{ key: string; filePath: string; title: string; definition: PageDefinition }>,
    wizardData: WizardData
  ): Array<{ key: string; filePath: string; title: string; definition: PageDefinition }> {
    return pages.filter(page => {
      const { definition } = page;
      
      // Always include required pages
      if (definition.isRequired) {
        return true;
      }
      
      // Check dependencies
      if (definition.dependsOn) {
        return definition.dependsOn.every(dependency => {
          const value = this.getNestedValue(wizardData, dependency);
          return this.isDependencyMet(value);
        });
      }
      
      // Include if no dependencies
      return true;
    });
  }
  
  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
  
  /**
   * Check if a dependency value is considered "met"
   */
  private isDependencyMet(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return Boolean(value);
  }
  
  /**
   * Estimate total content size in KB
   */
  private estimateContentSize(
    config: PageStructureConfig, 
    servicePageCount: number, 
    blogPageCount: number
  ): number {
    const avgStaticPageSize = 2; // KB
    const avgServicePageSize = 1.5; // KB  
    const avgBlogPageSize = 3; // KB
    
    const staticSize = config.pages.length * avgStaticPageSize;
    const serviceSize = servicePageCount * avgServicePageSize;
    const blogSize = blogPageCount * avgBlogPageSize;
    
    return Math.round(staticSize + serviceSize + blogSize);
  }
}

/**
 * Helper function to create a slug from text
 */
export function createSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}
