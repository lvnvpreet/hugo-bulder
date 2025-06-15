# API Versioning Strategy

This document outlines the versioning strategy for the Website Builder API to ensure backward compatibility and smooth upgrades.

## Versioning Approach

The API uses **URL path versioning** with semantic versioning principles:

- **URL Format**: `/api/v{major}/endpoint`
- **Current Version**: v1
- **Example**: `/api/v1/projects`

## Version Structure

### Semantic Versioning (SemVer)

We follow semantic versioning: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes that require URL version increment
- **MINOR**: New features, backward compatible (internal tracking only)
- **PATCH**: Bug fixes, backward compatible (internal tracking only)

### URL Versioning

Only **MAJOR** versions are reflected in the URL:
- `/api/v1/` - Version 1.x.x
- `/api/v2/` - Version 2.x.x (future)

## What Constitutes a Breaking Change

### Breaking Changes (Require Major Version Bump)

1. **Removing endpoints**
2. **Removing fields** from responses
3. **Making optional fields required**
4. **Changing field types** (string to number, etc.)
5. **Changing HTTP status codes** for existing scenarios
6. **Modifying error response structure**
7. **Changing authentication methods**
8. **Altering URL patterns**
9. **Removing query parameters**
10. **Changing default behaviors**

### Non-Breaking Changes (Backward Compatible)

1. **Adding new endpoints**
2. **Adding optional fields** to requests
3. **Adding new fields** to responses
4. **Adding new HTTP headers**
5. **Adding new query parameters** (optional)
6. **Adding new error codes** (not changing existing ones)
7. **Performance improvements**
8. **Internal refactoring**
9. **Documentation updates**
10. **Adding new optional configuration**

## Version Support Policy

### Support Timeline

- **Current Version (v1)**: Full support, new features, bug fixes
- **Previous Version**: Security fixes only for 12 months after new major release
- **Deprecated Versions**: 6-month notice before discontinuation

### Version Lifecycle

```
v1.0.0 -----> v1.x.x -----> v2.0.0 -----> v2.x.x
  |             |              |             |
Launch    Ongoing updates   Launch      Ongoing updates
          Backward compat    v1 deprecated  v1 sunset
                                           (after 12 months)
```

## Implementation Strategy

### Current Implementation (v1)

```typescript
// Route structure
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/generations', generationRoutes);
// ... other routes

// Swagger configuration
const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Website Builder API',
      version: '1.2.0', // Full semantic version
      description: 'API for AI-powered website builder'
    },
    servers: [
      {
        url: '/api/v1',
        description: 'Version 1 API'
      }
    ]
  }
});
```

### Version Detection Middleware

```typescript
const versionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Extract version from URL path
  const versionMatch = req.path.match(/^\/api\/v(\d+)/);
  const version = versionMatch ? parseInt(versionMatch[1]) : 1;
  
  // Store version in request for later use
  req.apiVersion = version;
  
  // Add version to response headers
  res.setHeader('X-API-Version', `v${version}`);
  
  // Check if version is supported
  if (!SUPPORTED_VERSIONS.includes(version)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'UNSUPPORTED_VERSION',
        message: `API version v${version} is not supported`,
        supportedVersions: SUPPORTED_VERSIONS.map(v => `v${v}`)
      }
    });
  }
  
  next();
};
```

### Version-Specific Response Formatting

```typescript
interface ResponseFormatter {
  format(data: any, version: number): any;
}

class ProjectResponseFormatter implements ResponseFormatter {
  format(project: any, version: number) {
    switch (version) {
      case 1:
        return {
          id: project.id,
          name: project.name,
          description: project.description,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          // v1 specific fields
          status: project.status
        };
      
      case 2: // Future version
        return {
          projectId: project.id, // Field renamed in v2
          projectName: project.name,
          description: project.description,
          metadata: {
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
            version: project.version
          },
          // v2 specific fields
          settings: project.settings
        };
      
      default:
        throw new Error(`Unsupported version: ${version}`);
    }
  }
}
```

## Migration Guidelines

### For API Consumers

#### Version Upgrade Checklist

1. **Review changelog** for breaking changes
2. **Update base URLs** to new version
3. **Update response handling** for changed fields
4. **Test all API integrations** thoroughly
5. **Update error handling** for new error codes
6. **Verify authentication** still works
7. **Check rate limits** haven't changed

#### Migration Timeline

```
Month 1-2: New version announcement
Month 3-4: Beta testing with select users
Month 5:   Official release with documentation
Month 6-8: Migration period (both versions supported)
Month 9:   Old version deprecation notice
Month 15:  Old version sunset
```

### For API Maintainers

#### Pre-Release Checklist

- [ ] **Update OpenAPI specification**
- [ ] **Generate SDK updates**
- [ ] **Update documentation**
- [ ] **Create migration guide**
- [ ] **Set up monitoring** for new version
- [ ] **Prepare rollback plans**
- [ ] **Update CI/CD pipelines**
- [ ] **Train support team**

## Documentation Strategy

### Version-Specific Documentation

Each major version maintains its own documentation:

```
docs/
├── v1/
│   ├── api-reference.md
│   ├── getting-started.md
│   └── examples/
├── v2/
│   ├── api-reference.md
│   ├── migration-guide.md
│   └── examples/
└── common/
    ├── authentication.md
    └── rate-limiting.md
```

### Migration Guides

Each new major version includes:

1. **Breaking changes summary**
2. **Field mapping tables**
3. **Code examples** (before/after)
4. **Testing strategies**
5. **Common pitfalls**
6. **Support contacts**

## Example: v1 to v2 Migration Guide

### Breaking Changes Summary

| Change Type | v1 | v2 | Migration Required |
|-------------|----|----|-------------------|
| Field Rename | `id` | `projectId` | Update field references |
| Response Structure | Flat object | Nested metadata | Update parsing logic |
| Error Format | Simple message | Structured details | Update error handling |

### Field Mapping

```typescript
// v1 Response
{
  "id": "proj_123",
  "name": "My Project",
  "createdAt": "2023-06-15T10:30:00Z",
  "status": "active"
}

// v2 Response
{
  "projectId": "proj_123",
  "projectName": "My Project",
  "metadata": {
    "createdAt": "2023-06-15T10:30:00Z",
    "version": "2.0.0"
  },
  "settings": {
    "status": "active"
  }
}
```

### Code Migration Example

```typescript
// v1 Implementation
const response = await fetch('/api/v1/projects/123');
const project = await response.json();
console.log(project.data.id); // proj_123

// v2 Implementation
const response = await fetch('/api/v2/projects/123');
const project = await response.json();
console.log(project.data.projectId); // proj_123
```

## Monitoring and Analytics

### Version Usage Tracking

```typescript
const versionMetrics = {
  trackVersionUsage: (version: number, endpoint: string) => {
    metrics.increment('api.version.usage', {
      version: `v${version}`,
      endpoint: endpoint
    });
  },
  
  trackDeprecationWarnings: (version: number) => {
    metrics.increment('api.version.deprecated', {
      version: `v${version}`
    });
  }
};
```

### Deprecation Warnings

```typescript
const addDeprecationWarning = (res: Response, version: number) => {
  if (version < CURRENT_VERSION) {
    res.setHeader('X-API-Deprecation-Warning', 
      `API version v${version} is deprecated. Please upgrade to v${CURRENT_VERSION}.`
    );
    res.setHeader('X-API-Sunset-Date', SUNSET_DATES[version]);
  }
};
```

## Testing Strategy

### Version Compatibility Tests

```typescript
describe('API Versioning', () => {
  describe('v1 compatibility', () => {
    it('should maintain v1 response format', async () => {
      const response = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.body.data[0]).toHaveProperty('id');
      expect(response.body.data[0]).toHaveProperty('name');
      expect(response.body.data[0]).not.toHaveProperty('projectId');
    });
  });
  
  describe('v2 features', () => {
    it('should use new v2 response format', async () => {
      const response = await request(app)
        .get('/api/v2/projects')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.body.data[0]).toHaveProperty('projectId');
      expect(response.body.data[0]).toHaveProperty('projectName');
      expect(response.body.data[0]).not.toHaveProperty('id');
    });
  });
});
```

### Cross-Version Integration Tests

```typescript
describe('Cross-Version Compatibility', () => {
  it('should work with both v1 and v2 simultaneously', async () => {
    // Create project via v1
    const createResponse = await request(app)
      .post('/api/v1/projects')
      .send(v1ProjectData);
    
    const projectId = createResponse.body.data.id;
    
    // Read same project via v2
    const readResponse = await request(app)
      .get(`/api/v2/projects/${projectId}`);
    
    expect(readResponse.body.data.projectId).toBe(projectId);
  });
});
```

## Future Considerations

### Planned Features for v2

1. **Enhanced project metadata**
2. **Improved error responses**
3. **Better pagination**
4. **GraphQL endpoint**
5. **Webhook improvements**
6. **Real-time subscriptions**

### Long-term Strategy

- **v3**: Consider GraphQL-first approach
- **Microservices**: Split into domain-specific APIs
- **Event-driven**: Move to event-based architecture
- **Real-time**: WebSocket support for live updates

## Support and Communication

### Version Announcements

- **Developer blog posts** for major versions
- **Email notifications** to registered developers
- **Documentation updates** with clear timelines
- **Changelog maintenance** with version history
- **Community forums** for discussion and feedback

### Getting Help

- **Version-specific documentation**: `/docs/v{version}/`
- **Migration support**: `migration-support@example.com`
- **Developer community**: `https://community.example.com/api`
- **Status updates**: `https://status.example.com`
