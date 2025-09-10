# V9 Analyzer - Final Specification

**Version:** 9.0.0  
**Status:** Production Ready  
**Date:** September 9, 2025

---

## 🎯 Core Principles

### 1. Fair Scoring
- **ALL issues affect the score** (new, existing in modified, existing in unmodified)
- **Consistent weights** for all issue states (C=5, H=3, M=1, L=0.5)
- **Technical debt is visible** in the score even if not blocking

### 2. Smart Blocking
- **Block what matters:** New critical/high issues and critical/high in files you touched
- **Don't block on legacy debt:** Issues in unmodified files don't block (but hurt score)
- **Boy Scout Rule:** If you touch a file, fix its critical/high issues

### 3. Comprehensive Reporting
- **Business impact** with ROI calculations
- **Educational resources** grouped by patterns
- **Skills tracking** for continuous improvement
- **Clear separation** of blocking vs non-blocking issues

---

## 📐 Architecture

```
packages/agents/src/two-branch/
├── analyzers/
│   ├── v9-base-analyzer.ts         # Main orchestrator
│   ├── v9-types.ts                 # Type definitions
│   ├── v9-scoring-calculator.ts    # Score calculations
│   ├── v9-issue-comparator.ts      # Issue categorization
│   ├── v9-educational-resources.ts # Learning materials
│   ├── v9-business-impact.ts       # Business metrics
│   ├── v9-report-formatter.ts      # Report generation
│   ├── v9-java-analyzer.ts         # Java-specific
│   ├── v9-rust-analyzer.ts         # Rust-specific
│   └── index.ts                     # Exports
├── templates/
│   └── v9-template-config.ts       # Configuration
└── docs/
    ├── V9_SCORING_AND_BLOCKING_RULES.md
    ├── V9_MIGRATION_SUMMARY.md
    └── V9_FINAL_SPECIFICATION.md
```

---

## 🔄 Issue Flow

```
                 MAIN BRANCH                    PR BRANCH
                 ━━━━━━━━━━━                    ━━━━━━━━━
                                    
                Issues in Main   ←→   Issues in PR
                      ↓                    ↓
              ┌───────┴──────┐      ┌──────┴───────┐
              │              │      │              │
         In Modified    In Other    In Modified    In Other
              ↓              ↓           ↓              ↓
              
    Categories:
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    NEW:       Only in PR, not in Main
    EXISTING:  In both PR and Main  
    RESOLVED:  Only in Main, not in PR
    
    Blocking Logic:
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    NEW + Critical/High           → BLOCKS
    EXISTING + Modified + C/H     → BLOCKS
    EXISTING + Unmodified + Any   → Score Only
    RESOLVED                      → Score Bonus
```

---

## 📊 Scoring Formula

```typescript
function calculateScore(issues: Issues): number {
  let score = 100;
  
  // ALL issues deduct points
  score -= countBySeverity(issues.new) * weights;
  score -= countBySeverity(issues.existingInModified) * weights;
  score -= countBySeverity(issues.existingInUnmodified) * weights;
  
  // Resolved issues add points
  score += countBySeverity(issues.resolved) * weights;
  
  return Math.max(0, Math.min(100, score));
}
```

---

## 🚫 Blocking Formula

```typescript
function getBlockingIssues(issues: Issues): Issue[] {
  const blocking = [];
  
  // NEW critical/high always block
  blocking.push(...issues.new.filter(i => 
    i.severity === 'critical' || i.severity === 'high'
  ));
  
  // EXISTING critical/high in modified files block
  blocking.push(...issues.existingInModified.filter(i => 
    i.severity === 'critical' || i.severity === 'high'
  ));
  
  // EXISTING in unmodified files NEVER block
  // (but they still affect the score)
  
  return blocking;
}
```

---

## 📝 Report Sections

1. **Header** - Repository, PR info, session ID
2. **Decision** - APPROVED/DECLINED with reason
3. **Overall Score** - Score breakdown showing all deductions
4. **Blocking Issues** - Must fix before merge
5. **Non-Blocking Issues** - Affect score but don't block
6. **Resolved Issues** - Acknowledgment of fixes
7. **Issue Distribution** - Visual breakdown
8. **Educational Insights** - Grouped learning resources
9. **Business Impact** - Financial and risk analysis
10. **Skills Tracking** - Individual and team metrics
11. **Recommendations** - Action items
12. **PR Comment** - Ready-to-post summary

---

## 🎓 Example Scenarios

### Scenario 1: New Issues Only
```
New: 10 Critical, 5 High
Existing: 0
Resolved: 0

Score: 100 - (10×5 + 5×3) = 35/100 (F)
Blocking: 15 issues
Decision: ❌ DECLINED
```

### Scenario 2: Mixed with Unmodified Files
```
New: 2 Critical (in UserController.java - modified)
Existing in Modified: 1 High (UserController.java)
Existing in Unmodified: 20 Critical (AuthService.java)
Resolved: 5 Critical

Score: 100 - (2×5 + 1×3 + 20×5) + (5×5) = 12/100 (F)
Blocking: 3 issues (2 new critical + 1 existing high in modified)
Decision: ❌ DECLINED (blocking issues, not the 20 in unmodified)
```

### Scenario 3: Good PR with Technical Debt
```
New: 0
Existing in Modified: 0
Existing in Unmodified: 10 High, 20 Medium
Resolved: 15 High, 10 Medium

Score: 100 - (10×3 + 20×1) + (15×3 + 10×1) = 105/100 → 100 (A)
Blocking: 0 issues
Decision: ✅ APPROVED (no blocking, score > 70)
```

---

## 🚀 Usage

### Basic Usage
```typescript
import { V9JavaAnalyzer } from '@codequal/agents';

const analyzer = new V9JavaAnalyzer();
await analyzer.analyzePR(repoUrl, prNumber);
```

### Custom Configuration
```typescript
import { V9_DEFAULT_CONFIG } from '@codequal/agents';

const customConfig = {
  ...V9_DEFAULT_CONFIG,
  scoringRules: {
    ...V9_DEFAULT_CONFIG.scoringRules,
    passingScore: 80  // Stricter threshold
  }
};
```

---

## ✅ Benefits

1. **Fair to Developers** - Not blocked by code they didn't touch
2. **Encourages Improvement** - Fix issues in files you modify
3. **Transparent Scoring** - All issues visible in score
4. **Business Aligned** - Clear ROI and risk metrics
5. **Educational** - Comprehensive learning resources
6. **Consistent** - Same rules for all languages

---

## 📌 Remember

- **Score = Everything** (new + existing in all files)
- **Blocking = Smart** (new C/H + existing C/H in modified only)
- **Weights = Consistent** (C=5, H=3, M=1, L=0.5 always)
- **Technical Debt = Visible** (affects score but doesn't block if untouched)

---

**This is the permanent V9 template for all CodeQual PR analyses.**