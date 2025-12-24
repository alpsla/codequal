/**
 * Universal Container Security Scanner
 *
 * Integrates Trivy and Grype for comprehensive container security scanning.
 * Detects vulnerabilities in container images, generates SBOMs, and analyzes Dockerfiles.
 *
 * Tools:
 * - Trivy: All-in-one scanner (images, filesystems, SBOM generation)
 * - Grype: Fast SBOM-based vulnerability scanning
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

// ============================================================================
// Types
// ============================================================================

export interface ContainerVulnerability {
  tool: 'trivy' | 'grype';
  vulnerabilityId: string;
  pkgName: string;
  installedVersion: string;
  fixedVersion?: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'negligible';
  title: string;
  description?: string;
  references?: string[];
  cvss?: number;
  publishedDate?: string;
  lastModifiedDate?: string;
}

export interface DockerfileIssue {
  file: string;
  line: number;
  rule: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'negligible';
  message: string;
  description?: string;
}

export interface ContainerScanResult {
  tool: string;
  target: string;
  vulnerabilities: ContainerVulnerability[];
  dockerfileIssues?: DockerfileIssue[];
  scanDuration: number;
  error?: string;
}

export interface ContainerScannerConfig {
  severityThreshold?: 'critical' | 'high' | 'medium' | 'low';
  ignoreUnfixed?: boolean;
  scanDockerfiles?: boolean;
  generateSBOM?: boolean;
  timeout?: number;  // in milliseconds
}

const DEFAULT_CONFIG: ContainerScannerConfig = {
  severityThreshold: 'medium',
  ignoreUnfixed: false,
  scanDockerfiles: true,
  generateSBOM: false,
  timeout: 300000  // 5 minutes
};

// ============================================================================
// Trivy Container Scanner
// ============================================================================

interface TrivyVulnerability {
  VulnerabilityID: string;
  PkgName: string;
  InstalledVersion: string;
  FixedVersion: string;
  Severity: string;
  Title: string;
  Description: string;
  References: string[];
  CVSS?: {
    nvd?: { V3Score?: number };
    redhat?: { V3Score?: number };
  };
  PublishedDate?: string;
  LastModifiedDate?: string;
}

interface TrivyResult {
  Target: string;
  Class: string;
  Type: string;
  Vulnerabilities?: TrivyVulnerability[];
  Misconfigurations?: Array<{
    Type: string;
    ID: string;
    Title: string;
    Description: string;
    Message: string;
    Severity: string;
    PrimaryURL: string;
    References: string[];
    Status: string;
    Layer?: {
      Digest: string;
      DiffID: string;
    };
    CauseMetadata?: {
      Provider: string;
      Service: string;
      StartLine: number;
      EndLine: number;
      Code?: {
        Lines: Array<{
          Number: number;
          Content: string;
          Highlighted: string;
        }>;
      };
    };
  }>;
}

interface TrivyReport {
  Results?: TrivyResult[];
}

/**
 * Run Trivy container image scanner
 */
async function runTrivyImage(
  imageName: string,
  config: ContainerScannerConfig
): Promise<ContainerScanResult> {
  const startTime = Date.now();
  const vulnerabilities: ContainerVulnerability[] = [];

  try {
    // Check if trivy is available
    try {
      await execAsync('trivy version');
    } catch {
      return {
        tool: 'trivy',
        target: imageName,
        vulnerabilities: [],
        scanDuration: Date.now() - startTime,
        error: 'Trivy not installed. Install with: brew install trivy'
      };
    }

    // Build command
    const reportPath = path.join('/tmp', `trivy-image-${Date.now()}.json`);
    let cmd = `trivy image --format json --output "${reportPath}" "${imageName}"`;

    if (config.severityThreshold) {
      const severityMap: Record<string, string> = {
        critical: 'CRITICAL',
        high: 'CRITICAL,HIGH',
        medium: 'CRITICAL,HIGH,MEDIUM',
        low: 'CRITICAL,HIGH,MEDIUM,LOW'
      };
      cmd += ` --severity ${severityMap[config.severityThreshold]}`;
    }

    if (config.ignoreUnfixed) {
      cmd += ' --ignore-unfixed';
    }

    // Run trivy
    try {
      await execAsync(cmd, {
        maxBuffer: 100 * 1024 * 1024,
        timeout: config.timeout
      });
    } catch (error: unknown) {
      // Trivy may exit with non-zero if vulnerabilities found
      const execError = error as { code?: number; killed?: boolean };
      if (execError.killed) {
        throw new Error('Trivy scan timed out');
      }
    }

    // Parse results
    if (fs.existsSync(reportPath)) {
      const reportContent = fs.readFileSync(reportPath, 'utf-8');
      if (reportContent.trim()) {
        const report: TrivyReport = JSON.parse(reportContent);

        if (report.Results) {
          for (const result of report.Results) {
            if (result.Vulnerabilities) {
              for (const vuln of result.Vulnerabilities) {
                vulnerabilities.push({
                  tool: 'trivy',
                  vulnerabilityId: vuln.VulnerabilityID,
                  pkgName: vuln.PkgName,
                  installedVersion: vuln.InstalledVersion,
                  fixedVersion: vuln.FixedVersion || undefined,
                  severity: mapTrivySeverity(vuln.Severity),
                  title: vuln.Title,
                  description: vuln.Description,
                  references: vuln.References,
                  cvss: vuln.CVSS?.nvd?.V3Score || vuln.CVSS?.redhat?.V3Score,
                  publishedDate: vuln.PublishedDate,
                  lastModifiedDate: vuln.LastModifiedDate
                });
              }
            }
          }
        }
      }

      // Cleanup
      fs.unlinkSync(reportPath);
    }

    return {
      tool: 'trivy',
      target: imageName,
      vulnerabilities,
      scanDuration: Date.now() - startTime
    };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      tool: 'trivy',
      target: imageName,
      vulnerabilities,
      scanDuration: Date.now() - startTime,
      error: errorMessage
    };
  }
}

/**
 * Run Trivy filesystem scanner (for Dockerfiles in a repo)
 */
async function runTrivyFilesystem(
  repoPath: string,
  config: ContainerScannerConfig
): Promise<ContainerScanResult> {
  const startTime = Date.now();
  const vulnerabilities: ContainerVulnerability[] = [];
  const dockerfileIssues: DockerfileIssue[] = [];

  try {
    // Check if trivy is available
    try {
      await execAsync('trivy version');
    } catch {
      return {
        tool: 'trivy',
        target: repoPath,
        vulnerabilities: [],
        dockerfileIssues: [],
        scanDuration: Date.now() - startTime,
        error: 'Trivy not installed. Install with: brew install trivy'
      };
    }

    // Build command for config scanning (Dockerfiles, etc.)
    const reportPath = path.join('/tmp', `trivy-fs-${Date.now()}.json`);
    let cmd = `trivy config --format json --output "${reportPath}" "${repoPath}"`;

    if (config.severityThreshold) {
      const severityMap: Record<string, string> = {
        critical: 'CRITICAL',
        high: 'CRITICAL,HIGH',
        medium: 'CRITICAL,HIGH,MEDIUM',
        low: 'CRITICAL,HIGH,MEDIUM,LOW'
      };
      cmd += ` --severity ${severityMap[config.severityThreshold]}`;
    }

    // Run trivy
    try {
      await execAsync(cmd, {
        maxBuffer: 100 * 1024 * 1024,
        timeout: config.timeout
      });
    } catch (error: unknown) {
      // Trivy may exit with non-zero if issues found
      const execError = error as { killed?: boolean };
      if (execError.killed) {
        throw new Error('Trivy scan timed out');
      }
    }

    // Parse results
    if (fs.existsSync(reportPath)) {
      const reportContent = fs.readFileSync(reportPath, 'utf-8');
      if (reportContent.trim()) {
        const report: TrivyReport = JSON.parse(reportContent);

        if (report.Results) {
          for (const result of report.Results) {
            // Process Dockerfile misconfigurations
            if (result.Misconfigurations) {
              for (const misconfig of result.Misconfigurations) {
                const line = misconfig.CauseMetadata?.StartLine || 1;
                dockerfileIssues.push({
                  file: result.Target,
                  line,
                  rule: misconfig.ID,
                  severity: mapTrivySeverity(misconfig.Severity),
                  message: misconfig.Message,
                  description: misconfig.Description
                });
              }
            }
          }
        }
      }

      // Cleanup
      fs.unlinkSync(reportPath);
    }

    return {
      tool: 'trivy',
      target: repoPath,
      vulnerabilities,
      dockerfileIssues,
      scanDuration: Date.now() - startTime
    };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      tool: 'trivy',
      target: repoPath,
      vulnerabilities,
      dockerfileIssues,
      scanDuration: Date.now() - startTime,
      error: errorMessage
    };
  }
}

/**
 * Map Trivy severity to standard severity
 */
function mapTrivySeverity(severity: string): ContainerVulnerability['severity'] {
  const severityLower = severity.toLowerCase();
  if (severityLower === 'critical') return 'critical';
  if (severityLower === 'high') return 'high';
  if (severityLower === 'medium') return 'medium';
  if (severityLower === 'low') return 'low';
  return 'negligible';
}

// ============================================================================
// Grype Scanner
// ============================================================================

interface GrypeMatch {
  vulnerability: {
    id: string;
    dataSource: string;
    severity: string;
    urls: string[];
    description: string;
    cvss: Array<{
      version: string;
      vector: string;
      metrics: {
        baseScore: number;
      };
    }>;
    fix: {
      versions: string[];
      state: string;
    };
  };
  artifact: {
    name: string;
    version: string;
    type: string;
    locations: Array<{
      path: string;
    }>;
  };
}

interface GrypeReport {
  matches?: GrypeMatch[];
}

/**
 * Run Grype vulnerability scanner
 */
async function runGrype(
  target: string,
  isImage: boolean,
  config: ContainerScannerConfig
): Promise<ContainerScanResult> {
  const startTime = Date.now();
  const vulnerabilities: ContainerVulnerability[] = [];

  try {
    // Check if grype is available
    try {
      await execAsync('grype version');
    } catch {
      return {
        tool: 'grype',
        target,
        vulnerabilities: [],
        scanDuration: Date.now() - startTime,
        error: 'Grype not installed. Install with: brew install grype'
      };
    }

    // Build command
    const reportPath = path.join('/tmp', `grype-${Date.now()}.json`);
    let cmd: string;

    if (isImage) {
      cmd = `grype "${target}" -o json --file "${reportPath}"`;
    } else {
      cmd = `grype dir:"${target}" -o json --file "${reportPath}"`;
    }

    if (config.ignoreUnfixed) {
      cmd += ' --only-fixed';
    }

    // Run grype
    try {
      await execAsync(cmd, {
        maxBuffer: 100 * 1024 * 1024,
        timeout: config.timeout
      });
    } catch (error: unknown) {
      // Grype may exit with non-zero if vulnerabilities found
      const execError = error as { killed?: boolean };
      if (execError.killed) {
        throw new Error('Grype scan timed out');
      }
    }

    // Parse results
    if (fs.existsSync(reportPath)) {
      const reportContent = fs.readFileSync(reportPath, 'utf-8');
      if (reportContent.trim()) {
        const report: GrypeReport = JSON.parse(reportContent);

        if (report.matches) {
          for (const match of report.matches) {
            const vuln = match.vulnerability;
            const artifact = match.artifact;

            vulnerabilities.push({
              tool: 'grype',
              vulnerabilityId: vuln.id,
              pkgName: artifact.name,
              installedVersion: artifact.version,
              fixedVersion: vuln.fix?.versions?.[0],
              severity: mapGrypeSeverity(vuln.severity),
              title: `${vuln.id} in ${artifact.name}`,
              description: vuln.description,
              references: vuln.urls,
              cvss: vuln.cvss?.[0]?.metrics?.baseScore
            });
          }
        }
      }

      // Cleanup
      fs.unlinkSync(reportPath);
    }

    return {
      tool: 'grype',
      target,
      vulnerabilities,
      scanDuration: Date.now() - startTime
    };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      tool: 'grype',
      target,
      vulnerabilities,
      scanDuration: Date.now() - startTime,
      error: errorMessage
    };
  }
}

/**
 * Map Grype severity to standard severity
 */
function mapGrypeSeverity(severity: string): ContainerVulnerability['severity'] {
  const severityLower = severity.toLowerCase();
  if (severityLower === 'critical') return 'critical';
  if (severityLower === 'high') return 'high';
  if (severityLower === 'medium') return 'medium';
  if (severityLower === 'low') return 'low';
  return 'negligible';
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Deduplicate vulnerabilities from multiple scanners
 */
function deduplicateVulnerabilities(
  vulns: ContainerVulnerability[]
): ContainerVulnerability[] {
  const seen = new Map<string, ContainerVulnerability>();

  for (const vuln of vulns) {
    const key = `${vuln.vulnerabilityId}:${vuln.pkgName}:${vuln.installedVersion}`;

    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, vuln);
    } else {
      // Prefer vulnerability with more info (fixed version, CVSS, etc.)
      if (!existing.fixedVersion && vuln.fixedVersion) {
        seen.set(key, vuln);
      } else if (!existing.cvss && vuln.cvss) {
        seen.set(key, vuln);
      }
    }
  }

  return Array.from(seen.values());
}

/**
 * Find all Dockerfiles in a repository
 */
async function findDockerfiles(repoPath: string): Promise<string[]> {
  const dockerfiles: string[] = [];

  const findCmd = `find "${repoPath}" -name "Dockerfile*" -o -name "*.dockerfile" 2>/dev/null`;
  try {
    const { stdout } = await execAsync(findCmd);
    const files = stdout.trim().split('\n').filter(f => f);
    dockerfiles.push(...files);
  } catch {
    // Ignore errors
  }

  return dockerfiles;
}

function severityRank(severity: ContainerVulnerability['severity']): number {
  const ranks = { critical: 5, high: 4, medium: 3, low: 2, negligible: 1 };
  return ranks[severity];
}

// ============================================================================
// Main Scanner Class
// ============================================================================

export class ContainerScanner {
  private config: ContainerScannerConfig;

  constructor(config: Partial<ContainerScannerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Scan a container image with Trivy
   */
  async scanImageWithTrivy(imageName: string): Promise<ContainerScanResult> {
    return runTrivyImage(imageName, this.config);
  }

  /**
   * Scan a container image with Grype
   */
  async scanImageWithGrype(imageName: string): Promise<ContainerScanResult> {
    return runGrype(imageName, true, this.config);
  }

  /**
   * Scan Dockerfiles in a repository with Trivy
   */
  async scanDockerfiles(repoPath: string): Promise<ContainerScanResult> {
    return runTrivyFilesystem(repoPath, this.config);
  }

  /**
   * Scan a directory (filesystem) with Grype for dependencies
   */
  async scanFilesystemWithGrype(repoPath: string): Promise<ContainerScanResult> {
    return runGrype(repoPath, false, this.config);
  }

  /**
   * Run comprehensive scan on a container image (both tools)
   */
  async scanImage(imageName: string): Promise<{
    vulnerabilities: ContainerVulnerability[];
    results: ContainerScanResult[];
    summary: {
      total: number;
      critical: number;
      high: number;
      medium: number;
      low: number;
      withFix: number;
      byTool: Record<string, number>;
    };
  }> {
    // Run both scanners in parallel
    const [trivyResult, grypeResult] = await Promise.all([
      this.scanImageWithTrivy(imageName),
      this.scanImageWithGrype(imageName)
    ]);

    // Combine and deduplicate
    const allVulns = [
      ...trivyResult.vulnerabilities,
      ...grypeResult.vulnerabilities
    ];
    const dedupedVulns = deduplicateVulnerabilities(allVulns);

    // Sort by severity
    dedupedVulns.sort((a, b) => severityRank(b.severity) - severityRank(a.severity));

    // Calculate summary
    const summary = {
      total: dedupedVulns.length,
      critical: dedupedVulns.filter(v => v.severity === 'critical').length,
      high: dedupedVulns.filter(v => v.severity === 'high').length,
      medium: dedupedVulns.filter(v => v.severity === 'medium').length,
      low: dedupedVulns.filter(v => v.severity === 'low').length,
      withFix: dedupedVulns.filter(v => v.fixedVersion).length,
      byTool: {
        trivy: trivyResult.vulnerabilities.length,
        grype: grypeResult.vulnerabilities.length
      }
    };

    return {
      vulnerabilities: dedupedVulns,
      results: [trivyResult, grypeResult],
      summary
    };
  }

  /**
   * Run comprehensive scan on a repository (Dockerfiles + dependencies)
   */
  async scanRepository(repoPath: string): Promise<{
    vulnerabilities: ContainerVulnerability[];
    dockerfileIssues: DockerfileIssue[];
    dockerfiles: string[];
    results: ContainerScanResult[];
    summary: {
      totalVulnerabilities: number;
      totalDockerfileIssues: number;
      critical: number;
      high: number;
      medium: number;
      low: number;
      withFix: number;
    };
  }> {
    // Find Dockerfiles first
    const dockerfiles = await findDockerfiles(repoPath);

    // Run scanners in parallel
    const [trivyFsResult, grypeFsResult] = await Promise.all([
      this.scanDockerfiles(repoPath),
      this.scanFilesystemWithGrype(repoPath)
    ]);

    // Combine vulnerabilities
    const allVulns = [
      ...grypeFsResult.vulnerabilities
    ];
    const dedupedVulns = deduplicateVulnerabilities(allVulns);

    // Collect Dockerfile issues
    const dockerfileIssues = trivyFsResult.dockerfileIssues || [];

    // Sort by severity
    dedupedVulns.sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
    dockerfileIssues.sort((a, b) => severityRank(b.severity) - severityRank(a.severity));

    // Calculate summary
    const summary = {
      totalVulnerabilities: dedupedVulns.length,
      totalDockerfileIssues: dockerfileIssues.length,
      critical: dedupedVulns.filter(v => v.severity === 'critical').length +
                dockerfileIssues.filter(i => i.severity === 'critical').length,
      high: dedupedVulns.filter(v => v.severity === 'high').length +
            dockerfileIssues.filter(i => i.severity === 'high').length,
      medium: dedupedVulns.filter(v => v.severity === 'medium').length +
              dockerfileIssues.filter(i => i.severity === 'medium').length,
      low: dedupedVulns.filter(v => v.severity === 'low').length +
           dockerfileIssues.filter(i => i.severity === 'low').length,
      withFix: dedupedVulns.filter(v => v.fixedVersion).length
    };

    return {
      vulnerabilities: dedupedVulns,
      dockerfileIssues,
      dockerfiles,
      results: [trivyFsResult, grypeFsResult],
      summary
    };
  }
}

// Export singleton for convenience
export const containerScanner = new ContainerScanner();
