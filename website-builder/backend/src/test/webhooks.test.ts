import request from 'supertest';
import { app } from '../app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Webhooks API', () => {
  let authToken: string;
  let userId: string;
  let webhookId: string;

  beforeAll(async () => {
    // Create test user and get auth token
    const userData = {
      name: 'Webhooks Test User',
      email: 'webhookstest@test.com',
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
    await prisma.webhook.deleteMany({
      where: { userId }
    });
    await prisma.user.delete({
      where: { id: userId }
    });
    await prisma.$disconnect();
  });

  describe('POST /api/webhooks', () => {
    it('should register a new webhook successfully', async () => {
      const webhookData = {
        url: 'https://api.example.com/webhooks/site-generation',
        events: ['generation.started', 'generation.completed'],
        secret: 'webhook_secret_123',
        isActive: true
      };

      const response = await request(app)
        .post('/api/webhooks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(webhookData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.url).toBe(webhookData.url);
      expect(response.body.data.events).toEqual(webhookData.events);
      expect(response.body.data.isActive).toBe(true);
      expect(response.body.data).not.toHaveProperty('secret'); // Secret should not be returned

      webhookId = response.body.data.id;
    });

    it('should validate webhook URL format', async () => {
      const webhookData = {
        url: 'invalid-url',
        events: ['generation.started']
      };

      const response = await request(app)
        .post('/api/webhooks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(webhookData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('url');
    });

    it('should validate webhook events', async () => {
      const webhookData = {
        url: 'https://api.example.com/webhook',
        events: ['invalid.event']
      };

      const response = await request(app)
        .post('/api/webhooks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(webhookData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const webhookData = {
        url: 'https://api.example.com/webhook',
        events: ['generation.started']
      };

      const response = await request(app)
        .post('/api/webhooks')
        .send(webhookData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should enforce webhook limits per user', async () => {
      // Create multiple webhooks to test limit
      const createWebhookPromises = [];
      for (let i = 0; i < 12; i++) { // Assuming 10 webhook limit
        createWebhookPromises.push(
          request(app)
            .post('/api/webhooks')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              url: `https://api.example.com/webhook-${i}`,
              events: ['generation.started']
            })
        );
      }

      const responses = await Promise.all(createWebhookPromises);
      
      // Some should succeed, last ones should fail
      const successfulCount = responses.filter(r => r.status === 201).length;
      const failedCount = responses.filter(r => r.status === 403).length;
      
      expect(successfulCount).toBeGreaterThan(0);
      expect(failedCount).toBeGreaterThan(0);
    });

    it('should prevent duplicate webhook URLs for same user', async () => {
      const webhookData = {
        url: 'https://api.example.com/duplicate-test',
        events: ['generation.started']
      };

      // Create first webhook
      const response1 = await request(app)
        .post('/api/webhooks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(webhookData);

      expect(response1.status).toBe(201);

      // Try to create duplicate
      const response2 = await request(app)
        .post('/api/webhooks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(webhookData);

      expect(response2.status).toBe(409);
      expect(response2.body.success).toBe(false);
      expect(response2.body.error).toContain('already exists');
    });
  });

  describe('GET /api/webhooks', () => {
    it('should get user webhooks with pagination', async () => {
      const response = await request(app)
        .get('/api/webhooks')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, pageSize: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('pageSize');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('totalPages');

      // Verify webhook structure
      if (response.body.data.length > 0) {
        const webhook = response.body.data[0];
        expect(webhook).toHaveProperty('id');
        expect(webhook).toHaveProperty('url');
        expect(webhook).toHaveProperty('events');
        expect(webhook).toHaveProperty('isActive');
        expect(webhook).toHaveProperty('createdAt');
        expect(webhook).not.toHaveProperty('secret'); // Secret should not be returned
      }
    });

    it('should filter webhooks by active status', async () => {
      const response = await request(app)
        .get('/api/webhooks')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ isActive: true });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // All returned webhooks should be active
      response.body.data.forEach((webhook: any) => {
        expect(webhook.isActive).toBe(true);
      });
    });

    it('should filter webhooks by event type', async () => {
      const response = await request(app)
        .get('/api/webhooks')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ event: 'generation.started' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // All returned webhooks should include the specified event
      response.body.data.forEach((webhook: any) => {
        expect(webhook.events).toContain('generation.started');
      });
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/webhooks');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/webhooks/:id', () => {
    it('should update webhook configuration', async () => {
      const updateData = {
        url: 'https://api.example.com/updated-webhook',
        events: ['generation.completed', 'generation.failed'],
        isActive: false
      };

      const response = await request(app)
        .put(`/api/webhooks/${webhookId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.url).toBe(updateData.url);
      expect(response.body.data.events).toEqual(updateData.events);
      expect(response.body.data.isActive).toBe(updateData.isActive);
    });

    it('should return 404 for non-existent webhook', async () => {
      const response = await request(app)
        .put('/api/webhooks/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ url: 'https://api.example.com/test' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should prevent updating webhooks owned by other users', async () => {
      // Create another user
      const otherUserData = {
        name: 'Other User',
        email: 'otheruser@webhooktest.com',
        password: 'TestPass123!'
      };

      const otherUserAuth = await request(app)
        .post('/api/auth/register')
        .send(otherUserData);

      const otherToken = otherUserAuth.body.data.token;

      const response = await request(app)
        .put(`/api/webhooks/${webhookId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ url: 'https://api.example.com/hack' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .put(`/api/webhooks/${webhookId}`)
        .send({ url: 'https://api.example.com/test' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/webhooks/:id', () => {
    it('should delete specific webhook', async () => {
      // Create a webhook to delete
      const createResponse = await request(app)
        .post('/api/webhooks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'https://api.example.com/delete-test',
          events: ['generation.started']
        });

      const webhookToDelete = createResponse.body.data.id;

      const response = await request(app)
        .delete(`/api/webhooks/${webhookToDelete}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('removed');

      // Verify webhook is deleted
      const getResponse = await request(app)
        .get('/api/webhooks')
        .set('Authorization', `Bearer ${authToken}`);

      const remainingWebhooks = getResponse.body.data.filter((w: any) => w.id === webhookToDelete);
      expect(remainingWebhooks).toHaveLength(0);
    });

    it('should return 404 for non-existent webhook', async () => {
      const response = await request(app)
        .delete('/api/webhooks/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete(`/api/webhooks/${webhookId}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/webhooks', () => {
    it('should clear all user webhooks', async () => {
      // Create multiple webhooks first
      await request(app)
        .post('/api/webhooks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'https://api.example.com/clear-test-1',
          events: ['generation.started']
        });

      await request(app)
        .post('/api/webhooks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'https://api.example.com/clear-test-2',
          events: ['generation.completed']
        });

      const response = await request(app)
        .delete('/api/webhooks')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('cleared');

      // Verify all webhooks are deleted
      const getResponse = await request(app)
        .get('/api/webhooks')
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.body.data).toHaveLength(0);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete('/api/webhooks');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/webhooks/stats', () => {
    beforeEach(async () => {
      // Create some test webhooks for stats
      await request(app)
        .post('/api/webhooks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'https://api.example.com/stats-test-1',
          events: ['generation.started']
        });

      await request(app)
        .post('/api/webhooks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'https://api.example.com/stats-test-2',
          events: ['generation.completed'],
          isActive: false
        });
    });

    it('should get webhook statistics', async () => {
      const response = await request(app)
        .get('/api/webhooks/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalWebhooks');
      expect(response.body.data).toHaveProperty('activeWebhooks');
      expect(response.body.data).toHaveProperty('inactiveWebhooks');
      expect(response.body.data).toHaveProperty('eventBreakdown');
      expect(response.body.data).toHaveProperty('totalDeliveries');
      expect(response.body.data).toHaveProperty('successfulDeliveries');
      expect(response.body.data).toHaveProperty('failedDeliveries');
      expect(response.body.data).toHaveProperty('averageResponseTime');

      // Verify data consistency
      const stats = response.body.data;
      expect(stats.totalWebhooks).toBe(stats.activeWebhooks + stats.inactiveWebhooks);
      expect(typeof stats.eventBreakdown).toBe('object');
    });

    it('should include time range filtering', async () => {
      const response = await request(app)
        .get('/api/webhooks/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalWebhooks');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/webhooks/stats');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/webhooks/test', () => {
    it('should test webhook delivery', async () => {
      const response = await request(app)
        .post('/api/webhooks/test')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          webhookId,
          testEvent: 'generation.started',
          testPayload: {
            generationId: 'test-gen-123',
            projectId: 'test-proj-456',
            status: 'started'
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('deliveryId');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('responseTime');
    });

    it('should return 404 for non-existent webhook', async () => {
      const response = await request(app)
        .post('/api/webhooks/test')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          webhookId: 'non-existent-id',
          testEvent: 'generation.started'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/webhooks/test')
        .send({
          webhookId,
          testEvent: 'generation.started'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle invalid JSON in request body', async () => {
      const response = await request(app)
        .post('/api/webhooks')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle very long webhook URLs gracefully', async () => {
      const longUrl = 'https://api.example.com/' + 'a'.repeat(2000);
      
      const response = await request(app)
        .post('/api/webhooks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: longUrl,
          events: ['generation.started']
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate webhook secret length', async () => {
      const response = await request(app)
        .post('/api/webhooks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'https://api.example.com/webhook',
          events: ['generation.started'],
          secret: 'a' // Too short
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle concurrent webhook creation', async () => {
      const webhookData = {
        url: 'https://api.example.com/concurrent-test',
        events: ['generation.started']
      };

      // Create multiple webhooks concurrently
      const promises = Array.from({ length: 5 }, () =>
        request(app)
          .post('/api/webhooks')
          .set('Authorization', `Bearer ${authToken}`)
          .send(webhookData)
      );

      const responses = await Promise.all(promises);
      
      // Only one should succeed due to unique constraint
      const successfulResponses = responses.filter(r => r.status === 201);
      const conflictResponses = responses.filter(r => r.status === 409);
      
      expect(successfulResponses).toHaveLength(1);
      expect(conflictResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Rate limiting', () => {
    it('should enforce rate limits on webhook creation', async () => {
      const promises = [];
      for (let i = 0; i < 20; i++) { // Assuming lower rate limit for webhook creation
        promises.push(
          request(app)
            .post('/api/webhooks')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              url: `https://api.example.com/rate-limit-test-${i}`,
              events: ['generation.started']
            })
        );
      }

      const responses = await Promise.all(promises);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should enforce rate limits on webhook testing', async () => {
      const promises = [];
      for (let i = 0; i < 15; i++) { // Test rapid webhook testing
        promises.push(
          request(app)
            .post('/api/webhooks/test')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              webhookId,
              testEvent: 'generation.started'
            })
        );
      }

      const responses = await Promise.all(promises);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Security', () => {
    it('should not expose webhook secrets in responses', async () => {
      const webhookData = {
        url: 'https://api.example.com/secret-test',
        events: ['generation.started'],
        secret: 'super-secret-webhook-key'
      };

      const createResponse = await request(app)
        .post('/api/webhooks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(webhookData);

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.data).not.toHaveProperty('secret');

      // Also check in list response
      const listResponse = await request(app)
        .get('/api/webhooks')
        .set('Authorization', `Bearer ${authToken}`);

      listResponse.body.data.forEach((webhook: any) => {
        expect(webhook).not.toHaveProperty('secret');
      });
    });

    it('should sanitize webhook URLs', async () => {
      const maliciousUrl = 'javascript:alert("xss")';
      
      const response = await request(app)
        .post('/api/webhooks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: maliciousUrl,
          events: ['generation.started']
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate webhook event names against whitelist', async () => {
      const response = await request(app)
        .post('/api/webhooks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'https://api.example.com/webhook',
          events: ['malicious.event', '../../../etc/passwd']
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
