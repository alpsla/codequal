import { AuthenticatedUser } from '../middleware/auth-middleware';
import { VectorContextService } from '@codequal/agents/multi-agent/vector-context-service';
import { VectorSearchResult } from '@codequal/agents/multi-agent/enhanced-executor';
import { DeepWikiWithToolsService } from '@codequal/core/services/deepwiki-tools';
import { ToolResultStorageService } from '@codequal/core/services/deepwiki-tools';
import { ToolResultReviewService, ToolReviewConfiguration } from '@codequal/core/services/deepwiki-tools/tool-result-review.service';
import { VectorStorageService } from '@codequal/database/services/ingestion/vector-storage.service';
import { Logger } from '@codequal/core/utils/logger';

export interface AnalysisJob {
  jobId: string;
  repositoryUrl: string;
  status: 'queued' | 'processing' | 'awaiting-review' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  includesTools?: boolean;
  requiresReview?: boolean;
  reviewUrl?: string;
}

interface ToolMetadata extends Record<string, any> {
  tool_id?: string;
  tool_name?: string;
  content_type?: string;
  [key: string]: any;
}

export interface AnalysisResults {
  repositoryUrl: string;
  analysis: {
    architecture: any;
    security: any;
    performance: any;
    codeQuality: any;
    dependencies: any;
  };
  toolResults?: {
    [toolId: string]: {
      success: boolean;
      findings?: any[];
      metrics?: any;
      error?: string;
      reviewStatus?: string;
    };
  };
  metadata: {
    analyzedAt: Date;
    analysisVersion: string;
    processingTime: number;
    toolsExecuted?: string[];
    reviewRequired?: boolean;
    reviewStatus?: any;
  };
}

/**
 * Enhanced DeepWiki Manager with Tool Review Support
 */
export class EnhancedDeepWikiManager {
  private vectorContextService: VectorContextService;
  private deepWikiService: DeepWikiWithToolsService;
  private toolStorageService: ToolResultStorageService;
  private toolReviewService: ToolResultReviewService;
  private activeJobs = new Map<string, AnalysisJob>();
  private logger: Logger;

  constructor(
    private authenticatedUser: AuthenticatedUser,
    private vectorStorageService: VectorStorageService,
    private embeddingService: any,
    logger?: Logger,
    private reviewConfiguration?: ToolReviewConfiguration
  ) {
    this.logger = logger || this.createDefaultLogger();
    this.vectorContextService = new VectorContextService(authenticatedUser);
    this.deepWikiService = new DeepWikiWithToolsService(this.logger);
    
    this.toolStorageService = new ToolResultStorageService(
      this.vectorStorageService,
      this.embeddingService
    );
    
    // Initialize review service with configuration
    this.toolReviewService = new ToolResultReviewService(
      this.vectorStorageService,
      this.logger,
      reviewConfiguration || {
        requireReview: false, // Default: no review required
        autoApproveThresholds: {
          npmAudit: { maxCritical: 0, maxHigh: 2 },
          licenseChecker: { maxRiskyLicenses: 0 },
          madge: { maxCircularDependencies: 5 },
          dependencyCruiser: { maxViolations: 10 },
          npmOutdated: { maxMajorUpdates: 10 }
        }
      }
    );
  }

  /**
   * Check if repository analysis exists in Vector DB
   */
  async checkRepositoryExists(repositoryUrl: string): Promise<boolean> {
    try {
      const existing = await this.vectorContextService.getRepositoryContext(
        repositoryUrl,
        'orchestrator' as any,
        this.authenticatedUser as any,
        { minSimilarity: 0.95 }
      );

      return existing.recentAnalysis.length > 0;
    } catch (error) {
      this.logger.error('Repository existence check failed:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /**
   * Trigger repository analysis with tools and optional review
   */
  async triggerRepositoryAnalysisWithTools(
    repositoryUrl: string,
    options: {
      runTools?: boolean;
      enabledTools?: string[];
      prNumber?: number;
      scheduledRun?: boolean;
      requireReview?: boolean;
      skipReview?: boolean;
    } = {}
  ): Promise<string> {
    try {
      const jobId = `deepwiki_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create analysis job record
      const job: AnalysisJob = {
        jobId,
        repositoryUrl,
        status: 'queued',
        startedAt: new Date(),
        includesTools: options.runTools,
        requiresReview: options.requireReview || this.reviewConfiguration?.requireReview
      };

      this.activeJobs.set(jobId, job);

      // Start analysis in background
      this.executeAnalysisWithTools(jobId, repositoryUrl, options)
        .catch(error => {
          this.logger.error('Analysis execution failed:', error);
          const job = this.activeJobs.get(jobId);
          if (job) {
            job.status = 'failed';
            job.error = error instanceof Error ? error.message : String(error);
            job.completedAt = new Date();
          }
        });

      return jobId;
    } catch (error) {
      this.logger.error('Failed to trigger repository analysis:', error instanceof Error ? error.message : String(error));
      throw new Error(`Repository analysis trigger failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute analysis with tools and review
   */
  private async executeAnalysisWithTools(
    jobId: string,
    repositoryUrl: string,
    options: {
      runTools?: boolean;
      enabledTools?: string[];
      prNumber?: number;
      scheduledRun?: boolean;
      requireReview?: boolean;
      skipReview?: boolean;
    }
  ): Promise<void> {
    const job = this.activeJobs.get(jobId);
    if (!job) return;

    try {
      // Update status to processing
      job.status = 'processing';

      // Determine which tools to run based on repository type
      let toolsToRun = options.enabledTools;
      
      if (!toolsToRun && options.runTools) {
        // Default: run all applicable tools
        toolsToRun = [
          'npm-audit',
          'license-checker',
          'madge',
          'dependency-cruiser',
          'npm-outdated'
        ];
        
        this.logger.info(`Running all tools for ${repositoryUrl}`);
      }

      // Run DeepWiki analysis with tools
      const result = await this.deepWikiService.analyzeRepositoryWithTools({
        repositoryUrl,
        runTools: options.runTools ?? true,
        enabledTools: toolsToRun,
        mode: 'comprehensive'
      });

      if (result.status !== 'success') {
        throw new Error(result.error || 'Analysis failed');
      }

      // Store DeepWiki results in Vector DB
      await this.storeDeepWikiResults(repositoryUrl, result);

      // Process tool results with review if enabled
      if (result.toolResults && options.runTools) {
        const reviewResult = await this.toolReviewService.processToolResults(
          repositoryUrl,
          result.toolResults,
          {
            userId: this.authenticatedUser.id,
            prNumber: options.prNumber,
            skipReview: options.skipReview
          }
        );

        // If review is required, update job status
        if (reviewResult.requiresManualReview) {
          job.status = 'awaiting-review';
          job.reviewUrl = `https://codequal.app/reviews/${jobId}`;
          
          this.logger.info(`Analysis awaiting review for ${repositoryUrl}`, {
            jobId,
            reviewUrl: job.reviewUrl,
            pendingTools: Object.entries(reviewResult.reviewStatus)
              .filter(([_, status]) => status.status === 'pending')
              .map(([toolId]) => toolId)
          });
          
          // Don't store results yet - wait for review
          return;
        }

        // Store tool results in Vector DB (approved or auto-approved)
        await this.toolStorageService.storeToolResults(
          repositoryUrl,
          result.toolResults,
          {
            prNumber: options.prNumber,
            scheduledRun: options.scheduledRun
          }
        );
      }

      // Update job status
      job.status = 'completed';
      job.completedAt = new Date();

      this.logger.info(`Analysis completed for ${repositoryUrl} (Job: ${jobId})`);
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Analysis failed';
      job.completedAt = new Date();
      
      throw error;
    }
  }

  /**
   * Complete analysis after review approval
   */
  async completeAnalysisAfterReview(
    jobId: string,
    approvedTools: string[],
    reviewer: string
  ): Promise<void> {
    const job = this.activeJobs.get(jobId);
    if (!job || job.status !== 'awaiting-review') {
      throw new Error('Job not found or not awaiting review');
    }

    try {
      // Approve the tools
      await this.toolReviewService.approveToolResults(
        job.repositoryUrl,
        approvedTools,
        reviewer
      );

      // Retrieve tool results from temporary storage
      const toolResults = await this.getTemporaryToolResults(jobId);

      // Store approved results in Vector DB
      await this.toolStorageService.storeToolResults(
        job.repositoryUrl,
        toolResults,
        {
          scheduledRun: false
        }
      );

      // Update job status
      job.status = 'completed';
      job.completedAt = new Date();

      this.logger.info(`Analysis completed after review for ${job.repositoryUrl}`);
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Review completion failed';
      throw error;
    }
  }

  /**
   * Get review summary for a job
   */
  async getReviewSummary(jobId: string): Promise<any> {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    // Get tool results and review status
    const toolResults = await this.getTemporaryToolResults(jobId);
    const reviewStatus = await this.toolReviewService.getReviewStatus(job.repositoryUrl);

    return this.toolReviewService.generateReviewSummary(toolResults, reviewStatus);
  }

  /**
   * Get temporary tool results (before approval)
   */
  private async getTemporaryToolResults(jobId: string): Promise<any> {
    // In production, this would retrieve from temporary storage
    // For now, return mock data
    return {
      'npm-audit': {
        toolId: 'npm-audit',
        success: true,
        output: {},
        executionTime: 1000,
        metadata: { totalVulnerabilities: 2 }
      }
    };
  }

  /**
   * Wait for analysis completion (including review if required)
   */
  async waitForAnalysisCompletion(repositoryUrl: string): Promise<AnalysisResults> {
    try {
      // Find active job for this repository
      const job = Array.from(this.activeJobs.values())
        .find(j => j.repositoryUrl === repositoryUrl && 
                   (j.status !== 'completed' && j.status !== 'failed'));

      if (!job) {
        throw new Error('No active analysis job found for repository');
      }

      // Poll for completion
      const results = await this.pollForResults(job);

      return results;
    } catch (error) {
      this.logger.error('Failed to wait for analysis completion:', error instanceof Error ? error.message : String(error));
      throw new Error(`Analysis completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<AnalysisJob | null> {
    return this.activeJobs.get(jobId) || null;
  }

  /**
   * Get active jobs
   */
  async getActiveJobs(): Promise<AnalysisJob[]> {
    return Array.from(this.activeJobs.values())
      .filter(job => job.status === 'queued' || job.status === 'processing' || job.status === 'awaiting-review');
  }

  /**
   * Cancel job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.activeJobs.get(jobId);
    if (!job || job.status === 'completed' || job.status === 'failed') {
      return false;
    }

    job.status = 'failed';
    job.error = 'Cancelled by user';
    job.completedAt = new Date();

    return true;
  }

  // ... (keep all the existing private methods from the original implementation)

  /**
   * Poll for results (updated to handle review status)
   */
  private async pollForResults(job: AnalysisJob): Promise<AnalysisResults> {
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    let attempts = 0;

    return new Promise((resolve, reject) => {
      const pollInterval = setInterval(() => {
        const currentJob = this.activeJobs.get(job.jobId);
        
        if (!currentJob) {
          clearInterval(pollInterval);
          reject(new Error('Analysis job not found'));
          return;
        }

        if (currentJob.status === 'completed') {
          clearInterval(pollInterval);
          // Retrieve results from Vector DB
          this.retrieveAnalysisResults(job.repositoryUrl)
            .then(resolve)
            .catch(reject);
          return;
        }

        if (currentJob.status === 'awaiting-review') {
          clearInterval(pollInterval);
          reject(new Error(`Analysis requires manual review: ${currentJob.reviewUrl}`));
          return;
        }

        if (currentJob.status === 'failed') {
          clearInterval(pollInterval);
          reject(new Error(currentJob.error || 'Analysis failed'));
          return;
        }

        attempts++;
        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          reject(new Error('Analysis timeout - job did not complete within expected timeframe'));
          return;
        }
      }, 5000); // Poll every 5 seconds
    });
  }

  // ... (keep all other private methods from the original implementation)

  private async storeDeepWikiResults(repositoryUrl: string, results: any): Promise<void> {
    try {
      await this.vectorContextService.storeAnalysisResults(
        repositoryUrl,
        [this.formatDeepWikiResults(repositoryUrl, results)],
        this.authenticatedUser.id
      );

      this.logger.info(`DeepWiki results stored in Vector DB for ${repositoryUrl}`);
    } catch (error) {
      this.logger.error('Failed to store DeepWiki results in Vector DB:', error instanceof Error ? error.message : String(error));
      throw new Error(`Vector DB storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private formatDeepWikiResults(repositoryUrl: string, result: any): AnalysisResults {
    const analysis = result.output || {};
    
    return {
      repositoryUrl,
      analysis: {
        architecture: analysis.architecture || {},
        security: analysis.security || {},
        performance: analysis.performance || {},
        codeQuality: analysis.codeQuality || {},
        dependencies: analysis.dependencies || {}
      },
      metadata: {
        analyzedAt: result.endTime,
        analysisVersion: '2.0.0',
        processingTime: result.duration * 1000,
        toolsExecuted: result.toolResults ? Object.keys(result.toolResults) : []
      }
    };
  }

  private async retrieveAnalysisResults(repositoryUrl: string): Promise<AnalysisResults> {
    try {
      const deepwikiContext = await this.vectorContextService.getRepositoryContext(
        repositoryUrl,
        'orchestrator' as any,
        this.authenticatedUser as any
      );

      // Get tool results from Vector DB with content type filter
      const toolContext = await this.vectorContextService.getRepositoryContext(
        repositoryUrl,
        'security' as any,
        this.authenticatedUser as any
      );
      
      // Filter for tool results from recentAnalysis
      const filteredToolContext = {
        ...toolContext,
        recentAnalysis: toolContext.recentAnalysis.filter((result: VectorSearchResult) => 
          result.metadata?.content_type === 'tool_result'
        )
      };

      return this.combineAnalysisResults(repositoryUrl, deepwikiContext, filteredToolContext);
    } catch (error) {
      this.logger.error('Failed to retrieve analysis results:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  private combineAnalysisResults(
    repositoryUrl: string,
    deepwikiContext: any,
    toolContext: any
  ): AnalysisResults {
    const analysis = deepwikiContext.recentAnalysis[0]?.analysis || {};
    
    const toolResults: any = {};
    // Use recentAnalysis instead of chunks
    toolContext.recentAnalysis.forEach((result: VectorSearchResult) => {
      const metadata = result.metadata as any; // Cast to any to access tool-specific properties
      const toolId = metadata?.tool_id || metadata?.tool_name;
      if (toolId && !toolResults[toolId]) {
        toolResults[toolId] = {
          success: true,
          metrics: metadata,
          findings: []
        };
      }
    });

    return {
      repositoryUrl,
      analysis,
      toolResults,
      metadata: {
        analyzedAt: new Date(),
        analysisVersion: '2.0.0',
        processingTime: 0,
        toolsExecuted: Object.keys(toolResults)
      }
    };
  }

  private createDefaultLogger(): Logger {
    return {
      info: (message: string, meta?: any) => console.log(`[INFO] ${message}`, meta),
      warn: (message: string, meta?: any) => console.warn(`[WARN] ${message}`, meta),
      error: (message: string, meta?: any) => console.error(`[ERROR] ${message}`, meta),
      debug: (message: string, meta?: any) => console.debug(`[DEBUG] ${message}`, meta)
    } as Logger;
  }
}
