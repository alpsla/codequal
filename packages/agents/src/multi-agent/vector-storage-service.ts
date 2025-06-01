import { createLogger } from '@codequal/core/utils';
import { AuthenticatedUser, SecurityEvent, AuthenticationError } from './types/auth';

/**
 * Analysis result for Vector DB storage
 */
export interface AnalysisResult {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  findings: Array<{
    type: string;
    severity: string;
    location: string;
    description: string;
    suggestion?: string;
  }>;
  metrics: Record<string, any>;
  recommendations: string[];
  summary: string;
  categories: string[];
}

/**
 * Vector DB chunk for storage
 */
export interface VectorChunk {
  id: string;
  content: string;
  metadata: {
    repository_id: string;
    content_type: string;
    analysis_type?: string;
    severity?: string;
    file_path?: string;
    language?: string;
    framework?: string;
    finding_type?: string;
    importance_score: number;
    created_at: string;
    user_id: string;
  };
}

/**
 * Vector Storage Service - Implements replace strategy for repository analysis
 * Integrates with existing AuthenticatedRAGService for secure storage
 */
export class VectorStorageService {
  private readonly logger = createLogger('VectorStorageService');

  constructor(
    private readonly authenticatedRAGService: any // Will be properly typed when integrated
  ) {
    this.logger.debug('VectorStorageService initialized');
  }

  /**
   * Store analysis results with replace strategy
   * 🔒 SECURITY: Validates repository access before storage operations
   * 1. Verify user has write access to repository
   * 2. Delete existing analysis for repository 
   * 3. Insert new analysis chunks with proper isolation
   */
  async storeAnalysisResults(
    repositoryId: string,
    analysisResults: AnalysisResult[],
    authenticatedUser: AuthenticatedUser,
    options: {
      language?: string;
      framework?: string;
      replaceExisting?: boolean;
    } = {}
  ): Promise<{ stored: number; errors: number }> {
    
    // 🔒 SECURITY: Validate repository access before any operations
    await this.validateRepositoryAccess(repositoryId, authenticatedUser, 'write');
    
    this.logger.info('Storing analysis results with replace strategy', {
      repositoryId,
      resultsCount: analysisResults.length,
      userId: authenticatedUser.id,
      replaceExisting: options.replaceExisting ?? true
    });

    let storedCount = 0;
    let errorCount = 0;

    try {
      // Step 1: Delete existing analysis if replace strategy
      if (options.replaceExisting !== false) {
        await this.deleteRepositoryAnalysis(repositoryId, authenticatedUser.id);
      }

      // Step 2: Create and insert new chunks
      const chunks = this.createAnalysisChunks(
        repositoryId, 
        analysisResults, 
        authenticatedUser.id, 
        options
      );

      if (chunks.length === 0) {
        this.logger.warn('No chunks created from analysis results', { repositoryId });
        return { stored: 0, errors: 0 };
      }

      // Step 3: Insert chunks in batches for performance
      const batchSize = 50;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        
        try {
          await this.insertChunkBatch(batch);
          storedCount += batch.length;
          
          this.logger.debug('Stored chunk batch', {
            repositoryId,
            batchIndex: Math.floor(i / batchSize) + 1,
            batchSize: batch.length,
            totalStored: storedCount
          });
        } catch (error) {
          this.logger.error('Failed to store chunk batch', {
            repositoryId,
            batchIndex: Math.floor(i / batchSize) + 1,
            error: error instanceof Error ? error.message : String(error)
          });
          errorCount += batch.length;
        }
      }

      this.logger.info('Analysis storage completed', {
        repositoryId,
        totalChunks: chunks.length,
        stored: storedCount,
        errors: errorCount,
        successRate: `${((storedCount / chunks.length) * 100).toFixed(1)}%`
      });

      return { stored: storedCount, errors: errorCount };
    } catch (error) {
      this.logger.error('Failed to store analysis results', {
        repositoryId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Validate user has required access to repository
   * 🔒 SECURITY: Prevents unauthorized data access/modification
   */
  private async validateRepositoryAccess(
    repositoryId: string,
    authenticatedUser: AuthenticatedUser,
    accessType: 'read' | 'write' = 'read'
  ): Promise<void> {
    const repositoryPermissions = authenticatedUser.permissions.repositories[repositoryId];
    
    if (!repositoryPermissions || !repositoryPermissions[accessType]) {
      const securityEvent: SecurityEvent = {
        type: 'ACCESS_DENIED',
        userId: authenticatedUser.id,
        sessionId: authenticatedUser.session.fingerprint,
        repositoryId,
        ipAddress: authenticatedUser.session.ipAddress,
        userAgent: authenticatedUser.session.userAgent,
        timestamp: new Date(),
        details: {
          service: 'VectorStorageService',
          reason: `Repository ${accessType} access denied`,
          requiredPermission: accessType,
          userPermissions: repositoryPermissions || {}
        },
        severity: 'high'
      };

      this.logger.error('Repository access denied in VectorStorageService', {
        userId: authenticatedUser.id,
        repositoryId,
        accessType,
        userPermissions: repositoryPermissions
      });

      // TODO: Log security event to audit system
      // await this.logSecurityEvent(securityEvent);

      throw new Error(
        `${AuthenticationError.REPOSITORY_ACCESS_DENIED}: User ${authenticatedUser.id} does not have ${accessType} access to repository ${repositoryId}`
      );
    }

    this.logger.debug('Repository access validated for VectorStorageService', {
      userId: authenticatedUser.id,
      repositoryId,
      accessType,
      granted: true
    });
  }

  /**
   * Delete all existing analysis for a repository (replace strategy)
   * 🔒 SECURITY: Repository access already validated by caller
   */
  private async deleteRepositoryAnalysis(
    repositoryId: string, 
    userId: string
  ): Promise<void> {
    try {
      this.logger.debug('Deleting existing repository analysis', { repositoryId, userId });
      
      // 🔒 SECURITY: Use authenticated service for deletion with user context
      await this.authenticatedRAGService.deleteByRepository?.(repositoryId, userId);
      
      this.logger.debug('Successfully deleted existing analysis', { repositoryId });
    } catch (error) {
      this.logger.error('Failed to delete existing analysis', {
        repositoryId,
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Create Vector DB chunks from analysis results
   * 🔒 SECURITY: Sanitizes content and ensures proper metadata isolation
   */
  private createAnalysisChunks(
    repositoryId: string,
    analysisResults: AnalysisResult[],
    userId: string,
    options: { language?: string; framework?: string }
  ): VectorChunk[] {
    const chunks: VectorChunk[] = [];
    const timestamp = new Date().toISOString();

    analysisResults.forEach((result, resultIndex) => {
      // 🔒 SECURITY: Validate and sanitize input data
      const sanitizedResult = this.sanitizeAnalysisResult(result);
      
      const baseMetadata = {
        repository_id: repositoryId,
        analysis_type: sanitizedResult.type,
        created_at: timestamp,
        user_id: userId, // 🔒 SECURITY: Always include user context for access control
        language: options.language,
        framework: options.framework
      };

      // Create chunks for findings
      sanitizedResult.findings.forEach((finding, findingIndex) => {
        const chunkId = `${repositoryId}-${sanitizedResult.type}-finding-${resultIndex}-${findingIndex}`;
        
        chunks.push({
          id: chunkId,
          content: this.formatFindingContent(finding),
          metadata: {
            ...baseMetadata,
            content_type: 'finding',
            severity: finding.severity,
            file_path: finding.location,
            finding_type: finding.type,
            importance_score: this.calculateFindingImportance(finding, result)
          }
        });
      });

      // Create chunk for summary
      if (result.summary) {
        const summaryId = `${repositoryId}-${result.type}-summary-${resultIndex}`;
        
        chunks.push({
          id: summaryId,
          content: `${result.type} Analysis Summary: ${result.summary}`,
          metadata: {
            ...baseMetadata,
            content_type: 'summary',
            severity: result.severity,
            importance_score: this.calculateSummaryImportance(result)
          }
        });
      }

      // Create chunks for recommendations
      sanitizedResult.recommendations.forEach((recommendation, recIndex) => {
        const recId = `${repositoryId}-${sanitizedResult.type}-recommendation-${resultIndex}-${recIndex}`;
        
        chunks.push({
          id: recId,
          content: `${sanitizedResult.type} Recommendation: ${recommendation}`,
          metadata: {
            ...baseMetadata,
            content_type: 'recommendation',
            importance_score: 0.8 // Recommendations are generally important
          }
        });
      });

      // Create chunk for metrics (if significant)
      if (sanitizedResult.metrics && Object.keys(sanitizedResult.metrics).length > 0) {
        const metricsId = `${repositoryId}-${sanitizedResult.type}-metrics-${resultIndex}`;
        
        chunks.push({
          id: metricsId,
          content: this.formatMetricsContent(sanitizedResult.type, sanitizedResult.metrics),
          metadata: {
            ...baseMetadata,
            content_type: 'metrics',
            importance_score: 0.6
          }
        });
      }
    });

    this.logger.debug('Created analysis chunks', {
      repositoryId,
      inputResults: analysisResults.length,
      outputChunks: chunks.length,
      chunkTypes: this.getChunkTypeDistribution(chunks)
    });

    return chunks;
  }

  /**
   * Insert a batch of chunks into Vector DB
   */
  private async insertChunkBatch(chunks: VectorChunk[]): Promise<void> {
    // This would call the Vector DB insert function
    // Implementation depends on the specific Vector DB service API
    await this.authenticatedRAGService.insertChunks?.(chunks);
  }

  /**
   * Format finding content for Vector DB storage
   */
  private formatFindingContent(finding: any): string {
    let content = `${finding.type}: ${finding.description}`;
    
    if (finding.location) {
      content += ` (Location: ${finding.location})`;
    }
    
    if (finding.suggestion) {
      content += ` Suggestion: ${finding.suggestion}`;
    }
    
    return content;
  }

  /**
   * Format metrics content for Vector DB storage
   */
  private formatMetricsContent(analysisType: string, metrics: Record<string, any>): string {
    const metricEntries = Object.entries(metrics)
      .filter(([_, value]) => value !== null && value !== undefined)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    
    return `${analysisType} Metrics: ${metricEntries}`;
  }

  /**
   * Calculate importance score for a finding
   */
  private calculateFindingImportance(finding: any, result: AnalysisResult): number {
    let score = 0.5; // Base score

    // Severity contribution
    switch (finding.severity) {
      case 'critical': score += 0.4; break;
      case 'high': score += 0.3; break;
      case 'medium': score += 0.2; break;
      case 'low': score += 0.1; break;
    }

    // Analysis type contribution
    if (['security', 'vulnerability'].includes(result.type)) {
      score += 0.1; // Security findings are generally more important
    }

    return Math.min(score, 1.0);
  }

  /**
   * Calculate importance score for a summary
   */
  private calculateSummaryImportance(result: AnalysisResult): number {
    let score = 0.7; // Base score for summaries

    // Severity contribution
    switch (result.severity) {
      case 'critical': score += 0.3; break;
      case 'high': score += 0.2; break;
      case 'medium': score += 0.1; break;
    }

    // Findings count contribution
    const findingsCount = result.findings.length;
    score += Math.min(findingsCount * 0.02, 0.2);

    return Math.min(score, 1.0);
  }

  /**
   * Sanitize analysis result to prevent injection or data leakage
   * 🔒 SECURITY: Validates and cleans input data
   */
  private sanitizeAnalysisResult(result: AnalysisResult): AnalysisResult {
    return {
      ...result,
      type: this.sanitizeString(result.type),
      summary: this.sanitizeString(result.summary),
      findings: result.findings.map(finding => ({
        ...finding,
        type: this.sanitizeString(finding.type),
        description: this.sanitizeString(finding.description),
        location: this.sanitizeString(finding.location),
        suggestion: finding.suggestion ? this.sanitizeString(finding.suggestion) : undefined
      })),
      recommendations: result.recommendations.map(rec => this.sanitizeString(rec)),
      categories: result.categories.map(cat => this.sanitizeString(cat))
    };
  }

  /**
   * Sanitize string inputs to prevent injection attacks
   * 🔒 SECURITY: Basic sanitization for user inputs
   */
  private sanitizeString(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }
    
    return input
      // Remove potential script tags
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      // Remove potential SQL injection patterns
      .replace(/('|(--)|;|(\|\|)|(\*\*))/g, '')
      // Limit length to prevent DoS
      .substring(0, 10000)
      // Basic HTML entity encoding for safety
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  /**
   * Get distribution of chunk types for logging
   */
  private getChunkTypeDistribution(chunks: VectorChunk[]): Record<string, number> {
    return chunks.reduce((dist, chunk) => {
      const type = chunk.metadata.content_type;
      dist[type] = (dist[type] || 0) + 1;
      return dist;
    }, {} as Record<string, number>);
  }
}

/**
 * Factory function to create Vector Storage Service
 */
export function createVectorStorageService(authenticatedRAGService: any): VectorStorageService {
  return new VectorStorageService(authenticatedRAGService);
}