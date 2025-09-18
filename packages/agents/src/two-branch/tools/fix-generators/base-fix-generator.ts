/**
 * Base class for tool-specific fix generators
 * Runs alongside analysis tools in cloud pods for maximum performance
 */

import { createHash } from 'crypto';

export interface IssueFix {
  suggestion: string;
  code: string;
  confidence: number;
  cached?: boolean;
}

export interface IssueContext {
  id: string;
  type: string;
  severity: string;
  message: string;
  file: string;
  line: number;
  codeSnippet?: string;
  tool: string;
}

export abstract class BaseFixGenerator {
  private fixCache: Map<string, IssueFix> = new Map();
  protected toolName: string;

  constructor(toolName: string) {
    this.toolName = toolName;
  }

  /**
   * Generate fix for an issue (with caching)
   */
  async generateFix(issue: IssueContext): Promise<IssueFix> {
    // Generate cache key
    const cacheKey = this.getCacheKey(issue);

    // Check cache first
    if (this.fixCache.has(cacheKey)) {
      const cached = this.fixCache.get(cacheKey)!;
      return { ...cached, cached: true };
    }

    // Generate new fix
    const fix = await this.generateSpecificFix(issue);

    // Cache for future use
    this.fixCache.set(cacheKey, fix);

    return fix;
  }

  /**
   * Process multiple issues in parallel
   */
  async generateFixesForIssues(issues: IssueContext[]): Promise<Map<string, IssueFix>> {
    const fixes = new Map<string, IssueFix>();

    // Process in parallel batches
    const batchSize = 10;
    for (let i = 0; i < issues.length; i += batchSize) {
      const batch = issues.slice(i, i + batchSize);
      const batchPromises = batch.map(async (issue) => {
        const fix = await this.generateFix(issue);
        fixes.set(issue.id, fix);
      });

      await Promise.all(batchPromises);
    }

    return fixes;
  }

  /**
   * Generate cache key for issue
   */
  private getCacheKey(issue: IssueContext): string {
    // Create deterministic key based on issue characteristics
    const keyData = `${issue.type}-${issue.severity}-${issue.message}-${issue.tool}`;
    return createHash('md5').update(keyData).digest('hex');
  }

  /**
   * Tool-specific fix generation (to be implemented by subclasses)
   */
  protected abstract generateSpecificFix(issue: IssueContext): Promise<IssueFix>;

  /**
   * Get fix statistics
   */
  getStats(): { total: number; cached: number; hitRate: number } {
    const total = this.fixCache.size;
    return {
      total,
      cached: total,
      hitRate: total > 0 ? 1.0 : 0
    };
  }
}