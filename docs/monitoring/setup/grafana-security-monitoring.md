# Grafana Security Monitoring Setup

**Date**: May 31, 2025  
**Status**: Grafana Already Integrated with Supabase  
**Next Step**: Create Authentication-Specific Dashboards

## 📊 Current Grafana Setup

Your Grafana instance is already connected to Supabase with:
- **URL**: https://alpsla.grafana.net
- **Organization ID**: 1
- **Supabase Access Token**: Configured in .env

## 🔒 Security Monitoring Dashboards Available

### 1. **Authentication Monitoring Dashboard**
Monitor real-time authentication activity:
- Authentication success/failure rates
- Failed login attempts by IP address
- Session activity patterns
- User registration trends

### 2. **Security Threat Dashboard**
Track security threats and anomalies:
- Brute force attack detection
- Session hijacking attempts
- Permission escalation events
- Impossible travel alerts
- DDoS attack patterns

### 3. **Rate Limiting Dashboard**
Monitor API usage and limits:
- Requests per user/organization
- Rate limit violations
- Quota usage by subscription tier
- API endpoint performance

### 4. **Audit Trail Dashboard**
Comprehensive security event tracking:
- Security event timeline
- User activity logs
- Repository access patterns
- Administrative actions

## 📈 SQL Queries for Grafana Dashboards

Since Grafana is connected to your Supabase PostgreSQL database, you can create panels using these queries:

### Authentication Metrics
```sql
-- Authentication success rate (last hour)
SELECT 
  date_trunc('minute', timestamp) as time,
  COUNT(CASE WHEN type = 'AUTH_SUCCESS' THEN 1 END) as success,
  COUNT(CASE WHEN type = 'AUTH_FAILURE' THEN 1 END) as failure,
  ROUND(
    COUNT(CASE WHEN type = 'AUTH_SUCCESS' THEN 1 END)::numeric * 100 / 
    NULLIF(COUNT(*), 0), 2
  ) as success_rate
FROM security_events
WHERE timestamp > NOW() - INTERVAL '1 hour'
  AND type IN ('AUTH_SUCCESS', 'AUTH_FAILURE')
GROUP BY time
ORDER BY time;
```

### Failed Login Attempts by IP
```sql
-- Top 10 IP addresses with failed logins
SELECT 
  ip_address,
  COUNT(*) as failed_attempts,
  MAX(timestamp) as last_attempt
FROM security_events
WHERE type = 'AUTH_FAILURE'
  AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY ip_address
ORDER BY failed_attempts DESC
LIMIT 10;
```

### Active Threats
```sql
-- Current active security threats
SELECT 
  type,
  severity,
  COUNT(*) as count,
  array_agg(DISTINCT user_id) as affected_users
FROM security_events
WHERE severity IN ('high', 'critical')
  AND timestamp > NOW() - INTERVAL '1 hour'
GROUP BY type, severity
ORDER BY 
  CASE severity 
    WHEN 'critical' THEN 1 
    WHEN 'high' THEN 2 
    ELSE 3 
  END;
```

### Rate Limiting Status
```sql
-- Users approaching rate limits
SELECT 
  u.email,
  u.subscription_tier,
  rl.operation,
  rl.count,
  rl.reset_time,
  CASE 
    WHEN u.subscription_tier = 'free' THEN 100
    WHEN u.subscription_tier = 'pro' THEN 1000
    ELSE 10000
  END as limit,
  ROUND(rl.count::numeric * 100 / 
    CASE 
      WHEN u.subscription_tier = 'free' THEN 100
      WHEN u.subscription_tier = 'pro' THEN 1000
      ELSE 10000
    END, 2
  ) as usage_percentage
FROM rate_limits rl
JOIN user_profiles u ON rl.user_id = u.id
WHERE rl.reset_time > NOW()
ORDER BY usage_percentage DESC
LIMIT 20;
```

### Organization Activity
```sql
-- Organization authentication activity
SELECT 
  o.name as organization,
  o.subscription_tier,
  COUNT(DISTINCT se.user_id) as active_users,
  COUNT(se.*) as total_events,
  COUNT(CASE WHEN se.type = 'AUTH_SUCCESS' THEN 1 END) as successful_logins,
  COUNT(CASE WHEN se.type = 'AUTH_FAILURE' THEN 1 END) as failed_logins
FROM organizations o
JOIN user_profiles u ON u.primary_organization_id = o.id
JOIN security_events se ON se.user_id = u.id
WHERE se.timestamp > NOW() - INTERVAL '24 hours'
GROUP BY o.id, o.name, o.subscription_tier
ORDER BY total_events DESC;
```

## 🚨 Alert Rules to Configure

### 1. **Brute Force Detection**
```sql
-- Alert when > 5 failed logins in 5 minutes from same IP
SELECT COUNT(*) 
FROM security_events 
WHERE type = 'AUTH_FAILURE' 
  AND ip_address = $ip_address 
  AND timestamp > NOW() - INTERVAL '5 minutes'
HAVING COUNT(*) > 5;
```

### 2. **Suspicious Activity**
```sql
-- Alert on high risk scores
SELECT * 
FROM security_events 
WHERE risk_score > 90 
  AND timestamp > NOW() - INTERVAL '5 minutes';
```

### 3. **Rate Limit Violations**
```sql
-- Alert when users hit rate limits
SELECT u.email, rl.operation 
FROM rate_limits rl
JOIN user_profiles u ON rl.user_id = u.id
WHERE rl.count >= 
  CASE 
    WHEN u.subscription_tier = 'free' THEN 100
    WHEN u.subscription_tier = 'pro' THEN 1000
    ELSE 10000
  END;
```

## 🛠️ Quick Setup Steps

1. **Create New Dashboard in Grafana**
   - Log in to https://alpsla.grafana.net
   - Create new dashboard
   - Add PostgreSQL data source panels

2. **Import Pre-built Queries**
   - Use the SQL queries above
   - Set appropriate refresh intervals
   - Configure thresholds for alerts

3. **Set Up Alerts**
   - Configure alert rules for critical events
   - Set up notification channels (Slack, email)
   - Test alert triggering

4. **Create Variables**
   - Time range selector
   - Organization filter
   - User filter
   - Event type filter

## 📱 Recommended Dashboard Layout

### Row 1: Overview Stats
- Total Users (Stat Panel)
- Active Sessions (Stat Panel)
- Auth Success Rate (Gauge)
- Current Threats (Stat Panel)

### Row 2: Time Series
- Authentication Events Over Time (Graph)
- Failed Login Attempts (Graph)
- Rate Limit Usage (Graph)

### Row 3: Tables
- Top Failed IPs (Table)
- Recent Security Events (Table)
- Active User Sessions (Table)

### Row 4: Detailed Analysis
- Security Events by Type (Pie Chart)
- Geographic Distribution (World Map)
- User Activity Heatmap

## 🔗 Direct Dashboard Links

Once created, your dashboards will be available at:
- Main Dashboard: `https://alpsla.grafana.net/d/codequal-auth/authentication-monitoring`
- Security Threats: `https://alpsla.grafana.net/d/codequal-security/security-threats`
- Rate Limiting: `https://alpsla.grafana.net/d/codequal-rates/rate-limiting`

## 💡 Pro Tips

1. **Use Grafana Variables**
   ```sql
   -- Create variable for organization filter
   SELECT DISTINCT name FROM organizations ORDER BY name;
   ```

2. **Enable Row-Level Security**
   - Queries automatically respect Supabase RLS
   - Users only see their organization's data

3. **Performance Optimization**
   - Add time range filters to all queries
   - Create indexes on frequently queried columns
   - Use materialized views for complex aggregations

4. **Real-time Updates**
   - Set dashboard refresh to 30s for real-time monitoring
   - Use Supabase real-time subscriptions for instant alerts

## 🚀 Next Steps

1. Log in to Grafana and create the authentication dashboard
2. Import the SQL queries provided
3. Configure alerts for critical security events
4. Test the dashboards with real authentication data
5. Share dashboards with your security team

---

**Note**: All SQL queries are optimized for PostgreSQL 15.x and respect Supabase Row-Level Security policies.