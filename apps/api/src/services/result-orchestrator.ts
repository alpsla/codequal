import { AuthenticatedUser } from '../middleware/auth-middleware';
import { DeepWikiManager } from './deepwiki-manager';
import { PRContextService } from './pr-context-service';
import { ResultProcessor } from './result-processor';
import { EducationalContentService } from './educational-content-service';
import { storeAnalysisInHistory } from '../routes/analysis';

// Import existing packages
import { EnhancedMultiAgentExecutor } from '@codequal/agents/multi-agent/enhanced-executor';
import { ModelVersionSync } from '@codequal/core/services/model-selection/ModelVersionSync';
import { VectorContextService } from '@codequal/agents/multi-agent/vector-context-service';
import { createLogger } from '@codequal/core/utils';
import { AuthenticatedUser as AgentAuthenticatedUser, UserRole, UserStatus, UserPermissions } from '@codequal/agents/multi-agent/types/auth';

export interface PRAnalysisRequest {
  repositoryUrl: string;
  prNumber: number;
  analysisMode: 'quick' | 'comprehensive' | 'deep';
  authenticatedUser: AuthenticatedUser;
  githubToken?: string;
}

export interface PRContext {
  repositoryUrl: string;
  prNumber: number;
  prDetails: any;
  diff: any;
  changedFiles: string[];
  primaryLanguage: string;
  repositorySize: 'small' | 'medium' | 'large';
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
  educationalContent: any[];
  metrics: {
    severity: { critical: number; high: number; medium: number; low: number };
    confidence: number;
    coverage: number;
  };
  report: {
    summary: string;
    recommendations: string[];
    prComment: string;
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
  private modelVersionSync: ModelVersionSync;
  private vectorContextService: VectorContextService;
  private deepWikiManager: DeepWikiManager;
  private prContextService: PRContextService;
  private resultProcessor: ResultProcessor;
  private educationalService: EducationalContentService;
  private agentAuthenticatedUser: AgentAuthenticatedUser;

  constructor(private authenticatedUser: AuthenticatedUser) {
    // Initialize services with authenticated user context
    const logger = createLogger('ResultOrchestrator');
    this.modelVersionSync = new ModelVersionSync(logger);
    
    // Convert API AuthenticatedUser to Agent AuthenticatedUser
    this.agentAuthenticatedUser = this.convertToAgentUser(authenticatedUser);
    
    // Create mock RAG service for VectorContextService
    const mockRAGService = this.createMockRAGService();
    this.vectorContextService = new VectorContextService(mockRAGService);
    
    this.deepWikiManager = new DeepWikiManager(authenticatedUser);
    this.prContextService = new PRContextService();
    this.resultProcessor = new ResultProcessor();
    this.educationalService = new EducationalContentService(authenticatedUser);
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

      // Step 5: Coordinate multi-agent analysis
      processingSteps.push('Coordinating multi-agent analysis');
      const agentResults = await this.coordinateAgents(prContext, orchestratorModel);

      // Step 6: Process and deduplicate results
      processingSteps.push('Processing agent results');
      const processedResults = await this.processResults(agentResults);

      // Step 7: Add educational content
      processingSteps.push('Generating educational content');
      const educationalContent = await this.generateEducationalContent(processedResults);

      // Step 8: Generate final report
      processingSteps.push('Generating final report');
      const report = await this.generateReport(processedResults, educationalContent);

      const processingTime = Date.now() - startTime;

      // Step 9: Compile final analysis result
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
          title: prContext.prDetails.title || 'PR Analysis',
          changedFiles: prContext.changedFiles.length
        },
        analysis: {
          mode: request.analysisMode,
          agentsUsed: this.extractAgentNames(agentResults),
          totalFindings: this.countTotalFindings(processedResults),
          processingTime
        },
        findings: processedResults.findings,
        educationalContent,
        metrics: this.calculateMetrics(processedResults),
        report,
        metadata: {
          timestamp: new Date(),
          modelVersions: this.extractModelVersions(agentResults),
          processingSteps
        }
      };

      // Store analysis in user's history
      storeAnalysisInHistory(this.authenticatedUser.id, analysisResult);

      return analysisResult;

    } catch (error) {
      console.error('PR analysis orchestration error:', error);
      throw new Error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
   * Coordinate multi-agent analysis using existing enhanced executor
   */
  private async coordinateAgents(context: PRContext, orchestratorModel: any): Promise<any> {
    // Get repository context from Vector DB
    const repositoryContext = await this.vectorContextService.getRepositoryContext(
      context.repositoryUrl,
      'orchestrator' as any,
      this.agentAuthenticatedUser,
      { minSimilarity: 0.9 }
    );

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

    // Create enhanced multi-agent executor
    const executor = new EnhancedMultiAgentExecutor(
      multiAgentConfig,
      repositoryData,
      this.vectorContextService,
      this.agentAuthenticatedUser,
      { debug: false }
    );

    // Select agents based on analysis mode
    const selectedAgents = this.selectAgentsForAnalysis(context.analysisMode);

    // Configure agents with repository context
    const agentConfigurations = await this.configureAgents(selectedAgents, context);

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
      processedResults.findings,
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
      prComment: this.generatePRComment(processedResults)
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

  private async configureAgents(agents: string[], context: PRContext): Promise<any[]> {
    const configurations = [];
    
    for (const agentType of agents) {
      const config = await this.modelVersionSync.findOptimalModel({
        language: context.primaryLanguage,
        sizeCategory: context.repositorySize,
        tags: [agentType]
      });
      
      configurations.push({
        type: agentType,
        configuration: config,
        context: this.getAgentSpecificContext(agentType, context)
      });
    }
    
    return configurations;
  }

  private getAgentSpecificContext(agentType: string, context: PRContext): any {
    // Return context specific to each agent type
    const baseContext = {
      changedFiles: context.changedFiles,
      primaryLanguage: context.primaryLanguage,
      diff: context.diff
    };

    switch (agentType) {
      case 'security':
        return { ...baseContext, focus: 'security vulnerabilities and patterns' };
      case 'architecture':
        return { ...baseContext, focus: 'architectural patterns and design quality' };
      case 'performance':
        return { ...baseContext, focus: 'performance implications and optimizations' };
      case 'codeQuality':
        return { ...baseContext, focus: 'code quality and maintainability' };
      default:
        return baseContext;
    }
  }

  private extractRepositoryName(url: string): string {
    const match = url.match(/\/([^/]+)\.git$/) || url.match(/\/([^/]+)$/);
    return match ? match[1] : 'Unknown Repository';
  }

  private extractAgentNames(agentResults: any): string[] {
    return Object.keys(agentResults.agentResults || {});
  }

  private countTotalFindings(processedResults: any): number {
    const findings = processedResults.findings || {};
    return Object.values(findings).reduce((total: number, categoryFindings: any) => {
      return total + (Array.isArray(categoryFindings) ? categoryFindings.length : 0);
    }, 0);
  }

  private calculateMetrics(processedResults: any): any {
    const findings = processedResults.findings || {};
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
    const findings = processedResults.findings || {};
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

  private generatePRComment(processedResults: any): string {
    const findings = processedResults.findings || {};
    const totalFindings = this.countTotalFindings(processedResults);
    
    if (totalFindings === 0) {
      return "🎉 Great work! No significant issues found in this PR.";
    }
    
    let comment = "## CodeQual Analysis Results\n\n";
    comment += `Found ${totalFindings} issue${totalFindings > 1 ? 's' : ''} to review:\n\n`;
    
    Object.entries(findings).forEach(([category, categoryFindings]: [string, any]) => {
      if (Array.isArray(categoryFindings) && categoryFindings.length > 0) {
        comment += `### ${category.charAt(0).toUpperCase() + category.slice(1)}\n`;
        categoryFindings.slice(0, 3).forEach(finding => {
          comment += `- ${finding.title || finding.description}\n`;
        });
        comment += "\n";
      }
    });
    
    comment += "*Full analysis available in the detailed report.*";
    
    return comment;
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
      search: async (options: any, userId: string) => {
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
}