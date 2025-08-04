# Grafana Alert Integration Setup

This guide explains how to set up Grafana to query alerts stored in Supabase and send notifications via Slack/Email.

## Prerequisites

1. Grafana instance (v9.0+)
2. Supabase project with monitoring_alerts table
3. Slack webhook URL (optional)
4. Email SMTP configuration (optional)

## Step 1: Create Supabase Table

Run this SQL in your Supabase SQL editor:

```sql
CREATE TABLE IF NOT EXISTS monitoring_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service VARCHAR(255) NOT NULL,
  environment VARCHAR(50) NOT NULL,
  alert_id VARCHAR(255) NOT NULL,
  alert_name VARCHAR(255) NOT NULL,
  severity VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  value NUMERIC NOT NULL,
  threshold NUMERIC NOT NULL,
  message TEXT,
  metadata JSONB,
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  channels_notified TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_monitoring_alerts_service ON monitoring_alerts(service);
CREATE INDEX idx_monitoring_alerts_triggered_at ON monitoring_alerts(triggered_at);
CREATE INDEX idx_monitoring_alerts_severity ON monitoring_alerts(severity);
CREATE INDEX idx_monitoring_alerts_status ON monitoring_alerts(status);

-- Create a view for easier querying
CREATE OR REPLACE VIEW monitoring_alerts_metrics AS
SELECT 
  service,
  environment,
  severity,
  COUNT(*) as alert_count,
  AVG(CASE 
    WHEN resolved_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (resolved_at - triggered_at)) / 60 
    ELSE NULL 
  END) as avg_resolution_minutes,
  COUNT(CASE WHEN status = 'firing' THEN 1 END) as active_alerts,
  COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_alerts
FROM monitoring_alerts
WHERE triggered_at >= NOW() - INTERVAL '24 hours'
GROUP BY service, environment, severity;
```

## Step 2: Configure Environment Variables

Add these to your application:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key  # For Grafana to query

# Alert Channels (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
ALERT_EMAIL_TO=alerts@yourcompany.com,oncall@yourcompany.com
ALERT_EMAIL_FROM=noreply@yourcompany.com
PAGERDUTY_INTEGRATION_KEY=your-integration-key
```

## Step 3: Import Grafana Configuration

### Option A: Via Grafana UI

1. Log into Grafana as admin
2. Go to Configuration → Data Sources
3. Add new PostgreSQL data source:
   - Name: `Supabase-Alerts`
   - Host: Your Supabase host (from connection string)
   - Database: `postgres`
   - User: `postgres`
   - Password: Your Supabase service key
   - SSL Mode: `require`

4. Import the dashboard:
   - Go to Dashboards → Import
   - Upload `grafana-config.json`
   - Select the Supabase-Alerts datasource

### Option B: Via Grafana API

```bash
# Set variables
GRAFANA_URL="http://localhost:3000"
GRAFANA_API_KEY="your-grafana-api-key"

# Add datasource
curl -X POST \
  $GRAFANA_URL/api/datasources \
  -H "Authorization: Bearer $GRAFANA_API_KEY" \
  -H "Content-Type: application/json" \
  -d @- <<EOF
{
  "name": "Supabase-Alerts",
  "type": "postgres",
  "access": "proxy",
  "url": "$SUPABASE_URL",
  "database": "postgres",
  "user": "postgres",
  "secureJsonData": {
    "password": "$SUPABASE_SERVICE_KEY"
  },
  "jsonData": {
    "sslmode": "require",
    "postgresVersion": 1500
  }
}
EOF

# Import dashboard
curl -X POST \
  $GRAFANA_URL/api/dashboards/import \
  -H "Authorization: Bearer $GRAFANA_API_KEY" \
  -H "Content-Type: application/json" \
  -d @grafana-config.json
```

## Step 4: Configure Alert Notifications

### Slack Integration

1. Create a Slack app and incoming webhook
2. In Grafana, go to Alerting → Notification channels
3. Add new channel:
   - Name: `Slack Alerts`
   - Type: `Slack`
   - Webhook URL: Your Slack webhook
   - Recipient: `#alerts` (your channel)

### Email Integration

1. Configure Grafana SMTP in `grafana.ini`:

```ini
[smtp]
enabled = true
host = smtp.gmail.com:587
user = your-email@gmail.com
password = your-app-password
from_address = alerts@yourcompany.com
from_name = Grafana
```

2. Restart Grafana
3. Add email notification channel in UI

## Step 5: Test the Integration

### Send a Test Alert

```typescript
import { EnhancedMonitoringService } from '@codequal/core';

const monitoring = new EnhancedMonitoringService({
  service: 'test-service',
  environment: 'production',
  supabase: {
    url: process.env.SUPABASE_URL!,
    key: process.env.SUPABASE_ANON_KEY!
  },
  // ... other config
});

// Trigger a test alert
monitoring.recordError('test_error', 'monitoring', 'critical');
```

### Verify in Grafana

1. Go to your CodeQual Alert Dashboard
2. You should see the test alert in "Active Alerts"
3. Check that notifications were sent to configured channels

## Step 6: Production Considerations

### Security

1. Use service role key for Grafana (read-only access)
2. Enable Row Level Security (RLS) on alerts table
3. Rotate API keys regularly

### Performance

1. Add appropriate indexes (already included in schema)
2. Set up alert retention policy:

```sql
-- Delete alerts older than 90 days
DELETE FROM monitoring_alerts 
WHERE created_at < NOW() - INTERVAL '90 days';
```

3. Consider partitioning for high-volume environments

### High Availability

1. Set up Grafana in HA mode with shared database
2. Use multiple notification channels for redundancy
3. Configure alert deduplication in PagerDuty

## Troubleshooting

### Alerts not appearing in Grafana

1. Check Supabase connection in Data Sources
2. Verify alerts are being written to Supabase
3. Check Grafana logs for query errors

### Notifications not sending

1. Test notification channel manually in Grafana
2. Check webhook URLs and credentials
3. Verify SMTP settings for email

### Performance issues

1. Check query performance in Supabase dashboard
2. Add missing indexes if needed
3. Reduce dashboard refresh rate

## Dashboard Features

The included dashboard provides:

- **Active Alerts Table**: Real-time view of firing alerts
- **Alert Summary Stats**: Count by severity
- **Alert Trends Graph**: 24-hour trend visualization
- **Recent Resolved Alerts**: History with resolution times
- **MTTR Gauge**: Mean time to resolution metric

## Customization

### Adding Custom Panels

Example query for alert frequency by hour:

```sql
SELECT 
  date_trunc('hour', triggered_at) as time,
  COUNT(*) as alert_count
FROM monitoring_alerts
WHERE service = '$service'
  AND triggered_at >= NOW() - INTERVAL '7 days'
GROUP BY 1
ORDER BY 1
```

### Custom Alert Rules

Create alerts based on Supabase data:

```json
{
  "condition": "SELECT COUNT(*) FROM monitoring_alerts WHERE status = 'firing' AND severity = 'critical'",
  "threshold": 5,
  "for": "5m",
  "message": "More than 5 critical alerts are firing"
}
```

## Integration with Existing Monitoring

The CodeQual monitoring can complement existing tools:

- **Prometheus**: Export metrics for aggregation
- **Datadog**: Forward alerts via webhook
- **New Relic**: Correlate with APM data
- **CloudWatch**: Sync alerts for AWS resources