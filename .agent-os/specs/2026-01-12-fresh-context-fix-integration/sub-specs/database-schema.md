# Database Schema

This is the database schema implementation for the spec detailed in @.agent-os/specs/2026-01-12-fresh-context-fix-integration/spec.md

## Pending Migrations

The following migrations were created in Sessions 81-82 and need to be applied:

### 1. Fix Pattern Guidance (Session 81)

**File:** `database/migrations/20260109_fix_pattern_guidance.sql`

```sql
-- Table: fix_pattern_guidance
-- Stores KB guidance for fix generation (anti-patterns, correct patterns)

CREATE TABLE IF NOT EXISTS fix_pattern_guidance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id VARCHAR(100) NOT NULL,
  language VARCHAR(50) NOT NULL,
  tool VARCHAR(50) NOT NULL,

  -- Guidance content
  anti_patterns TEXT[],           -- Patterns that cause regressions
  correct_patterns TEXT[],        -- Proven working patterns
  prompt_additions TEXT,          -- Extra instructions for AI

  -- Metadata
  success_rate DECIMAL(5,2),      -- Historical success rate
  sample_count INTEGER DEFAULT 0,  -- Number of samples
  last_updated TIMESTAMP DEFAULT NOW(),

  UNIQUE(rule_id, language, tool)
);

CREATE INDEX idx_fix_pattern_lookup
  ON fix_pattern_guidance(rule_id, language, tool);
```

### 2. Fix Failure Tracking (Session 81)

**File:** `database/migrations/20260109_fix_failure_tracking.sql`

```sql
-- Table: fix_failure_tracking
-- Tracks failed fix attempts for KB learning

CREATE TABLE IF NOT EXISTS fix_failure_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id VARCHAR(100) NOT NULL,
  language VARCHAR(50) NOT NULL,
  tool VARCHAR(50) NOT NULL,

  -- Failure details
  failure_type VARCHAR(50) NOT NULL,  -- 'regression', 'no_fix', 'syntax_error'
  regression_rules TEXT[],             -- Rules triggered by regression
  original_code TEXT,
  attempted_fix TEXT,                  -- JSON array of all attempts

  -- Metadata
  reviewed BOOLEAN DEFAULT FALSE,
  review_outcome VARCHAR(50),          -- 'guidance_added', 'false_positive', etc.
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_failure_review ON fix_failure_tracking(reviewed, rule_id)
);

-- View: Patterns needing review (3+ failures)
CREATE VIEW fix_failures_needing_review AS
SELECT
  rule_id, language, tool,
  COUNT(*) as failure_count,
  array_agg(DISTINCT failure_type) as failure_types
FROM fix_failure_tracking
WHERE reviewed = FALSE
GROUP BY rule_id, language, tool
HAVING COUNT(*) >= 3;
```

### 3. Repository Learnings (Session 82)

**File:** `database/migrations/20260112_repository_learnings.sql`

```sql
-- Table: repository_learnings
-- Cross-repository knowledge sharing

CREATE TABLE IF NOT EXISTS repository_learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository VARCHAR(255) NOT NULL,
  organization VARCHAR(100),
  language VARCHAR(50) NOT NULL,
  frameworks TEXT[],

  -- Learning content
  learning_type VARCHAR(50) NOT NULL,  -- 'pattern', 'codebase', 'anti_pattern'
  insight TEXT NOT NULL,
  context TEXT,

  -- Sharing settings
  confidence INTEGER DEFAULT 50,       -- 0-100
  cross_repo_shareable BOOLEAN DEFAULT FALSE,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  last_used TIMESTAMP,
  use_count INTEGER DEFAULT 0
);

CREATE INDEX idx_repo_learnings_lookup
  ON repository_learnings(repository, language);
CREATE INDEX idx_repo_learnings_org
  ON repository_learnings(organization, language);
CREATE INDEX idx_repo_learnings_shareable
  ON repository_learnings(cross_repo_shareable, language, confidence);
```

## Application Commands

```bash
# Apply all migrations
cd /Users/alpinro/CodePrjects/codequal

# If using Supabase CLI
supabase db push

# If using psql directly
psql $DATABASE_URL -f database/migrations/20260109_fix_pattern_guidance.sql
psql $DATABASE_URL -f database/migrations/20260109_seed_fix_pattern_guidance.sql
psql $DATABASE_URL -f database/migrations/20260109_fix_failure_tracking.sql
psql $DATABASE_URL -f database/migrations/20260112_repository_learnings.sql
```

## Fallback: In-Memory Mode

If Supabase is unavailable, all services fall back to in-memory storage with pre-seeded patterns:

- `EmptyCatchBlock` - Proper exception handling
- `CloseResource` - Try-with-resources pattern
- `AvoidCatchingThrowable` - Specific exception types
- `UseUtilityClass` - Private constructor pattern

This ensures the system works without database connectivity.
