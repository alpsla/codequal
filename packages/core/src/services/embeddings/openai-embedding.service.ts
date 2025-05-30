import { EmbeddingService } from '../rag/selective-rag-service';
import OpenAI from 'openai';
import { createLogger } from '../../utils/logger';

export class OpenAIEmbeddingService implements EmbeddingService {
  private openai: OpenAI;
  private logger = createLogger('OpenAIEmbeddingService');
  private cache = new Map<string, number[]>();

  constructor(apiKey?: string) {
    const key = apiKey || process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error('OpenAI API key is required');
    }
    this.openai = new OpenAI({
      apiKey: key,
    });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    // Check cache first
    const cacheKey = this.generateCacheKey(text);
    if (this.cache.has(cacheKey)) {
      this.logger.debug('Returning cached embedding');
      return this.cache.get(cacheKey)!;
    }

    try {
      this.logger.debug('Generating embedding for text', { 
        textLength: text.length 
      });

      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-large',
        input: text,
        dimensions: 1536, // Match our vector database dimension
      });

      const embedding = response.data[0]?.embedding;
      if (!embedding) {
        throw new Error('No embedding data received from OpenAI');
      }
      
      // Cache the result
      this.cache.set(cacheKey, embedding);
      
      // Limit cache size
      if (this.cache.size > 1000) {
        const firstKey = this.cache.keys().next().value;
        if (firstKey) {
          this.cache.delete(firstKey);
        }
      }

      this.logger.debug('Embedding generated successfully', {
        dimensions: embedding.length,
        usage: response.usage,
      });

      return embedding;
    } catch (error) {
      this.logger.error('Failed to generate embedding', { error });
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Embedding generation failed: ${message}`);
    }
  }

  private generateCacheKey(text: string): string {
    // Simple hash for cache key
    return text.length + '_' + text.slice(0, 50);
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      this.logger.debug('Generating batch embeddings', { 
        count: texts.length 
      });

      // OpenAI supports batch embedding
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-large',
        input: texts,
        dimensions: 1536,
      });

      const embeddings = response.data.map(item => item.embedding);

      this.logger.debug('Batch embeddings generated', {
        count: embeddings.length,
        usage: response.usage,
      });

      return embeddings;
    } catch (error) {
      this.logger.error('Failed to generate batch embeddings', { error });
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Batch embedding generation failed: ${message}`);
    }
  }

  /**
   * Clear the embedding cache
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.debug('Embedding cache cleared');
  }
}