# Comparison Agent

The Comparison Agent is a serverless AWS Lambda function that intelligently compares two DeepWiki analysis reports to determine what changed between branches. It replaces the previous 5 role-based agents with a single, more efficient comparison approach.

## Features

- **Intelligent Issue Matching**: Detects fixed, new, moved, and unchanged issues
- **Impact Analysis**: Calculates security, performance, quality impacts
- **PR Decision Making**: Determines if PR should be blocked based on critical issues
- **Code Movement Detection**: Tracks issues that moved due to refactoring
- **Fuzzy Matching**: Handles minor code changes using similarity algorithms

## Architecture

This agent is deployed as an AWS Lambda function with:
- API Gateway for HTTP endpoints
- CloudWatch for monitoring and alerts
- Serverless framework for deployment
- TypeScript for type safety
- Zod for runtime validation

## Local Development

### Prerequisites

- Node.js 18+
- AWS CLI configured
- Serverless Framework installed globally

### Installation

```bash
npm install
```

### Running Tests

```bash
npm test
```

### Local Testing

```bash
# Run function locally with sample data
npm run invoke:local

# Start serverless offline mode
npm run offline
```

## Deployment

### Deploy to Development

```bash
npm run deploy:dev
```

### Deploy to Production

```bash
npm run deploy:prod
```

### Monitor Logs

```bash
npm run logs
```

## API Usage

### Endpoint

```
POST /compare
```

### Request Format

```json
{
  "mainBranchReport": {
    "overall_score": 75,
    "issues": [...],
    "metadata": {...}
  },
  "featureBranchReport": {
    "overall_score": 80,
    "issues": [...],
    "metadata": {...}
  },
  "prMetadata": {
    "pr_number": 123,
    "pr_title": "Fix security issues",
    "files_changed": ["src/file1.ts", "src/file2.ts"],
    "lines_added": 100,
    "lines_removed": 50
  }
}
```

### Response Format

```json
{
  "fixed_issues": [...],
  "new_issues": [...],
  "unchanged_issues": [...],
  "moved_issues": [...],
  "impact_analysis": {
    "overall_impact": 5,
    "security_impact": 10,
    "performance_impact": 0,
    "quality_impact": -2,
    "architecture_impact": 0,
    "dependencies_impact": 0
  },
  "pr_decision": {
    "should_block": false,
    "blocking_issues": [],
    "reason": "PR meets quality standards"
  },
  "insights": [
    "Security posture improved: 2 vulnerabilities fixed, only 0 introduced.",
    "3 issues appear to have moved due to code refactoring."
  ],
  "final_report": {
    "repository_analysis": {
      "total_issues": 15,
      "issues_by_severity": {
        "critical": 0,
        "high": 3,
        "medium": 7,
        "low": 5
      },
      "issues_by_category": {
        "security": 1,
        "performance": 3,
        "quality": 8,
        "architecture": 2,
        "dependencies": 1
      },
      "all_issues": [
        {
          "id": "PERF-001",
          "title": "N+1 Query Problem",
          "severity": "high",
          "category": "performance",
          "file_path": "src/services/user.ts",
          "line_number": 125,
          "description": "Loop executes database query for each user",
          "code_snippet": "for (const user of users) { await getProfile(user.id) }",
          "recommendation": "Batch queries or use a join"
        }
        // ... all other issues with full details
      ],
      "overall_score": 75
    },
    "pr_impact": {
      "issues_fixed": 2,
      "issues_introduced": 1,
      "issues_moved": 3,
      "score_change": 5,
      "percentage_improvement": 7.14
    },
    "prioritized_issues": [
      {
        "issue": { /* full issue details */ },
        "priority_score": 55,  // critical security = 40 + 10 + 5
        "status": "new"
      },
      {
        "issue": { /* full issue details */ },
        "priority_score": 35,  // high performance = 30 + 5
        "status": "existing"
      }
    ],
    "recommendations": [
      {
        "category": "security",
        "priority": "critical",
        "recommendation": "Fix 1 critical security vulnerability immediately. These include: SQL Injection. Consider using security scanning tools and implementing secure coding practices.",
        "affected_files": ["src/db.ts"]
      },
      {
        "category": "performance",
        "priority": "high",
        "recommendation": "Address 3 performance issues. Common patterns include N+1 queries and inefficient algorithms. Consider profiling and load testing.",
        "affected_files": ["src/api.ts", "src/services/user.ts"]
      }
    ]
  }
}
```

### Final Report Components

The `final_report` section provides a comprehensive analysis including:

1. **Repository Analysis**: Complete state of the repository after PR
   - Total issue count with full details
   - Breakdown by severity and category
   - All issues with code snippets and recommendations
   - Overall repository score

2. **PR Impact**: Quantified impact of the changes
   - Number of issues fixed, introduced, and moved
   - Score change (positive = improvement)
   - Percentage improvement calculation

3. **Prioritized Issues**: All issues sorted by priority
   - Priority scoring algorithm considers severity, category, and status
   - New issues get bonus priority for immediate attention
   - Security issues receive additional weight

4. **Recommendations**: Actionable guidance
   - Category-specific recommendations
   - Priority levels (critical/high/medium/low)
   - Affected files for focused review

## Key Algorithms

### Issue Matching

The agent uses a multi-step approach to match issues:

1. **Exact Match**: Same ID, file, and line (±10 lines tolerance)
2. **Fuzzy Match**: Same ID with similar code (80%+ similarity)
3. **Movement Detection**: Identifies relocated issues

### Similarity Calculation

Uses Levenshtein distance algorithm to calculate code similarity:
- Normalizes whitespace
- Calculates edit distance
- Returns similarity ratio (0-1)

### Impact Scoring

- **Critical issues**: 10 points
- **High issues**: 5 points
- **Medium issues**: 2 points
- **Low issues**: 1 point

Positive impact for fixed issues, negative for new issues.

## Configuration

Environment variables:
- `REDIS_URL`: Redis cache connection string
- `LOG_LEVEL`: Logging level (info, debug, error)
- `NODE_ENV`: Environment (dev, prod)

## Health Check

```bash
GET /health
```

Returns service health status including memory usage and environment info.

## Performance

- Cold start: ~1-2 seconds
- Warm execution: <500ms for typical reports
- Memory usage: ~200MB for large reports
- Timeout: 30 seconds (configurable)

## Error Handling

- Invalid request format: Returns 400 with validation errors
- Internal errors: Returns 500 with error message
- All errors are logged to CloudWatch

## Cost Optimization

- Reserved concurrency prevents runaway costs
- Efficient memory allocation (1GB)
- Minimal dependencies for faster cold starts
- Tree-shaking removes unused code

## Advanced Scoring System

The Comparison Agent includes a sophisticated scoring system that tracks:

### Repository Scoring
- **Role-based priorities**: Security issues weighted 2x more than documentation
- **Issue aging**: Penalties increase daily (critical: -2/day, high: -1/day)
- **Improvement bonuses**: 50% bonus for fixing issues
- **Health status**: Ranges from 'critical' (<45) to 'excellent' (90+)

### Skill Tracking
- **Individual skill levels**: Tracks progress across 6 categories
- **Learning curve**: Beginners improve 1.5x faster
- **Milestone achievements**: "First critical fix", "Reached proficient level"
- **Personalized recommendations**: Based on skill gaps and recent issues

### Team Analytics
- **Skill gap identification**: Flags categories with average <60
- **Expert identification**: Users with 80+ skill levels
- **Balance recommendations**: Mentorship and training suggestions

### Scoring Configuration

```typescript
const scoringConfig = {
  severityScores: {
    critical: 40,
    high: 25,
    medium: 15,
    low: 5
  },
  roleMultipliers: {
    security: 2.0,      // Highest priority
    performance: 1.5,
    architecture: 1.3,
    dependencies: 1.2,
    quality: 1.0,
    documentation: 0.5  // Lowest priority
  },
  agingPenalty: {
    critical: 2.0,  // -2 points per day
    high: 1.0,      // -1 point per day
    medium: 0.5,    // -0.5 points per day
    low: 0.2        // -0.2 points per day
  }
};
```

## Database Integration

The scoring system integrates with Supabase tables:
- `repository_scores`: Historical score tracking
- `issue_tracking`: Issue aging and lifecycle
- `score_trends`: Daily/weekly/monthly trends
- `user_skills`: Current skill levels
- `user_skill_history`: Skill progression over time
- `team_skills`: Team-level aggregations
- `skill_milestones`: Achievement tracking

## Future Enhancements

- Machine learning for better issue matching
- Historical analysis trends
- Custom severity weightings
- Integration with notification systems
- Predictive scoring based on code patterns
- Automated skill-based code review assignment