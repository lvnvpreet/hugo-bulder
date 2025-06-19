import axios, { AxiosInstance } from 'axios';

export class ServiceCommunication {
  private aiEngineUrl: string;
  private hugoGeneratorUrl: string;
  private httpClient: AxiosInstance;
  
  constructor() {
    this.aiEngineUrl = process.env.AI_ENGINE_URL || 'http://ai-engine:3002';
    this.hugoGeneratorUrl = process.env.HUGO_GENERATOR_URL || 'http://hugo-generator:3003';
      this.httpClient = axios.create({
      timeout: 1200000, // 20 minutes timeout for AI operations (increased from 5 minutes)
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    this.setupInterceptors();
  }
  
  // AI Engine Communication
  async requestContentGeneration(projectData: any): Promise<{
    generationId: string;
    content?: any;
    status: string;
    error?: string;
  }> {
    try {
      console.log('Requesting AI content generation...');
      
      const response = await this.httpClient.post(
        `${this.aiEngineUrl}/generation/start`,
        {
          project_id: projectData.projectId,
          user_id: projectData.userId,
          wizard_data: projectData.wizardData,
          options: {
            regenerateContent: false,
            priorityGeneration: false
          }
        }
      );
      
      const generationId = response.data.generation_id;
      
      // Poll for completion
      const finalResult = await this.pollGenerationStatus(generationId);
      
      return {
        generationId,
        content: finalResult.content,
        status: finalResult.status,
        error: finalResult.errors?.join(', ')
      };
      
    } catch (error: any) {
      console.error('AI content generation failed:', error.message);
      
      return {
        generationId: '',
        status: 'failed',
        error: error.message
      };
    }
  }
  
  private async pollGenerationStatus(
    generationId: string,
    maxAttempts: number = 60,
    intervalMs: number = 5000
  ): Promise<any> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await this.httpClient.get(
          `${this.aiEngineUrl}/generation/status/${generationId}`
        );
        
        const status = response.data;
        
        console.log(`AI Generation Progress: ${status.progress}% - ${status.current_step}`);
        
        if (status.status === 'completed') {
          return status;
        } else if (status.status === 'failed') {
          throw new Error(`AI generation failed: ${status.errors?.join(', ') || 'Unknown error'}`);
        }
        
        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, intervalMs));
        
      } catch (error: any) {
        if (attempt === maxAttempts - 1) {
          throw error;
        }
        
        console.warn(`AI status poll attempt ${attempt + 1} failed:`, error.message);
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }
    
    throw new Error('AI generation timeout - no response after maximum attempts');
  }
  
  // Hugo Generator Communication
  async requestSiteGeneration(generationRequest: any): Promise<{
    success: boolean;
    siteUrl?: string;
    buildLog: string[];
    buildTime: number;
    errors: string[];
    metadata: any;
  }> {
    try {
      console.log('Requesting Hugo site generation...');
      
      const response = await this.httpClient.post(
        `${this.hugoGeneratorUrl}/generation/generate`,
        generationRequest,
        {
          timeout: 180000 // 3 minutes for Hugo build
        }
      );
      
      console.log('Hugo site generation completed');
      return response.data;
      
    } catch (error: any) {
      console.error('Hugo site generation failed:', error.message);
      
      return {
        success: false,
        siteUrl: undefined,
        buildLog: [`Hugo generation failed: ${error.message}`],
        buildTime: 0,
        errors: [error.message],
        metadata: {}
      };
    }
  }
  
  // Service Health Checks
  async checkServiceHealth(): Promise<{
    backend: boolean;
    aiEngine: boolean;
    hugoGenerator: boolean;
    overall: 'healthy' | 'degraded' | 'unhealthy';
  }> {    const results = {
      backend: true, // Current service
      aiEngine: false,
      hugoGenerator: false,
      overall: 'unhealthy' as 'healthy' | 'degraded' | 'unhealthy'
    };
    
    try {
      // Check AI Engine
      const aiResponse = await this.httpClient.get(
        `${this.aiEngineUrl}/health`,
        { timeout: 5000 }
      );
      results.aiEngine = aiResponse.status === 200;
    } catch (error: any) {
      console.warn('AI Engine health check failed:', error.message);
    }
    
    try {
      // Check Hugo Generator
      const hugoResponse = await this.httpClient.get(
        `${this.hugoGeneratorUrl}/health`,
        { timeout: 5000 }
      );
      results.hugoGenerator = hugoResponse.status === 200;
    } catch (error: any) {
      console.warn('Hugo Generator health check failed:', error.message);
    }
    
    // Determine overall health
    const healthyServices = Object.values(results).filter(Boolean).length;
    if (healthyServices === 3) {
      results.overall = 'healthy';
    } else if (healthyServices >= 2) {
      results.overall = 'degraded';
    } else {
      results.overall = 'unhealthy';
    }
    
    return results;
  }
  
  // Utility Methods
  private setupInterceptors(): void {
    // Request interceptor
    this.httpClient.interceptors.request.use(
      (config) => {
        config.headers['X-Request-ID'] = this.generateRequestId();
        config.headers['X-Timestamp'] = new Date().toISOString();
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // Response interceptor
    this.httpClient.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('Service communication error:', {
          url: error.config?.url,
          status: error.response?.status,
          message: error.message
        });
        return Promise.reject(error);
      }
    );
  }
  
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
