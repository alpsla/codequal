# Cron Job Configuration for Storage Monitoring

## DigitalOcean Database Monitoring

Add these cron jobs to your server to automate storage monitoring and cleanup:

### 1. Hourly Storage Check
```bash
# Check storage every hour and alert if above threshold
0 * * * * cd /path/to/codequal && npm run monitor:storage >> /var/log/codequal/storage-monitor.log 2>&1
```

### 2. Daily Cleanup (2 AM)
```bash
# Run cleanup daily at 2 AM
0 2 * * * cd /path/to/codequal && npm run cleanup:storage >> /var/log/codequal/storage-cleanup.log 2>&1
```

### 3. Weekly Deep Cleanup (Sunday 3 AM)
```bash
# Run comprehensive cleanup weekly
0 3 * * 0 cd /path/to/codequal && npm run cleanup:storage:deep >> /var/log/codequal/storage-deep-cleanup.log 2>&1
```

### 4. Monthly Storage Report (1st of month)
```bash
# Generate monthly storage report
0 0 1 * * cd /path/to/codequal && npm run report:storage | mail -s "CodeQual Storage Report" admin@codequal.dev
```

## Setup Instructions

1. Add npm scripts to package.json:
```json
{
  "scripts": {
    "monitor:storage": "tsx scripts/monitor-digitalocean-storage.ts",
    "cleanup:storage": "tsx scripts/cleanup-database-storage.ts",
    "cleanup:storage:dry": "tsx scripts/cleanup-database-storage.ts --dry-run",
    "cleanup:storage:deep": "tsx scripts/cleanup-database-storage.ts --deep",
    "report:storage": "tsx scripts/generate-storage-report.ts"
  }
}
```

2. Create log directory:
```bash
sudo mkdir -p /var/log/codequal
sudo chown $USER:$USER /var/log/codequal
```

3. Add cron jobs:
```bash
crontab -e
# Paste the cron configurations above
```

4. Set up log rotation:
```bash
sudo tee /etc/logrotate.d/codequal << EOF
/var/log/codequal/*.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
    create 0644 $USER $USER
}
EOF
```

## Environment Variables

Ensure these are set in your production environment:

```bash
# Database Connection
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# DigitalOcean API (optional but recommended)
DIGITALOCEAN_API_TOKEN=your_do_api_token
DO_DATABASE_CLUSTER_ID=your_db_cluster_id

# Alerting
SLACK_WEBHOOK_URL=your_slack_webhook
```

## Manual Commands

### Check current storage status:
```bash
npm run monitor:storage
```

### Preview cleanup (dry run):
```bash
npm run cleanup:storage:dry
```

### Execute cleanup:
```bash
npm run cleanup:storage
```

### Generate report via API:
```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/database/storage/report
```

## Monitoring Dashboard

Access the storage monitoring dashboard at:
- `/api/database/storage/metrics` - Current metrics
- `/api/database/storage/status` - Status with alerts
- `/api/database/storage/report` - Full HTML report

## Alert Thresholds

- **70%**: Warning alert (Slack notification)
- **85%**: Critical alert (Slack + email)
- **90%**: Emergency (auto-cleanup triggered)

## Cost Optimization

With 30GB DigitalOcean plan at ~$15/month:
- Current cost: $0.50/GB/month
- Target utilization: 60-80%
- Wasted space cost: $0.50 × unused GB

Regular cleanup can save $3-5/month by maintaining optimal usage.