import { Router, Request, Response } from 'express';
import { ProjectService } from '../services/ProjectService';
import { validate, validateQuery, validateParams } from '../middleware/validation';
import { projectRateLimit } from '../middleware/rateLimit';
import { asyncHandler } from '../middleware/errorHandler';
import { projectSchemas } from '../validation/projectSchemas';

const router = Router();
const projectService = new ProjectService();

// Use regular project service for all users
const getProjectService = (userId?: string) => {
  console.log('Using regular project service for user:', userId);
  return projectService;
};

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
    id: string;
    step?: string;
  };
}

// GET /projects - List user projects with pagination
router.get(
  '/',
  validateQuery(projectSchemas.listProjects),  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { generationStatus, websiteType, limit, offset } = req.query as any;
    
    const userId = req.user.id;
    const service = getProjectService(userId);
    
    const result = await service.getProjects(userId, {
      generationStatus,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });

    res.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      }
    });
  })
);

// POST /projects - Create new project
router.post(
  '/',
  projectRateLimit,
  validate(projectSchemas.createProject),  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.id;
    console.log('Creating project for user:', userId);
    console.log('Request body:', req.body);
    
    const service = getProjectService(userId);
    const project = await service.createProject(userId, req.body);

    res.status(201).json({
      success: true,
      data: project,
      message: 'Project created successfully',
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      }
    });
  })
);

// GET /projects/:id - Get single project with wizard data
router.get(
  '/:id',
  validateParams(projectSchemas.projectId),  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.id;
    const service = getProjectService(userId);
    const project = await service.getProject(req.params.id, userId);

    if (!project) {
      res.status(404).json({
        success: false,
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: 'Project not found'
        }
      });
      return;
    }

    res.json({
      success: true,
      data: project,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      }
    });
  })
);

// PUT /projects/:id - Update project metadata
router.put(
  '/:id',
  validateParams(projectSchemas.projectId),
  validate(projectSchemas.updateProject),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const project = await projectService.updateProject(req.params.id, req.user.id, req.body);

    res.json({
      success: true,
      data: project,
      message: 'Project updated successfully',
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      }
    });
  })
);

// DELETE /projects/:id - Delete project
router.delete(
  '/:id',
  validateParams(projectSchemas.projectId),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const success = await projectService.deleteProject(req.params.id, req.user.id);

    res.json({
      success,
      message: 'Project deleted successfully',
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      }
    });
  })
);

// POST /projects/:id/duplicate - Duplicate existing project
router.post(
  '/:id/duplicate',
  projectRateLimit,
  validateParams(projectSchemas.projectId),
  validate(projectSchemas.duplicateProject),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { name } = req.body;
    const project = await projectService.duplicateProject(req.params.id, req.user.id, name);

    res.status(201).json({
      success: true,
      data: project,
      message: 'Project duplicated successfully',
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      }
    });
  })
);

// Wizard data routes

// PUT /projects/:id/wizard/:step - Save wizard step data
router.put(
  '/:id/wizard/:step',
  validateParams(projectSchemas.wizardStepParams),
  validate(projectSchemas.wizardStepData),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const stepNumber = parseInt(req.params.step || '1');
    const wizardStep = await projectService.saveWizardStep(
      req.params.id,
      req.user.id,
      stepNumber,
      req.body
    );

    res.json({
      success: true,
      data: wizardStep,
      message: `Step ${stepNumber} saved successfully`,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      }
    });
  })
);

// GET /projects/:id/wizard - Get complete wizard data
router.get(
  '/:id/wizard',
  validateParams(projectSchemas.projectId),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const wizardData = await projectService.getWizardData(req.params.id, req.user.id);

    res.json({
      success: true,
      data: wizardData,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      }
    });
  })
);

// POST /projects/:id/wizard/validate/:step - Validate step data
router.post(
  '/:id/wizard/validate/:step',
  validateParams(projectSchemas.wizardStepParams),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const stepNumber = parseInt(req.params.step || '1');
      // Get project data for context
    const project = await projectService.getProject(req.params.id, req.user.id);
    
    const validation = await projectService.validateWizardStep(
      req.params.id,
      req.user.id,
      stepNumber,
      req.body
    );

    res.json({
      success: true,
      data: validation,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      }
    });
  })
);

// GET /projects/:id/analytics - Get project analytics
router.get(
  '/:id/analytics',
  validateParams(projectSchemas.projectId),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Verify project ownership first
    const project = await projectService.getProject(req.params.id, req.user.id);
    if (!project) {
      res.status(404).json({
        success: false,
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: 'Project not found'
        }
      });
      return;
    }

    const analytics = await projectService.getProjectAnalytics(req.params.id);

    res.json({
      success: true,
      data: analytics,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      }
    });
  })
);

export default router;