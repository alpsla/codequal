"use strict";
/**
 * Achievement System
 *
 * Generates achievement displays with two style options:
 * - Professional: Certificate-style, formal tone
 * - Gamified: Badge-style, playful tone with XP
 *
 * Session 66: Created for tier differentiation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAchievementsSection = generateAchievementsSection;
exports.generateXpProgressBar = generateXpProgressBar;
exports.calculateLevel = calculateLevel;
/**
 * Generate the achievements section for reports
 *
 * @param achievements - List of user's achievements
 * @param style - Display style preference
 * @param showRecent - Number of recent achievements to show (default 3)
 * @returns Markdown section for the report
 */
function generateAchievementsSection(achievements, style = 'professional', showRecent = 3) {
    if (achievements.length === 0) {
        return generateNoAchievementsSection(style);
    }
    if (style === 'professional') {
        return generateProfessionalAchievements(achievements, showRecent);
    }
    else {
        return generateGamifiedAchievements(achievements, showRecent);
    }
}
/**
 * Generate section when user has no achievements yet
 */
function generateNoAchievementsSection(style) {
    if (style === 'professional') {
        return `
## 📜 Professional Certifications

No certifications earned yet. Complete analyses and maintain quality standards
to earn professional certifications that demonstrate your expertise.

**Available Certifications:**
- Security Specialist (10 consecutive clean security reviews)
- Quality Champion (90+ score on 5 consecutive PRs)
- Performance Expert (50 performance issues resolved)

[View All Certifications]
`;
    }
    else {
        return `
## 🏆 Achievements

No achievements unlocked yet! Start your journey by analyzing PRs and fixing issues.

**Starter Achievements:**
- 🎯 **First Blood** — Fix your first security vulnerability
- 🚀 **Early Adopter** — Complete your first analysis
- ⚡ **Quick Start** — Fix 5 issues in your first week

[View All Achievements]
`;
    }
}
/**
 * Generate professional-style achievements (certificates)
 */
function generateProfessionalAchievements(achievements, showRecent) {
    const totalXp = achievements.reduce((sum, a) => sum + a.xpValue, 0);
    const recent = achievements
        .sort((a, b) => b.unlockedAt.getTime() - a.unlockedAt.getTime())
        .slice(0, showRecent);
    let section = `
## 📜 Professional Certifications

You have earned **${achievements.length} certification${achievements.length > 1 ? 's' : ''}**
demonstrating expertise in code quality and security practices.

### Recent Certifications

`;
    for (const achievement of recent) {
        const date = achievement.unlockedAt.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const credentialId = `${achievement.category.toUpperCase().slice(0, 3)}-${achievement.unlockedAt.getFullYear()}-${achievement.id.slice(0, 6)}`;
        section += `#### ${getProfessionalTitle(achievement)}

${getProfessionalDescription(achievement)}

| Field | Value |
|-------|-------|
| **Awarded** | ${date} |
| **Credential ID** | \`${credentialId}\` |
| **Category** | ${capitalizeFirst(achievement.category)} |
${achievement.prNumber ? `| **Context** | PR #${achievement.prNumber} in ${achievement.repository} |` : ''}

---

`;
    }
    section += `
[Download Certificates] | [Add to LinkedIn] | [View All (${achievements.length})]
`;
    return section;
}
/**
 * Generate gamified-style achievements (badges with XP)
 */
function generateGamifiedAchievements(achievements, showRecent) {
    const totalXp = achievements.reduce((sum, a) => sum + a.xpValue, 0);
    const recent = achievements
        .sort((a, b) => b.unlockedAt.getTime() - a.unlockedAt.getTime())
        .slice(0, showRecent);
    const tierCounts = {
        legendary: achievements.filter(a => a.tier === 'legendary').length,
        epic: achievements.filter(a => a.tier === 'epic').length,
        rare: achievements.filter(a => a.tier === 'rare').length,
        common: achievements.filter(a => a.tier === 'common').length
    };
    let section = `
## 🏆 Achievements Unlocked!

**Total XP:** ${totalXp.toLocaleString()} | **Badges:** ${achievements.length}

| Tier | Count |
|------|-------|
| 🏆 Legendary | ${tierCounts.legendary} |
| 💜 Epic | ${tierCounts.epic} |
| 💙 Rare | ${tierCounts.rare} |
| ⚪ Common | ${tierCounts.common} |

### Recently Unlocked

`;
    for (const achievement of recent) {
        const tierEmoji = getTierEmoji(achievement.tier);
        const tierPercent = getTierPercentile(achievement.tier);
        const categoryEmoji = getCategoryEmoji(achievement.category);
        section += `#### ${categoryEmoji} ${achievement.name} ${tierEmoji}

*${achievement.tier.toUpperCase()} — ${tierPercent}% of users*

${getGamifiedDescription(achievement)}

**+${achievement.xpValue} XP** | Unlocked: ${formatRelativeTime(achievement.unlockedAt)}

`;
        // Show progress bar for progressive achievements
        if (achievement.progress !== undefined && achievement.progressMax !== undefined) {
            const percent = Math.round((achievement.progress / achievement.progressMax) * 100);
            section += `Progress: [${'█'.repeat(Math.floor(percent / 10))}${'░'.repeat(10 - Math.floor(percent / 10))}] ${percent}%\n\n`;
        }
        section += '---\n\n';
    }
    section += `
[View Trophy Case] | [Share Achievement] | [Leaderboard]
`;
    return section;
}
/**
 * Get professional title for an achievement
 */
function getProfessionalTitle(achievement) {
    var _a;
    const titles = {
        'security-guardian': 'Certified Security Specialist',
        'first-blood': 'Security Awareness Certificate',
        'vulnerability-hunter': 'Senior Security Analyst',
        'quality-champion': 'Code Quality Expert',
        'zero-issues': 'Perfect Review Certificate',
        'speed-demon': 'Rapid Response Certified',
        'community-helper': 'Community Contributor',
        'pattern-master': 'Pattern Engineering Expert',
        'early-adopter': 'First Analysis Certified',
        'dedicated-developer': 'Dedicated Developer',
        'centurion': 'Veteran Analyst'
    };
    return (_a = titles[achievement.id]) !== null && _a !== void 0 ? _a : `${capitalizeFirst(achievement.category)} Certification`;
}
/**
 * Get professional description for an achievement
 */
function getProfessionalDescription(achievement) {
    var _a;
    const descriptions = {
        'security-guardian': 'Demonstrated exceptional security awareness by maintaining zero vulnerabilities across 10 consecutive code reviews.',
        'first-blood': 'Successfully identified and addressed a security vulnerability, demonstrating security-first development practices.',
        'vulnerability-hunter': 'Remediated 50 security vulnerabilities, contributing significantly to codebase security.',
        'quality-champion': 'Maintained code quality scores above 90 across 5 consecutive pull requests.',
        'zero-issues': 'Submitted code that passed all quality checks with no issues detected.',
        'speed-demon': 'Demonstrated rapid issue resolution capability by fixing 20 issues in under 60 seconds.',
        'community-helper': 'Contributed patterns that have been adopted by 10 fellow developers.',
        'pattern-master': 'Created 25 reusable fix patterns, advancing the community knowledge base.',
        'early-adopter': 'Completed your first code quality analysis, beginning the journey toward excellence.',
        'dedicated-developer': 'Reached the milestone of 10+ code analyses, demonstrating commitment to quality.',
        'centurion': 'Completed 100 code analyses, demonstrating sustained commitment to code quality.'
    };
    return (_a = descriptions[achievement.id]) !== null && _a !== void 0 ? _a : achievement.description;
}
/**
 * Get gamified description for an achievement
 */
function getGamifiedDescription(achievement) {
    var _a;
    const descriptions = {
        'security-guardian': "You've vanquished 50 security demons! Your code fortress stands unbreached.",
        'first-blood': 'First security bug slain! The journey of a thousand fixes begins with a single patch.',
        'vulnerability-hunter': 'Master hunter! 50 vulnerabilities eliminated from the codebase.',
        'quality-champion': 'PERFECT COMBO! 5 flawless reviews in a row. Unstoppable!',
        'zero-issues': 'FLAWLESS VICTORY! Not a single issue detected. Legendary!',
        'speed-demon': 'SPEED DEMON! 20 fixes in under a minute. Are you even human?!',
        'community-helper': 'Community Hero! Your patterns are helping devs everywhere.',
        'pattern-master': 'Pattern Wizard! 25 spells (patterns) added to the community spellbook.',
        'early-adopter': 'Welcome, brave adventurer! Your quest for quality begins.',
        'centurion': 'LEGENDARY: The Centurion! 100 battles fought, 100 victories claimed!'
    };
    return (_a = descriptions[achievement.id]) !== null && _a !== void 0 ? _a : achievement.description;
}
/**
 * Get emoji for achievement tier
 */
function getTierEmoji(tier) {
    const emojis = {
        legendary: '🏆',
        epic: '💜',
        rare: '💙',
        common: '⚪'
    };
    return emojis[tier];
}
/**
 * Get emoji for achievement category
 */
function getCategoryEmoji(category) {
    const emojis = {
        security: '🛡️',
        quality: '✨',
        performance: '⚡',
        architecture: '🏗️',
        community: '🌟',
        milestone: '🎯'
    };
    return emojis[category];
}
/**
 * Get percentile for achievement tier (for rarity display)
 */
function getTierPercentile(tier) {
    const percentiles = {
        legendary: 1, // Top 1%
        epic: 5, // Top 5%
        rare: 15, // Top 15%
        common: 50 // Top 50%
    };
    return percentiles[tier];
}
/**
 * Format relative time for display
 */
function formatRelativeTime(date) {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0)
        return 'Today';
    if (diffDays === 1)
        return 'Yesterday';
    if (diffDays < 7)
        return `${diffDays} days ago`;
    if (diffDays < 30)
        return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
}
/**
 * Capitalize first letter of a string
 */
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
/**
 * Generate XP progress bar for user level
 */
function generateXpProgressBar(currentXp, nextLevelXp) {
    const percent = Math.min(100, Math.round((currentXp / nextLevelXp) * 100));
    const filled = Math.floor(percent / 5);
    const empty = 20 - filled;
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${percent}% to next level`;
}
/**
 * Calculate user level from XP
 */
function calculateLevel(totalXp) {
    var _a, _b;
    const levels = [
        { threshold: 0, title: 'Novice' },
        { threshold: 100, title: 'Apprentice' },
        { threshold: 300, title: 'Developer' },
        { threshold: 600, title: 'Senior Developer' },
        { threshold: 1000, title: 'Expert' },
        { threshold: 1500, title: 'Master' },
        { threshold: 2500, title: 'Grand Master' },
        { threshold: 4000, title: 'Legend' },
        { threshold: 6000, title: 'Mythic' }
    ];
    let level = 1;
    let title = 'Novice';
    let nextLevelXp = 100;
    for (let i = levels.length - 1; i >= 0; i--) {
        if (totalXp >= levels[i].threshold) {
            level = i + 1;
            title = levels[i].title;
            nextLevelXp = (_b = (_a = levels[i + 1]) === null || _a === void 0 ? void 0 : _a.threshold) !== null && _b !== void 0 ? _b : levels[i].threshold * 2;
            break;
        }
    }
    return { level, title, nextLevelXp };
}
