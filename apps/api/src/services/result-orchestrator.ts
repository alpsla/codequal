/* eslint-disable no-console */
import { AuthenticatedUser } from '../middleware/auth-middleware';

// Type definitions for findings and recommendations
export interface Finding {
  id?: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  file?: string;
  line?: number;
  column?: number;
  impact?: string;
  recommendation?: string;
  tool?: string;
  metadata?: Record<string, unknown>;
  ruleId?: string;
  message?: string;
  type?: string;
  agent?: string;
  confidence?: number;
}

export interface Recommendation {
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  effort: 'low' | 'medium' | 'high';
  impact: 'critical' | 'high' | 'medium' | 'low';
  implementation?: string;
}

export interface EducationalItem {
  topic: string;
  content: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  resources?: Array<{ title: string; url: string; type: string }>;
  examples?: string[];
  relatedFindings?: string[];
}

export interface PRDetails {
  number: number;
  title: string;
  body?: string;
  description?: string;
  author?: string;
  user?: { login: string; id?: number };
  created_at?: string;
  updated_at?: string;
  base?: { ref: string; sha: string };
  head?: { ref: string; sha: string };
  state?: 'open' | 'closed' | 'merged';
  labels?: string[];
  assignees?: string[];
  reviewers?: string[];
  headBranch?: string;
  baseBranch?: string;
}

export interface DiffData {
  files: Array<{
    filename: string;
    status: 'added' | 'modified' | 'deleted' | 'renamed';
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
    previous_filename?: string;
  }>;
}

export interface DiffInfo extends DiffData {
  stats: {
    total: number;
    additions: number;
    deletions: number;
  };
}

export interface DeepWikiSummary {
  overview: string;
  keyComponents: string[];
  architectureInsights: string[];
  dependencies: Array<{ name: string; version: string; purpose: string }>;
  patterns: string[];
  metadata?: Record<string, unknown>;
  summary?: string;
  chunks?: Array<{ content: string; metadata?: Record<string, unknown> }>;
  recommendations?: Record<string, unknown>;
  scores?: DeepWikiScores | null;
  structuredInsights?: unknown[];
}

export interface ExistingIssue {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'closed' | 'in_progress';
  priority: 'high' | 'medium' | 'low';
  labels: string[];
  created_at: string;
  updated_at: string;
}
import { DeepWikiManager } from './deepwiki-manager';
import { PRContextService } from './pr-context-service';
import { ResultProcessor } from './result-processor';
import { EducationalContentService } from './educational-content-service';
import { EducationalToolOrchestrator } from './educational-tool-orchestrator';
import { storeAnalysisInHistory } from '../routes/analysis';

// Import existing packages
import { EnhancedMultiAgentExecutor, AnalysisStrategy, AgentPosition } from '@codequal/agents';
import { ModelVersionSync, RepositorySizeCategory } from '@codequal/core';
import { VectorContextService } from '@codequal/agents';
import { ToolResultRetrievalService, AgentToolResults } from '@codequal/core/services/deepwiki-tools';
import { VectorStorageService, EnhancedChunk } from '@codequal/database';
import { createLogger, LoggableData } from '@codequal/core/utils';
// @ts-expect-error - Module will be available after build
import { deepWikiScoreExtractor, DeepWikiScores, DeepWikiInsight } from '@codequal/core';
import { AuthenticatedUser as AgentAuthenticatedUser, UserRole, UserStatus, UserPermissions } from '@codequal/agents';
import { AgentRole, AgentProvider } from '@codequal/core/config/agent-registry';
import { AgentRole as MCPAgentRole } from '@codequal/mcp-hybrid';
import { RepositorySchedulerService } from '@codequal/core/services/scheduling';
import { EducationalAgent, ReportFormat, ReporterAgent } from '@codequal/agents';
import { ReportFormatterService, StandardReport } from '@codequal/agents';
import { RecommendationService } from '@codequal/agents';
import { EducationalCompilationService } from '@codequal/agents';
import { PRContentAnalyzer } from './intelligence/pr-content-analyzer';
import type { PRFile } from './intelligence/pr-content-analyzer';
import { IntelligentResultMerger } from './intelligence/intelligent-result-merger';
import { SkillTrackingService } from '@codequal/agents';
import type { ToolFinding } from '../types/tool-finding';
import { IssueResolutionDetector, IssueComparison } from '@codequal/agents';
import { dataFlowMonitor } from './data-flow-monitor';
import { createClient } from '@supabase/supabase-js';
import { getUnifiedProgressTracer } from './unified-progress-tracer';
import { reportIdMappingService } from './report-id-mapping-service';

// State management for tracking analyses and completed reports
interface OrchestratorState {
  activeAnalyses: Map<string, { startTime: Date; status: string; context: PRContext }>;
  completedAnalyses: Map<string, AnalysisResult>;
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
  prDetails: PRDetails;
  diff: DiffInfo;
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
  deepWikiSummary?: DeepWikiSummary;
  existingIssues?: ExistingIssue[];
}

export interface RepositoryStatus {
  existsInVectorDB: boolean;
  lastAnalyzed?: Date;
  analysisQuality: 'fresh' | 'stale' | 'outdated';
  needsReanalysis: boolean;
}

// Additional type definitions for better type safety
export interface ProcessedResults {
  findings: {
    security?: Finding[];
    architecture?: Finding[];
    performance?: Finding[];
    codeQuality?: Finding[];
    dependency?: Finding[];
    [key: string]: Finding[] | undefined;
  };
  insights?: Array<{ category: string; description: string; severity?: string }>;
  suggestions?: Array<{ title: string; description: string; priority?: string }>;
  educationalContent?: EducationalItem[];
  criticalIssues?: Finding[];
  metadata?: Record<string, unknown>;
  complexity?: 'trivial' | 'moderate' | 'complex';
  riskLevel?: 'low' | 'medium' | 'high';
  changeTypes?: string[];
  deepWikiData?: DeepWikiSummary;
  agentsToSkip?: string[];
  agentsToKeep?: string[];
  skipReasons?: Record<string, string>;
  prContext?: PRContext;
  crossAgentPatterns?: unknown[];
  totalChanges?: number;
  changedFiles?: string[];
}

export interface AgentResult {
  agentId?: string;
  agentRole?: string;
  findings?: Finding[];
  insights?: Array<{ category: string; description: string }>;
  recommendations?: Recommendation[];
  suggestions?: Array<{ title: string; description: string }>;
  vectorChunks?: unknown[];
  model?: string;
  processingTime?: number;
  modelVersion?: string;
  educationalContent?: EducationalItem[];
  educational?: unknown[];
  toolsExecuted?: string[];
  result?: {
    findings?: ProcessedResults['findings'];
    insights?: unknown[];
    suggestions?: unknown[];
    educational?: unknown[];
    metadata?: unknown;
  };
  agentsUsed?: string[];
  totalFindings?: number;
  metadata?: unknown;
  deduplicationResult?: unknown;
  deduplicationStats?: unknown;
  agentConfig?: { provider?: string; role?: string };
  config?: { provider?: string; role?: string };
}

export interface CompiledFindings {
  codeQuality: {
    complexityIssues: Finding[];
    maintainabilityIssues: Finding[];
    codeSmells: Finding[];
    patterns: unknown[];
  };
  security: {
    vulnerabilities: Finding[];
    securityPatterns: unknown[];
    complianceIssues: Finding[];
    threatLandscape: unknown[];
  };
  architecture: {
    designPatternViolations: Finding[];
    technicalDebt: Finding[];
    refactoringOpportunities: Finding[];
    architecturalDecisions: unknown[];
  };
  performance: {
    performanceIssues: Finding[];
    optimizationOpportunities: Finding[];
    bottlenecks: Finding[];
    benchmarkResults: unknown[];
  };
  dependency: {
    vulnerabilityIssues: Finding[];
    licenseIssues: Finding[];
    outdatedPackages: Finding[];
    conflictResolution: unknown[];
  };
  criticalIssues: Finding[];
  learningOpportunities: unknown[];
  knowledgeGaps: unknown[];
  prContext?: PRContext;
}

export interface EducationalToolResults {
  toolsExecuted?: string[];
  resources?: Array<{ title: string; url: string }>;
  modules?: EducationalItem[];
}

export interface EducationalResult {
  modules?: EducationalItem[];
  resources?: Array<{ title: string; url: string }>;
  skillCategories?: string[];
  learningPath?: {
    duration?: string;
    modules?: Array<{
      title: string;
      description?: string;
      duration?: string;
      resources?: Array<{ title: string; url: string }>;
    }>;
  };
}

export interface CompiledEducationalData {
  modules?: EducationalItem[];
  resources?: Array<{ title: string; url: string }>;
  content?: EducationalItem[];
  summary?: string;
  keyTopics?: string[];
  skillLevel?: 'beginner' | 'intermediate' | 'advanced';
  educational?: {
    bestPractices?: {
      practices?: Array<{ title: string; description: string; severity?: string }>;
    };
    codeExamples?: {
      examples?: Array<{ title: string; description: string; language?: string; code?: string }>;
    };
    documentation?: {
      findings?: Array<{ title: string; description: string; severity?: string }>;
    };
    insights?: {
      learningOpportunities?: Array<{ title: string; description: string }>;
      skillGaps?: Array<{ title: string; description: string }>;
      relatedTopics?: string[];
      nextSteps?: string[];
    };
  };
}

export interface ModelConfig {
  model: string;
  provider?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AgentConfiguration {
  type: string;
  configuration: unknown;
  context: unknown;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  priority?: number;
  fallbackConfiguration?: unknown;
  role?: string;
  provider?: string;
  position?: string;
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
    security: Finding[];
    architecture: Finding[];
    performance: Finding[];
    codeQuality: Finding[];
  };
  recommendations?: Recommendation[]; // Recommendation Module
  educationalContent: EducationalItem[]; // Legacy field for backward compatibility
  compiledEducationalData?: {
    content: EducationalItem[];
    summary: string;
    keyTopics: string[];
    skillLevel: 'beginner' | 'intermediate' | 'advanced';
  }; // NEW: Compiled educational data for Reporter Agent
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
    fullReport?: StandardReport; // Full enhanced report from Reporter Agent
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
 * Helper function to convert AgentRole to MCPAgentRole
 * Filters out roles that don't exist in MCP
 */
function toMCPAgentRoles(roles: AgentRole[]): MCPAgentRole[] {
  const validMCPRoles: MCPAgentRole[] = ['security', 'codeQuality', 'architecture', 'performance', 'dependency', 'educational', 'reporting'];
  return roles.filter(role => validMCPRoles.includes(role as MCPAgentRole)) as MCPAgentRole[];
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
  private currentAnalysisId?: string;
  private currentSessionId?: string;

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
    
    // Vector context service will be initialized in init method
    this.vectorContextService = null as unknown as VectorContextService;
    
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
   * Initialize async services
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.vectorContextService) {
      const ragService = await this.createRAGService();
      this.vectorContextService = new VectorContextService(ragService);
    }
  }

  /**
   * Main orchestration method - coordinates entire PR analysis workflow
   */
  async analyzePR(request: PRAnalysisRequest): Promise<AnalysisResult> {
    // Ensure async services are initialized
    await this.ensureInitialized();
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
    this.currentAnalysisId = analysisId;
    this.currentSessionId = sessionId;

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
      if (request.analysisMode === 'auto' && prContentAnalysis) {
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
        this.logger.info('[MCP Tools] Initializing MCP-Hybrid tools...');
        const mcpHybrid = await import('@codequal/mcp-hybrid');
        await mcpHybrid.initializeTools();
        this.logger.info('[MCP Tools] Tools initialized successfully');

        // Determine which agents to use based on analysis mode
        const agentRoles = this.selectAgentsForAnalysis(request.analysisMode, prContentAnalysis || undefined);
        this.logger.info('[MCP Tools] Selected agent roles:', { roles: agentRoles });
        
        // Get PR files from DeepWiki cache (which now has PR branch files)
        this.logger.info('[MCP Tools] Getting files from DeepWiki PR branch cache...');
        let enrichedFiles = prContext.files || [];
        
        try {
          const prBranch = prContext.prDetails?.head?.ref || prContext.prDetails?.headBranch;
          
          // Get cached files from DeepWiki (now contains PR branch files)
          const cachedFiles = await this.deepWikiManager.getCachedRepositoryFiles(
            request.repositoryUrl,
            prBranch // Get PR branch specific cache
          );
          this.logger.info(`[MCP Tools] Retrieved ${cachedFiles.length} cached files from DeepWiki (branch: ${prBranch || 'main'})`);
          
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
          
          this.logger.info(`[MCP Tools] Enriched ${enrichedFiles.filter(f => f.content).length} files with content`);
        } catch (error) {
          this.logger.error('[MCP Tools] Failed to get cached files from DeepWiki:', error as Error);
          // Continue with original files if cache fails
        }
        
        // Execute tools for all relevant agent roles in parallel
        this.logger.info('[MCP Tools] Executing tools for agents...');
        const toolExecutionResults = await mcpHybrid.parallelAgentExecutor.executeToolsForAgents(
          toMCPAgentRoles(agentRoles),
          {
            agentRole: 'security' as MCPAgentRole,
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
                changeType: 'modified'
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

        this.logger.info('[MCP Tools] Execution completed. Results:', toolExecutionResults.size);

        // Convert to the expected format for agents
        toolExecutionResults.forEach((results, role) => {
          this.logger.info(`[MCP Tools] Processing results for role: ${role}`);
          this.logger.info(`[MCP Tools] - Tools executed: ${results.toolsExecuted.join(', ')}`);
          this.logger.info(`[MCP Tools] - Findings count: ${results.findings.length}`);
          
          toolResults[role] = {
            agentRole: role,
            repositoryId: request.repositoryUrl,
            lastExecuted: new Date().toISOString(),
            toolResults: results.findings.map((f, index) => ({
              toolId: `${role}-${f.ruleId || 'tool'}-${index}`,
              agentRole: role as string,
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
              keyFindings: results.findings.map((f) => f.message || '').slice(0, 5)
            }
          };
        });

        // Log what tools provided data
        const toolsWithResults = Object.entries(toolResults)
          .filter(([_, results]) => results?.toolResults?.length > 0)
          .map(([agent, results]) => ({
            agent,
            toolCount: results.toolResults.length,
            tools: (results as AgentResult).toolsExecuted || []
          }));
        
        dataFlowMonitor.completeStep(mcpToolsStepId, {
          agentsWithToolData: toolsWithResults.length,
          totalToolFindings: toolsWithResults.reduce((sum, t) => sum + t.toolCount, 0),
          toolBreakdown: toolsWithResults,
          executionStrategy: 'parallel-all'
        });
      } catch (error) {
        this.logger.error('Failed to execute MCP-Hybrid tools:', error as Error);
        
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
      
      const agentResults = await this.coordinateAgents(prContext, orchestratorModel, toolResults, prContentAnalysis || undefined);
      
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
      
      // Convert ActionableRecommendation to Recommendation
      const convertedRecommendationModule = {
        recommendations: recommendationModule.recommendations.map(rec => ({
          title: rec.title,
          description: rec.description,
          priority: rec.priority.level === 'critical' ? 'high' as const : rec.priority.level,
          category: rec.category,
          effort: 'medium' as const, // Default since not in ActionableRecommendation
          impact: rec.priority.level === 'critical' ? 'high' as const : rec.priority.level === 'high' ? 'high' as const : 'medium' as const,
          implementation: rec.actionSteps.map(step => `${step.step}. ${step.action}`).join('\n')
        })),
        summary: recommendationModule.summary
      };
      
      const deepWikiSummary: DeepWikiSummary = typeof deepWikiData === 'string' 
        ? { overview: deepWikiData, keyComponents: [], architectureInsights: [], dependencies: [], patterns: [] } 
        : ((deepWikiData?.summary || deepWikiData || { overview: '', keyComponents: [], architectureInsights: [], dependencies: [], patterns: [] }) as DeepWikiSummary);
      
      const educationalToolResults = await this.educationalToolOrchestrator.executeEducationalTools(
        this.convertToCompiledFindings(processedResults),
        convertedRecommendationModule,
        deepWikiSummary,
        { prContext }
      );
      
      dataFlowMonitor.completeStep(educatorToolsStepId, {
        toolsExecuted: (educationalToolResults as EducationalToolResults)?.toolsExecuted || [],
        resourcesFound: (educationalToolResults as EducationalToolResults)?.resources?.length || 0,
        modulesGenerated: (educationalToolResults as EducationalToolResults)?.modules?.length || 0
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
        educationalModules: (educationalResult as EducationalResult)?.modules?.length || 0,
        resources: (educationalResult as EducationalResult)?.resources?.length || 0,
        skillCategories: (educationalResult as EducationalResult)?.skillCategories || []
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
        compiledModules: (compiledEducationalData as unknown as CompiledEducationalData)?.modules?.length || 0,
        totalResources: (compiledEducationalData as unknown as CompiledEducationalData)?.resources?.length || 0
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
      const skillProgressions: Record<string, unknown> = {};
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
          deepWikiScores: deepWikiData?.scores || null, // Pass DeepWiki scores
          deepWikiInsights: deepWikiData?.structuredInsights || [], // Pass structured insights
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
        hasEducational: !!(standardReport as StandardReport)?.modules?.educational,
        hasRecommendations: !!(standardReport as StandardReport)?.modules?.recommendations
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
        { recommendations: recommendationModule.recommendations.map((rec) => ({
          title: rec.title,
          description: rec.description,
          priority: rec.priority.level,
          category: rec.category,
          effort: (rec.actionSteps?.[0]?.estimatedEffort as 'low' | 'medium' | 'high') || 'medium',
          impact: rec.priority.level,
          implementation: rec.actionSteps?.map((s) => s.action).join('; ')
        })) },
        compiledEducationalData as unknown as CompiledEducationalData,
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
        analysisId: analysisId, // Use the same analysisId from progress tracker
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
        findings: {
          security: processedResults?.findings?.security || [],
          architecture: processedResults?.findings?.architecture || [],
          performance: processedResults?.findings?.performance || [],
          codeQuality: processedResults?.findings?.codeQuality || []
        },
        recommendations: recommendationModule.recommendations.map((rec) => ({
          title: rec.title,
          description: rec.description,
          priority: rec.priority.level,
          category: rec.category,
          effort: (rec.actionSteps?.[0]?.estimatedEffort as 'low' | 'medium' | 'high') || 'medium',
          impact: rec.priority.level,
          implementation: rec.actionSteps?.map((s) => s.action).join('; ')
        })), // NEW: Include the Recommendation Module
        educationalContent: ((eduContent) => {
          const items: EducationalItem[] = [];
          // Convert explanations
          if (eduContent?.explanations?.length) {
            items.push(...eduContent.explanations.map((exp) => ({
              topic: exp.title || 'Explanation',
              content: exp.content || exp.description || '',
              level: 'intermediate' as const,
              resources: (exp as { resources?: Array<{ title: string; url: string; type: string }> }).resources || [],
              examples: (exp as { examples?: string[] }).examples || []
            })));
          }
          // Convert tutorials
          if (eduContent?.tutorials?.length) {
            items.push(...eduContent.tutorials.map((tut) => ({
              topic: tut.title || 'Tutorial',
              content: tut.content || tut.description || '',
              level: 'beginner' as const,
              resources: (tut as { resources?: Array<{ title: string; url: string; type: string }> }).resources || [],
              examples: (tut as { examples?: string[] }).examples || []
            })));
          }
          // Convert best practices
          if (eduContent?.bestPractices?.length) {
            items.push(...eduContent.bestPractices.map((bp) => ({
              topic: bp.title || 'Best Practice',
              content: bp.content || bp.description || '',
              level: 'advanced' as const,
              resources: (bp as { resources?: Array<{ title: string; url: string; type: string }> }).resources || [],
              examples: (bp as { examples?: string[] }).examples || []
            })));
          }
          return items;
        })(standardReport.modules.educational.content), // Educational module from standard report
        compiledEducationalData: {
          content: (compiledEducationalData as unknown as CompiledEducationalData)?.content || [],
          summary: (compiledEducationalData as unknown as CompiledEducationalData)?.summary || '',
          keyTopics: (compiledEducationalData as unknown as CompiledEducationalData)?.keyTopics || [],
          skillLevel: (compiledEducationalData as unknown as CompiledEducationalData)?.skillLevel || 'intermediate'
        }, // NEW: Compiled format for Reporter Agent
        metrics: this.calculateMetrics(processedResults),
        report: {
          summary: standardReport.overview.executiveSummary,
          recommendations: standardReport.modules.recommendations.categories
            .flatMap((cat) => cat.recommendations)
            .slice(0, 5)
            .map((r) => r.title),
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
            changeTypes: prContentAnalysis.changeTypes || [],
            complexity: prContentAnalysis.complexity || 'moderate',
            riskLevel: prContentAnalysis.riskLevel || 'medium',
            agentsSkipped: prContentAnalysis.agentsToSkip || [],
            skipReasons: prContentAnalysis.skipReasons || {}
          } : null
        }
      };

      // Store analysis in user's history
      storeAnalysisInHistory(this.authenticatedUser.id, {
        ...analysisResult,
        // Add any additional properties that might be needed
      } as any);

      // Step 11: Initialize automatic scheduling if this is the first analysis
      try {
        const scheduler = RepositorySchedulerService.getInstance();
        const existingSchedule = await scheduler.getSchedule(request.repositoryUrl);
        
        if (!existingSchedule) {
          // First analysis - create automatic schedule
          processingSteps.push('Creating automatic analysis schedule');
          // Convert findings to array format for scheduler
          const schedulerAnalysisResult = {
            ...analysisResult,
            findings: [
              ...(analysisResult.findings.security || []),
              ...(analysisResult.findings.architecture || []),
              ...(analysisResult.findings.performance || []),
              ...(analysisResult.findings.codeQuality || [])
            ]
          };
          const schedule = await scheduler.initializeAutomaticSchedule(
            request.repositoryUrl,
            schedulerAnalysisResult
          );
          this.logger.info(`Automatic schedule created for ${request.repositoryUrl}:`, {
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
        this.logger.error('Failed to initialize automatic schedule:', error as Error);
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
      this.logger.info('🎯 ANALYSIS COMPLETE - About to return result', {
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
      
      this.logger.error('PR analysis orchestration error:', error as Error);
      this.logger.error('🚨 CRITICAL ERROR IN ANALYSIS:', {
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
  private compileFindings(processedResults: ProcessedResults): CompiledFindings {
    const findings = processedResults?.findings || {};
    
    return {
      codeQuality: {
        complexityIssues: findings.codeQuality?.filter((f: Finding) => f.type === 'complexity') || [],
        maintainabilityIssues: findings.codeQuality?.filter((f: Finding) => f.type === 'maintainability') || [],
        codeSmells: findings.codeQuality?.filter((f: Finding) => f.type === 'code-smell') || [],
        patterns: []
      },
      security: {
        vulnerabilities: findings.security || [],
        securityPatterns: [],
        complianceIssues: findings.security?.filter((f: Finding) => f.type === 'compliance') || [],
        threatLandscape: []
      },
      architecture: {
        designPatternViolations: findings.architecture?.filter((f: Finding) => f.type === 'pattern-violation') || [],
        technicalDebt: findings.architecture?.filter((f: Finding) => f.type === 'technical-debt') || [],
        refactoringOpportunities: findings.architecture?.filter((f: Finding) => f.type === 'refactoring') || [],
        architecturalDecisions: []
      },
      performance: {
        performanceIssues: findings.performance || [],
        optimizationOpportunities: findings.performance?.filter((f: Finding) => f.type === 'optimization') || [],
        bottlenecks: findings.performance?.filter((f: Finding) => f.type === 'bottleneck') || [],
        benchmarkResults: []
      },
      dependency: {
        vulnerabilityIssues: findings.dependency?.filter((f: Finding) => f.type === 'vulnerability') || [],
        licenseIssues: findings.dependency?.filter((f: Finding) => f.type === 'license') || [],
        outdatedPackages: findings.dependency?.filter((f: Finding) => f.type === 'outdated') || [],
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
  private generatePRComment(processedResults: ProcessedResults, educationalResult: EducationalResult): string {
    const findings = processedResults?.findings || {};
    const totalFindings = this.countTotalFindings(processedResults);
    
    let comment = "## CodeQual Analysis Results\n\n";
    
    if (totalFindings === 0) {
      comment += "🎉 Great work! No significant issues found in this PR.\n\n";
    } else {
      comment += `Found ${totalFindings} issue${totalFindings > 1 ? 's' : ''} to review:\n\n`;
      
      // Add findings summary
      Object.entries(findings).forEach(([category, categoryFindings]: [string, Finding[] | undefined]) => {
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
    if (educationalResult && educationalResult.learningPath?.modules && educationalResult.learningPath.modules.length > 0) {
      comment += "### 📚 Learning Opportunities\n";
      comment += `A learning path with ${educationalResult.learningPath?.modules?.length || 0} topics has been identified:\n\n`;
      
      // Show top 3 learning topics
      educationalResult.learningPath?.modules?.slice(0, 3).forEach((module) => {
        comment += `- ${module.title}\n`;
      });
      
      if ((educationalResult.learningPath?.modules?.length || 0) > 3) {
        comment += `- ...and ${(educationalResult.learningPath?.modules?.length || 0) - 3} more\n`;
      }
      
      comment += `\n**Estimated learning time**: ${educationalResult.learningPath?.duration || 'Not specified'}\n\n`;
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
    let existingIssues: ExistingIssue[] | undefined;
    try {
      const issuesByCategory = await this.getExistingRepositoryIssues(request.repositoryUrl);
      // Convert findings to ExistingIssue format
      existingIssues = [];
      Object.entries(issuesByCategory).forEach(([category, findings]) => {
        if (findings) {
          existingIssues?.push(...findings.map((f, index) => ({
            id: `${category}-${index}`,
            title: f.title,
            description: f.description,
            status: 'open' as const,
            priority: f.severity === 'critical' || f.severity === 'high' ? 'high' as const : 
                     f.severity === 'medium' ? 'medium' as const : 'low' as const,
            labels: [category, f.severity],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })));
        }
      });
    } catch (error) {
      this.logger.warn('Failed to get existing issues in PR context extraction', { error });
    }

    // Convert DiffData to DiffInfo by adding stats
    const diffInfo: DiffInfo = {
      ...diff,
      stats: {
        total: diff.files.length,
        additions: diff.files.reduce((sum, f) => sum + f.additions, 0),
        deletions: diff.files.reduce((sum, f) => sum + f.deletions, 0)
      }
    };

    return {
      repositoryUrl: request.repositoryUrl,
      prNumber: request.prNumber,
      prDetails,
      diff: diffInfo,
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
  private async analyzePRContent(prContext: PRContext): Promise<ProcessedResults | null> {
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
      
      // Convert PRContentAnalysis to ProcessedResults format
      return {
        findings: {}, // Empty findings since this is just PR analysis
        complexity: analysis.complexity,
        riskLevel: analysis.riskLevel,
        changeTypes: analysis.changeTypes,
        agentsToSkip: analysis.agentsToSkip,
        agentsToKeep: analysis.agentsToKeep,
        skipReasons: analysis.skipReasons,
        prContext
      };
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
      AgentRole.ORCHESTRATOR,
      this.agentAuthenticatedUser
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
    this.logger.info('[DeepWiki] Triggering repository analysis for:', repositoryUrl);
    if (prBranch) {
      this.logger.info('[DeepWiki] Using PR branch:', prBranch);
    }
    
    const jobId = await this.deepWikiManager.triggerRepositoryAnalysis(repositoryUrl, {
      branch: prBranch,
      baseBranch: baseBranch,
      includeDiff: !!prBranch && !!baseBranch,
      prNumber: prNumber,
      accessToken: githubToken
    });
    this.logger.info('[DeepWiki] Analysis job created with ID:', jobId);
    
    // Wait for analysis completion
    this.logger.info('[DeepWiki] Waiting for analysis completion...');
    const results = await this.deepWikiManager.waitForAnalysisCompletion(repositoryUrl);
    this.logger.info('[DeepWiki] Analysis completed. Has results:', !!results);
    this.logger.info('[DeepWiki] Result structure:', { keys: Object.keys(results || {}) });
  }

  /**
   * Select optimal orchestrator model based on context
   */
  private async selectOrchestratorModel(context: PRContext): Promise<unknown> {
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
        this.logger.info(`No tool results found for repository ${repositoryId}, agents will analyze without tool context`);
        return {};
      }
      
      // Retrieve tool results for all agent roles that have tool mappings
      const agentRoles = ['security', 'architecture', 'dependency', 'performance', 'codeQuality'] as AgentRole[];
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
        this.logger.info(`Retrieved ${results.toolResults.length} tool results for ${agentRole} agent`);
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
    orchestratorModel: unknown, 
    toolResults: Record<string, AgentToolResults> = {},
    prContentAnalysis?: ProcessedResults
  ): Promise<AgentResult> {
    // Create repository data for the executor
    const repositoryData = {
      owner: context.repositoryUrl.split('/')[3],
      repo: context.repositoryUrl.split('/')[4],
      prNumber: context.prNumber,
      branch: context.baseBranch,
      files: context.files?.map((f) => ({
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
      agents: agentConfigurations.map(a => ({ type: a.type }))
    });

    // Create multi-agent config with agents already configured
    // Transform AgentConfiguration to AgentConfig format
    const agentConfigs = agentConfigurations.map(config => {
      // Map string roles to AgentRole enum
      let role: AgentRole;
      switch (config.role || config.type) {
        case 'security':
          role = AgentRole.SECURITY;
          break;
        case 'codeQuality':
          role = AgentRole.CODE_QUALITY;
          break;
        case 'architecture':
          role = AgentRole.ARCHITECTURE;
          break;
        case 'performance':
          role = AgentRole.PERFORMANCE;
          break;
        case 'dependency':
          role = AgentRole.DEPENDENCY;
          break;
        case 'educational':
          role = AgentRole.EDUCATIONAL;
          break;
        default:
          role = AgentRole.CODE_QUALITY; // Default fallback
      }
      
      return {
        provider: (config.provider as AgentProvider) || AgentProvider.OPENAI,
        role: role,
        position: (config.position === 'secondary' ? AgentPosition.SECONDARY : AgentPosition.PRIMARY),
        modelVersion: config.model,
        maxTokens: config.maxTokens,
        temperature: config.temperature,
        priority: config.priority
      };
    });
    
    const multiAgentConfig = {
      name: 'PR Analysis',
      strategy: AnalysisStrategy.PARALLEL,
      agents: agentConfigs,
      fallbackEnabled: true
    };

    // Create DeepWiki report retriever function with error handling
    const deepWikiReportRetriever = async (agentRole: string, requestContext: unknown) => {
      try {
        // Cast requestContext to a known type
        const ctx = requestContext as { repositoryId?: string; repositoryUrl?: string; changedFiles?: string[] };
        
        // Create a clean context to prevent circular references
        // Only pass primitive values
        const cleanContext = {
          repositoryId: String(ctx.repositoryId || ctx.repositoryUrl || ''),
          changedFiles: Array.isArray(ctx.changedFiles) 
            ? ctx.changedFiles.slice(0, 5).map((f: unknown) => String(f))
            : [],
          focusArea: String((requestContext as Record<string, unknown>).focusArea || agentRole),
          // Add other safe context data
          vectorConfidence: Number((requestContext as Record<string, unknown>).vectorConfidence || 0),
          crossRepoCount: Number((requestContext as Record<string, unknown>).crossRepoCount || 0),
          hasToolResults: Boolean((requestContext as Record<string, unknown>).hasToolResults),
          analysisMode: String((requestContext as Record<string, unknown>).analysisMode || 'quick')
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
      const agentData = (results as AgentResult & { agents?: unknown; agentResults?: unknown }).agents || (results as AgentResult & { agents?: unknown; agentResults?: unknown }).agentResults || results;
      
      if (typeof agentData === 'object' && agentData !== null) {
        for (const [agentRole, agentResult] of Object.entries(agentData)) {
          if (typeof agentResult === 'object' && agentResult !== null) {
            const stepId = dataFlowMonitor.startStep(
              this.currentSessionId || 'unknown-session',
              `${agentRole} Agent Execution`,
              {
                role: agentRole,
                hasToolResults: !!toolResults[agentRole],
                hasVectorChunks: !!(agentResult as AgentResult).vectorChunks,
                model: (agentResult as AgentResult).model || 'unknown'
              }
            );
            
            dataFlowMonitor.completeStep(stepId, {
              findings: (agentResult as AgentResult).findings?.length || 0,
              insights: (agentResult as AgentResult).insights?.length || 0,
              recommendations: (agentResult as AgentResult).recommendations?.length || 0,
              processingTime: (agentResult as AgentResult).processingTime || 0
            });
          }
        }
      }
    }

    return results as unknown as AgentResult;
  }

  /**
   * Process and deduplicate agent results using intelligent merging
   */
  private async processResults(agentResults: AgentResult, deepWikiData?: unknown): Promise<ProcessedResults> {
    try {
      // Extract agent results in the expected format
      const formattedResults = this.formatAgentResults(agentResults);
      
      // Check if we have any results to process
      if (!formattedResults || (formattedResults as unknown[]).length === 0) {
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
          deepWikiData: deepWikiData as DeepWikiSummary | undefined
        };
      }
      
      // Use intelligent result merger for cross-agent deduplication
      const mergedResult = await this.intelligentResultMerger.mergeResults(
        formattedResults as unknown as Parameters<typeof this.intelligentResultMerger.mergeResults>[0],
        ((deepWikiData as DeepWikiSummary)?.summary || deepWikiData) as string,
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
        metrics: {
          totalFindings: mergedResult.findings.length,
          duplicatesRemoved: mergedResult.statistics?.totalFindings?.beforeMerge - mergedResult.statistics?.totalFindings?.afterMerge || 0,
          conflictsResolved: (mergedResult.statistics as unknown as Record<string, unknown>)?.conflictsResolved as number || 0,
          avgConfidence: mergedResult.findings.reduce((sum, f) => sum + (f.confidence || 0.5), 0) / (mergedResult.findings.length || 1)
        },
        insights: Array.isArray(mergedResult.insights) 
          ? mergedResult.insights 
          : Object.entries(mergedResult.insights || {}).map(([category, descriptions]) => ({
              category,
              description: Array.isArray(descriptions) ? descriptions.join('; ') : String(descriptions)
            })),
        suggestions: Array.isArray(mergedResult.suggestions) 
          ? mergedResult.suggestions.map((s) => 
              typeof s === 'string' 
                ? { title: s, description: s, priority: 'medium' }
                : s
            )
          : mergedResult.suggestions,
        deepWikiData: deepWikiData as DeepWikiSummary | undefined,
        metadata: {
          crossAgentPatterns: mergedResult.crossAgentPatterns,
          statistics: mergedResult.statistics,
          deepWikiScores: (deepWikiData as DeepWikiSummary & { scores?: unknown })?.scores || null,
          deepWikiInsights: (deepWikiData as DeepWikiSummary & { structuredInsights?: unknown[] })?.structuredInsights || []
        }
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
        const fallbackResults = await this.resultProcessor.processAgentResults([agentResults]);
        return {
          ...fallbackResults,
          deepWikiData: deepWikiData as DeepWikiSummary | undefined
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
          deepWikiData: deepWikiData as DeepWikiSummary | undefined
        };
      }
    }
  }

  /**
   * Generate educational content based on findings
   */
  private async generateEducationalContent(processedResults: ProcessedResults): Promise<EducationalItem[]> {
    const findings: Record<string, Finding[]> = {};
    if (processedResults?.findings) {
      Object.entries(processedResults.findings).forEach(([key, value]) => {
        if (value) findings[key] = value;
      });
    }
    
    // Convert findings object to array
    const findingsArray: Finding[] = [];
    Object.values(findings).forEach(categoryFindings => {
      if (Array.isArray(categoryFindings)) {
        findingsArray.push(...categoryFindings);
      }
    });
    
    const educationalContent = await this.educationalService.generateContentForFindings(
      findings as any,
      this.authenticatedUser
    );
    
    // Convert EducationalContent to EducationalItem
    return educationalContent.map(content => ({
      topic: content.content.title,
      content: `${content.content.summary}\n\n${content.content.explanation}`,
      level: content.content.skillLevel,
      resources: content.content.references?.map(ref => ({
        title: ref,
        url: ref,
        type: 'reference'
      })),
      examples: content.content.examples,
      relatedFindings: [content.findingId]
    }));
  }

  /**
   * Generate final report
   */
  private async generateReport(processedResults: ProcessedResults, educationalContent: EducationalItem[]): Promise<StandardReport> {
    // For now, return a basic report structure
    // This would be replaced with actual Report Agent integration
    const totalFindings = (processedResults as { metrics?: { totalFindings?: number } }).metrics?.totalFindings || 0;
    const recommendations = this.extractRecommendations(processedResults);
    
    return {
      id: `report-${Date.now()}`,
      repositoryUrl: '',
      prNumber: 0,
      timestamp: new Date(),
      overview: {
        executiveSummary: 'PR analysis completed successfully',
        analysisScore: 85,
        riskLevel: totalFindings > 10 ? 'high' : totalFindings > 5 ? 'medium' : 'low',
        totalFindings,
        totalRecommendations: recommendations.length,
        learningPathAvailable: educationalContent.length > 0,
        estimatedRemediationTime: '2-4 hours'
      },
      modules: {
        findings: {
          items: [],
          categories: [],
          filters: { severity: [], category: [], agent: [] }
        },
        recommendations: {
          items: recommendations,
          categories: []
        },
        educational: {
          learningPath: {
            title: 'Learning Path',
            description: 'Custom learning path based on PR findings',
            estimatedTime: '2-4 hours',
            difficulty: 'intermediate',
            steps: []
          },
          explanations: [],
          tutorials: [],
          bestPractices: [],
          additionalResources: [],
          skillGaps: []
        },
        metrics: {
          codeQuality: { score: 85, improvements: [] },
          performance: { score: 90, bottlenecks: [] },
          security: { score: 80, vulnerabilities: [] },
          architecture: { score: 75, suggestions: [] }
        },
        insights: {
          crossAgentPatterns: [],
          trends: [],
          anomalies: []
        }
      },
      visualizations: {
        severityDistribution: { type: 'pie', data: [] },
        categoryBreakdown: { type: 'bar', data: [] },
        learningPathProgress: { type: 'progress', data: [] }
      },
      exports: {
        prComment: this.generatePRComment(processedResults, {
          learningPath: {
            duration: '2-4 hours',
            modules: []
          }
        } as EducationalResult),
        markdown: '',
        pdf: null,
        json: null
      }
    } as unknown as StandardReport;
  }

  // Helper methods
  
  /**
   * Automatically select analysis mode based on PR content analysis
   */
  private selectAnalysisModeBasedOnPR(prContentAnalysis: ProcessedResults): 'quick' | 'comprehensive' | 'deep' {
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
    if (complexity === 'complex' && changeTypes?.includes('mixed')) {
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
    if (complexity === 'trivial' && changeTypes && (
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
  
  private selectAgentsForAnalysis(mode: string, prContentAnalysis?: ProcessedResults): AgentRole[] {
    // Start with default agents based on analysis mode
    let baseAgents: AgentRole[];
    switch (mode) {
      case 'quick': 
        baseAgents = ['security', 'codeQuality'] as AgentRole[];
        break;
      case 'comprehensive': 
        baseAgents = ['security', 'architecture', 'performance', 'codeQuality', 'dependency'] as AgentRole[];
        break;
      case 'deep': 
        baseAgents = ['security', 'architecture', 'performance', 'codeQuality', 'dependency', 'educational', 'reporting'] as AgentRole[];
        break;
      default: 
        baseAgents = ['security', 'codeQuality'] as AgentRole[];
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
    const filteredAgents = baseAgents.filter(agent => !agentsToSkip?.includes(agent));
    
    // Ensure we keep at least the recommended agents
    const finalAgents = [...new Set([...filteredAgents, ...(agentsToKeep || [])])] as AgentRole[];
    
    this.logger.info('Agent selection optimized based on PR content', {
      mode,
      baseAgents,
      skipped: agentsToSkip,
      kept: agentsToKeep,
      finalAgents
    });
    
    return finalAgents as AgentRole[];
  }

  private async configureAgents(
    agents: string[], 
    context: PRContext, 
    toolResults: Record<string, AgentToolResults> = {}
  ): Promise<AgentConfiguration[]> {
    const configurations = [];
    
    for (let i = 0; i < agents.length; i++) {
      const agentType = agents[i];
      let config: ModelConfig | undefined;
      let fallbackConfig: ModelConfig | undefined;
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
        this.currentSessionId || 'unknown-session',
        `Prepare ${agentType} Agent Data`,
        {
          agent: agentType,
          hasToolResults: !!toolResults[agentType],
          toolCount: toolResults[agentType]?.toolResults?.length || 0,
          model: config?.model || 'unknown'
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
        model: config?.model || 'gpt-4',
        temperature: config?.temperature || 0.7,
        maxTokens: config?.maxTokens || 4000,
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
          model: fallbackConfig?.model,
          temperature: fallbackConfig?.temperature || 0.7,
          maxTokens: fallbackConfig?.maxTokens || 4000,
          useOpenRouter: true
        } : undefined,
        context: agentContext,
        model: config?.model || 'gpt-4',
        temperature: config?.temperature || 0.7,
        maxTokens: config?.maxTokens || 4000,
        priority: agents.length - i // Higher priority for agents that appear first
      });
    }
    
    return configurations;
  }

  
  private getAgentSpecificContext(
    agentType: string, 
    context: PRContext, 
    toolResults?: AgentToolResults
  ): unknown {
    // Return context specific to each agent type
    // Limit diff size to prevent stack overflow issues
    const truncatedDiff = context.diff ? 
      (JSON.stringify(context.diff).length > 10000 ? 
        { ...context.diff, files: context.diff.files.slice(0, 10), truncated: true } : 
        context.diff) : 
      undefined;
    
    // Extract role-specific DeepWiki data
    let roleSpecificDeepWiki = undefined;
    if (context.deepWikiSummary) {
      const deepWiki = context.deepWikiSummary;
      
      // Extract role-specific analysis and recommendations
      switch (agentType) {
        case 'security':
          roleSpecificDeepWiki = {
            analysis: (deepWiki as DeepWikiSummary & { analysis?: { security?: unknown } }).analysis?.security || {},
            recommendations: deepWiki.recommendations?.security || [],
            insights: ((deepWiki as DeepWikiSummary & { insights?: string[] }).insights?.filter((i) => i.toLowerCase().includes('security')) || []),
            score: (deepWiki as DeepWikiSummary & { analysis?: { security?: { score?: number } } }).analysis?.security?.score
          };
          break;
        case 'architecture':
          roleSpecificDeepWiki = {
            analysis: (deepWiki as DeepWikiSummary & { analysis?: { architecture?: unknown } }).analysis?.architecture || {},
            recommendations: deepWiki.recommendations?.architecture || [],
            insights: ((deepWiki as DeepWikiSummary & { insights?: string[] }).insights?.filter((i) => i.toLowerCase().includes('architect')) || []),
            patterns: deepWiki.patterns || []
          };
          break;
        case 'dependency':
          roleSpecificDeepWiki = {
            analysis: (deepWiki as DeepWikiSummary & { analysis?: { dependencies?: unknown } }).analysis?.dependencies || {},
            recommendations: deepWiki.recommendations?.dependencies || [],
            insights: ((deepWiki as DeepWikiSummary & { insights?: string[] }).insights?.filter((i) => i.toLowerCase().includes('dependen')) || [])
          };
          break;
        case 'performance':
          roleSpecificDeepWiki = {
            analysis: (deepWiki as DeepWikiSummary & { analysis?: { performance?: unknown } }).analysis?.performance || {},
            recommendations: deepWiki.recommendations?.performance || [],
            insights: ((deepWiki as DeepWikiSummary & { insights?: string[] }).insights?.filter((i) => i.toLowerCase().includes('perform')) || [])
          };
          break;
        case 'codeQuality':
          roleSpecificDeepWiki = {
            analysis: (deepWiki as DeepWikiSummary & { analysis?: { codeQuality?: unknown } }).analysis?.codeQuality || {},
            recommendations: deepWiki.recommendations?.codeQuality || [],
            insights: ((deepWiki as DeepWikiSummary & { insights?: string[] }).insights?.filter((i) => i.toLowerCase().includes('quality') || i.toLowerCase().includes('maintain')) || [])
          };
          break;
        default:
          roleSpecificDeepWiki = {
            summary: deepWiki.summary,
            suggestions: (deepWiki as DeepWikiSummary & { suggestions?: unknown[] }).suggestions || []
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

  private extractAgentNames(agentResults: AgentResult & { agentResults?: Record<string, unknown> }): string[] {
    return Object.keys(agentResults.agentResults || {});
  }

  private countTotalFindings(processedResults: ProcessedResults): number {
    const findings = processedResults?.findings || {};
    return Object.values(findings).reduce((total: number, categoryFindings: Finding[] | undefined) => {
      return total + (Array.isArray(categoryFindings) ? categoryFindings.length : 0);
    }, 0) as number;
  }

  private calculateMetrics(processedResults: ProcessedResults): { totalFindings: number; severity: { critical: number; high: number; medium: number; low: number; }; confidence: number; coverage: number; } {
    const findings = processedResults?.findings || {};
    const allFindings = Object.values(findings).flat() as Finding[];
    
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

  private extractModelVersions(agentResults: AgentResult & { agentResults?: Record<string, AgentResult> }): Record<string, string> {
    const versions: Record<string, string> = {};
    
    if (agentResults.agentResults) {
      Object.entries(agentResults.agentResults).forEach(([agentName, result]: [string, AgentResult]) => {
        if (result.modelVersion) {
          versions[agentName] = result.modelVersion;
        }
      });
    }
    
    return versions;
  }

  private extractRecommendations(processedResults: ProcessedResults): string[] {
    // Extract key recommendations from findings
    const findings = processedResults?.findings || {};
    const recommendations: string[] = [];
    
    Object.values(findings).forEach((categoryFindings: Finding[] | undefined) => {
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
  ): Promise<{ primary: ModelConfig; fallback: ModelConfig } | null> {
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
  private getRoleSpecificWeights(role: string): { capabilities: Record<string, number>; cost: Record<string, number> } {
    // Role-specific weights already defined in the system
    const roleWeights: Record<string, { capabilities: Record<string, number>; cost: Record<string, number>; costWeight?: number }> = {
      security: {
        capabilities: { codeQuality: 0.3, reasoning: 0.4, detailLevel: 0.2, speed: 0.1 },
        cost: { weight: 0.2 }, // Lower cost weight, prioritize quality
        costWeight: 0.2
      },
      architecture: {
        capabilities: { reasoning: 0.4, detailLevel: 0.3, codeQuality: 0.2, speed: 0.1 },
        cost: { weight: 0.25 },
        costWeight: 0.25
      },
      performance: {
        capabilities: { speed: 0.3, codeQuality: 0.3, reasoning: 0.2, detailLevel: 0.2 },
        cost: { weight: 0.3 },
        costWeight: 0.3
      },
      codeQuality: {
        capabilities: { codeQuality: 0.4, detailLevel: 0.3, reasoning: 0.2, speed: 0.1 },
        cost: { weight: 0.35 },
        costWeight: 0.35
      },
      dependency: {
        capabilities: { speed: 0.4, codeQuality: 0.3, reasoning: 0.2, detailLevel: 0.1 },
        cost: { weight: 0.4 }, // Higher cost weight, can use cheaper models
        costWeight: 0.4
      },
      educational: {
        capabilities: { detailLevel: 0.4, reasoning: 0.3, codeQuality: 0.2, speed: 0.1 },
        cost: { weight: 0.2 },
        costWeight: 0.2
      },
      reporter: {
        capabilities: { speed: 0.4, detailLevel: 0.3, reasoning: 0.2, codeQuality: 0.1 },
        cost: { weight: 0.35 },
        costWeight: 0.35
      },
      orchestrator: {
        capabilities: { reasoning: 0.4, speed: 0.3, codeQuality: 0.2, detailLevel: 0.1 },
        cost: { weight: 0.15 }, // Orchestrator needs high quality
        costWeight: 0.15
      }
    };
    
    const weights = roleWeights[role] || {
      capabilities: { codeQuality: 0.25, reasoning: 0.25, detailLevel: 0.25, speed: 0.25 },
      cost: { weight: 0.3 },
      costWeight: 0.3
    };
    
    return {
      capabilities: weights.capabilities,
      cost: weights.cost
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
  private async createRAGService(): Promise<unknown> {
    const logger = this.logger;
    
    try {
      // Import and create AuthenticatedVectorService
      const authVectorModule = await import('@codequal/core/services/vector-db/authenticated-vector-service');
      const { AuthenticatedVectorService } = authVectorModule;
      const authenticatedVectorService = new AuthenticatedVectorService();
      
      // Return an object with the search method for compatibility
      return {
        search: async (options: unknown) => {
          const opts = options as Record<string, unknown>;
          return authenticatedVectorService.searchDocuments({
            userId: this.authenticatedUser.id,
            query: String(opts.query || ''),
            repositoryId: typeof opts.repositoryId === 'string' ? parseInt(opts.repositoryId, 10) : opts.repositoryId as number | undefined,
            contentType: opts.contentType as 'code' | 'documentation' | 'config' | 'test' | undefined,
            language: opts.language as string | undefined,
            minImportance: Number(opts.minSimilarity || 0.7),
            includeOrganization: true,
            includePublic: true,
            limit: Number(opts.limit || 10)
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
        storeChunks: async (chunks: EnhancedChunk[], embeddings: number[][], repositoryId: string, sourceType: string, sourceId: string, storageType: 'permanent' | 'cached' | 'temporary' = 'cached') => {
          // No-op when Supabase is not configured
          return { stored: 0, failed: 0, errors: [] };
        },
        deleteChunksBySource: async () => 0,
      } as unknown as VectorStorageService;
    }

    // Create actual Vector Storage service connected to Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    return {
      searchByMetadata: async (criteria: unknown, options: unknown) => {
        try {
          const criteriaObj = criteria as Record<string, unknown>;
          const opts = options as Record<string, unknown>;
          logger.debug('Vector Storage: searching with criteria:', criteriaObj);
          
          // Build query based on criteria
          let query = supabase.from('vector_chunks').select('*');
          
          if (criteriaObj.repository_id) {
            query = query.eq('repository_id', criteriaObj.repository_id);
          }
          if (criteriaObj.analysis_type) {
            query = query.eq('analysis_type', criteriaObj.analysis_type);
          }
          if (criteriaObj.tool_name) {
            query = query.eq('tool_name', criteriaObj.tool_name);
          }
          
          // Apply limit and ordering
          query = query.order('created_at', { ascending: false })
                      .limit(Number(opts?.limit || 20));
          
          const { data, error } = await query;
          
          if (error) {
            logger.error('Vector search error:', error as Error);
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
      storeChunks: async (chunks: EnhancedChunk[], embeddings: number[][], repositoryId: string, sourceType: string, sourceId: string, storageType: 'permanent' | 'cached' | 'temporary' = 'cached') => {
        try {
          const { data, error } = await supabase
            .from('vector_chunks')
            .insert(chunks);
          
          if (error) {
            logger.error('Error storing chunks:', error as Error);
          }
          return { stored: error ? 0 : chunks.length, failed: error ? chunks.length : 0, errors: error ? [new Error(error.message)] : [] };
        } catch (error) {
          const errorData: LoggableData = error instanceof Error 
            ? error 
            : { message: String(error) };
          logger.error('Store chunks error:', errorData);
          return { stored: 0, failed: chunks.length, errors: [error instanceof Error ? error : new Error(String(error))] };
        }
      },
      deleteChunksBySource: async (sourceId: string) => {
        try {
          const { data, error } = await supabase
            .from('vector_chunks')
            .delete()
            .eq('source_id', sourceId);
          
          if (error) {
            logger.error('Error deleting chunks:', error as Error);
            return 0;
          }
          return (data as unknown as unknown[])?.length || 0;
        } catch (error) {
          const errorData: LoggableData = error instanceof Error 
            ? error 
            : { message: String(error) };
          logger.error('Delete chunks error:', errorData);
          return 0;
        }
      },
    } as unknown as VectorStorageService;
  }

  /**
   * Evaluate if schedule needs adjustment based on analysis results
   */
  private async evaluateScheduleAdjustment(
    repositoryUrl: string,
    analysisResult: AnalysisResult,
    currentSchedule: unknown
  ): Promise<void> {
    const scheduler = RepositorySchedulerService.getInstance();
    const criticalFindings = analysisResult.metrics.severity.critical;
    const totalFindings = analysisResult.metrics.totalFindings || 0;
    
    // Check if we need to escalate due to critical findings
    if (criticalFindings > 0 && (currentSchedule as { frequency?: string }).frequency !== 'every-6-hours') {
      this.logger.info(`Escalating schedule for ${repositoryUrl} due to ${criticalFindings} critical findings`);
      await scheduler.updateSchedule(repositoryUrl, {
        frequency: 'every-6-hours',
        priority: 'critical',
        reason: `Schedule escalated: ${criticalFindings} critical security issues detected`,
        canBeDisabled: false
      });
      return;
    }
    
    // Check if we can reduce frequency if all issues resolved
    if (totalFindings === 0 && (currentSchedule as { frequency?: string }).frequency !== 'monthly') {
      this.logger.info(`Reducing schedule frequency for ${repositoryUrl} - all issues resolved`);
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
  private safeStringify(obj: unknown, maxLength = 500): string {
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
  private formatAgentResults(agentResults: AgentResult | { results?: Record<string, AgentResult>; agents?: Record<string, AgentResult> }): AgentResult[] {
    if (!agentResults) return [];
    
    // Log the structure to understand what we're getting
    this.logger.info('Agent results structure:', {
      type: typeof agentResults,
      isArray: Array.isArray(agentResults),
      keys: Object.keys(agentResults || {}),
      hasResults: !!(agentResults as { results?: unknown }).results,
      hasAggregatedInsights: !!(agentResults as { aggregatedInsights?: unknown }).aggregatedInsights,
      hasAgentResults: !!(agentResults as { agentResults?: unknown }).agentResults
    });
    
    // Handle different result formats
    let results: unknown[] = [];
    
    // Check if agentResults itself is an array
    if (Array.isArray(agentResults)) {
      results = agentResults;
    } else if ((agentResults as { results?: unknown }).results && typeof (agentResults as { results?: unknown }).results === 'object' && !Array.isArray((agentResults as { results?: unknown }).results)) {
      // Handle the MultiAgentResult format from enhanced executor
      // results is an object with agent IDs as keys
      results = Object.entries((agentResults as { results: Record<string, unknown> }).results).map(([agentId, result]: [string, unknown]) => ({
        agentId,
        ...(result as Record<string, unknown>)
      }));
    } else if ((agentResults as { results?: unknown[] }).results && Array.isArray((agentResults as { results?: unknown[] }).results)) {
      results = (agentResults as { results: unknown[] }).results;
    } else if ((agentResults as { combinedResult?: { aggregatedInsights?: unknown[] } }).combinedResult?.aggregatedInsights && Array.isArray((agentResults as { combinedResult?: { aggregatedInsights?: unknown[] } }).combinedResult?.aggregatedInsights)) {
      // Handle MCP coordinated results
      results = (agentResults as { combinedResult: { aggregatedInsights: unknown[] } }).combinedResult.aggregatedInsights;
    } else if ((agentResults as { aggregatedInsights?: unknown[] }).aggregatedInsights && Array.isArray((agentResults as { aggregatedInsights?: unknown[] }).aggregatedInsights)) {
      results = (agentResults as { aggregatedInsights: unknown[] }).aggregatedInsights;
    } else if ((agentResults as { agentResults?: unknown }).agentResults) {
      // Handle the case where results are in agentResults property
      results = Object.values((agentResults as { agentResults: Record<string, unknown> }).agentResults);
    } else {
      this.logger.warn('Unable to extract results array from agent results', {
        structure: this.safeStringify(agentResults)
      });
      return [];
    }
    
    return results.map((result: unknown) => {
      // Extract findings from various formats
      let findings: Finding[] = [];
      
      // Direct findings
      if ((result as AgentResult).findings) {
        findings = Array.isArray((result as AgentResult).findings) ? (result as AgentResult).findings || [] : [];
      }
      
      // Result.result.findings (nested format)
      if ((result as AgentResult).result?.findings) {
        for (const [category, categoryFindings] of Object.entries((result as AgentResult).result?.findings || {})) {
          if (Array.isArray(categoryFindings)) {
            findings.push(...categoryFindings.map((f: Finding) => ({
              ...f,
              category: f.category || category
            })));
          }
        }
      }
      
      // Type-safe access to result properties
      const r = result as {
        agentId?: string;
        agentConfig?: { provider?: string; role?: string };
        config?: { provider?: string; role?: string };
        agentRole?: string;
        result?: {
          insights?: unknown[];
          suggestions?: unknown[];
          educational?: unknown[];
          metadata?: unknown;
        };
        insights?: unknown[];
        suggestions?: unknown[];
        educational?: unknown[];
        metadata?: unknown;
        deduplicationStats?: unknown;
      };
      
      return {
        agentId: r.agentId || `${r.agentConfig?.provider || 'unknown'}-${r.agentConfig?.role || 'unknown'}` || `${r.config?.provider || 'unknown'}-${r.config?.role || 'unknown'}` || 'unknown-agent',
        agentRole: r.agentConfig?.role || r.config?.role || r.agentRole || 'unknown',
        findings,
        insights: (r.result?.insights || r.insights || []) as Array<{ category: string; description: string }>,
        suggestions: (r.result?.suggestions || r.suggestions || []) as Array<{ title: string; description: string }>,
        educational: r.result?.educational || r.educational || [],
        metadata: r.result?.metadata || r.metadata,
        deduplicationResult: r.deduplicationStats
      };
    });
  }

  /**
   * Extract educational topics from recommendations
   */
  private extractEducationalTopics(recommendationModule: { recommendations: Recommendation[] }): string[] {
    const topics = new Set<string>();
    
    // Extract from recommendations
    recommendationModule.recommendations.forEach((rec: Recommendation) => {
      topics.add(rec.category);
      topics.add(rec.title);
      (rec as Recommendation & { learningContext?: { relatedConcepts?: string[] } }).learningContext?.relatedConcepts?.forEach((concept) => {
        topics.add(concept);
      });
    });
    
    // Extract from focus areas
    (recommendationModule as { summary?: { focusAreas?: string[] } }).summary?.focusAreas?.forEach((area) => {
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
  private groupDeepWikiChunks(chunks: unknown[], agentRole: string): { summary: string; insights: string[]; recommendations: string[]; patterns: string[]; metadata: Record<string, unknown> } {
    const grouped = {
      summary: '',
      patterns: [] as string[],
      recommendations: [] as string[],
      historicalContext: [] as string[]
    };

    // Sort chunks by relevance score
    const sortedChunks = chunks.sort((a, b) => (b as { score?: number }).score || 0 - ((a as { score?: number }).score || 0));

    // Extract key insights based on chunk metadata
    sortedChunks.forEach(chunk => {
      const content = (chunk as { content?: string }).content || '';
      const metadata: Record<string, unknown> = (chunk as { metadata?: Record<string, unknown> }).metadata || {};

      // Categorize based on content type
      if (metadata.analysis_type === 'code_patterns' || content.includes('pattern')) {
        grouped.patterns.push(content);
      } else if (metadata.analysis_type === 'best_practices' || content.includes('recommend')) {
        grouped.recommendations.push(content);
      } else if (metadata.created_at && new Date(metadata.created_at as string) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) {
        grouped.historicalContext.push(content);
      }
    });

    // Create a summary from top chunks
    grouped.summary = sortedChunks
      .slice(0, 3)
      .map(chunk => (chunk as { content?: string }).content || '')
      .join('\n\n');

    return {
      summary: grouped.summary,
      insights: grouped.recommendations,
      recommendations: grouped.recommendations,
      patterns: grouped.patterns,
      metadata: {}
    };
  }

  /**
   * Retrieve relevant DeepWiki report sections based on agent role and context
   */
  private async retrieveRelevantDeepWikiReport(agentRole: string, requestContext: { repositoryId?: string; changedFiles?: string[] }): Promise<unknown> {
    try {
      this.logger.info(`Retrieving DeepWiki report for ${agentRole} agent`, {
        repositoryId: requestContext.repositoryId,
        changedFiles: requestContext.changedFiles?.length || 0
      });

      // Query Vector DB for relevant DeepWiki chunks
      // Limit the changedFiles to prevent stack overflow
      const limitedFiles = requestContext.changedFiles?.slice(0, 5) || [];
      const searchQuery = `${agentRole} analysis ${limitedFiles.join(' ')}`.trim();
      
      const vectorResults = await this.vectorContextService.getCrossRepositoryPatterns(
        agentRole as AgentRole,
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
Repository: ${(requestContext as { repositoryId?: string }).repositoryId}
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
      this.logger.error('Error retrieving DeepWiki report:', error as Error);
      return null;
    }
  }

  /**
   * Get DeepWiki summary for recommendation generation
   */
  private async getDeepWikiSummary(repositoryUrl: string): Promise<DeepWikiSummary> {
    try {
      this.logger.info('[DeepWiki] Getting DeepWiki summary for:', repositoryUrl);
      
      // First, check if we have a completed DeepWiki analysis
      const hasAnalysis = await this.deepWikiManager.checkRepositoryExists(repositoryUrl);
      this.logger.info('[DeepWiki] Repository exists in DeepWiki:', hasAnalysis);
      
      // Query Vector DB for DeepWiki chunks regardless
      const repositoryId = this.extractRepositoryId(repositoryUrl);
      this.logger.info('[DeepWiki] Querying Vector DB for chunks...');
      const deepWikiChunks = await this.vectorContextService.getCrossRepositoryPatterns(
        AgentRole.ORCHESTRATOR, // Using orchestrator role for general queries
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
        const metadata: Record<string, unknown> = chunk.metadata as Record<string, unknown> || {};
        
        if (metadata.analysis_type === 'key_insights' || content.includes('insight')) {
          insights.push(content);
        } else if (metadata.analysis_type === 'code_patterns' || content.includes('pattern')) {
          patterns.push(content);
        } else if (content.includes('suggest') || content.includes('recommend')) {
          suggestions.push(content);
        }
      });

      this.logger.info('[DeepWiki] Found chunks:', { count: deepWikiChunks.length });
      this.logger.info('[DeepWiki] Content analysis:', { 
        suggestions: suggestions.length, 
        insights: insights.length, 
        patterns: patterns.length 
      });

      // If we have stored analysis results, merge them
      let analysisData = {};
      let deepWikiScores: DeepWikiScores | null = null;
      let deepWikiInsights: DeepWikiInsight[] = [];
      
      if (hasAnalysis) {
        try {
          this.logger.info('[DeepWiki] Retrieving full analysis report...');
          const deepWikiReport = await this.deepWikiManager.waitForAnalysisCompletion(repositoryUrl);
          this.logger.info('[DeepWiki] Full report retrieved:', !!deepWikiReport);
          this.logger.info('[DeepWiki] Report keys:', { keys: Object.keys(deepWikiReport || {}) });
          analysisData = deepWikiReport.analysis || {};
          this.logger.info('[DeepWiki] Analysis sections:', { sections: Object.keys(analysisData) });
          
          // Extract scores and insights from DeepWiki report
          if ((deepWikiReport as { report?: unknown }).report) {
            const reportContent = typeof (deepWikiReport as { report?: unknown }).report === 'string' 
              ? (deepWikiReport as { report?: string }).report 
              : JSON.stringify((deepWikiReport as { report?: unknown }).report);
            
            deepWikiScores = deepWikiScoreExtractor.extractScores(reportContent);
            deepWikiInsights = deepWikiScoreExtractor.extractInsights(reportContent);
            
            this.logger.info('[DeepWiki] Extracted scores:', deepWikiScores);
            this.logger.info('[DeepWiki] Extracted insights count:', deepWikiInsights.length);
          }
        } catch (e) {
          this.logger.info('[DeepWiki] Could not retrieve stored DeepWiki analysis, using chunks only:', e as Error);
        }
      }

      return {
        overview: insights.slice(0, 3).join('\n\n'),
        keyComponents: insights.slice(0, 5),
        architectureInsights: insights.filter(i => i.includes('architecture') || i.includes('design')),
        dependencies: [],
        patterns: patterns.slice(0, 5), // Top 5 patterns
        summary: deepWikiChunks.length > 0 
          ? `DeepWiki analysis found ${deepWikiChunks.length} relevant insights across ${new Set(deepWikiChunks.map(c => c.metadata?.analysis_type)).size} categories`
          : 'No DeepWiki analysis available',
        metadata: {
          totalChunks: deepWikiChunks.length,
          avgConfidence: deepWikiChunks.reduce((sum, c) => sum + c.similarity_score, 0) / (deepWikiChunks.length || 1),
          analysis: analysisData
        },
        chunks: deepWikiChunks, // Include raw chunks for transparency
        // Extract structured recommendations from analysis data
        recommendations: {
          architecture: (analysisData as { architecture?: { recommendations?: string[] } })?.architecture?.recommendations || [],
          security: (analysisData as { security?: { recommendations?: string[] } })?.security?.recommendations || [],
          performance: (analysisData as { performance?: { recommendations?: string[] } })?.performance?.recommendations || [],
          codeQuality: (analysisData as { codeQuality?: { recommendations?: string[] } })?.codeQuality?.recommendations || [],
          dependencies: (analysisData as { dependencies?: { recommendations?: string[] } })?.dependencies?.recommendations || []
        },
        // Include DeepWiki scores and structured insights
        scores: deepWikiScores,
        structuredInsights: deepWikiInsights
      };
    } catch (error) {
      this.logger.error('Error retrieving DeepWiki summary:', error as Error);
      return {
        overview: 'DeepWiki analysis failed',
        keyComponents: [],
        architectureInsights: [],
        dependencies: [],
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
    processedResults: ProcessedResults,
    recommendationModule: { recommendations: Recommendation[] },
    compiledEducationalData: CompiledEducationalData,
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
        const fixedIssuesForTracking = fixedIssues.map((issue: IssueComparison) => ({
          issueId: issue.issueId,
          category: issue.category || 'general',
          severity: issue.severity,
          repository: issue.repository || prContext.repositoryUrl,
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
        const unresolvedIssuesForDegradation = unchangedIssues.map((issue: IssueComparison) => ({
          issueId: issue.issueId,
          category: issue.category || 'general',
          severity: issue.severity,
          repository: issue.repository || 'unknown'
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
      if ((compiledEducationalData?.educational as { learningPath?: { steps?: unknown[] } })?.learningPath?.steps && ((compiledEducationalData?.educational as { learningPath?: { steps?: unknown[] } })?.learningPath?.steps?.length ?? 0) > 0) {
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
  
  private calculatePRComplexity(processedResults: ProcessedResults, prContext: PRContext): number {
    // Calculate complexity based on findings and file changes
    const totalFindings = this.countTotalFindings(processedResults);
    const filesChanged = prContext.changedFiles.length;
    const criticalFindings = processedResults.findings?.security?.filter((f: Finding) => 
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
    security?: Finding[];
    codeQuality?: Finding[];
    architecture?: Finding[];
    performance?: Finding[];
    dependencies?: Finding[];
  }> {
    try {
      // Get DeepWiki data which should contain existing issues
      const deepWikiData = await this.getDeepWikiSummary(repositoryUrl);
      
      // Extract existing issues from DeepWiki analysis
      const existingIssues = {
        security: ((deepWikiData as { analysis?: { security?: { vulnerabilities?: unknown[] } } }).analysis?.security?.vulnerabilities || []) as Finding[],
        codeQuality: ((deepWikiData as { analysis?: { codeQuality?: { issues?: unknown[] } } }).analysis?.codeQuality?.issues || []) as Finding[],
        architecture: ((deepWikiData as { analysis?: { architecture?: { issues?: unknown[] } } }).analysis?.architecture?.issues || []) as Finding[],
        performance: ((deepWikiData as { analysis?: { performance?: { issues?: unknown[] } } }).analysis?.performance?.issues || []) as Finding[],
        dependencies: ((deepWikiData as { analysis?: { dependencies?: { vulnerabilities?: unknown[] } } }).analysis?.dependencies?.vulnerabilities || []) as Finding[]
      };
      
      // Also check if we have stored analysis results in Vector DB
      const repositoryId = this.extractRepositoryId(repositoryUrl);
      const toolResults = await this.retrieveToolResults(repositoryUrl);
      
      // Merge with tool results if available
      if (toolResults.security?.toolResults) {
        const securityFindings = toolResults.security.toolResults.map((result): Finding => ({
          title: `Tool: ${result.toolId}`,
          description: result.content,
          severity: 'medium',
          category: 'security',
          file: '',
          line: 0
        }));
        existingIssues.security = [...existingIssues.security, ...securityFindings];
      }
      if (toolResults.codeQuality?.toolResults) {
        const codeQualityFindings = toolResults.codeQuality.toolResults.map((result): Finding => ({
          title: `Tool: ${result.toolId}`,
          description: result.content,
          severity: 'medium',
          category: 'codeQuality',
          file: '',
          line: 0
        }));
        existingIssues.codeQuality = [...existingIssues.codeQuality, ...codeQualityFindings];
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
  
  private extractTargetedSkills(compiledEducationalData: CompiledEducationalData): string[] {
    const skills = new Set<string>();
    
    // Extract from skill gaps
    const skillGaps = compiledEducationalData?.educational?.insights?.skillGaps || [];
    skillGaps.forEach((gap: { title: string; description: string }) => {
      if (gap.title) {
        // Map skill names to categories
        const categoryMap: Record<string, string> = {
          'security': 'security',
          'architecture': 'architecture',
          'performance': 'performance',
          'code quality': 'codeQuality',
          'maintainability': 'codeQuality',
          'dependency': 'dependencies'
        };
        
        const skill = gap.title.toLowerCase();
        for (const [key, value] of Object.entries(categoryMap)) {
          if (skill.includes(key)) {
            skills.add(value);
            break;
          }
        }
      }
    });
    
    // Extract from learning path topics
    const learningPath = (compiledEducationalData?.educational as { learningPath?: { modules?: unknown[] } })?.learningPath;
    if (learningPath?.modules) {
      learningPath.modules.forEach((module) => {
        const topic = ((module as { title?: string }).title || '').toLowerCase();
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
        chunkTypes: analysisChunks.map(c => (c as { metadata?: { contentType?: string } }).metadata?.contentType)
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
  private createReportChunks(report: StandardReport): unknown[] {
    const chunks: unknown[] = [];
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
        decision: (report.overview as { decision?: { status: string; confidence: number } }).decision || { status: 'PENDING', confidence: 0 },
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
          score: (securityFindings as { score?: number }).score || 0,
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
          score: (performanceFindings as { score?: number }).score || 0,
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
          score: (codeQualityFindings as { score?: number }).score || 0,
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
          score: (dependencyFindings as { score?: number }).score || 0,
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
          score: (architectureFindings as { score?: number }).score || 0,
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
    if (report.modules?.educational || (report.modules as { educationalContent?: unknown })?.educationalContent) {
      chunks.push({
        repositoryUrl: report.repositoryUrl,
        analysis: {
          reportId: report.id,
          educational: report.modules.educational || (report.modules as { educationalContent?: unknown }).educationalContent,
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
  private generateExecutiveSummary(processedResults: ProcessedResults, recommendationModule: { recommendations: Recommendation[] }): string {
    const totalFindings = this.countTotalFindings(processedResults);
    const totalRecommendations = (recommendationModule as { summary?: { totalRecommendations?: number } }).summary?.totalRecommendations || recommendationModule.recommendations.length;
    const focusAreas = (recommendationModule as { summary?: { focusAreas?: string[] } }).summary?.focusAreas?.join(', ') || 'code quality';
    
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
  private convertCompiledDataToSections(compiledEducationalData: CompiledEducationalData): EducationalItem[] {
    const sections = [];
    
    // Learning Path Section
    const edData = compiledEducationalData.educational as {
      learningPath?: {
        totalSteps?: number;
        description?: string;
        steps?: unknown[];
        estimatedTime?: string;
        difficulty?: string;
      };
      content?: {
        explanations?: unknown[];
        insights?: unknown;
      };
    };
    
    if (edData.learningPath?.totalSteps && edData.learningPath.totalSteps > 0) {
      sections.push({
        title: 'Learning Path',
        summary: edData.learningPath?.description,
        content: {
          steps: edData.learningPath?.steps,
          estimatedTime: edData.learningPath?.estimatedTime,
          difficulty: edData.learningPath?.difficulty
        },
        type: 'learning-path'
      });
    }
    
    // Educational Content Sections
    if (edData.content?.explanations?.length && edData.content.explanations.length > 0) {
      sections.push({
        title: 'Key Concepts',
        summary: `${edData.content?.explanations?.length} concepts explained`,
        content: edData.content?.explanations,
        type: 'explanations'
      });
    }
    
    const educational = compiledEducationalData?.educational;
    if (!educational) {
      // Return existing sections mapped to EducationalItem format
      return sections.map(section => ({
        topic: section.title,
        content: typeof section.content === 'string' ? section.content : JSON.stringify(section.content),
        level: 'intermediate' as const,
        resources: [],
        examples: []
      }));
    }
    
    const content = (educational as { content?: Record<string, unknown> }).content || {};
    const insights = (educational as { insights?: Record<string, unknown> }).insights || {};
    
    const tutorials = (content as { tutorials?: unknown[] }).tutorials;
    if (tutorials && tutorials.length > 0) {
      sections.push({
        title: 'Step-by-Step Tutorials',
        summary: `${tutorials.length} actionable tutorials`,
        content: tutorials,
        type: 'tutorials'
      });
    }
    
    const bestPractices = (content as { bestPractices?: unknown[] }).bestPractices;
    if (bestPractices && bestPractices.length > 0) {
      sections.push({
        title: 'Best Practices',
        summary: `${bestPractices.length} recommended practices`,
        content: bestPractices,
        type: 'best-practices'
      });
    }
    
    // Insights Section
    const skillGaps = (insights as { skillGaps?: unknown[] }).skillGaps;
    if (skillGaps && skillGaps.length > 0) {
      sections.push({
        title: 'Skill Development',
        summary: `${skillGaps.length} skill gaps identified`,
        content: {
          skillGaps: skillGaps,
          relatedTopics: (insights as { relatedTopics?: unknown[] }).relatedTopics || [],
          nextSteps: (insights as { nextSteps?: unknown[] }).nextSteps || []
        },
        type: 'insights'
      });
    }
    
    // Map sections to EducationalItem format
    return sections.map(section => ({
      topic: section.title,
      content: typeof section.content === 'string' ? section.content : JSON.stringify(section.content),
      level: 'intermediate' as const,
      resources: [],
      examples: []
    }));
  }

  /**
   * Extract recommendations list from recommendation module
   */
  private extractRecommendationsList(recommendationModule: { recommendations: Recommendation[] }): string[] {
    return recommendationModule.recommendations.map((rec: Recommendation) => {
      const priority = rec.priority.toUpperCase();
      const category = rec.category.charAt(0).toUpperCase() + rec.category.slice(1);
      return `[${priority}] ${category}: ${rec.title}`;
    });
  }

  /**
   * Check if the files are security-related
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

  /**
   * Convert ProcessedResults to CompiledFindings for educational tools
   */
  private convertToCompiledFindings(processedResults: ProcessedResults): CompiledFindings {
    const findings = processedResults.findings || {};
    
    return {
      codeQuality: {
        complexityIssues: findings.codeQuality || [],
        maintainabilityIssues: [],
        codeSmells: [],
        patterns: []
      },
      security: {
        vulnerabilities: findings.security || [],
        securityPatterns: [],
        complianceIssues: [],
        threatLandscape: []
      },
      architecture: {
        designPatternViolations: findings.architecture || [],
        technicalDebt: [],
        refactoringOpportunities: [],
        architecturalDecisions: []
      },
      performance: {
        performanceIssues: findings.performance || [],
        optimizationOpportunities: [],
        bottlenecks: [],
        benchmarkResults: []
      },
      dependency: {
        vulnerabilityIssues: findings.dependency || [],
        licenseIssues: [],
        outdatedPackages: [],
        conflictResolution: []
      },
      criticalIssues: [],
      learningOpportunities: [],
      knowledgeGaps: [],
      prContext: processedResults.prContext
    };
  }
}
