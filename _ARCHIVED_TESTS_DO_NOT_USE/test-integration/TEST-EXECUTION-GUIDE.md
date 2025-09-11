# Test Execution Guide

This guide explains how to run real data tests against the CodeQual API and interpret the results.

## Prerequisites

1. **Environment Variables**
   ```bash
   # Required
   export CODEQUAL_API_KEY="your-api-key"
   
   # Optional but recommended
   export GITHUB_TOKEN="your-github-token"
   export CODEQUAL_API_URL="http://localhost:3001/api"  # Default: http://localhost:3001/api
   ```

2. **API Server Running**
   - Ensure the CodeQual API server is running
   - Default port: 3001
   - Health check: `curl http://localhost:3001/health`

## Running Tests

### 1. Run All Real Data Tests
```bash
npm run test:real-data
```

### 2. Run Specific Scenarios
```bash
# Single scenario
npm run test:real-data flask-python-small

# Multiple scenarios
npm run test:real-data flask-python-small react-javascript-medium
```

### 3. Run with Custom Configuration
```bash
# With custom API URL
CODEQUAL_API_URL=https://api.codequal.com npm run test:real-data

# With increased timeout
npm run test:real-data -- --timeout 600000
```

## Test Scenarios

### Available Scenarios

| ID | Name | Language | Size | Complexity |
|---|---|---|---|---|
| `vscode-typescript-large` | VSCode - Large TypeScript Application | TypeScript | Large | Complex |
| `react-javascript-medium` | React - Medium JavaScript Application | JavaScript | Medium | Moderate |
| `flask-python-small` | Flask - Small Python Application | Python | Small | Simple |
| `spring-java-large` | Spring - Large Java Enterprise Application | Java | Large | Complex |
| `rust-systems-medium` | Rust - Medium Systems Programming | Rust | Medium | Complex |
| `go-microservices-medium` | Go - Medium Microservices Application | Go | Large | Complex |

### Quick Test Sets

```bash
# Quick smoke test (small repositories only)
npm run test:real-data:quick

# Language-specific tests
npm run test:real-data:javascript  # JS/TS projects
npm run test:real-data:python      # Python projects
npm run test:real-data:systems     # Rust/Go projects

# Performance-focused scenarios
npm run test:real-data:performance
```

## Understanding Results

### Console Output

During execution, you'll see:

1. **Scenario Header**
   ```
   📋 Testing: Flask - Small Python Application
   Repository: https://github.com/pallets/flask
   PR #4500 | python | small
   ```

2. **Progress Indicators**
   - `Attempt 1/3...` - API call attempts
   - `✅ Scenario completed successfully` - Success
   - `❌ Scenario failed: [error]` - Failure

3. **Results Summary**
   ```
   📊 Findings: 8 total
      By category: {"security":3,"codeQuality":5}
      By severity: {"high":2,"medium":4,"low":2}
   📚 Educational: 6 resources
   ⚡ Performance:
      API call: 12.45s
      Total time: 13.21s
      Tokens: 45,231
      Cost: $0.6784
   ```

### Performance Monitoring

Real-time metrics displayed during execution:
- ⏱️ Elapsed time
- 📝 Token usage
- 💰 Cost accumulation
- 🔌 API calls
- 💾 Memory usage

### Report Files

Results are saved to `reports/real-data-test-[timestamp].json`:

```json
{
  "timestamp": "2025-06-25T10:30:00.000Z",
  "summary": {
    "totalScenarios": 6,
    "successful": 5,
    "failed": 1
  },
  "scenarios": [
    {
      "id": "flask-python-small",
      "success": true,
      "executionTime": 13210,
      "findings": {
        "total": 8,
        "byCategory": {"security": 3, "codeQuality": 5},
        "bySeverity": {"high": 2, "medium": 4, "low": 2}
      },
      "performance": {
        "apiCallTime": 12450,
        "totalTokens": 45231,
        "totalCost": 0.6784
      }
    }
  ],
  "performanceStats": { /* detailed metrics */ }
}
```

## Interpreting Results

### Success Criteria

Each scenario validates:
1. **Minimum Findings**: Does it meet the expected minimum?
2. **Expected Categories**: Are the right analysis categories covered?
3. **Performance Target**: Is it within the time budget?
4. **Educational Content**: Are learning resources generated?

### Common Issues

1. **Rate Limiting**
   - Solution: Add `GITHUB_TOKEN` to increase rate limits
   - The test runner automatically handles rate limit retries

2. **Timeouts**
   - Large repositories may timeout
   - Increase timeout: `--timeout 900000` (15 minutes)

3. **API Failures**
   - Check API server logs
   - Verify API key is valid
   - Ensure network connectivity

### Performance Optimization

Monitor these metrics for optimization opportunities:
- **Token usage per agent**: Identify expensive agents
- **API response times**: Network or server issues
- **Memory usage**: Resource constraints
- **Cost per scenario**: Budget planning

## Advanced Usage

### Custom Test Scenarios

Create new scenarios in `test-scenarios.ts`:

```typescript
{
  id: 'my-custom-scenario',
  name: 'My Custom Test',
  repositoryUrl: 'https://github.com/org/repo',
  prNumber: 123,
  // ... other configuration
}
```

### Integration with CI/CD

```yaml
# GitHub Actions example
- name: Run CodeQual Tests
  env:
    CODEQUAL_API_KEY: ${{ secrets.CODEQUAL_API_KEY }}
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: |
    npm run test:real-data:quick
    
- name: Upload Results
  uses: actions/upload-artifact@v3
  with:
    name: test-results
    path: packages/test-integration/reports/
```

### Performance Baselines

Establish baselines:
```bash
# Generate baseline report
npm run test:real-data:baseline

# Compare against baseline
npm run test:real-data:compare reports/baseline.json
```

## Troubleshooting

### Debug Mode
```bash
DEBUG=codequal:* npm run test:real-data
```

### Verbose Logging
```bash
npm run test:real-data -- --verbose
```

### Single Scenario Debug
```bash
# Run with full debug output
DEBUG=* npm run test:real-data flask-python-small -- --verbose --no-retry
```

## Best Practices

1. **Start Small**: Test with small repositories first
2. **Monitor Costs**: Watch token usage and costs
3. **Use Caching**: The API caches repository analysis
4. **Batch Testing**: Run related scenarios together
5. **Regular Baselines**: Update performance baselines weekly

## Support

- Check API status: `http://localhost:3001/health`
- View logs: `tail -f logs/api.log`
- Report issues: Create GitHub issue with test report