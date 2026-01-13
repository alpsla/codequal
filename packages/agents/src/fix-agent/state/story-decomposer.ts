/**
 * Story Decomposer
 *
 * Groups related issues into "fix stories" for atomic processing.
 * Ralph-inspired: each story should be completable in one context window.
 *
 * Created: Session 82
 */

// ============================================================================
// Types
// ============================================================================

export interface IssueForGrouping {
  id: string;
  ruleId: string;
  file: string;
  line: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  category?: string;
}

export interface FixStoryGroup {
  groupName: string;
  issueIds: string[];
  ruleIds: string[];
  files: string[];
  priority: number; // Lower = higher priority
  estimatedComplexity: 'simple' | 'medium' | 'complex';
}

export interface DecompositionConfig {
  /** Max issues per story (default: 5) */
  maxIssuesPerStory?: number;
  /** Group by file first, then by rule (default: true) */
  groupByFileThenRule?: boolean;
  /** Max lines span for same-file grouping (default: 100) */
  maxLineSpan?: number;
  /** Prioritize by severity (default: true) */
  prioritizeBySeverity?: boolean;
}

// ============================================================================
// Rule Relationships
// ============================================================================

/**
 * Rules that are related and should be fixed together
 */
const RELATED_RULES: Record<string, string[]> = {
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
const RULE_CATEGORIES: Record<string, string> = {
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

export class StoryDecomposer {
  private config: Required<DecompositionConfig>;

  constructor(config: DecompositionConfig = {}) {
    this.config = {
      maxIssuesPerStory: config.maxIssuesPerStory ?? 5,
      groupByFileThenRule: config.groupByFileThenRule ?? true,
      maxLineSpan: config.maxLineSpan ?? 100,
      prioritizeBySeverity: config.prioritizeBySeverity ?? true,
    };
  }

  /**
   * Decompose issues into fix stories
   */
  decompose(issues: IssueForGrouping[]): FixStoryGroup[] {
    if (issues.length === 0) {
      return [];
    }

    console.log(`[StoryDecomposer] Decomposing ${issues.length} issues into fix stories`);

    // Step 1: Group by strategy
    let groups: FixStoryGroup[];

    if (this.config.groupByFileThenRule) {
      groups = this.groupByFileThenRule(issues);
    } else {
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
  private groupByFileThenRule(issues: IssueForGrouping[]): FixStoryGroup[] {
    const groups: FixStoryGroup[] = [];

    // Group by file
    const byFile = new Map<string, IssueForGrouping[]>();
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
  private groupByRuleOnly(issues: IssueForGrouping[]): FixStoryGroup[] {
    const groups: FixStoryGroup[] = [];

    // Group by category
    const byCategory = new Map<string, IssueForGrouping[]>();
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
  private groupRelatedRules(issues: IssueForGrouping[]): IssueForGrouping[][] {
    const groups: IssueForGrouping[][] = [];
    const assigned = new Set<string>();

    for (const issue of issues) {
      if (assigned.has(issue.id)) continue;

      const group: IssueForGrouping[] = [issue];
      assigned.add(issue.id);

      // Find related issues
      const relatedRules = RELATED_RULES[issue.ruleId] || [];

      for (const other of issues) {
        if (assigned.has(other.id)) continue;

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
  private splitLargeGroups(groups: FixStoryGroup[]): FixStoryGroup[] {
    const result: FixStoryGroup[] = [];

    for (const group of groups) {
      if (group.issueIds.length <= this.config.maxIssuesPerStory) {
        result.push(group);
      } else {
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
  private mergeTinyGroups(groups: FixStoryGroup[], issues: IssueForGrouping[]): FixStoryGroup[] {
    const issueMap = new Map(issues.map(i => [i.id, i]));
    const result: FixStoryGroup[] = [];
    const merged = new Set<number>();

    for (let i = 0; i < groups.length; i++) {
      if (merged.has(i)) continue;

      const group = groups[i];

      // Only merge tiny groups
      if (group.issueIds.length > 2) {
        result.push(group);
        continue;
      }

      // Try to find another tiny group to merge with
      let mergedGroup = { ...group };

      for (let j = i + 1; j < groups.length; j++) {
        if (merged.has(j)) continue;

        const other = groups[j];
        if (other.issueIds.length > 2) continue;

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
  private prioritizeGroups(groups: FixStoryGroup[], issues: IssueForGrouping[]): FixStoryGroup[] {
    const issueMap = new Map(issues.map(i => [i.id, i]));

    return groups
      .map(group => {
        // Calculate priority based on:
        // 1. Severity (critical=0, high=1, medium=2, low=3)
        // 2. Complexity (simple=0, medium=1, complex=2)

        const severities = group.issueIds
          .map(id => issueMap.get(id)?.severity)
          .filter(Boolean) as string[];

        const severityScore = this.getSeverityScore(severities);
        const complexityScore = group.estimatedComplexity === 'simple' ? 0
          : group.estimatedComplexity === 'medium' ? 1 : 2;

        // Security issues get highest priority
        const isSecurityGroup = group.ruleIds.some(r =>
          RULE_CATEGORIES[r] === 'security'
        );

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

  private getFileName(filePath: string): string {
    return filePath.split('/').pop() || filePath;
  }

  private getGroupCategory(ruleIds: string[]): string {
    for (const ruleId of ruleIds) {
      const category = RULE_CATEGORIES[ruleId];
      if (category) {
        return this.formatCategoryName(category);
      }
    }
    return 'Code quality';
  }

  private formatCategoryName(category: string): string {
    return category
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private estimateComplexity(issues: IssueForGrouping[]): 'simple' | 'medium' | 'complex' {
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

  private getSeverityScore(severities: string[]): number {
    const scores: Record<string, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    if (severities.length === 0) return 2; // Default to medium

    // Return the highest severity (lowest score)
    return Math.min(...severities.map(s => scores[s] ?? 2));
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// ============================================================================
// Exports
// ============================================================================

export default StoryDecomposer;
