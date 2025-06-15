# Website Builder API Usage Guide

This guide provides comprehensive examples and best practices for using the Website Builder API.

## Table of Contents

1. [Authentication](#authentication)
2. [Rate Limiting](#rate-limiting)
3. [Error Handling](#error-handling)
4. [API Workflows](#api-workflows)
5. [SDK Examples](#sdk-examples)
6. [Webhook Integration](#webhook-integration)

## Authentication

The API uses JWT Bearer tokens for authentication.

### Getting Started

1. **Register a new user**:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "name": "John Doe"
  }'
```

2. **Login to get access token**:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

3. **Use the token in subsequent requests**:
```bash
curl -X GET http://localhost:3000/api/projects \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Token Management

- Tokens expire after 24 hours
- Store tokens securely (never in frontend code)
- Implement token refresh logic in your application

## Rate Limiting

The API implements multiple layers of rate limiting:

### Global Limits
- **1000 requests per 15 minutes** per IP address
- **Speed limiting**: 50ms delay after 500 requests

### Endpoint-Specific Limits
- **Generation endpoints**: 10 requests per minute
- **Upload endpoints**: 20 requests per minute
- **AI endpoints**: 5 requests per minute

### Headers
Rate limit information is included in response headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1623456789
```

### Best Practices
- Implement exponential backoff for retries
- Cache responses when possible
- Use bulk operations for multiple items

## Error Handling

All API responses follow a consistent structure:

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "pagination": {
    // Pagination info (for list endpoints)
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    }
  }
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `GENERATION_IN_PROGRESS` | 409 | Concurrent generation not allowed |
| `INSUFFICIENT_CREDITS` | 402 | Not enough credits for operation |

## API Workflows

### Complete Website Generation Workflow

```javascript
// 1. Create a project
const project = await fetch('/api/projects', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'My Business Website',
    description: 'Professional website for my business',
    wizardData: {
      websiteType: 'business',
      businessInfo: {
        name: 'Acme Corp',
        description: 'Professional services',
        industry: 'Technology'
      },
      designPreferences: {
        theme: 'business-pro',
        colorScheme: 'blue'
      }
    }
  })
});

const projectData = await project.json();
const projectId = projectData.data.id;

// 2. Start website generation
const generation = await fetch(`/api/generations/${projectId}/start`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
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
  })
});

const generationData = await generation.json();
const generationId = generationData.data.generationId;

// 3. Poll for completion
const pollStatus = async () => {
  const response = await fetch(`/api/generations/${generationId}/status`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const statusData = await response.json();
  const status = statusData.data.status;
  
  if (status === 'COMPLETED') {
    console.log('Website generated successfully!');
    console.log('Preview URL:', statusData.data.previewUrl);
    console.log('Download URL:', statusData.data.downloadUrl);
  } else if (status === 'FAILED') {
    console.error('Generation failed:', statusData.data.error);
  } else {
    console.log(`Progress: ${statusData.data.progress}%`);
    setTimeout(pollStatus, 5000); // Poll every 5 seconds
  }
};

pollStatus();
```

### Asset Management Workflow

```javascript
// 1. Upload assets
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('description', 'Company logo');
formData.append('tags', 'logo,branding');

const upload = await fetch('/api/assets/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const assetData = await upload.json();
const assetId = assetData.data.id;

// 2. Use asset in project
await fetch(`/api/projects/${projectId}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    assets: {
      logo: assetId
    }
  })
});
```

## SDK Examples

### JavaScript/TypeScript

```typescript
class WebsiteBuilderAPI {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API Error: ${error.error.message}`);
    }

    return response.json();
  }

  async createProject(projectData: any) {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify(projectData)
    });
  }

  async startGeneration(projectId: string, options: any) {
    return this.request(`/generations/${projectId}/start`, {
      method: 'POST',
      body: JSON.stringify(options)
    });
  }

  async getGenerationStatus(generationId: string) {
    return this.request(`/generations/${generationId}/status`);
  }

  async waitForGeneration(generationId: string, pollInterval = 5000) {
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const status = await this.getGenerationStatus(generationId);
          
          if (status.data.status === 'COMPLETED') {
            resolve(status.data);
          } else if (status.data.status === 'FAILED') {
            reject(new Error(status.data.error));
          } else {
            setTimeout(poll, pollInterval);
          }
        } catch (error) {
          reject(error);
        }
      };
      
      poll();
    });
  }
}

// Usage
const api = new WebsiteBuilderAPI('http://localhost:3000/api', 'your-token');

const project = await api.createProject({
  name: 'My Website',
  // ... project data
});

const generation = await api.startGeneration(project.data.id, {
  hugoTheme: 'business-pro',
  // ... generation options
});

const result = await api.waitForGeneration(generation.data.generationId);
console.log('Website ready:', result.previewUrl);
```

### Python

```python
import requests
import time
from typing import Dict, Any

class WebsiteBuilderAPI:
    def __init__(self, base_url: str, token: str):
        self.base_url = base_url
        self.token = token
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        })

    def _request(self, method: str, endpoint: str, **kwargs) -> Dict[Any, Any]:
        response = self.session.request(
            method, 
            f'{self.base_url}{endpoint}', 
            **kwargs
        )
        response.raise_for_status()
        return response.json()

    def create_project(self, project_data: Dict[Any, Any]) -> Dict[Any, Any]:
        return self._request('POST', '/projects', json=project_data)

    def start_generation(self, project_id: str, options: Dict[Any, Any]) -> Dict[Any, Any]:
        return self._request('POST', f'/generations/{project_id}/start', json=options)

    def get_generation_status(self, generation_id: str) -> Dict[Any, Any]:
        return self._request('GET', f'/generations/{generation_id}/status')

    def wait_for_generation(self, generation_id: str, poll_interval: int = 5) -> Dict[Any, Any]:
        while True:
            status_response = self.get_generation_status(generation_id)
            status = status_response['data']['status']
            
            if status == 'COMPLETED':
                return status_response['data']
            elif status == 'FAILED':
                raise Exception(f"Generation failed: {status_response['data']['error']}")
            
            time.sleep(poll_interval)

# Usage
api = WebsiteBuilderAPI('http://localhost:3000/api', 'your-token')

project = api.create_project({
    'name': 'My Website',
    # ... project data
})

generation = api.start_generation(project['data']['id'], {
    'hugoTheme': 'business-pro',
    # ... generation options
})

result = api.wait_for_generation(generation['data']['generationId'])
print(f"Website ready: {result['previewUrl']}")
```

## Webhook Integration

### Setting Up Webhooks

```javascript
// Register a webhook
await fetch('/api/webhooks', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://your-app.com/webhooks/website-builder',
    events: [
      'generation.started',
      'generation.completed',
      'generation.failed',
      'generation.progress'
    ],
    headers: {
      'X-API-Key': 'your-webhook-secret',
      'X-Source': 'website-builder'
    }
  })
});
```

### Webhook Payload Examples

#### Generation Started
```json
{
  "event": "generation.started",
  "timestamp": "2023-06-15T10:30:00Z",
  "data": {
    "generationId": "gen_123456789",
    "projectId": "proj_987654321",
    "userId": "user_111222333",
    "hugoTheme": "business-pro",
    "estimatedDuration": 300
  }
}
```

#### Generation Completed
```json
{
  "event": "generation.completed",
  "timestamp": "2023-06-15T10:35:00Z",
  "data": {
    "generationId": "gen_123456789",
    "projectId": "proj_987654321",
    "userId": "user_111222333",
    "status": "COMPLETED",
    "duration": 285,
    "previewUrl": "https://preview.example.com/sites/gen_123456789",
    "downloadUrl": "https://download.example.com/sites/gen_123456789.zip",
    "assets": {
      "totalFiles": 42,
      "totalSize": 2048576
    }
  }
}
```

### Webhook Handler Example

```javascript
// Express.js webhook handler
app.post('/webhooks/website-builder', (req, res) => {
  const { event, data } = req.body;
  
  // Verify webhook signature (recommended)
  const signature = req.headers['x-webhook-signature'];
  if (!verifyWebhookSignature(req.body, signature)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  switch (event) {
    case 'generation.started':
      console.log(`Generation started: ${data.generationId}`);
      // Update UI, send notification, etc.
      break;
      
    case 'generation.completed':
      console.log(`Generation completed: ${data.previewUrl}`);
      // Notify user, update database, etc.
      break;
      
    case 'generation.failed':
      console.error(`Generation failed: ${data.error}`);
      // Handle error, notify user, etc.
      break;
      
    case 'generation.progress':
      console.log(`Generation progress: ${data.progress}%`);
      // Update progress bar
      break;
  }
  
  res.status(200).json({ received: true });
});
```

## Best Practices

### Performance Optimization

1. **Use pagination** for list endpoints
2. **Implement caching** for reference data
3. **Batch operations** when possible
4. **Use webhooks** instead of polling
5. **Compress uploads** before sending

### Security

1. **Store tokens securely** (never in localStorage)
2. **Implement token refresh** logic
3. **Validate webhook signatures**
4. **Use HTTPS** in production
5. **Sanitize file uploads**

### Error Handling

1. **Implement retry logic** with exponential backoff
2. **Handle rate limits** gracefully
3. **Provide meaningful error messages** to users
4. **Log errors** for debugging
5. **Implement fallback options**

### Monitoring

1. **Track API usage** and performance
2. **Monitor error rates**
3. **Set up alerts** for critical issues
4. **Use request IDs** for tracing
5. **Implement health checks**

## Support

For additional support:
- API Documentation: `/api/docs`
- Status Page: `https://status.example.com`
- Support Email: `api-support@example.com`
- GitHub Issues: `https://github.com/your-org/website-builder-api`
