# Iterative DeepWiki Analysis Solution

## Overview

The Iterative DeepWiki Analysis is our production solution for handling the inherent inconsistency in DeepWiki's analysis results. This approach runs multiple analysis iterations until convergence is reached, building a comprehensive collection of all discovered issues.

## Problem Statement

DeepWiki's analysis can produce different results on subsequent runs of the same repository/branch due to:
- Non-deterministic AI model responses
- Sampling variations in large codebases
- Context window limitations
- Different focus areas in each analysis pass

## Solution Architecture

### Core Components

1. **IterativeDeepWikiAnalyzer** (`test-iterative-deepwiki-analysis.ts`)
   - Main orchestrator for iterative analysis
   - Manages repository cloning and branch switching
   - Coordinates multiple analysis passes
   - Tracks convergence statistics

2. **Convergence Detection**
   - Runs up to 5 iterations per branch
   - Stops when no new issues are found (convergence)
   - Tracks unique issues using location + title as key
   - Maintains cumulative issue collection

3. **Caching System**
   - Each iteration cached in `.deepwiki-cache/`
   - Cache key: `{owner}-{repo}/{branch}-iteration-{n}.json`
   - Enables resumable analysis
   - Provides transparency into discovery process

4. **Code Snippet Extraction**
   - Clones actual repository
   - Extracts real code with context lines
   - Marks issue line with `>>>` indicator
   - Handles missing files gracefully

## Usage

### Basic Usage

```bash
# Ensure DeepWiki is accessible
kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001

# Run iterative analysis
USE_DEEPWIKI_MOCK=false npx ts-node test-iterative-deepwiki-analysis.ts
```

### Custom Repository Analysis

```typescript
import { IterativeDeepWikiAnalyzer } from './test-iterative-deepwiki-analysis';

const analyzer = new IterativeDeepWikiAnalyzer(
  'https://github.com/owner/repo',
  123 // PR number
);

const result = await analyzer.analyze();
```

## Configuration

### Environment Variables

- `USE_DEEPWIKI_MOCK`: Set to `false` for real analysis
- `DEEPWIKI_API_URL`: DeepWiki endpoint (default: `http://localhost:8001`)
- `DEEPWIKI_API_KEY`: API key if required
- `OPENROUTER_API_KEY`: For model selection

### Tuneable Parameters

```typescript
class IterativeDeepWikiAnalyzer {
  private maxIterations = 5;           // Maximum analysis passes
  private convergenceThreshold = 0;    // New issues threshold for convergence
  private contextLines = 3;            // Code snippet context lines
}
```

## Output Structure

### Reports Generated

```
reports/iterative-analysis/{timestamp}/
├── report.html              # Visual HTML report
├── report.md               # Markdown report
├── data.json              # Complete analysis data
└── convergence-stats.json # Iteration statistics
```

### Convergence Statistics

```json
{
  "base": {
    "totalIterations": 3,
    "totalUniqueIssues": 25,
    "convergenceReached": true,
    "iterationResults": [
      {
        "iteration": 1,
        "newIssuesFound": 10,
        "totalIssues": 10
      },
      {
        "iteration": 2,
        "newIssuesFound": 10,
        "totalIssues": 20
      },
      {
        "iteration": 3,
        "newIssuesFound": 5,
        "totalIssues": 25
      }
    ]
  },
  "pr": {
    // Similar structure for PR branch
  }
}
```

## Issue Categorization

Issues are automatically categorized as:

1. **New Issues**: Present in PR but not in main branch
2. **Resolved Issues**: Present in main but not in PR  
3. **Pre-existing Issues**: Present in both branches (technical debt)

### Issue Matching Algorithm

```typescript
private generateIssueKey(issue: Issue): string {
  // Unique key based on location and title
  return `${issue.location.file}:${issue.location.line}:${issue.title}`;
}
```

## Benefits

1. **Comprehensive Discovery**: Finds more issues through multiple passes
2. **Consistency**: Convergence ensures stable results
3. **Transparency**: Shows discovery progression
4. **Real Code Context**: Actual snippets from repository
5. **Cacheable**: Iterations can be cached and reused
6. **Production Ready**: No mocks or demos

## Performance Considerations

- Each iteration takes 10-20 seconds
- Full analysis (both branches) takes 2-5 minutes
- Cache reduces re-analysis time
- Repository cloning is one-time cost

## Comparison with Previous Approaches

| Approach | Pros | Cons |
|----------|------|------|
| Single Pass | Fast | Misses issues |
| Mock Data | Consistent | Not real |
| Cached Static | Predictable | Outdated |
| **Iterative** | **Comprehensive** | **Slower** |

## Future Enhancements

1. **Parallel Branch Analysis**: Analyze main and PR simultaneously
2. **Smart Convergence**: Adaptive threshold based on repository size
3. **Incremental Updates**: Only re-analyze changed files
4. **Distributed Analysis**: Split across multiple DeepWiki instances
5. **Historical Tracking**: Compare convergence patterns over time

## Troubleshooting

### DeepWiki Not Accessible

```bash
# Check pod status
kubectl get pods -n codequal-dev -l app=deepwiki

# Restart port forwarding
kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001
```

### Slow Convergence

- Increase `maxIterations` for larger repositories
- Check DeepWiki logs for errors
- Verify network connectivity

### Cache Issues

```bash
# Clear cache for specific repository
rm -rf .deepwiki-cache/{owner}-{repo}/

# Clear all cache
rm -rf .deepwiki-cache/
```

## Production Deployment

This solution is production-ready and should be integrated into:

1. **CI/CD Pipeline**: Run on PR creation/update
2. **API Service**: Expose as analysis endpoint
3. **Scheduled Jobs**: Regular repository health checks
4. **Quality Gates**: Block PRs with critical issues

## Conclusion

The Iterative DeepWiki Analysis solution provides a robust, production-ready approach to code quality analysis that handles the inherent variability of AI-based tools while delivering comprehensive and actionable results.