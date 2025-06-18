import { Router, Request, Response, NextFunction } from 'express';
import { validate, validateQuery, validateParams } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { websiteGenerationService } from '../services/WebsiteGenerationService';
import { ProjectService } from '../services/ProjectService';
import { ThemeDetectionService } from '../services/ThemeDetectionService';
import { generationSchemas } from '../validation/generationSchemas';
import { db } from '../config/database';
import * as fs from 'fs-extra';

// Define AuthenticatedRequest interface
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    name?: string;
    plan: string;
    emailVerified: boolean;
  };
}

const router = Router();
const projectService = new ProjectService();

// POST /generations/:projectId/start - Start website generation
/**
 * @swagger
 * /api/generations/{projectId}/start:
 *   post:
 *     summary: Start website generation
 *     description: Initiate the website generation process for a project using AI and Hugo static site generator
 *     tags: [Website Generation]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID to generate website for
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - hugoTheme
 *             properties:
 *               hugoTheme:
 *                 type: string
 *                 description: Hugo theme ID to use for generation
 *                 example: "ananke"
 *               customizations:
 *                 type: object
 *                 properties:
 *                   colors:
 *                     type: object
 *                     properties:
 *                       primary:
 *                         type: string
 *                         pattern: '^#[0-9A-Fa-f]{6}$'
 *                       secondary:
 *                         type: string
 *                         pattern: '^#[0-9A-Fa-f]{6}$'
 *                   fonts:
 *                     type: object
 *                     properties:
 *                       heading:
 *                         type: string
 *                       body:
 *                         type: string
 *                   layout:
 *                     type: object
 *                     description: Layout customizations
 *                 description: Theme customization options
 *               contentOptions:
 *                 type: object
 *                 properties:
 *                   generateSampleContent:
 *                     type: boolean
 *                     default: true
 *                   contentTone:
 *                     type: string
 *                     enum: [professional, friendly, creative, technical, casual]
 *                   includeImages:
 *                     type: boolean
 *                     default: true
 *                   seoOptimized:
 *                     type: boolean
 *                     default: true
 *                 description: Content generation options
 *     responses:
 *       202:
 *         description: Website generation started successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         generationId:
 *                           type: string
 *                           description: Unique ID for tracking generation progress
 *                         status:
 *                           type: string
 *                           enum: [PENDING]
 *                           example: PENDING
 *                         message:
 *                           type: string
 *                           example: Website generation started successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Project not found
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post(
  '/:projectId/start',
  // Add detailed logging before validation
  (req: Request, res: Response, next: NextFunction) => {
    console.log('🔍 RAW REQUEST DATA:');
    console.log('  - Method:', req.method);
    console.log('  - URL:', req.url);
    console.log('  - Params:', req.params);
    console.log('  - Body:', JSON.stringify(req.body, null, 2));
    console.log('  - Headers:', {
      'content-type': req.headers['content-type'],
      'authorization': req.headers.authorization ? '***PROVIDED***' : 'MISSING'
    });
    next();
  },
  validateParams(generationSchemas.projectId),
  validate(generationSchemas.startGeneration),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { projectId } = req.params;
      const userId = req.user.id;

      console.log('Generation request for project:', projectId, 'user:', userId);
      console.log('Request body:', req.body);

      // Verify project exists and user owns it
      const project = await projectService.getProject(projectId!, userId);

      if (!project) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'PROJECT_NOT_FOUND',
            message: 'Project not found or access denied',
            details: { projectId, userId }
          }
        });
      }

      // Check if project is completed
      if (!project.isCompleted) {
        console.log(`❌ Project ${projectId} is not completed:`, {
          isCompleted: project.isCompleted,
          hasWizardData: !!project.wizardData
        });

        return res.status(400).json({
          success: false,
          error: {
            code: 'PROJECT_NOT_COMPLETED',
            message: 'Project must be completed before generation can start',
            details: {
              projectId,
              isCompleted: project.isCompleted,
              hasWizardData: !!project.wizardData,
              suggestion: 'Complete all wizard steps or call /projects/:id/complete endpoint'
            }
          }
        });      }      // Proceed with generation...
      const generationId = await websiteGenerationService.startGeneration({
        projectId: projectId!,
        userId,
        hugoTheme: req.body.hugoTheme,
        autoDetectTheme: req.body.autoDetectTheme,
        customizations: req.body.customizations,
        contentOptions: req.body.contentOptions,
      });

      return res.status(202).json({
        success: true,
        data: { generationId },
        message: 'Generation started successfully',
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    } catch (error: any) {
      console.error('❌ Generation start failed:', error);
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        response: error?.response?.data
      });
      return res.status(500).json({
        success: false,
        error: { code: 'GENERATION_START_FAILED', message: 'Failed to start generation' }
      });
    }
  })
);

// GET /generations/:generationId/status - Get generation status
/**
 * @swagger
 * /api/generations/{generationId}/status:
 *   get:
 *     summary: Get generation status
 *     description: Check the current status and progress of a website generation process
 *     tags: [Website Generation]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: generationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Generation ID to check status for
 *     responses:
 *       200:
 *         description: Generation status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           description: Generation ID
 *                         projectId:
 *                           type: string
 *                           description: Associated project ID
 *                         status:
 *                           type: string
 *                           enum: [PENDING, GENERATING_CONTENT, BUILDING_SITE, PACKAGING, COMPLETED, FAILED, EXPIRED]
 *                           description: Current generation status
 *                         progress:
 *                           type: integer
 *                           minimum: 0
 *                           maximum: 100
 *                           description: Progress percentage
 *                         currentStep:
 *                           type: string
 *                           description: Description of current processing step
 *                         startedAt:
 *                           type: string
 *                           format: date-time
 *                           description: When generation started
 *                         completedAt:
 *                           type: string
 *                           format: date-time
 *                           description: When generation completed (if finished)
 *                         estimatedTimeRemaining:
 *                           type: integer
 *                           description: Estimated time remaining in seconds
 *                         siteUrl:
 *                           type: string
 *                           format: uri
 *                           description: Download URL (if completed)
 *                         fileSize:
 *                           type: integer
 *                           description: Generated site size in bytes
 *                         buildLog:
 *                           type: string
 *                           description: Build process log
 *                         errorLog:
 *                           type: string
 *                           description: Error log (if failed)
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Generation not found
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  '/:generationId/status',
  validateParams(generationSchemas.generationId),
  validateQuery(generationSchemas.generationStatusQuery), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const generationId = req.params.generationId!;

    // Get generation status through the service
    try {
      const result = await websiteGenerationService.getGenerationStatus(
        generationId,
        req.user.id
      );

      res.json({
        success: true,
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    } catch (error) {
      console.error('Failed to get generation status:', error);
      res.status(404).json({
        success: false,
        error: {
          code: 'GENERATION_NOT_FOUND',
          message: 'Generation not found or access denied'
        }
      });
    }
  })
);

// GET /generations - Get generation history
/**
 * @swagger
 * /api/generations:
 *   get:
 *     summary: Get generation history
 *     description: Retrieve a paginated list of website generations for the authenticated user
 *     tags: [Website Generation]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of generations per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, GENERATING_CONTENT, BUILDING_SITE, PACKAGING, COMPLETED, FAILED, EXPIRED]
 *         description: Filter by generation status
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *         description: Filter by project ID
 *     responses:
 *       200:
 *         description: Generation history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/SiteGeneration'
 *                     pagination:
 *                       $ref: '#/components/schemas/PaginationInfo'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  '/',
  validateQuery(generationSchemas.generationHistory),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;

    const result = await websiteGenerationService.getGenerationHistory(
      req.user.id,
      page,
      pageSize
    );

    res.json({
      success: true,
      data: result.generations,
      pagination: result.pagination,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  })
);

// GET /generations/:generationId/download - Download generated website
router.get(
  '/:generationId/download',
  validateParams(generationSchemas.generationId), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const generationId = req.params.generationId!;
    const userId = req.user.id;

    console.log('Download request for generation:', generationId, 'user:', userId);

    // Regular generation download logic
    const downloadInfo = await websiteGenerationService.downloadGeneration(
      generationId,
      userId
    );

    // Set appropriate headers for file download
    res.setHeader('Content-Type', downloadInfo.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${downloadInfo.fileName}"`);
    res.setHeader('Content-Length', (await fs.stat(downloadInfo.filePath)).size);

    // Stream the file
    const fileStream = fs.createReadStream(downloadInfo.filePath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('File stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: {
            code: 'FILE_STREAM_ERROR',
            message: 'Error streaming file',
          },
        });
      }
    });
  })
);

// DELETE /generations/:generationId/cancel - Cancel ongoing generation
router.delete(
  '/:generationId/cancel',
  validateParams(generationSchemas.generationId),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const success = await websiteGenerationService.cancelGeneration(
      req.params.generationId!,
      req.user.id
    );

    res.json({
      success: true,
      data: {
        cancelled: success,
        message: 'Generation cancelled successfully',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  })
);

// POST /generations/bulk - Start bulk generation for multiple projects
router.post(
  '/bulk',
  validate(generationSchemas.bulkGeneration),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { projectIds, hugoTheme, customizations } = req.body;
    const results: Array<{ projectId: string; generationId?: string; error?: string }> = [];

    // Process each project
    for (const projectId of projectIds) {
      try {
        const generationId = await websiteGenerationService.startGeneration({
          projectId,
          userId: req.user.id,
          hugoTheme,
          customizations,
        });

        results.push({ projectId, generationId });
      } catch (error: any) {
        results.push({
          projectId,
          error: error.message || 'Failed to start generation',
        });
      }
    }

    res.status(202).json({
      success: true,
      data: {
        results,
        summary: {
          total: projectIds.length,
          successful: results.filter(r => r.generationId).length,
          failed: results.filter(r => r.error).length,
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  })
);

// GET /generations/analytics - Get generation analytics
router.get(
  '/analytics',
  validateQuery(generationSchemas.generationAnalytics),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // This would implement analytics logic
    // For now, returning mock data
    const analytics = {
      totalGenerations: 42,
      successfulGenerations: 38,
      failedGenerations: 4,
      avgGenerationTime: 125000, // milliseconds
      popularThemes: [
        { theme: 'business-pro', count: 15 },
        { theme: 'ananke', count: 12 },
        { theme: 'papermod', count: 8 },
      ],
      generationsByDay: [
        { date: '2025-01-07', count: 5 },
        { date: '2025-01-08', count: 8 },
        { date: '2025-01-09', count: 12 },
      ],
    };

    res.json({
      success: true,
      data: analytics,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  })
);

// POST /generations/cleanup - Cleanup expired generations (admin endpoint)
router.post(
  '/cleanup',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const cleanedCount = await websiteGenerationService.cleanupExpiredGenerations();

    res.json({
      success: true,
      data: {
        cleanedCount,
        message: `Cleaned up ${cleanedCount} expired generations`,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  })
);

// GET /generations/:generationId/logs - Get generation logs (debug endpoint)
router.get(
  '/:generationId/logs',
  validateParams(generationSchemas.generationId),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // This would fetch detailed logs from the generation process
    // For now, returning mock logs
    const logs = {
      steps: [
        {
          step: 'GENERATING_CONTENT',
          startTime: new Date(Date.now() - 60000).toISOString(),
          endTime: new Date(Date.now() - 45000).toISOString(),
          duration: 15000,
          status: 'completed',
          details: {
            aiModel: 'gpt-4',
            pagesGenerated: 5,
            wordsGenerated: 1250,
          },
        },
        {
          step: 'BUILDING_SITE',
          startTime: new Date(Date.now() - 45000).toISOString(),
          endTime: new Date(Date.now() - 30000).toISOString(),
          duration: 15000,
          status: 'completed',
          details: {
            hugoVersion: '0.121.0',
            filesGenerated: 25,
            buildSize: '2.1MB',
          },
        },
        {
          step: 'PACKAGING',
          startTime: new Date(Date.now() - 30000).toISOString(),
          endTime: new Date(Date.now() - 15000).toISOString(),
          duration: 15000,
          status: 'completed',
          details: {
            compressionRatio: 0.65,
            finalSize: '1.4MB',
          },
        },
      ],
      buildOutput: 'Hugo build completed successfully\nProcessed 5 pages\nGenerated 25 files\nTotal size: 2.1MB',
      warnings: [],
      errors: [],
    };    res.json({
      success: true,
      data: logs,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  })
);

// POST /generations/detect-theme-wizard - Detect theme from wizard data (no project needed)
/**
 * @swagger
 * /api/generations/detect-theme-wizard:
 *   post:
 *     summary: Detect theme based on wizard data without saving project
 *     description: Analyzes wizard data to recommend theme without requiring saved project
 *     tags: [Website Generation]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - wizardData
 *             properties:
 *               wizardData:
 *                 type: object
 *                 description: Complete wizard data for theme analysis
 *     responses:
 *       200:
 *         description: Theme recommendation generated successfully
 *       400:
 *         description: Invalid wizard data
 */
router.post(
  '/detect-theme-wizard',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { wizardData } = req.body;

    if (!wizardData) {
      return res.status(400).json({
        success: false,
        error: { message: 'Wizard data is required', code: 'MISSING_WIZARD_DATA' }
      });
    }

    if (!wizardData.websiteType) {
      return res.status(400).json({
        success: false,
        error: { message: 'Website type is required', code: 'MISSING_WEBSITE_TYPE' }
      });
    }

    try {
      console.log('🎨 Starting theme detection with wizard data');
      console.log('📋 Website type:', wizardData.websiteType?.id);
      console.log('📋 Business category:', wizardData.businessCategory?.id);
      
      // Use the same ThemeDetectionService (algorithmic, not AI)
      const themeDetector = new ThemeDetectionService();
      await themeDetector.initialize();
      
      const recommendation = await themeDetector.detectTheme(wizardData);
      const colorScheme = themeDetector.detectColorScheme(wizardData, recommendation.themeId);
      const explanation = themeDetector.getThemeExplanation(recommendation);

      console.log('✅ Theme detection completed:', {
        recommendedTheme: recommendation.themeId,
        confidence: recommendation.confidence,
        reasons: recommendation.reasons?.length || 0
      });

      return res.json({
        success: true,
        data: {
          recommendedTheme: recommendation.themeId,
          confidence: recommendation.confidence,
          reasons: recommendation.reasons,
          explanation,
          colorScheme,
          fallback: recommendation.fallback
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
          method: 'algorithmic_detection', // NOT AI
          source: 'wizard_data'
        }
      });

    } catch (error: any) {
      console.error('❌ Theme detection failed:', error);
      
      return res.status(500).json({
        success: false,
        error: { 
          message: 'Theme detection failed', 
          code: 'THEME_DETECTION_ERROR',
          details: error.message 
        }
      });
    }
  })
);

export default router;
