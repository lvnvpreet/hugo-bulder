import { ServiceCommunication } from './ServiceCommunication';
import { ProjectService } from './ProjectService';
import { ThemeBridgeService } from './ThemeBridgeService';
import Bull, { Queue } from 'bull';

interface ExtendedProjectData {
  generationStatus?: string;
  lastGeneratedAt?: Date;
  hugoSiteUrl?: string;
  name?: string;
  description?: string;
}

export class GenerationOrchestrator {
  private serviceCommunication: ServiceCommunication;
  private projectService: ProjectService;
  private themeBridgeService: ThemeBridgeService;
  private generationQueue!: Queue;
  
  constructor() {
    this.serviceCommunication = new ServiceCommunication();
    this.projectService = new ProjectService();
    this.themeBridgeService = new ThemeBridgeService();
    this.setupGenerationQueue();
  }
  
  // Main orchestration method
  async orchestrateWebsiteGeneration(
    projectId: string,
    userId: string,
    options: any = {}
  ): Promise<{
    generationId: string;
    status: string;
  }> {
    try {
      // Create generation record
      const generation = await this.createGenerationRecord(projectId, userId);
      
      // Add to queue for processing
      await this.generationQueue.add('generateWebsite', {
        generationId: generation.id,
        projectId,
        userId,
        options
      }, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 10000
        }
      });
      
      return {
        generationId: generation.id,
        status: 'queued'
      };
      
    } catch (error: any) {
      throw new Error(`Generation orchestration failed: ${error.message}`);
    }
  }
  
  // Process generation job
  async processGenerationJob(job: any): Promise<void> {
    const { generationId, projectId, userId, options } = job.data;
    
    try {
      // Update status
      await this.updateGenerationStatus(generationId, 'starting', 0);
      
      // Step 1: Get project data
      const project = await this.projectService.getProject(projectId, userId);
      if (!project) {
        throw new Error('Project not found');
      }
      
      await this.updateGenerationStatus(generationId, 'analyzing_requirements', 10);
      
      // Step 2: Request AI content generation
      const aiResult = await this.serviceCommunication.requestContentGeneration({
        projectId,
        userId,
        wizardData: project.wizardData
      });
      
      if (aiResult.status !== 'completed' || !aiResult.content) {
        throw new Error(`AI content generation failed: ${aiResult.error}`);
      }
      
      await this.updateGenerationStatus(generationId, 'content_generated', 60);
      
      // Step 2.5: Enhanced theme detection and configuration
      console.log('🎨 Performing enhanced theme detection...');
      const enhancedThemeConfig = await this.themeBridgeService.getEnhancedThemeConfig(project.wizardData);
      
      console.log(this.themeBridgeService.getThemeDetectionSummary(project.wizardData, enhancedThemeConfig));
      
      // Step 3: Request Hugo site generation with enhanced theme config
      const hugoRequest = {
        projectId,
        projectData: project.wizardData,
        generatedContent: aiResult.content.content,
        themeConfig: {
          id: enhancedThemeConfig.selectedTheme.id,
          name: enhancedThemeConfig.selectedTheme.name,
          displayName: enhancedThemeConfig.selectedTheme.displayName,
          isLocal: enhancedThemeConfig.selectedTheme.isLocal,
          githubUrl: enhancedThemeConfig.selectedTheme.githubUrl,
          features: enhancedThemeConfig.supportedFeatures,
          parameterMapping: enhancedThemeConfig.parameterMapping,
          pageLayouts: enhancedThemeConfig.pageLayouts,
          selectionReason: enhancedThemeConfig.selectionReason,
          compatibilityScore: enhancedThemeConfig.compatibilityScore
        },
        themeMetadata: {
          validation: enhancedThemeConfig.validation,
          detectionSummary: this.themeBridgeService.getThemeDetectionSummary(project.wizardData, enhancedThemeConfig)
        },
        seoData: aiResult.content.seo,
        structure: aiResult.content.structure
      };
      
      await this.updateGenerationStatus(generationId, 'building_site', 70);
      
      const hugoResult = await this.serviceCommunication.requestSiteGeneration(hugoRequest);
      
      if (!hugoResult.success) {
        throw new Error(`Hugo site generation failed: ${hugoResult.errors.join(', ')}`);
      }
      
      await this.updateGenerationStatus(generationId, 'packaging', 90);
      
      // Step 4: Update final status
      await this.updateGenerationStatus(generationId, 'completed', 100, {
        siteUrl: hugoResult.siteUrl,
        buildTime: hugoResult.buildTime,
        metadata: hugoResult.metadata
      });      // Update project with generated site URL
      await this.projectService.updateProject(projectId, userId, {
        name: project.name, // Keep existing name
        description: project.description // Keep existing description
      } as any);
      
      // Update project status via direct database call if needed
      console.log(`Updating project ${projectId} with generation results:`, {
        generationStatus: 'COMPLETED',
        hugoSiteUrl: hugoResult.siteUrl,
        buildTime: hugoResult.buildTime
      });
      
      console.log(`Website generation completed for project ${projectId}`);
      
    } catch (error: any) {
      console.error(`Generation failed for ${generationId}:`, error.message);
      
      await this.updateGenerationStatus(generationId, 'failed', 0, {
        error: error.message
      });
      
      throw error;
    }
  }
  
  private setupGenerationQueue(): void {
    this.generationQueue = new Bull('website generation', {
      redis: {
        host: process.env.REDIS_HOST || 'redis',
        port: parseInt(process.env.REDIS_PORT || '6379')
      }
    });
    
    // Process jobs
    this.generationQueue.process('generateWebsite', 2, this.processGenerationJob.bind(this));
    
    // Error handling
    this.generationQueue.on('failed', (job, err) => {
      console.error(`Generation job ${job.id} failed:`, err.message);
    });
    
    this.generationQueue.on('completed', (job) => {
      console.log(`Generation job ${job.id} completed successfully`);
    });
  }
  
  private async createGenerationRecord(projectId: string, userId: string): Promise<any> {
    // Implementation depends on your database schema
    // Return generation record with ID
    return {
      id: `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      projectId,
      userId,
      status: 'pending',
      createdAt: new Date()
    };
  }
  
  private async updateGenerationStatus(
    generationId: string,
    status: string,
    progress: number,
    metadata?: any
  ): Promise<void> {
    // Update generation status in database
    // Emit WebSocket events for real-time updates
    console.log(`Generation ${generationId}: ${status} (${progress}%)`);
  }

  // Public methods for external access
  async getGenerationStatus(generationId: string): Promise<any> {
    // Retrieve generation status from database
    return {
      id: generationId,
      status: 'processing',
      progress: 50,
      currentStep: 'content_generation'
    };
  }

  async cancelGeneration(generationId: string): Promise<boolean> {
    try {
      // Find and remove job from queue
      const jobs = await this.generationQueue.getJobs(['waiting', 'active']);
      const job = jobs.find(j => j.data.generationId === generationId);
      
      if (job) {
        await job.remove();
        await this.updateGenerationStatus(generationId, 'cancelled', 0);
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error(`Failed to cancel generation ${generationId}:`, error.message);
      return false;
    }
  }
}
