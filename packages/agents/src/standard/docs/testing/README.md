# Testing Documentation

This directory contains testing guides and procedures for the Standard Framework.

## 📄 Documents

- **[HOW_TO_RUN_REAL_DEEPWIKI_TESTS.md](./HOW_TO_RUN_REAL_DEEPWIKI_TESTS.md)** - Complete guide for testing with real DeepWiki API

## 🧪 Test Categories

### Unit Tests
```bash
npm run test:unit
```
- Test individual components in isolation
- Mock all external dependencies
- Fast execution (<5 seconds)

### Integration Tests
```bash
npm run test:integration
```
- Test component interactions
- Use real services where possible
- Medium execution (30-60 seconds)

### End-to-End Tests
```bash
npm run test:e2e
```
- Test complete analysis flow
- Real DeepWiki API calls
- Slow execution (2-5 minutes)

## 🎯 Testing Checklist

### Before Committing
- [ ] All unit tests pass
- [ ] Integration tests for modified components pass
- [ ] No hardcoded test data
- [ ] Mocks properly configured
- [ ] Test coverage >80%

### Before Deployment
- [ ] Full E2E test suite passes
- [ ] Load testing completed
- [ ] Security testing performed
- [ ] Performance benchmarks met
- [ ] Error scenarios tested

## 🔧 Common Test Scenarios

### Testing Educator Agent
```typescript
describe('Educator Agent', () => {
  it('should return real course URLs', async () => {
    const result = await educator.research({
      issues: mockIssues,
      developerLevel: 'intermediate'
    });
    
    expect(result.courses[0].url).toMatch(/udemy|coursera/);
    expect(result.courses).toHaveLength(greaterThan(0));
  });
});
```

### Testing Monitoring Integration
```typescript
describe('Monitoring Service', () => {
  it('should track API costs', async () => {
    const monitor = new MonitoringService();
    await orchestrator.executeComparison(request);
    
    const metrics = monitor.getMetrics();
    expect(metrics.totalCost).toBeGreaterThan(0);
    expect(metrics.apiCalls).toContain('deepwiki');
  });
});
```

## 📊 Test Coverage Requirements

- **Unit Tests**: 85% coverage minimum
- **Integration Tests**: All API endpoints covered
- **E2E Tests**: Critical user paths covered

## 🐛 Debugging Tests

### Enable Debug Logging
```bash
DEBUG=codequal:* npm test
```

### Run Single Test
```bash
npm test -- --testNamePattern="should return real courses"
```

### Test with Real APIs
```bash
USE_DEEPWIKI_MOCK=false npm run test:integration
```

## 🔗 Related Documentation
- Implementation: [`../implementation/`](../implementation/)
- API guide: [`../api/`](../api/)
- Planning: [`../planning/`](../planning/)