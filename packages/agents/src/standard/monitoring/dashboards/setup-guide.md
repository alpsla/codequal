# Grafana Dashboard Setup Guide

Complete guide for setting up CodeQual monitoring dashboards in Grafana.

## 📋 Prerequisites

1. **Grafana Instance**: Local or hosted Grafana (v9.0+)
2. **PostgreSQL Datasource**: Connected to Supabase
3. **Environment Variables**: Properly configured `.env` file
4. **Data Collection**: Active CodeQual analyses generating metrics

## 🚀 Quick Setup

### Step 1: Connect to Supabase

1. Open Grafana: `http://localhost:3000`
2. Navigate to **Configuration → Data Sources**
3. Click **Add data source**
4. Select **PostgreSQL**

### Step 2: Configure PostgreSQL Connection

```yaml
Name: Supabase-CodeQual
Host: aws-0-us-west-1.pooler.supabase.com:6543
Database: postgres
User: postgres.ftjhmbbcuqjqmmbaymqb
Password: <SUPABASE_DB_PASSWORD from .env>
SSL Mode: require
Version: 14.x
```

### Step 3: Import Dashboards

1. Go to **Dashboards → Import**
2. Upload JSON files from `packages/agents/grafana/`:
   - `codequal-dashboard-final.json` - Main performance dashboard
   - `model-optimization-dashboard.json` - Model usage & optimization

## 📊 Available Dashboards

### 1. CodeQual Performance Dashboard

**File**: `codequal-dashboard-final.json`

**Key Panels**:
- Total analyses (24h)
- Success rate
- Average execution time
- Cost by model
- Performance by repository size
- Agent activity timeline
- Error distribution

**Use Cases**:
- Monitor system health
- Track performance trends
- Identify bottlenecks
- Cost overview

### 2. Model Optimization Dashboard

**File**: `model-optimization-dashboard.json`

**Key Panels**:
- Model diversity score
- Most expensive models
- Potential savings calculator
- Agent-model usage patterns
- Cost per operation
- Optimization recommendations

**Use Cases**:
- Identify cost optimization opportunities
- Track model usage patterns
- Plan model migrations
- Monitor cost trends

## 🔧 Dashboard Configuration

### Setting Up Variables

1. **Create Datasource Variable**:
   ```sql
   Name: datasource
   Type: Datasource
   Query: postgres
   Default: Supabase-CodeQual
   ```

2. **Create Time Range Variables**:
   ```sql
   Name: timeRange
   Type: Interval
   Values: 1h,6h,12h,24h,7d,30d
   Default: 24h
   ```

3. **Create Agent Filter**:
   ```sql
   Name: agent
   Type: Query
   Query: SELECT DISTINCT agent_role FROM agent_activity
   Multi-value: Yes
   Include All: Yes
   ```

### Customizing Panels

#### Modify Time Ranges
```json
{
  "targets": [{
    "rawSql": "... WHERE timestamp > EXTRACT(EPOCH FROM NOW() - INTERVAL '$timeRange') * 1000"
  }]
}
```

#### Add Agent Filtering
```json
{
  "targets": [{
    "rawSql": "... WHERE agent_role IN ($agent) AND ..."
  }]
}
```

#### Adjust Thresholds
```json
{
  "fieldConfig": {
    "defaults": {
      "thresholds": {
        "steps": [
          { "value": 0, "color": "red" },
          { "value": 80, "color": "yellow" },
          { "value": 95, "color": "green" }
        ]
      }
    }
  }
}
```

## 📈 Creating Custom Panels

### Example: Agent Efficiency Panel

```json
{
  "type": "stat",
  "title": "Agent Efficiency Score",
  "targets": [{
    "datasource": {
      "type": "postgres",
      "uid": "${datasource}"
    },
    "rawSql": "SELECT (AVG(CASE WHEN success THEN 100 ELSE 0 END) * AVG(CASE WHEN duration_ms < 30000 THEN 100 ELSE 50 END) / 100) as value FROM agent_activity WHERE timestamp > EXTRACT(EPOCH FROM NOW() - INTERVAL '24 hours') * 1000",
    "format": "table"
  }],
  "fieldConfig": {
    "defaults": {
      "unit": "percent",
      "decimals": 1,
      "color": {
        "mode": "thresholds"
      },
      "thresholds": {
        "steps": [
          { "value": 0, "color": "red" },
          { "value": 60, "color": "yellow" },
          { "value": 80, "color": "green" }
        ]
      }
    }
  }
}
```

### Example: Cost Trend Analysis

```json
{
  "type": "timeseries",
  "title": "Cost Trend by Model",
  "targets": [{
    "datasource": {
      "type": "postgres",
      "uid": "${datasource}"
    },
    "rawSql": "SELECT to_timestamp(timestamp/1000) as time, model_used as metric, SUM(cost) as value FROM agent_activity WHERE timestamp > EXTRACT(EPOCH FROM NOW() - INTERVAL '7 days') * 1000 GROUP BY time, model_used ORDER BY time",
    "format": "time_series"
  }],
  "fieldConfig": {
    "defaults": {
      "unit": "currencyUSD",
      "custom": {
        "drawStyle": "line",
        "lineInterpolation": "smooth",
        "fillOpacity": 10
      }
    }
  }
}
```

## 🎨 Visualization Best Practices

### 1. Choose the Right Panel Type

- **Stat**: Single metrics (success rate, total cost)
- **Time Series**: Trends over time
- **Bar Gauge**: Comparisons (cost by agent)
- **Pie Chart**: Distribution (model usage)
- **Table**: Detailed data (operations list)
- **Heatmap**: Patterns (usage by hour)

### 2. Color Coding Standards

```yaml
Success/Good:
  - Green: #73BF69
  - Light Green: #96D98D

Warning/Caution:
  - Yellow: #FADE2A
  - Orange: #F2CC0C

Error/Bad:
  - Red: #F2495C
  - Dark Red: #E02F44

Neutral:
  - Blue: #5794F2
  - Purple: #B877D9
```

### 3. Unit Configuration

```yaml
Time:
  - duration_ms: milliseconds (ms)
  - duration_sec: seconds (s)
  
Money:
  - cost: currencyUSD ($0.00)
  
Percentage:
  - success_rate: percent (%)
  
Count:
  - total_calls: short (1K, 1M)
```

## 🔍 SQL Query Examples

### Get Hourly Cost Breakdown
```sql
SELECT 
  DATE_TRUNC('hour', to_timestamp(timestamp/1000)) as hour,
  agent_role,
  SUM(cost) as total_cost
FROM agent_activity
WHERE timestamp > EXTRACT(EPOCH FROM NOW() - INTERVAL '24 hours') * 1000
GROUP BY hour, agent_role
ORDER BY hour DESC;
```

### Calculate Success Rate by Model
```sql
SELECT 
  model_used,
  COUNT(*) as total_calls,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_calls,
  (SUM(CASE WHEN success THEN 1 ELSE 0 END)::float / COUNT(*)) * 100 as success_rate
FROM agent_activity
WHERE timestamp > EXTRACT(EPOCH FROM NOW() - INTERVAL '7 days') * 1000
GROUP BY model_used
ORDER BY total_calls DESC;
```

### Find Most Expensive Operations
```sql
SELECT 
  agent_role,
  operation,
  COUNT(*) as call_count,
  AVG(cost) as avg_cost,
  SUM(cost) as total_cost
FROM agent_activity
WHERE timestamp > EXTRACT(EPOCH FROM NOW() - INTERVAL '30 days') * 1000
GROUP BY agent_role, operation
HAVING COUNT(*) > 10
ORDER BY total_cost DESC
LIMIT 20;
```

### Model Switch Impact Analysis
```sql
WITH before_switch AS (
  SELECT AVG(cost) as avg_cost_before
  FROM agent_activity
  WHERE model_used = 'openai/gpt-4'
    AND timestamp < EXTRACT(EPOCH FROM '2024-01-15'::timestamp) * 1000
),
after_switch AS (
  SELECT AVG(cost) as avg_cost_after
  FROM agent_activity
  WHERE model_used = 'openai/gpt-4o'
    AND timestamp > EXTRACT(EPOCH FROM '2024-01-15'::timestamp) * 1000
)
SELECT 
  avg_cost_before,
  avg_cost_after,
  (avg_cost_before - avg_cost_after) as savings_per_call,
  ((avg_cost_before - avg_cost_after) / avg_cost_before) * 100 as savings_percentage
FROM before_switch, after_switch;
```

## 🚨 Alert Configuration

### Setting Up Alerts

1. **Navigate to Alert Rules**:
   - Go to **Alerting → Alert rules**
   - Click **New alert rule**

2. **Configure Query**:
   ```sql
   SELECT 
     AVG(CASE WHEN success THEN 100 ELSE 0 END) as success_rate
   FROM agent_activity
   WHERE timestamp > EXTRACT(EPOCH FROM NOW() - INTERVAL '1 hour') * 1000
   ```

3. **Set Conditions**:
   ```yaml
   Condition: WHEN last() OF query(A) IS BELOW 85
   Evaluate: every 5m for 10m
   ```

4. **Configure Notifications**:
   - Add contact points (email, Slack, etc.)
   - Set notification message template

### Example Alert Rules

#### High Error Rate Alert
```yaml
Name: High Error Rate
Query: SELECT error_rate calculation
Condition: WHEN last() > 10
Severity: Critical
Action: Notify on-call team
```

#### Cost Threshold Alert
```yaml
Name: Hourly Cost Exceeded
Query: SELECT SUM(cost) for last hour
Condition: WHEN last() > 5
Severity: Warning
Action: Notify finance team
```

#### Performance Degradation Alert
```yaml
Name: Slow Response Time
Query: SELECT AVG(duration_ms)
Condition: WHEN last() > 60000
Severity: Warning
Action: Notify engineering team
```

## 📱 Mobile Access

### Setting Up Mobile View

1. **Create Mobile Dashboard**:
   - Duplicate existing dashboard
   - Simplify layout for mobile
   - Reduce panel count

2. **Key Mobile Panels**:
   - Current status (stat)
   - 24h trend (sparkline)
   - Top issues (table)
   - Quick metrics (stats row)

3. **Mobile-Optimized Query**:
   ```sql
   -- Simplified query for mobile
   SELECT 
     COUNT(*) as total,
     AVG(cost) as avg_cost,
     AVG(CASE WHEN success THEN 100 ELSE 0 END) as success_rate
   FROM agent_activity
   WHERE timestamp > EXTRACT(EPOCH FROM NOW() - INTERVAL '1 hour') * 1000
   ```

## 🔄 Dashboard Backup & Version Control

### Export Dashboard
1. Go to dashboard settings
2. Click **JSON Model**
3. Copy JSON content
4. Save to `grafana/dashboards/`

### Version Control
```bash
# Add to git
git add grafana/dashboards/my-dashboard.json
git commit -m "feat: Add custom dashboard for X monitoring"

# Tag versions
git tag dashboard-v1.0.0
```

### Backup Script
```bash
#!/bin/bash
# backup-dashboards.sh

GRAFANA_URL="http://localhost:3000"
API_KEY="your-api-key"
BACKUP_DIR="./grafana/backups/$(date +%Y%m%d)"

mkdir -p $BACKUP_DIR

# Get all dashboards
curl -H "Authorization: Bearer $API_KEY" \
  $GRAFANA_URL/api/search?type=dash-db \
  | jq -r '.[] | .uid' | while read uid; do
    
  # Export each dashboard
  curl -H "Authorization: Bearer $API_KEY" \
    $GRAFANA_URL/api/dashboards/uid/$uid \
    > "$BACKUP_DIR/$uid.json"
done
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. No Data Showing
```sql
-- Check if data exists
SELECT COUNT(*) FROM agent_activity;

-- Check recent data
SELECT * FROM agent_activity 
ORDER BY timestamp DESC 
LIMIT 10;
```

#### 2. Time Zone Issues
```sql
-- Ensure correct timezone
SET timezone = 'UTC';

-- Convert timestamp correctly
SELECT to_timestamp(timestamp/1000) AT TIME ZONE 'UTC' as time
```

#### 3. Slow Queries
```sql
-- Add indexes
CREATE INDEX idx_timestamp ON agent_activity(timestamp);
CREATE INDEX idx_agent_role ON agent_activity(agent_role);
CREATE INDEX idx_model_used ON agent_activity(model_used);
```

#### 4. Connection Issues
- Verify Supabase credentials
- Check network connectivity
- Ensure SSL mode is correct
- Test with `psql` directly

## 📚 Additional Resources

- [Grafana Documentation](https://grafana.com/docs/)
- [PostgreSQL in Grafana](https://grafana.com/docs/grafana/latest/datasources/postgres/)
- [Supabase Connection Guide](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Panel Best Practices](https://grafana.com/docs/grafana/latest/panels/panel-best-practices/)

## 📞 Support

For issues or questions:
1. Check the [Monitoring README](../README.md)
2. Review [CodeQual Documentation](../../../../docs/)
3. Open an issue in the repository
4. Contact the CodeQual team