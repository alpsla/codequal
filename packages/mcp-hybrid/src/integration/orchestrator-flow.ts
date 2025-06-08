/**
 * MCP Hybrid Integration for CodeQual Orchestrator Flow
 * Enhances each agent role with appropriate tools
 */

import { 
  Tool, 
  ToolResult, 
  ConsolidatedToolResults,
  AnalysisContext,
  AgentRole 
} from '../core/interfaces';
import { toolRegistry } from '../core/registry';
import { toolManager } from '../core/tool-manager';
import { agentToolService } from './tool-aware-agent';
import { logging } from '@codequal/core';

/**
 * Orchestrator flow with tool integration
 */
export interface OrchestratorFlow {
  prUrl: string;
  repoUrl?: string;
  vectorDBReport?: any;
  specializedContexts?: Map<AgentRole, any>;
  toolResults?: Map<AgentRole, ConsolidatedToolResults>;
}

/**
 * Tool-enhanced orchestrator service
 * Manages the complete flow from PR URL to final report
 */
export class ToolEnhancedOrchestrator {
  private logger = logging.createLogger('ToolEnhancedOrchestrator');
  
  /**
   * Main orchestration flow with tool support
   */
  async orchestrateAnalysis(prUrl: string, userId: string): Promise<any> {
    const flow: OrchestratorFlow = { prUrl };
    
    try {
      // Step 1: Orchestrator analyzes PR with tools
      this.logger.info('Step 1: Orchestrator analyzing PR URL');
      const prAnalysis = await this.analyzeWithOrchestratorTools(prUrl, userId);
      flow.repoUrl = prAnalysis.repoUrl;
      
      // Step 2: Check Vector DB for existing repo report
      this.logger.info('Step 2: Checking Vector DB for repo report');
      const vectorDBReport = await this.checkVectorDBForReport(flow.repoUrl!);
      
      if (vectorDBReport) {
        flow.vectorDBReport = vectorDBReport;
        this.logger.info('Found existing repo report in Vector DB');
      } else {
        // Step 3: Generate repo report via DeepWiki
        this.logger.info('Step 3: Generating repo report with DeepWiki');
        const deepWikiReport = await this.generateDeepWikiReport(flow.repoUrl!);
        
        // Store in Vector DB
        await this.storeReportInVectorDB(flow.repoUrl!, deepWikiReport);
        flow.vectorDBReport = deepWikiReport;
      }
      
      // Step 4: Extract specialized contexts for each agent
      this.logger.info('Step 4: Extracting specialized contexts');
      flow.specializedContexts = this.extractSpecializedContexts(flow.vectorDBReport);
      
      // Step 5: Run specialized agents with tools and contexts
      this.logger.info('Step 5: Running specialized agents with tools');
      const specializedResults = await this.runSpecializedAgentsWithTools(
        prAnalysis,
        flow.specializedContexts,
        userId
      );
      
      // Step 6: Run Educational and Reporting agents for final output
      this.logger.info('Step 6: Creating final report');
      const finalReport = await this.createFinalReport(
        specializedResults,
        flow.vectorDBReport,
        userId
      );
      
      return finalReport;
    } catch (error) {
      this.logger.error('Orchestration failed:', error as Error);
      throw error;
    }
  }
  
  /**
   * Orchestrator agent analyzes PR with its tools
   * Determines language, complexity, and generates appropriate requests
   */
  private async analyzeWithOrchestratorTools(
    prUrl: string, 
    userId: string
  ): Promise<any> {
    this.logger.info('Orchestrator analyzing PR to determine language and complexity');
    
    // Step 1: Use Git MCP to fetch PR data
    const gitMCPResult = await this.fetchPRWithGitMCP(prUrl);
    
    // Step 2: Analyze PR complexity
    const complexity = this.analyzePRComplexity(gitMCPResult);
    
    // Step 3: Use Context MCP for organizational context
    const orgContext = await this.getOrganizationalContext(userId);
    
    // Step 4: Determine agent requirements based on analysis
    const agentRequirements = this.determineAgentRequirements(
      complexity,
      orgContext
    );
    
    // Step 5: Generate appropriate DeepWiki request
    const deepWikiRequest = this.generateDeepWikiRequest(
      complexity,
      agentRequirements
    );
    
    return {
      prUrl,
      repoUrl: gitMCPResult.repoUrl,
      prData: gitMCPResult.prData,
      complexity,
      agentRequirements,
      deepWikiRequest,
      orchestratorAnalysis: {
        language: complexity.primaryLanguage,
        frameworks: complexity.frameworks,
        fileCount: complexity.fileCount,
        estimatedComplexity: complexity.score
      }
    };
  }
  
  /**
   * Analyze PR complexity based on files and changes
   */
  private analyzePRComplexity(gitMCPResult: any) // eslint-disable-line @typescript-eslint/no-explicit-any: any {
    const files = gitMCPResult.prData.files || [];
    
    // Language detection
    const languageCounts = new Map<string, number>();
    const frameworks = new Set<string>();
    
    files.forEach((file: any) // eslint-disable-line @typescript-eslint/no-explicit-any => {
      const ext = file.path.split('.').pop()?.toLowerCase();
      const lang = this.getLanguageFromExtension(ext);
      if (lang) {
        languageCounts.set(lang, (languageCounts.get(lang) || 0) + 1);
      }
      
      // Framework detection from file content
      this.detectFrameworks(file, frameworks);
    });
    
    // Determine primary language
    const primaryLanguage = Array.from(languageCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';
    
    // Calculate complexity score
    const complexityScore = this.calculateComplexityScore(files);
    
    return {
      primaryLanguage,
      languages: Array.from(languageCounts.keys()),
      frameworks: Array.from(frameworks),
      fileCount: files.length,
      linesChanged: files.reduce((sum: number, f: any) => sum + (f.additions || 0) + (f.deletions || 0), 0),
      score: complexityScore,
      recommendation: complexityScore > 0.7 ? 'detailed-analysis' : 'standard-analysis'
    };
  }
  
  /**
   * Generate DeepWiki request based on complexity
   */
  private generateDeepWikiRequest(complexity: any, agentRequirements: any): any { // eslint-disable-line @typescript-eslint/no-explicit-any
    return {
      analysisDepth: complexity.score > 0.7 ? 'comprehensive' : 'standard',
      focusAreas: {
        security: agentRequirements.security.priority,
        codeQuality: agentRequirements.codeQuality.priority,
        architecture: agentRequirements.architecture.priority,
        performance: agentRequirements.performance.priority,
        dependencies: agentRequirements.dependencies.priority
      },
      contextRequirements: {
        includeHistoricalData: complexity.score > 0.5,
        includeSimilarProjects: true,
        includeTeamPatterns: true
      },
      language: complexity.primaryLanguage,
      frameworks: complexity.frameworks
    };
  }
  
  /**
   * Check Vector DB for existing repo report
   */
  private async checkVectorDBForReport(repoUrl: string): Promise<any | null> {
    // This would integrate with your Vector DB service
    // For now, return null to simulate not found
    this.logger.info(`Checking Vector DB for repo: ${repoUrl}`);
    
    // TODO: Integrate with actual Vector DB service
    // const report = await vectorDBService.getRepoReport(repoUrl);
    
    return null; // Simulate not found
  }
  
  /**
   * Generate repo report using DeepWiki
   */
  private async generateDeepWikiReport(repoUrl: string): Promise<any> {
    this.logger.info(`Generating DeepWiki report for: ${repoUrl}`);
    
    // TODO: Integrate with DeepWiki service
    // const report = await deepWikiService.generateRepoReport(repoUrl);
    
    // Simulated report structure
    return {
      repoUrl,
      summary: 'Repository analysis summary',
      architecture: {
        patterns: ['MVC', 'Microservices'],
        dependencies: ['express', 'react', 'postgresql']
      },
      security: {
        vulnerabilities: [],
        bestPractices: ['Uses HTTPS', 'Input validation']
      },
      codeQuality: {
        testCoverage: 75,
        lintingScore: 85
      },
      performance: {
        buildTime: '2.5 minutes',
        bundleSize: '1.2MB'
      },
      agentContexts: {
        security: { focus: 'authentication', priority: 'high' },
        codeQuality: { focus: 'maintainability', priority: 'medium' },
        architecture: { focus: 'scalability', priority: 'high' },
        performance: { focus: 'load time', priority: 'medium' }
      }
    };
  }
  
  /**
   * Store report in Vector DB
   */
  private async storeReportInVectorDB(repoUrl: string, report: any): Promise<void> { // eslint-disable-line @typescript-eslint/no-explicit-any
    this.logger.info(`Storing report in Vector DB for: ${repoUrl}`);
    
    // TODO: Integrate with Vector DB service
    // await vectorDBService.storeRepoReport(repoUrl, report);
  }
  
  /**
   * Extract specialized contexts for each agent from repo report
   */
  private extractSpecializedContexts(repoReport: any) // eslint-disable-line @typescript-eslint/no-explicit-any: Map<AgentRole, any> {
    const contexts = new Map<AgentRole, any>();
    
    // Extract specific context for each agent role
    const agentRoles: AgentRole[] = ['security', 'codeQuality', 'architecture', 'performance'];
    
    agentRoles.forEach((role) => {
      contexts.set(role, {
        repoSummary: repoReport.summary,
        roleSpecificData: repoReport[role] || {},
        focusAreas: repoReport.agentContexts?.[role] || {},
        generalContext: {
          patterns: repoReport.architecture?.patterns,
          dependencies: repoReport.architecture?.dependencies
        }
      });
    });
    
    return contexts;
  }
  
  /**
   * Run specialized agents with their tools and contexts
   */
  private async runSpecializedAgentsWithTools(
    prAnalysis: any,
    specializedContexts: Map<AgentRole, any>,
    userId: string
  ): Promise<Map<AgentRole, any>> { // eslint-disable-line @typescript-eslint/no-explicit-any
    const results = new Map<AgentRole, any>();
    // Include all specialized agents including dependencies
    const agentRoles: AgentRole[] = ['security', 'codeQuality', 'architecture', 'performance', 'dependency'];
    
    // Run all specialized agents in parallel
    const agentPromises = agentRoles.map(async role => {
      // Prepare context with agentContext from Vector DB
      const agentContext = specializedContexts.get(role) || {};
      const context = this.createAgentContext(
        role,
        prAnalysis.prData,
        agentContext,
        userId
      );
      
      // Step 1: Run tools FIRST for concrete findings
      this.logger.info(`Running tools for ${role} agent`);
      const toolResults = await agentToolService.runToolsForRole(role, context);
      
      // Step 2: Prepare data for agent with tool results and context
      const agentData = {
        prData: prAnalysis.prData,
        toolAnalysis: toolResults,
        agentContext: agentContext, // Includes dependencies and scoring
        focusAreas: agentContext.focusAreas || {},
        priorities: agentContext.priorities || {},
        orchestratorAnalysis: prAnalysis.orchestratorAnalysis
      };
      
      // Step 3: Agent analyzes based on tool results and context
      // In real implementation, this would call the actual agent
      const agentAnalysis = {
        role,
        // Agent creates compiled report, not raw findings
        report: this.createAgentReport(role, toolResults, agentContext),
        metadata: {
          toolsUsed: toolResults.toolsExecuted,
          toolFindingsProcessed: toolResults.findings.length,
          executionTime: toolResults.executionTime,
          contextUsed: agentContext
        }
      };
      
      return { role, analysis: agentAnalysis };
    });
    
    const agentResults = await Promise.all(agentPromises);
    
    // Store results
    agentResults.forEach(({ role, analysis }) => {
      results.set(role, analysis);
    });
    
    return results;
  }
  
  /**
   * Create final report using Educational and Reporting agents
   */
  private async createFinalReport(
    specializedResults: Map<AgentRole, any>,
    repoReport: any,
    userId: string
  ): Promise<any> { // eslint-disable-line @typescript-eslint/no-explicit-any
    // Prepare input for Educational agent
    const educationalContext = {
      specializedFindings: Array.from(specializedResults.values()),
      repoSummary: repoReport.summary,
      learningObjectives: this.extractLearningObjectives(specializedResults)
    };
    
    // Run Educational agent with its tools
    const educationalTools = await toolRegistry.getToolsForRole('educational');
    const eduContext = this.createAgentContext(
      'educational',
      educationalContext,
      {},
      userId
    );
    
    const eduToolResults = await agentToolService.runToolsForRole('educational', eduContext);
    
    // Educational agent creates learning materials
    const educationalOutput = {
      keyLearnings: this.extractKeyLearnings(eduToolResults),
      bestPractices: this.extractBestPractices(specializedResults),
      improvementSuggestions: this.extractImprovements(specializedResults)
    };
    
    // Prepare input for Reporting agent
    const reportingContext = {
      specializedResults: Array.from(specializedResults.values()),
      educationalOutput,
      repoReport
    };
    
    // Run Reporting agent with its tools
    const reportingTools = await toolRegistry.getToolsForRole('reporting');
    const repContext = this.createAgentContext(
      'reporting',
      reportingContext,
      {},
      userId
    );
    
    const repToolResults = await agentToolService.runToolsForRole('reporting', repContext);
    
    // Generate final report
    return {
      executive_summary: this.createExecutiveSummary(specializedResults),
      detailed_findings: this.formatDetailedFindings(specializedResults),
      educational_insights: educationalOutput,
      visualizations: this.createVisualizations(repToolResults),
      recommendations: this.prioritizeRecommendations(specializedResults),
      metrics: this.aggregateMetrics(specializedResults),
      tool_summary: this.createToolSummary(specializedResults)
    };
  }
  
  // Helper methods
  
  private extractPRNumber(prUrl: string): number {
    const match = prUrl.match(/\/pull\/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }
  
  private extractRepoName(prUrl: string): string {
    const match = prUrl.match(/\/([^\/]+)\/pull\//);
    return match ? match[1] : '';
  }
  
  private extractOwner(prUrl: string): string {
    const match = prUrl.match(/github\.com\/([^\/]+)\//);
    return match ? match[1] : '';
  }
  
  private extractRepoUrl(prUrl: string): string {
    const match = prUrl.match(/(https:\/\/github\.com\/[^\/]+\/[^\/]+)/);
    return match ? match[1] : '';
  }
  
  private extractPRDataFromTools(toolResults: ConsolidatedToolResults): any { // eslint-disable-line @typescript-eslint/no-explicit-any
    // Extract PR data from tool results
    // In real implementation, this would parse Git MCP results
    return {
      files: [],
      commits: [],
      title: 'PR Title',
      description: 'PR Description'
    };
  }
  
  private createAgentContext(
    role: AgentRole,
    prData: any,
    specializedContext: any,
    userId: string
  ): AnalysisContext {
    return {
      agentRole: role,
      pr: {
        prNumber: prData.prNumber || 0,
        title: prData.title || '',
        description: prData.description || '',
        baseBranch: prData.baseBranch || 'main',
        targetBranch: prData.targetBranch || 'feature',
        author: prData.author || '',
        files: prData.files || [],
        commits: prData.commits || []
      },
      repository: {
        name: prData.repoName || '',
        owner: prData.owner || '',
        languages: prData.languages || [],
        frameworks: prData.frameworks || []
      },
      userContext: {
        userId,
        permissions: ['read', 'write']
      },
      vectorDBConfig: specializedContext
    };
  }
  
  private simulateAgentAnalysis(role: AgentRole, toolResults: ConsolidatedToolResults): any { // eslint-disable-line @typescript-eslint/no-explicit-any
    // Simulate what the agent would analyze based on tool results
    return {
      issueCount: toolResults.findings.length,
      criticalFindings: toolResults.findings.filter(f => f.severity === 'critical').length,
      suggestions: `Based on ${toolResults.toolsExecuted.length} tools`,
      metrics: toolResults.metrics
    };
  }
  
  private extractLearningObjectives(results: Map<AgentRole, any>): string[] {
    const objectives: string[] = [];
    
    results.forEach((analysis, role) => {
      if (analysis.findings.criticalFindings > 0) {
        objectives.push(`Understand ${role} best practices`);
      }
    });
    
    return objectives;
  }
  
  private extractKeyLearnings(toolResults: ConsolidatedToolResults): string[] {
    // Extract educational insights from Context MCP and Knowledge Graph MCP
    return [
      'Key learning from analysis',
      'Best practices identified',
      'Common patterns found'
    ];
  }
  
  private extractBestPractices(results: Map<AgentRole, any>): string[] {
    return ['Best practice 1', 'Best practice 2'];
  }
  
  private extractImprovements(results: Map<AgentRole, any>): string[] {
    return ['Improvement suggestion 1', 'Improvement suggestion 2'];
  }
  
  private createExecutiveSummary(results: Map<AgentRole, any>): string {
    return 'Executive summary of the PR analysis';
  }
  
  private formatDetailedFindings(results: Map<AgentRole, any>): any { // eslint-disable-line @typescript-eslint/no-explicit-any
    const findings: any = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
    
    results.forEach((analysis, role) => {
      findings[role] = analysis.findings;
    });
    
    return findings;
  }
  
  private createVisualizations(toolResults: ConsolidatedToolResults): any { // eslint-disable-line @typescript-eslint/no-explicit-any
    // Chart.js MCP and Mermaid MCP would create actual visualizations
    return {
      charts: ['severity-distribution', 'metrics-comparison'],
      diagrams: ['architecture-flow', 'dependency-graph']
    };
  }
  
  private prioritizeRecommendations(results: Map<AgentRole, any>): any[] { // eslint-disable-line @typescript-eslint/no-explicit-any
    return [
      { priority: 'high', recommendation: 'Fix critical security issues' },
      { priority: 'medium', recommendation: 'Improve code coverage' }
    ];
  }
  
  private aggregateMetrics(results: Map<AgentRole, any>): any { // eslint-disable-line @typescript-eslint/no-explicit-any
    const metrics: any = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
    
    results.forEach((analysis, role) => {
      metrics[role] = analysis.toolResults?.metrics || {};
    });
    
    return metrics;
  }
  
  private createToolSummary(results: Map<AgentRole, any>): any { // eslint-disable-line @typescript-eslint/no-explicit-any
    const summary: any = { // eslint-disable-line @typescript-eslint/no-explicit-any
      totalToolsUsed: 0,
      toolsByRole: {}
    };
    
    results.forEach((analysis, role) => {
      const toolsUsed = analysis.metadata?.toolsUsed || [];
      summary.totalToolsUsed += toolsUsed.length;
      summary.toolsByRole[role] = toolsUsed;
    });
    
    return summary;
  }
  
  // Additional helper methods
  
  private async fetchPRWithGitMCP(prUrl: string): Promise<any> {
    // In real implementation, this would use Git MCP
    // For now, simulate the result
    return {
      repoUrl: this.extractRepoUrl(prUrl),
      prData: {
        number: this.extractPRNumber(prUrl),
        title: 'Sample PR',
        files: [],
        commits: []
      }
    };
  }
  
  private async getOrganizationalContext(userId: string): Promise<any> {
    // Would use Context MCP to get org context from Vector DB
    return {
      organization: 'acme-corp',
      team: 'engineering',
      preferences: {
        codeStandards: 'strict',
        securityLevel: 'high'
      }
    };
  }
  
  private determineAgentRequirements(complexity: any, orgContext: any): any { // eslint-disable-line @typescript-eslint/no-explicit-any
    // Determine priority and focus for each agent based on complexity
    return {
      security: {
        priority: orgContext.preferences?.securityLevel === 'high' ? 'critical' : 'high',
        focusAreas: ['authentication', 'input-validation']
      },
      codeQuality: {
        priority: complexity.fileCount > 20 ? 'high' : 'medium',
        focusAreas: ['maintainability', 'readability']
      },
      architecture: {
        priority: complexity.frameworks.length > 2 ? 'high' : 'medium',
        focusAreas: ['scalability', 'modularity']
      },
      performance: {
        priority: complexity.primaryLanguage === 'javascript' ? 'high' : 'medium',
        focusAreas: ['load-time', 'bundle-size']
      },
      dependencies: {
        priority: 'high', // Always high priority
        focusAreas: ['security', 'licensing', 'versions']
      }
    };
  }
  
  private getLanguageFromExtension(ext: string | undefined): string | null {
    if (!ext) return null;
    
    const langMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'go': 'go',
      'rs': 'rust',
      'rb': 'ruby',
      'php': 'php',
      'cs': 'csharp',
      'cpp': 'cpp',
      'c': 'c'
    };
    
    return langMap[ext] || null;
  }
  
  private detectFrameworks(file: any, frameworks: Set<string>): void { // eslint-disable-line @typescript-eslint/no-explicit-any
    const content = file.content || '';
    const filename = file.path || '';
    
    // React
    if (content.includes('import React') || content.includes('from "react"')) {
      frameworks.add('react');
    }
    
    // Vue
    if (filename.endsWith('.vue') || content.includes('Vue.')) {
      frameworks.add('vue');
    }
    
    // Angular
    if (content.includes('@angular/')) {
      frameworks.add('angular');
    }
    
    // Express
    if (content.includes('express()')) {
      frameworks.add('express');
    }
    
    // Django
    if (content.includes('django.') || filename === 'manage.py') {
      frameworks.add('django');
    }
    
    // Spring
    if (content.includes('@SpringBoot')) {
      frameworks.add('spring');
    }
  }
  
  private calculateComplexityScore(files: any[]): number { // eslint-disable-line @typescript-eslint/no-explicit-any
    // Calculate complexity based on various factors
    const fileCount = files.length;
    const totalLines = files.reduce((sum, f) => sum + (f.additions || 0) + (f.deletions || 0), 0);
    
    // Normalize scores
    const fileScore = Math.min(fileCount / 50, 1); // 50+ files = max complexity
    const lineScore = Math.min(totalLines / 1000, 1); // 1000+ lines = max complexity
    
    // Check for complex file types
    const hasComplexFiles = files.some(f => 
      f.path.includes('.config.') || 
      f.path.includes('package.json') ||
      f.path.includes('schema') ||
      f.path.includes('migration')
    );
    
    const complexityBonus = hasComplexFiles ? 0.2 : 0;
    
    // Weighted average
    return Math.min((fileScore * 0.4 + lineScore * 0.4 + complexityBonus), 1);
  }
  
  private createAgentReport(role: AgentRole, toolResults: ConsolidatedToolResults, context: any): any { // eslint-disable-line @typescript-eslint/no-explicit-any
    // Create a compiled report based on tool results and context
    // This simulates what the actual agent would produce
    return {
      summary: `${role} analysis based on ${toolResults.toolsExecuted.length} tools`,
      findingsCount: toolResults.findings.length,
      criticalIssues: toolResults.findings.filter(f => f.severity === 'critical').length,
      recommendations: this.generateRecommendations(role, toolResults),
      contextApplied: context,
      confidence: toolResults.toolsExecuted.length > 0 ? 'high' : 'low'
    };
  }
  
  private generateRecommendations(role: AgentRole, toolResults: ConsolidatedToolResults): string[] {
    const recommendations: string[] = [];
    
    if (role === 'security' && toolResults.findings.some(f => f.severity === 'critical')) {
      recommendations.push('Address critical security vulnerabilities immediately');
    }
    
    if (role === 'codeQuality' && toolResults.metrics.fixableIssues > 0) {
      recommendations.push(`Auto-fix ${toolResults.metrics.fixableIssues} issues with ESLint`);
    }
    
    if (role === 'dependency' && toolResults.findings.length > 0) {
      recommendations.push('Update vulnerable dependencies');
    }
    
    return recommendations;
  }
}

/**
 * Tool configuration for each agent role in the orchestrator flow
 */
export const ORCHESTRATOR_TOOL_MAPPING = {
  orchestrator: [
    'git-mcp',         // For fetching PR/repo data
    'web-search-mcp',  // For finding related issues
    'context-mcp'      // For organizational context
  ],
  security: [
    'mcp-scan',        // Security verification
    'semgrep-mcp',     // Code security scanning
    'sonarqube'        // General security checks
  ],
  codeQuality: [
    'eslint-mcp',      // JS/TS linting
    'sonarqube',       // Multi-language quality
    'prettier-direct'  // Code formatting
  ],
  architecture: [
    'dependency-cruiser-direct',  // Dependency analysis
    'madge-direct',              // Circular dependencies
    'git-mcp'                    // Structure analysis
  ],
  performance: [
    'lighthouse-direct',    // Web performance
    'sonarqube',           // Code complexity
    'bundlephobia-direct'  // Bundle size
  ],
  dependency: [
    'npm-audit-direct',     // Security vulnerabilities
    'license-checker-direct', // License compliance
    'outdated-direct'       // Version currency
  ],
  educational: [
    'context-mcp',          // Knowledge retrieval
    'knowledge-graph-mcp',  // Learning paths
    'mcp-memory',          // Progress tracking
    'web-search-mcp'       // External resources
  ],
  reporting: [
    'chartjs-mcp',      // Visualizations
    'mermaid-mcp',      // Diagrams
    'markdown-pdf-mcp', // Report formatting
    'grafana-direct'    // Dashboards
  ]
};

// Export singleton
export const toolEnhancedOrchestrator = new ToolEnhancedOrchestrator();
