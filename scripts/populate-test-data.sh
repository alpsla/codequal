#!/bin/bash

# Populate Test Data for Grafana Security Dashboard
# This script inserts test authentication data to verify dashboard functionality

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Populating Test Data for Grafana Dashboard${NC}"

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
DB_HOST="${SUPABASE_DB_HOST:-db.ftjhmbbcuqjqmmbaymqb.supabase.co}"
DB_PORT="${SUPABASE_DB_PORT:-5432}"
DB_NAME="${SUPABASE_DB_NAME:-postgres}"
DB_USER="${SUPABASE_DB_USER:-postgres}"
DB_PASSWORD="${SUPABASE_DB_PASSWORD}"

if [ -z "$DB_PASSWORD" ]; then
    echo -e "${YELLOW}🔐 Please enter your Supabase database password:${NC}"
    read -s DB_PASSWORD
fi

export PGPASSWORD="$DB_PASSWORD"
export PGSSLMODE="require"
export PGGSSENCMODE="disable"

# Test connection
echo -e "${BLUE}🔍 Testing database connection...${NC}"
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" 2>&1 | grep -q "1 row"; then
    echo -e "${RED}❌ Failed to connect to database${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Connected to database${NC}"

# Function to generate test data
generate_test_data() {
    echo -e "${BLUE}📊 Generating test security events...${NC}"
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- First, create some test users if they don't exist
INSERT INTO user_profiles (id, email, name, subscription_tier, status, role, organizations, metadata)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'test.user1@example.com', 'Test User 1', 'free', 'active', 'user', '{}', '{"test": true}'),
    ('22222222-2222-2222-2222-222222222222', 'test.user2@example.com', 'Test User 2', 'pro', 'active', 'user', '{}', '{"test": true}'),
    ('33333333-3333-3333-3333-333333333333', 'test.user3@example.com', 'Test User 3', 'enterprise', 'active', 'admin', '{}', '{"test": true}'),
    ('44444444-4444-4444-4444-444444444444', 'test.attacker@malicious.com', 'Attacker', 'free', 'suspended', 'user', '{}', '{"test": true, "suspicious": true}')
ON CONFLICT (id) DO NOTHING;

-- Generate varied security events over the past 24 hours
DO $$
DECLARE
    i INTEGER;
    user_id UUID;
    event_type TEXT;
    severity TEXT;
    ip_addr TEXT;
    user_ids UUID[] := ARRAY['11111111-1111-1111-1111-111111111111'::uuid, 
                             '22222222-2222-2222-2222-222222222222'::uuid, 
                             '33333333-3333-3333-3333-333333333333'::uuid];
    event_types TEXT[] := ARRAY['AUTH_SUCCESS', 'AUTH_FAILURE', 'ACCESS_DENIED', 'RATE_LIMIT_HIT'];
    severities TEXT[] := ARRAY['low', 'medium', 'high'];
    ip_addresses TEXT[] := ARRAY['192.168.1.1', '192.168.1.2', '10.0.0.1', '172.16.0.1', '203.0.113.1'];
BEGIN
    -- Generate normal authentication events
    FOR i IN 1..100 LOOP
        user_id := user_ids[1 + floor(random() * 3)];
        event_type := CASE 
            WHEN random() < 0.8 THEN 'AUTH_SUCCESS'
            WHEN random() < 0.95 THEN 'AUTH_FAILURE'
            ELSE event_types[1 + floor(random() * 4)]
        END;
        severity := CASE
            WHEN event_type = 'AUTH_SUCCESS' THEN 'low'
            WHEN event_type = 'AUTH_FAILURE' THEN 'medium'
            ELSE severities[1 + floor(random() * 3)]
        END;
        ip_addr := ip_addresses[1 + floor(random() * 5)];
        
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
            NOW() - (random() * INTERVAL '24 hours'),
            severity,
            jsonb_build_object(
                'method', CASE WHEN random() < 0.5 THEN 'password' ELSE 'token' END,
                'source', 'test_data'
            ),
            CASE 
                WHEN event_type = 'AUTH_SUCCESS' THEN floor(random() * 30)
                WHEN event_type = 'AUTH_FAILURE' THEN 30 + floor(random() * 30)
                ELSE 50 + floor(random() * 50)
            END
        );
    END LOOP;

    -- Generate brute force attack pattern
    FOR i IN 1..15 LOOP
        INSERT INTO security_events (
            event_id, type, user_id, session_id, ip_address, user_agent, 
            timestamp, severity, details, risk_score
        ) VALUES (
            gen_random_uuid()::text,
            'AUTH_FAILURE',
            '44444444-4444-4444-4444-444444444444',
            'attack-session-' || i,
            '203.0.113.100'::inet,
            'Suspicious Bot/1.0',
            NOW() - INTERVAL '2 hours' + (i * INTERVAL '1 minute'),
            'high',
            jsonb_build_object(
                'method', 'password',
                'attempt', i,
                'source', 'brute_force_test'
            ),
            85 + i
        );
    END LOOP;

    -- Generate permission escalation attempt
    INSERT INTO security_events (
        event_id, type, user_id, session_id, ip_address, user_agent, 
        timestamp, severity, details, risk_score
    ) VALUES (
        gen_random_uuid()::text,
        'PERMISSION_ESCALATION',
        '44444444-4444-4444-4444-444444444444',
        'escalation-attempt-1',
        '203.0.113.100'::inet,
        'Suspicious Bot/1.0',
        NOW() - INTERVAL '30 minutes',
        'critical',
        jsonb_build_object(
            'attempted_role', 'admin',
            'current_role', 'user',
            'source', 'test_threat'
        ),
        95
    );

    -- Generate rate limit hits
    FOR i IN 1..5 LOOP
        INSERT INTO security_events (
            event_id, type, user_id, session_id, ip_address, user_agent, 
            timestamp, severity, details, risk_score
        ) VALUES (
            gen_random_uuid()::text,
            'RATE_LIMIT_HIT',
            '11111111-1111-1111-1111-111111111111',
            'rate-limit-' || i,
            '192.168.1.1'::inet,
            'Mozilla/5.0 Test Browser',
            NOW() - (i * INTERVAL '5 minutes'),
            'medium',
            jsonb_build_object(
                'endpoint', '/api/analyze',
                'limit', 100,
                'window', '1 hour'
            ),
            60
        );
    END LOOP;
END $$;

-- Add some rate limit data
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

-- Add some organizations for testing
INSERT INTO organizations (id, name, subscription_tier, owner_id, member_count, repository_access)
VALUES 
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Test Org Free', 'free', '11111111-1111-1111-1111-111111111111', 3,
     '{"test-org/repo1": {"accessLevel": "read", "grantedAt": "2025-05-31T12:00:00Z", "grantedBy": "admin"}}'::jsonb),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Test Org Pro', 'pro', '22222222-2222-2222-2222-222222222222', 10,
     '{"test-org/repo2": {"accessLevel": "write", "grantedAt": "2025-05-31T12:00:00Z", "grantedBy": "admin"}}'::jsonb),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Test Org Enterprise', 'enterprise', '33333333-3333-3333-3333-333333333333', 50,
     '{"test-org/repo3": {"accessLevel": "admin", "grantedAt": "2025-05-31T12:00:00Z", "grantedBy": "admin"}}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Update user profiles with organization
UPDATE user_profiles 
SET primary_organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    organizations = ARRAY['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa']
WHERE id = '11111111-1111-1111-1111-111111111111';

UPDATE user_profiles 
SET primary_organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    organizations = ARRAY['bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb']
WHERE id = '22222222-2222-2222-2222-222222222222';

UPDATE user_profiles 
SET primary_organization_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    organizations = ARRAY['cccccccc-cccc-cccc-cccc-cccccccccccc']
WHERE id = '33333333-3333-3333-3333-333333333333';

-- Show summary
SELECT 
    'Test data generated successfully!' as message,
    COUNT(*) as total_events,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT ip_address) as unique_ips,
    COUNT(CASE WHEN type = 'AUTH_SUCCESS' THEN 1 END) as successful_logins,
    COUNT(CASE WHEN type = 'AUTH_FAILURE' THEN 1 END) as failed_logins,
    COUNT(CASE WHEN severity IN ('high', 'critical') THEN 1 END) as high_severity_events
FROM security_events
WHERE timestamp > NOW() - INTERVAL '24 hours';
EOF

    echo -e "${GREEN}✅ Test data generated successfully!${NC}"
}

# Function to clean up test data
cleanup_test_data() {
    echo -e "${YELLOW}🧹 Cleaning up test data...${NC}"
    
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

-- Delete test organizations
DELETE FROM organizations 
WHERE id IN (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'cccccccc-cccc-cccc-cccc-cccccccccccc'
);

-- Delete test users
DELETE FROM user_profiles 
WHERE id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444'
);

SELECT 'Test data cleaned up successfully!' as message;
EOF

    echo -e "${GREEN}✅ Test data cleaned up!${NC}"
}

# Main menu
echo -e "${BLUE}📋 Test Data Management${NC}"
echo "1. Generate test data"
echo "2. Clean up test data"
echo "3. Exit"
read -p "Select an option (1-3): " OPTION

case $OPTION in
    1)
        generate_test_data
        echo ""
        echo -e "${BLUE}📊 Next Steps:${NC}"
        echo "1. Go to your Grafana dashboard"
        echo "2. Refresh the dashboard (F5)"
        echo "3. You should see:"
        echo "   - Authentication success/failure rates"
        echo "   - Active users and failed login attempts"
        echo "   - Security event distribution"
        echo "   - Brute force attack pattern in the timeline"
        echo "   - Rate limit usage for test users"
        echo ""
        echo -e "${YELLOW}⚠️  Remember to clean up test data when done testing!${NC}"
        ;;
    2)
        read -p "Are you sure you want to delete all test data? (y/n): " CONFIRM
        if [ "$CONFIRM" = "y" ] || [ "$CONFIRM" = "Y" ]; then
            cleanup_test_data
        else
            echo -e "${YELLOW}⚠️  Cleanup cancelled${NC}"
        fi
        ;;
    3)
        echo -e "${BLUE}👋 Exiting...${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}❌ Invalid option${NC}"
        exit 1
        ;;
esac
