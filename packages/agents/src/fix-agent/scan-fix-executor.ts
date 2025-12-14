/**
 * Scan-Time Fix Executor
 *
 * Executes fixes DURING the analysis scan, not after.
 * This is the core of the "Fix During Scan" mode - the PRIMARY fix delivery mode.
 *
 * Key Differences from IDE-Assisted Mode:
 * - This mode CHANGES code directly (tools run with --fix flags)
 * - IDE-Assisted mode only RECOMMENDS changes (metadata for IDE to apply)
 *
 * Integration Point:
 * Called from V9 pipeline AFTER issue detection, BEFORE report generation.
 *
 * Flow:
 * 1. Receive detected issues from tool orchestration
 * 2. Route issues to appropriate fixers (Tier 1 → 2 → 3)
 * 3. Execute fixes in parallel (respecting performance profiles)
 * 4. Return fix results for inclusion in report
 * 5. Optionally generate patch file or commit fixes
 *
 * @module fix-agent/scan-fix-executor
 */

import { FixOrchestrator, OrchestratorConfig, OrchestratorResult, FixIssue } from './tool-fixers/fix-orchestrator';
import { classifyIssue, ClassifiedIssue } from './issue-classifier';
import { createAIFixerVerifier, VerifiedFixResult, EnhancementRequest } from './fix-pattern-registry';
import { getSimpleOpenRouterClient, SimpleOpenRouterClient } from '../two-branch/services/simple-openrouter-client';
import {
  getDependencyFixer,
  isDependencyVulnerability,
  type DependencyVulnerability,
} from './tool-fixers/dependency-fixer';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// ============================================================================
// FALSE POSITIVE DETECTION
// ============================================================================

/**
 * Rule-specific patterns that MUST be present in the code for the issue to be valid
 * If none of these patterns are found, the detection is likely a false positive
 */
const RULE_REQUIRED_PATTERNS: Record<string, { patterns: RegExp[]; description: string }> = {
  'detect-child-process': {
    patterns: [
      /child_process/i,
      /\bexec\s*\(/,
      /\bexecSync\s*\(/,
      /\bspawn\s*\(/,
      /\bspawnSync\s*\(/,
      /\bfork\s*\(/,
      /\bexecFile\s*\(/,
      /require\s*\(\s*['"]child_process['"]\s*\)/,
      /from\s+['"]child_process['"]/,
    ],
    description: 'Code must contain child_process imports or exec/spawn calls',
  },
  'detect-eval': {
    patterns: [
      /\beval\s*\(/,
      /new\s+Function\s*\(/,
      /setTimeout\s*\(\s*['"`]/,
      /setInterval\s*\(\s*['"`]/,
    ],
    description: 'Code must contain eval() or dynamic code execution',
  },
  'detect-sql-injection': {
    patterns: [
      /query\s*\(/,
      /execute\s*\(/,
      /\$\{.*\}.*(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)/i,
      /\+\s*['"].*(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)/i,
    ],
    description: 'Code must contain SQL queries with potential injection vectors',
  },
  'detect-xss': {
    patterns: [
      /innerHTML\s*=/,
      /outerHTML\s*=/,
      /document\.write\s*\(/,
      /dangerouslySetInnerHTML/,
    ],
    description: 'Code must contain DOM manipulation that could allow XSS',
  },
};

/**
 * Patterns that indicate INTENTIONAL use of child_process
 * These are legitimate security-sensitive operations that should be
 * flagged for REVIEW but NOT auto-fixed (removing them would break functionality)
 *
 * Returns a reason string if intentional, or null if not
 */
function detectIntentionalChildProcessUse(
  codeSnippet: string,
  filePath: string
): string | null {
  // File path patterns that suggest intentional tool/shell usage
  const intentionalFilePaths = [
    { pattern: /adapter/i, reason: 'Shell adapter - executes external tools' },
    { pattern: /executor/i, reason: 'Command executor - runs shell commands by design' },
    { pattern: /runner/i, reason: 'Tool runner - executes external programs' },
    { pattern: /snippet-extractor/i, reason: 'Code search utility - uses grep/find' },
    { pattern: /snippet-locator/i, reason: 'Code locator - uses grep for search' },
    { pattern: /git[-_]?helper/i, reason: 'Git helper - runs git commands' },
    { pattern: /docker[-_]?helper/i, reason: 'Docker helper - runs docker commands' },
    { pattern: /cli[-_]?tool/i, reason: 'CLI tool wrapper' },
    { pattern: /shell[-_]?util/i, reason: 'Shell utility functions' },
  ];

  // Check file path patterns
  for (const { pattern, reason } of intentionalFilePaths) {
    if (pattern.test(filePath)) {
      return reason;
    }
  }

  // Code patterns that suggest intentional use
  const intentionalCodePatterns = [
    { pattern: /grep\s+(-r|-n|--include)/i, reason: 'Using grep for file search' },
    { pattern: /git\s+(status|log|diff|clone|checkout)/i, reason: 'Running git commands' },
    { pattern: /docker\s+(run|build|push|pull)/i, reason: 'Running docker commands' },
    { pattern: /npm\s+(install|run|test)/i, reason: 'Running npm commands' },
    { pattern: /spawn\s*\(\s*['"]?(node|python|java|go)/i, reason: 'Spawning interpreter process' },
    { pattern: /Promise.*resolve.*spawn/i, reason: 'Promise-wrapped process spawn' },
    { pattern: /child\.(stdout|stderr)\.on\s*\(\s*['"]data/i, reason: 'Stream-based process handling' },
  ];

  // Check code patterns
  for (const { pattern, reason } of intentionalCodePatterns) {
    if (pattern.test(codeSnippet)) {
      return reason;
    }
  }

  return null;
}

/**
 * Check if code is likely in a template, markdown example, or test fixture context
 * These are often false positives as they're just example code, not real security issues
 */
function isTemplateOrExampleContext(codeSnippet: string): boolean {
  const templateIndicators = [
    /```[\w]*\n/,                    // Markdown code blocks
    /\${.*?`.*?`.*?}/,              // Template literals with code examples
    /['"]use strict['"];?\s*\n/,    // String content that looks like code
    /\/\/ example:?/i,              // Comment indicating example
    /\* example:?/i,                // JSDoc example
    /\/\*\*[\s\S]*?@example/,       // JSDoc @example tag
    /^\s*\/\/ (?:TODO|FIXME|NOTE)/i, // Development comments
    /test(?:ing)?.*?exec/i,         // Test code mentioning exec
  ];

  return templateIndicators.some(pattern => pattern.test(codeSnippet));
}

/**
 * Validate that detected issue is not a false positive
 * Returns true if the issue appears valid, false if it's likely a false positive
 *
 * Two-stage validation:
 * 1. Check if the FULL FILE contains the expected pattern (import/require)
 * 2. Check if the LOCAL SNIPPET is in a template/example context
 */
function validateIssueIsReal(
  ruleId: string,
  fullFileContent: string,
  localSnippet: string,
  verbose = false
): { isValid: boolean; reason?: string } {
  // Normalize the rule ID (remove tool prefixes, lowercase)
  const normalizedRuleId = ruleId.toLowerCase().replace(/^[^:]+:/, '');

  // Find matching rule patterns
  const ruleConfig = Object.entries(RULE_REQUIRED_PATTERNS).find(([key]) =>
    normalizedRuleId.includes(key) || key.includes(normalizedRuleId)
  );

  if (!ruleConfig) {
    // No validation rules for this issue type - assume valid
    return { isValid: true };
  }

  const [ruleName, config] = ruleConfig;

  // Stage 1: Check if LOCAL SNIPPET (around flagged line) contains expected patterns
  // This is more accurate than checking the full file - a file may have child_process
  // elsewhere but the flagged line might be unrelated (e.g., just `} else {`)
  const hasPatternInSnippet = config.patterns.some(pattern => pattern.test(localSnippet));

  if (!hasPatternInSnippet) {
    if (verbose) {
      console.log(`[FalsePositive] ${ruleName}: No matching patterns found in local snippet (±5 lines)`);
    }
    return {
      isValid: false,
      reason: `False positive: Code snippet doesn't contain ${config.description}. The flagged line may be unrelated code.`,
    };
  }

  // Stage 2: Check if local snippet is in a template/example context
  if (isTemplateOrExampleContext(localSnippet)) {
    if (verbose) {
      console.log(`[FalsePositive] ${ruleName}: Code appears to be in template/example context`);
    }
    return {
      isValid: false,
      reason: `False positive: Code appears to be in a template, markdown example, or test fixture - not actual security-sensitive code.`,
    };
  }

  return { isValid: true };
}

// ============================================================================
// PATTERN VALIDATION
// ============================================================================

/**
 * Patterns that indicate an AI error response instead of actual fix code
 * If any of these are found in a pattern template, it's invalid
 */
const AI_ERROR_PATTERNS: RegExp[] = [
  /could you (?:please )?provide/i,
  /can you (?:please )?(?:provide|share|show)/i,
  /I (?:need|would need|require) (?:more )?(?:context|information|code|the actual)/i,
  /please (?:provide|share|show)/i,
  /you haven't provided/i,
  /I don't have (?:access|enough|the)/i,
  /without (?:seeing|the actual|more)/i,
  /I cannot (?:fix|modify|generate)/i,
  /I'm unable to/i,
  /\?$/m,  // Ends with a question mark (likely asking for clarification)
];

/**
 * Minimum characteristics of valid fix code
 */
const VALID_CODE_INDICATORS: RegExp[] = [
  /^(?:import|from|const|let|var|function|class|def|async|export|return)\s/m,  // Code keywords at line start
  /[{}[\]();]/,  // Contains common code syntax
  /=\s*[^=]/,  // Assignment (not comparison)
  /\.\w+\(/,  // Method calls
];

/**
 * Validate that a pattern template contains actual fix code, not an AI error response
 *
 * @param template - The pattern template to validate
 * @param fixedCode - Optional: the actual fixed code output
 * @returns Validation result with reason if invalid
 */
export function validatePatternTemplate(
  template: string,
  fixedCode?: string
): { isValid: boolean; reason?: string } {
  const codeToCheck = fixedCode || template;

  if (!codeToCheck || codeToCheck.trim().length === 0) {
    return {
      isValid: false,
      reason: 'Pattern template is empty',
    };
  }

  // Check for AI error patterns
  for (const errorPattern of AI_ERROR_PATTERNS) {
    if (errorPattern.test(codeToCheck)) {
      return {
        isValid: false,
        reason: `Pattern contains AI error response: "${codeToCheck.substring(0, 100)}..."`,
      };
    }
  }

  // Check if it looks like actual code (at least one valid indicator)
  const hasCodeIndicators = VALID_CODE_INDICATORS.some(pattern => pattern.test(codeToCheck));

  // If template is very long (>50 chars) but has no code indicators, it's likely prose/error
  if (codeToCheck.length > 50 && !hasCodeIndicators) {
    // Check if it's mostly natural language (high letter-to-symbol ratio)
    const letters = (codeToCheck.match(/[a-zA-Z]/g) || []).length;
    const symbols = (codeToCheck.match(/[{}[\]();=<>]/g) || []).length;
    const ratio = symbols > 0 ? letters / symbols : letters;

    if (ratio > 20) {  // Very high letter-to-symbol ratio = likely prose
      return {
        isValid: false,
        reason: 'Pattern appears to be natural language, not code',
      };
    }
  }

  return { isValid: true };
}

// ============================================================================
// AI FIX GENERATOR
// ============================================================================

/**
 * Check if braces are balanced in code
 */
function hasBalancedBraces(code: string): boolean {
  const stack: string[] = [];
  const pairs: Record<string, string> = { '{': '}', '[': ']', '(': ')' };
  const openers = Object.keys(pairs);
  const closers = Object.values(pairs);

  // Skip characters inside strings and comments
  let inString = false;
  let stringChar = '';
  let inSingleLineComment = false;
  let inMultiLineComment = false;

  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const nextChar = code[i + 1] || '';

    // Handle newlines
    if (char === '\n') {
      inSingleLineComment = false;
      continue;
    }

    // Handle comments
    if (!inString) {
      if (char === '/' && nextChar === '/') {
        inSingleLineComment = true;
        continue;
      }
      if (char === '/' && nextChar === '*') {
        inMultiLineComment = true;
        i++; // Skip next char
        continue;
      }
      if (char === '*' && nextChar === '/') {
        inMultiLineComment = false;
        i++; // Skip next char
        continue;
      }
    }

    if (inSingleLineComment || inMultiLineComment) continue;

    // Handle strings
    if ((char === '"' || char === "'" || char === '`') && code[i - 1] !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
      continue;
    }

    if (inString) continue;

    // Check braces
    if (openers.includes(char)) {
      stack.push(pairs[char]);
    } else if (closers.includes(char)) {
      if (stack.length === 0 || stack.pop() !== char) {
        return false;
      }
    }
  }

  return stack.length === 0;
}

/**
 * Clean AI-generated code response
 * Handles common issues like markdown code blocks, explanations, and unbalanced braces
 */
function cleanAICodeResponse(response: string, originalCode: string): string {
  let code = response;

  // Step 1: Remove markdown code blocks
  // Handle ```typescript, ```js, ```java, etc.
  code = code.replace(/^```[\w]*\n?/gm, '').replace(/\n?```$/gm, '');

  // Step 2: Remove any text before the first code-like character
  // This handles cases where AI starts with "Here's the fixed code:" etc.
  const firstCodeMatch = code.match(/^[\s\S]*?(?=(?:import|export|const|let|var|function|class|interface|type|if|for|while|return|async|public|private|protected|\/\/|\/\*|{|\(|<))/i);
  if (firstCodeMatch && firstCodeMatch[0].trim() && !firstCodeMatch[0].includes('{')) {
    code = code.slice(firstCodeMatch[0].length);
  }

  // Step 3: Remove any text after the code ends
  // Look for common patterns that indicate explanations
  const explanationPatterns = [
    /\n\nThis (?:fix|change|code|implementation)/i,
    /\n\nNote:/i,
    /\n\nExplanation:/i,
    /\n\nThe (?:above|change)/i,
    /\n\n\*\*Note/i,
  ];
  for (const pattern of explanationPatterns) {
    const match = code.match(pattern);
    if (match && match.index) {
      code = code.slice(0, match.index);
    }
  }

  // Step 4: Trim whitespace
  code = code.trim();

  // Step 5: Check brace balance
  if (!hasBalancedBraces(code)) {
    // Try to fix by matching original code structure
    const originalOpenBraces = (originalCode.match(/\{/g) || []).length;
    const originalCloseBraces = (originalCode.match(/\}/g) || []).length;
    const codeOpenBraces = (code.match(/\{/g) || []).length;
    const codeCloseBraces = (code.match(/\}/g) || []).length;

    // If we're missing closing braces, add them
    if (codeOpenBraces > codeCloseBraces) {
      const missing = codeOpenBraces - codeCloseBraces;
      // Only add if it's a reasonable number (AI might have returned partial code)
      if (missing <= 3) {
        code = code + '\n' + '}'.repeat(missing);
      }
    }
    // If we're missing opening braces, the code is likely truncated at start
    else if (codeCloseBraces > codeOpenBraces) {
      const missing = codeCloseBraces - codeOpenBraces;
      // Only add if it's a reasonable number
      if (missing <= 3) {
        code = '{'.repeat(missing) + '\n' + code;
      }
    }
  }

  return code;
}

/**
 * Generate an AI fix for a security/code issue
 */
async function generateAIFix(
  client: SimpleOpenRouterClient,
  ruleId: string,
  tool: string,
  originalCode: string,
  issueMessage: string,
  filePath: string,
  lineNumber: number
): Promise<string> {
  const systemPrompt = `You are an expert code security fixer. Your task is to fix security and code quality issues.

CRITICAL RULES:
1. Return ONLY the fixed code snippet - NO explanations, NO markdown code blocks, NO "Here's the fixed code:" text
2. The code you return MUST have balanced braces, brackets, and parentheses
3. Return the COMPLETE code snippet - do NOT truncate or leave parts out
4. Preserve the exact structure and formatting of the original code
5. Fix ONLY the specific issue mentioned - do NOT refactor or change unrelated code
6. If the fix requires adding imports, include them at the appropriate location

IMPORTANT: Your output will be verified. If braces are unbalanced, the fix will be rejected.`;

  const userPrompt = `Fix this ${tool} security issue in ${filePath}:

Rule: ${ruleId}
Issue: ${issueMessage}
Line: ${lineNumber}

Original code to fix:
${originalCode}

Return the fixed version of this EXACT code snippet. Ensure all braces are balanced.`;

  const response = await client.chat({
    systemPrompt,
    userPrompt,
    model: 'anthropic/claude-sonnet-4',
    temperature: 0.2,
    maxTokens: 2000,
  });

  // Clean the response - handle markdown, explanations, and fix minor brace issues
  const fixedCode = cleanAICodeResponse(response.content, originalCode);

  return fixedCode;
}

/**
 * Create an enhancer function for the AI fixer verifier
 */
function createAIEnhancer(client: SimpleOpenRouterClient): (request: EnhancementRequest) => Promise<string> {
  return async (request: EnhancementRequest): Promise<string> => {
    const systemPrompt = `You are an expert code fixer. A previous fix attempt failed verification.

CRITICAL RULES:
1. Return ONLY the fixed code - NO explanations, NO markdown code blocks, NO "Here's the corrected code:" text
2. The code you return MUST have balanced braces, brackets, and parentheses
3. Return the COMPLETE code snippet - do NOT truncate or leave parts out
4. Fix the verification errors mentioned
5. Preserve the structure of the original code

IMPORTANT: The most common error is "Unbalanced braces". Make absolutely sure every { has a matching } and every ( has a matching ).`;

    const errorMessages = request.errors.map(e => `- ${e.type}: ${e.message}`).join('\n');

    const userPrompt = `Previous fix attempt failed. Fix these verification errors:

Rule: ${request.context.ruleId}
Original Issue: ${request.context.issueMessage}
Attempt: ${request.previousAttempts + 1}

Previous fix that FAILED:
${request.originalFix}

Verification errors to fix:
${errorMessages}

Original code:
${request.context.originalCode}

Return the CORRECTED fixed code. Ensure all braces are balanced. No explanations.`;

    const response = await client.chat({
      systemPrompt,
      userPrompt,
      model: 'anthropic/claude-sonnet-4',
      temperature: 0.3,
      maxTokens: 2000,
    });

    // Clean the response using the same logic as generateAIFix
    const fixedCode = cleanAICodeResponse(response.content, request.context.originalCode);

    return fixedCode;
  };
}

// ============================================================================
// TYPES
// ============================================================================

export interface ScanFixConfig {
  /** Working directory (repository root) */
  workingDir: string;

  /** Language of the codebase */
  language: 'java' | 'typescript' | 'python' | 'go' | 'rust' | 'ruby' | 'php';

  /** Fix mode: what to do with applied fixes */
  outputMode: 'patch' | 'commit' | 'branch' | 'in-place';

  /** Whether to run in dry-run mode (don't actually apply fixes) */
  dryRun?: boolean;

  /** Which tiers to auto-apply */
  autoApplyTiers?: {
    tier1: boolean;  // Safe fixes (formatting, style)
    tier2: boolean;  // Technical fixes (unused code, imports)
    tier3: boolean;  // AI fixes (manual review recommended)
  };

  /** Branch name for 'branch' output mode */
  fixBranchName?: string;

  /** Commit message for 'commit' mode */
  commitMessage?: string;

  /** API key for Tier 3 AI fixes */
  tier3ApiKey?: string;

  /** Progress callback */
  onProgress?: (update: ScanFixProgress) => void;

  /** Verbose logging */
  verbose?: boolean;

  /** User tier: basic (classify only) or pro (auto-fix) */
  userTier?: 'basic' | 'pro';

  /** Apply Tier 3 fixes but flag for owner review (PRO only) */
  fixWithReview?: boolean;
}

export interface ScanFixProgress {
  phase: 'classifying' | 'routing' | 'executing' | 'generating-output' | 'complete';
  current: number;
  total: number;
  message: string;
  tool?: string;
}

export interface ScanFixResult {
  success: boolean;

  /** Whether fixes were actually executed (PRO) or only classified (BASIC) */
  fixesExecuted: boolean;

  /** Summary statistics */
  summary: {
    totalIssues: number;
    fixedIssues: number;
    failedIssues: number;
    skippedIssues: number;
    tier1Fixed: number;
    tier2Fixed: number;
    tier3Fixed: number;
    /** Issues available for IDE fix (BASIC tier or unfixable) */
    availableForIdeFix: number;
  };

  /** Files that were modified */
  modifiedFiles: string[];

  /** Path to generated patch file (if outputMode='patch') */
  patchFile?: string;

  /** Commit hash (if outputMode='commit') */
  commitHash?: string;

  /** Branch name (if outputMode='branch') */
  fixBranch?: string;

  /** Duration in milliseconds */
  durationMs: number;

  /** Detailed results per fixer */
  details: {
    tool: string;
    tier: 1 | 2 | 3;
    filesFixed: string[];
    issuesFixed: number;
    success: boolean;
    error?: string;
  }[];

  /** Issues that could not be fixed (for manual review) */
  manualReviewRequired: {
    file: string;
    line: number;
    rule: string;
    message: string;
    reason: string;
    /** Actionable guidance for the user (e.g., "run lerna bootstrap") */
    suggestedAction?: string;
    /** Category of the unfixable issue */
    category?: 'dependency' | 'environment' | 'configuration' | 'manual' | 'complex';
  }[];

  /** Issues fixed by AI but flagged for owner review (PRO with fixWithReview) */
  fixedButNeedsReview?: {
    file: string;
    line: number;
    rule: string;
    message: string;
    category: string;
    aiModel?: string;
    confidence?: number;
    /** The corrected code (for IDE integration) */
    correctedCode?: string;
  }[];
}

export interface DetectedIssue {
  file: string;
  line: number;
  column?: number;
  rule: string;
  tool: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'error' | 'warning' | 'info';
  category?: string;
  snippet?: string;
}

// ============================================================================
// DEFAULTS
// ============================================================================

const DEFAULT_CONFIG: Partial<ScanFixConfig> = {
  dryRun: false,
  outputMode: 'in-place',
  autoApplyTiers: {
    tier1: true,   // Always auto-apply safe fixes
    tier2: true,   // Auto-apply technical fixes
    tier3: false,  // Manual review for AI fixes by default
  },
  verbose: false,
};

// ============================================================================
// ACTIONABLE GUIDANCE HELPER
// ============================================================================

interface ActionableGuidance {
  reason: string;
  suggestedAction?: string;
  category: 'dependency' | 'environment' | 'configuration' | 'manual' | 'complex';
}

/**
 * Generates actionable guidance for unfixable issues.
 * Analyzes the issue type and provides user-friendly recommendations.
 */
function getActionableGuidance(
  issue: { rule: string; tool: string; message: string; file?: string },
  failureReason?: string
): ActionableGuidance {
  const { rule, tool, message, file } = issue;
  const msgLower = message.toLowerCase();
  const filePath = file || '';

  // 1. Missing TypeScript type definitions (TS2307 - Cannot find module)
  if (rule === 'TS2307' || (tool === 'typescript' && msgLower.includes('cannot find module'))) {
    // Extract module name from message like "Cannot find module 'module-name'"
    const moduleMatch = message.match(/['"](@?[\w/-]+)['"]/);
    const moduleName = moduleMatch?.[1];

    if (moduleName?.startsWith('@types/')) {
      return {
        reason: `Missing TypeScript type definitions for '${moduleName}'`,
        suggestedAction: `npm install --save-dev ${moduleName}`,
        category: 'dependency',
      };
    } else if (moduleName) {
      // Check if it's a scoped package or regular package
      const typesPackage = moduleName.startsWith('@')
        ? `@types/${moduleName.replace('@', '').replace('/', '__')}`
        : `@types/${moduleName}`;
      return {
        reason: `Missing module '${moduleName}' or its type definitions`,
        suggestedAction: `npm install ${moduleName} or npm install --save-dev ${typesPackage}`,
        category: 'dependency',
      };
    }
  }

  // 2. Monorepo / Lerna dependency issues
  if (
    (rule === 'TS2307' || rule === 'TS2305') &&
    (filePath.includes('packages/') || filePath.includes('libs/'))
  ) {
    return {
      reason: 'Cross-package dependency not resolved in monorepo',
      suggestedAction: 'Run: lerna bootstrap or npm run bootstrap to link packages',
      category: 'environment',
    };
  }

  // 3. TypeScript config issues
  if (rule === 'TS6059' || msgLower.includes('rootdir')) {
    return {
      reason: 'TypeScript project configuration issue (rootDir/outDir mismatch)',
      suggestedAction: 'Review tsconfig.json: Ensure rootDir, outDir, and include paths are correct',
      category: 'configuration',
    };
  }

  // 4. Missing globals (TS2580 - Cannot find name 'require', etc.)
  if (rule === 'TS2580' || rule === 'TS2304') {
    const nameMatch = message.match(/Cannot find name ['"](\w+)['"]/);
    const name = nameMatch?.[1];

    if (name === 'require' || name === 'module' || name === '__dirname') {
      return {
        reason: `Node.js global '${name}' not recognized (missing @types/node)`,
        suggestedAction: 'npm install --save-dev @types/node and add "node" to tsconfig compilerOptions.types',
        category: 'environment',
      };
    }

    if (name === 'describe' || name === 'it' || name === 'expect' || name === 'jest' || name === 'test') {
      return {
        reason: `Test framework global '${name}' not recognized`,
        suggestedAction: 'npm install --save-dev @types/jest (or @types/mocha) and add to tsconfig types',
        category: 'environment',
      };
    }
  }

  // 5. Dependency vulnerability issues
  if (tool === 'npm-audit' || tool === 'dependency-check' || tool === 'snyk') {
    const packageMatch = message.match(/Package:\s*(\S+)/i) ||
      message.match(/in\s+['"]?(\w[\w/-]*)/i);
    const packageName = packageMatch?.[1];

    if (packageName) {
      return {
        reason: `Security vulnerability in '${packageName}'`,
        suggestedAction: `npm audit fix or manually update ${packageName} to a patched version`,
        category: 'dependency',
      };
    }

    return {
      reason: 'Security vulnerability in dependency',
      suggestedAction: 'Run: npm audit fix --force (may have breaking changes) or review npm audit for details',
      category: 'dependency',
    };
  }

  // 6. Missing peer dependencies
  if (msgLower.includes('peer dep') || msgLower.includes('peerdependencies')) {
    return {
      reason: 'Missing peer dependency',
      suggestedAction: 'npm install with --legacy-peer-deps or manually install the required peer dependency',
      category: 'dependency',
    };
  }

  // 7. ESLint configuration issues
  if (tool === 'eslint' && (msgLower.includes('config') || msgLower.includes('parsing error'))) {
    return {
      reason: 'ESLint configuration or parsing issue',
      suggestedAction: 'Review .eslintrc configuration, ensure parser and plugins match project setup',
      category: 'configuration',
    };
  }

  // 8. File permission or access issues
  if (msgLower.includes('permission') || msgLower.includes('eacces')) {
    return {
      reason: 'File permission issue preventing fix',
      suggestedAction: 'Check file permissions and ensure write access to the target file',
      category: 'environment',
    };
  }

  // 9. Complex architectural issues that need human review
  if (
    msgLower.includes('complexity') ||
    msgLower.includes('architecture') ||
    msgLower.includes('design pattern')
  ) {
    return {
      reason: 'Complex architectural issue requiring human review',
      suggestedAction: 'This issue requires architectural decisions - review manually and apply appropriate design patterns',
      category: 'complex',
    };
  }

  // 10. Generic fallback based on tool type
  if (tool === 'typescript') {
    return {
      reason: failureReason || 'TypeScript type error that could not be automatically fixed',
      suggestedAction: 'Review the type definitions and ensure proper type annotations',
      category: 'manual',
    };
  }

  if (tool === 'semgrep') {
    return {
      reason: failureReason || 'Security pattern detected that requires manual review',
      suggestedAction: 'Review the code for potential security implications and apply appropriate fixes',
      category: 'manual',
    };
  }

  // Default fallback
  return {
    reason: failureReason || 'Issue could not be automatically fixed',
    suggestedAction: 'Review the issue manually and apply an appropriate fix based on project context',
    category: 'manual',
  };
}

// ============================================================================
// SCAN FIX EXECUTOR
// ============================================================================

/**
 * Scan-Time Fix Executor
 *
 * Executes fixes during the scan process, applying tool-based fixes directly.
 */
export class ScanFixExecutor {
  private config: Required<ScanFixConfig>;

  constructor(config: ScanFixConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      autoApplyTiers: {
        tier1: true,
        tier2: true,
        tier3: false,
      },
      fixBranchName: `codequal/fixes-${Date.now()}`,
      commitMessage: 'fix: Auto-fix code quality issues\n\n🤖 Generated by CodeQual',
      tier3ApiKey: process.env.OPENROUTER_API_KEY || '',
      onProgress: () => { /* no-op */ },
      ...config,
    } as Required<ScanFixConfig>;
  }

  /**
   * Execute fixes for detected issues
   *
   * BASIC tier: Classify issues only, generate LSP/SARIF for IDE
   * PRO tier: Execute Tier 1/2 fixes + AI Fixer for Tier 3 (with review flag)
   *
   * @param issues - Issues detected from tool orchestration
   * @returns Fix execution results
   */
  async executeFixes(issues: DetectedIssue[]): Promise<ScanFixResult> {
    const startTime = Date.now();
    const results: ScanFixResult['details'] = [];
    const manualReviewRequired: ScanFixResult['manualReviewRequired'] = [];
    const fixedButNeedsReview: ScanFixResult['fixedButNeedsReview'] = [];
    let totalFixed = 0;
    let totalFailed = 0;
    let totalSkipped = 0;
    let tier1Fixed = 0;
    let tier2Fixed = 0;
    let tier3Fixed = 0;

    const isPro = this.config.userTier === 'pro';

    // BASIC tier: Force dry-run mode to generate recommendations without applying fixes
    // This allows pattern lookup, fixer tools, and AI to generate correctedCode for LSP
    const effectiveDryRun = isPro ? this.config.dryRun : true;

    this.report({ phase: 'classifying', current: 0, total: issues.length, message: 'Classifying issues...' });

    // Step 1: Classify ALL issues
    // For BASIC tier, we still classify to generate recommendations
    const classifiedIssues = issues.map(issue => {
      const classification = classifyIssue(issue.rule, issue.tool);
      return {
        ...issue,
        classification,
        // For BASIC tier, shouldFix=true but in dry-run mode (recommendations only)
        shouldFix: isPro ? this.shouldFixIssue(classification) : true,
        shouldFixWithReview: isPro ? this.shouldFixWithReview(classification) : classification.fixTier === 3,
      };
    });

    // PRO tier: Separate issues by tier
    const tier1And2Issues = classifiedIssues.filter(
      i => i.shouldFix && i.classification.fixTier <= 2
    );
    const tier3WithReview = classifiedIssues.filter(
      i => i.shouldFixWithReview
    );
    const toSkip = classifiedIssues.filter(
      i => !i.shouldFix && !i.shouldFixWithReview
    );

    totalSkipped = toSkip.length;

    // Add skipped Tier 3 issues to manual review (if not using fixWithReview)
    for (const issue of toSkip) {
      if (issue.classification.fixTier === 3 && !this.config.fixWithReview) {
        const guidance = getActionableGuidance(issue, 'Tier 3 (AI) fixes disabled');
        manualReviewRequired.push({
          file: issue.file,
          line: issue.line,
          rule: issue.rule,
          message: issue.message,
          reason: 'Tier 3 (AI) fixes require manual review. Enable fixWithReview or tier3 auto-apply.',
          suggestedAction: guidance.suggestedAction,
          category: 'manual',
        });
      }
    }

    const totalToFix = tier1And2Issues.length + tier3WithReview.length;
    const actionType = isPro ? 'fixers' : 'recommendation generators';
    this.report({
      phase: 'routing',
      current: 0,
      total: totalToFix,
      message: `Routing ${totalToFix} issues to ${actionType} (${totalSkipped} skipped)...`
    });

    // Step 2: Execute Tier 1/2 fixes using orchestrator
    const tier1And2FixIssues: FixIssue[] = tier1And2Issues.map((issue, idx) => ({
      id: `issue-${idx}`,
      ruleId: issue.rule,
      tool: issue.tool,
      file: issue.file,
      line: issue.line,
      column: issue.column,
      message: issue.message,
      severity: this.normalizeSeverity(issue.severity),
    }));

    if (tier1And2FixIssues.length > 0) {
      this.report({
        phase: 'executing',
        current: 0,
        total: tier1And2FixIssues.length,
        message: `Executing ${tier1And2FixIssues.length} Tier 1/2 fixes...`
      });

      const orchestratorConfig: OrchestratorConfig = {
        workingDir: this.config.workingDir,
        dryRun: effectiveDryRun,  // BASIC tier: always dry-run for recommendations
        verbose: this.config.verbose,
        enableTier3Fallback: false,  // Don't use Tier 3 fallback here, we handle it separately
        tier3ApiKey: this.config.tier3ApiKey,
        onProgress: (update) => {
          this.report({
            phase: 'executing',
            current: update.progress,
            total: 100,
            message: isPro ? update.message : `[Recommendations] ${update.message}`,
            tool: update.tool,
          });
        },
      };

      const orchestrator = new FixOrchestrator(orchestratorConfig);
      await orchestrator.discoverTools();
      const orchResult = await orchestrator.executeAll(tier1And2FixIssues);

      // Aggregate Tier 1/2 results
      totalFixed += orchResult.fixedIssues;
      totalFailed += orchResult.failedIssues;
      tier1Fixed = orchResult.summary.tier1.fixed;
      tier2Fixed = orchResult.summary.tier2.fixed;

      // Map orchestrator results to our format
      for (const result of orchResult.results) {
        results.push({
          tool: result.tool,
          tier: this.getToolTier(result.tool),
          filesFixed: result.filesFixed,
          issuesFixed: result.issuesFixed,
          success: result.success,
          error: result.error,
        });
      }

      // Add failed fixes to manual review
      for (const result of orchResult.results) {
        if (!result.success && result.error) {
          const failedIssues = tier1And2FixIssues.filter(i => {
            const mappedTool = this.mapToolToFixer(i.tool);
            return mappedTool === result.tool;
          });

          for (const issue of failedIssues) {
            const guidance = getActionableGuidance(
              { rule: issue.ruleId, tool: issue.tool, message: issue.message, file: issue.file },
              result.error
            );
            manualReviewRequired.push({
              file: issue.file,
              line: issue.line,
              rule: issue.ruleId,
              message: issue.message,
              reason: `Fix failed: ${result.error}`,
              suggestedAction: guidance.suggestedAction,
              category: guidance.category,
            });
          }
        }
      }
    }

    // Step 2b: Execute Dependency Vulnerability fixes
    const dependencyIssues = classifiedIssues.filter(
      i => isDependencyVulnerability(i.tool, i.rule)
    );

    if (dependencyIssues.length > 0) {
      this.report({
        phase: 'executing',
        current: 0,
        total: dependencyIssues.length,
        message: `Fixing ${dependencyIssues.length} dependency vulnerabilities...`
      });

      const depFixer = getDependencyFixer();

      // Parse and collect vulnerabilities
      const vulnerabilities: DependencyVulnerability[] = [];
      for (const issue of dependencyIssues) {
        const vuln = depFixer.parseVulnerabilityFromMessage(
          issue.message,
          issue.rule,
          issue.severity
        );
        if (vuln) {
          vulnerabilities.push(vuln);
        }
      }

      if (vulnerabilities.length > 0) {
        const depResult = await depFixer.fixMultipleVulnerabilities(
          this.config.workingDir,
          vulnerabilities,
          { dryRun: effectiveDryRun, verbose: this.config.verbose }  // BASIC tier: dry-run for recommendations
        );

        if (depResult.success) {
          totalFixed += depResult.issuesFixed;
          tier1Fixed += depResult.issuesFixed; // Dependency fixes are Tier 1

          results.push({
            tool: 'dependency-fixer',
            tier: 1,
            filesFixed: depResult.filesFixed,
            issuesFixed: depResult.issuesFixed,
            success: true,
          });

          if (this.config.verbose) {
            console.log(`[ScanFixExecutor] Dependency fixes: ${depResult.issuesFixed} fixed, ${depResult.unfixable.length} unfixable`);
          }
        }

        // Add unfixable dependencies to manual review with actionable guidance
        for (const unfixable of depResult.unfixable) {
          const suggestedAction = unfixable.packageName
            ? `npm audit fix or manually update ${unfixable.packageName}. If no fix exists, consider: npm install ${unfixable.packageName}@latest --save`
            : 'Run npm audit for details and check for available patches';

          manualReviewRequired.push({
            file: 'package.json',
            line: 0,
            rule: unfixable.packageName,
            message: `Dependency vulnerability in ${unfixable.packageName}`,
            reason: unfixable.reason,
            suggestedAction,
            category: 'dependency',
          });
        }
      }
    }

    // Step 3: Execute Tier 3 AI fixes (with review flag)
    if (tier3WithReview.length > 0) {
      this.report({
        phase: 'executing',
        current: 0,
        total: tier3WithReview.length,
        message: `Executing ${tier3WithReview.length} Tier 3 AI fixes (flagged for review)...`
      });

      // Initialize AI client for fix generation
      const aiClient = getSimpleOpenRouterClient();
      const aiEnhancer = createAIEnhancer(aiClient);

      const aiVerifier = createAIFixerVerifier({
        maxAttempts: 3,
        minScore: 80,
        dryRun: effectiveDryRun,  // BASIC tier: dry-run for recommendations
        enhancer: aiEnhancer, // Provide AI enhancer for retry attempts
      });

      let aiFixed = 0;
      let aiFailed = 0;

      for (let i = 0; i < tier3WithReview.length; i++) {
        const issue = tier3WithReview[i];

        this.report({
          phase: 'executing',
          current: i + 1,
          total: tier3WithReview.length,
          message: `AI fixing: ${issue.rule} in ${issue.file}:${issue.line}`,
        });

        try {
          // Read the file content for context
          const filePath = path.join(this.config.workingDir, issue.file);
          const fileContent = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '';
          const lines = fileContent.split('\n');
          const snippetStart = Math.max(0, issue.line - 5);
          const snippetEnd = Math.min(lines.length, issue.line + 5);
          const codeSnippet = lines.slice(snippetStart, snippetEnd).join('\n');

          // Pre-filter false positives BEFORE attempting AI fix
          // This saves API calls and prevents AI from "fixing" non-existent issues
          // Two-stage validation: 1) Check full file for imports 2) Check local context for templates
          const validation = validateIssueIsReal(issue.rule, fileContent, codeSnippet, this.config.verbose);
          if (!validation.isValid) {
            if (this.config.verbose) {
              console.log(`[ScanFix] Skipping false positive: ${issue.rule} at ${issue.file}:${issue.line}`);
            }
            // Mark as skipped (not failed) - this is expected behavior
            totalSkipped++;
            manualReviewRequired.push({
              file: issue.file,
              line: issue.line,
              rule: issue.rule,
              message: issue.message,
              reason: validation.reason || 'Detected as false positive - code does not contain expected patterns',
              suggestedAction: 'This appears to be a false positive. If valid, consider suppressing with a rule-specific comment or updating tool configuration.',
              category: 'manual',
            });
            continue;  // Skip to next issue
          }

          // Check for intentional child_process usage (only for detect-child-process rules)
          // These are legitimate tool adapters, runners, etc. that NEED to execute shell commands
          if (issue.rule.toLowerCase().includes('child-process')) {
            const intentionalReason = detectIntentionalChildProcessUse(codeSnippet, issue.file);
            if (intentionalReason) {
              if (this.config.verbose) {
                console.log(`[ScanFix] Intentional child_process use: ${issue.file}:${issue.line} - ${intentionalReason}`);
              }
              // Mark for security review but don't try to auto-fix
              manualReviewRequired.push({
                file: issue.file,
                line: issue.line,
                rule: issue.rule,
                message: issue.message,
                reason: `INTENTIONAL USE (${intentionalReason}): This code intentionally uses child_process for legitimate functionality. Review for proper input validation, but do not remove the shell execution.`,
                suggestedAction: 'Review for proper input validation and sanitization. Consider using execFile() instead of exec() for better security.',
                category: 'manual',
              });
              totalSkipped++;
              continue;
            }
          }

          // OPTIMIZATION: Check for existing pattern BEFORE making AI API call
          // This is the critical cost-saving optimization - reuse patterns from Supabase
          const { getFixPatternRegistry } = await import('./fix-pattern-registry');
          const registry = getFixPatternRegistry();

          let patternApplied = false;
          let patternFixedCode = '';

          try {
            const existingPattern = await registry.lookup({
              ruleId: issue.rule,
              tool: issue.tool,
              activeOnly: true,
            });

            if (existingPattern.found && existingPattern.recommended) {
              const pattern = existingPattern.recommended;
              console.log(
                `[ScanFix:PatternReuse] Found pattern ${pattern.id.substring(0, 8)} for ${issue.rule} (confidence: ${pattern.confidence}%)`
              );

              // Try to apply the existing pattern
              const applyResult = await registry.apply({
                patternId: pattern.id,
                fileContent: codeSnippet,
                filePath: issue.file,
                lineNumber: issue.line,
              });

              if (applyResult.success && applyResult.fixedCode) {
                // Validate the pattern output before using it
                const patternValidation = validatePatternTemplate(pattern.fixTemplate?.template, applyResult.fixedCode);
                if (!patternValidation.isValid) {
                  console.log(`[ScanFix:PatternReuse] ❌ Invalid pattern detected: ${patternValidation.reason}`);
                  // Record failed application due to invalid pattern
                  await registry.recordApplication(pattern.id, false, false);
                  // Don't use this pattern - fall through to AI generation
                } else {
                  patternApplied = true;
                  patternFixedCode = applyResult.fixedCode;
                  console.log(`[ScanFix:PatternReuse] ✅ Pattern applied successfully - NO API CALL NEEDED`);

                  // Record successful application
                  await registry.recordApplication(pattern.id, true, false);

                  // Count as fixed
                  aiFixed++;
                  tier3Fixed++;
                  totalFixed++;

                  // Add to fixedButNeedsReview with correctedCode for IDE integration
                  fixedButNeedsReview!.push({
                    file: issue.file,
                    line: issue.line,
                    rule: issue.rule,
                    message: issue.message,
                    category: issue.classification.issueType,
                    aiModel: 'pattern-reuse',
                    confidence: pattern.confidence,
                    correctedCode: patternFixedCode,  // Include fix code for LSP
                  });

                  results.push({
                    tool: 'pattern-reuse',
                    tier: 3,
                    filesFixed: [issue.file],
                    issuesFixed: 1,
                    success: true,
                  });

                  continue; // Skip to next issue - no AI API call needed!
                }
              } else {
                // DEBUG: Why did pattern apply fail?
                console.log(`[ScanFix:PatternReuse] ❌ Pattern apply FAILED for ${issue.rule}: ${applyResult.error || 'No fixedCode returned (success=' + applyResult.success + ')'}`);
              }
            }
          } catch (patternError) {
            // Pattern lookup failed, continue with AI generation
            console.debug(`[ScanFix:PatternReuse] Pattern lookup failed: ${(patternError as Error).message}`);
          }

          // Only generate AI fix if pattern reuse failed
          let initialFix = '';
          try {
            initialFix = await generateAIFix(
              aiClient,
              issue.rule,
              issue.tool,
              codeSnippet,
              issue.message,
              issue.file,
              issue.line
            );
          } catch (genError) {
            console.log(`[ScanFix] AI generation failed for ${issue.rule}: ${(genError as Error).message}`);
            // Continue with empty fix - verifier will fail and we'll report it
          }

          // Verify and submit the fix (this also saves the pattern for future reuse)
          const result = await aiVerifier.verifyAndSubmit({
            ruleId: issue.rule,
            tool: issue.tool,
            filePath: issue.file,
            originalCode: codeSnippet,
            fixedCode: initialFix, // Use AI-generated fix
            lineNumber: issue.line,
            issueMessage: issue.message,
            aiModel: 'anthropic/claude-sonnet-4',
            attemptNumber: 1,
          });

          if (result.success && result.verifiedFix) {
            aiFixed++;
            tier3Fixed++;
            totalFixed++;

            // Add to fixedButNeedsReview with correctedCode for IDE integration
            fixedButNeedsReview!.push({
              file: issue.file,
              line: issue.line,
              rule: issue.rule,
              message: issue.message,
              category: issue.classification.issueType,
              aiModel: 'claude-sonnet-4-20250514',
              confidence: result.patternResponse?.pattern?.confidence,
              correctedCode: result.verifiedFix,  // Include fix code for LSP (verifiedFix is the code string)
            });

            results.push({
              tool: 'ai-fixer',
              tier: 3,
              filesFixed: [issue.file],
              issuesFixed: 1,
              success: true,
            });
          } else {
            aiFailed++;
            totalFailed++;

            // AI couldn't fix - add to manual review with actionable guidance
            const guidance = getActionableGuidance(issue, result.userMessage);
            manualReviewRequired.push({
              file: issue.file,
              line: issue.line,
              rule: issue.rule,
              message: issue.message,
              reason: result.userMessage || 'AI fix failed after multiple attempts. Manual fix required.',
              suggestedAction: guidance.suggestedAction,
              category: guidance.category,
            });
          }
        } catch (error) {
          aiFailed++;
          totalFailed++;
          const guidance = getActionableGuidance(issue, (error as Error).message);
          manualReviewRequired.push({
            file: issue.file,
            line: issue.line,
            rule: issue.rule,
            message: issue.message,
            reason: `AI fix error: ${(error as Error).message}`,
            suggestedAction: guidance.suggestedAction,
            category: guidance.category,
          });
        }
      }

      if (this.config.verbose) {
        console.log(`[ScanFix] AI Fixer results: ${aiFixed} fixed, ${aiFailed} failed`);
      }
    }

    // Step 3b: BASIC tier pattern lookup for Tier 1/2 issues
    // For BASIC tier, Tier 1/2 issues went through orchestrator but didn't produce correctedCode
    // Try pattern lookup to generate recommendations for IDE integration
    if (!isPro && tier1And2Issues.length > 0) {
      this.report({
        phase: 'executing',
        current: 0,
        total: tier1And2Issues.length,
        message: `Looking up patterns for ${tier1And2Issues.length} Tier 1/2 issues (BASIC tier)...`
      });

      const { getFixPatternRegistry } = await import('./fix-pattern-registry');
      const registry = getFixPatternRegistry();

      let patternHits = 0;
      let patternMisses = 0;

      for (let i = 0; i < tier1And2Issues.length; i++) {
        const issue = tier1And2Issues[i];

        try {
          const existingPattern = await registry.lookup({
            ruleId: issue.rule,
            tool: issue.tool,
            activeOnly: true,
          });

          if (existingPattern.found && existingPattern.recommended) {
            const pattern = existingPattern.recommended;

            // Read file content for pattern application
            const filePath = path.join(this.config.workingDir, issue.file);
            const fileContent = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '';
            const lines = fileContent.split('\n');
            const snippetStart = Math.max(0, issue.line - 5);
            const snippetEnd = Math.min(lines.length, issue.line + 5);
            const codeSnippet = lines.slice(snippetStart, snippetEnd).join('\n');

            // Try to apply the pattern
            const applyResult = await registry.apply({
              patternId: pattern.id,
              fileContent: codeSnippet,
              filePath: issue.file,
              lineNumber: issue.line,
            });

            if (applyResult.success && applyResult.fixedCode) {
              // Validate the pattern output before using it
              const patternValidation = validatePatternTemplate(pattern.fixTemplate?.template, applyResult.fixedCode);
              if (!patternValidation.isValid) {
                if (this.config.verbose) {
                  console.log(`[ScanFix:BASIC] ❌ Invalid pattern for ${issue.rule}: ${patternValidation.reason}`);
                }
                patternMisses++;
                // Add to manual review with the validation failure reason
                manualReviewRequired.push({
                  file: issue.file,
                  line: issue.line,
                  rule: issue.rule,
                  message: issue.message,
                  reason: `Pattern validation failed: ${patternValidation.reason}`,
                  suggestedAction: 'Manual review required - cached pattern is invalid and needs regeneration.',
                  category: 'manual',
                });
              } else {
                patternHits++;

                // Add to fixedButNeedsReview with correctedCode for IDE integration
                fixedButNeedsReview!.push({
                  file: issue.file,
                  line: issue.line,
                  rule: issue.rule,
                  message: issue.message,
                  category: issue.classification.issueType,
                  aiModel: 'pattern-cache',
                  confidence: pattern.confidence,
                  correctedCode: applyResult.fixedCode,
                });

                // Count as fixed (for summary purposes - no actual file changes in BASIC tier)
                totalFixed++;
                if (issue.classification.fixTier === 1) tier1Fixed++;
                else if (issue.classification.fixTier === 2) tier2Fixed++;
              }
            } else {
              patternMisses++;
            }
          } else {
            patternMisses++;
          }
        } catch (patternError) {
          patternMisses++;
          if (this.config.verbose) {
            console.debug(`[ScanFix:BASIC] Pattern lookup failed for ${issue.rule}: ${(patternError as Error).message}`);
          }
        }
      }

      if (this.config.verbose) {
        console.log(`[ScanFix:BASIC] Pattern lookup results: ${patternHits} hits, ${patternMisses} misses`);
      }
    }

    // Step 4: Generate output (patch, commit, or branch)
    this.report({
      phase: 'generating-output',
      current: 0,
      total: 1,
      message: 'Generating output...'
    });

    let patchFile: string | undefined;
    let commitHash: string | undefined;
    let fixBranch: string | undefined;

    // Only generate output (commits, patches) for PRO tier with dryRun=false
    if (totalFixed > 0 && !effectiveDryRun) {
      const output = await this.generateOutput();
      patchFile = output.patchFile;
      commitHash = output.commitHash;
      fixBranch = output.fixBranch;
    }

    // Get list of modified files (or files with recommendations for BASIC)
    const modifiedFiles = results
      .flatMap(r => r.filesFixed)
      .filter((f, i, arr) => arr.indexOf(f) === i);  // Unique

    // Calculate available for IDE fix
    // For BASIC tier: all issues with recommendations are available for IDE fix
    const availableForIdeFix = isPro
      ? totalSkipped + totalFailed
      : issues.length;

    const tierLabel = isPro ? 'fixed' : 'recommendations generated';
    this.report({
      phase: 'complete',
      current: 1,
      total: 1,
      message: `Complete: ${totalFixed} ${tierLabel}, ${totalFailed} failed, ${totalSkipped} skipped`
    });

    return {
      success: totalFailed === 0,
      fixesExecuted: !effectiveDryRun,  // BASIC tier: false (recommendations only)
      summary: {
        totalIssues: issues.length,
        fixedIssues: totalFixed,
        failedIssues: totalFailed,
        skippedIssues: totalSkipped,
        tier1Fixed,
        tier2Fixed,
        tier3Fixed,
        availableForIdeFix,
      },
      modifiedFiles,
      patchFile,
      commitHash,
      fixBranch,
      durationMs: Date.now() - startTime,
      details: results,
      manualReviewRequired,
      fixedButNeedsReview,
    };
  }

  /**
   * Determine if an issue should be fixed based on tier and config
   *
   * PRO tier logic:
   * - Tier 1/2: Use autoApplyTiers setting
   * - Tier 3: If fixWithReview=true, attempt AI fix and flag for review
   *
   * BASIC tier logic:
   * - Don't execute fixes, only classify for IDE
   */
  private shouldFixIssue(classification: ClassifiedIssue): boolean {
    // BASIC tier: classify only, no fixes executed
    if (this.config.userTier === 'basic') {
      return false;
    }

    const tier = classification.fixTier;

    if (tier === 1) return this.config.autoApplyTiers.tier1;
    if (tier === 2) return this.config.autoApplyTiers.tier2;
    if (tier === 3) {
      // PRO tier with fixWithReview: attempt AI fix and flag for review
      if (this.config.fixWithReview) {
        return true;  // Will use AI fixer
      }
      return this.config.autoApplyTiers.tier3;
    }

    return false;
  }

  /**
   * Check if issue should be fixed with AI and flagged for review
   */
  private shouldFixWithReview(classification: ClassifiedIssue): boolean {
    return (
      this.config.userTier === 'pro' &&
      this.config.fixWithReview === true &&
      classification.fixTier === 3 &&
      !this.config.autoApplyTiers.tier3
    );
  }

  /**
   * Normalize severity to orchestrator format
   */
  private normalizeSeverity(severity: string): 'error' | 'warning' | 'info' {
    if (['critical', 'high', 'error'].includes(severity)) return 'error';
    if (['medium', 'warning'].includes(severity)) return 'warning';
    return 'info';
  }

  /**
   * Get tier for a tool
   */
  private getToolTier(tool: string): 1 | 2 | 3 {
    const tier1Tools = ['eslint', 'prettier', 'ruff', 'ruff-format', 'gofmt', 'goimports',
      'golangci-lint', 'rustfmt', 'clippy', 'rubocop', 'phpcbf', 'swiftlint', 'ktlint'];
    const tier2Tools = ['sorald', 'openrewrite', 'autoflake', 'pyupgrade', 'isort', 'black',
      'clang-tidy', 'clang-format', 'dotnet-format'];

    if (tier1Tools.includes(tool)) return 1;
    if (tier2Tools.includes(tool)) return 2;
    return 3;
  }

  /**
   * Map detection tool to fixer tool
   */
  private mapToolToFixer(detectionTool: string): string {
    const toolMap: Record<string, string> = {
      // JS/TS
      'eslint': 'eslint',
      'typescript-eslint': 'eslint',
      'prettier': 'prettier',
      'tsc': 'eslint',
      // Python
      'ruff': 'ruff',
      'pylint': 'ruff',
      'bandit': 'ruff',
      'mypy': 'ruff',
      // Java
      'pmd': 'sorald',
      'checkstyle': 'sorald',
      'spotbugs': 'sorald',
      // Go
      'golangci-lint': 'golangci-lint',
      'gosec': 'golangci-lint',
      // Rust
      'clippy': 'clippy',
      // Ruby
      'rubocop': 'rubocop',
      // PHP
      'phpcs': 'phpcbf',
    };

    return toolMap[detectionTool.toLowerCase()] || 'ai';
  }

  /**
   * Generate output based on outputMode
   */
  private async generateOutput(): Promise<{
    patchFile?: string;
    commitHash?: string;
    fixBranch?: string;
  }> {
    const { workingDir, outputMode, fixBranchName, commitMessage } = this.config;

    if (outputMode === 'in-place') {
      // Files already modified, nothing more to do
      return {};
    }

    if (outputMode === 'patch') {
      // Generate unified patch
      const patchPath = path.join(workingDir, 'codequal-fixes.patch');
      try {
        const patch = execSync('git diff', {
          cwd: workingDir,
          encoding: 'utf-8',
          maxBuffer: 50 * 1024 * 1024,
        });
        fs.writeFileSync(patchPath, patch);
        return { patchFile: patchPath };
      } catch (error) {
        console.error('Failed to generate patch:', error);
        return {};
      }
    }

    if (outputMode === 'commit') {
      // Commit changes
      try {
        execSync('git add -A', { cwd: workingDir, stdio: 'pipe' });
        const result = execSync(`git commit -m "${commitMessage}"`, {
          cwd: workingDir,
          encoding: 'utf-8',
        });
        const hashMatch = result.match(/\[[\w-]+\s+([a-f0-9]+)\]/);
        const hash = hashMatch ? hashMatch[1] : undefined;
        return { commitHash: hash };
      } catch (error) {
        console.error('Failed to commit:', error);
        return {};
      }
    }

    if (outputMode === 'branch') {
      // Create new branch with fixes
      try {
        execSync(`git checkout -b ${fixBranchName}`, { cwd: workingDir, stdio: 'pipe' });
        execSync('git add -A', { cwd: workingDir, stdio: 'pipe' });
        execSync(`git commit -m "${commitMessage}"`, { cwd: workingDir, stdio: 'pipe' });
        return { fixBranch: fixBranchName };
      } catch (error) {
        console.error('Failed to create fix branch:', error);
        return {};
      }
    }

    return {};
  }

  /**
   * Report progress
   */
  private report(update: ScanFixProgress): void {
    this.config.onProgress(update);
    if (this.config.verbose) {
      console.log(`[ScanFix] ${update.phase}: ${update.message}`);
    }
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick helper to execute fixes on detected issues
 */
export async function executeScanFixes(
  issues: DetectedIssue[],
  workingDir: string,
  language: ScanFixConfig['language'],
  options?: Partial<ScanFixConfig>
): Promise<ScanFixResult> {
  const executor = new ScanFixExecutor({
    workingDir,
    language,
    outputMode: 'in-place',
    ...options,
  });

  return executor.executeFixes(issues);
}

/**
 * Execute fixes and generate patch file
 */
export async function executeScanFixesWithPatch(
  issues: DetectedIssue[],
  workingDir: string,
  language: ScanFixConfig['language'],
  options?: Partial<ScanFixConfig>
): Promise<ScanFixResult> {
  const executor = new ScanFixExecutor({
    workingDir,
    language,
    outputMode: 'patch',
    ...options,
  });

  return executor.executeFixes(issues);
}
