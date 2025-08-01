# Skill Calculation Guide

## Overview

The skill tracking system motivates developers to write better code by rewarding good practices and penalizing poor ones. Scores range from 0-100 with letter grades.

## Score Ranges

- **95-100**: A+ (Expert)
- **90-94**: A (Senior Expert)
- **85-89**: A- (Advanced Senior)
- **80-84**: B+ (Senior)
- **75-79**: B (Experienced)
- **70-74**: B- (Competent)
- **65-69**: C+ (Developing)
- **60-64**: C (Junior)
- **50-59**: D (Beginner)
- **Below 50**: F (Needs Training)

## New Developer Initialization

When a developer submits their first PR:

1. **Base Score**: 50/100 (average starting point)
2. **PR Performance Boost**:
   - PR scores > 80/100: Add +10 (start at 60)
   - PR scores 60-80/100: Add +5 (start at 55)
   - PR scores < 60/100: Add +0 (stay at 50)
3. **Apply all adjustments** from their first PR

## Calculation Formula

```
Final Score = Previous Score + PR Boost + Positive Adjustments - Negative Adjustments
```

## Positive Adjustments

### For Fixing Issues
- **Critical Issue Fixed**: +2.5 points each
- **High Issue Fixed**: +1.5 points each
- **Medium Issue Fixed**: +1.0 points each
- **Low Issue Fixed**: +0.5 points each

### For Quality Improvements
- **Test Coverage Increase**: +1 point per 5% increase
- **Code Complexity Reduction**: +0.5 points per point reduced
- **Documentation Added**: +0.5 points per major section

## Negative Adjustments

### For New Issues Introduced
- **Critical Issue**: -5 points each
- **High Issue**: -3 points each
- **Medium Issue**: -1 point each
- **Low Issue**: -0.5 points each

### For Leaving Issues Unfixed
- **Critical Unfixed**: -3 points each
- **High Unfixed**: -2 points each
- **Medium Unfixed**: -1 point each
- **Low Unfixed**: -0.5 points each

### For Quality Degradation
- **Vulnerable Dependencies**: -0.75 points each
- **Coverage Decrease**: -0.3 points per 1% decrease
- **Complexity Increase**: -0.2 points per point increased

## Category-Specific Scoring

Each developer has scores in 5 categories:

1. **Security** (0-100)
2. **Performance** (0-100)
3. **Code Quality** (0-100)
4. **Architecture** (0-100)
5. **Dependencies** (0-100)

The overall score is a weighted average based on the repository type.

## Example Calculation

Sarah (Previous Score: 75) submits a PR that:
- Fixes 5 critical issues (+12.5)
- Introduces 2 new critical issues (-10)
- Introduces 3 new high issues (-9)
- Adds 8 vulnerable dependencies (-6)
- Decreases coverage by 11% (-3.3)
- Leaves 3 critical unfixed (-9)
- Leaves 5 high unfixed (-10)

PR scores 68/100, so she gets +3 boost.

Calculation:
```
75 (previous) + 3 (boost) + 12.5 (fixes) - 48.3 (penalties) = 42.2
```

But scores can't go below 0, so Sarah would be at 61/100.

## Team Scoring

- **Team Average**: Mean of all active developers
- **New Members**: Get base 50 + team PR performance boost
- **Inactive Members**: Not included in average after 30 days

## Motivation Mechanics

1. **Immediate Feedback**: See score impact before merging
2. **Clear Consequences**: Understand why score changed
3. **Achievement System**: Unlock badges at milestones
4. **Team Competition**: Leaderboards and comparisons
5. **Learning Integration**: Get resources to improve

## Score Recovery

To improve a low score:
1. Fix existing repository issues
2. Add comprehensive tests
3. Improve documentation
4. Refactor complex code
5. Update dependencies

Each subsequent PR is an opportunity to improve!