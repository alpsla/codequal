/**
 * Issue Classifier
 *
 * Deterministic classification of issues based on rule IDs.
 * Maps tool-specific rules to standardized issue types for the Three-Tier Fix System.
 *
 * Classification Flow:
 * 1. Check rule ID against known mappings (fast, deterministic)
 * 2. Check rule prefix patterns (e.g., "security/", "S-")
 * 3. Fall back to AI classification (expensive, last resort)
 */

import { toolFixRegistry, FixTier } from './tool-fix-registry';

// ============================================================================
// TYPES
// ============================================================================

export type IssueType =
  | 'style'
  | 'formatting'
  | 'code_quality'
  | 'best_practices'
  | 'security'
  | 'performance'
  | 'bugs'
  | 'type_errors'
  | 'unused_code'
  | 'imports'
  | 'dependencies'
  | 'documentation'
  | 'accessibility'
  | 'modernization'
  | 'unknown';

export interface ClassifiedIssue {
  ruleId: string;
  toolId: string;
  issueType: IssueType;
  fixTier: FixTier;
  fixCommand?: string;
  fixerTool?: string;
  confidence: number;
  safeForAutoApply: boolean;
  classificationSource: 'rule_mapping' | 'prefix_pattern' | 'ai_fallback' | 'unknown';
}

export interface RuleMapping {
  pattern: string | RegExp;
  issueType: IssueType;
  description?: string;
}

// ============================================================================
// ESLINT RULE MAPPINGS
// ============================================================================

const ESLINT_RULE_MAPPINGS: RuleMapping[] = [
  // Formatting
  { pattern: /^(indent|quotes|semi|comma-|brace-style|linebreak-style|max-len|no-trailing-spaces|eol-last|no-multiple-empty-lines)/, issueType: 'formatting' },
  { pattern: /^@typescript-eslint\/(indent|quotes|semi|comma-)/, issueType: 'formatting' },
  { pattern: /^prettier\//, issueType: 'formatting' },

  // Style
  { pattern: /^(camelcase|func-style|id-|consistent-|prefer-const|no-var|arrow-)/, issueType: 'style' },
  { pattern: /^@typescript-eslint\/(naming-convention|consistent-type-)/, issueType: 'style' },

  // Unused code
  { pattern: /^(no-unused-|@typescript-eslint\/no-unused-)/, issueType: 'unused_code' },
  { pattern: /^(no-unreachable|no-dead-)/, issueType: 'unused_code' },

  // Imports
  { pattern: /^(import\/|sort-imports|no-duplicate-imports)/, issueType: 'imports' },
  { pattern: /^@typescript-eslint\/consistent-type-imports/, issueType: 'imports' },

  // Code quality
  { pattern: /^(complexity|max-depth|max-lines|max-statements|max-params|no-nested-)/, issueType: 'code_quality' },
  { pattern: /^(no-console|no-debugger|no-alert|no-eval)/, issueType: 'code_quality' },
  { pattern: /^@typescript-eslint\/(explicit-|strict-|prefer-)/, issueType: 'code_quality' },

  // Best practices
  { pattern: /^(eqeqeq|curly|default-case|dot-notation|guard-for-in|no-caller|no-extend-native)/, issueType: 'best_practices' },
  { pattern: /^@typescript-eslint\/(no-explicit-any|no-inferrable-types)/, issueType: 'best_practices' },

  // Type errors (TypeScript)
  { pattern: /^@typescript-eslint\/(no-unsafe-|ban-types|no-misused-)/, issueType: 'type_errors' },

  // Security
  { pattern: /^(no-eval|no-implied-eval|no-new-func)/, issueType: 'security' },
  { pattern: /^security\//, issueType: 'security' },

  // Bugs
  { pattern: /^(no-sparse-arrays|no-dupe-|no-duplicate-|no-extra-|no-irregular-|valid-)/, issueType: 'bugs' },
  { pattern: /^@typescript-eslint\/(no-floating-promises|no-misused-promises)/, issueType: 'bugs' },
];

// ============================================================================
// RUFF/PYTHON RULE MAPPINGS
// ============================================================================

const RUFF_RULE_MAPPINGS: RuleMapping[] = [
  // E: pycodestyle errors (style)
  { pattern: /^E[0-9]/, issueType: 'style' },

  // W: pycodestyle warnings (style)
  { pattern: /^W[0-9]/, issueType: 'style' },

  // F: pyflakes
  { pattern: /^F401/, issueType: 'imports', description: 'unused import' },
  { pattern: /^F841/, issueType: 'unused_code', description: 'unused variable' },
  { pattern: /^F[0-9]/, issueType: 'code_quality' },

  // I: isort (imports)
  { pattern: /^I[0-9]/, issueType: 'imports' },

  // N: pep8-naming (style)
  { pattern: /^N[0-9]/, issueType: 'style' },

  // D: pydocstyle (documentation)
  { pattern: /^D[0-9]/, issueType: 'documentation' },

  // UP: pyupgrade (modernization)
  { pattern: /^UP[0-9]/, issueType: 'modernization' },

  // S: flake8-bandit (security)
  { pattern: /^S[0-9]/, issueType: 'security' },

  // B: flake8-bugbear (bugs/best practices)
  { pattern: /^B[0-9]/, issueType: 'best_practices' },

  // C: mccabe complexity
  { pattern: /^C[0-9]/, issueType: 'code_quality' },

  // T: flake8-debugger (code quality)
  { pattern: /^T[0-9]/, issueType: 'code_quality' },

  // PL: pylint
  { pattern: /^PL[CRW]/, issueType: 'code_quality' },
  { pattern: /^PLE/, issueType: 'bugs' },

  // RUF: ruff-specific
  { pattern: /^RUF[0-9]/, issueType: 'style' },
];

// ============================================================================
// PMD RULE MAPPINGS
// ============================================================================

const PMD_RULE_MAPPINGS: RuleMapping[] = [
  // Best Practices
  { pattern: /^bestpractices\//, issueType: 'best_practices' },
  { pattern: /AvoidReassigningParameters|UnusedAssignment|UseVarargs/, issueType: 'best_practices' },

  // Code Style
  { pattern: /^codestyle\//, issueType: 'style' },
  { pattern: /FieldNamingConventions|LocalVariableNamingConventions|MethodNamingConventions/, issueType: 'style' },

  // Design
  { pattern: /^design\//, issueType: 'code_quality' },
  { pattern: /CyclomaticComplexity|NPathComplexity|TooManyMethods/, issueType: 'code_quality' },

  // Error Prone
  { pattern: /^errorprone\//, issueType: 'bugs' },
  { pattern: /AvoidDuplicateLiterals|EmptyCatchBlock|EmptyIfStmt/, issueType: 'bugs' },

  // Performance
  { pattern: /^performance\//, issueType: 'performance' },
  { pattern: /StringInstantiation|AppendCharacterWithChar/, issueType: 'performance' },

  // Security
  { pattern: /^security\//, issueType: 'security' },
  { pattern: /HardCodedCryptoKey|InsecureCryptoIv/, issueType: 'security' },

  // Documentation
  { pattern: /^documentation\//, issueType: 'documentation' },

  // Multithreading
  { pattern: /^multithreading\//, issueType: 'bugs' },
];

// ============================================================================
// SEMGREP RULE MAPPINGS
// ============================================================================

const SEMGREP_RULE_MAPPINGS: RuleMapping[] = [
  // Security
  { pattern: /^security-/, issueType: 'security' },
  { pattern: /(sql-injection|xss|csrf|ssrf|rce|path-traversal|command-injection)/, issueType: 'security' },
  { pattern: /(hardcoded|secret|password|credential|api-key)/, issueType: 'security' },
  { pattern: /^insecure-/, issueType: 'security' },

  // Best practices
  { pattern: /^best-practice/, issueType: 'best_practices' },

  // Performance
  { pattern: /^performance/, issueType: 'performance' },

  // Correctness
  { pattern: /^correctness/, issueType: 'bugs' },
];

// ============================================================================
// CHECKSTYLE RULE MAPPINGS
// ============================================================================

const CHECKSTYLE_RULE_MAPPINGS: RuleMapping[] = [
  // Naming
  { pattern: /(Name|Naming)Check$/, issueType: 'style' },

  // Imports
  { pattern: /(Import|UnusedImports)/, issueType: 'imports' },

  // Whitespace/Formatting
  { pattern: /(Whitespace|Indentation|LineLength|EmptyLine)/, issueType: 'formatting' },

  // Javadoc
  { pattern: /Javadoc/, issueType: 'documentation' },

  // Block checks
  { pattern: /(Block|Brace)Check$/, issueType: 'style' },

  // Size violations
  { pattern: /(MethodLength|FileLength|ParameterNumber|LineLength)/, issueType: 'code_quality' },

  // Coding
  { pattern: /(EmptyCatchBlock|EqualsHashCode|MagicNumber)/, issueType: 'best_practices' },
];

// ============================================================================
// GOLANGCI-LINT RULE MAPPINGS
// ============================================================================

const GOLANGCI_RULE_MAPPINGS: RuleMapping[] = [
  // Unused code
  { pattern: /^(unused|deadcode|varcheck|structcheck)$/, issueType: 'unused_code' },

  // Style
  { pattern: /^(gofmt|goimports|gofumpt|gci|stylecheck)$/, issueType: 'style' },

  // Bugs
  { pattern: /^(errcheck|staticcheck|govet|gosimple)$/, issueType: 'bugs' },

  // Security
  { pattern: /^(gosec|gas)$/, issueType: 'security' },

  // Performance
  { pattern: /^(prealloc|gocritic)$/, issueType: 'performance' },

  // Code quality
  { pattern: /^(cyclop|gocyclo|gocognit|funlen|maintidx)$/, issueType: 'code_quality' },

  // Best practices
  { pattern: /^(goconst|dupl|nestif)$/, issueType: 'best_practices' },
];

// ============================================================================
// TOOL TO MAPPING REGISTRY
// ============================================================================

const TOOL_MAPPINGS: Record<string, RuleMapping[]> = {
  eslint: ESLINT_RULE_MAPPINGS,
  'typescript-eslint': ESLINT_RULE_MAPPINGS,
  ruff: RUFF_RULE_MAPPINGS,
  pylint: RUFF_RULE_MAPPINGS, // Pylint uses similar prefixes
  pmd: PMD_RULE_MAPPINGS,
  semgrep: SEMGREP_RULE_MAPPINGS,
  checkstyle: CHECKSTYLE_RULE_MAPPINGS,
  'golangci-lint': GOLANGCI_RULE_MAPPINGS,
};

// ============================================================================
// ISSUE CLASSIFIER CLASS
// ============================================================================

export class IssueClassifier {
  /**
   * Classify an issue based on rule ID and tool
   */
  classify(ruleId: string, toolId: string): ClassifiedIssue {
    const normalizedToolId = this.normalizeToolId(toolId);
    const normalizedRuleId = this.normalizeRuleId(ruleId);

    // Get tool capability from registry
    const toolCapability = toolFixRegistry.getToolCapability(normalizedToolId);

    // Try rule mapping first (deterministic, fast)
    const mappedType = this.classifyByRuleMapping(normalizedRuleId, normalizedToolId);
    if (mappedType) {
      return this.buildClassifiedIssue(ruleId, normalizedToolId, mappedType, 'rule_mapping', toolCapability);
    }

    // Try prefix pattern matching
    const prefixType = this.classifyByPrefix(normalizedRuleId, normalizedToolId);
    if (prefixType) {
      return this.buildClassifiedIssue(ruleId, normalizedToolId, prefixType, 'prefix_pattern', toolCapability);
    }

    // Default to unknown (will need AI fallback)
    return this.buildClassifiedIssue(ruleId, normalizedToolId, 'unknown', 'unknown', toolCapability);
  }

  /**
   * Classify by rule mapping
   */
  private classifyByRuleMapping(ruleId: string, toolId: string): IssueType | null {
    const mappings = TOOL_MAPPINGS[toolId];
    if (!mappings) return null;

    for (const mapping of mappings) {
      const pattern = mapping.pattern;
      if (typeof pattern === 'string') {
        if (ruleId.startsWith(pattern) || ruleId.includes(pattern)) {
          return mapping.issueType;
        }
      } else if (pattern instanceof RegExp) {
        if (pattern.test(ruleId)) {
          return mapping.issueType;
        }
      }
    }

    return null;
  }

  /**
   * Classify by common prefix patterns
   */
  private classifyByPrefix(ruleId: string, _toolId: string): IssueType | null {
    const lower = ruleId.toLowerCase();

    // Security indicators
    if (lower.includes('security') || lower.includes('vuln') || lower.includes('insecure')) {
      return 'security';
    }

    // Performance indicators
    if (lower.includes('perf') || lower.includes('performance') || lower.includes('slow')) {
      return 'performance';
    }

    // Bug indicators
    if (lower.includes('bug') || lower.includes('error') || lower.includes('incorrect')) {
      return 'bugs';
    }

    // Style indicators
    if (lower.includes('style') || lower.includes('format') || lower.includes('naming')) {
      return 'style';
    }

    // Unused code
    if (lower.includes('unused') || lower.includes('dead') || lower.includes('unreachable')) {
      return 'unused_code';
    }

    // Import related
    if (lower.includes('import')) {
      return 'imports';
    }

    // Documentation
    if (lower.includes('doc') || lower.includes('comment') || lower.includes('javadoc')) {
      return 'documentation';
    }

    return null;
  }

  /**
   * Build classified issue with all metadata
   */
  private buildClassifiedIssue(
    ruleId: string,
    toolId: string,
    issueType: IssueType,
    source: ClassifiedIssue['classificationSource'],
    toolCapability?: ReturnType<typeof toolFixRegistry.getToolCapability>
  ): ClassifiedIssue {
    const tier = toolCapability?.tier ?? 3;
    const confidence = this.calculateConfidence(source, toolCapability?.confidence);

    return {
      ruleId,
      toolId,
      issueType,
      fixTier: tier,
      fixCommand: toolCapability?.fixCommand,
      fixerTool: toolCapability?.fixerTool,
      confidence,
      safeForAutoApply: toolCapability?.safeForAutoApply ?? false,
      classificationSource: source,
    };
  }

  /**
   * Calculate confidence based on classification source
   */
  private calculateConfidence(source: ClassifiedIssue['classificationSource'], toolConfidence?: number): number {
    const baseConfidence = toolConfidence ?? 50;

    switch (source) {
      case 'rule_mapping':
        return Math.min(100, baseConfidence + 20);
      case 'prefix_pattern':
        return Math.min(100, baseConfidence);
      case 'ai_fallback':
        return Math.min(100, baseConfidence - 10);
      case 'unknown':
      default:
        return Math.min(100, baseConfidence - 20);
    }
  }

  /**
   * Normalize tool ID
   */
  private normalizeToolId(toolId: string): string {
    return toolId.toLowerCase().replace(/_/g, '-');
  }

  /**
   * Normalize rule ID
   */
  private normalizeRuleId(ruleId: string): string {
    return ruleId.trim();
  }

  /**
   * Batch classify issues
   */
  classifyBatch(issues: { ruleId: string; toolId: string }[]): ClassifiedIssue[] {
    return issues.map(issue => this.classify(issue.ruleId, issue.toolId));
  }

  /**
   * Group issues by type for batch fixing
   */
  groupByType(classifiedIssues: ClassifiedIssue[]): Map<IssueType, ClassifiedIssue[]> {
    const groups = new Map<IssueType, ClassifiedIssue[]>();

    for (const issue of classifiedIssues) {
      const existing = groups.get(issue.issueType) || [];
      existing.push(issue);
      groups.set(issue.issueType, existing);
    }

    return groups;
  }

  /**
   * Group issues by fixer for efficient batch execution
   */
  groupByFixer(classifiedIssues: ClassifiedIssue[]): Map<string, ClassifiedIssue[]> {
    const groups = new Map<string, ClassifiedIssue[]>();

    for (const issue of classifiedIssues) {
      const fixer = issue.fixCommand || issue.fixerTool || 'ai';
      const existing = groups.get(fixer) || [];
      existing.push(issue);
      groups.set(fixer, existing);
    }

    return groups;
  }

  /**
   * Get statistics about classification
   */
  getStatistics(classifiedIssues: ClassifiedIssue[]): {
    total: number;
    byType: Record<IssueType, number>;
    byTier: Record<FixTier, number>;
    bySource: Record<string, number>;
    avgConfidence: number;
    safeForAutoApply: number;
  } {
    const byType: Record<string, number> = {};
    const byTier: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    const bySource: Record<string, number> = {};
    let totalConfidence = 0;
    let safeCount = 0;

    for (const issue of classifiedIssues) {
      byType[issue.issueType] = (byType[issue.issueType] || 0) + 1;
      byTier[issue.fixTier]++;
      bySource[issue.classificationSource] = (bySource[issue.classificationSource] || 0) + 1;
      totalConfidence += issue.confidence;
      if (issue.safeForAutoApply) safeCount++;
    }

    return {
      total: classifiedIssues.length,
      byType: byType as Record<IssueType, number>,
      byTier: byTier as Record<FixTier, number>,
      bySource,
      avgConfidence: classifiedIssues.length > 0 ? totalConfidence / classifiedIssues.length : 0,
      safeForAutoApply: safeCount,
    };
  }
}

// Export singleton instance
export const issueClassifier = new IssueClassifier();
