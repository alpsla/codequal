/**
 * Framework Issue Classifier Service
 *
 * Classifies issues based on framework context to determine:
 * - What to fix (FIX_NOW, ADD_TO_PATTERNS)
 * - What to filter (FILTER_OUT, ENVIRONMENT_ISSUE)
 * - What to skip (INTENTIONAL_USE, SKIP_FOR_FRAMEWORK)
 *
 * This is the central service that applies framework-specific logic
 * to issue classification before fix execution.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  Framework,
  IssueDisposition,
  FilterReason,
  ClassifiedFrameworkIssue,
  IssueClassificationResult,
  FrameworkPattern,
} from '../types/framework-issue-types';
import {
  getFrameworkConfig,
  hasFrameworkConfig,
  isNestJSIntentionalUse,
  shouldFilterForNestJS,
  getNestJSEnvironmentFixes,
} from '../framework-configs';
import {
  findPattern,
  hasPattern,
  getPatternsForFramework,
  NESTJS_PATTERNS,
} from '../patterns';

// ============================================================================
// Types
// ============================================================================

/**
 * Input issue format (from tool orchestration)
 */
export interface RawIssue {
  file: string;
  line: number;
  column?: number;
  rule: string;
  tool: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'error' | 'warning' | 'info';
  category?: 'NEW' | 'EXISTING';
  snippet?: string;
}

/**
 * Classification options
 */
export interface ClassificationOptions {
  /** Detected framework */
  framework: Framework;

  /** Whether dependencies are installed */
  dependenciesInstalled: boolean;

  /** Working directory (repo root) */
  workingDir: string;

  /** Existing patterns from Supabase */
  existingPatterns?: FrameworkPattern[];

  /** Whether to save new patterns */
  saveNewPatterns?: boolean;

  /** Verbose logging */
  verbose?: boolean;
}

// ============================================================================
// Framework Issue Classifier
// ============================================================================

export class FrameworkIssueClassifier {
  private options: ClassificationOptions;
  private existingPatternMap: Map<string, FrameworkPattern>;

  constructor(options: ClassificationOptions) {
    this.options = options;
    this.existingPatternMap = new Map();

    // Index existing patterns by rule+tool for fast lookup
    if (options.existingPatterns) {
      for (const pattern of options.existingPatterns) {
        const key = `${pattern.ruleId}|${pattern.tool}|${pattern.framework}`;
        this.existingPatternMap.set(key, pattern);
      }
    }
  }

  /**
   * Classify all issues and return classification result
   */
  classifyIssues(issues: RawIssue[]): IssueClassificationResult {
    const classifiedIssues: ClassifiedFrameworkIssue[] = [];
    const filteredIssues: IssueClassificationResult['filteredIssues'] = [];
    const newPatterns: FrameworkPattern[] = [];
    const reusedPatterns: Map<string, number> = new Map();

    // Classify each issue
    for (const issue of issues) {
      const classified = this.classifyIssue(issue);
      classifiedIssues.push(classified);

      // Track filtered issues
      if (classified.disposition === 'FILTER_OUT') {
        filteredIssues.push({
          issue: classified,
          reason: classified.filterReason || 'KNOWN_FALSE_POSITIVE',
          explanation: classified.dispositionReason || 'Filtered by framework rules',
        });
      }

      // Track pattern reuse
      if (classified.disposition === 'PATTERN_REUSE' && classified.patternId) {
        const count = reusedPatterns.get(classified.patternId) || 0;
        reusedPatterns.set(classified.patternId, count + 1);
      }

      // Track new patterns to create
      if (classified.disposition === 'ADD_TO_PATTERNS' && classified.shouldSavePattern) {
        // Pattern will be created after successful fix
      }
    }

    // Calculate disposition counts
    const byDisposition: Record<IssueDisposition, number> = {
      'FIX_NOW': 0,
      'ADD_TO_PATTERNS': 0,
      'PATTERN_REUSE': 0,
      'FILTER_OUT': 0,
      'INTENTIONAL_USE': 0,
      'ENVIRONMENT_ISSUE': 0,
      'MANUAL_REVIEW': 0,
      'SKIP_FOR_FRAMEWORK': 0,
    };

    for (const issue of classifiedIssues) {
      byDisposition[issue.disposition]++;
    }

    // Calculate framework counts
    const byFramework: Record<Framework, number> = {} as Record<Framework, number>;
    byFramework[this.options.framework] = classifiedIssues.length;

    // Get fixable issues
    const fixableIssues = classifiedIssues.filter(i =>
      ['FIX_NOW', 'ADD_TO_PATTERNS', 'PATTERN_REUSE'].includes(i.disposition)
    );

    // Calculate cost analysis
    const costPerAICall = 0.003;
    const costWithoutPatterns = fixableIssues.length * costPerAICall;
    const patternReusedCount = byDisposition['PATTERN_REUSE'];
    const costWithPatterns = (fixableIssues.length - patternReusedCount) * costPerAICall;
    const savings = costWithoutPatterns - costWithPatterns;
    const savingsPercent = costWithoutPatterns > 0 ? (savings / costWithoutPatterns) * 100 : 0;

    return {
      total: issues.length,
      byDisposition,
      byFramework,
      issues: classifiedIssues,
      fixableIssues,
      filteredIssues,
      newPatterns,
      reusedPatterns: Array.from(reusedPatterns.entries()).map(([patternId, issueCount]) => ({
        patternId,
        issueCount,
      })),
      costAnalysis: {
        withoutPatterns: costWithoutPatterns,
        withPatterns: costWithPatterns,
        savings,
        savingsPercent,
      },
    };
  }

  /**
   * Classify a single issue
   */
  private classifyIssue(issue: RawIssue): ClassifiedFrameworkIssue {
    const framework = this.options.framework;
    const normalizedSeverity = this.normalizeSeverity(issue.severity);

    // Start with base classification
    const classified: ClassifiedFrameworkIssue = {
      file: issue.file,
      line: issue.line,
      column: issue.column,
      rule: issue.rule,
      ruleId: issue.rule,  // Alias
      tool: issue.tool,
      message: issue.message,
      severity: normalizedSeverity,
      framework,
      disposition: 'FIX_NOW',  // Default
      category: issue.category,
    };

    // Step 1: Check for environment issues (missing deps, TS2307, etc.)
    if (this.isEnvironmentIssue(issue)) {
      classified.disposition = 'ENVIRONMENT_ISSUE';
      classified.filterReason = 'MISSING_DEPENDENCY';
      classified.dispositionReason = this.getEnvironmentIssueReason(issue);
      return classified;
    }

    // Step 2: Check framework-specific filters
    if (hasFrameworkConfig(framework)) {
      const filterResult = this.checkFrameworkFilter(issue, framework);
      if (filterResult.shouldFilter) {
        classified.disposition = 'FILTER_OUT';
        classified.filterReason = filterResult.reason as FilterReason;
        classified.dispositionReason = filterResult.explanation;
        return classified;
      }
    }

    // Step 3: Check for intentional use patterns
    if (hasFrameworkConfig(framework)) {
      const intentionalResult = this.checkIntentionalUse(issue, framework);
      if (intentionalResult.isIntentional) {
        classified.disposition = 'INTENTIONAL_USE';
        classified.dispositionReason = intentionalResult.reason;
        return classified;
      }
    }

    // Step 4: Check for existing pattern match (local patterns + Supabase patterns)
    // First check local patterns (in-memory, from patterns/*.ts files)
    const localPattern = findPattern(issue.rule, framework);
    if (localPattern && localPattern.fixConfidence >= 80) {
      classified.disposition = 'PATTERN_REUSE';
      classified.patternId = localPattern.id;
      classified.patternConfidence = localPattern.fixConfidence;
      classified.fixAvailable = true;
      classified.fixTier = 2; // Pattern-based fix
      classified.dispositionReason = `Pattern: ${localPattern.id}`;
      return classified;
    }

    // Then check Supabase patterns
    const patternKey = `${issue.rule}|${issue.tool}|${framework}`;
    const existingPattern = this.existingPatternMap.get(patternKey);
    if (existingPattern && existingPattern.fixConfidence >= 80) {
      classified.disposition = 'PATTERN_REUSE';
      classified.patternId = existingPattern.id;
      classified.patternConfidence = existingPattern.fixConfidence;
      classified.fixAvailable = true;
      classified.fixTier = 2; // Pattern-based fix
      return classified;
    }

    // Step 5: Determine if this should create a new pattern
    if (this.options.saveNewPatterns && this.isPatternWorthy(issue)) {
      classified.disposition = 'ADD_TO_PATTERNS';
      classified.shouldSavePattern = true;
      classified.fixAvailable = true;
      return classified;
    }

    // Step 6: Default - fix now
    classified.disposition = 'FIX_NOW';
    classified.fixAvailable = true;
    classified.fixTier = this.determineTier(issue);

    return classified;
  }

  /**
   * Check if issue is an environment/configuration issue
   *
   * SESSION 44 FIX: Added TS2580 and TS2582 which are environment issues
   * when dependencies aren't installed (missing Node.js types)
   */
  private isEnvironmentIssue(issue: RawIssue): boolean {
    if (issue.tool !== 'typescript') {
      return false;
    }

    // TypeScript "Cannot find module" errors
    if (issue.rule === 'TS2307') {
      return !this.options.dependenciesInstalled;
    }

    // TypeScript "Module has no exported member"
    if (issue.rule === 'TS2305') {
      return !this.options.dependenciesInstalled;
    }

    // TypeScript "Cannot find name 'require'" - missing @types/node
    // This is 100% an environment issue (needs npm install @types/node)
    if (issue.rule === 'TS2580') {
      return true; // Always environment issue
    }

    // TypeScript "Cannot find name 'describe'/'it'/'expect'" - missing @types/jest
    // This is 100% an environment issue (needs npm install @types/jest)
    if (issue.rule === 'TS2582') {
      return true; // Always environment issue
    }

    // TypeScript "Cannot find name" (generic) - often from missing types
    // TS2304 is more nuanced - only filter when deps not installed
    if (issue.rule === 'TS2304') {
      // Check for common global names that indicate missing type definitions
      const missingTypes = ['require', 'module', 'process', '__dirname', '__filename',
                           'describe', 'it', 'expect', 'jest', 'beforeEach', 'afterEach'];
      const match = issue.message.match(/Cannot find name '([^']+)'/);
      if (match && missingTypes.includes(match[1])) {
        return true;
      }
      return !this.options.dependenciesInstalled;
    }

    // Missing type declarations
    if (issue.message.includes('@types/')) {
      return true;
    }

    return false;
  }

  /**
   * Get environment issue explanation
   *
   * SESSION 44 FIX: Added explanations for TS2580, TS2582, TS2304
   */
  private getEnvironmentIssueReason(issue: RawIssue): string {
    if (issue.rule === 'TS2307') {
      const moduleMatch = issue.message.match(/Cannot find module '([^']+)'/);
      const moduleName = moduleMatch ? moduleMatch[1] : 'module';

      if (moduleName.startsWith('@nestjs/')) {
        return `Missing NestJS package: ${moduleName}. Run "npx lerna bootstrap" for monorepo.`;
      }
      if (moduleName.startsWith('.')) {
        return `Missing local module: ${moduleName}. Ensure the file exists and is built.`;
      }
      return `Missing dependency: ${moduleName}. Run "npm install".`;
    }

    if (issue.rule === 'TS2580') {
      return `Cannot find name 'require'. Install Node.js types: npm install -D @types/node`;
    }

    if (issue.rule === 'TS2582') {
      return `Cannot find name 'describe/it/expect'. Install test types: npm install -D @types/jest`;
    }

    if (issue.rule === 'TS2304') {
      const match = issue.message.match(/Cannot find name '([^']+)'/);
      const name = match ? match[1] : 'name';
      if (['require', 'module', 'process', '__dirname', '__filename'].includes(name)) {
        return `Cannot find Node.js global '${name}'. Install: npm install -D @types/node`;
      }
      if (['describe', 'it', 'expect', 'jest', 'beforeEach', 'afterEach'].includes(name)) {
        return `Cannot find test global '${name}'. Install: npm install -D @types/jest`;
      }
      return `Cannot find name '${name}'. Run "npm install" to install dependencies.`;
    }

    return 'Environment configuration issue - ensure dependencies are installed.';
  }

  /**
   * Check framework-specific filter rules
   */
  private checkFrameworkFilter(
    issue: RawIssue,
    framework: Framework
  ): { shouldFilter: boolean; reason?: string; explanation?: string } {
    if (framework === 'nestjs') {
      return shouldFilterForNestJS(
        issue.rule,
        issue.file,
        issue.message,
        this.options.dependenciesInstalled
      );
    }

    // Add more framework checks here
    return { shouldFilter: false };
  }

  /**
   * Check for intentional use patterns
   */
  private checkIntentionalUse(
    issue: RawIssue,
    framework: Framework
  ): { isIntentional: boolean; reason?: string } {
    // Read code snippet if not provided
    let codeSnippet = issue.snippet;
    if (!codeSnippet) {
      codeSnippet = this.readCodeSnippet(issue.file, issue.line);
    }

    if (framework === 'nestjs') {
      return isNestJSIntentionalUse(issue.rule, issue.file, codeSnippet);
    }

    // Add more framework checks here
    return { isIntentional: false };
  }

  /**
   * Read code snippet from file
   */
  private readCodeSnippet(file: string, line: number, contextLines = 5): string {
    try {
      const filePath = path.join(this.options.workingDir, file);
      if (!fs.existsSync(filePath)) return '';

      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      const start = Math.max(0, line - contextLines - 1);
      const end = Math.min(lines.length, line + contextLines);

      return lines.slice(start, end).join('\n');
    } catch {
      return '';
    }
  }

  /**
   * Check if issue is worth creating a pattern for
   */
  private isPatternWorthy(issue: RawIssue): boolean {
    // Security issues are always pattern-worthy
    if (['semgrep', 'codeql'].includes(issue.tool)) {
      return true;
    }

    // Common rule IDs are pattern-worthy
    const commonRules = [
      'detect-child-process',
      'detect-eval',
      'no-explicit-any',
      '@typescript-eslint/no-explicit-any',
      'no-unused-vars',
      '@typescript-eslint/no-unused-vars',
    ];

    return commonRules.includes(issue.rule);
  }

  /**
   * Determine fix tier for issue
   */
  private determineTier(issue: RawIssue): 1 | 2 | 3 {
    // Tier 1: Auto-fixable by tools
    if (issue.tool === 'eslint' && this.isEslintAutoFixable(issue.rule)) {
      return 1;
    }

    // Tier 2: Dedicated fixer tools
    if (['prettier', 'typescript'].includes(issue.tool)) {
      return 2;
    }

    // Tier 3: AI fixes
    return 3;
  }

  /**
   * Check if ESLint rule is auto-fixable
   */
  private isEslintAutoFixable(rule: string): boolean {
    const autoFixable = [
      'indent', 'quotes', 'semi', 'comma-dangle', 'no-trailing-spaces',
      'prefer-const', 'no-var', 'eqeqeq', 'curly',
    ];
    return autoFixable.includes(rule);
  }

  /**
   * Normalize severity to standard format
   */
  private normalizeSeverity(
    severity: string
  ): 'critical' | 'high' | 'medium' | 'low' {
    const s = severity.toLowerCase();
    if (s === 'error' || s === 'critical') return 'critical';
    if (s === 'warning' || s === 'high') return 'high';
    if (s === 'info' || s === 'medium') return 'medium';
    return 'low';
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a framework issue classifier
 */
export function createFrameworkIssueClassifier(
  options: ClassificationOptions
): FrameworkIssueClassifier {
  return new FrameworkIssueClassifier(options);
}

/**
 * Quick classification for a list of issues
 */
export function classifyIssuesForFramework(
  issues: RawIssue[],
  framework: Framework,
  workingDir: string,
  dependenciesInstalled = false
): IssueClassificationResult {
  const classifier = new FrameworkIssueClassifier({
    framework,
    dependenciesInstalled,
    workingDir,
    saveNewPatterns: true,
    verbose: false,
  });

  return classifier.classifyIssues(issues);
}
