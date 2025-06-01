-- Supabase Database Schema for CodeQual Authentication System
-- This schema supports user management, subscription tiers, and multi-level repository access

-- Enable Row Level Security (RLS) for all tables
ALTER database postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create custom types
CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'enterprise');
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'pending_verification', 'password_reset_required', 'locked');
CREATE TYPE user_role AS ENUM ('user', 'admin', 'system_admin', 'org_owner', 'org_member', 'service_account');
CREATE TYPE security_event_type AS ENUM ('AUTH_SUCCESS', 'AUTH_FAILURE', 'ACCESS_DENIED', 'PERMISSION_ESCALATION', 'SESSION_EXPIRED', 'RATE_LIMIT_HIT');
CREATE TYPE security_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- User profiles table (extends Supabase auth.users)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    subscription_tier subscription_tier NOT NULL DEFAULT 'free',
    organizations TEXT[] DEFAULT '{}',
    primary_organization_id UUID,
    status user_status NOT NULL DEFAULT 'pending_verification',
    role user_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Indexes
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Organizations table for company-level management
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subscription_tier subscription_tier NOT NULL DEFAULT 'free',
    owner_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT,
    member_count INTEGER NOT NULL DEFAULT 1,
    repository_access JSONB DEFAULT '{}'::jsonb,
    quotas JSONB NOT NULL DEFAULT '{
        "maxMembers": 3,
        "maxRepositories": 3,
        "requestsPerHour": 100,
        "storageQuotaGB": 1
    }'::jsonb,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT positive_member_count CHECK (member_count > 0),
    CONSTRAINT valid_quotas CHECK (
        quotas ? 'maxMembers' AND 
        quotas ? 'maxRepositories' AND 
        quotas ? 'requestsPerHour' AND 
        quotas ? 'storageQuotaGB'
    )
);

-- Organization memberships (many-to-many)
CREATE TABLE organization_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'org_member',
    permissions JSONB DEFAULT '{}'::jsonb,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    invited_by UUID REFERENCES user_profiles(id),
    
    -- Constraints
    UNIQUE(organization_id, user_id)
);

-- Repository access tracking
CREATE TABLE repository_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    repository_id TEXT NOT NULL,
    access_level TEXT NOT NULL CHECK (access_level IN ('read', 'write', 'admin')),
    granted_by UUID NOT NULL REFERENCES user_profiles(id),
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES user_profiles(id),
    
    -- Constraints
    CONSTRAINT valid_access_level CHECK (access_level IN ('read', 'write', 'admin')),
    CONSTRAINT revoke_logic CHECK (
        (revoked_at IS NULL AND revoked_by IS NULL) OR 
        (revoked_at IS NOT NULL AND revoked_by IS NOT NULL)
    )
);

-- Security events table for audit logging
CREATE TABLE security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT UNIQUE NOT NULL,
    type security_event_type NOT NULL,
    user_id UUID REFERENCES user_profiles(id),
    session_id TEXT NOT NULL,
    repository_id TEXT,
    agent_role TEXT,
    ip_address INET NOT NULL,
    user_agent TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    details JSONB DEFAULT '{}'::jsonb,
    severity security_severity NOT NULL DEFAULT 'low',
    geo_location JSONB,
    device_fingerprint JSONB,
    risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    correlation_id TEXT,
    
    -- Indexes for common queries
    INDEX CONCURRENTLY ON security_events (user_id, timestamp DESC),
    INDEX CONCURRENTLY ON security_events (type, timestamp DESC),
    INDEX CONCURRENTLY ON security_events (severity, timestamp DESC),
    INDEX CONCURRENTLY ON security_events (ip_address, timestamp DESC)
);

-- Rate limiting state
CREATE TABLE rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    operation TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    reset_time TIMESTAMPTZ NOT NULL,
    last_request TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, operation),
    CONSTRAINT positive_count CHECK (count >= 0)
);

-- API keys for service accounts
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    key_hash TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    permissions JSONB DEFAULT '{}'::jsonb,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT valid_expiry CHECK (expires_at IS NULL OR expires_at > created_at),
    CONSTRAINT revoke_logic CHECK (
        (revoked_at IS NULL) OR (revoked_at >= created_at)
    )
);

-- Subscription billing (for future payment integration)
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    tier subscription_tier NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'unpaid')),
    billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    stripe_subscription_id TEXT UNIQUE,
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT positive_amount CHECK (amount_cents > 0),
    CONSTRAINT valid_period CHECK (current_period_end > current_period_start)
);

-- Vector embeddings storage (for repository analysis caching)
CREATE TABLE vector_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    embedding vector(1536), -- OpenAI embedding dimension
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    
    -- Indexes
    INDEX CONCURRENTLY ON vector_embeddings (repository_id, created_at DESC),
    INDEX CONCURRENTLY ON vector_embeddings (content_hash),
    UNIQUE(repository_id, content_hash)
);

-- Session management (supplement to Supabase auth)
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL UNIQUE,
    fingerprint TEXT NOT NULL,
    ip_address INET NOT NULL,
    user_agent TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT valid_expiry CHECK (expires_at > created_at),
    CONSTRAINT activity_logic CHECK (last_activity >= created_at)
);

-- Indexes for performance
CREATE INDEX CONCURRENTLY user_profiles_email_idx ON user_profiles (email);
CREATE INDEX CONCURRENTLY user_profiles_org_idx ON user_profiles (primary_organization_id);
CREATE INDEX CONCURRENTLY user_profiles_status_idx ON user_profiles (status);
CREATE INDEX CONCURRENTLY user_profiles_tier_idx ON user_profiles (subscription_tier);

CREATE INDEX CONCURRENTLY organizations_owner_idx ON organizations (owner_id);
CREATE INDEX CONCURRENTLY organizations_tier_idx ON organizations (subscription_tier);

CREATE INDEX CONCURRENTLY memberships_org_idx ON organization_memberships (organization_id);
CREATE INDEX CONCURRENTLY memberships_user_idx ON organization_memberships (user_id);

CREATE INDEX CONCURRENTLY rate_limits_user_idx ON rate_limits (user_id, operation);
CREATE INDEX CONCURRENTLY rate_limits_reset_idx ON rate_limits (reset_time);

CREATE INDEX CONCURRENTLY sessions_user_idx ON user_sessions (user_id);
CREATE INDEX CONCURRENTLY sessions_activity_idx ON user_sessions (last_activity DESC);
CREATE INDEX CONCURRENTLY sessions_expires_idx ON user_sessions (expires_at);

-- Row Level Security Policies

-- User profiles: Users can only see their own profile
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_profiles_select ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY user_profiles_update ON user_profiles FOR UPDATE USING (auth.uid() = id);

-- Organizations: Users can see organizations they belong to
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY organizations_select ON organizations FOR SELECT USING (
    id IN (
        SELECT organization_id FROM organization_memberships 
        WHERE user_id = auth.uid()
    )
);
CREATE POLICY organizations_update ON organizations FOR UPDATE USING (owner_id = auth.uid());

-- Organization memberships: Users can see their own memberships
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY memberships_select ON organization_memberships FOR SELECT USING (
    user_id = auth.uid() OR 
    organization_id IN (
        SELECT organization_id FROM organization_memberships 
        WHERE user_id = auth.uid() AND role IN ('org_owner', 'admin')
    )
);

-- Security events: Users can only see their own events
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY security_events_select ON security_events FOR SELECT USING (user_id = auth.uid());
CREATE POLICY security_events_insert ON security_events FOR INSERT WITH CHECK (true); -- Allow service to insert

-- Rate limits: Users can only see their own rate limits
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY rate_limits_select ON rate_limits FOR SELECT USING (user_id = auth.uid());
CREATE POLICY rate_limits_all ON rate_limits FOR ALL USING (user_id = auth.uid());

-- API keys: Users can only see their own API keys
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY api_keys_select ON api_keys FOR SELECT USING (user_id = auth.uid());
CREATE POLICY api_keys_all ON api_keys FOR ALL USING (user_id = auth.uid());

-- User sessions: Users can only see their own sessions
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY sessions_select ON user_sessions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY sessions_all ON user_sessions FOR ALL USING (user_id = auth.uid());

-- Functions for common operations

-- Update user last login
CREATE OR REPLACE FUNCTION update_user_last_login(user_uuid UUID)
RETURNS void AS $$
BEGIN
    UPDATE user_profiles 
    SET last_login_at = NOW(), updated_at = NOW()
    WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add user to organization
CREATE OR REPLACE FUNCTION add_user_to_organization(
    org_uuid UUID,
    user_uuid UUID,
    user_role user_role DEFAULT 'org_member'
)
RETURNS void AS $$
BEGIN
    -- Add membership
    INSERT INTO organization_memberships (organization_id, user_id, role)
    VALUES (org_uuid, user_uuid, user_role)
    ON CONFLICT (organization_id, user_id) DO UPDATE 
    SET role = EXCLUDED.role;
    
    -- Update user's organizations array
    UPDATE user_profiles 
    SET 
        organizations = COALESCE(organizations, '{}') || ARRAY[org_uuid::text],
        primary_organization_id = CASE 
            WHEN primary_organization_id IS NULL THEN org_uuid 
            ELSE primary_organization_id 
        END,
        updated_at = NOW()
    WHERE id = user_uuid;
    
    -- Update organization member count
    UPDATE organizations 
    SET member_count = (
        SELECT COUNT(*) FROM organization_memberships 
        WHERE organization_id = org_uuid
    ),
    updated_at = NOW()
    WHERE id = org_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant repository access to organization
CREATE OR REPLACE FUNCTION grant_repository_access(
    org_uuid UUID,
    repo_id TEXT,
    access_level TEXT,
    granted_by_uuid UUID
)
RETURNS void AS $$
BEGIN
    -- Validate access level
    IF access_level NOT IN ('read', 'write', 'admin') THEN
        RAISE EXCEPTION 'Invalid access level: %', access_level;
    END IF;
    
    -- Update organization repository access
    UPDATE organizations 
    SET 
        repository_access = COALESCE(repository_access, '{}'::jsonb) || 
        jsonb_build_object(
            repo_id, 
            jsonb_build_object(
                'accessLevel', access_level,
                'grantedAt', NOW(),
                'grantedBy', granted_by_uuid
            )
        ),
        updated_at = NOW()
    WHERE id = org_uuid;
    
    -- Log the access grant
    INSERT INTO repository_access_logs (
        organization_id, repository_id, access_level, granted_by
    ) VALUES (
        org_uuid, repo_id, access_level, granted_by_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    -- Mark expired sessions as revoked
    UPDATE user_sessions 
    SET revoked_at = NOW()
    WHERE expires_at < NOW() AND revoked_at IS NULL;
    
    -- Clean up old rate limit entries
    DELETE FROM rate_limits 
    WHERE reset_time < NOW() - INTERVAL '1 day';
    
    -- Clean up old security events (retain for 1 year)
    DELETE FROM security_events 
    WHERE timestamp < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for automatic updates

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at 
    BEFORE UPDATE ON organizations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at 
    BEFORE UPDATE ON subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Schedule periodic cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-expired-sessions', '0 2 * * *', 'SELECT cleanup_expired_sessions();');

-- Grants for service role (adjust as needed)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Comments for documentation
COMMENT ON TABLE user_profiles IS 'Extended user profiles with subscription and organization information';
COMMENT ON TABLE organizations IS 'Organizations/companies with subscription tiers and repository access';
COMMENT ON TABLE organization_memberships IS 'Many-to-many relationship between users and organizations';
COMMENT ON TABLE security_events IS 'Comprehensive audit log for security events and monitoring';
COMMENT ON TABLE rate_limits IS 'Rate limiting state per user and operation';
COMMENT ON TABLE api_keys IS 'API keys for service accounts and programmatic access';
COMMENT ON TABLE subscriptions IS 'Billing and subscription management';
COMMENT ON TABLE vector_embeddings IS 'Cached vector embeddings for repository analysis';
COMMENT ON TABLE user_sessions IS 'Session management with security features';

-- Initial data for development (optional)
-- INSERT INTO user_profiles (id, email, name, subscription_tier, status, role) 
-- VALUES ('00000000-0000-0000-0000-000000000000', 'admin@codequal.dev', 'System Admin', 'enterprise', 'active', 'system_admin');