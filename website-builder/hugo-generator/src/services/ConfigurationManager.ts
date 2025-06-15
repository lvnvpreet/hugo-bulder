import * as path from 'path';
import * as yaml from 'js-yaml';
import { FileManager } from '../utils/FileManager';

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
      
      // Generate config file (using YAML format)
      const configContent = yaml.dump(config);
      const configPath = path.join(siteDir, 'hugo.yaml');
      
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
      colorScheme: themeConfig.colorScheme || {
        primary: '#3B82F6',
        secondary: '#1E40AF',
        accent: '#F59E0B'
      },
      
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
            enabled: wizardData.websiteType?.category === 'personal',
            title: businessInfo.name || 'Welcome',
            subtitle: businessInfo.description || '',
            imageUrl: '#',
            imageWidth: 120,
            imageHeight: 120,
            imageTitle: businessInfo.name || 'Profile'
          },
          
          // Home info params
          homeInfoParams: {
            Title: businessInfo.name || 'Welcome',
            Content: businessInfo.description || 'Welcome to our website'
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
        
      case 'academic':
        config.params = {
          ...config.params,
          main_menu: {
            enable: true,
            align: 'l',
            show_logo: true,
            show_language: false,
            show_day_night: true,
            show_search: true,
            highlight_active_link: true
          }
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
}
