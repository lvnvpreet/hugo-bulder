import express, { Request, Response, NextFunction } from 'express';
import { websiteGenerationService } from '../services/WebsiteGenerationService';
import { ProjectService } from '../services/ProjectService';
import { ThemeDetectionService } from '../services/ThemeDetectionService';
import { validate, validateParams } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { generationSchemas } from '../validation/generationSchemas';

const router = express.Router();
const projectService = new ProjectService();

// Apply authentication to all generation routes
router.use(authenticateToken);

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

    console.log('🎨 Starting theme detection with wizard data');
    console.log('📋 Website type:', wizardData?.websiteType?.id);
    console.log('📋 Business category:', wizardData?.businessCategory?.id);

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
      // ⭐ USE ONLY METHOD 1: Custom Theme Selection
      const themeDetector = new ThemeDetectionService();
      await themeDetector.initialize();
      
      console.log('🎯 Using custom theme detection (Method 1 only)');
      const themeRecommendation = await themeDetector.detectTheme(wizardData);
      
      // Check if a custom theme was found
      if (themeRecommendation.themeId === 'no-theme-available') {
        console.log('❌ No custom theme available for this business category');
        
        return res.status(400).json({
          success: false,
          error: {
            message: 'No custom theme available for this business category',
            code: 'NO_CUSTOM_THEME_AVAILABLE',
            details: themeRecommendation.reasons.join('. ')
          },
          data: {
            businessCategory: wizardData.businessCategory?.id,
            websiteType: wizardData.websiteType?.id,
            availableCustomThemes: themeDetector.getAvailableThemes().map(t => t.id),
            suggestion: 'Consider adding a custom theme for this business category'
          }
        });
      }
      
      // Generate color scheme using the detected theme
      const colorScheme = themeDetector.detectColorScheme(wizardData, themeRecommendation.themeId);
      
      const explanation = `Custom theme "${themeRecommendation.themeId}" selected with ${themeRecommendation.confidence}% confidence based on your specific business requirements.`;

      console.log('✅ Custom theme detection completed:', {
        themeId: themeRecommendation.themeId,
        confidence: themeRecommendation.confidence,
        reasons: themeRecommendation.reasons.length
      });

      return res.json({
        success: true,
        data: {
          recommendedTheme: themeRecommendation.themeId,
          confidence: themeRecommendation.confidence,
          reasons: themeRecommendation.reasons,
          explanation,
          colorScheme,
          websiteTypeMatch: themeRecommendation.websiteTypeMatch,
          businessCategoryMatch: themeRecommendation.businessCategoryMatch
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
          method: 'custom_theme_selection_only',
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

// POST /generations/:projectId/start - Start website generation
/**
 * @swagger
 * /api/generations/{projectId}/start:
 *   post:
 *     summary: Start website generation
 *     description: Begin the process of generating a static website for the specified project
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
 *             properties:
 *               hugoTheme:
 *                 type: string
 *                 default: ananke
 *                 enum: [ananke, papermod, bigspring, restaurant, hargo, terminal, clarity, mainroad]
 *                 description: Hugo theme to use for generation
 *               autoDetectTheme:
 *                 type: boolean
 *                 default: false
 *                 description: Automatically detect best theme based on project data
 *               customizations:
 *                 type: object
 *                 properties:
 *                   colors:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       primary:
 *                         type: string
 *                         pattern: '^#[0-9A-Fa-f]{6}$'
 *                       secondary:
 *                         type: string
 *                         pattern: '^#[0-9A-Fa-f]{6}$'
 *                       accent:
 *                         type: string
 *                         pattern: '^#[0-9A-Fa-f]{6}$'
 *                       background:
 *                         type: string
 *                         pattern: '^#[0-9A-Fa-f]{6}$'
 *                       text:
 *                         type: string
 *                         pattern: '^#[0-9A-Fa-f]{6}$'
 *                   fonts:
 *                     type: object
 *                     properties:
 *                       headingFont:
 *                         type: string
 *                       bodyFont:
 *                         type: string
 *                       fontSize:
 *                         type: string
 *                         enum: [small, medium, large]
 *                   layout:
 *                     type: object
 *                     properties:
 *                       headerStyle:
 *                         type: string
 *                         enum: [standard, minimal, bold]
 *                       footerStyle:
 *                         type: string
 *                         enum: [standard, minimal, detailed]
 *                       sidebarEnabled:
 *                         type: boolean
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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     generationId:
 *                       type: string
 *                       description: Unique ID for tracking generation progress
 *                     status:
 *                       type: string
 *                       enum: [PENDING]
 *                       example: PENDING
 *                 message:
 *                   type: string
 *                   example: Generation started successfully
 *                 meta:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     requestId:
 *                       type: string
 *       400:
 *         description: Validation error or project not completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: PROJECT_NOT_COMPLETED
 *                     message:
 *                       type: string
 *                       example: Project must be completed before generation can start
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
 *       409:
 *         description: Generation already in progress
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Server error
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

      console.log('📋 Generation request for project:', projectId, 'user:', userId);
      console.log('📋 Request body:', req.body);

      // Verify project exists and user owns it
      const project = await projectService.getProject(projectId!, userId);

      if (!project) {
        console.log(`❌ Project ${projectId} not found for user ${userId}`);
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
        });
      }

      console.log(`✅ Project ${projectId} validation passed, starting generation...`);

      // Start generation - this should return a generation ID immediately
      const generationId = await websiteGenerationService.startGeneration({
        projectId: projectId!,
        userId,
        hugoTheme: req.body.hugoTheme,
        autoDetectTheme: req.body.autoDetectTheme,
        customizations: req.body.customizations,
        contentOptions: req.body.contentOptions,
      });

      console.log(`🎉 Generation started successfully with ID: ${generationId}`);

      return res.status(202).json({
        success: true,
        data: { 
          generationId,
          status: 'PENDING'
        },
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
        code: error?.code,
        statusCode: error?.statusCode
      });

      // Handle specific error types
      if (error.code === 'PROJECT_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        });
      }

      if (error.code === 'PROJECT_NOT_COMPLETED') {
        return res.status(400).json({
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        });
      }

      if (error.code === 'GENERATION_IN_PROGRESS') {
        return res.status(409).json({
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        });
      }

      return res.status(500).json({
        success: false,
        error: { 
          code: 'GENERATION_START_FAILED', 
          message: 'Failed to start generation' 
        }
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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Generation ID
 *                     projectId:
 *                       type: string
 *                       description: Associated project ID
 *                     status:
 *                       type: string
 *                       enum: [PENDING, PROCESSING, COMPLETED, FAILED, EXPIRED]
 *                       description: Current generation status
 *                     progress:
 *                       type: integer
 *                       minimum: 0
 *                       maximum: 100
 *                       description: Progress percentage
 *                     currentStep:
 *                       type: string
 *                       description: Description of current processing step
 *                     startedAt:
 *                       type: string
 *                       format: date-time
 *                     completedAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                     siteUrl:
 *                       type: string
 *                       nullable: true
 *                       description: Download URL for completed generation
 *                     fileSize:
 *                       type: integer
 *                       nullable: true
 *                     fileCount:
 *                       type: integer
 *                       nullable: true
 *                     generationTime:
 *                       type: integer
 *                       nullable: true
 *                       description: Generation time in milliseconds
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                     errorLog:
 *                       type: string
 *                       nullable: true
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Generation not found
 *       500:
 *         description: Server error
 */
router.get(
  '/:generationId/status',
  validateParams(generationSchemas.generationId),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { generationId } = req.params;
      const userId = req.user.id;

      console.log(`📊 Getting status for generation: ${generationId}`);

      const status = await websiteGenerationService.getGenerationStatus(generationId!, userId);

      return res.json({
        success: true,
        data: status,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    } catch (error: any) {
      console.error('❌ Failed to get generation status:', error);

      if (error.code === 'GENERATION_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        });
      }

      return res.status(500).json({
        success: false,
        error: {
          code: 'GENERATION_STATUS_ERROR',
          message: 'Failed to get generation status'
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
 *     description: Retrieve a paginated list of all generations for the authenticated user
 *     tags: [Website Generation]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 50
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Generation history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     generations:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           projectId:
 *                             type: string
 *                           projectName:
 *                             type: string
 *                           status:
 *                             type: string
 *                           startedAt:
 *                             type: string
 *                             format: date-time
 *                           completedAt:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         pageSize:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
  '/',
  validate(generationSchemas.getHistory),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = Math.min(parseInt(req.query.pageSize as string) || 10, 50);

      console.log(`📋 Getting generation history for user: ${userId} (page ${page})`);

      const history = await websiteGenerationService.getGenerationHistory(userId, page, pageSize);

      return res.json({
        success: true,
        data: history,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    } catch (error: any) {
      console.error('❌ Failed to get generation history:', error);

      return res.status(500).json({
        success: false,
        error: {
          code: 'GENERATION_HISTORY_ERROR',
          message: 'Failed to get generation history'
        }
      });
    }
  })
);

// GET /generations/:generationId/download - Download generated website
/**
 * @swagger
 * /api/generations/{generationId}/download:
 *   get:
 *     summary: Download generated website
 *     description: Download the generated website as a ZIP file
 *     tags: [Website Generation]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: generationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Generation ID to download
 *     responses:
 *       200:
 *         description: Website ZIP file
 *         content:
 *           application/zip:
 *             schema:
 *               type: string
 *               format: binary
 *         headers:
 *           Content-Disposition:
 *             description: Attachment with filename
 *             schema:
 *               type: string
 *               example: attachment; filename="my-website.zip"
 *           Content-Length:
 *             description: File size in bytes
 *             schema:
 *               type: integer
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Generation not found or not completed
 *       410:
 *         description: Download link has expired
 *       500:
 *         description: Server error
 */
router.get(
  '/:generationId/download',
  validateParams(generationSchemas.generationId),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { generationId } = req.params;
      const userId = req.user.id;

      console.log(`📦 Download request for generation: ${generationId}`);

      const downloadInfo = await websiteGenerationService.downloadGeneration(generationId!, userId);

      res.setHeader('Content-Type', downloadInfo.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${downloadInfo.fileName}"`);
      
      return res.download(downloadInfo.filePath, downloadInfo.fileName);
    } catch (error: any) {
      console.error('❌ Failed to download generation:', error);

      if (error.code === 'GENERATION_NOT_AVAILABLE') {
        return res.status(404).json({
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        });
      }

      if (error.code === 'DOWNLOAD_EXPIRED') {
        return res.status(410).json({
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        });
      }

      return res.status(500).json({
        success: false,
        error: {
          code: 'GENERATION_DOWNLOAD_ERROR',
          message: 'Failed to download generation'
        }
      });
    }
  })
);

// DELETE /generations/:generationId/cancel - Cancel ongoing generation
/**
 * @swagger
 * /api/generations/{generationId}/cancel:
 *   delete:
 *     summary: Cancel ongoing generation
 *     description: Cancel a generation that is currently in progress
 *     tags: [Website Generation]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: generationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Generation ID to cancel
 *     responses:
 *       200:
 *         description: Generation cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Generation cancelled successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Generation not found or cannot be cancelled
 *       500:
 *         description: Server error
 */
router.delete(
  '/:generationId/cancel',
  validateParams(generationSchemas.generationId),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { generationId } = req.params;
      const userId = req.user.id;

      console.log(`🛑 Cancel request for generation: ${generationId}`);

      await websiteGenerationService.cancelGeneration(generationId!, userId);

      return res.json({
        success: true,
        message: 'Generation cancelled successfully',
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        },
      });
    } catch (error: any) {
      console.error('❌ Failed to cancel generation:', error);

      if (error.code === 'GENERATION_NOT_CANCELLABLE') {
        return res.status(404).json({
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        });
      }

      return res.status(500).json({
        success: false,
        error: {
          code: 'GENERATION_CANCEL_ERROR',
          message: 'Failed to cancel generation'
        }
      });
    }
  })
);

export default router;