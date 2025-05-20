# Calibration System Guide

This document provides a comprehensive guide to the model calibration system implemented in CodeQual. The calibration system automatically tests different AI models against various repositories to determine the optimal model configurations for different programming languages and repository sizes.

## Overview

The calibration system consists of the following components:

1. **Database Schema**: Tables for storing calibration results and model configurations
2. **ModelConfigStore**: Service for persisting model configurations and calibration results
3. **RepositoryCalibrationService**: Service for testing models and determining optimal configurations
4. **Calibration Scripts**: Scripts for running and continuing calibration processes
5. **Data Analysis Tools**: Tools for analyzing results and optimizing model selection
6. **Migration Scripts**: Scripts for setting up the required database tables

## Key Features of Enhanced Calibration System

The enhanced calibration system includes several important improvements:

1. **Multi-Factor Scoring**: Models are evaluated based on:
   - **Quality** (50%): Accuracy and helpfulness of model responses
   - **Cost** (35%): Price efficiency based on token pricing
   - **Speed** (15%): Response time performance

2. **Customizable Weights**: Adjust scoring weights to match your organization's priorities

3. **Comprehensive Data Collection**: Collects performance metrics across all model/repository combinations

4. **Data Analysis Tools**: Analyze results and experiment with different scoring formulas

5. **Detailed Reporting**: CSV and JSON reports for data analysis and visualization

## Database Schema

The calibration system uses two primary tables:

### `calibration_results` Table

This table stores the raw results of calibration tests for each language and repository size combination.

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | UUID | Primary key |
| language | TEXT | Programming language (e.g., "javascript", "python") |
| size_category | TEXT | Repository size category ("small", "medium", "large") |
| results | JSONB | JSON containing test results for different models |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Update timestamp |

### `model_configurations` Table

This table stores the optimal model configurations determined from calibration results.

| Column | Type | Description |
| ------ | ---- | ----------- |
| id | UUID | Primary key |
| language | TEXT | Programming language (e.g., "javascript", "python") |
| size_category | TEXT | Repository size category ("small", "medium", "large") |
| provider | TEXT | AI provider (e.g., "openai", "anthropic", "google") |
| model | TEXT | Model name (e.g., "gpt-4o", "claude-3-7-sonnet") |
| test_results | JSONB | JSON containing test result metrics |
| notes | TEXT | Optional notes about this configuration |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Update timestamp |

## Core Components

### ModelConfigStore

The `ModelConfigStore` class in `/packages/core/src/services/model-selection/ModelConfigStore.ts` provides methods for:

- Initializing the store and verifying database connectivity
- Retrieving model configurations for languages and sizes
- Updating model configurations
- Storing and retrieving calibration results
- Synchronizing configurations with in-memory defaults

### RepositoryCalibrationService

The `RepositoryCalibrationService` class in `/packages/core/src/services/model-selection/RepositoryCalibrationService.ts` handles:

- Running calibration tests for repositories
- Evaluating model performance metrics
- Determining optimal model configurations
- Updating configurations in the ModelConfigStore

## Calibration Scripts

### healthcheck.js

Located at `/packages/core/scripts/calibration/healthcheck.js`, this script:

- Verifies all required environment variables are set
- Tests the Supabase database connection
- Checks if calibration tables exist in the database
- Tests the DeepWiki API connection (with graceful handling if unavailable)
- Verifies the ModelConfigStore can be initialized
- Provides detailed recommendations for any issues found

### run-calibration.js

Located at `/packages/core/scripts/calibration/run-calibration.js`, this script:

- Initializes the calibration services with DeepWiki client
- Runs full calibration for all configured repositories and models
- Stores calibration results in the database
- Outputs a summary of recommended model configurations

### continue-calibration.js

Located at `/packages/core/scripts/calibration/continue-calibration.js`, this script:

- Loads existing calibration results from the database
- Tests only the missing model combinations
- Updates the calibration results with new test data

### setup-and-run-calibration.sh

Located at `/packages/core/scripts/calibration/setup-and-run-calibration.sh`, this script:

- Runs the healthcheck to verify the environment and connections
- Applies database migrations for calibration tables
- Runs the full calibration process

## Migration Scripts

### direct-apply-calibration-tables.js

Located at `/packages/database/src/migrations/direct-apply-calibration-tables.js`, this script:

- Creates the necessary database tables for calibration
- Adds indices for performance optimization
- Creates triggers for automatic timestamp updates

## Running Calibration

### Running the Healthcheck

Before starting calibration, you can run the healthcheck to verify your environment:

```bash
cd packages/core/scripts/calibration
node healthcheck.js
```

This will check all connections and dependencies, and provide recommendations for any issues found.

### Running Quick Calibration (Testing Only)

For quick testing of the calibration system without waiting for real API responses:

```bash
cd packages/core/scripts/calibration
./calibration-modes.sh quick
```

This tests a single repository with mock API responses.

### Running Realistic Calibration (Simulated Delays)

For more realistic testing with simulated delays but still using mock APIs:

```bash
./calibration-modes.sh realistic
```

This tests multiple repositories with realistic response times.

### Running Full Calibration (Real API)

For calibration with real API connections:

```bash
./calibration-modes.sh full
```

**Note:** If the DeepWiki API is not accessible, the system will fall back to mock implementations.

### Comprehensive Data Collection

To collect comprehensive data for analysis:

```bash
./generate-comparison-data.sh [repos] [type]
```

Options:
- `repos`: Number of repositories to test (1-4, default: 2)
- `type`: Test type - quick or realistic (default: realistic)

Example:
```bash
./generate-comparison-data.sh 4 realistic
```

This generates a comprehensive CSV file with raw data from all tests.

### Environment Setup

Ensure the required environment variables are set in `.env`:
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DEEPWIKI_API_URL=your_deepwiki_api_url
DEEPSEEK_API_KEY=your_deepseek_api_key
```

## Viewing Calibration Results

Calibration results can be viewed using the ModelConfigStore:

```javascript
const { ModelConfigStore } = require('../../dist/services/model-selection/ModelConfigStore');
const { createLogger } = require('../../dist/utils/logger');

const logger = createLogger('CalibrationViewer');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const configStore = new ModelConfigStore(logger, supabaseUrl, supabaseKey);

// Get all model configurations
async function viewAllConfigurations() {
  const configs = await configStore.getAllModelConfigs();
  console.log(JSON.stringify(configs, null, 2));
}

viewAllConfigurations();
```

## Analyzing Results and Optimizing Selection

The analysis script allows you to experiment with different scoring weights to find the optimal configuration for your needs:

```bash
node analyze-model-data.js [--quality X] [--cost Y] [--speed Z]
```

Where X, Y, Z are weights between 0 and 1, and should sum to 1.0.

Default weights:
- Quality: 0.50 (50%)
- Cost: 0.35 (35%)
- Speed: 0.15 (15%)

### Example Scoring Approaches

1. **Quality-focused** (default):
   ```bash
   node analyze-model-data.js --quality 0.5 --cost 0.35 --speed 0.15
   ```
   This prioritizes model quality, which typically favors OpenAI and Anthropic models.

2. **Cost-efficient**:
   ```bash
   node analyze-model-data.js --quality 0.3 --cost 0.6 --speed 0.1
   ```
   This prioritizes cost-efficiency, which typically favors DeepSeek and Google models.

3. **Speed-optimized**:
   ```bash
   node analyze-model-data.js --quality 0.4 --cost 0.3 --speed 0.3
   ```
   This gives more weight to response time, favoring models with consistently faster responses.

### Customizing the Scoring Formula

To modify how models are scored, edit the scoring formula in:
```
/packages/core/scripts/calibration/scoring-formula.js
```

This file contains the algorithm used to evaluate models, allowing for customization beyond simple weight adjustments.

## Troubleshooting

### DeepWiki Connection Issues

If you encounter connection issues with the DeepWiki API, you have several options:

1. **Port Forwarding**: If the DeepWiki API is running in Kubernetes, use port forwarding:
   ```bash
   kubectl port-forward -n codequal-dev deepwiki-5fc67fc59-r82db 8001:8001
   ```

2. **Mock Mode**: If the API is unavailable, use mock mode:
   ```bash
   export USE_REAL_DEEPWIKI="false"
   ```

3. **Skip Problematic Providers**: If specific providers have issues:
   ```bash
   export SKIP_PROVIDERS="deepseek,google"
   ```

### Database Migration Failures

If database migrations fail, try these troubleshooting steps:

1. Check that your Supabase credentials have sufficient permissions
2. Verify that the UUID extension is installed in your Supabase instance
3. Try running the SQL statements manually in the Supabase SQL editor

## Recommended Calibration Process

1. Run comprehensive data collection with realistic settings
   ```bash
   ./generate-comparison-data.sh 4 realistic
   ```

2. Analyze results with default weights
   ```bash
   node analyze-model-data.js
   ```

3. Experiment with different weights to find optimal configurations
   ```bash
   node analyze-model-data.js --quality 0.4 --cost 0.4 --speed 0.2
   ```

4. Apply the chosen weights in production by updating `scoring-formula.js`

5. Run final calibration to update the model configurations in the database
   ```bash
   ./calibration-modes.sh full
   ```

## Architecture Decisions

The calibration system is designed with the following principles:

1. **Multi-Factor Evaluation**: Models are evaluated on quality, cost, and speed
2. **Customizable Scoring**: Weights can be adjusted to match organizational needs
3. **Data-Driven Decisions**: All calibration data is collected and analyzed
4. **Graceful Degradation**: Falls back to defaults when services are unavailable
5. **Persistent Storage**: Stores all calibration data for future reference
6. **Performance Optimization**: Uses caching and database indices for efficiency

## Future Improvements

Planned improvements for the calibration system include:

1. Implementing quality evaluation using standardized code quality metrics
2. Adding support for repository-specific calibration
3. Creating a dashboard for visualizing model performance across languages
4. Implementing automated recalibration on a schedule
5. Adding streaming response benchmarks
6. Integrating token usage optimization