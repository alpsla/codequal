/**
 * Parser Validation Wrapper
 *
 * A utility wrapper that enables shadow mode validation in orchestrators
 * without modifying their core logic. Orchestrators can opt-in to validation
 * by wrapping their parser functions.
 *
 * Usage in Orchestrator:
 * ```typescript
 * import { createParserValidationWrapper } from '../parsers/parser-validation-wrapper';
 *
 * // In constructor or init:
 * private parserValidator = createParserValidationWrapper({
 *   language: 'java',
 *   enabled: process.env.PARSER_VALIDATION === 'true'
 * });
 *
 * // In parsing method:
 * private async parseCheckstyleXML(filePath: string): Promise<RawIssue[]> {
 *   const xmlContent = await fs.readFile(filePath, 'utf-8');
 *
 *   // Legacy parsing logic
 *   const legacyIssues = this.legacyParseCheckstyle(xmlContent);
 *
 *   // Validate against enhanced parser (if enabled)
 *   return this.parserValidator.validate('checkstyle', xmlContent, legacyIssues);
 * }
 * ```
 */

import { EnhancedUniversalToolParser } from './enhanced-universal-tool-parser';
import { ParserShadowMode, ShadowModeResult } from './parser-shadow-mode';
import { RawIssue } from '../tools/base-tool-orchestrator';

/**
 * Configuration for parser validation
 */
export interface ParserValidationConfig {
  /** Language for context */
  language: string;
  /** Enable/disable validation */
  enabled?: boolean;
  /** Log comparison results */
  logResults?: boolean;
  /** Callback when validation completes */
  onValidation?: (result: ValidationResult) => void;
  /** Tools to skip validation for */
  skipTools?: string[];
  /** 
   * Use enhanced parser when match rate >= threshold (default: 0.95)
   * Set to 1.0 to always use legacy, 0.0 to always use enhanced
   */
  switchThreshold?: number;
  /**
   * Force use of enhanced parser for specific tools (ignores threshold)
   * Example: ['checkstyle', 'eslint', 'semgrep']
   */
  forceEnhancedTools?: string[];
  /**
   * Force use of enhanced parser for ALL tools (ignores threshold)
   * Use with caution - only after thorough validation
   */
  forceEnhancedAll?: boolean;
}

/**
 * Validation result for a single tool parse
 */
export interface ValidationResult {
  tool: string;
  legacyCount: number;
  enhancedCount: number;
  matchRate: number;
  differences: number;
  passed: boolean;
  details?: string;
}

/**
 * Aggregated validation statistics
 */
export interface ValidationStats {
  totalValidations: number;
  passedValidations: number;
  failedValidations: number;
  byTool: Record<string, {
    validations: number;
    avgMatchRate: number;
    issues: number;
  }>;
}

/**
 * Parser Validation Wrapper
 */
export class ParserValidationWrapper {
  private config: ParserValidationConfig;
  private shadowMode: ParserShadowMode;
  private enhancedParser: EnhancedUniversalToolParser;
  private stats: ValidationStats = {
    totalValidations: 0,
    passedValidations: 0,
    failedValidations: 0,
    byTool: {}
  };

  constructor(config: ParserValidationConfig) {
    this.config = {
      enabled: false,
      logResults: true,
      skipTools: [],
      switchThreshold: 0.95,
      forceEnhancedTools: [],
      forceEnhancedAll: false,
      ...config
    };

    this.shadowMode = new ParserShadowMode({
      logComparisons: this.config.logResults,
      switchThreshold: this.config.switchThreshold
    });

    this.enhancedParser = new EnhancedUniversalToolParser();
  }

  /**
   * Validate legacy parsing against enhanced parser
   * 
   * Returns:
   * - Enhanced parser output when match rate >= threshold OR tool is in forceEnhancedTools
   * - Legacy issues otherwise (fallback for safety)
   * 
   * Migration Phase 2: Now returns enhanced parser output when conditions are met!
   */
  validate(
    tool: string,
    rawOutput: any,
    legacyIssues: RawIssue[]
  ): RawIssue[] {
    // If validation disabled or tool skipped, return legacy issues
    if (!this.config.enabled || this.config.skipTools?.includes(tool)) {
      return legacyIssues;
    }

    try {
      // Convert legacy RawIssue[] to shadow mode format
      const legacyForComparison = legacyIssues.map(issue => ({
        file: issue.file,
        line: issue.line,
        column: issue.column,
        severity: issue.severity,
        message: issue.message,
        type: issue.category || 'quality',
        ruleId: issue.rule,
        tool: issue.tool
      }));

      // Run shadow mode comparison
      const result = this.shadowMode.compare(
        tool,
        rawOutput,
        () => legacyForComparison,
        { language: this.config.language }
      );

      // Calculate validation result
      const matchRate = this.calculateMatchRate(result);
      const threshold = this.config.switchThreshold || 0.95;
      const passed = matchRate >= threshold;

      const validationResult: ValidationResult = {
        tool,
        legacyCount: result.legacy.issues.length,
        enhancedCount: result.enhanced.issues.length,
        matchRate,
        differences: result.differences.length,
        passed,
        details: passed
          ? 'Validation passed'
          : `${result.differences.length} differences found`
      };

      // Update stats
      this.updateStats(validationResult);

      // Callback
      if (this.config.onValidation) {
        this.config.onValidation(validationResult);
      }

      // Log if enabled
      if (this.config.logResults && !passed) {
        console.warn(`[ParserValidation] ${tool}: ${validationResult.details}`);
        for (const diff of result.differences.slice(0, 5)) {
          console.warn(`  - ${diff.type}: ${diff.details}`);
        }
        if (result.differences.length > 5) {
          console.warn(`  ... and ${result.differences.length - 5} more`);
        }
      }

      // ============================================================
      // MIGRATION PHASE 2: Return enhanced parser output when safe
      // ============================================================
      
      // Check if we should use enhanced parser for this tool
      const forceEnhanced = 
        this.config.forceEnhancedAll ||
        this.config.forceEnhancedTools?.includes(tool) ||
        this.config.forceEnhancedTools?.includes(tool.toLowerCase());

      const useEnhanced = forceEnhanced || (passed && matchRate >= threshold);

      if (useEnhanced) {
        // Convert enhanced parser output to RawIssue format
        const enhancedIssues = this.convertToRawIssues(tool, result.enhanced.issues);
        
        if (this.config.logResults) {
          console.log(`[ParserValidation] ${tool}: Using ENHANCED parser (${matchRate >= threshold ? `${(matchRate * 100).toFixed(1)}% match` : 'forced'})`);
        }
        
        return enhancedIssues;
      }

      // Fallback to legacy issues when not safe to switch
      if (this.config.logResults && !passed) {
        console.log(`[ParserValidation] ${tool}: Using LEGACY parser (match rate ${(matchRate * 100).toFixed(1)}% < ${(threshold * 100).toFixed(0)}% threshold)`);
      }

    } catch (error: any) {
      if (this.config.logResults) {
        console.error(`[ParserValidation] ${tool} validation failed:`, error.message);
      }
    }

    // Fallback: return legacy issues (production behavior unchanged on error)
    return legacyIssues;
  }

  /**
   * Convert StandardizedIssue[] to RawIssue[] format for orchestrators
   * This bridges the enhanced parser output to the existing orchestrator interface
   */
  private convertToRawIssues(tool: string, standardizedIssues: any[]): RawIssue[] {
    return standardizedIssues.map(issue => ({
      tool: tool.toLowerCase(),
      file: issue.location?.file || 'unknown',
      line: issue.location?.line || 0,
      column: issue.location?.column,
      severity: this.normalizeSeverity(issue.severity),
      message: issue.description || issue.title || '',
      rule: issue.title || issue.category || tool,
      category: issue.category || this.mapTypeToCategory(issue.type),
      cwe: issue.cwe,
      autoFixable: !!issue.suggestion
    }));
  }

  /**
   * Normalize severity to RawIssue format
   */
  private normalizeSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' {
    const s = (severity || 'medium').toLowerCase();
    if (s === 'critical') return 'critical';
    if (s === 'high' || s === 'error') return 'high';
    if (s === 'medium' || s === 'warning' || s === 'moderate') return 'medium';
    return 'low';
  }

  /**
   * Map issue type to category string
   */
  private mapTypeToCategory(type: string): string {
    const typeMap: Record<string, string> = {
      'security': 'Security',
      'bug': 'Bug Risk',
      'performance': 'Performance',
      'quality': 'Code Quality',
      'architecture': 'Architecture',
      'dependency': 'Dependencies'
    };
    return typeMap[type?.toLowerCase()] || 'Code Quality';
  }

  /**
   * Get validation statistics
   */
  getStats(): ValidationStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalValidations: 0,
      passedValidations: 0,
      failedValidations: 0,
      byTool: {}
    };
  }

  /**
   * Check if all validations passed
   */
  allPassed(): boolean {
    return this.stats.failedValidations === 0;
  }

  /**
   * Get shadow mode comparison history
   */
  getComparisonHistory(): ShadowModeResult[] {
    return this.shadowMode.getHistory();
  }

  private calculateMatchRate(result: ShadowModeResult): number {
    const total = Math.max(
      result.legacy.issues.length,
      result.enhanced.issues.length
    );
    if (total === 0) return 1.0;

    // Count non-severity/type differences as critical
    const criticalDiffs = result.differences.filter(
      d => d.type === 'missing_in_legacy' || d.type === 'missing_in_enhanced'
    ).length;

    return (total - criticalDiffs) / total;
  }

  private updateStats(result: ValidationResult): void {
    this.stats.totalValidations++;

    if (result.passed) {
      this.stats.passedValidations++;
    } else {
      this.stats.failedValidations++;
    }

    if (!this.stats.byTool[result.tool]) {
      this.stats.byTool[result.tool] = {
        validations: 0,
        avgMatchRate: 0,
        issues: 0
      };
    }

    const toolStats = this.stats.byTool[result.tool];
    const prevTotal = toolStats.avgMatchRate * toolStats.validations;
    toolStats.validations++;
    toolStats.avgMatchRate = (prevTotal + result.matchRate) / toolStats.validations;
    toolStats.issues += result.differences;
  }
}

/**
 * Create a parser validation wrapper instance
 */
export function createParserValidationWrapper(
  config: ParserValidationConfig
): ParserValidationWrapper {
  return new ParserValidationWrapper(config);
}

/**
 * Simple validation function for one-off checks
 */
export function validateParsing(
  tool: string,
  rawOutput: any,
  legacyIssues: any[],
  language: string
): ValidationResult {
  const wrapper = new ParserValidationWrapper({
    language,
    enabled: true,
    logResults: false
  });

  wrapper.validate(tool, rawOutput, legacyIssues as RawIssue[]);
  const stats = wrapper.getStats();

  return {
    tool,
    legacyCount: legacyIssues.length,
    enhancedCount: 0, // Would need to track this separately
    matchRate: stats.byTool[tool]?.avgMatchRate || 1.0,
    differences: stats.byTool[tool]?.issues || 0,
    passed: stats.failedValidations === 0
  };
}

export default ParserValidationWrapper;
