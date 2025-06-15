import { Router, Request, Response } from 'express';
import { validate, validateParams } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { webhookService } from '../services/WebhookService';
import Joi from 'joi';

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

// Webhook validation schemas
const webhookSchema = Joi.object({
  url: Joi.string().uri().required(),
  events: Joi.array().items(
    Joi.string().valid('started', 'progress', 'completed', 'failed')
  ).min(1).required(),
  headers: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
});

const webhookUrlSchema = Joi.object({
  url: Joi.string().uri().required(),
});

// POST /webhooks - Register a new webhook
/**
 * @swagger
 * /api/webhooks:
 *   post:
 *     summary: Register a new webhook
 *     description: Register a webhook URL to receive notifications about website generation events
 *     tags: [Webhooks]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *               - events
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *                 description: Webhook endpoint URL
 *                 example: "https://your-site.com/webhooks/generation"
 *               events:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [started, progress, completed, failed]
 *                 minItems: 1
 *                 description: Events to subscribe to
 *                 example: ["started", "completed", "failed"]
 *               headers:
 *                 type: object
 *                 additionalProperties:
 *                   type: string
 *                 description: Custom headers to include in webhook requests
 *                 example:
 *                   Authorization: "Bearer your-api-key"
 *                   X-Custom-Header: "value"
 *     responses:
 *       201:
 *         description: Webhook registered successfully
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
 *                         message:
 *                           type: string
 *                           example: Webhook registered successfully
 *                         webhook:
 *                           type: object
 *                           properties:
 *                             url:
 *                               type: string
 *                               format: uri
 *                             events:
 *                               type: array
 *                               items:
 *                                 type: string
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post(
  '/',
  validate(webhookSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    webhookService.registerWebhook(req.user.id, {
      url: req.body.url,
      events: req.body.events,
      headers: req.body.headers,
    });

    res.status(201).json({
      success: true,
      data: {
        message: 'Webhook registered successfully',
        webhook: {
          url: req.body.url,
          events: req.body.events,
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  })
);

// GET /webhooks - Get user's registered webhooks
/**
 * @swagger
 * /api/webhooks:
 *   get:
 *     summary: Get user's registered webhooks
 *     description: Retrieve a list of webhooks registered by the authenticated user
 *     tags: [Webhooks]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: A list of registered webhooks
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
 *                         webhooks:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               url:
 *                                 type: string
 *                                 format: uri
 *                               events:
 *                                 type: array
 *                                 items:
 *                                   type: string
 *                         count:
 *                           type: integer
 *                           example: 2
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const webhooks = webhookService.getUserWebhooks(req.user.id);

    res.json({
      success: true,
      data: {
        webhooks,
        count: webhooks.length,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  })
);

// DELETE /webhooks - Remove a webhook
/**
 * @swagger
 * /api/webhooks:
 *   delete:
 *     summary: Remove a webhook
 *     description: Remove a registered webhook for the authenticated user
 *     tags: [Webhooks]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *                 description: Webhook endpoint URL
 *                 example: "https://your-site.com/webhooks/generation"
 *     responses:
 *       200:
 *         description: Webhook removed successfully
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
 *                         message:
 *                           type: string
 *                           example: Webhook removed successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete(
  '/',
  validate(webhookUrlSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    webhookService.removeWebhook(req.user.id, req.body.url);

    res.json({
      success: true,
      data: {
        message: 'Webhook removed successfully',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  })
);

// DELETE /webhooks/all - Clear all webhooks for user
/**
 * @swagger
 * /api/webhooks/all:
 *   delete:
 *     summary: Clear all webhooks for user
 *     description: Remove all registered webhooks for the authenticated user
 *     tags: [Webhooks]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: All webhooks cleared successfully
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
 *                         message:
 *                           type: string
 *                           example: All webhooks cleared successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete(
  '/all',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    webhookService.clearUserWebhooks(req.user.id);

    res.json({
      success: true,
      data: {
        message: 'All webhooks cleared successfully',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  })
);

// GET /webhooks/stats - Get webhook statistics (admin only)
/**
 * @swagger
 * /api/webhooks/stats:
 *   get:
 *     summary: Get webhook statistics
 *     description: Retrieve statistics about webhook usage (admin only)
 *     tags: [Webhooks]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Webhook statistics
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
 *                         totalWebhooks:
 *                           type: integer
 *                           example: 100
 *                         activeWebhooks:
 *                           type: integer
 *                           example: 80
 *                         failedWebhooks:
 *                           type: integer
 *                           example: 5
 *                         pendingWebhooks:
 *                           type: integer
 *                           example: 15
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  '/stats',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const stats = webhookService.getWebhookStats();

    res.json({
      success: true,
      data: stats,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  })
);

export default router;
