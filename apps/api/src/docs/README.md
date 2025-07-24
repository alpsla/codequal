# CodeQual API Documentation

This directory contains OpenAPI 3.0 specifications for all CodeQual API endpoints.

## Documentation Files

### Core Endpoints
- **auth-endpoints.yaml** - Authentication endpoints (signup, signin, OAuth, refresh tokens)
- **billing-endpoints.yaml** - Billing and subscription management
- **users-endpoints.yaml** - User profile and preferences management
- **organizations-endpoints.yaml** - Organization and team management

### Analysis & Reports
- **analysis-endpoints.yaml** - Code analysis endpoints (PR, repository, file analysis)
- **reports-endpoints.yaml** - Analysis report management and sharing

### API Management
- **api-keys-endpoints.yaml** - API key creation and management
- **vector-endpoints.yaml** - Vector search and embeddings
- **monitoring-endpoints.yaml** - System health and performance monitoring

## Viewing the Documentation

### Option 1: Swagger UI Demo (Node.js)
```bash
# From the api directory
node swagger-demo.js
# Open http://localhost:3002/docs
```

### Option 2: Static HTML Demo
Open `swagger-ui-complete.html` in a web browser

### Option 3: Within the API Server
When the API server is running, visit:
- Development: http://localhost:3001/api-docs
- Production: https://api.codequal.com/api-docs

## API Authentication

The API supports two authentication methods:

1. **Bearer Token (JWT)**
   - Obtain via `/auth/signin` endpoint
   - Include in header: `Authorization: Bearer <token>`

2. **API Key**
   - Create via `/api/keys` endpoint
   - Include in header: `X-API-Key: <key>`

## Rate Limits

All endpoints are rate-limited based on your subscription tier:
- Free: 100 requests/day
- Individual: 1,000 requests/day
- Team: 10,000 requests/day
- Enterprise: Custom limits

## Endpoint Categories

### 1. Authentication & Users
- User registration and authentication
- Profile management
- Preferences and settings

### 2. Analysis
- Pull request analysis
- Repository scanning
- File-level code review
- Async analysis with progress tracking

### 3. Reports
- View analysis results
- Generate reports in multiple formats (JSON, HTML, PDF)
- Share reports with team members

### 4. API Keys
- Create and manage API keys
- Set custom rate limits
- Monitor usage statistics

### 5. Organizations
- Create and manage teams
- Invite members
- Set organization-wide settings
- Monitor team usage

### 6. Vector Search
- Semantic code search
- Find similar patterns
- Store and retrieve embeddings

### 7. Monitoring
- Health checks
- Performance metrics
- System logs
- Alert management

## Example Usage

### Analyze a Pull Request
```bash
curl -X POST https://api.codequal.com/api/analysis/pr \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pr_url": "https://github.com/user/repo/pull/123",
    "analysis_mode": "deep"
  }'
```

### Create an API Key
```bash
curl -X POST https://api.codequal.com/api/keys \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "CI/CD Pipeline",
    "scopes": ["read:analysis", "write:analysis"]
  }'
```

## Support

- Email: support@codequal.com
- Documentation: https://docs.codequal.com
- Status Page: https://status.codequal.com