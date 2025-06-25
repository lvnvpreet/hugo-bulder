// File: backend/src/services/WebsiteGenerationService.ts
// Updated to integrate with your Ollama-based AI engine

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
import { g } from 'vitest/dist/suite-dWqIFb_-';

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

interface OllamaContentResponse {
  pages: Record<string, {
    title: string;
    content: string;
    meta_description: string;
    keywords?: string[];
    seo_title?: string;
    word_count?: number;
  }>;
  seo_data?: any;
  generation_time?: number;
  model_used?: string;
  word_count_total?: number;
  generation_id?: string;
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
    // Updated to use port 8000 for Ollama AI engine
    this.aiEngineUrl = process.env.AI_ENGINE_URL || 'http://localhost:8000';
    
    // Ensure output directory exists
    fs.ensureDirSync(this.outputDir);
  }

  /**
   * Start website generation process
   */  async startGeneration(options: GenerationOptions): Promise<string> {
    const { projectId, userId, hugoTheme, customizations, contentOptions } = options;
    
    console.log('🚀 [DEBUG] ===== START GENERATION SERVICE =====');
    console.log('🚀 [DEBUG] Generation options received:', JSON.stringify(options, null, 2));
    console.log('🚀 [DEBUG] Project ID:', projectId);
    console.log('🚀 [DEBUG] User ID:', userId);
    console.log('🚀 [DEBUG] Hugo theme requested:', hugoTheme);
    console.log('🚀 [DEBUG] Auto detect theme:', options.autoDetectTheme);
    console.log('🚀 [DEBUG] Customizations:', JSON.stringify(customizations, null, 2));
    console.log('🚀 [DEBUG] Content options:', JSON.stringify(contentOptions, null, 2));
    
    try {      console.log('🚀 [DEBUG] Starting theme detection with wizard data');
      console.log('📋 Website type:', options);
      
      // Validate generation options
      console.log('✅ [DEBUG] Validating generation options...');
      const validationResult = validateGenerationOptions(options);
      
      console.log('✅ [DEBUG] Validation result:', {
        isValid: validationResult.isValid,
        errorCount: validationResult.errors?.length || 0,
        errors: validationResult.errors
      });
      
      if (!validationResult.isValid) {
        console.error('❌ [DEBUG] Validation failed:', validationResult.errors);
        throw new GenerationValidationError(
          'Invalid generation options',
          validationResult.errors.join(', ')
        );
      }

      if (!this.prisma) {
        console.error('❌ [DEBUG] Database connection not available');
        throw new AppError('Database connection not available', 500, 'DATABASE_NOT_AVAILABLE');
      }

      // Check if project exists and belongs to user
      console.log(`🔍 [DEBUG] Checking project ${projectId} for user ${userId}`);
      console.log(`🔍 [DEBUG] Making database query for project...`);      
      const project = await this.prisma.project.findFirst({
        where: {
          id: projectId,
          userId: userId,
        },
        include: {
          wizardSteps: true,
        },
      });

      console.log(`🔍 [DEBUG] Database query completed`);
      console.log(`🔍 [DEBUG] Project found:`, !!project);
      
      if (project) {
        console.log(`🔍 [DEBUG] Project details:`, {
          id: project.id,
          name: project.name,
          isCompleted: project.isCompleted,
          userId: project.userId,
          hasWizardData: !!project.wizardData,
          wizardStepsCount: project.wizardSteps?.length || 0,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt
        });
      }

      if (!project) {
        console.error(`❌ [DEBUG] Project not found - projectId: ${projectId}, userId: ${userId}`);
        throw new AppError('Project not found or access denied', 404, 'PROJECT_NOT_FOUND');
      }

      if (!project.isCompleted) {
        console.error(`❌ [DEBUG] Project not completed:`, {
          projectId: project.id,
          isCompleted: project.isCompleted,
          hasWizardData: !!project.wizardData,
          wizardDataType: typeof project.wizardData
        });
        throw new AppError('Project must be completed before generation', 400, 'PROJECT_NOT_COMPLETED');
      }      // Check for any active generation for this project
      console.log(`🔍 [DEBUG] Checking for active generations for project ${projectId}...`);
      
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

      console.log(`🔍 [DEBUG] Active generation check result:`, {
        hasActiveGeneration: !!activeGeneration,
        activeGenerationId: activeGeneration?.id,
        activeGenerationStatus: activeGeneration?.status
      });

      if (activeGeneration) {
        console.error(`❌ [DEBUG] Generation already in progress:`, {
          generationId: activeGeneration.id,
          status: activeGeneration.status,
          startedAt: activeGeneration.startedAt
        });
        throw new AppError('Generation already in progress for this project', 409, 'GENERATION_IN_PROGRESS');
      }      // Determine Hugo theme
      console.log(`🎨 [DEBUG] Determining Hugo theme...`);
      console.log(`🎨 [DEBUG] Requested theme:`, hugoTheme);
      console.log(`🎨 [DEBUG] Auto detect theme:`, options.autoDetectTheme);
      
      let finalTheme = hugoTheme || 'ananke';
      
      if (options.autoDetectTheme || !hugoTheme) {
        try {
          console.log('🎯 [DEBUG] Auto-detecting theme based on project data...');
          console.log('🎯 [DEBUG] Project wizardData type:', typeof project.wizardData);
          
          const detectedTheme = await this.themeDetection.detectTheme(project.wizardData);
          
          console.log('🎯 [DEBUG] Theme detection result:', detectedTheme);
            if (detectedTheme) {
            finalTheme = typeof detectedTheme === 'string' ? detectedTheme : detectedTheme.themeId || 'ananke';
            console.log(`✅ [DEBUG] Theme auto-detected: ${finalTheme}`);
          } else {
            console.log(`⚠️ [DEBUG] No theme detected, using fallback: ${finalTheme}`);
          }
        } catch (themeError) {
          console.error('❌ [DEBUG] Theme detection failed:', {
            error: themeError,
            message: themeError instanceof Error ? themeError.message : String(themeError),
            stack: themeError instanceof Error ? themeError.stack : undefined
          });
          console.warn(`⚠️ [DEBUG] Using fallback theme: ${finalTheme}`);
        }
      }
      
      console.log(`🎨 [DEBUG] Final theme selected: ${finalTheme}`);      // Create generation record
      console.log(`📝 [DEBUG] Creating generation record...`);
      const generationId = uuidv4();
      console.log(`📝 [DEBUG] Generated ID: ${generationId}`);
      
      const generationData = {
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
      };
      
      console.log(`📝 [DEBUG] Generation data to create:`, JSON.stringify(generationData, null, 2));
      
      const generation = await this.prisma.siteGeneration.create({
        data: generationData,
      });

      console.log(`✅ [DEBUG] Generation record created successfully:`, {
        id: generation.id,
        projectId: generation.projectId,
        status: generation.status,
        theme: generation.hugoTheme,
        startedAt: generation.startedAt
      });

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
      
      return generationId;    } catch (error) {
      console.log('🚨 [DEBUG] ===== START GENERATION ERROR =====');
      console.error('❌ [DEBUG] Failed to start generation:', error);
      console.log('🚨 [DEBUG] Error type:', typeof error);
      console.log('🚨 [DEBUG] Error constructor:', error instanceof Error ? error.constructor.name : 'Unknown');
      
      if (error instanceof Error) {
        console.log('🚨 [DEBUG] Error message:', error.message);
        console.log('🚨 [DEBUG] Error stack:', error.stack);
      }
      
      if (error instanceof AppError) {
        console.log('🚨 [DEBUG] AppError details:', {
          message: error.message,
          statusCode: error.statusCode,
          code: error.code
        });
        throw error;
      }
        if (error instanceof GenerationValidationError) {
        console.log('🚨 [DEBUG] Validation error details:', {
          message: error.message,
          code: error.code,
          details: error.details
        });
        throw new AppError(error.message, 400, 'VALIDATION_ERROR');
      }

      throw new AppError('Failed to start generation', 500, 'GENERATION_START_ERROR');
    }
  }

  /**
   * REAL IMPLEMENTATION - Process generation with actual Hugo site building and Ollama AI
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
    let generatedContent: OllamaContentResponse | null = null;

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

      // Step 3: Generate AI content using Ollama
      await this.updateGenerationProgress(generationId, {
        step: 'Generating AI content with Ollama...',
        progress: 35,
        message: 'Creating website content using local AI models',
      });
      await this.updateStatus(generationId, SiteGenerationStatus.GENERATING_CONTENT);

      generatedContent = await this.generateOllamaContent(projectData, options.contentOptions);
      const pageCount = Object.keys(generatedContent?.pages || {}).length;
      console.log(`🤖 Generated ${pageCount} pages with Ollama (Model: ${generatedContent?.model_used || 'unknown'})`);

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

      await this.generateHugoConfig(siteDir, projectData, options, generatedContent?.seo_data);
      console.log('⚙️ Hugo configuration generated');

      // Step 7: Create content files
      await this.updateGenerationProgress(generationId, {
        step: 'Creating content files...',
        progress: 80,
        message: 'Writing AI-generated content to Hugo markdown files',
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
        message: `Website ready for download (${generatedContent?.word_count_total || 0} words generated)`,
      });      console.log(`🎉 Real Hugo site generated successfully in ${generationTime}ms`);
      console.log(`📈 Total words generated: ${generatedContent?.word_count_total || 0}`);      // Cleanup temporary files - DISABLED
      // await this.cleanupTempFiles(siteDir);

    } catch (error) {
      console.error(`❌ Generation ${generationId} failed:`, error);
      
      // Cleanup on error - DISABLED
      // if (siteDir) {
      //   await this.cleanupTempFiles(siteDir);
      // }
      
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
   */  private parseProjectData(project: Project & { wizardSteps: any[] }): any {
    // Cast wizardData to any to avoid TypeScript errors with the dynamic structure
    const wizardData = project.wizardData as any || {};
    
    return {
      businessName: wizardData?.businessInfo?.name || project.name,
      businessType: wizardData?.websiteType?.id || wizardData?.businessInfo?.type || 'business',
      description: wizardData?.businessInfo?.description || project.description,
      industry: wizardData?.businessCategory?.id || wizardData?.businessInfo?.industry || 'general',
      target_audience: wizardData?.businessDescription?.targetAudience || 'general',
      location: wizardData?.businessInfo?.location || wizardData?.contactInfo?.address,
      contact: wizardData?.contactInfo || {},
      features: wizardData?.selectedFeatures || wizardData?.features || [],
      pages: ['home', 'about', 'services', 'contact'], // Standard pages
      seo: wizardData?.additionalRequirements?.seoFocus || wizardData?.seo || {},
      branding: wizardData?.themeConfig || wizardData?.branding || {}
    };
  }
  /**
   * Generate content using Ollama AI service
   */  private async generateOllamaContent(projectData: any, contentOptions: any): Promise<OllamaContentResponse> {
    try {
      console.log('🤖 Calling Ollama AI service for content generation...');
      console.log(`📡 AI Engine URL: ${this.aiEngineUrl}`);
      
      // Check if AI engine is available with shorter timeout
      console.log('🔍 Performing AI engine health check...');
      const healthCheck = await axios.get(`${this.aiEngineUrl}/api/v1/health`, {
        timeout: 30000, // 30 seconds timeout for health check
        maxRedirects: 0, // Disable redirects
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Hugo-Builder-Backend/1.0'
        }
      });
      
      console.log(`✅ AI Engine health check passed: ${healthCheck.data.status}`);
      console.log(`🔧 Health check response time: ${healthCheck.headers['x-process-time'] || 'unknown'}`);
      
      // Start content generation
      console.log('🎯 Starting content generation...');
      const startTime = Date.now();
      
      const startResponse = await axios.post(`${this.aiEngineUrl}/api/v1/content/generate-content`, {
        business_name: projectData.businessName,
        business_type: projectData.businessType,
        industry: projectData.industry,
        description: projectData.description,
        target_audience: projectData.target_audience,
        pages: projectData.pages,
        tone: contentOptions?.tone || 'professional',
        length: contentOptions?.length || 'medium',
        include_seo: contentOptions?.includeSEO || true,
        model: contentOptions?.aiModel // Allow model selection
      }, {
        timeout: 60000, // 1 minute timeout for starting generation
        maxRedirects: 0,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Hugo-Builder-Backend/1.0'
        }
      });
      
      const generationId = startResponse.data.generation_id;
      console.log(`🎯 Content generation started with ID: ${generationId}`);
        // Now poll for completion
      console.log('🔄 Polling for content generation completion...');
      let attempts = 0;
      const maxAttempts = 600; // 20 minutes max (600 * 2 seconds) - increased from 5 minutes
      let lastStatus = 'unknown';
      
      while (attempts < maxAttempts) {
        try {
          // Check status
          const statusResponse = await axios.get(`${this.aiEngineUrl}/api/v1/content/status/${generationId}`, {
            timeout: 10000, // 10 seconds timeout for status check
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Hugo-Builder-Backend/1.0'
            }
          });
          
          const status = statusResponse.data.status;
          const progress = statusResponse.data.progress || 0;
          const currentStep = statusResponse.data.current_step || 'Processing...';
          
          if (status !== lastStatus) {
            console.log(`📊 AI Generation Status: ${status} (${progress.toFixed(1)}%) - ${currentStep}`);
            lastStatus = status;
          }
          
          if (status === 'completed') {
            console.log('✅ AI content generation completed! Fetching results...');
            
            // Get the final result
            const resultResponse = await axios.get(`${this.aiEngineUrl}/api/v1/content/result/${generationId}`, {
              timeout: 30000,
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'Hugo-Builder-Backend/1.0'
              }
            });
            
            const result = resultResponse.data;
            
            console.log(`⏱️ Content generation completed in ${Date.now() - startTime}ms`);
            console.log('✅ Ollama AI content generated successfully');
            console.log(`📊 Generation stats: ${Object.keys(result.pages).length} pages generated`);
            
            return {
              pages: result.pages,
              generation_time: (Date.now() - startTime) / 1000,
              model_used: result.metadata?.model_used || 'unknown',
              word_count_total: this.calculateWordCount(result.pages),
              generation_id: generationId
            };
          } else if (status === 'failed') {
            throw new Error(`AI content generation failed: ${statusResponse.data.error || 'Unknown error'}`);
          }
          
          // Wait 2 seconds before next check
          await new Promise(resolve => setTimeout(resolve, 2000));
          attempts++;
          
        } catch (statusError) {
          console.error(`❌ Error checking AI generation status (attempt ${attempts + 1}):`, statusError);
          
          // If we can't check status, wait a bit and try again
          await new Promise(resolve => setTimeout(resolve, 2000));
          attempts++;
        }
      }
      
      throw new Error('AI content generation timed out after 20 minutes');
        
    } catch (error) {
      console.error('❌ Ollama AI content generation failed:', error);
      
      if (axios.isAxiosError(error)) {
        console.error(`🚨 Axios Error Details:`);
        console.error(`   Code: ${error.code}`);
        console.error(`   Message: ${error.message}`);
        console.error(`   URL: ${error.config?.url}`);
        console.error(`   Method: ${error.config?.method?.toUpperCase()}`);
        console.error(`   Timeout: ${error.config?.timeout}ms`);
        
        if (error.response) {
          console.error(`   Response Status: ${error.response.status}`);
          console.error(`   Response Headers:`, error.response.headers);
        } else if (error.request) {
          console.error(`   No response received`);
          console.error(`   Request timeout or network error`);
        }
      }
      
      // Fallback content generation
      console.log('📝 Using fallback content generation...');
      return this.generateFallbackContent(projectData);
    }
  }

  /**
   * Generate fallback content if AI service is unavailable
   */
  private generateFallbackContent(projectData: any): OllamaContentResponse {
    console.log('📝 Generating high-quality fallback content...');
    
    return {
      pages: {
        home: {
          title: `Welcome to ${projectData.businessName}`,
          content: `# Welcome to ${projectData.businessName}

${projectData.description || 'Your trusted partner for professional services.'}

## What We Do

At ${projectData.businessName}, we specialize in delivering exceptional ${projectData.businessType} services that help our clients achieve their goals. Our team of experienced professionals is dedicated to providing innovative solutions tailored to your specific needs.

### Our Key Services

- **Professional Consulting**: Expert guidance for your business challenges
- **Custom Solutions**: Tailored approaches that fit your unique requirements  
- **Ongoing Support**: Comprehensive support throughout your journey
- **Results-Driven**: Focused on delivering measurable outcomes

## Why Choose ${projectData.businessName}?

- ✅ **Proven Expertise**: Years of experience in ${projectData.industry || 'the industry'}
- ✅ **Client-Focused**: Your success is our priority
- ✅ **Quality Assurance**: Commitment to excellence in everything we do
- ✅ **Competitive Pricing**: Value-driven solutions that fit your budget

## Ready to Get Started?

Contact us today to discuss how ${projectData.businessName} can help transform your business.

[Get in Touch](#contact) | [Learn More About Us](#about)`,
          meta_description: `${projectData.businessName} - Professional ${projectData.businessType} services. Expert solutions tailored to your needs. Contact us today!`,
          keywords: [projectData.businessName.toLowerCase(), projectData.businessType.toLowerCase(), 'professional services', 'expert solutions'],
          word_count: 200
        },
        about: {
          title: `About ${projectData.businessName}`,
          content: `# About ${projectData.businessName}

## Our Story

${projectData.businessName} was founded with a simple mission: to provide exceptional ${projectData.businessType} services that truly make a difference. We understand that every business is unique, which is why we take the time to understand your specific needs and challenges.

## Our Mission

To empower businesses with innovative solutions and expert guidance that drive sustainable growth and success.

## Our Values

### Excellence
We are committed to delivering the highest quality in everything we do. Our attention to detail and dedication to excellence sets us apart.

### Innovation  
We stay ahead of industry trends and continuously evolve our approaches to provide cutting-edge solutions.

### Integrity
Honest, transparent communication builds trust. We believe in doing the right thing, even when no one is watching.

### Partnership
We don't just work for you – we work with you. Your success is our success, and we're invested in your long-term growth.

## Our Team

Our team consists of highly skilled professionals with extensive experience in ${projectData.industry || 'various industries'}. We combine technical expertise with creative problem-solving to deliver results that exceed expectations.

## Our Commitment

When you choose ${projectData.businessName}, you're choosing a partner committed to your success. We take pride in building long-lasting relationships based on trust, reliability, and exceptional results.`,
          meta_description: `Learn about ${projectData.businessName}'s mission, values, and commitment to delivering exceptional ${projectData.businessType} services.`,
          keywords: ['about us', projectData.businessName.toLowerCase(), 'company mission', 'our team', 'values'],
          word_count: 250
        },
        services: {
          title: 'Our Services',
          content: `# Our Services

At ${projectData.businessName}, we offer a comprehensive range of ${projectData.businessType} services designed to meet your unique needs and drive your business forward.

## Core Services

### Strategic Consulting
Our expert consultants work with you to develop comprehensive strategies that align with your business objectives and market opportunities.

**What's Included:**
- Business analysis and assessment
- Strategic planning and roadmap development
- Market research and competitive analysis
- Implementation guidance and support

### Custom Solutions Development
We create tailored solutions specifically designed for your business requirements and industry challenges.

**Key Features:**
- Customized approach for each client
- Scalable solutions that grow with your business
- Integration with existing systems
- Ongoing optimization and refinement

### Professional Support Services
Comprehensive support to ensure your continued success and optimal performance.

**Support Includes:**
- Technical assistance and troubleshooting
- Regular performance monitoring
- Updates and maintenance
- Training and knowledge transfer

### Performance Optimization
We help you maximize efficiency and effectiveness across all aspects of your operations.

**Optimization Areas:**
- Process improvement and automation
- Resource allocation and management
- Quality assurance and control
- Performance metrics and reporting

## Industry Expertise

We have extensive experience serving clients in ${projectData.industry || 'various industries'}, giving us deep insights into sector-specific challenges and opportunities.

## Getting Started

Ready to explore how our services can benefit your business? Contact us for a consultation to discuss your specific needs and learn how we can help you achieve your goals.

[Schedule a Consultation](#contact) | [View Case Studies](#portfolio)`,
          meta_description: `Comprehensive ${projectData.businessType} services from ${projectData.businessName}. Strategic consulting, custom solutions, and professional support.`,
          keywords: ['services', projectData.businessType.toLowerCase(), 'consulting', 'solutions', 'support'],
          word_count: 300
        },
        contact: {
          title: 'Contact Us',
          content: `# Contact ${projectData.businessName}

Ready to take the next step? We'd love to hear from you and discuss how we can help your business succeed.

## Get In Touch

Whether you have a specific project in mind or just want to learn more about our services, we're here to help. Our team is ready to provide the expert guidance and support you need.

### Contact Information

- **Email:** ${projectData.contact?.email || 'info@example.com'}
- **Phone:** ${projectData.contact?.phone || '(555) 123-4567'}
- **Address:** ${projectData.location || 'Your Business Address'}

### Business Hours

- **Monday - Friday:** 9:00 AM - 6:00 PM
- **Saturday:** 10:00 AM - 2:00 PM  
- **Sunday:** Closed

*For urgent matters outside business hours, please send an email and we'll respond as soon as possible.*

## What Happens Next?

When you contact us, here's what you can expect:

1. **Initial Consultation** - We'll schedule a call to understand your needs and objectives
2. **Proposal Development** - We'll create a customized proposal outlored to your requirements  
3. **Project Planning** - Together, we'll develop a detailed project timeline and approach
4. **Implementation** - Our team will work closely with you to deliver exceptional results

## Service Areas

We proudly serve clients ${projectData.location ? `in ${projectData.location} and surrounding areas` : 'nationwide'}, with both on-site and remote service options available.

## Quick Response Guarantee

We understand that business moves fast. That's why we guarantee a response to all inquiries within 24 hours during business days.

**Ready to get started?** Use the contact information above or fill out our online contact form to begin your journey with ${projectData.businessName}.

*We look forward to partnering with you for success!*`,
          meta_description: `Contact ${projectData.businessName} for professional ${projectData.businessType} services. Quick response guaranteed. Get your free consultation today.`,
          keywords: ['contact', projectData.businessName.toLowerCase(), 'consultation', 'get in touch', 'business hours'],
          word_count: 280
        }
      },
      seo_data: {
        site_title: projectData.businessName,
        site_description: `${projectData.businessName} - Professional ${projectData.businessType} services. Expert solutions tailored to your business needs.`,
        main_keywords: [projectData.businessName.toLowerCase(), projectData.businessType.toLowerCase(), 'professional services'],
        robots: 'index, follow',
        og_type: 'website'
      },
      generation_time: 0.1,
      model_used: 'fallback-content-generator',
      word_count_total: 1030,
      generation_id: 'fallback-' + Date.now()
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
  private async generateHugoConfig(
    siteDir: string, 
    projectData: any, 
    options: any, 
    seoData?: any
  ): Promise<void> {
    const config = {
      baseURL: 'https://example.com',
      languageCode: 'en-us',
      title: seoData?.site_title || projectData.businessName,
      theme: options.hugoTheme,
      
      params: {
        description: seoData?.site_description || projectData.description || `${projectData.businessName} - Professional services`,
        author: projectData.businessName,
        email: projectData.contact?.email || '',
        phone: projectData.contact?.phone || '',
        address: projectData.location || '',
        keywords: seoData?.main_keywords || [projectData.businessName.toLowerCase(), projectData.businessType.toLowerCase()],
        
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
  private async createContentFiles(
    siteDir: string, 
    generatedContent: OllamaContentResponse | null, 
    projectData: any
  ): Promise<number> {
    const contentDir = path.join(siteDir, 'content');
    await fs.ensureDir(contentDir);

    console.log(generatedContent);

    const pages = generatedContent?.pages || {};
    let fileCount = 0;
    
    for (const [pageName, pageData] of Object.entries(pages)) {
      const frontmatter = {
        title: pageData.title,
        date: new Date().toISOString(),
        draft: false,
        description: pageData.meta_description || '',
        keywords: pageData.keywords || [],
        type: 'page',
        seo_title: pageData.seo_title || pageData.title,
        word_count: pageData.word_count || 0
      };

      console.log(pageData)

      const content = `---\n${yaml.dump(frontmatter)}---\n\n${pageData.content}`;

      console.log(content);

      const filePath = pageName === 'home' 
        ? path.join(contentDir, '_index.md')
        : path.join(contentDir, `${pageName}.md`);
      
      console.log(`📝 Writing content for ${pageName} to ${filePath}`);

      await fs.writeFile(filePath, content, 'utf-8');
      console.log(`📝 Created content file: ${path.basename(filePath)} (${pageData.word_count || 0} words)`);
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
        timeout: 60000 // 1 minute timeout
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

  /**
   * Calculate total word count from generated pages
   */
  private calculateWordCount(pages: Record<string, any>): number {
    let totalWords = 0;
    
    for (const pageContent of Object.values(pages)) {
      if (pageContent && typeof pageContent === 'object' && pageContent.content) {
        // Simple word count - split by whitespace and filter empty strings
        const words = pageContent.content.toString().split(/\s+/).filter((word: string) => word.length > 0);
        totalWords += words.length;
      }
    }
    
    return totalWords;
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