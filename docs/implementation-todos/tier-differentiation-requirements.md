# Tier Differentiation Implementation Requirements

*Created: December 21, 2025*  
*Updated: December 21, 2025*  
*Purpose: Track all implementation work needed for BASIC vs PRO tier differentiation*

## Overview

This document outlines all backend changes, database schema updates, and V9 formatter modifications needed to support the tier-based report design discussed in the UX/UI sessions.

---

## 1. Database Schema Updates

### 1.1 Pattern Contribution Tracking

**New Tables Needed:**

```sql
-- Track which user/org contributed each pattern
CREATE TABLE pattern_contributions (
  id UUID PRIMARY KEY,
  pattern_id UUID REFERENCES fix_patterns(id),
  contributor_user_id UUID,
  contributor_org_id UUID,
  is_anonymous BOOLEAN DEFAULT FALSE,  -- User preference
  contributed_at TIMESTAMPTZ,
  source_pr TEXT,  -- PR that generated this pattern
  source_repo TEXT,
  language TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track pattern usage by other users
CREATE TABLE pattern_usage_stats (
  id UUID PRIMARY KEY,
  pattern_id UUID REFERENCES fix_patterns(id),
  used_by_user_id UUID,
  used_by_org_id UUID,
  usage_count INTEGER DEFAULT 0,
  time_saved_minutes FLOAT,  -- Estimated time saved
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Community impact metrics
CREATE TABLE community_impact_metrics (
  id UUID PRIMARY KEY,
  user_id UUID,
  org_id UUID,
  patterns_contributed INTEGER DEFAULT 0,
  users_helped INTEGER DEFAULT 0,
  total_time_saved_hours FLOAT DEFAULT 0,
  month DATE,  -- For monthly aggregation
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, org_id, month)
);

-- User preferences
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE,
  anonymous_contributions BOOLEAN DEFAULT FALSE,
  achievement_style TEXT DEFAULT 'professional', -- 'professional' or 'gamified'
  show_team_comparison BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Example Data:**
```sql
-- Example pattern contribution
INSERT INTO pattern_contributions VALUES (
  'uuid-1',
  'pattern-123',
  'user-456',
  'org-789',
  false, -- not anonymous
  '2025-12-21T10:00:00Z',
  'PR #123',
  'org/repo',
  'typescript'
);

-- Example usage tracking
INSERT INTO pattern_usage_stats VALUES (
  'uuid-2',
  'pattern-123',
  'user-999',
  'org-888',
  5, -- used 5 times
  15.5, -- saved 15.5 minutes
  '2025-12-21T11:00:00Z'
);
```

### 1.2 User Analytics & Progress Tracking

```sql
-- Historical analysis data (5 PR retention per user)
CREATE TABLE analysis_history (
  id UUID PRIMARY KEY,
  user_id UUID,
  org_id UUID,
  pr_number INTEGER,
  repository TEXT,
  analysis_date TIMESTAMPTZ,
  score INTEGER,
  issues_found INTEGER,
  issues_fixed INTEGER,
  time_saved_minutes FLOAT,
  cost_saved_dollars FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add cleanup policy
CREATE OR REPLACE FUNCTION cleanup_old_analyses() RETURNS void AS $$
BEGIN
  -- Keep only last 5 PRs per user
  DELETE FROM analysis_history
  WHERE (user_id, analysis_date) NOT IN (
    SELECT user_id, analysis_date
    FROM (
      SELECT user_id, analysis_date,
             ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY analysis_date DESC) as rn
      FROM analysis_history
    ) t
    WHERE rn <= 5
  );
END;
$$ LANGUAGE plpgsql;

-- Skill progression tracking (3 month retention)
CREATE TABLE skill_scores (
  id UUID PRIMARY KEY,
  user_id UUID,
  date DATE,
  security_score INTEGER,
  code_quality_score INTEGER,
  performance_score INTEGER,
  architecture_score INTEGER,
  overall_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Achievement system
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY,
  user_id UUID,
  achievement_id TEXT,
  achievement_name TEXT,
  achievement_tier TEXT, -- common, rare, epic, legendary
  display_style TEXT, -- 'badge' or 'certificate'
  unlocked_at TIMESTAMPTZ,
  pr_number INTEGER,
  repository TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Example Data:**
```sql
-- Example achievement unlock
INSERT INTO user_achievements VALUES (
  'uuid-3',
  'user-456',
  'security-guardian',
  'Security Guardian',
  'rare',
  'badge',
  '2025-12-21T10:30:00Z',
  123,
  'org/repo'
);

-- Example skill progression
INSERT INTO skill_scores VALUES (
  'uuid-4',
  'user-456',
  '2025-12-21',
  85, -- security
  78, -- code quality
  72, -- performance
  80, -- architecture
  79  -- overall
);
```

### 1.3 Data Retention Policies

```sql
-- Retention configuration table
CREATE TABLE data_retention_policies (
  id UUID PRIMARY KEY,
  data_type TEXT UNIQUE,
  retention_days INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default policies
INSERT INTO data_retention_policies (data_type, retention_days) VALUES
  ('analysis_history_pr_count', 5), -- Keep last 5 PRs
  ('skill_scores', 90),              -- 3 months
  ('pattern_usage_stats', 180),      -- 6 months
  ('community_impact_metrics', 365), -- 12 months
  ('achievements', NULL);            -- Keep forever
```

---

## 2. V9 Formatter Modifications

### 2.1 BusinessImpactAnalysis Updates

**File:** `src/two-branch/report/business-impact.ts`

```typescript
interface BusinessImpactEnhancements {
  // Add tier parameter
  generateBusinessImpact(
    issues: EnrichedIssue[], 
    groups: IssueGroup[], 
    language: string,
    tier: 'basic' | 'pro',
    userMetrics?: {
      previousAnalyses?: AnalysisHistory[];
      monthlyStats?: MonthlyStats;
      patternContributions?: PatternContribution[];
    }
  ): string;
}

// Example output for BASIC tier:
/*
## 💼 Business Impact Analysis

### Time & Cost Analysis
| Metric | Manual Fix | With CodeQual BASIC |
|--------|------------|---------------------|
| **Developer Time** | 8.0 hours | **2.5 hours** |
| **Cost (@$150/hr)** | $1,200 | **$375** |
| **Time Reduction** | - | **69%** ✅ |

💡 **Upgrade to PRO**: Reduce 2.5 hours to 30 seconds
*/

// Example output for PRO tier:
/*
## 💼 Business Impact Analysis

### Automated Fix Pipeline
| Stage | Items | Status | Time |
|-------|-------|--------|------|
| **Pattern Fixes** | 5 issues | ✅ Ready | Instant |
| **AI Generation** | 7 issues | ✅ Ready | ~25 sec |

### Financial Dashboard
| Metric | This PR | This Month | YTD |
|--------|---------|------------|-----|
| **Time Saved** | 7.5 hrs | 142 hrs | 1,680 hrs |
| **ROI** | 3,750% | 7,333% | 7,241% |
*/
```

### 2.2 New Report Sections

**File:** `src/two-branch/report/community-impact.ts` (NEW)

```typescript
interface CommunityImpactSection {
  generateCommunityImpact(
    userId: string,
    contributions: PatternContribution[],
    usage: PatternUsageStats[],
    isAnonymous: boolean
  ): string;
}

// Example output (PRO tier, non-anonymous):
/*
## 🌟 Your Community Impact

### Pattern Contributions
You've contributed **23 patterns** that have been reused **147 times** by other developers,
saving the community **89 hours** of development time.

**Top Pattern**: SQL Injection Fix
- Used by: 45 developers
- Time saved: 22.5 hours
- Languages: TypeScript, JavaScript

### Recognition
🏆 Top 5% contributor this month
🌟 Pattern Quality Score: 94/100

[View All Patterns] [Share Profile]
*/

// Example output (PRO tier, anonymous):
/*
## 🌟 Community Impact

### Anonymous Contributions
Your patterns have been reused **147 times**, saving **89 hours** across the community.

[Enable Profile Sharing] [View Statistics]
*/
```

**File:** `src/two-branch/report/promotional-offers.ts` (NEW)

```typescript
interface PromotionalOffers {
  checkEligibility(userId: string): Promise<PromoType>;
  generatePromoSection(promo: PromoType): string;
}

// Example output (BASIC tier with promo):
/*
## 🎁 Limited Time Offer!

**Try PRO Features FREE** for this PR!
You're eligible for a one-time PRO analysis. Experience:
- ✅ Automated fixes (save 2.5 hours)
- 📊 Advanced analytics
- 🏆 Achievement tracking

[🚀 Activate PRO Trial] [Learn More]
*/
```

### 2.3 Achievement System Styles

```typescript
interface AchievementStyles {
  professional: {
    format: 'certificate',
    tone: 'formal',
    icons: 'minimal'
  },
  gamified: {
    format: 'badge',
    tone: 'playful',
    icons: 'colorful'
  }
}

// Example professional style:
/*
## 📜 Professional Certifications

### Security Specialist
Awarded for maintaining zero security vulnerabilities across 10 consecutive PRs.
Date: December 21, 2025
Credential ID: SEC-2025-456

[Download Certificate] [Add to LinkedIn]
*/

// Example gamified style:
/*
## 🏆 Achievements Unlocked!

### 🛡️ Security Guardian (Rare - 15% of users)
You've vanquished 50 security demons! 
+100 XP | Unlocked: Shadow Shield ability

### ⚡ Speed Demon (Epic - 5% of users)
Fixed 20 issues in under 60 seconds!
+200 XP | Next: Legendary Fixer (30 issues)

[View Trophy Case] [Share Achievement]
*/
```

---

## 3. API & Service Layer Updates

### 3.1 Analysis Service Enhancements

```typescript
// Example API calls and responses

// BASIC tier request
POST /api/analyze
{
  "repositoryUrl": "https://github.com/org/repo",
  "prNumber": 123,
  "userTier": "basic"
}

// BASIC tier response (simplified)
{
  "report": {
    "score": 78,
    "issues": [...],
    "recommendations": [...],
    "downloadLinks": {
      "lsp": "https://...",
      "sarif": "https://...",
      "markdown": "https://..."
    }
  }
}

// PRO tier request
POST /api/analyze
{
  "repositoryUrl": "https://github.com/org/repo",
  "prNumber": 123,
  "userTier": "pro",
  "includeHistoricalData": true,
  "includeCommunityImpact": true
}

// PRO tier response (comprehensive)
{
  "report": {
    "score": 78,
    "issues": [...],
    "autoFixes": {
      "available": 12,
      "patterns": 5,
      "ai": 7,
      "estimatedTime": "30 seconds"
    },
    "historicalTrends": [...],
    "communityImpact": {...},
    "achievements": [...],
    "financialDashboard": {...}
  },
  "actions": {
    "applyFixes": "POST /api/fixes/apply",
    "preview": "GET /api/fixes/preview",
    "createPR": "POST /api/fixes/pr"
  }
}
```

---

## 4. Promotional System

```typescript
interface PromotionalRules {
  // One-time PRO trial for BASIC users
  eligibility: {
    minDaysSinceSignup: 7,
    minAnalysesRun: 3,
    hasNotUsedPromo: true
  },
  
  // Promotional triggers
  triggers: [
    'firstSecurityIssue',    // Found first security vulnerability
    'tenthAnalysis',         // Milestone achievement
    'highIssueCount',        // PR with 20+ issues
    'weeklyActive'           // Used 3+ times this week
  ]
}

// Example promo check
async function checkPromoEligibility(userId: string): Promise<boolean> {
  const user = await getUser(userId);
  const usage = await getUsageStats(userId);
  
  return (
    user.tier === 'basic' &&
    user.daysSinceSignup >= 7 &&
    usage.totalAnalyses >= 3 &&
    !user.hasUsedProTrial
  );
}
```

---

## 5. Updated Open Questions Resolution

1. **Pattern contributions anonymity**: ✅ Optional - user preference with `anonymous_contributions` flag
2. **Historical data retention**: ✅ Defined:
   - Last 5 PRs for detailed analysis
   - 3 months for skill scores
   - 6 months for pattern usage
   - 12 months for community metrics
3. **BASIC users seeing PRO features**: ✅ Promotional system only - occasional free PRO analysis
4. **Solo developer metrics**: ✅ Drop team comparison for accounts with <2 members
5. **Achievement styles**: ✅ User configurable - professional vs gamified

---

## Notes

- Keep existing V9 formatter working during transition
- Use feature flags for gradual rollout
- Monitor performance impact of new queries
- Consider caching strategy for analytics data
- Plan for data privacy/GDPR compliance
- Anonymous contribution option requires careful UI consideration
