/**
 * Type definitions for DeepWiki tools
 * These types mirror the database package types to avoid circular dependencies
 */

export interface EnhancedChunk {
  id: string;
  content: string;
  enhancedContent?: string;
  type: string;
  metadata: ChunkMetadata;
  windowContext?: string;
  filePath?: string;
}

export interface ChunkMetadata {
  chunkIndex: number;
  totalChunks: number;
  agent_role?: string;
  tool_id?: string;
  tool_name?: string;
  content_type?: string;
  pr_number?: number;
  commit_hash?: string;
  timestamp?: string;
  scheduled_run?: boolean;
  is_latest?: boolean;
  [key: string]: any;
}

export interface VectorStorageService {
  storeChunks(
    chunks: EnhancedChunk[],
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
