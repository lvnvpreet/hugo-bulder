import request from 'supertest';
import { Application } from 'express';

export class TestHelpers {
  /**
   * Make authenticated request
   */
  static authenticatedRequest(app: Application, token: string) {
    return {
      get: (url: string) => request(app).get(url).set('Authorization', `Bearer ${token}`),
      post: (url: string) => request(app).post(url).set('Authorization', `Bearer ${token}`),
      put: (url: string) => request(app).put(url).set('Authorization', `Bearer ${token}`),
      patch: (url: string) => request(app).patch(url).set('Authorization', `Bearer ${token}`),
      delete: (url: string) => request(app).delete(url).set('Authorization', `Bearer ${token}`)
    };
  }

  /**
   * Wait for async operation
   */
  static async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry operation until success or max attempts
   */
  static async retry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxAttempts) {
          await this.wait(delay);
        }
      }
    }
    
    throw lastError!;
  }

  /**
   * Generate random test data
   */
  static generateTestData() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    
    return {
      email: `test-${timestamp}-${random}@example.com`,
      name: `Test User ${random}`,
      projectName: `Test Project ${random}`,
      slug: `test-project-${timestamp}-${random}`,
      filename: `test-file-${timestamp}-${random}.jpg`,
      webhookUrl: `https://webhook-${timestamp}-${random}.example.com`
    };
  }

  /**
   * Validate API response structure
   */
  static validateApiResponse(response: any, expectedStatus: number = 200) {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('success');
    
    if (response.body.success) {
      expect(response.body).toHaveProperty('data');
    } else {
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
    }
  }

  /**
   * Validate pagination response
   */
  static validatePaginationResponse(response: any) {
    expect(response.body).toHaveProperty('pagination');
    expect(response.body.pagination).toHaveProperty('page');
    expect(response.body.pagination).toHaveProperty('pageSize');
    expect(response.body.pagination).toHaveProperty('total');
    expect(response.body.pagination).toHaveProperty('totalPages');
  }

  /**
   * Create mock file for upload testing
   */
  static createMockFile(filename: string = 'test.jpg', mimeType: string = 'image/jpeg') {
    return {
      buffer: Buffer.from('fake image data'),
      originalname: filename,
      mimetype: mimeType,
      size: 1024
    };
  }

  /**
   * Generate bulk test data
   */
  static generateBulkTestData(count: number) {
    return Array.from({ length: count }, (_, i) => ({
      ...this.generateTestData(),
      index: i + 1
    }));
  }

  /**
   * Measure execution time
   */
  static async measureExecutionTime<T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = Date.now();
    const result = await operation();
    const duration = Date.now() - start;
    return { result, duration };
  }

  /**
   * Check if response is rate limited
   */
  static isRateLimited(response: any): boolean {
    return response.status === 429;
  }

  /**
   * Validate rate limit headers
   */
  static validateRateLimitHeaders(response: any) {
    expect(response.headers).toHaveProperty('x-ratelimit-limit');
    expect(response.headers).toHaveProperty('x-ratelimit-remaining');
    expect(response.headers).toHaveProperty('x-ratelimit-reset');
  }

  /**
   * Create test file buffer for different file types
   */
  static createTestFileBuffer(type: 'image' | 'pdf' | 'text' = 'image'): Buffer {
    switch (type) {
      case 'image':
        // Minimal JPEG header
        return Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
      case 'pdf':
        // Minimal PDF header
        return Buffer.from('%PDF-1.4\n%fake pdf content');
      case 'text':
        return Buffer.from('This is test file content');
      default:
        return Buffer.from('generic test content');
    }
  }

  /**
   * Validate webhook payload structure
   */
  static validateWebhookPayload(payload: any) {
    expect(payload).toHaveProperty('event');
    expect(payload).toHaveProperty('timestamp');
    expect(payload).toHaveProperty('data');
    expect(typeof payload.timestamp).toBe('string');
    expect(new Date(payload.timestamp).toISOString()).toBe(payload.timestamp);
  }

  /**
   * Generate test customization data
   */
  static generateCustomizations() {
    return {
      colors: {
        primary: '#3b82f6',
        secondary: '#64748b',
        accent: '#f59e0b',
        background: '#ffffff',
        text: '#1f2937'
      },
      fonts: {
        heading: 'Inter',
        body: 'Source Sans Pro',
        mono: 'JetBrains Mono'
      },
      spacing: {
        scale: 1.0,
        gutters: 'normal'
      },
      layout: {
        maxWidth: '1200px',
        sidebar: 'right'
      }
    };
  }

  /**
   * Generate test content options
   */
  static generateContentOptions() {
    return {
      aiModel: 'gpt-4',
      tone: 'professional',
      length: 'medium',
      includeSEO: true,
      language: 'en',
      targetAudience: 'business professionals',
      keywords: ['business', 'professional', 'services']
    };
  }
}

export default TestHelpers;
