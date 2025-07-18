# CodeQual Manual Test Scenarios

## Prerequisites
- Ensure all environment variables are set in `.env`
- Database migrations are up to date
- API server is running: `npm run dev`
- Frontend is running: `cd apps/web && npm run dev`

## 1. Authentication & Authorization Tests

### 1.1 User Registration/Login
1. Navigate to http://localhost:3000
2. Click "Sign Up" and create a new account
3. Verify email confirmation works
4. Log in with new credentials
5. **Expected**: Redirected to dashboard with user profile visible

### 1.2 API Key Management
1. Go to Settings → API Keys
2. Create a new API key with description
3. Copy the key (shown only once)
4. Test the key with curl:
   ```bash
   curl -H "X-API-Key: YOUR_KEY" http://localhost:3001/api/v1/health
   ```
5. **Expected**: Returns health status with authenticated user info

## 2. Billing Integration Tests

### 2.1 Subscription Plans
1. Navigate to Billing page
2. View available plans (Free, Pro, Enterprise)
3. Select "Upgrade to Pro"
4. Enter test card: `4242 4242 4242 4242`
5. **Expected**: Subscription activated, features unlocked

### 2.2 Usage Tracking
1. Perform a code analysis
2. Navigate to Usage page
3. **Expected**: See token usage, API calls, and costs

### 2.3 Pay-Per-Scan
1. As a free user, exhaust monthly quota
2. Attempt another scan
3. **Expected**: Prompted to pay for single scan
4. Complete payment
5. **Expected**: Scan proceeds successfully

## 3. Vector DB & DeepWiki Tests

### 3.1 DeepWiki Configuration Storage
1. Run the initialization script:
   ```bash
   npx ts-node src/test-scripts/initialize-deepwiki-models.ts
   ```
2. **Expected**: Models discovered and stored

### 3.2 Model Selection
1. Analyze a repository
2. Check logs for model selection
3. **Expected**: See "Selected model for repository" with reasoning

### 3.3 Vector Context Retrieval
1. Perform multiple analyses on same repository
2. Check second analysis
3. **Expected**: Faster analysis using cached context

## 4. PR Analysis Workflow

### 4.1 GitHub PR Analysis
1. Navigate to PR Analysis page
2. Enter a GitHub PR URL (e.g., `https://github.com/owner/repo/pull/123`)
3. Click "Analyze"
4. **Expected**: 
   - Progress indicators show each stage
   - Analysis completes within 2-3 minutes
   - Report shows security, quality, and performance insights

### 4.2 Mock PR Analysis (Testing)
1. Use the test endpoint:
   ```bash
   curl -X POST http://localhost:3001/api/v1/analysis/mock-pr \
     -H "Content-Type: application/json" \
     -d '{"prUrl": "https://github.com/test/repo/pull/1"}'
   ```
2. **Expected**: Returns mock analysis results immediately

## 5. Report Generation Tests

### 5.1 HTML Report
1. Complete a PR analysis
2. Click "Download Report"
3. **Expected**: Professional HTML report with:
   - Executive summary
   - Detailed findings by category
   - Code snippets with issues highlighted
   - Recommendations

### 5.2 Report Persistence
1. Note the report ID from URL
2. Log out and log back in
3. Navigate to Reports history
4. **Expected**: Previous reports accessible

## 6. Multi-Agent System Tests

### 6.1 Agent Collaboration
1. Analyze a complex repository
2. Monitor logs for agent interactions
3. **Expected**: See messages like:
   - "Security agent found X vulnerabilities"
   - "Code Quality agent identified Y issues"
   - "Performance agent detected Z bottlenecks"

### 6.2 Agent Failover
1. Temporarily set invalid API key for primary model
2. Run analysis
3. **Expected**: Falls back to secondary model
4. Check logs for "Falling back to model X"

## 7. Error Handling Tests

### 7.1 API Rate Limiting
1. Make 100+ API calls rapidly
2. **Expected**: 429 error with retry-after header

### 7.2 Invalid Repository
1. Try to analyze non-existent repository
2. **Expected**: Clear error message "Repository not found"

### 7.3 Large Repository
1. Analyze repository >1GB
2. **Expected**: Warning about size, option to proceed

## 8. Performance Tests

### 8.1 Concurrent Analyses
1. Start 3 analyses simultaneously
2. **Expected**: All complete successfully
3. Check queue status in monitoring

### 8.2 Cache Performance
1. Analyze same PR twice
2. **Expected**: Second analysis 50%+ faster

## 9. Security Tests

### 9.1 API Key Security
1. Try using API key from different IP
2. **Expected**: Works (no IP restriction by default)

### 9.2 SQL Injection
1. Try repository URL with SQL in it:
   ```
   https://github.com/test/repo'; DROP TABLE users;--
   ```
2. **Expected**: Safely handled, no database errors

### 9.3 XSS Protection
1. Create PR with `<script>alert('XSS')</script>` in title
2. View in reports
3. **Expected**: Script not executed, displayed as text

## 10. Database Health Checks

### 10.1 Run System Health Check
```bash
npx ts-node src/test-scripts/test-system-health.ts
```
**Expected**: All components show "PASSED" except known issues

### 10.2 Check Database Tables
```sql
-- Run in Supabase SQL editor
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```
**Expected**: See all required tables including:
- users
- user_profiles
- user_billing
- organizations
- repositories
- analysis_reports
- analysis_chunks (for vector DB)

### 10.3 Create DeepWiki Tables
```sql
-- Run this if deepwiki_configurations table doesn't exist
CREATE TABLE IF NOT EXISTS public.deepwiki_configurations (
    id TEXT PRIMARY KEY,
    config_type TEXT NOT NULL CHECK (config_type IN ('global', 'repository')),
    repository_url TEXT,
    primary_model TEXT NOT NULL,
    fallback_model TEXT NOT NULL,
    config_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(config_type, repository_url)
);

-- Create index for repository lookups
CREATE INDEX idx_deepwiki_repo_url ON deepwiki_configurations(repository_url) 
WHERE config_type = 'repository';
```

## Test Execution Checklist

- [ ] Authentication flow works end-to-end
- [ ] API keys can be created and used
- [ ] Billing integration processes payments
- [ ] Usage tracking accurately records activity
- [ ] PR analysis completes successfully
- [ ] Reports generate with correct data
- [ ] Vector DB stores and retrieves context
- [ ] DeepWiki model selection works
- [ ] Error handling is user-friendly
- [ ] Performance meets expectations

## Troubleshooting

### Common Issues

1. **"Table does not exist" errors**
   - Run database migrations
   - Check Supabase connection

2. **"API key invalid" errors**
   - Verify OPENROUTER_API_KEY in .env
   - Check key hasn't expired

3. **"Billing failed" errors**
   - Ensure Stripe keys are set
   - Use test mode keys for testing

4. **Slow analysis performance**
   - Check API rate limits
   - Verify model availability
   - Monitor token usage

## Automated Test Commands

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- auth
npm test -- billing
npm test -- vector-db

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e
```

## Monitoring During Tests

1. **API Logs**: `tail -f logs/api.log`
2. **Database Queries**: Enable query logging in Supabase
3. **Network Traffic**: Use browser DevTools
4. **Performance**: Use `npm run monitor`

## Success Criteria

All manual tests should pass with:
- No unhandled errors
- Response times <3s for UI actions
- Analysis completion <5 minutes
- Clear error messages for failures
- Consistent behavior across runs