/**
 * Universal Secret Scanner
 *
 * Integrates Gitleaks and TruffleHog for comprehensive secret detection.
 * Detects API keys, passwords, tokens, and other sensitive data in code.
 *
 * Tools:
 * - Gitleaks: Fast, CI/CD friendly, 140+ patterns
 * - TruffleHog: 800+ secret types, validates credentials
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

// ============================================================================
// Types
// ============================================================================

export interface SecretIssue {
  tool: 'gitleaks' | 'trufflehog';
  file: string;
  line: number;
  column?: number;
  secretType: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  match?: string;       // Redacted match
  commit?: string;      // Git commit if scanning history
  author?: string;      // Git author if scanning history
  date?: string;        // Commit date if scanning history
  verified?: boolean;   // TruffleHog can verify if secret is active
  ruleId: string;
}

export interface SecretScanResult {
  tool: string;
  issues: SecretIssue[];
  scanDuration: number;
  error?: string;
}

export interface SecretScannerConfig {
  scanHistory?: boolean;        // Scan git history (slower but thorough)
  maxDepth?: number;           // Max git history depth
  excludePaths?: string[];     // Paths to exclude
  includeVerification?: boolean; // TruffleHog credential verification
}

const DEFAULT_CONFIG: SecretScannerConfig = {
  scanHistory: false,
  maxDepth: 100,
  excludePaths: ['node_modules', 'vendor', '.git', 'dist', 'build'],
  includeVerification: true
};

// ============================================================================
// Gitleaks Integration
// ============================================================================

interface GitleaksResult {
  Description: string;
  StartLine: number;
  EndLine: number;
  StartColumn: number;
  EndColumn: number;
  Match: string;
  Secret: string;
  File: string;
  SymlinkFile: string;
  Commit: string;
  Entropy: number;
  Author: string;
  Email: string;
  Date: string;
  Message: string;
  Tags: string[];
  RuleID: string;
  Fingerprint: string;
}

/**
 * Run Gitleaks secret scanner
 */
async function runGitleaks(
  repoPath: string,
  config: SecretScannerConfig
): Promise<SecretScanResult> {
  const startTime = Date.now();
  const issues: SecretIssue[] = [];

  try {
    // Check if gitleaks is available
    try {
      await execAsync('gitleaks version');
    } catch {
      return {
        tool: 'gitleaks',
        issues: [],
        scanDuration: Date.now() - startTime,
        error: 'Gitleaks not installed. Install with: brew install gitleaks'
      };
    }

    // Build command
    const reportPath = path.join('/tmp', `gitleaks-${Date.now()}.json`);
    let cmd = `gitleaks detect --source "${repoPath}" --report-format json --report-path "${reportPath}"`;

    if (!config.scanHistory) {
      cmd += ' --no-git';
    } else if (config.maxDepth) {
      cmd += ` --log-opts="-n ${config.maxDepth}"`;
    }

    // Add exclusions
    if (config.excludePaths && config.excludePaths.length > 0) {
      // Gitleaks uses .gitleaksignore or --config, we'll use baseline approach
    }

    // Run gitleaks (returns exit code 1 if secrets found)
    try {
      await execAsync(cmd, { maxBuffer: 50 * 1024 * 1024 });
    } catch (error: unknown) {
      // Exit code 1 means secrets found, which is expected
      const execError = error as { code?: number };
      if (execError.code !== 1) {
        throw error;
      }
    }

    // Parse results
    if (fs.existsSync(reportPath)) {
      const reportContent = fs.readFileSync(reportPath, 'utf-8');
      if (reportContent.trim()) {
        const findings: GitleaksResult[] = JSON.parse(reportContent);

        for (const finding of findings) {
          issues.push({
            tool: 'gitleaks',
            file: finding.File,
            line: finding.StartLine,
            column: finding.StartColumn,
            secretType: finding.RuleID,
            description: finding.Description,
            severity: mapGitleaksSeverity(finding.RuleID),
            match: redactSecret(finding.Match),
            commit: finding.Commit || undefined,
            author: finding.Author || undefined,
            date: finding.Date || undefined,
            ruleId: `gitleaks/${finding.RuleID}`
          });
        }
      }

      // Cleanup
      fs.unlinkSync(reportPath);
    }

    return {
      tool: 'gitleaks',
      issues,
      scanDuration: Date.now() - startTime
    };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      tool: 'gitleaks',
      issues,
      scanDuration: Date.now() - startTime,
      error: errorMessage
    };
  }
}

/**
 * Map Gitleaks rule IDs to severity
 */
function mapGitleaksSeverity(ruleId: string): SecretIssue['severity'] {
  const criticalPatterns = [
    'aws-access-token', 'aws-secret-key', 'gcp-api-key', 'azure',
    'private-key', 'github-pat', 'gitlab-pat', 'stripe', 'twilio',
    'sendgrid', 'slack-webhook', 'npm-token'
  ];

  const highPatterns = [
    'generic-api-key', 'password', 'secret', 'token', 'credential',
    'database', 'mysql', 'postgres', 'mongodb', 'redis'
  ];

  const ruleIdLower = ruleId.toLowerCase();

  if (criticalPatterns.some(p => ruleIdLower.includes(p))) {
    return 'critical';
  }
  if (highPatterns.some(p => ruleIdLower.includes(p))) {
    return 'high';
  }
  return 'medium';
}

// ============================================================================
// TruffleHog Integration
// ============================================================================

interface TruffleHogResult {
  SourceMetadata: {
    Data: {
      Filesystem?: {
        file: string;
        line: number;
      };
      Git?: {
        commit: string;
        file: string;
        email: string;
        repository: string;
        timestamp: string;
        line: number;
      };
    };
  };
  SourceID: number;
  SourceType: number;
  SourceName: string;
  DetectorType: number;
  DetectorName: string;
  DecoderName: string;
  Verified: boolean;
  Raw: string;
  RawV2: string;
  Redacted: string;
  ExtraData: Record<string, string>;
  StructuredData: unknown;
}

/**
 * Run TruffleHog secret scanner
 */
async function runTruffleHog(
  repoPath: string,
  config: SecretScannerConfig
): Promise<SecretScanResult> {
  const startTime = Date.now();
  const issues: SecretIssue[] = [];

  try {
    // Check if trufflehog is available
    try {
      await execAsync('trufflehog --version');
    } catch {
      return {
        tool: 'trufflehog',
        issues: [],
        scanDuration: Date.now() - startTime,
        error: 'TruffleHog not installed. Install with: brew install trufflehog'
      };
    }

    // Build command
    let cmd = `trufflehog filesystem "${repoPath}" --json`;

    if (config.scanHistory) {
      cmd = `trufflehog git "file://${repoPath}" --json`;
      if (config.maxDepth) {
        cmd += ` --max-depth=${config.maxDepth}`;
      }
    }

    if (!config.includeVerification) {
      cmd += ' --no-verification';
    }

    // Add exclusions
    if (config.excludePaths && config.excludePaths.length > 0) {
      for (const exclude of config.excludePaths) {
        cmd += ` --exclude-paths="${exclude}"`;
      }
    }

    // Run trufflehog
    const { stdout } = await execAsync(cmd, {
      maxBuffer: 100 * 1024 * 1024,
      timeout: 300000  // 5 minute timeout
    });

    // Parse JSONL output (one JSON object per line)
    if (stdout.trim()) {
      const lines = stdout.trim().split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const finding: TruffleHogResult = JSON.parse(line);

          const fileInfo = finding.SourceMetadata?.Data?.Filesystem ||
                          finding.SourceMetadata?.Data?.Git;

          if (fileInfo) {
            issues.push({
              tool: 'trufflehog',
              file: 'file' in fileInfo ? fileInfo.file : '',
              line: fileInfo.line || 1,
              secretType: finding.DetectorName,
              description: `${finding.DetectorName} detected${finding.Verified ? ' (VERIFIED ACTIVE)' : ''}`,
              severity: finding.Verified ? 'critical' : mapTruffleHogSeverity(finding.DetectorName),
              match: finding.Redacted || redactSecret(finding.Raw),
              commit: finding.SourceMetadata?.Data?.Git?.commit,
              author: finding.SourceMetadata?.Data?.Git?.email,
              date: finding.SourceMetadata?.Data?.Git?.timestamp,
              verified: finding.Verified,
              ruleId: `trufflehog/${finding.DetectorName}`
            });
          }
        } catch {
          // Skip malformed JSON lines
        }
      }
    }

    return {
      tool: 'trufflehog',
      issues,
      scanDuration: Date.now() - startTime
    };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // TruffleHog may exit with code when no secrets found - that's OK
    if (!errorMessage.includes('exit code')) {
      return {
        tool: 'trufflehog',
        issues,
        scanDuration: Date.now() - startTime,
        error: errorMessage
      };
    }
    return {
      tool: 'trufflehog',
      issues,
      scanDuration: Date.now() - startTime
    };
  }
}

/**
 * Map TruffleHog detector names to severity
 */
function mapTruffleHogSeverity(detectorName: string): SecretIssue['severity'] {
  const criticalDetectors = [
    'AWS', 'GCP', 'Azure', 'PrivateKey', 'RSA', 'SSH', 'PGP',
    'GitHub', 'GitLab', 'Stripe', 'Square', 'Twilio', 'SendGrid',
    'Slack', 'Discord', 'NPM', 'PyPI', 'NuGet', 'Docker'
  ];

  const highDetectors = [
    'Generic', 'Password', 'Secret', 'Token', 'Credential',
    'Database', 'MySQL', 'Postgres', 'MongoDB', 'Redis', 'JWT'
  ];

  if (criticalDetectors.some(d => detectorName.includes(d))) {
    return 'critical';
  }
  if (highDetectors.some(d => detectorName.includes(d))) {
    return 'high';
  }
  return 'medium';
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Redact a secret for safe display
 */
function redactSecret(secret: string): string {
  if (!secret || secret.length < 8) {
    return '****';
  }
  const visibleChars = Math.min(4, Math.floor(secret.length / 4));
  return secret.substring(0, visibleChars) + '****' + secret.substring(secret.length - visibleChars);
}

/**
 * Deduplicate issues from multiple scanners
 */
function deduplicateIssues(issues: SecretIssue[]): SecretIssue[] {
  const seen = new Map<string, SecretIssue>();

  for (const issue of issues) {
    const key = `${issue.file}:${issue.line}:${issue.secretType}`;

    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, issue);
    } else {
      // Prefer TruffleHog if it verified the secret
      if (issue.tool === 'trufflehog' && issue.verified) {
        seen.set(key, issue);
      }
      // Prefer higher severity
      else if (severityRank(issue.severity) > severityRank(existing.severity)) {
        seen.set(key, issue);
      }
    }
  }

  return Array.from(seen.values());
}

function severityRank(severity: SecretIssue['severity']): number {
  const ranks = { critical: 4, high: 3, medium: 2, low: 1 };
  return ranks[severity];
}

// ============================================================================
// Main Scanner Class
// ============================================================================

export class SecretScanner {
  private config: SecretScannerConfig;

  constructor(config: Partial<SecretScannerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Run Gitleaks scanner
   */
  async runGitleaks(repoPath: string): Promise<SecretScanResult> {
    return runGitleaks(repoPath, this.config);
  }

  /**
   * Run TruffleHog scanner
   */
  async runTruffleHog(repoPath: string): Promise<SecretScanResult> {
    return runTruffleHog(repoPath, this.config);
  }

  /**
   * Run all secret scanners and deduplicate results
   */
  async runAll(repoPath: string): Promise<{
    issues: SecretIssue[];
    results: SecretScanResult[];
    summary: {
      total: number;
      critical: number;
      high: number;
      medium: number;
      low: number;
      verified: number;
      byTool: Record<string, number>;
    };
  }> {
    // Run both scanners in parallel
    const [gitleaksResult, trufflehogResult] = await Promise.all([
      this.runGitleaks(repoPath),
      this.runTruffleHog(repoPath)
    ]);

    // Combine and deduplicate
    const allIssues = [
      ...gitleaksResult.issues,
      ...trufflehogResult.issues
    ];
    const dedupedIssues = deduplicateIssues(allIssues);

    // Calculate summary
    const summary = {
      total: dedupedIssues.length,
      critical: dedupedIssues.filter(i => i.severity === 'critical').length,
      high: dedupedIssues.filter(i => i.severity === 'high').length,
      medium: dedupedIssues.filter(i => i.severity === 'medium').length,
      low: dedupedIssues.filter(i => i.severity === 'low').length,
      verified: dedupedIssues.filter(i => i.verified).length,
      byTool: {
        gitleaks: gitleaksResult.issues.length,
        trufflehog: trufflehogResult.issues.length
      }
    };

    return {
      issues: dedupedIssues,
      results: [gitleaksResult, trufflehogResult],
      summary
    };
  }
}

// Export singleton for convenience
export const secretScanner = new SecretScanner();
