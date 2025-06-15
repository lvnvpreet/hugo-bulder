import request from 'supertest';
import { app } from '../app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Projects API', () => {
  let authToken: string;
  let userId: string;
  let projectId: string;

  beforeAll(async () => {
    // Create test user and get auth token
    const userData = {
      name: 'Projects Test User',
      email: 'projectstest@test.com',
      password: 'TestPass123!'
    };

    const authResponse = await request(app)
      .post('/api/auth/register')
      .send(userData);

    authToken = authResponse.body.data.token;
    userId = authResponse.body.data.user.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.project.deleteMany({
      where: { userId }
    });
    await prisma.user.delete({
      where: { id: userId }
    });
    await prisma.$disconnect();
  });

  describe('POST /api/projects', () => {
    it('should create a new project successfully', async () => {
      const projectData = {
        name: 'Test Project',
        description: 'A test project for API testing',
        wizardData: {
          websiteType: 'business',
          businessInfo: {
            name: 'Test Business',
            category: 'technology',
            description: 'A test business'
          }
        }
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(projectData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(projectData.name);
      expect(response.body.data.description).toBe(projectData.description);
      expect(response.body.data.currentStep).toBe(1);
      expect(response.body.data.isCompleted).toBe(false);

      projectId = response.body.data.id;
    });

    it('should require authentication', async () => {
      const projectData = {
        name: 'Unauthorized Project',
        description: 'This should fail'
      };

      const response = await request(app)
        .post('/api/projects')
        .send(projectData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should enforce project limits for free plan', async () => {
      // Create projects up to the limit (3 for free plan)
      const createRequests = [];
      for (let i = 2; i <= 4; i++) { // i=2,3,4 (already created 1)
        createRequests.push(
          request(app)
            .post('/api/projects')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              name: `Test Project ${i}`,
              description: `Test project ${i}`
            })
        );
      }

      const responses = await Promise.all(createRequests);
      
      // First two should succeed (total 3 projects)
      expect(responses[0].status).toBe(201);
      expect(responses[1].status).toBe(201);
      
      // Fourth should fail (exceeds limit)
      expect(responses[2].status).toBe(403);
      expect(responses[2].body.error).toContain('limit');
    });
  });

  describe('GET /api/projects', () => {
    it('should get user projects with pagination', async () => {
      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10, offset: 0 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('projects');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.projects)).toBe(true);
    });

    it('should filter projects by generation status', async () => {
      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ generationStatus: 'DRAFT' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.projects.every((p: any) => p.generationStatus === 'DRAFT')).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/projects');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should get specific project with wizard data', async () => {
      const response = await request(app)
        .get(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(projectId);
      expect(response.body.data).toHaveProperty('wizardData');
      expect(response.body.data).toHaveProperty('wizardSteps');
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app)
        .get('/api/projects/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should not allow access to other users projects', async () => {
      // Create another user
      const otherUserData = {
        name: 'Other User',
        email: 'otheruser@test.com',
        password: 'TestPass123!'
      };

      const otherUserAuth = await request(app)
        .post('/api/auth/register')
        .send(otherUserData);

      const otherToken = otherUserAuth.body.data.token;

      const response = await request(app)
        .get(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/projects/:id', () => {
    it('should update project metadata', async () => {
      const updateData = {
        name: 'Updated Project Name',
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.description).toBe(updateData.description);
    });

    it('should validate update data', async () => {
      const response = await request(app)
        .put(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '' }); // Empty name should be invalid

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('should delete project successfully', async () => {
      // Create a project specifically for deletion
      const projectData = {
        name: 'Project to Delete',
        description: 'This project will be deleted'
      };

      const createResponse = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(projectData);

      const deleteProjectId = createResponse.body.data.id;

      const response = await request(app)
        .delete(`/api/projects/${deleteProjectId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify project is deleted
      const getResponse = await request(app)
        .get(`/api/projects/${deleteProjectId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(404);
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app)
        .delete('/api/projects/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/projects/:id/wizard/:step', () => {
    it('should save wizard step data', async () => {
      const stepData = {
        businessInfo: {
          name: 'Test Business Updated',
          category: 'healthcare',
          description: 'Updated business description'
        }
      };

      const response = await request(app)
        .put(`/api/projects/${projectId}/wizard/2`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(stepData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.stepNumber).toBe(2);
      expect(response.body.data.isCompleted).toBe(true);
    });

    it('should validate step number', async () => {
      const response = await request(app)
        .put(`/api/projects/${projectId}/wizard/15`) // Invalid step
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: 'test' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/projects/:id/wizard', () => {
    it('should get complete wizard data', async () => {
      const response = await request(app)
        .get(`/api/projects/${projectId}/wizard`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('steps');
      expect(response.body.data).toHaveProperty('progress');
      expect(Array.isArray(response.body.data.steps)).toBe(true);
    });
  });

  describe('POST /api/projects/:id/wizard/validate/:step', () => {
    it('should validate wizard step data', async () => {
      const stepData = {
        websiteType: 'business',
        businessCategory: 'technology'
      };

      const response = await request(app)
        .post(`/api/projects/${projectId}/wizard/validate/1`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(stepData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('isValid');
    });

    it('should return validation errors for invalid data', async () => {
      const response = await request(app)
        .post(`/api/projects/${projectId}/wizard/validate/1`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({}); // Empty data

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isValid).toBe(false);
      expect(response.body.data).toHaveProperty('errors');
    });
  });

  describe('POST /api/projects/:id/duplicate', () => {
    it('should duplicate project successfully', async () => {
      const response = await request(app)
        .post(`/api/projects/${projectId}/duplicate`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toContain('Copy');
      expect(response.body.data.id).not.toBe(projectId);
    });
  });

  describe('GET /api/projects/:id/analytics', () => {
    it('should get project analytics', async () => {
      const response = await request(app)
        .get(`/api/projects/${projectId}/analytics`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('views');
      expect(response.body.data).toHaveProperty('completionRate');
    });
  });

  describe('Rate limiting', () => {
    it('should enforce rate limits on project creation', async () => {
      const requests = [];
      
      // Make multiple rapid requests
      for (let i = 0; i < 15; i++) {
        requests.push(
          request(app)
            .post('/api/projects')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              name: `Rate Limit Test Project ${i}`,
              description: 'Testing rate limits'
            })
        );
      }

      const responses = await Promise.all(requests);
      
      // Some should be rate limited (429) or fail due to project limits (403)
      const limitedResponses = responses.filter(r => r.status === 429 || r.status === 403);
      expect(limitedResponses.length).toBeGreaterThan(0);
    });
  });
});

export {};
