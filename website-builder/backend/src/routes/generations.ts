import { Router, Request, Response } from 'express';
import { validate, validateQuery, validateParams } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { websiteGenerationService } from '../services/WebsiteGenerationService';
import { generationSchemas } from '../validation/generationSchemas';
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
  validateParams(generationSchemas.projectId),
  validate(generationSchemas.startGeneration),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const projectId = req.params.projectId!;
    const userId = req.user.id;
    
    console.log('Generation request for project:', projectId, 'user:', userId);
    console.log('Request body:', req.body);
    
    // Start generation process for all projects
    const generationId = await websiteGenerationService.startGeneration({
      projectId,
      userId,
      hugoTheme: req.body.hugoTheme,
      customizations: req.body.customizations,
      contentOptions: req.body.contentOptions,
    });

    res.status(202).json({
      success: true,
      data: {
        generationId,
        status: 'PENDING',
        message: 'Website generation started successfully',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
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
  validateQuery(generationSchemas.generationStatusQuery),  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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
  validateParams(generationSchemas.generationId),  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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
    };

    res.json({
      success: true,
      data: logs,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  })
);

export default router;
