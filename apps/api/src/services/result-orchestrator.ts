/* eslint-disable @typescript-eslint/no-explicit-any, no-console */
import { AuthenticatedUser } from '../middleware/auth-middleware';
import { DeepWikiManager } from './deepwiki-manager';
import { PRContextService } from './pr-context-service';
import { ResultProcessor } from './result-processor';
import { EducationalContentService } from './educational-content-service';
import { EducationalToolOrchestrator } from './educational-tool-orchestrator';
import { storeAnalysisInHistory } from '../routes/analysis';

// Import existing packages
import { EnhancedMultiAgentExecutor } from '@codequal/agents/multi-agent/enhanced-executor';
import { ModelVersionSync, RepositorySizeCategory } from '@codequal/core/services/model-selection/ModelVersionSync';
import { VectorContextService } from '@codequal/agents/multi-agent/vector-context-service';
import { ToolResultRetrievalService, AgentToolResults } from '@codequal/core/services/deepwiki-tools';
import { VectorStorageService } from '@codequal/database';
import { createLogger } from '@codequal/core/utils';
import { AuthenticatedUser as AgentAuthenticatedUser, UserRole, UserStatus, UserPermissions } from '@codequal/agents/multi-agent/types/auth';
import { RepositorySchedulerService } from '@codequal/core/services/scheduling';
import { EducationalAgent } from '@codequal/agents/multi-agent/educational-agent';
import { ReporterAgent, ReportFormat } from '@codequal/agents/multi-agent/reporter-agent';
import { StandardReport } from '@codequal/agents/services/report-formatter.service';
import { RecommendationService } from '@codequal/agents/services/recommendation-service';
import { EducationalCompilationService } from '@codequal/agents/services/educational-compilation-service';

export interface PRAnalysisRequest {
  repositoryUrl: string;
  prNumber: number;
  analysisMode: 'quick' | 'comprehensive' | 'deep';
  authenticatedUser: AuthenticatedUser;
  githubToken?: string;
  reportFormat?: ReportFormat;
}

export interface PRContext {
  repositoryUrl: string;
  prNumber: number;
  prDetails: any;
  diff: any;
  changedFiles: string[];
  primaryLanguage: string;
  repositorySize: RepositorySizeCategory;
  analysisMode: string;
  baseBranch?: string;
  files?: Array<{
    path: string;
    content?: string;
    diff?: string;
    previousContent?: string;
  }>;
}

export interface RepositoryStatus {
  existsInVectorDB: boolean;
  lastAnalyzed?: Date;
  analysisQuality: 'fresh' | 'stale' | 'outdated';
  needsReanalysis: boolean;
}

export interface AnalysisResult {
  analysisId: string;
  status: 'complete';
  repository: {
    url: string;
    name: string;
    primaryLanguage: string;
  };
  pr: {
    number: number;
    title: string;
    changedFiles: number;
  };
  analysis: {
    mode: string;
    agentsUsed: string[];
    totalFindings: number;
    processingTime: number;
  };
  findings: {
    security: any[];
    architecture: any[];
    performance: any[];
    codeQuality: any[];
  };
  recommendations?: any; // Recommendation Module
  educationalContent: any[]; // Legacy field for backward compatibility
  compiledEducationalData?: any; // NEW: Compiled educational data for Reporter Agent
  metrics: {
    totalFindings: number;
    severity: { critical: number; high: number; medium: number; low: number };
    confidence: number;
    coverage: number;
  };
  report: {
    summary: string;
    recommendations: string[];
    prComment: string;
    fullReport?: any; // Full enhanced report from Reporter Agent
  };
  metadata: {
    timestamp: Date;
    modelVersions: Record<string, string>;
    processingSteps: string[];
  };
}

/**
 * Main Result Orchestrator - coordinates the complete PR analysis workflow
 */
export class ResultOrchestrator {
  private readonly logger = createLogger('ResultOrchestrator');
  private modelVersionSync: ModelVersionSync;
  private vectorContextService: VectorContextService;
  private toolResultRetrievalService: ToolResultRetrievalService;
  private deepWikiManager: DeepWikiManager;
  private prContextService: PRContextService;
  private resultProcessor: ResultProcessor;
  private educationalService: EducationalContentService;
  private educationalToolOrchestrator: EducationalToolOrchestrator;
  private educationalAgent: EducationalAgent;
  private reporterAgent: ReporterAgent;
  private recommendationService: RecommendationService;
  private educationalCompilationService: EducationalCompilationService;
  private agentAuthenticatedUser: AgentAuthenticatedUser;

  constructor(private authenticatedUser: AuthenticatedUser) {
    // Initialize services with authenticated user context
    this.modelVersionSync = new ModelVersionSync(this.logger);
    
    // Convert API AuthenticatedUser to Agent AuthenticatedUser
    this.agentAuthenticatedUser = this.convertToAgentUser(authenticatedUser);
    
    // Create mock RAG service for VectorContextService
    const mockRAGService = this.createMockRAGService();
    this.vectorContextService = new VectorContextService(mockRAGService);
    
    // Initialize tool result retrieval service
    // In production, this would be injected with actual VectorStorageService
    const mockVectorStorage = this.createMockVectorStorageService();
    this.toolResultRetrievalService = new ToolResultRetrievalService(mockVectorStorage, this.logger);
    
    this.deepWikiManager = new DeepWikiManager(authenticatedUser);
    this.prContextService = new PRContextService();
    this.resultProcessor = new ResultProcessor();
    this.educationalService = new EducationalContentService(authenticatedUser);
    this.educationalToolOrchestrator = new EducationalToolOrchestrator(
      authenticatedUser,
      this.toolResultRetrievalService
    );
    
    // Initialize Educational and Reporter agents
    this.educationalAgent = new EducationalAgent(mockVectorStorage, null, authenticatedUser);
    this.reporterAgent = new ReporterAgent(mockVectorStorage);
    this.recommendationService = new RecommendationService();
    this.educationalCompilationService = new EducationalCompilationService();
  }

  /**
   * Main orchestration method - coordinates entire PR analysis workflow
   */
  async analyzePR(request: PRAnalysisRequest): Promise<AnalysisResult> {
    const startTime = Date.now();
    const processingSteps: string[] = [];

    try {
      // Step 1: Extract PR context
      processingSteps.push('Extracting PR context');
      const prContext = await this.extractPRContext(request);

      // Step 2: Check repository status in Vector DB
      processingSteps.push('Checking repository status');
      const repositoryStatus = await this.checkRepositoryStatus(request.repositoryUrl);

      // Step 3: Ensure fresh repository analysis
      if (repositoryStatus.needsReanalysis) {
        processingSteps.push('Triggering repository analysis');
        await this.ensureFreshRepositoryAnalysis(request.repositoryUrl);
      }

      // Step 4: Select optimal orchestrator model
      processingSteps.push('Selecting optimal models');
      const orchestratorModel = await this.selectOrchestratorModel(prContext);

      // Step 5: Retrieve tool results for agents
      processingSteps.push('Retrieving tool analysis results');
      const toolResults = await this.retrieveToolResults(request.repositoryUrl);

      // Step 6: Coordinate multi-agent analysis with tool results
      processingSteps.push('Coordinating multi-agent analysis');
      const agentResults = await this.coordinateAgents(prContext, orchestratorModel, toolResults);

      // Step 7: Process and deduplicate results
      processingSteps.push('Processing agent results');
      const processedResults = await this.processResults(agentResults);

      // Step 8: Generate Recommendation Module from processed results
      processingSteps.push('Generating recommendation module');
      const deepWikiSummary = await this.getDeepWikiSummary(request.repositoryUrl);
      const recommendationModule = await this.recommendationService.generateRecommendations(
        processedResults || { findings: {} }, 
        deepWikiSummary
      );

      // Step 9: Execute educational tools with compiled findings
      processingSteps.push('Executing educational tools with compiled context');
      const educationalToolResults = await this.educationalToolOrchestrator.executeEducationalTools(
        processedResults,
        recommendationModule,
        deepWikiSummary,
        { prContext, processedResults }
      );

      // Step 10: Generate educational content using Educational Agent with tool results
      processingSteps.push('Generating educational content from compiled analysis');
      const educationalResult = await this.educationalAgent.analyzeFromRecommendationsWithTools(
        recommendationModule,
        educationalToolResults
      );

      // Step 10: Compile educational data for Reporter Agent
      processingSteps.push('Compiling educational data');
      const compiledEducationalData = await this.educationalCompilationService.compileEducationalData(
        educationalResult,
        recommendationModule,
        processedResults
      );

      // Step 11: Generate standardized report using Reporter Agent
      processingSteps.push('Generating standardized report');
      const reportFormat: ReportFormat = {
        type: request.reportFormat?.type || 'full-report',
        includeEducational: true,
        educationalDepth: request.analysisMode === 'deep' ? 'comprehensive' : 
                         request.analysisMode === 'comprehensive' ? 'detailed' : 'summary'
      };
      
      const standardReport = await this.reporterAgent.generateStandardReport(
        {
          ...processedResults,
          findings: processedResults?.findings || {},
          metrics: this.calculateMetrics(processedResults)
        },
        compiledEducationalData,
        recommendationModule,
        reportFormat
      );
      
      // Step 12: Store standardized report in Supabase for UI consumption
      processingSteps.push('Storing report in database');
      await this.storeReportInSupabase(standardReport, request.authenticatedUser);

      const processingTime = Date.now() - startTime;

      // Step 10: Compile final analysis result
      const analysisResult: AnalysisResult = {
        analysisId: `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: 'complete',
        repository: {
          url: request.repositoryUrl,
          name: this.extractRepositoryName(request.repositoryUrl),
          primaryLanguage: prContext.primaryLanguage
        },
        pr: {
          number: request.prNumber,
          title: prContext.prDetails?.title || 'PR Analysis',
          changedFiles: prContext.changedFiles.length
        },
        analysis: {
          mode: request.analysisMode,
          agentsUsed: this.extractAgentNames(agentResults),
          totalFindings: this.countTotalFindings(processedResults),
          processingTime
        },
        findings: processedResults?.findings || {},
        recommendations: recommendationModule, // NEW: Include the Recommendation Module
        educationalContent: [standardReport.modules.educational], // Educational module from standard report
        compiledEducationalData: compiledEducationalData, // NEW: Compiled format for Reporter Agent
        metrics: this.calculateMetrics(processedResults),
        report: {
          summary: standardReport.overview.executiveSummary,
          recommendations: standardReport.modules.recommendations.categories
            .flatMap(cat => cat.recommendations)
            .slice(0, 5)
            .map(r => r.title),
          prComment: standardReport.exports.prComment,
          fullReport: standardReport
        },
        metadata: {
          timestamp: new Date(),
          modelVersions: this.extractModelVersions(agentResults),
          processingSteps
        }
      };

      // Store analysis in user's history
      storeAnalysisInHistory(this.authenticatedUser.id, analysisResult);

      // Step 11: Initialize automatic scheduling if this is the first analysis
      try {
        const scheduler = RepositorySchedulerService.getInstance();
        const existingSchedule = await scheduler.getSchedule(request.repositoryUrl);
        
        if (!existingSchedule) {
          // First analysis - create automatic schedule
          processingSteps.push('Creating automatic analysis schedule');
          const schedule = await scheduler.initializeAutomaticSchedule(
            request.repositoryUrl,
            analysisResult
          );
          console.log(`Automatic schedule created for ${request.repositoryUrl}:`, {
            frequency: schedule.frequency,
            reason: schedule.reason
          });
        } else {
          // Existing schedule - check if adjustment needed based on new findings
          processingSteps.push('Evaluating schedule adjustment');
          await this.evaluateScheduleAdjustment(request.repositoryUrl, analysisResult, existingSchedule);
        }
      } catch (error) {
        // Don't fail the analysis if scheduling fails
        console.error('Failed to initialize automatic schedule:', error);
      }

      return analysisResult;

    } catch (error) {
      console.error('PR analysis orchestration error:', error);
      throw new Error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Compile findings into format expected by Educational Agent
   */
  private compileFindings(processedResults: any): any {
    const findings = processedResults?.findings || {};
    
    return {
      codeQuality: {
        complexityIssues: findings.codeQuality?.filter((f: any) => f.type === 'complexity') || [],
        maintainabilityIssues: findings.codeQuality?.filter((f: any) => f.type === 'maintainability') || [],
        codeSmells: findings.codeQuality?.filter((f: any) => f.type === 'code-smell') || [],
        patterns: []
      },
      security: {
        vulnerabilities: findings.security || [],
        securityPatterns: [],
        complianceIssues: findings.security?.filter((f: any) => f.type === 'compliance') || [],
        threatLandscape: []
      },
      architecture: {
        designPatternViolations: findings.architecture?.filter((f: any) => f.type === 'pattern-violation') || [],
        technicalDebt: findings.architecture?.filter((f: any) => f.type === 'technical-debt') || [],
        refactoringOpportunities: findings.architecture?.filter((f: any) => f.type === 'refactoring') || [],
        architecturalDecisions: []
      },
      performance: {
        performanceIssues: findings.performance || [],
        optimizationOpportunities: findings.performance?.filter((f: any) => f.type === 'optimization') || [],
        bottlenecks: findings.performance?.filter((f: any) => f.type === 'bottleneck') || [],
        benchmarkResults: []
      },
      dependency: {
        vulnerabilityIssues: findings.dependency?.filter((f: any) => f.type === 'vulnerability') || [],
        licenseIssues: findings.dependency?.filter((f: any) => f.type === 'license') || [],
        outdatedPackages: findings.dependency?.filter((f: any) => f.type === 'outdated') || [],
        conflictResolution: []
      },
      criticalIssues: processedResults.criticalIssues || [],
      learningOpportunities: [],
      knowledgeGaps: []
    };
  }

  /**
   * Generate PR comment with educational insights
   */
  private generatePRComment(processedResults: any, educationalResult: any): string {
    const findings = processedResults?.findings || {};
    const totalFindings = this.countTotalFindings(processedResults);
    
    let comment = "## CodeQual Analysis Results\n\n";
    
    if (totalFindings === 0) {
      comment += "🎉 Great work! No significant issues found in this PR.\n\n";
    } else {
      comment += `Found ${totalFindings} issue${totalFindings > 1 ? 's' : ''} to review:\n\n`;
      
      // Add findings summary
      Object.entries(findings).forEach(([category, categoryFindings]: [string, any]) => {
        if (Array.isArray(categoryFindings) && categoryFindings.length > 0) {
          comment += `### ${category.charAt(0).toUpperCase() + category.slice(1)}\n`;
          categoryFindings.slice(0, 3).forEach(finding => {
            comment += `- ${finding.title || finding.description}\n`;
          });
          comment += "\n";
        }
      });
    }
    
    // Add educational insights if available
    if (educationalResult && educationalResult.learningPath.steps.length > 0) {
      comment += "### 📚 Learning Opportunities\n";
      comment += `A ${educationalResult.learningPath.difficulty} learning path with ${educationalResult.learningPath.steps.length} topics has been identified:\n\n`;
      
      // Show top 3 learning topics
      educationalResult.learningPath.steps.slice(0, 3).forEach((step: string) => {
        comment += `- ${step}\n`;
      });
      
      if (educationalResult.learningPath.steps.length > 3) {
        comment += `- ...and ${educationalResult.learningPath.steps.length - 3} more\n`;
      }
      
      comment += `\n**Estimated learning time**: ${educationalResult.learningPath.estimatedTime}\n\n`;
    }
    
    comment += "*View the full analysis report for detailed educational content and resources.*";
    
    return comment;
  }

  /**
   * Extract PR context including diff, changed files, and repository information
   */
  private async extractPRContext(request: PRAnalysisRequest): Promise<PRContext> {
    const prDetails = await this.prContextService.fetchPRDetails(
      request.repositoryUrl,
      request.prNumber,
      request.githubToken
    );

    const diff = await this.prContextService.getPRDiff(prDetails);
    const changedFiles = this.prContextService.extractChangedFiles(diff);
    
    // Determine repository characteristics
    const primaryLanguage = await this.prContextService.detectPrimaryLanguage(
      request.repositoryUrl,
      changedFiles
    );
    
    const repositorySize = await this.prContextService.estimateRepositorySize(
      request.repositoryUrl
    );

    return {
      repositoryUrl: request.repositoryUrl,
      prNumber: request.prNumber,
      prDetails,
      diff,
      changedFiles,
      primaryLanguage,
      repositorySize,
      analysisMode: request.analysisMode
    };
  }

  /**
   * Check if repository exists in Vector DB and its freshness
   */
  private async checkRepositoryStatus(repositoryUrl: string): Promise<RepositoryStatus> {
    const existsInVectorDB = await this.deepWikiManager.checkRepositoryExists(repositoryUrl);
    
    if (!existsInVectorDB) {
      return {
        existsInVectorDB: false,
        analysisQuality: 'outdated',
        needsReanalysis: true
      };
    }

    // Get repository context which may include last analysis info
    const existingContext = await this.vectorContextService.getRepositoryContext(
      repositoryUrl,
      'orchestrator' as any,
      this.authenticatedUser as any
    );
    const lastAnalyzed = existingContext.lastUpdated ? 
      new Date(existingContext.lastUpdated) : undefined;
    
    // Determine freshness (this is simplified - in production would use threshold evaluation)
    const daysSinceAnalysis = lastAnalyzed ? 
      (Date.now() - lastAnalyzed.getTime()) / (1000 * 60 * 60 * 24) : Infinity;

    let analysisQuality: 'fresh' | 'stale' | 'outdated';
    let needsReanalysis: boolean;

    if (daysSinceAnalysis <= 1) {
      analysisQuality = 'fresh';
      needsReanalysis = false;
    } else if (daysSinceAnalysis <= 7) {
      analysisQuality = 'stale';
      needsReanalysis = false; // For now, accept stale analysis
    } else {
      analysisQuality = 'outdated';
      needsReanalysis = true;
    }

    return {
      existsInVectorDB,
      lastAnalyzed,
      analysisQuality,
      needsReanalysis
    };
  }

  /**
   * Trigger repository analysis if needed
   */
  private async ensureFreshRepositoryAnalysis(repositoryUrl: string): Promise<void> {
    await this.deepWikiManager.triggerRepositoryAnalysis(repositoryUrl);
    // Wait for analysis completion
    await this.deepWikiManager.waitForAnalysisCompletion(repositoryUrl);
  }

  /**
   * Select optimal orchestrator model based on context
   */
  private async selectOrchestratorModel(context: PRContext): Promise<any> {
    return this.modelVersionSync.findOptimalModel({
      language: context.primaryLanguage,
      sizeCategory: context.repositorySize,
      tags: ['orchestrator']
    });
  }

  /**
   * Retrieve tool results from Vector DB for agent consumption
   */
  private async retrieveToolResults(repositoryUrl: string): Promise<Record<string, AgentToolResults>> {
    try {
      // Extract repository ID from URL (simplified - in production would use proper ID mapping)
      const repositoryId = this.extractRepositoryId(repositoryUrl);
      
      // Get tool summary to check if results exist
      const summary = await this.toolResultRetrievalService.getRepositoryToolSummary(repositoryId);
      
      if (!summary?.hasResults) {
        console.log(`No tool results found for repository ${repositoryId}, agents will analyze without tool context`);
        return {};
      }
      
      // Retrieve tool results for all agent roles that have tool mappings
      const agentRoles = ['security', 'architecture', 'dependency', 'performance', 'codeQuality'];
      const toolResults = await this.toolResultRetrievalService.getToolResultsForAgents(
        repositoryId,
        agentRoles,
        {
          latestOnly: true,
          includeScores: true,
          minAge: 7 // Accept results up to 7 days old
        }
      );
      
      // Log available tool results for debugging
      Object.entries(toolResults).forEach(([agentRole, results]) => {
        console.log(`Retrieved ${results.toolResults.length} tool results for ${agentRole} agent`);
      });
      
      return toolResults;
      
    } catch (error) {
      console.error('Error retrieving tool results:', error);
      return {}; // Continue analysis without tool results if retrieval fails
    }
  }

  /**
   * Coordinate multi-agent analysis using existing enhanced executor
   */
  private async coordinateAgents(
    context: PRContext, 
    orchestratorModel: any, 
    toolResults: Record<string, AgentToolResults> = {}
  ): Promise<any> {
    // Create repository data for the executor
    const repositoryData = {
      owner: context.repositoryUrl.split('/')[3],
      repo: context.repositoryUrl.split('/')[4],
      prNumber: context.prNumber,
      branch: context.baseBranch,
      files: context.files?.map((f: any) => ({
        path: f.path,
        content: f.content || '',
        diff: f.diff,
        previousContent: f.previousContent
      })) || []
    };

    // Create multi-agent config
    const multiAgentConfig = {
      name: 'PR Analysis',
      strategy: 'parallel' as any,
      agents: [] as any[],
      fallbackEnabled: true
    };

    // Create DeepWiki report retriever function
    const deepWikiReportRetriever = async (agentRole: string, requestContext: any) => {
      return this.retrieveRelevantDeepWikiReport(agentRole, requestContext);
    };

    // Create enhanced multi-agent executor
    const executor = new EnhancedMultiAgentExecutor(
      multiAgentConfig,
      repositoryData,
      this.vectorContextService,
      this.agentAuthenticatedUser,
      { debug: false },
      toolResults,
      deepWikiReportRetriever
    );

    // Select agents based on analysis mode
    const selectedAgents = this.selectAgentsForAnalysis(context.analysisMode);

    // Configure agents with repository context and tool results
    const agentConfigurations = await this.configureAgents(selectedAgents, context, toolResults);

    // Update the config with selected agents
    multiAgentConfig.agents = agentConfigurations;

    // Execute agents
    const results = await executor.execute();

    return results;
  }

  /**
   * Process and deduplicate agent results
   */
  private async processResults(agentResults: any): Promise<any> {
    return this.resultProcessor.processAgentResults(agentResults);
  }

  /**
   * Generate educational content based on findings
   */
  private async generateEducationalContent(processedResults: any): Promise<any[]> {
    return this.educationalService.generateContentForFindings(
      processedResults?.findings || {},
      this.authenticatedUser
    );
  }

  /**
   * Generate final report
   */
  private async generateReport(processedResults: any, educationalContent: any[]): Promise<any> {
    // For now, return a basic report structure
    // This would be replaced with actual Report Agent integration
    return {
      summary: 'PR analysis completed successfully',
      recommendations: this.extractRecommendations(processedResults),
      prComment: this.generatePRComment(processedResults, educationalContent)
    };
  }

  // Helper methods
  private selectAgentsForAnalysis(mode: string): string[] {
    switch (mode) {
      case 'quick': return ['security', 'codeQuality'];
      case 'comprehensive': return ['security', 'architecture', 'performance', 'codeQuality'];
      case 'deep': return ['security', 'architecture', 'performance', 'codeQuality', 'dependencies'];
      default: return ['security', 'codeQuality'];
    }
  }

  private async configureAgents(
    agents: string[], 
    context: PRContext, 
    toolResults: Record<string, AgentToolResults> = {}
  ): Promise<any[]> {
    const configurations = [];
    
    for (const agentType of agents) {
      const config = await this.modelVersionSync.findOptimalModel({
        language: context.primaryLanguage,
        sizeCategory: context.repositorySize,
        tags: [agentType]
      });
      
      // Get agent-specific context including tool results
      const agentContext = this.getAgentSpecificContext(agentType, context, toolResults[agentType]);
      
      configurations.push({
        type: agentType,
        configuration: config,
        context: agentContext
      });
    }
    
    return configurations;
  }

  private getAgentSpecificContext(
    agentType: string, 
    context: PRContext, 
    toolResults?: AgentToolResults
  ): any {
    // Return context specific to each agent type
    const baseContext = {
      changedFiles: context.changedFiles,
      primaryLanguage: context.primaryLanguage,
      diff: context.diff
    };

    // Add tool results to agent context if available
    let toolAnalysisContext = '';
    if (toolResults && this.toolResultRetrievalService.areResultsFresh(toolResults)) {
      toolAnalysisContext = this.toolResultRetrievalService.formatToolResultsForPrompt(toolResults);
    }

    switch (agentType) {
      case 'security':
        return { 
          ...baseContext, 
          focus: 'security vulnerabilities and patterns',
          toolAnalysis: toolAnalysisContext || 'No recent automated security analysis available.'
        };
      case 'architecture':
        return { 
          ...baseContext, 
          focus: 'architectural patterns and design quality',
          toolAnalysis: toolAnalysisContext || 'No recent automated architecture analysis available.'
        };
      case 'dependency':
        return { 
          ...baseContext, 
          focus: 'dependency management and compliance',
          toolAnalysis: toolAnalysisContext || 'No recent automated dependency analysis available.'
        };
      case 'performance':
        return { 
          ...baseContext, 
          focus: 'performance implications and optimizations',
          toolAnalysis: 'No automated performance tools currently configured.'
        };
      case 'codeQuality':
        return { 
          ...baseContext, 
          focus: 'code quality and maintainability',
          toolAnalysis: 'No automated code quality tools currently configured.'
        };
      default:
        return baseContext;
    }
  }

  private extractRepositoryName(url: string): string {
    const match = url.match(/\/([^/]+)\.git$/) || url.match(/\/([^/]+)$/);
    return match ? match[1] : 'Unknown Repository';
  }

  private extractRepositoryId(url: string): string {
    // Extract repository identifier from URL
    // In production, this would map to actual database repository ID
    const name = this.extractRepositoryName(url);
    const owner = url.split('/').slice(-2, -1)[0] || 'unknown';
    return `${owner}/${name}`;
  }

  private extractAgentNames(agentResults: any): string[] {
    return Object.keys(agentResults.agentResults || {});
  }

  private countTotalFindings(processedResults: any): number {
    const findings = processedResults?.findings || {};
    return Object.values(findings).reduce((total: number, categoryFindings: any) => {
      return total + (Array.isArray(categoryFindings) ? categoryFindings.length : 0);
    }, 0);
  }

  private calculateMetrics(processedResults: any): any {
    const findings = processedResults?.findings || {};
    const allFindings = Object.values(findings).flat() as any[];
    
    const severityCounts = {
      critical: allFindings.filter(f => f.severity === 'critical').length,
      high: allFindings.filter(f => f.severity === 'high').length,
      medium: allFindings.filter(f => f.severity === 'medium').length,
      low: allFindings.filter(f => f.severity === 'low').length
    };

    const averageConfidence = allFindings.length > 0 ? 
      allFindings.reduce((sum, f) => sum + (f.confidence || 0), 0) / allFindings.length : 0;

    return {
      totalFindings: allFindings.length,
      severity: severityCounts,
      confidence: Math.round(averageConfidence * 100) / 100,
      coverage: 85 // This would be calculated based on analysis depth
    };
  }

  private extractModelVersions(agentResults: any): Record<string, string> {
    const versions: Record<string, string> = {};
    
    if (agentResults.agentResults) {
      Object.entries(agentResults.agentResults).forEach(([agentName, result]: [string, any]) => {
        if (result.modelVersion) {
          versions[agentName] = result.modelVersion;
        }
      });
    }
    
    return versions;
  }

  private extractRecommendations(processedResults: any): string[] {
    // Extract key recommendations from findings
    const findings = processedResults?.findings || {};
    const recommendations: string[] = [];
    
    Object.values(findings).forEach((categoryFindings: any) => {
      if (Array.isArray(categoryFindings)) {
        categoryFindings.forEach(finding => {
          if (finding.recommendation) {
            recommendations.push(finding.recommendation);
          }
        });
      }
    });
    
    return recommendations.slice(0, 5); // Top 5 recommendations
  }

  /**
   * Convert API AuthenticatedUser to Agent AuthenticatedUser
   */
  private convertToAgentUser(apiUser: AuthenticatedUser): AgentAuthenticatedUser {
    // Create user permissions structure expected by agents package
    const permissions: UserPermissions = {
      repositories: {
        // For now, grant access to all repositories the user has access to
        // In production, this would be populated from the database
        '*': {
          read: true,
          write: false,
          admin: false
        }
      },
      organizations: apiUser.organizationId ? [apiUser.organizationId] : [],
      globalPermissions: apiUser.permissions || [],
      quotas: {
        requestsPerHour: 1000,
        maxConcurrentExecutions: 5,
        storageQuotaMB: 1000
      }
    };

    // Map API role to Agent UserRole
    let role: UserRole;
    switch (apiUser.role) {
      case 'admin':
        role = UserRole.ADMIN;
        break;
      case 'system_admin':
        role = UserRole.SYSTEM_ADMIN;
        break;
      case 'org_owner':
        role = UserRole.ORG_OWNER;
        break;
      case 'org_member':
        role = UserRole.ORG_MEMBER;
        break;
      case 'service_account':
        role = UserRole.SERVICE_ACCOUNT;
        break;
      default:
        role = UserRole.USER;
    }

    // Map API status to Agent UserStatus
    let status: UserStatus;
    switch (apiUser.status) {
      case 'suspended':
        status = UserStatus.SUSPENDED;
        break;
      case 'pending_verification':
        status = UserStatus.PENDING_VERIFICATION;
        break;
      case 'password_reset_required':
        status = UserStatus.PASSWORD_RESET_REQUIRED;
        break;
      case 'locked':
        status = UserStatus.LOCKED;
        break;
      default:
        status = UserStatus.ACTIVE;
    }

    return {
      id: apiUser.id,
      email: apiUser.email,
      organizationId: apiUser.organizationId,
      permissions,
      session: {
        token: apiUser.session.token,
        expiresAt: apiUser.session.expiresAt,
        fingerprint: 'api-session',
        ipAddress: '127.0.0.1',
        userAgent: 'CodeQual API'
      },
      role,
      status
    };
  }

  /**
   * Create mock RAG service for VectorContextService
   */
  private createMockRAGService(): any {
    return {
      search: async (_options: any, _userId: string) => {
        // Return empty results for now
        // In production, this would be the actual RAG service
        return [];
      },
      supabase: {
        // Mock supabase client
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ data: [], error: null })
            })
          })
        })
      }
    };
  }

  /**
   * Create mock Vector Storage service for tool result retrieval
   */
  private createMockVectorStorageService(): VectorStorageService {
    return {
      searchByMetadata: async (criteria: any, _options: any) => {
        // In production, this would query the actual Vector DB
        // For now, return empty results
        console.log('Mock Vector Storage: searching for tool results with criteria:', criteria);
        return [];
      },
      storeChunks: async () => { /* mock implementation */ },
      deleteChunksBySource: async () => 0,
      // Add other required methods as needed
    } as any;
  }

  /**
   * Evaluate if schedule needs adjustment based on analysis results
   */
  private async evaluateScheduleAdjustment(
    repositoryUrl: string,
    analysisResult: AnalysisResult,
    currentSchedule: any
  ): Promise<void> {
    const scheduler = RepositorySchedulerService.getInstance();
    const criticalFindings = analysisResult.metrics.severity.critical;
    const totalFindings = analysisResult.metrics.totalFindings || 0;
    
    // Check if we need to escalate due to critical findings
    if (criticalFindings > 0 && currentSchedule.frequency !== 'every-6-hours') {
      console.log(`Escalating schedule for ${repositoryUrl} due to ${criticalFindings} critical findings`);
      await scheduler.updateSchedule(repositoryUrl, {
        frequency: 'every-6-hours',
        priority: 'critical',
        reason: `Schedule escalated: ${criticalFindings} critical security issues detected`,
        canBeDisabled: false
      });
      return;
    }
    
    // Check if we can reduce frequency if all issues resolved
    if (totalFindings === 0 && currentSchedule.frequency !== 'monthly') {
      console.log(`Reducing schedule frequency for ${repositoryUrl} - all issues resolved`);
      await scheduler.updateSchedule(repositoryUrl, {
        frequency: 'weekly',
        priority: 'low',
        reason: 'All issues resolved - reduced monitoring frequency'
      });
      return;
    }
    
    // Check if findings increased significantly (>50%)
    // TODO: Compare with previous analysis to detect trends
  }

  /**
   * Extract educational topics from recommendations
   */
  private extractEducationalTopics(recommendationModule: any): string[] {
    const topics = new Set<string>();
    
    // Extract from recommendations
    recommendationModule.recommendations.forEach((rec: any) => {
      topics.add(rec.category);
      topics.add(rec.title);
      rec.learningContext?.relatedConcepts?.forEach((concept: string) => {
        topics.add(concept);
      });
    });
    
    // Extract from focus areas
    recommendationModule.summary?.focusAreas?.forEach((area: string) => {
      topics.add(area);
    });
    
    return Array.from(topics).slice(0, 10); // Limit to prevent cost explosion
  }

  /**
   * Extract package names from PR context
   */
  private extractPackageNames(prContext: PRContext): string[] {
    const packages = new Set<string>();
    
    // Extract from changed files
    prContext.files?.forEach(file => {
      if (file.path === 'package.json' && file.content) {
        try {
          const packageJson = JSON.parse(file.content);
          Object.keys(packageJson.dependencies || {}).forEach(pkg => packages.add(pkg));
          Object.keys(packageJson.devDependencies || {}).forEach(pkg => packages.add(pkg));
        } catch {
          // Ignore parse errors
        }
      }
    });
    
    return Array.from(packages).slice(0, 10); // Limit to control costs
  }

  /**
   * Retrieve relevant DeepWiki report sections based on agent role and context
   */
  private async retrieveRelevantDeepWikiReport(agentRole: string, requestContext: any): Promise<any> {
    try {
      console.log(`Retrieving DeepWiki report for ${agentRole} agent`, {
        repositoryId: requestContext.repositoryId,
        changedFiles: requestContext.changedFiles?.length || 0
      });

      // In production, this would query the Vector DB for specific report sections
      // For now, return a mock structure that shows the intended behavior
      const mockReport = {
        security: agentRole === 'security' ? `
Security analysis indicates this repository follows standard security practices.
Key security considerations for the codebase:
- Authentication mechanisms are properly implemented
- Input validation is present in critical paths
- No hardcoded secrets detected in configuration files
        `.trim() : undefined,

        architecture: agentRole === 'architecture' ? `
Architecture Analysis:
- Follows modular TypeScript/Node.js architecture
- Uses service-oriented design patterns
- Clear separation of concerns between layers
- Event-driven architecture for tool execution
        `.trim() : undefined,

        dependencies: agentRole === 'dependency' ? `
Dependency Analysis:
- Primary framework: Node.js with TypeScript
- Package manager: npm
- Key dependencies: Express, React, Agent frameworks
- License compliance: Mostly MIT licenses
        `.trim() : undefined,

        performance: agentRole === 'performance' ? `
Performance Characteristics:
- Asynchronous processing patterns implemented
- Proper resource management for concurrent operations
- Vector DB queries optimized for retrieval speed
        `.trim() : undefined,

        codeQuality: agentRole === 'codeQuality' ? `
Code Quality Assessment:
- TypeScript provides strong typing throughout
- ESLint configuration enforces consistent style
- Test coverage present in critical components
- Clear documentation and commenting standards
        `.trim() : undefined,

        summary: `
Repository: ${requestContext.repositoryId}
Last Analysis: ${new Date().toISOString()}
Repository Type: Multi-agent CodeQual analysis system
Primary Language: TypeScript
        `.trim()
      };

      // Filter out undefined sections
      const filteredReport = Object.fromEntries(
        Object.entries(mockReport).filter(([_, value]) => value !== undefined)
      );

      return Object.keys(filteredReport).length > 0 ? filteredReport : null;

    } catch (error) {
      console.error('Error retrieving DeepWiki report:', error);
      return null;
    }
  }

  /**
   * Get DeepWiki summary for recommendation generation
   */
  private async getDeepWikiSummary(repositoryUrl: string): Promise<any> {
    try {
      const deepWikiReport = await this.deepWikiManager.waitForAnalysisCompletion(repositoryUrl);
      
      if (!deepWikiReport) {
        return {
          suggestions: [],
          insights: [],
          summary: 'No DeepWiki analysis available'
        };
      }

      // Extract key insights for recommendation generation
      return {
        suggestions: [], // No suggestions property in AnalysisResults
        insights: [], // No insights property in AnalysisResults
        summary: 'DeepWiki analysis completed',
        metrics: deepWikiReport.metadata || {},
        patterns: [], // No patterns property in AnalysisResults
        analysis: deepWikiReport.analysis || {}
      };
    } catch (error) {
      console.error('Error retrieving DeepWiki summary:', error);
      return {
        suggestions: [],
        insights: [],
        summary: 'DeepWiki analysis failed'
      };
    }
  }

  /**
   * Store standardized report in Supabase for UI consumption
   */
  private async storeReportInSupabase(
    report: StandardReport,
    authenticatedUser: AuthenticatedUser
  ): Promise<void> {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Store the report in the analysis_reports table
      const { error } = await supabase
        .from('analysis_reports')
        .insert({
          id: report.id,
          repository_url: report.repositoryUrl,
          pr_number: report.prNumber,
          user_id: authenticatedUser.id,
          organization_id: authenticatedUser.organizationId,
          report_data: report, // Store entire report as JSONB
          overview: report.overview, // Store overview separately for quick access
          metadata: report.metadata,
          created_at: report.timestamp,
          analysis_mode: report.metadata.analysisMode,
          total_findings: report.overview.totalFindings,
          risk_level: report.overview.riskLevel,
          analysis_score: report.overview.analysisScore
        });
      
      if (error) {
        this.logger.error('Failed to store report in Supabase', { error, reportId: report.id });
        throw error;
      }
      
      this.logger.info('Report stored successfully in Supabase', {
        reportId: report.id,
        repositoryUrl: report.repositoryUrl
      });
    } catch (error) {
      this.logger.error('Error storing report in Supabase', { error });
      // Don't fail the entire analysis if storage fails
      // The report is still available in the response
    }
  }

  /**
   * Generate executive summary from processed results and recommendations
   */
  private generateExecutiveSummary(processedResults: any, recommendationModule: any): string {
    const totalFindings = this.countTotalFindings(processedResults);
    const totalRecommendations = recommendationModule.summary.totalRecommendations;
    const focusAreas = recommendationModule.summary.focusAreas.join(', ');
    
    let summary = `PR analysis completed successfully. `;
    
    if (totalFindings > 0) {
      summary += `Found ${totalFindings} finding${totalFindings > 1 ? 's' : ''} requiring attention. `;
    } else {
      summary += `No significant issues found. `;
    }
    
    if (totalRecommendations > 0) {
      summary += `Generated ${totalRecommendations} actionable recommendation${totalRecommendations > 1 ? 's' : ''} `;
      summary += `focusing on ${focusAreas}. `;
      summary += `Educational content and learning path provided to support implementation.`;
    }
    
    return summary;
  }

  /**
   * Convert compiled educational data to sections format
   */
  private convertCompiledDataToSections(compiledEducationalData: any): any[] {
    const sections = [];
    
    // Learning Path Section
    if (compiledEducationalData.educational.learningPath.totalSteps > 0) {
      sections.push({
        title: 'Learning Path',
        summary: compiledEducationalData.educational.learningPath.description,
        content: {
          steps: compiledEducationalData.educational.learningPath.steps,
          estimatedTime: compiledEducationalData.educational.learningPath.estimatedTime,
          difficulty: compiledEducationalData.educational.learningPath.difficulty
        },
        type: 'learning-path'
      });
    }
    
    // Educational Content Sections
    if (compiledEducationalData.educational.content.explanations.length > 0) {
      sections.push({
        title: 'Key Concepts',
        summary: `${compiledEducationalData.educational.content.explanations.length} concepts explained`,
        content: compiledEducationalData.educational.content.explanations,
        type: 'explanations'
      });
    }
    
    if (compiledEducationalData.educational.content.tutorials.length > 0) {
      sections.push({
        title: 'Step-by-Step Tutorials',
        summary: `${compiledEducationalData.educational.content.tutorials.length} actionable tutorials`,
        content: compiledEducationalData.educational.content.tutorials,
        type: 'tutorials'
      });
    }
    
    if (compiledEducationalData.educational.content.bestPractices.length > 0) {
      sections.push({
        title: 'Best Practices',
        summary: `${compiledEducationalData.educational.content.bestPractices.length} recommended practices`,
        content: compiledEducationalData.educational.content.bestPractices,
        type: 'best-practices'
      });
    }
    
    // Insights Section
    if (compiledEducationalData.educational.insights.skillGaps.length > 0) {
      sections.push({
        title: 'Skill Development',
        summary: `${compiledEducationalData.educational.insights.skillGaps.length} skill gaps identified`,
        content: {
          skillGaps: compiledEducationalData.educational.insights.skillGaps,
          relatedTopics: compiledEducationalData.educational.insights.relatedTopics,
          nextSteps: compiledEducationalData.educational.insights.nextSteps
        },
        type: 'insights'
      });
    }
    
    return sections;
  }

  /**
   * Extract recommendations list from recommendation module
   */
  private extractRecommendationsList(recommendationModule: any): string[] {
    return recommendationModule.recommendations.map((rec: any) => {
      const priority = rec.priority.level.toUpperCase();
      const category = rec.category.charAt(0).toUpperCase() + rec.category.slice(1);
      return `[${priority}] ${category}: ${rec.title}`;
    });
  }
}
