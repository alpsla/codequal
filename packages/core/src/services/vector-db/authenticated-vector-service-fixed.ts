import { getSupabase } from '@codequal/database/supabase/client';
import { createLogger } from '../../utils/logger';
import { adaptedEmbeddingService } from './embedding-service-with-adapter';
import { getEmbeddingConfig, getModelForContent, EMBEDDING_MODELS } from '../../config/embedding-models';

export interface VectorSearchOptions {
  userId: string;
  query: string;
  repositoryId?: number;
  contentType?: 'code' | 'documentation' | 'config' | 'test';
  language?: string;
  minImportance?: number;
  includeOrganization?: boolean;
  includePublic?: boolean;
  limit?: number;
}

export interface SkillSearchOptions {
  userId: string;
  skillCategory?: string;
  minSimilarity?: number;
  limit?: number;
}

export interface EducationalContentOptions {
  userId: string;
  skillCategory?: string;
  limit?: number;
}

export class AuthenticatedVectorService {
  private logger = createLogger('AuthenticatedVectorService');
  private supabase = getSupabase();

  constructor() {
    // Using adapted embedding service for dimension consistency
    this.logger.info('Using adapted embedding service with automatic dimension standardization');
  }

  /**
   * Create embedding for text with dimension adaptation
   */
  private async createEmbedding(text: string, contentType?: string): Promise<number[]> {
    try {
      // Use adapted embedding service
      const result = await adaptedEmbeddingService.createEmbedding(text, {
        contentType
      });
      
      // Log if adaptation was needed
      if (result.metadata.adaptationMethod !== 'none') {
        this.logger.info('Embedding adapted', {
          original: result.metadata.originalDimension,
          adapted: result.metadata.adaptedDimension,
          method: result.metadata.adaptationMethod,
          model: result.metadata.modelUsed
        });
      }
      
      return result.embedding;
    } catch (error) {
      this.logger.error('Failed to create embedding', { error });
      throw error;
    }
  }

  /**
   * Search documents with user access control
   */
  async searchDocuments(options: VectorSearchOptions) {
    const {
      userId,
      query,
      repositoryId,
      contentType,
      language,
      minImportance = 0.0,
      includeOrganization = true,
      includePublic = true,
      limit = 10
    } = options;

    try {
      // Create embedding for the query
      const queryEmbedding = await this.createEmbedding(query, contentType);

      // Call the database function with user context
      const { data, error } = await this.supabase.rpc('rag_search_user_documents', {
        p_user_id: userId,
        query_embedding: queryEmbedding,
        repository_filter: repositoryId,
        content_type_filter: contentType,
        language_filter: language,
        min_importance: minImportance,
        include_organization: includeOrganization,
        include_public: includePublic,
        match_count: limit
      });

      if (error) {
        // Log the failed search attempt before throwing
        await this.logVectorAccess(userId, 'search', 'document', query, false, error.message);
        throw error;
      }

      // Log the successful search for analytics
      await this.logVectorAccess(userId, 'search', 'document', query, true);

      return {
        results: data || [],
        metadata: {
          embeddingDimension: queryEmbedding.length,
          resultCount: (data && Array.isArray(data)) ? data.length : 0
        }
      };
    } catch (error) {
      this.logger.error('Document search failed', { 
        error,
        userId,
        query: query.substring(0, 50) 
      });
      throw error;
    }
  }

  /**
   * Store document with embedding
   */
  async storeDocument(options: {
    userId: string;
    content: string;
    contentType?: string;
    metadata?: any;
    repositoryId?: number;
  }) {
    const { userId, content, contentType, metadata, repositoryId } = options;
    
    try {
      // Create embedding with adaptation
      const result = await adaptedEmbeddingService.createEmbedding(content, {
        contentType
      });

      // Store in vector database
      const { data, error } = await this.supabase
        .from('vector_documents')
        .insert({
          user_id: userId,
          content,
          embedding: result.embedding,
          content_type: contentType,
          repository_id: repositoryId,
          metadata: {
            ...metadata,
            embedding_metadata: result.metadata
          }
        })
        .select()
        .single();

      if (error) {
        await this.logVectorAccess(userId, 'store', 'document', content.substring(0, 50), false, error.message);
        throw error;
      }

      await this.logVectorAccess(userId, 'store', 'document', content.substring(0, 50), true);

      return {
        id: data.id,
        embeddingMetadata: result.metadata
      };
    } catch (error) {
      this.logger.error('Document storage failed', { error, userId });
      throw error;
    }
  }

  /**
   * Search for similar skills with user context
   */
  async searchSkills(options: SkillSearchOptions) {
    const {
      userId,
      skillCategory,
      minSimilarity = 0.7,
      limit = 10
    } = options;

    try {
      const { data, error } = await this.supabase.rpc('rag_search_skills', {
        p_user_id: userId,
        skill_category_filter: skillCategory,
        min_similarity: minSimilarity,
        match_count: limit
      });

      if (error) {
        await this.logVectorAccess(userId, 'search', 'skill', skillCategory || 'all', false, error.message);
        throw error;
      }

      await this.logVectorAccess(userId, 'search', 'skill', skillCategory || 'all', true);

      return data || [];
    } catch (error) {
      this.logger.error('Skill search failed', { error, userId });
      throw error;
    }
  }

  /**
   * Get educational content recommendations
   */
  async getEducationalContent(options: EducationalContentOptions) {
    const {
      userId,
      skillCategory,
      limit = 5
    } = options;

    try {
      const { data, error } = await this.supabase.rpc('rag_get_educational_content', {
        p_user_id: userId,
        skill_category_filter: skillCategory,
        match_count: limit
      });

      if (error) {
        await this.logVectorAccess(userId, 'fetch', 'educational', skillCategory || 'all', false, error.message);
        throw error;
      }

      await this.logVectorAccess(userId, 'fetch', 'educational', skillCategory || 'all', true);

      return data || [];
    } catch (error) {
      this.logger.error('Educational content fetch failed', { error, userId });
      throw error;
    }
  }

  /**
   * Log vector access for analytics and monitoring
   */
  private async logVectorAccess(
    userId: string,
    action: string,
    resourceType: string,
    resource: string,
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    try {
      await this.supabase
        .from('vector_operation_logs')
        .insert({
          user_id: userId,
          operation: `${action}_${resourceType}`,
          success,
          error_message: errorMessage,
          metadata: {
            action,
            resourceType,
            resource: resource.substring(0, 100), // Limit resource string length
            timestamp: new Date().toISOString()
          }
        });
    } catch (error) {
      // Don't throw - logging failures shouldn't break main operations
      this.logger.error('Failed to log vector access', { error });
    }
  }

  /**
   * Get user's vector usage statistics
   */
  async getUserVectorStats(userId: string, timeframe: '24h' | '7d' | '30d' = '7d') {
    const intervals = {
      '24h': '24 hours',
      '7d': '7 days',
      '30d': '30 days'
    };

    try {
      const { data, error } = await this.supabase
        .from('vector_operation_logs')
        .select('operation, success, created_at')
        .eq('user_id', userId)
        .gte('created_at', `now() - interval '${intervals[timeframe]}'`);

      if (error) throw error;

      // Calculate statistics
      const stats = {
        totalOperations: data.length,
        successfulOperations: data.filter(op => op.success).length,
        failedOperations: data.filter(op => !op.success).length,
        operationsByType: {} as Record<string, number>,
        successRate: 0
      };

      // Count by operation type
      data.forEach((op: any) => {
        const opType = op.operation as string;
        stats.operationsByType[opType] = (stats.operationsByType[opType] || 0) + 1;
      });

      // Calculate success rate
      if (stats.totalOperations > 0) {
        stats.successRate = Math.round((stats.successfulOperations / stats.totalOperations) * 100);
      }

      return stats;
    } catch (error) {
      this.logger.error('Failed to get user vector stats', { error, userId });
      return null;
    }
  }
}

// Export singleton instance using service account for vector operations
export const authenticatedVectorService = new AuthenticatedVectorService();