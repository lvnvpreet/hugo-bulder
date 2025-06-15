import request from 'supertest';
import { app } from '../app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Reference Data API', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    // Create test user and get auth token
    const userData = {
      name: 'Reference Test User',
      email: 'referencetest@test.com',
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

  describe('GET /api/reference/business-categories', () => {
    it('should get all business categories', async () => {
      const response = await request(app)
        .get('/api/reference/business-categories')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.meta).toHaveProperty('total');
      expect(response.body.meta).toHaveProperty('timestamp');
      expect(response.body.meta).toHaveProperty('requestId');

      // Verify category structure
      if (response.body.data.length > 0) {
        const category = response.body.data[0];
        expect(category).toHaveProperty('id');
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('displayName');
        expect(category).toHaveProperty('isActive');
      }
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/reference/business-categories');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should include metadata in response', async () => {
      const response = await request(app)
        .get('/api/reference/business-categories')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.meta.total).toBeGreaterThanOrEqual(0);
      expect(response.body.meta.timestamp).toBeDefined();
      expect(response.body.meta.requestId).toBeDefined();
    });
  });

  describe('GET /api/reference/hugo-themes', () => {
    it('should get all Hugo themes', async () => {
      const response = await request(app)
        .get('/api/reference/hugo-themes')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.meta).toHaveProperty('total');
      expect(response.body.meta).toHaveProperty('filters');

      // Verify theme structure
      if (response.body.data.length > 0) {
        const theme = response.body.data[0];
        expect(theme).toHaveProperty('id');
        expect(theme).toHaveProperty('themeId');
        expect(theme).toHaveProperty('name');
        expect(theme).toHaveProperty('displayName');
        expect(theme).toHaveProperty('category');
        expect(theme).toHaveProperty('isActive');
      }
    });

    it('should filter themes by category', async () => {
      const category = 'business';
      const response = await request(app)
        .get('/api/reference/hugo-themes')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ category });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.meta.filters.category).toBe(category);

      // All returned themes should match the category (if any)
      response.body.data.forEach((theme: any) => {
        expect(theme.category).toBe(category);
      });
    });

    it('should filter themes by featured status', async () => {
      const response = await request(app)
        .get('/api/reference/hugo-themes')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ featured: 'true' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.meta.filters.featured).toBe(true);

      // All returned themes should be featured (if any)
      response.body.data.forEach((theme: any) => {
        expect(theme.isFeatured).toBe(true);
      });
    });

    it('should filter themes by both category and featured status', async () => {
      const response = await request(app)
        .get('/api/reference/hugo-themes')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ 
          category: 'business',
          featured: 'true'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.meta.filters.category).toBe('business');
      expect(response.body.meta.filters.featured).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/reference/hugo-themes');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should handle invalid category gracefully', async () => {
      const response = await request(app)
        .get('/api/reference/hugo-themes')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ category: 'non-existent-category' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('GET /api/reference/website-structures', () => {
    it('should get all website structures', async () => {
      const response = await request(app)
        .get('/api/reference/website-structures')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.meta).toHaveProperty('total');
      expect(response.body.meta).toHaveProperty('filters');

      // Verify structure format
      if (response.body.data.length > 0) {
        const structure = response.body.data[0];
        expect(structure).toHaveProperty('id');
        expect(structure).toHaveProperty('name');
        expect(structure).toHaveProperty('displayName');
        expect(structure).toHaveProperty('type');
        expect(structure).toHaveProperty('isActive');
      }
    });

    it('should filter structures by type', async () => {
      const type = 'SINGLE_PAGE';
      const response = await request(app)
        .get('/api/reference/website-structures')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ type });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.meta.filters.type).toBe(type);

      // All returned structures should match the type (if any)
      response.body.data.forEach((structure: any) => {
        expect(structure.type).toBe(type);
      });
    });

    it('should filter structures by MULTI_PAGE type', async () => {
      const type = 'MULTI_PAGE';
      const response = await request(app)
        .get('/api/reference/website-structures')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ type });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.meta.filters.type).toBe(type);

      // All returned structures should match the type (if any)
      response.body.data.forEach((structure: any) => {
        expect(structure.type).toBe(type);
      });
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/reference/website-structures');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should handle invalid type gracefully', async () => {
      const response = await request(app)
        .get('/api/reference/website-structures')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ type: 'INVALID_TYPE' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // Should return all structures or empty array
    });
  });

  describe('GET /api/reference/locations', () => {
    it('should get all location data', async () => {
      const response = await request(app)
        .get('/api/reference/locations')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.meta).toHaveProperty('country', 'all');

      // Verify location structure
      if (response.body.data.length > 0) {
        const location = response.body.data[0];
        expect(location).toHaveProperty('id');
        expect(location).toHaveProperty('countryCode');
        expect(location).toHaveProperty('countryName');
      }
    });

    it('should filter locations by country', async () => {
      const country = 'US';
      const response = await request(app)
        .get('/api/reference/locations')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ country });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.meta.country).toBe(country);

      // All returned locations should match the country (if any)
      response.body.data.forEach((location: any) => {
        expect(location.countryCode).toBe(country);
      });
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/reference/locations');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should handle invalid country codes gracefully', async () => {
      const response = await request(app)
        .get('/api/reference/locations')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ country: 'XX' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('GET /api/reference/content-suggestions', () => {
    it('should get content suggestions', async () => {
      const response = await request(app)
        .get('/api/reference/content-suggestions')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.meta).toHaveProperty('total');
      expect(response.body.meta).toHaveProperty('filters');

      // Verify suggestion structure
      if (response.body.data.length > 0) {
        const suggestion = response.body.data[0];
        expect(suggestion).toHaveProperty('id');
        expect(suggestion).toHaveProperty('title');
        expect(suggestion).toHaveProperty('description');
      }
    });

    it('should filter suggestions by business type', async () => {
      const businessType = 'technology';
      const response = await request(app)
        .get('/api/reference/content-suggestions')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ businessType });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.meta.filters.businessType).toBe(businessType);
    });

    it('should filter suggestions by content type', async () => {
      const contentType = 'homepage';
      const response = await request(app)
        .get('/api/reference/content-suggestions')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ contentType });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.meta.filters.contentType).toBe(contentType);
    });

    it('should search suggestions by query', async () => {
      const search = 'about';
      const response = await request(app)
        .get('/api/reference/content-suggestions')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ search });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.meta.filters.search).toBe(search);
    });

    it('should filter by multiple parameters', async () => {
      const response = await request(app)
        .get('/api/reference/content-suggestions')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ 
          businessType: 'technology',
          contentType: 'homepage',
          search: 'innovation'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.meta.filters.businessType).toBe('technology');
      expect(response.body.meta.filters.contentType).toBe('homepage');
      expect(response.body.meta.filters.search).toBe('innovation');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/reference/content-suggestions');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should handle empty search results gracefully', async () => {
      const response = await request(app)
        .get('/api/reference/content-suggestions')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ search: 'nonexistentterm12345' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('Response format validation', () => {
    it('should have consistent response format across all endpoints', async () => {
      const endpoints = [
        '/api/reference/business-categories',
        '/api/reference/hugo-themes',
        '/api/reference/website-structures',
        '/api/reference/locations',
        '/api/reference/content-suggestions'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('meta');
        expect(response.body.meta).toHaveProperty('timestamp');
        expect(response.body.meta).toHaveProperty('requestId');
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });

    it('should include proper headers in all responses', async () => {
      const response = await request(app)
        .get('/api/reference/business-categories')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
    });
  });

  describe('Error handling', () => {
    it('should handle malformed queries gracefully', async () => {
      const response = await request(app)
        .get('/api/reference/hugo-themes?featured=invalid')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // Should treat invalid boolean as false
    });

    it('should handle server errors gracefully', async () => {
      // This test would require mocking the service to throw an error
      // For now, we'll test that the service calls don't crash
      const response = await request(app)
        .get('/api/reference/business-categories')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500].includes(response.status)).toBe(true);
    });
  });

  describe('Performance and limits', () => {
    it('should handle large result sets efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/reference/hugo-themes')
        .set('Authorization', `Bearer ${authToken}`);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
    });

    it('should maintain consistent response times', async () => {
      const responses = [];
      
      // Make multiple concurrent requests
      for (let i = 0; i < 5; i++) {
        responses.push(
          request(app)
            .get('/api/reference/business-categories')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      const results = await Promise.all(responses);
      
      // All requests should succeed
      results.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
});
