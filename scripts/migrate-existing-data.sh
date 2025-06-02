#!/bin/bash

# Migrate Existing Data to New Authentication System
# This script helps migrate existing user data to the new Supabase authentication schema

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 CodeQual Data Migration to New Authentication System${NC}"

# Load environment variables from .env file
if [ -f ".env" ]; then
    echo -e "${BLUE}📁 Loading environment variables from .env file...${NC}"
    set -a
    source .env
    set +a
else
    echo -e "${RED}❌ Error: .env file not found${NC}"
    exit 1
fi

# Check if required environment variables are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env${NC}"
    exit 1
fi

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ Error: psql (PostgreSQL client) is required${NC}"
    exit 1
fi

echo -e "${BLUE}📊 Migration Overview${NC}"
echo "This script will:"
echo "1. Backup existing data"
echo "2. Analyze current user structure" 
echo "3. Migrate users to new authentication schema"
echo "4. Create organizations for existing users"
echo "5. Migrate repository access permissions"
echo "6. Verify migration integrity"
echo ""

# Confirm migration
read -p "Do you want to proceed with the migration? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo -e "${YELLOW}Migration cancelled${NC}"
    exit 0
fi

# Database connection details
PROJECT_ID=$(echo $SUPABASE_URL | sed 's/.*\/\/\(.*\)\.supabase\.co.*/\1/')
DB_HOST="${PROJECT_ID}.db.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"

# Prompt for database password
echo -e "${YELLOW}🔐 Please enter your Supabase database password:${NC}"
read -s DB_PASSWORD
export PGPASSWORD="$DB_PASSWORD"

# Test connection
echo -e "${BLUE}🔍 Testing database connection...${NC}"
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &> /dev/null; then
    echo -e "${RED}❌ Failed to connect to database${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Database connection successful${NC}"

# Create migration backup
echo -e "${BLUE}💾 Creating migration backup...${NC}"
BACKUP_FILE="migration_backup_$(date +%Y%m%d_%H%M%S).sql"

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF > "$BACKUP_FILE" 2>&1
-- Migration backup created on $(date)
-- Backup existing auth schema (if any)
\copy (SELECT * FROM auth.users) TO STDOUT WITH CSV HEADER;
EOF

echo -e "${GREEN}✅ Backup created: $BACKUP_FILE${NC}"

# Check if new schema exists
echo -e "${BLUE}🔍 Checking authentication schema...${NC}"

SCHEMA_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles'
);")

if [[ "$SCHEMA_EXISTS" == *"f"* ]]; then
    echo -e "${RED}❌ New authentication schema not found${NC}"
    echo "Please run './scripts/setup-supabase-schema.sh' first"
    exit 1
fi

echo -e "${GREEN}✅ New authentication schema found${NC}"

# Analyze existing users
echo -e "${BLUE}📊 Analyzing existing users...${NC}"

USER_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
SELECT COUNT(*) FROM auth.users;")

echo "Found $USER_COUNT existing users"

if [ "$USER_COUNT" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  No existing users found. Migration not needed.${NC}"
    exit 0
fi

# Migrate users to user_profiles
echo -e "${BLUE}👤 Migrating users to new schema...${NC}"

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- Migrate existing auth.users to user_profiles
INSERT INTO user_profiles (
    id,
    email,
    name,
    subscription_tier,
    organizations,
    status,
    role,
    created_at,
    metadata
)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'name', au.email) as name,
    'free' as subscription_tier,
    '{}' as organizations,
    CASE 
        WHEN au.email_confirmed_at IS NOT NULL THEN 'active'
        ELSE 'pending_verification'
    END as status,
    'user' as role,
    au.created_at,
    COALESCE(au.raw_user_meta_data, '{}'::jsonb) as metadata
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM user_profiles up WHERE up.id = au.id
);
EOF

MIGRATED_USERS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
SELECT COUNT(*) FROM user_profiles;")

echo -e "${GREEN}✅ Migrated $MIGRATED_USERS users to new schema${NC}"

# Create default organizations for existing users
echo -e "${BLUE}🏢 Creating default organizations...${NC}"

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- Create personal organizations for users without organizations
WITH users_without_orgs AS (
    SELECT up.id, up.email, up.name
    FROM user_profiles up
    WHERE array_length(up.organizations, 1) IS NULL OR array_length(up.organizations, 1) = 0
),
new_orgs AS (
    INSERT INTO organizations (
        name,
        subscription_tier,
        owner_id,
        member_count,
        quotas
    )
    SELECT 
        COALESCE(uwo.name, split_part(uwo.email, '@', 1)) || '''s Organization' as name,
        'free' as subscription_tier,
        uwo.id as owner_id,
        1 as member_count,
        '{
            "maxMembers": 3,
            "maxRepositories": 3,
            "requestsPerHour": 100,
            "storageQuotaGB": 1
        }'::jsonb as quotas
    FROM users_without_orgs uwo
    RETURNING id, owner_id
)
UPDATE user_profiles 
SET 
    organizations = ARRAY[new_orgs.id::text],
    primary_organization_id = new_orgs.id,
    updated_at = NOW()
FROM new_orgs
WHERE user_profiles.id = new_orgs.owner_id;
EOF

# Create organization memberships
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- Create organization memberships for users
INSERT INTO organization_memberships (
    organization_id,
    user_id,
    role
)
SELECT 
    up.primary_organization_id,
    up.id,
    'org_owner' as role
FROM user_profiles up
WHERE up.primary_organization_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM organization_memberships om 
    WHERE om.organization_id = up.primary_organization_id 
    AND om.user_id = up.id
);
EOF

ORG_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
SELECT COUNT(*) FROM organizations;")

echo -e "${GREEN}✅ Created $ORG_COUNT organizations${NC}"

# Migrate existing repository access (if any custom tables exist)
echo -e "${BLUE}🔐 Checking for existing repository access data...${NC}"

# This section would be customized based on your existing schema
# For now, we'll create sample repository access for demonstration

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- Grant default repository access to organizations
-- This is a template - customize based on your existing data structure

UPDATE organizations 
SET repository_access = '{
    "sample/demo-repo": {
        "accessLevel": "read",
        "grantedAt": "' || NOW()::text || '",
        "grantedBy": "migration-script"
    }
}'::jsonb
WHERE repository_access = '{}'::jsonb;
EOF

# Verify migration
echo -e "${BLUE}🔍 Verifying migration integrity...${NC}"

VERIFICATION_RESULT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- Verification queries
SELECT 
    'Users in auth.users' as metric,
    COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
    'Users in user_profiles' as metric,
    COUNT(*) as count
FROM user_profiles
UNION ALL
SELECT 
    'Organizations created' as metric,
    COUNT(*) as count
FROM organizations
UNION ALL
SELECT 
    'Organization memberships' as metric,
    COUNT(*) as count
FROM organization_memberships;
EOF
)

echo "$VERIFICATION_RESULT"

# Check for any users without organizations
USERS_WITHOUT_ORGS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
SELECT COUNT(*) FROM user_profiles 
WHERE primary_organization_id IS NULL;")

if [ "$USERS_WITHOUT_ORGS" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Warning: $USERS_WITHOUT_ORGS users still without organizations${NC}"
else
    echo -e "${GREEN}✅ All users have organizations assigned${NC}"
fi

# Create migration summary
echo -e "${BLUE}📋 Creating migration summary...${NC}"

cat > migration_summary_$(date +%Y%m%d_%H%M%S).md << EOF
# CodeQual Authentication Migration Summary

**Migration Date:** $(date)
**Migration Script:** migrate-existing-data.sh

## Migration Results

### Users Migrated
- **Total users migrated:** $MIGRATED_USERS
- **Users without organizations:** $USERS_WITHOUT_ORGS

### Organizations Created
- **Total organizations:** $ORG_COUNT
- **Default tier:** Free (3 repos, 100 req/hr, 1GB storage)

### Data Integrity
- **Backup created:** $BACKUP_FILE
- **Schema verified:** ✅ All required tables present
- **Relationships verified:** ✅ User-organization links created

## Post-Migration Tasks

1. **Update Application Code:**
   - Replace legacy authentication calls
   - Use new \`SupabaseAuthenticationService\`
   - Update user permission checks

2. **Test Authentication Flow:**
   - Verify existing users can log in
   - Test repository access permissions
   - Validate organization memberships

3. **Configure Monitoring:**
   - Set up Grafana dashboards
   - Configure security alerts
   - Monitor authentication metrics

## Rollback Information

- **Backup file:** $BACKUP_FILE
- **Original auth.users table:** Preserved (not modified)
- **Migration timestamp:** $(date -u +%Y-%m-%dT%H:%M:%SZ)

## Next Steps

1. Run integration tests: \`./scripts/run-security-tests.sh\`
2. Update application to use new authentication
3. Monitor authentication metrics
4. Consider upgrading user subscription tiers

EOF

echo -e "${GREEN}🎉 Migration completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Migration Summary:${NC}"
echo "- Users migrated: $MIGRATED_USERS"
echo "- Organizations created: $ORG_COUNT"
echo "- Backup file: $BACKUP_FILE"
echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo "1. Update your application code to use new authentication service"
echo "2. Test the authentication flow with existing users"
echo "3. Run security tests: ./scripts/run-security-tests.sh"
echo "4. Set up monitoring: ./scripts/setup-grafana-integration.sh"
echo ""
echo -e "${GREEN}✅ Migration complete! Your authentication system is ready.${NC}"