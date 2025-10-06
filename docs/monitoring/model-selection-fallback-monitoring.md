# Model Selection Fallback Monitoring

**Created:** October 6, 2025
**Status:** ✅ Production Ready
**Component:** ModelConfigResolver
**Severity Levels:** Warning (Level 1), Critical (Level 2)

---

## Overview

Comprehensive monitoring and alerting system for the two-level model selection fallback strategy. Tracks OpenRouter key failures, emergency fallback activations, and system health.

### Fallback Strategy

**Level 1: OpenRouter Key Rotation**
- Automatically rotates through multiple OpenRouter API keys
- Activates when primary key fails
- **Alert Severity:** Warning
- **Action Required:** Monitor, investigate after multiple failures

**Level 2: Emergency Provider Fallback**
- Activates when ALL OpenRouter keys fail
- Falls back to direct Gemini/Claude/OpenAI API
- **Alert Severity:** Critical
- **Action Required:** Immediate intervention

---

## Alert Types

### 1. OpenRouter Key Rotation (Level 1)

**Alert Type:** `openrouter_key_rotation`
**Severity:** `warning`
**Trigger:** Single OpenRouter key fails

**Example Alert:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "alert_type": "openrouter_key_rotation",
  "severity": "warning",
  "component": "ModelConfigResolver",
  "context": {
    "role": "security",
    "language": "java",
    "size_category": "large"
  },
  "metadata": {
    "failed_key_index": 0,
    "remaining_keys": 2,
    "error_message": "Invalid API key"
  },
  "message": "OpenRouter key #1 failed. Rotating to next key.",
  "timestamp": "2025-10-06T13:30:00.000Z",
  "resolved": false,
  "created_at": "2025-10-06T13:30:00.123Z"
}
```

**Console Log Example:**
```
[ModelConfigResolver] [INFO] Attempting research with OpenRouter key #1
[ModelConfigResolver] [WARN] Research failed with OpenRouter key #1: Invalid API key
[ModelConfigResolver] [WARN] Marked OpenRouter key as failed (1/3 failed)
[ModelConfigResolver] [WARN] ⚠️  LEVEL 1 FALLBACK: Rotating to next OpenRouter key
[ModelConfigResolver] [INFO] Fallback alert stored: openrouter_key_rotation (warning)
[ModelConfigResolver] [INFO] Attempting research with OpenRouter key #2
[ModelConfigResolver] [INFO] Research successful with current OpenRouter key
```

**Response Actions:**
1. **Single Failure:** Monitor only, system self-healed
2. **Multiple Failures (>50% keys):** Investigate key validity
3. **All Keys Failing:** Escalate to Level 2 (see below)

---

### 2. Emergency Fallback Activated (Level 2)

**Alert Type:** `emergency_fallback_activated`
**Severity:** `critical`
**Trigger:** ALL OpenRouter keys failed

**Example Alert:**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "alert_type": "emergency_fallback_activated",
  "severity": "critical",
  "component": "ModelConfigResolver",
  "context": {
    "role": "security",
    "language": "java",
    "size_category": "large"
  },
  "metadata": {
    "provider": "gemini",
    "model": "gemini-2.5-pro",
    "failed_keys_count": 3,
    "total_keys_count": 3
  },
  "message": "All OpenRouter keys failed. Using emergency fallback: gemini/gemini-2.5-pro",
  "timestamp": "2025-10-06T13:35:00.000Z",
  "resolved": false,
  "created_at": "2025-10-06T13:35:00.456Z"
}
```

**Console Log Example:**
```
[ModelConfigResolver] [INFO] Attempting research with OpenRouter key #1
[ModelConfigResolver] [WARN] Research failed with OpenRouter key #1: Invalid API key
[ModelConfigResolver] [WARN] ⚠️  LEVEL 1 FALLBACK: Rotating to next OpenRouter key
[ModelConfigResolver] [INFO] Attempting research with OpenRouter key #2
[ModelConfigResolver] [WARN] Research failed with OpenRouter key #2: Invalid API key
[ModelConfigResolver] [WARN] ⚠️  LEVEL 1 FALLBACK: Rotating to next OpenRouter key
[ModelConfigResolver] [INFO] Attempting research with OpenRouter key #3
[ModelConfigResolver] [WARN] Research failed with OpenRouter key #3: Invalid API key
[ModelConfigResolver] [ERROR] All OpenRouter keys have failed
[ModelConfigResolver] [ERROR] All OpenRouter keys failed. Last error: Invalid API key
[ModelConfigResolver] [ERROR] 🚨 EMERGENCY FALLBACK ACTIVATED: gemini/gemini-2.5-pro
[ModelConfigResolver] [ERROR] Context: security/java/large
[ModelConfigResolver] [ERROR] Failed OpenRouter keys: 3/3
[EmergencyFallbackProvider] ✅ Configured: gemini/gemini-2.5-pro
[ModelConfigResolver] [INFO] Fallback alert stored: emergency_fallback_activated (critical)
```

**Response Actions:**
1. **Immediate:** Verify OpenRouter service status
2. **Within 1 hour:** Check/refresh all OpenRouter API keys
3. **Within 4 hours:** Restore OpenRouter connectivity
4. **Monitor:** Emergency provider costs (may be higher)

**System Behavior During Emergency:**
- All agents use same model (not role-specific)
- Performance may be suboptimal
- Costs may increase
- No Supabase storage (temporary configs only)

---

## Database Schema

### Supabase Table: `system_alerts`

```sql
CREATE TABLE system_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,              -- 'openrouter_key_rotation' or 'emergency_fallback_activated'
  severity TEXT NOT NULL,                -- 'warning' or 'critical'
  component TEXT NOT NULL,               -- 'ModelConfigResolver'
  context JSONB,                         -- { role, language, size_category }
  metadata JSONB,                        -- Additional context
  message TEXT NOT NULL,                 -- Human-readable message
  timestamp TIMESTAMP NOT NULL,          -- When alert occurred
  resolved BOOLEAN DEFAULT false,        -- Whether issue is resolved
  created_at TIMESTAMP DEFAULT NOW(),    -- When alert was created
  resolved_at TIMESTAMP,                 -- When alert was resolved
  resolved_by TEXT                       -- Who/what resolved it
);

-- Indexes for efficient querying
CREATE INDEX idx_system_alerts_severity ON system_alerts(severity);
CREATE INDEX idx_system_alerts_resolved ON system_alerts(resolved);
CREATE INDEX idx_system_alerts_alert_type ON system_alerts(alert_type);
CREATE INDEX idx_system_alerts_timestamp ON system_alerts(timestamp DESC);
CREATE INDEX idx_system_alerts_component ON system_alerts(component);
```

---

## Monitoring Queries

### Dashboard Queries

#### 1. Current System Health
```sql
SELECT
  CASE
    WHEN COUNT(*) FILTER (WHERE severity = 'critical' AND resolved = false) > 0 THEN 'CRITICAL'
    WHEN COUNT(*) FILTER (WHERE severity = 'warning' AND resolved = false) > 5 THEN 'DEGRADED'
    ELSE 'HEALTHY'
  END as health_status,
  COUNT(*) FILTER (WHERE severity = 'critical' AND resolved = false) as critical_alerts,
  COUNT(*) FILTER (WHERE severity = 'warning' AND resolved = false) as warning_alerts
FROM system_alerts
WHERE timestamp > NOW() - INTERVAL '24 hours';
```

#### 2. Unresolved Critical Alerts
```sql
SELECT
  id,
  alert_type,
  message,
  context,
  metadata,
  timestamp,
  created_at
FROM system_alerts
WHERE severity = 'critical'
  AND resolved = false
ORDER BY timestamp DESC;
```

#### 3. Fallback Event History (Last 7 Days)
```sql
SELECT
  DATE(timestamp) as date,
  alert_type,
  COUNT(*) as event_count,
  COUNT(*) FILTER (WHERE severity = 'critical') as critical_count,
  COUNT(*) FILTER (WHERE severity = 'warning') as warning_count
FROM system_alerts
WHERE alert_type IN ('openrouter_key_rotation', 'emergency_fallback_activated')
  AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY DATE(timestamp), alert_type
ORDER BY date DESC;
```

#### 4. Key Failure Analysis
```sql
SELECT
  (metadata->>'failed_key_index')::int as key_index,
  COUNT(*) as failure_count,
  MAX(timestamp) as last_failure,
  AVG(EXTRACT(EPOCH FROM (NOW() - timestamp))) / 3600 as hours_since_last_failure
FROM system_alerts
WHERE alert_type = 'openrouter_key_rotation'
  AND timestamp > NOW() - INTERVAL '30 days'
GROUP BY metadata->>'failed_key_index'
ORDER BY failure_count DESC;
```

#### 5. Mean Time To Resolution (MTTR)
```sql
SELECT
  alert_type,
  COUNT(*) as total_resolved,
  ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - timestamp))) / 60, 2) as avg_resolution_minutes,
  ROUND(MIN(EXTRACT(EPOCH FROM (resolved_at - timestamp))) / 60, 2) as min_resolution_minutes,
  ROUND(MAX(EXTRACT(EPOCH FROM (resolved_at - timestamp))) / 60, 2) as max_resolution_minutes
FROM system_alerts
WHERE resolved = true
  AND resolved_at IS NOT NULL
  AND timestamp > NOW() - INTERVAL '30 days'
GROUP BY alert_type;
```

#### 6. Emergency Fallback Frequency
```sql
SELECT
  DATE_TRUNC('hour', timestamp) as hour,
  COUNT(*) as emergency_activations,
  STRING_AGG(DISTINCT metadata->>'provider', ', ') as providers_used
FROM system_alerts
WHERE alert_type = 'emergency_fallback_activated'
  AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', timestamp)
ORDER BY hour DESC;
```

---

## Alert Integration

### Slack Webhook Integration

Add to `ModelConfigResolver` or separate monitoring service:

```typescript
async function notifySlack(alert: SystemAlert): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  const emoji = alert.severity === 'critical' ? '🚨' : '⚠️';
  const color = alert.severity === 'critical' ? 'danger' : 'warning';

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attachments: [{
        color,
        title: `${emoji} ${alert.alert_type.replace(/_/g, ' ').toUpperCase()}`,
        text: alert.message,
        fields: [
          {
            title: 'Component',
            value: alert.component,
            short: true
          },
          {
            title: 'Severity',
            value: alert.severity.toUpperCase(),
            short: true
          },
          {
            title: 'Context',
            value: `\`\`\`${JSON.stringify(alert.context, null, 2)}\`\`\``,
            short: false
          },
          {
            title: 'Metadata',
            value: `\`\`\`${JSON.stringify(alert.metadata, null, 2)}\`\`\``,
            short: false
          }
        ],
        footer: 'CodeQual Model Selection Monitor',
        ts: Math.floor(new Date(alert.timestamp).getTime() / 1000)
      }]
    })
  });
}
```

### Email Notification (Supabase Edge Function)

```typescript
// supabase/functions/notify-critical-alerts/index.ts
import { createClient } from '@supabase/supabase-js'

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Get unresolved critical alerts
  const { data: alerts } = await supabase
    .from('system_alerts')
    .select('*')
    .eq('severity', 'critical')
    .eq('resolved', false)
    .eq('component', 'ModelConfigResolver')
    .order('created_at', { ascending: false })

  if (!alerts || alerts.length === 0) {
    return new Response('No critical alerts')
  }

  // Send email for each critical alert
  for (const alert of alerts) {
    await sendEmail({
      to: 'ops@codequal.com',
      subject: `🚨 CRITICAL: ${alert.alert_type}`,
      body: `
Alert Type: ${alert.alert_type}
Severity: ${alert.severity}
Component: ${alert.component}
Message: ${alert.message}
Timestamp: ${alert.timestamp}

Context:
${JSON.stringify(alert.context, null, 2)}

Metadata:
${JSON.stringify(alert.metadata, null, 2)}

View in Dashboard:
https://app.codequal.com/monitoring/alerts/${alert.id}
      `
    })
  }

  return new Response('Notifications sent')
})
```

---

## Alert Resolution

### Manual Resolution

```sql
-- Mark specific alert as resolved
UPDATE system_alerts
SET
  resolved = true,
  resolved_at = NOW(),
  resolved_by = 'admin@codequal.com'
WHERE id = 'alert-uuid-here';
```

### Automatic Resolution

Add to `ModelConfigResolver`:

```typescript
/**
 * Mark OpenRouter key rotation alerts as resolved
 * Call this after successful OpenRouter operation
 */
async resolveOpenRouterAlerts(): Promise<void> {
  try {
    const { error } = await this.supabase
      .from('system_alerts')
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: 'system'
      })
      .eq('alert_type', 'openrouter_key_rotation')
      .eq('resolved', false)
      .lt('timestamp', new Date(Date.now() - 3600000).toISOString()); // Older than 1 hour

    if (error) {
      this.log('error', 'Failed to resolve OpenRouter alerts', error);
    } else {
      this.log('info', 'Resolved old OpenRouter key rotation alerts');
    }
  } catch (err) {
    this.log('error', 'Exception resolving alerts', err);
  }
}

/**
 * Mark emergency fallback alerts as resolved
 * Call this after OpenRouter keys are restored
 */
async resolveEmergencyFallbackAlerts(): Promise<void> {
  try {
    // Reset failed keys tracking
    this.resetFailedKeys();

    const { error } = await this.supabase
      .from('system_alerts')
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: 'system'
      })
      .eq('alert_type', 'emergency_fallback_activated')
      .eq('resolved', false);

    if (error) {
      this.log('error', 'Failed to resolve emergency fallback alerts', error);
    } else {
      this.log('info', '✅ Emergency fallback alerts resolved - OpenRouter restored');
    }
  } catch (err) {
    this.log('error', 'Exception resolving emergency alerts', err);
  }
}
```

---

## Grafana Dashboard Configuration

### Panel 1: System Health Status

**Query:**
```sql
SELECT
  CASE
    WHEN COUNT(*) FILTER (WHERE severity = 'critical' AND resolved = false) > 0 THEN 3
    WHEN COUNT(*) FILTER (WHERE severity = 'warning' AND resolved = false) > 5 THEN 2
    ELSE 1
  END as health_value,
  CASE
    WHEN COUNT(*) FILTER (WHERE severity = 'critical' AND resolved = false) > 0 THEN 'CRITICAL'
    WHEN COUNT(*) FILTER (WHERE severity = 'warning' AND resolved = false) > 5 THEN 'DEGRADED'
    ELSE 'HEALTHY'
  END as health_status
FROM system_alerts
WHERE timestamp > NOW() - INTERVAL '1 hour';
```

**Panel Type:** Stat
**Thresholds:**
- Green (1): HEALTHY
- Yellow (2): DEGRADED
- Red (3): CRITICAL

---

### Panel 2: Fallback Events Timeline

**Query:**
```sql
SELECT
  timestamp,
  alert_type,
  severity,
  message
FROM system_alerts
WHERE alert_type IN ('openrouter_key_rotation', 'emergency_fallback_activated')
  AND $__timeFilter(timestamp)
ORDER BY timestamp DESC;
```

**Panel Type:** Table
**Time Range:** Last 24 hours

---

### Panel 3: Key Failure Rate

**Query:**
```sql
SELECT
  DATE_TRUNC('minute', timestamp) as time,
  COUNT(*) as failures
FROM system_alerts
WHERE alert_type = 'openrouter_key_rotation'
  AND $__timeFilter(timestamp)
GROUP BY DATE_TRUNC('minute', timestamp)
ORDER BY time;
```

**Panel Type:** Graph
**Alert Rule:** More than 10 failures in 10 minutes

---

### Panel 4: Active Critical Alerts

**Query:**
```sql
SELECT
  COUNT(*) as critical_count
FROM system_alerts
WHERE severity = 'critical'
  AND resolved = false
  AND timestamp > NOW() - INTERVAL '24 hours';
```

**Panel Type:** Stat
**Alert Rule:** > 0 critical alerts

---

## Operational Runbooks

### Runbook 1: Level 1 Fallback (Single Key Failure)

**Trigger:** `openrouter_key_rotation` alert received
**Severity:** Warning
**Response Time:** Within 4 hours

**Steps:**
1. ✅ **Acknowledge Alert** - Log in monitoring dashboard
2. ✅ **Check Key Status** - Verify which key failed (metadata.failed_key_index)
3. ✅ **Test Failed Key** - Manual API test to OpenRouter
4. ✅ **Determine Cause:**
   - Invalid/expired key → Refresh key
   - Rate limit → Wait or upgrade plan
   - OpenRouter outage → Monitor status page
5. ✅ **Update Key** - Replace in `.env` if needed
6. ✅ **Verify Resolution** - Test with new key
7. ✅ **Mark Resolved** - Update alert in Supabase

---

### Runbook 2: Level 2 Emergency Fallback (All Keys Failed)

**Trigger:** `emergency_fallback_activated` alert received
**Severity:** Critical
**Response Time:** Immediate (< 30 minutes)

**Steps:**
1. 🚨 **Immediate Acknowledgement** - Page on-call engineer
2. 🚨 **Check OpenRouter Status:**
   - Visit: https://status.openrouter.ai
   - Check Twitter: @OpenRouterAI
3. 🚨 **Verify All Keys:**
   ```bash
   # Test each key
   for key in $OPENROUTER_API_KEYS; do
     curl -H "Authorization: Bearer $key" \
          https://openrouter.ai/api/v1/models
   done
   ```
4. 🚨 **Monitor Emergency Provider:**
   - Check Gemini/Claude API status
   - Verify costs (emergency may be more expensive)
   - Review performance (may be suboptimal)
5. 🚨 **Restore OpenRouter (Priority):**
   - Refresh all keys if expired
   - Contact OpenRouter support if service issue
   - Add more keys if rate limited
6. ✅ **Verify Normal Operation:**
   ```bash
   # Test model configuration
   npx ts-node -e "
   import { ModelConfigResolver } from './src/standard/orchestrator/model-config-resolver';
   const resolver = new ModelConfigResolver(console);
   resolver.getModelConfiguration('security', 'java', 'large')
     .then(config => {
       console.log('Emergency mode:', config.isEmergencyFallback);
       console.log('Provider:', config.primary_provider);
     });
   "
   ```
7. ✅ **Resolve Alerts:**
   ```typescript
   await resolver.resolveEmergencyFallbackAlerts();
   ```
8. ✅ **Post-Incident Review:**
   - Document root cause
   - Update monitoring thresholds if needed
   - Improve runbook if gaps found

---

## Performance Metrics

### Key Metrics to Track

1. **Fallback Frequency**
   - Target: < 1 Level 1 event per day
   - Target: 0 Level 2 events per week

2. **Mean Time To Detection (MTTD)**
   - Target: < 1 minute (automated alerting)

3. **Mean Time To Resolution (MTTR)**
   - Level 1: < 4 hours
   - Level 2: < 30 minutes

4. **Alert Accuracy**
   - False Positive Rate: < 5%
   - False Negative Rate: 0%

---

## Testing

### Test Level 1 Fallback

```bash
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents

# Temporarily set invalid key to trigger fallback
export OPENROUTER_API_KEYS="invalid-key-1,${OPENROUTER_API_KEY}"

# Run test
npx ts-node -e "
import { ModelConfigResolver } from './src/standard/orchestrator/model-config-resolver';
const resolver = new ModelConfigResolver(console);
resolver.getModelConfiguration('test_role', 'python', 'medium')
  .then(config => console.log('✅ Fallback successful:', config.primary_model))
  .catch(err => console.error('❌ Fallback failed:', err.message));
"

# Expected: Warning logs, rotation to valid key, success
# Check Supabase for warning alert
```

### Test Level 2 Emergency Fallback

```bash
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents

# Set all keys to invalid
export OPENROUTER_API_KEYS="invalid-1,invalid-2,invalid-3"

# Ensure emergency fallback configured
export EMERGENCY_FALLBACK_PROVIDER=gemini
export GOOGLE_API_KEY=your-valid-gemini-key

# Run test
npx ts-node -e "
import { ModelConfigResolver } from './src/standard/orchestrator/model-config-resolver';
const resolver = new ModelConfigResolver(console);
resolver.getModelConfiguration('test_role', 'javascript', 'small')
  .then(config => {
    console.log('✅ Emergency fallback activated');
    console.log('Provider:', config.primary_provider);
    console.log('Model:', config.primary_model);
    console.log('Is Emergency:', config.isEmergencyFallback);
  });
"

# Expected: Critical error logs, emergency provider activation
# Check Supabase for critical alert
```

---

## Configuration

### Environment Variables

```bash
# OpenRouter Keys (comma-separated for rotation)
OPENROUTER_API_KEYS=key1,key2,key3

# Emergency Fallback
EMERGENCY_FALLBACK_PROVIDER=gemini  # or anthropic, openai
GOOGLE_API_KEY=your-gemini-key

# Monitoring (Optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
ALERT_EMAIL=ops@codequal.com
```

### Supabase Setup

```sql
-- Run in Supabase SQL Editor to create alerts table
\i /Users/alpinro/Code\ Prjects/codequal/docs/monitoring/schema/system-alerts-table.sql
```

---

## Related Documentation

- [Complete Model Selection Architecture](/tmp/COMPLETE_MODEL_SELECTION_ARCHITECTURE.md)
- [Two-Level Fallback Implementation](/tmp/TWO_LEVEL_FALLBACK_IMPLEMENTATION_COMPLETE.md)
- [Production Monitoring Plan](./production-monitoring-plan.md)
- [Grafana Setup Guide](./grafana-setup-guide.md)

---

## Changelog

### October 6, 2025
- ✅ Initial implementation
- ✅ Two-level fallback strategy
- ✅ Logging and alert generation
- ✅ Supabase integration
- ✅ Runbook creation
- ✅ Test procedures documented

---

**Status:** ✅ Production Ready
**Last Updated:** October 6, 2025
**Owner:** Platform Engineering Team
