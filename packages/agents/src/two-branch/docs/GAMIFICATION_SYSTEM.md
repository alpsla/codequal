# CodeQual Gamification System

This document explains the gamification features available in CodeQual reports.

## Overview

CodeQual includes a comprehensive gamification system to encourage code quality improvements and recognize developer achievements. The system is available to all tiers (BASIC and PRO).

## XP (Experience Points) System

### How XP is Earned

| Action | XP Earned | Notes |
|--------|-----------|-------|
| Complete analysis | +10 XP | Per PR analyzed |
| Fix critical issue | +25 XP | Per critical issue resolved |
| Fix high issue | +15 XP | Per high severity issue resolved |
| Fix medium issue | +10 XP | Per medium severity issue resolved |
| Fix low issue | +5 XP | Per low severity issue resolved |
| Contribute pattern | +50 XP | When your fix becomes a reusable pattern |
| Pattern reused | +5 XP | Each time your pattern helps another developer |
| Perfect score (100) | +100 XP | Bonus for flawless review |

### Level Progression

| Level | Title | XP Required |
|-------|-------|-------------|
| 1 | Novice | 0 |
| 2 | Apprentice | 100 |
| 3 | Developer | 300 |
| 4 | Senior Developer | 600 |
| 5 | Expert | 1,000 |
| 6 | Master | 1,500 |
| 7 | Grand Master | 2,500 |
| 8 | Legend | 4,000 |
| 9 | Mythic | 6,000 |

## Achievement System

### Achievement Tiers

| Tier | Rarity | Percentile | Badge |
|------|--------|------------|-------|
| **Legendary** | Top 1% | Extremely rare | 🏆 |
| **Epic** | Top 5% | Very rare | 💜 |
| **Rare** | Top 15% | Uncommon | 💙 |
| **Common** | Top 50% | Standard | ⚪ |

### Achievement Categories

| Category | Icon | Description |
|----------|------|-------------|
| Security | 🛡️ | Security-related achievements |
| Quality | ✨ | Code quality achievements |
| Performance | ⚡ | Performance optimization achievements |
| Architecture | 🏗️ | Architecture improvement achievements |
| Community | 🌟 | Pattern contribution achievements |
| Milestone | 🎯 | Analysis count milestones |

### Available Achievements

#### Security Category

| Achievement | Tier | XP | Requirement |
|-------------|------|----|----|
| **First Blood** | Common | 50 | Fix your first security vulnerability |
| **Security Guardian** | Epic | 250 | 10 consecutive clean security reviews |
| **Vulnerability Hunter** | Legendary | 500 | Fix 50 security vulnerabilities |

#### Quality Category

| Achievement | Tier | XP | Requirement |
|-------------|------|----|----|
| **Quality Champion** | Rare | 150 | Score 90+ on 5 consecutive PRs |
| **Zero Issues** | Epic | 300 | Submit code with no issues detected |
| **Perfectionist** | Legendary | 500 | 20 perfect scores in a row |

#### Performance Category

| Achievement | Tier | XP | Requirement |
|-------------|------|----|----|
| **Speed Demon** | Rare | 150 | Fix 20 issues in under 60 seconds |
| **Performance Pro** | Epic | 250 | Fix 50 performance issues |

#### Community Category

| Achievement | Tier | XP | Requirement |
|-------------|------|----|----|
| **Community Helper** | Rare | 200 | Patterns adopted by 10 developers |
| **Pattern Master** | Epic | 350 | Create 25 reusable fix patterns |
| **Pattern Legend** | Legendary | 500 | Patterns used 1,000+ times |

#### Milestone Category

| Achievement | Tier | XP | Requirement |
|-------------|------|----|----|
| **Early Adopter** | Common | 25 | Complete first analysis |
| **Dedicated Developer** | Common | 50 | Complete 10 analyses |
| **Centurion** | Rare | 200 | Complete 100 analyses |
| **Veteran** | Epic | 350 | Complete 500 analyses |

## Display Styles

### Professional Style
Certificate-style display with:
- Formal titles (e.g., "Certified Security Specialist")
- Credential IDs
- Award dates
- LinkedIn integration

### Gamified Style
Badge-style display with:
- Playful descriptions
- XP values
- Rarity percentiles
- Progress bars for in-progress achievements

## Skill Score System

### Categories

| Skill | Base Score | Calculation |
|-------|------------|-------------|
| Security | 50/100 | Starts at 50, adjusted by security issue resolution |
| Code Quality | 50/100 | Starts at 50, adjusted by quality fixes |
| Performance | 50/100 | Starts at 50, adjusted by performance optimizations |
| Architecture | 50/100 | Starts at 50, adjusted by architecture improvements |
| Dependencies | 50/100 | Starts at 50, adjusted by dependency updates |

### Score Adjustments

**Positive Adjustments:**
- Fix critical issue: +5 points
- Fix high issue: +3 points
- Fix medium issue: +1 point
- Fix low issue: +0.5 points
- Perfect analysis: +5 bonus points

**Negative Adjustments:**
- Introduce critical issue: -5 points
- Introduce high issue: -3 points
- Introduce medium issue: -1 point
- Introduce low issue: -0.5 points

**Note:** Only issues in NEW or EXISTING_MODIFIED files affect skill scores (issues the developer is responsible for).

## Community Impact

PRO tier users can see their community impact:

| Metric | Description |
|--------|-------------|
| Patterns Contributed | Number of fix patterns you've created |
| Developers Helped | Number of unique developers using your patterns |
| Time Saved for Others | Cumulative time saved across the community |
| Contributor Rank | Your percentile among all contributors |
| Contributor Tier | Bronze/Silver/Gold/Platinum based on impact |

### Contributor Tiers

| Tier | Requirement |
|------|-------------|
| Bronze | 1+ patterns, 10+ developers helped |
| Silver | 10+ patterns, 100+ developers helped |
| Gold | 25+ patterns, 500+ developers helped |
| Platinum | 50+ patterns, 1,000+ developers helped |

## Database Tables

The gamification system uses the following Supabase tables:

- `user_skills` - Stores skill scores per category
- `user_achievements` - Tracks unlocked achievements
- `user_xp_history` - XP earning history
- `pattern_contributions` - Pattern authorship tracking
- `analysis_history` - Historical analysis records

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/users/:id/skills` | GET | Get user's skill scores |
| `/api/users/:id/achievements` | GET | Get user's achievements |
| `/api/users/:id/xp` | GET | Get user's XP and level |
| `/api/users/:id/community-impact` | GET | Get community impact metrics (PRO) |

## Configuration

Achievement style can be configured per user:

```typescript
interface UserPreferences {
  achievementStyle: 'professional' | 'gamified';
}
```

## Related Files

- `src/two-branch/report/achievements.ts` - Achievement generation
- `src/two-branch/report/sections/skills-section.ts` - Skills display
- `src/two-branch/report/community-impact.ts` - Community metrics
- `src/infrastructure/supabase/migrations/20251221_user_analytics_progress.sql` - Database schema
