# Repository Analysis & Scoring System - Comprehensive Report

**Date:** August 4, 2025  
**Subject:** Complete Documentation of Repository Issue Analysis and Scoring System

## Executive Summary

This report provides a comprehensive overview of how the CodeQual system analyzes repository issues and calculates skill scores. There appears to be a discrepancy between the documented scoring system (5/3/1/0.5 points) and the implemented system (10/5/2/1 points) in the latest report generators.

## 1. Official Scoring System (As Documented)

Based on the official documentation in `SCORE_PERSISTENCE.md` and `skill-calculation-guide.md`:

### Point Values by Severity

| Severity | Points for Fixing | Points for Introducing |
|----------|------------------|----------------------|
| Critical | +5 points | -5 points |
| High | +3 points | -3 points |
| Medium | +1 point | -1 point |
| Low | +0.5 points | -0.5 points |

### Additional Scoring Factors

**Positive Adjustments:**
- Good code quality: +1 to +5 points
- First PR bonus: +5 to +10 points
- Excellent test coverage: +1 to +3 points

**Negative Adjustments:**
- Poor test coverage: -1 to -3 points
- Breaking changes without notice: -5 points
- Vulnerable dependencies: -0.75 points each
- Leaving pre-existing issues unfixed:
  - Critical: -3 points each
  - High: -2 points each
  - Medium: -0.5 points each
  - Low: -0.25 points each

## 2. Implemented Scoring System (In ReportGeneratorV5/V6)

The latest report generators use different values:

### Point Values by Severity

| Severity | Points for Fixing | Points for Introducing |
|----------|------------------|----------------------|
| Critical | +10 points | -10 points |
| High | +5 points | -5 points |
| Medium | +2 points | -2 points |
| Low | +1 point | -1 point |

This represents a 2x multiplier across all severities, making the scoring more dramatic.

## 3. Repository Issue Analysis Process

### How Issues Are Categorized

The system uses a **fingerprint-based comparison** to categorize issues:

```typescript
private getIssueFingerprint(issue: any): string {
  return `${issue.category}-${issue.type || issue.title}-${issue.location?.file || 'global'}-${issue.location?.line || 0}`;
}
```

### Issue Categories After Comparison

1. **New Issues** - Found only in the feature branch (introduced by the PR)
2. **Resolved Issues** - Found only in the main branch (fixed by the PR)
3. **Unchanged Issues** - Found in both branches (pre-existing, not addressed)
4. **Modified Issues** - Same issue but with changed properties between branches

### Why "Low" Pre-existing Issue Count?

The user's observation about "strangely small amount of pre-existing issues" is explained by:

- DeepWiki scans **both branches completely**
- Issues existing in **both branches** are "unchanged" (pre-existing)
- Only issues **unique to each branch** are considered new or resolved
- Most repository issues persist across branches, so they're correctly categorized as "unchanged"

## 4. Scoring Calculation Example

### Using Official Scoring (5/3/1/0.5)

**Scenario:** Developer with starting score of 75 submits a PR that:
- Fixes 2 critical issues: +10 points (2 × 5)
- Fixes 1 high issue: +3 points
- Introduces 1 critical issue: -5 points
- Introduces 2 high issues: -6 points (2 × 3)
- Leaves 3 critical unfixed: -9 points (3 × 3)
- Leaves 5 high unfixed: -10 points (5 × 2)

**Calculation:** 75 + 10 + 3 - 5 - 6 - 9 - 10 = **58 points**

### Using Implemented Scoring (10/5/2/1)

Same scenario with doubled values:
- Fixes 2 critical issues: +20 points (2 × 10)
- Fixes 1 high issue: +5 points
- Introduces 1 critical issue: -10 points
- Introduces 2 high issues: -10 points (2 × 5)
- Leaves 3 critical unfixed: -9 points (3 × 3) *
- Leaves 5 high unfixed: -10 points (5 × 2) *

*Note: Unfixed penalties remain at original values in some implementations

**Calculation:** 75 + 20 + 5 - 10 - 10 - 9 - 10 = **61 points**

## 5. Key Discrepancy Analysis

### Why the Change from 5/3/1/0.5 to 10/5/2/1?

The conversation history shows:
1. User noticed: "Fixed 1 security issues (+5 points)" but "Introduced 1 critical security issues (-10 points)"
2. User asked: "why we have different scoring for fixed and new issue"
3. Response: "Made scoring symmetrical (critical ±10, high ±5, medium ±2, low ±1)"

This suggests the change was made to:
- Fix an asymmetry where new issues had double penalty
- Create a more impactful scoring system
- Make critical issues more significant (10 points vs 5)

### Current State

- **Documentation** still shows: 5/3/1/0.5 point system
- **Implementation** uses: 10/5/2/1 point system
- **Reports** show the higher values in calculations

## 6. Business Impact of Scoring Changes

### With Original Scoring (5/3/1/0.5)
- Critical issue = 5% of total score
- More gradual score changes
- Developers less impacted by single issues

### With New Scoring (10/5/2/1)
- Critical issue = 10% of total score
- More dramatic score swings
- Stronger incentive to fix critical issues
- Higher penalty for introducing problems

## 7. Repository Analysis Features

### Pre-existing Issue Handling
- Issues are tracked with timestamps
- Age-based categorization (legacy, old, recent, new)
- Unfixed issues penalize developer scores
- Repository health impacts individual performance

### PR Decision Logic
- **DECLINED**: Any new critical or high issues
- **APPROVED**: Only medium/low new issues
- **Repository issues**: Don't block PR but affect scores

### Skill Categories Tracked
1. Security
2. Performance
3. Code Quality
4. Architecture
5. Dependencies
6. Testing

## 8. Recommendations

### 1. Resolve Scoring Discrepancy
Either:
- Update documentation to reflect 10/5/2/1 system
- Revert implementation to 5/3/1/0.5 system
- Make it configurable per organization

### 2. Clarify Repository Issue Impact
- Document how pre-existing issues affect scores
- Explain the fingerprint-based comparison
- Show examples of new vs unchanged issues

### 3. Consider Scoring Adjustments
- The doubled values may be too harsh
- Consider different multipliers for fixing vs introducing
- Allow customization based on team maturity

### 4. Improve Transparency
- Show scoring calculations in reports
- Explain why certain issues are categorized as shown
- Display the scoring system being used

## Conclusion

The repository analysis system correctly identifies new, resolved, and unchanged issues using fingerprint comparison. The apparent "low count" of pre-existing issues is accurate - most issues exist in both branches and are properly categorized as "unchanged."

The scoring system has evolved from the documented 5/3/1/0.5 points to an implemented 10/5/2/1 system, making scores more volatile but also creating stronger incentives for code quality. This discrepancy should be resolved by either updating documentation or reverting the implementation to match the original design.

The system successfully tracks both PR-specific issues and repository health, providing comprehensive developer skill assessment while maintaining fair PR approval criteria.