/**
 * Universal Infrastructure as Code (IaC) Scanner
 *
 * Integrates Checkov and Trivy for comprehensive IaC security scanning.
 * Detects misconfigurations in Terraform, Kubernetes, CloudFormation, Helm, etc.
 *
 * Tools:
 * - Checkov: 1000+ policies, graph-based scanning, CIS benchmarks
 * - Trivy: All-in-one scanner, successor to tfsec
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

// ============================================================================
// Types
// ============================================================================

export type IaCFramework =
  | 'terraform'
  | 'cloudformation'
  | 'kubernetes'
  | 'helm'
  | 'dockerfile'
  | 'arm'           // Azure Resource Manager
  | 'bicep'         // Azure Bicep
  | 'ansible'
  | 'serverless'
  | 'unknown';

export interface IaCIssue {
  tool: 'checkov' | 'trivy';
  file: string;
  line: number;
  endLine?: number;
  framework: IaCFramework;
  checkId: string;
  checkName: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  resource?: string;       // Resource name/type
  guideline?: string;      // Fix guideline or URL
  benchmarks?: string[];   // CIS, NIST, etc.
  ruleId: string;
}

export interface IaCScanResult {
  tool: string;
  issues: IaCIssue[];
  scanDuration: number;
  frameworksDetected: IaCFramework[];
  error?: string;
}

export interface IaCScannerConfig {
  frameworks?: IaCFramework[];  // Limit to specific frameworks
  excludePaths?: string[];      // Paths to exclude
  skipChecks?: string[];        // Check IDs to skip
  compactOutput?: boolean;      // Reduce output verbosity
}

const DEFAULT_CONFIG: IaCScannerConfig = {
  excludePaths: ['node_modules', 'vendor', '.git', 'dist', 'build', '.terraform'],
  compactOutput: true
};

// ============================================================================
// Checkov Integration
// ============================================================================

interface CheckovResult {
  check_type: string;
  results: {
    passed_checks: CheckovCheck[];
    failed_checks: CheckovCheck[];
    skipped_checks: CheckovCheck[];
  };
}

interface CheckovCheck {
  check_id: string;
  bc_check_id?: string;
  check_name: string;
  check_result: {
    result: 'passed' | 'failed' | 'skipped';
    evaluated_keys?: string[];
  };
  file_path: string;
  file_abs_path: string;
  repo_file_path: string;
  file_line_range: [number, number];
  resource: string;
  evaluations?: Record<string, unknown>;
  check_class?: string;
  guideline?: string;
  severity?: string;
  benchmarks?: Record<string, string[]>;
}

/**
 * Run Checkov IaC scanner
 */
async function runCheckov(
  repoPath: string,
  config: IaCScannerConfig
): Promise<IaCScanResult> {
  const startTime = Date.now();
  const issues: IaCIssue[] = [];
  const frameworksDetected = new Set<IaCFramework>();

  try {
    // Check if checkov is available
    try {
      await execAsync('checkov --version');
    } catch {
      return {
        tool: 'checkov',
        issues: [],
        scanDuration: Date.now() - startTime,
        frameworksDetected: [],
        error: 'Checkov not installed. Install with: pip install checkov'
      };
    }

    // Build command
    let cmd = `checkov -d "${repoPath}" -o json --compact`;

    // Add framework filters
    if (config.frameworks && config.frameworks.length > 0) {
      const frameworkMap: Record<IaCFramework, string> = {
        terraform: 'terraform',
        cloudformation: 'cloudformation',
        kubernetes: 'kubernetes',
        helm: 'helm',
        dockerfile: 'dockerfile',
        arm: 'arm',
        bicep: 'bicep',
        ansible: 'ansible',
        serverless: 'serverless',
        unknown: ''
      };
      const frameworks = config.frameworks
        .map(f => frameworkMap[f])
        .filter(f => f);
      if (frameworks.length > 0) {
        cmd += ` --framework ${frameworks.join(',')}`;
      }
    }

    // Add exclusions
    if (config.excludePaths && config.excludePaths.length > 0) {
      cmd += ` --skip-path ${config.excludePaths.join(' --skip-path ')}`;
    }

    // Add skip checks
    if (config.skipChecks && config.skipChecks.length > 0) {
      cmd += ` --skip-check ${config.skipChecks.join(',')}`;
    }

    // Run checkov
    let stdout = '';
    try {
      const result = await execAsync(cmd, {
        maxBuffer: 100 * 1024 * 1024,
        timeout: 600000  // 10 minute timeout
      });
      stdout = result.stdout;
    } catch (error: unknown) {
      // Checkov returns non-zero if issues found
      const execError = error as { stdout?: string; stderr?: string };
      stdout = execError.stdout || '';
    }

    // Parse results
    if (stdout.trim()) {
      try {
        const results: CheckovResult[] = JSON.parse(stdout);

        for (const result of results) {
          const framework = mapCheckovFramework(result.check_type);
          frameworksDetected.add(framework);

          for (const check of result.results.failed_checks) {
            issues.push({
              tool: 'checkov',
              file: check.repo_file_path || check.file_path,
              line: check.file_line_range[0],
              endLine: check.file_line_range[1],
              framework,
              checkId: check.check_id,
              checkName: check.check_name,
              severity: mapCheckovSeverity(check.severity, check.check_id),
              description: check.check_name,
              resource: check.resource,
              guideline: check.guideline,
              benchmarks: check.benchmarks ? Object.keys(check.benchmarks) : undefined,
              ruleId: `checkov/${check.check_id}`
            });
          }
        }
      } catch {
        // Non-JSON output, likely an error message
      }
    }

    return {
      tool: 'checkov',
      issues,
      scanDuration: Date.now() - startTime,
      frameworksDetected: Array.from(frameworksDetected)
    };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      tool: 'checkov',
      issues,
      scanDuration: Date.now() - startTime,
      frameworksDetected: Array.from(frameworksDetected),
      error: errorMessage
    };
  }
}

/**
 * Map Checkov check_type to IaCFramework
 */
function mapCheckovFramework(checkType: string): IaCFramework {
  const mapping: Record<string, IaCFramework> = {
    terraform: 'terraform',
    terraform_plan: 'terraform',
    cloudformation: 'cloudformation',
    kubernetes: 'kubernetes',
    helm: 'helm',
    dockerfile: 'dockerfile',
    arm: 'arm',
    bicep: 'bicep',
    ansible: 'ansible',
    serverless: 'serverless'
  };
  return mapping[checkType.toLowerCase()] || 'unknown';
}

/**
 * Map Checkov severity or infer from check ID
 */
function mapCheckovSeverity(
  severity: string | undefined,
  checkId: string
): IaCIssue['severity'] {
  if (severity) {
    const s = severity.toLowerCase();
    if (s === 'critical') return 'critical';
    if (s === 'high') return 'high';
    if (s === 'medium') return 'medium';
    if (s === 'low') return 'low';
  }

  // Infer from check ID patterns
  const criticalPatterns = [
    'CKV_AWS_.*_PUBLIC', 'CKV_.*_ENCRYPTION', 'CKV_.*_IAM',
    'CKV_SECRET', 'CKV_K8S_.*PRIVILEGED'
  ];
  const highPatterns = [
    'CKV_AWS_', 'CKV_AZURE_', 'CKV_GCP_', 'CKV_K8S_'
  ];

  if (criticalPatterns.some(p => new RegExp(p).test(checkId))) {
    return 'critical';
  }
  if (highPatterns.some(p => checkId.startsWith(p))) {
    return 'high';
  }
  return 'medium';
}

// ============================================================================
// Trivy IaC Integration
// ============================================================================

interface TrivyIaCResult {
  SchemaVersion: number;
  ArtifactName: string;
  ArtifactType: string;
  Results: TrivyIaCTarget[];
}

interface TrivyIaCTarget {
  Target: string;
  Class: string;
  Type: string;
  Misconfigurations?: TrivyMisconfiguration[];
}

interface TrivyMisconfiguration {
  Type: string;
  ID: string;
  AVDID: string;
  Title: string;
  Description: string;
  Message: string;
  Namespace: string;
  Query: string;
  Resolution: string;
  Severity: string;
  PrimaryURL: string;
  References: string[];
  Status: string;
  Layer: unknown;
  CauseMetadata: {
    Resource: string;
    Provider: string;
    Service: string;
    StartLine: number;
    EndLine: number;
    Code?: {
      Lines: Array<{
        Number: number;
        Content: string;
        IsCause: boolean;
        Annotation: string;
        Truncated: boolean;
        FirstCause: boolean;
        LastCause: boolean;
      }>;
    };
  };
}

/**
 * Run Trivy IaC scanner
 */
async function runTrivyIaC(
  repoPath: string,
  config: IaCScannerConfig
): Promise<IaCScanResult> {
  const startTime = Date.now();
  const issues: IaCIssue[] = [];
  const frameworksDetected = new Set<IaCFramework>();

  try {
    // Check if trivy is available
    try {
      await execAsync('trivy --version');
    } catch {
      return {
        tool: 'trivy',
        issues: [],
        scanDuration: Date.now() - startTime,
        frameworksDetected: [],
        error: 'Trivy not installed. Install with: brew install trivy'
      };
    }

    // Build command for config scanning (IaC)
    let cmd = `trivy config "${repoPath}" --format json`;

    // Add exclusions (trivy uses .trivyignore or --skip-dirs)
    if (config.excludePaths && config.excludePaths.length > 0) {
      cmd += ` --skip-dirs ${config.excludePaths.join(',')}`;
    }

    // Run trivy
    const { stdout } = await execAsync(cmd, {
      maxBuffer: 100 * 1024 * 1024,
      timeout: 600000  // 10 minute timeout
    });

    // Parse results
    if (stdout.trim()) {
      try {
        const result: TrivyIaCResult = JSON.parse(stdout);

        for (const target of result.Results || []) {
          const framework = mapTrivyFramework(target.Type);
          frameworksDetected.add(framework);

          for (const misconfig of target.Misconfigurations || []) {
            issues.push({
              tool: 'trivy',
              file: target.Target,
              line: misconfig.CauseMetadata?.StartLine || 1,
              endLine: misconfig.CauseMetadata?.EndLine,
              framework,
              checkId: misconfig.ID || misconfig.AVDID,
              checkName: misconfig.Title,
              severity: mapTrivySeverity(misconfig.Severity),
              description: misconfig.Description || misconfig.Message,
              resource: misconfig.CauseMetadata?.Resource,
              guideline: misconfig.Resolution || misconfig.PrimaryURL,
              ruleId: `trivy/${misconfig.ID || misconfig.AVDID}`
            });
          }
        }
      } catch {
        // Non-JSON output
      }
    }

    return {
      tool: 'trivy',
      issues,
      scanDuration: Date.now() - startTime,
      frameworksDetected: Array.from(frameworksDetected)
    };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      tool: 'trivy',
      issues,
      scanDuration: Date.now() - startTime,
      frameworksDetected: Array.from(frameworksDetected),
      error: errorMessage
    };
  }
}

/**
 * Map Trivy type to IaCFramework
 */
function mapTrivyFramework(trivyType: string): IaCFramework {
  const mapping: Record<string, IaCFramework> = {
    terraform: 'terraform',
    cloudformation: 'cloudformation',
    kubernetes: 'kubernetes',
    helm: 'helm',
    dockerfile: 'dockerfile',
    azure: 'arm'
  };
  return mapping[trivyType.toLowerCase()] || 'unknown';
}

/**
 * Map Trivy severity
 */
function mapTrivySeverity(severity: string): IaCIssue['severity'] {
  const s = severity.toUpperCase();
  if (s === 'CRITICAL') return 'critical';
  if (s === 'HIGH') return 'high';
  if (s === 'MEDIUM') return 'medium';
  return 'low';
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Deduplicate issues from multiple scanners
 */
function deduplicateIssues(issues: IaCIssue[]): IaCIssue[] {
  const seen = new Map<string, IaCIssue>();

  for (const issue of issues) {
    // Create a key based on file, line, and resource
    const key = `${issue.file}:${issue.line}:${issue.resource || ''}:${issue.checkName}`;

    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, issue);
    } else {
      // Prefer higher severity
      if (severityRank(issue.severity) > severityRank(existing.severity)) {
        seen.set(key, issue);
      }
      // Prefer Checkov for its benchmarks info
      else if (issue.tool === 'checkov' && issue.benchmarks) {
        seen.set(key, issue);
      }
    }
  }

  return Array.from(seen.values());
}

function severityRank(severity: IaCIssue['severity']): number {
  const ranks = { critical: 4, high: 3, medium: 2, low: 1 };
  return ranks[severity];
}

// ============================================================================
// Main Scanner Class
// ============================================================================

export class IaCScanner {
  private config: IaCScannerConfig;

  constructor(config: Partial<IaCScannerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Run Checkov scanner
   */
  async runCheckov(repoPath: string): Promise<IaCScanResult> {
    return runCheckov(repoPath, this.config);
  }

  /**
   * Run Trivy IaC scanner
   */
  async runTrivy(repoPath: string): Promise<IaCScanResult> {
    return runTrivyIaC(repoPath, this.config);
  }

  /**
   * Run all IaC scanners and deduplicate results
   */
  async runAll(repoPath: string): Promise<{
    issues: IaCIssue[];
    results: IaCScanResult[];
    summary: {
      total: number;
      critical: number;
      high: number;
      medium: number;
      low: number;
      byFramework: Record<string, number>;
      byTool: Record<string, number>;
      frameworksDetected: IaCFramework[];
    };
  }> {
    // Run both scanners in parallel
    const [checkovResult, trivyResult] = await Promise.all([
      this.runCheckov(repoPath),
      this.runTrivy(repoPath)
    ]);

    // Combine and deduplicate
    const allIssues = [
      ...checkovResult.issues,
      ...trivyResult.issues
    ];
    const dedupedIssues = deduplicateIssues(allIssues);

    // Collect all detected frameworks
    const allFrameworks = new Set<IaCFramework>([
      ...checkovResult.frameworksDetected,
      ...trivyResult.frameworksDetected
    ]);

    // Calculate by-framework counts
    const byFramework: Record<string, number> = {};
    for (const issue of dedupedIssues) {
      byFramework[issue.framework] = (byFramework[issue.framework] || 0) + 1;
    }

    // Calculate summary
    const summary = {
      total: dedupedIssues.length,
      critical: dedupedIssues.filter(i => i.severity === 'critical').length,
      high: dedupedIssues.filter(i => i.severity === 'high').length,
      medium: dedupedIssues.filter(i => i.severity === 'medium').length,
      low: dedupedIssues.filter(i => i.severity === 'low').length,
      byFramework,
      byTool: {
        checkov: checkovResult.issues.length,
        trivy: trivyResult.issues.length
      },
      frameworksDetected: Array.from(allFrameworks)
    };

    return {
      issues: dedupedIssues,
      results: [checkovResult, trivyResult],
      summary
    };
  }

  /**
   * Detect which IaC frameworks are present in the repository
   */
  async detectFrameworks(repoPath: string): Promise<IaCFramework[]> {
    const frameworks = new Set<IaCFramework>();

    // Check for Terraform
    const tfFiles = await this.findFiles(repoPath, '*.tf');
    if (tfFiles.length > 0) frameworks.add('terraform');

    // Check for Kubernetes
    const k8sPatterns = ['*.yaml', '*.yml'];
    for (const pattern of k8sPatterns) {
      const files = await this.findFiles(repoPath, pattern);
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        if (content.includes('apiVersion:') && content.includes('kind:')) {
          frameworks.add('kubernetes');
          break;
        }
      }
    }

    // Check for Dockerfile
    const dockerfiles = await this.findFiles(repoPath, 'Dockerfile*');
    if (dockerfiles.length > 0) frameworks.add('dockerfile');

    // Check for Helm
    const helmFiles = await this.findFiles(repoPath, 'Chart.yaml');
    if (helmFiles.length > 0) frameworks.add('helm');

    // Check for CloudFormation
    const cfnFiles = await this.findFiles(repoPath, '*.template');
    if (cfnFiles.length > 0) frameworks.add('cloudformation');

    return Array.from(frameworks);
  }

  /**
   * Helper to find files matching a pattern
   */
  private async findFiles(repoPath: string, pattern: string): Promise<string[]> {
    try {
      const { stdout } = await execAsync(
        `find "${repoPath}" -name "${pattern}" -type f 2>/dev/null | head -100`,
        { maxBuffer: 10 * 1024 * 1024 }
      );
      return stdout.trim().split('\n').filter(f => f);
    } catch {
      return [];
    }
  }
}

// Export singleton for convenience
export const iacScanner = new IaCScanner();
