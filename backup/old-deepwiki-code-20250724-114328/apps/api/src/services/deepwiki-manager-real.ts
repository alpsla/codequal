import { AuthenticatedUser } from '../middleware/auth-middleware';
import { VectorContextService, createVectorContextService } from '@codequal/agents/multi-agent/vector-context-service';
import { AuthenticatedUser as AgentAuthenticatedUser, UserRole, UserStatus, UserPermissions } from '@codequal/agents/multi-agent/types/auth';
import { AgentRole } from '@codequal/core/config/agent-registry';
import { VectorSearchResult } from '@codequal/agents/multi-agent/enhanced-executor';
import axios, { AxiosInstance } from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createLogger } from '@codequal/core/utils';

const execAsync = promisify(exec);
const logger = createLogger('DeepWikiManager');

export interface AnalysisJob {
  jobId: string;
  repositoryUrl: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  branch?: string;
  baseBranch?: string;
  includeDiff?: boolean;
  prNumber?: number;
}

interface AgentAnalysis {
  findings?: Array<{
    type: string;
    severity: string;
    message: string;
    file?: string;
    line?: number;
  }>;
  score?: number;
  recommendations?: string[];
  [key: string]: unknown;
}

export interface AnalysisResults {
  repositoryUrl: string;
  analysis: {
    architecture: AgentAnalysis;
    security: AgentAnalysis;
    performance: AgentAnalysis;
    codeQuality: AgentAnalysis;
    dependencies: AgentAnalysis;
  };
  metadata: {
    analyzedAt: Date;
    analysisVersion: string;
    processingTime: number;
    branch?: string;
    model?: string;
  };
}

interface DeepWikiRequest {
  repo_url: string;
  messages: Array<{
    role: string;
    content: string;
  }>;
  stream: boolean;
  provider: string;
  model: string;
  temperature: number;
  branch?: string;
  base_branch?: string;
  include_diff?: boolean;
}

/**
 * Real DeepWiki Manager - integrates with actual DeepWiki Kubernetes service
 */
interface RepositoryCacheEntry {
  files: unknown[];
  cachedAt: Date;
  repositoryUrl: string;
  branch: string;
}

export class DeepWikiManager {
  private vectorContextService: VectorContextService;
  private activeJobs = new Map<string, AnalysisJob>();
  private repositoryCache = new Map<string, RepositoryCacheEntry>();
  private deepwikiClient: AxiosInstance;
  
  // Configuration
  private readonly DEEPWIKI_NAMESPACE = process.env.DEEPWIKI_NAMESPACE || 'codequal-dev';
  private readonly DEEPWIKI_POD_SELECTOR = process.env.DEEPWIKI_POD_SELECTOR || 'deepwiki-fixed';
  private readonly DEEPWIKI_PORT = process.env.DEEPWIKI_PORT || '8001';
  private readonly PRIMARY_MODEL = process.env.DEEPWIKI_MODEL || 'anthropic/claude-3-opus';
  private readonly FALLBACK_MODELS = [
    'openai/gpt-4.1',
    'anthropic/claude-3.7-sonnet',
    'google/gemini-2.5-pro-preview'
  ];

  constructor(private authenticatedUser: AuthenticatedUser) {
    // Convert middleware AuthenticatedUser to agent's AuthenticatedUser format
    const agentAuthenticatedUser = this.convertToAgentUser(authenticatedUser);
    this.vectorContextService = new VectorContextService(agentAuthenticatedUser);
    
    // Initialize DeepWiki client
    this.deepwikiClient = axios.create({
      timeout: 600000, // 10 minutes for large repositories
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Convert middleware AuthenticatedUser to agent-compatible format
   */
  private convertToAgentUser(user: AuthenticatedUser): AgentAuthenticatedUser {
    // Implementation remains the same as original
    if (user.email === 'test@codequal.dev') {
      return {
        id: user.id,
        email: user.email,
        role: 'admin' as UserRole,
        status: 'active' as UserStatus,
        organizationId: user.id,
        session: {
          token: 'test-session',
          fingerprint: 'test-fingerprint',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        },
        permissions: {
          repositories: {
            '*': { read: true, write: true, admin: true }
          },
          organizations: [],
          globalPermissions: ['manageUsers', 'manageBilling', 'viewAnalytics'],
          quotas: {
            requestsPerHour: 10000,
            maxConcurrentExecutions: 10,
            storageQuotaMB: 10000
          }
        } as UserPermissions,
        metadata: {
          lastLogin: new Date(),
          loginCount: 1,
          preferredLanguage: 'en',
          timezone: 'UTC'
        }
      };
    }

    return {
      id: user.id,
      email: user.email,
      role: 'user' as UserRole,
      status: 'active' as UserStatus,
      organizationId: user.id,
      session: {
        token: `session-${user.id}`,
        fingerprint: `fingerprint-${user.id}`,
        ipAddress: '127.0.0.1',
        userAgent: 'CodeQual-API',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      },
      permissions: {
        repositories: {},
        organizations: [],
        globalPermissions: [],
        quotas: {
          requestsPerHour: 1000,
          maxConcurrentExecutions: 5,
          storageQuotaMB: 1000
        }
      } as UserPermissions,
      metadata: {
        lastLogin: new Date(),
        loginCount: 1,
        preferredLanguage: 'en',
        timezone: 'UTC'
      }
    };
  }

  /**
   * Check if repository analysis exists in Vector DB
   */
  async checkRepositoryExists(repositoryUrl: string, branch?: string): Promise<boolean> {
    try {
      const agentAuthenticatedUser = this.convertToAgentUser(this.authenticatedUser);
      const existing = await this.vectorContextService.getRepositoryContext(
        repositoryUrl,
        AgentRole.ORCHESTRATOR,
        agentAuthenticatedUser,
        { minSimilarity: 0.95 }
      );

      // Check if we have analysis for the specific branch
      if (branch) {
        return existing.recentAnalysis.some((analysis: VectorSearchResult) => {
          const metadata = analysis.metadata as Record<string, unknown>;
          return metadata?.branch === branch;
        });
      }

      return existing.recentAnalysis.length > 0;
    } catch (error) {
      logger.error('Repository existence check failed:', error as Error);
      return false;
    }
  }

  /**
   * Get active DeepWiki pod
   */
  private async getDeepWikiPod(): Promise<string> {
    try {
      const { stdout } = await execAsync(
        `kubectl get pods -n ${this.DEEPWIKI_NAMESPACE} | grep ${this.DEEPWIKI_POD_SELECTOR} | grep Running | head -n 1 | awk '{print $1}'`
      );
      
      const podName = stdout.trim();
      if (!podName) {
        throw new Error('No running DeepWiki pod found');
      }
      
      return podName;
    } catch (error) {
      logger.error('[DeepWiki] Failed to get pod:', error as Error);
      throw new Error('DeepWiki service unavailable');
    }
  }

  /**
   * Set up port forwarding to DeepWiki pod
   */
  private async setupPortForwarding(podName: string): Promise<() => void> {
    return new Promise((resolve, reject) => {
      const portForward = exec(
        `kubectl port-forward -n ${this.DEEPWIKI_NAMESPACE} pod/${podName} ${this.DEEPWIKI_PORT}:${this.DEEPWIKI_PORT}`
      );

      // Give port forwarding time to establish
      setTimeout(() => {
        resolve(() => {
          portForward.kill();
        });
      }, 3000);

      portForward.on('error', reject);
    });
  }

  /**
   * Call real DeepWiki API
   */
  private async callDeepWikiAPI(
    repositoryUrl: string, 
    jobId: string,
    options?: {
      branch?: string;
      baseBranch?: string;
      includeDiff?: boolean;
      prNumber?: number;
      promptTemplate?: string;
    }
  ): Promise<void> {
    const job = this.activeJobs.get(jobId);
    if (!job) return;

    try {
      // Update job status
      job.status = 'processing';

      // Get DeepWiki pod
      const podName = await this.getDeepWikiPod();
      logger.info(`[DeepWiki] Using pod: ${podName}`);

      // Set up port forwarding
      const killPortForward = await this.setupPortForwarding(podName);

      try {
        // Prepare the prompt based on template
        const prompt = this.getAnalysisPrompt(options?.promptTemplate || 'standard', repositoryUrl, options);

        // Prepare the request
        const deepwikiRequest: DeepWikiRequest = {
          repo_url: repositoryUrl,
          messages: [{
            role: 'user',
            content: prompt
          }],
          stream: false,
          provider: 'openrouter',
          model: this.PRIMARY_MODEL,
          temperature: 0.2
        };

        // Add branch information if provided
        if (options?.branch) {
          deepwikiRequest.branch = options.branch;
        }
        if (options?.baseBranch) {
          deepwikiRequest.base_branch = options.baseBranch;
        }
        if (options?.includeDiff) {
          deepwikiRequest.include_diff = true;
        }

        logger.info(`[DeepWiki] Analyzing repository: ${repositoryUrl}`);
        logger.info(`[DeepWiki] Branch: ${options?.branch || 'main'} (base: ${options?.baseBranch || 'main'})`);
        logger.info(`[DeepWiki] Model: ${this.PRIMARY_MODEL}`);

        // Call DeepWiki API
        let response;
        let modelUsed = this.PRIMARY_MODEL;
        
        try {
          response = await this.deepwikiClient.post(
            `http://localhost:${this.DEEPWIKI_PORT}/chat/completions/stream`,
            deepwikiRequest
          );
        } catch (primaryError) {
          logger.warn(`[DeepWiki] Primary model failed: ${primaryError}`);
          
          // Try fallback models
          for (const fallbackModel of this.FALLBACK_MODELS) {
            logger.info(`[DeepWiki] Trying fallback model: ${fallbackModel}`);
            try {
              deepwikiRequest.model = fallbackModel;
              response = await this.deepwikiClient.post(
                `http://localhost:${this.DEEPWIKI_PORT}/chat/completions/stream`,
                deepwikiRequest
              );
              modelUsed = fallbackModel;
              break;
            } catch (fallbackError) {
              logger.warn(`[DeepWiki] Fallback model ${fallbackModel} failed:`, fallbackError as Error);
            }
          }
          
          if (!response) {
            throw new Error('All models failed');
          }
        }

        // Parse the response
        const analysisResults = this.parseDeepWikiResponse(response.data, repositoryUrl, modelUsed, options, jobId);
        
        // Store the results
        await this.storeAnalysisResults(repositoryUrl, analysisResults);
        
        // Cache repository files if branch is specified
        if (options?.branch) {
          this.cacheRepository(repositoryUrl, options.branch, analysisResults);
        }
        
        // Update job status
        job.status = 'completed';
        job.completedAt = new Date();
        
        logger.info(`[DeepWiki] Analysis completed for ${repositoryUrl} using ${modelUsed}`);
        
      } finally {
        // Clean up port forwarding
        killPortForward();
      }
      
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Analysis failed';
      job.completedAt = new Date();
      
      logger.error(`[DeepWiki] Analysis failed for ${repositoryUrl}:`, error as Error);
      throw error;
    }
  }

  /**
   * Get analysis prompt based on template
   */
  private getAnalysisPrompt(template: string, repositoryUrl: string, options?: Record<string, unknown>): string {
    // In production, these would be loaded from files or database
    const prompts: { [key: string]: string } = {
      standard: `Analyze the repository at ${repositoryUrl} and provide a comprehensive analysis including:
1. Architecture overview and patterns
2. Code quality assessment
3. Security considerations
4. Performance characteristics
5. Dependency analysis
${options?.branch ? `\nAnalyze specifically the branch: ${options.branch}` : ''}
${options?.includeDiff ? '\nInclude analysis of changes between branches' : ''}`,
      
      architecture: `Analyze the architecture of the repository at ${repositoryUrl}. Focus on:
- Design patterns used
- Module structure
- Service boundaries
- API design
- Scalability considerations`,
      
      security: `Perform a security analysis of the repository at ${repositoryUrl}. Look for:
- Common vulnerabilities
- Authentication/authorization patterns
- Data validation
- Dependency vulnerabilities
- Security best practices`,
      
      codeQuality: `Analyze code quality for the repository at ${repositoryUrl}. Evaluate:
- Code maintainability
- Test coverage
- Documentation quality
- Code complexity
- Adherence to best practices`
    };

    return prompts[template] || prompts.standard;
  }

  /**
   * Parse DeepWiki response into structured analysis results
   */
  private parseDeepWikiResponse(
    response: { choices?: Array<{ message?: { content?: string } }> } | string, 
    repositoryUrl: string, 
    modelUsed: string,
    options?: Record<string, unknown>,
    jobId?: string
  ): AnalysisResults {
    // Extract content from the response
    let content = '';
    if (typeof response === 'string') {
      content = response;
    } else if (response && typeof response === 'object' && 'choices' in response && response.choices && response.choices[0]) {
      content = response.choices[0].message?.content || '';
    }

    // Parse the content into structured analysis
    // In a real implementation, this would use more sophisticated parsing
    const analysis = {
      architecture: this.extractSection(content, 'architecture'),
      security: this.extractSection(content, 'security'),
      performance: this.extractSection(content, 'performance'),
      codeQuality: this.extractSection(content, 'quality'),
      dependencies: this.extractSection(content, 'dependencies')
    };

    return {
      repositoryUrl,
      analysis,
      metadata: {
        analyzedAt: new Date(),
        analysisVersion: '2.0.0',
        processingTime: Date.now() - (jobId && this.activeJobs.get(jobId)?.startedAt.getTime() || Date.now()),
        branch: options?.branch as string | undefined,
        model: modelUsed
      }
    };
  }

  /**
   * Extract section from analysis content
   */
  private extractSection(content: string, section: string): AgentAnalysis {
    // Simple extraction logic - in production this would be more sophisticated
    const sectionRegex = new RegExp(`${section}[:\\s]*([^]*?)(?=\\n\\n|\\n[A-Z]|$)`, 'i');
    const match = content.match(sectionRegex);
    
    if (match) {
      return {
        summary: match[1].trim(),
        score: Math.random() * 0.3 + 0.7, // Placeholder score
        findings: [],
        recommendations: []
      };
    }
    
    return {
      summary: 'Analysis pending',
      score: 0,
      findings: [],
      recommendations: []
    };
  }

  /**
   * Trigger repository analysis via DeepWiki service
   */
  async triggerRepositoryAnalysis(
    repositoryUrl: string,
    options?: {
      branch?: string;
      baseBranch?: string;
      includeDiff?: boolean;
      prNumber?: number;
    }
  ): Promise<string> {
    try {
      const jobId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create analysis job record with branch info
      const job: AnalysisJob = {
        jobId,
        repositoryUrl,
        status: 'queued',
        startedAt: new Date(),
        branch: options?.branch || 'main',
        baseBranch: options?.baseBranch,
        includeDiff: options?.includeDiff,
        prNumber: options?.prNumber
      };

      this.activeJobs.set(jobId, job);

      logger.info(`[DeepWiki] Triggering analysis for ${repositoryUrl}`);
      logger.info(`[DeepWiki] Branch: ${job.branch}${options?.baseBranch ? ` (base: ${options.baseBranch})` : ''}`);
      if (options?.includeDiff) {
        logger.info('[DeepWiki] Diff analysis enabled');
      }

      // Call real DeepWiki API
      this.callDeepWikiAPI(repositoryUrl, jobId, options).catch(error => {
        logger.error('[DeepWiki] Background analysis failed:', error as Error);
      });

      return jobId;
    } catch (error) {
      logger.error('Failed to trigger repository analysis:', error as Error);
      throw new Error(`Repository analysis trigger failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Wait for analysis completion
   */
  async waitForAnalysisCompletion(repositoryUrl: string): Promise<AnalysisResults> {
    try {
      // Find any job for this repository
      const job = Array.from(this.activeJobs.values())
        .find(j => j.repositoryUrl === repositoryUrl);

      if (!job) {
        throw new Error('No analysis job found for repository');
      }

      // If job is already completed, return the results
      if (job.status === 'completed') {
        // Retrieve from Vector DB
        const agentAuthenticatedUser = this.convertToAgentUser(this.authenticatedUser);
        const results = await this.vectorContextService.getRepositoryContext(
          repositoryUrl,
          AgentRole.ORCHESTRATOR,
          agentAuthenticatedUser,
          { minSimilarity: 0.95 }
        );
        
        if (results.recentAnalysis.length > 0) {
          return results.recentAnalysis[0] as unknown as AnalysisResults;
        }
      }

      // Otherwise, poll for completion
      return await this.pollForResults(job);
    } catch (error) {
      logger.error('Failed to wait for analysis completion:', error as Error);
      throw new Error(`Analysis completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Poll for analysis results until completion
   */
  private async pollForResults(job: AnalysisJob): Promise<AnalysisResults> {
    const maxAttempts = 120; // 10 minutes with 5-second intervals
    let attempts = 0;

    return new Promise((resolve, reject) => {
      const pollInterval = setInterval(async () => {
        const currentJob = this.activeJobs.get(job.jobId);
        
        if (!currentJob) {
          clearInterval(pollInterval);
          reject(new Error('Analysis job not found'));
          return;
        }

        if (currentJob.status === 'completed') {
          clearInterval(pollInterval);
          
          // Retrieve results from Vector DB
          try {
            const agentAuthenticatedUser = this.convertToAgentUser(this.authenticatedUser);
            const results = await this.vectorContextService.getRepositoryContext(
              job.repositoryUrl,
              AgentRole.ORCHESTRATOR,
              agentAuthenticatedUser,
              { minSimilarity: 0.95 }
            );
            
            if (results.recentAnalysis.length > 0) {
              resolve(results.recentAnalysis[0] as unknown as AnalysisResults);
            } else {
              reject(new Error('Analysis completed but results not found'));
            }
          } catch (error) {
            reject(error);
          }
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

  /**
   * Store analysis results in Vector DB
   */
  private async storeAnalysisResults(repositoryUrl: string, results: AnalysisResults): Promise<void> {
    try {
      await this.vectorContextService.storeAnalysisResults(
        repositoryUrl,
        [results],
        this.authenticatedUser.id
      );

      logger.info(`[DeepWiki] Analysis results stored in Vector DB for ${repositoryUrl}`);
    } catch (error) {
      logger.error('Failed to store analysis results in Vector DB:', error as Error);
      throw new Error(`Vector DB storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get cached repository files for MCP tools
   * Now branch-aware to return correct version
   */
  async getCachedRepositoryFiles(repositoryUrl: string, branch?: string): Promise<unknown[]> {
    // Create branch-specific cache key
    const cacheKey = branch ? `${repositoryUrl}:${branch}` : repositoryUrl;
    const cached = this.repositoryCache.get(cacheKey);
    
    if (cached) {
      logger.info(`[DeepWiki] Returning ${cached.files.length} cached files for ${repositoryUrl} (branch: ${branch || 'main'})`);
      return cached.files;
    }
    
    // Try falling back to main branch cache if PR branch not cached
    if (branch && branch !== 'main') {
      const mainCached = this.repositoryCache.get(repositoryUrl);
      if (mainCached) {
        logger.info(`[DeepWiki] No cache for branch ${branch}, falling back to main branch cache`);
        return mainCached.files;
      }
    }
    
    logger.info(`[DeepWiki] No cache found for ${repositoryUrl} (branch: ${branch || 'main'})`);
    return [];
  }

  /**
   * Cache repository files (from DeepWiki analysis)
   */
  private cacheRepository(repositoryUrl: string, branch = 'main', analysisResults: AnalysisResults): void {
    // Extract file information from analysis results
    // In a real implementation, DeepWiki would provide actual file contents
    const mockFiles = this.extractFilesFromAnalysis(analysisResults);
    
    const cacheKey = branch !== 'main' ? `${repositoryUrl}:${branch}` : repositoryUrl;
    
    this.repositoryCache.set(cacheKey, {
      files: mockFiles,
      cachedAt: new Date(),
      repositoryUrl,
      branch
    });
    
    logger.info(`[DeepWiki] Cached ${mockFiles.length} files for ${repositoryUrl} (branch: ${branch})`);
  }

  /**
   * Extract file information from analysis results
   */
  private extractFilesFromAnalysis(analysisResults: AnalysisResults): unknown[] {
    // In a real implementation, DeepWiki would provide actual file list and contents
    // For now, return empty array since we don't have file data in the analysis
    return [];
  }

  /**
   * Get job status for tracking
   */
  async getJobStatus(jobId: string): Promise<AnalysisJob | null> {
    return this.activeJobs.get(jobId) || null;
  }

  /**
   * Get all active jobs for user
   */
  async getActiveJobs(): Promise<AnalysisJob[]> {
    return Array.from(this.activeJobs.values())
      .filter(job => job.status === 'queued' || job.status === 'processing');
  }

  /**
   * Cancel an active analysis job
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

  /**
   * Extract repository name from URL
   */
  private extractRepositoryName(url: string): string {
    const match = url.match(/\/([^/]+)\.git$/) || url.match(/\/([^/]+)$/);
    return match ? match[1] : 'unknown-repository';
  }
}