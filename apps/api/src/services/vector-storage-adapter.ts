import { VectorStorageService as DatabaseVectorStorage } from '@codequal/database';

// Define minimal interfaces to avoid import issues
interface CoreVectorStorage {
  storeChunks(
    chunks: CoreEnhancedChunk[],
    embeddings: number[][],
    repositoryId: string,
    sourceType: string,
    sourceId: string,
    storageType?: 'permanent' | 'cached' | 'temporary'
  ): Promise<StorageResult>;
  searchSimilar(query: string, limit?: number): Promise<CoreEnhancedChunk[]>;
  deleteChunks(filter: { repository_id?: string }): Promise<{ deleted: number }>;
}

interface CoreEnhancedChunk {
  id: string;
  content: string;
  metadata: Record<string, any>;
  embedding?: number[];
  repository_id?: string;
  filePath?: string;
  type?: string;
}

// Storage result interface to match database service
interface StorageResult {
  stored: number;
  failed: number;
  errors: Error[];
}

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
  ): Promise<StorageResult> {
    // Convert core chunks to database chunks by ensuring filePath is defined
    const databaseChunks = chunks.map(chunk => ({
      ...chunk,
      filePath: chunk.filePath || `generated/${chunk.type || 'unknown'}/${chunk.id}`,
      type: chunk.type || 'unknown'
    }));

    return this.databaseVectorStorage.storeChunks(
      databaseChunks,
      embeddings,
      repositoryId,
      sourceType,
      sourceId,
      storageType
    );
  }

  async searchSimilar(query: string, limit?: number): Promise<CoreEnhancedChunk[]> {
    // This is a simplified implementation - in production you'd need proper embedding search
    return [];
  }

  async deleteChunks(filter: { repository_id?: string }): Promise<{ deleted: number }> {
    if (filter.repository_id) {
      const deleted = await this.databaseVectorStorage.deleteChunksBySource(
        'repository',
        filter.repository_id,
        filter.repository_id
      );
      return { deleted };
    }
    return { deleted: 0 };
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
    criteria: Record<string, unknown>,
    limit?: number
  ): Promise<unknown[]> {
    if (this.databaseVectorStorage.searchByMetadata) {
      return this.databaseVectorStorage.searchByMetadata(criteria, limit);
    }
    return [];
  }
}
