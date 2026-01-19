# Session 112: Fill V9 Data Gaps for Report UI

**Goal**: Implement all missing data fields identified in Session 109 V9 Data Audit to enable Report UI development.

**Prerequisites**:
- Session 109 complete (V9 data audit, gap report created)
- Gap report at `docs/V9_DATA_GAP_REPORT.md`

**Priority**: P0 blockers first, then P1, then P2

---

## Tasks

### 1. Clean Up DigitalOcean Registry References
**Goal**: Update all Docker registry references from DigitalOcean to Oracle Cloud Registry (OCIR)
**Priority**: P0 (Blocks Oracle Cloud deployment)
**Steps**:
1. Find all files with `registry.digitalocean.com` references
2. Update to Oracle Cloud Registry format
3. Update `docker/docker-compose-v9-language-based.yml`
4. Update any deployment scripts that reference DO registry
5. Document the new registry URL in infrastructure docs
**Files**:
- `docker/docker-compose-v9-language-based.yml`
- `scripts/deployment/*.sh`
- `kubernetes/*.yaml` (any referencing DO)

---

### 2. Add Progress History Array to V9 Output
**Goal**: Add `progressHistory.history[]` array for score chart in UI
**Priority**: P0 (Blocks score trend chart)
**Steps**:
1. Read existing score-calculator.ts to understand current trend logic
2. Add interface for ProgressHistory with history array
3. Query Supabase for last N PR scores for this repo
4. Return array with: prNumber, score, grade, analyzedAt
5. Add to V9 report output
**Files**:
- `packages/agents/src/two-branch/report/score-calculator.ts`
- `packages/agents/src/two-branch/analyzers/v9-types.ts`
**Interface**:
```typescript
interface ProgressHistory {
  isFirstTimeUser: boolean;
  history: {
    prNumber: number;
    score: number;
    grade: string;
    analyzedAt: string;
  }[];
  displayCount: number;
  trend: {
    direction: 'improving' | 'declining' | 'stable';
    previousScore: number;
    changePercent: number;
  };
}
```

---

### 3. Add Tier Field to Report Metadata
**Goal**: Add `tier` field to distinguish BASIC vs PRO reports
**Priority**: P0 (Blocks tier-specific UI rendering)
**Steps**:
1. Add tier field to AnalysisMetadata interface
2. Set tier based on analysis configuration (fixes enabled = PRO)
3. Include in report header and metadata sections
**Files**:
- `packages/agents/src/two-branch/analyzers/v9-types.ts`
- `packages/agents/src/two-branch/analyzers/v9-grouped-report-formatter.ts`

---

### 4. Add Fix Summary Section for PRO Tier
**Goal**: Add grouped fix summary showing what was fixed and by which tier
**Priority**: P0 (Core PRO tier differentiator)
**Steps**:
1. Create FixSummary interface with overview, byTier, byRule
2. Track fixes during three-tier cascade execution
3. Group successful fixes by rule ID
4. Calculate success rate and tier breakdown
5. Add to PRO tier report output
**Files**:
- `packages/agents/src/two-branch/analyzers/v9-types.ts`
- `packages/agents/src/fix-agent/types.ts`
- `packages/agents/src/two-branch/analyzers/v9-grouped-report-formatter.ts`
**Interface**:
```typescript
interface FixSummary {
  overview: {
    totalAttempted: number;
    totalSuccessful: number;
    totalRequiringReview: number;
    successRate: number;
  };
  byTier: {
    tier: 'tier1_native' | 'tier2_dedicated' | 'tier3_ai';
    count: number;
    cost: number;
    duration: number;
  }[];
  byRule: {
    ruleId: string;
    count: number;
    tier: string;
    files: string[];
  }[];
}
```

---

### 5. Add Commit Info Section for PRO Tier
**Goal**: Add branch/commit information for applied fixes
**Priority**: P0 (Shows what was changed)
**Steps**:
1. Create CommitInfo interface
2. After fixes applied, capture git info (branch, SHA, files)
3. Add to PRO tier report output
**Files**:
- `packages/agents/src/two-branch/analyzers/v9-types.ts`
- `packages/agents/src/two-branch/analyzers/v9-grouped-report-formatter.ts`

---

### 6. Implement XP Calculation System
**Goal**: Add XP earned/total/toNextLevel for gamification
**Priority**: P1 (Gamification feature)
**Steps**:
1. Define XP formula: issuesFixed * severity_multiplier
2. Add XP fields to SkillScore interface
3. Calculate XP earned for current PR
4. Query total XP from Supabase skill_scores
5. Calculate XP to next level (level thresholds: 100, 300, 600, 1000, 1500...)
**Files**:
- `packages/agents/src/two-branch/analyzers/v9-types.ts`
- `packages/agents/src/two-branch/report/achievements.ts`
- `packages/agents/src/two-branch/analyzers/v9-grouped-report-formatter.ts`

---

### 7. Add Badges/Achievements System
**Goal**: Add badges array with earned/locked status
**Priority**: P1 (Gamification feature)
**Steps**:
1. Define badge types: "First Fix", "Security Champion", "Clean Coder", etc.
2. Create badges interface with id, name, description, earned, progress
3. Check badge criteria during analysis
4. Track badge progress in Supabase
5. Add to report output
**Files**:
- `packages/agents/src/two-branch/report/achievements.ts`
- `packages/agents/src/two-branch/analyzers/v9-types.ts`
**Interface**:
```typescript
interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedAt?: string;
  progress?: number; // 0-100 for partial progress
  requirement: string;
}
```

---

### 8. Add Structured Author Action Steps
**Goal**: Replace prose guidance with structured steps array
**Priority**: P1 (Improves unfixed issues UX)
**Steps**:
1. Update UnfixedIssue interface with authorAction object
2. Generate structured steps based on issue type
3. Include action type, description, steps array, blocksMerge flag
4. Add estimatedEffort field (trivial/minor/moderate/significant)
**Files**:
- `packages/agents/src/two-branch/analyzers/v9-types.ts`
- `packages/agents/src/two-branch/analyzers/v9-grouped-report-formatter.ts`
**Interface**:
```typescript
interface AuthorAction {
  type: 'review_and_fix' | 'investigate' | 'refactor' | 'upgrade_dependency' | 'accept_risk';
  description: string;
  steps: string[];
  blocksMerge: boolean;
  estimatedEffort: 'trivial' | 'minor' | 'moderate' | 'significant';
}
```

---

### 9. Add Numerical Trend Data
**Goal**: Add previousScore and changePercent to trend
**Priority**: P1 (Enables trend visualization)
**Steps**:
1. Query previous PR score from Supabase
2. Calculate change percentage
3. Add to trend object in score output
**Files**:
- `packages/agents/src/two-branch/report/score-calculator.ts`

---

### 10. Add User Rank Titles
**Goal**: Add descriptive rank titles like "Security Champion"
**Priority**: P2 (Polish)
**Steps**:
1. Define rank titles based on category strengths
2. Assign title based on highest category score
3. Add to SkillScore output
**Titles**:
- Security Champion (highest in security)
- Performance Expert (highest in performance)
- Architecture Master (highest in architecture)
- Dependency Guardian (highest in dependency)
- Quality Advocate (highest in code quality)
- Rising Star (new user with good scores)

---

### 11. Add Level System
**Goal**: Calculate and display user level from XP
**Priority**: P2 (Polish)
**Steps**:
1. Define level thresholds (1-10+)
2. Calculate level from total XP
3. Add level field to user stats
**Level Thresholds**:
- Level 1: 0 XP
- Level 2: 100 XP
- Level 3: 300 XP
- Level 4: 600 XP
- Level 5: 1000 XP
- Level 6: 1500 XP
- Level 7: 2100 XP
- Level 8: 2800 XP
- Level 9: 3600 XP
- Level 10: 4500 XP

---

### 12. Add Community Impact for BASIC Tier
**Goal**: Add opt-in pattern sharing section for BASIC tier
**Priority**: P2 (Polish - encourages upgrades)
**Steps**:
1. Create CommunityImpact interface for BASIC tier
2. Calculate potential impact (how many devs could benefit)
3. Show "Share Fix Patterns" opt-in UI prompt
4. Track shared patterns separately from PRO auto-contributions
**Files**:
- `packages/agents/src/two-branch/report/community-impact.ts`

---

## Validation

```bash
# Run type check after changes
cd packages/agents
npx tsc --noEmit

# Run existing tests
npm test -- --testPathPattern="v9" --verbose

# Test score calculator
npx ts-node -e "
import { calculateQualityScore } from './src/two-branch/report/score-calculator';
// Test with mock issues
"
```

## Expected Outcomes

- All P0 blockers resolved (Docker registry, progressHistory, tier, fixSummary, commitInfo)
- P1 gamification features added (XP, badges, structured actions)
- P2 polish items added (rank titles, levels, community impact)
- Report UI can be built with complete data
- V9 data coverage: 78% → 95%+

## Notes

- Focus on data structure changes, not UI implementation
- PRO tier automatically contributes patterns (no explicit tracking needed)
- BASIC tier has opt-in community sharing prompt
- Test with existing v9-codequal-pr69-FINAL.md as reference

---

*Session 112 - V9 Data Gaps*
*Created: January 19, 2026*
*Depends on: Session 109 (V9 Data Audit)*
