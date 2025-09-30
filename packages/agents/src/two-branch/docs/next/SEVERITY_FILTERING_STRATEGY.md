# Severity Filtering Strategy - Smart Quality Gates

**Last Updated**: 2025-09-30
**Status**: Production Ready

---

## 🎯 Problem Statement

**Original Issue**: Tools find too many issues for users to fix in one PR:
- PMD: 2,383 violations (Priority 1-2)
- SpotBugs: 2,404 bugs (Priority 1-2)
- Checkstyle: 264,420 warnings
- **Result**: Users overwhelmed, tool abandoned ❌

**User Feedback**: "Nobody will use our tool if we block PRs for thousands of issues"

---

## ✅ Solution: Progressive Quality Gates

### Strategy Overview

**Block PR**: Only for **CRITICAL** issues (must fix immediately)
**Show but don't block**: **HIGH** issues (fix when convenient)
**Hide by default**: **MEDIUM/LOW** issues (available on-demand)

### User Experience

```
PR Status: ❌ BLOCKED

🚨 Critical Issues Found (Must Fix to Merge):
├─ 3 Security vulnerabilities (Semgrep)
├─ 138 Critical code errors (PMD Priority 1)
└─ 3 High-risk bugs (SpotBugs Priority 1)

Total blocking: 144 issues

─────────────────────────────────────────────

⚠️ High Priority Issues (Recommended to fix):
├─ 2,245 Code quality issues (PMD Priority 2)
└─ 2,401 Bug patterns (SpotBugs Priority 2)

Total non-blocking: 4,646 issues
[View Details] [Fix Later]

─────────────────────────────────────────────

ℹ️ Style & Low Priority (Hidden by default):
└─ 264,420 Code style warnings (Checkstyle)

[View All Issues]
```

---

## 📊 Severity Mapping

### PMD

| Priority | Severity | Count | Action |
|----------|----------|-------|--------|
| 1 | **CRITICAL** | 138 | ❌ **Block PR** |
| 2 | High | 2,245 | ⚠️ Show (don't block) |
| 3 | Medium | ~5,000 | ℹ️ Hidden (view on demand) |
| 4-5 | Low | ~10,000 | ℹ️ Hidden (view on demand) |

**Configuration**:
```typescript
pmd: {
  blocking: {
    enabled: true,
    minimumPriority: 1  // Only Priority 1 blocks PR
  },
  reporting: {
    minimumPriority: 2  // Show Priority 1-2 in report
  },
  available: {
    minimumPriority: 3  // All priorities available on demand
  }
}
```

---

### SpotBugs

| Priority | Severity | Count | Action |
|----------|----------|-------|--------|
| 1 | **CRITICAL** | 3 | ❌ **Block PR** |
| 2 | High | 2,401 | ⚠️ Show (don't block) |
| 3 | Medium | ~1,000 | ℹ️ Hidden (view on demand) |

**Configuration**:
```typescript
spotbugs: {
  blocking: {
    enabled: true,
    priority: "high"  // -high flag: only Priority 1 blocks
  },
  reporting: {
    priority: "medium"  // Show Priority 1-2 in report
  }
}
```

---

### Semgrep

| Severity | Count | Action |
|----------|-------|--------|
| ERROR | Variable | ❌ **Block PR** |
| WARNING | Variable | ⚠️ Show (don't block) |
| INFO | Variable | ℹ️ Hidden (view on demand) |

**Configuration**:
```typescript
semgrep: {
  blocking: {
    enabled: true,
    severity: ["ERROR"]  // Only ERROR blocks PR
  },
  reporting: {
    severity: ["ERROR", "WARNING"]  // Show ERROR + WARNING
  }
}
```

---

### Checkstyle

| Severity | Count | Action |
|----------|-------|--------|
| error | 0 | ❌ Block PR (if any found) |
| warning | 264,420 | ℹ️ Hidden (view on demand) |
| info | Many | ℹ️ Hidden (view on demand) |

**Note**: Kafka has ZERO "error" severity violations, all are "warning".

**Configuration**:
```typescript
checkstyle: {
  blocking: {
    enabled: true,
    severity: ["error"]  // Only errors block PR
  },
  reporting: {
    changedFilesOnly: true,  // Show warnings for changed files only
    maxWarnings: 50  // Limit to 50 warnings in report
  }
}
```

---

## 🎮 User Controls

### Default View (PR Comment)
```markdown
## CodeQual Analysis Results

### 🚨 Critical Issues (Blocking PR)
- **138 critical code errors** (PMD Priority 1)
- **3 high-risk bugs** (SpotBugs Priority 1)
- **0 security vulnerabilities** (Semgrep ERROR)

❌ **PR Status: BLOCKED** - Fix critical issues to merge

[View Critical Issues] [Get AI Fixes]

---

### ⚠️ High Priority (Recommended)
- 2,245 code quality issues (PMD)
- 2,401 bug patterns (SpotBugs)

✅ These won't block your PR, but we recommend fixing them.

[View High Priority Issues] [Ignore for now]

---

### ℹ️ Additional Issues Available
- 264,420 style warnings (Checkstyle)
- Low priority issues

[View All Issues]
```

---

## 📋 Implementation Strategy

### Phase 1: Critical Only Blocking (Launch)

**Block PR for**:
- PMD Priority 1: 138 violations
- SpotBugs Priority 1: 3 bugs
- Semgrep ERROR: Variable
- Checkstyle error: 0 (none found)

**Total blocking issues**: ~141 (manageable!)

**Show in report**:
- All critical issues (detailed)
- High priority count (collapsed by default)
- Link to view all issues

---

### Phase 2: Progressive Improvement (Post-Launch)

**Week 1-2**: Users fix critical issues
```
Target: 141 critical issues → 0
Timeline: 2 weeks
```

**Week 3-4**: Introduce high priority goals
```
Message: "Great! No critical issues. Ready to tackle high priority?"
Option: Enable high priority blocking (opt-in)
```

**Month 2+**: Full quality improvement
```
Track: Technical debt reduction over time
Celebrate: Milestones (50% reduction, 90% reduction, etc.)
```

---

## 🎯 Expected Results

### Before (All Priorities)
```
PR Check: ❌ FAILED
Issues found: 269,228
Developer reaction: "This is impossible!" 😱
Result: Tool ignored
```

### After (Critical Only)
```
PR Check: ❌ BLOCKED
Critical issues: 141
High priority: 4,646 (informational)
Developer reaction: "I can fix 141 issues" ✅
Result: Tool adopted, quality improves
```

---

## 💡 Key Insights

### 1. Realistic Expectations
- **141 critical issues** is fixable in 1-2 weeks
- **2,383 all priorities** would take months
- Start small, improve progressively

### 2. Psychological Impact
- **Blocking on 141**: "Challenging but doable"
- **Blocking on 2,383**: "Impossible, will ignore"
- Users need to see progress

### 3. Gradual Improvement
- Month 1: Fix critical (141 issues)
- Month 2: Enable high priority blocking (opt-in)
- Month 3+: Technical debt reduction program
- Result: Sustainable quality improvement

---

## 🔧 Configuration Examples

### Startup Mode (Recommended Default)
```typescript
const config: QualityGateConfig = {
  mode: "startup",
  blocking: {
    pmd: { minimumPriority: 1 },        // 138 issues
    spotbugs: { priority: "high" },      // 3 issues
    semgrep: { severity: ["ERROR"] },    // 0-10 issues
    checkstyle: { severity: ["error"] }  // 0 issues
  },
  reporting: {
    showHighPriority: true,              // Show but don't block
    collapseByDefault: true,             // Collapsed in UI
    maxIssuesShown: 50                   // Limit display
  }
};

// Result: ~141 blocking issues (manageable)
```

### Strict Mode (After Critical Issues Fixed)
```typescript
const config: QualityGateConfig = {
  mode: "strict",
  blocking: {
    pmd: { minimumPriority: 2 },        // 2,383 issues
    spotbugs: { priority: "medium" },    // 2,404 issues
    semgrep: { severity: ["ERROR", "WARNING"] },
    checkstyle: { severity: ["error"] }
  },
  reporting: {
    showAllIssues: true
  }
};

// Result: ~4,787 blocking issues (only enable after startup phase)
```

### Permissive Mode (Legacy Codebases)
```typescript
const config: QualityGateConfig = {
  mode: "permissive",
  blocking: {
    enabled: false  // Don't block any PRs
  },
  reporting: {
    pmd: { minimumPriority: 1 },
    spotbugs: { priority: "high" },
    semgrep: { severity: ["ERROR"] },
    showTrends: true  // Show improvement over time
  }
};

// Result: No blocking, track improvements
```

---

## 📊 Success Metrics

### Adoption Metrics
- **PR merge rate**: Should remain >80%
- **Tool bypass rate**: Should be <5%
- **Time to fix**: Critical issues fixed within 2 weeks
- **User satisfaction**: >7/10 rating

### Quality Metrics
- **Critical issues over time**: Trending down
- **New critical issues per PR**: <5
- **Technical debt**: Reducing monthly
- **Code quality score**: Improving

---

## 🚀 Rollout Plan

### Week 1: Soft Launch
- Enable critical-only blocking
- Show high priority as informational
- Monitor user feedback

### Week 2-4: Adjustment
- Adjust blocking thresholds based on feedback
- Fine-tune severity mappings
- Add user controls (ignore, defer)

### Month 2: Progressive Tightening
- Offer opt-in for high priority blocking
- Gamify quality improvements
- Celebrate milestones

---

## 💬 User Communication

### First PR Message
```markdown
👋 Welcome to CodeQual!

We found **141 critical issues** that need attention before merging.
These are real bugs and security issues that could impact your users.

Good news: We also found 4,646 other improvements, but those won't block your PR.
You can tackle them when convenient.

[Fix Critical Issues Now] [Learn More]
```

### After Critical Fixed
```markdown
🎉 Congratulations!

No critical issues found! Your code meets production quality standards.

Want to go further? We found 4,646 high-priority improvements.
Fixing these will make your code even better.

[View High Priority] [Enable Stricter Checks] [Skip]
```

---

## 🎯 Final Recommendation

**Launch Configuration**:
```
Block PR for:
- PMD Priority 1: 138 violations
- SpotBugs Priority 1: 3 bugs
- Semgrep ERROR: 0-10 issues
Total: ~141 critical issues

Show (non-blocking):
- PMD Priority 2: 2,245 issues
- SpotBugs Priority 2: 2,401 issues
Total: ~4,646 high priority issues

Hidden (view on demand):
- Checkstyle warnings: 264,420
- PMD Priority 3+: ~15,000
```

**Result**: Users fix 141 critical issues instead of being overwhelmed by 269,228 total issues.

**User Experience**: "Challenging but achievable" ✅

---

**Document Status**: Ready for V9 Implementation