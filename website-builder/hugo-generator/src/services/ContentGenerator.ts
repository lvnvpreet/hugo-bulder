import * as path from 'path';
import * as yaml from 'js-yaml';
import { HugoCLI } from './HugoCLI';
import { FileManager } from '../utils/FileManager';
import { PageStructureManager, PageCreationPlan } from './PageStructureManager';
import { generateDynamicFrontMatter, generateHealthcareFrontMatter } from '../config/businessCategoryFields';
import { getThemeConfiguration, getPageLayoutConfig, ThemeConfigMapping } from '../config/themeConfigs';

// Content tracking interface for debugging content placement
interface ContentTrackingInfo {
  filePath: string;
  contentType: string;
  size: number;
  createdAt: string;
  frontMatter: any;
  success: boolean;
  error?: string;
}

export class ContentGenerator {
  private hugoCLI: HugoCLI;
  private fileManager: FileManager;
  private pageStructureManager: PageStructureManager;
  // Add content tracking
  private contentTracker: ContentTrackingInfo[] = [];
  
  constructor(hugoCLI: HugoCLI) {
    this.hugoCLI = hugoCLI;
    this.fileManager = new FileManager();
    this.pageStructureManager = new PageStructureManager();
  }

  // Get content tracking information for debugging
  getContentTrackingInfo(): ContentTrackingInfo[] {
    return [...this.contentTracker];
  }

  // Reset content tracking for new generation
  resetContentTracking(): void {
    this.contentTracker = [];
  }

  // Track content creation with detailed logging
  private async trackContent(
    filePath: string, 
    contentType: string, 
    frontMatter: any, 
    success: boolean, 
    error?: string
  ): Promise<void> {
    try {
      const stats = await this.fileManager.exists(filePath) 
        ? await this.fileManager.getStats(filePath)
        : null;
      
      const trackingInfo: ContentTrackingInfo = {
        filePath,
        contentType,
        size: stats?.size || 0,
        createdAt: new Date().toISOString(),
        frontMatter,
        success,
        error
      };
      
      this.contentTracker.push(trackingInfo);
      
      const status = success ? '✅ SUCCESS' : '❌ FAILED';
      console.log(`📝 Content tracked: ${contentType} -> ${filePath} (${status})`);
      if (error) {
        console.error(`   Error: ${error}`);
      }
      if (stats) {
        console.log(`   Size: ${stats.size} bytes`);
      }
    } catch (trackError: any) {
      console.warn(`Warning: Could not track content: ${trackError.message}`);
    }
  }
    // Main content generation method with enhanced tracking
  async generateAllContent(
    siteDir: string,
    generatedContent: any,
    wizardData: any,
    seoData: any,
    structure: any
  ): Promise<{
    success: boolean;
    createdFiles: string[];
    errors: string[];
    contentTracking: ContentTrackingInfo[];
  }> {
    try {
      // Reset tracking for new generation
      this.resetContentTracking();
      
      const createdFiles: string[] = [];
      const errors: string[] = [];
      
      console.log('🚀 Starting content generation with enhanced tracking...');
      console.log(`📁 Target Hugo site directory: ${siteDir}`);
      console.log(`📁 Target content directory: ${path.join(siteDir, 'content')}`);
      
      // Verify content directory exists and is writable
      const contentDir = path.join(siteDir, 'content');
      await this.fileManager.ensureDir(contentDir);
      console.log(`✅ Content directory ready: ${contentDir}`);
      
      // Generate homepage content
      if (generatedContent.homepage) {
        console.log('📄 Generating homepage content...');
        try {
          const homepageFile = await this.generateHomepage(
            siteDir, 
            generatedContent.homepage, 
            seoData?.homepage,
            wizardData
          );
          createdFiles.push(homepageFile);
          await this.trackContent(homepageFile, 'Homepage', {}, true);
          console.log(`✅ Homepage created: ${homepageFile}`);
        } catch (error: any) {
          console.error(`❌ Homepage generation failed: ${error.message}`);
          errors.push(`Homepage: ${error.message}`);
          await this.trackContent('', 'Homepage', {}, false, error.message);
        }
      }
      
      // Generate about page
      if (generatedContent.about) {
        console.log('📄 Generating about page content...');
        try {
          const aboutFile = await this.generateAboutPage(
            siteDir,
            generatedContent.about,
            seoData?.about,
            wizardData
          );
          createdFiles.push(aboutFile);
          await this.trackContent(aboutFile, 'About Page', {}, true);
          console.log(`✅ About page created: ${aboutFile}`);
        } catch (error: any) {
          console.error(`❌ About page generation failed: ${error.message}`);
          errors.push(`About: ${error.message}`);
          await this.trackContent('', 'About Page', {}, false, error.message);
        }
      }
      
      // Generate services content
      if (generatedContent.services && wizardData.selectedServices) {
        console.log('📄 Generating services content...');
        try {
          const serviceFiles = await this.generateServicesContent(
            siteDir,
            generatedContent.services,
            seoData?.services,
            wizardData.selectedServices,
            structure,
            wizardData
          );
          createdFiles.push(...serviceFiles);
          
          for (const serviceFile of serviceFiles) {
            await this.trackContent(serviceFile, 'Service Page', {}, true);
          }
          console.log(`✅ Services created: ${serviceFiles.length} files`);
        } catch (error: any) {
          console.error(`❌ Services generation failed: ${error.message}`);
          errors.push(`Services: ${error.message}`);
          await this.trackContent('', 'Services', {}, false, error.message);
        }
      }
      
      // Generate contact page
      if (generatedContent.contact) {
        console.log('📄 Generating contact page content...');
        try {
          const contactFile = await this.generateContactPage(
            siteDir,
            generatedContent.contact,
            seoData?.contact,
            wizardData
          );
          createdFiles.push(contactFile);
          await this.trackContent(contactFile, 'Contact Page', {}, true);
          console.log(`✅ Contact page created: ${contactFile}`);
        } catch (error: any) {
          console.error(`❌ Contact page generation failed: ${error.message}`);
          errors.push(`Contact: ${error.message}`);
          await this.trackContent('', 'Contact Page', {}, false, error.message);
        }
      }
      
      // Generate blog posts if applicable
      if (generatedContent.blog_posts && this.hasBlogStructure(structure)) {
        console.log('📄 Generating blog posts...');
        try {
          const blogFiles = await this.generateBlogPosts(
            siteDir,
            generatedContent.blog_posts,
            wizardData
          );
          createdFiles.push(...blogFiles);
          
          for (const blogFile of blogFiles) {
            await this.trackContent(blogFile, 'Blog Post', {}, true);
          }
          console.log(`✅ Blog posts created: ${blogFiles.length} files`);
        } catch (error: any) {
          console.error(`❌ Blog posts generation failed: ${error.message}`);
          errors.push(`Blog: ${error.message}`);
          await this.trackContent('', 'Blog Posts', {}, false, error.message);
        }
      }
      
      // Verify all created files exist and are readable
      console.log('🔍 Verifying created files...');
      for (const filePath of createdFiles) {
        const exists = await this.fileManager.exists(filePath);
        if (!exists) {
          console.error(`❌ File verification failed: ${filePath}`);
          errors.push(`File not found after creation: ${filePath}`);
        } else {
          const stats = await this.fileManager.getStats(filePath);
          console.log(`✅ Verified: ${filePath} (${stats.size} bytes)`);
        }
      }
      
      console.log(`🎉 Content generation completed. Created ${createdFiles.length} files with ${errors.length} errors.`);
      
      // Log detailed tracking summary
      console.log('📊 Content Tracking Summary:');
      console.log('================================');
      this.contentTracker.forEach(track => {
        const status = track.success ? '✅' : '❌';
        console.log(`${status} ${track.contentType}: ${track.filePath || 'N/A'}`);
        if (track.size > 0) {
          console.log(`   Size: ${track.size} bytes`);
        }
        if (track.error) {
          console.log(`   Error: ${track.error}`);
        }
      });
      console.log('================================');
      
      return {
        success: errors.length === 0,
        createdFiles,
        errors,
        contentTracking: this.getContentTrackingInfo()
      };
      
    } catch (error: any) {
      console.error(`💥 Content generation failed: ${error.message}`);
      return {
        success: false,
        createdFiles: [],
        errors: [error.message],
        contentTracking: this.getContentTrackingInfo()
      };
    }
  }
  
  // Homepage content generation
  private async generateHomepage(
    siteDir: string,
    homepageContent: any,
    seoData: any,
    wizardData: any
  ): Promise<string> {
    try {
      // Get theme configuration for layout and front matter
      const themeConfig = wizardData.themeConfig || {};
      const themeConfigMapping = getThemeConfiguration(themeConfig.id || themeConfig.name);
      const pageLayoutConfig = getPageLayoutConfig(themeConfig.id || themeConfig.name, 'homepage');
      
      console.log('🎨 Generating homepage with enhanced theme config:', {
        themeId: themeConfig.id,
        hasEnhancedMapping: !!(themeConfig.parameterMapping && Object.keys(themeConfig.parameterMapping).length > 0),
        hasFeatures: !!(themeConfig.features && themeConfig.features.length > 0),
        layout: pageLayoutConfig?.layout
      });
      
      // Base front matter
      const frontMatter: any = {
        title: seoData?.title || wizardData.businessInfo?.name || 'Welcome',
        description: seoData?.meta_description || homepageContent.hero_description,
        type: 'page',
        layout: pageLayoutConfig?.layout || 'home',
        draft: false,
        seo: {
          title: seoData?.title,
          description: seoData?.meta_description,
          keywords: seoData?.keywords || []
        }
      };
      
      // Apply enhanced front matter configuration
      this.applyEnhancedFrontMatter(frontMatter, 'homepage', wizardData, homepageContent, seoData);
      
      const content = this.buildHomepageContent(homepageContent, wizardData, pageLayoutConfig);
      const fullContent = this.buildMarkdownFile(frontMatter, content);
      
      const filePath = path.join(siteDir, 'content', '_index.md');
      await this.fileManager.writeFile(filePath, fullContent);
      await this.trackContent(filePath, 'homepage', frontMatter, true);
      
      console.log('Homepage content generated with theme-aware layout');
      return filePath;
      
    } catch (error: any) {
      throw new Error(`Homepage generation failed: ${error.message}`);
    }
  }

  // About page content generation
  private async generateAboutPage(
    siteDir: string,
    aboutContent: any,
    seoData: any,
    wizardData: any
  ): Promise<string> {
    try {
      // Get theme configuration for layout and front matter
      const themeConfig = wizardData.themeConfig || {};
      const themeConfigMapping = getThemeConfiguration(themeConfig.id || themeConfig.name);
      const pageLayoutConfig = getPageLayoutConfig(themeConfig.id || themeConfig.name, 'about');
      
      const frontMatter: any = {
        title: 'About Us',
        description: seoData?.meta_description || 'Learn more about our company',
        type: 'page',
        layout: pageLayoutConfig?.layout || 'single',
        draft: false
      };
      
      // Apply enhanced front matter configuration
      this.applyEnhancedFrontMatter(frontMatter, 'about', wizardData, aboutContent, seoData);
      
      const content = this.buildAboutContent(aboutContent, wizardData, pageLayoutConfig);
      const fullContent = this.buildMarkdownFile(frontMatter, content);
      const filePath = path.join(siteDir, 'content', 'about.md');
      
      await this.fileManager.writeFile(filePath, fullContent);
      await this.trackContent(filePath, 'about_page', frontMatter, true);
      
      console.log('About page content generated with theme-aware layout');
      return filePath;
      
    } catch (error: any) {
      throw new Error(`About page generation failed: ${error.message}`);
    }
  }
  
  private buildAboutContent(aboutContent: any, wizardData: any, pageLayoutConfig?: any): string {
    let content = '';
    
    // Use theme-specific sections if available
    const sections = pageLayoutConfig?.sections || ['story', 'mission', 'team-preview'];
    
    sections.forEach((sectionId: string) => {
      switch (sectionId) {
        case 'story':
          content += this.buildStorySection(aboutContent);
          break;
        case 'mission':
          content += this.buildMissionSection(aboutContent);
          break;
        case 'team-preview':
          content += this.buildTeamSection(aboutContent);
          break;
        case 'credentials':
          content += this.buildCredentialsSection(wizardData);
          break;
        default:
          console.warn(`Unknown about section: ${sectionId}`);
      }
    });
    
    // Fallback to original content if no sections were built
    if (!content.trim()) {
      content = this.buildOriginalAboutContent(aboutContent);
    }
    
    return content;
  }
  
  private buildStorySection(aboutContent: any): string {
    let content = `# About Us\n\n`;
    
    if (aboutContent.story) {
      content += `## Our Story\n\n${aboutContent.story}\n\n`;
    }
    
    return content;
  }
  
  private buildMissionSection(aboutContent: any): string {
    let content = '';
    
    if (aboutContent.mission) {
      content += `## Our Mission\n\n${aboutContent.mission}\n\n`;
    }
    
    if (aboutContent.vision) {
      content += `## Our Vision\n\n${aboutContent.vision}\n\n`;
    }
    
    return content;
  }
  
  private buildTeamSection(aboutContent: any): string {
    let content = '';
    
    if (aboutContent.team && Array.isArray(aboutContent.team)) {
      content += `## Our Team\n\n`;
      aboutContent.team.forEach((member: any) => {
        content += `### ${member.name}\n\n`;
        if (member.role) content += `**${member.role}**\n\n`;
        if (member.bio) content += `${member.bio}\n\n`;
      });
    }
    
    return content;
  }
  
  private buildCredentialsSection(wizardData: any): string {
    let content = '';
    
    const businessInfo = wizardData.businessInfo || {};
    if (businessInfo.certifications || businessInfo.credentials) {
      content += `## Our Credentials\n\n`;
      // Add credentials content here
      content += `We maintain the highest professional standards and certifications in our industry.\n\n`;
    }
    
    return content;
  }
  
  private buildOriginalAboutContent(aboutContent: any): string {
    let content = `# About Us\n\n`;
    
    if (aboutContent.story) {
      content += `## Our Story\n\n${aboutContent.story}\n\n`;
    }
    
    if (aboutContent.mission) {
      content += `## Our Mission\n\n${aboutContent.mission}\n\n`;
    }
    
    if (aboutContent.team && Array.isArray(aboutContent.team)) {
      content += `## Our Team\n\n`;
      aboutContent.team.forEach((member: any) => {
        content += `### ${member.name}\n\n`;
        if (member.role) content += `**${member.role}**\n\n`;
        if (member.bio) content += `${member.bio}\n\n`;
      });
    }
    
    return content;
  }

  // Contact page content generation
  private async generateContactPage(
    siteDir: string,
    contactContent: any,
    seoData: any,
    wizardData: any
  ): Promise<string> {
    try {
      const frontMatter = {
        title: 'Contact Us',
        description: seoData?.meta_description || 'Get in touch with us',
        type: 'page',
        layout: 'contact',
        draft: false
      };
      
      // Apply enhanced front matter configuration
      this.applyEnhancedFrontMatter(frontMatter, 'contact', wizardData, contactContent, seoData);
      
      let content = `# Contact Us\n\n`;
      
      if (contactContent.intro) {
        content += `${contactContent.intro}\n\n`;
      }
      
      // Contact information
      if (wizardData.contactInfo) {
        content += `## Contact Information\n\n`;
        
        if (wizardData.contactInfo.email) {
          content += `**Email:** ${wizardData.contactInfo.email}\n\n`;
        }
        
        if (wizardData.contactInfo.phone) {
          content += `**Phone:** ${wizardData.contactInfo.phone}\n\n`;
        }
        
        if (wizardData.contactInfo.address) {
          content += `**Address:**\n${wizardData.contactInfo.address}\n\n`;
        }
      }
      
      // Business hours
      if (contactContent.business_hours) {
        content += `## Business Hours\n\n${contactContent.business_hours}\n\n`;
      }
      
      const fullContent = this.buildMarkdownFile(frontMatter, content);
      const filePath = path.join(siteDir, 'content', 'contact.md');
      
      await this.fileManager.writeFile(filePath, fullContent);
      await this.trackContent(filePath, 'contact_page', frontMatter, true);
      
      console.log('Contact page content generated');
      return filePath;
      
    } catch (error: any) {
      throw new Error(`Contact page generation failed: ${error.message}`);
    }
  }
  
  private buildHomepageContent(homepageContent: any, wizardData: any, pageLayoutConfig?: any): string {
    let content = '';
    
    // Use theme-specific sections if available
    const sections = pageLayoutConfig?.sections || ['hero', 'features', 'about-preview', 'cta'];
    
    sections.forEach((sectionId: string) => {
      switch (sectionId) {
        case 'hero':
          content += this.buildHeroSection(homepageContent);
          break;
        case 'services-preview':
        case 'features':
          content += this.buildFeaturesSection(homepageContent);
          break;
        case 'about-preview':
          content += this.buildAboutPreviewSection(homepageContent);
          break;
        case 'testimonials':
          content += this.buildTestimonialsSection(homepageContent);
          break;
        case 'cta':
          content += this.buildCTASection(homepageContent);
          break;
        default:
          // Handle unknown sections gracefully
          console.warn(`Unknown section: ${sectionId}`);
      }
    });
    
    // Fallback to original content if no sections were built
    if (!content.trim()) {
      content = this.buildOriginalHomepageContent(homepageContent);
    }
    
    return content;
  }
  
  private buildHeroSection(homepageContent: any): string {
    let content = '';
    
    if (homepageContent.hero_headline) {
      content += `# ${homepageContent.hero_headline}\n\n`;
    }
    
    if (homepageContent.hero_subheadline) {
      content += `## ${homepageContent.hero_subheadline}\n\n`;
    }
    
    if (homepageContent.hero_description) {
      content += `${homepageContent.hero_description}\n\n`;
    }
    
    return content;
  }
  
  private buildFeaturesSection(homepageContent: any): string {
    let content = '';
    
    if (homepageContent.features && Array.isArray(homepageContent.features)) {
      content += `## Our Key Features\n\n`;
      homepageContent.features.forEach((feature: any) => {
        content += `### ${feature.title || feature}\n\n`;
        if (feature.description) {
          content += `${feature.description}\n\n`;
        }
      });
    }
    
    return content;
  }
  
  private buildAboutPreviewSection(homepageContent: any): string {
    let content = '';
    
    if (homepageContent.about_preview) {
      content += `## About Us\n\n${homepageContent.about_preview}\n\n`;
    }
    
    return content;
  }
  
  private buildTestimonialsSection(homepageContent: any): string {
    let content = '';
    
    if (homepageContent.testimonials && Array.isArray(homepageContent.testimonials)) {
      content += `## What Our Clients Say\n\n`;
      homepageContent.testimonials.forEach((testimonial: any) => {
        content += `> "${testimonial.quote || testimonial.text}"\n\n`;
        content += `— ${testimonial.author || 'Client'}\n\n`;
      });
    }
    
    return content;
  }
  
  private buildCTASection(homepageContent: any): string {
    let content = '';
    
    if (homepageContent.cta_text) {
      content += `## Ready to Get Started?\n\n${homepageContent.cta_text}\n\n`;
      content += `[Contact Us](/contact/)\n\n`;
    }
    
    return content;
  }
  
  private buildOriginalHomepageContent(homepageContent: any): string {
    let content = '';
    
    // Hero section
    if (homepageContent.hero_headline) {
      content += `# ${homepageContent.hero_headline}\n\n`;
    }
    
    if (homepageContent.hero_subheadline) {
      content += `## ${homepageContent.hero_subheadline}\n\n`;
    }
    
    if (homepageContent.hero_description) {
      content += `${homepageContent.hero_description}\n\n`;
    }
    
    // Features section
    if (homepageContent.features && Array.isArray(homepageContent.features)) {
      content += `## Our Key Features\n\n`;
      homepageContent.features.forEach((feature: any) => {
        content += `### ${feature.title || feature}\n\n`;
        if (feature.description) {
          content += `${feature.description}\n\n`;
        }
      });
    }
    
    // About preview
    if (homepageContent.about_preview) {
      content += `## About Us\n\n${homepageContent.about_preview}\n\n`;
    }
    
    // Call to action
    if (homepageContent.cta_text) {
      content += `## Ready to Get Started?\n\n${homepageContent.cta_text}\n\n`;
      content += `[Contact Us](/contact/)\n\n`;
    }
    
    return content;
  }
  
  // Services content generation
  private async generateServicesContent(
    siteDir: string,
    servicesContent: any[],
    seoData: any,
    selectedServices: any[],
    structure: any,
    wizardData?: any
  ): Promise<string[]> {
    try {
      const createdFiles: string[] = [];
      
      // Log dynamic generation details
      console.log(`🎯 Dynamic Services Generation:`);
      console.log(`   Selected Services: ${selectedServices.length}`);
      console.log(`   Generated Content: ${servicesContent.length}`);
      console.log(`   Structure Type: ${structure.type}`);
      console.log(`   Services: ${selectedServices.map(s => s.name).join(', ')}`);
      
      // Determine generation strategy based on user requirements
      const maxServicePages = structure.maxServicePages || 10; // Configurable limit
      const shouldCreateIndividualPages = structure.type === 'multi-page' && selectedServices.length <= maxServicePages;
      
      // Always create services index page
      const servicesIndexPath = await this.generateServicesIndex(
        siteDir,
        servicesContent,
        seoData,
        selectedServices,
        shouldCreateIndividualPages
      );
      createdFiles.push(servicesIndexPath);
      console.log(`✅ Services index created: ${servicesIndexPath}`);
      
      // Create individual service pages ONLY for selected services
      if (shouldCreateIndividualPages) {
        console.log(`📄 Creating individual pages for all ${selectedServices.length} selected services...`);
        
        // Process each selected service
        for (const serviceData of selectedServices) {
          try {
            // Find matching AI-generated content for this service
            const serviceContent = this.findMatchingServiceContent(servicesContent, serviceData);
            
            if (serviceContent) {
              console.log(`📝 Using AI-generated content for service: ${serviceData.name}`);
            } else {
              console.log(`⚠️  No AI content found for service: ${serviceData.name}, using service data only`);
            }
            
            const servicePage = await this.generateServicePage(
              siteDir,
              serviceContent || {},
              serviceData,
              seoData,
              wizardData
            );
            createdFiles.push(servicePage);
            console.log(`✅ Service page created: ${serviceData.name} -> ${servicePage}`);
            
          } catch (serviceError: any) {
            console.error(`❌ Failed to create service page for ${serviceData.name}: ${serviceError.message}`);
            // Continue with other services instead of failing completely
          }
        }
      } else {
        console.log(`📋 Single-page structure: All services included in index page only`);
      }
      
      console.log(`🎉 Services generation completed: ${createdFiles.length} files created`);
      console.log(`📋 Individual service pages: ${shouldCreateIndividualPages ? selectedServices.length : 0}`);
      
      return createdFiles;
      
    } catch (error: any) {
      throw new Error(`Services content generation failed: ${error.message}`);
    }
  }

  // Enhanced services index with better dynamic handling
  private async generateServicesIndex(
    siteDir: string,
    servicesContent: any[],
    seoData: any,
    selectedServices: any[],
    hasIndividualPages: boolean = false
  ): Promise<string> {
    const frontMatter = {
      title: 'Our Services',
      description: seoData?.meta_description || 'Comprehensive services to meet your needs',
      type: 'services',
      layout: 'services',
      draft: false,
      services_count: selectedServices.length,
      has_individual_pages: hasIndividualPages
    };
    
    let content = `# Our Services\n\nWe offer a comprehensive range of professional services to meet your needs.\n\n`;
    
    // Process all selected services (not just those with AI content)
    selectedServices.forEach((serviceData: any) => {
      // Find matching AI content for this service
      const serviceContent = this.findMatchingServiceContent(servicesContent, serviceData);
      
      // Use AI content if available, otherwise use service data
      const headline = serviceContent?.headline || serviceData.name;
      const description = serviceContent?.description || serviceData.description || 'Professional service tailored to your needs.';
      
      content += `## ${headline}\n\n`;
      content += `${description}\n\n`;
      
      // Add AI-generated benefits if available
      if (serviceContent?.benefits && Array.isArray(serviceContent.benefits)) {
        content += `### Key Benefits:\n\n`;
        serviceContent.benefits.forEach((benefit: string) => {
          content += `- ${benefit}\n`;
        });
        content += `\n`;
      }
      
      // Add pricing info if available
      if (serviceData.pricing) {
        content += `**Starting at:** ${serviceData.pricing}\n\n`;
      }
      
      // Link to detailed page only if individual pages exist
      if (hasIndividualPages) {
        const serviceSlug = this.slugify(serviceData.name);
        content += `[Learn More About ${serviceData.name}](/services/${serviceSlug}/)\n\n`;
      } else {
        // For single-page sites, add more detail directly
        if (serviceContent?.process && Array.isArray(serviceContent.process)) {
          content += `### How It Works:\n\n`;
          serviceContent.process.forEach((step: string, stepIndex: number) => {
            content += `${stepIndex + 1}. ${step}\n`;
          });
          content += `\n`;
        }
      }
      
      content += `---\n\n`;
    });
    
    // Add call to action
    content += `## Ready to Get Started?\n\n`;
    content += `Contact us today to discuss how our services can help you achieve your goals.\n\n`;
    content += `[Get in Touch](/contact/)\n\n`;
    
    const fullContent = this.buildMarkdownFile(frontMatter, content);
    const filePath = path.join(siteDir, 'content', 'services', '_index.md');
    
    await this.fileManager.ensureDir(path.dirname(filePath));
    await this.fileManager.writeFile(filePath, fullContent);
    await this.trackContent(filePath, 'services_index', frontMatter, true);
    
    return filePath;
  }
  
  private async generateServicePage(
    siteDir: string,
    serviceContent: any,
    serviceData: any,
    seoData: any,
    wizardData?: any
  ): Promise<string> {
    const serviceSlug = this.slugify(serviceData.name);
    
    // Use AI content if available, otherwise fall back to service data
    const headline = serviceContent?.headline || serviceData.name;
    const description = serviceContent?.description || serviceData.description || 'Professional service tailored to your needs.';
    
    // Create front matter matching health-wellness-theme expectations
    const frontMatter: any = {
      title: headline,
      description: description,
      // Theme-specific fields
      image: serviceContent?.image || `/images/services/${this.slugify(serviceData.name)}.jpg`,
      price: serviceData.pricing || serviceContent?.price || 'Contact for pricing',
      duration: serviceData.duration || serviceContent?.duration || '1 hour',
      weight: serviceData.weight || 1,
      // Hugo defaults
      draft: false
    };
    
    // Add optional theme fields if available
    if (serviceContent?.subtitle) {
      frontMatter.subtitle = serviceContent.subtitle;
    }
    
    // Add benefits as array if available
    if (serviceContent?.benefits && Array.isArray(serviceContent.benefits)) {
      frontMatter.benefits = serviceContent.benefits;
    }
    
    // Add procedure steps if available
    if (serviceContent?.process && Array.isArray(serviceContent.process)) {
      frontMatter.procedure = serviceContent.process.map((step: string, index: number) => ({
        title: `Step ${index + 1}`,
        description: step
      }));
    }
    
    // Apply enhanced front matter configuration if wizardData is available
    if (wizardData) {
      this.applyEnhancedFrontMatter(frontMatter, 'services', wizardData, serviceContent || {}, seoData);
    }
    
    let content = `# ${headline}\n\n`;
    content += `${description}\n\n`;
    
    // Add additional content if available from AI
    if (serviceContent?.detailedDescription) {
      content += `${serviceContent.detailedDescription}\n\n`;
    }
    
    // Add any additional content sections that aren't handled by front matter
    if (serviceContent?.additionalInfo) {
      content += `## Additional Information\n\n${serviceContent.additionalInfo}\n\n`;
    }
    
    // Call to action - use AI content if available, otherwise simple default
    if (serviceContent?.cta) {
      content += `## Get Started\n\n${serviceContent.cta}\n\n`;
    } else {
      content += `Ready to experience our ${serviceData.name} service? Contact us today to schedule your appointment.\n\n`;
    }
    
    const fullContent = this.buildMarkdownFile(frontMatter, content);
    // Create service as page bundle to match theme requirements
    const serviceDirPath = path.join(siteDir, 'content', 'services', serviceSlug);
    const filePath = path.join(serviceDirPath, 'index.md');
    
    await this.fileManager.ensureDir(serviceDirPath);
    await this.fileManager.writeFile(filePath, fullContent);
    await this.trackContent(filePath, 'service_page', frontMatter, true);
    
    return filePath;
  }
  
  // Blog content generation
  private async generateBlogPosts(
    siteDir: string,
    blogPosts: any[],
    wizardData: any
  ): Promise<string[]> {
    try {
      const createdFiles: string[] = [];
      
      // Create blog index page
      const blogIndexPath = await this.generateBlogIndex(siteDir);
      createdFiles.push(blogIndexPath);
      
      // Create individual blog posts
      for (let i = 0; i < blogPosts.length; i++) {
        const post = blogPosts[i];
        const postPath = await this.generateBlogPost(siteDir, post, i + 1);
        createdFiles.push(postPath);
      }
      
      return createdFiles;
      
    } catch (error: any) {
      throw new Error(`Blog content generation failed: ${error.message}`);
    }
  }

  private async generateBlogIndex(siteDir: string): Promise<string> {
    const frontMatter = {
      title: 'Blog',
      description: 'Latest news and insights',
      type: 'blog',
      layout: 'list',
      draft: false
    };
    
    const content = `# Blog\n\nStay updated with our latest news, insights, and industry updates.\n\n`;
    
    const fullContent = this.buildMarkdownFile(frontMatter, content);
    const filePath = path.join(siteDir, 'content', 'blog', '_index.md');
    
    await this.fileManager.ensureDir(path.dirname(filePath));
    await this.fileManager.writeFile(filePath, fullContent);
    await this.trackContent(filePath, 'blog_index', frontMatter, true);
    
    return filePath;
  }
  
  private async generateBlogPost(
    siteDir: string,
    postContent: any,
    postNumber: number
  ): Promise<string> {
    const postSlug = this.slugify(postContent.title || `post-${postNumber}`);
    const postDate = new Date();
    postDate.setDate(postDate.getDate() - (postNumber * 7)); // Space posts a week apart
    
    const frontMatter = {
      title: postContent.title || `Blog Post ${postNumber}`,
      date: postDate.toISOString(),
      draft: false,
      categories: postContent.categories || ['Blog'],
      tags: postContent.tags || [],
      author: postContent.author || 'Admin',
      description: postContent.excerpt || postContent.description
    };
    
    let content = postContent.content || `
# ${frontMatter.title}

This is a sample blog post to demonstrate the blog functionality of your website.

## Introduction

Welcome to our blog! We'll be sharing insights, updates, and valuable information here.

## Content

This post demonstrates how your blog will look and function. You can easily customize these posts and add your own content.

## Conclusion

Thank you for reading! Stay tuned for more updates and insights.
`;
    
    const fullContent = this.buildMarkdownFile(frontMatter, content);
    const filePath = path.join(siteDir, 'content', 'blog', `${postSlug}.md`);
    
    await this.fileManager.ensureDir(path.dirname(filePath));
    await this.fileManager.writeFile(filePath, fullContent);
    await this.trackContent(filePath, 'blog_post', frontMatter, true);
    
    return filePath;
  }
  
  /**
   * Generate content files using structured page configuration
   * This replaces the old hard-coded approach with a data-driven method
   */
  async generateContentFilesStructured(
    siteDir: string,
    generatedContent: any,
    wizardData: any,
    seoData: any,
    structure: any
  ): Promise<{
    success: boolean;
    createdFiles: string[];
    errors: string[];
    contentTracking: ContentTrackingInfo[];
    pageStructurePlan: PageCreationPlan | null;
  }> {
    this.resetContentTracking();
    const createdFiles: string[] = [];
    const errors: string[] = [];
    
    console.log('🏗️ Starting structured content generation...');
    console.log('📊 Input data summary:', {
      siteDir,
      hasGeneratedContent: !!generatedContent,
      hasWizardData: !!wizardData,
      hasSeoData: !!seoData,
      structureType: structure?.type
    });

    try {
      // Step 1: Determine page structure configuration
      console.log('📋 Step 1: Determining page structure...');
      const pageConfig = this.pageStructureManager.determinePageStructure(wizardData);
      
      if (!pageConfig) {
        const error = 'No suitable page structure configuration found';
        console.error(`❌ ${error}`);
        errors.push(error);
        return {
          success: false,
          createdFiles,
          errors,
          contentTracking: this.getContentTrackingInfo(),
          pageStructurePlan: null
        };
      }

      // Step 2: Create page creation plan
      console.log('📋 Step 2: Creating page creation plan...');
      const pageCreationPlan = this.pageStructureManager.createPageCreationPlan(pageConfig, wizardData);
      
      // Step 3: Update wizard data with resolved structure
      console.log('📋 Step 3: Updating wizard data with page structure...');
      const updatedWizardData = this.pageStructureManager.updateWizardDataWithPageStructure(
        wizardData, 
        pageCreationPlan
      );

      // Step 4: Ensure content directory
      const contentDir = path.join(siteDir, 'content');
      await this.fileManager.ensureDir(contentDir);
      console.log(`✅ Content directory ready: ${contentDir}`);

      // Step 5: Generate static pages
      console.log('📄 Step 5: Generating static pages...');
      for (const page of pageCreationPlan.staticPages) {
        try {
          const filePath = await this.generateStaticPage(
            siteDir,
            page,
            generatedContent,
            seoData,
            updatedWizardData,
            pageConfig
          );
          createdFiles.push(filePath);
          console.log(`✅ Static page created: ${page.title} -> ${filePath}`);
        } catch (error: any) {
          console.error(`❌ Failed to create static page ${page.title}: ${error.message}`);
          errors.push(`Static page ${page.title}: ${error.message}`);
        }
      }

      // Step 6: Generate service pages
      if (pageCreationPlan.servicePages.length > 0) {
        console.log('🔧 Step 6: Generating service pages...');
        try {
          const serviceFiles = await this.generateServicePagesStructured(
            siteDir,
            pageCreationPlan.servicePages,
            generatedContent.services || [],
            seoData,
            updatedWizardData
          );
          createdFiles.push(...serviceFiles);
          console.log(`✅ Service pages created: ${serviceFiles.length} files`);
        } catch (error: any) {
          console.error(`❌ Service pages generation failed: ${error.message}`);
          errors.push(`Service pages: ${error.message}`);
        }
      }

      // Step 7: Generate blog pages
      if (pageCreationPlan.blogPages.length > 0) {
        console.log('📝 Step 7: Generating blog pages...');
        try {
          const blogFiles = await this.generateBlogPagesStructured(
            siteDir,
            pageCreationPlan.blogPages,
            generatedContent.blog_posts || [],
            updatedWizardData
          );
          createdFiles.push(...blogFiles);
          console.log(`✅ Blog pages created: ${blogFiles.length} files`);
        } catch (error: any) {
          console.error(`❌ Blog pages generation failed: ${error.message}`);
          errors.push(`Blog pages: ${error.message}`);
        }
      }

      // Step 8: Verify all created files
      console.log('🔍 Step 8: Verifying created files...');
      let verificationErrors = 0;
      for (const filePath of createdFiles) {
        const exists = await this.fileManager.exists(filePath);
        if (!exists) {
          console.error(`❌ File verification failed: ${filePath}`);
          errors.push(`File not found after creation: ${filePath}`);
          verificationErrors++;
        } else {
          const stats = await this.fileManager.getStats(filePath);
          console.log(`✅ Verified: ${path.relative(siteDir, filePath)} (${stats.size} bytes)`);
        }
      }

      const success = errors.length === 0;
      console.log(`🎉 Structured content generation completed!`);
      console.log(`📊 Results: ${createdFiles.length} files created, ${errors.length} errors`);
      console.log(`📄 Pages breakdown:`);
      console.log(`   Static pages: ${pageCreationPlan.staticPages.length}`);
      console.log(`   Service pages: ${pageCreationPlan.servicePages.length}`);
      console.log(`   Blog pages: ${pageCreationPlan.blogPages.length}`);

      return {
        success,
        createdFiles,
        errors,
        contentTracking: this.getContentTrackingInfo(),
        pageStructurePlan: pageCreationPlan
      };

    } catch (error: any) {
      console.error(`💥 Structured content generation failed: ${error.message}`);
      return {
        success: false,
        createdFiles,
        errors: [error.message],
        contentTracking: this.getContentTrackingInfo(),
        pageStructurePlan: null
      };
    }
  }

  /**
   * Generate a static page based on its definition
   */
  private async generateStaticPage(
    siteDir: string,
    page: { key: string; filePath: string; title: string; definition: any },
    generatedContent: any,
    seoData: any,
    wizardData: any,
    pageConfig: any
  ): Promise<string> {
    const { key, filePath, title, definition } = page;
    
    console.log(`📄 Generating static page: ${title} (${key})`);
    
    // Map page keys to content generation methods
    switch (key) {
      case 'homepage':
        return this.generateHomepage(siteDir, generatedContent.homepage, seoData?.homepage, wizardData);
      
      case 'about':
        return this.generateAboutPageStructured(siteDir, filePath, generatedContent.about, seoData?.about, wizardData);
      
      case 'services-index':
        return this.generateServicesIndexStructured(siteDir, filePath, generatedContent.services, seoData?.services, wizardData);
      
      case 'contact':
        return this.generateContactPageStructured(siteDir, filePath, generatedContent.contact, seoData?.contact, wizardData);
      
      case 'team':
        return this.generateTeamPageStructured(siteDir, filePath, generatedContent.team, wizardData);
      
      case 'patient-portal':
        return this.generatePatientPortalPage(siteDir, filePath, wizardData);
      
      case 'appointments':
        return this.generateAppointmentsPage(siteDir, filePath, wizardData);
      
      default:
        throw new Error(`Unknown page key: ${key}`);
    }
  }

  /**
   * Generate structured about page
   */
  private async generateAboutPageStructured(
    siteDir: string,
    filePath: string,
    aboutContent: any,
    seoData: any,
    wizardData: any
  ): Promise<string> {
    const frontMatter = {
      title: 'About Us',
      description: seoData?.meta_description || 'Learn more about our company',
      type: 'page',
      layout: 'about',
      draft: false
    };
    
    // Apply enhanced front matter configuration
    this.applyEnhancedFrontMatter(frontMatter, 'about', wizardData, aboutContent, seoData);
    
    let content = `# About Us\n\n`;
    
    if (aboutContent?.story) {
      content += `## Our Story\n\n${aboutContent.story}\n\n`;
    }
    
    if (aboutContent?.mission) {
      content += `## Our Mission\n\n${aboutContent.mission}\n\n`;
    }
    
    // Add business-specific content
    if (wizardData.businessCategory?.id === 'healthcare') {
      content += `## Our Commitment to Your Health\n\n`;
      content += `We are dedicated to providing exceptional healthcare services with compassion, expertise, and state-of-the-art medical technology.\n\n`;
    }
    
    const fullContent = this.buildMarkdownFile(frontMatter, content);
    const fullPath = path.join(siteDir, 'content', filePath);
    
    await this.fileManager.ensureDir(path.dirname(fullPath));
    await this.fileManager.writeFile(fullPath, fullContent);
    await this.trackContent(fullPath, 'about_page', frontMatter, true);
    
    return fullPath;
  }

  /**
   * Generate structured services index page
   */
  private async generateServicesIndexStructured(
    siteDir: string,
    filePath: string,
    servicesContent: any[],
    seoData: any,
    wizardData: any
  ): Promise<string> {
    const frontMatter = {
      title: 'Our Services',
      description: seoData?.meta_description || 'Comprehensive services to meet your needs',
      type: 'services',
      layout: 'services',
      draft: false
    };
    
    // Apply enhanced front matter configuration
    this.applyEnhancedFrontMatter(frontMatter, 'services', wizardData, servicesContent, seoData);
    
    let content = `# Our Services\n\nWe offer a comprehensive range of professional services to meet your needs.\n\n`;
    
    // Add services from wizard data
    if (wizardData.servicesSelection?.selectedServices) {
      wizardData.servicesSelection.selectedServices.forEach((service: any, index: number) => {
        content += `## ${service.name}\n\n`;
        content += `${service.description}\n\n`;
        
        // Add link to individual page if multi-page structure
        if (wizardData.websiteStructure?.type === 'multi-page') {
          const serviceSlug = this.slugify(service.name);
          content += `[Learn More About ${service.name}](/services/${serviceSlug}/)\n\n`;
        }
        
        content += `---\n\n`;
      });
    }
    
    const fullContent = this.buildMarkdownFile(frontMatter, content);
    const fullPath = path.join(siteDir, 'content', filePath);
    
    await this.fileManager.ensureDir(path.dirname(fullPath));
    await this.fileManager.writeFile(fullPath, fullContent);
    await this.trackContent(fullPath, 'services_index', frontMatter, true);
    
    return fullPath;
  }

  /**
   * Generate structured contact page
   */
  private async generateContactPageStructured(
    siteDir: string,
    filePath: string,
    contactContent: any,
    seoData: any,
    wizardData: any
  ): Promise<string> {
    const frontMatter = {
      title: 'Contact Us',
      description: seoData?.meta_description || 'Get in touch with us',
      type: 'page',
      layout: 'contact',
      draft: false
    };
    
    // Apply enhanced front matter configuration
    this.applyEnhancedFrontMatter(frontMatter, 'contact', wizardData, contactContent, seoData);
    
    let content = `# Contact Us\n\n`;
    
    if (contactContent?.intro) {
      content += `${contactContent.intro}\n\n`;
    }
    
    // Contact information from wizard data
    if (wizardData.locationInfo) {
      content += `## Contact Information\n\n`;
      
      if (wizardData.locationInfo.contactInfo?.email) {
        content += `**Email:** ${wizardData.locationInfo.contactInfo.email}\n\n`;
      }
      
      if (wizardData.locationInfo.contactInfo?.phone) {
        content += `**Phone:** ${wizardData.locationInfo.contactInfo.phone}\n\n`;
      }
      
      if (wizardData.locationInfo.address && !wizardData.locationInfo.isOnlineOnly) {
        const address = wizardData.locationInfo.address;
        content += `**Address:**\n`;
        content += `${address.street}\n`;
        content += `${address.city}, ${address.state} ${address.zipCode}\n\n`;
      }
      
      // Business hours
      if (wizardData.locationInfo.businessHours) {
        content += `## Business Hours\n\n`;
        const hours = wizardData.locationInfo.businessHours;
        Object.entries(hours).forEach(([day, info]: [string, any]) => {
          if (info.isOpen) {
            const dayName = day.charAt(0).toUpperCase() + day.slice(1);
            content += `**${dayName}:** ${info.open} - ${info.close}\n`;
          }
        });
        content += `\n`;
      }
    }
    
    const fullContent = this.buildMarkdownFile(frontMatter, content);
    const fullPath = path.join(siteDir, 'content', filePath);
    
    await this.fileManager.ensureDir(path.dirname(fullPath));
    await this.fileManager.writeFile(fullPath, fullContent);
    await this.trackContent(fullPath, 'contact_page', frontMatter, true);
    
    return fullPath;
  }

  /**
   * Generate team page
   */
  private async generateTeamPageStructured(
    siteDir: string,
    filePath: string,
    teamContent: any,
    wizardData: any
  ): Promise<string> {
    const frontMatter = {
      title: 'Our Team',
      description: 'Meet our experienced team of professionals',
      type: 'page',
      layout: 'team',
      draft: false
    };
    
    // Apply enhanced front matter configuration
    this.applyEnhancedFrontMatter(frontMatter, 'team', wizardData, teamContent, {});
    
    let content = `# Our Team\n\n`;
    content += `Meet the dedicated professionals who make our success possible.\n\n`;
    
    // Add team members if available
    if (teamContent?.members && Array.isArray(teamContent.members)) {
      teamContent.members.forEach((member: any) => {
        content += `## ${member.name}\n\n`;
        if (member.role) content += `**${member.role}**\n\n`;
        if (member.bio) content += `${member.bio}\n\n`;
        content += `---\n\n`;
      });
    } else {
      // Default team content
      content += `Our team consists of experienced professionals dedicated to providing exceptional service and expertise in our field.\n\n`;
    }
    
    const fullContent = this.buildMarkdownFile(frontMatter, content);
    const fullPath = path.join(siteDir, 'content', filePath);
    
    await this.fileManager.ensureDir(path.dirname(fullPath));
    await this.fileManager.writeFile(fullPath, fullContent);
    await this.trackContent(fullPath, 'team_page', frontMatter, true);
    
    return fullPath;
  }

  /**
   * Generate patient portal page
   */
  private async generatePatientPortalPage(
    siteDir: string,
    filePath: string,
    wizardData: any
  ): Promise<string> {
    const frontMatter = {
      title: 'Patient Portal',
      description: 'Access your medical records, appointments, and more',
      type: 'page',
      layout: 'single',
      draft: false
    };
    
    // Apply enhanced front matter configuration
    this.applyEnhancedFrontMatter(frontMatter, 'patient-portal', wizardData, {}, {});
    
    let content = `# Patient Portal\n\n`;
    content += `Access your medical information, schedule appointments, and communicate with our healthcare team through our secure patient portal.\n\n`;
    content += `## Features\n\n`;
    content += `- View test results and medical records\n`;
    content += `- Schedule and manage appointments\n`;
    content += `- Request prescription refills\n`;
    content += `- Secure messaging with healthcare providers\n`;
    content += `- Access educational resources\n\n`;
    content += `## How to Access\n\n`;
    content += `Contact our office to set up your patient portal account and receive your login credentials.\n\n`;
    
    const fullContent = this.buildMarkdownFile(frontMatter, content);
    const fullPath = path.join(siteDir, 'content', filePath);
    
    await this.fileManager.ensureDir(path.dirname(fullPath));
    await this.fileManager.writeFile(fullPath, fullContent);
    await this.trackContent(fullPath, 'patient_portal', frontMatter, true);
    
    return fullPath;
  }

  /**
   * Generate appointments page
   */
  private async generateAppointmentsPage(
    siteDir: string,
    filePath: string,
    wizardData: any
  ): Promise<string> {
    const frontMatter = {
      title: 'Book Appointment',
      description: 'Schedule your appointment with our healthcare team',
      type: 'page',
      layout: 'appointment',
      draft: false
    };
    
    let content = `# Book an Appointment\n\n`;
    content += `Schedule your appointment with our healthcare team. We offer convenient scheduling options to fit your needs.\n\n`;
    content += `## How to Schedule\n\n`;
    content += `- **Online:** Use our patient portal to book appointments\n`;
    content += `- **Phone:** Call our office during business hours\n`;
    content += `- **In-Person:** Visit our office to schedule\n\n`;
    
    if (wizardData.locationInfo?.contactInfo?.phone) {
      content += `## Contact Information\n\n`;
      content += `**Phone:** ${wizardData.locationInfo.contactInfo.phone}\n\n`;
    }
    
    content += `## Appointment Types\n\n`;
    content += `- Routine check-ups and physical exams\n`;
    content += `- Consultation appointments\n`;
    content += `- Follow-up visits\n`;
    content += `- Urgent care appointments\n\n`;
    
    const fullContent = this.buildMarkdownFile(frontMatter, content);
    const fullPath = path.join(siteDir, 'content', filePath);
    
    await this.fileManager.ensureDir(path.dirname(fullPath));
    await this.fileManager.writeFile(fullPath, fullContent);
    await this.trackContent(fullPath, 'appointment_page', frontMatter, true);
    
    return fullPath;
  }

  /**
   * Generate blog index page
   */
  private async generateBlogIndexStructured(siteDir: string, wizardData?: any): Promise<string> {
    const frontMatter = {
      title: 'Blog',
      description: 'Latest news, insights, and updates',
      type: 'blog',
      layout: 'list',
      draft: false
    };
    
    // Apply enhanced front matter configuration if wizardData is available
    if (wizardData) {
      this.applyEnhancedFrontMatter(frontMatter, 'blog', wizardData, {}, {});
    }
    
    const content = `# Blog\n\nStay updated with our latest news, insights, and industry updates.\n\n`;
    
    const fullContent = this.buildMarkdownFile(frontMatter, content);
    const filePath = path.join(siteDir, 'content', 'blog', '_index.md');
    
    await this.fileManager.ensureDir(path.dirname(filePath));
    await this.fileManager.writeFile(filePath, fullContent);
    await this.trackContent(filePath, 'blog_index', frontMatter, true);
    
    return filePath;
  }

  /**
   * Generate blog tags based on business category
   */
  private generateBlogTags(businessCategory?: string): string[] {
    const tagsByCategory: { [key: string]: string[] } = {
      healthcare: ['health', 'medical', 'wellness', 'prevention', 'care'],
      technology: ['tech', 'innovation', 'development', 'software', 'digital'],
      // Add more categories as needed
    };
    
    return tagsByCategory[businessCategory || 'default'] || ['blog', 'news', 'updates'];
  }

  /**
   * Generate sample blog content
   */
  private generateSampleBlogContent(title: string, wizardData: any): string {
    const businessName = wizardData.businessInfo?.name || 'Our Company';
    
    return `
# ${title}

Welcome to our latest blog post about ${title.toLowerCase()}. At ${businessName}, we're committed to sharing valuable insights and information with our community.

## Introduction

This post covers important topics related to our industry and how they affect our clients and customers.

## Key Points

- Professional expertise and experience
- Commitment to quality service
- Ongoing education and improvement
- Community involvement and support

## Conclusion

Thank you for reading! We hope you found this information helpful. If you have any questions or would like to learn more, please don't hesitate to contact us.

[Contact Us](/contact/) | [Learn About Our Services](/services/)
`;
  }
  
  // Utility methods
  private buildMarkdownFile(frontMatter: any, content: string): string {
    const yamlFrontMatter = yaml.dump(frontMatter).trim();
    return `---\n${yamlFrontMatter}\n---\n\n${content}`;
  }
  
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  
  private hasBlogStructure(structure: any): boolean {
    return structure?.type === 'multi-page' && 
           (structure?.pages?.some((p: any) => p.id === 'blog') || 
            structure?.selectedPages?.includes('blog'));
  }

  /**
   * Generate service pages using structured approach
   */
  private async generateServicePagesStructured(
    siteDir: string,
    servicePages: Array<{ name: string; slug: string; filePath: string }>,
    servicesContent: any[],
    seoData: any,
    wizardData: any
  ): Promise<string[]> {
    const createdFiles: string[] = [];
    
    for (const servicePage of servicePages) {
      try {
        // Find matching content or use service data from wizard
        const serviceContent = servicesContent.find((content: any) => 
          content.name?.toLowerCase().includes(servicePage.name.toLowerCase())
        ) || {};
        
        const serviceData = wizardData.servicesSelection?.selectedServices?.find((service: any) =>
          service.name === servicePage.name
        ) || { name: servicePage.name, description: 'Professional service tailored to your needs.' };
        
        // Start with basic front matter
        const frontMatter: any = {
          title: serviceContent.headline || servicePage.name,
          description: serviceContent.description || serviceData.description,
          draft: false
        };
        
        // Check if we're using a theme that has specific requirements
        const isUsingHealthWellnessTheme = wizardData.themeConfig?.themeName === 'health-wellness-theme' || 
                                          wizardData.themeSelection?.selectedTheme?.name === 'health-wellness-theme';
        
        if (isUsingHealthWellnessTheme) {
          // For health-wellness-theme, use only theme-compatible fields
          frontMatter.title = serviceContent.headline || servicePage.name;
          frontMatter.description = serviceContent.description || serviceData.description;
          frontMatter.image = serviceContent?.image || `/images/services/${servicePage.slug}.jpg`;
          frontMatter.price = serviceData.pricing || serviceContent?.price || 'Contact for pricing';
          frontMatter.duration = serviceData.duration || serviceContent?.duration || '1 hour';
          frontMatter.weight = serviceData.weight || 1;
          frontMatter.draft = false;
          
          // Add optional theme fields if available
          if (serviceContent?.subtitle) {
            frontMatter.subtitle = serviceContent.subtitle;
          }
          
          // Map insurance field to theme's expected name
          if (serviceData.insurance || serviceContent?.insurance) {
            frontMatter.insurance_covered = serviceData.insurance || serviceContent.insurance || 'Please check with your provider';
          }
          
          // Add preparation instructions if available
          if (serviceContent?.preparation) {
            frontMatter.preparation = serviceContent.preparation;
          }
          
          // Add benefits as array if available for theme
          if (serviceContent?.benefits && Array.isArray(serviceContent.benefits)) {
            frontMatter.benefits = serviceContent.benefits;
          }
          
          // Add procedure steps if available for theme
          if (serviceContent?.process && Array.isArray(serviceContent.process)) {
            frontMatter.procedure = serviceContent.process.map((step: string, index: number) => ({
              title: `Step ${index + 1}`,
              description: step
            }));
          }
          
        } else {
          // For other themes, use business-specific fields
          this.addBusinessSpecificFields(frontMatter, wizardData, serviceData, serviceContent);
          
          // Apply enhanced front matter configuration
          this.applyEnhancedFrontMatter(frontMatter, 'services', wizardData, serviceContent, seoData);
          
          // Override with theme-specific fields (these take priority for theme compatibility)
          frontMatter.title = serviceContent.headline || servicePage.name;
          frontMatter.description = serviceContent.description || serviceData.description;
          frontMatter.image = serviceContent?.image || `/images/services/${servicePage.slug}.jpg`;
          frontMatter.price = serviceData.pricing || serviceContent?.price || 'Contact for pricing';
          frontMatter.duration = serviceData.duration || serviceContent?.duration || '1 hour';
          frontMatter.weight = serviceData.weight || 1;
          frontMatter.draft = false;
          
          // Add benefits as array if available for other themes
          if (serviceContent?.benefits && Array.isArray(serviceContent.benefits)) {
            frontMatter.benefits = serviceContent.benefits;
          }
          
          // Add procedure steps if available for other themes
          if (serviceContent?.process && Array.isArray(serviceContent.process)) {
            frontMatter.procedure = serviceContent.process.map((step: string, index: number) => ({
              title: `Step ${index + 1}`,
              description: step
            }));
          }
        }
        
        let content = `# ${servicePage.name}\n\n`;
        content += `${serviceContent.description || serviceData.description}\n\n`;
        
        // Add additional content if available from AI
        if (serviceContent?.detailedDescription) {
          content += `${serviceContent.detailedDescription}\n\n`;
        }
        
        // Add any additional content sections that aren't handled by front matter
        if (serviceContent?.additionalInfo) {
          content += `## Additional Information\n\n${serviceContent.additionalInfo}\n\n`;
        }
        
        // Call to action - use AI content if available, otherwise simple default
        if (serviceContent?.cta) {
          content += `## Get Started\n\n${serviceContent.cta}\n\n`;
        } else {
          content += `Ready to learn more about our ${servicePage.name.toLowerCase()} services? Contact us today to schedule a consultation.\n\n`;
        }
        
        const fullContent = this.buildMarkdownFile(frontMatter, content);
        const fullPath = path.join(siteDir, 'content', servicePage.filePath);
        
        await this.fileManager.ensureDir(path.dirname(fullPath));
        await this.fileManager.writeFile(fullPath, fullContent);
        await this.trackContent(fullPath, 'service_page', frontMatter, true);
        
        createdFiles.push(fullPath);
        console.log(`✅ Service page created: ${servicePage.name} -> ${servicePage.filePath}`);
        
      } catch (error: any) {
        console.error(`❌ Failed to create service page ${servicePage.name}: ${error.message}`);
        throw error;
      }
    }
    
    return createdFiles;
  }

  /**
   * Generate blog pages using structured approach with year folders
   */
  private async generateBlogPagesStructured(
    siteDir: string,
    blogPages: Array<{ title: string; slug: string; filePath: string; year: number }>,
    blogContent: any[],
    wizardData: any
  ): Promise<string[]> {
    const createdFiles: string[] = [];
    
    // Create blog index first
    const blogIndexPath = await this.generateBlogIndexStructured(siteDir, wizardData);
    createdFiles.push(blogIndexPath);
    
    // Create individual blog posts
    for (let i = 0; i < blogPages.length; i++) {
      const blogPage = blogPages[i];
      const postContent = blogContent[i] || {};
      
      try {
        const postDate = new Date(blogPage.year, 0, 1);
        postDate.setDate(postDate.getDate() + (i * 30)); // Space posts about a month apart
        
        const frontMatter = {
          title: blogPage.title,
          date: postDate.toISOString(),
          draft: false,
          categories: ['Blog'],
          tags: this.generateBlogTags(wizardData.businessCategory?.id),
          author: wizardData.businessInfo?.name || 'Admin',
          description: postContent.excerpt || `Learn more about ${blogPage.title.toLowerCase()}`
        };
        
        // Apply enhanced front matter configuration for blog posts
        this.applyEnhancedFrontMatter(frontMatter, 'blog', wizardData, postContent, {});
        
        let content = postContent.content || this.generateSampleBlogContent(blogPage.title, wizardData);
        
        const fullContent = this.buildMarkdownFile(frontMatter, content);
        const fullPath = path.join(siteDir, 'content', blogPage.filePath);
        
        await this.fileManager.ensureDir(path.dirname(fullPath));
        await this.fileManager.writeFile(fullPath, fullContent);
        await this.trackContent(fullPath, 'blog_post', frontMatter, true);
        
        createdFiles.push(fullPath);
        console.log(`✅ Blog post created: ${blogPage.title} -> ${blogPage.filePath}`);
        
      } catch (error: any) {
        console.error(`❌ Failed to create blog post ${blogPage.title}: ${error.message}`);
        throw error;
      }
    }
    
    return createdFiles;
  }
  
  /**
   * Add business-category-specific front matter fields using flexible system
   */
  private addBusinessSpecificFields(
    frontMatter: any, 
    wizardData: any, 
    serviceData: any, 
    serviceContent: any
  ): void {
    const businessCategory = wizardData.businessCategory?.id || 'general';
    const subcategory = wizardData.healthcareSubcategory?.id || wizardData.businessSubcategory?.id;
    
    // Generate dynamic front matter based on business category and subcategory
    const dynamicFields = generateDynamicFrontMatter(
      businessCategory, 
      serviceData, 
      serviceContent, 
      subcategory
    );
    
    // Merge dynamic fields into front matter
    Object.assign(frontMatter, dynamicFields);
    
    if (subcategory) {
      console.log(`📋 Added ${businessCategory}/${subcategory} specific fields: ${Object.keys(dynamicFields).join(', ')}`);
    } else {
      console.log(`📋 Added ${businessCategory} specific fields: ${Object.keys(dynamicFields).join(', ')}`);
    }
  }

  /**
   * Apply enhanced front matter configuration to any page
   */
  private applyEnhancedFrontMatter(
    frontMatter: any,
    pageType: string,
    wizardData: any,
    generatedContent: any,
    seoData?: any
  ): void {
    const themeConfig = wizardData.themeConfig || {};
    const businessInfo = wizardData.businessInfo || {};
    const locationInfo = wizardData.locationInfo || {};
    
    console.log(`🎨 Applying enhanced front matter for ${pageType} page`);
    
    // Apply enhanced parameter mapping from backend if available
    if (themeConfig.parameterMapping && Object.keys(themeConfig.parameterMapping).length > 0) {
      console.log(`🎯 Applying enhanced parameter mapping to ${pageType} front matter`);
      Object.assign(frontMatter, themeConfig.parameterMapping);
    }
    
    // Apply healthcare-specific front matter based on page type
    if (pageType === 'homepage') {
      // Homepage-specific enhancements
      frontMatter.hero_title = generatedContent.hero_title || frontMatter.title;
      frontMatter.hero_subtitle = generatedContent.hero_subheadline || businessInfo.description;
      frontMatter.hero_cta_text = themeConfig.features?.includes('appointment-booking') ? 'Book Appointment' : 'Contact Us';
      frontMatter.hero_cta_url = themeConfig.features?.includes('appointment-booking') ? '/appointment' : '/contact';
      frontMatter.show_services_section = true;
      frontMatter.show_testimonials_section = themeConfig.features?.includes('testimonials') || false;
      frontMatter.show_stats_section = businessInfo.category === 'healthcare';
    } else if (pageType === 'about') {
      // About page-specific enhancements
      frontMatter.show_team_section = true;
      frontMatter.show_mission_vision = true;
      frontMatter.show_facility_images = businessInfo.category === 'healthcare';
      frontMatter.establishment_year = businessInfo.establishedYear || new Date().getFullYear();
    } else if (pageType === 'services') {
      // Services page-specific enhancements
      frontMatter.show_service_cards = true;
      frontMatter.show_pricing = themeConfig.features?.includes('pricing') || false;
      frontMatter.show_booking_cta = themeConfig.features?.includes('appointment-booking') || false;
      frontMatter.services_layout = 'grid';
    } else if (pageType === 'contact') {
      // Contact page-specific enhancements
      frontMatter.show_contact_form = true;
      frontMatter.show_map = true;
      frontMatter.show_business_hours = true;
      frontMatter.show_emergency_info = businessInfo.category === 'healthcare';
      frontMatter.contact_phone = locationInfo.contactInfo?.phone || themeConfig.parameterMapping?.contactPhone;
      frontMatter.contact_email = locationInfo.contactInfo?.email || themeConfig.parameterMapping?.contactEmail;
      frontMatter.contact_address = locationInfo.contactInfo?.address || themeConfig.parameterMapping?.businessAddress;
    } else if (pageType === 'blog') {
      // Blog page-specific enhancements
      frontMatter.show_featured_posts = true;
      frontMatter.posts_per_page = 10;
      frontMatter.show_categories = true;
      frontMatter.show_tags = true;
    }
    
    // Universal healthcare enhancements for all pages
    if (businessInfo.category === 'healthcare') {
      frontMatter.is_healthcare = true;
      frontMatter.primary_color = themeConfig.parameterMapping?.primaryColor || '#0369a1';
      frontMatter.secondary_color = themeConfig.parameterMapping?.secondaryColor || '#059669';
      frontMatter.business_name = businessInfo.name || themeConfig.parameterMapping?.businessName;
      frontMatter.business_type = businessInfo.type || 'healthcare';
      
      // Add healthcare-specific schema markup
      frontMatter.schema_type = pageType === 'homepage' ? 'MedicalOrganization' : 'WebPage';
      frontMatter.medical_specialties = wizardData.healthcareInfo?.specialties || [];
    }
    
    // SEO enhancements for all pages
    if (seoData) {
      frontMatter.seo = {
        title: seoData.title || frontMatter.title,
        description: seoData.meta_description || frontMatter.description,
        keywords: seoData.keywords || []
      };
    }
  }

  /**
   * Find matching AI-generated content for a selected service
   * Tries to match by name, then by partial name match
   */
  private findMatchingServiceContent(servicesContent: any[], serviceData: any): any | null {
    if (!servicesContent || !Array.isArray(servicesContent) || !serviceData?.name) {
      return null;
    }
    
    const serviceName = serviceData.name.toLowerCase().trim();
    
    // First, try exact name match
    let match = servicesContent.find((content: any) => {
      const contentName = (content.service_name || content.name || content.title || '').toLowerCase().trim();
      return contentName === serviceName;
    });
    
    if (match) {
      console.log(`🎯 Found exact match for service: ${serviceData.name}`);
      return match;
    }
    
    // Second, try partial name match
    match = servicesContent.find((content: any) => {
      const contentName = (content.service_name || content.name || content.title || '').toLowerCase().trim();
      return contentName.includes(serviceName) || serviceName.includes(contentName);
    });
    
    if (match) {
      console.log(`🎯 Found partial match for service: ${serviceData.name}`);
      return match;
    }
    
    // Third, try keyword matching
    const serviceKeywords = serviceName.split(/\s+/);
    match = servicesContent.find((content: any) => {
      const contentText = [
        content.service_name || '',
        content.name || '',
        content.title || '',
        content.description || '',
        content.headline || ''
      ].join(' ').toLowerCase();
      
      return serviceKeywords.some((keyword: string) => 
        keyword.length > 2 && contentText.includes(keyword)
      );
    });
    
    if (match) {
      console.log(`🎯 Found keyword match for service: ${serviceData.name}`);
      return match;
    }
    
    console.log(`❌ No matching AI content found for service: ${serviceData.name}`);
    return null;
  }
}