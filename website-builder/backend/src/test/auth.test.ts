import request from 'supertest';
import { app } from '../app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Authentication API', () => {
  let authToken: string;
  let refreshToken: string;
  let userId: string;

  beforeAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: '@test-auth.com'
        }
      }
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: '@test-auth.com'
        }
      }
    });
    await prisma.$disconnect();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        name: 'Test User',
        email: 'testuser@test-auth.com',
        password: 'TestPass123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user).not.toHaveProperty('password');

      // Store for later tests
      authToken = response.body.data.token;
      refreshToken = response.body.data.refreshToken;
      userId = response.body.data.user.id;
    });

    it('should reject duplicate email registration', async () => {
      const userData = {
        name: 'Test User 2',
        email: 'testuser@test-auth.com', // Same email as above
        password: 'TestPass123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('email');
    });

    it('should reject weak passwords', async () => {
      const userData = {
        name: 'Test User 3',
        email: 'testuser3@test-auth.com',
        password: 'weak'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject invalid email format', async () => {
      const userData = {
        name: 'Test User 4',
        email: 'invalid-email',
        password: 'TestPass123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const credentials = {
        email: 'testuser@test-auth.com',
        password: 'TestPass123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user).not.toHaveProperty('password');

      // Update tokens for further tests
      authToken = response.body.data.token;
      refreshToken = response.body.data.refreshToken;
    });

    it('should reject invalid email', async () => {
      const credentials = {
        email: 'nonexistent@test-auth.com',
        password: 'TestPass123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject invalid password', async () => {
      const credentials = {
        email: 'testuser@test-auth.com',
        password: 'WrongPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject malformed requests', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('refreshToken');

      // Update tokens
      authToken = response.body.data.token;
      refreshToken = response.body.data.refreshToken;
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-refresh-token' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should send password reset email for valid email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'testuser@test-auth.com' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('reset link');
    });

    it('should return success even for non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@test-auth.com' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'invalid-email' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Logout successful');
    });

    it('should handle logout with invalid refresh token gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken: 'invalid-token' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Authentication middleware', () => {
    it('should reject requests without token', async () => {
      const response = await request(app)
        .get('/api/projects')
        .send();

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', 'Bearer invalid-token')
        .send();

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should accept requests with valid token', async () => {
      // First login to get a fresh token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testuser@test-auth.com',
          password: 'TestPass123!'
        });

      const validToken = loginResponse.body.data.token;

      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${validToken}`)
        .send();

      // Should not be 401 (could be 200 with empty projects or other status)
      expect(response.status).not.toBe(401);
    });
  });

  describe('Rate limiting', () => {
    it('should enforce rate limits on auth endpoints', async () => {
      const requests = [];
      
      // Make multiple rapid requests
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'testuser@test-auth.com',
              password: 'WrongPassword123!'
            })
        );
      }

      const responses = await Promise.all(requests);
      
      // At least one should be rate limited (429)
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});

export {};
