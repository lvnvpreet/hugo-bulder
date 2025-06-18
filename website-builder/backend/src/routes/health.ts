import { Router, Request, Response } from 'express';
import { ProjectService } from '../services/ProjectService';
import { validateParams } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { projectSchemas } from '../validation/projectSchemas';

const router = Router();
const projectService = new ProjectService();

// Extend Request interface for user
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    name?: string;
    plan: string;
    emailVerified: boolean;
  };
  params: {
    projectId: string;
  };
}

// GET /health/generation-readiness/:projectId - Check if project is ready for generation
router.get(
  '/generation-readiness/:projectId',
  validateParams(projectSchemas.healthProjectId),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      console.log('🏥 Health check request received');
      console.log('📋 Request params:', req.params);
      console.log('👤 User:', req.user?.id || 'No user');
      
      const { projectId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        console.log('❌ No user ID found in request');
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
          data: { ready: false, reason: 'User not authenticated' }
        });
      }

      console.log('🔍 Looking for project:', { projectId, userId });
      const project = await projectService.getProject(projectId, userId);
        if (!project) {
        return res.status(404).json({ 
          success: false, 
          error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found' },
          data: { ready: false, reason: 'Project not found' }
        });
      }const readiness = {
        ready: project.isCompleted,
        projectId: project.id,
        isCompleted: project.isCompleted,
        hasWizardData: !!project.wizardData,
        wizardDataComplete: project.wizardData ? 
          (projectService as any).isWizardDataComplete(project.wizardData) : false
      };

      return res.json({
        success: true,
        data: readiness
      });    } catch (error) {
      console.error('Health check failed:', error);
      return res.status(500).json({ 
        success: false, 
        error: { code: 'HEALTH_CHECK_FAILED', message: 'Health check failed' },
        data: { ready: false, reason: 'Health check failed' }
      });
    }
  })
);

// GET /health/system - General system health check
router.get('/system', asyncHandler(async (req: Request, res: Response) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    res.json(health);
  } catch (error) {
    console.error('System health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'System health check failed'
    });
  }
}));

export default router;
