import request from 'supertest';
import { app } from '../app';
import { PrismaClient } from '@prisma/client';
import fs from 'fs-extra';
import path from 'path';

const prisma = new PrismaClient();

describe('Assets API', () => {
  let authToken: string;
  let userId: string;
  let projectId: string;
  let assetId: string;
  const testUploadDir = path.join(process.cwd(), 'uploads', 'test');

  beforeAll(async () => {
    // Ensure test upload directory exists
    await fs.ensureDir(testUploadDir);

    // Create test user and get auth token
    const userData = {
      name: 'Assets Test User',
      email: 'assetstest@test.com',
      password: 'TestPass123!'
    };

    const authResponse = await request(app)
      .post('/api/auth/register')
      .send(userData);

    authToken = authResponse.body.data.token;
    userId = authResponse.body.data.user.id;

    // Create a test project
    const projectData = {
      name: 'Test Project for Assets',
      description: 'Project for testing asset management'
    };

    const projectResponse = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${authToken}`)
      .send(projectData);

    projectId = projectResponse.body.data.id;

    // Create test image file
    const testImagePath = path.join(testUploadDir, 'test-image.png');
    const imageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    await fs.writeFile(testImagePath, imageBuffer);
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.assetUpload.deleteMany({
      where: { userId }
    });
    await prisma.project.deleteMany({
      where: { userId }
    });
    await prisma.user.delete({
      where: { id: userId }
    });

    // Clean up test files
    await fs.remove(testUploadDir);

    await prisma.$disconnect();
  });

  describe('POST /api/assets/upload', () => {
    it('should upload a single file successfully', async () => {
      const testImagePath = path.join(testUploadDir, 'test-image.png');

      const response = await request(app)
        .post('/api/assets/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testImagePath)
        .field('projectId', projectId)
        .field('usage', 'HERO_IMAGE')
        .field('generateThumbnail', 'true');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('filename');
      expect(response.body.data).toHaveProperty('originalName');
      expect(response.body.data.assetType).toBe('IMAGE');
      expect(response.body.data.usage).toBe('HERO_IMAGE');
      expect(response.body.data.projectId).toBe(projectId);

      assetId = response.body.data.id;
    });

    it('should require authentication', async () => {
      const testImagePath = path.join(testUploadDir, 'test-image.png');

      const response = await request(app)
        .post('/api/assets/upload')
        .attach('file', testImagePath);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject upload without file', async () => {
      const response = await request(app)
        .post('/api/assets/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('projectId', projectId);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_FILE_PROVIDED');
    });

    it('should enforce file size limits', async () => {
      // Create a large dummy file (this test assumes 10MB limit)
      const largeFilePath = path.join(testUploadDir, 'large-file.txt');
      const largeContent = 'x'.repeat(11 * 1024 * 1024); // 11MB
      await fs.writeFile(largeFilePath, largeContent);

      const response = await request(app)
        .post('/api/assets/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', largeFilePath)
        .field('projectId', projectId);

      expect(response.status).toBe(413);

      // Clean up
      await fs.remove(largeFilePath);
    });

    it('should reject invalid file types', async () => {
      const invalidFilePath = path.join(testUploadDir, 'invalid-file.exe');
      await fs.writeFile(invalidFilePath, 'fake executable content');

      const response = await request(app)
        .post('/api/assets/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', invalidFilePath)
        .field('projectId', projectId);

      expect(response.status).toBe(400);

      // Clean up
      await fs.remove(invalidFilePath);
    });
  });

  describe('POST /api/assets/upload/bulk', () => {
    it('should upload multiple files successfully', async () => {
      // Create additional test files
      const testImage2Path = path.join(testUploadDir, 'test-image2.png');
      const testImage3Path = path.join(testUploadDir, 'test-image3.png');
      const imageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
      
      await fs.writeFile(testImage2Path, imageBuffer);
      await fs.writeFile(testImage3Path, imageBuffer);

      const response = await request(app)
        .post('/api/assets/upload/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('files', testImage2Path)
        .attach('files', testImage3Path)
        .field('projectId', projectId)
        .field('usage', 'GALLERY');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta.totalFiles).toBe(2);
      expect(response.body.meta.successfulUploads).toBe(2);

      // Verify all uploads have correct metadata
      response.body.data.forEach((asset: any) => {
        expect(asset).toHaveProperty('id');
        expect(asset.assetType).toBe('IMAGE');
        expect(asset.usage).toBe('GALLERY');
        expect(asset.projectId).toBe(projectId);
      });
    });

    it('should require authentication', async () => {
      const testImagePath = path.join(testUploadDir, 'test-image.png');

      const response = await request(app)
        .post('/api/assets/upload/bulk')
        .attach('files', testImagePath);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject bulk upload without files', async () => {
      const response = await request(app)
        .post('/api/assets/upload/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .field('projectId', projectId);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_FILES_PROVIDED');
    });

    it('should enforce file count limits', async () => {
      // Try to upload more than 10 files (assuming 10 file limit)
      const uploadRequest = request(app)
        .post('/api/assets/upload/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .field('projectId', projectId);

      // Add 11 files
      const testImagePath = path.join(testUploadDir, 'test-image.png');
      for (let i = 0; i < 11; i++) {
        uploadRequest.attach('files', testImagePath);
      }

      const response = await uploadRequest;

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/assets', () => {
    it('should get user assets with pagination', async () => {
      const response = await request(app)
        .get('/api/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          page: 1,
          pageSize: 10
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('pageSize');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('totalPages');
    });

    it('should filter assets by project', async () => {
      const response = await request(app)
        .get('/api/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          projectId
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // All returned assets should belong to the specified project
      response.body.data.forEach((asset: any) => {
        expect(asset.projectId).toBe(projectId);
      });
    });

    it('should filter assets by type', async () => {
      const response = await request(app)
        .get('/api/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          assetType: 'IMAGE'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // All returned assets should be images
      response.body.data.forEach((asset: any) => {
        expect(asset.assetType).toBe('IMAGE');
      });
    });

    it('should search assets by filename', async () => {
      const response = await request(app)
        .get('/api/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          search: 'test-image'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/assets');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/assets/stats', () => {
    it('should get asset usage statistics', async () => {
      const response = await request(app)
        .get('/api/assets/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalAssets');
      expect(response.body.data).toHaveProperty('totalSize');
      expect(response.body.data).toHaveProperty('byType');
      expect(response.body.data).toHaveProperty('storageLimit');
      expect(response.body.data).toHaveProperty('usagePercentage');
    });

    it('should get stats for specific project', async () => {
      const response = await request(app)
        .get('/api/assets/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ projectId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalAssets');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/assets/stats');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/assets/:id', () => {
    it('should get single asset details', async () => {
      const response = await request(app)
        .get(`/api/assets/${assetId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', assetId);
      expect(response.body.data).toHaveProperty('filename');
      expect(response.body.data).toHaveProperty('originalName');
      expect(response.body.data).toHaveProperty('mimeType');
      expect(response.body.data).toHaveProperty('fileSize');
      expect(response.body.data).toHaveProperty('assetType');
    });

    it('should return 404 for non-existent asset', async () => {
      const response = await request(app)
        .get('/api/assets/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ASSET_NOT_FOUND');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/assets/${assetId}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/assets/:id', () => {
    it('should update asset metadata', async () => {
      const updateData = {
        alt: 'Updated alt text',
        caption: 'Updated caption',
        usage: 'LOGO'
      };

      const response = await request(app)
        .put(`/api/assets/${assetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.alt).toBe(updateData.alt);
      expect(response.body.data.caption).toBe(updateData.caption);
      expect(response.body.data.usage).toBe(updateData.usage);
    });

    it('should return 404 for non-existent asset', async () => {
      const response = await request(app)
        .put('/api/assets/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ alt: 'test' });

      expect(response.status).toBe(404);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .put(`/api/assets/${assetId}`)
        .send({ alt: 'test' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/assets/:id/serve', () => {
    it('should serve asset file with appropriate headers', async () => {
      const response = await request(app)
        .get(`/api/assets/${assetId}/serve`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('image');
      expect(response.headers['cache-control']).toContain('public');
      expect(response.headers['content-length']).toBeDefined();
    });

    it('should return 404 for non-existent asset', async () => {
      const response = await request(app)
        .get('/api/assets/non-existent-id/serve')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/assets/${assetId}/serve`);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/assets/:id/download', () => {
    it('should download asset file with appropriate headers', async () => {
      const response = await request(app)
        .get(`/api/assets/${assetId}/download`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-type']).toBeDefined();
      expect(response.headers['content-length']).toBeDefined();
    });

    it('should return 404 for non-existent asset', async () => {
      const response = await request(app)
        .get('/api/assets/non-existent-id/download')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/assets/${assetId}/download`);

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/assets/:id', () => {
    it('should delete asset successfully', async () => {
      // Create a test asset to delete
      const testImagePath = path.join(testUploadDir, 'delete-test.png');
      const imageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
      await fs.writeFile(testImagePath, imageBuffer);

      const uploadResponse = await request(app)
        .post('/api/assets/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testImagePath)
        .field('projectId', projectId);

      const deleteAssetId = uploadResponse.body.data.id;

      const response = await request(app)
        .delete(`/api/assets/${deleteAssetId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify asset is deleted
      const getResponse = await request(app)
        .get(`/api/assets/${deleteAssetId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(404);
    });

    it('should return 404 for non-existent asset', async () => {
      const response = await request(app)
        .delete('/api/assets/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete(`/api/assets/${assetId}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Rate limiting', () => {
    it('should enforce rate limits on upload endpoints', async () => {
      const testImagePath = path.join(testUploadDir, 'test-image.png');
      const requests = [];

      // Make multiple rapid upload requests
      for (let i = 0; i < 12; i++) {
        requests.push(
          request(app)
            .post('/api/assets/upload')
            .set('Authorization', `Bearer ${authToken}`)
            .attach('file', testImagePath)
            .field('projectId', projectId)
        );
      }

      const responses = await Promise.all(requests);
      
      // At least one should be rate limited (429)
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/assets/cleanup', () => {
    it('should cleanup temporary files (admin endpoint)', async () => {
      const response = await request(app)
        .post('/api/assets/cleanup')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('cleaned up');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/assets/cleanup');

      expect(response.status).toBe(401);
    });
  });
});
