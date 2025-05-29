import OpenAI from 'openai';
import { getEmbeddingConfig, updateEmbeddingModel } from '@codequal/core';

export class EmbeddingService {
  private openai: OpenAI;
  private config = getEmbeddingConfig();
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: this.config.openai.apiKey,
    });
  }
  
  /**
   * Generate embeddings for text chunks using configured model
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.config.openai.model,
        input: texts,
        dimensions: this.config.openai.dimensions,
      });
      
      return response.data.map(item => item.embedding);
    } catch (error) {
      console.error('Embedding generation failed:', error);
      throw error;
    }
  }
  
  /**
   * Update to a new embedding model
   * Useful when OpenAI releases new models
   */
  updateModel(model: string, dimensions: number): void {
    updateEmbeddingModel(model, dimensions);
    // Refresh local config
    this.config = getEmbeddingConfig();
    
    // eslint-disable-next-line no-console
    console.log(`Updated embedding model to: ${model} (${dimensions} dimensions)`);
  }
  
  /**
   * Get current model info
   */
  getModelInfo(): { model: string; dimensions: number } {
    return {
      model: this.config.openai.model,
      dimensions: this.config.openai.dimensions
    };
  }
}

// Usage example:
/*
const embeddingService = new EmbeddingService();

// Use current configured model
const embeddings = await embeddingService.generateEmbeddings([
  "This is chunk 1",
  "This is chunk 2"
]);

// When OpenAI releases a new model, update configuration
embeddingService.updateModel('text-embedding-4-large', 2048);

// Check current model
console.log(embeddingService.getModelInfo());
// Output: { model: 'text-embedding-4-large', dimensions: 2048 }
*/
