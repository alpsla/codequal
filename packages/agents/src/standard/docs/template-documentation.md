# Template Documentation Guide

## Overview

This document explains the structure and usage of our production-ready PR analysis template v4.0.

## Template Structure

### 1. Header Section
```markdown
# Pull Request Analysis Report

**Repository:** [GitHub URL]
**PR:** [PR Number and Title]
**Analysis Date:** [ISO Timestamp]
**Model Used:** [Dynamically Selected Model]
**Scan Duration:** [Duration in seconds]
```

### 2. PR Decision Section
```markdown
## PR Decision: [✅ APPROVED | ⚠️ APPROVED WITH CONDITIONS | ❌ DECLINED]

**Confidence:** [Percentage]

[Decision explanation focusing on NEW issues only]
```

**Key Decision Logic:**
- ❌ DECLINED: ANY new critical or high severity issues
- ⚠️ APPROVED WITH CONDITIONS: New medium/low issues only
- ✅ APPROVED: No new issues or only minor improvements needed

### 3. Executive Summary
- Overall score with letter grade
- PR size and complexity metrics
- Key findings summary
- Issue distribution visualization

### 4. Category Analysis (Sections 1-5)

Each category includes:
- **Score:** 0-100 with letter grade
- **Score Breakdown:** Detailed sub-scores
- **Improvements/Changes:** What was done well
- **Issues:** What needs attention

Categories:
1. Security Analysis
2. Performance Analysis
3. Code Quality Analysis
4. Architecture Analysis
5. Dependencies Analysis

### 5. PR Issues (Section 6) - BLOCKING

**Critical Structure:**
- Only NEW issues introduced by this PR
- These issues BLOCK the PR if critical/high
- Each issue includes:
  - Unique ID (PR-CRIT-XXX-001)
  - File location with line numbers
  - Impact description
  - Skill impact calculation
  - Current implementation (with code)
  - Required fix (with code)

### 6. Repository Issues (Section 7) - NON-BLOCKING

**Important Distinction:**
- Pre-existing issues from before the PR
- Do NOT block PR approval
- Impact skill scores only
- Include age of issue
- Show code snippets for ALL issues

### 7. Educational Insights (Section 8)

- Learning paths based on issues found
- Anti-patterns to avoid
- Good patterns to follow
- Time estimates for training

### 8. Skills Tracking (Section 9)

**Individual Developer:**
- Previous score → Current score
- Detailed calculation breakdown
- Positive adjustments (for fixes)
- Negative adjustments (for new issues AND unfixed issues)
- Category-specific scores

**Team Analysis:**
- Team average scores
- Individual developer table
- New developer initialization (base 50 + PR boost)

### 9. Business Impact (Section 10)

- Negative impacts (risks, costs)
- Positive impacts (benefits)
- ROI calculations
- Risk assessment

### 10. Action Items (Section 11)

**Two Distinct Sections:**

**Must Fix Before Merge (PR Issues):**
- Only NEW issues that block the PR
- Organized by severity
- Clear fix instructions

**Technical Debt (Repository Issues):**
- Pre-existing issues for future sprints
- Prioritized by age and severity
- Not blocking current PR

### 11. PR Comment Conclusion (Section 12)

Concise summary for PR comments including:
- Decision (with blocking reason if declined)
- New blocking issues count
- Pre-existing issues summary
- Required actions
- Developer performance summary

## Key Implementation Details

### Skill Calculation Rules

**For New Developers:**
```
Base Score: 50
PR > 80: +10 boost (start at 60)
PR 60-80: +5 boost (start at 55)
PR < 60: +0 boost (stay at 50)
```

**Adjustments:**
```
Positive (for fixes):
- Critical: +2.5 each
- High: +1.5 each
- Medium: +1.0 each
- Low: +0.5 each

Negative (for new issues):
- Critical: -5 each
- High: -3 each
- Medium: -1 each
- Low: -0.5 each

Negative (for unfixed issues):
- Critical: -3 each
- High: -2 each
- Medium: -1 each
- Low: -0.5 each
```

### PR Blocking Logic

**ONLY Block For:**
- NEW critical issues (introduced in this PR)
- NEW high issues (introduced in this PR)

**NEVER Block For:**
- Pre-existing repository issues (any severity)
- New medium or low issues
- Test coverage decrease (unless critical)
- Documentation issues

### Issue ID Format

**PR Issues:**
- PR-CRIT-SEC-001 (Critical Security)
- PR-HIGH-PERF-001 (High Performance)
- PR-MED-QUAL-001 (Medium Quality)
- PR-LOW-DOC-001 (Low Documentation)

**Repository Issues:**
- REPO-CRIT-SEC-001
- REPO-HIGH-ARCH-001
- REPO-MED-DEP-001
- REPO-LOW-TEST-001

## Usage Guidelines

1. **Always Separate PR vs Repository Issues**
   - Makes it clear what blocks vs what doesn't
   - Helps developers understand their impact
   - Prevents unfair PR rejections

2. **Include Code Snippets for ALL Issues**
   - Current problematic implementation
   - Required fix with best practices
   - Educational value for team

3. **Calculate Skills Fairly**
   - Reward fixes with positive points
   - Penalize new issues appropriately
   - Also penalize for leaving issues unfixed
   - Show complete calculation breakdown

4. **Focus on Education**
   - Every issue is a learning opportunity
   - Provide specific training recommendations
   - Show good vs bad patterns

5. **Business Context**
   - Translate technical issues to business impact
   - Provide cost/risk estimates
   - Show ROI of fixing issues

## Template Customization

The template can be customized for:
- Different repository types (web, mobile, ML, etc.)
- Company-specific standards
- Regulatory requirements
- Team skill levels

## Version History

- v1.0: Basic comparison report
- v2.0: Added skill tracking
- v3.0: Added educational insights
- v4.0: Separated PR vs Repository issues (current)

---

*Last Updated: July 31, 2025*