# Model Update Process

> **DEPRECATED:** This document has been consolidated into the [Model Management Procedures](./model-management-procedures.md) document. Please refer to that document for the most up-to-date information on model updates and calibration.

This document outlines the process for updating model versions and performing recalibration within the CodeQual system. Following these steps ensures that the system maintains optimal performance and takes advantage of the latest capabilities of LLM providers.

## Schedule

Model updates should be evaluated:
- When a provider announces a new model version
- Every month for routine checks
- After significant performance issues are reported

## Model Update Checklist

### 1. Preparation Phase

- [ ] Create a branch for model updates: `git checkout -b model-update-YYYY-MM-DD`
- [ ] Verify API access to all model providers
- [ ] Check provider documentation for changes in API parameters
- [ ] Ensure test environment has sufficient credits for testing

### 2. Model Version Configuration Update

- [ ] Update model version details in `/packages/core/src/config/models/model-versions.ts`
  - Add new model entries with appropriate provider, name, version, and capabilities
  - Add deprecation dates to models being phased out
  - Update context window sizes if changed
  - Update token counting methods if needed
- [ ] Run version updater to synchronize database:
  ```
  node packages/core/scripts/update-model-versions.js
  ```

### 3. Initial Testing

- [ ] Run quick validation tests against the new model:
  ```
  node packages/core/scripts/test-model-basic.js --model-id="new-model-id"
  ```
- [ ] Check if the model passes basic capability tests
- [ ] Verify token counting is correct (compare with provider calculators)
- [ ] Test prompt formats to ensure compatibility

### 4. Configuration Update

- [ ] Review model configuration in `/packages/core/src/config/models/model-configuration.ts`
- [ ] Add new model with appropriate context handling parameters:
  - Max tokens
  - Temperature settings
  - Cost parameters
  - System prompt requirements
- [ ] Update database with new configuration:
  ```
  node packages/core/scripts/update-model-config.js
  ```

### 5. Comprehensive Calibration

- [ ] Check calibration readiness:
  ```
  node packages/core/scripts/check-calibration-readiness.js
  ```
- [ ] Run comprehensive calibration:
  ```
  node packages/core/scripts/run-comprehensive-calibration.js
  ```
- [ ] Review calibration results in `packages/core/scripts/calibration-results/`
- [ ] Test model performance on a representative subset of repositories:
  ```
  node packages/core/scripts/evaluate-model-performance.js --model-id="new-model-id"
  ```

### 6. Production Update

- [ ] Update repository-model configuration:
  ```
  cp packages/core/scripts/calibration-results/repository-model-config.ts packages/core/src/config/models/
  ```
- [ ] Update database configuration:
  ```
  node packages/core/scripts/run-comprehensive-calibration.js --update-db
  ```
- [ ] Create a migration for any new database columns required:
  ```
  node packages/core/scripts/create-model-migration.js
  ```

### 7. Validation and Rollout

- [ ] Run full integration test suite
- [ ] Deploy changes to staging environment
- [ ] Monitor metrics for 24 hours
- [ ] If metrics are positive, plan production deployment
- [ ] Update documentation with new model capabilities
- [ ] Share release notes with team

## Emergency Rollback Procedure

If issues are detected after deploying new models:

1. Reset to previous configuration:
   ```
   node packages/core/scripts/rollback-model-config.js --version={previous-version}
   ```

2. Deploy rollback to affected environments:
   ```
   npm run deploy:core -- --config-version={previous-version}
   ```

3. Document issues encountered for future reference

## Model Deprecation

When a provider deprecates a model:

1. Add deprecation date to model-versions.ts
2. Update selection logic to prefer newer models
3. Monitor usage and plan for complete removal
4. Notify users if their customizations depend on deprecated models

---

Last Updated: May 13, 2025
