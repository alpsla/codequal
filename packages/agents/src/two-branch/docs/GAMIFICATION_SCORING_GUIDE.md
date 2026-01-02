# Gamification Scoring Guide

> **How CodeQual calculates your progress, XP, and achievements**

This guide explains all scoring algorithms so you can maximize your XP and level up faster!

---

## XP Rewards System

### Base Actions

| Action | XP Earned | Description |
|--------|-----------|-------------|
| Complete Analysis | +10 XP | Base reward for running CodeQual |
| Fix Issue (PRO) | +5 XP | Per issue auto-fixed by CodeQual PRO |
| Resolve Issue (You) | +5 XP | Per issue YOU fixed before analysis |

### Severity Bonuses

| Severity | Bonus XP | When Earned |
|----------|----------|-------------|
| Critical Fix | +20 XP | Fix/resolve a critical issue |
| High Fix | +15 XP | Fix/resolve a high severity issue |
| Security Fix | +10 XP | Fix/resolve any security issue |

### Special Achievements

| Achievement | XP | Condition |
|-------------|-----|-----------|
| Perfect Score | +100 XP | Score >= 95/100 |
| Score Improvement | +25 XP | Improve score from previous analysis |
| Pattern Contribution | +50 XP | Contribute a new pattern to library |

---

## XP Calculation Example

**Scenario**: Your PR has:
- 10 issues you already fixed (RESOLVED)
- 2 of those were critical security issues
- PRO tier auto-fixes 15 more issues

```
Base Analysis:        +10 XP
Your fixes (10x5):    +50 XP
Critical bonus (2x20): +40 XP
Security bonus (2x10): +20 XP
PRO fixes (15x5):     +75 XP
─────────────────────────
TOTAL:               195 XP
```

---

## Level System

| Level | XP Required | Title |
|-------|-------------|-------|
| 1 | 0 | Newcomer |
| 2 | 100 | Apprentice |
| 3 | 250 | Developer |
| 4 | 500 | Craftsman |
| 5 | 1,000 | Expert |
| 6 | 2,000 | Master |
| 7 | 4,000 | Grandmaster |
| 8 | 8,000 | Legend |
| 9 | 16,000 | Mythic |
| 10 | 32,000 | Transcendent |

---

## App Health Score Calculation

Your App Health Score is calculated per category:

```
Base Score: 100 points

Deductions:
- Critical issue: -5 points
- High issue: -3 points
- Medium issue: -1 point
- Low issue: -0.5 points

Minimum: 0 points
Maximum: 100 points
```

**Important**: Only ACTIVE issues count. RESOLVED issues (ones you fixed) are NOT counted against you!

### Category Breakdown

| Category | What It Measures |
|----------|------------------|
| Security | Vulnerabilities, injection risks, auth issues |
| Performance | Memory leaks, inefficient patterns, complexity |
| Architecture | Coupling, circular deps, design violations |
| Dependencies | Outdated packages, CVEs, license issues |
| Code Quality | Bugs, code smells, maintainability |

---

## Skill Score Calculation

Your Skill Score reflects your growth as a developer:

```
Skill Score = (XP Earned This Session / 10) rounded

Example:
- Session XP: 195 → Skill Score: 20
```

The Skill Score shows in your report as a quick indicator of how productive your session was.

---

## Issue Categories Explained

When we analyze your PR, issues are categorized by comparing main branch vs PR branch:

| Category | What It Means | Impact |
|----------|---------------|--------|
| **NEW** | Issue introduced in your PR | Counts against score |
| **EXISTING_MODIFIED** | Existing issue you touched | Counts against score |
| **RESOLVED** | Existing issue you FIXED! | +XP reward, no penalty |
| **EXISTING_REST** | Pre-existing, not touched | Shown but doesn't affect score |

### How to Maximize Your Score

1. **Fix RESOLVED issues**: Every issue you fix proactively earns XP
2. **Avoid NEW issues**: Use linters and pre-commit hooks
3. **Target Critical/Security**: Higher bonuses for important fixes
4. **Upgrade to PRO**: Auto-fix remaining issues for more XP

---

## Achievement Tiers

| Tier | Icon | Rarity | XP Value |
|------|------|--------|----------|
| Common | - | 70% | 10-25 XP |
| Rare | - | 20% | 50-100 XP |
| Epic | - | 8% | 150-250 XP |
| Legendary | - | 2% | 500+ XP |

### Example Achievements

| Achievement | Tier | Condition |
|-------------|------|-----------|
| First Blood | Common | Fix your first security issue |
| Early Adopter | Common | Complete first analysis |
| Quick Start | Common | Fix 5 issues in first week |
| Security Specialist | Rare | 10 consecutive clean security reviews |
| Quality Champion | Rare | 90+ score on 5 consecutive PRs |
| Zero Day Hero | Epic | Find and fix a critical vulnerability |
| Code Guardian | Legendary | 1000 issues resolved lifetime |

---

## How We Track Progress

### Per-PR Tracking
- Issues found vs fixed
- Score before/after
- XP earned this session

### Lifetime Tracking
- Total PRs analyzed
- Total issues fixed
- Total patterns contributed
- Current level & XP

### Team Leaderboards
- Weekly top fixers
- Monthly security champions
- Quarterly architecture leaders

---

## Tips to Level Up Faster

1. **Be Proactive**: Fix issues BEFORE running analysis - you get XP for RESOLVED issues!
2. **Target Security**: Security fixes give bonus XP
3. **Fix Critical First**: Critical issues give 4x the XP of low issues
4. **Use PRO Tier**: Auto-fix gives XP for every issue fixed
5. **Contribute Patterns**: Share your fixes to earn 50 XP per pattern

---

## Links to Scoring Logic

Each report section links here. For technical details:
- XP Calculation: `src/two-branch/report/sections/skills-section.ts`
- Score Calculation: `src/two-branch/report/score-calculator.ts`
- Achievement System: `src/two-branch/report/achievements.ts`

---

*Keep coding, keep fixing, keep leveling up!*
