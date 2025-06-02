#!/bin/bash

# Setup Supabase Schema for CodeQual Authentication System
# This script applies the database schema and configures the Supabase project

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Setting up Supabase Schema for CodeQual Authentication${NC}"

# Load environment variables from .env file
if [ -f ".env" ]; then
    echo -e "${BLUE}📁 Loading environment variables from .env file...${NC}"
    set -a
    source .env
    set +a
else
    echo -e "${YELLOW}⚠️  No .env file found, checking for existing environment variables...${NC}"
fi

# Check if required environment variables are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set${NC}"
    echo ""
    echo "Please add these to your .env file:"
    echo "SUPABASE_URL=https://your-project.supabase.co"
    echo "SUPABASE_SERVICE_ROLE_KEY=your-service-role-key"
    echo "SUPABASE_ANON_KEY=your-anon-key"
    echo "SUPABASE_JWT_SECRET=your-jwt-secret"
    exit 1
fi

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${YELLOW}⚠️  Supabase CLI not found. Installing...${NC}"
    npm install -g supabase
fi

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ Error: psql (PostgreSQL client) is required but not installed${NC}"
    echo "Please install PostgreSQL client tools"
    exit 1
fi

echo -e "${BLUE}📊 Connecting to Supabase database...${NC}"

# Extract database URL components
DB_URL="${SUPABASE_URL}/rest/v1/"
PROJECT_ID=$(echo $SUPABASE_URL | sed 's/.*\/\/\(.*\)\.supabase\.co.*/\1/')

# Use database connection details from environment variables
DB_HOST="${SUPABASE_DB_HOST:-aws-0-us-west-1.pooler.supabase.com}"
DB_PORT="${SUPABASE_DB_PORT:-5432}"
DB_NAME="${SUPABASE_DB_NAME:-postgres}"
DB_USER="${SUPABASE_DB_USER:-postgres.ftjhmbbcuqjqmmbaymqb}"

echo -e "${YELLOW}⚙️  Database connection details:${NC}"
echo "Host: $DB_HOST"
echo "Port: $DB_PORT"
echo "Database: $DB_NAME"
echo "User: $DB_USER"

# Use environment variable if available, otherwise prompt
if [ -n "$SUPABASE_DB_PASSWORD" ]; then
    echo -e "${BLUE}🔑 Using database password from environment variable${NC}"
    DB_PASSWORD="$SUPABASE_DB_PASSWORD"
else
    echo -e "${YELLOW}🔐 Please enter your Supabase database password:${NC}"
    read -s DB_PASSWORD
fi

# Test connection
echo -e "${BLUE}🔍 Testing database connection...${NC}"
export PGPASSWORD="$DB_PASSWORD"

if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &> /dev/null; then
    echo -e "${RED}❌ Failed to connect to database. Please check your credentials.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Database connection successful${NC}"

# Apply the schema
echo -e "${BLUE}📋 Applying database schema...${NC}"

SCHEMA_FILE="packages/agents/src/multi-agent/database-schema.sql"

if [ ! -f "$SCHEMA_FILE" ]; then
    echo -e "${RED}❌ Schema file not found: $SCHEMA_FILE${NC}"
    exit 1
fi

# Apply schema with error handling
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SCHEMA_FILE"; then
    echo -e "${GREEN}✅ Database schema applied successfully${NC}"
else
    echo -e "${RED}❌ Failed to apply database schema${NC}"
    exit 1
fi

# Create security events table with vector extension if not exists
echo -e "${BLUE}🔧 Setting up vector extension for embeddings...${NC}"

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
-- Enable vector extension if available
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify tables were created
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('user_profiles', 'organizations', 'security_events', 'rate_limits') 
        THEN '✅ Core'
        ELSE '📋 Additional'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'user_profiles', 'organizations', 'organization_memberships', 
    'security_events', 'rate_limits', 'api_keys', 'subscriptions',
    'vector_embeddings', 'user_sessions', 'repository_access_logs'
)
ORDER BY table_name;
EOF

# Set up RLS policies
echo -e "${BLUE}🛡️  Configuring Row Level Security...${NC}"

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
-- Verify RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    CASE 
        WHEN rowsecurity THEN '🔒 Enabled'
        ELSE '⚠️  Disabled'
    END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_profiles', 'organizations', 'security_events')
ORDER BY tablename;
EOF

# Create initial admin user if needed
echo -e "${BLUE}👤 Setting up initial admin user...${NC}"

read -p "Would you like to create an initial admin user? (y/n): " CREATE_ADMIN

if [ "$CREATE_ADMIN" = "y" ] || [ "$CREATE_ADMIN" = "Y" ]; then
    read -p "Admin email: " ADMIN_EMAIL
    
    # Generate a UUID for the admin user
    ADMIN_UUID=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT gen_random_uuid();" | tr -d ' ')
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
-- Insert admin user profile (you'll need to create the auth user separately)
INSERT INTO user_profiles (
    id, 
    email, 
    name, 
    subscription_tier, 
    status, 
    role,
    organizations,
    metadata
) VALUES (
    '$ADMIN_UUID',
    '$ADMIN_EMAIL',
    'System Administrator',
    'enterprise',
    'active',
    'system_admin',
    '{}',
    '{"createdBy": "setup-script", "setupDate": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}'
) ON CONFLICT (email) DO NOTHING;
EOF

    echo -e "${GREEN}✅ Admin user profile created with ID: $ADMIN_UUID${NC}"
    echo -e "${YELLOW}⚠️  Note: You still need to create the auth user in Supabase Auth UI${NC}"
fi

# Set up real-time subscriptions for security events
echo -e "${BLUE}📡 Configuring real-time subscriptions...${NC}"

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
-- Enable real-time for security events
ALTER PUBLICATION supabase_realtime ADD TABLE security_events;
ALTER PUBLICATION supabase_realtime ADD TABLE rate_limits;
ALTER PUBLICATION supabase_realtime ADD TABLE user_sessions;
EOF

# Create indexes for performance
echo -e "${BLUE}⚡ Creating performance indexes...${NC}"

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
-- Additional performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS security_events_timestamp_idx 
ON security_events (timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS security_events_user_type_idx 
ON security_events (user_id, type, timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS security_events_severity_idx 
ON security_events (severity, timestamp DESC) 
WHERE severity IN ('high', 'critical');

CREATE INDEX CONCURRENTLY IF NOT EXISTS rate_limits_reset_time_idx 
ON rate_limits (reset_time) 
WHERE reset_time > NOW();

-- Verify indexes
SELECT 
    indexname,
    tablename,
    CASE 
        WHEN indexname LIKE '%_pkey' THEN '🔑 Primary Key'
        WHEN indexname LIKE '%concurrently%' THEN '⚡ Performance'
        ELSE '📋 Index'
    END as type
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('security_events', 'rate_limits', 'user_profiles')
ORDER BY tablename, indexname;
EOF

# Test the setup
echo -e "${BLUE}🧪 Testing schema setup...${NC}"

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
-- Test core functions
SELECT 'update_user_last_login function' as test, 
       CASE WHEN EXISTS (
           SELECT 1 FROM pg_proc WHERE proname = 'update_user_last_login'
       ) THEN '✅ Exists' ELSE '❌ Missing' END as status
UNION ALL
SELECT 'add_user_to_organization function' as test,
       CASE WHEN EXISTS (
           SELECT 1 FROM pg_proc WHERE proname = 'add_user_to_organization'
       ) THEN '✅ Exists' ELSE '❌ Missing' END as status
UNION ALL
SELECT 'grant_repository_access function' as test,
       CASE WHEN EXISTS (
           SELECT 1 FROM pg_proc WHERE proname = 'grant_repository_access'
       ) THEN '✅ Exists' ELSE '❌ Missing' END as status;

-- Test triggers
SELECT 
    trigger_name,
    event_object_table,
    '✅ Active' as status
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND trigger_name LIKE '%updated_at%';
EOF

echo -e "${GREEN}🎉 Supabase schema setup completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Update your .env file with the database credentials"
echo "2. Set up Grafana integration using the provided configuration"
echo "3. Configure security alert webhooks (Slack, email)"
echo "4. Run the test suite to verify everything works"
echo ""
echo -e "${YELLOW}📝 Environment Variables Needed:${NC}"
echo "SUPABASE_URL=$SUPABASE_URL"
echo "SUPABASE_ANON_KEY=<your-anon-key>"
echo "SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>"
echo "SUPABASE_JWT_SECRET=<your-jwt-secret>"
echo ""
echo -e "${GREEN}✅ Setup complete! Your database is ready for authentication.${NC}"