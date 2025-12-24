/**
 * Corgea AI Fixer Integration
 *
 * Integrates with Corgea's AI-powered code fix generation API.
 * Corgea analyzes security vulnerabilities and generates context-aware fixes.
 *
 * Features:
 * - Upload scan results (SARIF format) or source code
 * - AI-generated fixes with explanations
 * - Confidence scoring for each fix
 * - Support for 8+ languages
 *
 * API Documentation: https://docs.corgea.app/
 *
 * Integration Flow:
 * 1. Upload scan results (from Semgrep, etc.) via /scan-upload
 * 2. Optionally upload source code via /code-upload
 * 3. Poll /scan/{id}/issues for fix generation status
 * 4. Retrieve AI-generated fixes
 *
 * @since Session 60
 */

import { Issue } from '../../analyzers/v9-types';
import {
  CloudAPIToolBase,
  CloudAPIConfig,
  APIToolResult,
  GeneratedFix,
  RateLimitInfo,
  CloudAPIError,
  APIErrorCode
} from './base-api-tool';
import { convertToSARIF, SARIFReport } from './sarif-converter';

// ============================================================
// CORGEA-SPECIFIC TYPES
// ============================================================

export interface CorgeaConfig extends Omit<CloudAPIConfig, 'name' | 'baseUrl'> {
  /** Corgea API key */
  apiKey: string;

  /** Optional: Override base URL (default: https://www.corgea.app/api/v1) */
  baseUrl?: string;

  /** Maximum time to wait for fixes in ms (default: 120000 = 2 min) */
  maxFixWaitTime?: number;

  /** Poll interval when waiting for fixes in ms (default: 5000) */
  pollInterval?: number;
}

export interface CorgeaFixRequest {
  /** Issues to generate fixes for (from Semgrep, ESLint, etc.) */
  issues: Issue[];

  /** Source code files (map of path -> content) */
  sourceCode?: Map<string, string>;

  /** Programming language */
  language: string;

  /** Repository URL for context */
  repositoryUrl?: string;

  /** Branch name for context */
  branch?: string;

  /** Only generate fixes for issues above this severity */
  minSeverity?: 'low' | 'medium' | 'high' | 'critical';

  /** Maximum number of fixes to generate (for rate limiting) */
  maxFixes?: number;
}

export interface CorgeaFix extends GeneratedFix {
  /** Corgea's internal issue ID */
  corgeaIssueId: string;

  /** Whether Corgea verified the fix compiles */
  syntaxVerified: boolean;

  /** Whether Corgea verified the fix passes tests */
  testVerified: boolean;

  /** Link to fix in Corgea dashboard */
  dashboardUrl?: string;
}

// ============================================================
// CORGEA API RESPONSE TYPES
// ============================================================

interface CorgeaScanUploadResponse {
  scan_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message?: string;
}

interface CorgeaIssue {
  id: string;
  rule_id: string;
  file: string;
  line: number;
  column?: number;
  severity: string;
  message: string;
  status: 'open' | 'fixed' | 'ignored';
  fix?: CorgeaFixData;
}

interface CorgeaFixData {
  original_code: string;
  fixed_code: string;
  explanation: string;
  confidence: number;
  diff?: string;
  syntax_valid: boolean;
  test_passed?: boolean;
}

interface CorgeaScanResponse {
  scan_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  issues: CorgeaIssue[];
  total_issues: number;
  fixed_issues: number;
  processing_time_ms?: number;
}

interface CorgeaVerifyResponse {
  status?: string;  // API returns {"status": "ok"}
  valid?: boolean;  // Alternative format
  user?: {
    email: string;
    organization: string;
  };
  rate_limit?: {
    limit: number;
    remaining: number;
    reset_at: number;
  };
}

// ============================================================
// CORGEA FIXER IMPLEMENTATION
// ============================================================

export class CorgeaFixer extends CloudAPIToolBase {
  private maxFixWaitTime: number;
  private pollInterval: number;

  constructor(config: CorgeaConfig) {
    super({
      name: 'Corgea',
      baseUrl: config.baseUrl || 'https://www.corgea.app/api/v1',
      apiKey: config.apiKey,
      authHeaderName: 'CORGEA-TOKEN', // Corgea uses custom header, not Bearer
      timeout: config.timeout || 300000,
      retries: config.retries || 3,
      retryDelay: config.retryDelay || 1000
    });

    this.maxFixWaitTime = config.maxFixWaitTime || 120000;
    this.pollInterval = config.pollInterval || 5000;
  }

  /**
   * Generate AI fixes for the provided issues
   */
  async execute(request: CorgeaFixRequest): Promise<APIToolResult> {
    const startTime = Date.now();

    try {
      this.log(`Starting fix generation for ${request.issues.length} issues`);

      // Filter issues by severity if specified
      let issuesToFix = request.issues;
      if (request.minSeverity) {
        issuesToFix = this.filterBySeverity(request.issues, request.minSeverity);
        this.log(`Filtered to ${issuesToFix.length} issues (min severity: ${request.minSeverity})`);
      }

      // Limit number of issues if specified
      if (request.maxFixes && issuesToFix.length > request.maxFixes) {
        issuesToFix = issuesToFix.slice(0, request.maxFixes);
        this.log(`Limited to ${request.maxFixes} issues`);
      }

      if (issuesToFix.length === 0) {
        return {
          success: true,
          duration: Date.now() - startTime,
          fixes: [],
        };
      }

      // Step 1: Upload scan results
      const scanId = await this.uploadScanResults(issuesToFix, request);
      this.log(`Scan uploaded: ${scanId}`);

      // Step 2: Upload source code if provided
      if (request.sourceCode && request.sourceCode.size > 0) {
        await this.uploadSourceCode(scanId, request.sourceCode);
        this.log(`Source code uploaded: ${request.sourceCode.size} files`);
      }

      // Step 3: Wait for AI to generate fixes
      const fixes = await this.pollForFixes(scanId);
      this.log(`Generated ${fixes.length} fixes`);

      return {
        success: true,
        duration: Date.now() - startTime,
        fixes
      };

    } catch (error) {
      const duration = Date.now() - startTime;

      if (error instanceof CloudAPIError) {
        this.log(`API error: ${error.message}`, 'error');
        return {
          success: false,
          duration,
          error: error.message,
          errorCode: error.code
        };
      }

      this.log(`Unexpected error: ${(error as Error).message}`, 'error');
      return {
        success: false,
        duration,
        error: (error as Error).message,
        errorCode: APIErrorCode.UNKNOWN
      };
    }
  }

  /**
   * Check if Corgea API is reachable and credentials are valid
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.makeRequest<CorgeaVerifyResponse>('GET', '/verify');
      // API returns {"status": "ok"} or {"valid": true}
      return response.data.status === 'ok' || response.data.valid === true;
    } catch {
      return false;
    }
  }

  /**
   * Get current rate limit status
   */
  async getRateLimitStatus(): Promise<RateLimitInfo> {
    try {
      const response = await this.makeRequest<CorgeaVerifyResponse>('GET', '/verify');

      if (response.data.rate_limit) {
        return {
          limit: response.data.rate_limit.limit,
          remaining: response.data.rate_limit.remaining,
          resetAt: response.data.rate_limit.reset_at,
          windowSeconds: 3600
        };
      }

      // Default if not provided
      return {
        limit: 1000,
        remaining: 1000,
        resetAt: Date.now() + 3600000,
        windowSeconds: 3600
      };

    } catch {
      return {
        limit: 0,
        remaining: 0,
        resetAt: Date.now(),
        windowSeconds: 3600
      };
    }
  }

  // ============================================================
  // PRIVATE METHODS
  // ============================================================

  /**
   * Upload scan results in SARIF format
   */
  private async uploadScanResults(
    issues: Issue[],
    request: CorgeaFixRequest
  ): Promise<string> {
    // Convert to SARIF format
    const sarif = convertToSARIF(issues, {
      toolName: 'CodeQual',
      includeSnippets: true,
      includeMetadata: true
    });

    const payload = {
      format: 'sarif',
      data: sarif,
      language: request.language,
      repository_url: request.repositoryUrl,
      branch: request.branch
    };

    const response = await this.makeRequest<CorgeaScanUploadResponse>(
      'POST',
      '/scan-upload',
      payload
    );

    if (!response.data.scan_id) {
      throw new CloudAPIError(
        'Corgea did not return a scan ID',
        APIErrorCode.INVALID_REQUEST
      );
    }

    return response.data.scan_id;
  }

  /**
   * Upload source code files
   */
  private async uploadSourceCode(
    scanId: string,
    sourceCode: Map<string, string>
  ): Promise<void> {
    // Convert Map to object for JSON serialization
    const files: Record<string, string> = {};
    for (const [path, content] of sourceCode) {
      files[path] = content;
    }

    await this.makeRequest('POST', '/code-upload', {
      scan_id: scanId,
      files
    });
  }

  /**
   * Poll for fix generation completion
   */
  private async pollForFixes(scanId: string): Promise<CorgeaFix[]> {
    const deadline = Date.now() + this.maxFixWaitTime;
    let lastStatus = '';

    while (Date.now() < deadline) {
      const response = await this.makeRequest<CorgeaScanResponse>(
        'GET',
        `/scan/${scanId}/issues`
      );

      const { status, issues } = response.data;

      // Log status changes
      if (status !== lastStatus) {
        this.log(`Scan status: ${status}`);
        lastStatus = status;
      }

      // Check if processing is complete
      if (status === 'completed') {
        return this.transformFixes(issues);
      }

      if (status === 'failed') {
        throw new CloudAPIError(
          'Corgea scan processing failed',
          APIErrorCode.SERVER_ERROR
        );
      }

      // Wait before next poll
      await this.sleep(this.pollInterval);
    }

    throw new CloudAPIError(
      `Fix generation timed out after ${this.maxFixWaitTime}ms`,
      APIErrorCode.TIMEOUT,
      undefined,
      false
    );
  }

  /**
   * Transform Corgea issues to our fix format
   */
  private transformFixes(corgeaIssues: CorgeaIssue[]): CorgeaFix[] {
    const fixes: CorgeaFix[] = [];

    for (const issue of corgeaIssues) {
      // Skip issues without fixes
      if (!issue.fix) {
        continue;
      }

      const fix: CorgeaFix = {
        // Standard GeneratedFix fields
        issueId: `corgea-${issue.id}`,
        ruleId: issue.rule_id,
        file: issue.file,
        line: issue.line,
        originalCode: issue.fix.original_code,
        fixedCode: issue.fix.fixed_code,
        explanation: issue.fix.explanation,
        confidence: issue.fix.confidence,
        safeForAutoApply: this.isSafeForAutoApply(issue.fix),
        diff: issue.fix.diff,

        // Corgea-specific fields
        corgeaIssueId: issue.id,
        syntaxVerified: issue.fix.syntax_valid,
        testVerified: issue.fix.test_passed || false
      };

      fixes.push(fix);
    }

    return fixes;
  }

  /**
   * Determine if a fix is safe for automatic application
   */
  private isSafeForAutoApply(fix: CorgeaFixData): boolean {
    // Safe if:
    // 1. High confidence (>= 80%)
    // 2. Syntax verified
    // 3. Tests passed (if available)
    return (
      fix.confidence >= 80 &&
      fix.syntax_valid &&
      (fix.test_passed === undefined || fix.test_passed)
    );
  }

  /**
   * Filter issues by minimum severity
   */
  private filterBySeverity(issues: Issue[], minSeverity: string): Issue[] {
    const severityOrder: Record<string, number> = {
      low: 1,
      medium: 2,
      high: 3,
      critical: 4
    };

    const minLevel = severityOrder[minSeverity.toLowerCase()] || 1;

    return issues.filter(issue => {
      const issueLevel = severityOrder[issue.severity?.toLowerCase() || 'low'] || 1;
      return issueLevel >= minLevel;
    });
  }
}

// ============================================================
// FACTORY FUNCTION
// ============================================================

/**
 * Create a Corgea fixer instance from environment variables
 */
export function createCorgeaFixer(): CorgeaFixer | null {
  const apiKey = process.env.CORGEA_API_KEY;

  if (!apiKey) {
    console.warn('[Corgea] CORGEA_API_KEY not set - Corgea fixer disabled');
    return null;
  }

  return new CorgeaFixer({
    apiKey,
    baseUrl: process.env.CORGEA_API_URL,
    maxFixWaitTime: parseInt(process.env.CORGEA_MAX_WAIT_TIME || '120000', 10),
    pollInterval: parseInt(process.env.CORGEA_POLL_INTERVAL || '5000', 10)
  });
}

/**
 * Check if Corgea is configured and available
 */
export function isCorgeaEnabled(): boolean {
  return !!process.env.CORGEA_API_KEY;
}
