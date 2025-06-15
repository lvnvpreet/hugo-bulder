import { Router, Response, Request } from 'express';
import { referenceDataService } from '../services/ReferenceDataService';
import { asyncHandler } from '../middleware/errorHandler';

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

// GET /reference/business-categories - Get all business categories
/**
 * @swagger
 * /api/reference/business-categories:
 *   get:
 *     summary: Get all business categories
 *     description: Retrieve a list of all available business categories for website creation
 *     tags: [Reference Data]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Business categories retrieved successfully
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
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           displayName:
 *                             type: string
 *                           description:
 *                             type: string
 *                           icon:
 *                             type: string
 *                           industry:
 *                             type: string
 *                           isActive:
 *                             type: boolean
 *                           projectCount:
 *                             type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  '/business-categories',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const categories = await referenceDataService.getBusinessCategories();

    res.json({
      success: true,
      data: categories,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
        total: categories.length,
      },
    });
  })
);

// GET /reference/hugo-themes - Get all Hugo themes
/**
 * @swagger
 * /api/reference/hugo-themes:
 *   get:
 *     summary: Get all Hugo themes
 *     description: Retrieve a list of all available Hugo themes for website creation
 *     tags: [Reference Data]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter themes by category
 *       - in: query
 *         name: featured
 *         schema:
 *           type: boolean
 *         description: Filter themes by featured status
 *     responses:
 *       200:
 *         description: Hugo themes retrieved successfully
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
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           category:
 *                             type: string
 *                           isFeatured:
 *                             type: boolean
 *                           screenshot:
 *                             type: string
 *                           demoUrl:
 *                             type: string
 *                           downloadUrl:
 *                             type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  '/hugo-themes',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { category, featured } = req.query;
    const themes = await referenceDataService.getHugoThemes({
      category: category as string,
      featured: featured === 'true',
    });

    res.json({
      success: true,
      data: themes,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
        total: themes.length,
        filters: {
          category: category || null,
          featured: featured === 'true',
        },
      },
    });
  })
);

// GET /reference/website-structures - Get all website structures
/**
 * @swagger
 * /api/reference/website-structures:
 *   get:
 *     summary: Get all website structures
 *     description: Retrieve a list of all available website structures for website creation
 *     tags: [Reference Data]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [SINGLE_PAGE, MULTI_PAGE]
 *         description: Filter structures by type
 *     responses:
 *       200:
 *         description: Website structures retrieved successfully
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
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           type:
 *                             type: string
 *                           isActive:
 *                             type: boolean
 *                           previewImage:
 *                             type: string
 *                           demoUrl:
 *                             type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  '/website-structures',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { type } = req.query;
    const structures = await referenceDataService.getWebsiteStructures({
      type: type as 'SINGLE_PAGE' | 'MULTI_PAGE',
    });

    res.json({
      success: true,
      data: structures,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
        total: structures.length,
        filters: {
          type: type || null,
        },
      },
    });
  })
);

// GET /reference/locations - Get location data
/**
 * @swagger
 * /api/reference/locations:
 *   get:
 *     summary: Get location data
 *     description: Retrieve location data for a specific country or all countries
 *     tags: [Reference Data]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *         description: Filter locations by country code
 *     responses:
 *       200:
 *         description: Location data retrieved successfully
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
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           countryCode:
 *                             type: string
 *                           countryName:
 *                             type: string
 *                           region:
 *                             type: string
 *                           city:
 *                             type: string
 *                           isActive:
 *                             type: boolean
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  '/locations',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { country } = req.query;
    const locations = await referenceDataService.getLocationData(country as string);

    res.json({
      success: true,
      data: locations,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
        country: country || 'all',
      },
    });
  })
);

// GET /reference/content-suggestions - Get content suggestions
/**
 * @swagger
 * /api/reference/content-suggestions:
 *   get:
 *     summary: Get content suggestions
 *     description: Retrieve content suggestions based on business type, content type, and search query
 *     tags: [Reference Data]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: businessType
 *         schema:
 *           type: string
 *         description: Filter suggestions by business type
 *       - in: query
 *         name: contentType
 *         schema:
 *           type: string
 *         description: Filter suggestions by content type
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search query for content suggestions
 *     responses:
 *       200:
 *         description: Content suggestions retrieved successfully
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
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           title:
 *                             type: string
 *                           description:
 *                             type: string
 *                           url:
 *                             type: string
 *                           type:
 *                             type: string
 *                           businessType:
 *                             type: string
 *                           contentType:
 *                             type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  '/content-suggestions',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { businessType, contentType, search } = req.query;
    const suggestions = await referenceDataService.getContentSuggestions({
      businessType: businessType as string,
      contentType: contentType as string,
      search: search as string,
    });

    res.json({
      success: true,
      data: suggestions,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
        total: suggestions.length,
        filters: {
          businessType: businessType || null,
          contentType: contentType || null,
          search: search || null,
        },
      },
    });
  })
);

export default router;
