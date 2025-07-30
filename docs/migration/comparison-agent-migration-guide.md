# Comparison Agent Migration Guide

## Overview

This guide helps you migrate from the 5-agent system to the new Comparison Agent architecture.

## Pre-Migration Checklist

- [ ] Review current agent configurations
- [ ] Backup existing analysis data
- [ ] Test Comparison Agent in development
- [ ] Plan rollout strategy
- [ ] Notify team of upcoming changes

## Migration Steps

### Step 1: Deploy Comparison Agent

1. **Update Dependencies**
```bash
cd packages/agents
npm install
npm run build
```

2. **Run Database Migrations**
```bash
cd ../../
npx supabase migration up
```

3. **Deploy Lambda Function** (if using serverless)
```bash
cd packages/agents/src/comparison-agent
npm run deploy
```

### Step 2: Configure Environment

1. **Update Environment Variables**
```env
# Add to .env
COMPARISON_AGENT_ENABLED=true
COMPARISON_AGENT_CACHE_TTL=1800
REDIS_URL=your-redis-url
```

2. **Update API Configuration**
```typescript
// In your API configuration
const analysisConfig = {
  useComparisonAgent: process.env.COMPARISON_AGENT_ENABLED === 'true',
  cacheStrategy: 'redis',
  cacheTTL: parseInt(process.env.COMPARISON_AGENT_CACHE_TTL || '1800')
};
```

### Step 3: Parallel Testing

1. **Enable A/B Testing**
```typescript
// Route percentage of traffic to new agent
const useNewAgent = Math.random() < 0.1; // Start with 10%

if (useNewAgent) {
  return comparisonAgent.analyze(request);
} else {
  return legacyAgents.analyze(request);
}
```

2. **Monitor Results**
- Compare analysis accuracy
- Track performance metrics
- Log any discrepancies
- Gather user feedback

### Step 4: Gradual Rollout

1. **Week 1**: 10% traffic
2. **Week 2**: 25% traffic
3. **Week 3**: 50% traffic
4. **Week 4**: 100% traffic

### Step 5: Complete Migration

1. **Disable Legacy Agents**
```typescript
// Remove old agent initialization
// const securityAgent = new SecurityAgent();
// const performanceAgent = new PerformanceAgent();
// etc.
```

2. **Update Documentation**
- API documentation
- User guides
- Internal wikis

3. **Clean Up Code**
```bash
# After confirming stability
rm -rf packages/agents/src/security
rm -rf packages/agents/src/performance
# etc.
```

## API Changes

### Old API Usage
```typescript
// Multiple agent calls
const results = await Promise.all([
  securityAgent.analyze(code),
  performanceAgent.analyze(code),
  qualityAgent.analyze(code),
  architectureAgent.analyze(code),
  dependenciesAgent.analyze(code)
]);
```

### New API Usage
```typescript
// Single comparison call
const result = await comparisonAgent.compare({
  mainBranchReport,
  featureBranchReport,
  prMetadata
});
```

## Response Format Changes

### Old Format
```json
{
  "security": { "issues": [...] },
  "performance": { "issues": [...] },
  "quality": { "issues": [...] },
  "architecture": { "issues": [...] },
  "dependencies": { "issues": [...] }
}
```

### New Format
```json
{
  "fixed_issues": [...],
  "new_issues": [...],
  "moved_issues": [...],
  "unchanged_issues": [...],
  "scoring": {
    "repository_score": { ... },
    "skill_improvements": { ... }
  },
  "pr_decision": {
    "should_block": false,
    "reason": "..."
  }
}
```

## Rollback Plan

If issues arise during migration:

1. **Immediate Rollback**
```env
COMPARISON_AGENT_ENABLED=false
```

2. **Partial Rollback**
```typescript
// Reduce traffic percentage
const useNewAgent = Math.random() < 0.05; // Back to 5%
```

3. **Data Recovery**
- Cache data expires automatically (30-min TTL)
- Database changes are append-only
- No data loss risk

## Monitoring

### Key Metrics to Track

1. **Performance**
   - Response time (target: <2s)
   - API calls per analysis (target: 1)
   - Cache hit rate (target: >80%)

2. **Accuracy**
   - False positive rate
   - False negative rate
   - Issue detection rate

3. **User Satisfaction**
   - Support tickets
   - User feedback
   - Error rates

### Dashboards

Create monitoring dashboards for:
- Agent performance
- Cache performance
- Error rates
- Cost analysis

## Troubleshooting

### Common Issues

1. **Cache Misses**
   - Check Redis connectivity
   - Verify TTL settings
   - Monitor memory usage

2. **Scoring Discrepancies**
   - Review role priorities
   - Check issue age calculations
   - Verify score formulas

3. **Performance Issues**
   - Check Lambda memory allocation
   - Review timeout settings
   - Optimize bundle size

## Support

For migration support:
- Slack: #comparison-agent-migration
- Email: devops@codequal.com
- Documentation: /docs/comparison-agent

## Post-Migration

After successful migration:

1. **Celebrate!** 🎉
2. Document lessons learned
3. Update runbooks
4. Plan future enhancements
5. Share success metrics

Remember: The migration is designed to be gradual and safe. Take your time and monitor each step carefully.