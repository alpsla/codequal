# Report Generation Issues to Fix

## Critical Issues Identified

### 1. ❌ File Coverage Issue
**Current:** Analyzing only 500 files out of 1000 (50% coverage)
**Expected:** Should analyze 100% of files when total < 10,000
**Fix:** Update CloudRepositoryManager to analyze all files for repos under 10K files

### 2. ❌ Missing Code Snippets and Fix Recommendations
**Current:** Issues show "undefined" for description, impact, and code snippets
**Expected:**
- Agent should fetch actual code from file location
- Provide specific fix recommendations with code examples
- Include before/after code snippets

### 3. ❌ Scoring System Not Implemented
**Current:** Random/hardcoded scores
**Expected Scoring System:**
```
Issue Penalties (negative):
- Critical: -5 points
- High: -3 points
- Medium: -1 point
- Low: -0.5 points

Resolution Bonuses (positive):
- Critical resolved: +5 points
- High resolved: +3 points
- Medium resolved: +1 point
- Low resolved: +0.5 points

Base Scores:
- Project starts at 100/100
- New developers start at 50/100
- Scores persist in Supabase
```

### 4. ❌ Skills Tracking Not Connected to Supabase
**Current:** Hardcoded developer scores
**Expected:**
- Fetch developer's previous score from Supabase
- Calculate new score based on PR performance
- Store updated score in Supabase
- Show trend over last 3 PRs

### 5. ❌ Educational Resources Not Mapped to Issues
**Current:** Generic training recommendations
**Expected:**
- Map each issue type to specific training resources
- Prioritize based on actual issues found
- Example: If "nested if statements" found → Link to refactoring tutorials

### 6. ❌ Outdated Model Configurations
**Current:** Hardcoded models (claude-3-opus, gpt-4, deepseek-v2)
**Expected:**
- Fetch current model configurations from Supabase
- Use models like claude-3.5-sonnet, gpt-4-turbo, etc.

### 7. ❌ Tool Performance Data Missing
**Current:** "No tools data available"
**Expected:**
- Show actual tool execution times
- Display number of issues found per tool
- Include tool-specific metrics

## Implementation Plan

### Phase 1: Fix Data Structure (Immediate)
1. Update issue parsing to include all fields
2. Implement proper scoring calculation
3. Fix file coverage logic

### Phase 2: Supabase Integration
1. Create developer_scores table if not exists
2. Implement score fetching and updating
3. Store PR analysis results

### Phase 3: Enhanced Analysis
1. Add code snippet fetching
2. Generate fix recommendations
3. Map educational resources to issues

## Updated Issue Structure

```typescript
interface Issue {
  id: string;
  title: string;
  description: string;  // Not undefined
  impact: string;       // Business impact description
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  file: string;
  line: number;
  column?: number;
  tool: string;
  agent: string;
  codeSnippet: {
    before: string;    // Current problematic code
    after?: string;    // Suggested fix
  };
  fixRecommendation: string;  // How to fix
  educationalResources: {
    title: string;
    url: string;
    duration: string;
  }[];
  inModifiedFile: boolean;
  scoreImpact: number;  // -5, -3, -1, or -0.5
}
```

## Scoring Algorithm

```typescript
function calculateScore(issues: Issue[], resolvedIssues: Issue[]): number {
  const baseScore = 100;

  // Calculate penalties
  const penalties = issues.reduce((total, issue) => {
    const impact = {
      'critical': -5,
      'high': -3,
      'medium': -1,
      'low': -0.5
    };
    return total + (impact[issue.severity] || 0);
  }, 0);

  // Calculate bonuses
  const bonuses = resolvedIssues.reduce((total, issue) => {
    const bonus = {
      'critical': 5,
      'high': 3,
      'medium': 1,
      'low': 0.5
    };
    return total + (bonus[issue.severity] || 0);
  }, 0);

  return Math.max(0, Math.min(100, baseScore + penalties + bonuses));
}
```

## Developer Skills Tracking

```typescript
interface DeveloperSkills {
  email: string;
  currentScore: number;      // Current PR score
  previousScores: number[];  // Last 3 PR scores
  trend: 'improving' | 'declining' | 'stable';
  categories: {
    security: number;      // 0-100
    performance: number;   // 0-100
    quality: number;       // 0-100
    architecture: number;  // 0-100
    dependency: number;    // 0-100
  };
  lastUpdated: Date;
}
```

## Supabase Schema

```sql
-- Developer scores table
CREATE TABLE IF NOT EXISTS developer_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  current_score INTEGER DEFAULT 50,
  score_history JSONB DEFAULT '[]',
  category_scores JSONB DEFAULT '{}',
  total_prs INTEGER DEFAULT 0,
  last_pr_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- PR analysis results
CREATE TABLE IF NOT EXISTS pr_analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository VARCHAR(255) NOT NULL,
  pr_number INTEGER NOT NULL,
  developer_email VARCHAR(255) NOT NULL,
  quality_score INTEGER,
  issues_found INTEGER,
  issues_resolved INTEGER,
  decision VARCHAR(50),
  analysis_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Educational Resource Mapping

```typescript
const issueEducationMap = {
  'nested-if': {
    title: 'Refactoring Nested Conditionals',
    resources: [
      {
        title: 'Replace Nested Conditional with Guard Clauses',
        url: 'https://refactoring.guru/replace-nested-conditional-with-guard-clauses',
        duration: '15 min'
      },
      {
        title: 'Clean Code: Functions',
        url: 'https://www.youtube.com/watch?v=specific-video',
        duration: '30 min'
      }
    ]
  },
  'cyclomatic-complexity': {
    title: 'Reducing Code Complexity',
    resources: [
      {
        title: 'Understanding Cyclomatic Complexity',
        url: 'https://www.baeldung.com/java-cyclomatic-complexity',
        duration: '20 min'
      }
    ]
  }
  // ... more mappings
};
```

## Next Steps

1. Update `test-cloud-java-complete.ts` to implement proper issue structure
2. Create Supabase integration module
3. Update `V9ReportFormatterFinal` to use real data
4. Test with actual code repositories
5. Validate scoring algorithm accuracy