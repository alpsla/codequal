"use strict";
/**
 * Story Decomposer
 *
 * Groups related issues into "fix stories" for atomic processing.
 * Ralph-inspired: each story should be completable in one context window.
 *
 * Created: Session 82
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoryDecomposer = void 0;
// ============================================================================
// Rule Relationships
// ============================================================================
/**
 * Rules that are related and should be fixed together
 */
const RELATED_RULES = {
    // Resource management
    'CloseResource': ['UseAutoCloseable', 'TryWithResources'],
    'UseAutoCloseable': ['CloseResource', 'TryWithResources'],
    // Exception handling
    'EmptyCatchBlock': ['AvoidCatchingThrowable', 'AvoidCatchingGenericException', 'PreserveStackTrace'],
    'AvoidCatchingThrowable': ['EmptyCatchBlock', 'AvoidCatchingGenericException'],
    'AvoidCatchingGenericException': ['EmptyCatchBlock', 'AvoidCatchingThrowable'],
    // Null safety
    'NullPointerException': ['AvoidReturningNull', 'NullAssignment'],
    'AvoidReturningNull': ['NullPointerException', 'OptionalUsage'],
    // Unused code
    'UnusedVariable': ['UnusedLocalVariable', 'UnusedPrivateField', 'UnusedPrivateMethod'],
    'UnusedImport': ['UnusedVariable', 'RedundantImport'],
    // Naming
    'MethodNamingConventions': ['ClassNamingConventions', 'VariableNamingConventions'],
    'ClassNamingConventions': ['MethodNamingConventions'],
    // Security
    'HardcodedPassword': ['HardcodedCredentials', 'HardcodedSecret'],
    'SQLInjection': ['CommandInjection', 'PathTraversal'],
};
/**
 * Rule categories for grouping
 */
const RULE_CATEGORIES = {
    // Resource management
    'CloseResource': 'resource-management',
    'UseAutoCloseable': 'resource-management',
    'TryWithResources': 'resource-management',
    // Exception handling
    'EmptyCatchBlock': 'exception-handling',
    'AvoidCatchingThrowable': 'exception-handling',
    'AvoidCatchingGenericException': 'exception-handling',
    'PreserveStackTrace': 'exception-handling',
    // Null safety
    'NullPointerException': 'null-safety',
    'AvoidReturningNull': 'null-safety',
    'NullAssignment': 'null-safety',
    // Unused code
    'UnusedVariable': 'unused-code',
    'UnusedLocalVariable': 'unused-code',
    'UnusedPrivateField': 'unused-code',
    'UnusedPrivateMethod': 'unused-code',
    'UnusedImport': 'unused-code',
    // Security
    'HardcodedPassword': 'security',
    'HardcodedCredentials': 'security',
    'SQLInjection': 'security',
    'CommandInjection': 'security',
};
// ============================================================================
// Decomposer
// ============================================================================
class StoryDecomposer {
    constructor(config = {}) {
        var _a, _b, _c, _d;
        this.config = {
            maxIssuesPerStory: (_a = config.maxIssuesPerStory) !== null && _a !== void 0 ? _a : 5,
            groupByFileThenRule: (_b = config.groupByFileThenRule) !== null && _b !== void 0 ? _b : true,
            maxLineSpan: (_c = config.maxLineSpan) !== null && _c !== void 0 ? _c : 100,
            prioritizeBySeverity: (_d = config.prioritizeBySeverity) !== null && _d !== void 0 ? _d : true,
        };
    }
    /**
     * Decompose issues into fix stories
     */
    decompose(issues) {
        if (issues.length === 0) {
            return [];
        }
        console.log(`[StoryDecomposer] Decomposing ${issues.length} issues into fix stories`);
        // Step 1: Group by strategy
        let groups;
        if (this.config.groupByFileThenRule) {
            groups = this.groupByFileThenRule(issues);
        }
        else {
            groups = this.groupByRuleOnly(issues);
        }
        // Step 2: Split large groups
        groups = this.splitLargeGroups(groups);
        // Step 3: Merge tiny groups (single issues) if related
        groups = this.mergeTinyGroups(groups, issues);
        // Step 4: Prioritize
        groups = this.prioritizeGroups(groups, issues);
        console.log(`[StoryDecomposer] Created ${groups.length} fix stories`);
        return groups;
    }
    /**
     * Group by file first, then by rule within file
     */
    groupByFileThenRule(issues) {
        const groups = [];
        // Group by file
        const byFile = new Map();
        for (const issue of issues) {
            const existing = byFile.get(issue.file) || [];
            existing.push(issue);
            byFile.set(issue.file, existing);
        }
        // Within each file, group by related rules
        for (const [file, fileIssues] of byFile) {
            const subgroups = this.groupRelatedRules(fileIssues);
            for (const subgroup of subgroups) {
                const ruleIds = [...new Set(subgroup.map(i => i.ruleId))];
                const category = this.getGroupCategory(ruleIds);
                groups.push({
                    groupName: `${category} in ${this.getFileName(file)}`,
                    issueIds: subgroup.map(i => i.id),
                    ruleIds,
                    files: [file],
                    priority: 999, // Will be set later
                    estimatedComplexity: this.estimateComplexity(subgroup),
                });
            }
        }
        return groups;
    }
    /**
     * Group by rule only (across files)
     */
    groupByRuleOnly(issues) {
        const groups = [];
        // Group by category
        const byCategory = new Map();
        for (const issue of issues) {
            const category = RULE_CATEGORIES[issue.ruleId] || 'other';
            const existing = byCategory.get(category) || [];
            existing.push(issue);
            byCategory.set(category, existing);
        }
        for (const [category, categoryIssues] of byCategory) {
            const ruleIds = [...new Set(categoryIssues.map(i => i.ruleId))];
            const files = [...new Set(categoryIssues.map(i => i.file))];
            groups.push({
                groupName: `${this.formatCategoryName(category)} fixes`,
                issueIds: categoryIssues.map(i => i.id),
                ruleIds,
                files,
                priority: 999,
                estimatedComplexity: this.estimateComplexity(categoryIssues),
            });
        }
        return groups;
    }
    /**
     * Group related rules together
     */
    groupRelatedRules(issues) {
        const groups = [];
        const assigned = new Set();
        for (const issue of issues) {
            if (assigned.has(issue.id))
                continue;
            const group = [issue];
            assigned.add(issue.id);
            // Find related issues
            const relatedRules = RELATED_RULES[issue.ruleId] || [];
            for (const other of issues) {
                if (assigned.has(other.id))
                    continue;
                // Same rule or related rule
                if (other.ruleId === issue.ruleId || relatedRules.includes(other.ruleId)) {
                    // Check line proximity
                    if (Math.abs(other.line - issue.line) <= this.config.maxLineSpan) {
                        group.push(other);
                        assigned.add(other.id);
                    }
                }
            }
            groups.push(group);
        }
        return groups;
    }
    /**
     * Split groups that exceed max size
     */
    splitLargeGroups(groups) {
        const result = [];
        for (const group of groups) {
            if (group.issueIds.length <= this.config.maxIssuesPerStory) {
                result.push(group);
            }
            else {
                // Split into chunks
                const chunks = this.chunkArray(group.issueIds, this.config.maxIssuesPerStory);
                for (let i = 0; i < chunks.length; i++) {
                    result.push({
                        ...group,
                        groupName: `${group.groupName} (${i + 1}/${chunks.length})`,
                        issueIds: chunks[i],
                    });
                }
            }
        }
        return result;
    }
    /**
     * Merge tiny groups (1-2 issues) if they're related
     */
    mergeTinyGroups(groups, issues) {
        const issueMap = new Map(issues.map(i => [i.id, i]));
        const result = [];
        const merged = new Set();
        for (let i = 0; i < groups.length; i++) {
            if (merged.has(i))
                continue;
            const group = groups[i];
            // Only merge tiny groups
            if (group.issueIds.length > 2) {
                result.push(group);
                continue;
            }
            // Try to find another tiny group to merge with
            let mergedGroup = { ...group };
            for (let j = i + 1; j < groups.length; j++) {
                if (merged.has(j))
                    continue;
                const other = groups[j];
                if (other.issueIds.length > 2)
                    continue;
                // Check if they're related
                const sameFile = group.files.some(f => other.files.includes(f));
                const sameCategory = this.getGroupCategory(group.ruleIds) === this.getGroupCategory(other.ruleIds);
                if (sameFile || sameCategory) {
                    // Merge if combined size is acceptable
                    const combinedSize = mergedGroup.issueIds.length + other.issueIds.length;
                    if (combinedSize <= this.config.maxIssuesPerStory) {
                        mergedGroup = {
                            groupName: sameFile
                                ? `Mixed fixes in ${this.getFileName(group.files[0])}`
                                : `${this.getGroupCategory(group.ruleIds)} fixes`,
                            issueIds: [...mergedGroup.issueIds, ...other.issueIds],
                            ruleIds: [...new Set([...mergedGroup.ruleIds, ...other.ruleIds])],
                            files: [...new Set([...mergedGroup.files, ...other.files])],
                            priority: 999,
                            estimatedComplexity: 'medium',
                        };
                        merged.add(j);
                    }
                }
            }
            result.push(mergedGroup);
        }
        return result;
    }
    /**
     * Prioritize groups by severity and complexity
     */
    prioritizeGroups(groups, issues) {
        const issueMap = new Map(issues.map(i => [i.id, i]));
        return groups
            .map(group => {
            // Calculate priority based on:
            // 1. Severity (critical=0, high=1, medium=2, low=3)
            // 2. Complexity (simple=0, medium=1, complex=2)
            const severities = group.issueIds
                .map(id => { var _a; return (_a = issueMap.get(id)) === null || _a === void 0 ? void 0 : _a.severity; })
                .filter(Boolean);
            const severityScore = this.getSeverityScore(severities);
            const complexityScore = group.estimatedComplexity === 'simple' ? 0
                : group.estimatedComplexity === 'medium' ? 1 : 2;
            // Security issues get highest priority
            const isSecurityGroup = group.ruleIds.some(r => RULE_CATEGORIES[r] === 'security');
            return {
                ...group,
                priority: isSecurityGroup ? 0 : severityScore * 10 + complexityScore,
            };
        })
            .sort((a, b) => a.priority - b.priority);
    }
    // --------------------------------------------------------------------------
    // Helpers
    // --------------------------------------------------------------------------
    getFileName(filePath) {
        return filePath.split('/').pop() || filePath;
    }
    getGroupCategory(ruleIds) {
        for (const ruleId of ruleIds) {
            const category = RULE_CATEGORIES[ruleId];
            if (category) {
                return this.formatCategoryName(category);
            }
        }
        return 'Code quality';
    }
    formatCategoryName(category) {
        return category
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
    estimateComplexity(issues) {
        if (issues.length === 1) {
            // Simple rules are simple
            const simpleRules = ['UnusedVariable', 'UnusedImport', 'UnusedLocalVariable'];
            if (simpleRules.includes(issues[0].ruleId)) {
                return 'simple';
            }
        }
        if (issues.length <= 2) {
            return 'simple';
        }
        if (issues.length <= 4) {
            return 'medium';
        }
        return 'complex';
    }
    getSeverityScore(severities) {
        const scores = {
            critical: 0,
            high: 1,
            medium: 2,
            low: 3,
        };
        if (severities.length === 0)
            return 2; // Default to medium
        // Return the highest severity (lowest score)
        return Math.min(...severities.map(s => { var _a; return (_a = scores[s]) !== null && _a !== void 0 ? _a : 2; }));
    }
    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
}
exports.StoryDecomposer = StoryDecomposer;
// ============================================================================
// Exports
// ============================================================================
exports.default = StoryDecomposer;
