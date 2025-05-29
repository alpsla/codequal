import OpenAI from 'openai';
import { getEmbeddingConfig } from '@codequal/core';
import { EnhancedChunk } from './types';

interface EmbeddingResult {
  embedding: number[];
  tokenCount: number;
  model: string;
}

interface BatchEmbeddingResult {
  embeddings: number[][];
  tokenCounts: number[];
  totalTokens: number;
  model: string;
}

export class EmbeddingService {
  private openai: OpenAI;
  private config = getEmbeddingConfig();
  private cache = new Map<string, number[]>();
  
  constructor() {
    if (!this.config.openai.apiKey) {
      throw new Error('OpenAI API key is required for embedding generation');
    }
    
    this.openai = new OpenAI({
      apiKey: this.config.openai.apiKey
    });
  }
  
  /**
   * Generate embedding for a single chunk
   */
  async generateEmbedding(chunk: EnhancedChunk): Promise<EmbeddingResult> {
    const content = chunk.enhancedContent || chunk.content;
    
    // Check cache if enabled
    if (this.config.cache.enabled) {
      const cached = this.cache.get(content);
      if (cached) {
        return {
          embedding: cached,
          tokenCount: this.estimateTokenCount(content),
          model: this.config.openai.model
        };
      }
    }
    
    try {
      const response = await this.openai.embeddings.create({
        model: this.config.openai.model,
        input: content,
        dimensions: this.config.openai.dimensions
      });
      
      const embedding = response.data[0].embedding;
      const tokenCount = response.usage?.total_tokens || this.estimateTokenCount(content);
      
      // Cache if enabled
      if (this.config.cache.enabled) {
        this.cache.set(content, embedding);
        this.pruneCache();
      }
      
      return {
        embedding,
        tokenCount,
        model: this.config.openai.model
      };
    } catch (error) {
      if (this.isRateLimitError(error)) {
        // Wait and retry
        await this.waitForRateLimit(error);
        return this.generateEmbedding(chunk);
      }
      throw error;
    }
  }
  
  /**
   * Generate embeddings for multiple chunks in batches
   */
  async generateBatchEmbeddings(
    chunks: EnhancedChunk[]
  ): Promise<BatchEmbeddingResult> {
    const batchSize = this.config.openai.batchSize;
    const results: number[][] = [];
    const tokenCounts: number[] = [];
    let totalTokens = 0;
    
    // Process in batches
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const batchResults = await this.processBatch(batch);
      
      results.push(...batchResults.embeddings);
      tokenCounts.push(...batchResults.tokenCounts);
      totalTokens += batchResults.totalTokens;
      
      // Add delay between batches to avoid rate limits
      if (i + batchSize < chunks.length) {
        await this.delay(100);
      }
    }
    
    return {
      embeddings: results,
      tokenCounts,
      totalTokens,
      model: this.config.openai.model
    };
  }
  
  /**
   * Process a single batch of chunks
   */
  private async processBatch(
    chunks: EnhancedChunk[]
  ): Promise<BatchEmbeddingResult> {
    const contents = chunks.map(chunk => chunk.enhancedContent || chunk.content);
    const embeddings: number[][] = [];
    const tokenCounts: number[] = [];
    
    // Check cache for each item
    const uncachedIndices: number[] = [];
    const uncachedContents: string[] = [];
    
    if (this.config.cache.enabled) {
      contents.forEach((content, index) => {
        const cached = this.cache.get(content);
        if (cached) {
          embeddings[index] = cached;
          tokenCounts[index] = this.estimateTokenCount(content);
        } else {
          uncachedIndices.push(index);
          uncachedContents.push(content);
        }
      });
    } else {
      uncachedContents.push(...contents);
      uncachedIndices.push(...Array.from({ length: contents.length }, (_, i) => i));
    }
    
    // Generate embeddings for uncached content
    if (uncachedContents.length > 0) {
      try {
        const response = await this.openai.embeddings.create({
          model: this.config.openai.model,
          input: uncachedContents,
          dimensions: this.config.openai.dimensions
        });
        
        // Place results in correct positions
        response.data.forEach((item, idx) => {
          const originalIndex = uncachedIndices[idx];
          embeddings[originalIndex] = item.embedding;
          tokenCounts[originalIndex] = response.usage?.prompt_tokens || 
            this.estimateTokenCount(uncachedContents[idx]);
          
          // Cache if enabled
          if (this.config.cache.enabled) {
            this.cache.set(uncachedContents[idx], item.embedding);
          }
        });
        
        this.pruneCache();
      } catch (error) {
        if (this.isRateLimitError(error)) {
          await this.waitForRateLimit(error);
          return this.processBatch(chunks);
        }
        throw error;
      }
    }
    
    const totalTokens = tokenCounts.reduce((sum, count) => sum + count, 0);
    
    return {
      embeddings,
      tokenCounts,
      totalTokens,
      model: this.config.openai.model
    };
  }
  
  /**
   * Calculate cosine similarity between two embeddings
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Embeddings must have the same dimension');
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    
    if (normA === 0 || normB === 0) {
      return 0;
    }
    
    return dotProduct / (normA * normB);
  }
  
  /**
   * Find top-k most similar embeddings
   */
  findTopSimilar(
    queryEmbedding: number[],
    embeddings: number[][],
    k = 5
  ): { index: number; similarity: number }[] {
    const similarities = embeddings.map((embedding, index) => ({
      index,
      similarity: this.cosineSimilarity(queryEmbedding, embedding)
    }));
    
    // Sort by similarity descending
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    return similarities.slice(0, k);
  }
  
  /**
   * Clear the embedding cache
   */
  clearCache(): void {
    this.cache.clear();
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
  } {
    // In a real implementation, you'd track hits and misses
    return {
      size: this.cache.size,
      maxSize: Math.floor(this.config.cache.maxSize * 1024 * 1024 / (1536 * 4)), // Approximate
      hitRate: 0 // Would need to track this
    };
  }
  
  /**
   * Helper methods
   */
  
  private estimateTokenCount(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }
  
  private pruneCache(): void {
    if (!this.config.cache.enabled) return;
    
    // Simple LRU-style pruning - remove oldest entries
    const maxEntries = Math.floor(this.config.cache.maxSize * 1024 * 1024 / (1536 * 4));
    
    if (this.cache.size > maxEntries) {
      const entriesToRemove = this.cache.size - maxEntries;
      const keys = Array.from(this.cache.keys());
      
      for (let i = 0; i < entriesToRemove; i++) {
        this.cache.delete(keys[i]);
      }
    }
  }
  
  private isRateLimitError(error: any): boolean {
    return error?.status === 429 || error?.response?.status === 429;
  }
  
  private async waitForRateLimit(error: any): Promise<void> {
    const retryAfter = error?.headers?.['retry-after'] || 
                      error?.response?.headers?.['retry-after'] || 
                      1;
    const waitTime = parseInt(retryAfter) * 1000 || 1000;
    
    console.log(`Rate limit hit, waiting ${waitTime}ms before retry...`);
    await this.delay(waitTime);
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Validate that embeddings have the correct dimensions
   */
  validateEmbedding(embedding: number[]): boolean {
    return embedding.length === this.config.openai.dimensions;
  }
  
  /**
   * Normalize an embedding vector
   */
  normalizeEmbedding(embedding: number[]): number[] {
    const magnitude = Math.sqrt(
      embedding.reduce((sum, val) => sum + val * val, 0)
    );
    
    if (magnitude === 0) {
      return embedding;
    }
    
    return embedding.map(val => val / magnitude);
  }
}
