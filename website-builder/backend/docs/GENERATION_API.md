# Website Generation API Documentation

## Overview

The Website Generation API provides endpoints for generating Hugo-based static websites from wizard-collected user data. It supports real-time status tracking, webhook notifications, and bulk operations.

## Base URL

```
https://api.website-builder.com/api/generations
```

## Authentication

All endpoints require JWT authentication via the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### 1. Start Website Generation

Start the website generation process for a project.

**Endpoint:** `POST /generations/{projectId}/start`

**Parameters:**
- `projectId` (path): The ID of the project to generate

**Request Body:**
```json
{
  "hugoTheme": "ananke",
  "customizations": {
    "colors": {
      "primary": "#3b82f6",
      "secondary": "#64748b",
      "accent": "#f59e0b"
    },
    "fonts": {
      "heading": "Inter",
      "body": "Source Sans Pro"
    },
    "layout": {
      "headerStyle": "minimal",
      "footerStyle": "detailed"
    }
  },
  "contentOptions": {
    "aiModel": "gpt-4",
    "tone": "professional",
    "length": "medium",
    "includeSEO": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "generationId": "gen_12345...",
    "status": "PENDING",
    "message": "Website generation started successfully"
  },
  "meta": {
    "timestamp": "2025-01-09T10:30:00Z",
    "requestId": "req_12345"
  }
}
```

**Status Codes:**
- `202` - Generation started successfully
- `400` - Invalid request data or wizard incomplete
- `404` - Project not found
- `429` - Rate limit exceeded

### 2. Get Generation Status

Get the current status and progress of a generation.

**Endpoint:** `GET /generations/{generationId}/status`

**Parameters:**
- `generationId` (path): The ID of the generation
- `include` (query, optional): Additional data to include (`project`, `logs`, `metrics`)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "gen_12345...",
    "status": "BUILDING_SITE",
    "siteUrl": null,
    "fileSize": null,
    "fileCount": null,
    "generationTime": null
  },
  "meta": {
    "timestamp": "2025-01-09T10:35:00Z",
    "requestId": "req_12346"
  }
}
```

**Status Values:**
- `PENDING` - Generation queued
- `GENERATING_CONTENT` - AI content generation in progress
- `BUILDING_SITE` - Hugo site compilation
- `PACKAGING` - Creating downloadable archive
- `COMPLETED` - Generation finished successfully
- `FAILED` - Generation failed
- `EXPIRED` - Generated files expired

### 3. Get Generation History

Retrieve user's generation history with pagination.

**Endpoint:** `GET /generations`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Items per page (default: 10, max: 100)
- `status` (optional): Filter by status
- `projectId` (optional): Filter by project
- `sortBy` (optional): Sort field (`startedAt`, `completedAt`, `generationTime`)
- `sortOrder` (optional): Sort order (`asc`, `desc`)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "gen_12345...",
      "status": "COMPLETED",
      "siteUrl": "site-gen_12345.zip",
      "fileSize": 1458176,
      "fileCount": 25,
      "generationTime": 45000
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 15,
    "totalPages": 2
  }
}
```

### 4. Download Generated Website

Download the generated website as a ZIP archive.

**Endpoint:** `GET /generations/{generationId}/download`

**Parameters:**
- `generationId` (path): The ID of the completed generation

**Response:**
- Binary ZIP file with appropriate headers
- `Content-Type: application/zip`
- `Content-Disposition: attachment; filename="project-name-website.zip"`

**Status Codes:**
- `200` - File download successful
- `404` - Generation not found or not completed
- `410` - Download link expired

### 5. Cancel Generation

Cancel an ongoing generation process.

**Endpoint:** `DELETE /generations/{generationId}/cancel`

**Response:**
```json
{
  "success": true,
  "data": {
    "cancelled": true,
    "message": "Generation cancelled successfully"
  }
}
```

### 6. Bulk Generation

Start generation for multiple projects simultaneously.

**Endpoint:** `POST /generations/bulk`

**Request Body:**
```json
{
  "projectIds": ["proj_123...", "proj_456..."],
  "hugoTheme": "business-pro",
  "customizations": {
    "colors": {
      "primary": "#3b82f6"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "projectId": "proj_123...",
        "generationId": "gen_789..."
      },
      {
        "projectId": "proj_456...",
        "error": "Wizard not completed"
      }
    ],
    "summary": {
      "total": 2,
      "successful": 1,
      "failed": 1
    }
  }
}
```

### 7. Generation Analytics

Get generation statistics and analytics.

**Endpoint:** `GET /generations/analytics`

**Query Parameters:**
- `startDate` (optional): Start date filter (ISO 8601)
- `endDate` (optional): End date filter (ISO 8601)
- `groupBy` (optional): Group by period (`day`, `week`, `month`)
- `projectId` (optional): Filter by project

**Response:**
```json
{
  "success": true,
  "data": {
    "totalGenerations": 42,
    "successfulGenerations": 38,
    "failedGenerations": 4,
    "avgGenerationTime": 125000,
    "popularThemes": [
      {"theme": "business-pro", "count": 15},
      {"theme": "ananke", "count": 12}
    ],
    "generationsByDay": [
      {"date": "2025-01-07", "count": 5},
      {"date": "2025-01-08", "count": 8}
    ]
  }
}
```

### 8. Generation Logs

Get detailed logs for a generation (debug endpoint).

**Endpoint:** `GET /generations/{generationId}/logs`

**Response:**
```json
{
  "success": true,
  "data": {
    "steps": [
      {
        "step": "GENERATING_CONTENT",
        "startTime": "2025-01-09T10:30:00Z",
        "endTime": "2025-01-09T10:30:15Z",
        "duration": 15000,
        "status": "completed",
        "details": {
          "aiModel": "gpt-4",
          "pagesGenerated": 5,
          "wordsGenerated": 1250
        }
      }
    ],
    "buildOutput": "Hugo build completed successfully...",
    "warnings": [],
    "errors": []
  }
}
```

## Webhook Integration

### Register Webhook

**Endpoint:** `POST /api/webhooks`

**Request Body:**
```json
{
  "url": "https://your-app.com/webhooks/generation",
  "events": ["started", "progress", "completed", "failed"],
  "headers": {
    "X-API-Key": "your-api-key"
  }
}
```

### Webhook Payload

When generation events occur, webhooks receive:

```json
{
  "event": "completed",
  "generationId": "gen_12345...",
  "projectId": "proj_678...",
  "userId": "user_901...",
  "status": "COMPLETED",
  "progress": 100,
  "currentStep": "COMPLETED",
  "timestamp": "2025-01-09T10:35:00Z",
  "data": {
    "fileSize": 1458176,
    "fileCount": 25,
    "generationTime": 45000
  }
}
```

## Supported Hugo Themes

- `ananke` - Clean, simple business theme
- `papermod` - Fast blog theme with great typography
- `business-pro` - Professional business theme
- `restaurant-deluxe` - Restaurant and hospitality theme
- `medical-care` - Healthcare theme with appointments
- `creative-studio` - Portfolio theme for creatives
- `tech-startup` - Modern SaaS/technology theme
- `retail-store` - E-commerce focused theme
- `academic` - Academic and research theme
- `mainroad` - Blog-focused theme
- `clarity` - Technology blog theme
- `terminal` - Minimal terminal-inspired theme

## AI Models

- `gpt-4` - Most capable, slower, higher cost
- `gpt-3.5-turbo` - Fast, good quality, cost-effective
- `llama3` - Open-source alternative
- `mistral` - Fast European alternative

## Content Tones

- `professional` - Formal business communication
- `casual` - Relaxed, approachable tone
- `friendly` - Warm and welcoming
- `formal` - Traditional, authoritative
- `creative` - Artistic and expressive
- `authoritative` - Expert, confident
- `conversational` - Natural, dialogue-like
- `technical` - Precise, industry-specific

## Error Codes

- `PROJECT_NOT_FOUND` - Project doesn't exist or access denied
- `WIZARD_INCOMPLETE` - Project wizard not completed
- `THEME_NOT_SUPPORTED` - Selected Hugo theme not available
- `AI_SERVICE_ERROR` - AI content generation failed
- `HUGO_BUILD_ERROR` - Hugo site compilation failed
- `PACKAGING_ERROR` - Site archiving failed
- `DISK_SPACE_ERROR` - Insufficient server storage
- `GENERATION_TIMEOUT` - Process exceeded time limit
- `INVALID_CUSTOMIZATIONS` - Theme customizations invalid
- `CONCURRENT_GENERATION` - Another generation in progress
- `DOWNLOAD_EXPIRED` - Generated file no longer available

## Rate Limits

- Generation start: 5 requests per minute per user
- Status checks: 60 requests per minute per user
- Downloads: 10 requests per minute per user
- Bulk operations: 1 request per minute per user

## File Expiration

Generated website files expire after 7 days and are automatically cleaned up. Download your generated websites promptly after completion.

## Best Practices

1. **Monitor Status**: Poll generation status regularly but respect rate limits
2. **Use Webhooks**: Implement webhooks for real-time notifications
3. **Handle Failures**: Gracefully handle generation failures and retry logic
4. **Download Promptly**: Download generated sites before expiration
5. **Cache Results**: Cache generation results to avoid unnecessary API calls

## SDK Examples

### JavaScript/Node.js

```javascript
const WebsiteBuilderAPI = require('@website-builder/sdk');

const client = new WebsiteBuilderAPI({
  apiKey: 'your-jwt-token',
  baseURL: 'https://api.website-builder.com'
});

// Start generation
const generation = await client.generations.start('project-id', {
  hugoTheme: 'business-pro',
  contentOptions: {
    tone: 'professional',
    length: 'medium'
  }
});

// Monitor progress
const checkStatus = async () => {
  const status = await client.generations.getStatus(generation.generationId);
  
  if (status.status === 'COMPLETED') {
    // Download the site
    const file = await client.generations.download(generation.generationId);
    // Save file...
  } else if (status.status === 'FAILED') {
    console.error('Generation failed');
  } else {
    // Check again in 5 seconds
    setTimeout(checkStatus, 5000);
  }
};

checkStatus();
```

### Python

```python
import time
from website_builder_sdk import WebsiteBuilderClient

client = WebsiteBuilderClient(
    api_key='your-jwt-token',
    base_url='https://api.website-builder.com'
)

# Start generation
generation = client.generations.start('project-id', {
    'hugoTheme': 'business-pro',
    'contentOptions': {
        'tone': 'professional',
        'length': 'medium'
    }
})

# Monitor progress
while True:
    status = client.generations.get_status(generation['generationId'])
    
    if status['status'] == 'COMPLETED':
        # Download the site
        file_data = client.generations.download(generation['generationId'])
        with open('website.zip', 'wb') as f:
            f.write(file_data)
        break
    elif status['status'] == 'FAILED':
        print('Generation failed')
        break
    else:
        time.sleep(5)
```

## Support

For API support and questions:

- Documentation: https://docs.website-builder.com/api
- GitHub Issues: https://github.com/website-builder/api/issues  
- Email: api-support@website-builder.com
