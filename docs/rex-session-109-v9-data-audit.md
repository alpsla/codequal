# Session 109: V9 Raw Data Audit for Report UI

**Goal**: Audit the V9 analysis output to verify all required data fields exist for the Report UI. Identify gaps before building UI.

**Prerequisites**:
- Session 108 complete (patterns fixed, pushed to main)
- V9 analysis service working
- Test repository available

---

## Tasks

### 1. Run V9 Analysis on Test Repository
**Goal**: Generate a complete V9 analysis output for auditing
**Steps**:
1. Select test repository (spring-petclinic recommended - has diverse issues)
2. Run V9 analysis with complete mode
3. Save raw JSON output for inspection
**Commands**:
```bash
cd packages/agents
npx ts-node tests/integration/test-v9-lite-e2e.ts > /tmp/v9-raw-output.json 2>&1
```
**Files**:
- `/tmp/v9-raw-output.json` - Raw analysis output

---

### 2. Audit Quality Scores Section
**Goal**: Verify quality score data exists for dashboard
**Required Fields**:
```typescript
interface QualityScores {
  overall: number;           // 0-100 overall score
  security: number;          // 0-100 security score
  codeQuality: number;       // 0-100 quality score
  performance: number;       // 0-100 performance score
  maintainability: number;   // 0-100 maintainability score
  grade: 'A' | 'B' | 'C' | 'D' | 'F';  // Letter grade
  trend?: {
    previousScore: number;
    change: number;          // Positive = improvement
    direction: 'up' | 'down' | 'stable';
  };
}
```
**Steps**:
1. Search V9 output for score fields
2. Document which fields exist
3. Document which fields are MISSING
4. Note field locations in output structure

---

### 3. Audit Issue Summary Section
**Goal**: Verify issue categorization data exists
**Required Fields**:
```typescript
interface IssueSummary {
  total: number;
  new: number;               // NEW issues (introduced in PR)
  fixed: number;             // RESOLVED issues (fixed by PR)
  existingModified: number;  // Pre-existing in modified files
  existingRest: number;      // Pre-existing in unchanged files

  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };

  byCategory: {
    security: number;
    codeQuality: number;
    performance: number;
    dependency: number;
    architecture: number;
  };

  blocking: number;          // Issues that block merge
  autoFixed: number;         // Issues auto-fixed by CodeQual
  manualRequired: number;    // Issues needing manual fix
}
```
**Steps**:
1. Search V9 output for issue counts
2. Verify categorization (NEW/FIXED/EXISTING) exists
3. Verify severity breakdown exists
4. Document missing fields

---

### 4. Audit Issue Details Section
**Goal**: Verify individual issue data is complete
**Required Fields**:
```typescript
interface IssueDetail {
  id: string;
  ruleId: string;
  tool: string;

  // Location
  file: string;
  line: number;
  column?: number;
  endLine?: number;
  endColumn?: number;

  // Content
  message: string;
  description?: string;      // Extended explanation
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;

  // Code context
  codeSnippet?: string;      // Affected code lines

  // Fix information
  hasFix: boolean;
  fixAvailable: boolean;
  fixConfidence?: number;    // 0-100
  suggestedFix?: string;     // Fix suggestion text

  // Status
  status: 'new' | 'fixed' | 'existing';
  blocksMerge: boolean;

  // Educational
  documentationUrl?: string;
  learnMoreUrl?: string;
}
```
**Steps**:
1. Pick 5 sample issues from output
2. Check each required field exists
3. Document missing fields per issue
4. Note if fields are inconsistent across issues

---

### 5. Audit Fix Details Section
**Goal**: Verify fix data is complete for showing diffs
**Required Fields**:
```typescript
interface FixDetail {
  issueId: string;
  file: string;
  line: number;

  // Code changes
  originalCode: string;      // Code before fix
  fixedCode: string;         // Code after fix
  diff?: string;             // Unified diff format

  // Metadata
  tier: 'tier1' | 'tier2' | 'tier3';
  tool: string;              // Tool that made the fix
  confidence: number;        // 0-100

  // Status
  applied: boolean;
  verified: boolean;

  // For manual fixes
  suggestion?: string;
  steps?: string[];
}
```
**Steps**:
1. Find CategorizedFix[] in output
2. Verify originalCode and fixedCode exist
3. Check diff generation
4. Document missing fields

---

### 6. Audit Unfixed Issues Section
**Goal**: Verify manual guidance data exists
**Required Fields**:
```typescript
interface UnfixedIssueDetail {
  issueId: string;
  reason: string;            // Why not fixed
  explanation: string;       // Human-readable explanation

  // Author guidance
  authorAction: {
    type: 'review_and_fix' | 'investigate' | 'refactor' | 'upgrade_dependency' | 'accept_risk';
    description: string;
    steps: string[];
    blocksMerge: boolean;
  };

  reviewPriority: 'critical' | 'high' | 'medium' | 'low';
  estimatedEffort: 'trivial' | 'minor' | 'moderate' | 'significant';
  suggestedApproach?: string;
  documentationLinks?: string[];
}
```
**Steps**:
1. Find UnfixedIssue[] in output
2. Verify guidance fields exist
3. Check authorAction has steps
4. Document missing fields

---

### 7. Audit Educational Content Section
**Goal**: Verify learning resources data exists
**Required Fields**:
```typescript
interface EducationalContent {
  // Per-issue education
  issueExplanations: {
    [ruleId: string]: {
      title: string;
      whatItMeans: string;
      whyItMatters: string;
      howToFix: string;
      examples?: {
        bad: string;
        good: string;
      };
      learnMoreUrl?: string;
    };
  };

  // Aggregated learning
  recommendedResources: {
    title: string;
    url: string;
    relevantTo: string[];    // Which issues this helps with
  }[];

  // Skill-based recommendations
  skillGaps: {
    skill: string;
    currentLevel: number;
    issuesRelated: number;
    recommendedLearning: string[];
  }[];
}
```
**Steps**:
1. Search for educational content in output
2. Check if rule explanations exist
3. Check if learning resources are generated
4. Document what AI enrichment provides

---

### 8. Audit Gamification Section
**Goal**: Verify XP, levels, badges, skills data exists
**Required Fields**:
```typescript
interface GamificationData {
  // User progress
  user: {
    level: number;
    xp: number;
    xpToNextLevel: number;
    rank?: string;           // e.g., "Security Champion"
  };

  // This PR contribution
  prContribution: {
    xpEarned: number;
    issuesFixed: number;
    newBadges: string[];
    skillsImproved: string[];
  };

  // Badges
  badges: {
    id: string;
    name: string;
    description: string;
    earned: boolean;
    earnedAt?: string;
    progress?: number;       // For partial progress badges
  }[];

  // Skills
  skills: {
    name: string;            // e.g., "TypeScript", "Security", "Performance"
    level: number;           // 1-5
    xp: number;
    issuesInCategory: number;
  }[];
}
```
**Steps**:
1. Search for gamification data in output
2. Check if XP calculation exists
3. Check if badge/achievement system outputs data
4. Check if skills tracking exists
5. Document what's missing

---

### 9. Audit Export Metadata Section
**Goal**: Verify data needed for SARIF/GitLab exports exists
**Required Fields**:
```typescript
interface ExportMetadata {
  // SARIF requirements
  sarif: {
    version: '2.1.0';
    schema: string;
    runs: {
      tool: { name: string; version: string; };
      results: SARIFResult[];
    }[];
  };

  // GitLab Code Quality
  gitlabCodeQuality: {
    issues: {
      description: string;
      fingerprint: string;
      severity: 'blocker' | 'critical' | 'major' | 'minor' | 'info';
      location: { path: string; lines: { begin: number; }; };
    }[];
  };

  // General metadata
  analysisId: string;
  repositoryUrl: string;
  prNumber?: number;
  baseBranch: string;
  prBranch: string;
  analyzedAt: string;
  duration: number;
}
```
**Steps**:
1. Check if SARIF export structure exists
2. Check if GitLab format exists
3. Verify metadata fields
4. Document missing export data

---

### 10. Create Data Gap Report
**Goal**: Document all missing fields for UI development
**Steps**:
1. Compile all missing fields from tasks 2-9
2. Categorize by priority (P0 = blocks UI, P1 = important, P2 = nice-to-have)
3. Create action items for filling gaps
4. Save report to docs/
**Output File**: `docs/V9_DATA_GAP_REPORT.md`

**Report Template**:
```markdown
# V9 Data Gap Report

## Summary
- Total required fields: X
- Fields present: Y
- Fields missing: Z
- Coverage: Y/X%

## P0 - Blocks UI Development
| Field | Section | Current State | Action Required |
|-------|---------|---------------|-----------------|

## P1 - Important for Full Experience
| Field | Section | Current State | Action Required |
|-------|---------|---------------|-----------------|

## P2 - Nice to Have
| Field | Section | Current State | Action Required |
|-------|---------|---------------|-----------------|

## Action Items
1. [ ] ...
2. [ ] ...
```

---

## Validation

```bash
# Verify V9 output structure
cd packages/agents
npx ts-node -e "
import { V9PRAnalyzer } from './src/two-branch/services/v9-pr-analyzer';
console.log('V9 output interface:', Object.keys(V9PRAnalyzer.prototype));
"

# Check report formatter output
npx ts-node -e "
import { V9GroupedReportFormatter } from './src/two-branch/analyzers/v9-grouped-report-formatter';
// Log output structure
"
```

## Expected Outcomes

- Complete audit of V9 output structure
- `docs/V9_DATA_GAP_REPORT.md` with all gaps documented
- Clear action items for Session 111 (filling gaps)
- Understanding of what UI can be built immediately vs what needs backend work

## Notes

- Focus on data EXISTENCE, not data QUALITY (quality is separate concern)
- If a field exists but is sometimes empty, note that
- Consider both BASIC and PRO tier data requirements
- Educational content may require AI enrichment - note if that's the source
