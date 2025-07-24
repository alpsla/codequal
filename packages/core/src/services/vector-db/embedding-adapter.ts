/**
 * Embedding Adapter Service
 * 
 * Handles dimension mismatches between different embedding models.
 * Standardizes embeddings to a target dimension to ensure compatibility
 * across the vector database.
 */

import { createLogger } from '../../utils/logger';
import { getSupabase } from '@codequal/database/supabase/client';

export interface EmbeddingAdapterConfig {
  targetDimension: number;
  method: 'truncate' | 'pad' | 'average' | 'pca';
}

export interface EmbeddingMetadata {
  originalDimension: number;
  adaptedDimension: number;
  adaptationMethod: string;
  modelUsed: string;
  provider: string;
}

export class EmbeddingAdapter {
  private logger = createLogger('EmbeddingAdapter');
  private supabase = getSupabase();
  private targetDimension: number;
  private adaptationMethod: string;

  constructor(config: EmbeddingAdapterConfig = { targetDimension: 1536, method: 'truncate' }) {
    this.targetDimension = config.targetDimension;
    this.adaptationMethod = config.method;
    
    this.logger.info('Initialized embedding adapter', {
      targetDimension: this.targetDimension,
      method: this.adaptationMethod
    });
  }

  /**
   * Adapt embedding to target dimension
   */
  async adaptEmbedding(
    embedding: number[], 
    modelKey: string,
    metadata?: Partial<EmbeddingMetadata>
  ): Promise<{
    embedding: number[];
    metadata: EmbeddingMetadata;
  }> {
    const originalDimension = embedding.length;
    
    // If already correct dimension, return as-is
    if (originalDimension === this.targetDimension) {
      return {
        embedding,
        metadata: {
          originalDimension,
          adaptedDimension: originalDimension,
          adaptationMethod: 'none',
          modelUsed: modelKey,
          provider: metadata?.provider || 'unknown',
          ...metadata
        }
      };
    }

    // Log dimension mismatch
    await this.logVectorOperation('dimension_mismatch', {
      modelKey,
      originalDimension,
      targetDimension: this.targetDimension,
      method: this.adaptationMethod
    });

    let adaptedEmbedding: number[];
    
    switch (this.adaptationMethod) {
      case 'truncate':
        adaptedEmbedding = this.truncateEmbedding(embedding);
        break;
      case 'pad':
        adaptedEmbedding = this.padEmbedding(embedding);
        break;
      case 'average':
        adaptedEmbedding = this.averagePoolEmbedding(embedding);
        break;
      case 'pca':
        // PCA would require training on a dataset - fallback to truncate for now
        this.logger.warn('PCA not implemented, falling back to truncate');
        adaptedEmbedding = this.truncateEmbedding(embedding);
        break;
      default:
        adaptedEmbedding = this.truncateEmbedding(embedding);
    }

    return {
      embedding: adaptedEmbedding,
      metadata: {
        originalDimension,
        adaptedDimension: this.targetDimension,
        adaptationMethod: this.adaptationMethod,
        modelUsed: modelKey,
        provider: metadata?.provider || 'unknown',
        ...metadata
      }
    };
  }

  /**
   * Truncate embedding to target dimension
   */
  private truncateEmbedding(embedding: number[]): number[] {
    if (embedding.length < this.targetDimension) {
      return this.padEmbedding(embedding);
    }
    return embedding.slice(0, this.targetDimension);
  }

  /**
   * Pad embedding with zeros to target dimension
   */
  private padEmbedding(embedding: number[]): number[] {
    if (embedding.length > this.targetDimension) {
      return this.truncateEmbedding(embedding);
    }
    
    const padded = [...embedding];
    while (padded.length < this.targetDimension) {
      padded.push(0);
    }
    return padded;
  }

  /**
   * Average pooling to reduce dimension
   */
  private averagePoolEmbedding(embedding: number[]): number[] {
    if (embedding.length < this.targetDimension) {
      return this.padEmbedding(embedding);
    }

    const ratio = embedding.length / this.targetDimension;
    const result: number[] = [];

    for (let i = 0; i < this.targetDimension; i++) {
      const start = Math.floor(i * ratio);
      const end = Math.floor((i + 1) * ratio);
      
      let sum = 0;
      for (let j = start; j < end && j < embedding.length; j++) {
        sum += embedding[j];
      }
      
      result.push(sum / (end - start));
    }

    return result;
  }

  /**
   * Log vector operations for monitoring
   */
  private async logVectorOperation(operation: string, metadata: Record<string, unknown>): Promise<void> {
    try {
      await this.supabase
        .from('vector_operation_logs')
        .insert({
          operation,
          success: true,
          metadata,
          duration_ms: 0 // Will be set by actual operation
        });
    } catch (error) {
      this.logger.error('Failed to log vector operation', { error });
    }
  }

  /**
   * Get embedding configuration from database
   */
  async getEmbeddingConfig(modelKey: string): Promise<{ dimensions: number; provider: string; model: string; cost_per_million: number } | null> {
    try {
      const { data, error } = await this.supabase
        .from('embedding_configurations')
        .select('*')
        .eq('model_key', modelKey)
        .eq('is_active', true)
        .single();

      if (error) {
        this.logger.warn(`No config found for model ${modelKey}, using default`);
        return this.getEmbeddingConfig('default');
      }

      return data as unknown as { dimensions: number; provider: string; model: string; cost_per_million: number };
    } catch (error) {
      this.logger.error('Failed to get embedding config', { error });
      return null;
    }
  }

  /**
   * Validate embedding compatibility
   */
  async validateEmbedding(embedding: number[], modelKey: string): Promise<{
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check dimension
    const config = await this.getEmbeddingConfig(modelKey);
    if (config && embedding.length !== config.dimensions) {
      issues.push(`Dimension mismatch: expected ${config.dimensions}, got ${embedding.length}`);
      recommendations.push(`Use adaptation method: ${this.adaptationMethod}`);
    }

    // Check for NaN or Infinity
    const hasInvalidValues = embedding.some(v => !isFinite(v));
    if (hasInvalidValues) {
      issues.push('Embedding contains NaN or Infinity values');
      recommendations.push('Regenerate embedding or filter invalid values');
    }

    // Check magnitude (L2 norm)
    const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    if (magnitude < 0.1 || magnitude > 10) {
      issues.push(`Unusual embedding magnitude: ${magnitude}`);
      recommendations.push('Consider normalizing the embedding');
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * Batch adapt multiple embeddings
   */
  async batchAdaptEmbeddings(
    embeddings: Array<{ embedding: number[]; modelKey: string; metadata?: Record<string, unknown> }>
  ): Promise<Array<{ embedding: number[]; metadata: EmbeddingMetadata }>> {
    const startTime = Date.now();
    const results = [];

    for (const item of embeddings) {
      const result = await this.adaptEmbedding(
        item.embedding,
        item.modelKey,
        item.metadata
      );
      results.push(result);
    }

    const duration = Date.now() - startTime;
    
    await this.logVectorOperation('batch_adaptation', {
      count: embeddings.length,
      duration_ms: duration,
      avg_ms_per_embedding: duration / embeddings.length
    });

    return results;
  }
}

// Export singleton instance
export const embeddingAdapter = new EmbeddingAdapter({
  targetDimension: 1536,
  method: 'truncate'
});