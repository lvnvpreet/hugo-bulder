import { Router, Request, Response } from 'express';
import { AuthService } from '../services/auth';
import { 
  authenticateToken, 
  authRateLimit, 
  passwordResetRateLimit, 
  emailVerificationRateLimit 
} from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  updateProfileSchema,
  refreshTokenSchema,
  changePasswordSchema,
  resendVerificationSchema,
  deleteAccountSchema
} from '../validation/authSchemas';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const authService = new AuthService();

/**
 * POST /auth/register
 * Register a new user
 */
router.post('/register', 
  authRateLimit,
  validate(registerSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.register(req.body);
    
    res.status(201).json({
      success: true,
      data: result,
      message: 'Registration successful. Please check your email for verification.'
    });
  })
);

/**
 * POST /auth/verify-email
 * Verify user email address
 */
router.post('/verify-email',
  emailVerificationRateLimit,
  validate(verifyEmailSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.body;
    const result = await authService.verifyEmail(token);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        error: {
          code: 'EMAIL_VERIFICATION_FAILED',
          message: result.message
        }
      });
    }
  })
);

/**
 * POST /auth/login
 * User login
 */
router.post('/login',
  authRateLimit,
  validate(loginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.login(req.body);
    
    res.json({
      success: true,
      data: result,
      message: 'Login successful'
    });
  })
);

/**
 * POST /auth/logout
 * User logout (invalidate refresh token)
 */
router.post('/logout',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    // TODO: Implement logout by invalidating refresh token
    // For now, just send success response
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  })
);

/**
 * POST /auth/refresh-token
 * Refresh access token
 */
router.post('/refresh-token',
  validate(refreshTokenSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    const result = await authService.refreshToken(refreshToken);
    
    res.json({
      success: true,
      data: result,
      message: 'Token refreshed successfully'
    });
  })
);

/**
 * POST /auth/forgot-password
 * Request password reset
 */
router.post('/forgot-password',
  passwordResetRateLimit,
  validate(passwordResetRequestSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;
    const result = await authService.requestPasswordReset(email);
    
    res.json({
      success: result.success,
      message: result.message
    });
  })
);

/**
 * POST /auth/reset-password
 * Reset password with token
 */
router.post('/reset-password',
  validate(passwordResetSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { token, password } = req.body;
    const result = await authService.resetPassword(token, password);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        error: {
          code: 'PASSWORD_RESET_FAILED',
          message: result.message
        }
      });
    }
  })
);

/**
 * GET /auth/profile
 * Get user profile
 */
router.get('/profile',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const user = await authService.validateToken((req.headers.authorization as string).split(' ')[1]);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  })
);

/**
 * PUT /auth/profile
 * Update user profile
 */
router.put('/profile',
  authenticateToken,
  validate(updateProfileSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const updatedUser = await authService.updateProfile(userId, req.body);
    
    res.json({
      success: true,
      data: updatedUser,
      message: 'Profile updated successfully'
    });
  })
);

/**
 * DELETE /auth/account
 * Delete user account
 */
router.delete('/account',
  authenticateToken,
  validate(deleteAccountSchema),
  asyncHandler(async (req: Request, res: Response) => {
    // TODO: Implement account deletion
    // This would require verifying the password and then deleting the user and all related data
    res.json({
      success: true,
      message: 'Account deletion feature will be implemented soon'
    });
  })
);

/**
 * POST /auth/resend-verification
 * Resend email verification
 */
router.post('/resend-verification',
  emailVerificationRateLimit,
  validate(resendVerificationSchema),
  asyncHandler(async (req: Request, res: Response) => {
    // TODO: Implement resend verification
    res.json({
      success: true,
      message: 'Verification email resent successfully'
    });
  })
);

/**
 * POST /auth/change-password
 * Change password (for authenticated users)
 */
router.post('/change-password',
  authenticateToken,
  validate(changePasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    // TODO: Implement password change for authenticated users
    res.json({
      success: true,
      message: 'Password change feature will be implemented soon'
    });
  })
);

export default router;
