import { getSupabase } from '@codequal/database/supabase/client';
import { createLogger } from '../../utils/logger';
import { openRouterEmbeddingService } from './openrouter-embedding-service';
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
    // Direct embedding service handles API key validation
    this.logger.info('Using direct embedding service (OpenAI text-embedding-3-large, Voyage AI voyage-code-3)');
  }

  /**
   * Create embedding for text
   */
  private async createEmbedding(text: string, contentType?: string): Promise<number[]> {
    try {
      // Use OpenRouter embedding service
      const embedding = await openRouterEmbeddingService.createEmbedding(text, {
        contentType
      });
      
      return embedding;
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
        await this.logVectorAccess(userId, 'search', 'document', query);
        throw error;
      }

      // Log the successful search for analytics
      await this.logVectorAccess(userId, 'search', 'document', query);

      return {
        results: data || [],
        query,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Document search failed', { error, userId, query });
      // Try to log the failed access attempt
      await this.logVectorAccess(userId, 'search_failed', 'document', query);
      throw error;
    }
  }

  /**
   * Embed documents for a user's repository
   */
  async embedRepositoryDocuments(
    userId: string, 
    repositoryId: number, 
    documents: Array<{
      filePath: string;
      content: string;
      contentType: string;
      language?: string;
      metadata?: any;
    }>
  ) {
    try {
      // Verify user has write access to the repository
      const hasAccess = await this.checkRepositoryAccess(userId, repositoryId, 'write');
      if (!hasAccess) {
        throw new Error('Unauthorized: No write access to repository');
      }

      const embeddings = [];
      
      for (const doc of documents) {
        // Split content into chunks if needed
        const chunks = this.splitIntoChunks(doc.content);
        
        for (let i = 0; i < chunks.length; i++) {
          const embedding = await this.createEmbedding(chunks[i], doc.contentType);
          
          embeddings.push({
            repository_id: repositoryId,
            file_path: doc.filePath,
            content_type: doc.contentType,
            content_language: doc.language,
            content_chunk: chunks[i],
            chunk_index: i,
            chunk_total: chunks.length,
            embedding,
            metadata: doc.metadata || {},
            indexed_by_user_id: userId,
            importance_score: this.calculateImportance(doc)
          });
        }
      }

      // Insert embeddings
      const { error } = await this.supabase
        .from('rag_document_embeddings')
        .insert(embeddings);

      if (error) {
        throw error;
      }

      // Log the embedding action
      await this.logVectorAccess(userId, 'embed', 'repository', repositoryId.toString());

      return {
        success: true,
        documentsProcessed: documents.length,
        embeddingsCreated: embeddings.length
      };

    } catch (error) {
      this.logger.error('Document embedding failed', { error, userId, repositoryId });
      throw error;
    }
  }

  /**
   * Find users with similar skills
   */
  async findSimilarUsers(options: SkillSearchOptions) {
    const {
      userId,
      skillCategory,
      minSimilarity = 0.7,
      limit = 10
    } = options;

    try {
      const { data, error } = await this.supabase.rpc('find_similar_skilled_users', {
        p_user_id: userId,
        p_skill_category: skillCategory,
        p_min_similarity: minSimilarity,
        p_limit: limit
      });

      if (error) {
        throw error;
      }

      return {
        users: data || [],
        searchCriteria: options
      };

    } catch (error) {
      this.logger.error('Similar users search failed', { error, userId });
      throw error;
    }
  }

  /**
   * Get personalized educational content
   */
  async getPersonalizedContent(options: EducationalContentOptions) {
    const {
      userId,
      skillCategory,
      limit = 5
    } = options;

    try {
      const { data, error } = await this.supabase.rpc('get_personalized_educational_content', {
        p_user_id: userId,
        p_skill_category: skillCategory,
        p_limit: limit
      });

      if (error) {
        throw error;
      }

      return {
        content: data || [],
        userId,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Personalized content fetch failed', { error, userId });
      throw error;
    }
  }

  /**
   * Update user skill embeddings based on their code
   */
  async updateUserSkillEmbeddings(
    userId: string,
    skillCategoryId: string,
    codeExamples: string[],
    skillLevel: number
  ) {
    try {
      // Create a combined embedding from code examples
      const combinedCode = codeExamples.join('\n\n');
      const skillEmbedding = await this.createEmbedding(combinedCode, 'code');

      // Generate learning path based on skill gaps
      const learningPathText = this.generateLearningPath(skillLevel);
      const learningPathEmbedding = await this.createEmbedding(learningPathText, 'documentation');

      // Upsert skill embedding
      const { error } = await this.supabase
        .from('user_skill_embeddings')
        .upsert({
          user_id: userId,
          skill_category_id: skillCategoryId,
          skill_embedding: skillEmbedding,
          skill_level: skillLevel,
          learning_path_embedding: learningPathEmbedding,
          last_analyzed_at: new Date().toISOString(),
          evidence_count: codeExamples.length
        }, {
          onConflict: 'user_id,skill_category_id'
        });

      if (error) {
        throw error;
      }

      // Log the skill update
      await this.logVectorAccess(userId, 'analyze', 'skill', skillCategoryId);

      return {
        success: true,
        skillCategoryId,
        skillLevel
      };

    } catch (error) {
      this.logger.error('Skill embedding update failed', { error, userId });
      throw error;
    }
  }

  /**
   * Share repository access with another user or organization
   */
  async shareRepositoryAccess(
    grantorId: string,
    repositoryId: number,
    granteeId: string | null,
    organizationId: string | null,
    accessType: 'read' | 'write' | 'admin',
    expiresAt?: Date
  ) {
    try {
      // Verify grantor has admin access
      const hasAccess = await this.checkRepositoryAccess(grantorId, repositoryId, 'admin');
      if (!hasAccess) {
        throw new Error('Unauthorized: No admin access to repository');
      }

      const { error } = await this.supabase
        .from('rag_repository_access')
        .insert({
          repository_id: repositoryId,
          user_id: granteeId,
          organization_id: organizationId,
          access_type: accessType,
          granted_by: grantorId,
          expires_at: expiresAt
        });

      if (error) {
        throw error;
      }

      // Log the sharing action
      await this.logVectorAccess(grantorId, 'share', 'repository', repositoryId.toString());

      return {
        success: true,
        repositoryId,
        granteeId,
        organizationId,
        accessType
      };

    } catch (error) {
      this.logger.error('Repository sharing failed', { error, grantorId, repositoryId });
      throw error;
    }
  }

  /**
   * Check if user has access to a repository
   */
  private async checkRepositoryAccess(
    userId: string,
    repositoryId: number,
    requiredAccess: 'read' | 'write' | 'admin' = 'read'
  ): Promise<boolean> {
    const { data, error } = await this.supabase.rpc('user_has_repository_access', {
      p_user_id: userId,
      p_repository_id: repositoryId,
      p_required_access: requiredAccess
    });

    if (error) {
      this.logger.error('Access check failed', { error, userId, repositoryId });
      return false;
    }

    return data === true;
  }

  /**
   * Log Vector DB access for audit
   */
  private async logVectorAccess(
    userId: string,
    action: string,
    resourceType: string,
    resourceId: string
  ) {
    try {
      await this.supabase
        .from('vector_db_access_log')
        .insert({
          user_id: userId,
          action,
          resource_type: resourceType,
          resource_id: resourceId,
          metadata: {
            timestamp: new Date().toISOString(),
            service: 'AuthenticatedVectorService'
          }
        });
    } catch (error) {
      // Log error but don't fail the main operation
      this.logger.warn('Failed to log vector access', { error, userId, action });
    }
  }

  /**
   * Split content into chunks for embedding
   */
  private splitIntoChunks(content: string, maxChunkSize = 1500): string[] {
    const chunks: string[] = [];
    
    // If content has no newlines and is longer than maxChunkSize, split by character count
    if (!content.includes('\n') && content.length > maxChunkSize) {
      let start = 0;
      while (start < content.length) {
        chunks.push(content.slice(start, start + maxChunkSize));
        start += maxChunkSize;
      }
      return chunks;
    }
    
    // Otherwise, split by lines
    const lines = content.split('\n');
    let currentChunk = '';

    for (const line of lines) {
      if (currentChunk.length + line.length > maxChunkSize && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = line;
      } else {
        currentChunk += (currentChunk ? '\n' : '') + line;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [content];
  }

  /**
   * Calculate importance score for a document
   */
  private calculateImportance(doc: any): number {
    let score = 0.5; // Base score

    // Boost for certain file types
    if (doc.contentType === 'code') {
      score += 0.2;
    }
    
    // Boost for main/index files
    if (doc.filePath.includes('index') || doc.filePath.includes('main')) {
      score += 0.1;
    }

    // Boost for configuration files
    if (doc.contentType === 'config') {
      score += 0.15;
    }

    // Cap at 1.0
    return Math.min(score, 1.0);
  }

  /**
   * Generate learning path text based on skill level
   */
  private generateLearningPath(skillLevel: number): string {
    if (skillLevel < 4) {
      return 'Focus on fundamentals, basic syntax, common patterns, and best practices. Practice with simple projects and code reviews.';
    } else if (skillLevel < 7) {
      return 'Advance to complex patterns, architecture decisions, performance optimization, and security considerations. Contribute to open source projects.';
    } else {
      return 'Master advanced techniques, system design, mentorship, and thought leadership. Create innovative solutions and guide others.';
    }
  }
}

// Export singleton instance
export const authenticatedVectorService = new AuthenticatedVectorService();