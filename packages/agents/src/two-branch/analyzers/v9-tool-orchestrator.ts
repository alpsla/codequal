/**
 * V9 Tool Orchestrator
 * Manages the execution of scanning tools and coordination with AI agents
 *
 * Architecture:
 * 1. Tools run FIRST to scan code (SpotBugs, PMD, Semgrep, etc.)
 * 2. Agents COMPILE and INTERPRET the tool results
 * 3. Results are deduplicated and categorized
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';
import { UnifiedLocationService } from '../../standard/services/unified-location-service';
import { KubernetesCodeFetcher } from '../utils/kubernetes-code-fetcher';
import { JavaToolOrchestrator, JavaToolConfig } from '../tools/java/java-tool-orchestrator';
import { ToolResult as JavaToolResult, RawIssue } from '../tools/base-tool-orchestrator';
import { ModelConfigResolver } from '../../standard/orchestrator/model-config-resolver';

// Security Scanners (Phase 1 Integration - Session 58)
import {
  SecretScanner,
  SecretIssue,
  SecretScannerConfig
} from '../tools/universal/secret-scanner';
import {
  IaCScanner,
  IaCIssue,
  IaCScannerConfig
} from '../tools/universal/iac-scanner';
import {
  ContainerScanner,
  ContainerVulnerability,
  DockerfileIssue,
  ContainerScannerConfig
} from '../tools/universal/container-scanner';

// Infrastructure Detection (Phase 1 - Session 59)
import {
  getSecurityScanConfig,
  detectInfrastructure,
  InfrastructureType
} from '../utils/framework-detector';

const execAsync = promisify(exec);

export interface ToolScanResult {
  tool: string;
  output: string;
  exitCode: number;
  duration: number;
  filesScanned: number;
}

export interface ProcessedIssue {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  file: string;
  line: number;
  column?: number;
  tool: string;
  agent: string;
  confidence: number;
  description: string;
  suggestion?: string;
  codeSnippet?: string;
  suggestedFix?: string;
  rawToolOutput?: string;
}

export class V9ToolOrchestrator {
  private supabase: any;
  private openRouterKey: string;
  private toolResults: Map<string, ToolScanResult> = new Map();
  private cloudPodUrl: string;
  private locationService: UnifiedLocationService;
  private k8sCodeFetcher: KubernetesCodeFetcher;
  private useKubernetes: boolean;
  private modelConfigResolver: ModelConfigResolver;

  // Security Scanners (Phase 1 Integration)
  private secretScanner: SecretScanner;
  private iacScanner: IaCScanner;
  private containerScanner: ContainerScanner;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    this.openRouterKey = process.env.OPENROUTER_API_KEY!;
    this.cloudPodUrl = process.env.CLOUD_POD_URL || 'http://localhost:8080';
    this.locationService = new UnifiedLocationService({
      enableMetrics: true,
      contextLines: 3
    });
    this.k8sCodeFetcher = new KubernetesCodeFetcher();
    this.useKubernetes = !process.env.CLOUD_API_URL || process.env.USE_KUBERNETES !== 'false';
    this.modelConfigResolver = new ModelConfigResolver(logger);

    // Initialize Security Scanners (Phase 1)
    this.secretScanner = new SecretScanner({
      scanHistory: false,  // Don't scan git history by default (faster)
      includeVerification: true  // TruffleHog credential verification
    });
    this.iacScanner = new IaCScanner({
      // Scan all supported frameworks
      frameworks: ['terraform', 'kubernetes', 'cloudformation', 'dockerfile', 'helm', 'ansible'],
      compactOutput: true
    });
    this.containerScanner = new ContainerScanner({
      severityThreshold: 'medium',
      scanDockerfiles: true,
      ignoreUnfixed: false
    });
  }

  /**
   * Main orchestration flow
   * STEP 1: Detect infrastructure and determine security scan config
   * STEP 2: Run language-specific tools + security scans in parallel
   * STEP 3: Send results to agents for interpretation
   * STEP 4: Compile and deduplicate results
   */
  async orchestrateAnalysis(
    files: string[],
    repoPath: string,
    language: string,
    tools: any[],
    workspaceId?: string,
    pvcName?: string,
    options?: {
      skipSecurityScans?: boolean;  // Skip infrastructure security scans
      securityScanOverride?: {      // Force specific security scans
        enableSecrets?: boolean;
        enableIaC?: boolean;
        enableContainer?: boolean;
      };
    }
  ): Promise<ProcessedIssue[]> {
    logger.info(`🎯 Starting Tool Orchestration for ${language}`);
    logger.info(`📁 Repository: ${repoPath}`);
    logger.info(`📊 Files to analyze: ${files.length}`);
    logger.info(`🔧 Tools configured: ${tools.length}`);

    // STEP 1: Detect infrastructure and determine security scan config
    logger.info('\n🏗️ STEP 1: Detecting infrastructure...');
    let securityConfig = {
      enableSecrets: true,  // Always scan for secrets by default
      enableIaC: false,
      enableContainer: false,
      detectedInfrastructure: [] as InfrastructureType[]
    };

    if (!options?.skipSecurityScans) {
      try {
        securityConfig = await getSecurityScanConfig(repoPath);
        logger.info(`  📋 Infrastructure detected: ${securityConfig.detectedInfrastructure.join(', ') || 'none'}`);
        logger.info(`  🔑 Secrets scan: ${securityConfig.enableSecrets ? 'enabled' : 'disabled'}`);
        logger.info(`  🏗️ IaC scan: ${securityConfig.enableIaC ? 'enabled' : 'disabled'}`);
        logger.info(`  🐳 Container scan: ${securityConfig.enableContainer ? 'enabled' : 'disabled'}`);
      } catch (error) {
        logger.warn(`  ⚠️ Infrastructure detection failed, using defaults: ${error}`);
      }

      // Apply overrides if provided
      if (options?.securityScanOverride) {
        securityConfig = {
          ...securityConfig,
          ...options.securityScanOverride
        };
        logger.info('  📝 Applied security scan overrides from options');
      }
    } else {
      logger.info('  ⏭️ Security scans skipped (skipSecurityScans=true)');
    }

    // STEP 2: Run language-specific tools and security scans in parallel
    logger.info('\n📡 STEP 2: Running scanning tools...');

    const scanPromises: Promise<any>[] = [];

    // Language-specific tools
    scanPromises.push(
      this.runAllTools(tools, files, repoPath)
        .then(results => ({ type: 'language', results }))
    );

    // Security scans (run in parallel with language tools)
    if (!options?.skipSecurityScans) {
      scanPromises.push(
        this.runSecurityScans(repoPath, {
          enableSecrets: securityConfig.enableSecrets,
          enableIaC: securityConfig.enableIaC,
          enableContainer: securityConfig.enableContainer
        }).then(issues => ({ type: 'security', issues }))
      );
    }

    // Wait for all scans to complete
    const scanResults = await Promise.allSettled(scanPromises);

    // Extract language tool results
    let toolResults: ToolScanResult[] = [];
    let securityIssues: ProcessedIssue[] = [];

    for (const result of scanResults) {
      if (result.status === 'fulfilled') {
        if (result.value.type === 'language') {
          toolResults = result.value.results;
        } else if (result.value.type === 'security') {
          securityIssues = result.value.issues;
        }
      } else {
        logger.error(`Scan failed: ${result.reason}`);
      }
    }

    // Store results for caching
    toolResults.forEach(result => {
      this.toolResults.set(result.tool, result);
    });

    logger.info(`✅ Tool scanning complete. ${toolResults.length} tools executed, ${securityIssues.length} security issues found.`);

    // STEP 3: Send tool results to AI agents for interpretation
    logger.info('\n🤖 STEP 3: Sending results to AI agents for interpretation...');
    const interpretedIssues = await this.sendResultsToAgents(
      toolResults,
      language,
      tools
    );

    logger.info(`✅ Agent interpretation complete. ${interpretedIssues.length} issues identified.`);

    // Merge security issues with interpreted issues
    const allIssues = [...interpretedIssues, ...securityIssues];

    // STEP 4: Deduplicate and categorize issues
    logger.info('\n🔍 STEP 4: Deduplicating and categorizing issues...');
    const dedupedIssues = this.deduplicateIssues(allIssues);

    // STEP 5: Fetch actual code snippets from Kubernetes or locally
    logger.info('\n📝 STEP 5: Fetching code snippets for issues...');
    if (this.useKubernetes && workspaceId && pvcName) {
      await this.fetchCodeSnippetsFromKubernetes(dedupedIssues, workspaceId, pvcName);
    } else {
      logger.info('Using placeholder code snippets (local mode or missing K8s params)');
    }

    logger.info(`✅ Final result: ${dedupedIssues.length} unique issues found.`);
    this.logIssueSummary(dedupedIssues);

    return dedupedIssues;
  }

  /**
   * Process already-executed tool results (for Kubernetes execution)
   * Use this when tools have been executed externally (e.g., in Kubernetes)
   */
  async processExecutedToolResults(
    toolResults: ToolScanResult[],
    language: string,
    tools: any[],
    workspaceId?: string,
    pvcName?: string
  ): Promise<ProcessedIssue[]> {
    logger.info(`🎯 Processing pre-executed tool results for ${language}`);
    logger.info(`📊 Tool results to process: ${toolResults.length}`);

    // Store results for caching
    toolResults.forEach(result => {
      this.toolResults.set(result.tool, result);
    });

    // STEP 2: Send tool results to AI agents for interpretation
    logger.info('\n🤖 STEP 2: Sending results to AI agents for interpretation...');
    const interpretedIssues = await this.sendResultsToAgents(
      toolResults,
      language,
      tools
    );

    logger.info(`✅ Agent interpretation complete. ${interpretedIssues.length} issues identified.`);

    // STEP 3: Deduplicate and categorize issues
    logger.info('\n🔍 STEP 3: Deduplicating and categorizing issues...');
    const dedupedIssues = this.deduplicateIssues(interpretedIssues);

    // STEP 4: Fetch actual code snippets from Kubernetes or locally
    logger.info('\n📝 STEP 4: Fetching code snippets for issues...');
    if (this.useKubernetes && workspaceId && pvcName) {
      await this.fetchCodeSnippetsFromKubernetes(dedupedIssues, workspaceId, pvcName);
    } else {
      logger.info('Using placeholder code snippets (local mode or missing K8s params)');
    }

    logger.info(`✅ Final result: ${dedupedIssues.length} unique issues found.`);
    this.logIssueSummary(dedupedIssues);

    return dedupedIssues;
  }

  /**
   * Java-specific orchestration using JavaToolOrchestrator
   * This method directly uses the JavaToolOrchestrator which returns structured issues
   */
  async orchestrateJavaAnalysis(
    repoPath: string,
    branch: 'main' | 'pr',
    changedFiles?: string[],
    options?: {
      severityFilter?: 'critical' | 'high' | 'medium' | 'low' | 'all';
      enableFallback?: boolean;  // If true, fall back to next severity if no issues found
    }
  ): Promise<ProcessedIssue[]> {
    logger.info(`🎯 Starting Java-Specific Tool Orchestration (${branch} branch)`);
    logger.info(`📁 Repository: ${repoPath}`);

    try {
      // Create JavaToolOrchestrator with default config
      const javaConfig: Partial<JavaToolConfig> = {
        pmd: {
          enabled: true,
          // @ts-expect-error - Config properties mismatch with refactored JavaToolConfig interface, needs refactoring
          minimumPriority: 2,  // Priority 1 = Critical, 2 = High (include both for better analysis)
          rulesets: ['category/java/errorprone.xml', 'category/java/bestpractices.xml'],
          parallel: 2,
          threads: 3,
          memory: '5g'
        },
        checkstyle: {
          enabled: false,  // Disabled for critical-only analysis (Checkstyle doesn't have critical-severity issues)
          configFile: '/sun_checks.xml',
          // @ts-expect-error - Config properties mismatch with refactored JavaToolConfig interface, needs refactoring
          parallel: 2,
          memory: '3g',
          changedFilesOnly: false
        },
        semgrep: {
          enabled: true,
          // @ts-expect-error - Config properties mismatch with refactored JavaToolConfig interface, needs refactoring
          rulesets: ['p/security-audit', 'p/java'],
          parallel: 4,
          smartSelection: true,
          memory: '2g'
        },
        spotbugs: {
          enabled: false,  // Optional - requires compilation
          // @ts-expect-error - Config properties mismatch with refactored JavaToolConfig interface, needs refactoring
          priority: 'high',
          effort: 'default',
          memory: '4g'
        },
        dependencyCheck: {
          enabled: true,  // REQUIRED - always run for security vulnerabilities
          failOnCVSS: 7.0,
          // @ts-expect-error - Config properties mismatch with refactored JavaToolConfig interface, needs refactoring
          timeout: 300,
          postgres: {
            enabled: true,
            connectionString: process.env.ORACLE_DEPCHECK_DB_URL || 'jdbc:postgresql://localhost:5432/nvd',
            dbUser: process.env.ORACLE_DEPCHECK_DB_USER || 'depcheck_scanner',
            dbPassword: process.env.ORACLE_DEPCHECK_DB_PASSWORD || '',
            dbDriver: process.env.ORACLE_DEPCHECK_JDBC_DRIVER || '/tmp/jdbc-drivers/postgresql-42.7.1.jar'
          }
        }
      };

      const javaOrchestrator = new JavaToolOrchestrator(javaConfig);

      // Run Java tools
      logger.info('🔧 Executing Java tools via JavaToolOrchestrator...');
      const orchestrationResult = await javaOrchestrator.orchestrate(
        repoPath,
        branch === 'main' ? 'base' : 'pr',
        // @ts-expect-error - orchestrate() signature mismatch with refactored base class, needs refactoring
        changedFiles
      );

      if (!orchestrationResult.success) {
        logger.error('❌ Java tool orchestration failed');
        return [];
      }

      logger.info(`✅ Java tools executed: ${orchestrationResult.toolResults.length} tools`);
      logger.info(`📊 Total issues found: ${orchestrationResult.summary.totalIssues}`);

      // Convert JavaToolResult[] to ProcessedIssue[] with code enrichment
      const processedIssues = await this.convertJavaResultsToProcessedIssues(
        orchestrationResult.toolResults,
        branch,
        repoPath
      );

      logger.info(`✅ Converted to ${processedIssues.length} processed issues`);
      this.logIssueSummary(processedIssues);

      // Filter by severity if requested
      if (options?.severityFilter && options.severityFilter !== 'all') {
        return this.applySeverityFilter(
          processedIssues,
          options.severityFilter,
          options.enableFallback ?? true  // Default: enable fallback
        );
      }

      return processedIssues;

    } catch (error: any) {
      logger.error(`❌ Java analysis failed: ${error.message}`);
      logger.error(error.stack);
      return [];
    }
  }

  /**
   * Apply severity filtering with automatic fallback
   * If no issues found at requested severity, falls back to next level
   */
  private applySeverityFilter(
    issues: ProcessedIssue[],
    requestedSeverity: 'critical' | 'high' | 'medium' | 'low',
    enableFallback: boolean
  ): ProcessedIssue[] {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const severityNames = ['critical', 'high', 'medium', 'low'] as const;

    let currentSeverity = requestedSeverity;
    let filtered: ProcessedIssue[] = [];

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const minSeverity = severityOrder[currentSeverity];
      filtered = issues.filter(issue =>
        severityOrder[issue.severity] <= minSeverity
      );

      if (filtered.length > 0 || !enableFallback) {
        // Found issues or fallback disabled
        if (currentSeverity !== requestedSeverity) {
          logger.info(`⚠️  No ${requestedSeverity} issues found, fell back to ${currentSeverity}+`);
        }
        logger.info(`🔍 Filtered to ${filtered.length} issues (${currentSeverity}+ severity)`);
        return filtered;
      }

      // Try next severity level
      const currentIndex = severityNames.indexOf(currentSeverity);
      if (currentIndex >= severityNames.length - 1) {
        // Reached lowest severity, return empty
        logger.warn(`⚠️  No issues found at any severity level`);
        return [];
      }

      currentSeverity = severityNames[currentIndex + 1];
      logger.info(`⚠️  No ${severityNames[currentIndex]} issues found, trying ${currentSeverity}...`);
    }
  }

  /**
   * Extract code snippet from file at specified line
   */
  private async extractCodeSnippet(
    repoPath: string,
    filePath: string,
    startLine: number,
    endLine?: number,
    contextLines = 3
  ): Promise<string> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      // Remove /workspace prefix if present
      const cleanPath = filePath.replace('/workspace/', '');
      const fullPath = path.join(repoPath, cleanPath);

      const content = await fs.readFile(fullPath, 'utf-8');
      const lines = content.split('\n');

      const actualEndLine = endLine || startLine;
      const snippetStart = Math.max(0, startLine - contextLines - 1);
      const snippetEnd = Math.min(lines.length, actualEndLine + contextLines);

      const snippet = lines.slice(snippetStart, snippetEnd)
        .map((line, idx) => {
          const lineNum = snippetStart + idx + 1;
          const marker = (lineNum >= startLine && lineNum <= actualEndLine) ? '→' : ' ';
          return `${String(lineNum).padStart(4, ' ')}${marker} ${line}`;
        })
        .join('\n');

      return snippet;
    } catch (error: any) {
      return `// Unable to extract code snippet: ${error.message}`;
    }
  }

  /**
   * Generate AI-powered fix suggestion and impact analysis
   */
  private generateEnrichedSuggestion(issue: RawIssue): {
    suggestion: string;
    impact: string;
  } {
    // For now, use rule-based suggestions (AI integration can be added later)
    const impacts: Record<string, string> = {
      'ReturnEmptyCollectionRatherThanNull': 'Returning null instead of empty collections can cause NullPointerExceptions in calling code, leading to runtime crashes.',
      'AvoidCatchingGenericException': 'Catching generic exceptions masks specific error conditions, making debugging difficult and potentially hiding critical failures.',
      'GuardLogStatement': 'Unguarded log statements execute expensive string operations even when logging is disabled, degrading performance.',
    };

    const suggestions: Record<string, string> = {
      'ReturnEmptyCollectionRatherThanNull': `Instead of returning null, return Collections.emptyList(), Collections.emptySet(), or Collections.emptyMap(). Example:\n\n  // Bad\n  return null;\n  \n  // Good\n  return Collections.emptyList();`,
      'AvoidCatchingGenericException': 'Catch specific exception types instead of Exception or Throwable. This allows proper error handling for different failure scenarios.',
      'GuardLogStatement': `Wrap log statements with level guards:\n\n  // Bad\n  log.debug("Expensive: " + data);\n  \n  // Good\n  if (log.isDebugEnabled()) {\n    log.debug("Expensive: " + data);\n  }`,
    };

    return {
      impact: impacts[issue.rule] || `Code quality issue detected by ${issue.tool}. ${issue.message}`,
      suggestion: suggestions[issue.rule] || `Review the ${issue.tool} documentation: ${(issue as any).externalInfoUrl || 'N/A'}`
    };
  }

  /**
   * Convert JavaToolOrchestrator's ToolResult[] to V9's ProcessedIssue[]
   */
  private async convertJavaResultsToProcessedIssues(
    javaResults: JavaToolResult[],
    branch: string,
    repoPath: string
  ): Promise<ProcessedIssue[]> {
    const processedIssues: ProcessedIssue[] = [];

    for (const toolResult of javaResults) {
      if (!toolResult.success || !toolResult.issues || toolResult.issues.length === 0) {
        continue;
      }

      // Convert each RawIssue to ProcessedIssue (with enrichment)
      for (const rawIssue of toolResult.issues) {
        // Ensure message exists (required field for deduplication)
        const message = rawIssue.message || rawIssue.rule || 'No description available';

        // Extract code snippet from file
        const codeSnippet = await this.extractCodeSnippet(
          repoPath,
          rawIssue.file,
          rawIssue.line,
          // @ts-expect-error - endLine property doesn't exist on RawIssue, needs refactoring
          rawIssue.endLine
        );

        // Generate enriched suggestion and impact
        const enrichment = this.generateEnrichedSuggestion(rawIssue);

        const processedIssue: ProcessedIssue = {
          id: `${toolResult.tool}-${branch}-${rawIssue.file}-${rawIssue.line}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: `${rawIssue.rule}: ${message.substring(0, 80)}`, // Rule + message
          severity: rawIssue.severity,
          category: this.mapJavaToolToCategory(toolResult.tool),
          file: rawIssue.file,
          line: rawIssue.line,
          column: rawIssue.column,
          tool: toolResult.tool,
          agent: this.mapJavaToolToAgent(toolResult.tool),
          confidence: this.calculateConfidence(rawIssue),
          description: `${message}\n\n**Impact**: ${enrichment.impact}`,  // Message + Impact
          suggestion: enrichment.suggestion,
          codeSnippet: codeSnippet,
          rawToolOutput: JSON.stringify(rawIssue, null, 2)
        };

        processedIssues.push(processedIssue);
      }
    }

    return processedIssues;
  }

  /**
   * Convert ProcessedIssue to ToolIssue format (for TwoBranchComparator)
   */
  convertProcessedIssuesToToolIssues(processedIssues: ProcessedIssue[]): any[] {
    return processedIssues.map(issue => ({
      id: issue.id,
      tool: issue.tool,
      ruleId: issue.title.substring(0, 50), // Use title as ruleId
      category: issue.category as any,
      file: issue.file,
      startLine: issue.line,
      endLine: issue.line,
      startColumn: issue.column,
      endColumn: issue.column,
      severity: issue.severity as any,
      message: issue.description, // ProcessedIssue.description → ToolIssue.message
      codeSnippet: issue.codeSnippet,
      metadata: {
        agent: issue.agent,
        confidence: issue.confidence,
        suggestion: issue.suggestion,
        suggestedFix: issue.suggestedFix
      }
    }));
  }

  /**
   * Map Java tool names to V9 categories
   */
  private mapJavaToolToCategory(tool: string): string {
    const mapping: Record<string, string> = {
      'PMD': 'code-quality',
      'Checkstyle': 'code-style',
      'Semgrep': 'security',
      'SpotBugs': 'bugs',
      'Dependency-Check': 'dependencies'
    };
    return mapping[tool] || 'general';
  }

  /**
   * Map Java tool names to V9 agent names
   */
  private mapJavaToolToAgent(tool: string): string {
    const mapping: Record<string, string> = {
      'PMD': 'CodeQualityAgent',
      'Checkstyle': 'CodeQualityAgent',
      'Semgrep': 'SecurityAgent',
      'SpotBugs': 'CodeQualityAgent',
      'Dependency-Check': 'DependencyAgent'
    };
    return mapping[tool] || 'CodeQualityAgent';
  }

  /**
   * Calculate confidence score based on issue metadata
   */
  private calculateConfidence(issue: RawIssue): number {
    // Base confidence on severity and tool type
    let confidence = 0.7; // Default

    // Higher confidence for critical/high severity
    if (issue.severity === 'critical') confidence = 0.95;
    else if (issue.severity === 'high') confidence = 0.85;
    else if (issue.severity === 'medium') confidence = 0.75;
    else if (issue.severity === 'low') confidence = 0.65;

    // Boost confidence if CVE is present (Dependency-Check)
    // @ts-expect-error - cve property doesn't exist on RawIssue, needs refactoring
    if (issue.cve) confidence = Math.min(0.98, confidence + 0.1);

    // Boost confidence if CVSS score is high
    // @ts-expect-error - cvssScore property doesn't exist on RawIssue, needs refactoring
    if (issue.cvssScore && issue.cvssScore >= 9.0) confidence = 0.98;
    // @ts-expect-error - cvssScore property doesn't exist on RawIssue, needs refactoring
    else if (issue.cvssScore && issue.cvssScore >= 7.0) confidence = Math.min(0.95, confidence + 0.05);

    return confidence;
  }

  /**
   * Generate fix suggestion based on issue metadata
   */
  private generateSuggestion(issue: RawIssue): string | undefined {
    // For CVEs, suggest updating dependency
    // @ts-expect-error - cve/cvssScore properties don't exist on RawIssue, needs refactoring
    if (issue.cve) {
      // @ts-expect-error - cve/cvssScore properties don't exist on RawIssue, needs refactoring
      return `Update dependency to patch ${issue.cve} (CVSS: ${issue.cvssScore || 'N/A'})`;
    }

    // For code quality issues, use the rule name
    if (issue.rule) {
      return `Review and fix violation of rule: ${issue.rule}`;
    }

    return undefined;
  }

  /**
   * STEP 1: Run all scanning tools
   * Tools are executed either locally or on cloud pod
   */
  private async runAllTools(
    tools: any[],
    files: string[],
    repoPath: string
  ): Promise<ToolScanResult[]> {
    const results: ToolScanResult[] = [];

    logger.info(`📊 Tool execution configuration:`);
    logger.info(`   Total tools: ${tools.length}`);
    logger.info(`   USE_LOCAL_TOOLS: ${process.env.USE_LOCAL_TOOLS || 'not set'}`);
    logger.info(`   USE_CLOUD_POD: ${process.env.USE_CLOUD_POD || 'not set'}`);

    // Log tool details
    tools.forEach((tool, index) => {
      logger.info(`   Tool ${index + 1}: ${tool.name}`);
      logger.info(`     - runLocally: ${tool.runLocally}`);
      logger.info(`     - runOnCloud: ${tool.runOnCloud}`);
      logger.info(`     - image: ${tool.image || 'not specified'}`);
      logger.info(`     - command: ${tool.command || 'not specified'}`);
    });

    // Group tools by execution strategy
    const localTools = tools.filter(t => t.runLocally !== false);
    const cloudTools = tools.filter(t => t.runOnCloud === true);

    logger.info(`📦 Tool categorization:`);
    logger.info(`   Local tools: ${localTools.length} (${localTools.map(t => t.name).join(', ')})`);
    logger.info(`   Cloud tools: ${cloudTools.length} (${cloudTools.map(t => t.name).join(', ')})`);

    // Run local tools in parallel
    const useLocalTools = process.env.USE_LOCAL_TOOLS === 'true';
    if (localTools.length > 0) {
      if (useLocalTools) {
        logger.info(`  🖥️ Running ${localTools.length} tools locally...`);
        const localPromises = localTools.map(tool =>
          this.runLocalTool(tool, repoPath, files)
        );
        const localResults = await Promise.allSettled(localPromises);

        for (let i = 0; i < localResults.length; i++) {
          const result = localResults[i];
          const toolName = localTools[i].name;
          if (result.status === 'fulfilled' && result.value) {
            results.push(result.value);
            logger.info(`     ✅ ${toolName} succeeded`);
          } else if (result.status === 'rejected') {
            logger.error(`     ❌ ${toolName} failed: ${result.reason}`);
          }
        }
      } else {
        logger.warn(`  ⚠️ Local tools available but USE_LOCAL_TOOLS not set to 'true'`);
      }
    }

    // Run cloud pod tools
    const useCloudPod = process.env.USE_CLOUD_POD === 'true';
    if (cloudTools.length > 0) {
      if (useCloudPod) {
        logger.info(`  ☁️ Running ${cloudTools.length} tools on cloud pod...`);
        const cloudResults = await this.runCloudPodTools(cloudTools, repoPath);
        results.push(...cloudResults);
      } else {
        logger.warn(`  ⚠️ Cloud tools available but USE_CLOUD_POD not set to 'true'`);
      }
    }

    // If no real tools available, throw error instead of simulating
    if (results.length === 0) {
      logger.error('  ❌ No real tools executed successfully');
      logger.error('  💡 Debugging information:');
      logger.error(`     - Tools provided: ${tools.length}`);
      logger.error(`     - Local tools available: ${localTools.length}`);
      logger.error(`     - Cloud tools available: ${cloudTools.length}`);
      logger.error(`     - USE_LOCAL_TOOLS: ${useLocalTools}`);
      logger.error(`     - USE_CLOUD_POD: ${useCloudPod}`);
      logger.error('  🔧 To fix: Set USE_LOCAL_TOOLS=true or USE_CLOUD_POD=true in environment');
      throw new Error('Tool execution failed - no tools returned results. Check environment variables and tool configuration.');
    }

    logger.info(`✅ Tool execution complete: ${results.length} results collected`);
    return results;
  }

  /**
   * Run a tool locally
   */
  private async runLocalTool(
    tool: any,
    repoPath: string,
    files: string[]
  ): Promise<ToolScanResult | null> {
    try {
      const startTime = Date.now();
      logger.debug(`    Running ${tool.name}...`);

      const { stdout, stderr } = await execAsync(tool.command, {
        cwd: repoPath,
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer
        timeout: 300000 // 5 minute timeout
      });

      const duration = Date.now() - startTime;
      const output = stdout + '\n' + stderr;

      logger.debug(`    ${tool.name} completed in ${duration}ms`);

      return {
        tool: tool.name,
        output: output,
        exitCode: 0,
        duration: duration,
        filesScanned: files.length
      };
    } catch (error: any) {
      logger.warn(`    ${tool.name} failed: ${error.message}`);

      // Even if tool fails, capture its output
      return {
        tool: tool.name,
        output: error.stdout || error.stderr || error.message,
        exitCode: error.code || 1,
        duration: 0,
        filesScanned: 0
      };
    }
  }

  /**
   * Run tools on cloud pod
   */
  private async runCloudPodTools(
    tools: any[],
    repoPath: string
  ): Promise<ToolScanResult[]> {
    const results: ToolScanResult[] = [];

    try {
      // Send request to cloud pod
      const response = await fetch(`${this.cloudPodUrl}/api/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CLOUD_POD_TOKEN}`
        },
        body: JSON.stringify({
          tools: tools.map(t => t.name),
          repoPath: repoPath,
          language: 'java'
        })
      });

      if (!response.ok) {
        throw new Error(`Cloud pod error: ${response.status}`);
      }

      const data = await response.json() as any;

      for (const toolResult of data.results || []) {
        results.push({
          tool: toolResult.tool,
          output: toolResult.output,
          exitCode: toolResult.exitCode || 0,
          duration: toolResult.duration || 0,
          filesScanned: toolResult.filesScanned || 0
        });
      }
    } catch (error) {
      logger.error(`Cloud pod scan failed: ${error.message}`);
    }

    return results;
  }

  // REMOVED: simulateToolScans method - NO SIMULATIONS ALLOWED
  // All tool execution must be real or fail with clear errors

  /**
   * STEP 2: Send tool results to AI agents for interpretation
   */
  private async sendResultsToAgents(
    toolResults: ToolScanResult[],
    language: string,
    tools: any[]
  ): Promise<ProcessedIssue[]> {
    const allIssues: ProcessedIssue[] = [];

    // Group results by agent type
    const resultsByAgent = new Map<string, ToolScanResult[]>();

    for (const result of toolResults) {
      const tool = tools.find(t => t.name === result.tool);
      if (tool && tool.agent) {
        if (!resultsByAgent.has(tool.agent)) {
          resultsByAgent.set(tool.agent, []);
        }
        resultsByAgent.get(tool.agent)!.push(result);
      }
    }

    // Send to each agent for interpretation
    for (const [agent, results] of resultsByAgent) {
      logger.info(`  Sending ${results.length} tool results to ${agent}...`);

      const interpretedIssues = await this.interpretToolResults(
        agent,
        results,
        language
      );

      allIssues.push(...interpretedIssues);
      logger.info(`  ${agent} identified ${interpretedIssues.length} issues`);
    }

    return allIssues;
  }

  /**
   * Interpret tool results using AI agent
   */
  private async interpretToolResults(
    agent: string,
    toolResults: ToolScanResult[],
    language: string
  ): Promise<ProcessedIssue[]> {
    const issues: ProcessedIssue[] = [];

    try {
      // Get the appropriate model for this agent
      const model = await this.getModelForAgent(agent, language);

      if (!model) {
        logger.warn(`No model available for ${agent}`);
        return this.parseToolOutputsDirectly(toolResults, agent);
      }

      // Prepare the tool outputs for AI interpretation
      const combinedOutput = toolResults.map(r =>
        `=== ${r.tool} Output ===\n${r.output}\n`
      ).join('\n');

      // Call AI to interpret the results
      const interpretation = await this.callAIForInterpretation(
        model,
        agent,
        combinedOutput,
        language
      );

      // Convert AI interpretation to issues
      if (interpretation && interpretation.issues) {
        for (const issue of interpretation.issues) {
          issues.push({
            id: `${agent}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: issue.title || 'Issue detected',
            severity: this.normalizeSeverity(issue.severity),
            category: this.mapAgentToCategory(agent),
            file: issue.file || 'unknown',
            line: issue.line || 1,
            column: issue.column,
            tool: issue.tool || toolResults[0]?.tool || 'unknown',
            agent: agent,
            confidence: issue.confidence || 0.75,
            description: issue.description || issue.message,
            suggestion: issue.suggestion,
            codeSnippet: issue.codeSnippet,
            suggestedFix: issue.suggestedFix,
            rawToolOutput: issue.rawOutput
          });
        }
      }
    } catch (error) {
      logger.error(`Failed to interpret results with ${agent}: ${error.message}`);
      // Fall back to direct parsing
      return this.parseToolOutputsDirectly(toolResults, agent);
    }

    return issues;
  }

  /**
   * Call AI to interpret tool outputs
   */
  private async callAIForInterpretation(
    model: string,
    agent: string,
    toolOutput: string,
    language: string
  ): Promise<any> {
    const prompts = {
      'SecurityAnalyzer': `You are a security expert. Analyze these security tool outputs and identify real vulnerabilities.
                          Extract: file, line, severity (critical/high/medium/low), title, description, suggestion.`,
      'QualityAnalyzer': `You are a code quality expert. Analyze these quality tool outputs and identify code issues.
                         Extract: file, line, severity, title, description, suggestion.`,
      'PerformanceAnalyzer': `You are a performance expert. Analyze these performance tool outputs and identify bottlenecks.
                             Extract: file, line, severity, title, description, suggestion.`,
      'ArchitectureAnalyzer': `You are an architecture expert. Analyze these tool outputs and identify design issues.
                              Extract: file, line, severity, title, description, suggestion.`,
      'DependencyAnalyzer': `You are a dependency expert. Analyze these dependency scan outputs and identify risks.
                            Extract: file, line, severity, title, description, suggestion.`
    };

    const systemPrompt = prompts[agent] || prompts['QualityAnalyzer'];

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/codequal/agents',
          'X-Title': 'CodeQual Tool Result Interpretation'
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'system',
              content: `${systemPrompt}

                       Return ONLY a JSON object with an "issues" array.
                       Each issue must have the fields mentioned above.
                       Focus on REAL issues found in the tool output, not hypothetical ones.`
            },
            {
              role: 'user',
              content: `Interpret these ${language} scanning tool results and extract the actual issues found:\n\n${toolOutput}`
            }
          ],
          max_tokens: 4000,
          temperature: 0.1,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status}`);
      }

      const data = await response.json() as any;
      const content = data.choices[0]?.message?.content || '{}';
      return JSON.parse(content);

    } catch (error) {
      logger.error(`AI interpretation failed: ${error.message}`);
      return { issues: [] };
    }
  }

  /**
   * Parse tool outputs directly without AI
   */
  private parseToolOutputsDirectly(
    toolResults: ToolScanResult[],
    agent: string
  ): ProcessedIssue[] {
    const issues: ProcessedIssue[] = [];

    for (const result of toolResults) {
      const lines = result.output.split('\n');

      for (const line of lines) {
        // Look for common patterns in tool outputs
        const patterns = [
          /\[(CRITICAL|HIGH|MEDIUM|LOW)\]\s+(.+)\s+in\s+(.+):(\d+)/i,
          /Error:\s+(.+)\s+at\s+(.+):(\d+)/i,
          /Warning:\s+(.+)\s+in\s+(.+):(\d+)/i,
          /(.+\.java):(\d+):\s+(.+)/
        ];

        for (const pattern of patterns) {
          const match = line.match(pattern);
          if (match) {
            issues.push({
              id: `${result.tool}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              title: `${result.tool} issue`,
              severity: this.extractSeverityFromLine(line),
              category: this.mapAgentToCategory(agent),
              file: match[3] || match[2] || 'unknown',
              line: parseInt(match[4] || match[3] || '1') || 1,
              tool: result.tool,
              agent: agent,
              confidence: 0.6,
              description: match[2] || match[1] || line,
              rawToolOutput: line,
              // In simulation mode, provide placeholder snippets
              codeSnippet: `// Code snippet will be fetched by UnifiedLocationService`,
              suggestedFix: `Apply ${result.tool} recommended fix`
            });
            break;
          }
        }
      }
    }

    return issues;
  }

  /**
   * STEP 3: Deduplicate issues
   */
  private deduplicateIssues(issues: ProcessedIssue[]): ProcessedIssue[] {
    const uniqueIssues = new Map<string, ProcessedIssue>();

    for (const issue of issues) {
      // Create a unique key based on file, line, and issue type
      const key = `${issue.file}:${issue.line}:${issue.category}:${issue.title.substring(0, 30)}`;

      if (!uniqueIssues.has(key)) {
        uniqueIssues.set(key, issue);
      } else {
        // If duplicate, keep the one with higher confidence
        const existing = uniqueIssues.get(key)!;
        if (issue.confidence > existing.confidence) {
          uniqueIssues.set(key, issue);
        }
      }
    }

    return Array.from(uniqueIssues.values());
  }

  /**
   * Fetch code snippets from Kubernetes PVC
   */
  private async fetchCodeSnippetsFromKubernetes(
    issues: ProcessedIssue[],
    workspaceId: string,
    pvcName: string
  ): Promise<void> {
    logger.info(`Fetching code snippets for ${issues.length} issues from Kubernetes`);

    // Group issues by file for efficiency
    const issuesByFile = new Map<string, ProcessedIssue[]>();
    for (const issue of issues) {
      if (!issuesByFile.has(issue.file)) {
        issuesByFile.set(issue.file, []);
      }
      issuesByFile.get(issue.file)!.push(issue);
    }

    // Fetch snippets for each file
    let fetchedCount = 0;
    for (const [file, fileIssues] of issuesByFile) {
      // Prepare locations for batch fetching
      const locations = fileIssues.map(issue => ({
        file: issue.file,
        line: issue.line,
        column: issue.column
      }));

      try {
        const snippets = await this.k8sCodeFetcher.fetchCodeSnippets(
          workspaceId,
          pvcName,
          locations
        );

        // Update issues with fetched snippets
        for (const issue of fileIssues) {
          const key = `${issue.file}:${issue.line}`;
          const snippet = snippets.get(key);
          if (snippet) {
            issue.codeSnippet = snippet.code;
            fetchedCount++;
          }
        }
      } catch (error) {
        logger.warn(`Failed to fetch snippets for ${file}: ${error.message}`);
      }
    }

    logger.info(`✅ Fetched ${fetchedCount} code snippets from Kubernetes`);
  }

  /**
   * Helper methods
   */

  private async getModelForAgent(agent: string, language: string): Promise<string | null> {
    try {
      const role = this.mapAgentToRole(agent);

      logger.debug(`Querying Supabase for agent=${agent}, role=${role}, language=${language}`);

      // Use limit(1) instead of single() to handle multiple rows
      // Take the first matching row
      const { data, error } = await this.supabase
        .from('model_configurations')
        .select('primary_model')
        .eq('role', role)
        .eq('language', language)
        .limit(1);

      if (!error && data && data.length > 0 && data[0].primary_model) {
        logger.debug(`Found model for ${agent}: ${data[0].primary_model}`);
        return data[0].primary_model;
      }

      // FALLBACK TO RESEARCHER AGENT for dynamic discovery
      logger.info(`No model configuration found for ${agent}/${language}, triggering Researcher Agent discovery...`);
      
      try {
        // Import and use ModelResearcherService for discovery
        const { ModelResearcherService } = await import('../research-services/model-researcher-service');
        const modelResearcher = new ModelResearcherService();
        
        // Determine repository size (you may want to pass this as parameter)
        const repoSize = 'medium'; // Default, should be determined dynamically
        
        // Create context for model discovery
        const context = {
          role,
          language,
          repo_size: repoSize
        };
        
        // Discover optimal model
        const optimalModel = await modelResearcher.getOptimalModelForContext(context);
        
        logger.info(`✅ Researcher Agent discovered optimal model for ${agent}/${language}: ${optimalModel}`);
        
        // Store the discovered configuration for future use
        // Get proper fallback from ModelConfigResolver
        const fallbackConfig = await this.modelConfigResolver.getModelConfiguration(role, language, repoSize);

        const { error: insertError } = await this.supabase
          .from('model_configurations')
          .insert({
            role,
            language,
            repository_size: repoSize,
            primary_model: optimalModel,
            fallback_model: fallbackConfig.fallback_model, // Use ModelConfigResolver fallback
            temperature: 0.3,
            max_tokens: 4000,
            last_updated: new Date().toISOString(),
            discovered_by: 'ResearcherAgent',
            auto_discovered: true
          });
        
        if (insertError) {
          logger.warn(`Failed to store discovered model configuration: ${insertError.message}`);
        } else {
          logger.info(`✅ Stored new model configuration for future use`);
        }
        
        return optimalModel;
        
      } catch (researchError: any) {
        logger.error(`Researcher Agent failed to discover model:`, researchError);

        // BUG-077 FIX: Use ModelConfigResolver emergency fallback instead of hardcoded values
        try {
          const emergencyConfig = await this.modelConfigResolver.getModelConfiguration(role, language, 'medium');
          logger.warn(`Using emergency fallback model for ${agent}: ${emergencyConfig.primary_model}`);
          return emergencyConfig.primary_model;
        } catch (emergencyError: any) {
          logger.error(`Emergency fallback failed:`, emergencyError);
          // If even emergency fallback fails, throw - don't use hardcoded models
          throw new Error(`Unable to get model configuration for ${agent}/${language}. All fallback methods failed.`);
        }
      }
    } catch (error: any) {
      logger.error(`Failed to get model for ${agent}:`, error);
      logger.error('Full error stack:', error.stack);

      // BUG-077 FIX: Throw instead of returning hardcoded model
      // The caller should handle this error appropriately
      throw new Error(`Critical failure: Unable to determine model for ${agent}. All configuration methods failed.`);
    }
  }

  private normalizeSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' {
    const lower = severity?.toLowerCase() || '';
    if (lower.includes('critical') || lower.includes('blocker')) return 'critical';
    if (lower.includes('high') || lower.includes('major')) return 'high';
    if (lower.includes('medium') || lower.includes('moderate')) return 'medium';
    return 'low';
  }

  private extractSeverityFromLine(line: string): 'critical' | 'high' | 'medium' | 'low' {
    const lower = line.toLowerCase();
    if (lower.includes('critical') || lower.includes('blocker')) return 'critical';
    if (lower.includes('high') || lower.includes('error')) return 'high';
    if (lower.includes('medium') || lower.includes('warning')) return 'medium';
    return 'low';
  }

  private mapAgentToRole(agent: string): string {
    const mapping: Record<string, string> = {
      // Old names (for backward compatibility)
      'SecurityAnalyzer': 'security',
      'QualityAnalyzer': 'code_quality',
      'PerformanceAnalyzer': 'performance',
      'DependencyAnalyzer': 'dependency',
      'ArchitectureAnalyzer': 'architecture',
      // New V9 agent names
      'SecurityAgent': 'security',
      'CodeQualityAgent': 'code_quality',
      'PerformanceAgent': 'performance',
      'DependencyAgent': 'dependency',
      'ArchitectureAgent': 'architecture'
    };
    return mapping[agent] || 'code_quality';
  }

  private mapAgentToCategory(agent: string): string {
    const mapping: Record<string, string> = {
      'SecurityAnalyzer': 'security',
      'QualityAnalyzer': 'code-quality',
      'PerformanceAnalyzer': 'performance',
      'DependencyAnalyzer': 'dependencies',
      'ArchitectureAnalyzer': 'architecture'
    };
    return mapping[agent] || 'general';
  }

  private logIssueSummary(issues: ProcessedIssue[]): void {
    const bySeverity: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const byTool: Record<string, number> = {};

    for (const issue of issues) {
      bySeverity[issue.severity] = (bySeverity[issue.severity] || 0) + 1;
      byCategory[issue.category] = (byCategory[issue.category] || 0) + 1;
      byTool[issue.tool] = (byTool[issue.tool] || 0) + 1;
    }

    logger.info('\n📊 Issue Summary:');
    logger.info('  By Severity:', bySeverity);
    logger.info('  By Category:', byCategory);
    logger.info('  By Tool:', byTool);
  }

  // ==========================================================================
  // SECURITY SCANNERS (Phase 1 Integration - Session 58)
  // ==========================================================================

  /**
   * Run all security scanners (secrets, IaC, containers)
   * These run in parallel for performance
   */
  async runSecurityScans(
    repoPath: string,
    options?: {
      enableSecrets?: boolean;
      enableIaC?: boolean;
      enableContainer?: boolean;
      changedFiles?: string[];
    }
  ): Promise<ProcessedIssue[]> {
    const opts = {
      enableSecrets: true,
      enableIaC: true,
      enableContainer: true,
      ...options
    };

    logger.info('🔐 Starting Security Scans (Phase 1 Tools)...');
    const allIssues: ProcessedIssue[] = [];

    // Build scan promises based on what's enabled
    const scanPromises: Promise<ProcessedIssue[]>[] = [];

    if (opts.enableSecrets) {
      scanPromises.push(this.runSecretScan(repoPath));
    }
    if (opts.enableIaC) {
      scanPromises.push(this.runIaCScan(repoPath));
    }
    if (opts.enableContainer) {
      scanPromises.push(this.runContainerScan(repoPath));
    }

    // Run all enabled scans in parallel
    const results = await Promise.allSettled(scanPromises);

    for (const result of results) {
      if (result.status === 'fulfilled') {
        allIssues.push(...result.value);
      } else {
        logger.error(`Security scan failed: ${result.reason}`);
      }
    }

    logger.info(`🔐 Security scans complete: ${allIssues.length} issues found`);
    return allIssues;
  }

  /**
   * Run secret detection (Gitleaks + TruffleHog)
   */
  private async runSecretScan(repoPath: string): Promise<ProcessedIssue[]> {
    logger.info('  🔑 Running secret detection (Gitleaks + TruffleHog)...');

    try {
      const result = await this.secretScanner.runAll(repoPath);
      const issues: ProcessedIssue[] = [];

      for (const secret of result.issues) {
        issues.push({
          id: `secret-${secret.tool}-${secret.file}-${secret.line}-${Date.now()}`,
          title: `Secret Detected: ${secret.secretType}`,
          severity: secret.severity === 'critical' ? 'critical' :
                   secret.severity === 'high' ? 'high' :
                   secret.severity === 'medium' ? 'medium' : 'low',
          category: 'secrets',
          file: secret.file,
          line: secret.line,
          column: secret.column,
          tool: secret.tool,
          agent: 'SecurityAgent',
          confidence: secret.verified ? 0.99 : 0.85,
          description: `${secret.description}${secret.verified ? ' (VERIFIED ACTIVE)' : ''}`,
          suggestion: `1. Rotate this credential immediately
2. Remove from code and use environment variables
3. Add to .gitignore if configuration file
4. Scan git history for exposure`,
          rawToolOutput: JSON.stringify(secret, null, 2)
        });
      }

      logger.info(`    ✅ Found ${issues.length} secrets (${result.summary.verified} verified active)`);
      return issues;

    } catch (error: any) {
      logger.error(`    ❌ Secret scan failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Run IaC security scan (Checkov + Trivy IaC)
   */
  private async runIaCScan(repoPath: string): Promise<ProcessedIssue[]> {
    logger.info('  🏗️ Running IaC security scan (Checkov + Trivy)...');

    try {
      const result = await this.iacScanner.runAll(repoPath);
      const issues: ProcessedIssue[] = [];

      for (const iacIssue of result.issues) {
        issues.push({
          id: `iac-${iacIssue.tool}-${iacIssue.file}-${iacIssue.line}-${Date.now()}`,
          title: `IaC Misconfiguration: ${iacIssue.checkId}`,
          severity: iacIssue.severity === 'critical' ? 'critical' :
                   iacIssue.severity === 'high' ? 'high' :
                   iacIssue.severity === 'medium' ? 'medium' : 'low',
          category: 'iac_security',
          file: iacIssue.file,
          line: iacIssue.line,
          tool: iacIssue.tool,
          agent: 'SecurityAgent',
          confidence: 0.85,
          description: iacIssue.description,
          suggestion: iacIssue.guideline || `Review ${iacIssue.checkId} documentation for remediation`,
          rawToolOutput: JSON.stringify(iacIssue, null, 2)
        });
      }

      logger.info(`    ✅ Found ${issues.length} IaC issues`);
      return issues;

    } catch (error: any) {
      logger.error(`    ❌ IaC scan failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Run container security scan (Trivy + Grype for Dockerfiles)
   */
  private async runContainerScan(repoPath: string): Promise<ProcessedIssue[]> {
    logger.info('  🐳 Running container security scan (Trivy + Grype)...');

    try {
      const result = await this.containerScanner.scanRepository(repoPath);
      const issues: ProcessedIssue[] = [];

      // Process Dockerfile issues
      for (const dockerIssue of result.dockerfileIssues) {
        issues.push({
          id: `dockerfile-${dockerIssue.rule}-${dockerIssue.file}-${dockerIssue.line}-${Date.now()}`,
          title: `Dockerfile Issue: ${dockerIssue.rule}`,
          severity: dockerIssue.severity === 'critical' ? 'critical' :
                   dockerIssue.severity === 'high' ? 'high' :
                   dockerIssue.severity === 'medium' ? 'medium' : 'low',
          category: 'container_security',
          file: dockerIssue.file,
          line: dockerIssue.line,
          tool: 'trivy',
          agent: 'SecurityAgent',
          confidence: 0.80,
          description: dockerIssue.message,
          suggestion: dockerIssue.description || 'Review Dockerfile best practices',
          rawToolOutput: JSON.stringify(dockerIssue, null, 2)
        });
      }

      // Process dependency vulnerabilities in container context
      for (const vuln of result.vulnerabilities) {
        issues.push({
          id: `container-vuln-${vuln.vulnerabilityId}-${vuln.pkgName}-${Date.now()}`,
          title: `Container Vulnerability: ${vuln.vulnerabilityId} in ${vuln.pkgName}`,
          severity: vuln.severity === 'critical' ? 'critical' :
                   vuln.severity === 'high' ? 'high' :
                   vuln.severity === 'medium' ? 'medium' : 'low',
          category: 'container_security',
          file: 'Dockerfile',  // Container-level issue
          line: 1,
          tool: vuln.tool,
          agent: 'DependencyAgent',
          confidence: vuln.cvss ? 0.95 : 0.80,
          description: `${vuln.title}\n\nPackage: ${vuln.pkgName} ${vuln.installedVersion}${vuln.fixedVersion ? `\nFixed in: ${vuln.fixedVersion}` : '\nNo fix available'}`,
          suggestion: vuln.fixedVersion
            ? `Update ${vuln.pkgName} to version ${vuln.fixedVersion}`
            : `Consider replacing ${vuln.pkgName} with an alternative package`,
          rawToolOutput: JSON.stringify(vuln, null, 2)
        });
      }

      logger.info(`    ✅ Found ${result.dockerfileIssues.length} Dockerfile issues, ${result.vulnerabilities.length} vulnerabilities`);
      return issues;

    } catch (error: any) {
      logger.error(`    ❌ Container scan failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Check which security tools are available on the system
   */
  async checkSecurityToolsAvailability(): Promise<{
    gitleaks: boolean;
    trufflehog: boolean;
    checkov: boolean;
    trivy: boolean;
    grype: boolean;
  }> {
    const checkTool = async (cmd: string): Promise<boolean> => {
      try {
        await execAsync(cmd, { timeout: 5000 });
        return true;
      } catch {
        return false;
      }
    };

    const [gitleaks, trufflehog, checkov, trivy, grype] = await Promise.all([
      checkTool('gitleaks version'),
      checkTool('trufflehog --version'),
      checkTool('checkov --version'),
      checkTool('trivy version'),
      checkTool('grype version')
    ]);

    const availability = { gitleaks, trufflehog, checkov, trivy, grype };

    logger.info('🔧 Security Tools Availability:');
    logger.info(`   Gitleaks: ${gitleaks ? '✅' : '❌'}`);
    logger.info(`   TruffleHog: ${trufflehog ? '✅' : '❌'}`);
    logger.info(`   Checkov: ${checkov ? '✅' : '❌'}`);
    logger.info(`   Trivy: ${trivy ? '✅' : '❌'}`);
    logger.info(`   Grype: ${grype ? '✅' : '❌'}`);

    return availability;
  }
}