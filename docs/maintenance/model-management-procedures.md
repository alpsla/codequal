# CodeQual Model Management Procedures

This document outlines the standard maintenance procedures for the CodeQual system, including model version updates, calibration, and configuration management.

## Table of Contents

1. [Model Version Management](#model-version-management)
2. [Repository Model Calibration](#repository-model-calibration)
3. [Configuration Updates](#configuration-updates)
4. [Database Maintenance](#database-maintenance)
5. [Performance Monitoring](#performance-monitoring)
6. [Troubleshooting Guide](#troubleshooting-guide)

## Model Version Management

### Overview

CodeQual relies on several AI models from different providers to power its analysis capabilities. Models are regularly updated by their providers with improved capabilities, bug fixes, and performance enhancements. This section outlines the procedure for keeping our model versions up-to-date.

### Scheduled Version Checks

| Environment | Frequency | Auto-Update | Command |
|-------------|-----------|-------------|---------|
| Development | Daily     | Yes         | `node packages/core/scripts/check-model-versions.js --update` |
| Staging     | Weekly    | Yes         | `node packages/core/scripts/check-model-versions.js --update` |
| Production  | Bi-weekly | No          | `node packages/core/scripts/check-model-versions.js` |

### Update Procedure

1. **Check for Updates**:
   ```bash
   node packages/core/scripts/check-model-versions.js
   ```

2. **Review Updates**:
   - Review the model updates in the output
   - Check release notes for each model (links provided in output)
   - Test significant updates in development before applying to production

3. **Apply Updates**:
   ```bash
   node packages/core/scripts/check-model-versions.js --update
   ```

4. **Force Updates** (use with caution):
   ```bash
   node packages/core/scripts/check-model-versions.js --force-update
   ```

5. **Verify Updates**:
   ```bash
   # Run tests to verify model functionality
   npm run test:models
   
   # Run a sample analysis to verify end-to-end functionality
   npm run analyze:sample
   ```

### Version Rollback

If a model update causes issues, you can roll back to a previous version:

1. Check the git history for the last stable version of `ModelVersionSync.ts`:
   ```bash
   git log -p packages/core/src/services/model-selection/ModelVersionSync.ts
   ```

2. Restore the previous version:
   ```bash
   git checkout <commit-hash> -- packages/core/src/services/model-selection/ModelVersionSync.ts
   ```

3. Update the database to match (if applicable):
   ```bash
   node packages/core/scripts/sync-db-model-versions.js
   ```

## Repository Model Calibration

### Overview

CodeQual uses a calibrated approach to select the optimal model for each repository context (language, size, frameworks). The calibration process tests various models against representative repositories to determine which models perform best in different scenarios.

### Calibration Readiness Check

Before starting a full calibration, check that all prerequisites are in place:

```bash
./check-calibration-readiness.sh
```

This will verify:
- Your API keys are properly configured
- Supabase credentials are available
- Required services are accessible
- Required files exist and are readable

### Calibration Process

A calibration should be performed in these scenarios:
- After adding support for new models
- Quarterly to ensure configurations remain optimal
- When significant model version updates are released

There are three approaches to calibration:

#### Option 1: Full Reset and Calibration

Use this approach when you want to start fresh and recalibrate everything:

```bash
# Reset existing calibration data
./reset-calibration.sh

# Run a complete calibration
./run-calibration.sh
```

This approach:
- Removes all existing calibration data
- Tests all model/repository combinations
- Creates a completely fresh configuration
- Best for major updates or quarterly maintenance

#### Option 2: Continued Calibration

Use this approach when adding new models or provider support:

```bash
# Only test missing models and combinations
./continue-calibration.sh
```

This approach:
- Preserves existing calibration data
- Only tests models that haven't been tested before
- Updates the configuration with combined results
- More efficient for incremental updates

#### Option 3: Targeted Calibration

For specific languages or model changes, you can modify the test repositories in the scripts and run either of the above approaches.

### Customizing Calibration

To customize the calibration process, you can edit these files:

1. **Test Repositories**:
   - Edit `/packages/core/scripts/calibration/run-calibration.js` to modify the `CALIBRATION_REPOSITORIES` array
   - Include repositories of different languages and sizes

2. **Models to Test**:
   - Edit `/packages/core/src/services/model-selection/RepositoryCalibrationService.ts` to modify the `DEFAULT_CALIBRATION_MODELS`
   - Or create a custom test set in your calibration script

3. **Testing Parameters**:
   - Adjust `runsPerModel` to change how many tests per model (higher is more accurate but slower)
   - Modify `timeout` to allow more time for complex analyses
   - Set `evaluateQuality` to true/false to include quality assessment

### Calibration Scripts

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `./check-calibration-readiness.sh` | Verify prerequisites | Before running any calibration |
| `./reset-calibration.sh` | Clear existing calibration data | When starting fresh |
| `./run-calibration.sh` | Run complete calibration | For quarterly maintenance |
| `./continue-calibration.sh` | Test only missing models | When adding new models |

### Calibration Schedule

| Type | Frequency | Trigger | Script |
|------|-----------|---------|--------|
| Full Calibration | Quarterly | Scheduled maintenance | `./run-calibration.sh` |
| Continued Calibration | As needed | New model versions | `./continue-calibration.sh` |
| Targeted Calibration | As needed | New language support | Customized script |
| Quick Calibration | Automatic | New repository contexts | Handled by system |

## Configuration Updates

### Overview

CodeQual's behavior is governed by various configuration files. This section outlines procedures for updating these configurations.

### Model Configuration

The main configuration files for model selection are:

- `packages/core/src/config/models/repository-model-config.ts`: Base model configurations
- `packages/core/src/services/model-selection/ModelVersionSync.ts`: Model version information

After updating these files, run the following to ensure changes take effect:

```bash
# Build the core package
npm run build:core

# Sync configuration with database
node packages/core/scripts/sync-config-to-db.js
```

### Agent Configuration

To update agent behavior, modify:

- `packages/core/src/config/agent-registry.ts`: Agent provider and role mappings

Changes to this file require a rebuild:

```bash
npm run build:core
```

### Environment Configuration

Environment-specific configurations are managed through:

- `.env.development`: Development environment
- `.env.staging`: Staging environment
- `.env.production`: Production environment

After updating environment variables, restart the affected services:

```bash
npm run restart:services
```

## Database Maintenance

### Overview

CodeQual uses Supabase for data storage. Regular maintenance ensures optimal performance and data integrity.

### Migration Application

When schema changes are needed:

1. Check migrations in `packages/core/src/config/models/migrations/`
2. Apply migrations:
   ```bash
   node packages/database/scripts/apply-migrations.js
   ```

### Data Cleanup

Periodically clean up old data:

```bash
# Clean calibration results older than 90 days
node packages/database/scripts/cleanup-calibration-data.js --days 90

# Clean analysis results older than 30 days
node packages/database/scripts/cleanup-analysis-data.js --days 30
```

### Backup Procedure

Backup important configurations and data:

```bash
# Back up configuration
node packages/database/scripts/backup-config.js

# Back up calibration data
node packages/database/scripts/backup-calibration-data.js
```

## Performance Monitoring

### Overview

Regular performance monitoring ensures CodeQual continues to operate efficiently.

### Key Metrics

| Metric | Target | Alert Threshold | Check Frequency |
|--------|--------|-----------------|----------------|
| PR Analysis Time | < 2 minutes | > 5 minutes | Daily |
| Repository Analysis Time | < 8 minutes | > 15 minutes | Daily |
| API Response Time | < 500ms | > 2 seconds | Hourly |
| Error Rate | < 0.1% | > 1% | Hourly |
| Token Usage | Within budget | > 90% of budget | Daily |

### Monitoring Commands

```bash
# Check analysis performance metrics
node packages/core/scripts/check-performance-metrics.js

# Monitor token usage by provider
node packages/core/scripts/check-token-usage.js

# Generate performance report
node packages/core/scripts/generate-performance-report.js
```

## Troubleshooting Guide

### Common Issues

#### Model API Connection Failures

If models fail to connect:

1. Check API keys in environment variables
2. Verify network connectivity to API endpoints
3. Check for rate limiting or quota issues
4. Inspect error logs with:
   ```bash
   node packages/core/scripts/check-api-health.js
   ```

#### Slow Analysis Performance

If analysis performance degrades:

1. Check if repository sizes have increased
2. Verify model version changes haven't affected performance
3. Check database performance metrics
4. Consider adjusting caching settings:
   ```bash
   node packages/core/scripts/optimize-cache-settings.js
   ```

#### Incorrect Model Selection

If inappropriate models are being selected:

1. Check calibration data for anomalies
2. Verify repository context detection is working correctly
3. Run a targeted calibration for the affected language/size
4. Update configuration manually if needed

#### Database Connection Issues

For database connectivity problems:

1. Check database credentials and connection strings
2. Verify network access to database
3. Check for database resource limitations
4. Test connection with:
   ```bash
   node packages/database/scripts/test-db-connection.js
   ```

### Getting Help

If you encounter issues not covered in this guide:

1. Check the CodeQual internal documentation
2. Review recent changes in git history
3. Contact the maintenance team at [maintenance@codequal.io](mailto:maintenance@codequal.io)
4. For urgent issues, use the on-call support channel: #codequal-oncall

---

## Document Maintenance

This document should be reviewed and updated quarterly, or whenever significant changes are made to the maintenance procedures.

Last Updated: May 15, 2025
