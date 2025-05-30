/**
 * Types for vector database ingestion services
 */

export interface EnhancedChunk {
  id: string;
  content: string;
  enhancedContent?: string;
  type?: string;
  windowContext?: string;
  metadata: Record<string, any>;
  embedding?: number[];
  startLine?: number;
  endLine?: number;
  filePath: string;
  repository?: string;
  language?: string;
  importance?: number;
}

export interface ChunkMetadata {
  filePath: string;
  startLine: number;
  endLine: number;
  language?: string;
  repository?: string;
  fileType?: string;
  importance?: number;
  [key: string]: any;
}

export interface VectorRecord {
  id: string;
  repository_id: string;
  content: string;
  embedding: number[];
  metadata: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}