# CodeQual Orchestrator E2E Test

This E2E test directly uses the CodeQual ResultOrchestrator to perform real PR analysis with actual GitHub repositories, capturing token usage and performance metrics.

## Features

- **Direct Orchestrator Usage**: Uses the actual `ResultOrchestrator` class from the API
- **Real GitHub Integration**: Analyzes real PRs from public GitHub repositories
- **Token Usage Tracking**: Captures actual token consumption from OpenAI/Claude API calls
- **Performance Monitoring**: Tracks execution times for each phase and agent
- **Cost Calculation**: Estimates costs based on token usage
- **Comprehensive Reporting**: Generates detailed JSON reports with all metrics

## Prerequisites

1. **Environment Variables**: Create a `.env` file in the project root with:
   ```bash
   # Supabase Configuration
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key
   
   # GitHub Access
   GITHUB_TOKEN=your_github_token
   
   # OpenAI API
   OPENAI_API_KEY=your_openai_key
   
   # Claude API (if using Claude agents)
   ANTHROPIC_API_KEY=your_anthropic_key
   
   # Test User Configuration (optional)
   TEST_USER_ID=test-user-123
   TEST_USER_EMAIL=test@codequal.com
   TEST_ORG_ID=test-org-123
   TEST_SESSION_TOKEN=test-session-token
   ```

2. **Dependencies**: Install required packages:
   ```bash
   cd packages/test-integration
   npm install
   ```

## Usage

### Run All Test Scenarios
Runs predefined test scenarios with different repository types and PR complexities:
```bash
npm run test:orchestrator-e2e
```

This will test:
- Small security fix in OWASP NodeGoat
- Medium React feature PR
- Large TypeScript refactor

### Test Specific PR
Analyze a specific PR from any public GitHub repository:
```bash
npm run test:orchestrator-e2e:custom <repository-url> <pr-number>

# Example:
npm run test:orchestrator-e2e:custom https://github.com/facebook/react 28000
```

### Test Token Tracking
Verify that token usage tracking is working correctly:
```bash
npm run test:orchestrator-e2e:tracking
```

## Test Scenarios

The test includes three predefined scenarios:

1. **Small Security Fix**
   - Repository: OWASP/NodeGoat
   - Analysis Mode: Quick
   - Expected Agents: Security, Code Quality
   - Focus: Security vulnerabilities in a teaching app

2. **Medium React Feature**
   - Repository: facebook/react
   - Analysis Mode: Comprehensive
   - Expected Agents: Security, Architecture, Performance, Code Quality
   - Focus: Feature additions to a major framework

3. **Large TypeScript Refactor**
   - Repository: microsoft/TypeScript
   - Analysis Mode: Deep
   - Expected Agents: All agents including Dependencies
   - Focus: Large-scale refactoring in a compiler

## Output

### Console Output
- Real-time progress indicators for each phase
- Success/failure status for each scenario
- Summary statistics including:
  - Total execution time
  - Token usage breakdown
  - Estimated costs
  - Agent execution times

### JSON Report
Detailed reports are saved to `packages/test-integration/reports/` with:
```json
{
  "timestamp": "2024-06-25T10:30:00.000Z",
  "environment": {
    "nodeVersion": "v18.16.0",
    "platform": "darwin"
  },
  "summary": {
    "totalScenarios": 3,
    "successfulScenarios": 3,
    "totalDuration": 125000,
    "totalCost": 2.45,
    "totalTokens": 45000
  },
  "scenarios": [...],
  "detailedResults": [...]
}
```

## Performance Metrics Captured

1. **Phase Timings**:
   - PR Context extraction
   - Repository status check
   - Agent execution
   - Result processing
   - Educational content generation
   - Report generation

2. **Agent Performance**:
   - Individual agent execution times
   - Token usage per agent
   - Success/failure status

3. **Token Usage**:
   - Input tokens
   - Output tokens
   - Total tokens
   - Estimated cost per provider

4. **Overall Metrics**:
   - Total findings count
   - Severity distribution
   - Coverage percentage
   - Confidence scores

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify all API keys are set correctly
   - Check Supabase service role key has proper permissions
   - Ensure GitHub token has read access to repositories

2. **Rate Limiting**
   - The test includes 5-second delays between scenarios
   - For intensive testing, consider increasing delays
   - Monitor API rate limits for OpenAI/Claude

3. **Token Tracking Not Working**
   - Ensure agents are logging token usage
   - Check console.log interception is working
   - Verify log format matches expected patterns

### Debug Mode
Enable detailed logging:
```bash
DEBUG=codequal:* npm run test:orchestrator-e2e
```

## Extending the Test

### Adding New Scenarios
Edit `orchestrator-e2e-test.ts` and add to `TEST_SCENARIOS`:
```typescript
{
  name: 'Your Scenario Name',
  repositoryUrl: 'https://github.com/owner/repo',
  prNumber: 123,
  analysisMode: 'comprehensive',
  expectedAgents: ['security', 'architecture'],
  description: 'Description of what this tests'
}
```

### Custom Token Parsing
To support additional AI providers, add parsing methods:
```typescript
private parseYourProviderTokenUsage(log: string) {
  // Parse provider-specific log format
  // Update this.tokenUsageTracker
}
```

### Additional Metrics
Extend `PerformanceMetrics` interface to capture more data:
```typescript
interface PerformanceMetrics {
  // ... existing fields
  customMetric: number;
  memoryUsage: number;
  apiCallCount: number;
}
```

## Best Practices

1. **Start Small**: Test with small PRs first to verify setup
2. **Monitor Costs**: Token usage can add up quickly with large PRs
3. **Use Test Repositories**: Consider using your own test repositories
4. **Cache Results**: Supabase and Vector DB cache reduce repeat costs
5. **Regular Testing**: Run weekly to catch performance regressions

## Integration with CI/CD

Example GitHub Actions workflow:
```yaml
name: Orchestrator E2E Tests
on:
  schedule:
    - cron: '0 0 * * 0' # Weekly on Sunday
  workflow_dispatch:

jobs:
  e2e-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:orchestrator-e2e
      - uses: actions/upload-artifact@v3
        with:
          name: test-reports
          path: packages/test-integration/reports/
```