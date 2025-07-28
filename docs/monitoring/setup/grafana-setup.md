# Grafana Setup for CodeQual

This document describes how to set up Grafana for visualizing CodeQual analysis results.

## Prerequisites

- Supabase project with CodeQual schema
- Grafana Cloud account or self-hosted Grafana instance
- PostgreSQL connection information for your Supabase database

## Connection Setup

1. Create a new PostgreSQL data source in Grafana
2. Use the following connection details:
   - Host: `[your-project-id].supabase.co`
   - Database: `postgres`
   - User: `postgres` (or read-only user created for Grafana)
   - Password: Get from Supabase dashboard
   - SSL Mode: `require`

## Dashboard Templates

### Quick Analysis Dashboard

This dashboard provides visualizations for quick PR analysis results.

**Panels:**

1. **PR Overview**:
   - Time range of PR reviews
   - Count by repository
   - Analysis completion time trends

2. **Analysis Results Distribution**:
   - Issues by severity (high, medium, low)
   - Issues by category (security, code quality, performance)
   - Issues by file type

3. **Agent Performance**:
   - Execution time by agent
   - Token usage by agent
   - Issue detection rates

**Sample Query:**

```sql
SELECT
  pr.id,
  pr.pr_title,
  pr.analysis_mode,
  repo.name as repository_name,
  ar.role,
  ar.provider,
  ar.execution_time_ms,
  jsonb_array_length(ar.insights) as insight_count,
  jsonb_array_length(ar.suggestions) as suggestion_count,
  pr.created_at
FROM
  pr_reviews pr
JOIN
  repositories repo ON pr.repository_id = repo.id
JOIN
  analysis_results ar ON pr.id = ar.pr_review_id
WHERE
  pr.analysis_mode = 'quick'
ORDER BY
  pr.created_at DESC
LIMIT 100;
```

### Comprehensive Analysis Dashboard

This dashboard provides visualizations for comprehensive repository and PR analysis.

**Panels:**

1. **Repository Overview**:
   - Repository analysis completion time
   - Repository size and language distribution
   - Repository analysis cache status

2. **PR Context**:
   - PR size (files changed, lines added/removed)
   - PR categories (feature, bugfix, refactor)
   - PR impact areas (estimated from repository analysis)

3. **Cross-Analysis Insights**:
   - Repository-wide patterns
   - PR-specific deviations from patterns
   - Technical debt indicators

**Sample Query:**

```sql
SELECT
  repo.id as repository_id,
  repo.name as repository_name,
  repo.primary_language,
  repo.languages,
  ra.analyzer,
  ra.cached_until,
  ra.execution_time_ms as repo_analysis_time,
  ra.created_at as analysis_date,
  pr.id as pr_id,
  pr.pr_title,
  pr.analysis_mode,
  ar.role,
  ar.provider,
  ar.execution_time_ms as pr_analysis_time,
  jsonb_array_length(ar.insights) as insight_count
FROM
  repositories repo
JOIN
  repository_analysis ra ON repo.id = ra.repository_id
JOIN
  pr_reviews pr ON repo.id = pr.repository_id
JOIN
  analysis_results ar ON pr.id = ar.pr_review_id
WHERE
  pr.analysis_mode = 'comprehensive'
  AND ra.cached_until > NOW()
ORDER BY
  pr.created_at DESC
LIMIT 50;
```

### Agent Calibration Dashboard

This dashboard provides insights into agent calibration and performance.

**Panels:**

1. **Calibration Overview**:
   - Calibration runs over time
   - Model version comparison
   - Performance metric trends

2. **Agent Performance by Context**:
   - Performance by language
   - Performance by repository size
   - Performance by repository architecture

3. **Optimization Recommendations**:
   - Suggested agent roles based on performance
   - Optimal configurations for different scenarios
   - Cost/performance tradeoff analysis

**Sample Query:**

```sql
SELECT
  cr.run_id,
  cr.timestamp,
  cr.model_versions,
  ctr.size,
  ctr.languages,
  ctr.architecture,
  ctr.results
FROM
  calibration_runs cr
JOIN
  calibration_test_results ctr ON cr.run_id = ctr.run_id
ORDER BY
  cr.timestamp DESC
LIMIT 100;
```

## Setting Up Alerts

Configure alerts for:

1. **Repository Analysis Cache Expiration**:
   ```sql
   SELECT
     repo.name as repository_name,
     ra.analyzer,
     ra.cached_until
   FROM
     repositories repo
   JOIN
     repository_analysis ra ON repo.id = ra.repository_id
   WHERE
     ra.cached_until < NOW() + INTERVAL '24 hours'
   ```

2. **High Severity Issues**:
   ```sql
   SELECT
     repo.name as repository_name,
     pr.pr_title,
     jsonb_array_length(
       jsonb_path_query_array(ar.insights, '$[*] ? (@.severity == "high")')
     ) as high_severity_count
   FROM
     pr_reviews pr
   JOIN
     repositories repo ON pr.repository_id = repo.id
   JOIN
     analysis_results ar ON pr.id = ar.pr_review_id
   WHERE
     jsonb_array_length(
       jsonb_path_query_array(ar.insights, '$[*] ? (@.severity == "high")')
     ) > 0
   ```

## Maintenance

Regularly review and update your dashboards as the CodeQual schema evolves. Consider creating different dashboards for different user roles:

- Developer dashboards (focused on PR-specific insights)
- Team lead dashboards (focused on repository health and trends)
- Manager dashboards (focused on high-level metrics and resource usage)