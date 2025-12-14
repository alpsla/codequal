/**
 * Framework-Specific Issue Classification Types
 *
 * This module defines how issues are classified based on:
 * 1. Framework context (NestJS, React, Express, Spring, etc.)
 * 2. Issue disposition (fix, filter, learn pattern, etc.)
 * 3. Pattern learning for future scans
 *
 * Key Insight: Different frameworks have different "normal" patterns.
 * What's a bug in one framework might be intentional in another.
 *
 * Example:
 * - NestJS: `child_process` in a CLI tool adapter = INTENTIONAL_USE
 * - React: `child_process` in frontend code = SECURITY_ISSUE
 */

// ============================================================================
// Issue Disposition - What to do with each issue
// ============================================================================

/**
 * Determines what action to take for an issue
 */
export type IssueDisposition =
  | 'FIX_NOW'              // Apply fix immediately (Tier 1/2/3)
  | 'ADD_TO_PATTERNS'      // New pattern - fix and save for future reuse
  | 'PATTERN_REUSE'        // Existing pattern - apply without AI call
  | 'FILTER_OUT'           // Known false positive for this framework
  | 'INTENTIONAL_USE'      // Legitimate use that shouldn't be fixed
  | 'ENVIRONMENT_ISSUE'    // Missing deps, config issue - not code problem
  | 'MANUAL_REVIEW'        // Requires human decision
  | 'SKIP_FOR_FRAMEWORK';  // Not applicable to this framework

/**
 * Reason codes for filtering out issues
 */
export type FilterReason =
  | 'MISSING_DEPENDENCY'       // TS2307: Cannot find module (needs npm install)
  | 'MISSING_TYPE_DECLARATION' // Missing @types/* package
  | 'BUILD_ARTIFACT'           // Error in generated/compiled code
  | 'TEST_FIXTURE'             // Error in test fixtures/mocks
  | 'EXAMPLE_CODE'             // Code in documentation/examples
  | 'FRAMEWORK_BOILERPLATE'    // Standard framework patterns
  | 'MONOREPO_CROSS_REF'       // Cross-package reference in monorepo
  | 'DEVTOOL_CODE'             // CLI tools, scripts, dev utilities
  | 'KNOWN_FALSE_POSITIVE';    // Confirmed false positive for rule+framework

// ============================================================================
// Framework Context
// ============================================================================

/**
 * Supported frameworks with their characteristics
 */
export type Framework =
  // TypeScript/JavaScript
  | 'nestjs'
  | 'express'
  | 'react'
  | 'nextjs'
  | 'angular'
  | 'vue'
  | 'svelte'
  | 'electron'
  | 'node-cli'      // CLI tools
  | 'node-library'  // npm packages
  // Java
  | 'spring-boot'
  | 'spring-mvc'
  | 'quarkus'
  | 'micronaut'
  // Python
  | 'fastapi'
  | 'django'
  | 'flask'
  // Go
  | 'gin'
  | 'fiber'
  | 'echo'
  // Generic
  | 'unknown';

/**
 * Framework-specific configuration for issue handling
 */
export interface FrameworkConfig {
  /** Framework identifier */
  framework: Framework;

  /** Patterns that are INTENTIONAL for this framework */
  intentionalPatterns: IntentionalPattern[];

  /** Rules to filter out entirely for this framework */
  filterRules: FilterRule[];

  /** Environment requirements (what needs to be installed) */
  environmentRequirements: EnvironmentRequirement[];

  /** Framework-specific fix strategies */
  fixStrategies: FrameworkFixStrategy[];
}

/**
 * Pattern that's intentional/expected for a framework
 */
export interface IntentionalPattern {
  /** Rule ID that triggers this */
  ruleId: string;

  /** File path patterns where this is intentional */
  filePatterns: RegExp[];

  /** Code patterns that indicate intentional use */
  codePatterns?: RegExp[];

  /** Why this is intentional */
  reason: string;

  /** Example of correct usage */
  example?: string;
}

/**
 * Rule to filter out for a framework
 */
export interface FilterRule {
  /** Rule ID to filter */
  ruleId: string;

  /** Condition for filtering */
  condition: 'always' | 'when_missing_deps' | 'in_test_files' | 'in_generated_code';

  /** Reason for filtering */
  reason: FilterReason;

  /** Human-readable explanation */
  explanation: string;
}

/**
 * Environment requirement for proper analysis
 */
export interface EnvironmentRequirement {
  /** What needs to be installed/configured */
  requirement: string;

  /** Command to check if requirement is met */
  checkCommand: string;

  /** Command to fix if missing */
  fixCommand: string;

  /** Issues that occur when this is missing */
  relatedErrorPatterns: string[];
}

/**
 * Framework-specific fix strategy
 */
export interface FrameworkFixStrategy {
  /** Rule ID this strategy applies to */
  ruleId: string;

  /** Framework-specific fix approach */
  strategy: 'standard' | 'framework_pattern' | 'skip' | 'transform';

  /** For 'framework_pattern': the pattern to use */
  frameworkPattern?: string;

  /** For 'transform': how to transform the fix */
  transformFn?: string;
}

// ============================================================================
// Classified Issue with Disposition
// ============================================================================

/**
 * Issue with full classification and disposition
 */
export interface ClassifiedFrameworkIssue {
  // Original issue data
  file: string;
  line: number;
  column?: number;
  rule: string;
  ruleId: string;  // Alias for compatibility
  tool: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';

  // Framework context
  framework: Framework;

  // Disposition decision
  disposition: IssueDisposition;
  dispositionReason?: string;

  // For FILTER_OUT disposition
  filterReason?: FilterReason;

  // For PATTERN_REUSE disposition
  patternId?: string;
  patternConfidence?: number;

  // For ADD_TO_PATTERNS disposition
  shouldSavePattern?: boolean;

  // Category (NEW vs EXISTING from branch comparison)
  category?: 'NEW' | 'EXISTING';

  // Fix information
  fixAvailable?: boolean;
  fixTier?: 1 | 2 | 3;
  estimatedFixTime?: string;
}

// ============================================================================
// Framework Pattern Registry Entry
// ============================================================================

/**
 * Pattern stored in Supabase for framework-specific reuse
 */
export interface FrameworkPattern {
  id: string;

  // Pattern identification
  ruleId: string;
  tool: string;
  framework: Framework;

  // Pattern matching
  codePattern: string;        // Regex or code snippet to match
  contextPattern?: string;    // Surrounding code context

  // Fix information
  fixTemplate: string;        // The fix to apply
  fixConfidence: number;      // 0-100

  // Metadata
  createdAt: Date;
  lastUsedAt: Date;
  useCount: number;
  successRate: number;        // Successful applications / total attempts

  // Framework-specific
  frameworkVersion?: string;  // e.g., "nestjs@10.x"
  requiresImport?: string[];  // Imports needed for the fix
}

// ============================================================================
// Issue Classification Result
// ============================================================================

/**
 * Result of classifying issues for a repository
 */
export interface IssueClassificationResult {
  // Summary counts
  total: number;
  byDisposition: Record<IssueDisposition, number>;
  byFramework: Record<Framework, number>;

  // Classified issues
  issues: ClassifiedFrameworkIssue[];

  // Issues ready for fixing
  fixableIssues: ClassifiedFrameworkIssue[];

  // Issues to filter out (with reasons)
  filteredIssues: {
    issue: ClassifiedFrameworkIssue;
    reason: FilterReason;
    explanation: string;
  }[];

  // Patterns to save from this run
  newPatterns: FrameworkPattern[];

  // Patterns reused from previous runs
  reusedPatterns: {
    patternId: string;
    issueCount: number;
  }[];

  // Cost analysis
  costAnalysis: {
    withoutPatterns: number;
    withPatterns: number;
    savings: number;
    savingsPercent: number;
  };
}

// All types are exported inline above using 'export type' and 'export interface'
