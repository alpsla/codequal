import { VectorStorageService as DatabaseVectorStorage } from '@codequal/database';
import { VectorStorageService as CoreVectorStorage, EnhancedChunk as CoreEnhancedChunk } from '@codequal/core/services/deepwiki-tools/types';

/**
 * Adapter to make database VectorStorageService compatible with core interface
 */
export class VectorStorageAdapter implements CoreVectorStorage {
  constructor(private databaseVectorStorage: DatabaseVectorStorage) {}

  async storeChunks(
    chunks: CoreEnhancedChunk[],
    embeddings: number[][],
    repositoryId: string,
    sourceType: string,
    sourceId: string,
    storageType?: 'permanent' | 'cached' | 'temporary'
  ): Promise<any> {
    // Convert core chunks to database chunks by ensuring filePath is defined
    const databaseChunks = chunks.map(chunk => ({
      ...chunk,
      filePath: chunk.filePath || `generated/${chunk.type || 'unknown'}/${chunk.id}`,
      type: chunk.type || 'unknown'
    }));

    return this.databaseVectorStorage.storeChunks(
      databaseChunks as any,
      embeddings,
      repositoryId,
      sourceType,
      sourceId,
      storageType
    );
  }

  async deleteChunksBySource(
    sourceType: string,
    sourceId: string,
    repositoryId: string
  ): Promise<number> {
    return this.databaseVectorStorage.deleteChunksBySource(
      sourceType,
      sourceId,
      repositoryId
    );
  }

  async searchByMetadata(
    criteria: Record<string, any>,
    limit?: number
  ): Promise<any[]> {
    if (this.databaseVectorStorage.searchByMetadata) {
      return this.databaseVectorStorage.searchByMetadata(criteria, limit);
    }
    return [];
  }
}
