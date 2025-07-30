# Comparison Agent Architecture

## Overview

The Comparison Agent represents a significant architectural shift in CodeQual's PR analysis system. Instead of using 5 specialized role agents (Security, Performance, Quality, Architecture, Dependencies), we now use a single intelligent agent that compares complete DeepWiki analysis reports.

## Key Changes

### Before: 5 Role Agents
- Each agent specialized in one area
- Complex coordination required
- Redundant API calls to analyze the same code
- Difficult to maintain consistency across agents
- Higher operational costs

### After: Single Comparison Agent
- Single agent compares two complete reports
- Intelligent issue matching and tracking
- Comprehensive scoring system
- Skill tracking and improvement detection
- Cache-only approach for efficiency

## Architecture Components

### 1. Comparison Agent (`packages/agents/src/comparison-agent/`)
The core agent that performs intelligent comparison between main branch and feature branch reports.

**Key Features:**
- Issue comparison (fixed, new, moved, unchanged)
- Intelligent matching using ID, title, and location
- Impact analysis across all categories
- PR blocking decisions based on severity

### 2. Scoring System (`scoring-system.ts`)
Comprehensive scoring with role priorities and issue aging.

**Components:**
- **Role Priorities:** Security (30%), Performance (25%), Quality (20%), Architecture (15%), Dependencies (10%)
- **Issue Aging:** Penalties for long-standing issues
- **Score Calculation:** Base score - aging penalty + improvement bonus
- **Health Status:** Critical (<50), Poor (50-69), Fair (70-84), Good (85-94), Excellent (95+)

### 3. Skill Tracking
Tracks developer skills and improvements across categories.

**Features:**
- Skill level calculation (0-100)
- Improvement detection based on issues fixed/introduced
- Milestone achievements
- Team trend analysis

### 4. Database Schema (`supabase/migrations/20250730_scoring_and_skills.sql`)

**New Tables:**
- `repository_scores`: Historical score tracking
- `issue_tracking`: Issue lifecycle management
- `user_skills`: Current skill levels
- `user_skill_history`: Skill progression over time
- `team_skill_trends`: Team-wide skill analytics
- `team_skill_snapshots`: Point-in-time team skill data

### 5. Cache Strategy
30-minute TTL cache-only approach using Redis.

**Benefits:**
- Fast response times
- Reduced API costs
- Consistent results within analysis window
- No persistent storage complexity

## Integration Points

### 1. API Integration
```typescript
// API endpoint remains the same
POST /api/v2/analysis/compare

// Request includes both reports
{
  mainBranchReport: { ... },
  featureBranchReport: { ... },
  prMetadata: { ... }
}
```

### 2. Lambda Deployment
The agent can be deployed as a Lambda function using the included serverless configuration.

```yaml
# serverless.yml includes:
- Handler configuration
- Environment variables
- Memory and timeout settings
- API Gateway integration
```

### 3. Testing Suite
Comprehensive testing approach:
- Unit tests for core logic
- Integration tests with mocks
- Local flow testing
- Direct Lambda handler testing

## Migration Path

### Phase 1: Parallel Operation
- Deploy Comparison Agent alongside existing agents
- Compare results for accuracy
- Monitor performance metrics

### Phase 2: Gradual Cutover
- Route percentage of traffic to new agent
- Monitor and adjust based on feedback
- Fix any edge cases

### Phase 3: Complete Migration
- Deprecate old agents
- Update all documentation
- Remove old agent code

## Benefits

### 1. Operational Efficiency
- Single API call instead of 5
- Reduced infrastructure costs
- Simpler deployment and monitoring

### 2. Better Analysis
- Holistic view of changes
- Consistent scoring across categories
- Intelligent issue tracking

### 3. Developer Experience
- Skill tracking and gamification
- Clear improvement metrics
- Team performance insights

### 4. Maintainability
- Single codebase to maintain
- Easier to add new features
- Consistent behavior

## Performance Metrics

### Expected Improvements:
- **API Calls:** 80% reduction (1 vs 5)
- **Response Time:** 60% faster (single analysis)
- **Cost:** 70% reduction in compute costs
- **Accuracy:** 15% improvement in issue detection

## Future Enhancements

### 1. Machine Learning Integration
- Pattern recognition for similar issues
- Predictive scoring based on historical data
- Automated threshold adjustment

### 2. Advanced Analytics
- Cross-repository trend analysis
- Organization-wide skill mapping
- Predictive quality metrics

### 3. Integration Expansion
- GitHub Actions native support
- GitLab CI/CD integration
- Bitbucket pipelines

## Conclusion

The Comparison Agent architecture represents a significant improvement in how CodeQual analyzes pull requests. By consolidating analysis into a single intelligent agent, we achieve better performance, lower costs, and more insightful results while maintaining the high-quality analysis our users expect.