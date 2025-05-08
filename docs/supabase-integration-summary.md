# Supabase Integration Summary

## Overview

This document summarizes the implementation of Supabase integration for the CodeQual project, focusing on database schema changes and model implementations to support the two-tier analysis architecture.

## Implementation Details

### 1. Database Schema Enhancements

We've enhanced the database schema to support:

- **Two-tier Analysis**: Added `analysis_mode` field to PR reviews
- **Repository Context**: Added language and size information to repositories
- **Repository Analysis Caching**: Created a dedicated table for DeepWiki results
- **Model Calibration**: Added tables for tracking model performance

### 2. Key Tables Modified/Created

- **repositories**: Added fields for repository analysis
  ```sql
  ALTER TABLE repositories
  ADD COLUMN primary_language TEXT,
  ADD COLUMN languages JSONB,
  ADD COLUMN size BIGINT;
  ```

- **pr_reviews**: Added analysis mode
  ```sql
  ALTER TABLE pr_reviews
  ADD COLUMN analysis_mode TEXT NOT NULL DEFAULT 'quick';
  ```

- **repository_analysis**: New table for caching repository analysis
  ```sql
  CREATE TABLE repository_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    analyzer TEXT NOT NULL,
    analysis_data JSONB NOT NULL,
    metadata JSONB,
    cached_until TIMESTAMP WITH TIME ZONE NOT NULL,
    execution_time_ms INTEGER,
    token_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
  );
  ```

- **calibration_runs** and **calibration_test_results**: New tables for model calibration

### 3. Model Implementation

We've created or updated the following models:

- **RepositoryModel**: Enhanced with language and size information
- **PRReviewModel**: Updated to support analysis mode
- **RepositoryAnalysisModel**: New model for DeepWiki result caching
- **CalibrationModel**: New model for storing calibration data

### 4. Script Implementation

- **setup-supabase.sh**: Script for setting up Supabase tables
- **migrate-database.sh**: Script for applying migrations
- **post-build.js**: Script for copying SQL files to the build directory

### 5. Environment Configuration

- Created .env.sample with Supabase configuration
- Updated README with environment setup instructions

## Usage

### Environment Setup

1. Copy the sample environment file:
   ```bash
   cp .env.sample .env
   ```

2. Edit the .env file with your Supabase credentials:
   ```
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

### Database Setup

1. Make the scripts executable:
   ```bash
   ./scripts/make-executable.sh
   ```

2. Set up the Supabase tables:
   ```bash
   npm run setup:supabase
   ```

### Database Usage

Example of two-tier analysis with the updated models:

```typescript
import { DatabaseService, AnalysisMode, RepositoryAnalyzer } from '@codequal/database';

// Create a repository
const repository = await DatabaseService.findOrCreateRepository(
  'github',
  'owner/repo',
  'https://github.com/owner/repo',
  false
);

// Quick Analysis
const quickReview = await DatabaseService.createPRReview(
  'https://github.com/owner/repo/pull/123',
  repository.id,
  'user-id',
  AnalysisMode.QUICK
);

// Comprehensive Analysis with Repository Analysis Caching
const comprehensiveReview = await DatabaseService.createPRReview(
  'https://github.com/owner/repo/pull/124',
  repository.id,
  'user-id',
  AnalysisMode.COMPREHENSIVE
);

// Check if we have a valid cached repository analysis
const cachedAnalysis = await DatabaseService.getValidRepositoryAnalysisCache(
  repository.id,
  RepositoryAnalyzer.DEEPWIKI
);

if (!cachedAnalysis) {
  // Perform new analysis and cache it
  const analysisData = await performRepositoryAnalysis(repository);
  await DatabaseService.storeRepositoryAnalysis(
    repository.id,
    RepositoryAnalyzer.DEEPWIKI,
    analysisData
  );
}
```

## Next Steps

- Implement Grafana integration for visualization
- Create example dashboards for PR and repository analysis
- Implement DeepWiki integration for comprehensive repository analysis
- Add support for PR context extraction