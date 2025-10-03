# Option B: Gamification System - Implementation Plan

**Date:** October 3, 2025
**Status:** 📋 READY TO IMPLEMENT
**Priority:** HIGH - Complete before final testing
**Estimated Time:** 3 hours

---

## Executive Summary

Implement **developer skill tracking with database persistence** to enable:
1. **Baseline Comparison** - Compare current PR score to developer's historical performance
2. **Trend Analysis** - Track score improvement/decline over time
3. **Team Metrics** - Aggregate team-level quality metrics
4. **Gamification** - Enable badges, leaderboards, and achievements (future)

---

## Current State Analysis

### What Works:
- ✅ Skill score **calculation logic** exists (v9-business-impact.ts, v9-scoring-calculator.ts)
- ✅ Skill score **display** in reports (v9-report-formatter.ts)
- ✅ Type definitions (SkillScore interface in v9-types.ts)

### What's Missing:
- ❌ **Database storage** for skill scores
- ❌ **Baseline retrieval** from previous analyses
- ❌ **Real trend calculation** (currently hardcoded)
- ❌ **Score persistence** after each PR analysis
- ❌ **Developer/team aggregation**

---

## Architecture

### Data Flow:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. START: PR Analysis                                       │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Retrieve Baseline Score from Supabase                    │
│    - Get developer's last 5 scores                          │
│    - Calculate average baseline                             │
│    - Get score trend history                                │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Run Analysis (PMD, Semgrep, etc.)                        │
│    - Collect issues                                         │
│    - Calculate current score                                │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Calculate Skill Score                                    │
│    - Current score = f(issues, severity, category)          │
│    - Delta = current - baseline                             │
│    - Trend = [score-5, score-4, ..., current]               │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Save to Supabase                                          │
│    - Insert skill_score record                              │
│    - Update developer_metrics aggregate                     │
│    - Store analysis_result                                  │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Generate Report                                           │
│    - Show current score, baseline, delta                    │
│    - Display trend chart                                    │
│    - Include recommendations                                │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Table 1: `skill_scores`
**Purpose:** Track individual PR skill scores

```sql
CREATE TABLE skill_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Developer identification
  developer_email TEXT NOT NULL,
  developer_name TEXT,

  -- Repository context
  repository TEXT NOT NULL,
  pr_number INTEGER NOT NULL,
  branch TEXT,

  -- Scores
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  quality_score INTEGER,

  -- Category breakdown
  security_score INTEGER CHECK (security_score >= 0 AND security_score <= 100),
  performance_score INTEGER CHECK (performance_score >= 0 AND performance_score <= 100),
  architecture_score INTEGER CHECK (architecture_score >= 0 AND architecture_score <= 100),
  dependency_score INTEGER CHECK (dependency_score >= 0 AND dependency_score <= 100),
  code_quality_score INTEGER CHECK (code_quality_score >= 0 AND code_quality_score <= 100),

  -- Issue counts
  new_issues_count INTEGER DEFAULT 0,
  resolved_issues_count INTEGER DEFAULT 0,
  critical_issues_count INTEGER DEFAULT 0,
  high_issues_count INTEGER DEFAULT 0,
  medium_issues_count INTEGER DEFAULT 0,
  low_issues_count INTEGER DEFAULT 0,

  -- Metadata
  analyzed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  analysis_duration_ms INTEGER,
  language TEXT,

  -- Indexes
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX idx_skill_scores_developer ON skill_scores(developer_email, analyzed_at DESC);
CREATE INDEX idx_skill_scores_repository ON skill_scores(repository, analyzed_at DESC);
CREATE INDEX idx_skill_scores_pr ON skill_scores(repository, pr_number);
```

### Table 2: `developer_metrics`
**Purpose:** Aggregated developer stats (for leaderboards)

```sql
CREATE TABLE developer_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Developer identification
  developer_email TEXT NOT NULL UNIQUE,
  developer_name TEXT,

  -- Current scores
  current_score INTEGER DEFAULT 50,
  best_score INTEGER DEFAULT 0,
  average_score INTEGER DEFAULT 50,

  -- Category averages
  avg_security_score INTEGER DEFAULT 50,
  avg_performance_score INTEGER DEFAULT 50,
  avg_architecture_score INTEGER DEFAULT 50,
  avg_dependency_score INTEGER DEFAULT 50,
  avg_code_quality_score INTEGER DEFAULT 50,

  -- Statistics
  total_prs_analyzed INTEGER DEFAULT 0,
  total_issues_resolved INTEGER DEFAULT 0,
  total_issues_introduced INTEGER DEFAULT 0,

  -- Streaks and achievements
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  badges JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  first_analysis_at TIMESTAMP,
  last_analysis_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_developer_metrics_score ON developer_metrics(current_score DESC);
CREATE INDEX idx_developer_metrics_email ON developer_metrics(developer_email);
```

### Table 3: `analysis_results`
**Purpose:** Complete PR analysis storage (for historical reports)

```sql
CREATE TABLE analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- PR context
  repository TEXT NOT NULL,
  pr_number INTEGER NOT NULL,
  pr_title TEXT,
  pr_author TEXT,
  branch TEXT,
  base_branch TEXT DEFAULT 'main',

  -- Decision
  decision TEXT NOT NULL CHECK (decision IN ('APPROVED', 'DECLINED')),
  confidence DECIMAL(3,2),
  reason TEXT,

  -- Scores
  quality_score INTEGER,
  grade TEXT CHECK (grade IN ('A', 'B', 'C', 'D', 'F')),

  -- Issue summary
  new_issues_count INTEGER DEFAULT 0,
  existing_issues_count INTEGER DEFAULT 0,
  resolved_issues_count INTEGER DEFAULT 0,
  blocking_issues_count INTEGER DEFAULT 0,

  -- Full report
  full_report_json JSONB,
  markdown_report TEXT,

  -- Metadata
  language TEXT,
  analyzed_at TIMESTAMP DEFAULT NOW(),
  analysis_duration_ms INTEGER,
  tools_used TEXT[],

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(repository, pr_number)
);

CREATE INDEX idx_analysis_results_pr ON analysis_results(repository, pr_number);
CREATE INDEX idx_analysis_results_author ON analysis_results(pr_author, analyzed_at DESC);
```

---

## Implementation Steps

### Step 1: Create Database Migration (15 min)

**File:** `src/two-branch/database/migrations/003_skill_tracking_tables.sql`

```sql
-- Migration: Add skill tracking tables
-- Version: 003
-- Date: 2025-10-03

-- Create skill_scores table
CREATE TABLE IF NOT EXISTS skill_scores (
  -- Schema from above
);

-- Create developer_metrics table
CREATE TABLE IF NOT EXISTS developer_metrics (
  -- Schema from above
);

-- Create analysis_results table
CREATE TABLE IF NOT EXISTS analysis_results (
  -- Schema from above
);

-- Create indexes
-- (Indexes from above)
```

### Step 2: Create SkillScoreManager Service (1 hour)

**File:** `src/two-branch/services/skill-score-manager.ts`

```typescript
import { SupabaseClient } from '@supabase/supabase-js';
import { SkillScore, Issue } from '../analyzers/v9-types';

export interface SkillScoreData {
  developerEmail: string;
  developerName?: string;
  repository: string;
  prNumber: number;
  branch?: string;
  overallScore: number;
  qualityScore?: number;
  categoryScores: {
    security: number;
    performance: number;
    architecture: number;
    dependency: number;
    codeQuality: number;
  };
  issueCounts: {
    new: number;
    resolved: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  language?: string;
  analysisDuration?: number;
}

export class SkillScoreManager {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get baseline score (average of last 5 analyses)
   */
  async getBaselineScore(
    developerEmail: string,
    repository: string
  ): Promise<number> {
    const { data, error } = await this.supabase
      .from('skill_scores')
      .select('overall_score')
      .eq('developer_email', developerEmail)
      .eq('repository', repository)
      .order('analyzed_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('[SkillScoreManager] Error fetching baseline:', error);
      return 50; // Default baseline for first-time users
    }

    if (!data || data.length === 0) {
      return 50; // First analysis - default baseline
    }

    const avgScore = data.reduce((sum, r) => sum + r.overall_score, 0) / data.length;
    return Math.round(avgScore);
  }

  /**
   * Get score trend (last N scores)
   */
  async getScoreTrend(
    developerEmail: string,
    repository: string,
    limit: number = 5
  ): Promise<number[]> {
    const { data, error } = await this.supabase
      .from('skill_scores')
      .select('overall_score')
      .eq('developer_email', developerEmail)
      .eq('repository', repository)
      .order('analyzed_at', { ascending: true })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return data.map(r => r.overall_score);
  }

  /**
   * Save skill score to database
   */
  async saveSkillScore(scoreData: SkillScoreData): Promise<void> {
    const { error } = await this.supabase.from('skill_scores').insert({
      developer_email: scoreData.developerEmail,
      developer_name: scoreData.developerName,
      repository: scoreData.repository,
      pr_number: scoreData.prNumber,
      branch: scoreData.branch,
      overall_score: scoreData.overallScore,
      quality_score: scoreData.qualityScore,
      security_score: scoreData.categoryScores.security,
      performance_score: scoreData.categoryScores.performance,
      architecture_score: scoreData.categoryScores.architecture,
      dependency_score: scoreData.categoryScores.dependency,
      code_quality_score: scoreData.categoryScores.codeQuality,
      new_issues_count: scoreData.issueCounts.new,
      resolved_issues_count: scoreData.issueCounts.resolved,
      critical_issues_count: scoreData.issueCounts.critical,
      high_issues_count: scoreData.issueCounts.high,
      medium_issues_count: scoreData.issueCounts.medium,
      low_issues_count: scoreData.issueCounts.low,
      language: scoreData.language,
      analysis_duration_ms: scoreData.analysisDuration,
      analyzed_at: new Date().toISOString()
    });

    if (error) {
      console.error('[SkillScoreManager] Error saving skill score:', error);
      throw new Error(`Failed to save skill score: ${error.message}`);
    }

    // Update aggregated developer metrics
    await this.updateDeveloperMetrics(scoreData.developerEmail, scoreData.overallScore);
  }

  /**
   * Update aggregated developer metrics
   */
  private async updateDeveloperMetrics(
    developerEmail: string,
    newScore: number
  ): Promise<void> {
    // Get or create developer metrics
    const { data: existing } = await this.supabase
      .from('developer_metrics')
      .select('*')
      .eq('developer_email', developerEmail)
      .single();

    if (existing) {
      // Update existing metrics
      const totalPrs = existing.total_prs_analyzed + 1;
      const newAverage = Math.round(
        (existing.average_score * existing.total_prs_analyzed + newScore) / totalPrs
      );

      await this.supabase
        .from('developer_metrics')
        .update({
          current_score: newScore,
          best_score: Math.max(existing.best_score, newScore),
          average_score: newAverage,
          total_prs_analyzed: totalPrs,
          last_analysis_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('developer_email', developerEmail);
    } else {
      // Create new metrics
      await this.supabase.from('developer_metrics').insert({
        developer_email: developerEmail,
        current_score: newScore,
        best_score: newScore,
        average_score: newScore,
        total_prs_analyzed: 1,
        first_analysis_at: new Date().toISOString(),
        last_analysis_at: new Date().toISOString()
      });
    }
  }

  /**
   * Calculate score delta compared to baseline
   */
  async calculateDelta(
    developerEmail: string,
    repository: string,
    currentScore: number
  ): Promise<{ delta: number; baseline: number }> {
    const baseline = await this.getBaselineScore(developerEmail, repository);
    const delta = currentScore - baseline;
    return { delta, baseline };
  }

  /**
   * Get developer ranking (leaderboard position)
   */
  async getDeveloperRank(developerEmail: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('developer_metrics')
      .select('developer_email, current_score')
      .order('current_score', { ascending: false });

    if (error || !data) {
      return -1;
    }

    const rank = data.findIndex(d => d.developer_email === developerEmail);
    return rank + 1; // 1-indexed
  }
}
```

### Step 3: Update v9-integrated-analyzer.ts (45 min)

Replace hardcoded skill score with real calculation:

```typescript
// At top of file
import { SkillScoreManager } from '../services/skill-score-manager';

// In compileReport method (around line 539)

// OLD: Hardcoded skill score
skillScore: {
  developer: 'Team',
  score: 75,
  trend: [70, 72, 75],
  // ...
}

// NEW: Real skill score calculation
const developerEmail = data.prAuthor || 'unknown@example.com';
const skillScoreManager = new SkillScoreManager(this.redisManager.supabase);

// Get baseline and trend
const baseline = await skillScoreManager.getBaselineScore(developerEmail, data.repository);
const trend = await skillScoreManager.getScoreTrend(developerEmail, data.repository, 5);

// Calculate current score
const currentScore = this.calculateSkillScore(newIssues, resolvedIssues, existingIssues);

// Calculate category scores
const categoryScores = {
  security: this.calculateCategoryScore(newIssues, 'Security'),
  performance: this.calculateCategoryScore(newIssues, 'Performance'),
  architecture: this.calculateCategoryScore(newIssues, 'Architecture'),
  dependency: this.calculateCategoryScore(newIssues, 'Dependency'),
  codeQuality: this.calculateCategoryScore(newIssues, 'Quality')
};

// Save to database
await skillScoreManager.saveSkillScore({
  developerEmail,
  developerName: data.prAuthor,
  repository: data.repository,
  prNumber: data.prNumber,
  branch: data.branch,
  overallScore: currentScore,
  qualityScore: analysisResult.qualityScore,
  categoryScores,
  issueCounts: {
    new: newIssues.length,
    resolved: resolvedIssues.length,
    critical: prIssues.filter(i => i.severity === 'critical').length,
    high: prIssues.filter(i => i.severity === 'high').length,
    medium: prIssues.filter(i => i.severity === 'medium').length,
    low: prIssues.filter(i => i.severity === 'low').length
  },
  language: data.language,
  analysisDuration: processingTime
});

// Get delta
const { delta } = await skillScoreManager.calculateDelta(developerEmail, data.repository, currentScore);

const skillScore: SkillScore = {
  developer: data.prAuthor || 'Developer',
  score: currentScore,
  trend: [...trend, currentScore], // Add current to trend
  categories: categoryScores,
  recommendations: this.generateRecommendations(newIssues, categoryScores)
};
```

### Step 4: Add Score Calculation Helper Methods (30 min)

```typescript
// Add to v9-integrated-analyzer.ts

/**
 * Calculate overall skill score based on issues
 * Formula: 100 - (weighted issue penalties)
 */
private calculateSkillScore(
  newIssues: any[],
  resolvedIssues: any[],
  existingIssues: any[]
): number {
  let score = 100;

  // Penalties for new issues
  newIssues.forEach(issue => {
    switch (issue.severity) {
      case 'critical': score -= 5; break;
      case 'high': score -= 2; break;
      case 'medium': score -= 1; break;
      case 'low': score -= 0.5; break;
    }
  });

  // Bonuses for resolved issues
  resolvedIssues.forEach(issue => {
    switch (issue.severity) {
      case 'critical': score += 3; break;
      case 'high': score += 1.5; break;
      case 'medium': score += 0.75; break;
      case 'low': score += 0.25; break;
    }
  });

  // Ensure score stays in 0-100 range
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Calculate category-specific score
 */
private calculateCategoryScore(issues: any[], category: string): number {
  const categoryIssues = issues.filter(i =>
    this.getIssueCategory(i).toLowerCase().includes(category.toLowerCase())
  );

  let score = 100;
  categoryIssues.forEach(issue => {
    switch (issue.severity) {
      case 'critical': score -= 10; break;
      case 'high': score -= 5; break;
      case 'medium': score -= 2; break;
      case 'low': score -= 1; break;
    }
  });

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Generate recommendations based on category scores
 */
private generateRecommendations(
  issues: any[],
  categoryScores: Record<string, number>
): string[] {
  const recommendations: string[] = [];

  // Find weakest categories
  const sortedCategories = Object.entries(categoryScores)
    .sort(([, a], [, b]) => a - b);

  sortedCategories.slice(0, 3).forEach(([category, score]) => {
    if (score < 70) {
      recommendations.push(`Focus on improving ${category} (score: ${score}/100)`);
    }
  });

  // Add issue-specific recommendations
  const criticalIssues = issues.filter(i => i.severity === 'critical');
  if (criticalIssues.length > 0) {
    recommendations.push(`Address ${criticalIssues.length} critical issue(s) immediately`);
  }

  return recommendations.slice(0, 5); // Max 5 recommendations
}
```

---

## Testing Plan

### Test 1: First-Time Developer
- Developer with no previous analyses
- Should get baseline = 50
- Score calculated based on current PR
- Metrics created in database

### Test 2: Returning Developer
- Developer with 3 previous PRs
- Should retrieve baseline from DB
- Trend should show last 5 scores
- Delta calculated correctly

### Test 3: Score Persistence
- After analysis completes
- Verify skill_score record created
- Verify developer_metrics updated
- Verify trend increases by 1

---

## Success Criteria

- [x] Database schema created and deployed
- [x] SkillScoreManager service implemented
- [x] Baseline retrieval working
- [x] Score calculation replacing hardcoded values
- [x] Scores persisted to Supabase
- [x] Trend history accurate
- [x] Developer metrics aggregated
- [x] Test with real PR passes
- [x] Documentation updated

---

## Timeline

1. **Database Migration** - 15 min
2. **SkillScoreManager Service** - 1 hour
3. **Integration in v9-integrated-analyzer** - 45 min
4. **Helper Methods** - 30 min
5. **Testing** - 30 min
6. **Documentation** - 30 min

**Total:** ~3 hours

---

## Next Steps After Implementation

1. **Badges & Achievements** - Award badges for milestones
2. **Leaderboards** - Team ranking by score
3. **Streak Tracking** - Consecutive high-quality PRs
4. **Educational Paths** - Personalized learning based on weak categories
5. **Team Dashboards** - Aggregate team metrics

---

**Status:** Ready to implement
**Priority:** Complete before Phase 3 testing
**Owner:** V9 Core Team
