# API Error Handling Guide

This document provides comprehensive information about error handling in the Website Builder API.

## Error Response Format

All API errors follow a consistent structure:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      // Additional context-specific information
    },
    "requestId": "req_123456789",
    "timestamp": "2023-06-15T10:30:00Z"
  }
}
```

## HTTP Status Codes

| Status Code | Description | When Used |
|-------------|-------------|-----------|
| 400 | Bad Request | Invalid request data, validation errors |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Valid auth but insufficient permissions |
| 404 | Not Found | Resource doesn't exist or user lacks access |
| 409 | Conflict | Resource conflict (e.g., duplicate operation) |
| 422 | Unprocessable Entity | Valid syntax but semantic errors |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |
| 502 | Bad Gateway | Upstream service unavailable |
| 503 | Service Unavailable | Temporary service unavailability |

## Error Codes Reference

### Authentication Errors (AUTH_*)

#### AUTH_MISSING_TOKEN
- **Status**: 401
- **Message**: Authentication token is required
- **Cause**: No Authorization header provided
- **Solution**: Include `Authorization: Bearer <token>` header

#### AUTH_INVALID_TOKEN
- **Status**: 401
- **Message**: Invalid or expired authentication token
- **Cause**: Token is malformed, expired, or revoked
- **Solution**: Obtain a new token via `/auth/login`

#### AUTH_USER_NOT_FOUND
- **Status**: 401
- **Message**: User associated with token not found
- **Cause**: User account was deleted after token issuance
- **Solution**: Re-authenticate with valid credentials

### Validation Errors (VALIDATION_*)

#### VALIDATION_ERROR
- **Status**: 400
- **Message**: Request validation failed
- **Details**: Contains field-specific validation errors
- **Example**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "fields": [
        {
          "field": "email",
          "message": "Invalid email format"
        },
        {
          "field": "password",
          "message": "Password must be at least 8 characters"
        }
      ]
    }
  }
}
```

#### VALIDATION_MISSING_FIELD
- **Status**: 400
- **Message**: Required field is missing
- **Details**: Specifies which field is missing

#### VALIDATION_INVALID_FORMAT
- **Status**: 400
- **Message**: Field value format is invalid
- **Details**: Explains expected format

### Resource Errors (RESOURCE_*)

#### RESOURCE_NOT_FOUND
- **Status**: 404
- **Message**: Requested resource not found
- **Cause**: Resource doesn't exist or user lacks access
- **Solution**: Verify resource ID and user permissions

#### RESOURCE_ALREADY_EXISTS
- **Status**: 409
- **Message**: Resource with same identifier already exists
- **Common scenarios**: Duplicate project names, email addresses

#### RESOURCE_CONFLICT
- **Status**: 409
- **Message**: Operation conflicts with current resource state
- **Example**: Trying to delete a project with active generations

### Permission Errors (PERMISSION_*)

#### PERMISSION_DENIED
- **Status**: 403
- **Message**: Insufficient permissions for this operation
- **Cause**: User lacks required role or ownership
- **Solution**: Contact admin or use resources you own

#### PERMISSION_RESOURCE_ACCESS
- **Status**: 403
- **Message**: No access to this specific resource
- **Cause**: Attempting to access another user's resource

### Rate Limiting Errors (RATE_LIMIT_*)

#### RATE_LIMIT_EXCEEDED
- **Status**: 429
- **Message**: Rate limit exceeded
- **Headers**: 
  - `Retry-After`: Seconds until limit resets
  - `X-RateLimit-Limit`: Request limit
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset timestamp
- **Solution**: Wait and retry, implement exponential backoff

#### RATE_LIMIT_DAILY_EXCEEDED
- **Status**: 429
- **Message**: Daily rate limit exceeded
- **Solution**: Wait until next day or upgrade plan

### Generation Errors (GENERATION_*)

#### GENERATION_IN_PROGRESS
- **Status**: 409
- **Message**: Generation already in progress for this project
- **Cause**: Attempting to start generation while another is running
- **Solution**: Wait for current generation to complete or cancel it

#### GENERATION_NOT_FOUND
- **Status**: 404
- **Message**: Generation not found
- **Cause**: Invalid generation ID or no access rights

#### GENERATION_CANNOT_CANCEL
- **Status**: 400
- **Message**: Generation cannot be cancelled in current state
- **Cause**: Generation is already completed or failed

#### GENERATION_FAILED
- **Status**: 500
- **Message**: Website generation failed
- **Details**: Contains specific failure reason
- **Common causes**:
  - Invalid theme configuration
  - AI service unavailable
  - Template processing errors

### File/Asset Errors (ASSET_*)

#### ASSET_TOO_LARGE
- **Status**: 413
- **Message**: File size exceeds maximum allowed
- **Details**: Contains max size limit
- **Solution**: Compress or resize file

#### ASSET_INVALID_TYPE
- **Status**: 400
- **Message**: File type not supported
- **Details**: Lists supported file types

#### ASSET_PROCESSING_FAILED
- **Status**: 500
- **Message**: File processing failed
- **Cause**: Corrupted file or processing service error

#### ASSET_QUOTA_EXCEEDED
- **Status**: 403
- **Message**: Storage quota exceeded
- **Solution**: Delete unused assets or upgrade plan

### AI Service Errors (AI_*)

#### AI_SERVICE_UNAVAILABLE
- **Status**: 503
- **Message**: AI service temporarily unavailable
- **Solution**: Retry after delay

#### AI_QUOTA_EXCEEDED
- **Status**: 402
- **Message**: AI usage quota exceeded
- **Solution**: Wait for quota reset or upgrade plan

#### AI_INVALID_PROMPT
- **Status**: 400
- **Message**: AI prompt validation failed
- **Details**: Explains prompt requirements

### Payment/Billing Errors (BILLING_*)

#### BILLING_INSUFFICIENT_CREDITS
- **Status**: 402
- **Message**: Insufficient credits for operation
- **Solution**: Purchase more credits or upgrade plan

#### BILLING_SUBSCRIPTION_EXPIRED
- **Status**: 402
- **Message**: Subscription has expired
- **Solution**: Renew subscription

### System Errors (SYSTEM_*)

#### SYSTEM_MAINTENANCE
- **Status**: 503
- **Message**: System under maintenance
- **Headers**: `Retry-After` with estimated completion time

#### SYSTEM_OVERLOADED
- **Status**: 503
- **Message**: System temporarily overloaded
- **Solution**: Implement exponential backoff retry

## Error Handling Best Practices

### Client-Side Implementation

```javascript
class APIClient {
  async request(endpoint, options = {}) {
    try {
      const response = await fetch(endpoint, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new APIError(data.error, response.status);
      }

      return data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      
      // Network or other errors
      throw new APIError({
        code: 'NETWORK_ERROR',
        message: 'Network request failed'
      }, 0);
    }
  }
}

class APIError extends Error {
  constructor(errorData, status) {
    super(errorData.message);
    this.code = errorData.code;
    this.status = status;
    this.details = errorData.details;
    this.requestId = errorData.requestId;
  }

  isRetryable() {
    return [429, 500, 502, 503].includes(this.status);
  }

  isAuthError() {
    return this.code.startsWith('AUTH_');
  }

  isValidationError() {
    return this.code.startsWith('VALIDATION_');
  }
}
```

### Retry Logic with Exponential Backoff

```javascript
async function withRetry(operation, maxAttempts = 3) {
  let attempt = 0;
  
  while (attempt < maxAttempts) {
    try {
      return await operation();
    } catch (error) {
      attempt++;
      
      if (!error.isRetryable() || attempt >= maxAttempts) {
        throw error;
      }
      
      // Exponential backoff with jitter
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
      const jitter = Math.random() * 1000;
      
      await new Promise(resolve => setTimeout(resolve, delay + jitter));
    }
  }
}

// Usage
try {
  const result = await withRetry(() => 
    apiClient.startGeneration(projectId, options)
  );
} catch (error) {
  if (error.code === 'GENERATION_IN_PROGRESS') {
    // Handle concurrent generation
  } else if (error.isAuthError()) {
    // Redirect to login
  } else {
    // Show generic error message
  }
}
```

### User-Friendly Error Messages

```javascript
function getErrorMessage(error) {
  const userMessages = {
    'AUTH_INVALID_TOKEN': 'Your session has expired. Please log in again.',
    'VALIDATION_ERROR': 'Please check your input and try again.',
    'RATE_LIMIT_EXCEEDED': 'Too many requests. Please wait a moment and try again.',
    'GENERATION_IN_PROGRESS': 'A website is already being generated for this project.',
    'ASSET_TOO_LARGE': 'File is too large. Please choose a smaller file.',
    'BILLING_INSUFFICIENT_CREDITS': 'You don\'t have enough credits. Please upgrade your plan.',
    'SYSTEM_MAINTENANCE': 'The system is temporarily under maintenance. Please try again later.'
  };

  return userMessages[error.code] || 'An unexpected error occurred. Please try again.';
}
```

### Error Logging and Monitoring

```javascript
function logError(error, context = {}) {
  const logData = {
    timestamp: new Date().toISOString(),
    error: {
      code: error.code,
      message: error.message,
      status: error.status,
      requestId: error.requestId
    },
    context,
    user: getCurrentUser()?.id,
    userAgent: navigator.userAgent,
    url: window.location.href
  };

  // Send to logging service
  analytics.track('API Error', logData);
  
  // Also log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('API Error:', logData);
  }
}
```

## Testing Error Scenarios

### Unit Tests

```javascript
describe('API Error Handling', () => {
  it('should handle authentication errors', async () => {
    const client = new APIClient('invalid-token');
    
    await expect(client.getProjects()).rejects.toThrow(
      expect.objectContaining({
        code: 'AUTH_INVALID_TOKEN',
        status: 401
      })
    );
  });

  it('should handle validation errors', async () => {
    const client = new APIClient(validToken);
    
    await expect(client.createProject({})).rejects.toThrow(
      expect.objectContaining({
        code: 'VALIDATION_ERROR',
        status: 400
      })
    );
  });

  it('should retry on retryable errors', async () => {
    const mockRequest = jest.fn()
      .mockRejectedValueOnce(new APIError({ code: 'SYSTEM_OVERLOADED' }, 503))
      .mockResolvedValueOnce({ success: true, data: {} });

    const result = await withRetry(() => mockRequest());
    
    expect(mockRequest).toHaveBeenCalledTimes(2);
    expect(result.success).toBe(true);
  });
});
```

### Integration Tests

```javascript
describe('Generation Error Scenarios', () => {
  it('should handle concurrent generation attempts', async () => {
    // Start first generation
    const gen1 = client.startGeneration(projectId, options);
    
    // Try to start second generation immediately
    await expect(
      client.startGeneration(projectId, options)
    ).rejects.toThrow(
      expect.objectContaining({
        code: 'GENERATION_IN_PROGRESS'
      })
    );
    
    await gen1; // Wait for first to complete
  });
});
```

## Debugging Tips

1. **Always check the `requestId`** in error responses for tracking
2. **Use the details field** for specific validation errors
3. **Monitor rate limit headers** to prevent 429 errors
4. **Log full error context** including user actions
5. **Test error scenarios** in development

## Support and Escalation

For errors that persist or seem like bugs:

1. **Collect full error details** including requestId
2. **Note the exact API call** that failed
3. **Include steps to reproduce**
4. **Check API status page** for known issues
5. **Contact support** with detailed information

### Emergency Escalation

For critical production issues:
- **Status page**: https://status.example.com
- **Emergency hotline**: +1-XXX-XXX-XXXX
- **Incident email**: incidents@example.com
