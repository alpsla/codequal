# CodeQual Database Package

This package provides database models and utilities for the CodeQual project.

## Overview

The database package handles all interactions with the Supabase backend database. It provides:

- Type-safe interfaces for database tables
- Model classes for common operations
- Migration scripts for database schema management
- Repository and PR review data management
- Repository analysis caching
- Model calibration data storage

## Usage

### Basic Usage

```typescript
import { DatabaseService } from '@codequal/database';

// Create or find a repository
const repository = await DatabaseService.findOrCreateRepository(
  'github',
  'owner/repo',
  'https://github.com/owner/repo',
  false
);

// Create a PR review
const prReview = await DatabaseService.createPRReview(
  'https://github.com/owner/repo/pull/123',
  repository.id,
  'user-id',
  'quick', // or 'comprehensive'
  'Feature: Add new component',
  'This PR adds a new component for...'
);
```

### Two-Tier Analysis

The database layer supports both quick and comprehensive analysis modes:

- **Quick Analysis**: Performs analysis only on the PR and changed files
- **Comprehensive Analysis**: Includes repository analysis with DeepWiki

```typescript
import { DatabaseService, AnalysisMode } from '@codequal/database';

// Creating a PR review with quick analysis mode
const quickReview = await DatabaseService.createPRReview(
  'https://github.com/owner/repo/pull/123',
  repository.id,
  'user-id',
  AnalysisMode.QUICK, // Explicitly use enum
  'Feature: Add new component',
  'This PR adds a new component for...'
);

// Creating a PR review with comprehensive analysis mode
const comprehensiveReview = await DatabaseService.createPRReview(
  'https://github.com/owner/repo/pull/124',
  repository.id,
  'user-id',
  AnalysisMode.COMPREHENSIVE,
  'Feature: Refactor architecture',
  'Major architectural changes...'
);
```

### Repository Analysis Caching

For comprehensive analysis, the system caches repository analysis to improve performance:

```typescript
import { DatabaseService, RepositoryAnalyzer } from '@codequal/database';

// Check for valid cached analysis
const cachedAnalysis = await DatabaseService.getValidRepositoryAnalysisCache(
  repository.id,
  RepositoryAnalyzer.DEEPWIKI
);

if (cachedAnalysis) {
  // Use cached analysis
  console.log('Using cached repository analysis');
} else {
  // Perform new analysis and store it
  const analysisData = await performDeepWikiAnalysis(repository);
  
  await DatabaseService.storeRepositoryAnalysis(
    repository.id,
    RepositoryAnalyzer.DEEPWIKI,
    analysisData,
    24 * 60 * 60, // Cache TTL in seconds (24 hours)
    { source: 'deepwiki-api', version: '1.0' }, // Optional metadata
    analysisData.executionTimeMs,
    analysisData.tokenCount
  );
}
```

### Model Calibration

The system supports model calibration to determine optimal agent configurations:

```typescript
import { DatabaseService } from '@codequal/database';
import { v4 as uuidv4 } from 'uuid';

// Create a new calibration run
const runId = uuidv4();
const modelVersions = {
  'claude': 'claude-3-7-sonnet',
  'gpt': 'gpt-4-turbo',
  'deepseek': 'deepseek-coder-v2'
};

const metrics = [
  {
    provider: 'claude',
    role: 'code_quality',
    overallScore: 92,
    specialties: ['JavaScript', 'TypeScript', 'React'],
    weaknesses: ['C++', 'Rust']
  },
  // More metrics...
];

await DatabaseService.storeCalibrationRun(
  runId,
  modelVersions,
  metrics
);

// Store test results for specific repositories
await DatabaseService.storeCalibrationTestResult(
  runId,
  repository.id,
  'medium', // Repository size category
  ['TypeScript', 'JavaScript'], // Languages
  'monorepo', // Architecture
  {
    'claude': {
      precision: 0.95,
      recall: 0.87,
      f1Score: 0.91,
      executionTime: 2500,
      tokenUsage: 15000,
      costMetric: 0.12
    },
    // Results for other providers...
  }
);
```

## Database Schema

The database schema includes the following tables:

- `repositories` - Repository information
- `pr_reviews` - PR review records with analysis mode
- `analysis_results` - Individual agent analysis results
- `combined_results` - Combined analysis results
- `repository_analysis` - Cached repository analysis
- `calibration_runs` - Model calibration runs
- `calibration_test_results` - Test results for model calibration
- `skill_categories` - Skill categories for developers
- `developer_skills` - Developer skill records
- `skill_history` - History of skill changes

## Migrations

To apply database migrations, run:

```bash
./scripts/migrate-database.sh
```

This will:

1. Build the database package
2. Apply all pending migrations to the Supabase database

Make sure your `.env` file includes `SUPABASE_URL` and `SUPABASE_KEY`.

## Development

### Adding New Models

To add a new model:

1. Create a new file in `src/models/`
2. Implement the model class with static methods
3. Export the model and types in `src/index.ts`
4. Update the `DatabaseService` class with convenience methods

### Adding New Migrations

To add new migrations:

1. Create a new SQL file in `src/migrations/`
2. Update the migration script to include the new file
3. Run the migration script to apply changes

### Testing

Make sure to test database operations with a test Supabase project before applying to production.