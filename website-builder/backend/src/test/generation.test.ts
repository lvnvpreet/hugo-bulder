import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

describe('Website Generation API', () => {
  let authToken: string;
  let userId: string;
  let projectId: string;
  let generationId: string;

  beforeAll(async () => {
    // Setup test database connection
    await prisma.$connect();
    
    // Clean up any existing test data
    await prisma.siteGeneration.deleteMany({
      where: { project: { name: { contains: 'Test Website' } } }
    });
    await prisma.project.deleteMany({
      where: { name: { contains: 'Test Website' } }
    });
    await prisma.user.deleteMany({
      where: { email: { contains: 'test-gen' } }
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.siteGeneration.deleteMany({
      where: { project: { name: { contains: 'Test Website' } } }
    });
    await prisma.project.deleteMany({
      where: { name: { contains: 'Test Website' } }
    });
    await prisma.user.deleteMany({
      where: { email: { contains: 'test-gen' } }
    });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Create test user directly in database for consistent setup
    const user = await prisma.user.create({
      data: {
        email: `test-gen-${Date.now()}@example.com`,
        password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password: 'Test123!@#'
        name: 'Test User',
        emailVerified: true
      }
    });

    userId = user.id;
    authToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'test-secret');

    // Create a test project
    const project = await prisma.project.create({
      data: {
        name: 'Test Website',
        description: 'Test website for generation',
        slug: `test-website-${Date.now()}`,
        userId: user.id,
        wizardData: {
          websiteType: 'business',
          businessInfo: {
            name: 'Test Business',
            description: 'A test business'
          },
          designPreferences: {
            theme: 'business-pro',
            colorScheme: 'blue'
          }
        }
      }
    });

    projectId = project.id;
  });

  afterEach(async () => {
    // Clean up test data after each test
    if (generationId) {
      await prisma.siteGeneration.deleteMany({
        where: { id: generationId }
      });
      generationId = '';
    }
  });

  describe('POST /api/generations/:projectId/start', () => {
    it('should start website generation successfully', async () => {
      const response = await request(app)
        .post(`/api/generations/${projectId}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          hugoTheme: 'business-pro',
          customizations: {
            colors: {
              primary: '#3b82f6',
              secondary: '#64748b'
            },
            fonts: {
              heading: 'Inter',
              body: 'Source Sans Pro'
            }
          },
          contentOptions: {
            aiModel: 'gpt-4',
            tone: 'professional',
            length: 'medium',
            includeSEO: true
          }
        });

      expect(response.status).toBe(202);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('generationId');
      expect(response.body.data.status).toBe('PENDING');

      generationId = response.body.data.generationId;
    });

    it('should start generation with minimal required data', async () => {
      const response = await request(app)
        .post(`/api/generations/${projectId}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          hugoTheme: 'business-pro'
        });

      expect(response.status).toBe(202);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('generationId');
    });

    it('should validate Hugo theme availability', async () => {
      const response = await request(app)
        .post(`/api/generations/${projectId}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          hugoTheme: 'invalid-theme',
          contentOptions: {
            tone: 'professional'
          }
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_THEME');
    });

    it('should validate customization parameters', async () => {
      const response = await request(app)
        .post(`/api/generations/${projectId}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          hugoTheme: 'business-pro',
          customizations: {
            colors: {
              primary: 'invalid-color'
            }
          }
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject non-existent project', async () => {
      const response = await request(app)
        .post('/api/generations/non-existent-project/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          hugoTheme: 'business-pro'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should reject unauthorized access', async () => {
      const response = await request(app)
        .post(`/api/generations/${projectId}/start`)
        .send({
          hugoTheme: 'business-pro'
        });

      expect(response.status).toBe(401);
    });

    it('should prevent concurrent generations for same project', async () => {
      // Start first generation
      const firstResponse = await request(app)
        .post(`/api/generations/${projectId}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          hugoTheme: 'business-pro'
        });

      expect(firstResponse.status).toBe(202);

      // Try to start second generation for same project
      const secondResponse = await request(app)
        .post(`/api/generations/${projectId}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          hugoTheme: 'business-pro'
        });

      expect(secondResponse.status).toBe(409);
      expect(secondResponse.body.error.code).toBe('GENERATION_IN_PROGRESS');
    });

    it('should handle rate limiting', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .post(`/api/generations/${projectId}/start`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              hugoTheme: 'business-pro'
            })
        );
      }

      const responses = await Promise.all(promises);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should validate content options', async () => {
      const response = await request(app)
        .post(`/api/generations/${projectId}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          hugoTheme: 'business-pro',
          contentOptions: {
            aiModel: 'invalid-model',
            tone: 'invalid-tone',
            length: 'invalid-length'
          }
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/generations/:generationId/status', () => {
    beforeEach(async () => {
      // Start a generation first
      const startResponse = await request(app)
        .post(`/api/generations/${projectId}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          hugoTheme: 'business-pro'
        });

      generationId = startResponse.body.data.generationId;
    });

    it('should get generation status successfully', async () => {
      const response = await request(app)
        .get(`/api/generations/${generationId}/status`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', generationId);
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('progress');
      expect(response.body.data).toHaveProperty('createdAt');
    });

    it('should return detailed status information', async () => {
      const response = await request(app)
        .get(`/api/generations/${generationId}/status`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.body.data).toHaveProperty('steps');
      expect(response.body.data).toHaveProperty('currentStep');
      expect(response.body.data).toHaveProperty('estimatedCompletion');
    });

    it('should reject access to other user\'s generation', async () => {
      // Create another user
      const otherUser = await prisma.user.create({
        data: {
          email: `other-gen-${Date.now()}@example.com`,
          password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
          name: 'Other User',
          emailVerified: true
        }
      });

      const otherToken = jwt.sign({ userId: otherUser.id }, process.env.JWT_SECRET || 'test-secret');

      const response = await request(app)
        .get(`/api/generations/${generationId}/status`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(404);
    });

    it('should handle non-existent generation', async () => {
      const response = await request(app)
        .get('/api/generations/non-existent-id/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/generations/${generationId}/status`);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/generations', () => {
    it('should get generation history', async () => {
      const response = await request(app)
        .get('/api/generations')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body).toHaveProperty('pagination');
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/generations?page=1&pageSize=5')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.pageSize).toBe(5);
    });

    it('should support filtering by status', async () => {
      const response = await request(app)
        .get('/api/generations?status=COMPLETED')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const generations = response.body.data;
      generations.forEach((gen: any) => {
        expect(gen.status).toBe('COMPLETED');
      });
    });

    it('should support filtering by project', async () => {
      const response = await request(app)
        .get(`/api/generations?projectId=${projectId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const generations = response.body.data;
      generations.forEach((gen: any) => {
        expect(gen.projectId).toBe(projectId);
      });
    });

    it('should support sorting', async () => {
      const response = await request(app)
        .get('/api/generations?sortBy=createdAt&sortOrder=desc')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const generations = response.body.data;
      if (generations.length > 1) {
        expect(new Date(generations[0].createdAt).getTime())
          .toBeGreaterThanOrEqual(new Date(generations[1].createdAt).getTime());
      }
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/generations');

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/generations/:generationId/cancel', () => {
    beforeEach(async () => {
      // Start a generation first
      const startResponse = await request(app)
        .post(`/api/generations/${projectId}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          hugoTheme: 'business-pro'
        });

      generationId = startResponse.body.data.generationId;
    });

    it('should cancel ongoing generation', async () => {
      const response = await request(app)
        .delete(`/api/generations/${generationId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.cancelled).toBe(true);
    });

    it('should not cancel completed generation', async () => {
      // Update generation status to completed
      await prisma.siteGeneration.update({
        where: { id: generationId },
        data: { status: 'COMPLETED' }
      });

      const response = await request(app)
        .delete(`/api/generations/${generationId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('CANNOT_CANCEL_COMPLETED');
    });

    it('should reject access to other user\'s generation', async () => {
      const otherUser = await prisma.user.create({
        data: {
          email: `other-cancel-${Date.now()}@example.com`,
          password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
          name: 'Other User',
          emailVerified: true
        }
      });

      const otherToken = jwt.sign({ userId: otherUser.id }, process.env.JWT_SECRET || 'test-secret');

      const response = await request(app)
        .delete(`/api/generations/${generationId}/cancel`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/generations/bulk', () => {
    let projectId2: string;

    beforeEach(async () => {
      // Create second test project
      const project2 = await prisma.project.create({
        data: {
          name: 'Test Website 2',
          description: 'Second test website',
          slug: `test-website-2-${Date.now()}`,
          userId: userId,
          wizardData: {
            websiteType: 'business',
            businessInfo: {
              name: 'Test Business 2',
              description: 'Another test business'
            }
          }
        }
      });

      projectId2 = project2.id;
    });

    it('should start bulk generation', async () => {
      const response = await request(app)
        .post('/api/generations/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          projectIds: [projectId, projectId2],
          hugoTheme: 'business-pro',
          customizations: {
            colors: {
              primary: '#3b82f6'
            }
          }
        });

      expect(response.status).toBe(202);
      expect(response.body.success).toBe(true);
      expect(response.body.data.results).toHaveLength(2);
      expect(response.body.data.summary.total).toBe(2);
    });

    it('should handle mixed success/failure in bulk', async () => {
      const response = await request(app)
        .post('/api/generations/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          projectIds: [projectId, 'invalid-project-id'],
          hugoTheme: 'business-pro'
        });

      expect(response.status).toBe(202);
      expect(response.body.data.summary.successful).toBe(1);
      expect(response.body.data.summary.failed).toBe(1);
    });

    it('should validate bulk generation limits', async () => {
      const tooManyProjects = Array(51).fill(projectId); // Assuming 50 is the limit

      const response = await request(app)
        .post('/api/generations/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          projectIds: tooManyProjects,
          hugoTheme: 'business-pro'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('BULK_LIMIT_EXCEEDED');
    });
  });

  describe('GET /api/generations/analytics', () => {
    it('should get generation analytics', async () => {
      const response = await request(app)
        .get('/api/generations/analytics')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalGenerations');
      expect(response.body.data).toHaveProperty('popularThemes');
      expect(response.body.data).toHaveProperty('generationsByDay');
      expect(response.body.data).toHaveProperty('averageGenerationTime');
      expect(response.body.data).toHaveProperty('successRate');
    });

    it('should support date range filtering', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();

      const response = await request(app)
        .get('/api/generations/analytics')
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('dateRange');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/generations/analytics');

      expect(response.status).toBe(401);
    });
  });

  describe('Generation Performance & Load Tests', () => {
    it('should handle multiple concurrent generations', async () => {
      // Create multiple projects
      const projects = await Promise.all([1, 2, 3].map(i => 
        prisma.project.create({
          data: {
            name: `Load Test Project ${i}`,
            description: `Load test project ${i}`,
            slug: `load-test-${i}-${Date.now()}`,
            userId: userId,
            wizardData: { websiteType: 'business' }
          }
        })
      ));

      const promises = projects.map(project =>
        request(app)
          .post(`/api/generations/${project.id}/start`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ hugoTheme: 'business-pro' })
      );

      const responses = await Promise.all(promises);
      
      // At least some should succeed
      const successfulResponses = responses.filter(r => r.status === 202);
      expect(successfulResponses.length).toBeGreaterThan(0);
    });

    it('should handle generation timeout scenarios', async () => {
      const response = await request(app)
        .post(`/api/generations/${projectId}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          hugoTheme: 'business-pro',
          contentOptions: {
            timeout: 1 // Very short timeout to trigger timeout scenario
          }
        });

      expect(response.status).toBe(202);
      
      // Wait and check status
      setTimeout(async () => {
        const statusResponse = await request(app)
          .get(`/api/generations/${response.body.data.generationId}/status`)
          .set('Authorization', `Bearer ${authToken}`);
        
        expect(['TIMEOUT', 'FAILED'].includes(statusResponse.body.data.status)).toBe(true);
      }, 2000);
    });
  });

  describe('Integration with Webhooks', () => {
    let webhookId: string;

    beforeEach(async () => {
      // Register a webhook
      const webhookResponse = await request(app)
        .post('/api/webhooks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'https://httpbin.org/post',
          events: ['generation.started', 'generation.completed', 'generation.failed'],
          headers: {
            'X-API-Key': 'test-key'
          }
        });

      webhookId = webhookResponse.body.data.id;
    });

    it('should trigger webhooks during generation lifecycle', async () => {
      const startResponse = await request(app)
        .post(`/api/generations/${projectId}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          hugoTheme: 'business-pro'
        });

      expect(startResponse.status).toBe(202);
      generationId = startResponse.body.data.generationId;

      // Check webhook deliveries (assuming webhook service records deliveries)
      const webhookStats = await request(app)
        .get('/api/webhooks/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(webhookStats.body.data.totalDeliveries).toBeGreaterThan(0);
    });
  });
});
