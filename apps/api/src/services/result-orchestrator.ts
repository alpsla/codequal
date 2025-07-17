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
import { createLogger, LoggableData } from '@codequal/core/utils';
import { AuthenticatedUser as AgentAuthenticatedUser, UserRole, UserStatus, UserPermissions } from '@codequal/agents/multi-agent/types/auth';
import { RepositorySchedulerService } from '@codequal/core/services/scheduling';
import { EducationalAgent } from '@codequal/agents/multi-agent/educational-agent';
import { ReporterAgent, ReportFormat } from '@codequal/agents/multi-agent/reporter-agent';
import { StandardReport } from '@codequal/agents/services/report-formatter.service';
import { RecommendationService } from '@codequal/agents/services/recommendation-service';
import { EducationalCompilationService } from '@codequal/agents/services/educational-compilation-service';
import { PRContentAnalyzer, PRFile } from './intelligence/pr-content-analyzer';
import { IntelligentResultMerger } from './intelligence/intelligent-result-merger';
import { SkillTrackingService } from '@codequal/agents/services/skill-tracking-service';
import { IssueResolutionDetector } from '@codequal/agents/services/issue-resolution-detector';
import { dataFlowMonitor } from './data-flow-monitor';
import { getUnifiedProgressTracer } from './unified-progress-tracer';
import { reportIdMappingService } from './report-id-mapping-service';

// State management for tracking analyses and completed reports
interface OrchestratorState {
  activeAnalyses: Map<string, any>;
  completedAnalyses: Map<string, any>;
}

const resultOrchestratorState: OrchestratorState = {
  activeAnalyses: new Map(),
  completedAnalyses: new Map()
};

// Export function to get the state (for use in routes)
export function getResultOrchestratorState(): OrchestratorState {
  return resultOrchestratorState;
}

export interface PRAnalysisRequest {
  repositoryUrl: string;
  prNumber: number;
  analysisMode: 'quick' | 'comprehensive' | 'deep' | 'auto';
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
  repositoryInsights?: string;
  deepWikiSummary?: any;
  existingIssues?: any;
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
    htmlReportUrl?: string;
    uiReportUrl?: string;
    reportId?: string;
  };
  metadata: {
    timestamp: Date;
    modelVersions: Record<string, string>;
    processingSteps: string[];
    prContentAnalysis?: {
      changeTypes: string[];
      complexity: string;
      riskLevel: string;
      agentsSkipped: string[];
      skipReasons: Record<string, string>;
    } | null;
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
  private prContentAnalyzer: PRContentAnalyzer;
  private intelligentResultMerger: IntelligentResultMerger;

  constructor(private authenticatedUser: AuthenticatedUser) {
    // Initialize services with authenticated user context
    // Pass Supabase credentials to ModelVersionSync for DB access
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    this.modelVersionSync = new ModelVersionSync(
      this.logger,
      supabaseUrl,
      supabaseKey
    );
    
    // Convert API AuthenticatedUser to Agent AuthenticatedUser
    this.agentAuthenticatedUser = this.convertToAgentUser(authenticatedUser);
    
    // Create RAG service for VectorContextService
    const ragService = this.createRAGService();
    this.vectorContextService = new VectorContextService(ragService);
    
    // Initialize tool result retrieval service with actual Vector Storage
    const vectorStorage = this.createVectorStorageService();
    this.toolResultRetrievalService = new ToolResultRetrievalService(vectorStorage, this.logger);
    
    this.deepWikiManager = new DeepWikiManager(authenticatedUser);
    this.prContextService = new PRContextService();
    this.resultProcessor = new ResultProcessor();
    this.educationalService = new EducationalContentService(authenticatedUser);
    this.educationalToolOrchestrator = new EducationalToolOrchestrator(
      authenticatedUser,
      this.toolResultRetrievalService
    );
    
    // Initialize Educational and Reporter agents
    this.educationalAgent = new EducationalAgent(vectorStorage, null, this.agentAuthenticatedUser);
    this.reporterAgent = new ReporterAgent(vectorStorage);
    this.recommendationService = new RecommendationService();
    this.educationalCompilationService = new EducationalCompilationService();
    this.prContentAnalyzer = new PRContentAnalyzer();
    this.intelligentResultMerger = new IntelligentResultMerger();
  }

  /**
   * Main orchestration method - coordinates entire PR analysis workflow
   */
  async analyzePR(request: PRAnalysisRequest): Promise<AnalysisResult> {
    const startTime = Date.now();
    const processingSteps: string[] = [];
    
    this.logger.info('🚀 Starting PR analysis', {
      repositoryUrl: request.repositoryUrl,
      prNumber: request.prNumber,
      analysisMode: request.analysisMode,
      timestamp: new Date().toISOString()
    });
    
    // Start unified progress tracking
    const unifiedTracer = getUnifiedProgressTracer();
    const { analysisId, sessionId } = unifiedTracer.startAnalysis(
      request.repositoryUrl,
      request.prNumber,
      request.analysisMode,
      5, // total agents
      5  // total tools (MCP tools)
    );
    
    this.logger.info('📋 Analysis tracking initialized', {
      analysisId,
      sessionId
    });
    
    // Store IDs for later use
    (this as any).currentAnalysisId = analysisId;
    (this as any).currentSessionId = sessionId;

    try {
      // Step 1: Extract PR context
      processingSteps.push('Extracting PR context');
      const prContextStepId = dataFlowMonitor.startStep(sessionId, 'Extract PR Context', {
        repositoryUrl: request.repositoryUrl,
        prNumber: request.prNumber
      });
      
      const prContext = await this.extractPRContext(request);
      
      dataFlowMonitor.completeStep(prContextStepId, {
        filesCount: prContext.changedFiles?.length || 0,
        primaryLanguage: prContext.primaryLanguage,
        repositorySize: prContext.repositorySize
      });

      // Step 2: Analyze PR content for intelligent agent selection
      processingSteps.push('Analyzing PR content for agent optimization');
      const prContentAnalysis = await this.analyzePRContent(prContext);
      
      // Step 2.5: Automatic mode selection if 'auto' is specified
      if (request.analysisMode === 'auto') {
        const autoSelectedMode = this.selectAnalysisModeBasedOnPR(prContentAnalysis);
        this.logger.info('Automatic mode selection', {
          originalMode: 'auto',
          selectedMode: autoSelectedMode,
          reason: {
            complexity: prContentAnalysis.complexity,
            riskLevel: prContentAnalysis.riskLevel,
            changeTypes: prContentAnalysis.changeTypes
          }
        });
        request.analysisMode = autoSelectedMode as 'quick' | 'comprehensive' | 'deep';
        prContext.analysisMode = autoSelectedMode;
      }
      
      // Step 3: Check repository status in Vector DB
      processingSteps.push('Checking repository status');
      const repositoryStatusStepId = dataFlowMonitor.startStep(sessionId, 'Check Repository Status', {
        repositoryUrl: request.repositoryUrl,
        operation: 'VectorDB lookup'
      });
      
      const repositoryStatus = await this.checkRepositoryStatus(request.repositoryUrl);
      
      dataFlowMonitor.completeStep(repositoryStatusStepId, {
        existsInVectorDB: repositoryStatus.existsInVectorDB,
        analysisQuality: repositoryStatus.analysisQuality,
        needsReanalysis: repositoryStatus.needsReanalysis,
        lastAnalyzed: repositoryStatus.lastAnalyzed
      });

      // Step 3.5: Ensure fresh repository analysis
      if (repositoryStatus.needsReanalysis) {
        processingSteps.push('Triggering repository analysis');
        const deepWikiStepId = dataFlowMonitor.startStep(sessionId, 'Trigger DeepWiki Analysis', {
          reason: 'Repository needs fresh analysis',
          lastAnalyzed: repositoryStatus.lastAnalyzed
        });
        
        // Pass PR branch info to DeepWiki for branch-specific analysis
        const prBranch = prContext.prDetails?.head?.ref || prContext.prDetails?.headBranch;
        const baseBranch = prContext.prDetails?.baseBranch || prContext.baseBranch || 'main';
        
        await this.ensureFreshRepositoryAnalysis(
          request.repositoryUrl,
          prBranch,
          baseBranch,
          prContext.prNumber,
          request.githubToken
        );
        
        dataFlowMonitor.completeStep(deepWikiStepId, {
          status: 'Analysis triggered and completed'
        });
      }

      // Step 4: Select optimal orchestrator model
      processingSteps.push('Selecting optimal models');
      const orchestratorModel = await this.selectOrchestratorModel(prContext);

      // Step 5: Execute MCP-Hybrid tools in parallel
      processingSteps.push('Executing MCP-Hybrid tools in parallel');
      const mcpToolsStepId = dataFlowMonitor.startStep(sessionId, 'Execute MCP-Hybrid Tools', {
        strategy: 'parallel-all',
        prFiles: prContext.changedFiles?.length || 0,
        tools: ['semgrep', 'eslint', 'npm-audit', 'madge', 'dependency-cruiser']
      });

      let toolResults: Record<string, AgentToolResults> = {};
      
      try {
        // Initialize MCP-Hybrid tools if not already done
        console.log('[MCP Tools] Initializing MCP-Hybrid tools...');
        const { initializeTools, parallelAgentExecutor } = await import('@codequal/mcp-hybrid');
        await initializeTools();
        console.log('[MCP Tools] Tools initialized successfully');

        // Determine which agents to use based on analysis mode
        const agentRoles = this.selectAgentsForAnalysis(request.analysisMode, prContentAnalysis);
        console.log('[MCP Tools] Selected agent roles:', agentRoles);
        
        // Get PR files from DeepWiki cache (which now has PR branch files)
        console.log('[MCP Tools] Getting files from DeepWiki PR branch cache...');
        let enrichedFiles = prContext.files || [];
        
        try {
          const prBranch = prContext.prDetails?.head?.ref || prContext.prDetails?.headBranch;
          
          // Get cached files from DeepWiki (now contains PR branch files)
          const cachedFiles = await this.deepWikiManager.getCachedRepositoryFiles(
            request.repositoryUrl,
            prBranch // Get PR branch specific cache
          );
          console.log(`[MCP Tools] Retrieved ${cachedFiles.length} cached files from DeepWiki (branch: ${prBranch || 'main'})`);
          
          // Enrich PR files with content from cache
          enrichedFiles = prContext.files?.map(prFile => {
            const filePath = prFile.path;
            const cachedFile = cachedFiles.find(cf => cf.path === filePath);
            if (cachedFile) {
              return {
                ...prFile,
                content: cachedFile.content // PR branch content from DeepWiki
              };
            }
            return prFile;
          }) || [];
          
          console.log(`[MCP Tools] Enriched ${enrichedFiles.filter(f => f.content).length} files with content`);
        } catch (error) {
          console.error('[MCP Tools] Failed to get cached files from DeepWiki:', error);
          // Continue with original files if cache fails
        }
        
        // Execute tools for all relevant agent roles in parallel
        console.log('[MCP Tools] Executing tools for agents...');
        const toolExecutionResults = await parallelAgentExecutor.executeToolsForAgents(
          agentRoles as any,
          {
            agentRole: 'orchestrator' as any,
            pr: {
              prNumber: prContext.prNumber,
              title: prContext.prDetails?.title || '',
              description: prContext.prDetails?.body || '',
              baseBranch: prContext.baseBranch || 'main',
              targetBranch: prContext.prDetails?.head?.ref || 'feature',
              author: prContext.prDetails?.user?.login || '',
              files: enrichedFiles.map(f => ({
                path: f.path,
                content: f.content || '',
                diff: f.diff,
                changeType: 'modified' as any
              })), // Use enriched files with content
              commits: []
            },
            repository: {
              name: request.repositoryUrl.split('/').pop() || '',
              owner: request.repositoryUrl.split('/')[3] || '',
              languages: [prContext.primaryLanguage],
              frameworks: [],
              primaryLanguage: prContext.primaryLanguage
            },
            userContext: {
              userId: request.authenticatedUser.id,
              organizationId: request.authenticatedUser.organizationId || request.authenticatedUser.id,
              permissions: ['read', 'write']
            }
          },
          {
            strategy: 'sequential', // Run tools sequentially to prevent overload
            maxParallel: 1, // Only one tool at a time
            timeout: 30000
          }
        );

        console.log('[MCP Tools] Execution completed. Results:', toolExecutionResults.size);

        // Convert to the expected format for agents
        toolExecutionResults.forEach((results, role) => {
          console.log(`[MCP Tools] Processing results for role: ${role}`);
          console.log(`[MCP Tools] - Tools executed: ${results.toolsExecuted.join(', ')}`);
          console.log(`[MCP Tools] - Findings count: ${results.findings.length}`);
          
          toolResults[role] = {
            agentRole: role,
            repositoryId: request.repositoryUrl,
            lastExecuted: new Date().toISOString(),
            toolResults: results.findings.map((f: any, index: number) => ({
              toolId: `${role}-${f.ruleId || f.tool || 'tool'}-${index}`,
              agentRole: role,
              content: JSON.stringify(f),
              repositoryId: request.repositoryUrl,
              metadata: {
                executedAt: new Date().toISOString(),
                prNumber: prContext.prNumber,
                scheduledRun: false,
                isLatest: true
              }
            })),
            summary: {
              totalTools: results.toolsExecuted?.length || 0,
              latestResults: true,
              scores: {},
              keyFindings: results.findings.map((f: any) => f.message || f.description || '').slice(0, 5)
            }
          } as any;
        });

        // Log what tools provided data
        const toolsWithResults = Object.entries(toolResults)
          .filter(([_, results]) => results?.toolResults?.length > 0)
          .map(([agent, results]) => ({
            agent,
            toolCount: results.toolResults.length,
            tools: (results as any).toolsExecuted || []
          }));
        
        dataFlowMonitor.completeStep(mcpToolsStepId, {
          agentsWithToolData: toolsWithResults.length,
          totalToolFindings: toolsWithResults.reduce((sum, t) => sum + t.toolCount, 0),
          toolBreakdown: toolsWithResults,
          executionStrategy: 'parallel-all'
        });
      } catch (error) {
        console.error('Failed to execute MCP-Hybrid tools:', error);
        
        // Fall back to Vector DB results if MCP tool execution fails
        toolResults = await this.retrieveToolResults(request.repositoryUrl);
        
        dataFlowMonitor.completeStep(mcpToolsStepId, {
          error: error instanceof Error ? error.message : 'Unknown error',
          fallback: 'Vector DB results'
        });
      }

      // Step 6: Coordinate multi-agent analysis with tool results and PR content analysis
      processingSteps.push('Coordinating multi-agent analysis');
      const agentCoordinationStepId = dataFlowMonitor.startStep(sessionId, 'Coordinate Multi-Agent Analysis', {
        agentCount: 5, // security, codeQuality, architecture, performance, dependency
        toolResultsProvided: Object.keys(toolResults).length > 0
      });
      
      const agentResults = await this.coordinateAgents(prContext, orchestratorModel, toolResults, prContentAnalysis);
      
      dataFlowMonitor.completeStep(agentCoordinationStepId, {
        agentsExecuted: agentResults?.agentsUsed || [],
        totalFindings: agentResults?.totalFindings || 0
      });

      // Step 7: Get DeepWiki data with chunks for context
      const deepWikiRetrievalStepId = dataFlowMonitor.startStep(sessionId, 'Retrieve DeepWiki Data & Chunks', {
        source: 'VectorDB',
        purpose: 'Agent context and recommendations'
      });
      
      const deepWikiData = await this.getDeepWikiSummary(request.repositoryUrl);
      
      dataFlowMonitor.completeStep(deepWikiRetrievalStepId, {
        hasData: !!deepWikiData,
        hasSummary: !!deepWikiData?.summary,
        hasChunks: !!deepWikiData?.chunks,
        chunkCount: deepWikiData?.chunks?.length || 0
      });
      
      // Step 8: Process and deduplicate results with intelligent merging
      processingSteps.push('Processing agent results with intelligent merging');
      const processedResults = await this.processResults(agentResults, deepWikiData);

      // Step 9: Generate Recommendation Module from processed results
      processingSteps.push('Generating recommendation module');
      const recommendationModule = await this.recommendationService.generateRecommendations(
        processedResults || { findings: {} }, 
        deepWikiData?.summary || deepWikiData
      );

      // Step 9: Execute educational tools with compiled findings
      processingSteps.push('Executing educational tools with compiled context');
      const educatorToolsStepId = dataFlowMonitor.startStep(sessionId, 'Execute Educational Tools', {
        purpose: 'Gather educational context from MCP tools',
        inputSources: ['processedResults', 'recommendations', 'deepWikiSummary']
      });
      
      const educationalToolResults = await this.educationalToolOrchestrator.executeEducationalTools(
        processedResults,
        recommendationModule,
        deepWikiData?.summary || deepWikiData,
        { prContext, processedResults }
      );
      
      dataFlowMonitor.completeStep(educatorToolsStepId, {
        toolsExecuted: (educationalToolResults as any)?.toolsExecuted || [],
        resourcesFound: (educationalToolResults as any)?.resources?.length || 0,
        modulesGenerated: (educationalToolResults as any)?.modules?.length || 0
      });

      // Step 10: Generate educational content using Educational Agent with tool results
      processingSteps.push('Generating educational content from compiled analysis');
      const educatorAgentStepId = dataFlowMonitor.startStep(sessionId, 'Educational Agent Processing', {
        agent: 'EducationalAgent',
        inputFromTools: !!educationalToolResults,
        inputFromFindings: !!processedResults
      });
      const educationalResult = await this.educationalAgent.analyzeFromRecommendationsWithTools(
        recommendationModule,
        educationalToolResults
      );
      
      dataFlowMonitor.completeStep(educatorAgentStepId, {
        educationalModules: (educationalResult as any)?.modules?.length || 0,
        resources: (educationalResult as any)?.resources?.length || 0,
        skillCategories: (educationalResult as any)?.skillCategories || []
      });

      // Step 10: Compile educational data for Reporter Agent
      processingSteps.push('Compiling educational data');
      const compileEducStepId = dataFlowMonitor.startStep(sessionId, 'Compile Educational Data', {
        sources: ['educationalAgent', 'recommendations', 'processedResults']
      });
      
      const compiledEducationalData = await this.educationalCompilationService.compileEducationalData(
        educationalResult,
        recommendationModule,
        processedResults
      );
      
      dataFlowMonitor.completeStep(compileEducStepId, {
        compiledModules: (compiledEducationalData as any)?.modules?.length || 0,
        totalResources: (compiledEducationalData as any)?.resources?.length || 0
      });

      // Step 11: Get current skill levels and progression history for report
      processingSteps.push('Retrieving user skill levels and progression');
      const skillTrackingStepId = dataFlowMonitor.startStep(sessionId, 'Track User Skills', {
        userId: request.authenticatedUser.id
      });
      
      const agentUser = this.convertToAgentUser(request.authenticatedUser);
      const skillTracker = new SkillTrackingService(agentUser);
      const currentSkills = await skillTracker.getCurrentSkills();
      
      dataFlowMonitor.completeStep(skillTrackingStepId, {
        currentSkillCount: currentSkills.length,
        skillCategories: currentSkills.map(s => s.categoryId)
      });
      
      // Get skill progression for each skill category
      const skillProgressions: Record<string, any> = {};
      for (const skill of currentSkills) {
        const progression = await skillTracker.getSkillProgression(skill.categoryId, '3m');
        if (progression) {
          skillProgressions[skill.categoryId] = progression;
        }
      }
      
      // Generate skill-based recommendations
      const skillRecommendations = await skillTracker.generateSkillBasedRecommendations();
      
      // Step 12: Generate standardized report using Reporter Agent
      processingSteps.push('Generating standardized report');
      const reporterAgentStepId = dataFlowMonitor.startStep(sessionId, 'Reporter Agent Processing', {
        agent: 'ReporterAgent',
        inputSources: [
          'processedResults',
          'compiledEducationalData', 
          'recommendationModule',
          'deepWikiData',
          'userSkills'
        ]
      });
      
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
          metrics: this.calculateMetrics(processedResults),
          deepWikiData: processedResults?.deepWikiData, // Pass DeepWiki data to Reporter
          deepWikiSummary: deepWikiData?.summary || '', // Pass DeepWiki summary
          deepWikiRecommendations: deepWikiData?.recommendations || {}, // Pass DeepWiki recommendations
          userSkills: currentSkills, // Pass current skill levels
          skillProgressions, // Pass skill progression history
          skillRecommendations // Pass skill-based recommendations
        },
        compiledEducationalData,
        recommendationModule,
        reportFormat
      );
      
      dataFlowMonitor.completeStep(reporterAgentStepId, {
        reportGenerated: true,
        reportType: reportFormat.type,
        sections: Object.keys(standardReport || {}),
        hasEducational: !!(standardReport as any)?.educational,
        hasRecommendations: !!(standardReport as any)?.recommendations
      });
      
      // Step 12: Store standardized report in Supabase for UI consumption
      processingSteps.push('Storing report in database');
      this.logger.info('📝 Storing report in Vector DB', {
        reportId: standardReport.id,
        repositoryUrl: standardReport.repositoryUrl,
        prNumber: standardReport.prNumber,
        reportSize: JSON.stringify(standardReport).length
      });
      
      const reportId = await this.storeReportInSupabase(standardReport, request.authenticatedUser);
      
      this.logger.info('✅ Report stored successfully', {
        reportId,
        storageType: 'vector-db'
      });

      // Step 13: Track skill development based on PR analysis
      processingSteps.push('Tracking skill development');
      await this.trackSkillDevelopment(
        processedResults,
        recommendationModule,
        compiledEducationalData,
        prContext,
        request.authenticatedUser
      );

      const processingTime = Date.now() - startTime;
      
      // Generate report URLs for both API and UI access
      const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
      const webBaseUrl = process.env.WEB_BASE_URL || 'http://localhost:3000';
      const htmlReportUrl = `${apiBaseUrl}/api/analysis/${reportId}/report?format=html`;
      const uiReportUrl = `${webBaseUrl}/reports/${reportId}`;

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
          fullReport: standardReport,
          htmlReportUrl,
          uiReportUrl,
          reportId
        },
        metadata: {
          timestamp: new Date(),
          modelVersions: this.extractModelVersions(agentResults),
          processingSteps,
          prContentAnalysis: prContentAnalysis ? {
            changeTypes: prContentAnalysis.changeTypes,
            complexity: prContentAnalysis.complexity,
            riskLevel: prContentAnalysis.riskLevel,
            agentsSkipped: prContentAnalysis.agentsToSkip,
            skipReasons: prContentAnalysis.skipReasons
          } : null
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

      // Complete monitoring session
      dataFlowMonitor.completeSession(sessionId);
      
      this.logger.info('🎉 PR analysis completed successfully', {
        analysisId: analysisResult.analysisId,
        status: analysisResult.status,
        totalFindings: analysisResult.analysis?.totalFindings,
        processingTime: analysisResult.analysis?.processingTime,
        totalSteps: processingSteps.length,
        timestamp: new Date().toISOString()
      });
      
      // Add a simple console.log to confirm we reach this point
      console.log('🎯 ANALYSIS COMPLETE - About to return result', {
        analysisId: analysisResult.analysisId,
        hasReport: !!analysisResult.report,
        reportType: typeof analysisResult.report
      });
      
      return analysisResult;

    } catch (error) {
      this.logger.error('❌ PR analysis failed', {
        analysisId,
        sessionId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        processingSteps,
        timestamp: new Date().toISOString()
      });
      
      console.error('PR analysis orchestration error:', error);
      console.error('🚨 CRITICAL ERROR IN ANALYSIS:', {
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        analysisId,
        sessionId
      });
      
      // Mark session as failed
      if (sessionId) {
        dataFlowMonitor.failSession(sessionId, error instanceof Error ? error : new Error(String(error)));
      }
      
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
    
    // Log the diff details for debugging
    this.logger.info('PR diff fetched', {
      repositoryUrl: request.repositoryUrl,
      prNumber: request.prNumber,
      totalFiles: diff.files.length,
      changedFiles: changedFiles.length,
      totalAdditions: diff.totalAdditions,
      totalDeletions: diff.totalDeletions
    });
    
    // Determine repository characteristics
    const primaryLanguage = await this.prContextService.detectPrimaryLanguage(
      request.repositoryUrl,
      changedFiles
    );
    
    const repositorySize = await this.prContextService.estimateRepositorySize(
      request.repositoryUrl
    );

    // Create files array from diff data for agent consumption
    const files = diff.files.map(file => ({
      path: file.filename,
      content: '', // We don't have full content from GitHub API, agents will need to handle this
      diff: file.patch || '',
      previousContent: '' // Not available from basic GitHub API
    }));

    // Get repository-wide insights for agents
    const repositoryInsights = `
      Analyzing repository: ${request.repositoryUrl}
      
      IMPORTANT: Analyze the entire repository, not just the PR changes.
      - Provide insights about the overall codebase quality
      - Identify existing issues throughout the repository
      - Suggest improvements for the whole project
      - Consider the PR changes in the context of the entire codebase
      
      Repository characteristics:
      - Primary language: ${primaryLanguage}
      - Repository size: ${repositorySize}
      - Analysis mode: ${request.analysisMode}
      
      Remember: Even for small/trivial PRs, analyze the full repository and provide comprehensive recommendations.
    `;

    // Get DeepWiki summary early for context
    let deepWikiSummary;
    try {
      deepWikiSummary = await this.getDeepWikiSummary(request.repositoryUrl);
    } catch (error) {
      this.logger.warn('Failed to get DeepWiki summary in PR context extraction', { error });
    }

    // Get existing issues for context
    let existingIssues;
    try {
      existingIssues = await this.getExistingRepositoryIssues(request.repositoryUrl);
    } catch (error) {
      this.logger.warn('Failed to get existing issues in PR context extraction', { error });
    }

    return {
      repositoryUrl: request.repositoryUrl,
      prNumber: request.prNumber,
      prDetails,
      diff,
      changedFiles,
      primaryLanguage,
      repositorySize,
      analysisMode: request.analysisMode,
      baseBranch: prDetails.baseBranch,
      files, // Add the files array that agents expect
      repositoryInsights,
      deepWikiSummary,
      existingIssues
    };
  }

  /**
   * Analyze PR content to determine which agents to skip
   */
  private async analyzePRContent(prContext: PRContext): Promise<any> {
    try {
      // Convert PR context files to PRFile format
      const prFiles: PRFile[] = (prContext.files || []).map(file => ({
        filename: file.path,
        additions: file.diff ? file.diff.split('\n').filter(line => line.startsWith('+')).length : 0,
        deletions: file.diff ? file.diff.split('\n').filter(line => line.startsWith('-')).length : 0,
        changes: file.diff ? file.diff.split('\n').length : 0,
        patch: file.diff
      }));
      
      // Analyze PR content
      const analysis = await this.prContentAnalyzer.analyzePR(prFiles);
      
      this.logger.info('PR content analysis complete', {
        changeTypes: analysis.changeTypes,
        complexity: analysis.complexity,
        riskLevel: analysis.riskLevel,
        agentsToSkip: analysis.agentsToSkip,
        totalChanges: analysis.totalChanges
      });
      
      return analysis;
    } catch (error) {
      this.logger.warn('Failed to analyze PR content, proceeding with all agents', { error });
      return null; // Return null to use default agent selection
    }
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
  private async ensureFreshRepositoryAnalysis(
    repositoryUrl: string,
    prBranch?: string,
    baseBranch?: string,
    prNumber?: number,
    githubToken?: string
  ): Promise<void> {
    console.log('[DeepWiki] Triggering repository analysis for:', repositoryUrl);
    if (prBranch) {
      console.log('[DeepWiki] Using PR branch:', prBranch);
    }
    
    const jobId = await this.deepWikiManager.triggerRepositoryAnalysis(repositoryUrl, {
      branch: prBranch,
      baseBranch: baseBranch,
      includeDiff: !!prBranch && !!baseBranch,
      prNumber: prNumber,
      accessToken: githubToken
    });
    console.log('[DeepWiki] Analysis job created with ID:', jobId);
    
    // Wait for analysis completion
    console.log('[DeepWiki] Waiting for analysis completion...');
    const results = await this.deepWikiManager.waitForAnalysisCompletion(repositoryUrl);
    console.log('[DeepWiki] Analysis completed. Has results:', !!results);
    console.log('[DeepWiki] Result structure:', Object.keys(results || {}));
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
      this.logger.error('Error retrieving tool results:', { error });
      return {}; // Continue analysis without tool results if retrieval fails
    }
  }

  /**
   * Coordinate multi-agent analysis using existing enhanced executor
   */
  private async coordinateAgents(
    context: PRContext, 
    orchestratorModel: any, 
    toolResults: Record<string, AgentToolResults> = {},
    prContentAnalysis?: any
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

    // Select agents based on analysis mode and PR content analysis
    const selectedAgents = this.selectAgentsForAnalysis(context.analysisMode, prContentAnalysis);
    
    this.logger.info('Selected agents for analysis', {
      analysisMode: context.analysisMode,
      selectedAgents,
      prContentAnalysis: prContentAnalysis ? {
        riskLevel: prContentAnalysis.riskLevel,
        agentsToSkip: prContentAnalysis.agentsToSkip
      } : null
    });

    // Configure agents with repository context and tool results
    const agentConfigurations = await this.configureAgents(selectedAgents, context, toolResults);
    
    this.logger.info('Agent configurations prepared', {
      agentCount: agentConfigurations.length,
      agents: agentConfigurations.map(a => ({ type: a.type, role: a.role }))
    });

    // Create multi-agent config with agents already configured
    const multiAgentConfig = {
      name: 'PR Analysis',
      strategy: 'parallel' as any,
      agents: agentConfigurations, // Set agents before creating executor
      fallbackEnabled: true
    };

    // Create DeepWiki report retriever function with error handling
    const deepWikiReportRetriever = async (agentRole: string, requestContext: any) => {
      try {
        // Create a clean context to prevent circular references
        // Only pass primitive values
        const cleanContext = {
          repositoryId: String(requestContext.repositoryId || requestContext.repositoryUrl || ''),
          changedFiles: Array.isArray(requestContext.changedFiles) 
            ? requestContext.changedFiles.slice(0, 5).map((f: any) => String(f))
            : [],
          focusArea: String(requestContext.focusArea || agentRole),
          // Add other safe context data
          vectorConfidence: Number(requestContext.vectorConfidence || 0),
          crossRepoCount: Number(requestContext.crossRepoCount || 0),
          hasToolResults: Boolean(requestContext.hasToolResults),
          analysisMode: String(requestContext.analysisMode || 'quick')
        };
        
        // Ensure no circular references by stringifying and parsing
        const safeContext = JSON.parse(JSON.stringify(cleanContext));
        
        return await this.retrieveRelevantDeepWikiReport(agentRole, safeContext);
      } catch (error) {
        this.logger.error('Failed to retrieve DeepWiki report', { 
          agentRole, 
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined
        });
        return null; // Return null on error to prevent circular reference issues
      }
    };

    // Create enhanced multi-agent executor with properly configured agents
    const executor = new EnhancedMultiAgentExecutor(
      multiAgentConfig,
      repositoryData,
      this.vectorContextService,
      this.agentAuthenticatedUser,
      { debug: true }, // Enable debug for better logging
      toolResults,
      deepWikiReportRetriever
    );

    // Execute agents with monitoring
    const results = await executor.execute();
    
    // Monitor individual agent execution results - check different result structures
    if (results) {
      // Check if results contain agent-specific data
      const agentData = (results as any).agents || (results as any).agentResults || results;
      
      if (typeof agentData === 'object' && agentData !== null) {
        for (const [agentRole, agentResult] of Object.entries(agentData)) {
          if (typeof agentResult === 'object' && agentResult !== null) {
            const stepId = dataFlowMonitor.startStep(
              (this as any).currentSessionId || 'unknown-session',
              `${agentRole} Agent Execution`,
              {
                role: agentRole,
                hasToolResults: !!toolResults[agentRole],
                hasVectorChunks: !!(agentResult as any).vectorChunks,
                model: (agentResult as any).model || 'unknown'
              }
            );
            
            dataFlowMonitor.completeStep(stepId, {
              findings: (agentResult as any).findings?.length || 0,
              insights: (agentResult as any).insights?.length || 0,
              recommendations: (agentResult as any).recommendations?.length || 0,
              processingTime: (agentResult as any).processingTime || 0
            });
          }
        }
      }
    }

    return results;
  }

  /**
   * Process and deduplicate agent results using intelligent merging
   */
  private async processResults(agentResults: any, deepWikiData?: any): Promise<any> {
    try {
      // Extract agent results in the expected format
      const formattedResults = this.formatAgentResults(agentResults);
      
      // Check if we have any results to process
      if (!formattedResults || formattedResults.length === 0) {
        this.logger.warn('No formatted results to process');
        return {
          findings: {
            security: [],
            architecture: [],
            performance: [],
            dependencies: [],
            codeQuality: []
          },
          insights: [],
          suggestions: [],
          crossAgentPatterns: [],
          statistics: {
            totalFindings: { beforeMerge: 0, afterMerge: 0 }
          },
          deepWikiData: deepWikiData
        };
      }
      
      // Use intelligent result merger for cross-agent deduplication
      const mergedResult = await this.intelligentResultMerger.mergeResults(
        formattedResults,
        deepWikiData?.summary || deepWikiData,
        {
          crossAgentDeduplication: true,
          semanticMerging: true,
          confidenceAggregation: true,
          patternDetection: true,
          prioritization: 'severity'
        }
      );
      
      // Format merged results for downstream processing
      const processedResults = {
        findings: {
          security: mergedResult.findings.filter(f => f.category === 'security'),
          architecture: mergedResult.findings.filter(f => f.category === 'architecture'),
          performance: mergedResult.findings.filter(f => f.category === 'performance'),
          dependencies: mergedResult.findings.filter(f => f.category === 'dependencies'),
          codeQuality: mergedResult.findings.filter(f => f.category === 'codeQuality')
        },
        insights: mergedResult.insights,
        suggestions: mergedResult.suggestions,
        crossAgentPatterns: mergedResult.crossAgentPatterns,
        statistics: mergedResult.statistics,
        deepWikiData: deepWikiData // Include full DeepWiki data with chunks
      };
      
      this.logger.info('Intelligent result processing complete', {
        totalFindings: mergedResult.findings.length,
        crossAgentPatterns: mergedResult.crossAgentPatterns.length,
        deduplicationRate: mergedResult.statistics?.totalFindings?.beforeMerge > 0 
          ? `${((1 - mergedResult.statistics.totalFindings.afterMerge / mergedResult.statistics.totalFindings.beforeMerge) * 100).toFixed(1)}%`
          : '0%'
      });
      
      return processedResults;
    } catch (error) {
      this.logger.error('Failed to process results with intelligent merger', { 
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Fallback to basic processing
      try {
        const fallbackResults = await this.resultProcessor.processAgentResults(agentResults);
        return {
          ...fallbackResults,
          deepWikiData: deepWikiData
        };
      } catch (fallbackError) {
        this.logger.error('Fallback processing also failed', {
          error: fallbackError instanceof Error ? fallbackError.message : fallbackError
        });
        
        // Return empty results structure rather than failing completely
        return {
          findings: {
            security: [],
            architecture: [],
            performance: [],
            dependencies: [],
            codeQuality: []
          },
          insights: [],
          suggestions: [],
          crossAgentPatterns: [],
          statistics: {
            totalFindings: { beforeMerge: 0, afterMerge: 0 }
          },
          deepWikiData: deepWikiData
        };
      }
    }
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
  
  /**
   * Automatically select analysis mode based on PR content analysis
   */
  private selectAnalysisModeBasedOnPR(prContentAnalysis: any): 'quick' | 'comprehensive' | 'deep' {
    if (!prContentAnalysis) {
      // Default to comprehensive if no analysis available
      return 'comprehensive';
    }
    
    const { complexity, riskLevel, changeTypes, totalChanges, changedFiles } = prContentAnalysis;
    
    // Security-critical files always trigger deep analysis
    if (changeTypes?.includes('security') || this.containsSecurityFiles(changedFiles)) {
      this.logger.info('Security-critical files detected, automatically selecting deep mode', {
        riskLevel,
        changeTypes,
        totalChanges,
        securityFiles: changedFiles?.filter((f: string) => this.isSecurityFile(f))
      });
      return 'deep';
    }
    
    // High risk always triggers deep analysis
    if (riskLevel === 'high') {
      this.logger.info('High-risk PR detected, automatically selecting deep mode', {
        riskLevel,
        changeTypes,
        totalChanges
      });
      return 'deep';
    }
    
    // Complex changes with mixed types trigger deep analysis
    if (complexity === 'complex' && changeTypes.includes('mixed')) {
      this.logger.info('Complex mixed changes detected, automatically selecting deep mode', {
        complexity,
        changeTypes,
        totalChanges
      });
      return 'deep';
    }
    
    // Medium risk or moderate complexity triggers comprehensive
    if (riskLevel === 'medium' || complexity === 'moderate') {
      this.logger.info('Medium complexity detected, automatically selecting comprehensive mode', {
        riskLevel,
        complexity,
        changeTypes
      });
      return 'comprehensive';
    }
    
    // Simple changes trigger quick analysis
    if (complexity === 'trivial' && (
      changeTypes.includes('docs-only') ||
      changeTypes.includes('test-only') ||
      changeTypes.includes('style-only') ||
      changeTypes.includes('ui-only')
    )) {
      this.logger.info('Simple changes detected, automatically selecting quick mode', {
        complexity,
        changeTypes,
        totalChanges
      });
      return 'quick';
    }
    
    // Default to comprehensive for everything else
    this.logger.info('Defaulting to comprehensive mode based on PR analysis', {
      complexity,
      riskLevel,
      changeTypes,
      totalChanges
    });
    return 'comprehensive';
  }
  
  private selectAgentsForAnalysis(mode: string, prContentAnalysis?: any): string[] {
    // Start with default agents based on analysis mode
    let baseAgents: string[];
    switch (mode) {
      case 'quick': 
        baseAgents = ['security', 'codeQuality'];
        break;
      case 'comprehensive': 
        baseAgents = ['security', 'architecture', 'performance', 'codeQuality', 'dependency'];
        break;
      case 'deep': 
        baseAgents = ['security', 'architecture', 'performance', 'codeQuality', 'dependency', 'educational', 'reporting'];
        break;
      default: 
        baseAgents = ['security', 'codeQuality'];
    }
    
    // If no PR content analysis, return base agents
    if (!prContentAnalysis) {
      return baseAgents;
    }
    
    // Apply intelligent agent skipping based on PR content
    const { agentsToSkip, agentsToKeep, riskLevel } = prContentAnalysis;
    
    // For high-risk changes, ignore skipping recommendations
    if (riskLevel === 'high') {
      this.logger.info('High-risk PR detected, using all agents', { mode, baseAgents });
      return baseAgents;
    }
    
    // Filter out agents marked for skipping
    const filteredAgents = baseAgents.filter(agent => !agentsToSkip.includes(agent));
    
    // Ensure we keep at least the recommended agents
    const finalAgents = [...new Set([...filteredAgents, ...agentsToKeep])];
    
    this.logger.info('Agent selection optimized based on PR content', {
      mode,
      baseAgents,
      skipped: agentsToSkip,
      kept: agentsToKeep,
      finalAgents
    });
    
    return finalAgents;
  }

  private async configureAgents(
    agents: string[], 
    context: PRContext, 
    toolResults: Record<string, AgentToolResults> = {}
  ): Promise<any[]> {
    const configurations = [];
    
    for (let i = 0; i < agents.length; i++) {
      const agentType = agents[i];
      let config;
      let fallbackConfig;
      try {
        // Request both primary and fallback models from Vector DB
        const models = await this.modelVersionSync.findOptimalModel({
          language: context.primaryLanguage,
          sizeCategory: context.repositorySize,
          tags: [agentType]
        }, undefined, true); // includeFallback = true
        
        if (Array.isArray(models)) {
          // Got both primary and fallback
          const [primary, fallback] = models;
          config = primary;
          fallbackConfig = fallback;
          
          this.logger.info(`Found primary and fallback models for ${agentType}`, {
            primary: primary?.model,
            fallback: fallback?.model
          });
        } else if (models) {
          // Got only primary model
          config = models;
          this.logger.info(`Found only primary model for ${agentType}`, {
            model: models.model
          });
        }
      } catch (error) {
        this.logger.warn(`Failed to find optimal model for ${agentType}`, { error });
      }
      
      
      if (!config) {
        // If no config from DB and no optimal model found, request Researcher agent
        this.logger.warn(`No model configuration found for ${agentType}, requesting Researcher agent`, {
          language: context.primaryLanguage,
          sizeCategory: context.repositorySize,
          agentType
        });
        
        // Request Researcher agent to find optimal configuration
        const researcherResult = await this.requestResearcherAgent(agentType, {
          language: context.primaryLanguage,
          sizeCategory: context.repositorySize
        });
        
        if (researcherResult) {
          config = researcherResult.primary;
          fallbackConfig = researcherResult.fallback;
          this.logger.info('Researcher provided model configurations', {
            agentType,
            primary: config?.model,
            fallback: fallbackConfig?.model
          });
        } else {
          // Use emergency fallback - this should rarely happen
          this.logger.error(`Failed to get model configuration for ${agentType}, using emergency fallback`);
          config = {
            model: 'gpt-4',
            provider: 'openai',
            temperature: 0.7,
            maxTokens: 4000
          };
          fallbackConfig = {
            model: 'claude-3-haiku',
            provider: 'anthropic',
            temperature: 0.7,
            maxTokens: 4000
          };
        }
      }
      
      // The config from DB should already contain the correct provider and model
      // No need to modify it for OpenRouter - that's handled by the agent factory
      
      // Get agent-specific context including tool results
      const agentContext = this.getAgentSpecificContext(agentType, context, toolResults[agentType]);
      
      // Monitor agent data preparation
      const agentDataStepId = dataFlowMonitor.startStep(
        (this as any).currentSessionId || 'unknown-session',
        `Prepare ${agentType} Agent Data`,
        {
          agent: agentType,
          hasToolResults: !!toolResults[agentType],
          toolCount: toolResults[agentType]?.toolResults?.length || 0,
          model: (config as any)?.model || 'unknown'
        }
      );
      
      dataFlowMonitor.completeStep(agentDataStepId, {
        contextPrepared: true,
        toolResultsIncluded: !!toolResults[agentType],
        contextSize: JSON.stringify(agentContext).length
      });
      
      // Assign position based on index: first agent is PRIMARY, others are SECONDARY
      const position = i === 0 ? 'primary' : 'secondary';
      
      // All models are accessed through OpenRouter, so always use 'openai' provider
      // which has OpenRouter support built-in
      const provider = 'openai'; // Always use OpenAI provider which supports OpenRouter
      
      // Pass only necessary fields to avoid circular references
      const agentConfig = {
        model: (config as any)?.model || 'gpt-4',
        temperature: (config as any)?.temperature || 0.7,
        maxTokens: (config as any)?.maxTokens || 4000,
        useOpenRouter: true, // Ensure OpenRouter is used
        // Don't spread the entire config to avoid circular references
      };
      
      configurations.push({
        type: agentType,
        provider: provider,
        role: agentType,
        position: position,
        configuration: agentConfig,
        fallbackConfiguration: fallbackConfig ? {
          model: (fallbackConfig as any)?.model,
          temperature: (fallbackConfig as any)?.temperature || 0.7,
          maxTokens: (fallbackConfig as any)?.maxTokens || 4000,
          useOpenRouter: true
        } : undefined,
        context: agentContext,
        model: (config as any)?.model || 'gpt-4',
        temperature: (config as any)?.temperature || 0.7,
        maxTokens: (config as any)?.maxTokens || 4000,
        priority: agents.length - i // Higher priority for agents that appear first
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
    // Limit diff size to prevent stack overflow issues
    const truncatedDiff = context.diff ? 
      (context.diff.length > 10000 ? context.diff.substring(0, 10000) + '\n... (diff truncated)' : context.diff) : 
      undefined;
    
    // Extract role-specific DeepWiki data
    let roleSpecificDeepWiki = undefined;
    if (context.deepWikiSummary) {
      const deepWiki = context.deepWikiSummary;
      
      // Extract role-specific analysis and recommendations
      switch (agentType) {
        case 'security':
          roleSpecificDeepWiki = {
            analysis: deepWiki.analysis?.security || {},
            recommendations: deepWiki.recommendations?.security || [],
            insights: deepWiki.insights?.filter((i: string) => i.toLowerCase().includes('security')) || [],
            score: deepWiki.analysis?.security?.score
          };
          break;
        case 'architecture':
          roleSpecificDeepWiki = {
            analysis: deepWiki.analysis?.architecture || {},
            recommendations: deepWiki.recommendations?.architecture || [],
            insights: deepWiki.insights?.filter((i: string) => i.toLowerCase().includes('architect')) || [],
            patterns: deepWiki.patterns || []
          };
          break;
        case 'dependency':
          roleSpecificDeepWiki = {
            analysis: deepWiki.analysis?.dependencies || {},
            recommendations: deepWiki.recommendations?.dependencies || [],
            insights: deepWiki.insights?.filter((i: string) => i.toLowerCase().includes('dependen')) || []
          };
          break;
        case 'performance':
          roleSpecificDeepWiki = {
            analysis: deepWiki.analysis?.performance || {},
            recommendations: deepWiki.recommendations?.performance || [],
            insights: deepWiki.insights?.filter((i: string) => i.toLowerCase().includes('perform')) || []
          };
          break;
        case 'codeQuality':
          roleSpecificDeepWiki = {
            analysis: deepWiki.analysis?.codeQuality || {},
            recommendations: deepWiki.recommendations?.codeQuality || [],
            insights: deepWiki.insights?.filter((i: string) => i.toLowerCase().includes('quality') || i.toLowerCase().includes('maintain')) || []
          };
          break;
        default:
          roleSpecificDeepWiki = {
            summary: deepWiki.summary,
            suggestions: deepWiki.suggestions || []
          };
      }
    }
    
    const baseContext = {
      changedFiles: context.changedFiles,
      primaryLanguage: context.primaryLanguage,
      diff: truncatedDiff,
      repositoryUrl: context.repositoryUrl,
      analyzeFullRepository: true, // Enable full repository analysis
      repositoryInsights: context.repositoryInsights || 'Analyze the full repository context, not just PR changes.',
      deepWikiData: roleSpecificDeepWiki, // Role-specific DeepWiki data
      existingRepositoryIssues: context.existingIssues ? 
        (Array.isArray(context.existingIssues) ? context.existingIssues.slice(0, 10) : context.existingIssues) : 
        undefined
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
          focus: 'security vulnerabilities and patterns in both the PR changes and the entire repository',
          toolAnalysis: toolAnalysisContext || 'No recent automated security analysis available.',
          analysisScope: 'Analyze security issues in the entire repository, not just the PR changes. Look for existing vulnerabilities, insecure patterns, and provide recommendations for the whole codebase.',
          deepWikiAnalysis: roleSpecificDeepWiki // Include role-specific DeepWiki data
        };
      case 'architecture':
        return { 
          ...baseContext, 
          focus: 'architectural patterns and design quality across the entire codebase',
          toolAnalysis: toolAnalysisContext || 'No recent automated architecture analysis available.',
          analysisScope: 'Evaluate the overall architecture of the repository. Identify design patterns, architectural issues, and provide recommendations for improving the entire system architecture.',
          deepWikiAnalysis: roleSpecificDeepWiki // Include role-specific DeepWiki data
        };
      case 'dependency':
        return { 
          ...baseContext, 
          focus: 'dependency management and compliance for all project dependencies',
          toolAnalysis: toolAnalysisContext || 'No recent automated dependency analysis available.',
          analysisScope: 'Analyze all dependencies in the repository. Check for outdated packages, security vulnerabilities, license compliance issues, and provide upgrade recommendations.',
          deepWikiAnalysis: roleSpecificDeepWiki // Include role-specific DeepWiki data
        };
      case 'performance':
        return { 
          ...baseContext, 
          focus: 'performance implications and optimizations throughout the codebase',
          toolAnalysis: 'No automated performance tools currently configured.',
          analysisScope: 'Identify performance bottlenecks and optimization opportunities across the entire repository. Look for inefficient algorithms, resource leaks, and areas for performance improvement.',
          deepWikiAnalysis: roleSpecificDeepWiki // Include role-specific DeepWiki data
        };
      case 'codeQuality':
        return { 
          ...baseContext, 
          focus: 'code quality and maintainability across the entire project',
          toolAnalysis: 'No automated code quality tools currently configured.',
          analysisScope: 'Assess code quality throughout the repository. Identify code smells, maintainability issues, testing gaps, and provide recommendations for improving overall code quality.',
          deepWikiAnalysis: roleSpecificDeepWiki // Include role-specific DeepWiki data
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
    }, 0) as number;
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
   * Request Researcher agent to find optimal model configuration
   * @param agentType Agent type/role
   * @param context Repository context
   * @returns Model configuration with primary and fallback or null
   */
  private async requestResearcherAgent(
    agentType: string,
    context: {
      language: string;
      sizeCategory: RepositorySizeCategory;
    }
  ): Promise<{ primary: any; fallback: any } | null> {
    try {
      this.logger.info('Requesting Researcher agent for model configuration', {
        agentType,
        language: context.language,
        sizeCategory: context.sizeCategory
      });
      
      // Get role-specific cost weights and capability priorities
      const roleWeights = this.getRoleSpecificWeights(agentType);
      
      // TODO: Implement actual Researcher agent request
      // The Researcher agent should:
      // 1. Load existing template for the agent role
      // 2. Apply role-specific cost weights and capability priorities
      // 3. Test various models based on:
      //    - Language compatibility
      //    - Repository size requirements
      //    - Role-specific capabilities (e.g., security needs high reasoning)
      //    - Cost constraints based on role weights
      // 4. Select primary model (best overall score)
      // 5. Select fallback model (second best, preferably different provider)
      // 6. Store both configurations in model_configurations table
      // 7. Return both configurations
      
      // Example of what Researcher should do:
      // const researcherPrompt = await loadPromptTemplate(`researcher_${agentType}_template`);
      // const models = await testModelsForContext(context, roleWeights);
      // const [primary, fallback] = selectOptimalModels(models);
      // await storeInVectorDB(agentType, context, primary, fallback);
      
      this.logger.warn('Researcher agent not yet implemented, using fallback');
      return null;
    } catch (error) {
      this.logger.error('Error requesting Researcher agent', {
        agentType,
        context,
        error
      });
      return null;
    }
  }
  
  /**
   * Get role-specific weights for model selection
   * @param role Agent role
   * @returns Weights for capabilities and cost
   */
  private getRoleSpecificWeights(role: string): any {
    // Role-specific weights already defined in the system
    const roleWeights: Record<string, any> = {
      security: {
        capabilities: { codeQuality: 0.3, reasoning: 0.4, detailLevel: 0.2, speed: 0.1 },
        costWeight: 0.2 // Lower cost weight, prioritize quality
      },
      architecture: {
        capabilities: { reasoning: 0.4, detailLevel: 0.3, codeQuality: 0.2, speed: 0.1 },
        costWeight: 0.25
      },
      performance: {
        capabilities: { speed: 0.3, codeQuality: 0.3, reasoning: 0.2, detailLevel: 0.2 },
        costWeight: 0.3
      },
      codeQuality: {
        capabilities: { codeQuality: 0.4, detailLevel: 0.3, reasoning: 0.2, speed: 0.1 },
        costWeight: 0.35
      },
      dependency: {
        capabilities: { speed: 0.4, codeQuality: 0.3, reasoning: 0.2, detailLevel: 0.1 },
        costWeight: 0.4 // Higher cost weight, can use cheaper models
      },
      educational: {
        capabilities: { detailLevel: 0.4, reasoning: 0.3, codeQuality: 0.2, speed: 0.1 },
        costWeight: 0.2
      },
      reporter: {
        capabilities: { speed: 0.4, detailLevel: 0.3, reasoning: 0.2, codeQuality: 0.1 },
        costWeight: 0.35
      },
      orchestrator: {
        capabilities: { reasoning: 0.4, speed: 0.3, codeQuality: 0.2, detailLevel: 0.1 },
        costWeight: 0.15 // Orchestrator needs high quality
      }
    };
    
    return roleWeights[role] || {
      capabilities: { codeQuality: 0.25, reasoning: 0.25, detailLevel: 0.25, speed: 0.25 },
      costWeight: 0.3
    };
  }

  /**
   * Convert API AuthenticatedUser to Agent AuthenticatedUser
   */
  private convertToAgentUser(apiUser: AuthenticatedUser): AgentAuthenticatedUser {
    // Create user permissions structure expected by agents package
    // For API users, grant broad read access to public repositories
    const permissions: UserPermissions = {
      repositories: {
        // Grant full read access for API users
        '*': {
          read: true,
          write: false,
          admin: false
        },
        // Also add specific common repositories
        'facebook/react': {
          read: true,
          write: false,
          admin: false
        },
        'vuejs/vue': {
          read: true,
          write: false,
          admin: false
        },
        'angular/angular': {
          read: true,
          write: false,
          admin: false  
        }
      },
      organizations: apiUser.organizationId ? [apiUser.organizationId] : ['public'],
      globalPermissions: apiUser.permissions || ['api_access', 'read_public_repos'],
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
        token: apiUser.session?.token || 'api-key-auth',
        expiresAt: apiUser.session?.expiresAt || new Date(Date.now() + 3600000), // 1 hour from now
        fingerprint: 'api-session',
        ipAddress: '127.0.0.1',
        userAgent: 'CodeQual API'
      },
      role,
      status
    };
  }

  /**
   * Create RAG service for VectorContextService
   */
  private createRAGService(): any {
    const logger = this.logger;
    
    try {
      // Import and create AuthenticatedVectorService
      const { AuthenticatedVectorService } = require('@codequal/core/services/vector-db/authenticated-vector-service');
      const authenticatedVectorService = new AuthenticatedVectorService();
      
      // Return an object with the search method for compatibility
      return {
        search: async (options: any) => {
          return authenticatedVectorService.searchDocuments({
            userId: this.authenticatedUser.id,
            query: options.query || '',
            repositoryId: options.repositoryId,
            contentType: options.contentType,
            language: options.language,
            minImportance: options.minSimilarity || 0.7,
            includeOrganization: true,
            includePublic: true,
            limit: options.limit || 10
          });
        },
        searchDocuments: authenticatedVectorService.searchDocuments.bind(authenticatedVectorService),
        supabase: authenticatedVectorService['supabase'] // Access private property for compatibility
      };
    } catch (error) {
      logger.error('Failed to create AuthenticatedVectorService', { error });
      
      // Fallback to mock implementation
      return {
        search: async () => [],
        searchDocuments: async () => [],
        supabase: {
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
  }

  /**
   * Create Vector Storage service for tool result retrieval
   */
  private createVectorStorageService(): VectorStorageService {
    const logger = this.logger;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      logger.warn('Supabase credentials not configured, using limited Vector Storage service');
      return {
        searchByMetadata: async () => [],
        storeChunks: async () => {},
        deleteChunksBySource: async () => 0,
      } as any;
    }

    // Create actual Vector Storage service connected to Supabase
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    return {
      searchByMetadata: async (criteria: any, options: any) => {
        try {
          logger.debug('Vector Storage: searching with criteria:', criteria);
          
          // Build query based on criteria
          let query = supabase.from('vector_chunks').select('*');
          
          if (criteria.repository_id) {
            query = query.eq('repository_id', criteria.repository_id);
          }
          if (criteria.analysis_type) {
            query = query.eq('analysis_type', criteria.analysis_type);
          }
          if (criteria.tool_name) {
            query = query.eq('tool_name', criteria.tool_name);
          }
          
          // Apply limit and ordering
          query = query.order('created_at', { ascending: false })
                      .limit(options?.limit || 20);
          
          const { data, error } = await query;
          
          if (error) {
            logger.error('Vector search error:', error);
            return [];
          }
          
          logger.info(`Vector Storage: found ${data?.length || 0} results`);
          return data || [];
        } catch (error) {
          const errorData: LoggableData = error instanceof Error 
            ? error 
            : { message: String(error) };
          logger.error('Vector Storage service error:', errorData);
          return [];
        }
      },
      storeChunks: async (chunks: any[]) => {
        try {
          const { data, error } = await supabase
            .from('vector_chunks')
            .insert(chunks);
          
          if (error) {
            logger.error('Error storing chunks:', error);
          }
          return data;
        } catch (error) {
          const errorData: LoggableData = error instanceof Error 
            ? error 
            : { message: String(error) };
          logger.error('Store chunks error:', errorData);
        }
      },
      deleteChunksBySource: async (sourceId: string) => {
        try {
          const { data, error } = await supabase
            .from('vector_chunks')
            .delete()
            .eq('source_id', sourceId);
          
          if (error) {
            logger.error('Error deleting chunks:', error);
            return 0;
          }
          return data?.length || 0;
        } catch (error) {
          const errorData: LoggableData = error instanceof Error 
            ? error 
            : { message: String(error) };
          logger.error('Delete chunks error:', errorData);
          return 0;
        }
      },
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
   * Safe JSON stringify that handles circular references
   */
  private safeStringify(obj: any, maxLength = 500): string {
    const seen = new WeakSet();
    try {
      const result = JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular Reference]';
          }
          seen.add(value);
        }
        return value;
      }, 2);
      return result.substring(0, maxLength);
    } catch (error) {
      return `[Unable to stringify: ${error instanceof Error ? error.message : 'Unknown error'}]`;
    }
  }

  /**
   * Format agent results for intelligent merger
   */
  private formatAgentResults(agentResults: any): any[] {
    if (!agentResults) return [];
    
    // Log the structure to understand what we're getting
    this.logger.info('Agent results structure:', {
      type: typeof agentResults,
      isArray: Array.isArray(agentResults),
      keys: Object.keys(agentResults || {}),
      hasResults: !!agentResults.results,
      hasAggregatedInsights: !!agentResults.aggregatedInsights,
      hasAgentResults: !!agentResults.agentResults
    });
    
    // Handle different result formats
    let results = [];
    
    // Check if agentResults itself is an array
    if (Array.isArray(agentResults)) {
      results = agentResults;
    } else if (agentResults.results && typeof agentResults.results === 'object' && !Array.isArray(agentResults.results)) {
      // Handle the MultiAgentResult format from enhanced executor
      // results is an object with agent IDs as keys
      results = Object.entries(agentResults.results).map(([agentId, result]: [string, any]) => ({
        agentId,
        ...result
      }));
    } else if (agentResults.results && Array.isArray(agentResults.results)) {
      results = agentResults.results;
    } else if (agentResults.combinedResult?.aggregatedInsights && Array.isArray(agentResults.combinedResult.aggregatedInsights)) {
      // Handle MCP coordinated results
      results = agentResults.combinedResult.aggregatedInsights;
    } else if (agentResults.aggregatedInsights && Array.isArray(agentResults.aggregatedInsights)) {
      results = agentResults.aggregatedInsights;
    } else if (agentResults.agentResults) {
      // Handle the case where results are in agentResults property
      results = Object.values(agentResults.agentResults);
    } else {
      this.logger.warn('Unable to extract results array from agent results', {
        structure: this.safeStringify(agentResults)
      });
      return [];
    }
    
    return results.map((result: any) => {
      // Extract findings from various formats
      let findings: any[] = [];
      
      // Direct findings
      if (result.findings) {
        findings = Array.isArray(result.findings) ? result.findings : [];
      }
      
      // Result.result.findings (nested format)
      if (result.result?.findings) {
        for (const [category, categoryFindings] of Object.entries(result.result.findings)) {
          if (Array.isArray(categoryFindings)) {
            findings.push(...categoryFindings.map((f: any) => ({
              ...f,
              category: f.category || category
            })));
          }
        }
      }
      
      return {
        agentId: result.agentId || `${result.agentConfig?.provider}-${result.agentConfig?.role}` || `${result.config?.provider}-${result.config?.role}`,
        agentRole: result.agentConfig?.role || result.config?.role || result.agentRole || 'unknown',
        findings,
        insights: result.result?.insights || result.insights || [],
        suggestions: result.result?.suggestions || result.suggestions || [],
        educational: result.result?.educational || result.educational || [],
        metadata: result.result?.metadata || result.metadata,
        deduplicationResult: result.deduplicationStats
      };
    });
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
   * Group DeepWiki chunks by analysis type for better organization
   */
  private groupDeepWikiChunks(chunks: any[], agentRole: string): any {
    const grouped = {
      summary: '',
      patterns: [] as string[],
      recommendations: [] as string[],
      historicalContext: [] as string[]
    };

    // Sort chunks by relevance score
    const sortedChunks = chunks.sort((a, b) => b.score - a.score);

    // Extract key insights based on chunk metadata
    sortedChunks.forEach(chunk => {
      const content = chunk.content;
      const metadata: any = chunk.metadata || {};

      // Categorize based on content type
      if (metadata.analysis_type === 'code_patterns' || content.includes('pattern')) {
        grouped.patterns.push(content);
      } else if (metadata.analysis_type === 'best_practices' || content.includes('recommend')) {
        grouped.recommendations.push(content);
      } else if (metadata.created_at && new Date(metadata.created_at) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) {
        grouped.historicalContext.push(content);
      }
    });

    // Create a summary from top chunks
    grouped.summary = sortedChunks
      .slice(0, 3)
      .map(chunk => chunk.content)
      .join('\n\n');

    return grouped;
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

      // Query Vector DB for relevant DeepWiki chunks
      // Limit the changedFiles to prevent stack overflow
      const limitedFiles = requestContext.changedFiles?.slice(0, 5) || [];
      const searchQuery = `${agentRole} analysis ${limitedFiles.join(' ')}`.trim();
      
      const vectorResults = await this.vectorContextService.getCrossRepositoryPatterns(
        agentRole as any,
        searchQuery,
        this.agentAuthenticatedUser,
        {
          maxResults: 10,
          respectUserPermissions: true,
          sanitizeContent: true,
          anonymizeMetadata: true,
          excludeRepositoryId: undefined
        }
      );

      // Extract and format relevant chunks
      const relevantChunks = vectorResults.map(result => ({
        content: result.content,
        score: result.similarity_score,
        metadata: result.metadata
      }));

      // Group chunks by analysis type
      const groupedAnalysis = this.groupDeepWikiChunks(relevantChunks, agentRole);

      // If we have actual DeepWiki data, use it; otherwise fall back to mock
      if (relevantChunks.length > 0) {
        return {
          [agentRole]: groupedAnalysis.summary,
          chunks: relevantChunks,
          patterns: groupedAnalysis.patterns,
          recommendations: groupedAnalysis.recommendations,
          historicalContext: groupedAnalysis.historicalContext,
          summary: `DeepWiki analysis found ${relevantChunks.length} relevant insights for ${agentRole} analysis.`
        };
      }

      // Fallback to mock data if no DeepWiki chunks found
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
      console.log('[DeepWiki] Getting DeepWiki summary for:', repositoryUrl);
      
      // First, check if we have a completed DeepWiki analysis
      const hasAnalysis = await this.deepWikiManager.checkRepositoryExists(repositoryUrl);
      console.log('[DeepWiki] Repository exists in DeepWiki:', hasAnalysis);
      
      // Query Vector DB for DeepWiki chunks regardless
      const repositoryId = this.extractRepositoryId(repositoryUrl);
      console.log('[DeepWiki] Querying Vector DB for chunks...');
      const deepWikiChunks = await this.vectorContextService.getCrossRepositoryPatterns(
        'orchestrator' as any, // Using orchestrator role for general queries
        'repository analysis summary insights patterns deepwiki',
        this.agentAuthenticatedUser,
        {
          maxResults: 20,
          respectUserPermissions: true,
          sanitizeContent: true,
          anonymizeMetadata: true,
          excludeRepositoryId: undefined
        }
      );

      // Extract insights from chunks
      const suggestions: string[] = [];
      const insights: string[] = [];
      const patterns: string[] = [];
      
      deepWikiChunks.forEach(chunk => {
        const content = chunk.content;
        const metadata: any = chunk.metadata || {};
        
        if (metadata.analysis_type === 'key_insights' || content.includes('insight')) {
          insights.push(content);
        } else if (metadata.analysis_type === 'code_patterns' || content.includes('pattern')) {
          patterns.push(content);
        } else if (content.includes('suggest') || content.includes('recommend')) {
          suggestions.push(content);
        }
      });

      console.log('[DeepWiki] Found chunks:', deepWikiChunks.length);
      console.log('[DeepWiki] Suggestions:', suggestions.length, 'Insights:', insights.length, 'Patterns:', patterns.length);

      // If we have stored analysis results, merge them
      let analysisData = {};
      if (hasAnalysis) {
        try {
          console.log('[DeepWiki] Retrieving full analysis report...');
          const deepWikiReport = await this.deepWikiManager.waitForAnalysisCompletion(repositoryUrl);
          console.log('[DeepWiki] Full report retrieved:', !!deepWikiReport);
          console.log('[DeepWiki] Report keys:', Object.keys(deepWikiReport || {}));
          analysisData = deepWikiReport.analysis || {};
          console.log('[DeepWiki] Analysis sections:', Object.keys(analysisData));
        } catch (e) {
          console.log('[DeepWiki] Could not retrieve stored DeepWiki analysis, using chunks only:', e);
        }
      }

      return {
        suggestions: suggestions.slice(0, 5), // Top 5 suggestions
        insights: insights.slice(0, 10), // Top 10 insights
        patterns: patterns.slice(0, 5), // Top 5 patterns
        summary: deepWikiChunks.length > 0 
          ? `DeepWiki analysis found ${deepWikiChunks.length} relevant insights across ${new Set(deepWikiChunks.map(c => c.metadata?.analysis_type)).size} categories`
          : 'No DeepWiki analysis available',
        metrics: {
          totalChunks: deepWikiChunks.length,
          avgConfidence: deepWikiChunks.reduce((sum, c) => sum + c.similarity_score, 0) / (deepWikiChunks.length || 1)
        },
        analysis: analysisData,
        chunks: deepWikiChunks, // Include raw chunks for transparency
        // Extract structured recommendations from analysis data
        recommendations: {
          architecture: (analysisData as any)?.architecture?.recommendations || [],
          security: (analysisData as any)?.security?.recommendations || [],
          performance: (analysisData as any)?.performance?.recommendations || [],
          codeQuality: (analysisData as any)?.codeQuality?.recommendations || [],
          dependencies: (analysisData as any)?.dependencies?.recommendations || []
        }
      };
    } catch (error) {
      console.error('Error retrieving DeepWiki summary:', error);
      return {
        suggestions: [],
        insights: [],
        patterns: [],
        summary: 'DeepWiki analysis failed',
        chunks: []
      };
    }
  }

  /**
   * Track skill development based on PR analysis
   */
  private async trackSkillDevelopment(
    processedResults: any,
    recommendationModule: any,
    compiledEducationalData: any,
    prContext: PRContext,
    authenticatedUser: AuthenticatedUser
  ): Promise<void> {
    try {
      // Convert to agent authenticated user for skill tracking
      const agentUser = this.convertToAgentUser(authenticatedUser);
      const skillTracker = new SkillTrackingService(agentUser);
      
      // Get existing repository issues from DeepWiki data
      const existingRepoIssues = await this.getExistingRepositoryIssues(prContext.repositoryUrl);
      
      // Detect which issues were fixed in this PR
      const issueResolutionDetector = new IssueResolutionDetector();
      const { fixedIssues, newIssues, unchangedIssues } = issueResolutionDetector.detectFixedIssues(
        processedResults,
        existingRepoIssues,
        prContext.repositoryUrl,
        prContext.prNumber
      );
      
      // Track fixed issues for skill points
      if (fixedIssues.length > 0) {
        const fixedIssuesForTracking = fixedIssues.map((issue: any) => ({
          issueId: issue.issueId,
          category: issue.category,
          severity: issue.severity,
          repository: issue.repository,
          prNumber: prContext.prNumber
        }));
        
        await skillTracker.trackRepoIssueResolution(fixedIssuesForTracking);
        
        this.logger.info('Tracked issue resolutions', {
          fixedCount: fixedIssues.length,
          repository: prContext.repositoryUrl,
          prNumber: prContext.prNumber
        });
      }
      
      // Apply degradation for unresolved repository issues
      if (unchangedIssues.length > 0) {
        const unresolvedIssuesForDegradation = unchangedIssues.map((issue: any) => ({
          issueId: issue.issueId,
          category: issue.category,
          severity: issue.severity,
          repository: issue.repository
        }));
        
        const totalDegradation = await skillTracker.applyRepoIssueDegradation(unresolvedIssuesForDegradation);
        
        this.logger.info('Applied skill degradation for unresolved issues', {
          unresolvedCount: unchangedIssues.length,
          totalDegradation,
          repository: prContext.repositoryUrl
        });
      }
      
      // Prepare PR metadata
      const prMetadata = {
        prNumber: prContext.prNumber,
        repository: prContext.repositoryUrl,
        filesChanged: prContext.changedFiles.length,
        linesChanged: this.estimateLinesChanged(prContext),
        complexity: this.calculatePRComplexity(processedResults, prContext)
      };
      
      // Assess skills from PR analysis with existing repo issues context
      const skillAssessments = await skillTracker.assessSkillsFromPR(
        {
          security: processedResults.findings?.security || [],
          codeQuality: processedResults.findings?.codeQuality || [],
          architecture: processedResults.findings?.architecture || [],
          performance: processedResults.findings?.performance || [],
          dependencies: processedResults.findings?.dependencies || []
        },
        prMetadata,
        existingRepoIssues
      );
      
      // Update skills based on assessments
      await skillTracker.updateSkillsFromAssessments(skillAssessments);
      
      // Track educational engagement if user viewed educational content
      if (compiledEducationalData?.educational?.learningPath?.steps?.length > 0) {
        const engagement = {
          educationalContentId: `pr-${prContext.prNumber}-education`,
          engagementType: 'viewed' as const,
          skillsTargeted: this.extractTargetedSkills(compiledEducationalData),
          improvementObserved: false, // Will be determined in future analyses
          timestamp: new Date()
        };
        
        await skillTracker.trackLearningEngagement(engagement);
      }
      
      this.logger.info('Skill tracking completed', {
        userId: authenticatedUser.id,
        prNumber: prContext.prNumber,
        assessmentsCount: skillAssessments.length,
        hasEducationalContent: compiledEducationalData?.educational ? true : false
      });
      
    } catch (error) {
      // Log error but don't fail the analysis
      this.logger.error('Failed to track skill development', {
        error: error instanceof Error ? error.message : error,
        userId: authenticatedUser.id,
        prNumber: prContext.prNumber
      });
    }
  }
  
  private estimateLinesChanged(prContext: PRContext): number {
    // Estimate based on file count and diff size if available
    const filesChanged = prContext.changedFiles.length;
    return filesChanged * 50; // Rough estimate
  }
  
  private calculatePRComplexity(processedResults: any, prContext: PRContext): number {
    // Calculate complexity based on findings and file changes
    const totalFindings = this.countTotalFindings(processedResults);
    const filesChanged = prContext.changedFiles.length;
    const criticalFindings = processedResults.findings?.security?.filter((f: any) => 
      f.severity === 'critical' || f.severity === 'high'
    ).length || 0;
    
    // Simple complexity calculation (1-10 scale)
    const complexity = Math.min(10, Math.round(
      (filesChanged / 5) + 
      (totalFindings / 10) + 
      (criticalFindings * 2)
    ));
    
    return Math.max(1, complexity);
  }
  
  /**
   * Get existing repository issues from DeepWiki or other sources
   */
  private async getExistingRepositoryIssues(repositoryUrl: string): Promise<{
    security?: any[];
    codeQuality?: any[];
    architecture?: any[];
    performance?: any[];
    dependencies?: any[];
  }> {
    try {
      // Get DeepWiki data which should contain existing issues
      const deepWikiData = await this.getDeepWikiSummary(repositoryUrl);
      
      // Extract existing issues from DeepWiki analysis
      const existingIssues = {
        security: deepWikiData.analysis?.security?.vulnerabilities || [],
        codeQuality: deepWikiData.analysis?.codeQuality?.issues || [],
        architecture: deepWikiData.analysis?.architecture?.issues || [],
        performance: deepWikiData.analysis?.performance?.issues || [],
        dependencies: deepWikiData.analysis?.dependencies?.vulnerabilities || []
      };
      
      // Also check if we have stored analysis results in Vector DB
      const repositoryId = this.extractRepositoryId(repositoryUrl);
      const toolResults = await this.retrieveToolResults(repositoryUrl);
      
      // Merge with tool results if available
      if (toolResults.security?.toolResults) {
        existingIssues.security = [...existingIssues.security, ...toolResults.security.toolResults];
      }
      if (toolResults.codeQuality?.toolResults) {
        existingIssues.codeQuality = [...existingIssues.codeQuality, ...toolResults.codeQuality.toolResults];
      }
      
      this.logger.info('Retrieved existing repository issues', {
        repository: repositoryUrl,
        securityCount: existingIssues.security.length,
        codeQualityCount: existingIssues.codeQuality.length,
        architectureCount: existingIssues.architecture.length,
        performanceCount: existingIssues.performance.length,
        dependenciesCount: existingIssues.dependencies.length
      });
      
      return existingIssues;
    } catch (error) {
      this.logger.error('Failed to get existing repository issues', {
        repository: repositoryUrl,
        error: error instanceof Error ? error.message : error
      });
      // Return empty issues if retrieval fails
      return {};
    }
  }
  
  private extractTargetedSkills(compiledEducationalData: any): string[] {
    const skills = new Set<string>();
    
    // Extract from skill gaps
    const skillGaps = compiledEducationalData?.educational?.insights?.skillGaps || [];
    skillGaps.forEach((gap: any) => {
      if (gap.skill) {
        // Map skill names to categories
        const categoryMap: Record<string, string> = {
          'security': 'security',
          'architecture': 'architecture',
          'performance': 'performance',
          'code quality': 'codeQuality',
          'maintainability': 'codeQuality',
          'dependency': 'dependencies'
        };
        
        const skill = gap.skill.toLowerCase();
        for (const [key, value] of Object.entries(categoryMap)) {
          if (skill.includes(key)) {
            skills.add(value);
            break;
          }
        }
      }
    });
    
    // Extract from learning path topics
    const learningPath = compiledEducationalData?.educational?.learningPath;
    if (learningPath?.steps) {
      learningPath.steps.forEach((step: any) => {
        const topic = (step.topic || '').toLowerCase();
        if (topic.includes('security')) skills.add('security');
        if (topic.includes('architecture') || topic.includes('design')) skills.add('architecture');
        if (topic.includes('performance')) skills.add('performance');
        if (topic.includes('quality') || topic.includes('clean')) skills.add('codeQuality');
      });
    }
    
    return Array.from(skills);
  }

  /**
   * Store standardized report in Vector DB for retrieval
   */
  private async storeReportInSupabase(
    report: StandardReport,
    authenticatedUser: AuthenticatedUser
  ): Promise<string> {
    this.logger.info('🗄️ Starting Vector DB chunked storage', {
      reportId: report.id,
      repositoryUrl: report.repositoryUrl,
      startTime: new Date().toISOString()
    });
    
    try {
      // Step 1: Store report ID mapping for retrieval
      this.logger.info('📍 Storing report ID mapping', {
        reportId: report.id,
        repositoryUrl: report.repositoryUrl
      });
      
      await reportIdMappingService.storeMapping(
        report.id,
        report.repositoryUrl,
        report.prNumber,
        authenticatedUser.id
      );
      
      // Step 2: Create chunked analysis results for Vector DB
      const analysisChunks = this.createReportChunks(report);
      
      this.logger.info('🔄 Storing chunked report in Vector DB', {
        repositoryUrl: report.repositoryUrl,
        chunkCount: analysisChunks.length,
        chunkTypes: analysisChunks.map(c => c.metadata.contentType)
      });
      
      // Store all chunks in Vector DB
      await this.vectorContextService.storeAnalysisResults(
        report.repositoryUrl,
        analysisChunks,
        authenticatedUser.id
      );
      
      this.logger.info('✅ Vector DB storage completed', {
        reportId: report.id,
        repositoryUrl: report.repositoryUrl,
        chunks: analysisChunks.length
      });
      
      // Report is already stored in temporary storage (done above)
      
      return report.id;
    } catch (error) {
      this.logger.error('❌ Error storing report in Vector DB', { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        reportId: report.id,
        timestamp: new Date().toISOString()
      });
      
      // Report is already stored in temporary storage (done in storeReportInSupabase)
      this.logger.info('Report available in temporary memory storage', { reportId: report.id });
      
      // Don't fail the entire analysis if storage fails
      // The report is still available in the response
      // Return the report ID even if storage fails
      return report.id;
    }
  }
  
  /**
   * Create chunked analysis results for Vector DB storage
   * Each chunk is optimized for specific agent roles
   */
  private createReportChunks(report: StandardReport): any[] {
    const chunks: any[] = [];
    const baseMetadata = {
      reportId: report.id,
      prNumber: report.prNumber,
      timestamp: report.timestamp,
      repositoryUrl: report.repositoryUrl,
      analysisMode: report.metadata?.analysisMode || 'comprehensive'
    };
    
    // Chunk 1: Full report for orchestrator and general retrieval
    chunks.push({
      repositoryUrl: report.repositoryUrl,
      analysis: {
        reportId: report.id,
        fullReport: report,
        contentType: 'full_report'
      },
      metadata: {
        ...baseMetadata,
        contentType: 'full_report',
        agentRole: 'orchestrator',
        searchTerms: ['full report', 'complete analysis', 'overview']
      }
    });
    
    // Chunk 2: Overview and summary for orchestrator
    chunks.push({
      repositoryUrl: report.repositoryUrl,
      analysis: {
        reportId: report.id,
        overview: report.overview,
        executiveSummary: report.overview.executiveSummary,
        decision: (report.overview as any).decision || { status: 'PENDING', confidence: 0 },
        contentType: 'analysis_overview'
      },
      metadata: {
        ...baseMetadata,
        contentType: 'analysis_overview',
        agentRole: 'orchestrator',
        searchTerms: ['summary', 'overview', 'decision', 'executive summary']
      }
    });
    
    // Chunk 3: Security findings
    const securityFindings = report.modules?.findings?.categories?.security;
    if (securityFindings) {
      chunks.push({
        repositoryUrl: report.repositoryUrl,
        analysis: {
          reportId: report.id,
          findings: securityFindings.findings,
          summary: securityFindings.summary,
          score: (securityFindings as any).score || 0,
          contentType: 'security_analysis'
        },
        metadata: {
          ...baseMetadata,
          contentType: 'security_analysis',
          agentRole: 'security',
          searchTerms: ['security', 'vulnerability', 'authentication', 'authorization', 'compliance']
        }
      });
    }
    
    // Chunk 4: Performance findings
    const performanceFindings = report.modules?.findings?.categories?.performance;
    if (performanceFindings) {
      chunks.push({
        repositoryUrl: report.repositoryUrl,
        analysis: {
          reportId: report.id,
          findings: performanceFindings.findings,
          summary: performanceFindings.summary,
          score: (performanceFindings as any).score || 0,
          contentType: 'performance_analysis'
        },
        metadata: {
          ...baseMetadata,
          contentType: 'performance_analysis',
          agentRole: 'performance',
          searchTerms: ['performance', 'optimization', 'bottleneck', 'latency', 'throughput']
        }
      });
    }
    
    // Chunk 5: Code quality findings
    const codeQualityFindings = report.modules?.findings?.categories?.codeQuality;
    if (codeQualityFindings) {
      chunks.push({
        repositoryUrl: report.repositoryUrl,
        analysis: {
          reportId: report.id,
          findings: codeQualityFindings.findings,
          summary: codeQualityFindings.summary,
          score: (codeQualityFindings as any).score || 0,
          contentType: 'code_quality_analysis'
        },
        metadata: {
          ...baseMetadata,
          contentType: 'code_quality_analysis',
          agentRole: 'codeQuality',
          searchTerms: ['code quality', 'complexity', 'maintainability', 'technical debt', 'code smell']
        }
      });
    }
    
    // Chunk 6: Dependencies findings
    const dependencyFindings = report.modules?.findings?.categories?.dependencies;
    if (dependencyFindings) {
      chunks.push({
        repositoryUrl: report.repositoryUrl,
        analysis: {
          reportId: report.id,
          findings: dependencyFindings.findings,
          summary: dependencyFindings.summary,
          score: (dependencyFindings as any).score || 0,
          contentType: 'dependency_analysis'
        },
        metadata: {
          ...baseMetadata,
          contentType: 'dependency_analysis',
          agentRole: 'dependency',
          searchTerms: ['dependency', 'package', 'version', 'vulnerability', 'license']
        }
      });
    }
    
    // Chunk 7: Architecture findings
    const architectureFindings = report.modules?.findings?.categories?.architecture;
    if (architectureFindings) {
      chunks.push({
        repositoryUrl: report.repositoryUrl,
        analysis: {
          reportId: report.id,
          findings: architectureFindings.findings,
          summary: architectureFindings.summary,
          score: (architectureFindings as any).score || 0,
          contentType: 'architecture_analysis'
        },
        metadata: {
          ...baseMetadata,
          contentType: 'architecture_analysis',
          agentRole: 'architecture',
          searchTerms: ['architecture', 'design', 'pattern', 'structure', 'modularity']
        }
      });
    }
    
    // Chunk 8: Recommendations
    if (report.modules?.recommendations) {
      chunks.push({
        repositoryUrl: report.repositoryUrl,
        analysis: {
          reportId: report.id,
          recommendations: report.modules.recommendations,
          contentType: 'recommendations'
        },
        metadata: {
          ...baseMetadata,
          contentType: 'recommendations',
          agentRole: 'orchestrator',
          searchTerms: ['recommendations', 'improvements', 'suggestions', 'next steps']
        }
      });
    }
    
    // Chunk 9: Educational content
    if (report.modules?.educational || (report.modules as any)?.educationalContent) {
      chunks.push({
        repositoryUrl: report.repositoryUrl,
        analysis: {
          reportId: report.id,
          educational: report.modules.educational || (report.modules as any).educationalContent,
          contentType: 'educational_content'
        },
        metadata: {
          ...baseMetadata,
          contentType: 'educational_content',
          agentRole: 'educational',
          searchTerms: ['learning', 'education', 'skills', 'training', 'resources']
        }
      });
    }
    
    return chunks;
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

  /**
   * Check if any of the files are security-related
   */
  private containsSecurityFiles(files?: string[]): boolean {
    if (!files || files.length === 0) return false;
    return files.some(file => this.isSecurityFile(file));
  }

  /**
   * Check if a file is security-related based on its path
   */
  private isSecurityFile(filePath: string): boolean {
    const securityPatterns = [
      /auth/i,
      /security/i,
      /crypto/i,
      /password/i,
      /token/i,
      /session/i,
      /jwt/i,
      /oauth/i,
      /api[_-]?key/i,
      /secret/i,
      /credential/i,
      /\.env/,
      /private[_-]?key/i,
      /public[_-]?key/i,
      /certificate/i,
      /ssl/i,
      /tls/i
    ];
    
    return securityPatterns.some(pattern => pattern.test(filePath));
  }
}
