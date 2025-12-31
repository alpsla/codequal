/**
 * Promotional Offers Section Generator
 *
 * Generates promotional content for BASIC tier users to encourage upgrades.
 * Handles eligibility checks and one-time trial offers.
 *
 * Session 66: Created for tier differentiation
 */

/**
 * Types of promotional offers
 */
export type PromoType =
  | 'pro_trial'           // One-time free PRO analysis
  | 'first_security'      // First security issue discount
  | 'high_issue_count'    // PR with many issues
  | 'weekly_active'       // Active user reward
  | 'milestone'           // Analysis milestone (10th, 50th, etc.)
  | 'none';               // No active promotion

/**
 * User eligibility context for promotions
 */
export interface PromoEligibility {
  tier: 'basic' | 'pro' | 'enterprise';
  daysSinceSignup: number;
  totalAnalyses: number;
  analysesThisWeek: number;
  hasUsedProTrial: boolean;
  hasSecurityIssues: boolean;
  issueCount: number;
}

/**
 * Promotional offer details
 */
export interface PromoOffer {
  type: PromoType;
  title: string;
  description: string;
  ctaText: string;
  ctaUrl: string;
  expiresIn?: string;
  value?: string;
}

/**
 * Check user eligibility for promotional offers
 *
 * @param context - User eligibility context
 * @returns The most relevant promotion type, or 'none'
 */
export function checkPromoEligibility(context: PromoEligibility): PromoType {
  // Only BASIC tier users get promotions
  if (context.tier !== 'basic') {
    return 'none';
  }

  // Priority 1: One-time PRO trial (most valuable)
  if (
    !context.hasUsedProTrial &&
    context.daysSinceSignup >= 7 &&
    context.totalAnalyses >= 3
  ) {
    return 'pro_trial';
  }

  // Priority 2: First security issue (teachable moment)
  if (context.hasSecurityIssues && context.totalAnalyses <= 5) {
    return 'first_security';
  }

  // Priority 3: High issue count (clear value prop)
  if (context.issueCount >= 20) {
    return 'high_issue_count';
  }

  // Priority 4: Weekly active user reward
  if (context.analysesThisWeek >= 3) {
    return 'weekly_active';
  }

  // Priority 5: Milestones
  if ([10, 25, 50, 100].includes(context.totalAnalyses)) {
    return 'milestone';
  }

  return 'none';
}

/**
 * Get promotional offer details
 *
 * @param promoType - Type of promotion to generate
 * @param context - Additional context for personalization
 * @returns Promotional offer details
 */
export function getPromoOffer(
  promoType: PromoType,
  context?: Partial<PromoEligibility>
): PromoOffer | null {
  switch (promoType) {
    case 'pro_trial':
      return {
        type: 'pro_trial',
        title: '🎁 Try PRO Features FREE',
        description: 'Experience automated fixes on this PR at no cost.',
        ctaText: '🚀 Activate PRO Trial',
        ctaUrl: '/upgrade?promo=trial',
        expiresIn: '24 hours',
        value: 'Save 2+ hours on this PR'
      };

    case 'first_security':
      return {
        type: 'first_security',
        title: '🔒 Security Issue Detected',
        description: 'PRO tier can auto-fix security vulnerabilities instantly.',
        ctaText: '🛡️ Fix Security Issues',
        ctaUrl: '/upgrade?promo=security',
        value: 'Prevent potential breaches'
      };

    case 'high_issue_count':
      return {
        type: 'high_issue_count',
        title: `⚡ ${context?.issueCount ?? 20}+ Issues Found`,
        description: 'PRO can auto-fix most of these in under a minute.',
        ctaText: '⚡ Auto-Fix All',
        ctaUrl: '/upgrade?promo=bulk',
        value: `Save ${Math.round((context?.issueCount ?? 20) * 0.25)} hours`
      };

    case 'weekly_active':
      return {
        type: 'weekly_active',
        title: '🏆 Power User Detected',
        description: "You've run 3+ analyses this week. PRO would save you hours.",
        ctaText: '📈 Upgrade to PRO',
        ctaUrl: '/upgrade?promo=active',
        value: '50% off first month'
      };

    case 'milestone':
      return {
        type: 'milestone',
        title: `🎉 Milestone: ${context?.totalAnalyses ?? 10} Analyses!`,
        description: 'Celebrate with a PRO upgrade and unlock advanced features.',
        ctaText: '🎁 Claim Reward',
        ctaUrl: '/upgrade?promo=milestone',
        value: 'Exclusive milestone discount'
      };

    case 'none':
    default:
      return null;
  }
}

/**
 * Generate the promotional section for reports
 *
 * @param promoType - Type of promotion
 * @param context - User context for personalization
 * @returns Markdown section for the report
 */
export function generatePromoSection(
  promoType: PromoType,
  context?: Partial<PromoEligibility>
): string {
  const offer = getPromoOffer(promoType, context);

  if (!offer) {
    return '';
  }

  return `
---

## ${offer.title}

${offer.description}

${offer.value ? `**Value:** ${offer.value}` : ''}
${offer.expiresIn ? `⏰ *Expires in ${offer.expiresIn}*` : ''}

[${offer.ctaText}](${offer.ctaUrl}) | [Learn More](/pricing)
`;
}

/**
 * Generate a subtle upgrade hint for inline display
 * Used throughout the report in relevant contexts
 */
export function generateUpgradeHint(context: 'security' | 'performance' | 'bulk' | 'general'): string {
  switch (context) {
    case 'security':
      return '💡 *PRO tip: Auto-fix security issues with one click*';

    case 'performance':
      return '💡 *PRO tip: Get AI-powered performance optimizations*';

    case 'bulk':
      return '💡 *PRO tip: Auto-fix all issues in ~30 seconds*';

    case 'general':
    default:
      return '💡 *[Upgrade to PRO](/pricing) for automated fixes*';
  }
}

/**
 * Generate comparison table for upgrade pages
 */
export function generateTierComparisonTable(): string {
  return `
| Feature | BASIC | PRO |
|---------|-------|-----|
| Issue Detection | ✅ All issues | ✅ All issues |
| AI Recommendations | ✅ Copy-paste ready | ✅ Copy-paste ready |
| Educational Resources | ✅ Learning paths | ✅ Learning paths |
| Skill Progression | ✅ Track growth | ✅ Track growth |
| Achievements & XP | ✅ Unlock badges | ✅ Unlock badges |
| Community Impact | ✅ See your impact | ✅ See your impact |
| Pattern-Based Fixes | ✅ Suggestions | ✅ **Auto-apply** |
| **AI Fix Generation** | ❌ | ✅ **Included** |
| **Auto-Fix Apply** | ❌ | ✅ **One-click** |
| **Historical Analytics** | ✅ 5 PRs history | ✅ **Unlimited history** |
| **Priority Support** | ❌ | ✅ Email support |
`;
}

/**
 * Generate value proposition for a specific issue count
 */
export function generateValueProp(
  issueCount: number,
  baseFixHours: number,
  developerRate = 150
): string {
  const manualCost = Math.round(baseFixHours * developerRate);
  const proTime = Math.max(0.1, issueCount * 0.01); // ~36 seconds per issue with PRO
  const proCost = Math.round(proTime * developerRate);
  const savings = manualCost - proCost;
  const savingsPercent = Math.round((savings / manualCost) * 100);

  return `
### Why Upgrade?

| Scenario | Manual Fix | With PRO |
|----------|------------|----------|
| **Time** | ${baseFixHours.toFixed(1)} hours | ~${Math.ceil(proTime * 60)} minutes |
| **Cost** | $${manualCost.toLocaleString()} | $${proCost.toLocaleString()} |
| **Savings** | — | **$${savings.toLocaleString()} (${savingsPercent}%)** |

PRO pays for itself after just **1-2 analyses** per month.
`;
}
