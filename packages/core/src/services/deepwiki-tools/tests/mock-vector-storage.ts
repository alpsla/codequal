/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Mock VectorStorageService for testing
 * This is a temporary workaround until the database package is properly built
 */

export interface EnhancedChunk {
  id: string;
  content: string;
  enhancedContent?: string;
  type?: string;
  windowContext?: any;
  metadata: Record<string, any>;
  embedding?: number[];
  startLine?: number;
  endLine?: number;
  filePath: string;
  repository?: string;
  language?: string;
  importance?: number;
}

export class VectorStorageService {
  async storeChunk(
    chunk: EnhancedChunk,
    embedding: number[],
    repositoryId: string,
    sourceType: string,
    sourceId: string,
    storageType: 'permanent' | 'cached' | 'temporary' = 'cached'
  ): Promise<void> {
    console.log(`[MOCK] Storing chunk for ${repositoryId}`);
  }
  
  async storeChunks(
    chunks: EnhancedChunk[],
    embeddings: number[][],
    repositoryId: string,
    sourceType: string,
    sourceId: string,
    storageType: 'permanent' | 'cached' | 'temporary' = 'cached'
  ): Promise<{ stored: number; failed: number; errors: Error[] }> {
    console.log(`[MOCK] Storing ${chunks.length} chunks for ${repositoryId}`);
    return { stored: chunks.length, failed: 0, errors: [] };
  }
  
  async getChunksBySource(
    sourceType: string,
    sourceId: string,
    repositoryId: string
  ): Promise<any[]> {
    console.log(`[MOCK] Getting chunks for ${repositoryId}`);
    return [];
  }
  
  async deleteChunksByRepository(repositoryId: string): Promise<number> {
    console.log(`[MOCK] Deleting chunks for ${repositoryId}`);
    return 0;
  }
  
  async deleteChunksBySource(
    sourceType: string,
    sourceId: string,
    repositoryId: string
  ): Promise<number> {
    console.log(`[MOCK] Deleting chunks by source for ${repositoryId}`);
    return 0;
  }
}
