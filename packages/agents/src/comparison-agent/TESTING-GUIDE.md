# Comparison Agent Testing Guide

This guide explains how to test the new cloud-based Comparison Agent features, including scoring, skill tracking, and caching.

## Overview

The Comparison Agent has been redesigned to:
- Replace 5 role agents (Security, Performance, Architecture, Dependencies, Code Quality) with a single intelligent agent
- Implement comprehensive scoring with role-based priorities and issue aging
- Track user skill improvements with learning curves
- Monitor team skill trends and gaps
- Cache results in Redis for 30-minute TTL
- Store metrics in Supabase for historical tracking

## Available Tests

### 1. Integration Test (`integration-test.ts`)
Tests the full flow including cache and database operations:
```bash
cd packages/agents/src/comparison-agent
npx ts-node integration-test.ts
```

**What it tests:**
- Comparison logic (fixed, new, moved issues)
- Repository scoring with role priorities
- Skill improvement calculations
- Team trend analysis
- Mock cache operations (Redis)
- Mock database operations (Supabase)

### 2. Local Flow Test (`test-local-flow.ts`)
Simulates a realistic PR webhook scenario:
```bash
npx ts-node test-local-flow.ts
```

**What it tests:**
- PR webhook handling
- DeepWiki analysis simulation
- Cache storage with TTL
- User-friendly output formatting
- Chat access availability

### 3. Direct Test (`test-direct.ts`)
Tests the ComparisonAgent class directly:
```bash
npx ts-node test-direct.ts
```

**What it tests:**
- Core comparison functionality
- Scoring calculations
- Skill improvements
- PR decision making
- Insights and recommendations

### 4. Unit Tests
Run the Jest unit tests:
```bash
npm test comparison-agent.test.ts
npm test scoring-system.test.ts
```

## Key Features Demonstrated

### 1. Repository Scoring
- **Role-based priorities**: Security (2.0x), Performance (1.5x), Architecture (1.2x), Documentation (0.5x)
- **Issue aging**: Critical issues lose 2 points/day, High issues lose 1 point/day
- **Health status**: Excellent (90+), Good (75+), Fair (60+), Poor (45+), Critical (<45)
- **Improvement bonus**: 50% of fixed issue points added as bonus

### 2. Skill Tracking
- **Learning curves**: Beginners (1.5x), Intermediate (1.0x), Advanced (0.7x), Expert (0.5x)
- **Skill categories**: Security, Performance, Quality, Architecture, Dependencies, Documentation
- **Milestones**: "First critical fix", "Reached proficient level", etc.
- **Personalized recommendations**: Based on skill gaps and recent performance

### 3. Team Analytics
- **Trend tracking**: Daily, Weekly, Monthly periods
- **Balance analysis**: Identifies skill gaps and strengths
- **Top performers**: Highlights improving team members
- **Struggling members**: Identifies those needing support

### 4. Caching Strategy
- **30-minute TTL**: Analysis results cached for chat access
- **Cache keys**: `pr:<number>:analysis`, `pr:<number>:main`, `pr:<number>:feature`
- **Efficient retrieval**: Instant access for chat interactions

## Sample Output

```
📊 Repository Score:
  Overall: 78 (good)
  Change: +8
  Improvement: 11.4%

👤 Skill Improvements:
  📈 security: 60 → 64 (+4)
  📉 documentation: 50 → 49.8 (-0.2)

🏆 Achievements:
  🎉 First critical security fix!

🚦 PR Decision:
  Status: ✅ APPROVED
  Reason: PR meets quality standards
```

## Database Schema

The following tables store scoring and skill data:

1. **repository_scores**: Overall repository health metrics
2. **issue_tracking**: Individual issue tracking with age
3. **user_skills**: Current skill levels per user
4. **user_skill_history**: Historical skill changes
5. **team_skill_trends**: Team-wide skill analytics
6. **team_skill_snapshots**: Point-in-time team skill data
7. **skill_milestones**: Achievement tracking

## Environment Variables

For production deployment:
```bash
REDIS_URL=redis://your-redis-instance:6379
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
```

## Next Steps

1. Deploy to AWS Lambda:
   ```bash
   npm run deploy:dev
   ```

2. Set up Redis Cloud for production caching

3. Configure Supabase tables using migration scripts

4. Connect API server to cloud agent endpoint

5. Monitor performance and costs via CloudWatch

## Troubleshooting

- **TypeScript errors**: Ensure all dependencies are installed with `npm install`
- **Lambda errors**: Check environment variables in serverless.yml
- **Cache misses**: Verify Redis connection and TTL settings
- **Database errors**: Ensure Supabase tables are created with proper indexes