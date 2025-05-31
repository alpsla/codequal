import { createLogger } from '@codequal/core/utils';
import { AgentRole } from '@codequal/core/config/agent-registry';
import { VectorSearchResult, RepositoryVectorContext } from './enhanced-executor';

/**
 * Agent-specific search configuration for Vector DB queries
 */
export interface AgentSearchConfig {
  role: AgentRole;
  searchTerms: string[];
  contentTypes: string[];
  maxResults: number;
  minSimilarity: number;
  timeWindowDays?: number;
}

/**
 * Vector Context Service - Replaces DeepWiki data extraction with Vector DB queries
 * Uses existing AuthenticatedRAGService for secure, tenant-isolated searches
 */
export class VectorContextService {
  private readonly logger = createLogger('VectorContextService');
  private readonly supabase: any; // Will be properly typed when integrated
  
  private readonly agentSearchConfigs: Map<AgentRole, AgentSearchConfig> = new Map([
    [AgentRole.CODE_QUALITY, {
      role: AgentRole.CODE_QUALITY,
      searchTerms: ['code quality', 'complexity', 'maintainability', 'technical debt', 'code smell'],
      contentTypes: ['analysis', 'review', 'recommendation'],
      maxResults: 10,
      minSimilarity: 0.7,
      timeWindowDays: 90
    }],
    
    [AgentRole.SECURITY, {
      role: AgentRole.SECURITY,
      searchTerms: ['security', 'vulnerability', 'authentication', 'authorization', 'compliance'],
      contentTypes: ['security_analysis', 'vulnerability_report', 'compliance_check'],
      maxResults: 15,
      minSimilarity: 0.8,
      timeWindowDays: 180
    }],
    
    [AgentRole.PERFORMANCE, {
      role: AgentRole.PERFORMANCE,
      searchTerms: ['performance', 'optimization', 'bottleneck', 'latency', 'throughput'],
      contentTypes: ['performance_analysis', 'benchmark', 'optimization'],
      maxResults: 8,
      minSimilarity: 0.7,
      timeWindowDays: 60
    }],
    
    [AgentRole.DEPENDENCY, {
      role: AgentRole.DEPENDENCY,
      searchTerms: ['dependency', 'package', 'version', 'vulnerability', 'license'],
      contentTypes: ['dependency_analysis', 'package_audit', 'license_check'],
      maxResults: 12,
      minSimilarity: 0.75,
      timeWindowDays: 30
    }]
  ]);

  constructor(
    private readonly authenticatedRAGService: any, // Will be properly typed when integrated
    supabaseClient?: any // Will be properly typed when integrated
  ) {
    // 🔒 SECURITY: Use same Supabase client as AuthenticatedRAGService for consistency
    this.supabase = supabaseClient || this.authenticatedRAGService.supabase;
    this.logger.debug('VectorContextService initialized', {
      supportedRoles: Array.from(this.agentSearchConfigs.keys())
    });
  }

  /**
   * Get agent-specific repository context from Vector DB
   */
  async getRepositoryContext(
    repositoryId: string,
    agentRole: AgentRole,
    userId: string,
    options: {
      maxResults?: number;
      minSimilarity?: number;
      includeHistorical?: boolean;
    } = {}
  ): Promise<RepositoryVectorContext> {
    const config = this.agentSearchConfigs.get(agentRole);
    if (!config) {
      throw new Error(`No search configuration for agent role: ${agentRole}`);
    }

    this.logger.debug('Getting repository context', {
      repositoryId,
      role: agentRole,
      userId
    });

    try {
      // Search for agent-specific content in this repository
      const recentAnalysis = await this.searchRepositoryContent(
        repositoryId,
        config,
        userId,
        options
      );

      // Get historical patterns if requested
      const historicalPatterns = options.includeHistorical 
        ? await this.searchHistoricalPatterns(repositoryId, config, userId)
        : [];

      // Calculate confidence based on data quality and recency
      const confidenceScore = this.calculateConfidenceScore(recentAnalysis);

      const context: RepositoryVectorContext = {
        repositoryId,
        recentAnalysis,
        historicalPatterns,
        similarIssues: [], // Will be populated by cross-repo search
        confidenceScore,
        lastUpdated: new Date()
      };

      this.logger.info('Successfully retrieved repository context', {
        repositoryId,
        role: agentRole,
        resultsCount: recentAnalysis.length,
        confidence: confidenceScore
      });

      return context;
    } catch (error) {
      this.logger.error('Failed to get repository context', {
        repositoryId,
        role: agentRole,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return this.createEmptyContext(repositoryId);
    }
  }

  /**
   * Get cross-repository patterns for learning
   * 🔒 SECURITY: Implements strict access control and content sanitization
   */
  async getCrossRepositoryPatterns(
    agentRole: AgentRole,
    searchQuery: string,
    userId: string,
    options: {
      maxResults?: number;
      excludeRepositoryId?: string;
      respectUserPermissions?: boolean;
      sanitizeContent?: boolean;
      anonymizeMetadata?: boolean;
    } = {}
  ): Promise<VectorSearchResult[]> {
    const config = this.agentSearchConfigs.get(agentRole);
    if (!config) {
      return [];
    }

    try {
      // 🔒 SECURITY: First get user's accessible repositories
      const userAccessibleRepos = await this.getUserAccessibleRepositories(userId);
      
      if (userAccessibleRepos.length === 0) {
        this.logger.warn('User has no accessible repositories for cross-repo patterns', { userId });
        return [];
      }

      // 🔒 SECURITY: Filter out current repository and limit to user's repos
      const targetRepositories = userAccessibleRepos.filter(
        repoId => repoId !== options.excludeRepositoryId
      );

      if (targetRepositories.length === 0) {
        this.logger.debug('No other accessible repositories for cross-repo patterns', { 
          userId, 
          excludeRepo: options.excludeRepositoryId 
        });
        return [];
      }

      // 🔒 SECURITY: Use AuthenticatedRAGService with strict access controls
      const searchOptions = {
        query: `${agentRole} ${searchQuery}`,
        max_results: options.maxResults || config.maxResults,
        similarity_threshold: config.minSimilarity,
        content_type_filter: config.contentTypes,
        // 🔒 CRITICAL: Only search repositories user has access to
        repository_filter: targetRepositories,
        respect_repository_access: options.respectUserPermissions ?? true,
        exclude_repository_id: options.excludeRepositoryId
      };

      const results = await this.authenticatedRAGService.search(searchOptions, userId);
      
      const mappedResults = results.map((result: any) => this.mapToVectorSearchResult(result));
      
      // 🔒 SECURITY: Sanitize results for cross-repository sharing
      return this.sanitizeCrossRepoResults(
        mappedResults,
        options.sanitizeContent ?? true,
        options.anonymizeMetadata ?? true
      );
    } catch (error) {
      this.logger.error('Failed to get cross-repository patterns', {
        role: agentRole,
        query: searchQuery,
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Store analysis results in Vector DB with replace strategy
   */
  async storeAnalysisResults(
    repositoryId: string,
    analysisResults: any[],
    userId: string
  ): Promise<void> {
    try {
      this.logger.debug('Storing analysis results with replace strategy', {
        repositoryId,
        resultsCount: analysisResults.length
      });

      // 1. Delete existing analysis for this repository
      await this.deleteRepositoryAnalysis(repositoryId, userId);

      // 2. Insert new analysis chunks
      const chunks = this.createAnalysisChunks(repositoryId, analysisResults);
      await this.insertAnalysisChunks(chunks, userId);

      this.logger.info('Successfully stored analysis results', {
        repositoryId,
        chunksStored: chunks.length
      });
    } catch (error) {
      this.logger.error('Failed to store analysis results', {
        repositoryId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Search repository-specific content
   */
  private async searchRepositoryContent(
    repositoryId: string,
    config: AgentSearchConfig,
    userId: string,
    options: any
  ): Promise<VectorSearchResult[]> {
    const searchOptions = {
      query: config.searchTerms.join(' '),
      repository_filter: [repositoryId],
      content_type_filter: config.contentTypes,
      max_results: options.maxResults || config.maxResults,
      similarity_threshold: options.minSimilarity || config.minSimilarity,
      respect_repository_access: true
    };

    const results = await this.authenticatedRAGService.search(searchOptions, userId);
    return results.map((result: any) => this.mapToVectorSearchResult(result));
  }

  /**
   * Search historical patterns in repository
   */
  private async searchHistoricalPatterns(
    repositoryId: string,
    config: AgentSearchConfig,
    userId: string
  ): Promise<VectorSearchResult[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - (config.timeWindowDays || 90));

    const searchOptions = {
      query: `historical ${config.searchTerms.join(' ')} patterns`,
      repository_filter: [repositoryId],
      max_results: 5,
      similarity_threshold: 0.6,
      date_filter: {
        before: cutoffDate.toISOString()
      },
      respect_repository_access: true
    };

    const results = await this.authenticatedRAGService.search(searchOptions, userId);
    return results.map((result: any) => this.mapToVectorSearchResult(result));
  }

  /**
   * Delete existing repository analysis (replace strategy)
   */
  private async deleteRepositoryAnalysis(repositoryId: string, _userId: string): Promise<void> {
    // This would call the Vector DB delete function
    // Implementation depends on the specific Vector DB service
    this.logger.debug('Deleting existing analysis', { repositoryId });
    // await this.vectorDB.deleteWhere({ repository_id: repositoryId });
  }

  /**
   * Create analysis chunks for Vector DB storage
   */
  private createAnalysisChunks(repositoryId: string, analysisResults: any[]): any[] {
    return analysisResults.flatMap(result => {
      const baseMetadata = {
        repository_id: repositoryId,
        analysis_type: result.type || 'general',
        created_at: new Date().toISOString(),
        importance_score: this.calculateImportanceScore(result)
      };

      return result.findings?.map((finding: any, index: number) => ({
        id: `${repositoryId}-${result.type}-${index}`,
        content: this.formatFindingContent(finding),
        metadata: {
          ...baseMetadata,
          content_type: 'finding',
          severity: finding.severity,
          file_path: finding.location,
          finding_type: finding.type
        }
      })) || [];
    });
  }

  /**
   * Insert analysis chunks into Vector DB
   */
  private async insertAnalysisChunks(chunks: any[], _userId: string): Promise<void> {
    // This would call the Vector DB insert function
    // Implementation depends on the specific Vector DB service
    this.logger.debug('Inserting analysis chunks', { count: chunks.length });
    // await this.vectorDB.insert(chunks);
  }

  /**
   * Map RAG service result to VectorSearchResult
   */
  private mapToVectorSearchResult(result: any): VectorSearchResult {
    return {
      content: result.content || '',
      metadata: {
        repository_id: result.metadata?.repository_id || '',
        content_type: result.metadata?.content_type || '',
        file_path: result.metadata?.file_path,
        language: result.metadata?.language,
        framework: result.metadata?.framework,
        analysis_type: result.metadata?.analysis_type,
        severity: result.metadata?.severity,
        importance_score: result.metadata?.importance_score,
        created_at: result.metadata?.created_at || new Date().toISOString()
      },
      similarity_score: result.similarity_score || 0
    };
  }

  /**
   * Calculate confidence score based on result quality
   */
  private calculateConfidenceScore(results: VectorSearchResult[]): number {
    if (results.length === 0) return 0;

    const avgSimilarity = results.reduce((sum, r) => sum + r.similarity_score, 0) / results.length;
    const recencyScore = this.calculateRecencyScore(results);
    const volumeScore = Math.min(results.length / 10, 1);

    return (avgSimilarity * 0.4 + recencyScore * 0.3 + volumeScore * 0.3);
  }

  /**
   * Calculate recency score from results
   */
  private calculateRecencyScore(results: VectorSearchResult[]): number {
    const now = Date.now();
    const avgAge = results.reduce((sum, result) => {
      const createdAt = new Date(result.metadata.created_at).getTime();
      return sum + (now - createdAt);
    }, 0) / results.length;

    const daysSinceAnalysis = avgAge / (1000 * 60 * 60 * 24);
    return Math.max(0, 1 - (daysSinceAnalysis / 30));
  }

  /**
   * Calculate importance score for analysis result
   */
  private calculateImportanceScore(result: any): number {
    let score = 0.5; // Base score

    // Increase score based on severity
    if (result.severity === 'critical') score += 0.4;
    else if (result.severity === 'high') score += 0.3;
    else if (result.severity === 'medium') score += 0.2;

    // Increase score based on findings count
    const findingsCount = result.findings?.length || 0;
    score += Math.min(findingsCount * 0.05, 0.3);

    return Math.min(score, 1.0);
  }

  /**
   * Format finding content for Vector DB storage
   */
  private formatFindingContent(finding: any): string {
    return `${finding.type}: ${finding.description}${finding.suggestion ? ` Suggestion: ${finding.suggestion}` : ''}`;
  }

  /**
   * Get user's accessible repositories from existing security layer
   * 🔒 SECURITY: Uses authenticated RAG service's access control
   */
  private async getUserAccessibleRepositories(userId: string): Promise<string[]> {
    try {
      // 🔒 SECURITY: Leverage existing repository access control
      // This should call the same logic as AuthenticatedRAGService.filterResultsByAccess
      const { data: userRepos, error } = await this.supabase
        .from('repositories')
        .select('id')
        .eq('user_id', userId);

      if (error) {
        this.logger.warn('Failed to fetch user accessible repositories', { error, userId });
        return [];
      }

      return userRepos?.map((repo: any) => repo.id) || [];
    } catch (error) {
      this.logger.error('Error getting user accessible repositories', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Sanitize cross-repository results to prevent data leakage
   * 🔒 SECURITY: Removes sensitive information from cross-repo patterns
   */
  private sanitizeCrossRepoResults(
    results: VectorSearchResult[],
    sanitizeContent: boolean,
    anonymizeMetadata: boolean
  ): VectorSearchResult[] {
    return results.map(result => ({
      ...result,
      // 🔒 SECURITY: Sanitize content to remove specific details
      content: sanitizeContent ? this.sanitizeContent(result.content) : result.content,
      metadata: {
        ...result.metadata,
        // 🔒 SECURITY: Remove sensitive metadata for cross-repo sharing
        file_path: anonymizeMetadata ? undefined : result.metadata.file_path,
        // Keep only essential metadata for pattern learning
        repository_id: anonymizeMetadata ? '[EXTERNAL_REPO]' : result.metadata.repository_id,
        content_type: result.metadata.content_type,
        analysis_type: result.metadata.analysis_type,
        severity: result.metadata.severity,
        importance_score: result.metadata.importance_score,
        created_at: result.metadata.created_at
      }
    }));
  }

  /**
   * Sanitize content to remove specific identifiers
   * 🔒 SECURITY: Anonymizes patterns while preserving learning value
   */
  private sanitizeContent(content: string): string {
    return content
      // Remove specific file paths
      .replace(/\/[^\s/]+\.(ts|js|py|java|cpp|c|h|rb|php|go|rs)/gi, '/[FILE]')
      // Remove class names but keep structure
      .replace(/class\s+[A-Za-z_][A-Za-z0-9_]*/g, 'class [CLASS_NAME]')
      // Remove function names but keep structure
      .replace(/function\s+[A-Za-z_][A-Za-z0-9_]*/g, 'function [FUNCTION_NAME]')
      // Remove variable names in declarations
      .replace(/(let|const|var)\s+[A-Za-z_][A-Za-z0-9_]*/g, '$1 [VARIABLE]')
      // Remove specific URLs or endpoints
      .replace(/https?:\/\/[^\s]+/g, '[URL]')
      // Remove API keys or tokens (common patterns)
      .replace(/['"][A-Za-z0-9]{20,}['"]/g, '[API_KEY]')
      // Remove email addresses
      .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[EMAIL]');
  }

  /**
   * Create empty context when no data available
   */
  private createEmptyContext(repositoryId: string): RepositoryVectorContext {
    return {
      repositoryId,
      recentAnalysis: [],
      historicalPatterns: [],
      similarIssues: [],
      confidenceScore: 0,
      lastUpdated: new Date()
    };
  }
}

/**
 * Factory function to create Vector Context Service
 */
export function createVectorContextService(authenticatedRAGService: any): VectorContextService {
  return new VectorContextService(authenticatedRAGService);
}