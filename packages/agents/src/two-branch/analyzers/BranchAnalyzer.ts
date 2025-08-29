/**
 * Branch Analyzer for Two-Branch Analysis
 * 
 * Runs analysis tools on a single branch
 * Uses existing MCP tools integration
 * Aggregates results from multiple tools
 */

import { RepositoryInfo } from '../core/RepositoryManager';
import { 
  BranchAnalysisResult, 
  ToolIssue, 
  BranchMetrics,
  ToolName,
  IssueSeverity,
  IssueCategory 
} from '../types';
import { logger } from '../utils/logger';
// Use MCP Tool Adapter to bridge with mcp-hybrid
import { MCPToolAdapter } from '../adapters/MCP-Tool-Adapter';
import { IndividualToolResponse } from '../types/mcp-types';

export interface AnalysisOptions {
  tools?: ToolName[];        // Specific tools to run (default: all)
  includeMetrics?: boolean;  // Calculate metrics (default: true)
  timeout?: number;          // Timeout per tool in ms
  parallel?: boolean;        // Run tools in parallel (default: true)
  skipOnError?: boolean;     // Continue if a tool fails (default: true)
  useSpecializedAgents?: boolean; // Use specialized agents for analysis (default: true)
}

// Interface for specialized agents
export interface SpecializedAgent {
  category: IssueCategory;
  analyzeToolResults(results: IndividualToolResponse[]): Promise<ToolIssue[]>;
  getRelevantTools(): ToolName[];
}

export class BranchAnalyzer {
  private toolExecutor: MCPToolAdapter;
  private specializedAgents: Map<IssueCategory, SpecializedAgent> = new Map();
  private defaultTools: ToolName[] = [
    'semgrep',
    'eslint', 
    'npm-audit',
    'gitleaks',
    'trufflehog',
    'dependency-check',
    'bandit',
    'safety',
    'cargo-audit',
    'gosec',
    'checkov',
    'sonarjs'
  ];
  
  constructor(
    toolExecutor?: MCPToolAdapter,
    specializedAgents?: SpecializedAgent[]
  ) {
    this.toolExecutor = toolExecutor || new MCPToolAdapter();
    
    // Register specialized agents if provided
    if (specializedAgents) {
      for (const agent of specializedAgents) {
        this.specializedAgents.set(agent.category, agent);
      }
    }
  }
  
  /**
   * Register a specialized agent for a category
   */
  registerSpecializedAgent(agent: SpecializedAgent): void {
    this.specializedAgents.set(agent.category, agent);
    logger.info(`Registered specialized agent for ${agent.category}`);
  }
  
  /**
   * Analyze a single branch
   */
  async analyzeBranch(
    repo: RepositoryInfo,
    options: AnalysisOptions = {}
  ): Promise<BranchAnalysisResult> {
    const startTime = Date.now();
    const tools = options.tools || this.defaultTools;
    
    logger.info(`🔬 Analyzing branch: ${repo.prBranch || repo.mainBranch}`);
    logger.info(`   Repository: ${repo.owner}/${repo.name}`);
    logger.info(`   Path: ${repo.localPath}`);
    logger.info(`   Tools: ${tools.length} selected`);
    
    try {
      // Get commit hash for traceability
      const commitHash = await this.getCommitHash(repo.localPath);
      
      // Count files for metrics
      const fileCount = await this.countFiles(repo.localPath);
      
      // Run tools
      const toolResults = options.parallel !== false
        ? await this.runToolsInParallel(repo, tools, options)
        : await this.runToolsSequentially(repo, tools, options);
      
      // Convert tool results to issues
      const issues = options.useSpecializedAgents !== false && this.specializedAgents.size > 0
        ? await this.analyzeWithSpecializedAgents(toolResults)
        : await this.convertToIssues(toolResults);
      
      // Calculate metrics
      const metrics = options.includeMetrics !== false
        ? this.calculateMetrics(issues, fileCount, Date.now() - startTime)
        : this.getDefaultMetrics();
      
      // Log summary
      logger.info(`✅ Branch analysis complete`);
      logger.info(`   Issues found: ${issues.length}`);
      logger.info(`   Critical: ${metrics.severityDistribution.critical}`);
      logger.info(`   High: ${metrics.severityDistribution.high}`);
      logger.info(`   Duration: ${metrics.duration}ms`);
      
      return {
        branch: repo.prBranch || repo.mainBranch,
        commitHash,
        repositoryUrl: repo.url,
        timestamp: new Date(),
        tools: tools.length,
        files: fileCount,
        issues,
        metrics,
        metadata: {
          owner: repo.owner,
          repo: repo.name,
          prNumber: repo.prNumber
        }
      };
    } catch (error) {
      logger.error(`Branch analysis failed: ${error}`);
      throw error;
    }
  }
  
  /**
   * Run tools in parallel using MCP integration
   */
  private async runToolsInParallel(
    repo: RepositoryInfo,
    tools: ToolName[],
    options: AnalysisOptions
  ): Promise<IndividualToolResponse[]> {
    logger.info(`⚡ Running ${tools.length} tools in parallel...`);
    
    try {
      // Use existing ParallelToolExecutor
      const results = await this.toolExecutor.runTools(
        repo.localPath,
        tools as any[], // Type conversion for MCP tools
        {
          timeout: options.timeout,
          continueOnError: options.skipOnError !== false
        }
      );
      
      return results;
    } catch (error) {
      logger.error(`Parallel tool execution failed: ${error}`);
      if (!options.skipOnError) throw error;
      return [];
    }
  }
  
  /**
   * Run tools sequentially (fallback or debugging)
   */
  private async runToolsSequentially(
    repo: RepositoryInfo,
    tools: ToolName[],
    options: AnalysisOptions
  ): Promise<IndividualToolResponse[]> {
    logger.info(`📝 Running ${tools.length} tools sequentially...`);
    const results: IndividualToolResponse[] = [];
    
    for (const tool of tools) {
      try {
        logger.info(`   Running ${tool}...`);
        const result = await this.toolExecutor.runTool(
          tool as any,
          repo.localPath,
          { timeout: options.timeout }
        );
        results.push(result);
      } catch (error) {
        logger.warn(`   Tool ${tool} failed: ${error}`);
        if (!options.skipOnError) throw error;
      }
    }
    
    return results;
  }
  
  /**
   * Analyze results using specialized agents
   */
  private async analyzeWithSpecializedAgents(
    toolResults: IndividualToolResponse[]
  ): Promise<ToolIssue[]> {
    logger.info(`🤖 Using specialized agents for analysis...`);
    const allIssues: ToolIssue[] = [];
    
    // Group tools by category based on registered agents
    const toolsByCategory = new Map<IssueCategory, IndividualToolResponse[]>();
    
    for (const agent of this.specializedAgents.values()) {
      const relevantTools = agent.getRelevantTools();
      const relevantResults = toolResults.filter(r => 
        relevantTools.includes(r.tool as ToolName)
      );
      
      if (relevantResults.length > 0) {
        toolsByCategory.set(agent.category, relevantResults);
      }
    }
    
    // Process each category with its specialized agent
    for (const [category, results] of toolsByCategory) {
      const agent = this.specializedAgents.get(category);
      if (agent) {
        try {
          logger.info(`   Processing ${category} with specialized agent (${results.length} tools)`);
          const categoryIssues = await agent.analyzeToolResults(results);
          allIssues.push(...categoryIssues);
        } catch (error) {
          logger.error(`   Specialized agent for ${category} failed: ${error}`);
          // Fallback to basic conversion
          allIssues.push(...await this.convertToIssues(results));
        }
      }
    }
    
    // Process any remaining tools not handled by specialized agents
    const handledTools = new Set<string>();
    for (const results of toolsByCategory.values()) {
      results.forEach(r => handledTools.add(r.tool));
    }
    
    const unhandledResults = toolResults.filter(r => !handledTools.has(r.tool));
    if (unhandledResults.length > 0) {
      logger.info(`   Processing ${unhandledResults.length} tools with basic converter`);
      allIssues.push(...await this.convertToIssues(unhandledResults));
    }
    
    logger.info(`   Total issues from specialized analysis: ${allIssues.length}`);
    return allIssues;
  }
  
  /**
   * Convert MCP tool results to standardized issues (fallback/basic conversion)
   */
  private async convertToIssues(toolResults: IndividualToolResponse[]): Promise<ToolIssue[]> {
    const issues: ToolIssue[] = [];
    let issueId = 1;
    
    for (const toolResult of toolResults) {
      if (!toolResult.success || !toolResult.results) continue;
      
      // Handle different tool output formats
      const toolIssues = this.parseToolOutput(toolResult);
      
      for (const rawIssue of toolIssues) {
        issues.push({
          id: `issue-${issueId++}`,
          tool: toolResult.tool as ToolName,
          ruleId: rawIssue.ruleId || rawIssue.rule || 'unknown',
          category: this.categorizeIssue(rawIssue),
          file: rawIssue.file || rawIssue.path || 'unknown',
          startLine: rawIssue.line || rawIssue.startLine || 0,
          endLine: rawIssue.endLine || rawIssue.line || 0,
          startColumn: rawIssue.column || rawIssue.startColumn,
          endColumn: rawIssue.endColumn || rawIssue.column,
          severity: this.normalizeSeverity(rawIssue.severity || rawIssue.level),
          message: rawIssue.message || rawIssue.description || '',
          details: rawIssue.details,
          codeSnippet: rawIssue.snippet || rawIssue.codeSnippet,
          suggestion: rawIssue.suggestion || rawIssue.fix,
          documentation: rawIssue.documentation || rawIssue.url,
          tags: this.extractTags(rawIssue),
          metadata: {
            confidence: rawIssue.confidence,
            likelihood: rawIssue.likelihood,
            impact: rawIssue.impact
          }
        });
      }
    }
    
    return issues;
  }
  
  /**
   * Parse tool-specific output format
   */
  private parseToolOutput(toolResult: IndividualToolResponse): any[] {
    const { tool, results } = toolResult;
    
    // Handle different tool output structures
    if (Array.isArray(results)) {
      return results;
    }
    
    if (results.vulnerabilities) {
      return results.vulnerabilities;
    }
    
    if (results.issues) {
      return results.issues;
    }
    
    if (results.findings) {
      return results.findings;
    }
    
    if (results.errors) {
      return results.errors;
    }
    
    // Try to extract from nested structure
    if (typeof results === 'object') {
      const keys = Object.keys(results);
      for (const key of keys) {
        if (Array.isArray(results[key])) {
          return results[key];
        }
      }
    }
    
    return [];
  }
  
  /**
   * Categorize issue based on tool and content
   */
  private categorizeIssue(issue: any): IssueCategory {
    const message = (issue.message || issue.description || '').toLowerCase();
    const ruleId = (issue.ruleId || issue.rule || '').toLowerCase();
    
    // Security indicators
    if (ruleId.includes('sec') || 
        message.includes('vulnerab') ||
        message.includes('injection') ||
        message.includes('xss') ||
        message.includes('csrf')) {
      return 'security';
    }
    
    // Performance indicators
    if (ruleId.includes('perf') ||
        message.includes('performance') ||
        message.includes('slow') ||
        message.includes('optimization')) {
      return 'performance';
    }
    
    // Architecture indicators
    if (ruleId.includes('complex') ||
        message.includes('architect') ||
        message.includes('structure')) {
      return 'architecture';
    }
    
    // Dependency indicators
    if (ruleId.includes('dep') ||
        message.includes('dependency') ||
        message.includes('package') ||
        message.includes('version')) {
      return 'dependency';
    }
    
    // Default to quality
    return 'quality';
  }
  
  /**
   * Normalize severity levels across different tools
   */
  private normalizeSeverity(severity: string | undefined): IssueSeverity {
    if (!severity) return 'medium';
    
    const normalized = severity.toLowerCase();
    
    // Map various severity naming conventions
    if (normalized.includes('critical') || normalized.includes('blocker')) {
      return 'critical';
    }
    if (normalized.includes('high') || normalized.includes('error')) {
      return 'high';
    }
    if (normalized.includes('medium') || normalized.includes('warning')) {
      return 'medium';
    }
    if (normalized.includes('low') || normalized.includes('minor')) {
      return 'low';
    }
    if (normalized.includes('info') || normalized.includes('trivial')) {
      return 'info';
    }
    
    return 'medium';
  }
  
  /**
   * Extract tags from issue for categorization
   */
  private extractTags(issue: any): string[] {
    const tags: string[] = [];
    
    // Add tool-specific tags
    if (issue.tags) {
      tags.push(...(Array.isArray(issue.tags) ? issue.tags : [issue.tags]));
    }
    
    // Add CWE tags
    if (issue.cwe) {
      tags.push(`CWE-${issue.cwe}`);
    }
    
    // Add OWASP tags
    if (issue.owasp) {
      tags.push(`OWASP-${issue.owasp}`);
    }
    
    // Add language tags
    if (issue.language) {
      tags.push(issue.language);
    }
    
    return tags;
  }
  
  /**
   * Calculate metrics for the analysis
   */
  private calculateMetrics(
    issues: ToolIssue[],
    fileCount: number,
    duration: number
  ): BranchMetrics {
    const severityDistribution = {
      critical: issues.filter(i => i.severity === 'critical').length,
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length,
      info: issues.filter(i => i.severity === 'info').length
    };
    
    const categoryDistribution = {
      security: issues.filter(i => i.category === 'security').length,
      performance: issues.filter(i => i.category === 'performance').length,
      quality: issues.filter(i => i.category === 'quality').length,
      architecture: issues.filter(i => i.category === 'architecture').length,
      dependency: issues.filter(i => i.category === 'dependency').length
    };
    
    // Calculate byTool distribution
    const byTool: Record<string, number> = {};
    for (const issue of issues) {
      const toolName = issue.tool as string;
      byTool[toolName] = (byTool[toolName] || 0) + 1;
    }
    
    const issuesPerFile = fileCount > 0 ? issues.length / fileCount : 0;
    const criticalityScore = this.calculateCriticalityScore(severityDistribution);
    
    return {
      totalIssues: issues.length,
      bySeverity: severityDistribution,  // Add alias
      byCategory: categoryDistribution as Record<IssueCategory, number>,  // Add alias
      byTool,  // Add missing property
      severityDistribution,
      categoryDistribution,
      issuesPerFile,
      criticalityScore,
      duration,
      analyzedFiles: fileCount
    };
  }
  
  /**
   * Calculate criticality score (0-100)
   */
  private calculateCriticalityScore(distribution: any): number {
    const weights = {
      critical: 10,
      high: 5,
      medium: 2,
      low: 0.5,
      info: 0.1
    };
    
    let score = 0;
    for (const [severity, count] of Object.entries(distribution)) {
      score += (count as number) * (weights[severity as keyof typeof weights] || 0);
    }
    
    // Normalize to 0-100 scale (assuming max reasonable score of 50)
    return Math.min(100, Math.round((score / 50) * 100));
  }
  
  /**
   * Get default metrics when calculation is skipped
   */
  private getDefaultMetrics(): BranchMetrics {
    const severityDistribution = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0
    };
    
    const categoryDistribution = {
      security: 0,
      performance: 0,
      quality: 0,
      architecture: 0,
      dependency: 0
    };
    
    return {
      totalIssues: 0,
      bySeverity: severityDistribution,
      byCategory: categoryDistribution as Record<IssueCategory, number>,
      byTool: {},
      severityDistribution,
      categoryDistribution,
      issuesPerFile: 0,
      criticalityScore: 0,
      duration: 0,
      analyzedFiles: 0
    };
  }
  
  /**
   * Get commit hash for the repository
   */
  private async getCommitHash(repoPath: string): Promise<string> {
    try {
      const { execSync } = await import('child_process');
      const hash = execSync('git rev-parse HEAD', { 
        cwd: repoPath,
        encoding: 'utf8' 
      }).trim();
      return hash;
    } catch {
      return 'unknown';
    }
  }
  
  /**
   * Count files in repository (excluding common non-code directories)
   */
  private async countFiles(repoPath: string): Promise<number> {
    try {
      const { execSync } = await import('child_process');
      // Count files, excluding common non-code directories
      const count = execSync(
        `find . -type f -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" -o -name "*.py" -o -name "*.java" -o -name "*.go" -o -name "*.rb" -o -name "*.php" -o -name "*.cs" -o -name "*.cpp" -o -name "*.c" -o -name "*.h" | grep -v node_modules | grep -v ".git" | wc -l`,
        { 
          cwd: repoPath,
          encoding: 'utf8',
          shell: '/bin/bash'
        }
      ).trim();
      return parseInt(count) || 0;
    } catch {
      return 0;
    }
  }
}

export default BranchAnalyzer;