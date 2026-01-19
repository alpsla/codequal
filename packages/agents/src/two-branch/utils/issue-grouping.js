"use strict";
/**
 * Issue Grouping Utility - Group Similar Issues for Cost-Efficient AI Analysis
 *
 * Key Insight: Most static analysis issues are repeated patterns with different locations.
 * Instead of analyzing 10,000 individual issues, group by rule/description and analyze once.
 *
 * Example: "AvoidThrowingRawExceptionTypes" appears 5,545 times in Kafka
 * - Without grouping: 5,545 AI calls × $0.003 = $16.61
 * - With grouping: 1 AI call × $0.003 = $0.003
 * - Savings: 99.98% ($16.61 saved)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRecommendationOnlyTool = isRecommendationOnlyTool;
exports.hasNativeFixSupport = hasNativeFixSupport;
exports.groupIssues = groupIssues;
exports.prioritizeGroups = prioritizeGroups;
exports.generateGroupingSummary = generateGroupingSummary;
exports.applyFixToGroup = applyFixToGroup;
exports.estimateGroupingCost = estimateGroupingCost;
/**
 * Group issues by rule + tool + severity
 * This creates one group per unique issue type
 */
/**
 * Helper: Infer detectedCategory from tool name
 * Updated to support Phase 1 security tools (Session 59)
 */
function inferCategoryFromTool(tool) {
    const t = tool.toLowerCase();
    // Security tools (code-level)
    if (t === 'semgrep')
        return 'Security';
    // Secret detection tools (recommendation-only)
    if (t === 'gitleaks' || t === 'trufflehog')
        return 'Secrets';
    // IaC security tools (recommendation + partial fix)
    if (t === 'checkov' || t === 'trivy-iac')
        return 'Infrastructure';
    // Container security tools (recommendation-only)
    if (t === 'trivy' || t === 'grype' || t === 'trivy-container')
        return 'Container Security';
    // API Schema/GraphQL tools (Session 59 - P1)
    if (t === 'spectral')
        return 'API Design';
    if (t === 'graphql-cop' || t === 'graphql-scanner' || t === 'graphql-static')
        return 'GraphQL Security';
    // Dependency/SCA tools
    if (t === 'dependency-check' || t === 'npm-audit' || t === 'safety' ||
        t === 'bundler-audit' || t === 'cargo-audit' || t === 'govulncheck')
        return 'Dependencies';
    // Code quality tools
    if (t === 'spotbugs' || t === 'checkstyle' || t === 'pmd' ||
        t === 'eslint' || t === 'pylint' || t === 'rubocop' ||
        t === 'phpstan' || t === 'clippy' || t === 'golangci-lint')
        return 'Code Quality';
    // Style tools
    if (t === 'prettier' || t === 'black' || t === 'gofmt' || t === 'rustfmt')
        return 'Style';
    return 'Architecture';
}
/**
 * Helper: Check if a tool produces recommendation-only issues (no code fix possible)
 * These issues should NOT go through AI fix generation
 */
function isRecommendationOnlyTool(tool) {
    const recommendationTools = [
        // Secret scanners - secrets need rotation, not code changes
        'gitleaks',
        'trufflehog',
        // Container scanners - need image updates, not code changes
        'trivy',
        'grype',
        'trivy-container',
        // Some IaC issues (though Checkov has partial --fix support)
        'trivy-iac',
    ];
    return recommendationTools.includes(tool.toLowerCase());
}
/**
 * Helper: Check if a tool has native --fix support (Tier 1)
 */
function hasNativeFixSupport(tool) {
    const tier1Tools = [
        // JavaScript/TypeScript
        'eslint',
        'prettier',
        'biome',
        // Python
        'ruff',
        'black',
        'autopep8',
        'isort',
        // Java
        'sorald',
        'checkstyle',
        // Go
        'gofmt',
        'goimports',
        // Rust
        'rustfmt',
        'clippy',
        // IaC (partial support)
        'checkov',
    ];
    return tier1Tools.includes(tool.toLowerCase());
}
/**
 * Helper: Determine fix tier for a tool
 */
function determineFixTier(tool) {
    if (isRecommendationOnlyTool(tool)) {
        return 'recommendation';
    }
    if (hasNativeFixSupport(tool)) {
        return 1;
    }
    // Tier 2: Tools with dedicated fixers (sorald for PMD, etc.)
    const tier2Tools = ['pmd', 'spotbugs'];
    if (tier2Tools.includes(tool.toLowerCase())) {
        return 2;
    }
    // Default to Tier 3 (AI-generated)
    return 3;
}
function groupIssues(issues, maxExamplesPerGroup = 5) {
    const groupMap = new Map();
    // Group issues by rule + tool + severity
    for (const issue of issues) {
        const key = `${issue.tool}|${issue.rule}|${issue.severity}`;
        // Debug: Log npm-audit grouping to diagnose duplication
        if (issue.tool === 'npm-audit') {
            console.log(`[DEBUG grouping] npm-audit issue - key: ${key}, rule: ${issue.rule}, severity: ${issue.severity}, message: ${issue.message.substring(0, 60)}`);
        }
        let group = groupMap.get(key);
        if (!group) {
            // Determine fix capabilities for this tool
            const isRecommendation = isRecommendationOnlyTool(issue.tool);
            const nativeFix = hasNativeFixSupport(issue.tool);
            const fixTier = determineFixTier(issue.tool);
            group = {
                rule: issue.rule,
                tool: issue.tool,
                severity: issue.severity,
                description: issue.message,
                category: issue.category || 'Unknown',
                detectedCategory: issue.detectedCategory || inferCategoryFromTool(issue.tool), // BUG FIX: Preserve detectedCategory
                count: 0,
                examples: [],
                // Fix capability flags (Session 59)
                isRecommendationOnly: isRecommendation,
                hasNativeFix: nativeFix,
                fixTier: fixTier,
                aiAnalyzed: false,
                costSaved: 0
            };
            groupMap.set(key, group);
        }
        // Increment count
        group.count++;
        // Add example if under limit
        if (group.examples.length < maxExamplesPerGroup) {
            group.examples.push({
                file: issue.file,
                line: issue.line,
                column: issue.column,
                snippet: issue.snippet
            });
        }
    }
    // Convert to array and sort by count (most common first)
    let groups = Array.from(groupMap.values()).sort((a, b) => b.count - a.count);
    // BUG FIX: Deduplicate groups with same rule+tool+severity but different descriptions
    // This handles cases where grouping key is correct but groups were created separately
    // (e.g., npm-audit issues with same rule but different messages)
    const deduplicatedGroups = new Map();
    let duplicatesFound = 0;
    // Debug: Log npm-audit groups before deduplication
    const npmAuditGroups = groups.filter(g => g.tool === 'npm-audit');
    if (npmAuditGroups.length > 1) {
        console.log(`[DEDUP DEBUG] Found ${npmAuditGroups.length} npm-audit groups before deduplication:`);
        npmAuditGroups.forEach((g, i) => {
            console.log(`[DEDUP DEBUG]   Group ${i + 1}: rule="${g.rule}", tool="${g.tool}", severity="${g.severity}", count=${g.count}`);
        });
    }
    for (const group of groups) {
        const dedupKey = `${group.tool}|${group.rule}|${group.severity}`;
        const existing = deduplicatedGroups.get(dedupKey);
        if (existing) {
            duplicatesFound++;
            console.log(`[DEDUP] Merging duplicate group: ${dedupKey} (existing count: ${existing.count}, new count: ${group.count})`);
            // Merge: combine counts, merge examples, keep longer description
            existing.count += group.count;
            existing.costSaved += group.costSaved;
            // Merge examples (avoid duplicates, keep max 5)
            const existingFiles = new Set(existing.examples.map(e => `${e.file}:${e.line}`));
            for (const example of group.examples) {
                const exampleKey = `${example.file}:${example.line}`;
                if (!existingFiles.has(exampleKey) && existing.examples.length < 5) {
                    existing.examples.push(example);
                    existingFiles.add(exampleKey);
                }
            }
            // Keep the longer/more descriptive description
            if (group.description.length > existing.description.length) {
                existing.description = group.description;
            }
            // Preserve AI analysis if either group has it
            if (group.aiAnalyzed && !existing.aiAnalyzed) {
                existing.aiAnalyzed = group.aiAnalyzed;
                existing.fixSuggestion = group.fixSuggestion;
                existing.educationalLinks = group.educationalLinks;
            }
        }
        else {
            deduplicatedGroups.set(dedupKey, { ...group });
        }
    }
    // Convert back to array and re-sort
    groups = Array.from(deduplicatedGroups.values()).sort((a, b) => b.count - a.count);
    if (duplicatesFound > 0) {
        console.log(`[DEDUP] ✅ Combined ${duplicatesFound} duplicate groups. Final groups: ${groups.length} (was ${groups.length + duplicatesFound})`);
    }
    // Calculate costs (after deduplication)
    const costPerAnalysis = 0.003;
    const totalIssues = issues.length;
    const uniqueGroups = groups.length;
    const costWithoutGrouping = totalIssues * costPerAnalysis;
    const costWithGrouping = uniqueGroups * costPerAnalysis;
    const savings = costWithoutGrouping - costWithGrouping;
    const savingsPercent = totalIssues > 0 ? (savings / costWithoutGrouping) * 100 : 0;
    // Recalculate cost saved per group after deduplication
    groups.forEach(group => {
        group.costSaved = (group.count - 1) * costPerAnalysis;
    });
    return {
        totalIssues,
        uniqueGroups,
        groups,
        costWithoutGrouping,
        costWithGrouping,
        savings,
        savingsPercent
    };
}
/**
 * Filter groups to prioritize which ones get AI analysis
 * Strategy: Analyze high-impact groups first
 *
 * Updated (Session 59): Separates recommendation-only groups that should NOT go through AI fix generation
 */
function prioritizeGroups(groups, maxGroups = 20) {
    // Separate groups by fix tier
    const recommendationOnly = [];
    const tier1Native = [];
    const tier2Dedicated = [];
    const needsAIAnalysis = [];
    for (const group of groups) {
        if (group.isRecommendationOnly || group.fixTier === 'recommendation') {
            recommendationOnly.push(group);
        }
        else if (group.fixTier === 1 || group.hasNativeFix) {
            tier1Native.push(group);
        }
        else if (group.fixTier === 2) {
            tier2Dedicated.push(group);
        }
        else {
            needsAIAnalysis.push(group);
        }
    }
    // Priority scoring ONLY for groups that need AI analysis (Tier 3):
    // 1. Critical severity: +1000 points
    // 2. High severity: +500 points
    // 3. Many occurrences: +count points
    // 4. Security/Error Prone categories: +200 points
    const scoredGroups = needsAIAnalysis.map(group => {
        let score = group.count; // Base score = occurrence count
        if (group.severity === 'critical')
            score += 1000;
        else if (group.severity === 'high')
            score += 500;
        else if (group.severity === 'medium')
            score += 100;
        const catLower = group.category.toLowerCase();
        if (catLower.includes('security') || catLower.includes('error prone')) {
            score += 200;
        }
        return { group, score };
    });
    // Sort by score (highest first)
    scoredGroups.sort((a, b) => b.score - a.score);
    const analyzed = scoredGroups.slice(0, maxGroups).map(s => s.group);
    const deferred = scoredGroups.slice(maxGroups).map(s => s.group);
    const totalCoverage = analyzed.reduce((sum, g) => sum + g.count, 0);
    const totalIssues = groups.reduce((sum, g) => sum + g.count, 0);
    const coveragePercent = totalIssues > 0 ? (totalCoverage / totalIssues * 100).toFixed(1) : '0';
    const reasoning = [
        `Analyzing top ${analyzed.length} groups covers ${totalCoverage} of ${totalIssues} issues (${coveragePercent}%)`,
        `Tier breakdown: ${tier1Native.length} native-fix, ${tier2Dedicated.length} dedicated-fixer, ${analyzed.length} AI-generated, ${recommendationOnly.length} recommendation-only`
    ].join('. ');
    return {
        analyzed,
        deferred,
        recommendationOnly,
        tier1Native,
        tier2Dedicated,
        reasoning
    };
}
/**
 * Generate a summary report of grouping results
 */
function generateGroupingSummary(result) {
    const lines = [];
    lines.push('═══════════════════════════════════════════════════════');
    lines.push('  Issue Grouping Summary');
    lines.push('═══════════════════════════════════════════════════════\n');
    lines.push(`Total Issues: ${result.totalIssues.toLocaleString()}`);
    lines.push(`Unique Types: ${result.uniqueGroups}`);
    lines.push(`Reduction: ${((1 - result.uniqueGroups / result.totalIssues) * 100).toFixed(1)}%\n`);
    lines.push('Cost Analysis:');
    lines.push(`  Without Grouping: $${result.costWithoutGrouping.toFixed(2)}`);
    lines.push(`  With Grouping: $${result.costWithGrouping.toFixed(2)}`);
    lines.push(`  Savings: $${result.savings.toFixed(2)} (${result.savingsPercent.toFixed(1)}%)\n`);
    lines.push('Top 10 Issue Types:\n');
    result.groups.slice(0, 10).forEach((group, idx) => {
        const percent = ((group.count / result.totalIssues) * 100).toFixed(1);
        lines.push(`${idx + 1}. ${group.rule} (${group.severity})`);
        lines.push(`   Count: ${group.count.toLocaleString()} (${percent}%)`);
        lines.push(`   Category: ${group.category}`);
        lines.push(`   Saved: $${group.costSaved.toFixed(2)}`);
        lines.push(`   Examples:`);
        group.examples.slice(0, 3).forEach(ex => {
            lines.push(`     - ${ex.file}:${ex.line}`);
        });
        lines.push('');
    });
    lines.push('═══════════════════════════════════════════════════════');
    return lines.join('\n');
}
/**
 * Apply AI-generated fix to all instances of a group
 * Returns the original issues with fix applied
 */
function applyFixToGroup(issues, group, aiAnalyzedIssue) {
    return issues.map(issue => {
        // Check if this issue belongs to the group
        if (issue.rule === group.rule &&
            issue.tool === group.tool &&
            issue.severity === group.severity) {
            // Apply the AI-generated fix to this issue
            return {
                ...issue,
                fixSuggestion: group.fixSuggestion,
                educationalLinks: group.educationalLinks,
                agent: aiAnalyzedIssue.agent,
                isGroupAnalyzed: true,
                groupSize: group.count
            };
        }
        return issue;
    });
}
/**
 * Export for cost estimation
 */
function estimateGroupingCost(issueCount, estimatedUniqueTypes = 20, costPerAnalysis = 0.003) {
    const withoutGrouping = issueCount * costPerAnalysis;
    const withGrouping = estimatedUniqueTypes * costPerAnalysis;
    const savings = withoutGrouping - withGrouping;
    const savingsPercent = withoutGrouping > 0 ? (savings / withoutGrouping) * 100 : 0;
    return {
        withoutGrouping,
        withGrouping,
        savings,
        savingsPercent
    };
}
