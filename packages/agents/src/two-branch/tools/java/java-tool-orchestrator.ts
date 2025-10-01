/**
 * Java Tool Orchestrator for V9
 *
 * Implements the 3-tool orchestration strategy calibrated on September 29-30, 2025:
 * - 2-stage pipeline: Semgrep → (PMD + Checkstyle) parallel
 * - Critical-only severity filtering (99.9% noise reduction)
 * - Total time: 139s (24% faster than sequential)
 *
 * @see /packages/agents/src/two-branch/docs/next/SEVERITY_FILTERING_STRATEGY.md
 * @see /tmp/SESSION_SUMMARY_2025-09-30_COMPLETE.md
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';
import { logger } from '../../utils/logger';

const execAsync = promisify(exec);

// ============================================================
// TYPES
// ============================================================

export interface JavaToolConfig {
  // Core tools (always enabled)
  pmd: {
    enabled: boolean;
    minimumPriority: 1 | 2;        // 1=critical only, 2=critical+high
    rulesets: string[];
    parallel: number;
    threads: number;
    memory: string;
  };
  checkstyle: {
    enabled: boolean;
    configFile: string;             // google_checks.xml
    parallel: number;
    memory: string;
    changedFilesOnly: boolean;
  };
  semgrep: {
    enabled: boolean;
    rulesets: string[];
    parallel: number;
    smartSelection: boolean;
    memory: string;
  };

  // Optional tools (disabled by default)
  spotbugs?: {
    enabled: boolean;
    priority: 'high' | 'medium' | 'low';
    effort: 'min' | 'default' | 'max';
    buildCommand?: string;          // e.g., "mvn compile"
    memory: string;
  };
  dependencyCheck?: {
    enabled: boolean;
    nvdApiKey?: string;
    failOnCVSS: number;             // e.g., 7.0 for HIGH and above
    updateFrequency: 'always' | 'daily' | 'weekly';
    suppressionFile?: string;
    timeout: number;
  };
}

export interface ToolResult {
  tool: string;
  success: boolean;
  duration: number;
  issues: RawIssue[];
  rawOutput?: string;
  error?: string;
  metadata: {
    filesScanned: number;
    issuesFound: number;
    severity: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
}

export interface RawIssue {
  tool: string;
  file: string;
  line: number;
  column?: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  rule: string;
  message: string;
  priority?: number;
  cvssScore?: number;
  cve?: string;
}

export interface OrchestrationResult {
  success: boolean;
  duration: number;
  toolResults: ToolResult[];
  summary: {
    totalIssues: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
    blockingIssues: number;
    toolsExecuted: number;
    toolsFailed: number;
  };
}

// ============================================================
// DEFAULT CONFIGURATION (From Calibration)
// ============================================================

export const DEFAULT_JAVA_CONFIG: JavaToolConfig = {
  pmd: {
    enabled: true,
    minimumPriority: 2,              // Critical + High
    rulesets: [
      'category/java/errorprone.xml',
      'category/java/bestpractices.xml'
    ],
    parallel: 2,
    threads: 3,
    memory: '5g'
  },
  checkstyle: {
    enabled: true,
    configFile: '/google_checks.xml',
    parallel: 2,
    memory: '3g',
    changedFilesOnly: true           // Only analyze changed files in PR context
  },
  semgrep: {
    enabled: true,
    rulesets: ['p/security-audit', 'p/java'],
    parallel: 4,
    smartSelection: true,            // Only security-critical files
    memory: '2g'
  },
  spotbugs: {
    enabled: false,                  // Optional - requires compilation
    priority: 'high',
    effort: 'default',
    memory: '4g'
  },
  dependencyCheck: {
    enabled: false,                  // Optional - requires NVD API key
    failOnCVSS: 7.0,                // Block only HIGH and CRITICAL
    updateFrequency: 'daily',
    timeout: 600
  }
};

// ============================================================
// MAIN ORCHESTRATOR CLASS
// ============================================================

export class JavaToolOrchestrator {
  private config: JavaToolConfig;
  private dockerImage: string;
  private workspaceDir: string;

  constructor(
    config: Partial<JavaToolConfig> = {},
    dockerImage: string = 'iad.ocir.io/codequal/analyzer:lang-java-v5.3-arm'
  ) {
    this.config = { ...DEFAULT_JAVA_CONFIG, ...config };
    this.dockerImage = dockerImage;
    this.workspaceDir = '/workspace';
  }

  /**
   * Main orchestration method - implements 2-stage pipeline
   *
   * Stage 1: Semgrep (security scan, 48s)
   * Stage 2: PMD + Checkstyle in parallel (91s)
   * Total: 139s (24% faster than sequential 183s)
   */
  async orchestrate(
    repoPath: string,
    branch: 'main' | 'pr',
    changedFiles?: string[]
  ): Promise<OrchestrationResult> {
    const startTime = Date.now();
    const toolResults: ToolResult[] = [];

    logger.info(`🎯 Starting Java Tool Orchestration (${branch} branch)`);
    logger.info(`📁 Repository: ${repoPath}`);
    logger.info(`🔧 Tools: ${this.getEnabledTools().join(', ')}`);

    try {
      // ============================================================
      // STAGE 1: Security Scan (Semgrep)
      // ============================================================
      if (this.config.semgrep.enabled) {
        logger.info('\n🔒 STAGE 1: Running Semgrep security scan...');
        const semgrepResult = await this.runSemgrep(repoPath, branch);
        toolResults.push(semgrepResult);

        logger.info(`✅ Semgrep complete: ${semgrepResult.duration}ms`);
        logger.info(`   Found: ${semgrepResult.metadata.issuesFound} security issues`);
      }

      // ============================================================
      // STAGE 2: Quality + Style (PMD + Checkstyle in parallel)
      // ============================================================
      logger.info('\n⚙️ STAGE 2: Running PMD + Checkstyle in parallel...');

      const stage2Promises: Promise<ToolResult>[] = [];

      // PMD - Code quality
      if (this.config.pmd.enabled) {
        stage2Promises.push(this.runPMD(repoPath, branch));
      }

      // Checkstyle - Code style
      if (this.config.checkstyle.enabled) {
        stage2Promises.push(
          this.runCheckstyle(repoPath, branch, changedFiles)
        );
      }

      // Wait for both to complete
      const stage2Results = await Promise.all(stage2Promises);
      toolResults.push(...stage2Results);

      for (const result of stage2Results) {
        logger.info(`✅ ${result.tool} complete: ${result.duration}ms`);
        logger.info(`   Found: ${result.metadata.issuesFound} issues`);
      }

      // ============================================================
      // OPTIONAL TOOLS (Sequential, if enabled)
      // ============================================================

      // SpotBugs (requires compilation)
      if (this.config.spotbugs?.enabled) {
        logger.info('\n🐛 Running SpotBugs (optional)...');
        const spotbugsResult = await this.runSpotBugs(repoPath, branch);
        toolResults.push(spotbugsResult);
        logger.info(`✅ SpotBugs complete: ${spotbugsResult.duration}ms`);
      }

      // Dependency-Check (requires NVD API key)
      if (this.config.dependencyCheck?.enabled) {
        logger.info('\n🔐 Running Dependency-Check (optional)...');
        const depCheckResult = await this.runDependencyCheck(repoPath, branch);
        toolResults.push(depCheckResult);
        logger.info(`✅ Dependency-Check complete: ${depCheckResult.duration}ms`);
      }

      // ============================================================
      // AGGREGATE RESULTS
      // ============================================================
      const duration = Date.now() - startTime;
      const summary = this.aggregateResults(toolResults);

      logger.info(`\n✅ Orchestration complete in ${duration}ms`);
      logger.info(`📊 Total issues found: ${summary.totalIssues}`);
      logger.info(`🚨 Blocking issues (critical): ${summary.blockingIssues}`);

      return {
        success: true,
        duration,
        toolResults,
        summary
      };

    } catch (error: any) {
      logger.error('❌ Orchestration failed:', error);
      return {
        success: false,
        duration: Date.now() - startTime,
        toolResults,
        summary: this.aggregateResults(toolResults)
      };
    }
  }

  // ============================================================
  // TOOL EXECUTION METHODS
  // ============================================================

  /**
   * Run PMD with severity filtering
   * Calibrated settings: Priority 1-2 only (138 critical, 2,245 high)
   */
  private async runPMD(
    repoPath: string,
    branch: string
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      const rulesets = this.config.pmd.rulesets.join(',');
      const command = `
        docker run --rm \\
          -v ${repoPath}:/workspace \\
          ${this.dockerImage} \\
          bash -c 'pmd check \\
            -d /workspace \\
            -f json \\
            -R ${rulesets} \\
            --minimum-priority ${this.config.pmd.minimumPriority} \\
            --threads ${this.config.pmd.threads} \\
            --cache /tmp/pmd-cache \\
            > /workspace/pmd-results-${branch}.json 2>&1 || true'
      `;

      await execAsync(command);

      // Parse results
      const resultPath = path.join(repoPath, `pmd-results-${branch}.json`);
      const rawOutput = await fs.readFile(resultPath, 'utf-8');
      const issues = this.parsePMDOutput(rawOutput);

      return {
        tool: 'PMD',
        success: true,
        duration: Date.now() - startTime,
        issues,
        rawOutput,
        metadata: this.calculateMetadata(issues)
      };

    } catch (error: any) {
      logger.error('PMD execution failed:', error);
      return {
        tool: 'PMD',
        success: false,
        duration: Date.now() - startTime,
        issues: [],
        error: error.message,
        metadata: {
          filesScanned: 0,
          issuesFound: 0,
          severity: { critical: 0, high: 0, medium: 0, low: 0 }
        }
      };
    }
  }

  /**
   * Run Checkstyle on changed files only (PR context)
   * Note: All Checkstyle violations are "warning" severity (0 errors)
   */
  private async runCheckstyle(
    repoPath: string,
    branch: string,
    changedFiles?: string[]
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      // If changed files provided and changedFilesOnly enabled, scan only those
      let filesToScan = '/workspace/**/*.java';
      if (this.config.checkstyle.changedFilesOnly && changedFiles) {
        // Filter for Java files only
        const javaFiles = changedFiles.filter(f => f.endsWith('.java'));
        if (javaFiles.length === 0) {
          logger.info('No Java files changed, skipping Checkstyle');
          return {
            tool: 'Checkstyle',
            success: true,
            duration: Date.now() - startTime,
            issues: [],
            metadata: {
              filesScanned: 0,
              issuesFound: 0,
              severity: { critical: 0, high: 0, medium: 0, low: 0 }
            }
          };
        }
        filesToScan = javaFiles.map(f => `/workspace/${f}`).join(' ');
      }

      const command = `
        docker run --rm \\
          -v ${repoPath}:/workspace \\
          ${this.dockerImage} \\
          bash -c 'checkstyle \\
            -c ${this.config.checkstyle.configFile} \\
            -f json \\
            ${filesToScan} \\
            > /workspace/checkstyle-results-${branch}.json 2>&1 || true'
      `;

      await execAsync(command);

      // Parse results
      const resultPath = path.join(repoPath, `checkstyle-results-${branch}.json`);
      const rawOutput = await fs.readFile(resultPath, 'utf-8');
      const issues = this.parseCheckstyleOutput(rawOutput);

      return {
        tool: 'Checkstyle',
        success: true,
        duration: Date.now() - startTime,
        issues,
        rawOutput,
        metadata: this.calculateMetadata(issues)
      };

    } catch (error: any) {
      logger.error('Checkstyle execution failed:', error);
      return {
        tool: 'Checkstyle',
        success: false,
        duration: Date.now() - startTime,
        issues: [],
        error: error.message,
        metadata: {
          filesScanned: 0,
          issuesFound: 0,
          severity: { critical: 0, high: 0, medium: 0, low: 0 }
        }
      };
    }
  }

  /**
   * Run Semgrep with smart file selection
   * Calibrated settings: Only security-critical files (74% faster)
   */
  private async runSemgrep(
    repoPath: string,
    branch: string
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      // Smart file selection patterns (from calibration)
      const patterns = this.config.semgrep.smartSelection
        ? [
            '*Controller*.java',
            '*Resource*.java',
            '*Handler*.java',
            'Auth*.java',
            'Security*.java',
            'Permission*.java',
            '*Repository.java',
            '*DAO.java',
            '*Query*.java',
            '*Serializer*.java',
            '*Deserializer*.java'
          ].join(',')
        : '**/*.java';

      const rulesets = this.config.semgrep.rulesets.join(' --config ');

      const command = `
        docker run --rm \\
          -v ${repoPath}:/workspace \\
          ${this.dockerImage} \\
          bash -c 'cd /workspace && semgrep \\
            --config ${rulesets} \\
            --json \\
            ${this.config.semgrep.smartSelection ? `--include "${patterns}"` : ''} \\
            . \\
            > semgrep-results-${branch}.json 2>&1 || true'
      `;

      await execAsync(command);

      // Parse results
      const resultPath = path.join(repoPath, `semgrep-results-${branch}.json`);
      const rawOutput = await fs.readFile(resultPath, 'utf-8');
      const issues = this.parseSemgrepOutput(rawOutput);

      return {
        tool: 'Semgrep',
        success: true,
        duration: Date.now() - startTime,
        issues,
        rawOutput,
        metadata: this.calculateMetadata(issues)
      };

    } catch (error: any) {
      logger.error('Semgrep execution failed:', error);
      return {
        tool: 'Semgrep',
        success: false,
        duration: Date.now() - startTime,
        issues: [],
        error: error.message,
        metadata: {
          filesScanned: 0,
          issuesFound: 0,
          severity: { critical: 0, high: 0, medium: 0, low: 0 }
        }
      };
    }
  }

  /**
   * Run SpotBugs (optional - requires compilation)
   */
  private async runSpotBugs(
    repoPath: string,
    branch: string
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      // Step 1: Compile if build command provided
      if (this.config.spotbugs?.buildCommand) {
        logger.info('  Compiling project for SpotBugs...');
        await execAsync(this.config.spotbugs.buildCommand, { cwd: repoPath });
      }

      // Step 2: Run SpotBugs on compiled classes
      const command = `
        docker run --rm \\
          -v ${repoPath}:/workspace \\
          ${this.dockerImage} \\
          bash -c 'spotbugs \\
            -${this.config.spotbugs?.priority} \\
            -effort:${this.config.spotbugs?.effort} \\
            -xml:withMessages \\
            -output /workspace/spotbugs-results-${branch}.xml \\
            /workspace/target/classes /workspace/build/classes 2>&1 || true'
      `;

      await execAsync(command);

      // Parse results
      const resultPath = path.join(repoPath, `spotbugs-results-${branch}.xml`);
      const rawOutput = await fs.readFile(resultPath, 'utf-8');
      const issues = this.parseSpotBugsOutput(rawOutput);

      return {
        tool: 'SpotBugs',
        success: true,
        duration: Date.now() - startTime,
        issues,
        rawOutput,
        metadata: this.calculateMetadata(issues)
      };

    } catch (error: any) {
      logger.error('SpotBugs execution failed:', error);
      return {
        tool: 'SpotBugs',
        success: false,
        duration: Date.now() - startTime,
        issues: [],
        error: error.message,
        metadata: {
          filesScanned: 0,
          issuesFound: 0,
          severity: { critical: 0, high: 0, medium: 0, low: 0 }
        }
      };
    }
  }

  /**
   * Run Dependency-Check (optional - requires NVD API key)
   */
  private async runDependencyCheck(
    repoPath: string,
    branch: string
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      if (!this.config.dependencyCheck?.nvdApiKey) {
        throw new Error('NVD_API_KEY is required for Dependency-Check');
      }

      const command = `
        docker run --rm \\
          -v ${repoPath}:/workspace \\
          -v /data/dependency-check:/data/dependency-check \\
          -e NVD_API_KEY=${this.config.dependencyCheck.nvdApiKey} \\
          ${this.dockerImage} \\
          bash -c 'dependency-check \\
            --scan /workspace \\
            --format JSON \\
            --out /workspace/dependency-check-results-${branch} \\
            --nvdApiKey $NVD_API_KEY \\
            --failOnCVSS ${this.config.dependencyCheck.failOnCVSS} \\
            --data /data/dependency-check 2>&1 || true'
      `;

      await execAsync(command, {
        timeout: this.config.dependencyCheck.timeout * 1000
      });

      // Parse results
      const resultPath = path.join(
        repoPath,
        `dependency-check-results-${branch}`,
        'dependency-check-report.json'
      );
      const rawOutput = await fs.readFile(resultPath, 'utf-8');
      const issues = this.parseDependencyCheckOutput(rawOutput);

      return {
        tool: 'Dependency-Check',
        success: true,
        duration: Date.now() - startTime,
        issues,
        rawOutput,
        metadata: this.calculateMetadata(issues)
      };

    } catch (error: any) {
      logger.error('Dependency-Check execution failed:', error);
      return {
        tool: 'Dependency-Check',
        success: false,
        duration: Date.now() - startTime,
        issues: [],
        error: error.message,
        metadata: {
          filesScanned: 0,
          issuesFound: 0,
          severity: { critical: 0, high: 0, medium: 0, low: 0 }
        }
      };
    }
  }

  // ============================================================
  // PARSING METHODS (Placeholders - implement based on actual output formats)
  // ============================================================

  private parsePMDOutput(output: string): RawIssue[] {
    // TODO: Implement PMD JSON parsing
    // See: packages/agents/src/two-branch/parsers/java-tool-parser.ts
    return [];
  }

  private parseCheckstyleOutput(output: string): RawIssue[] {
    // TODO: Implement Checkstyle JSON parsing
    return [];
  }

  private parseSemgrepOutput(output: string): RawIssue[] {
    // TODO: Implement Semgrep JSON parsing
    return [];
  }

  private parseSpotBugsOutput(output: string): RawIssue[] {
    // TODO: Implement SpotBugs XML parsing
    return [];
  }

  private parseDependencyCheckOutput(output: string): RawIssue[] {
    // TODO: Implement Dependency-Check JSON parsing
    return [];
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  private getEnabledTools(): string[] {
    const tools: string[] = [];
    if (this.config.pmd.enabled) tools.push('PMD');
    if (this.config.checkstyle.enabled) tools.push('Checkstyle');
    if (this.config.semgrep.enabled) tools.push('Semgrep');
    if (this.config.spotbugs?.enabled) tools.push('SpotBugs');
    if (this.config.dependencyCheck?.enabled) tools.push('Dependency-Check');
    return tools;
  }

  private calculateMetadata(issues: RawIssue[]) {
    const severity = {
      critical: issues.filter(i => i.severity === 'critical').length,
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length
    };

    return {
      filesScanned: new Set(issues.map(i => i.file)).size,
      issuesFound: issues.length,
      severity
    };
  }

  private aggregateResults(results: ToolResult[]) {
    const allIssues = results.flatMap(r => r.issues);

    return {
      totalIssues: allIssues.length,
      criticalIssues: allIssues.filter(i => i.severity === 'critical').length,
      highIssues: allIssues.filter(i => i.severity === 'high').length,
      mediumIssues: allIssues.filter(i => i.severity === 'medium').length,
      lowIssues: allIssues.filter(i => i.severity === 'low').length,
      blockingIssues: allIssues.filter(i =>
        i.severity === 'critical' || i.severity === 'high'
      ).length,
      toolsExecuted: results.filter(r => r.success).length,
      toolsFailed: results.filter(r => !r.success).length
    };
  }
}

// ============================================================
// EXPORTS
// ============================================================

export default JavaToolOrchestrator;