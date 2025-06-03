#!/bin/bash

# Clean up and regenerate test data with better time distribution

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧹 Cleaning and regenerating test data with better distribution${NC}"

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

echo -e "${YELLOW}Step 1: Cleaning existing test data...${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- Delete test security events
DELETE FROM security_events 
WHERE details->>'source' IN ('test_data', 'brute_force_test', 'test_threat')
   OR user_id IN (
       '11111111-1111-1111-1111-111111111111',
       '22222222-2222-2222-2222-222222222222',
       '33333333-3333-3333-3333-333333333333',
       '44444444-4444-4444-4444-444444444444'
   );

-- Delete test rate limits
DELETE FROM rate_limits 
WHERE user_id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444'
);

-- Delete test users from user_profiles
DELETE FROM user_profiles 
WHERE id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444'
);

-- Delete test users from auth.users
DELETE FROM auth.users 
WHERE id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444'
);

SELECT 'Test data cleaned!' as status;
EOF

echo -e "${GREEN}Step 2: Generating new test data with better time distribution...${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- Create test users
DO $$
BEGIN
    -- Create test users in auth.users if they don't exist
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = '11111111-1111-1111-1111-111111111111') THEN
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, instance_id, aud, role)
        VALUES 
            ('11111111-1111-1111-1111-111111111111', 'test.user1@example.com', crypt('testpass123', gen_salt('bf')), NOW(), NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
            ('22222222-2222-2222-2222-222222222222', 'test.user2@example.com', crypt('testpass123', gen_salt('bf')), NOW(), NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
            ('33333333-3333-3333-3333-333333333333', 'test.user3@example.com', crypt('testpass123', gen_salt('bf')), NOW(), NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
            ('44444444-4444-4444-4444-444444444444', 'test.attacker@malicious.com', crypt('testpass123', gen_salt('bf')), NOW(), NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');
    END IF;
END $$;

-- Create user profiles
INSERT INTO user_profiles (id, email, name, subscription_tier, status, role, organizations, metadata)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'test.user1@example.com', 'Test User 1', 'free', 'active', 'user', '{}', '{"test": true}'),
    ('22222222-2222-2222-2222-222222222222', 'test.user2@example.com', 'Test User 2', 'pro', 'active', 'user', '{}', '{"test": true}'),
    ('33333333-3333-3333-3333-333333333333', 'test.user3@example.com', 'Test User 3', 'enterprise', 'active', 'admin', '{}', '{"test": true}'),
    ('44444444-4444-4444-4444-444444444444', 'test.attacker@malicious.com', 'Attacker', 'free', 'suspended', 'user', '{}', '{"test": true, "suspicious": true}')
ON CONFLICT (id) DO NOTHING;

-- Generate events with better time distribution
DO $$
DECLARE
    i INTEGER;
    user_id UUID;
    event_type security_event_type;
    severity security_severity;
    ip_addr TEXT;
    time_offset INTERVAL;
    user_ids UUID[] := ARRAY['11111111-1111-1111-1111-111111111111'::uuid, 
                             '22222222-2222-2222-2222-222222222222'::uuid, 
                             '33333333-3333-3333-3333-333333333333'::uuid];
    ip_addresses TEXT[] := ARRAY['192.168.1.1', '192.168.1.2', '10.0.0.1', '172.16.0.1', '203.0.113.1'];
BEGIN
    -- Generate events spread across the last 4 hours
    FOR i IN 1..120 LOOP
        user_id := user_ids[1 + floor(random() * 3)];
        
        -- More varied event type distribution
        IF random() < 0.6 THEN
            event_type := 'AUTH_SUCCESS'::security_event_type;
        ELSIF random() < 0.85 THEN
            event_type := 'AUTH_FAILURE'::security_event_type;
        ELSIF random() < 0.95 THEN
            event_type := 'RATE_LIMIT_HIT'::security_event_type;
        ELSE
            event_type := 'ACCESS_DENIED'::security_event_type;
        END IF;
        
        -- Set severity based on event type
        IF event_type = 'AUTH_SUCCESS' THEN
            severity := 'low'::security_severity;
        ELSIF event_type = 'AUTH_FAILURE' THEN
            severity := (ARRAY['medium', 'high']::security_severity[])[1 + floor(random() * 2)];
        ELSE
            severity := (ARRAY['medium', 'high']::security_severity[])[1 + floor(random() * 2)];
        END IF;
        
        ip_addr := ip_addresses[1 + floor(random() * 5)];
        
        -- Spread events across last 4 hours
        time_offset := (random() * INTERVAL '4 hours');
        
        INSERT INTO security_events (
            event_id, type, user_id, session_id, ip_address, user_agent, 
            timestamp, severity, details, risk_score
        ) VALUES (
            gen_random_uuid()::text,
            event_type,
            user_id,
            'session-' || i,
            ip_addr::inet,
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Test Browser',
            NOW() - time_offset,
            severity,
            jsonb_build_object(
                'method', CASE WHEN random() < 0.5 THEN 'password' ELSE 'token' END,
                'source', 'test_data'
            ),
            CASE 
                WHEN event_type = 'AUTH_SUCCESS' THEN floor(random() * 30)::integer
                WHEN event_type = 'AUTH_FAILURE' THEN (30 + floor(random() * 30))::integer
                ELSE (50 + floor(random() * 50))::integer
            END
        );
    END LOOP;

    -- Generate recent brute force attack pattern (within last hour)
    FOR i IN 1..10 LOOP
        INSERT INTO security_events (
            event_id, type, user_id, session_id, ip_address, user_agent, 
            timestamp, severity, details, risk_score
        ) VALUES (
            gen_random_uuid()::text,
            'AUTH_FAILURE'::security_event_type,
            '44444444-4444-4444-4444-444444444444',
            'attack-session-' || i,
            '203.0.113.100'::inet,
            'Suspicious Bot/1.0',
            NOW() - INTERVAL '30 minutes' + (i * INTERVAL '2 minutes'),
            'high'::security_severity,
            jsonb_build_object(
                'method', 'password',
                'attempt', i,
                'source', 'brute_force_test'
            ),
            (85 + i)::integer
        );
    END LOOP;

    -- Generate recent permission escalation attempt
    INSERT INTO security_events (
        event_id, type, user_id, session_id, ip_address, user_agent, 
        timestamp, severity, details, risk_score
    ) VALUES (
        gen_random_uuid()::text,
        'PERMISSION_ESCALATION'::security_event_type,
        '44444444-4444-4444-4444-444444444444',
        'escalation-attempt-1',
        '203.0.113.100'::inet,
        'Suspicious Bot/1.0',
        NOW() - INTERVAL '15 minutes',
        'critical'::security_severity,
        jsonb_build_object(
            'attempted_role', 'admin',
            'current_role', 'user',
            'source', 'test_threat'
        ),
        95
    );

    -- Generate recent rate limit hits
    FOR i IN 1..8 LOOP
        INSERT INTO security_events (
            event_id, type, user_id, session_id, ip_address, user_agent, 
            timestamp, severity, details, risk_score
        ) VALUES (
            gen_random_uuid()::text,
            'RATE_LIMIT_HIT'::security_event_type,
            user_ids[1 + floor(random() * 3)],
            'rate-limit-' || i,
            ip_addresses[1 + floor(random() * 5)]::inet,
            'Mozilla/5.0 Test Browser',
            NOW() - (random() * INTERVAL '2 hours'),
            'medium'::security_severity,
            jsonb_build_object(
                'endpoint', '/api/analyze',
                'limit', 100,
                'window', '1 hour',
                'source', 'test_data'
            ),
            60
        );
    END LOOP;
END $$;

-- Add rate limit data
INSERT INTO rate_limits (user_id, operation, count, reset_time, last_request)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'api_calls', 85, NOW() + INTERVAL '30 minutes', NOW()),
    ('22222222-2222-2222-2222-222222222222', 'api_calls', 450, NOW() + INTERVAL '45 minutes', NOW()),
    ('33333333-3333-3333-3333-333333333333', 'api_calls', 2500, NOW() + INTERVAL '20 minutes', NOW())
ON CONFLICT (user_id, operation) 
DO UPDATE SET 
    count = EXCLUDED.count,
    reset_time = EXCLUDED.reset_time,
    last_request = EXCLUDED.last_request;

-- Show summary
SELECT 
    'Test data generated!' as status,
    COUNT(*) as total_events,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(CASE WHEN type = 'AUTH_SUCCESS' THEN 1 END) as auth_success,
    COUNT(CASE WHEN type = 'AUTH_FAILURE' THEN 1 END) as auth_failure,
    COUNT(CASE WHEN severity IN ('high', 'critical') THEN 1 END) as high_severity
FROM security_events
WHERE timestamp > NOW() - INTERVAL '4 hours';

-- Show recent distribution
SELECT 
    date_trunc('hour', timestamp) as hour,
    type,
    COUNT(*) as count
FROM security_events
WHERE timestamp > NOW() - INTERVAL '4 hours'
GROUP BY hour, type
ORDER BY hour DESC, type;
EOF

echo -e "${GREEN}✅ Test data regenerated with better time distribution!${NC}"
echo ""
echo -e "${BLUE}📊 Next Steps:${NC}"
echo "1. Go to your Grafana dashboard: https://alpsla.grafana.net"
echo "2. Set time range to 'Last 3 hours' or 'Last 6 hours'"
echo "3. Refresh the dashboard (F5)"
echo ""
echo "You should now see:"
echo "   ✓ Auth Success Rate showing < 100%"
echo "   ✓ Failed Logins showing recent failures"
echo "   ✓ Brute force attack pattern in last hour"
echo "   ✓ Security events distributed across time"
