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

// Import parser validation wrapper (Session 57)
import {
  ParserValidationWrapper,
  createParserValidationWrapper
} from '../../parsers/parser-validation-wrapper';

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

  // SESSION 57 Part 5: Architecture analysis tools
  jdepend?: {
    enabled: boolean;
    outputFormat: 'xml' | 'text';
  };

  // SESSION 58: Performance static analysis
  performance?: {
    enabled: boolean;
    complexityThreshold?: number;  // Default: 10
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
  // SESSION 57 Part 5: JDepend for architecture analysis (complete mode only)
  jdepend: {
    enabled: true,
    outputFormat: 'xml'
  },
  // SESSION 58: Performance static analysis (complete mode only)
  performance: {
    enabled: true,
    complexityThreshold: 10
  },
  docker: {
    mountPath: '/workspace',
    buildTools: ['gradle', 'maven'],
    memory: '4g'
  }
};

/**
 * Java tool category mapping
 * SESSION 57 Part 5: Added jdepend for architecture analysis
 * SESSION 58: Added performance static analysis
 * SESSION 92: Added P0/P1/P2 universal tools
 */
const JAVA_TOOL_CATEGORIES = {
  pmd: ToolCategory.CODE_QUALITY,
  semgrep: ToolCategory.SECURITY,
  'dependency-check': ToolCategory.DEPENDENCY_SCAN,
  checkstyle: ToolCategory.STYLE_LINT,
  spotbugs: ToolCategory.ADVANCED,
  jdepend: ToolCategory.ADVANCED,  // Architecture analysis
  performance: ToolCategory.ADVANCED,  // Static performance analysis
  // P0: Secret detection (Session 92)
  gitleaks: ToolCategory.SECRETS,
  // P0: IaC security (Session 92)
  checkov: ToolCategory.IAC_SECURITY,
  // P0: Container security (Session 92)
  trivy: ToolCategory.CONTAINER_SECURITY,
  grype: ToolCategory.CONTAINER_SECURITY,
  // P1: API schema validation (Session 92)
  spectral: ToolCategory.API_DESIGN,
  // P1: GraphQL security (Session 92)
  'graphql-cop': ToolCategory.GRAPHQL_SECURITY
};

/**
 * Check if a Java tool should run based on analysis mode
 * SESSION 92: Added P0/P1/P2 tool category checks
 */
function shouldJavaToolRun(toolName: string, mode: AnalysisMode): boolean {
  const category = JAVA_TOOL_CATEGORIES[toolName as keyof typeof JAVA_TOOL_CATEGORIES];
  if (!category) return false;

  const modeConfig = UNIVERSAL_ANALYSIS_MODES[mode];

  switch (category) {
    // Core categories
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
    // P0 categories (Session 92)
    case ToolCategory.SECRETS:
      return modeConfig.toolCategories.secrets;
    case ToolCategory.IAC_SECURITY:
      return modeConfig.toolCategories.iacSecurity;
    case ToolCategory.CONTAINER_SECURITY:
      return modeConfig.toolCategories.containerSecurity;
    // P1 categories (Session 92)
    case ToolCategory.API_DESIGN:
      return modeConfig.toolCategories.apiDesign;
    case ToolCategory.GRAPHQL_SECURITY:
      return modeConfig.toolCategories.graphqlSecurity;
    // P2 categories
    case ToolCategory.ARCHITECTURE:
      return modeConfig.toolCategories.architecture;
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

  // Parser validation wrapper for shadow mode (Session 57)
  private parserValidator: ParserValidationWrapper;

  constructor(
    config: Partial<JavaToolConfig> = {},
    dockerImage = 'iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-java-v6.0-arm'
  ) {
    // Call base constructor
    super(dockerImage, '/workspace');

    // Merge with defaults
    this.config = { ...DEFAULT_JAVA_CONFIG, ...config };

    // Initialize parser validation (Session 57 Part 2 - Migration Phase 2)
    // Now uses enhanced parser for verified tools (100% match rate)
    // Enable validation logging via PARSER_VALIDATION=true environment variable
    this.parserValidator = createParserValidationWrapper({
      language: 'java',
      enabled: true,  // Always enabled for Phase 2 migration
      logResults: process.env.PARSER_VALIDATION === 'true',
      // Phase 2: Use enhanced parser for all tools with complete implementations
      forceEnhancedTools: ['checkstyle', 'semgrep', 'pmd', 'spotbugs', 'dependency-check'],
      switchThreshold: 0.95,
      onValidation: (result) => {
        if (!result.passed && process.env.PARSER_VALIDATION === 'true') {
          logger.warn(`[ParserValidation] ${result.tool}: ${result.differences} differences (${(result.matchRate * 100).toFixed(1)}% match)`);
        }
      }
    });
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
   *
   * SESSION 34 OPTIMIZATION: userTier parameter for Semgrep skip logic
   * - BASIC tier: Run Semgrep here (Step 3), Lite Security Agent groups issues
   * - PRO tier: Skip Semgrep here, run scan+fix combined in Step 5.5
   */
  protected getToolsToRun(
    mode: AnalysisMode,
    branch: 'base' | 'pr',
    userTier?: 'basic' | 'pro'
  ): string[] {
    const tools: string[] = [];

    // PMD - Always included (code quality)
    if (this.config.pmd.enabled && shouldJavaToolRun('pmd', mode)) {
      tools.push('pmd');
    }

    // Semgrep - Security analysis
    // SESSION 34 OPTIMIZATION:
    // - BASIC tier (default): Run Semgrep here (Step 3), skip Step 5.5
    // - PRO tier: Skip Semgrep here, run scan+fix combined in Step 5.5
    if (this.config.semgrep.enabled && shouldJavaToolRun('semgrep', mode)) {
      if (userTier !== 'pro') {
        tools.push('semgrep');
      }
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

    // SESSION 57 Part 5: JDepend - Architecture analysis (complete mode)
    if (this.config.jdepend?.enabled && shouldJavaToolRun('jdepend', mode)) {
      tools.push('jdepend');
    }

    // SESSION 58: Performance static analysis (complete mode)
    if (this.config.performance?.enabled && shouldJavaToolRun('performance', mode)) {
      tools.push('performance');
    }

    // ============================================================
    // SESSION 92: P0/P1/P2 Universal Security Tools
    // These are language-agnostic tools handled by base orchestrator
    // ============================================================

    // P0: Secret detection (gitleaks) - enabled in fast/standard/thorough/complete
    if (shouldJavaToolRun('gitleaks', mode)) {
      tools.push('gitleaks');
    }

    // P0: IaC security (checkov) - enabled in standard/thorough/complete
    if (shouldJavaToolRun('checkov', mode)) {
      tools.push('checkov');
    }

    // P0: Container security (trivy, grype) - enabled in standard/thorough/complete
    if (shouldJavaToolRun('trivy', mode)) {
      tools.push('trivy');
    }
    if (shouldJavaToolRun('grype', mode)) {
      tools.push('grype');
    }

    // P1: API schema validation (spectral) - enabled in thorough/complete
    if (shouldJavaToolRun('spectral', mode)) {
      tools.push('spectral');
    }

    // P1: GraphQL security (graphql-cop) - enabled in thorough/complete
    if (shouldJavaToolRun('graphql-cop', mode)) {
      tools.push('graphql-cop');
    }

    return tools;
  }

  /**
   * Execute a specific Java tool (required by base)
   * Dispatches to appropriate tool-specific method
   * 
   * UPDATED: Now routes universal tools (Semgrep, Dependency-Check) 
   * to shared runners for consistency across all languages
   */
  protected async executeTool(
    toolName: string,
    repoPath: string,
    branch: 'base' | 'pr',
    options: OrchestrationOptions
  ): Promise<ToolResult> {
    logger.info(`📦 Executing Java tool: ${toolName}`);
    
    // UNIVERSAL TOOLS: Route to shared runners
    // This ensures same Semgrep/Dependency-Check behavior across Java, TypeScript, Python, etc.
    if (this.isUniversalTool(toolName)) {
      logger.info(`🌐 Routing ${toolName} to universal runner`);
      return this.executeUniversalTool(toolName, repoPath, branch, options);
    }
    
    // LANGUAGE-SPECIFIC TOOLS: Use Java-specific implementations
    switch (toolName) {
      case 'pmd':
        return this.runPMD(repoPath, branch);
      
      case 'checkstyle':
        return this.runCheckstyle(repoPath, branch, options.changedFiles);
      
      case 'spotbugs':
        return this.runSpotBugs(repoPath, branch);

      case 'jdepend':
        return this.runJDepend(repoPath, branch);

      case 'performance':
        return this.runPerformanceAnalysis(repoPath, branch);

      default:
        throw new Error(`Unknown Java tool: ${toolName}`);
    }
  }

  /**
   * SESSION 57 Part 5: Override to include JDepend under Architecture
   * SESSION 92: Added P0/P1/P2 tools
   */
  protected getAgentToolCategories(): Record<string, string[]> {
    return {
      // Core tools
      'Security': [
        'semgrep', 'dependency-check', 'spotbugs',
        // P0 security tools (Session 92)
        'gitleaks', 'checkov', 'trivy', 'grype',
        // P1 security tools (Session 92)
        'graphql-cop'
      ],
      'Code Quality': ['pmd', 'checkstyle', 'spotbugs'],
      // SESSION 58: Added static performance analysis
      'Performance': ['performance'],  // PMD perf rules, memory patterns, complexity
      // SESSION 57 Part 5 + Session 92: Architecture analysis
      'Architecture': ['jdepend', 'spectral'],  // JDepend + API schema validation
      'Dependencies': ['dependency-check', 'trivy', 'grype']  // Session 92: Added container scanners
    };
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
              category: 'Code Quality',  // SESSION 19 FIX: Match agent category name
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

  // NOTE: runSemgrep removed - Semgrep is a universal tool, routed via executeUniversalTool()

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
            language: buildInfo.language,
            buildTool: buildInfo.buildTool.tool,
            compilationRequired: buildInfo.compilationRequired,
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

      // Parse XML results
      const resultContent = await fs.readFile(outputFile, 'utf-8');
      const { parseStringPromise } = await import('xml2js');
      const spotbugsResult = await parseStringPromise(resultContent);
      
      const issues: RawIssue[] = [];
      let skippedCount = 0;  // Track skipped issues to reduce log spam
      
      // Patterns to exclude (Gradle/Maven wrapper, libraries without source)
      const EXCLUDED_PATTERNS = [
        /^org\.gradle\./,           // Gradle wrapper classes
        /^org\.apache\.maven\./,    // Maven wrapper classes
        /^org\/gradle\//,           // Gradle path format
        /^org\/apache\/maven\//,    // Maven path format
        /SourceFile$/,              // Generic "SourceFile" means no real source
      ];
      
      if (spotbugsResult.BugCollection?.BugInstance) {
        const bugInstances = Array.isArray(spotbugsResult.BugCollection.BugInstance) 
          ? spotbugsResult.BugCollection.BugInstance 
          : [spotbugsResult.BugCollection.BugInstance];
        
        for (const bug of bugInstances) {
          const className = bug.Class?.['$']?.classname || bug.Class?.classname || '';
          const sourcePath = bug.SourceLine?.['$']?.sourcepath || bug.SourceLine?.SourcePath || '';
          const file = sourcePath?.replace(this.workspaceDir + '/', '') || 'unknown';
          const line = parseInt(bug.SourceLine?.['$']?.start || bug.SourceLine?.Start || '1');
          
          // Skip Gradle/Maven wrapper and issues without valid source files
          const isExcluded = EXCLUDED_PATTERNS.some(pattern => 
            pattern.test(className) || pattern.test(sourcePath) || pattern.test(file)
          );
          
          // SESSION 25 FIX: Filter out invalid issues (unknown file, line 1 with no path, or excluded patterns)
          if (file === 'unknown' || isExcluded || (line === 1 && !sourcePath)) {
            skippedCount++;
            continue;
          }
          
          issues.push({
            tool: 'spotbugs',
            file,
            line,
            column: parseInt(bug.SourceLine?.['$']?.start || bug.SourceLine?.Start || '1'),
            severity: this.mapSpotBugsSeverity(bug.Priority || bug['$']?.priority),
            message: bug.LongMessage?.[0] || bug.LongMessage || bug.ShortMessage?.[0] || bug.ShortMessage || 'SpotBugs issue detected',
            rule: bug['$']?.type || bug.Type || 'Unknown',
            category: 'Performance',  // SESSION 22 FIX: Match agent category (was 'Quality')
            autoFixable: false
          });
        }
      }
      
      // Log skipped count once (not per-issue) to reduce log spam
      if (skippedCount > 0) {
        logger.info(`ℹ️  SpotBugs: Filtered ${skippedCount} issues from Gradle/Maven wrapper or missing source files`);
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

  // NOTE: runDependencyCheck removed - dependency-check is a universal tool, routed via executeUniversalTool()

  // ============================================================
  // HELPER METHODS (Java-specific)
  // ============================================================

  // NOTE: mapSemgrepSeverity removed - Semgrep is a universal tool
  // NOTE: mapCheckstyleSeverity removed - Checkstyle now uses EnhancedUniversalToolParser via parserValidator

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

  // NOTE: mapCVSSSeverity removed - dependency-check is a universal tool

  private async parseCheckstyleXML(filePath: string): Promise<RawIssue[]> {
    try {
      const xmlContent = await fs.readFile(filePath, 'utf-8');

      // Phase 3: Parse directly with EnhancedUniversalToolParser via ParserValidationWrapper
      // Legacy inline XML parsing removed - enhanced parser handles Checkstyle XML
      return this.parserValidator.validate('checkstyle', xmlContent, []);
    } catch (error) {
      logger.error(`Failed to parse Checkstyle XML: ${error}`);
      return [];
    }
  }

  // ============================================================
  // SESSION 57 Part 5: JDepend Architecture Analysis
  // ============================================================

  /**
   * Run JDepend for Java package architecture analysis
   *
   * JDepend generates design quality metrics for each Java package:
   * - Ca/Ce: Afferent/Efferent coupling
   * - A/I/D: Abstractness, Instability, Distance from main sequence
   * - Cyclic: Package dependency cycles
   *
   * Requires: jdepend.jar in the Docker image or installed locally
   */
  private async runJDepend(
    repoPath: string,
    branch: 'base' | 'pr'
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      logger.info(`🔍 Running JDepend on ${branch} branch...`);

      // Find compiled classes directory (target/classes for Maven, build/classes for Gradle)
      const classesDir = await this.findJavaClassesDir(repoPath);

      if (!classesDir) {
        logger.warn('⚠️ No compiled Java classes found. JDepend requires compiled .class files.');
        logger.warn('   Run: mvn compile (Maven) or gradle build (Gradle) first.');
        return {
          tool: 'jdepend',
          success: true,
          duration: Date.now() - startTime,
          issues: [],
          rawOutput: 'No compiled classes found. JDepend requires compiled .class files.',
          metadata: this.calculateMetadata([])
        };
      }

      // Run JDepend in XML mode
      const outputFileName = `jdepend-results-${branch}.xml`;
      const outputFile = path.join(repoPath, outputFileName);

      // Try running jdepend via java command
      const cmd = `cd ${repoPath} && java jdepend.xmlui.JDepend -file ${outputFileName} ${classesDir} 2>&1 || true`;

      const { stdout, stderr } = await execAsync(cmd, {
        timeout: 180000, // 3 minute timeout
        maxBuffer: 50 * 1024 * 1024 // 50MB buffer
      });

      const rawOutput = stdout + (stderr ? `\nSTDERR:\n${stderr}` : '');

      // Check if output file was created
      let issues: RawIssue[] = [];
      if (existsSync(outputFile)) {
        const xmlContent = await fs.readFile(outputFile, 'utf-8');
        issues = this.parseJDependXml(xmlContent, repoPath);
      } else {
        // Try parsing text output if XML wasn't generated
        issues = this.parseJDependText(rawOutput, repoPath);
      }

      const duration = Date.now() - startTime;
      logger.info(`✅ JDepend completed: ${issues.length} architecture issues in ${(duration / 1000).toFixed(1)}s`);

      return {
        tool: 'jdepend',
        success: true,
        duration,
        issues,
        rawOutput,
        metadata: this.calculateMetadata(issues)
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;

      // JDepend might not be installed
      if (error.message.includes('ClassNotFoundException') ||
          error.message.includes('command not found') ||
          error.message.includes('jdepend')) {
        logger.warn('⚠️ JDepend not available. Install with: mvn dependency:copy or download jdepend.jar');
        return {
          tool: 'jdepend',
          success: false,
          duration,
          issues: [],
          rawOutput: 'JDepend not installed. Add jdepend to classpath.',
          metadata: this.calculateMetadata([]),
          error: 'JDepend not installed'
        };
      }

      logger.error(`❌ JDepend failed: ${error.message}`);
      return this.createFailedResult('jdepend', error.message);
    }
  }

  /**
   * Find directory containing compiled Java classes
   */
  private async findJavaClassesDir(repoPath: string): Promise<string | null> {
    // Check Maven target/classes
    const mavenClasses = path.join(repoPath, 'target', 'classes');
    if (existsSync(mavenClasses)) {
      return mavenClasses;
    }

    // Check Gradle build/classes/java/main
    const gradleClasses = path.join(repoPath, 'build', 'classes', 'java', 'main');
    if (existsSync(gradleClasses)) {
      return gradleClasses;
    }

    // Check Gradle build/classes (older structure)
    const gradleClassesOld = path.join(repoPath, 'build', 'classes');
    if (existsSync(gradleClassesOld)) {
      return gradleClassesOld;
    }

    // Try to find any classes directory
    try {
      const { stdout } = await execAsync(
        `find ${repoPath} -type d -name "classes" -path "*/target/*" -o -name "classes" -path "*/build/*" | head -1`,
        { timeout: 10000 }
      );
      const foundDir = stdout.trim();
      if (foundDir && existsSync(foundDir)) {
        return foundDir;
      }
    } catch {
      // Ignore find errors
    }

    return null;
  }

  /**
   * Parse JDepend XML output
   *
   * XML format:
   * <JDepend>
   *   <Packages>
   *     <Package name="com.example">
   *       <Stats>
   *         <TotalClasses>10</TotalClasses>
   *         <ConcreteClasses>8</ConcreteClasses>
   *         <AbstractClasses>2</AbstractClasses>
   *         <Ca>5</Ca>
   *         <Ce>3</Ce>
   *         <A>0.2</A>
   *         <I>0.375</I>
   *         <D>0.425</D>
   *         <V>1</V>
   *       </Stats>
   *       <DependsUpon>...</DependsUpon>
   *       <UsedBy>...</UsedBy>
   *     </Package>
   *   </Packages>
   *   <Cycles>
   *     <Package Name="com.example.a">
   *       <Package>com.example.b</Package>
   *       <Package>com.example.a</Package>
   *     </Package>
   *   </Cycles>
   * </JDepend>
   */
  private parseJDependXml(xmlContent: string, repoPath: string): RawIssue[] {
    const issues: RawIssue[] = [];

    try {
      // Parse Cycles section
      const cyclesMatch = xmlContent.match(/<Cycles>([\s\S]*?)<\/Cycles>/);
      if (cyclesMatch) {
        const cyclesContent = cyclesMatch[1];

        // Extract packages in cycles
        const packageCycles = cyclesContent.match(/<Package Name="([^"]+)">([\s\S]*?)<\/Package>/g);
        if (packageCycles) {
          for (const cycleMatch of packageCycles) {
            const packageNameMatch = cycleMatch.match(/<Package Name="([^"]+)">/);
            const packageName = packageNameMatch?.[1] || 'unknown';

            // Extract cycle participants
            const participants = cycleMatch.match(/<Package>([^<]+)<\/Package>/g);
            const participantNames = participants?.map(p =>
              p.replace(/<\/?Package>/g, '').trim()
            ) || [];

            issues.push({
              tool: 'jdepend',
              file: packageName.replace(/\./g, '/'),
              line: 1,
              severity: 'high',
              message: `Package cycle detected: ${packageName} → ${participantNames.join(' → ')}`,
              rule: 'package-cycle',
              category: 'architecture'
            });
          }
        }
      }

      // Parse Packages section for design quality issues
      const packagesMatch = xmlContent.match(/<Packages>([\s\S]*?)<\/Packages>/);
      if (packagesMatch) {
        const packagesContent = packagesMatch[1];

        // Find packages with poor design metrics
        const packageMatches = packagesContent.match(/<Package name="([^"]+)">([\s\S]*?)<\/Package>/g);
        if (packageMatches) {
          for (const pkgMatch of packageMatches) {
            const nameMatch = pkgMatch.match(/<Package name="([^"]+)">/);
            const packageName = nameMatch?.[1] || 'unknown';

            // Extract metrics
            const dMatch = pkgMatch.match(/<D>([^<]+)<\/D>/);
            const aMatch = pkgMatch.match(/<A>([^<]+)<\/A>/);
            const iMatch = pkgMatch.match(/<I>([^<]+)<\/I>/);
            const ceMatch = pkgMatch.match(/<Ce>([^<]+)<\/Ce>/);

            const distance = parseFloat(dMatch?.[1] || '0');
            const abstractness = parseFloat(aMatch?.[1] || '0');
            const instability = parseFloat(iMatch?.[1] || '0');
            const efferentCoupling = parseInt(ceMatch?.[1] || '0');

            // Flag packages with high distance from main sequence (> 0.7)
            if (distance > 0.7) {
              issues.push({
                tool: 'jdepend',
                file: packageName.replace(/\./g, '/'),
                line: 1,
                severity: 'medium',
                message: `Poor design metric: Distance from main sequence = ${distance.toFixed(2)} (should be < 0.7). A=${abstractness.toFixed(2)}, I=${instability.toFixed(2)}`,
                rule: 'distance-from-main-sequence',
                category: 'architecture'
              });
            }

            // Flag packages with very high efferent coupling (> 20)
            if (efferentCoupling > 20) {
              issues.push({
                tool: 'jdepend',
                file: packageName.replace(/\./g, '/'),
                line: 1,
                severity: 'medium',
                message: `High efferent coupling: Ce = ${efferentCoupling} (depends on ${efferentCoupling} other packages). Consider reducing dependencies.`,
                rule: 'high-efferent-coupling',
                category: 'architecture'
              });
            }
          }
        }
      }

    } catch (error) {
      logger.warn(`⚠️ Could not parse JDepend XML: ${error}`);
    }

    return issues;
  }

  /**
   * Parse JDepend text output (fallback if XML not available)
   */
  private parseJDependText(output: string, repoPath: string): RawIssue[] {
    const issues: RawIssue[] = [];

    try {
      // Look for cycle mentions
      if (output.toLowerCase().includes('cycle')) {
        const cyclePattern = /cycle[^:]*:\s*([^\n]+)/gi;
        let match;
        while ((match = cyclePattern.exec(output)) !== null) {
          issues.push({
            tool: 'jdepend',
            file: 'unknown',
            line: 1,
            severity: 'high',
            message: `Package cycle detected: ${match[1].trim()}`,
            rule: 'package-cycle',
            category: 'architecture'
          });
        }
      }

      // Look for "contains cycles" mentions
      const containsCycles = output.match(/(\S+)\s+contains?\s+cycle/gi);
      if (containsCycles) {
        for (const cycleMatch of containsCycles) {
          const pkgMatch = cycleMatch.match(/(\S+)\s+contains?/);
          if (pkgMatch) {
            issues.push({
              tool: 'jdepend',
              file: pkgMatch[1].replace(/\./g, '/'),
              line: 1,
              severity: 'high',
              message: `Package contains dependency cycle: ${pkgMatch[1]}`,
              rule: 'package-cycle',
              category: 'architecture'
            });
          }
        }
      }

    } catch (error) {
      logger.warn(`⚠️ Could not parse JDepend text output: ${error}`);
    }

    return issues;
  }

  // ============================================================
  // SESSION 58: PERFORMANCE STATIC ANALYSIS
  // ============================================================

  /**
   * Run static performance analysis using:
   * - PMD Performance rules: Performance anti-patterns
   * - SpotBugs Performance: Performance-related bugs (if compiled)
   * - Memory pattern detection: Common memory leak patterns
   *
   * NOTE: Runtime profilers (JMH, VisualVM, JProfiler) are NOT included
   * because they require actual code execution.
   */
  private async runPerformanceAnalysis(
    repoPath: string,
    branch: 'base' | 'pr'
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      logger.info(`🚀 Running Java performance analysis on ${branch} branch...`);

      // Dynamically import the performance runner
      const { JavaPerformanceRunner } = await import('./performance-runner');
      const runner = new JavaPerformanceRunner();

      // Run all performance analysis tools
      const perfIssues = await runner.runAll(repoPath);

      // Convert to RawIssue format
      const rawIssues: RawIssue[] = perfIssues.map(issue => ({
        tool: issue.tool,
        file: issue.file,
        line: issue.line,
        severity: issue.severity,
        message: issue.message,
        rule: issue.rule,
        category: 'performance',
        autoFixable: false
      }));

      const duration = Date.now() - startTime;
      const metadata = this.calculateMetadata(rawIssues);

      logger.info(`✅ Performance analysis completed: ${rawIssues.length} issues in ${(duration / 1000).toFixed(1)}s`);

      return {
        tool: 'performance',
        success: true,
        duration,
        issues: rawIssues,
        metadata
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Performance analysis failed: ${error.message}`);
      return this.createFailedResult('performance', error.message);
    }
  }
}

