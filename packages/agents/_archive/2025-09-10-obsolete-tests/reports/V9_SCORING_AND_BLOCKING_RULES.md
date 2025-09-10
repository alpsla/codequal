# V9 Scoring and Blocking Rules - Clarified

**Last Updated:** September 9, 2025

---

## 📊 SCORING RULES (Affects Final Score)

### ALL Issues Impact Score:
```
Score Calculation:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Starting Score:           100 points

DEDUCTIONS (All Open Issues):
- New Issues:             -weight × count
- Existing Issues:        -weight × count
  (both modified & unmodified files)

ADDITIONS (Fixed Issues):
- Resolved Issues:        +weight × count

Final Score = 100 - deductions + additions
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Weights (Consistent for All):
- **Critical:** 5 points
- **High:** 3 points
- **Medium:** 1 point
- **Low:** 0.5 points

### Example Score Calculation:
```
Starting:                 100
New Issues:
  - Critical (20):        -100 (20 × 5)
  - High (15):            -45  (15 × 3)
Existing Issues (ALL):
  - Critical (15):        -75  (15 × 5)
  - High (10):            -30  (10 × 3)
Resolved Issues:
  - Critical (21):        +105 (21 × 5)
  - High (12):            +36  (12 × 3)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Final Score:              91/100 (Grade: A)
```

---

## 🚫 BLOCKING RULES (Affects PR Decision)

### What BLOCKS the PR:

#### 1. NEW Issues (Critical & High Only)
```
✅ BLOCKS:
- New Critical issues (regardless of file)
- New High issues (regardless of file)

❌ DOESN'T BLOCK:
- New Medium issues
- New Low issues
```

#### 2. EXISTING Issues in MODIFIED Files (Critical & High Only)
```
✅ BLOCKS (if file was modified):
- Existing Critical in modified files
- Existing High in modified files

❌ DOESN'T BLOCK:
- Existing Medium in modified files
- Existing Low in modified files
```

#### 3. EXISTING Issues in UNMODIFIED Files (Never Block)
```
❌ NEVER BLOCKS (but affects score):
- Existing Critical in unmodified files
- Existing High in unmodified files
- Existing Medium in unmodified files
- Existing Low in unmodified files
```

---

## 📋 Summary Table

| Issue Type | Location | Critical | High | Medium | Low | Score Impact | Blocks PR |
|------------|----------|----------|------|--------|-----|--------------|-----------|
| **NEW** | Any file | -5 pts | -3 pts | -1 pt | -0.5 pts | ✅ Yes | C/H: ✅ Yes<br>M/L: ❌ No |
| **EXISTING** | Modified file | -5 pts | -3 pts | -1 pt | -0.5 pts | ✅ Yes | C/H: ✅ Yes<br>M/L: ❌ No |
| **EXISTING** | Unmodified file | -5 pts | -3 pts | -1 pt | -0.5 pts | ✅ Yes | ❌ Never |
| **RESOLVED** | Any file | +5 pts | +3 pts | +1 pt | +0.5 pts | ✅ Yes | N/A |

---

## 🎯 Decision Logic

```typescript
function makePRDecision(issues, score) {
  // Check for blocking issues
  const hasBlockingIssues = 
    hasNewCriticalOrHigh(issues) ||
    hasExistingCriticalOrHighInModifiedFiles(issues);
  
  if (hasBlockingIssues) {
    return "❌ DECLINED - Critical/High issues must be resolved";
  }
  
  // Even if no blocking issues, still need passing score
  if (score < 70) {
    return "❌ DECLINED - Score below threshold (70)";
  }
  
  return "✅ APPROVED";
}
```

---

## 📊 Real-World Example

### Scenario:
```
Modified Files: UserController.java, OrderService.java
Unmodified Files: AuthService.java, PaymentService.java

Issues Found:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEW Issues:
- 5 Critical (in modified files)     → -25 pts, BLOCKS
- 3 High (in modified files)         → -9 pts, BLOCKS
- 10 Medium (anywhere)               → -10 pts, doesn't block
- 15 Low (anywhere)                  → -7.5 pts, doesn't block

EXISTING in Modified Files:
- 2 Critical (UserController.java)   → -10 pts, BLOCKS
- 1 High (OrderService.java)         → -3 pts, BLOCKS
- 5 Medium                           → -5 pts, doesn't block
- 8 Low                              → -4 pts, doesn't block

EXISTING in Unmodified Files:
- 10 Critical (AuthService.java)     → -50 pts, DOESN'T BLOCK
- 7 High (PaymentService.java)       → -21 pts, DOESN'T BLOCK
- 12 Medium                          → -12 pts, doesn't block
- 20 Low                             → -10 pts, doesn't block

RESOLVED:
- 15 Critical                        → +75 pts
- 10 High                            → +30 pts
- 8 Medium                           → +8 pts
- 5 Low                              → +2.5 pts

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Score Calculation:
Starting:         100
Deductions:       -166.5
Additions:        +115.5
Final Score:      49/100 (F)

Blocking Issues:  11 (5 new critical, 3 new high, 
                      2 existing critical in modified,
                      1 existing high in modified)

Decision: ❌ DECLINED - 11 blocking issues must be fixed
```

### Key Points:
1. **The 10 critical issues in AuthService.java affect the score (-50 pts) but DON'T block the PR** because AuthService.java wasn't modified
2. **The 2 critical issues in UserController.java BLOCK the PR** because UserController.java was modified
3. **All 5 new critical issues BLOCK** regardless of which file they're in
4. **The score is 49/100** because ALL issues (including those in unmodified files) affect the score

---

## ✅ Summary

- **SCORING:** ALL issues (new, existing in modified, existing in unmodified) affect the final score
- **BLOCKING:** Only critical/high issues that are either NEW or in MODIFIED files block the PR
- **EXISTING IN UNMODIFIED:** These issues represent technical debt - they hurt your score but don't block the current PR since you didn't touch those files

This approach is fair because:
1. Developers are accountable for issues they introduce (new issues)
2. Developers must fix critical/high issues in files they modify (boy scout rule)
3. Developers aren't blocked by technical debt in files they didn't touch
4. The score still reflects the overall code quality including technical debt