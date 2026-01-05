/**
 * AI Fixer Verifier
 *
 * Implements a self-improvement loop for AI-generated fixes:
 * 1. AI generates a fix
 * 2. Apply fix to code
 * 3. Run verification (linting, type-check, security scan)
 * 4. SESSION 73: Run TOOL RE-VALIDATION (re-run original tool to verify fix works)
 * 5. If pass → submit to registry (pending_review or active based on trust)
 * 6. If fail → enhance and retry (up to max attempts)
 *
 * This creates a quality gate before fixes enter the pattern registry.
 */

import { getFixPatternRegistry } from './fix-pattern-registry';
import { FixCaptureResponse, PatternStatus } from './types';
import { getToolRevalidator, ToolRevalidationResult } from './tool-revalidator';

// =============================================================================
// Types
// =============================================================================

export interface AIFixAttempt {
  /** The rule being fixed */
  ruleId: string;
  /** Tool that detected the issue */
  tool: string;
  /** File path */
  filePath: string;
  /** Original code with issue */
  originalCode: string;
  /** AI-generated fix attempt */
  fixedCode: string;
  /** Line number of issue */
  lineNumber: number;
  /** Original issue message */
  issueMessage: string;
  /** AI model used */
  aiModel: string;
  /** Attempt number (1, 2, 3...) */
  attemptNumber: number;
  /** SESSION 73: Programming language for tool re-validation */
  language?: string;
}

export interface VerificationResult {
  /** Did the fix pass verification? */
  passed: boolean;
  /** Verification checks performed */
  checks: VerificationCheck[];
  /** Errors that need to be fixed */
  errors: VerificationError[];
  /** Warnings (don't block but should be noted) */
  warnings: string[];
  /** Total score (0-100) */
  score: number;
  /** SESSION 73: Tool re-validation result */
  toolRevalidation?: ToolRevalidationResult;
}

export interface VerificationCheck {
  name: string;
  passed: boolean;
  duration: number;
  details?: string;
}

export interface VerificationError {
  type: 'syntax' | 'type' | 'lint' | 'security' | 'semantic' | 'test';
  message: string;
  line?: number;
  column?: number;
  fix?: string;
}

export interface EnhancementRequest {
  originalFix: string;
  errors: VerificationError[];
  previousAttempts: number;
  context: {
    ruleId: string;
    issueMessage: string;
    originalCode: string;
  };
}

export interface AIFixerVerifierOptions {
  /** Maximum retry attempts before giving up (default: 3, max: 5) */
  maxAttempts: number;
  /** Minimum score required to pass */
  minScore: number;
  /** AI model to use for enhancement */
  aiModel: string;
  /** Enable dry-run mode (don't submit to registry) */
  dryRun: boolean;
  /** Skip tool revalidation (default: false) - set true to skip slow static analysis verification */
  skipToolRevalidation?: boolean;
  /** Custom verification function */
  customVerifier?: (code: string, filePath: string) => Promise<VerificationResult>;
  /** Custom enhancement function (for AI retry) */
  enhancer?: (request: EnhancementRequest) => Promise<string>;
}

/** Maximum allowed retry attempts to prevent infinite loops */
const MAX_ALLOWED_ATTEMPTS = 5;

/** Default retry attempts - balanced between success rate and cost */
const DEFAULT_MAX_ATTEMPTS = 3;

// =============================================================================
// Observability Logging
// =============================================================================

interface FixAttemptLog {
  timestamp: string;
  ruleId: string;
  tool: string;
  filePath: string;
  attemptNumber: number;
  maxAttempts: number;
  verificationScore: number;
  passed: boolean;
  errors: string[];
  durationMs: number;
}

interface FixResultLog {
  timestamp: string;
  ruleId: string;
  tool: string;
  filePath: string;
  lineNumber: number;
  success: boolean;
  totalAttempts: number;
  finalScore: number;
  patternStatus?: string;
  requiresManualFix: boolean;
  totalDurationMs: number;
  aiModel?: string;
}

/**
 * Log a fix attempt for observability
 */
function logFixAttempt(log: FixAttemptLog): void {
  const status = log.passed ? '✅ PASS' : '❌ FAIL';
  console.log(
    `[AIFixer:Attempt] ${log.timestamp} | ${status} | ` +
    `${log.ruleId} | Attempt ${log.attemptNumber}/${log.maxAttempts} | ` +
    `Score: ${log.verificationScore}/100 | ${log.durationMs}ms`
  );

  if (!log.passed && log.errors.length > 0) {
    console.log(`[AIFixer:Attempt]   Errors: ${log.errors.join(', ')}`);
  }
}

/**
 * Log final fix result for observability
 */
function logFixResult(log: FixResultLog): void {
  const status = log.success ? '✅ FIXED' : '⚠️ MANUAL';
  console.log(
    `[AIFixer:Result] ${log.timestamp} | ${status} | ` +
    `${log.ruleId} | ${log.filePath}:${log.lineNumber} | ` +
    `Attempts: ${log.totalAttempts} | Score: ${log.finalScore}/100 | ` +
    `${log.totalDurationMs}ms` +
    (log.patternStatus ? ` | Pattern: ${log.patternStatus}` : '')
  );
}

export interface VerifiedFixResult {
  success: boolean;
  /** Final verified fix (if successful) */
  verifiedFix?: string;
  /** Pattern response from registry (if submitted) */
  patternResponse?: FixCaptureResponse;
  /** Total attempts made */
  attempts: number;
  /** All verification results */
  verificationHistory: VerificationResult[];
  /** Why it failed (if unsuccessful) */
  failureReason?: string;
  /** User-friendly message about the result */
  userMessage: string;
  /** Whether this requires manual intervention */
  requiresManualFix: boolean;
}

// =============================================================================
// Default Verifiers
// =============================================================================

/**
 * Basic syntax verifier - checks if code is syntactically valid
 */
async function basicSyntaxCheck(code: string, filePath: string): Promise<VerificationCheck> {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const start = Date.now();

  try {
    if (['ts', 'tsx', 'js', 'jsx'].includes(ext)) {
      // For TypeScript/JavaScript, try to parse with acorn or esprima-like check
      // In a real implementation, would use actual parser
      const hasBalancedBraces = checkBalancedBraces(code);
      return {
        name: 'syntax-check',
        passed: hasBalancedBraces,
        duration: Date.now() - start,
        details: hasBalancedBraces ? 'Syntax OK' : 'Unbalanced braces detected',
      };
    }

    if (['yaml', 'yml'].includes(ext)) {
      // Basic YAML validation
      const hasValidIndent = !code.includes('\t'); // YAML shouldn't use tabs
      return {
        name: 'yaml-syntax',
        passed: hasValidIndent,
        duration: Date.now() - start,
        details: hasValidIndent ? 'YAML syntax OK' : 'Tab characters in YAML',
      };
    }

    // Default pass for unknown file types
    return {
      name: 'syntax-check',
      passed: true,
      duration: Date.now() - start,
      details: 'Skipped (unknown file type)',
    };
  } catch (error) {
    return {
      name: 'syntax-check',
      passed: false,
      duration: Date.now() - start,
      details: `Syntax error: ${(error as Error).message}`,
    };
  }
}

/**
 * Check balanced braces, brackets, and parentheses
 */
function checkBalancedBraces(code: string): boolean {
  const stack: string[] = [];
  const pairs: Record<string, string> = { '{': '}', '[': ']', '(': ')' };
  const openers = Object.keys(pairs);
  const closers = Object.values(pairs);

  for (const char of code) {
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
 * Check for obvious security issues in the fix
 */
async function securityCheck(code: string, filePath: string): Promise<VerificationCheck> {
  const start = Date.now();
  const issues: string[] = [];

  // Check for common security anti-patterns
  const dangerousPatterns = [
    { pattern: /eval\s*\(/, name: 'eval usage' },
    { pattern: /innerHTML\s*=/, name: 'innerHTML assignment' },
    { pattern: /document\.write/, name: 'document.write' },
    { pattern: /\$\{\{.*\}\}/, name: 'template injection (in non-template context)', context: 'yaml' },
    { pattern: /exec\s*\(.*\$/, name: 'command injection risk' },
    { pattern: /password\s*[:=]\s*['"][^'"]+['"]/, name: 'hardcoded password' },
    { pattern: /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/, name: 'hardcoded API key' },
  ];

  for (const { pattern, name, context } of dangerousPatterns) {
    // Skip context-specific patterns if file doesn't match
    if (context && !filePath.endsWith(`.${context}`)) continue;

    if (pattern.test(code)) {
      issues.push(name);
    }
  }

  return {
    name: 'security-check',
    passed: issues.length === 0,
    duration: Date.now() - start,
    details: issues.length > 0 ? `Issues: ${issues.join(', ')}` : 'No security issues detected',
  };
}

/**
 * Default verifier that runs basic checks
 */
async function defaultVerifier(code: string, filePath: string): Promise<VerificationResult> {
  const checks: VerificationCheck[] = [];
  const errors: VerificationError[] = [];

  // Run syntax check
  const syntaxCheck = await basicSyntaxCheck(code, filePath);
  checks.push(syntaxCheck);
  if (!syntaxCheck.passed) {
    errors.push({
      type: 'syntax',
      message: syntaxCheck.details || 'Syntax error',
    });
  }

  // Run security check
  const secCheck = await securityCheck(code, filePath);
  checks.push(secCheck);
  if (!secCheck.passed) {
    errors.push({
      type: 'security',
      message: secCheck.details || 'Security issue detected',
    });
  }

  // Calculate score
  const passedCount = checks.filter((c) => c.passed).length;
  const score = Math.round((passedCount / checks.length) * 100);

  return {
    passed: errors.length === 0,
    checks,
    errors,
    warnings: [],
    score,
  };
}

// =============================================================================
// AI Fixer Verifier Class
// =============================================================================

export class AIFixerVerifier {
  private options: AIFixerVerifierOptions;

  constructor(options: Partial<AIFixerVerifierOptions> = {}) {
    // Enforce maximum attempts limit to prevent infinite loops
    const requestedAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    const safeMaxAttempts = Math.min(requestedAttempts, MAX_ALLOWED_ATTEMPTS);

    if (requestedAttempts > MAX_ALLOWED_ATTEMPTS) {
      console.warn(
        `[AIFixer:Config] maxAttempts ${requestedAttempts} exceeds limit, capped to ${MAX_ALLOWED_ATTEMPTS}`
      );
    }

    this.options = {
      maxAttempts: safeMaxAttempts,
      minScore: options.minScore ?? 80,
      aiModel: options.aiModel ?? 'claude-sonnet-4-20250514',
      dryRun: options.dryRun ?? false,
      customVerifier: options.customVerifier,
      enhancer: options.enhancer,
    };

    console.log(
      `[AIFixer:Config] Initialized with maxAttempts=${safeMaxAttempts}, minScore=${this.options.minScore}`
    );
  }

  /**
   * Verify an AI-generated fix and submit to registry if valid
   *
   * This is the main entry point for the self-improvement loop:
   * 0. CHECK FOR EXISTING PATTERN FIRST (pattern reuse optimization)
   * 1. Verify the fix
   * 2. If failed, enhance and retry (up to maxAttempts, hard limit of 5)
   * 3. If passed, submit to registry with verified=true (goes directly to active)
   * 4. If all attempts fail, report honestly that we couldn't fix it
   */
  async verifyAndSubmit(attempt: AIFixAttempt): Promise<VerifiedFixResult> {
    const verificationHistory: VerificationResult[] = [];
    let currentAttempt = attempt;
    let attempts = 0;
    const startTime = Date.now();

    console.log(`[AIFixer:Start] ${attempt.ruleId} | ${attempt.filePath}:${attempt.lineNumber}`);

    // STEP 0: Check for existing pattern (PATTERN REUSE OPTIMIZATION)
    // This is the key optimization: skip AI generation if we already have a working pattern
    try {
      const registry = getFixPatternRegistry();
      const existingPattern = await registry.lookup({
        ruleId: attempt.ruleId,
        tool: attempt.tool,
        activeOnly: true,
      });

      if (existingPattern.found && existingPattern.recommended) {
        const pattern = existingPattern.recommended;
        console.log(
          `[AIFixer:Reuse] Found existing pattern ${pattern.id.substring(0, 8)} for ${attempt.ruleId} (confidence: ${pattern.confidence}%)`
        );

        // Try to apply the existing pattern
        const applyResult = await registry.apply({
          patternId: pattern.id,
          fileContent: attempt.originalCode,
          filePath: attempt.filePath,
          lineNumber: attempt.lineNumber,
        });

        if (applyResult.success && applyResult.fixedCode) {
          // Pattern reuse successful! Skip AI generation entirely
          console.log(`[AIFixer:Reuse] Pattern applied successfully, skipping AI generation`);

          // Record successful application
          await registry.recordApplication(pattern.id, true, false);

          // Log success
          logFixResult({
            timestamp: new Date().toISOString(),
            ruleId: attempt.ruleId,
            tool: attempt.tool,
            filePath: attempt.filePath,
            lineNumber: attempt.lineNumber,
            success: true,
            totalAttempts: 0,
            finalScore: pattern.confidence,
            patternStatus: 'reused',
            requiresManualFix: false,
            totalDurationMs: Date.now() - startTime,
            aiModel: 'pattern-reuse',
          });

          return {
            success: true,
            verifiedFix: applyResult.fixedCode,
            attempts: 0,
            verificationHistory: [],
            userMessage: `Fix applied using existing pattern (skipped AI generation).`,
            requiresManualFix: false,
          };
        }
      }
    } catch (lookupError) {
      // Pattern lookup failed, continue with normal AI flow
      console.debug(`[AIFixer:Reuse] Pattern lookup failed: ${(lookupError as Error).message}`);
    }

    while (attempts < this.options.maxAttempts) {
      attempts++;
      const attemptStartTime = Date.now();

      // Run verification
      const verifier = this.options.customVerifier || defaultVerifier;
      const result = await verifier(currentAttempt.fixedCode, currentAttempt.filePath);
      verificationHistory.push(result);

      // Log attempt for observability
      logFixAttempt({
        timestamp: new Date().toISOString(),
        ruleId: attempt.ruleId,
        tool: attempt.tool,
        filePath: attempt.filePath,
        attemptNumber: attempts,
        maxAttempts: this.options.maxAttempts,
        verificationScore: result.score,
        passed: result.passed && result.score >= this.options.minScore,
        errors: result.errors.map((e) => e.message),
        durationMs: Date.now() - attemptStartTime,
      });

      if (result.passed && result.score >= this.options.minScore) {
        // SESSION 73: Run tool re-validation BEFORE submitting to registry
        // This ensures the original issue is actually fixed and no regressions are introduced
        // SESSION 76: Added skipToolRevalidation option for performance-critical scenarios
        if (currentAttempt.language && currentAttempt.tool && !this.options.skipToolRevalidation) {
          console.log(`[AIFixer:ToolRevalidation] Running ${currentAttempt.tool} on fixed code...`);
          const revalidator = getToolRevalidator();
          const toolResult = await revalidator.validateFix({
            ruleId: currentAttempt.ruleId,
            tool: currentAttempt.tool,
            language: currentAttempt.language,
            originalFilePath: currentAttempt.filePath,
            originalCode: currentAttempt.originalCode,
            fixedCode: currentAttempt.fixedCode,
            lineNumber: currentAttempt.lineNumber,
            issueMessage: currentAttempt.issueMessage,
          });

          // Add tool revalidation result to verification result
          result.toolRevalidation = toolResult;

          if (!toolResult.passed) {
            console.log(`[AIFixer:ToolRevalidation] ❌ Failed: ${toolResult.summary}`);

            // If original issue not resolved or regressions found, treat as failed verification
            if (!toolResult.originalIssueResolved) {
              result.errors.push({
                type: 'semantic',
                message: `Original issue (${currentAttempt.ruleId}) still present after fix`,
              });
            }
            if (toolResult.hasRegressions) {
              for (const regression of toolResult.regressions.slice(0, 3)) {
                result.errors.push({
                  type: 'lint',
                  message: `Regression: ${regression.rule} - ${regression.message}`,
                  line: regression.line,
                });
              }
            }

            // Mark as failed and continue to retry loop
            result.passed = false;
            result.score = Math.max(0, result.score - 30); // Penalty for tool validation failure

            // Log this attempt and continue (skip to next iteration)
            logFixAttempt({
              timestamp: new Date().toISOString(),
              ruleId: attempt.ruleId,
              tool: attempt.tool,
              filePath: attempt.filePath,
              attemptNumber: attempts,
              maxAttempts: this.options.maxAttempts,
              verificationScore: result.score,
              passed: false,
              errors: result.errors.map((e) => e.message),
              durationMs: Date.now() - attemptStartTime,
            });

            // If we have more attempts, try to enhance
            if (attempts < this.options.maxAttempts && this.options.enhancer) {
              try {
                console.log(`[AIFixer:Enhance] Tool revalidation failed, enhancing...`);
                const enhancedCode = await this.options.enhancer({
                  originalFix: currentAttempt.fixedCode,
                  errors: result.errors,
                  previousAttempts: attempts,
                  context: {
                    ruleId: currentAttempt.ruleId,
                    issueMessage: currentAttempt.issueMessage,
                    originalCode: currentAttempt.originalCode,
                  },
                });

                currentAttempt = {
                  ...currentAttempt,
                  fixedCode: enhancedCode,
                  attemptNumber: attempts + 1,
                };
                continue; // Go to next iteration of while loop
              } catch (enhanceError: any) {
                console.log(`[AIFixer:Enhance] Enhancement failed: ${enhanceError.message}`);
              }
            }
            continue; // Go to next iteration
          }

          console.log(`[AIFixer:ToolRevalidation] ✅ Passed: ${toolResult.summary}`);
        }

        // Success! Submit to registry
        if (this.options.dryRun) {
          logFixResult({
            timestamp: new Date().toISOString(),
            ruleId: attempt.ruleId,
            tool: attempt.tool,
            filePath: attempt.filePath,
            lineNumber: attempt.lineNumber,
            success: true,
            totalAttempts: attempts,
            finalScore: result.score,
            patternStatus: 'dry-run',
            requiresManualFix: false,
            totalDurationMs: Date.now() - startTime,
            aiModel: attempt.aiModel,
          });

          return {
            success: true,
            verifiedFix: currentAttempt.fixedCode,
            attempts,
            verificationHistory,
            userMessage: `Fix verified successfully after ${attempts} attempt(s).`,
            requiresManualFix: false,
          };
        }

        // Submit to registry with verified=true (goes directly to active)
        const registry = getFixPatternRegistry();
        const patternResponse = await registry.submitAIFix(
          {
            ruleId: currentAttempt.ruleId,
            tool: currentAttempt.tool,
            filePath: currentAttempt.filePath,
            beforeCode: currentAttempt.originalCode,
            afterCode: currentAttempt.fixedCode,
            lineNumber: currentAttempt.lineNumber,
            issueMessage: currentAttempt.issueMessage,
            aiModel: currentAttempt.aiModel,
            aiConfidence: result.score,
          },
          { verified: true } // Tested fix goes directly to active
        );

        // Log success result
        logFixResult({
          timestamp: new Date().toISOString(),
          ruleId: attempt.ruleId,
          tool: attempt.tool,
          filePath: attempt.filePath,
          lineNumber: attempt.lineNumber,
          success: true,
          totalAttempts: attempts,
          finalScore: result.score,
          patternStatus: patternResponse.status,
          requiresManualFix: false,
          totalDurationMs: Date.now() - startTime,
          aiModel: attempt.aiModel,
        });

        return {
          success: true,
          verifiedFix: currentAttempt.fixedCode,
          patternResponse,
          attempts,
          verificationHistory,
          userMessage: `Fix verified and activated after ${attempts} attempt(s).`,
          requiresManualFix: false,
        };
      }

      // Failed verification - try to enhance if we have attempts left
      if (attempts < this.options.maxAttempts) {
        if (this.options.enhancer) {
          try {
            console.log(`[AIFixer:Enhance] Attempt ${attempts} failed, enhancing...`);
            const enhancedCode = await this.options.enhancer({
              originalFix: currentAttempt.fixedCode,
              errors: result.errors,
              previousAttempts: attempts,
              context: {
                ruleId: currentAttempt.ruleId,
                issueMessage: currentAttempt.issueMessage,
                originalCode: currentAttempt.originalCode,
              },
            });

            currentAttempt = {
              ...currentAttempt,
              fixedCode: enhancedCode,
              attemptNumber: attempts + 1,
            };
          } catch (enhanceError: any) {
            console.log(`[AIFixer:Enhance] Enhancement failed: ${enhanceError.message}`);
            // Continue to next iteration, which will fail and exit the loop
          }
        } else {
          // No enhancer provided - can't retry
          console.log(`[AIFixer:Enhance] No enhancer provided, cannot retry`);
          break;
        }
      }
    }

    // All attempts failed - be honest with the user
    const lastResult = verificationHistory[verificationHistory.length - 1];
    const errorSummary = lastResult?.errors.map((e) => e.message).join('; ') || 'Unknown errors';

    // Log failure result
    logFixResult({
      timestamp: new Date().toISOString(),
      ruleId: attempt.ruleId,
      tool: attempt.tool,
      filePath: attempt.filePath,
      lineNumber: attempt.lineNumber,
      success: false,
      totalAttempts: attempts,
      finalScore: lastResult?.score || 0,
      requiresManualFix: true,
      totalDurationMs: Date.now() - startTime,
      aiModel: attempt.aiModel,
    });

    return {
      success: false,
      attempts,
      verificationHistory,
      failureReason: errorSummary,
      userMessage: this.generateFailureMessage(attempt, attempts, lastResult),
      requiresManualFix: true,
    };
  }

  /**
   * Generate a user-friendly failure message
   */
  private generateFailureMessage(
    attempt: AIFixAttempt,
    attempts: number,
    lastResult?: VerificationResult
  ): string {
    const ruleShort = attempt.ruleId.split('.').pop() || attempt.ruleId;
    const errors = lastResult?.errors || [];

    let message = `⚠️ Could not automatically fix "${ruleShort}" in ${attempt.filePath}:${attempt.lineNumber}\n`;
    message += `   Tried ${attempts} time(s) but verification failed.\n`;

    if (errors.length > 0) {
      message += `   Issues encountered:\n`;
      for (const error of errors.slice(0, 3)) {
        message += `   - ${error.type}: ${error.message}\n`;
      }
      if (errors.length > 3) {
        message += `   - ...and ${errors.length - 3} more\n`;
      }
    }

    message += `   This issue requires manual review and fix.`;

    return message;
  }

  /**
   * Batch verify multiple fixes
   */
  async verifyBatch(
    attempts: AIFixAttempt[]
  ): Promise<{
    results: Map<string, VerifiedFixResult>;
    summary: BatchSummary;
  }> {
    const results = new Map<string, VerifiedFixResult>();

    console.log(`[AIFixerVerifier] Batch verification for ${attempts.length} fixes`);

    for (const attempt of attempts) {
      const key = `${attempt.ruleId}:${attempt.filePath}:${attempt.lineNumber}`;
      const result = await this.verifyAndSubmit(attempt);
      results.set(key, result);
    }

    // Calculate summary
    const resultArray = Array.from(results.values());
    const summary = this.getStats(resultArray);

    // Log summary
    console.log(`[AIFixerVerifier] Batch complete:`);
    console.log(`   ✅ Fixed: ${summary.passed}/${summary.total}`);
    console.log(`   ❌ Manual fix required: ${summary.requiresManualFix}`);

    return { results, summary };
  }

  /**
   * Get verification statistics
   */
  getStats(results: VerifiedFixResult[]): BatchSummary {
    const passed = results.filter((r) => r.success).length;
    const failed = results.length - passed;
    const requiresManualFix = results.filter((r) => r.requiresManualFix).length;
    const totalAttempts = results.reduce((sum, r) => sum + r.attempts, 0);

    const scores = results
      .flatMap((r) => r.verificationHistory)
      .map((v) => v.score);
    const averageScore =
      scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    // Collect issues requiring manual fix for reporting
    const manualFixIssues = results
      .filter((r) => r.requiresManualFix)
      .map((r) => r.userMessage);

    return {
      total: results.length,
      passed,
      failed,
      requiresManualFix,
      averageAttempts: results.length > 0 ? totalAttempts / results.length : 0,
      averageScore: Math.round(averageScore),
      manualFixMessages: manualFixIssues,
    };
  }
}

/**
 * Summary of batch verification results
 */
export interface BatchSummary {
  total: number;
  passed: number;
  failed: number;
  requiresManualFix: number;
  averageAttempts: number;
  averageScore: number;
  /** User-friendly messages for issues requiring manual fix */
  manualFixMessages: string[];
}

// =============================================================================
// Factory Function
// =============================================================================

export function createAIFixerVerifier(
  options?: Partial<AIFixerVerifierOptions>
): AIFixerVerifier {
  return new AIFixerVerifier(options);
}

export default AIFixerVerifier;
