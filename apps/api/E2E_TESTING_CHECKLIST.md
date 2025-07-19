# CodeQual E2E Data Flow Testing Checklist

## 🧪 Complete Testing Plan Before Enhancements

### Pre-Test Setup
- [ ] Ensure all packages build successfully (`npm run build`)
- [ ] Verify environment variables are set correctly
- [ ] Check Supabase connection
- [ ] Verify OpenRouter API key is valid
- [ ] Confirm Vector DB is accessible

### 1. Model Research & Configuration Testing
```bash
# Reset models to trigger research
npm run test:reset-models

# Check current model status
npm run test:check-models

# Expected: Models should show as 4+ months old, triggering research
```

**Verify:**
- [ ] Model timestamps reset successfully
- [ ] Research triggers when models > 3 months old
- [ ] New model configurations stored in Vector DB
- [ ] All agent roles have updated models

### 2. DeepWiki Repository Analysis Testing
```bash
# Test DeepWiki integration
npm run test:deepwiki

# Test with specific repositories:
# - Small: expressjs/express
# - Medium: facebook/react  
# - Large: microsoft/TypeScript
```

**Decision Logic Tests:**
- [ ] First-time repo → Triggers full DeepWiki analysis
- [ ] Recent analysis (< 24h) → Uses cache
- [ ] Stale analysis (> 7 days) → Triggers refresh
- [ ] Framework update detected → Re-analyzes

### 3. Complete E2E Flow Testing
```bash
# Run full E2E test
npm run test:e2e

# Monitor in another terminal
npm run monitor:flow
```

**Data Flow Verification:**
1. **API → Orchestrator**
   - [ ] Request validation
   - [ ] Auth verification
   - [ ] Rate limit checks

2. **Orchestrator → DeepWiki**
   - [ ] Cache check logic
   - [ ] Analysis trigger decision
   - [ ] Job queue management

3. **DeepWiki → Vector DB**
   - [ ] Repository analysis storage
   - [ ] Pattern extraction
   - [ ] Score calculation

4. **Orchestrator → Agents**
   - [ ] Agent selection based on PR
   - [ ] Context preparation
   - [ ] DeepWiki context included

5. **Agents → Tools**
   - [ ] Tool selection per agent
   - [ ] Parallel execution
   - [ ] Error handling

6. **Tools → Results**
   - [ ] Finding aggregation
   - [ ] Deduplication
   - [ ] Severity calculation

7. **Results → Report**
   - [ ] All findings included
   - [ ] DeepWiki scores visible
   - [ ] Code snippets linked
   - [ ] Progress tracked

### 4. Performance & Load Testing
```bash
# Run performance benchmarks
npm run test:performance

# Test scenarios:
# - 10 concurrent analyses
# - Large PR (100+ files)
# - Multiple languages
```

**Metrics to Track:**
- [ ] API response time < 500ms
- [ ] Analysis completion < 2 min (average PR)
- [ ] Memory usage stable
- [ ] No memory leaks
- [ ] Error rate < 1%

### 5. Error Handling & Recovery
**Test Failure Scenarios:**
- [ ] OpenRouter API down → Fallback models work
- [ ] Vector DB connection lost → Graceful degradation
- [ ] Agent timeout → Other agents continue
- [ ] Tool failure → Agent completes with partial results
- [ ] DeepWiki unavailable → PR analysis still works

### 6. Progress Tracking Validation
- [ ] Real-time updates via SSE
- [ ] Accurate phase percentages
- [ ] Agent/tool status visible
- [ ] Partial results available
- [ ] Time estimates reasonable

### 7. Integration Testing
**Cross-Component Verification:**
- [ ] Billing limits enforced
- [ ] Usage tracking accurate
- [ ] Stripe webhooks processed
- [ ] Authentication working
- [ ] API keys validated

### 8. System Health Check
```bash
# Run comprehensive health check
npm run test:system
```

**Verify All Services:**
- [ ] API endpoints responding
- [ ] Database connections stable
- [ ] External APIs accessible
- [ ] Queue processing working
- [ ] Background jobs running

## 📊 Testing Metrics Dashboard

### Success Criteria
```yaml
Build Health:
  ✅ TypeScript: 0 errors
  ✅ ESLint: 0 errors (warnings ok)
  ✅ Tests: 80%+ passing
  
Performance:
  ⏱️ API Response: < 500ms (p95)
  ⏱️ Analysis Time: < 2 min (average)
  ⏱️ Memory Usage: < 1GB
  
Reliability:
  📈 Uptime: 99.9%
  📈 Success Rate: > 95%
  📈 Error Rate: < 1%
  
Data Quality:
  ✓ All agents executing
  ✓ Tools returning results  
  ✓ Reports complete
  ✓ DeepWiki integrated
```

## 🔄 Test Execution Order

1. **Day 1 Morning:**
   - Reset models
   - Test model research
   - Verify configurations

2. **Day 1 Afternoon:**
   - Test DeepWiki analysis
   - Test decision logic
   - Monitor data flow

3. **Day 2 Morning:**
   - Run complete E2E
   - Performance testing
   - Error scenario testing

4. **Day 2 Afternoon:**
   - Fix any issues found
   - Re-run failed tests
   - Generate test report

## 📝 Test Report Template

```markdown
# E2E Test Report - [Date]

## Executive Summary
- Overall Status: PASS/FAIL
- Critical Issues: X
- Performance: Meets/Exceeds/Below expectations
- Ready for Enhancements: YES/NO

## Test Results
### Model Research: ✅/❌
- Details...

### DeepWiki Integration: ✅/❌
- Details...

### Data Flow: ✅/❌
- Details...

### Performance: ✅/❌
- Details...

## Issues Found
1. Issue description
   - Impact
   - Fix applied
   - Retest result

## Recommendations
- Priority fixes before launch
- Performance optimizations
- Enhancement opportunities

## Sign-off
- QA Lead: [Name]
- Tech Lead: [Name]
- Date: [Date]
```

## 🚀 Post-Testing Actions

Once all tests pass:
1. Create git tag for stable version
2. Document current performance baseline
3. Update monitoring alerts
4. Begin enhancement development
5. Schedule regular regression tests

Remember: **No enhancements until all tests pass!**