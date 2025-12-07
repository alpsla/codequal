/**
 * Issue Index
 *
 * Indexes all issues from initial validation scan for O(1) lookup.
 * Enables fast verification after fixes are applied.
 *
 * Indices:
 * - byFile: Map<filePath, Issue[]> - All issues in a file
 * - byRule: Map<ruleId, Issue[]> - All issues for a rule
 * - byId: Map<issueId, Issue> - Direct lookup by ID
 * - byFileAndRule: Map<`${file}:${rule}`, Issue[]> - Issues in file for specific rule
 * - byLocation: Map<`${file}:${line}`, Issue[]> - Issues at specific location
 */

import { DetectedIssue } from '../scan-fix-executor';

// ============================================================================
// TYPES
// ============================================================================

export interface IndexedIssue extends DetectedIssue {
  /** Unique identifier for the issue */
  id: string;
  /** Whether this issue has been fixed */
  fixed: boolean;
  /** Fix attempt count */
  attempts: number;
  /** Last fix error (if any) */
  lastError?: string;
  /** Pattern ID if fixed by pattern */
  patternId?: string;
  /** Timestamp when fixed */
  fixedAt?: Date;
}

export interface IssueIndexStats {
  totalIssues: number;
  fixedIssues: number;
  pendingIssues: number;
  failedIssues: number;
  uniqueFiles: number;
  uniqueRules: number;
  averageIssuesPerFile: number;
}

// ============================================================================
// ISSUE INDEX CLASS
// ============================================================================

/**
 * Issue Index for O(1) lookups
 *
 * Usage:
 * ```typescript
 * const index = new IssueIndex(issues);
 *
 * // Get all issues in a file
 * const fileIssues = index.getByFile('src/app.ts');
 *
 * // Get all issues for a rule
 * const ruleIssues = index.getByRule('detect-child-process');
 *
 * // Get issue by ID
 * const issue = index.getById('issue-123');
 *
 * // Mark as fixed
 * index.markFixed('issue-123', 'pattern-456');
 *
 * // Get pending issues for a file (for batch verification)
 * const pending = index.getPendingByFile('src/app.ts');
 * ```
 */
export class IssueIndex {
  // Primary indices
  private byFile: Map<string, IndexedIssue[]> = new Map();
  private byRule: Map<string, IndexedIssue[]> = new Map();
  private byId: Map<string, IndexedIssue> = new Map();

  // Compound indices for complex queries
  private byFileAndRule: Map<string, IndexedIssue[]> = new Map();
  private byLocation: Map<string, IndexedIssue[]> = new Map();

  // All issues (for iteration)
  private allIssues: IndexedIssue[] = [];

  constructor(issues?: DetectedIssue[]) {
    if (issues) {
      this.buildIndex(issues);
    }
  }

  /**
   * Build index from detected issues
   */
  buildIndex(issues: DetectedIssue[]): void {
    // Clear existing indices
    this.clear();

    // Index each issue
    for (let i = 0; i < issues.length; i++) {
      const issue = issues[i];
      const indexed: IndexedIssue = {
        ...issue,
        id: `issue-${i}-${issue.file}:${issue.line}-${issue.rule}`,
        fixed: false,
        attempts: 0,
      };

      this.addToIndex(indexed);
    }

    console.log(
      `[IssueIndex] Built index: ${this.allIssues.length} issues, ` +
      `${this.byFile.size} files, ${this.byRule.size} rules`
    );
  }

  /**
   * Add a single issue to all indices
   */
  private addToIndex(issue: IndexedIssue): void {
    // Add to all issues
    this.allIssues.push(issue);

    // Index by ID
    this.byId.set(issue.id, issue);

    // Index by file
    const fileKey = issue.file;
    if (!this.byFile.has(fileKey)) {
      this.byFile.set(fileKey, []);
    }
    this.byFile.get(fileKey)!.push(issue);

    // Index by rule
    const ruleKey = this.normalizeRule(issue.rule);
    if (!this.byRule.has(ruleKey)) {
      this.byRule.set(ruleKey, []);
    }
    this.byRule.get(ruleKey)!.push(issue);

    // Index by file+rule
    const fileRuleKey = `${issue.file}:${ruleKey}`;
    if (!this.byFileAndRule.has(fileRuleKey)) {
      this.byFileAndRule.set(fileRuleKey, []);
    }
    this.byFileAndRule.get(fileRuleKey)!.push(issue);

    // Index by location (file:line)
    const locationKey = `${issue.file}:${issue.line}`;
    if (!this.byLocation.has(locationKey)) {
      this.byLocation.set(locationKey, []);
    }
    this.byLocation.get(locationKey)!.push(issue);
  }

  /**
   * Normalize rule ID for consistent lookup
   */
  private normalizeRule(rule: string): string {
    // Remove tool prefixes like "semgrep:", "eslint:", etc.
    return rule.toLowerCase().replace(/^[^:]+:/, '');
  }

  // ============================================================================
  // LOOKUP METHODS (O(1))
  // ============================================================================

  /**
   * Get all issues in a file
   */
  getByFile(filePath: string): IndexedIssue[] {
    return this.byFile.get(filePath) || [];
  }

  /**
   * Get all issues for a rule
   */
  getByRule(ruleId: string): IndexedIssue[] {
    return this.byRule.get(this.normalizeRule(ruleId)) || [];
  }

  /**
   * Get issue by ID
   */
  getById(id: string): IndexedIssue | undefined {
    return this.byId.get(id);
  }

  /**
   * Get issues at a specific file:line location
   */
  getByLocation(filePath: string, line: number): IndexedIssue[] {
    const key = `${filePath}:${line}`;
    return this.byLocation.get(key) || [];
  }

  /**
   * Get issues in a file for a specific rule
   */
  getByFileAndRule(filePath: string, ruleId: string): IndexedIssue[] {
    const key = `${filePath}:${this.normalizeRule(ruleId)}`;
    return this.byFileAndRule.get(key) || [];
  }

  /**
   * Check if an issue exists at a location (for verification)
   */
  hasIssueAt(filePath: string, line: number, ruleId?: string): boolean {
    const issues = this.getByLocation(filePath, line);
    if (issues.length === 0) return false;

    if (ruleId) {
      const normalizedRule = this.normalizeRule(ruleId);
      return issues.some(i => this.normalizeRule(i.rule) === normalizedRule);
    }

    return true;
  }

  // ============================================================================
  // STATUS METHODS
  // ============================================================================

  /**
   * Get pending (unfixed) issues in a file
   */
  getPendingByFile(filePath: string): IndexedIssue[] {
    return this.getByFile(filePath).filter(i => !i.fixed);
  }

  /**
   * Get pending issues for a rule
   */
  getPendingByRule(ruleId: string): IndexedIssue[] {
    return this.getByRule(ruleId).filter(i => !i.fixed);
  }

  /**
   * Get all pending issues
   */
  getAllPending(): IndexedIssue[] {
    return this.allIssues.filter(i => !i.fixed);
  }

  /**
   * Get all fixed issues
   */
  getAllFixed(): IndexedIssue[] {
    return this.allIssues.filter(i => i.fixed);
  }

  /**
   * Get failed issues (multiple attempts, not fixed)
   */
  getAllFailed(minAttempts = 3): IndexedIssue[] {
    return this.allIssues.filter(i => !i.fixed && i.attempts >= minAttempts);
  }

  // ============================================================================
  // MUTATION METHODS
  // ============================================================================

  /**
   * Mark an issue as fixed
   */
  markFixed(issueId: string, patternId?: string): boolean {
    const issue = this.byId.get(issueId);
    if (!issue) return false;

    issue.fixed = true;
    issue.patternId = patternId;
    issue.fixedAt = new Date();

    return true;
  }

  /**
   * Increment attempt count for an issue
   */
  incrementAttempts(issueId: string, error?: string): number {
    const issue = this.byId.get(issueId);
    if (!issue) return 0;

    issue.attempts++;
    if (error) {
      issue.lastError = error;
    }

    return issue.attempts;
  }

  /**
   * Mark issue as fixed from a rescan (issue no longer detected)
   * Used during batch verification
   */
  markFixedFromRescan(filePath: string, line: number, ruleId: string): IndexedIssue | undefined {
    const issues = this.getByLocation(filePath, line);
    const normalizedRule = this.normalizeRule(ruleId);

    for (const issue of issues) {
      if (this.normalizeRule(issue.rule) === normalizedRule && !issue.fixed) {
        issue.fixed = true;
        issue.fixedAt = new Date();
        return issue;
      }
    }

    return undefined;
  }

  // ============================================================================
  // BATCH OPERATIONS
  // ============================================================================

  /**
   * Get files with pending issues (for batch processing)
   */
  getFilesWithPendingIssues(): string[] {
    const files: string[] = [];

    for (const [file, issues] of Array.from(this.byFile.entries())) {
      if (issues.some(i => !i.fixed)) {
        files.push(file);
      }
    }

    return files;
  }

  /**
   * Get rules with pending issues (for pattern grouping)
   */
  getRulesWithPendingIssues(): string[] {
    const rules: string[] = [];

    for (const [rule, issues] of Array.from(this.byRule.entries())) {
      if (issues.some(i => !i.fixed)) {
        rules.push(rule);
      }
    }

    return rules;
  }

  /**
   * Group pending issues by rule (for pattern-based fixing)
   */
  groupPendingByRule(): Map<string, IndexedIssue[]> {
    const groups = new Map<string, IndexedIssue[]>();

    for (const issue of this.allIssues) {
      if (issue.fixed) continue;

      const rule = this.normalizeRule(issue.rule);
      if (!groups.has(rule)) {
        groups.set(rule, []);
      }
      groups.get(rule)!.push(issue);
    }

    return groups;
  }

  /**
   * Group pending issues by file (for batch verification)
   */
  groupPendingByFile(): Map<string, IndexedIssue[]> {
    const groups = new Map<string, IndexedIssue[]>();

    for (const issue of this.allIssues) {
      if (issue.fixed) continue;

      if (!groups.has(issue.file)) {
        groups.set(issue.file, []);
      }
      groups.get(issue.file)!.push(issue);
    }

    return groups;
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  /**
   * Get index statistics
   */
  getStats(): IssueIndexStats {
    const fixed = this.allIssues.filter(i => i.fixed).length;
    const pending = this.allIssues.filter(i => !i.fixed && i.attempts < 3).length;
    const failed = this.allIssues.filter(i => !i.fixed && i.attempts >= 3).length;

    return {
      totalIssues: this.allIssues.length,
      fixedIssues: fixed,
      pendingIssues: pending,
      failedIssues: failed,
      uniqueFiles: this.byFile.size,
      uniqueRules: this.byRule.size,
      averageIssuesPerFile: this.byFile.size > 0
        ? this.allIssues.length / this.byFile.size
        : 0,
    };
  }

  /**
   * Get all issues (for iteration)
   */
  getAll(): IndexedIssue[] {
    return [...this.allIssues];
  }

  /**
   * Get issue count
   */
  get size(): number {
    return this.allIssues.length;
  }

  /**
   * Clear all indices
   */
  clear(): void {
    this.byFile.clear();
    this.byRule.clear();
    this.byId.clear();
    this.byFileAndRule.clear();
    this.byLocation.clear();
    this.allIssues = [];
  }
}

export default IssueIndex;
