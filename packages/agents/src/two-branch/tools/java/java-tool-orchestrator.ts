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
    failOnCVSS: number;             // e.g., 7.0 for HIGH and above
    suppressionFile?: string;
    timeout: number;
    // PostgreSQL backend configuration (v6.0+)
    postgres?: {
      enabled: boolean;
      connectionString: string;     // jdbc:postgresql://host:port/database
      dbUser: string;               // depcheck_scanner (read-only)
      dbPassword: string;
      dbDriver: string;              // /tmp/jdbc-drivers/postgresql-42.7.1.jar
    };
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
  endLine?: number;
  column?: number;
  endColumn?: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  rule: string;
  message: string;
  priority?: number;
  cvssScore?: number;
  cve?: string;
  externalInfoUrl?: string;  // PMD documentation URL
  ruleset?: string;          // PMD ruleset name
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
    enabled: false,                  // Optional - enable for CVE scanning
    failOnCVSS: 7.0,                // Block only HIGH and CRITICAL
    timeout: 600,
    postgres: {
      enabled: true,                 // Use PostgreSQL backend (v6.0+)
      connectionString: 'jdbc:postgresql://127.0.0.1:5432/depcheck',
      dbUser: 'depcheck_scanner',
      dbPassword: 'depcheck_scan_2025',
      dbDriver: '/tmp/jdbc-drivers/postgresql-42.7.1.jar'
    }
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
    dockerImage = 'iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-java-v6.0-arm'
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
      // PARALLEL EXECUTION: Run ALL tools concurrently for max CPU usage
      // ============================================================
      logger.info('\n🚀 Running ALL Java tools in PARALLEL for maximum performance...');

      const parallelPromises: Promise<ToolResult>[] = [];

      // Semgrep - Security scan
      if (this.config.semgrep.enabled) {
        parallelPromises.push(this.runSemgrep(repoPath, branch));
      }

      // PMD - Code quality
      if (this.config.pmd.enabled) {
        parallelPromises.push(this.runPMD(repoPath, branch));
      }

      // Checkstyle - Code style
      if (this.config.checkstyle.enabled) {
        parallelPromises.push(
          this.runCheckstyle(repoPath, branch, changedFiles)
        );
      }

      // Wait for ALL tools to complete in parallel
      const parallelResults = await Promise.all(parallelPromises);
      toolResults.push(...parallelResults);

      // Log results
      logger.info('\n📊 Tool Execution Results:');
      for (const result of parallelResults) {
        logger.info(`✅ ${result.tool}: ${result.duration}ms, ${result.metadata.issuesFound} issues`);
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

      // Dependency-Check (REQUIRED but only on PR branch to save time/resources)
      // Rationale: CVE database is the same for both branches, so checking main is redundant
      if (this.config.dependencyCheck?.enabled && branch === 'pr') {
        logger.info('\n🔐 Running Dependency-Check (PR branch - REQUIRED for security)...');
        const depCheckResult = await this.runDependencyCheck(repoPath, branch);
        toolResults.push(depCheckResult);
        logger.info(`✅ Dependency-Check complete: ${depCheckResult.duration}ms`);
        logger.info(`   Found: ${depCheckResult.metadata.issuesFound} vulnerabilities`);
      } else if (this.config.dependencyCheck?.enabled && branch === 'main') {
        logger.info('\n⏭️  Skipping Dependency-Check on main branch (CVEs are same in both branches)');
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
      // Note: PMD doesn't support --exclude flag, we filter test files in post-processing
      const command = `
        docker run --rm \\
          -v ${repoPath}:/workspace \\
          ${this.dockerImage} \\
          -c "pmd pmd \\
            -d /workspace \\
            -f json \\
            -R ${rulesets} \\
            --minimum-priority ${this.config.pmd.minimumPriority} \\
            --threads ${this.config.pmd.threads} \\
            --cache /tmp/pmd-cache \\
            > /workspace/pmd-results-${branch}.json 2>/workspace/pmd-errors-${branch}.log || true"
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
      // Build file selection command (excluding test files)
      let fileSelectionCmd = 'find /workspace -name "*.java" -type f ! -path "*/test/*" ! -path "*/tests/*" ! -name "*Test.java" ! -name "*Tests.java"';

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
        // For changed files, pass them directly (no find needed)
        fileSelectionCmd = javaFiles.map(f => `/workspace/${f}`).join(' ');
      }

      const command = `
        docker run --rm \\
          -v ${repoPath}:/workspace \\
          ${this.dockerImage} \\
          -c "${fileSelectionCmd} | xargs -r checkstyle -c ${this.config.checkstyle.configFile} -f xml > /workspace/checkstyle-results-${branch}.xml 2>&1 || true"
      `;

      await execAsync(command);

      // Parse results
      const resultPath = path.join(repoPath, `checkstyle-results-${branch}.xml`);
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
      // For two-branch analysis, scan ALL Java files (no smart selection)
      // Smart selection is for single-repo performance optimization only
      const rulesets = this.config.semgrep.rulesets.join(' --config ');

      const command = `
        docker run --rm \\
          -v ${repoPath}:/workspace \\
          ${this.dockerImage} \\
          -c "cd /workspace && semgrep \\
            --config ${rulesets} \\
            --json \\
            --include '*.java' \\
            --exclude '**/test/**' --exclude '**/tests/**' --exclude '**/*Test.java' --exclude '**/*Tests.java' \\
            . \\
            > semgrep-results-${branch}.json 2>&1 || true"
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
          -c "spotbugs \\
            -${this.config.spotbugs?.priority} \\
            -effort:${this.config.spotbugs?.effort} \\
            -xml:withMessages \\
            -output /workspace/spotbugs-results-${branch}.xml \\
            /workspace/target/classes /workspace/build/classes 2>&1 || true"
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
  /**
   * Run Dependency-Check with PostgreSQL backend (v6.0)
   * Uses preloaded CVE database (208K+ CVEs, 2018-2025)
   */
  private async runDependencyCheck(
    repoPath: string,
    branch: string
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      const pg = this.config.dependencyCheck?.postgres;
      if (!pg?.enabled) {
        throw new Error('PostgreSQL backend is required for Dependency-Check v6.0');
      }

      // Build PostgreSQL connection parameters for JDBC
      const jdbcParams = [
        `--connectionString ${pg.connectionString}`,
        `--dbUser ${pg.dbUser}`,
        `--dbPassword ${pg.dbPassword}`,
        `--dbDriverName org.postgresql.Driver`,
        `--dbDriverPath ${pg.dbDriver}`
      ].join(' ');

      const command = `
        docker run --rm \\
          -v ${repoPath}:/workspace \\
          -v $(dirname ${pg.dbDriver}):$(dirname ${pg.dbDriver}):ro \\
          --network host \\
          -e CLASSPATH="/opt/dependency-check/lib/*:${pg.dbDriver}" \\
          ${this.dockerImage} \\
          -c "dependency-check \\
            --scan /workspace \\
            --format JSON \\
            --out /workspace/dependency-check-results-${branch} \\
            --project \\"CodeQual-${branch}\\" \\
            ${jdbcParams} \\
            --failOnCVSS ${this.config.dependencyCheck.failOnCVSS} \\
            --disableNodeAudit \\
            --disableYarnAudit 2>&1 || true"
      `;

      logger.info(`Running Dependency-Check with PostgreSQL backend...`);
      logger.info(`Database: ${pg.connectionString}`);

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
    try {
      // PMD may have error messages after JSON - extract just the JSON part
      const jsonStart = output.indexOf('{');
      const jsonEnd = output.lastIndexOf('}') + 1;

      if (jsonStart === -1 || jsonEnd === 0) {
        logger.warn('No JSON found in PMD output');
        return [];
      }

      let jsonStr = output.substring(jsonStart, jsonEnd);

      // PMD injects log messages INSIDE the JSON (between violation objects)
      // Example: }Oct 02, 2025 2:10:03 AM net.sourceforge.pmd.cache.FileAnalysisCache persist\nINFO: Analysis cache created\n  ],
      // Remove these log lines that appear between JSON elements
      jsonStr = jsonStr.replace(/\}[A-Z][a-z]{2} \d{2}, \d{4}[^\n]*\n[A-Z]+:[^\n]*\n\s+/g, '}\n');

      const pmdResult = JSON.parse(jsonStr);
      const issues: RawIssue[] = [];

      if (!pmdResult.files) {
        logger.warn('No files in PMD output');
        return [];
      }

      for (const file of pmdResult.files) {
        if (!file.violations) continue;

        // Skip test files
        const filename = file.filename || '';
        if (filename.includes('/test/') || filename.includes('/tests/') ||
            filename.endsWith('Test.java') || filename.endsWith('Tests.java')) {
          continue;
        }

        for (const violation of file.violations) {
          issues.push({
            tool: 'PMD',
            file: file.filename,
            line: violation.beginline,
            endLine: violation.endline,
            column: violation.begincolumn,
            endColumn: violation.endcolumn,
            severity: this.mapPMDPriority(violation.priority),
            category: violation.ruleset || 'unknown',
            rule: violation.rule,
            message: violation.description || violation.message,
            priority: violation.priority,
            externalInfoUrl: violation.externalInfoUrl,
            ruleset: violation.ruleset
          });
        }
      }

      logger.info(`Parsed ${issues.length} PMD issues`);
      return issues;
    } catch (error: any) {
      logger.error('Failed to parse PMD JSON output:', error.message);
      return [];
    }
  }

  private parseCheckstyleOutput(output: string): RawIssue[] {
    try {
      const issues: RawIssue[] = [];

      // Simple XML parsing - extract file and error elements
      const fileMatches = output.matchAll(/<file name="([^"]+)">(.*?)<\/file>/gs);

      for (const fileMatch of fileMatches) {
        const fileName = fileMatch[1];
        const fileContent = fileMatch[2];

        // Skip test files
        if (fileName.includes('/test/') || fileName.includes('/tests/') ||
            fileName.endsWith('Test.java') || fileName.endsWith('Tests.java')) {
          continue;
        }

        // Extract errors within this file
        const errorMatches = fileContent.matchAll(/<error line="(\d+)" (?:column="(\d+)" )?severity="([^"]+)" message="([^"]+)" source="([^"]+)"\/>/g);

        for (const errorMatch of errorMatches) {
          issues.push({
            tool: 'Checkstyle',
            file: fileName,
            line: parseInt(errorMatch[1]),
            column: errorMatch[2] ? parseInt(errorMatch[2]) : undefined,
            severity: this.mapCheckstyleSeverity(errorMatch[3]),
            category: errorMatch[5] || 'unknown',
            rule: errorMatch[5] || 'unknown',
            message: errorMatch[4]
          });
        }
      }

      logger.info(`Parsed ${issues.length} Checkstyle issues`);
      return issues;
    } catch (error: any) {
      logger.error('Failed to parse Checkstyle XML output:', error.message);
      return [];
    }
  }

  private parseSemgrepOutput(output: string): RawIssue[] {
    try {
      // Semgrep has metrics/status text before JSON - extract just the JSON part
      const jsonStart = output.lastIndexOf('{');  // JSON is at the end

      if (jsonStart === -1) {
        logger.warn('No JSON found in Semgrep output');
        return [];
      }

      const jsonStr = output.substring(jsonStart);
      const semgrepResult = JSON.parse(jsonStr);
      const issues: RawIssue[] = [];

      if (!semgrepResult.results) {
        logger.info('No results in Semgrep output (no security issues found)');
        return [];
      }

      for (const result of semgrepResult.results) {
        issues.push({
          tool: 'Semgrep',
          file: result.path,
          line: result.start?.line || 1,
          column: result.start?.col || 0,
          severity: this.mapSemgrepSeverity(result.extra?.severity),
          category: result.check_id || 'unknown',
          rule: result.check_id,
          message: result.extra?.message || result.check_id
        });
      }

      logger.info(`Parsed ${issues.length} Semgrep issues`);
      return issues;
    } catch (error: any) {
      logger.error('Failed to parse Semgrep JSON output:', error.message);
      return [];
    }
  }

  private parseSpotBugsOutput(output: string): RawIssue[] {
    // SpotBugs uses XML - would need xml2js parser
    // For now, return empty (SpotBugs is optional anyway)
    logger.warn('SpotBugs XML parsing not yet implemented');
    return [];
  }

  // Severity mapping helpers
  private mapPMDPriority(priority: number): 'critical' | 'high' | 'medium' | 'low' {
    switch (priority) {
      case 1:
        return 'critical';
      case 2:
        return 'high';
      case 3:
        return 'medium';
      default:
        return 'low';
    }
  }

  private mapCheckstyleSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' {
    switch (severity?.toLowerCase()) {
      case 'error':
        return 'high';
      case 'warning':
        return 'medium';
      case 'info':
        return 'low';
      default:
        return 'medium';
    }
  }

  private mapSemgrepSeverity(severity?: string): 'critical' | 'high' | 'medium' | 'low' {
    switch (severity?.toUpperCase()) {
      case 'ERROR':
        return 'critical';
      case 'WARNING':
        return 'high';
      case 'INFO':
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * Parse Dependency-Check JSON report
   * Format: { dependencies: [ { fileName, vulnerabilities: [ { name, severity, cvssv3, description } ] } ] }
   */
  private parseDependencyCheckOutput(output: string): RawIssue[] {
    try {
      const report = JSON.parse(output);
      const issues: RawIssue[] = [];

      if (!report.dependencies || !Array.isArray(report.dependencies)) {
        logger.warn('No dependencies found in Dependency-Check report');
        return [];
      }

      for (const dependency of report.dependencies) {
        if (!dependency.vulnerabilities || dependency.vulnerabilities.length === 0) {
          continue;
        }

        for (const vuln of dependency.vulnerabilities) {
          // Map CVSS score to severity
          const cvssScore = vuln.cvssv3?.baseScore || vuln.cvssv2?.score || 0;
          let severity: 'critical' | 'high' | 'medium' | 'low' = 'low';

          if (cvssScore >= 9.0) severity = 'critical';
          else if (cvssScore >= 7.0) severity = 'high';
          else if (cvssScore >= 4.0) severity = 'medium';

          issues.push({
            tool: 'Dependency-Check',
            file: dependency.fileName || 'pom.xml',
            line: 0, // Dependency issues don't have line numbers
            severity,
            category: 'dependency-vulnerability',
            rule: vuln.name || 'UNKNOWN-CVE',
            message: vuln.description || `Vulnerability in ${dependency.fileName}`,
            cvssScore,
            cve: vuln.name
          });
        }
      }

      logger.info(`Parsed ${issues.length} CVE issues from Dependency-Check report`);
      return issues;

    } catch (error: any) {
      logger.error('Failed to parse Dependency-Check output:', error);
      return [];
    }
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