#!/bin/bash

# Check current data in the security monitoring tables

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Checking current security monitoring data${NC}"

# Load environment variables
if [ -f ".env" ]; then
    set -a
    source .env
    set +a
else
    echo -e "${RED}❌ No .env file found${NC}"
    exit 1
fi

# Use environment variable for database password
DB_HOST="${SUPABASE_DB_HOST:-aws-0-us-west-1.pooler.supabase.com}"
DB_PORT="${SUPABASE_DB_PORT:-6543}"
DB_NAME="${SUPABASE_DB_NAME:-postgres}"
DB_USER="${SUPABASE_DB_USER:-postgres.ftjhmbbcuqjqmmbaymqb}"
DB_PASSWORD="${SUPABASE_DB_PASSWORD}"

export PGPASSWORD="$DB_PASSWORD"
export PGSSLMODE="require"
export PGGSSENCMODE="disable"

echo -e "${BLUE}📊 Security Events Summary (Last 24 hours)${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- Summary of security events
SELECT 
    type as event_type,
    severity,
    COUNT(*) as count,
    MIN(timestamp) as earliest,
    MAX(timestamp) as latest
FROM security_events
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY type, severity
ORDER BY type, severity;

-- Check for specific event types
SELECT 
    'Total Events' as metric,
    COUNT(*) as value
FROM security_events
WHERE timestamp > NOW() - INTERVAL '24 hours'
UNION ALL
SELECT 
    'AUTH_SUCCESS Events',
    COUNT(*)
FROM security_events
WHERE timestamp > NOW() - INTERVAL '24 hours' AND type = 'AUTH_SUCCESS'
UNION ALL
SELECT 
    'AUTH_FAILURE Events',
    COUNT(*)
FROM security_events
WHERE timestamp > NOW() - INTERVAL '24 hours' AND type = 'AUTH_FAILURE'
UNION ALL
SELECT 
    'High Severity Events',
    COUNT(*)
FROM security_events
WHERE timestamp > NOW() - INTERVAL '24 hours' AND severity IN ('high', 'critical');

-- Check unique users
SELECT 
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT ip_address) as unique_ips,
    COUNT(DISTINCT session_id) as unique_sessions
FROM security_events
WHERE timestamp > NOW() - INTERVAL '24 hours';

-- Check for test data
SELECT 
    'Test Data Events' as source,
    COUNT(*) as count
FROM security_events
WHERE details->>'source' IN ('test_data', 'brute_force_test', 'test_threat');
EOF

echo ""
echo -e "${BLUE}👥 User Profiles${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
SELECT 
    substring(id::text, 1, 8) as user_id_prefix,
    email,
    name,
    subscription_tier,
    status
FROM user_profiles
ORDER BY created_at DESC
LIMIT 10;
EOF

echo ""
echo -e "${BLUE}⏱️ Rate Limits${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
SELECT 
    substring(user_id::text, 1, 8) as user_id_prefix,
    operation,
    count,
    reset_time,
    CASE 
        WHEN reset_time > NOW() THEN 'Active'
        ELSE 'Expired'
    END as status
FROM rate_limits
ORDER BY last_request DESC
LIMIT 10;
EOF
