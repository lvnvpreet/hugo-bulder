import { PrismaClient, User, Project } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export class TestDataFactory {
  /**
   * Create a test user with hashed password
   */
  static async createUser(overrides: Partial<User> = {}): Promise<User & { plainPassword: string }> {
    const plainPassword = overrides.password || 'Test123!@#';
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    
    const userData = {
      email: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`,
      password: hashedPassword,
      name: 'Test User',
      emailVerified: true,
      ...overrides
    };

    const user = await prisma.user.create({
      data: userData
    });

    return { ...user, plainPassword };
  }

  /**
   * Create a test project for a user
   */
  static async createProject(userId: string, overrides: Partial<Project> = {}): Promise<Project> {
    const projectData = {
      name: `Test Project ${Date.now()}`,
      description: 'A test project for automated testing',
      slug: `test-project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      wizardData: {
        websiteType: 'business',
        businessInfo: {
          name: 'Test Business',
          description: 'A test business description',
          industry: 'Technology',
          location: 'San Francisco, CA'
        },
        designPreferences: {
          theme: 'business-pro',
          colorScheme: 'blue',
          layout: 'modern'
        },
        contentPreferences: {
          tone: 'professional',
          targetAudience: 'businesses'
        }
      },
      ...overrides
    };

    return await prisma.project.create({
      data: projectData
    });
  }

  /**
   * Generate JWT token for test user
   */
  static generateAuthToken(userId: string): string {
    return jwt.sign(
      { userId },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  }

  /**
   * Create multiple test users
   */
  static async createUsers(count: number): Promise<(User & { plainPassword: string })[]> {
    const users = [];
    for (let i = 0; i < count; i++) {
      const user = await this.createUser({
        name: `Test User ${i + 1}`,
        email: `test-user-${i + 1}-${Date.now()}@example.com`
      });
      users.push(user);
    }
    return users;
  }

  /**
   * Create multiple test projects for a user
   */
  static async createProjects(userId: string, count: number): Promise<Project[]> {
    const projects = [];
    for (let i = 0; i < count; i++) {
      const project = await this.createProject(userId, {
        name: `Test Project ${i + 1}`,
        description: `Test project ${i + 1} description`
      });
      projects.push(project);
    }
    return projects;
  }

  /**
   * Clean up test data by email pattern
   */
  static async cleanup(emailPattern = 'test-'): Promise<void> {
    // Delete in correct order to respect foreign key constraints
    await prisma.siteGeneration.deleteMany({
      where: {
        project: {
          user: {
            email: {
              contains: emailPattern
            }
          }
        }
      }
    });

    await prisma.assetUpload.deleteMany({
      where: {
        user: {
          email: {
            contains: emailPattern
          }
        }
      }
    });

    await prisma.webhook.deleteMany({
      where: {
        user: {
          email: {
            contains: emailPattern
          }
        }
      }
    });

    await prisma.project.deleteMany({
      where: {
        user: {
          email: {
            contains: emailPattern
          }
        }
      }
    });

    await prisma.user.deleteMany({
      where: {
        email: {
          contains: emailPattern
        }
      }
    });
  }

  /**
   * Create test asset upload
   */
  static async createAssetUpload(userId: string, overrides = {}) {
    return await prisma.assetUpload.create({
      data: {
        filename: `test-file-${Date.now()}.jpg`,
        originalFilename: 'test-image.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        path: `/uploads/images/test-file-${Date.now()}.jpg`,
        url: `https://example.com/uploads/images/test-file-${Date.now()}.jpg`,
        userId,
        ...overrides
      }
    });
  }

  /**
   * Create test webhook
   */
  static async createWebhook(userId: string, overrides = {}) {
    return await prisma.webhook.create({
      data: {
        url: `https://example.com/webhook-${Date.now()}`,
        events: ['generation.started', 'generation.completed'],
        isActive: true,
        userId,
        ...overrides
      }
    });
  }

  /**
   * Create test site generation
   */
  static async createSiteGeneration(projectId: string, overrides = {}) {
    return await prisma.siteGeneration.create({
      data: {
        status: 'PENDING',
        progress: 0,
        hugoTheme: 'business-pro',
        customizations: {
          colors: {
            primary: '#3b82f6',
            secondary: '#64748b'
          }
        },
        projectId,
        ...overrides
      }
    });
  }
}

export default TestDataFactory;
