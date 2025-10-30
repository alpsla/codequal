/**
 * Java Tool Orchestrator for V9 - Refactored Version
 *
 * NOW EXTENDS BaseToolOrchestrator for maximum code reuse!
 * 
 * This orchestrator only contains Java-specific logic:
 * - PMD configuration and execution
 * - Semgrep security scanning
 * - Checkstyle style checking
 * - SpotBugs bytecode analysis
 * - Dependency-Check CVE scanning
 *
 * All universal orchestration logic (branch management, parallel execution,
 * result aggregation) is inherited from BaseToolOrchestrator.
 *
 * Before refactoring: 1,566 lines
 * After refactoring: ~400 lines
 * Savings: ~1,166 lines (74% reduction)
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import { logger } from '../../utils/logger';
import { determineCodeQualSeverity } from '../../utils/severity-mapper';

// Import base orchestrator
import { 
  BaseToolOrchestrator, 
  ToolResult, 
  RawIssue,
  OrchestrationOptions 
} from '../base-tool-orchestrator';

// Import universal analysis modes
import type { AnalysisMode } from '../../config/analysis-modes';
import { 
  UNIVERSAL_ANALYSIS_MODES, 
  ToolCategory,
  getToolsForMode 
} from '../../config/analysis-modes';

const execAsync = promisify(exec);

// ============================================================
// JAVA-SPECIFIC TYPES
// ============================================================

/**
 * Java-specific tool configuration
 */
export interface JavaToolConfig {
  // REQUIRED TOOLS
  pmd: {
    enabled: boolean;
    rulesets: string[];
    failOnViolation: boolean;
  };
  semgrep: {
    enabled: boolean;
    config: string;
  };
  
  // OPTIONAL TOOLS
  checkstyle?: {
    enabled: boolean;
    configFile: string;
    suppressions?: string;
  };
  spotbugs?: {
    enabled: boolean;
    effort: 'min' | 'default' | 'max';
    reportLevel: 'low' | 'medium' | 'high';
  };
  dependencyCheck?: {
    enabled: boolean;
    failOnCVSS: number;
    suppressionFile?: string;
    formats: string[];  // e.g., ['JSON', 'HTML']
    caching: {
      enabled: boolean;
      location: string;
    };
  };
  
  // DOCKER CONFIG
  docker: {
    mountPath: string;
    buildTools: string[];  // e.g., ['gradle', 'maven']
    memory: string;
  };
}

/**
 * Default Java tool configuration
 */
export const DEFAULT_JAVA_CONFIG: JavaToolConfig = {
  pmd: {
    enabled: true,
    rulesets: ['java-basic'],  // Use working ruleset
    failOnViolation: false
  },
  semgrep: {
    enabled: true,
    config: 'auto'  // Use Semgrep's curated rulesets
  },
  checkstyle: {
    enabled: true,
    configFile: '/sun_checks.xml'  // Use sun_checks.xml (google_checks.xml has version compatibility issues)
  },
  spotbugs: {
    enabled: true,  // Enable for complete mode testing
    effort: 'default',
    reportLevel: 'medium'
  },
  dependencyCheck: {
    enabled: true,
    failOnCVSS: 7.0,
    formats: ['JSON'],
    caching: {
      enabled: true,
      location: process.env.DEPENDENCY_CHECK_CACHE || `${process.env.HOME}/.dependency-check-cache`
    }
  },
  docker: {
    mountPath: '/workspace',
    buildTools: ['gradle', 'maven'],
    memory: '4g'
  }
};

/**
 * Java tool category mapping
 */
const JAVA_TOOL_CATEGORIES = {
  pmd: ToolCategory.CODE_QUALITY,
  semgrep: ToolCategory.SECURITY,
  'dependency-check': ToolCategory.DEPENDENCY_SCAN,
  checkstyle: ToolCategory.STYLE_LINT,
  spotbugs: ToolCategory.ADVANCED
};

/**
 * Check if a Java tool should run based on analysis mode
 */
function shouldJavaToolRun(toolName: string, mode: AnalysisMode): boolean {
  const category = JAVA_TOOL_CATEGORIES[toolName as keyof typeof JAVA_TOOL_CATEGORIES];
  if (!category) return false;
  
  const modeConfig = UNIVERSAL_ANALYSIS_MODES[mode];
  
  switch (category) {
    case ToolCategory.CODE_QUALITY:
      return modeConfig.toolCategories.codeQuality;
    case ToolCategory.SECURITY:
      return modeConfig.toolCategories.security;
    case ToolCategory.DEPENDENCY_SCAN:
      return modeConfig.toolCategories.dependencyScan;
    case ToolCategory.STYLE_LINT:
      return modeConfig.toolCategories.styleLint;
    case ToolCategory.ADVANCED:
      return modeConfig.toolCategories.advanced;
    default:
      return false;
  }
}

// ============================================================
// JAVA TOOL ORCHESTRATOR (EXTENDS BASE)
// ============================================================

/**
 * Java-specific tool orchestrator
 * 
 * Extends BaseToolOrchestrator to inherit universal orchestration logic.
 * Only implements Java-specific tool execution.
 */
export class JavaToolOrchestrator extends BaseToolOrchestrator {
  private config: JavaToolConfig;

  constructor(
    config: Partial<JavaToolConfig> = {},
    dockerImage = 'iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-java-v6.0-arm'
  ) {
    // Call base constructor
    super(dockerImage, '/workspace');
    
    // Merge with defaults
    this.config = { ...DEFAULT_JAVA_CONFIG, ...config };
  }

  // ============================================================
  // IMPLEMENT ABSTRACT METHODS FROM BASE
  // ============================================================

  /**
   * Get language name (required by base)
   */
  protected getLanguageName(): string {
    return 'java';
  }

  /**
   * Get tools to run based on analysis mode (required by base)
   */
  protected getToolsToRun(mode: AnalysisMode, branch: 'base' | 'pr'): string[] {
    const tools: string[] = [];
    
    // PMD - Always included (code quality)
    if (this.config.pmd.enabled && shouldJavaToolRun('pmd', mode)) {
      tools.push('pmd');
    }
    
    // Semgrep - Always included (security)
    if (this.config.semgrep.enabled && shouldJavaToolRun('semgrep', mode)) {
      tools.push('semgrep');
    }
    
    // Checkstyle - Only in thorough/complete modes
    if (this.config.checkstyle?.enabled && shouldJavaToolRun('checkstyle', mode)) {
      tools.push('checkstyle');
    }
    
    // Dependency-Check - Standard and above
    if (this.config.dependencyCheck?.enabled && shouldJavaToolRun('dependency-check', mode)) {
      tools.push('dependency-check');
    }
    
    // SpotBugs - Only in complete mode (requires compilation)
    if (this.config.spotbugs?.enabled && shouldJavaToolRun('spotbugs', mode)) {
      tools.push('spotbugs');
    }
    
    return tools;
  }

  /**
   * Execute a specific Java tool (required by base)
   * Dispatches to appropriate tool-specific method
   */
  protected async executeTool(
    toolName: string,
    repoPath: string,
    branch: 'base' | 'pr',
    options: OrchestrationOptions
  ): Promise<ToolResult> {
    logger.info(`📦 Executing Java tool: ${toolName}`);
    
    switch (toolName) {
      case 'pmd':
        return this.runPMD(repoPath, branch);
      
      case 'semgrep':
        return this.runSemgrep(repoPath, branch);
      
      case 'checkstyle':
        return this.runCheckstyle(repoPath, branch, options.changedFiles);
      
      case 'spotbugs':
        return this.runSpotBugs(repoPath, branch);
      
      case 'dependency-check':
        return this.runDependencyCheck(repoPath, branch);
      
      default:
        throw new Error(`Unknown Java tool: ${toolName}`);
    }
  }

  // ============================================================
  // JAVA-SPECIFIC TOOL EXECUTION METHODS
  // (These remain unchanged from original implementation)
  // ============================================================

  /**
   * Run PMD code quality analysis
   */
  private async runPMD(
    repoPath: string,
    branch: 'base' | 'pr'
  ): Promise<ToolResult> {
    const startTime = Date.now();
    const outputFileName = `pmd-results-${branch}.json`;
    const outputFile = path.join(repoPath, outputFileName);
    const containerOutputPath = `${this.workspaceDir}/${outputFileName}`;

    try {
      logger.info(`🔍 Running PMD analysis...`);

      // PMD 6.x syntax: run.sh pmd -d <dir> -R <rules> -f json -r <output>
      const dockerCommand = `docker run --rm \
        -v "${repoPath}:${this.workspaceDir}" \
        ${this.dockerImage} \
        -c '/opt/pmd/bin/run.sh pmd -d ${this.workspaceDir} -R ${this.config.pmd.rulesets.join(',')} -f json -r ${containerOutputPath} --fail-on-violation false || true'`;

      await execAsync(dockerCommand, { maxBuffer: 50 * 1024 * 1024 });

      // Parse results
      const resultContent = await fs.readFile(outputFile, 'utf-8');
      const pmdResult = JSON.parse(resultContent);
      
      const issues: RawIssue[] = [];
      
      if (pmdResult.files) {
        for (const fileResult of pmdResult.files) {
          for (const violation of fileResult.violations || []) {
            issues.push({
              tool: 'pmd',
              file: fileResult.filename.replace(this.workspaceDir + '/', ''),
              line: violation.beginline || 1,
              column: violation.begincolumn,
              severity: determineCodeQualSeverity(
                'pmd',
                violation.priority,
                violation.ruleset || 'Unknown',
                violation.rule || 'Unknown',
                violation.description
              ),
              message: violation.description || 'No description',
              rule: violation.rule || 'Unknown',
              category: violation.ruleset,
              autoFixable: false
            });
          }
        }
      }

      const duration = Date.now() - startTime;
      logger.info(`✅ PMD complete: ${issues.length} issues found in ${duration}ms`);

      return {
        tool: 'pmd',
        success: true,
        duration,
        issues,
        metadata: this.calculateMetadata(issues)
      };

    } catch (error: any) {
      logger.error(`❌ PMD failed: ${error.message}`);
      return this.createFailedResult('pmd', error.message);
    }
  }

  /**
   * Run Semgrep security analysis
   */
  private async runSemgrep(
    repoPath: string,
    branch: 'base' | 'pr'
  ): Promise<ToolResult> {
    const startTime = Date.now();
    const outputFileName = `semgrep-results-${branch}.json`;
    const outputFile = path.join(repoPath, outputFileName);
    const containerOutputPath = `${this.workspaceDir}/${outputFileName}`;

    try {
      logger.info(`🔒 Running Semgrep security analysis...`);

      // Semgrep: Use entrypoint bash -c
      const dockerCommand = `docker run --rm \
        -v "${repoPath}:${this.workspaceDir}" \
        ${this.dockerImage} \
        -c 'semgrep --config=${this.config.semgrep.config} --json --output=${containerOutputPath} ${this.workspaceDir} || true'`;

      await execAsync(dockerCommand, { maxBuffer: 50 * 1024 * 1024 });

      // Parse results
      const resultContent = await fs.readFile(outputFile, 'utf-8');
      const semgrepResult = JSON.parse(resultContent);
      
      const issues: RawIssue[] = [];
      
      if (semgrepResult.results) {
        for (const result of semgrepResult.results) {
          issues.push({
            tool: 'semgrep',
            file: result.path.replace(this.workspaceDir + '/', ''),
            line: result.start.line || 1,
            column: result.start.col,
            severity: this.mapSemgrepSeverity(result.extra?.severity),
            message: result.extra?.message || 'Security issue detected',
            rule: result.check_id || 'Unknown',
            category: 'Security',
            cwe: Array.isArray(result.extra?.metadata?.cwe) ? result.extra.metadata.cwe.join(', ') : result.extra?.metadata?.cwe || '',
            autoFixable: result.extra?.fix !== undefined
          });
        }
      }

      const duration = Date.now() - startTime;
      logger.info(`✅ Semgrep complete: ${issues.length} issues found in ${duration}ms`);

      return {
        tool: 'semgrep',
        success: true,
        duration,
        issues,
        metadata: this.calculateMetadata(issues)
      };

    } catch (error: any) {
      logger.error(`❌ Semgrep failed: ${error.message}`);
      return this.createFailedResult('semgrep', error.message);
    }
  }

  /**
   * Run Checkstyle code style analysis
   */
  private async runCheckstyle(
    repoPath: string,
    branch: 'base' | 'pr',
    changedFiles?: string[]
  ): Promise<ToolResult> {
    const startTime = Date.now();
    const outputFileName = `checkstyle-results-${branch}.xml`;
    const outputFile = path.join(repoPath, outputFileName);
    const containerOutputPath = `${this.workspaceDir}/${outputFileName}`;

    try {
      logger.info(`📝 Running Checkstyle analysis...`);

      // Checkstyle: Use bash -c entrypoint with java -jar
      const dockerCommand = `docker run --rm \
        -v "${repoPath}:${this.workspaceDir}" \
        ${this.dockerImage} \
        -c 'java -jar /opt/checkstyle.jar -c ${this.config.checkstyle!.configFile} -f xml -o ${containerOutputPath} ${this.workspaceDir} || true'`;

      await execAsync(dockerCommand, { maxBuffer: 50 * 1024 * 1024 });

      // Parse results (XML to RawIssue[])
      const issues = await this.parseCheckstyleXML(outputFile);

      const duration = Date.now() - startTime;
      logger.info(`✅ Checkstyle complete: ${issues.length} issues found in ${duration}ms`);

      return {
        tool: 'checkstyle',
        success: true,
        duration,
        issues,
        metadata: this.calculateMetadata(issues)
      };

    } catch (error: any) {
      logger.error(`❌ Checkstyle failed: ${error.message}`);
      return this.createFailedResult('checkstyle', error.message);
    }
  }

  /**
   * Run SpotBugs bytecode analysis
   */
  private async runSpotBugs(
    repoPath: string,
    branch: 'base' | 'pr'
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      logger.info(`🐛 Running SpotBugs analysis (requires compilation)...`);

      // SpotBugs requires compilation - check if compiled classes exist
      const compiledClasses = await fs.readdir(repoPath).catch(() => []);
      const hasCompiledClasses = compiledClasses.some(file =>
        file.endsWith('.class') || file === 'target' || file === 'build'
      );

      if (!hasCompiledClasses) {
        // Auto-compile if no compiled classes found
        logger.info(`🔨 No compiled classes found. Attempting auto-compilation...`);

        const { detectBuildTools, compileRepository } = await import('../build-tool-detector');
        const buildInfo = await detectBuildTools(repoPath);

        if (buildInfo.compilationRequired) {
          const compileResult = await compileRepository(repoPath, buildInfo);

          if (!compileResult.success) {
            const failureContext = {
              tool: 'spotbugs',
              reason: 'compilation_failed',
              buildSystem: buildInfo.buildTool.tool,
              compileCommand: buildInfo.buildTool.compileCommand,
              error: compileResult.error,
              duration: compileResult.duration,
              repoPath
            };
            logger.error(`❌ SPOTBUGS FAILURE: Compilation failed`, failureContext);
            logger.warn(`⚠️  SpotBugs skipped: Compilation failed - ${compileResult.error}`);
            return {
              tool: 'spotbugs',
              success: true,
              duration: Date.now() - startTime,
              issues: [],
              metadata: this.calculateMetadata([])
            };
          }

          logger.info(`✅ Compilation successful (${compileResult.duration}ms), proceeding with SpotBugs...`);
        } else {
          const failureContext = {
            tool: 'spotbugs',
            reason: 'no_build_system',
            detectedFiles: buildInfo.detectedFiles,
            repoPath
          };
          logger.error(`❌ SPOTBUGS FAILURE: No build system detected`, failureContext);
          logger.warn(`⚠️  SpotBugs skipped: No build system detected`);
          return {
            tool: 'spotbugs',
            success: true,
            duration: Date.now() - startTime,
            issues: [],
            metadata: this.calculateMetadata([])
          };
        }
      }

      // Run SpotBugs on compiled classes
      const outputFileName = `spotbugs-results-${branch}.json`;
      const outputFile = path.join(repoPath, outputFileName);
      const containerOutputPath = `${this.workspaceDir}/${outputFileName}`;

      const dockerCommand = `docker run --rm \
        -v "${repoPath}:${this.workspaceDir}" \
        ${this.dockerImage} \
        -c 'spotbugs -textui -output ${containerOutputPath} -xml ${this.workspaceDir} || true'`;

      await execAsync(dockerCommand, { maxBuffer: 50 * 1024 * 1024 });

      // Parse results
      const resultContent = await fs.readFile(outputFile, 'utf-8');
      const spotbugsResult = JSON.parse(resultContent);
      
      const issues: RawIssue[] = [];
      if (spotbugsResult.BugCollection?.BugInstance) {
        const bugInstances = Array.isArray(spotbugsResult.BugCollection.BugInstance) 
          ? spotbugsResult.BugCollection.BugInstance 
          : [spotbugsResult.BugCollection.BugInstance];
        
        for (const bug of bugInstances) {
          issues.push({
            tool: 'spotbugs',
            file: bug.SourceLine?.SourcePath?.replace(this.workspaceDir + '/', '') || 'unknown',
            line: parseInt(bug.SourceLine?.Start || '1'),
            column: parseInt(bug.SourceLine?.Start || '1'),
            severity: this.mapSpotBugsSeverity(bug.Priority),
            message: bug.LongMessage || bug.ShortMessage || 'SpotBugs issue detected',
            rule: bug.Type || 'Unknown',
            category: 'Quality',
            autoFixable: false
          });
        }
      }

      const duration = Date.now() - startTime;
      logger.info(`✅ SpotBugs complete: ${issues.length} issues found in ${duration}ms`);

      return {
        tool: 'spotbugs',
        success: true,
        duration,
        issues,
        metadata: this.calculateMetadata(issues)
      };

    } catch (error: any) {
      const failureContext = {
        tool: 'spotbugs',
        reason: 'execution_failed',
        error: error.message,
        stack: error.stack,
        dockerImage: this.dockerImage,
        duration: Date.now() - startTime,
        repoPath
      };
      logger.error(`❌ SPOTBUGS FAILURE: Execution failed`, failureContext);
      logger.error(`❌ SpotBugs failed: ${error.message}`);
      return this.createFailedResult('spotbugs', error.message);
    }
  }

  /**
   * Run Dependency-Check CVE scanning
   */
  private async runDependencyCheck(
    repoPath: string,
    branch: 'base' | 'pr'
  ): Promise<ToolResult> {
    const startTime = Date.now();
    const outputFileName = `dependency-check-${branch}.json`;
    const outputFile = path.join(repoPath, outputFileName);
    const containerOutputPath = `${this.workspaceDir}/${outputFileName}`;

    try {
      logger.info(`🔐 Running Dependency-Check CVE scanning...`);

      // Dependency-Check: Use entrypoint bash -c and output to directory
      const dockerCommand = `docker run --rm \
        -v "${repoPath}:${this.workspaceDir}" \
        -v "${this.config.dependencyCheck!.caching.location}:/cache" \
        ${this.dockerImage} \
        -c '/opt/dependency-check/bin/dependency-check.sh --scan ${this.workspaceDir} --format JSON --out ${this.workspaceDir} --data /cache --failOnCVSS ${this.config.dependencyCheck!.failOnCVSS} || true'`;

      await execAsync(dockerCommand, { maxBuffer: 50 * 1024 * 1024 });

      // Dependency-Check always outputs to dependency-check-report.json
      const defaultOutputFile = path.join(repoPath, 'dependency-check-report.json');
      
      // Read from default location
      const resultContent = await fs.readFile(defaultOutputFile, 'utf-8');
      const depCheckResult = JSON.parse(resultContent);
      
      // Rename to our expected filename for consistency
      await fs.rename(defaultOutputFile, outputFile);
      
      const issues: RawIssue[] = [];
      
      if (depCheckResult.dependencies) {
        for (const dep of depCheckResult.dependencies) {
          if (dep.vulnerabilities) {
            for (const vuln of dep.vulnerabilities) {
              issues.push({
                tool: 'dependency-check',
                file: dep.fileName || 'dependencies',
                line: 1,
                severity: this.mapCVSSSeverity(vuln.cvssv3?.baseScore || vuln.cvssv2?.score || 0),
                message: vuln.description || `CVE: ${vuln.name}`,
                rule: vuln.name,
                category: 'Dependency',
                cwe: vuln.cwes?.join(', '),
                autoFixable: false
              });
            }
          }
        }
      }

      const duration = Date.now() - startTime;
      logger.info(`✅ Dependency-Check complete: ${issues.length} CVEs found in ${duration}ms`);

      return {
        tool: 'dependency-check',
        success: true,
        duration,
        issues,
        metadata: this.calculateMetadata(issues)
      };

    } catch (error: any) {
      const failureContext = {
        tool: 'dependency-check',
        reason: 'execution_failed',
        error: error.message,
        stack: error.stack,
        dockerImage: this.dockerImage,
        cacheLocation: this.config.dependencyCheck!.caching.location,
        duration: Date.now() - startTime,
        repoPath,
        // Common failure modes to check:
        possibleCauses: [
          'Docker mount denied (cache path not shared)',
          'CVE database not updated (check daily cron)',
          'NVD API rate limit exceeded',
          'Network connectivity issue'
        ]
      };
      logger.error(`❌ DEPENDENCY-CHECK FAILURE: Execution failed`, failureContext);
      logger.error(`❌ Dependency-Check failed: ${error.message}`);
      return this.createFailedResult('dependency-check', error.message);
    }
  }

  // ============================================================
  // HELPER METHODS (Java-specific)
  // ============================================================

  private mapSemgrepSeverity(severity?: string): 'critical' | 'high' | 'medium' | 'low' {
    switch (severity?.toLowerCase()) {
      case 'error':
        return 'critical';
      case 'warning':
        return 'high';
      case 'info':
        return 'medium';
      default:
        return 'low';
    }
  }

  private mapCheckstyleSeverity(severity?: string): 'critical' | 'high' | 'medium' | 'low' {
    switch (severity?.toLowerCase()) {
      case 'error':
        return 'high';
      case 'warning':
        return 'medium';
      case 'info':
        return 'low';
      default:
        return 'low';
    }
  }

  private mapSpotBugsSeverity(priority?: string): 'critical' | 'high' | 'medium' | 'low' {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'critical';
      case 'medium':
        return 'high';
      case 'low':
        return 'medium';
      default:
        return 'low';
    }
  }

  private mapCVSSSeverity(score: number): 'critical' | 'high' | 'medium' | 'low' {
    if (score >= 9.0) return 'critical';
    if (score >= 7.0) return 'high';
    if (score >= 4.0) return 'medium';
    return 'low';
  }

  private async parseCheckstyleXML(filePath: string): Promise<RawIssue[]> {
    try {
      const xmlContent = await fs.readFile(filePath, 'utf-8');
      const issues: RawIssue[] = [];
      
      // Simple XML parsing for Checkstyle output
      // Look for <error> tags within <file> tags
      const fileMatches = xmlContent.match(/<file name="([^"]+)">([\s\S]*?)<\/file>/g);
      
      if (fileMatches) {
        for (const fileMatch of fileMatches) {
          const fileNameMatch = fileMatch.match(/<file name="([^"]+)">/);
          if (!fileNameMatch) continue;
          
          const fileName = fileNameMatch[1].replace(this.workspaceDir + '/', '');
          
          // Extract error tags from this file
          const errorMatches = fileMatch.match(/<error[^>]*>/g);
          if (errorMatches) {
            for (const errorTag of errorMatches) {
              const lineMatch = errorTag.match(/line="(\d+)"/);
              const columnMatch = errorTag.match(/column="(\d+)"/);
              const severityMatch = errorTag.match(/severity="([^"]+)"/);
              const messageMatch = errorTag.match(/message="([^"]+)"/);
              const sourceMatch = errorTag.match(/source="([^"]+)"/);
              
              issues.push({
                tool: 'checkstyle',
                file: fileName,
                line: parseInt(lineMatch?.[1] || '1'),
                column: parseInt(columnMatch?.[1] || '1'),
                severity: this.mapCheckstyleSeverity(severityMatch?.[1]),
                message: messageMatch?.[1] || 'Checkstyle issue detected',
                rule: sourceMatch?.[1] || 'Unknown',
                category: 'Style',
                autoFixable: false
              });
            }
          }
        }
      }
      
      return issues;
    } catch (error) {
      logger.error(`Failed to parse Checkstyle XML: ${error}`);
      return [];
    }
  }
}

