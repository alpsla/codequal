/**
 * Interfaces for DeepWiki tools to avoid circular dependencies
 */

export interface IVectorStorageService {
  storeChunks(
    chunks: any[],
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
