import swaggerJSDoc from 'swagger-jsdoc';
import { version } from '../../package.json';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AI-Powered Website Builder API',
      version: version,
      description: `
        A comprehensive REST API for building AI-powered websites using Hugo static site generator.
        
        ## Features
        - 🔐 JWT Authentication with refresh tokens
        - 📊 Project Management with wizard-based creation
        - 🤖 AI-powered content generation
        - 🎨 Asset management and file uploads
        - 🌐 Website generation with multiple Hugo themes
        - 📡 Webhook notifications for real-time updates
        - 📈 Analytics and usage tracking
        
        ## Authentication
        Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:
        \`Authorization: Bearer <your-jwt-token>\`
        
        ## Rate Limiting
        API endpoints are rate-limited to prevent abuse:
        - **Authentication**: 5 requests per minute
        - **General API**: 100 requests per minute
        - **File uploads**: 10 requests per minute
        
        ## Error Handling
        All API responses follow a consistent format:
        \`\`\`json
        {
          "success": true|false,
          "data": any,
          "error": string,
          "message": string,
          "meta": {
            "timestamp": "ISO 8601 string",
            "requestId": "uuid"
          }
        }
        \`\`\`
      `,
      contact: {
        name: 'Website Builder API Support',
        email: 'api-support@websitebuilder.com',
        url: 'https://websitebuilder.com/support'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001/api',
        description: 'Development server'
      },
      {
        url: 'https://api.websitebuilder.com/api',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from login endpoint'
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  error: { type: 'string', example: 'Unauthorized' },
                  message: { type: 'string', example: 'Authentication token required' }
                }
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Access forbidden',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  error: { type: 'string', example: 'Forbidden' },
                  message: { type: 'string', example: 'Insufficient permissions' }
                }
              }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  error: { type: 'string', example: 'Not Found' },
                  message: { type: 'string', example: 'Resource not found' }
                }
              }
            }
          }
        },
        ValidationError: {
          description: 'Input validation failed',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  error: { type: 'string', example: 'Validation Error' },
                  message: { type: 'string', example: 'Input validation failed' },
                  details: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        field: { type: 'string' },
                        message: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        RateLimitError: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  error: { type: 'string', example: 'Rate Limit Exceeded' },
                  message: { type: 'string', example: 'Too many requests. Please try again later.' }
                }
              }
            }
          }
        },
        ServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  error: { type: 'string', example: 'Internal Server Error' },
                  message: { type: 'string', example: 'An unexpected error occurred' }
                }
              }
            }
          }
        }
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            error: { type: 'string' },
            message: { type: 'string' },
            meta: {
              type: 'object',
              properties: {
                timestamp: { type: 'string', format: 'date-time' },
                requestId: { type: 'string' }
              }
            }
          }
        },
        PaginatedResponse: {
          allOf: [
            { $ref: '#/components/schemas/ApiResponse' },
            {
              type: 'object',
              properties: {
                pagination: {
                  type: 'object',
                  properties: {
                    page: { type: 'integer', minimum: 1 },
                    pageSize: { type: 'integer', minimum: 1, maximum: 100 },
                    total: { type: 'integer', minimum: 0 },
                    totalPages: { type: 'integer', minimum: 0 },
                    hasNext: { type: 'boolean' },
                    hasPrevious: { type: 'boolean' }
                  }
                }
              }
            }
          ]
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'cuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            avatar: { type: 'string', format: 'uri' },
            emailVerified: { type: 'boolean' },
            plan: { type: 'string', enum: ['free', 'pro', 'enterprise'] },
            projectsLimit: { type: 'integer' },
            projectsUsed: { type: 'integer' },
            lastLoginAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Project: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'cuid' },
            userId: { type: 'string', format: 'cuid' },
            name: { type: 'string' },
            slug: { type: 'string' },
            description: { type: 'string' },
            wizardData: { type: 'object' },
            currentStep: { type: 'integer', minimum: 1, maximum: 10 },
            isCompleted: { type: 'boolean' },
            generationStatus: { 
              type: 'string', 
              enum: ['DRAFT', 'GENERATING', 'COMPLETED', 'FAILED', 'ARCHIVED'] 
            },
            lastGeneratedAt: { type: 'string', format: 'date-time' },
            selectedTheme: { type: 'string' },
            themeCustomization: { type: 'object' },
            hugoSiteUrl: { type: 'string', format: 'uri' },
            metaTitle: { type: 'string' },
            metaDescription: { type: 'string' },
            keywords: { type: 'array', items: { type: 'string' } },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        SiteGeneration: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'cuid' },
            projectId: { type: 'string', format: 'cuid' },
            status: {
              type: 'string',
              enum: ['PENDING', 'GENERATING_CONTENT', 'BUILDING_SITE', 'PACKAGING', 'COMPLETED', 'FAILED', 'EXPIRED']
            },
            hugoTheme: { type: 'string' },
            buildLog: { type: 'string' },
            errorLog: { type: 'string' },
            siteUrl: { type: 'string', format: 'uri' },
            fileSize: { type: 'integer' },
            fileCount: { type: 'integer' },
            generationTime: { type: 'integer' },
            aiProcessingTime: { type: 'integer' },
            hugoBuildTime: { type: 'integer' },
            hugoVersion: { type: 'string' },
            nodeVersion: { type: 'string' },
            startedAt: { type: 'string', format: 'date-time' },
            completedAt: { type: 'string', format: 'date-time' },
            expiresAt: { type: 'string', format: 'date-time' }
          }
        },
        AssetUpload: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'cuid' },
            userId: { type: 'string', format: 'cuid' },
            projectId: { type: 'string', format: 'cuid' },
            filename: { type: 'string' },
            originalName: { type: 'string' },
            mimeType: { type: 'string' },
            fileSize: { type: 'integer' },
            filePath: { type: 'string' },
            assetType: { type: 'string', enum: ['IMAGE', 'DOCUMENT', 'VIDEO', 'AUDIO', 'OTHER'] },
            usage: { type: 'string' },
            dimensions: { type: 'object' },
            alt: { type: 'string' },
            caption: { type: 'string' },
            isProcessed: { type: 'boolean' },
            isActive: { type: 'boolean' },
            uploadedAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints'
      },
      {
        name: 'Projects',
        description: 'Project management and wizard data endpoints'
      },
      {
        name: 'Assets',
        description: 'File upload and asset management endpoints'
      },
      {
        name: 'Reference Data',
        description: 'Static reference data for business categories, themes, etc.'
      },
      {
        name: 'Website Generation',
        description: 'Website generation and build management endpoints'
      },
      {
        name: 'Webhooks',
        description: 'Webhook registration and management endpoints'
      },
      {
        name: 'AI Services',
        description: 'AI-powered content generation endpoints'
      },
      {
        name: 'System',
        description: 'System health and monitoring endpoints'
      }
    ]
  },
  apis: [
    './src/routes/*.ts',
    './src/app.ts'
  ]
};

export const swaggerSpec = swaggerJSDoc(options);
export default swaggerSpec;
