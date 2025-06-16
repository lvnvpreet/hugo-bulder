import { Router, Request, Response } from 'express';
import { AuthService } from '../services/auth';
import { validate } from '../middleware/validation';
import { authSchemas } from '../validation/authSchemas';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const authService = new AuthService();

// POST /auth/register - Register new user
/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user account
 *     description: Creates a new user account with email and password. Email verification may be required based on server configuration.
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: John Doe
 *                 description: Full name of the user
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john.doe@example.com
 *                 description: Valid email address for the account
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: SecurePass123!
 *                 description: Strong password (min 8 chars, must contain uppercase, lowercase, number)
 *     responses:
 *       201:
 *         description: User registered successfully
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
 *                         user:
 *                           $ref: '#/components/schemas/User'
 *                         token:
 *                           type: string
 *                           description: JWT access token
 *                         refreshToken:
 *                           type: string
 *                           description: JWT refresh token
 *                         verificationRequired:
 *                           type: boolean
 *                           description: Whether email verification is required
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         description: Email already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Email already exists
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post(
  '/register',
  validate(authSchemas.register),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.register(req.body);

    res.status(201).json({
      success: true,
      data: result,
      message: result.verificationRequired 
        ? 'Registration successful. Please check your email to verify your account.'
        : 'Registration successful',
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  })
);

// POST /auth/login - Login user
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user with email and password
 *     description: Authenticates a user with email and password, returns JWT tokens for API access
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john.doe@example.com
 *                 description: Registered email address
 *               password:
 *                 type: string
 *                 example: SecurePass123!
 *                 description: User password
 *     responses:
 *       200:
 *         description: Login successful
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
 *                         user:
 *                           $ref: '#/components/schemas/User'
 *                         token:
 *                           type: string
 *                           description: JWT access token (expires in 15 minutes)
 *                         refreshToken:
 *                           type: string
 *                           description: JWT refresh token (expires in 7 days)
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Invalid credentials
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post(
  '/login',
  validate(authSchemas.login),  asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.login(req.body);

    res.json({
      success: true,
      data: result,
      message: 'Login successful',
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  })
);

// POST /auth/refresh - Refresh access token
router.post(
  '/refresh',
  validate(authSchemas.refreshToken),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.refreshToken(req.body.refreshToken);

    res.json({
      success: true,
      data: result,
      message: 'Token refreshed successfully',
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  })
);

// POST /auth/forgot-password - Request password reset
router.post(
  '/forgot-password',
  validate(authSchemas.resetPasswordRequest),
  asyncHandler(async (req: Request, res: Response) => {
    await authService.requestPasswordReset(req.body.email);

    res.json({
      success: true,
      message: 'If an account with this email exists, a password reset link has been sent.',
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  })
);

// POST /auth/reset-password - Reset password with token
router.post(
  '/reset-password',
  validate(authSchemas.resetPassword),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.resetPassword(req.body.token, req.body.password);

    res.json({
      success: true,
      data: result,
      message: 'Password reset successfully',
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  })
);

// POST /auth/verify-email - Verify email address
router.post(
  '/verify-email',
  validate(authSchemas.verifyEmail),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.verifyEmail(req.body.token);

    res.json({
      success: true,
      data: result,
      message: 'Email verified successfully',
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  })
);

// POST /auth/logout - Logout user (invalidate refresh token)
router.post(
  '/logout',
  validate(authSchemas.logout),
  asyncHandler(async (req: Request, res: Response) => {
    await authService.logout(req.body.refreshToken);

    res.json({
      success: true,
      message: 'Logout successful',
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      },
    });
  })
);

export default router;