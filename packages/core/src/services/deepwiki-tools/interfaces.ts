/* eslint-disable @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-unused-vars, no-console */

/**
 * Interfaces for DeepWiki tools to avoid circular dependencies
 */

export interface IVectorStorageService {
  storeChunks(
    chunks: Array<{
      id: string;
      content: string;
      enhancedContent?: string;
      type?: string;
      metadata: Record<string, unknown>;
      filePath: string;
      [key: string]: unknown;
    }>,
    embeddings: number[][],
    repositoryId: string,
    sourceType: string,
    sourceId: string,
    storageType: 'permanent' | 'cached'
  ): Promise<void>;
  
  deleteChunksBySource(
    sourceType: string,
    sourceId: string,
    repositoryId: string
  ): Promise<number>;
}

export interface IEmbeddingService {
  generateEmbedding(text: string): Promise<number[]>;
}
