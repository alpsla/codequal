# CodeQual Monitoring Integration

This directory contains the enhanced monitoring service that integrates with Supabase for alert storage and Grafana for visualization.

## Overview

The monitoring system provides:
- **Real-time metrics collection** using Prometheus format
- **Alert storage** in Supabase for persistence and querying
- **Grafana dashboards** for visualization and alerting
- **Multi-channel notifications** (Slack, Email, PagerDuty)
- **AI-friendly monitoring** with structured schemas

## Components

### EnhancedMonitoringService
The main monitoring service that:
- Collects Prometheus-style metrics
- Manages alert states and triggers
- Integrates with Grafana for dashboards
- Stores alerts in Supabase for persistence
- Sends notifications to configured channels

### SupabaseAlertStorage
Handles persistent storage of alerts:
- Stores firing and resolved alerts
- Calculates metrics like MTTR
- Provides data for Grafana queries

## Quick Start

```typescript
import { EnhancedMonitoringService } from '@codequal/core';

const monitoring = new EnhancedMonitoringService({
  service: 'codequal-api',
  environment: 'production',
  supabase: {
    url: process.env.SUPABASE_URL!,
    key: process.env.SUPABASE_ANON_KEY!
  },
  grafana: {
    url: process.env.GRAFANA_URL!
  },
  alerts: [
    {
      id: 'high-error-rate',
      name: 'High Error Rate',
      condition: 'rate(errors[5m]) > 0.1',
      severity: 'critical',
      channels: ['slack', 'email'],
      description: 'Error rate exceeds 10%'
    }
  ],
  dashboards: [],
  widgets: []
});

// Record metrics
monitoring.recordAnalysisStarted({
  mode: 'comparison',
  repository_size: 'medium',
  user_tier: 'pro'
});

monitoring.recordAnalysisCompleted({
  mode: 'comparison',
  repository_size: 'medium', 
  user_tier: 'pro',
  duration_bucket: '30-60s'
}, 45.2);
```

## Setup Guide

1. **Create Supabase Table**
   ```sql
   -- Run the SQL from supabase-alert-storage.ts getTableSchema()
   ```

2. **Configure Environment**
   ```bash
   export SUPABASE_URL=https://your-project.supabase.co
   export SUPABASE_ANON_KEY=your-anon-key
   export SLACK_WEBHOOK_URL=https://hooks.slack.com/...
   export GRAFANA_URL=http://localhost:3000
   ```

3. **Import Grafana Dashboard**
   - Use grafana-config.json
   - Configure PostgreSQL datasource pointing to Supabase

4. **Test Integration**
   ```bash
   npx ts-node test-integration.ts
   ```

## Alert Flow

1. **Metric Collection** → EnhancedMonitoringService records metrics
2. **Alert Evaluation** → Service evaluates alert conditions periodically  
3. **Alert Triggered** → Alert stored in Supabase and notifications sent
4. **Grafana Query** → Dashboard queries Supabase for alert visualization
5. **Alert Resolution** → Status updated when condition returns to normal

## Files

- `enhanced-monitoring-service.ts` - Main monitoring service
- `supabase-alert-storage.ts` - Alert persistence layer
- `grafana-config.json` - Grafana dashboard configuration
- `GRAFANA_SETUP.md` - Detailed setup instructions
- `test-integration.ts` - Integration test script

## Integration with CodeQual Standard Framework

The monitoring integrates with the orchestrator to:
- Alert on stale configurations (>90 days)
- Monitor researcher evaluation failures
- Track scheduler health
- Record analysis performance metrics

See `/packages/agents/src/standard/docs/ARCHITECTURE.md` for details.