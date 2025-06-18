import { PrismaClient, SiteGenerationStatus, Project, SiteGeneration } from '@prisma/client';
import { db } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { webhookService } from './WebhookService';
import { ThemeDetectionService } from './ThemeDetectionService';
import { 
  GenerationStep, 
  GENERATION_STEPS, 
  createGenerationSteps, 
  calculateGenerationProgress,
  validateGenerationOptions,
  GenerationValidationError
} from '../types/generation';
import fs from 'fs-extra';
import * as path from 'path';
import archiver from 'archiver';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as yaml from 'js-yaml';
import axios from 'axios';

const execAsync = promisify(exec);

interface WebhookPayload {
  event: 'started' | 'progress' | 'completed' | 'failed';
  generationId: string;
  projectId: string;
  userId: string;
  status: SiteGenerationStatus;
  progress?: number;
  currentStep?: string;
  timestamp: string;
  data?: any;
}

interface GenerationOptions {
  projectId: string;
  userId: string;
  hugoTheme?: string;
  customizations?: {
    colors?: Record<string, string>;
    fonts?: Record<string, string>;
    layout?: Record<string, any>;
  };
  contentOptions?: {
    aiModel?: string;
    tone?: string;
    length?: 'short' | 'medium' | 'long';
    includeSEO?: boolean;
  };
  autoDetectTheme?: boolean;
}

interface GenerationProgress {
  step: string;
  progress: number;
  message: string;
  details?: any;
}

interface GenerationResult {
  id: string;
  status: SiteGenerationStatus;
  siteUrl?: string;
  fileSize?: number;
  fileCount?: number;
  generationTime?: number;
  errors?: string[];
}

interface AIContentResponse {
  pages: Record<string, {
    title: string;
    content: string;
    meta_description: string;
    keywords?: string[];
  }>;
  seo_data?: any;
}

export class WebsiteGenerationService {
  private prisma: PrismaClient;
  private outputDir: string;
  private themeDetection: ThemeDetectionService;
  private aiEngineUrl: string;

  constructor() {
    this.prisma = db;
    
    if (!this.prisma) {
      throw new Error('Database connection not available. Make sure database is properly configured.');
    }

    this.outputDir = path.join(process.cwd(), 'generated-sites');
    this.themeDetection = new ThemeDetectionService();
    this.aiEngineUrl = process.env.AI_ENGINE_URL || 'http://localhost:8000';
    
    // Ensure output directory exists
    fs.ensureDirSync(this.outputDir);
  }

  /**
   * Start website generation process
   */
  async startGeneration(options: GenerationOptions): Promise<string> {
    const { projectId, userId, hugoTheme, customizations, contentOptions } = options;
    
    try {
      console.log('🎨 Starting theme detection with wizard data');
      console.log('📋 Website type:', options);
      
      // Validate generation options
      const validationResult = validateGenerationOptions(options);
      if (!validationResult.isValid) {
        throw new GenerationValidationError(
          'Invalid generation options',
          validationResult.errors
        );
      }

      if (!this.prisma) {
        throw new AppError('Database connection not available', 500, 'DATABASE_NOT_AVAILABLE');
      }

      // Check if project exists and belongs to user
      console.log(`🔍 Checking project ${projectId} for user ${userId}`);
      
      const project = await this.prisma.project.findFirst({
        where: {
          id: projectId,
          userId: userId,
        },
        include: {
          wizardSteps: true,
        },
      });

      if (!project) {
        throw new AppError('Project not found or access denied', 404, 'PROJECT_NOT_FOUND');
      }

      if (!project.isCompleted) {
        throw new AppError('Project must be completed before generation', 400, 'PROJECT_NOT_COMPLETED');
      }

      // Check for any active generation for this project
      const activeGeneration = await this.prisma.siteGeneration.findFirst({
        where: {
          projectId: projectId,
          status: {
            in: [
              SiteGenerationStatus.PENDING,
              SiteGenerationStatus.INITIALIZING,
              SiteGenerationStatus.BUILDING_STRUCTURE,
              SiteGenerationStatus.APPLYING_THEME,
              SiteGenerationStatus.GENERATING_CONTENT,
              SiteGenerationStatus.BUILDING_SITE,
              SiteGenerationStatus.PACKAGING,
            ],
          },
        },
      });

      if (activeGeneration) {
        throw new AppError('Generation already in progress for this project', 409, 'GENERATION_IN_PROGRESS');
      }

      // Determine Hugo theme
      let finalTheme = hugoTheme || 'ananke';
      
      if (options.autoDetectTheme || !hugoTheme) {
        try {
          console.log('🎯 Auto-detecting theme based on project data...');
          const detectedTheme = await this.themeDetection.detectTheme(project.wizardData);
          if (detectedTheme) {
            finalTheme = detectedTheme;
            console.log(`✅ Theme auto-detected: ${finalTheme}`);
          }
        } catch (themeError) {
          console.warn('⚠️ Theme detection failed, using fallback:', themeError);
        }
      }

      // Create generation record
      const generationId = uuidv4();
      const generation = await this.prisma.siteGeneration.create({
        data: {
          id: generationId,
          projectId: projectId,
          status: SiteGenerationStatus.PENDING,
          hugoTheme: finalTheme,
          customizations: customizations || {},
          contentOptions: contentOptions || {},
          progress: 0,
          currentStep: 'Initializing...',
          startedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      });

      console.log(`✅ Generation record created: ${generationId}`);

      // Send webhook notification for generation started
      await this.sendWebhookNotification({
        event: 'started',
        generationId: generation.id,
        projectId: projectId,
        userId: userId,
        status: SiteGenerationStatus.PENDING,
        timestamp: new Date().toISOString(),
        data: {
          theme: finalTheme,
          customizations,
          contentOptions,
        },
      });

      // Start the actual generation process asynchronously
      setImmediate(() => {
        this.processGeneration(generationId, project, {
          hugoTheme: finalTheme,
          customizations,
          contentOptions,
        }).catch((error) => {
          console.error(`❌ Generation ${generationId} failed:`, error);
        });
      });

      console.log(`✅ Generation queued successfully: ${generationId}`);
      
      return generationId;

    } catch (error) {
      console.error('❌ Failed to start generation:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      if (error instanceof GenerationValidationError) {
        throw new AppError(error.message, 400, 'VALIDATION_ERROR');
      }

      throw new AppError('Failed to start generation', 500, 'GENERATION_START_ERROR');
    }
  }

  /**
   * REAL IMPLEMENTATION - Process generation with actual Hugo site building
   */
  private async processGeneration(
    generationId: string,
    project: Project & { wizardSteps: any[] },
    options: {
      hugoTheme: string;
      customizations?: any;
      contentOptions?: any;
    }
  ): Promise<void> {
    const startTime = Date.now();
    let siteDir = '';
    let generatedContent: AIContentResponse | null = null;

    try {
      // Step 1: Initialize Hugo environment
      await this.updateGenerationProgress(generationId, {
        step: 'Initializing Hugo environment...',
        progress: 5,
        message: 'Checking Hugo CLI and setting up workspace',
      });
      await this.updateStatus(generationId, SiteGenerationStatus.INITIALIZING);

      // Check Hugo installation
      await this.checkHugoInstallation();
      console.log('✅ Hugo CLI verified');

      // Step 2: Analyze project data
      await this.updateGenerationProgress(generationId, {
        step: 'Analyzing project data...',
        progress: 15,
        message: 'Processing wizard configuration and business data',
      });
      
      const projectData = this.parseProjectData(project);
      console.log(`📊 Processed project data for: ${projectData.businessName}`);

      // Step 3: Generate AI content
      await this.updateGenerationProgress(generationId, {
        step: 'Generating AI content...',
        progress: 35,
        message: 'Creating website content with AI',
      });
      await this.updateStatus(generationId, SiteGenerationStatus.GENERATING_CONTENT);

      generatedContent = await this.generateAIContent(projectData, options.contentOptions);
      const pageCount = Object.keys(generatedContent?.pages || {}).length;
      console.log(`🤖 Generated ${pageCount} pages with AI`);

      // Step 4: Create Hugo site structure
      await this.updateGenerationProgress(generationId, {
        step: 'Creating Hugo site structure...',
        progress: 50,
        message: 'Setting up Hugo site files and directories',
      });
      await this.updateStatus(generationId, SiteGenerationStatus.BUILDING_STRUCTURE);

      siteDir = await this.createHugoSite(project.slug || project.id);
      console.log(`📁 Created Hugo site at: ${siteDir}`);

      // Step 5: Install and configure theme
      await this.updateGenerationProgress(generationId, {
        step: 'Installing Hugo theme...',
        progress: 60,
        message: `Installing ${options.hugoTheme} theme`,
      });
      await this.updateStatus(generationId, SiteGenerationStatus.APPLYING_THEME);

      await this.installHugoTheme(siteDir, options.hugoTheme);
      console.log(`🎨 Theme ${options.hugoTheme} installed successfully`);

      // Step 6: Generate site configuration
      await this.updateGenerationProgress(generationId, {
        step: 'Generating site configuration...',
        progress: 70,
        message: 'Creating Hugo config files',
      });

      await this.generateHugoConfig(siteDir, projectData, options);
      console.log('⚙️ Hugo configuration generated');

      // Step 7: Create content files
      await this.updateGenerationProgress(generationId, {
        step: 'Creating content files...',
        progress: 80,
        message: 'Writing content to Hugo markdown files',
      });

      const contentFileCount = await this.createContentFiles(siteDir, generatedContent, projectData);
      console.log(`📝 Created ${contentFileCount} content files`);

      // Step 8: Build Hugo site
      await this.updateGenerationProgress(generationId, {
        step: 'Building Hugo site...',
        progress: 85,
        message: 'Compiling static website with Hugo',
      });
      await this.updateStatus(generationId, SiteGenerationStatus.BUILDING_SITE);

      await this.buildHugoSite(siteDir);
      console.log('🔨 Hugo site built successfully');

      // Step 9: Package website
      await this.updateGenerationProgress(generationId, {
        step: 'Packaging website...',
        progress: 95,
        message: 'Creating downloadable ZIP archive',
      });
      await this.updateStatus(generationId, SiteGenerationStatus.PACKAGING);

      const packageResult = await this.packageWebsite(siteDir, project.slug || project.id);
      console.log(`📦 Package created: ${packageResult.fileName} (${this.formatFileSize(packageResult.fileSize)})`);

      // Step 10: Complete generation
      const generationTime = Date.now() - startTime;
      
      await this.completeGeneration(generationId, {
        siteUrl: packageResult.fileName,
        fileSize: packageResult.fileSize,
        fileCount: packageResult.fileCount,
        generationTime,
      });

      await this.updateGenerationProgress(generationId, {
        step: 'Generation completed successfully!',
        progress: 100,
        message: 'Website is ready for download',
      });

      console.log(`🎉 Real Hugo site generated successfully in ${generationTime}ms`);

      // Cleanup temporary files
      await this.cleanupTempFiles(siteDir);

    } catch (error) {
      console.error(`❌ Generation ${generationId} failed:`, error);
      
      // Cleanup on error
      if (siteDir) {
        await this.cleanupTempFiles(siteDir);
      }
      
      await this.failGeneration(generationId, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Check if Hugo CLI is installed and accessible
   */
  private async checkHugoInstallation(): Promise<void> {
    try {
      const { stdout } = await execAsync('hugo version');
      console.log(`✅ Hugo CLI found: ${stdout.trim()}`);
    } catch (error) {
      throw new Error('Hugo CLI not found. Please install Hugo: https://gohugo.io/installation/');
    }
  }

  /**
   * Parse and structure project data from wizard steps
   */
  private parseProjectData(project: Project & { wizardSteps: any[] }): any {
    const wizardData = project.wizardData || {};
    
    return {
      businessName: wizardData.businessInfo?.name || project.name,
      businessType: wizardData.businessInfo?.type || 'business',
      description: wizardData.businessInfo?.description || project.description,
      industry: wizardData.businessInfo?.industry,
      target_audience: wizardData.targetAudience,
      location: wizardData.businessInfo?.location,
      contact: wizardData.contactInfo,
      features: wizardData.features || [],
      pages: wizardData.pages || ['home', 'about', 'services', 'contact'],
      seo: wizardData.seo || {},
      branding: wizardData.branding || {}
    };
  }

  /**
   * Generate content using AI service
   */
  private async generateAIContent(projectData: any, contentOptions: any): Promise<AIContentResponse> {
    try {
      console.log('🤖 Calling AI service for content generation...');
      
      const response = await axios.post(`${this.aiEngineUrl}/api/v1/content/generate-content`, {
        business_name: projectData.businessName,
        business_type: projectData.businessType,
        industry: projectData.industry,
        description: projectData.description,
        target_audience: projectData.target_audience,
        pages: projectData.pages,
        tone: contentOptions?.tone || 'professional',
        length: contentOptions?.length || 'medium',
        include_seo: contentOptions?.includeSEO || true
      }, {
        timeout: 30000 // 30 seconds timeout
      });

      console.log('✅ AI content generated successfully');
      return response.data;
    } catch (error) {
      console.warn('⚠️ AI content generation failed, using fallback content:', error);
      
      // Fallback content generation
      return this.generateFallbackContent(projectData);
    }
  }

  /**
   * Generate fallback content if AI service is unavailable
   */
  private generateFallbackContent(projectData: any): AIContentResponse {
    console.log('📝 Generating fallback content...');
    
    return {
      pages: {
        home: {
          title: `Welcome to ${projectData.businessName}`,
          content: `# Welcome to ${projectData.businessName}\n\n${projectData.description || 'Your business description here.'}\n\n## Our Services\n\nWe provide excellent services to help you succeed.\n\n## Why Choose Us\n\n- Professional service\n- Experienced team\n- Customer satisfaction\n\n[Contact us today](#contact) to learn more!`,
          meta_description: `${projectData.businessName} - ${projectData.description?.slice(0, 150) || 'Professional services'}`
        },
        about: {
          title: `About ${projectData.businessName}`,
          content: `# About Us\n\n${projectData.description || 'Learn more about our company and mission.'}\n\n## Our Mission\n\nWe are committed to providing excellent service to our customers and helping them achieve their goals.\n\n## Our Values\n\n- **Quality**: We deliver high-quality solutions\n- **Innovation**: We embrace new technologies and methods\n- **Integrity**: We conduct business with honesty and transparency\n- **Customer Focus**: Your success is our priority`,
          meta_description: `Learn more about ${projectData.businessName} and our mission`
        },
        services: {
          title: 'Our Services',
          content: `# Our Services\n\nWe offer a wide range of professional services to meet your needs.\n\n## Service Categories\n\n### Professional Consulting\nExpert advice and guidance for your business needs.\n\n### Expert Solutions\nTailored solutions designed specifically for your requirements.\n\n### Customer Support\nOngoing support to ensure your continued success.\n\n## Get Started\n\nContact us today to discuss how we can help your business grow.`,
          meta_description: `Professional services offered by ${projectData.businessName}`
        },
        contact: {
          title: 'Contact Us',
          content: `# Contact ${projectData.businessName}\n\nGet in touch with us today!\n\n## Contact Information\n\n- **Email:** ${projectData.contact?.email || 'contact@example.com'}\n- **Phone:** ${projectData.contact?.phone || '(555) 123-4567'}\n- **Address:** ${projectData.location || 'Your Address Here'}\n\n## Business Hours\n\n- Monday - Friday: 9:00 AM - 5:00 PM\n- Saturday: 10:00 AM - 2:00 PM\n- Sunday: Closed\n\n## Get In Touch\n\nWe'd love to hear from you. Send us a message and we'll respond as soon as possible.`,
          meta_description: `Contact ${projectData.businessName} for more information`
        }
      }
    };
  }

  /**
   * Create new Hugo site
   */
  private async createHugoSite(siteName: string): Promise<string> {
    const siteDir = path.join(this.outputDir, `${siteName}-${Date.now()}`);
    
    try {
      await execAsync(`hugo new site "${siteDir}"`);
      console.log(`📁 Hugo site created: ${siteDir}`);
      return siteDir;
    } catch (error) {
      throw new Error(`Failed to create Hugo site: ${error}`);
    }
  }

  /**
   * Install Hugo theme
   */
  private async installHugoTheme(siteDir: string, themeName: string): Promise<void> {
    const themesDir = path.join(siteDir, 'themes');
    const themeDir = path.join(themesDir, themeName);
    
    try {
      await fs.ensureDir(themesDir);
      
      // Theme repository URLs
      const themeRepos: Record<string, string> = {
        'ananke': 'https://github.com/theNewDynamic/gohugo-theme-ananke.git',
        'papermod': 'https://github.com/adityatelange/hugo-PaperMod.git',
        'bigspring': 'https://github.com/themefisher/bigspring-hugo.git',
        'restaurant': 'https://github.com/themefisher/restaurant-hugo.git',
        'hargo': 'https://github.com/themefisher/hargo.git',
        'terminal': 'https://github.com/panr/hugo-theme-terminal.git',
        'clarity': 'https://github.com/chipzoller/hugo-clarity.git',
        'mainroad': 'https://github.com/vimux/mainroad.git'
      };

      const repoUrl = themeRepos[themeName] || themeRepos['ananke'];
      
      // Clone theme with shallow clone for faster download
      await execAsync(`git clone --depth 1 "${repoUrl}" "${themeDir}"`);
      
      // Remove .git directory to avoid issues
      const gitDir = path.join(themeDir, '.git');
      if (await fs.pathExists(gitDir)) {
        await fs.remove(gitDir);
      }
      
      console.log(`🎨 Theme ${themeName} installed successfully`);
    } catch (error) {
      throw new Error(`Failed to install theme ${themeName}: ${error}`);
    }
  }

  /**
   * Generate Hugo configuration file
   */
  private async generateHugoConfig(siteDir: string, projectData: any, options: any): Promise<void> {
    const config = {
      baseURL: 'https://example.com',
      languageCode: 'en-us',
      title: projectData.businessName,
      theme: options.hugoTheme,
      
      params: {
        description: projectData.description || `${projectData.businessName} - Professional services`,
        author: projectData.businessName,
        email: projectData.contact?.email || '',
        phone: projectData.contact?.phone || '',
        address: projectData.location || '',
        
        // Apply customizations
        ...(options.customizations?.colors && {
          colors: options.customizations.colors
        }),
        ...(options.customizations?.fonts && {
          fonts: options.customizations.fonts
        })
      },

      menu: {
        main: [
          { name: 'Home', url: '/', weight: 1 },
          { name: 'About', url: '/about/', weight: 2 },
          { name: 'Services', url: '/services/', weight: 3 },
          { name: 'Contact', url: '/contact/', weight: 4 }
        ]
      },

      markup: {
        goldmark: {
          renderer: {
            unsafe: true
          }
        }
      },

      // SEO settings
      enableRobotsTXT: true,
      canonifyURLs: true,
      
      // Performance settings
      minify: {
        disableXML: true,
        minifyOutput: true
      }
    };

    const configPath = path.join(siteDir, 'hugo.yaml');
    await fs.writeFile(configPath, yaml.dump(config), 'utf-8');
    console.log(`⚙️ Hugo configuration written to ${configPath}`);
  }

  /**
   * Create content files from generated content
   */
  private async createContentFiles(siteDir: string, generatedContent: AIContentResponse | null, projectData: any): Promise<number> {
    const contentDir = path.join(siteDir, 'content');
    await fs.ensureDir(contentDir);

    const pages = generatedContent?.pages || {};
    let fileCount = 0;
    
    for (const [pageName, pageData] of Object.entries(pages)) {
      const frontmatter = {
        title: pageData.title,
        date: new Date().toISOString(),
        draft: false,
        description: pageData.meta_description || '',
        keywords: pageData.keywords || [],
        type: pageName === 'home' ? 'page' : 'page'
      };

      const content = `---\n${yaml.dump(frontmatter)}---\n\n${pageData.content}`;
      
      const filePath = pageName === 'home' 
        ? path.join(contentDir, '_index.md')
        : path.join(contentDir, `${pageName}.md`);
      
      await fs.writeFile(filePath, content, 'utf-8');
      console.log(`📝 Created content file: ${path.basename(filePath)}`);
      fileCount++;
    }

    return fileCount;
  }

  /**
   * Build Hugo site
   */
  private async buildHugoSite(siteDir: string): Promise<void> {
    try {
      const { stdout, stderr } = await execAsync('hugo --minify', { 
        cwd: siteDir,
        timeout: 30000 // 30 seconds timeout
      });
      
      console.log(`🔨 Hugo build completed`);
      
      if (stderr && !stderr.includes('WARN')) {
        console.warn(`⚠️ Hugo build warnings: ${stderr}`);
      }
      
      // Verify public directory was created
      const publicDir = path.join(siteDir, 'public');
      if (!(await fs.pathExists(publicDir))) {
        throw new Error('Hugo build did not create public directory');
      }
      
    } catch (error) {
      throw new Error(`Hugo build failed: ${error}`);
    }
  }

  /**
   * Package website into ZIP file
   */
  private async packageWebsite(siteDir: string, projectName: string): Promise<{
    fileName: string;
    fileSize: number;
    fileCount: number;
  }> {
    const publicDir = path.join(siteDir, 'public');
    const fileName = `${projectName}-website-${Date.now()}.zip`;
    const zipPath = path.join(this.outputDir, fileName);

    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { 
        zlib: { level: 9 }, // Maximum compression
        store: true // Use store method for already compressed files
      });

      let fileCount = 0;

      output.on('close', () => {
        const fileSize = archive.pointer();
        console.log(`📦 Package created: ${fileName} (${this.formatFileSize(fileSize)}, ${fileCount} files)`);
        resolve({ fileName, fileSize, fileCount });
      });

      archive.on('error', (err) => {
        reject(new Error(`Packaging failed: ${err.message}`));
      });

      archive.on('entry', () => {
        fileCount++;
      });

      archive.pipe(output);
      archive.directory(publicDir, false);
      archive.finalize();
    });
  }

  /**
   * Cleanup temporary files
   */
  private async cleanupTempFiles(siteDir: string): Promise<void> {
    try {
      if (await fs.pathExists(siteDir)) {
        await fs.remove(siteDir);
        console.log(`🗑️ Cleaned up temporary files: ${path.basename(siteDir)}`);
      }
    } catch (error) {
      console.warn(`⚠️ Failed to cleanup temp files: ${error}`);
    }
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  // ... Keep all existing methods below (updateGenerationProgress, completeGeneration, etc.)

  /**
   * Update generation progress
   */
  async updateGenerationProgress(
    generationId: string,
    progress: GenerationProgress
  ): Promise<void> {
    try {
      if (!this.prisma) {
        throw new AppError('Database connection not available', 500, 'DATABASE_NOT_AVAILABLE');
      }

      await this.prisma.siteGeneration.update({
        where: { id: generationId },
        data: {
          progress: progress.progress,
          currentStep: progress.step,
        },
      });

      // Send webhook notification for progress update
      const generation = await this.prisma.siteGeneration.findUnique({
        where: { id: generationId },
        include: { project: true },
      });

      if (generation) {
        await this.sendWebhookNotification({
          event: 'progress',
          generationId,
          projectId: generation.projectId,
          userId: generation.project.userId,
          status: generation.status,
          progress: progress.progress,
          currentStep: progress.step,
          timestamp: new Date().toISOString(),
          data: progress.details,
        });
      }
    } catch (error) {
      console.error('Failed to update generation progress:', error);
      // Don't throw - progress updates shouldn't stop generation
    }
  }

  /**
   * Update generation status
   */
  private async updateStatus(generationId: string, status: SiteGenerationStatus): Promise<void> {
    try {
      await this.prisma.siteGeneration.update({
        where: { id: generationId },
        data: { status },
      });
    } catch (error) {
      console.error('Failed to update generation status:', error);
    }
  }

  /**
   * Complete generation
   */
  async completeGeneration(
    generationId: string,
    result: Partial<GenerationResult>
  ): Promise<void> {
    try {
      if (!this.prisma) {
        throw new AppError('Database connection not available', 500, 'DATABASE_NOT_AVAILABLE');
      }

      const generation = await this.prisma.siteGeneration.update({
        where: { id: generationId },
        data: {
          status: SiteGenerationStatus.COMPLETED,
          progress: 100,
          currentStep: 'Completed',
          completedAt: new Date(),
          siteUrl: result.siteUrl,
          fileSize: result.fileSize,
          fileCount: result.fileCount,
          generationTime: result.generationTime,
        },
        include: {
          project: true,
        },
      });

      // Send webhook notification for completion
      await this.sendWebhookNotification({
        event: 'completed',
        generationId,
        projectId: generation.projectId,
        userId: generation.project.userId,
        status: SiteGenerationStatus.COMPLETED,
        timestamp: new Date().toISOString(),
        data: {
          siteUrl: result.siteUrl,
          fileSize: result.fileSize,
          fileCount: result.fileCount,
          generationTime: result.generationTime,
        },
      });
    } catch (error) {
      console.error('Failed to complete generation:', error);
      throw new AppError('Failed to complete generation', 500, 'COMPLETION_ERROR');
    }
  }

  /**
   * Fail generation
   */
  async failGeneration(generationId: string, error: string): Promise<void> {
    try {
      if (!this.prisma) {
        throw new AppError('Database connection not available', 500, 'DATABASE_NOT_AVAILABLE');
      }

      const generation = await this.prisma.siteGeneration.update({
        where: { id: generationId },
        data: {
          status: SiteGenerationStatus.FAILED,
          progress: 0,
          currentStep: 'Generation failed',
          completedAt: new Date(),
          errorLog: error,
        },
        include: {
          project: true,
        },
      });

      // Send webhook notification for failure
      await this.sendWebhookNotification({
        event: 'failed',
        generationId,
        projectId: generation.projectId,
        userId: generation.project.userId,
        status: SiteGenerationStatus.FAILED,
        timestamp: new Date().toISOString(),
        data: {
          error,
        },
      });
    } catch (dbError) {
      console.error('Failed to mark generation as failed:', dbError);
      throw new AppError('Failed to update generation status', 500, 'FAILURE_UPDATE_ERROR');
    }
  }

  /**
   * Get generation status
   */
  async getGenerationStatus(generationId: string, userId: string): Promise<any> {
    try {
      if (!this.prisma) {
        throw new AppError('Database connection not available', 500, 'DATABASE_NOT_AVAILABLE');
      }

      const generation = await this.prisma.siteGeneration.findFirst({
        where: {
          id: generationId,
          project: {
            userId: userId,
          },
        },
        include: {
          project: true,
        },
      });

      if (!generation) {
        throw new AppError('Generation not found', 404, 'GENERATION_NOT_FOUND');
      }

      return {
        id: generation.id,
        projectId: generation.projectId,
        status: generation.status,
        progress: generation.progress || 0,
        currentStep: generation.currentStep || 'Processing...',
        startedAt: generation.startedAt,
        completedAt: generation.completedAt,
        siteUrl: generation.siteUrl,
        fileSize: generation.fileSize,
        fileCount: generation.fileCount,
        generationTime: generation.generationTime,
        expiresAt: generation.expiresAt,
        errorLog: generation.errorLog,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get generation status', 500, 'GENERATION_STATUS_ERROR');
    }
  }

  /**
   * Get generation history for user
   */
  async getGenerationHistory(
    userId: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<any> {
    try {
      if (!this.prisma) {
        throw new AppError('Database connection not available', 500, 'DATABASE_NOT_AVAILABLE');
      }

      const skip = (page - 1) * pageSize;

      const [generations, total] = await Promise.all([
        this.prisma.siteGeneration.findMany({
          where: {
            project: {
              userId: userId,
            },
          },
          include: {
            project: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
          orderBy: {
            startedAt: 'desc',
          },
          skip,
          take: pageSize,
        }),
        this.prisma.siteGeneration.count({
          where: {
            project: {
              userId: userId,
            },
          },
        }),
      ]);

      const results = generations.map((gen) => ({
        id: gen.id,
        projectId: gen.projectId,
        projectName: gen.project.name,
        projectSlug: gen.project.slug,
        status: gen.status,
        progress: gen.progress || 0,
        currentStep: gen.currentStep || 'Processing...',
        startedAt: gen.startedAt,
        completedAt: gen.completedAt,
        generationTime: gen.generationTime,
        fileSize: gen.fileSize,
        fileCount: gen.fileCount,
        siteUrl: gen.siteUrl,
        expiresAt: gen.expiresAt,
        errorLog: gen.errorLog,
      }));

      return {
        generations: results,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (error) {
      throw new AppError('Failed to get generation history', 500, 'GENERATION_HISTORY_ERROR');
    }
  }

  /**
   * Download generated website
   */
  async downloadGeneration(generationId: string, userId: string): Promise<{
    filePath: string;
    fileName: string;
    mimeType: string;
  }> {
    try {
      if (!this.prisma) {
        throw new AppError('Database connection not available', 500, 'DATABASE_NOT_AVAILABLE');
      }

      const generation = await this.prisma.siteGeneration.findFirst({
        where: {
          id: generationId,
          project: {
            userId: userId,
          },
          status: SiteGenerationStatus.COMPLETED,
        },
        include: {
          project: true,
        },
      });

      if (!generation) {
        throw new AppError('Generation not found or not completed', 404, 'GENERATION_NOT_AVAILABLE');
      }

      if (generation.expiresAt && generation.expiresAt < new Date()) {
        throw new AppError('Download link has expired', 410, 'DOWNLOAD_EXPIRED');
      }

      if (!generation.siteUrl) {
        throw new AppError('Generated site file not found', 404, 'SITE_FILE_NOT_FOUND');
      }

      const filePath = path.join(this.outputDir, generation.siteUrl);
      
      if (!(await fs.pathExists(filePath))) {
        throw new AppError('Generated site file not found on disk', 404, 'SITE_FILE_MISSING');
      }

      return {
        filePath,
        fileName: `${generation.project.slug}-website.zip`,
        mimeType: 'application/zip',
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to download generation', 500, 'GENERATION_DOWNLOAD_ERROR');
    }
  }

  /**
   * Cancel ongoing generation
   */
  async cancelGeneration(generationId: string, userId: string): Promise<void> {
    try {
      if (!this.prisma) {
        throw new AppError('Database connection not available', 500, 'DATABASE_NOT_AVAILABLE');
      }

      const generation = await this.prisma.siteGeneration.findFirst({
        where: {
          id: generationId,
          project: {
            userId: userId,
          },
          status: {
            in: [
              SiteGenerationStatus.PENDING,
              SiteGenerationStatus.INITIALIZING,
              SiteGenerationStatus.BUILDING_STRUCTURE,
              SiteGenerationStatus.APPLYING_THEME,
              SiteGenerationStatus.GENERATING_CONTENT,
              SiteGenerationStatus.BUILDING_SITE,
              SiteGenerationStatus.PACKAGING,
            ],
          },
        },
      });

      if (!generation) {
        throw new AppError('Generation not found or cannot be cancelled', 404, 'GENERATION_NOT_CANCELLABLE');
      }

      await this.prisma.siteGeneration.update({
        where: { id: generationId },
        data: {
          status: SiteGenerationStatus.FAILED,
          progress: 0,
          currentStep: 'Cancelled by user',
          errorLog: 'Generation cancelled by user',
          completedAt: new Date(),
        },
      });

      // Send webhook notification
      await this.sendWebhookNotification({
        event: 'failed',
        generationId,
        projectId: generation.projectId,
        userId,
        status: SiteGenerationStatus.FAILED,
        timestamp: new Date().toISOString(),
        data: {
          reason: 'cancelled_by_user',
        },
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to cancel generation', 500, 'GENERATION_CANCEL_ERROR');
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(payload: WebhookPayload): Promise<void> {
    try {
      await webhookService.sendWebhook(payload);
    } catch (error) {
      console.error('Failed to send webhook notification:', error);
      // Don't throw - webhook failures shouldn't stop generation
    }
  }

  /**
   * Utility method to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Utility method to capitalize strings
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

export const websiteGenerationService = new WebsiteGenerationService();