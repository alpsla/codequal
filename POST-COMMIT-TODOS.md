# Post-Commit TODOs

## Critical Security Issues (Week 1)
- [ ] Fix hardcoded API keys in k8s/deployments/production/api-deployment.yaml
- [ ] Fix SQL injection vulnerabilities in packages/database/src/services/analysis-service.ts
- [ ] Update vulnerable dependencies:
  ```bash
  npm update jsonwebtoken@^9.0.0 ws@^8.11.0 lodash@^4.17.21
  ```

## High Priority Performance Issues (Week 2)
- [ ] Fix N+1 queries in packages/database/src/services/report-service.ts (3+ second load times)
- [ ] Optimize webpack bundle size (currently 2.3MB, target < 500KB)
- [ ] Implement code splitting and tree shaking
- [ ] Add DataLoader pattern for database queries

## Remaining Implementation Tasks
- [ ] Complete DeepWikiApiManager methods (currently stubbed):
  - checkRepositoryExists
  - getCachedRepositoryFiles
  - Improve triggerRepositoryAnalysis and waitForAnalysisCompletion
- [ ] Fix remaining ESLint errors (13 errors, 177 warnings in test-integration)
- [ ] Fix failing tests (3 test suites failing)
- [ ] Implement proper error handling in new code

## Architecture Improvements
- [ ] Resolve circular dependencies between packages
- [ ] Create @codequal/types package
- [ ] Standardize service communication patterns

## Testing & Quality
- [ ] Increase test coverage to 80% (currently 68.4%)
- [ ] Add integration tests for DeepWiki flow
- [ ] Test payment flow (12% coverage)
- [ ] Fix 8 flaky tests

## Documentation
- [ ] Document the new DeepWiki architecture
- [ ] Update API documentation for changed endpoints
- [ ] Add deployment guide for the simplified DeepWiki setup

## Monitoring & Operations
- [ ] Verify Grafana dashboards are working with new metrics
- [ ] Test alert system with real scenarios
- [ ] Monitor DeepWiki disk usage (90% reduction claim)
- [ ] Validate error tracking integration