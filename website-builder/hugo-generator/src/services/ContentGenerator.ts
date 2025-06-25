import * as path from 'path';
import * as yaml from 'js-yaml';
import { HugoCLI } from './HugoCLI';
import { FileManager } from '../utils/FileManager';

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
  // Add content tracking
  private contentTracker: ContentTrackingInfo[] = [];
  
  constructor(hugoCLI: HugoCLI) {
    this.hugoCLI = hugoCLI;
    this.fileManager = new FileManager();
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
            structure
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
      const frontMatter = {
        title: seoData?.title || wizardData.businessInfo?.name || 'Welcome',
        description: seoData?.meta_description || homepageContent.hero_description,
        type: 'page',
        layout: 'home',
        draft: false,
        seo: {
          title: seoData?.title,
          description: seoData?.meta_description,
          keywords: seoData?.keywords || []
        }
      };
      
      const content = this.buildHomepageContent(homepageContent, wizardData);
      const fullContent = this.buildMarkdownFile(frontMatter, content);
      
      const filePath = path.join(siteDir, 'content', '_index.md');
      await this.fileManager.writeFile(filePath, fullContent);
      await this.trackContent(filePath, 'homepage', frontMatter, true);
      
      console.log('Homepage content generated');
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
      const frontMatter = {
        title: 'About Us',
        description: seoData?.meta_description || 'Learn more about our company',
        type: 'page',
        layout: 'single',
        draft: false
      };
      
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
      
      const fullContent = this.buildMarkdownFile(frontMatter, content);
      const filePath = path.join(siteDir, 'content', 'about.md');
      
      await this.fileManager.writeFile(filePath, fullContent);
      await this.trackContent(filePath, 'about_page', frontMatter, true);
      
      console.log('About page content generated');
      return filePath;
      
    } catch (error: any) {
      throw new Error(`About page generation failed: ${error.message}`);
    }
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
  
  private buildHomepageContent(homepageContent: any, wizardData: any): string {
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
    structure: any
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
      
      // Create individual service pages based on requirements
      if (shouldCreateIndividualPages) {
        console.log(`📄 Creating ${selectedServices.length} individual service pages...`);
        
        for (let i = 0; i < Math.min(servicesContent.length, selectedServices.length); i++) {
          const serviceContent = servicesContent[i];
          const serviceData = selectedServices[i];
          
          if (serviceContent && serviceData) {
            try {              const servicePage = await this.generateServicePage(
                siteDir,
                serviceContent,
                serviceData,
                seoData
              );
              createdFiles.push(servicePage);
              console.log(`✅ Service page created: ${serviceData.name} -> ${servicePage}`);
            } catch (serviceError: any) {
              console.error(`❌ Failed to create service page for ${serviceData.name}: ${serviceError.message}`);
              // Continue with other services instead of failing completely
            }
          }
        }
      } else {
        console.log(`📋 Single-page structure: All services included in index page only`);
      }
      
      // Handle case where more services selected than content generated
      if (selectedServices.length > servicesContent.length) {
        console.warn(`⚠️  Warning: ${selectedServices.length} services selected but only ${servicesContent.length} content pieces generated`);
      }
      
      console.log(`🎉 Dynamic services generation completed: ${createdFiles.length} files created`);
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
  ): Promise<string> {    const frontMatter = {
      title: 'Our Services',
      description: seoData?.meta_description || 'Comprehensive services to meet your needs',
      type: 'services',
      layout: 'services',
      draft: false,
      services_count: selectedServices.length,
      has_individual_pages: hasIndividualPages
    };
    
    let content = `# Our Services\n\nWe offer a comprehensive range of professional services to meet your needs.\n\n`;
    
    // Add service summaries
    servicesContent.forEach((serviceContent: any, index: number) => {
      const serviceData = selectedServices[index];
      if (serviceContent && serviceData) {
        content += `## ${serviceContent.headline || serviceData.name}\n\n`;
        content += `${serviceContent.description || serviceData.description}\n\n`;
        
        if (serviceContent.benefits && Array.isArray(serviceContent.benefits)) {
          content += `### Key Benefits:\n\n`;
          serviceContent.benefits.forEach((benefit: string) => {
            content += `- ${benefit}\n`;
          });
          content += `\n`;        }
        
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
          if (serviceContent.process && Array.isArray(serviceContent.process)) {
            content += `### How It Works:\n\n`;
            serviceContent.process.forEach((step: string, stepIndex: number) => {
              content += `${stepIndex + 1}. ${step}\n`;
            });
            content += `\n`;
          }
        }
        
        content += `---\n\n`;      }
    });
    
    // Handle case where user selected more services than AI generated content
    if (selectedServices.length > servicesContent.length) {
      const missingServices = selectedServices.slice(servicesContent.length);
      content += `## Additional Services\n\n`;
      
      missingServices.forEach((serviceData: any) => {
        content += `### ${serviceData.name}\n\n`;
        content += `${serviceData.description || 'Professional service tailored to your needs.'}\n\n`;
        if (serviceData.pricing) {
          content += `**Starting at:** ${serviceData.pricing}\n\n`;
        }
        content += `---\n\n`;
      });
    }
    
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
    seoData: any
  ): Promise<string> {
    const serviceSlug = this.slugify(serviceData.name);
    
    const frontMatter = {
      title: serviceContent.headline || serviceData.name,
      description: serviceContent.description || serviceData.description,
      type: 'service',
      layout: 'single',
      draft: false,
      service: {
        name: serviceData.name,
        category: serviceData.category,
        pricing: serviceData.pricing
      }
    };
    
    let content = `# ${serviceContent.headline || serviceData.name}\n\n`;
    content += `${serviceContent.description || serviceData.description}\n\n`;
    
    // Benefits section
    if (serviceContent.benefits && Array.isArray(serviceContent.benefits)) {
      content += `## Benefits\n\n`;
      serviceContent.benefits.forEach((benefit: string) => {
        content += `- ${benefit}\n`;
      });
      content += `\n`;
    }
    
    // Process section
    if (serviceContent.process && Array.isArray(serviceContent.process)) {
      content += `## How It Works\n\n`;
      serviceContent.process.forEach((step: string, index: number) => {
        content += `${index + 1}. ${step}\n`;
      });
      content += `\n`;
    }
    
    // Call to action
    if (serviceContent.cta) {
      content += `## Get Started\n\n${serviceContent.cta}\n\n`;
      content += `[Contact Us Today](/contact/)\n\n`;
    }
    
    const fullContent = this.buildMarkdownFile(frontMatter, content);
    const filePath = path.join(siteDir, 'content', 'services', `${serviceSlug}.md`);
    
    await this.fileManager.ensureDir(path.dirname(filePath));
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
    const filePath = path.join(siteDir, 'content', 'posts', '_index.md');
    
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
    const filePath = path.join(siteDir, 'content', 'posts', `${postSlug}.md`);
    
    await this.fileManager.ensureDir(path.dirname(filePath));
    await this.fileManager.writeFile(filePath, fullContent);
    await this.trackContent(filePath, 'blog_post', frontMatter, true);
    
    return filePath;
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
}
