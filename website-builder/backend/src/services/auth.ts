import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient, User } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  token?: string;
  refreshToken?: string;
  user?: any; // Make it flexible to handle different user shapes
  message?: string;
  verificationRequired?: boolean;
}

export class AuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  private readonly JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
  private readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
  private readonly JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  private readonly BCRYPT_ROUNDS = 12;

  /**
   * Register a new user with email verification
   */  async register(userData: RegisterData): Promise<{
    user: any;
    token: string;
    verificationRequired: boolean;
  }> {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email.toLowerCase() }
      });

      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Validate password strength
      const passwordValidation = this.isValidPassword(userData.password);
      if (!passwordValidation.valid) {
        throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
      }

      // Hash password
      const hashedPassword = await this.hashPassword(userData.password);
      
      // Generate verification token
      const verificationToken = this.generateVerificationToken();      // Create user
      const user = await prisma.user.create({
        data: {
          email: userData.email.toLowerCase(),
          password: hashedPassword,
          name: userData.name,
          verificationToken,
          plan: 'free',
          projectsLimit: 3,
          projectsUsed: 0,
        }
      });

      // Generate JWT token
      const token = this.generateJWT(user.id);

      // Remove password from response
      const { password, verificationToken: _, resetToken, resetTokenExpiry, ...userWithoutPassword } = user;

      // TODO: Send verification email
      // await this.sendVerificationEmail(user.email, verificationToken);

      return {
        user: userWithoutPassword,
        token,
        verificationRequired: true,
      };

    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Email verification
   */
  async verifyEmail(token: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const user = await prisma.user.findFirst({
        where: { verificationToken: token }
      });

      if (!user) {
        return {
          success: false,
          message: 'Invalid or expired verification token'
        };
      }      await prisma.user.update({
        where: { id: user.id },
        data: {
          verificationToken: null
        }
      });

      return {
        success: true,
        message: 'Email verified successfully'
      };
    } catch (error) {
      console.error('Email verification error:', error);
      return {
        success: false,
        message: 'Email verification failed'
      };
    }
  }

  /**
   * Login with credential validation
   */  async login(credentials: LoginData): Promise<{
    user: any;
    token: string;
    refreshToken: string;
  }> {
    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: credentials.email.toLowerCase() }
      });

      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Verify password
      const isPasswordValid = await this.comparePassword(credentials.password, user.password);
      
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Generate tokens
      const token = this.generateJWT(user.id);
      const refreshToken = this.generateRefreshToken(user.id);

      // Update last login and store refresh token
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          lastLoginAt: new Date(),
          refreshToken: await bcrypt.hash(refreshToken, this.BCRYPT_ROUNDS)
        }
      });

      // Remove sensitive data from response
      const { password, verificationToken, resetToken, resetTokenExpiry, refreshToken: _, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword,
        token,
        refreshToken,
      };

    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Password reset request
   */
  async requestPasswordReset(email: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (!user) {
        // Don't reveal if email exists or not for security
        return {
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent.'
        };
      }

      const resetToken = this.generateVerificationToken();
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken,
          resetTokenExpiry
        }
      });

      // TODO: Send password reset email
      // await this.sendPasswordResetEmail(email, resetToken);

      return {
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      };
    } catch (error) {
      console.error('Password reset request error:', error);
      return {
        success: false,
        message: 'Password reset request failed. Please try again.'
      };
    }
  }

  /**
   * Password reset execution
   */
  async resetPassword(token: string, newPassword: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const user = await prisma.user.findFirst({
        where: {
          resetToken: token,
          resetTokenExpiry: {
            gt: new Date()
          }
        }
      });

      if (!user) {
        return {
          success: false,
          message: 'Invalid or expired reset token'
        };
      }

      // Validate new password strength
      const passwordValidation = this.isValidPassword(newPassword);
      if (!passwordValidation.valid) {
        return {
          success: false,
          message: `Password validation failed: ${passwordValidation.errors.join(', ')}`
        };
      }

      const hashedPassword = await this.hashPassword(newPassword);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null,
          refreshToken: null, // Invalidate all refresh tokens
        }
      });

      return {
        success: true,
        message: 'Password reset successfully'
      };
    } catch (error) {
      console.error('Password reset error:', error);
      return {
        success: false,
        message: 'Password reset failed. Please try again.'
      };
    }
  }

  /**
   * Token validation and user retrieval
   */
  async validateToken(token: string): Promise<{
    id: string;
    email: string;
    name: string | null;
    avatar: string | null;
    plan: string;
    projectsLimit: number;
    projectsUsed: number;
    lastLoginAt: Date | null;
    preferences: any;
    createdAt: Date;
    updatedAt: Date;
    emailVerified?: boolean;
  } | null> {
    try {
      // Verify JWT token
      const decoded = jwt.verify(token, this.JWT_SECRET) as { userId: string };      // Find user by ID with specific fields
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          plan: true,
          projectsLimit: true,
          projectsUsed: true,
          lastLoginAt: true,
          preferences: true,
          createdAt: true,
          updatedAt: true,
        }
      });      if (!user) {
        return null;
      }

      return user;
    } catch (error) {
      console.error('Token validation error:', error);
      return null;
    }
  }

  /**
   * Token refresh
   */
  async refreshToken(refreshToken: string): Promise<{
    token: string;
    refreshToken: string;
  }> {
    try {
      const decoded = jwt.verify(refreshToken, this.JWT_REFRESH_SECRET) as { userId: string };
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });

      if (!user || !user.refreshToken) {
        throw new Error('Invalid refresh token');
      }

      // Verify stored refresh token
      const isRefreshTokenValid = await bcrypt.compare(refreshToken, user.refreshToken);
      if (!isRefreshTokenValid) {
        throw new Error('Invalid refresh token');
      }

      // Generate new tokens
      const newToken = this.generateJWT(user.id);
      const newRefreshToken = this.generateRefreshToken(user.id);

      // Update stored refresh token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          refreshToken: await bcrypt.hash(newRefreshToken, this.BCRYPT_ROUNDS)
        }
      });

      return {
        token: newToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      console.error('Token refresh error:', error);
      throw new Error('Token refresh failed');
    }
  }

  /**
   * Profile management
   */
  async updateProfile(userId: string, updates: Partial<User>): Promise<Omit<User, 'password'>> {
    try {
      const allowedUpdates = ['name', 'avatar', 'preferences'];
      const sanitizedUpdates: any = {};
      
      for (const [key, value] of Object.entries(updates)) {
        if (allowedUpdates.includes(key)) {
          sanitizedUpdates[key] = value;
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: sanitizedUpdates,        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          plan: true,
          projectsLimit: true,
          projectsUsed: true,
          lastLoginAt: true,
          preferences: true,
          createdAt: true,
          updatedAt: true,
        }
      });

      return updatedUser as Omit<User, 'password'>;
    } catch (error) {
      console.error('Update profile error:', error);
      throw new Error('Profile update failed');
    }  }

  /**
   * Logout user by invalidating refresh token
   */
  async logout(refreshToken: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // Verify the refresh token
      const decoded = jwt.verify(refreshToken, this.JWT_REFRESH_SECRET) as any;
      
      // Clear the refresh token from database
      await prisma.user.update({
        where: { id: decoded.userId },
        data: { refreshToken: null }
      });

      return {
        success: true,
        message: 'Logout successful'
      };
    } catch (error) {
      console.error('Logout error:', error);
      return {
        success: true, // Return success even on error for security
        message: 'Logout successful'
      };
    }  }

  // Security utilities
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.BCRYPT_ROUNDS);
  }

  private async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }  private generateJWT(userId: string, expiresIn?: string): string {
    return jwt.sign(
      { userId },
      this.JWT_SECRET,
      { expiresIn: expiresIn || this.JWT_EXPIRES_IN } as jwt.SignOptions
    );
  }

  private generateRefreshToken(userId: string): string {
    return jwt.sign(
      { userId },
      this.JWT_REFRESH_SECRET,
      { expiresIn: this.JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions
    );
  }

  private generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private isValidPassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (password.length > 128) {
      errors.push('Password must be less than 128 characters long');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[@$!%*?&]/.test(password)) {
      errors.push('Password must contain at least one special character (@$!%*?&)');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}
