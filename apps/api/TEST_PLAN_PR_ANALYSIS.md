# PR Analysis Test Plan

## Overview
This test plan verifies the current PR branch analysis implementation, focusing on:
1. Branch-aware file caching
2. Local clone functionality for feature branches and GitLab
3. Analysis mode selection logic
4. Performance characteristics

## Test Environment Setup

### Prerequisites
1. API server running on port 3002
2. Valid test API key
3. Access to test repositories (public GitHub repos)
4. PostgreSQL and Vector DB running

### Test Repositories
- **Small Repo**: https://github.com/vercel/ms (< 1MB)
- **Medium Repo**: https://github.com/facebook/react (~200MB)
- **Large Repo**: https://github.com/torvalds/linux (> 3GB)
- **GitLab Repo**: https://gitlab.com/gitlab-org/gitlab-runner

## Test Scenarios

### 1. Feature Branch Analysis (Current Implementation)

#### Test 1.1: GitHub Feature Branch
```bash
# Test with Next.js PR
curl -X POST http://localhost:3002/v1/analyze-pr \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prUrl": "https://github.com/vercel/next.js/pull/73500",
    "analysisMode": "comprehensive"
  }'
```

**Expected Result**:
- DeepWiki detects feature branch
- Clones repository locally
- Extracts TypeScript/JavaScript files
- Caches files with branch key
- Returns analysis with findings

**Verify**:
- Log shows: `[DeepWiki] Repository requires local clone (GitLab or feature branch)`
- File count logged
- Cache key includes branch name
- MCP tools find actual issues (not 0 findings)

#### Test 1.2: GitLab Repository
```bash
# Test with GitLab runner PR
curl -X POST http://localhost:3002/v1/analyze-pr \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prUrl": "https://gitlab.com/gitlab-org/gitlab-runner/-/merge_requests/3800",
    "analysisMode": "comprehensive"
  }'
```

**Expected Result**:
- System detects GitLab URL
- Uses local clone approach
- Generates analysis without DeepWiki API

### 2. Main Branch Analysis (Baseline)

#### Test 2.1: GitHub Main Branch
```bash
# Test with main branch (should use DeepWiki API)
curl -X POST http://localhost:3002/v1/analyze-pr \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "repositoryUrl": "https://github.com/vercel/ms",
    "branch": "main",
    "analysisMode": "comprehensive"
  }'
```

**Expected Result**:
- Uses DeepWiki API directly
- No local clone needed
- Faster analysis

### 3. Error Handling Tests

#### Test 3.1: Deleted Branch
```bash
# Test with outdated PR (branch deleted)
curl -X POST http://localhost:3002/v1/analyze-pr \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prUrl": "https://github.com/facebook/react/pull/27000",
    "analysisMode": "quick"
  }'
```

**Expected Result**:
- User-friendly error message
- Mentions branch no longer exists
- Suggests checking if PR is still open

### 4. Performance Tests

#### Test 4.1: Small Repository Performance
```bash
# Time the analysis of a small repo
time curl -X POST http://localhost:3002/v1/analyze-pr \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prUrl": "https://github.com/vercel/ms/pull/150",
    "analysisMode": "quick"
  }'
```

**Metrics to Record**:
- Total time
- Clone time (from logs)
- File extraction time
- Analysis time
- Memory usage

#### Test 4.2: Cache Performance
```bash
# Run same PR twice to test caching
# First run
curl -X POST http://localhost:3002/v1/analyze-pr \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prUrl": "https://github.com/vercel/next.js/pull/73500",
    "analysisMode": "comprehensive"
  }'

# Second run (should use cache)
curl -X POST http://localhost:3002/v1/analyze-pr \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prUrl": "https://github.com/vercel/next.js/pull/73500",
    "analysisMode": "comprehensive"
  }'
```

**Verify**:
- Second run shows: `[DeepWiki] Returning X cached files`
- Second run is significantly faster

### 5. Analysis Mode Selection Tests

#### Test 5.1: Security File Changes
```bash
# PR with auth/security file changes
curl -X POST http://localhost:3002/v1/analyze-pr \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prUrl": "https://github.com/nodejs/node/pull/46000",
    "analysisMode": "auto"
  }'
```

**Expected**:
- Auto mode selects "deep" or "comprehensive"
- Full analysis runs regardless of schedule

#### Test 5.2: Large PR Detection
```bash
# PR with many file changes
curl -X POST http://localhost:3002/v1/analyze-pr \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prUrl": "https://github.com/facebook/react/pull/25000",
    "analysisMode": "auto"
  }'
```

**Expected**:
- System detects high complexity
- Selects appropriate analysis depth

## Monitoring During Tests

### Log Monitoring
```bash
# Watch API logs
tail -f apps/api/api-server-3002.log | grep -E "(DeepWiki|Clone|Cache|Error)"
```

### Key Log Patterns to Watch
- `[DeepWiki] Repository requires local clone`
- `[DeepWiki] Cloning repository:`
- `[DeepWiki] Extracted X files from local repository`
- `[DeepWiki] Cached X files for`
- `[DeepWiki] Returning X cached files`
- `The branch 'X' no longer exists`

### Database Queries
```sql
-- Check Vector DB for stored analyses
SELECT 
  repository_id,
  metadata->>'branch' as branch,
  metadata->>'content_type' as type,
  created_at
FROM analysis_chunks
WHERE metadata->>'is_latest' = 'true'
ORDER BY created_at DESC
LIMIT 10;

-- Check repository cache
SELECT 
  url,
  metadata->>'cached_branches' as branches,
  analysis_date
FROM repositories
ORDER BY analysis_date DESC
LIMIT 5;
```

## Performance Benchmarks

### Expected Performance (Current Implementation)

| Scenario | Clone Time | Analysis Time | Total Time |
|----------|-----------|---------------|------------|
| Small repo, feature branch | 2-5s | 10-20s | 15-30s |
| Medium repo, feature branch | 20-40s | 30-60s | 1-2 min |
| Large repo, feature branch | 2-5 min | 2-5 min | 5-10 min |
| Cached analysis | 0s | 10-30s | 10-30s |

### Memory Usage

| Scenario | Expected RAM Usage |
|----------|-------------------|
| Small repo | 100-200 MB |
| Medium repo | 500-1000 MB |
| Large repo | 2-4 GB |

## Known Limitations

1. **Feature branches use local MCP tools** instead of DeepWiki AI
2. **Double analysis problem**: Analyzes entire branch, not just PR changes
3. **No baseline comparison**: Can't distinguish new vs existing issues
4. **Performance impact**: Large repos take significant time
5. **Disk usage**: Temp directories may accumulate if cleanup fails

## Next Steps

Based on test results, prioritize:
1. Single clone optimization (if clone time > 30s average)
2. Baseline caching (if repeated analyses common)
3. PR-only analysis mode (if false positives high)
4. Sparse checkout (if large repo performance poor)

## Test Execution Checklist

- [ ] Environment setup complete
- [ ] Test API key configured
- [ ] All test scenarios executed
- [ ] Performance metrics recorded
- [ ] Log patterns verified
- [ ] Database state checked
- [ ] Known issues documented
- [ ] Optimization priorities identified