# Comprehensive Testing Guide for CodeQual

## Overview
This guide covers all testing suites for authentication, embeddings, and vector storage features in the CodeQual API.

## Test Structure

### Unit Tests
Located in test files alongside the source code:
- `/packages/core/src/services/vector-db/__tests__/` - Core embedding service tests
- `/apps/api/src/tests/` - API endpoint tests

### Integration Tests
Located in the API directory:
- `/apps/api/auth-integration-test.js` - OAuth flow testing
- `/apps/api/vector-integration-test.js` - End-to-end vector storage testing
- `/apps/api/test-oauth-flow.js` - Direct Supabase OAuth testing
- `/apps/api/test-embeddings.js` - Embedding generation testing
- `/apps/api/performance-test.js` - Performance benchmarking

## Running Tests

### Authentication Tests

```bash
# Unit tests for auth endpoints
npm run test:auth

# Integration test for OAuth flow
npm run test:auth:integration

# Direct OAuth flow testing
node test-oauth-flow.js
```

### Embedding Service Tests

```bash
# Unit tests for embedding service (in packages/core)
npm run test:embeddings

# Integration test for embeddings
npm run test:embeddings

# Documentation-specific embedding tests
npm run test:embeddings:docs

# Performance benchmarking
npm run test:performance
```

### Vector Storage Tests

```bash
# Unit tests for vector service (in packages/core)
npm run test:vector

# API endpoint tests
npm run test:vector

# Full integration test
npm run test:vector:integration
```

### Run All Tests

```bash
# In the API directory
npm test

# In the core package
cd packages/core && npm test
```

## Test Coverage

### Authentication (✅ Complete)
- [x] OAuth provider initiation (GitHub, GitLab)
- [x] OAuth callback handling
- [x] Session management
- [x] Token validation
- [x] Rate limiting
- [x] CORS configuration
- [x] Error handling
- [x] Supabase integration

### Embeddings (✅ Complete)
- [x] Model selection logic
- [x] Voyage AI integration (voyage-code-3)
- [x] OpenAI fallback (text-embedding-3-large)
- [x] Content type detection
- [x] Cost estimation
- [x] Performance tracking
- [x] Error handling
- [x] Large text handling

### Vector Storage (✅ Complete)
- [x] Authenticated storage
- [x] Vector search
- [x] User vector management
- [x] Statistics tracking
- [x] Metadata handling
- [x] Performance metrics
- [x] Error recovery
- [x] Integration with auth

## Test Data

### Authentication Test User
```javascript
email: 'test@example.com'
password: 'testpassword123'
```

### Vector Storage Test User
```javascript
email: 'vector-test@example.com'
password: 'VectorTest123!'
```

### Sample Test Data
- **Code**: Fibonacci implementations in JavaScript
- **Documentation**: Markdown documentation about algorithms
- **Metadata**: Project names, filenames, versions

## Performance Benchmarks

### Embedding Generation
- **Code (voyage-code-3)**: 216ms - 2.7s
- **Docs (text-embedding-3-large)**: 411ms - 1.2s

### Vector Operations
- **Storage**: Embedding time + ~50-100ms DB write
- **Search**: Embedding time + ~10-50ms DB query
- **Retrieval**: ~400-800ms total

## Troubleshooting

### Common Test Failures

1. **"Missing environment variables"**
   - Ensure all required env vars are in `.env`
   - Source the env file: `source .env`

2. **"Authentication failed"**
   - Check Supabase credentials
   - Verify OAuth providers are configured

3. **"Embedding service unavailable"**
   - Check OPENAI_API_KEY is valid
   - Check VOYAGE_API_KEY if using Voyage

4. **"Vector storage failed"**
   - Ensure database migrations are run
   - Check Supabase connection

### Debug Mode

Enable debug logging:
```bash
DEBUG=* npm run test
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npm test
    env:
      SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
      SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
      OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
      VOYAGE_API_KEY: ${{ secrets.VOYAGE_API_KEY }}
```

## Test Maintenance

### Adding New Tests
1. Create test file in `__tests__` directory
2. Follow existing patterns for mocking
3. Update package.json test scripts
4. Document in this guide

### Updating Test Data
1. Use realistic examples
2. Cover edge cases
3. Include performance scenarios
4. Test error conditions

## Next Steps

1. **Add E2E Tests**: Full user flow from auth to vector search
2. **Load Testing**: Stress test with concurrent users
3. **Security Testing**: Penetration testing for auth endpoints
4. **Monitoring**: Add test metrics to dashboards