# Vector Database Retention Policy

## Overview

The Vector DB Retention Policy system prevents exponential growth of stored data while maintaining valuable insights and critical findings. It implements automated cleanup, data aggregation, and storage optimization strategies.

## Key Features

### 1. Configurable Retention Periods
- **Tool Results**: 90 days default (configurable)
- **Analysis Results**: 180 days default (configurable)
- **Critical Findings**: Can be kept indefinitely
- **Failed Analyses**: Optional retention

### 2. Storage Limits
- **Global Limit**: 1M records total
- **Per-Repository Limit**: 10k tool results per repository
- **Warning Threshold**: 80% capacity triggers alerts
- **Critical Threshold**: 95% capacity triggers aggressive cleanup

### 3. Data Aggregation
Before deleting old data, the system can create aggregated summaries that preserve:
- Statistical insights (severity distribution, common issues)
- Historical trends
- Pattern analysis
- Performance metrics

### 4. Embedding Optimization
- Detects and merges very similar embeddings (95%+ similarity)
- Reduces storage without losing semantic search capability
- Maintains category-based limits

## Configuration

```typescript
const retentionConfig = {
  toolResults: {
    maxAgeInDays: 90,              // Delete after 90 days
    maxRecordsPerRepo: 10000,      // Max records per repository
    keepCriticalFindings: true,    // Always keep critical security findings
    aggregateBeforeDelete: true    // Create summaries before deletion
  },
  analysisResults: {
    maxAgeInDays: 180,             // Keep for 6 months
    maxAnalysesPerRepo: 1000,      // Max analyses per repository
    keepFailedAnalyses: false      // Don't keep failed analyses
  },
  embeddings: {
    compactionEnabled: true,       // Compact similar embeddings
    similarityThreshold: 0.95,     // Threshold for similarity
    maxEmbeddingsPerCategory: 5000 // Max per category
  },
  storage: {
    maxTotalRecords: 1000000,      // 1M records total
    warningThreshold: 80,          // Warning at 80% capacity
    criticalThreshold: 95         // Aggressive cleanup at 95%
  }
};
```

## API Endpoints

### Get Retention Statistics
```
GET /api/vector-retention/stats
```
Returns current storage usage, record counts by age and type.

### Get Configuration
```
GET /api/vector-retention/config
```
Returns current retention policy configuration.

### Trigger Manual Cleanup
```
POST /api/vector-retention/cleanup
{
  "aggressive": false  // Set true for emergency cleanup
}
```
Manually triggers retention policy execution.

### Update Schedule
```
PUT /api/vector-retention/schedule
{
  "schedule": "0 2 * * *"  // Cron expression
}
```
Updates the automatic cleanup schedule.

### Preview Cleanup Impact
```
GET /api/vector-retention/preview?aggressive=false
```
Shows what would be deleted without actually deleting.

## Automatic Execution

The retention policy runs automatically:
- **Default Schedule**: Daily at 2 AM
- **Monitoring**: Logs all cleanup operations
- **Background Processing**: Non-blocking execution
- **Error Handling**: Continues on partial failures

## Data Lifecycle

1. **Active Phase** (0-90 days)
   - Full data retention
   - All embeddings preserved
   - Instant access

2. **Archive Phase** (90-180 days)
   - Tool results aggregated
   - Critical findings preserved
   - Summaries created

3. **Deletion Phase** (180+ days)
   - Non-critical data removed
   - Aggregated summaries retained
   - Storage reclaimed

## Storage Optimization Strategies

### 1. Age-Based Cleanup
- Oldest records deleted first
- Configurable retention periods
- Critical findings exemption

### 2. Repository Limits
- Prevents single repository from consuming excessive storage
- Fair resource allocation
- Automatic enforcement

### 3. Embedding Compaction
- Merges nearly identical embeddings
- Preserves semantic search quality
- Reduces storage overhead

### 4. Aggregation Before Deletion
- Creates statistical summaries
- Preserves historical insights
- Minimal storage footprint

## Monitoring and Alerts

### Storage Metrics
- Total records count
- Storage usage percentage
- Records by age distribution
- Records by type breakdown

### Cleanup Metrics
- Records deleted per run
- Space freed
- Aggregations created
- Execution duration

### Alert Thresholds
- **Warning (80%)**: Email notification to admins
- **Critical (95%)**: Aggressive cleanup triggered
- **Failure**: Error logged, manual intervention required

## Best Practices

1. **Regular Monitoring**
   - Check retention stats weekly
   - Review cleanup logs
   - Adjust thresholds as needed

2. **Balanced Configuration**
   - Keep critical findings longer
   - Aggregate before deleting
   - Set reasonable per-repo limits

3. **Emergency Procedures**
   - Manual cleanup available
   - Aggressive mode for emergencies
   - Preview before execution

4. **Data Recovery**
   - Aggregated summaries preserve insights
   - Critical findings always retained
   - Archive tables for audit trail

## Implementation Details

### Database Schema
```sql
-- Retention tracking
CREATE TABLE retention_policy_runs (
  id UUID PRIMARY KEY,
  run_date TIMESTAMP,
  records_deleted INT,
  records_archived INT,
  space_freed_mb FLOAT,
  duration_ms INT,
  status TEXT,
  error_message TEXT
);

-- Archive table
CREATE TABLE tool_results_archive (
  id TEXT PRIMARY KEY,
  repository_id TEXT,
  tool_id TEXT,
  severity TEXT,
  findings_count INT,
  created_at TIMESTAMP,
  archived_at TIMESTAMP
);
```

### Performance Considerations
- Batch processing to avoid locks
- Index optimization for date queries
- Background execution
- Progressive cleanup

## Future Enhancements

1. **Machine Learning Integration**
   - Predict storage growth
   - Optimize retention periods
   - Intelligent aggregation

2. **Tiered Storage**
   - Hot/cold data separation
   - Compressed archives
   - Cloud storage integration

3. **Advanced Analytics**
   - Retention impact analysis
   - Cost optimization
   - Usage patterns

4. **Compliance Features**
   - GDPR data retention rules
   - Audit logging
   - Data lineage tracking