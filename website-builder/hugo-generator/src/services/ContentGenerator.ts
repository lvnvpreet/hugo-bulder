import * as path from 'path';
import * as yaml from 'js-yaml';
import { HugoCLI } from './HugoCLI';
import { FileManager } from '../utils/FileManager';

export class ContentGenerator {
  private hugoCLI: HugoCLI;
  private fileManager: FileManager;
  
  constructor(hugoCLI: HugoCLI) {
    this.hugoCLI = hugoCLI;
    this.fileManager = new FileManager();
  }
  
  // Main content generation method
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
  }> {
    try {
      const createdFiles: string[] = [];
      const errors: string[] = [];
      
      console.log('Starting content generation...');
      
      // Generate homepage content
      if (generatedContent.homepage) {
        const homepageFile = await this.generateHomepage(
          siteDir, 
          generatedContent.homepage, 
          seoData?.homepage,
          wizardData
        );
        createdFiles.push(homepageFile);
      }
      
      // Generate about page
      if (generatedContent.about) {
        const aboutFile = await this.generateAboutPage(
          siteDir,
          generatedContent.about,
          seoData?.about,
          wizardData
        );
        createdFiles.push(aboutFile);
      }
      
      // Generate services content
      if (generatedContent.services && wizardData.selectedServices) {
        const serviceFiles = await this.generateServicesContent(
          siteDir,
          generatedContent.services,
          seoData?.services,
          wizardData.selectedServices,
          structure
        );
        createdFiles.push(...serviceFiles);
      }
      
      // Generate contact page
      if (generatedContent.contact) {
        const contactFile = await this.generateContactPage(
          siteDir,
          generatedContent.contact,
          seoData?.contact,
          wizardData
        );
        createdFiles.push(contactFile);
      }
      
      // Generate blog posts if applicable
      if (generatedContent.blog_posts && this.hasBlogStructure(structure)) {
        const blogFiles = await this.generateBlogPosts(
          siteDir,
          generatedContent.blog_posts,
          wizardData
        );
        createdFiles.push(...blogFiles);
      }
      
      console.log(`Content generation completed. Created ${createdFiles.length} files.`);
      
      return {
        success: errors.length === 0,
        createdFiles,
        errors
      };
      
    } catch (error: any) {
      return {
        success: false,
        createdFiles: [],
        errors: [error.message]
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
      
      // Create services index page
      const servicesIndexPath = await this.generateServicesIndex(
        siteDir,
        servicesContent,
        seoData,
        selectedServices
      );
      createdFiles.push(servicesIndexPath);
      
      // Create individual service pages (for multi-page sites)
      if (structure.type === 'multi-page') {
        for (let i = 0; i < servicesContent.length; i++) {
          const serviceContent = servicesContent[i];
          const serviceData = selectedServices[i];
          
          if (serviceContent && serviceData) {
            const servicePage = await this.generateServicePage(
              siteDir,
              serviceContent,
              serviceData,
              seoData
            );
            createdFiles.push(servicePage);
          }
        }
      }
      
      return createdFiles;
      
    } catch (error: any) {
      throw new Error(`Services content generation failed: ${error.message}`);
    }
  }
  
  private async generateServicesIndex(
    siteDir: string,
    servicesContent: any[],
    seoData: any,
    selectedServices: any[]
  ): Promise<string> {
    const frontMatter = {
      title: 'Our Services',
      description: 'Comprehensive services to meet your needs',
      type: 'services',
      layout: 'services',
      draft: false
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
          content += `\n`;
        }
        
        // Link to detailed page for multi-page sites
        const serviceSlug = this.slugify(serviceData.name);
        content += `[Learn More About ${serviceData.name}](/services/${serviceSlug}/)\n\n`;
        content += `---\n\n`;
      }
    });
    
    const fullContent = this.buildMarkdownFile(frontMatter, content);
    const filePath = path.join(siteDir, 'content', 'services', '_index.md');
    
    await this.fileManager.ensureDir(path.dirname(filePath));
    await this.fileManager.writeFile(filePath, fullContent);
    
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
