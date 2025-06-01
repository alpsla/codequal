# Grafana Dashboard Validation Guide

**Date**: June 1, 2025  
**Status**: Test data regenerated with proper time distribution

## ✅ Test Data Successfully Generated

### Current Event Distribution (Last Hour)
- **AUTH_SUCCESS**: 19 events (low severity)
- **AUTH_FAILURE**: 22 events (6 medium, 16 high severity)
- **RATE_LIMIT_HIT**: 7 events (6 medium, 1 high severity)
- **PERMISSION_ESCALATION**: 1 event (critical severity)

### Authentication Metrics
- **Success Rate**: ~46% (19 successes / 41 total auth attempts)
- **Failed Logins**: 22 in the last hour
- **Active Users**: 4 test users
- **Brute Force Attack**: 10 consecutive failures from attacker IP

## 🔍 Grafana Dashboard Checks

### 1. **Access Dashboard**
- URL: https://alpsla.grafana.net
- Dashboard: "CodeQual Security Monitoring"

### 2. **Time Range Settings**
Try these time ranges:
- **Last 1 hour** - Should show recent activity including failures
- **Last 3 hours** - Shows broader pattern
- **Last 6 hours** - Shows all test data

### 3. **Expected Panel Values**

#### Authentication Success Rate
- Should show **~46%** for last hour (not 100%)
- Formula: AUTH_SUCCESS / (AUTH_SUCCESS + AUTH_FAILURE) × 100

#### Failed Logins
- Should show **22** for last hour
- Includes both medium and high severity failures

#### Active Users
- Should show **4** unique users

#### Active Threats
- Should show at least **1** (permission escalation)
- May show more if detecting brute force pattern

#### Security Event Timeline
- Should show spikes of AUTH_FAILURE events
- Brute force attack visible ~30 minutes ago

#### Rate Limit Usage
- Should show 3 users with active rate limits
- Values: 85/100, 450/500, 2500/5000

## 🛠️ Troubleshooting

### If AUTH_FAILURE still shows 0:
1. **Check time range** - Ensure it includes last hour
2. **Refresh dashboard** - Press F5 or click refresh icon
3. **Check panel query** - Should filter for `type = 'AUTH_FAILURE'`

### Panel Query Reference
```sql
-- Failed Logins Query
SELECT COUNT(*) 
FROM security_events 
WHERE type = 'AUTH_FAILURE' 
  AND timestamp > NOW() - INTERVAL '1 hour';
```

### If data seems stale:
1. Check Grafana's query inspector (click panel title → Inspect → Query)
2. Verify database connection is active
3. Check for any error messages in panel

## 📊 Next Steps

1. **Verify all panels** show expected data
2. **Test time range changes** to see historical data
3. **Check alert rules** if configured
4. **Export dashboard** if everything looks good

## 🔗 Quick Commands

```bash
# Check current data distribution
psql "postgresql://postgres.ftjhmbbcuqjqmmbaymqb:N68PNdrl3KkjLBc2@aws-0-us-west-1.pooler.supabase.com:6543/postgres?sslmode=require" \
  -c "SELECT type, COUNT(*) FROM security_events WHERE timestamp > NOW() - INTERVAL '1 hour' GROUP BY type;"

# Regenerate test data if needed
./scripts/regenerate-test-data.sh
```
