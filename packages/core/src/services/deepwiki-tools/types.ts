/* eslint-disable @typescript-eslint/ban-types */


/**
 * Type definitions for DeepWiki tools
 * These types mirror the database package types to avoid circular dependencies
 */

export interface EnhancedChunk {
  id: string;
  content: string;
  enhancedContent?: string;
  type?: string;
  metadata: ChunkMetadata;
  windowContext?: string;
  filePath: string;
  startLine?: number;
  endLine?: number;
  repository?: string;
  language?: string;
  importance?: number;
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
  [key: string]: string | number | boolean | undefined;
}

export interface VectorStorageService {
  storeChunks(
    chunks: EnhancedChunk[],
    embeddings: number[][],
    repositoryId: string,
    sourceType: string,
    sourceId: string,
    storageType?: 'permanent' | 'cached' | 'temporary'
  ): Promise<{ stored: number; failed: number; errors: Error[] }>;
  
  deleteChunksBySource(
    sourceType: string,
    sourceId: string,
    repositoryId: string
  ): Promise<number>;
  
  searchByMetadata?(
    criteria: Record<string, unknown>,
    limit?: number
  ): Promise<unknown[]>;
}
