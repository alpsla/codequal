/**
 * Enhanced Embedding Service with Dimension Adaptation
 * 
 * This wraps the existing OpenRouter embedding service and adds
 * automatic dimension adaptation to handle mismatches.
 */

import { DirectEmbeddingService } from './openrouter-embedding-service';
import { EmbeddingAdapter, embeddingAdapter } from './embedding-adapter';
import { createLogger } from '../../utils/logger';
import { getSupabase } from '@codequal/database/supabase/client';

export interface AdaptedEmbeddingResult {
  embedding: number[];
  metadata: {
    originalDimension: number;
    adaptedDimension: number;
    adaptationMethod: string;
    modelUsed: string;
    provider: string;
    contentType?: string;
  };
}

export class AdaptedEmbeddingService {
  private logger = createLogger('AdaptedEmbeddingService');
  private embeddingService: DirectEmbeddingService;
  private adapter: EmbeddingAdapter;
  private supabase = getSupabase();

  constructor() {
    this.embeddingService = new DirectEmbeddingService();
    this.adapter = embeddingAdapter;
    
    this.logger.info('Initialized adapted embedding service with dimension standardization');
  }

  /**
   * Create embedding with automatic dimension adaptation
   */
  async createEmbedding(
    text: string, 
    options?: {
      model?: string;
      contentType?: string;
      targetDimension?: number;
    }
  ): Promise<AdaptedEmbeddingResult> {
    const startTime = Date.now();
    
    try {
      // Create the raw embedding
      const rawEmbedding = await this.embeddingService.createEmbedding(text, options);
      
      // Get model configuration to determine the model key
      const modelKey = options?.model || 'default';
      const modelConfig = await this.getModelConfig(modelKey);
      
      // Adapt the embedding if needed
      const adapted = await this.adapter.adaptEmbedding(
        rawEmbedding,
        modelKey,
        {
          provider: modelConfig?.provider || 'unknown'
        }
      );
      
      const duration = Date.now() - startTime;
      
      // Log the operation
      await this.logEmbeddingOperation({
        operation: 'create_adapted_embedding',
        success: true,
        duration_ms: duration,
        metadata: {
          model: modelKey,
          originalDimension: rawEmbedding.length,
          adaptedDimension: adapted.embedding.length,
          method: adapted.metadata.adaptationMethod,
          contentType: options?.contentType
        }
      });
      
      return {
        embedding: adapted.embedding,
        metadata: adapted.metadata
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log the failure
      await this.logEmbeddingOperation({
        operation: 'create_adapted_embedding',
        success: false,
        duration_ms: duration,
        error_message: error instanceof Error ? error.message : String(error),
        metadata: {
          model: options?.model || 'default',
          contentType: options?.contentType
        }
      });
      
      throw error;
    }
  }

  /**
   * Batch create embeddings with adaptation
   */
  async batchCreateEmbeddings(
    texts: string[],
    options?: {
      model?: string;
      contentType?: string;
      targetDimension?: number;
    }
  ): Promise<AdaptedEmbeddingResult[]> {
    const startTime = Date.now();
    const results: AdaptedEmbeddingResult[] = [];
    const errors: any[] = [];
    
    // Process in batches to avoid overwhelming the API
    const batchSize = 10;
    
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (text) => {
        try {
          return await this.createEmbedding(text, options);
        } catch (error) {
          errors.push({ text: text.substring(0, 50), error });
          return null;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(r => r !== null) as AdaptedEmbeddingResult[]);
    }
    
    const duration = Date.now() - startTime;
    
    // Log batch operation
    await this.logEmbeddingOperation({
      operation: 'batch_create_embeddings',
      success: errors.length === 0,
      duration_ms: duration,
      metadata: {
        total_texts: texts.length,
        successful: results.length,
        failed: errors.length,
        avg_ms_per_text: duration / texts.length
      }
    });
    
    if (errors.length > 0) {
      this.logger.warn('Some embeddings failed in batch', {
        total: texts.length,
        failed: errors.length
      });
    }
    
    return results;
  }

  /**
   * Get model configuration from database
   */
  private async getModelConfig(modelKey: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('embedding_configurations')
        .select('*')
        .eq('model_key', modelKey)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        // Fallback to default
        if (modelKey !== 'default') {
          return this.getModelConfig('default');
        }
        return null;
      }

      return data;
    } catch (error) {
      this.logger.error('Failed to get model config', { error });
      return null;
    }
  }

  /**
   * Log embedding operation for monitoring
   */
  private async logEmbeddingOperation(log: {
    operation: string;
    success: boolean;
    duration_ms: number;
    error_message?: string;
    metadata?: any;
  }): Promise<void> {
    try {
      await this.supabase
        .from('vector_operation_logs')
        .insert({
          operation: log.operation,
          success: log.success,
          duration_ms: log.duration_ms,
          error_message: log.error_message,
          metadata: log.metadata || {},
          created_at: new Date().toISOString()
        });
    } catch (error) {
      // Don't fail the main operation if logging fails
      this.logger.error('Failed to log embedding operation', { error });
    }
  }

  /**
   * Validate text before creating embedding
   */
  private validateText(text: string): void {
    if (!text || typeof text !== 'string') {
      throw new Error('Text must be a non-empty string');
    }
    
    if (text.length > 50000) {
      throw new Error('Text exceeds maximum length of 50,000 characters');
    }
    
    // Check for control characters that might cause issues
    if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(text)) {
      this.logger.warn('Text contains control characters');
    }
  }

  /**
   * Get embedding statistics for monitoring
   */
  async getEmbeddingStats(timeframe: '1h' | '24h' | '7d' = '24h'): Promise<any> {
    const intervals = {
      '1h': '1 hour',
      '24h': '24 hours',
      '7d': '7 days'
    };
    
    try {
      const { data, error } = await this.supabase
        .from('vector_operation_summary')
        .select('*')
        .gte('hour', `now() - interval '${intervals[timeframe]}'`);

      if (error) throw error;

      return {
        timeframe,
        operations: data || [],
        summary: this.calculateSummaryStats(data || [])
      };
    } catch (error) {
      this.logger.error('Failed to get embedding stats', { error });
      return null;
    }
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummaryStats(data: any[]): any {
    if (data.length === 0) return {};
    
    const totalOps = data.reduce((sum, d) => sum + (d.total_operations || 0), 0);
    const totalSuccess = data.reduce((sum, d) => sum + (d.successful || 0), 0);
    const totalFailed = data.reduce((sum, d) => sum + (d.failed || 0), 0);
    
    return {
      total_operations: totalOps,
      successful: totalSuccess,
      failed: totalFailed,
      success_rate: totalOps > 0 ? (totalSuccess / totalOps * 100).toFixed(2) + '%' : '0%',
      avg_duration_ms: data.reduce((sum, d) => sum + (d.avg_duration_ms || 0), 0) / data.length
    };
  }
}

// Export singleton instance
export const adaptedEmbeddingService = new AdaptedEmbeddingService();

// Also export the direct embedding service for backward compatibility
export { openRouterEmbeddingService } from './openrouter-embedding-service';