/**
 * Fix Verifier
 *
 * Verifies that applied fixes actually resolve issues and don't
 * introduce new problems. This is the "QA" step in the automated pipeline.
 *
 * Verification Process:
 * 1. Re-scan the fixed file with the same tool that found the issue
 * 2. Confirm the original issue is resolved (line no longer flagged)
 * 3. Check for new issues introduced by the fix (regressions)
 * 4. Mark fix as verified or failed based on results
 *
 * @since Session 60
 */

import { CategorizedFix } from './fix-categorizer';

// ============================================================
// TYPES
// ============================================================

/**
 * Result of verifying a single fix
 */
export interface FixVerificationResult {
  /** The fix that was verified */
  fix: CategorizedFix;

  /** Whether verification passed */
  verified: boolean;

  /** Original issue resolved? */
  issueResolved: boolean;

  /** New issues introduced? */
  regressionsFound: boolean;

  /** Count of new issues in the same file */
  newIssueCount: number;

  /** Details of new issues (if any) */
  newIssues?: Array<{
    ruleId: string;
    line: number;
    message: string;
  }>;

  /** Error during verification (if any) */
  error?: string;

  /** Time taken for verification (ms) */
  verificationTime: number;
}

/**
 * Batch verification result
 */
export interface BatchVerificationResult {
  /** All verification results */
  results: FixVerificationResult[];

  /** Summary statistics */
  summary: {
    totalVerified: number;
    passed: number;
    failed: number;
    regressions: number;
    errors: number;
    totalTime: number;
  };

  /** Fixes that passed verification */
  verifiedFixes: CategorizedFix[];

  /** Fixes that failed verification */
  failedFixes: Array<{
    fix: CategorizedFix;
    reason: 'issue_not_resolved' | 'regression_introduced' | 'verification_error';
    details: string;
  }>;
}

/**
 * Tool scanner callback for re-scanning files
 */
export type ToolScannerCallback = (
  tool: string,
  file: string,
  workingDir: string
) => Promise<Array<{
  ruleId: string;
  line: number;
  column?: number;
  message: string;
  severity: string;
}>>;

/**
 * Options for verification
 */
export interface VerificationOptions {
  /** Working directory */
  workingDir: string;

  /** Skip verification for certain tools */
  skipTools?: string[];

  /** Timeout per file scan (ms) */
  timeoutPerScan?: number;

  /** Whether to allow minor regressions (e.g., formatting) */
  allowMinorRegressions?: boolean;

  /** Rules considered "minor" for regression purposes */
  minorRules?: string[];
}

// ============================================================
// FIX VERIFIER
// ============================================================

export class FixVerifier {
  private scanner?: ToolScannerCallback;
  private options: Required<VerificationOptions>;

  constructor(options: VerificationOptions) {
    this.options = {
      workingDir: options.workingDir,
      skipTools: options.skipTools || [],
      timeoutPerScan: options.timeoutPerScan || 30000,
      allowMinorRegressions: options.allowMinorRegressions || false,
      minorRules: options.minorRules || [
        'no-trailing-spaces',
        'eol-last',
        'indent',
        'quotes',
        'semi'
      ]
    };
  }

  /**
   * Register the tool scanner callback
   * This should call the same tools that found the original issues
   */
  registerScanner(scanner: ToolScannerCallback): this {
    this.scanner = scanner;
    return this;
  }

  /**
   * Verify a batch of fixes
   */
  async verifyBatch(fixes: CategorizedFix[]): Promise<BatchVerificationResult> {
    const startTime = Date.now();
    const results: FixVerificationResult[] = [];
    const verifiedFixes: CategorizedFix[] = [];
    const failedFixes: BatchVerificationResult['failedFixes'] = [];

    // Group fixes by file and tool for efficient scanning
    const fixesByFileAndTool = this.groupFixes(fixes);

    for (const [key, groupedFixes] of Array.from(fixesByFileAndTool)) {
      const [file, tool] = key.split('::');

      // Skip if tool is in skip list
      if (this.options.skipTools.includes(tool)) {
        for (const fix of groupedFixes) {
          results.push({
            fix,
            verified: true, // Assume verified if skipped
            issueResolved: true,
            regressionsFound: false,
            newIssueCount: 0,
            verificationTime: 0
          });
          verifiedFixes.push(fix);
        }
        continue;
      }

      // Scan the file
      const scanStart = Date.now();
      let scanResults: Array<{
        ruleId: string;
        line: number;
        column?: number;
        message: string;
        severity: string;
      }> = [];

      try {
        if (this.scanner) {
          scanResults = await this.scanner(tool, file, this.options.workingDir);
        }
      } catch (error) {
        // Scanner failed - mark all fixes for this file as error
        for (const fix of groupedFixes) {
          const result: FixVerificationResult = {
            fix,
            verified: false,
            issueResolved: false,
            regressionsFound: false,
            newIssueCount: 0,
            error: `Scan failed: ${error instanceof Error ? error.message : String(error)}`,
            verificationTime: Date.now() - scanStart
          };
          results.push(result);
          failedFixes.push({
            fix,
            reason: 'verification_error',
            details: result.error!
          });
        }
        continue;
      }

      // Verify each fix in this file
      for (const fix of groupedFixes) {
        const result = this.verifyFix(fix, scanResults, Date.now() - scanStart);
        results.push(result);

        if (result.verified) {
          verifiedFixes.push(fix);
        } else {
          failedFixes.push({
            fix,
            reason: result.regressionsFound
              ? 'regression_introduced'
              : result.issueResolved
                ? 'verification_error'
                : 'issue_not_resolved',
            details: result.error || this.getFailureDetails(result)
          });
        }
      }
    }

    // Calculate summary
    const summary = {
      totalVerified: results.length,
      passed: verifiedFixes.length,
      failed: failedFixes.length,
      regressions: results.filter(r => r.regressionsFound).length,
      errors: results.filter(r => r.error).length,
      totalTime: Date.now() - startTime
    };

    return {
      results,
      summary,
      verifiedFixes,
      failedFixes
    };
  }

  /**
   * Verify a single fix against scan results
   */
  private verifyFix(
    fix: CategorizedFix,
    scanResults: Array<{
      ruleId: string;
      line: number;
      column?: number;
      message: string;
      severity: string;
    }>,
    scanTime: number
  ): FixVerificationResult {
    // Check if original issue is still present
    const originalIssueStillPresent = scanResults.some(
      issue =>
        issue.ruleId === fix.ruleId &&
        Math.abs(issue.line - fix.line) <= 2 // Allow small line drift
    );

    const issueResolved = !originalIssueStillPresent;

    // Check for new issues (regressions)
    // We consider it a regression if there are NEW issues on or near the fixed line
    const nearbyIssues = scanResults.filter(
      issue => Math.abs(issue.line - fix.line) <= 5
    );

    // Filter out minor issues if allowed
    const significantNewIssues = this.options.allowMinorRegressions
      ? nearbyIssues.filter(
          issue => !this.options.minorRules.includes(issue.ruleId)
        )
      : nearbyIssues;

    const regressionsFound = significantNewIssues.length > 0 && issueResolved;

    // Verification passes if issue is resolved and no regressions
    const verified = issueResolved && !regressionsFound;

    return {
      fix,
      verified,
      issueResolved,
      regressionsFound,
      newIssueCount: significantNewIssues.length,
      newIssues: significantNewIssues.map(i => ({
        ruleId: i.ruleId,
        line: i.line,
        message: i.message
      })),
      verificationTime: scanTime
    };
  }

  /**
   * Group fixes by file and tool
   */
  private groupFixes(fixes: CategorizedFix[]): Map<string, CategorizedFix[]> {
    const grouped = new Map<string, CategorizedFix[]>();

    for (const fix of fixes) {
      const key = `${fix.file}::${fix.tool}`;
      const existing = grouped.get(key) || [];
      existing.push(fix);
      grouped.set(key, existing);
    }

    return grouped;
  }

  /**
   * Get human-readable failure details
   */
  private getFailureDetails(result: FixVerificationResult): string {
    if (!result.issueResolved) {
      return `Original issue (${result.fix.ruleId}) still present at line ${result.fix.line}`;
    }

    if (result.regressionsFound && result.newIssues) {
      const issueList = result.newIssues
        .slice(0, 3)
        .map(i => `${i.ruleId} at line ${i.line}`)
        .join(', ');
      return `Fix introduced ${result.newIssueCount} new issue(s): ${issueList}`;
    }

    return 'Unknown verification failure';
  }
}

/**
 * Create a new fix verifier
 */
export function createFixVerifier(options: VerificationOptions): FixVerifier {
  return new FixVerifier(options);
}
