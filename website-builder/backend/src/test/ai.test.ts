import request from 'supertest';
import { app } from '../app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('AI Services API', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    // Create test user and get auth token
    const userData = {
      name: 'AI Test User',
      email: 'aitest@test.com',
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
    await prisma.user.delete({
      where: { id: userId }
    });
    await prisma.$disconnect();
  });

  describe('GET /api/ai', () => {
    it('should get AI services overview', async () => {
      const response = await request(app)
        .get('/api/ai')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('services');
      expect(response.body.data).toHaveProperty('models');
      expect(Array.isArray(response.body.data.services)).toBe(true);
      expect(Array.isArray(response.body.data.models)).toBe(true);

      // Verify service structure
      if (response.body.data.services.length > 0) {
        const service = response.body.data.services[0];
        expect(service).toHaveProperty('name');
        expect(service).toHaveProperty('status');
        expect(service).toHaveProperty('version');
        expect(service).toHaveProperty('endpoint');
      }

      // Verify model structure
      if (response.body.data.models.length > 0) {
        const model = response.body.data.models[0];
        expect(model).toHaveProperty('id');
        expect(model).toHaveProperty('name');
        expect(model).toHaveProperty('provider');
        expect(model).toHaveProperty('capabilities');
      }
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/ai');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/ai/generate/content', () => {
    it('should generate content with valid request', async () => {
      const contentRequest = {
        prompt: 'Generate homepage content for a technology consulting company',
        contentType: 'homepage',
        businessInfo: {
          name: 'TechCorp Solutions',
          industry: 'technology',
          description: 'Leading technology consulting firm'
        },
        tone: 'professional',
        length: 'medium',
        keywords: ['technology', 'consulting', 'innovation']
      };

      const response = await request(app)
        .post('/api/ai/generate/content')
        .set('Authorization', `Bearer ${authToken}`)
        .send(contentRequest);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('content');
      expect(response.body.data).toHaveProperty('metadata');
      expect(response.body.data).toHaveProperty('suggestions');

      // Verify metadata structure
      expect(response.body.data.metadata).toHaveProperty('wordCount');
      expect(response.body.data.metadata).toHaveProperty('readingTime');
      expect(response.body.data.metadata).toHaveProperty('seoScore');

      // Verify content is string
      expect(typeof response.body.data.content).toBe('string');
      expect(response.body.data.content.length).toBeGreaterThan(0);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/ai/generate/content')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate content type enum', async () => {
      const response = await request(app)
        .post('/api/ai/generate/content')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          prompt: 'Generate content',
          contentType: 'invalid-type'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate tone enum', async () => {
      const response = await request(app)
        .post('/api/ai/generate/content')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          prompt: 'Generate content',
          contentType: 'homepage',
          tone: 'invalid-tone'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/ai/generate/content')
        .send({
          prompt: 'Generate content',
          contentType: 'homepage'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/ai/generate/images', () => {
    it('should generate images with valid request', async () => {
      const imageRequest = {
        prompt: 'Modern office space with people collaborating on technology projects',
        style: 'corporate',
        size: 'landscape',
        count: 2,
        usage: 'hero'
      };

      const response = await request(app)
        .post('/api/ai/generate/images')
        .set('Authorization', `Bearer ${authToken}`)
        .send(imageRequest);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('images');
      expect(response.body.data).toHaveProperty('metadata');
      expect(Array.isArray(response.body.data.images)).toBe(true);

      // Verify image structure
      if (response.body.data.images.length > 0) {
        const image = response.body.data.images[0];
        expect(image).toHaveProperty('id');
        expect(image).toHaveProperty('url');
        expect(image).toHaveProperty('thumbnail');
        expect(image).toHaveProperty('alt');
      }

      // Verify metadata
      expect(response.body.data.metadata).toHaveProperty('generationTime');
      expect(response.body.data.metadata).toHaveProperty('model');
    });

    it('should validate count limits', async () => {
      const response = await request(app)
        .post('/api/ai/generate/images')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          prompt: 'Test image',
          count: 10 // Exceeds maximum
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate style enum', async () => {
      const response = await request(app)
        .post('/api/ai/generate/images')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          prompt: 'Test image',
          style: 'invalid-style'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/ai/generate/images')
        .send({
          prompt: 'Test image'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/ai/generate/seo', () => {
    it('should generate SEO optimizations', async () => {
      const seoRequest = {
        content: 'This is test content for SEO optimization.',
        targetKeywords: ['web development', 'responsive design', 'SEO'],
        contentType: 'page',
        businessInfo: {
          name: 'Test Business',
          industry: 'technology',
          location: 'New York'
        }
      };

      const response = await request(app)
        .post('/api/ai/generate/seo')
        .set('Authorization', `Bearer ${authToken}`)
        .send(seoRequest);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('seo');
      expect(response.body.data).toHaveProperty('analysis');

      // Verify SEO structure
      expect(response.body.data.seo).toHaveProperty('title');
      expect(response.body.data.seo).toHaveProperty('description');
      expect(response.body.data.seo).toHaveProperty('keywords');
      expect(response.body.data.seo).toHaveProperty('optimizedContent');

      // Verify analysis structure
      expect(response.body.data.analysis).toHaveProperty('score');
      expect(response.body.data.analysis).toHaveProperty('improvements');
      expect(Array.isArray(response.body.data.analysis.improvements)).toBe(true);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/ai/generate/seo')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate keywords array', async () => {
      const response = await request(app)
        .post('/api/ai/generate/seo')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Test content',
          targetKeywords: 'not-an-array'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/ai/generate/seo')
        .send({
          content: 'Test content',
          targetKeywords: ['test']
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/ai/generate/logo', () => {
    it('should generate logo with valid request', async () => {
      const logoRequest = {
        businessName: 'TechCorp Solutions',
        industry: 'technology',
        style: 'modern',
        colors: ['blue', 'white', 'gray'],
        includeText: true,
        logoType: 'combination'
      };

      const response = await request(app)
        .post('/api/ai/generate/logo')
        .set('Authorization', `Bearer ${authToken}`)
        .send(logoRequest);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('logos');
      expect(Array.isArray(response.body.data.logos)).toBe(true);

      // Verify logo structure
      if (response.body.data.logos.length > 0) {
        const logo = response.body.data.logos[0];
        expect(logo).toHaveProperty('id');
        expect(logo).toHaveProperty('url');
        expect(logo).toHaveProperty('formats');
        expect(logo).toHaveProperty('variants');

        // Verify formats
        expect(logo.formats).toHaveProperty('svg');
        expect(logo.formats).toHaveProperty('png');
        expect(logo.formats).toHaveProperty('pdf');

        // Verify variants
        expect(logo.variants).toHaveProperty('horizontal');
        expect(logo.variants).toHaveProperty('vertical');
        expect(logo.variants).toHaveProperty('icon');
      }
    });

    it('should validate style enum', async () => {
      const response = await request(app)
        .post('/api/ai/generate/logo')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          businessName: 'Test Corp',
          industry: 'technology',
          style: 'invalid-style'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate logo type enum', async () => {
      const response = await request(app)
        .post('/api/ai/generate/logo')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          businessName: 'Test Corp',
          industry: 'technology',
          logoType: 'invalid-type'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/ai/generate/logo')
        .send({
          businessName: 'Test Corp',
          industry: 'technology'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/ai/analyze', () => {
    it('should analyze website content', async () => {
      const analyzeRequest = {
        type: 'website',
        url: 'https://example.com',
        criteria: ['accessibility', 'seo', 'performance', 'design']
      };

      const response = await request(app)
        .post('/api/ai/analyze')
        .set('Authorization', `Bearer ${authToken}`)
        .send(analyzeRequest);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('analysis');
      expect(response.body.data).toHaveProperty('recommendations');

      // Verify analysis structure
      expect(response.body.data.analysis).toHaveProperty('overallScore');
      expect(response.body.data.analysis).toHaveProperty('categories');
      expect(Array.isArray(response.body.data.recommendations)).toBe(true);

      // Verify category structure
      const categories = response.body.data.analysis.categories;
      expect(categories).toHaveProperty('seo');
      expect(categories).toHaveProperty('accessibility');
      expect(categories).toHaveProperty('performance');

      // Verify recommendations structure
      if (response.body.data.recommendations.length > 0) {
        const recommendation = response.body.data.recommendations[0];
        expect(recommendation).toHaveProperty('category');
        expect(recommendation).toHaveProperty('priority');
        expect(recommendation).toHaveProperty('title');
        expect(recommendation).toHaveProperty('description');
        expect(recommendation).toHaveProperty('impact');
      }
    });

    it('should analyze content text', async () => {
      const analyzeRequest = {
        type: 'content',
        content: 'This is test content to analyze for SEO and readability.',
        criteria: ['seo', 'readability']
      };

      const response = await request(app)
        .post('/api/ai/analyze')
        .set('Authorization', `Bearer ${authToken}`)
        .send(analyzeRequest);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('analysis');
    });

    it('should validate analysis type', async () => {
      const response = await request(app)
        .post('/api/ai/analyze')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'invalid-type'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should require URL for website analysis', async () => {
      const response = await request(app)
        .post('/api/ai/analyze')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'website'
          // Missing URL
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/ai/analyze')
        .send({
          type: 'website',
          url: 'https://example.com'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/ai/models', () => {
    it('should get available AI models', async () => {
      const response = await request(app)
        .get('/api/ai/models')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('models');
      expect(Array.isArray(response.body.data.models)).toBe(true);

      // Verify model structure
      if (response.body.data.models.length > 0) {
        const model = response.body.data.models[0];
        expect(model).toHaveProperty('id');
        expect(model).toHaveProperty('name');
        expect(model).toHaveProperty('provider');
        expect(model).toHaveProperty('type');
        expect(model).toHaveProperty('capabilities');
        expect(model).toHaveProperty('status');
        expect(model).toHaveProperty('limits');

        // Verify capabilities is array
        expect(Array.isArray(model.capabilities)).toBe(true);

        // Verify limits structure
        expect(model.limits).toHaveProperty('requestsPerMinute');
      }
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/ai/models');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/ai/models/:id/status', () => {
    it('should get specific model status', async () => {
      const response = await request(app)
        .get('/api/ai/models/gpt-4/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('model');
      expect(response.body.data).toHaveProperty('usage');

      // Verify model status structure
      const model = response.body.data.model;
      expect(model).toHaveProperty('id');
      expect(model).toHaveProperty('status');
      expect(model).toHaveProperty('health');
      expect(model).toHaveProperty('responseTime');
      expect(model).toHaveProperty('uptime');
      expect(model).toHaveProperty('lastChecked');

      // Verify usage structure
      const usage = response.body.data.usage;
      expect(usage).toHaveProperty('requestsToday');
      expect(usage).toHaveProperty('requestsThisHour');
      expect(usage).toHaveProperty('remainingQuota');
    });

    it('should handle any model ID', async () => {
      const response = await request(app)
        .get('/api/ai/models/custom-model/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.model.id).toBe('custom-model');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/ai/models/gpt-4/status');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Rate limiting', () => {
    it('should enforce rate limits on AI generation endpoints', async () => {
      const promises = [];
      for (let i = 0; i < 15; i++) { // Rapid requests
        promises.push(
          request(app)
            .post('/api/ai/generate/content')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              prompt: `Generate content ${i}`,
              contentType: 'homepage'
            })
        );
      }

      const responses = await Promise.all(promises);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      // Should have some rate limited responses
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should enforce different rate limits for different endpoints', async () => {
      // Image generation typically has stricter limits
      const imagePromises = [];
      for (let i = 0; i < 8; i++) {
        imagePromises.push(
          request(app)
            .post('/api/ai/generate/images')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              prompt: `Generate image ${i}`
            })
        );
      }

      const responses = await Promise.all(imagePromises);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      // Image generation should hit rate limits faster
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Error handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/ai/generate/content')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle very long prompts', async () => {
      const longPrompt = 'a'.repeat(10000); // Very long prompt
      
      const response = await request(app)
        .post('/api/ai/generate/content')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          prompt: longPrompt,
          contentType: 'homepage'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle empty prompts', async () => {
      const response = await request(app)
        .post('/api/ai/generate/content')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          prompt: '',
          contentType: 'homepage'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle invalid URLs in analysis', async () => {
      const response = await request(app)
        .post('/api/ai/analyze')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'website',
          url: 'invalid-url'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Security', () => {
    it('should sanitize prompts for injection attempts', async () => {
      const maliciousPrompt = 'Generate content; DROP TABLE users; --';
      
      const response = await request(app)
        .post('/api/ai/generate/content')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          prompt: maliciousPrompt,
          contentType: 'homepage'
        });

      // Should still process the request safely
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should validate business names for logo generation', async () => {
      const response = await request(app)
        .post('/api/ai/generate/logo')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          businessName: '<script>alert("xss")</script>',
          industry: 'technology'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should prevent excessive resource consumption', async () => {
      const response = await request(app)
        .post('/api/ai/generate/images')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          prompt: 'Generate image',
          count: 4, // Maximum allowed
          size: 'landscape'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should respond within reasonable time limits', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/ai/models')
        .set('Authorization', `Bearer ${authToken}`);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
    });

    it('should handle concurrent requests efficiently', async () => {
      const promises = Array.from({ length: 5 }, () =>
        request(app)
          .get('/api/ai')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(promises);
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
});
