# API Key Management System

## Overview

The CodeQual API uses API keys for authentication and usage tracking. This document describes the API key management system implementation.

## Architecture

### Database Schema

1. **api_keys** - Stores hashed API keys and metadata
2. **api_usage_logs** - Tracks every API request
3. **api_subscriptions** - Links users to Stripe subscriptions
4. **api_usage_summaries** - Monthly usage aggregation for billing
5. **api_rate_limits** - Rate limiting tracking (can be replaced with Redis)

### Security Features

- API keys are hashed using SHA-256 before storage
- Keys can be restricted to specific endpoints
- Automatic expiration support
- Rate limiting per minute/hour
- Usage tracking for billing

## API Endpoints

### Public API (v1)

All v1 endpoints require API key authentication:

```bash
# Using header (recommended)
curl -H "X-API-Key: ck_your_api_key_here" https://api.codequal.com/v1/analyze-pr

# Using query parameter (for webhooks/browsers)
curl https://api.codequal.com/v1/analyze-pr?api_key=ck_your_api_key_here
```

Available v1 endpoints:
- `POST /v1/analyze-pr` - Analyze a pull request
- `GET /v1/repository/{url}` - Get repository status
- `GET /v1/analysis/history` - Get analysis history
- `GET /v1/reports/{id}` - Get analysis report

### API Key Management (requires user auth)

```bash
# List your API keys
GET /api/keys

# Create new API key
POST /api/keys
{
  "name": "Production Key",
  "expiresIn": 365  // days (optional)
}

# Revoke API key
DELETE /api/keys/{id}

# Get usage statistics
GET /api/keys/{id}/usage
```

## Implementation Details

### Key Generation

API keys follow the format: `ck_[32-character-hex]`

Example: `ck_a1b2c3d4e5f6789012345678901234`

### Rate Limiting

Default limits by plan:
- **Starter**: 60/min, 1000/hour
- **Growth**: 120/min, 5000/hour  
- **Scale**: 300/min, 20000/hour
- **Enterprise**: Custom

### Usage Tracking

Every API request tracks:
- Endpoint accessed
- Response time
- Tokens used (for AI operations)
- Cost in USD
- Status code
- Error messages (if any)

### Error Responses

```json
{
  "error": "Invalid API key",
  "code": "INVALID_API_KEY",
  "message": "The provided API key is invalid or has been revoked"
}
```

Error codes:
- `MISSING_API_KEY` - No API key provided
- `INVALID_API_KEY` - Key not found or inactive
- `EXPIRED_API_KEY` - Key has expired
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `USAGE_LIMIT_EXCEEDED` - Monthly limit reached
- `FORBIDDEN_ENDPOINT` - Key lacks permission for endpoint

## Database Migration

Run the migration to create required tables:

```bash
# Using Supabase CLI
supabase db push

# Or directly
psql $DATABASE_URL < packages/database/migrations/20241228_api_key_management.sql
```

## Testing

Run the test script:

```bash
npm run test:api-keys
# or
ts-node scripts/test-api-keys.ts
```

## Multi-Language Support

API responses respect the `Accept-Language` header:

```bash
# Spanish error messages
curl -H "Accept-Language: es" -H "X-API-Key: invalid" https://api.codequal.com/v1/analyze-pr

# Response
{
  "error": "Clave API inválida",
  "code": "INVALID_API_KEY",
  "message": "La clave API proporcionada es inválida o ha sido revocada"
}
```

## SDK Usage Examples

### Python
```python
from codequal import CodeQualClient

client = CodeQualClient(api_key="ck_your_key_here")
result = client.analyze_pr(
    repository_url="https://github.com/user/repo",
    pr_number=123
)
```

### JavaScript
```javascript
import { CodeQualClient } from 'codequal';

const client = new CodeQualClient({ apiKey: 'ck_your_key_here' });
const result = await client.analyzePR({
  repositoryUrl: 'https://github.com/user/repo',
  prNumber: 123
});
```

### cURL
```bash
curl -X POST https://api.codequal.com/v1/analyze-pr \
  -H "X-API-Key: ck_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "repositoryUrl": "https://github.com/user/repo",
    "prNumber": 123
  }'
```

## Billing Integration

The system automatically tracks usage for Stripe billing:

1. Each request increments usage counters
2. Monthly summaries are generated
3. Stripe webhooks update subscription status
4. Usage-based billing for overages

## Security Best Practices

1. **Never share API keys** in public repos or client-side code
2. **Rotate keys regularly** using the management API
3. **Use environment variables** to store keys
4. **Restrict key permissions** to only required endpoints
5. **Monitor usage** for unusual patterns

## Next Steps

1. ✅ Database schema created
2. ✅ API key middleware implemented
3. ✅ Management endpoints created
4. ⏳ Run database migration
5. ⏳ Test with real Supabase connection
6. ⏳ Implement Stripe webhook handlers
7. ⏳ Add API key to user dashboard UI