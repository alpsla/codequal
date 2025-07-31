# DeepWiki Report Storage in Vector DB

## Overview

Created a service to store DeepWiki analysis reports in Vector DB (Supabase) for persistent storage and retrieval.

## Components Created

### 1. Database Table Schema
**File:** `/apps/api/scripts/create-deepwiki-reports-table.sql`

Creates a `deepwiki_reports` table with:
- Analysis ID, repository URL, branch, commit hash tracking
- Report type (main/feature/comparison)
- Full report data (issues, recommendations, scores, metadata)
- Token usage tracking
- RLS policies for security
- Indexes for performance

### 2. Storage Service
**File:** `/apps/api/src/services/deepwiki-report-storage.ts`

Provides methods to:
- Store individual DeepWiki reports
- Store comparison reports (main vs feature branch)
- Retrieve reports by analysis ID
- Retrieve reports by repository
- Get comparison reports for PR analysis
- Clean up old reports

### 3. Test Script
**File:** `/apps/api/test-deepwiki-report-storage.ts`

Tests all storage functionality:
- Loading existing DeepWiki JSON reports
- Storing reports with metadata and token usage
- Retrieving reports by various criteria
- Comparison report storage and retrieval

## Setup Instructions

1. **Create the database table:**
   - Go to: https://supabase.com/dashboard/project/ftjhmbbcuqjqmmbaymqb/sql/new
   - Copy and paste the SQL from `/apps/api/scripts/create-deepwiki-reports-table.sql`
   - Execute the SQL

2. **Test the storage:**
   ```bash
   cd apps/api
   npx tsx test-deepwiki-report-storage.ts
   ```

## Usage Example

```typescript
import { deepWikiReportStorage } from './services/deepwiki-report-storage';

// Store a report
const result = await deepWikiReportStorage.storeReport(deepWikiReport, {
  analysisId: 'uuid-here',
  repositoryUrl: 'https://github.com/owner/repo',
  branch: 'main',
  reportType: 'main',
  tokenUsage: { promptTokens: 1000, completionTokens: 500, totalTokens: 1500 }
});

// Retrieve reports
const reports = await deepWikiReportStorage.getReportsByAnalysis(analysisId);
```

## Integration Points

1. **Result Orchestrator**: Can store DeepWiki reports after analysis
2. **PR Analysis**: Can retrieve and compare main vs feature branch reports
3. **Token Tracking**: Integrates with token usage tracking system
4. **API Endpoints**: Can expose endpoints to retrieve stored reports

## Benefits

1. **Persistence**: DeepWiki reports are stored permanently
2. **Historical Analysis**: Can track changes over time
3. **PR Comparison**: Easy comparison between branches
4. **Token Tracking**: Monitor DeepWiki API usage and costs
5. **Security**: RLS policies ensure proper access control

## Next Steps

1. Execute the SQL to create the table
2. Integrate storage into the analysis workflow
3. Add API endpoints for report retrieval
4. Implement report visualization UI