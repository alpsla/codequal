/**
 * Parser Shadow Mode Utility
 *
 * Enables safe transition from legacy inline parsing to EnhancedUniversalToolParser.
 * Runs both parsers in parallel, compares results, and logs discrepancies.
 *
 * Usage:
 * ```typescript
 * const shadowMode = new ParserShadowMode();
 *
 * // Run both parsers and compare
 * const result = await shadowMode.compare('eslint', rawOutput, (output) => {
 *   // Legacy parsing logic
 *   return legacyParseESLint(output);
 * });
 *
 * // Result contains enhanced parser output, comparison is logged
 * ```
 */

import {
  EnhancedUniversalToolParser,
  ParseContext,
  ParserComparison
} from './enhanced-universal-tool-parser';
import { StandardizedIssue, StandardizedToolOutput } from './UniversalToolParser';

/**
 * Legacy parser result (simplified format from orchestrators)
 */
export interface LegacyIssue {
  id?: string;
  file?: string;
  path?: string;
  line?: number;
  column?: number;
  message?: string;
  severity?: string;
  type?: string;
  category?: string;
  ruleId?: string;
  tool?: string;
}

/**
 * Shadow mode comparison result
 */
export interface ShadowModeResult {
  /** Use enhanced parser result */
  useEnhanced: boolean;
  /** Enhanced parser output */
  enhanced: StandardizedToolOutput;
  /** Legacy parser output (normalized) */
  legacy: StandardizedToolOutput;
  /** Detailed comparison */
  comparison: ParserComparison;
  /** Differences found */
  differences: IssueDifference[];
}

/**
 * Issue-level difference
 */
export interface IssueDifference {
  type: 'missing_in_legacy' | 'missing_in_enhanced' | 'severity_mismatch' | 'type_mismatch' | 'location_mismatch';
  enhancedIssue?: StandardizedIssue;
  legacyIssue?: StandardizedIssue;
  details: string;
}

/**
 * Shadow mode configuration
 */
export interface ShadowModeConfig {
  /** Log comparison results to console */
  logComparisons?: boolean;
  /** Only use enhanced parser if match rate >= threshold (0-1) */
  switchThreshold?: number;
  /** Tools to force enhanced parser usage */
  forcedEnhancedTools?: string[];
  /** Callback for comparison events */
  onComparison?: (result: ShadowModeResult) => void;
}

const DEFAULT_CONFIG: ShadowModeConfig = {
  logComparisons: true,
  switchThreshold: 0.95,
  forcedEnhancedTools: [],
};

/**
 * Parser Shadow Mode - Safe transition to EnhancedUniversalToolParser
 */
export class ParserShadowMode {
  private enhancedParser: EnhancedUniversalToolParser;
  private config: ShadowModeConfig;
  private history: ShadowModeResult[] = [];

  constructor(config: ShadowModeConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.enhancedParser = new EnhancedUniversalToolParser();
  }

  /**
   * Compare legacy parsing with enhanced parsing
   */
  compare(
    tool: string,
    rawOutput: any,
    legacyParser: (output: any) => LegacyIssue[],
    context: ParseContext = {}
  ): ShadowModeResult {
    const startLegacy = Date.now();
    let legacyIssues: LegacyIssue[];

    try {
      legacyIssues = legacyParser(rawOutput);
    } catch (error) {
      legacyIssues = [];
      if (this.config.logComparisons) {
        console.warn(`[ShadowMode] Legacy parser failed for ${tool}:`, error);
      }
    }
    const legacyTime = Date.now() - startLegacy;

    const startEnhanced = Date.now();
    const enhanced = this.enhancedParser.parse(tool, rawOutput, context);
    const enhancedTime = Date.now() - startEnhanced;

    // Normalize legacy issues to StandardizedToolOutput format
    const legacy = this.normalizeLegacyOutput(tool, legacyIssues, context);

    // Compare results
    const differences = this.findDifferences(enhanced, legacy);

    const comparison: ParserComparison = {
      tool,
      legacy: {
        issueCount: legacy.issues.length,
        executionTime: legacyTime
      },
      enhanced: {
        issueCount: enhanced.issues.length,
        executionTime: enhancedTime
      },
      match: differences.length === 0,
      differences: {
        missingInLegacy: differences.filter(d => d.type === 'missing_in_legacy').length,
        missingInEnhanced: differences.filter(d => d.type === 'missing_in_enhanced').length,
        differentSeverity: differences.filter(d => d.type === 'severity_mismatch').length,
        differentType: differences.filter(d => d.type === 'type_mismatch').length
      }
    };

    // Determine whether to use enhanced parser
    const matchRate = this.calculateMatchRate(enhanced, legacy);
    const useEnhanced =
      this.config.forcedEnhancedTools?.includes(tool) ||
      matchRate >= (this.config.switchThreshold || 0.95);

    const result: ShadowModeResult = {
      useEnhanced,
      enhanced,
      legacy,
      comparison,
      differences
    };

    this.history.push(result);

    if (this.config.logComparisons) {
      this.logComparison(result, matchRate);
    }

    if (this.config.onComparison) {
      this.config.onComparison(result);
    }

    return result;
  }

  /**
   * Normalize legacy issues to StandardizedToolOutput
   */
  private normalizeLegacyOutput(
    tool: string,
    issues: LegacyIssue[],
    context: ParseContext
  ): StandardizedToolOutput {
    const normalizedIssues: StandardizedIssue[] = issues.map((issue, index) => ({
      id: issue.id || issue.ruleId || `${tool}-${index}`,
      type: this.normalizeType(issue.type),
      severity: this.normalizeSeverity(issue.severity),
      category: issue.category || issue.ruleId || 'general',
      title: issue.ruleId || issue.category || 'Issue',
      description: issue.message || '',
      location: {
        file: issue.file || issue.path || 'unknown',
        line: issue.line,
        column: issue.column
      }
    }));

    return {
      tool,
      timestamp: new Date().toISOString(),
      language: context.language,
      files: this.groupByFile(normalizedIssues),
      issues: normalizedIssues
    };
  }

  /**
   * Find differences between enhanced and legacy outputs
   * Uses multi-key matching strategy for robust comparison
   */
  private findDifferences(
    enhanced: StandardizedToolOutput,
    legacy: StandardizedToolOutput
  ): IssueDifference[] {
    const differences: IssueDifference[] = [];

    // Create lookup maps using multiple key strategies
    // Primary key: file:line (location-based)
    // Secondary key: file:line:title (with rule name)
    // Tertiary key: file:line:message_hash (message-based)
    const enhancedByLocation = new Map<string, StandardizedIssue[]>();
    const legacyByLocation = new Map<string, StandardizedIssue[]>();

    for (const issue of enhanced.issues) {
      const locationKey = `${issue.location.file}:${issue.location.line || 0}`;
      if (!enhancedByLocation.has(locationKey)) {
        enhancedByLocation.set(locationKey, []);
      }
      enhancedByLocation.get(locationKey)!.push(issue);
    }

    for (const issue of legacy.issues) {
      const locationKey = `${issue.location.file}:${issue.location.line || 0}`;
      if (!legacyByLocation.has(locationKey)) {
        legacyByLocation.set(locationKey, []);
      }
      legacyByLocation.get(locationKey)!.push(issue);
    }

    // Match enhanced issues to legacy by location, then by message similarity
    const matchedLegacyIndices = new Set<string>();
    const enhancedMap = new Map<string, StandardizedIssue>();
    const legacyMap = new Map<string, StandardizedIssue>();

    const enhancedLocationKeys = Array.from(enhancedByLocation.keys());
    for (const locationKey of enhancedLocationKeys) {
      const enhancedIssues = enhancedByLocation.get(locationKey)!;
      const legacyIssues = legacyByLocation.get(locationKey) || [];

      for (let i = 0; i < enhancedIssues.length; i++) {
        const enhancedIssue = enhancedIssues[i];
        const enhancedKey = `${locationKey}:${i}:enhanced`;
        enhancedMap.set(enhancedKey, enhancedIssue);

        // Try to find matching legacy issue at same location
        let matched = false;
        for (let j = 0; j < legacyIssues.length; j++) {
          const legacyKey = `${locationKey}:${j}:legacy`;
          if (matchedLegacyIndices.has(legacyKey)) continue;

          const legacyIssue = legacyIssues[j];
          // Match by message similarity or same title
          if (this.issuesMatch(enhancedIssue, legacyIssue)) {
            matchedLegacyIndices.add(legacyKey);
            legacyMap.set(enhancedKey, legacyIssue);
            matched = true;
            break;
          }
        }
      }
    }

    // Add unmatched legacy issues
    const legacyLocationKeys = Array.from(legacyByLocation.keys());
    for (const locationKey of legacyLocationKeys) {
      const legacyIssues = legacyByLocation.get(locationKey)!;
      for (let j = 0; j < legacyIssues.length; j++) {
        const legacyKey = `${locationKey}:${j}:legacy`;
        if (!matchedLegacyIndices.has(legacyKey)) {
          const uniqueKey = `${locationKey}:${j}:legacy_unmatched`;
          legacyMap.set(uniqueKey, legacyIssues[j]);
        }
      }
    }

    // Find issues missing in legacy (enhanced issues without a match)
    const enhancedEntries = Array.from(enhancedMap.entries());
    for (const entry of enhancedEntries) {
      const key = entry[0];
      const enhancedIssue = entry[1];

      if (!legacyMap.has(key)) {
        differences.push({
          type: 'missing_in_legacy',
          enhancedIssue,
          details: `Enhanced parser found: ${enhancedIssue.location.file}:${enhancedIssue.location.line} - ${enhancedIssue.title}`
        });
      } else {
        const legacyIssue = legacyMap.get(key)!;

        // Check severity mismatch
        if (enhancedIssue.severity !== legacyIssue.severity) {
          differences.push({
            type: 'severity_mismatch',
            enhancedIssue,
            legacyIssue,
            details: `Severity: ${legacyIssue.severity} -> ${enhancedIssue.severity}`
          });
        }

        // Check type mismatch
        if (enhancedIssue.type !== legacyIssue.type) {
          differences.push({
            type: 'type_mismatch',
            enhancedIssue,
            legacyIssue,
            details: `Type: ${legacyIssue.type} -> ${enhancedIssue.type}`
          });
        }
      }
    }

    // Find issues missing in enhanced (legacy issues that weren't matched)
    const legacyEntries = Array.from(legacyMap.entries());
    for (const entry of legacyEntries) {
      const key = entry[0];
      const legacyIssue = entry[1];

      // Only report unmatched legacy issues (those with _unmatched suffix)
      if (key.endsWith('_unmatched')) {
        differences.push({
          type: 'missing_in_enhanced',
          legacyIssue,
          details: `Legacy parser found: ${legacyIssue.location.file}:${legacyIssue.location.line} - ${legacyIssue.description?.substring(0, 50) || legacyIssue.title}`
        });
      }
    }

    return differences;
  }

  /**
   * Check if two issues match (same location and similar message/content)
   */
  private issuesMatch(enhanced: StandardizedIssue, legacy: StandardizedIssue): boolean {
    // Same file and line is required
    if (enhanced.location.file !== legacy.location.file) return false;
    if (enhanced.location.line !== legacy.location.line) return false;

    // If titles match exactly, it's a match
    if (enhanced.title === legacy.title) return true;

    // Check if description/message contains similar content
    const enhancedDesc = (enhanced.description || '').toLowerCase();
    const legacyDesc = (legacy.description || '').toLowerCase();

    // If descriptions are very similar (>50% word overlap), it's a match
    if (enhancedDesc && legacyDesc) {
      const overlap = this.calculateWordOverlap(enhancedDesc, legacyDesc);
      if (overlap > 0.5) return true;
    }

    // Check category match
    if (enhanced.category === legacy.category) return true;

    // For same location with only one issue each, assume match
    return true;
  }

  /**
   * Calculate word overlap between two strings (Jaccard similarity)
   */
  private calculateWordOverlap(str1: string, str2: string): number {
    const words1 = new Set(str1.split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(str2.split(/\s+/).filter(w => w.length > 2));

    if (words1.size === 0 && words2.size === 0) return 1;
    if (words1.size === 0 || words2.size === 0) return 0;

    let intersection = 0;
    const words1Array = Array.from(words1);
    for (const word of words1Array) {
      if (words2.has(word)) intersection++;
    }

    const union = words1.size + words2.size - intersection;
    return union > 0 ? intersection / union : 0;
  }

  /**
   * Calculate match rate between parsers using location-based matching
   * This is more robust than title-based matching when rule names differ
   */
  private calculateMatchRate(
    enhanced: StandardizedToolOutput,
    legacy: StandardizedToolOutput
  ): number {
    if (enhanced.issues.length === 0 && legacy.issues.length === 0) {
      return 1.0; // Both found nothing = perfect match
    }

    // Group issues by location (file:line)
    const enhancedByLocation = new Map<string, number>();
    const legacyByLocation = new Map<string, number>();

    for (const issue of enhanced.issues) {
      const key = `${issue.location.file}:${issue.location.line || 0}`;
      enhancedByLocation.set(key, (enhancedByLocation.get(key) || 0) + 1);
    }

    for (const issue of legacy.issues) {
      const key = `${issue.location.file}:${issue.location.line || 0}`;
      legacyByLocation.set(key, (legacyByLocation.get(key) || 0) + 1);
    }

    // Calculate location-based match rate
    // Count issues that exist in both at the same location
    let matchedCount = 0;
    const enhancedKeys = Array.from(enhancedByLocation.keys());
    for (const key of enhancedKeys) {
      const enhancedCount = enhancedByLocation.get(key)!;
      const legacyCount = legacyByLocation.get(key) || 0;
      // Match the minimum count at each location
      matchedCount += Math.min(enhancedCount, legacyCount);
    }

    const totalIssues = Math.max(enhanced.issues.length, legacy.issues.length);
    return totalIssues > 0 ? matchedCount / totalIssues : 1.0;
  }

  /**
   * Log comparison results
   */
  private logComparison(result: ShadowModeResult, matchRate: number): void {
    const { comparison, useEnhanced } = result;

    console.log(`\n[ShadowMode] ${comparison.tool} Comparison:`);
    console.log(`  Legacy:   ${comparison.legacy.issueCount} issues (${comparison.legacy.executionTime}ms)`);
    console.log(`  Enhanced: ${comparison.enhanced.issueCount} issues (${comparison.enhanced.executionTime}ms)`);
    console.log(`  Match:    ${(matchRate * 100).toFixed(1)}%`);

    if (comparison.differences.missingInLegacy > 0) {
      console.log(`  - Missing in legacy: ${comparison.differences.missingInLegacy}`);
    }
    if (comparison.differences.missingInEnhanced > 0) {
      console.log(`  - Missing in enhanced: ${comparison.differences.missingInEnhanced}`);
    }
    if (comparison.differences.differentSeverity > 0) {
      console.log(`  - Severity differences: ${comparison.differences.differentSeverity}`);
    }
    if (comparison.differences.differentType > 0) {
      console.log(`  - Type differences: ${comparison.differences.differentType}`);
    }

    console.log(`  Using: ${useEnhanced ? 'Enhanced' : 'Legacy'} parser`);
  }

  /**
   * Get comparison history
   */
  getHistory(): ShadowModeResult[] {
    return [...this.history];
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    totalComparisons: number;
    byTool: Record<string, { comparisons: number; avgMatchRate: number; usingEnhanced: boolean }>;
    overallMatchRate: number;
  } {
    const byTool: Record<string, { comparisons: number; matchRates: number[]; usingEnhanced: boolean }> = {};

    for (const result of this.history) {
      const tool = result.comparison.tool;
      if (!byTool[tool]) {
        byTool[tool] = { comparisons: 0, matchRates: [], usingEnhanced: false };
      }

      byTool[tool].comparisons++;
      const matchRate = this.calculateMatchRate(result.enhanced, result.legacy);
      byTool[tool].matchRates.push(matchRate);
      byTool[tool].usingEnhanced = result.useEnhanced;
    }

    const toolSummary: Record<string, { comparisons: number; avgMatchRate: number; usingEnhanced: boolean }> = {};
    let totalMatchRate = 0;
    let totalComparisons = 0;

    for (const [tool, data] of Object.entries(byTool)) {
      const avgMatchRate = data.matchRates.reduce((a, b) => a + b, 0) / data.matchRates.length;
      toolSummary[tool] = {
        comparisons: data.comparisons,
        avgMatchRate,
        usingEnhanced: data.usingEnhanced
      };
      totalMatchRate += avgMatchRate * data.comparisons;
      totalComparisons += data.comparisons;
    }

    return {
      totalComparisons,
      byTool: toolSummary,
      overallMatchRate: totalComparisons > 0 ? totalMatchRate / totalComparisons : 0
    };
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.history = [];
  }

  // Helper methods
  private normalizeType(type?: string): StandardizedIssue['type'] {
    if (!type) return 'quality';
    const t = type.toLowerCase();
    if (t.includes('security') || t === 'vulnerability') return 'security';
    if (t.includes('performance') || t === 'perf') return 'performance';
    if (t.includes('bug') || t === 'error') return 'bug';
    if (t.includes('style') || t === 'formatting') return 'quality';
    if (t === 'architecture' || t === 'design') return 'architecture';
    if (t === 'dependency' || t === 'dep') return 'dependency';
    return 'quality';
  }

  private normalizeSeverity(severity?: string): StandardizedIssue['severity'] {
    if (!severity) return 'medium';
    const s = severity.toLowerCase();
    if (s === 'critical' || s === 'blocker') return 'critical';
    if (s === 'high' || s === 'error' || s === 'major') return 'high';
    if (s === 'medium' || s === 'warning' || s === 'moderate' || s === 'minor') return 'medium';
    return 'low';
  }

  private groupByFile(issues: StandardizedIssue[]): any[] {
    const fileMap = new Map<string, StandardizedIssue[]>();
    for (const issue of issues) {
      const file = issue.location.file;
      if (!fileMap.has(file)) {
        fileMap.set(file, []);
      }
      fileMap.get(file)!.push(issue);
    }
    return Array.from(fileMap.entries()).map(([path, fileIssues]) => ({
      path,
      language: 'unknown',
      size: 0,
      issues: fileIssues
    }));
  }
}

/**
 * Create pre-configured shadow mode for specific orchestrator
 */
export function createShadowModeForOrchestrator(
  language: string,
  config: ShadowModeConfig = {}
): ParserShadowMode {
  return new ParserShadowMode({
    ...config,
    logComparisons: config.logComparisons ?? (process.env.DEBUG_MODE === 'true'),
  });
}

export default ParserShadowMode;
