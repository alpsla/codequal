# CodeQual Security Alert System Setup Guide

**Last Updated**: June 1, 2025  
**Status**: Infrastructure Ready - Configuration Pending  
**Prerequisites**: Grafana Dashboard Deployed, Security Events Schema Active

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Current Infrastructure Status](#current-infrastructure-status)
3. [Alert Types and Thresholds](#alert-types-and-thresholds)
4. [Grafana Alert Configuration](#grafana-alert-configuration)
5. [Notification Channels Setup](#notification-channels-setup)
6. [Database-Level Alerts](#database-level-alerts)
7. [Testing Alert Rules](#testing-alert-rules)
8. [Production Deployment Checklist](#production-deployment-checklist)
9. [Maintenance and Tuning](#maintenance-and-tuning)

---

## 🎯 Overview

The CodeQual security alert system monitors authentication events, security threats, and system anomalies in real-time. This guide covers the setup and configuration of alerts using Grafana and PostgreSQL triggers.

### Current Status
- ✅ **Data Infrastructure**: Complete and operational
- ✅ **Grafana Dashboard**: Deployed and receiving data
- ✅ **Metrics Collection**: Active with test data
- ⏸️ **Alert Configuration**: Postponed (no production email addresses)
- ⏸️ **Notification Channels**: Not configured

---

## 🏗️ Current Infrastructure Status

### Available Data Points for Alerting

```sql
-- Security Events Table
- event_id: Unique identifier
- type: AUTH_SUCCESS, AUTH_FAILURE, PERMISSION_ESCALATION, etc.
- severity: low, medium, high, critical
- risk_score: 0-100 integer scale
- user_id: User identifier
- ip_address: Source IP
- timestamp: Event time
- details: JSONB with additional context

-- User Profiles Table  
- id: User UUID
- email: Contact email for alerts
- status: active, suspended, etc.
- role: user, admin

-- Rate Limits Table
- user_id: User identifier
- operation: Operation type
- count: Current count
- reset_time: When limit resets
```

---

## 🚨 Alert Types and Thresholds

### 1. Authentication Alerts

#### **High Failed Login Rate**
```yaml
name: High Failed Login Rate
condition: failed_logins > 20 in 10 minutes
severity: medium
description: Potential brute force attack or system issue
```

#### **Authentication Success Rate Drop**
```yaml
name: Auth Success Rate Critical
condition: success_rate < 30% for 5 minutes
severity: high
description: Major authentication issues affecting users
```

### 2. Security Threat Alerts

#### **Brute Force Attack Detection**
```yaml
name: Brute Force Attack
condition: 
  - Same user > 5 failures in 5 minutes
  - OR same IP > 10 failures in 5 minutes
severity: high
description: Active brute force attack in progress
```

#### **Permission Escalation Attempt**
```yaml
name: Critical Security Event
condition: event.type = 'PERMISSION_ESCALATION'
severity: critical
description: User attempting unauthorized role elevation
immediate_action: true
```

### 3. Rate Limit Alerts

#### **API Rate Limit Exceeded**
```yaml
name: Rate Limit Violation
condition: rate_limit.count > rate_limit.max * 0.9
severity: medium
description: User approaching or exceeding rate limits
```

### 4. System Health Alerts

#### **No Recent Events**
```yaml
name: Event Collection Stopped
condition: no events received for 5 minutes
severity: high
description: Possible system failure or connectivity issue
```

---

## 📊 Grafana Alert Configuration

### Step 1: Access Alert Configuration

1. Open Grafana dashboard: https://alpsla.grafana.net
2. Navigate to any panel you want to alert on
3. Click panel title → Edit → Alert tab

### Step 2: Configure Alert Rules

#### Example: Failed Login Alert

```json
{
  "name": "High Failed Logins",
  "condition": "WHEN last() OF query(A, 5m, now) IS ABOVE 10",
  "data": [
    {
      "refId": "A",
      "queryType": "",
      "model": {
        "expr": "SELECT COUNT(*) FROM security_events WHERE type = 'AUTH_FAILURE' AND timestamp > NOW() - INTERVAL '5 minutes'",
        "datasource": "Supabase-CodeQual"
      }
    }
  ],
  "noDataState": "NoData",
  "execErrState": "Alerting",
  "for": "2m",
  "annotations": {
    "description": "Failed login attempts exceeded threshold",
    "runbook_url": "https://wiki.codequal.com/alerts/failed-logins"
  },
  "labels": {
    "severity": "high",
    "team": "security"
  }
}
```

### Step 3: Alert Rule Templates

Save these as templates in Grafana:

```yaml
# Authentication Success Rate Alert
alert: auth_success_rate_low
expr: |
  (
    sum(rate(security_events{type="AUTH_SUCCESS"}[5m]))
    /
    sum(rate(security_events{type=~"AUTH_SUCCESS|AUTH_FAILURE"}[5m]))
  ) < 0.3
for: 5m
labels:
  severity: critical
  category: authentication
annotations:
  summary: "Authentication success rate below 30%"
  description: "Current rate: {{ $value | humanizePercentage }}"

# Brute Force Detection
alert: brute_force_attack
expr: |
  sum by (user_id) (
    increase(security_events{type="AUTH_FAILURE"}[5m])
  ) > 5
for: 1m
labels:
  severity: high
  category: security
annotations:
  summary: "Possible brute force attack"
  description: "User {{ $labels.user_id }} has {{ $value }} failed attempts"
```

---

## 📬 Notification Channels Setup

### 1. Email Configuration (Production)

```yaml
# In Grafana UI: Configuration → Notification channels → New channel
name: security-email
type: email
addresses: security@codequal.com, ops@codequal.com
settings:
  reminder: 30m
  includeImage: true
```

### 2. Slack Integration

```yaml
name: security-slack
type: slack
webhook: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
settings:
  channel: "#security-alerts"
  username: CodeQual Security
  iconEmoji: ":warning:"
  mentionUsers: "@security-team"
  includeImage: true
```

### 3. PagerDuty (Critical Alerts)

```yaml
name: pagerduty-critical
type: pagerduty
settings:
  integrationKey: YOUR_PAGERDUTY_KEY
  severity: critical
  autoResolve: true
```

### 4. Custom Webhook (Development)

```yaml
name: dev-webhook
type: webhook
url: http://localhost:3000/api/alerts
httpMethod: POST
settings:
  headers:
    Authorization: Bearer YOUR_TOKEN
    Content-Type: application/json
```

---

## 🗄️ Database-Level Alerts

### PostgreSQL Trigger for Critical Events

```sql
-- Create notification function
CREATE OR REPLACE FUNCTION notify_critical_security_event()
RETURNS TRIGGER AS $$
DECLARE
  payload json;
  user_email text;
BEGIN
  -- Only trigger for critical events
  IF NEW.severity = 'critical' OR NEW.risk_score >= 90 THEN
    -- Get user email
    SELECT email INTO user_email 
    FROM user_profiles 
    WHERE id = NEW.user_id;
    
    -- Build notification payload
    payload = json_build_object(
      'event_id', NEW.event_id,
      'type', NEW.type,
      'severity', NEW.severity,
      'risk_score', NEW.risk_score,
      'user_id', NEW.user_id,
      'user_email', user_email,
      'ip_address', NEW.ip_address::text,
      'timestamp', NEW.timestamp,
      'details', NEW.details
    );
    
    -- Send notification
    PERFORM pg_notify('critical_security_event', payload::text);
    
    -- Log to audit table
    INSERT INTO security_audit_log (event_type, payload, created_at)
    VALUES ('critical_alert_triggered', payload, NOW());
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER critical_security_event_trigger
AFTER INSERT ON security_events
FOR EACH ROW
EXECUTE FUNCTION notify_critical_security_event();

-- Create audit log table
CREATE TABLE IF NOT EXISTS security_audit_log (
  id SERIAL PRIMARY KEY,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamp DEFAULT NOW()
);
```

### Node.js Listener for Database Notifications

```javascript
// alert-listener.js
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function startAlertListener() {
  await client.connect();
  
  // Listen for critical events
  await client.query('LISTEN critical_security_event');
  
  client.on('notification', async (msg) => {
    const payload = JSON.parse(msg.payload);
    
    console.log('Critical security event detected:', payload);
    
    // Send to notification service
    await sendAlert(payload);
  });
}

async function sendAlert(payload) {
  // Implement based on your notification service
  if (payload.severity === 'critical') {
    // Send immediate notification
    await sendSlackAlert(payload);
    await sendEmailAlert(payload);
    
    if (payload.type === 'PERMISSION_ESCALATION') {
      // Trigger incident response
      await createIncident(payload);
    }
  }
}
```

---

## 🧪 Testing Alert Rules

### 1. Generate Test Alert Data

```bash
#!/bin/bash
# test-alerts.sh

# Test high failed login rate
echo "Generating failed login spike..."
for i in {1..25}; do
  psql $DATABASE_URL -c "
    INSERT INTO security_events (
      event_id, type, user_id, severity, risk_score, 
      ip_address, timestamp, details
    ) VALUES (
      gen_random_uuid()::text,
      'AUTH_FAILURE'::security_event_type,
      '11111111-1111-1111-1111-111111111111',
      'high'::security_severity,
      85,
      '192.168.1.100'::inet,
      NOW(),
      '{\"source\": \"alert_test\"}'::jsonb
    );
  "
  sleep 0.5
done

# Test critical event
echo "Generating critical security event..."
psql $DATABASE_URL -c "
  INSERT INTO security_events (
    event_id, type, user_id, severity, risk_score,
    ip_address, timestamp, details  
  ) VALUES (
    gen_random_uuid()::text,
    'PERMISSION_ESCALATION'::security_event_type,
    '44444444-4444-4444-4444-444444444444',
    'critical'::security_severity,
    95,
    '10.0.0.1'::inet,
    NOW(),
    '{\"source\": \"alert_test\", \"attempted_role\": \"admin\"}'::jsonb
  );
"
```

### 2. Verify Alert Triggering

In Grafana:
1. Go to Alerting → Alert rules
2. Find your test alert
3. Click "Test rule" to manually trigger
4. Check State history for execution

### 3. Test Notification Delivery

```javascript
// test-webhook-receiver.js
const express = require('express');
const app = express();

app.use(express.json());

app.post('/api/alerts', (req, res) => {
  console.log('Alert received:', {
    timestamp: new Date().toISOString(),
    alert: req.body,
    headers: req.headers
  });
  
  res.json({ received: true });
});

app.listen(3000, () => {
  console.log('Test webhook receiver listening on :3000');
});
```

---

## ✅ Production Deployment Checklist

### Pre-Deployment
- [ ] Define alert thresholds based on baseline metrics
- [ ] Create runbook URLs for each alert type
- [ ] Set up escalation policies
- [ ] Configure notification channels
- [ ] Test all alert rules with synthetic data
- [ ] Document alert response procedures

### Deployment Steps
1. [ ] Configure production email addresses in `user_profiles`
2. [ ] Set up SMTP in Grafana configuration
3. [ ] Create production Slack webhook
4. [ ] Configure PagerDuty integration for critical alerts
5. [ ] Deploy database triggers
6. [ ] Start alert listener service
7. [ ] Enable Grafana alert rules one by one
8. [ ] Verify first alert delivery

### Post-Deployment
- [ ] Monitor for false positives in first week
- [ ] Tune thresholds based on real traffic
- [ ] Set up alert suppression windows
- [ ] Create alert dashboard for metrics
- [ ] Schedule monthly alert review

---

## 🔧 Maintenance and Tuning

### Alert Fatigue Prevention

```yaml
# Implement alert grouping
groupBy: ['alertname', 'cluster', 'service']
groupWait: 10s
groupInterval: 10s
repeatInterval: 12h

# Set up inhibition rules
inhibitRules:
  - sourceMatch:
      severity: 'critical'
    targetMatch:
      severity: 'warning'
    equal: ['alertname', 'dev', 'instance']
```

### Regular Maintenance Tasks

1. **Weekly**
   - Review alert frequency
   - Check for flapping alerts
   - Validate notification delivery

2. **Monthly**
   - Analyze false positive rate
   - Adjust thresholds based on trends
   - Update runbook documentation

3. **Quarterly**
   - Full alert audit
   - Test disaster recovery alerts
   - Review and update escalation paths

### Performance Optimization

```sql
-- Create indexes for alert queries
CREATE INDEX idx_security_events_alert_queries 
ON security_events (type, severity, timestamp)
WHERE timestamp > NOW() - INTERVAL '1 hour';

-- Partition security_events table by month
CREATE TABLE security_events_2025_06 
PARTITION OF security_events
FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');
```

---

## 📚 Additional Resources

- [Grafana Alerting Documentation](https://grafana.com/docs/grafana/latest/alerting/)
- [PostgreSQL LISTEN/NOTIFY](https://www.postgresql.org/docs/current/sql-notify.html)
- [Alert Best Practices](https://www.atlassian.com/incident-management/on-call/alert-best-practices)

---

**Note**: This guide will be updated when production email addresses are available and alert configuration begins.