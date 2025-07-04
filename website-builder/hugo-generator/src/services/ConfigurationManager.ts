import * as path from 'path';
import * as yaml from 'js-yaml';
import { FileManager } from '../utils/FileManager';
import { getThemeConfiguration, ThemeConfigMapping } from '../config/themeConfigs';
// Import shared theme constants
import fs from 'fs';
const sharedThemesPath = path.resolve(process.cwd(), '../../shared/constants/themes.js');
// We'll use a require approach to handle paths better
const ThemeConstants = fs.existsSync(sharedThemesPath) ? require(sharedThemesPath) : { 
  VERIFIED_THEMES: [],
  INDUSTRY_COLORS: {},
  getThemeById: (id: string) => null,
  getColorSchemeForIndustry: (industry: string) => ({
    primary: '#3B82F6',
    secondary: '#1E40AF',
    accent: '#F59E0B',
    background: '#FFFFFF',
    text: '#1F2937'
  })
};

export class ConfigurationManager {
  private fileManager: FileManager;
  
  constructor() {
    this.fileManager = new FileManager();
  }
  
  // Main configuration generation
  async generateHugoConfig(
    siteDir: string,
    wizardData: any,
    themeConfig: any,
    seoData: any,
    structure: any
  ): Promise<{
    success: boolean;
    configPath: string;
    error?: string;
  }> {
    try {
      console.log('Generating Hugo configuration...');
      
      // Build configuration object
      const config = await this.buildConfiguration(wizardData, themeConfig, seoData, structure);
      
      // Generate config file (using TOML format)
      const configContent = this.generateTomlConfig(config);
      const configPath = path.join(siteDir, 'hugo.toml');
      
      await this.fileManager.writeFile(configPath, configContent);
      
      // Generate additional theme-specific files if needed
      await this.generateThemeSpecificConfigs(siteDir, themeConfig, wizardData);
      
      console.log('Hugo configuration generated successfully');
      
      return {
        success: true,
        configPath
      };
      
    } catch (error: any) {
      return {
        success: false,
        configPath: '',
        error: error.message
      };
    }
  }
  
  private async buildConfiguration(
    wizardData: any,
    themeConfig: any,
    seoData: any,
    structure: any
  ): Promise<any> {
    const businessInfo = wizardData.businessInfo || {};
    const locationInfo = wizardData.locationInfo || {};
    const websiteType = wizardData.websiteType?.category || 'business';
    
    console.log('🎨 Building configuration with enhanced theme config:', {
      themeId: themeConfig.id,
      hasParameterMapping: !!(themeConfig.parameterMapping && Object.keys(themeConfig.parameterMapping).length > 0),
      hasFeatures: !!(themeConfig.features && themeConfig.features.length > 0)
    });
    
    // Base configuration
    const config: any = {
      baseURL: 'https://example.com', // Will be updated during deployment
      languageCode: 'en-us',
      title: businessInfo.name || 'My Website',
      theme: themeConfig.name || 'ananke',
      
      // Content settings
      defaultContentLanguage: 'en',
      enableRobotsTXT: true,
      enableGitInfo: false,
      enableEmoji: true,
      
      // Build settings
      buildDrafts: false,
      buildFuture: false,
      buildExpired: false,
      
      // Markup settings
      markup: {
        goldmark: {
          renderer: {
            unsafe: true // Allow HTML in markdown
          }
        },
        highlight: {
          style: 'github',
          codeFences: true,
          guessSyntax: true,
          lineNos: true,
          lineNumbersInTable: true,
          tabWidth: 4
        }
      },
      
      // Permalink structure
      permalinks: this.generatePermalinks(structure),
      
      // Taxonomies
      taxonomies: {
        category: 'categories',
        tag: 'tags'
      },
      
      // Site parameters
      params: this.generateSiteParams(wizardData, themeConfig, seoData),
      
      // Menu configuration
      menu: this.generateMenus(structure, wizardData),
      
      // Social media and SEO
      social: this.generateSocialConfig(wizardData),
      
      // Image processing
      imaging: {
        resampleFilter: 'lanczos',
        quality: 85,
        anchor: 'smart'
      },
      
      // Minification
      minify: {
        disableCSS: false,
        disableHTML: false,
        disableJS: false,
        disableJSON: false,
        disableSVG: false,
        disableXML: false
      }
    };
    
    // Add theme-specific configuration
    this.addThemeSpecificConfig(config, themeConfig.id, wizardData);
    
    return config;
  }
    private generateSiteParams(wizardData: any, themeConfig: any, seoData: any): any {
    const businessInfo = wizardData.businessInfo || {};
    const businessDescription = wizardData.businessDescription || {};
    const locationInfo = wizardData.locationInfo || {};
    const businessCategory = wizardData.businessCategory?.industry?.toLowerCase() || 'business';
    
    // Get theme configuration for parameter mapping
    const themeConfigMapping = getThemeConfiguration(themeConfig.id || themeConfig.name || 'ananke');
    
    // Get color scheme from shared constants if possible
    let colorScheme = themeConfig.colorScheme || {
      primary: '#3B82F6',
      secondary: '#1E40AF',
      accent: '#F59E0B',
      background: '#FFFFFF',
      text: '#1F2937'
    };
    
    // Try to use industry-specific color scheme
    if (ThemeConstants.getColorSchemeForIndustry) {
      const industryColors = ThemeConstants.getColorSchemeForIndustry(businessCategory);
      if (industryColors) {
        colorScheme = industryColors;
      }
    } else if (ThemeConstants.INDUSTRY_COLORS && ThemeConstants.INDUSTRY_COLORS[businessCategory]) {
      colorScheme = ThemeConstants.INDUSTRY_COLORS[businessCategory];
    }
    
    // Get theme details
    const themeId = themeConfig.id || themeConfig.hugoTheme || 'ananke';
    let themeDetails: any = null;
    
    if (ThemeConstants.getThemeById) {
      themeDetails = ThemeConstants.getThemeById(themeId);
    } else if (ThemeConstants.VERIFIED_THEMES) {
      themeDetails = ThemeConstants.VERIFIED_THEMES.find((t: any) => t.id === themeId);
    }
    
    // Use theme's color scheme if no industry-specific one was found
    if (themeDetails && themeDetails.colorScheme && !ThemeConstants.INDUSTRY_COLORS[businessCategory]) {
      colorScheme = {
        ...themeDetails.colorScheme,
        background: '#FFFFFF',
        text: '#1F2937'
      };
    }

    // Base parameters
    const params: any = {
      // Basic site info
      author: businessInfo.name || 'Website Owner',
      description: businessDescription.shortDescription || businessInfo.description || 'A professional website',
      keywords: seoData?.homepage?.keywords || [],
      
      // Contact information
      email: locationInfo.email || '',
      phone: locationInfo.phone || '',
      address: this.formatAddress(locationInfo),
      
      // Business details
      businessName: businessInfo.name || '',
      businessDescription: businessDescription.shortDescription || '',
      establishedYear: businessInfo.established || '',
      
      // Theme customization
      colorScheme: colorScheme,
      
      // Features
      showReadingTime: true,
      showShareButtons: true,
      showAuthor: true,
      showDate: true,
      
      // Footer
      copyright: `© ${new Date().getFullYear()} ${businessInfo.name || 'Website Owner'}. All rights reserved.`,
      
      // Analytics (placeholder)
      googleAnalytics: '',
      
      // Search
      enableSearch: true
    };

    // Apply theme-specific parameter mapping
    // Priority: 1. Enhanced parameter mapping from backend, 2. Local theme config mapping
    if (themeConfig.parameterMapping && Object.keys(themeConfig.parameterMapping).length > 0) {
      console.log('🎯 Using enhanced parameter mapping from backend');
      Object.assign(params, themeConfig.parameterMapping);
    } else if (themeConfigMapping) {
      console.log('🔄 Using local theme configuration mapping');
      const themeMappedParams = this.applyThemeParameterMapping(wizardData, themeConfigMapping);
      Object.assign(params, themeMappedParams);
    }
    
    console.log('📊 Final theme parameters applied:', Object.keys(params));
    
    return params;
  }
  
  private generateMenus(structure: any, wizardData: any): any {
    const menus: any = {
      main: []
    };
    
    if (structure.type === 'single-page') {
      // Single-page navigation (anchor links)
      const sections = structure.sections || [];
      sections.forEach((section: any, index: number) => {
        if (section.id !== 'hero') { // Skip hero section in navigation
          menus.main.push({
            name: section.title || section.id.charAt(0).toUpperCase() + section.id.slice(1),
            url: section.anchor || `#${section.id}`,
            weight: (index + 1) * 10
          });
        }
      });
    } else {
      // Multi-page navigation
      const pages = structure.pages || [];
      pages.forEach((page: any, index: number) => {
        if (page.required || page.id === 'home') {
          menus.main.push({
            name: page.title || page.name,
            url: page.url || `/${page.id}/`,
            weight: (index + 1) * 10
          });
        }
      });
    }
    
    return menus;
  }
  
  private generatePermalinks(structure: any): any {
    const permalinks: any = {};
    
    if (structure.type === 'multi-page') {
      permalinks.posts = '/blog/:year/:month/:title/';
      permalinks.services = '/services/:title/';
    }
    
    return permalinks;
  }
  
  private generateSocialConfig(wizardData: any): any {
    const businessInfo = wizardData.businessInfo || {};
    const socialLinks = businessInfo.socialLinks || {};
    
    return {
      facebook: socialLinks.facebook || '',
      twitter: socialLinks.twitter || '',
      linkedin: socialLinks.linkedin || '',
      instagram: socialLinks.instagram || '',
      youtube: socialLinks.youtube || '',
      github: socialLinks.github || ''
    };
  }
    private addThemeSpecificConfig(config: any, themeId: string, wizardData: any): void {
    const businessInfo = wizardData.businessInfo || {};
    const businessDescription = wizardData.businessDescription || {};
    const websiteType = wizardData.websiteType?.category || 'business';
    
    switch (themeId) {
      case 'papermod':
        config.params = {
          ...config.params,
          env: 'production',
          DateFormat: 'January 2, 2006',
          defaultTheme: 'auto',
          disableThemeToggle: false,
          ShowReadingTime: true,
          ShowShareButtons: true,
          ShowPostNavLinks: true,
          ShowBreadCrumbs: true,
          ShowCodeCopyButtons: true,
          ShowWordCount: true,
          ShowRssButtonInSectionTermList: true,
          UseHugoToc: true,
          disableSpecial1stPost: false,
          disableScrollToTop: false,
          comments: false,
          hidemeta: false,
          hideSummary: false,
          showtoc: true,
          tocopen: false,
          
          // Profile mode for personal sites
          profileMode: {
            enabled: websiteType === 'personal',
            title: businessInfo.name || 'Welcome',
            subtitle: businessDescription.shortDescription || businessInfo.description || '',
            imageUrl: '#',
            imageWidth: 120,
            imageHeight: 120,
            imageTitle: businessInfo.name || 'Profile'
          },
          
          // Home info params
          homeInfoParams: {
            Title: businessInfo.name || 'Welcome',
            Content: businessDescription.shortDescription || businessInfo.description || 'Welcome to our website'
          }
        };
        break;
        
      case 'ananke':
        config.params = {
          ...config.params,
          featured_image: '/images/hero.jpg',
          recent_posts_number: 3,
          body_classes: 'avenir bg-near-white',
          post_content_classes: 'w-90 lh-copy',
          text_color: 'dark-gray',
          background_color_class: 'bg-black'
        };
        break;
        
      case 'mainroad':
        config.params = {
          ...config.params,
          sidebar: true,
          widgets: {
            recent_num: 5,
            categories_counter: true,
            tags_counter: true
          },
          thumbnail: true
        };
        break;
        
      case 'clarity':
        config.params = {
          ...config.params,
          author: businessInfo.name || 'Website Owner',
          github: businessInfo.socialLinks?.github || '',
          twitter: businessInfo.socialLinks?.twitter || '',
          linkedin: businessInfo.socialLinks?.linkedin || '',
          enableSearch: true,
          enableBreadcrumb: true,
          enableCodeCopy: true,
          enableToc: true
        };
        break;
        
      case 'terminal':
        config.params = {
          ...config.params,
          contentTypeName: 'posts',
          themeColor: config.params.colorScheme.primary,
          showMenuItems: 5,
          showLanguageSelector: false,
          fullWidthTheme: false,
          centerTheme: true,
          autoCover: true,
          showLastUpdated: true
        };
        break;
        
      case 'bigspring':
        config.params = {
          ...config.params,
          logo: '/images/logo.svg',
          email: businessInfo.email || '',
          phone: businessInfo.phone || '',
          address: this.formatAddress(wizardData.locationInfo),
          map: '', 
          description: businessDescription.shortDescription || businessInfo.description || '',
          author: businessInfo.name || 'Website Owner',
          contact: {
            enable: true,
            formAction: '#'
          }
        };
        break;
        
      case 'restaurant':
        config.params = {
          ...config.params,
          logo: '/images/logo.png',
          home: 'Home',
          restaurants_title: businessInfo.name || 'Our Restaurant',
          gallery_title: 'Our Menu',
          blog_title: 'Food Stories', 
          contact_title: 'Visit Us',
          footer_description: businessDescription.shortDescription || businessInfo.description || '',
        };
        break;
        
      case 'hargo':
        config.params = {
          ...config.params,
          logo: '/images/logo.svg',
          home: 'Home',
          description: businessDescription.shortDescription || businessInfo.description || '',
          author: businessInfo.name || 'Website Owner',
          contact_info: {
            address: this.formatAddress(wizardData.locationInfo),
            email: businessInfo.email || '',
            phone: businessInfo.phone || ''
          },
          snipcartApiKey: ''
        };
        break;
    }
  }
  
  private async generateThemeSpecificConfigs(
    siteDir: string,
    themeConfig: any,
    wizardData: any
  ): Promise<void> {
    // Generate additional configuration files for specific themes
    switch (themeConfig.id) {
      case 'academic':
        await this.generateAcademicConfig(siteDir, wizardData);
        break;
      case 'papermod':
        await this.generatePaperModConfig(siteDir, wizardData);
        break;
    }
  }
  
  private async generateAcademicConfig(siteDir: string, wizardData: any): Promise<void> {
    // Academic theme requires additional configuration files
    const configDir = path.join(siteDir, 'config', '_default');
    await this.fileManager.ensureDir(configDir);
    
    // Generate params.yaml for Academic theme
    const paramsConfig = {
      appearance: {
        theme_day: 'minimal',
        theme_night: 'minimal',
        font: 'minimal',
        font_size: 'L'
      },
      marketing: {
        seo: {
          site_type: 'Person',
          local_business_type: '',
          org_name: wizardData.businessInfo?.name || '',
          description: wizardData.businessInfo?.description || '',
          twitter: wizardData.businessInfo?.socialLinks?.twitter || ''
        }
      }
    };
    
    const paramsPath = path.join(configDir, 'params.yaml');
    await this.fileManager.writeFile(paramsPath, yaml.dump(paramsConfig));
  }
  
  private async generatePaperModConfig(siteDir: string, wizardData: any): Promise<void> {
    // PaperMod-specific configuration
    const assetsDir = path.join(siteDir, 'assets');
    await this.fileManager.ensureDir(assetsDir);
    
    // Create custom CSS for color scheme
    if (wizardData.themeConfig?.colorScheme) {
      const customCSS = this.generateCustomCSS(wizardData.themeConfig.colorScheme);
      const cssPath = path.join(assetsDir, 'css', 'extended', 'custom.css');
      await this.fileManager.ensureDir(path.dirname(cssPath));
      await this.fileManager.writeFile(cssPath, customCSS);
    }
  }
  
  private generateCustomCSS(colorScheme: any): string {
    return `
/* Custom Color Scheme */
:root {
  --primary-color: ${colorScheme.primary || '#3B82F6'};
  --secondary-color: ${colorScheme.secondary || '#1E40AF'};
  --accent-color: ${colorScheme.accent || '#F59E0B'};
  --background-color: ${colorScheme.background || '#FFFFFF'};
  --text-color: ${colorScheme.text || '#1F2937'};
}

/* Apply custom colors */
.primary-color { color: var(--primary-color) !important; }
.bg-primary { background-color: var(--primary-color) !important; }
.border-primary { border-color: var(--primary-color) !important; }

a { color: var(--primary-color) !important; }
a:hover { color: var(--secondary-color) !important; }

.post-entry:hover { 
  border-color: var(--primary-color) !important; 
}

button, .btn {
  background-color: var(--primary-color) !important;
  border-color: var(--primary-color) !important;
}

button:hover, .btn:hover {
  background-color: var(--secondary-color) !important;
  border-color: var(--secondary-color) !important;
}
`;
  }
  
  /**
   * Apply theme-specific parameter mapping from wizard data
   */
  private applyThemeParameterMapping(wizardData: any, themeConfigMapping: ThemeConfigMapping): any {
    const mappedParams: any = {};
    
    // Apply parameter mappings
    for (const [wizardPath, themeParam] of Object.entries(themeConfigMapping.parameterMapping)) {
      try {
        const value = this.getValueFromPath(wizardData, wizardPath);
        
        if (value !== undefined && value !== null && value !== '') {
          if (typeof themeParam === 'string') {
            // Direct mapping
            mappedParams[themeParam] = value;
          } else if (typeof themeParam === 'function') {
            // Transform function
            const transformedValue = themeParam(wizardData);
            if (transformedValue && typeof transformedValue === 'object') {
              // Merge object results
              Object.assign(mappedParams, transformedValue);
            } else {
              console.warn(`Transform function for ${wizardPath} returned non-object value:`, transformedValue);
            }
          }
        }
      } catch (error) {
        console.warn(`Error mapping wizard path '${wizardPath}':`, error);
      }
    }
    
    return mappedParams;
  }
  
  /**
   * Get nested value from object using dot notation path
   */
  private getValueFromPath(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }
  
  private formatAddress(locationInfo: any): string {
    if (!locationInfo) return '';
    
    const parts = [
      locationInfo.address,
      locationInfo.city,
      locationInfo.state,
      locationInfo.zipCode
    ].filter(Boolean);
    
    return parts.join(', ');
  }

  /**
   * Generate TOML format configuration
   */
  private generateTomlConfig(config: any): string {
    let tomlContent = '';
    
    // Basic configuration
    tomlContent += `baseURL = "${config.baseURL || 'https://example.com'}"\n`;
    tomlContent += `languageCode = "${config.languageCode || 'en-us'}"\n`;
    tomlContent += `title = "${config.title || 'My Website'}"\n`;
    tomlContent += `theme = "${config.theme || 'ananke'}"\n`;
    tomlContent += `defaultContentLanguage = "${config.defaultContentLanguage || 'en'}"\n`;
    tomlContent += `enableRobotsTXT = ${config.enableRobotsTXT || true}\n`;
    tomlContent += `canonifyURLs = ${config.canonifyURLs || true}\n\n`;
    
    // Parameters section
    if (config.params) {
      tomlContent += '[params]\n';
      Object.entries(config.params).forEach(([key, value]) => {
        if (typeof value === 'string') {
          tomlContent += `  ${key} = "${value}"\n`;
        } else if (typeof value === 'boolean') {
          tomlContent += `  ${key} = ${value}\n`;
        } else if (Array.isArray(value)) {
          tomlContent += `  ${key} = [${value.map(v => `"${v}"`).join(', ')}]\n`;
        } else if (typeof value === 'object' && value !== null) {
          // Handle nested objects
          Object.entries(value).forEach(([subKey, subValue]) => {
            if (typeof subValue === 'string') {
              tomlContent += `  ${key}_${subKey} = "${subValue}"\n`;
            } else if (typeof subValue === 'boolean') {
              tomlContent += `  ${key}_${subKey} = ${subValue}\n`;
            }
          });
        }
      });
      tomlContent += '\n';
    }
    
    // Menu configuration
    if (config.menu && config.menu.main) {
      config.menu.main.forEach((item: any, index: number) => {
        tomlContent += `[[menu.main]]\n`;
        tomlContent += `  name = "${item.name}"\n`;
        tomlContent += `  url = "${item.url}"\n`;
        tomlContent += `  weight = ${item.weight || index + 1}\n\n`;
      });
    }
    
    // Markup configuration
    if (config.markup) {
      tomlContent += '[markup]\n';
      if (config.markup.goldmark) {
        tomlContent += '  [markup.goldmark]\n';
        if (config.markup.goldmark.renderer) {
          tomlContent += '    [markup.goldmark.renderer]\n';
          tomlContent += `      unsafe = ${config.markup.goldmark.renderer.unsafe || true}\n`;
        }
      }
      tomlContent += '\n';
    }
    
    // Minify configuration
    if (config.minify) {
      tomlContent += '[minify]\n';
      Object.entries(config.minify).forEach(([key, value]) => {
        tomlContent += `  ${key} = ${value}\n`;
      });
      tomlContent += '\n';
    }
    
    return tomlContent;
  }
}
