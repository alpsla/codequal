/**
 * Community Impact Section Generator
 *
 * Generates the "Your Community Impact" section for PRO tier reports.
 * Shows how a user's pattern contributions have helped other developers.
 *
 * Session 66: Created for tier differentiation
 */

/**
 * Pattern contribution details
 */
export interface PatternContribution {
  patternId: string;
  patternName: string;
  ruleId: string;
  language: string;
  contributedAt: Date;
  usageCount: number;
  usersHelped: number;
  timeSavedMinutes: number;
}

/**
 * Community impact summary
 */
export interface CommunityImpactSummary {
  totalPatternsContributed: number;
  totalUsersHelped: number;
  totalTimeSavedHours: number;
  totalUsageCount: number;
  topPatterns: PatternContribution[];
  monthlyRank?: number;
  percentileRank?: number;
}

/**
 * User privacy preferences for community display
 */
export interface CommunityPrivacyPrefs {
  isAnonymous: boolean;
  showOnLeaderboard: boolean;
  shareProfile: boolean;
}

/**
 * Generate the community impact section for PRO tier reports
 *
 * @param impact - Community impact summary data
 * @param prefs - User privacy preferences
 * @returns Markdown section for the report
 */
export function generateCommunityImpactSection(
  impact: CommunityImpactSummary,
  prefs: CommunityPrivacyPrefs = { isAnonymous: false, showOnLeaderboard: true, shareProfile: false }
): string {
  // No contributions yet
  if (impact.totalPatternsContributed === 0) {
    return generateNewContributorSection();
  }

  // Anonymous contributor
  if (prefs.isAnonymous) {
    return generateAnonymousContributorSection(impact);
  }

  // Full contributor profile
  return generateFullContributorSection(impact, prefs);
}

/**
 * Section for users who haven't contributed patterns yet
 */
function generateNewContributorSection(): string {
  return `
## 🌟 Community Impact

### Start Contributing!

You haven't contributed any fix patterns yet. When you fix issues with CodeQual PRO,
your patterns can be saved to help other developers facing the same issues.

**How it works:**
1. Fix an issue using AI-generated fixes
2. Pattern is saved to the community library
3. Future developers get instant fixes (no AI cost!)
4. Track your impact as patterns get reused

**Benefits of contributing:**
- 🏆 Recognition on community leaderboards
- 📊 See how many developers you've helped
- ⏱️ Track total time saved across the community
- 🎯 Build your developer reputation

> 💡 **Tip**: Enable "Save patterns" in settings to start contributing automatically.
`;
}

/**
 * Section for anonymous contributors
 */
function generateAnonymousContributorSection(impact: CommunityImpactSummary): string {
  return `
## 🌟 Community Impact

### Anonymous Contributions

Your patterns have been reused **${impact.totalUsageCount.toLocaleString()} times** by other developers,
saving the community approximately **${impact.totalTimeSavedHours.toFixed(1)} hours** of development time.

| Metric | Value |
|--------|-------|
| **Patterns Contributed** | ${impact.totalPatternsContributed} |
| **Times Reused** | ${impact.totalUsageCount.toLocaleString()} |
| **Developers Helped** | ${impact.totalUsersHelped} |
| **Time Saved** | ${impact.totalTimeSavedHours.toFixed(1)} hours |

> 🔒 Your contributions are anonymous. [Enable Profile Sharing] to get recognition.

[View Statistics] | [Enable Profile]
`;
}

/**
 * Full contributor section with recognition
 */
function generateFullContributorSection(
  impact: CommunityImpactSummary,
  prefs: CommunityPrivacyPrefs
): string {
  let section = `
## 🌟 Your Community Impact

### Contribution Summary

You've contributed **${impact.totalPatternsContributed} patterns** that have been reused
**${impact.totalUsageCount.toLocaleString()} times** by **${impact.totalUsersHelped} developers**,
saving the community **${impact.totalTimeSavedHours.toFixed(1)} hours** of development time.

| Metric | Value |
|--------|-------|
| **Patterns Contributed** | ${impact.totalPatternsContributed} |
| **Times Reused** | ${impact.totalUsageCount.toLocaleString()} |
| **Developers Helped** | ${impact.totalUsersHelped} |
| **Total Time Saved** | ${impact.totalTimeSavedHours.toFixed(1)} hours |
`;

  // Add ranking if available
  if (impact.monthlyRank !== undefined) {
    const rankEmoji = getRankEmoji(impact.monthlyRank);
    section += `
### 🏆 Recognition

${rankEmoji} **Rank #${impact.monthlyRank}** contributor this month
`;

    if (impact.percentileRank !== undefined) {
      section += `📊 Top **${100 - impact.percentileRank}%** of all contributors\n`;
    }
  }

  // Add top patterns
  if (impact.topPatterns.length > 0) {
    section += `
### Top Patterns

| Pattern | Language | Uses | Time Saved |
|---------|----------|------|------------|
`;
    for (const pattern of impact.topPatterns.slice(0, 5)) {
      section += `| ${pattern.patternName} | ${pattern.language} | ${pattern.usageCount} | ${(pattern.timeSavedMinutes / 60).toFixed(1)} hrs |\n`;
    }
  }

  // Add sharing options
  section += `
---

`;

  if (prefs.shareProfile) {
    section += `[View Full Profile] | [Share Profile] | [Download Certificate]\n`;
  } else {
    section += `[View All Patterns] | [Enable Profile Sharing]\n`;
  }

  return section;
}

/**
 * Get emoji for rank display
 */
function getRankEmoji(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  if (rank <= 10) return '🏅';
  if (rank <= 50) return '⭐';
  return '📈';
}

/**
 * Generate a mini community impact badge for inline display
 * Used in other sections to show community contribution status
 */
export function generateCommunityBadge(impact: CommunityImpactSummary): string {
  if (impact.totalPatternsContributed === 0) {
    return '';
  }

  if (impact.totalUsersHelped >= 100) {
    return `🌟 **Community Hero** (helped ${impact.totalUsersHelped}+ developers)`;
  } else if (impact.totalUsersHelped >= 25) {
    return `⭐ **Active Contributor** (helped ${impact.totalUsersHelped} developers)`;
  } else if (impact.totalUsersHelped >= 5) {
    return `📈 **Rising Contributor** (helped ${impact.totalUsersHelped} developers)`;
  } else {
    return `🌱 **New Contributor** (${impact.totalPatternsContributed} patterns shared)`;
  }
}

/**
 * Calculate estimated monetary value of contributions
 * Used for displaying impact in business terms
 */
export function calculateContributionValue(
  timeSavedHours: number,
  developerRate = 150
): { dollarValue: number; formatted: string } {
  const dollarValue = Math.round(timeSavedHours * developerRate);
  return {
    dollarValue,
    formatted: `$${dollarValue.toLocaleString()}`
  };
}
