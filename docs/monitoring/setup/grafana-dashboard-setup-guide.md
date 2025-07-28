# Grafana Dashboard Setup Guide

## Step 1: Configure Data Source

1. Go to **Configuration** → **Data Sources**
2. Look for your Supabase PostgreSQL connection
3. If not exists, click **"Add data source"** → **PostgreSQL**
4. Use these settings:

```
Host: ftjhmbbcuqjqmmbaymqb.supabase.co:5432
Database: postgres
User: postgres
Password: [Your Supabase database password]
SSL Mode: require
Version: 15.x
```

## Step 2: Create Dashboard Structure

### Dashboard Settings
1. Click dashboard settings (gear icon)
2. Set name: **"CodeQual Security Monitoring"**
3. Set tags: `security`, `authentication`, `monitoring`
4. Set refresh: **30s**

## Step 3: Add Panels

### Panel 1: Authentication Success Rate (Gauge)

**Panel Type**: Gauge  
**Title**: Auth Success Rate  
**Position**: Row 1, Left (width: 6)

**Query**:
```sql
SELECT 
  ROUND(
    COUNT(CASE WHEN type = 'AUTH_SUCCESS' THEN 1 END)::numeric * 100 / 
    NULLIF(COUNT(*), 0), 2
  ) as success_rate
FROM security_events
WHERE timestamp > NOW() - INTERVAL '1 hour'
  AND type IN ('AUTH_SUCCESS', 'AUTH_FAILURE');
```

**Panel Settings**:
- Unit: Percent (0-100)
- Thresholds: 
  - 0-70: Red
  - 70-90: Yellow
  - 90-100: Green
- Display: Show threshold markers

---

### Panel 2: Active Users (Stat)

**Panel Type**: Stat  
**Title**: Active Users (24h)  
**Position**: Row 1, Center-Left (width: 6)

**Query**:
```sql
SELECT COUNT(DISTINCT user_id) as active_users
FROM security_events
WHERE timestamp > NOW() - INTERVAL '24 hours'
  AND type = 'AUTH_SUCCESS';
```

**Panel Settings**:
- Unit: short
- Color mode: Background
- Graph mode: None
- Text size: Title and value

---

### Panel 3: Failed Logins (Stat)

**Panel Type**: Stat  
**Title**: Failed Logins (1h)  
**Position**: Row 1, Center-Right (width: 6)

**Query**:
```sql
SELECT COUNT(*) as failed_logins
FROM security_events
WHERE timestamp > NOW() - INTERVAL '1 hour'
  AND type = 'AUTH_FAILURE';
```

**Panel Settings**:
- Unit: short
- Color mode: Background
- Thresholds:
  - 0-10: Green
  - 10-50: Yellow
  - 50+: Red

---

### Panel 4: Active Threats (Stat)

**Panel Type**: Stat  
**Title**: Active Threats  
**Position**: Row 1, Right (width: 6)

**Query**:
```sql
SELECT COUNT(DISTINCT 
  CASE 
    WHEN severity IN ('high', 'critical') THEN event_id 
  END
) as active_threats
FROM security_events
WHERE timestamp > NOW() - INTERVAL '1 hour'
  AND severity IN ('high', 'critical');
```

**Panel Settings**:
- Unit: short
- Color mode: Background
- Thresholds:
  - 0: Green
  - 1-5: Yellow
  - 5+: Red

---

### Panel 5: Authentication Timeline (Time Series)

**Panel Type**: Time series  
**Title**: Authentication Events  
**Position**: Row 2, Full width (width: 24)

**Query**:
```sql
SELECT 
  date_trunc('minute', timestamp) as time,
  COUNT(CASE WHEN type = 'AUTH_SUCCESS' THEN 1 END) as "Successful",
  COUNT(CASE WHEN type = 'AUTH_FAILURE' THEN 1 END) as "Failed"
FROM security_events
WHERE timestamp > NOW() - INTERVAL '1 hour'
  AND type IN ('AUTH_SUCCESS', 'AUTH_FAILURE')
GROUP BY time
ORDER BY time;
```

**Panel Settings**:
- Legend: Show as table, to the right
- Line width: 2
- Fill opacity: 10
- Colors:
  - Successful: Green
  - Failed: Red
- Y-axis: Logins per minute

---

### Panel 6: Top Failed Login IPs (Table)

**Panel Type**: Table  
**Title**: Top Failed Login Sources  
**Position**: Row 3, Left (width: 12)

**Query**:
```sql
SELECT 
  ip_address as "IP Address",
  COUNT(*) as "Failed Attempts",
  MAX(timestamp) as "Last Attempt",
  string_agg(DISTINCT user_agent, ', ') as "User Agents"
FROM security_events
WHERE type = 'AUTH_FAILURE'
  AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY ip_address
ORDER BY COUNT(*) DESC
LIMIT 10;
```

**Panel Settings**:
- Column styles:
  - Failed Attempts: Cell type = Colored background, Thresholds 5/10/20
  - Last Attempt: Unit = Date & time
- Enable pagination
- Rows per page: 10

---

### Panel 7: Security Events by Type (Pie Chart)

**Panel Type**: Pie chart  
**Title**: Security Event Distribution  
**Position**: Row 3, Right (width: 12)

**Query**:
```sql
SELECT 
  type as "Event Type",
  COUNT(*) as "Count"
FROM security_events
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY type
ORDER BY COUNT(*) DESC;
```

**Panel Settings**:
- Legend: Show with values
- Display labels: On graph
- Tooltip: All series
- Pie type: Donut

---

### Panel 8: Rate Limit Usage (Bar Gauge)

**Panel Type**: Bar gauge  
**Title**: Users Approaching Rate Limits  
**Position**: Row 4, Left (width: 12)

**Query**:
```sql
SELECT 
  u.email as "User",
  ROUND(rl.count::numeric * 100 / 
    CASE 
      WHEN u.subscription_tier = 'free' THEN 100
      WHEN u.subscription_tier = 'pro' THEN 1000
      ELSE 10000
    END, 2
  ) as "Usage %"
FROM rate_limits rl
JOIN user_profiles u ON rl.user_id = u.id
WHERE rl.reset_time > NOW()
  AND rl.count::numeric / 
    CASE 
      WHEN u.subscription_tier = 'free' THEN 100
      WHEN u.subscription_tier = 'pro' THEN 1000
      ELSE 10000
    END > 0.5
ORDER BY "Usage %" DESC
LIMIT 10;
```

**Panel Settings**:
- Orientation: Horizontal
- Display mode: Gradient
- Thresholds:
  - 0-50: Green
  - 50-80: Yellow
  - 80-100: Red

---

### Panel 9: Organization Activity (Table)

**Panel Type**: Table  
**Title**: Organization Activity Summary  
**Position**: Row 4, Right (width: 12)

**Query**:
```sql
SELECT 
  o.name as "Organization",
  o.subscription_tier as "Tier",
  COUNT(DISTINCT se.user_id) as "Active Users",
  COUNT(CASE WHEN se.type = 'AUTH_SUCCESS' THEN 1 END) as "Logins",
  COUNT(CASE WHEN se.type = 'AUTH_FAILURE' THEN 1 END) as "Failed"
FROM organizations o
LEFT JOIN user_profiles u ON u.primary_organization_id = o.id
LEFT JOIN security_events se ON se.user_id = u.id 
  AND se.timestamp > NOW() - INTERVAL '24 hours'
GROUP BY o.id, o.name, o.subscription_tier
ORDER BY "Active Users" DESC;
```

**Panel Settings**:
- Column width: Auto
- Cell display mode: Color background by value
- Enable sorting

---

### Panel 10: Recent Security Alerts (Logs)

**Panel Type**: Logs  
**Title**: Recent Security Alerts  
**Position**: Row 5, Full width (width: 24)

**Query**:
```sql
SELECT 
  timestamp as time,
  severity,
  type,
  COALESCE(u.email, 'Unknown') as user_email,
  ip_address,
  details::text as details
FROM security_events se
LEFT JOIN user_profiles u ON se.user_id = u.id
WHERE severity IN ('high', 'critical')
  AND timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC
LIMIT 50;
```

**Panel Settings**:
- Show time
- Wrap lines
- Order: Newest first
- Deduplication: Signature

## Step 4: Add Dashboard Variables

### Variable 1: Time Range
1. Dashboard Settings → Variables → Add variable
2. Name: `timeRange`
3. Type: Interval
4. Values: `1h,6h,12h,24h,7d,30d`

### Variable 2: Organization Filter
1. Add variable
2. Name: `organization`
3. Type: Query
4. Data source: Your PostgreSQL
5. Query:
```sql
SELECT name FROM organizations ORDER BY name;
```
6. Multi-value: Yes
7. Include All option: Yes

### Variable 3: Event Type
1. Add variable
2. Name: `eventType`
3. Type: Custom
4. Values: `AUTH_SUCCESS,AUTH_FAILURE,ACCESS_DENIED,PERMISSION_ESCALATION,RATE_LIMIT_HIT`
5. Multi-value: Yes

## Step 5: Configure Alerts

### Alert 1: High Failed Login Rate
1. Edit Panel 5 (Authentication Timeline)
2. Go to Alert tab
3. Create alert:
   - Name: High Failed Login Rate
   - Evaluate every: 1m
   - For: 5m
   - Conditions: WHEN avg() OF query(B) IS ABOVE 10
   - Send to: Your notification channel

### Alert 2: Critical Security Event
1. Add new panel (hidden)
2. Query:
```sql
SELECT COUNT(*) 
FROM security_events 
WHERE severity = 'critical' 
  AND timestamp > NOW() - INTERVAL '5 minutes';
```
3. Alert when value > 0

## Step 6: Save and Share

1. Click **Save dashboard** (💾 icon)
2. Add description: "Comprehensive security monitoring for CodeQual authentication system"
3. Save

### Sharing Options:
- Click Share → Link
- Create snapshot for sharing
- Export JSON for backup

## Dashboard JSON Template

You can also import this complete dashboard JSON:

```json
{
  "dashboard": {
    "title": "CodeQual Security Monitoring",
    "tags": ["security", "authentication", "monitoring"],
    "timezone": "browser",
    "refresh": "30s",
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "panels": [
      // All panels configured above
    ]
  }
}
```

## Troubleshooting Tips

1. **No data showing?**
   - Check PostgreSQL connection
   - Verify table names match your schema
   - Ensure time range includes data

2. **Queries timing out?**
   - Add indexes on timestamp columns
   - Reduce time range
   - Optimize queries with EXPLAIN

3. **Permission errors?**
   - Check database user permissions
   - Verify RLS policies

## Next Steps

1. Test each panel with real data
2. Adjust thresholds based on your traffic
3. Set up notification channels
4. Create additional dashboards for specific use cases
5. Schedule regular reviews of security metrics
