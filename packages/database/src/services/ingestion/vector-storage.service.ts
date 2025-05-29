import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getVectorConfig } from '@codequal/core';
import { EnhancedChunk } from './types';

interface VectorRecord {
  id: string;
  repository_id: string;
  content: string;
  embedding: number[];
  metadata: Record<string, any>;
  source_type: string;
  source_id: string;
  chunk_index: number;
  total_chunks: number;
  storage_type: 'permanent' | 'cached' | 'temporary';
  quality_score?: number;
  relevance_score?: number;
  created_at?: string;
  updated_at?: string;
  ttl?: string;
}

interface StorageResult {
  stored: number;
  failed: number;
  errors: Error[];
}

interface SearchResult {
  id: string;
  content: string;
  metadata: Record<string, any>;
  similarity: number;
}

export class VectorStorageService {
  private supabase: SupabaseClient;
  private config = getVectorConfig();
  
  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and key are required');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }
  
  /**
   * Store a single chunk with its embedding
   */
  async storeChunk(
    chunk: EnhancedChunk,
    embedding: number[],
    repositoryId: string,
    sourceType: string,
    sourceId: string,
    storageType: 'permanent' | 'cached' | 'temporary' = 'cached'
  ): Promise<void> {
    const record: VectorRecord = {
      id: chunk.id,
      repository_id: repositoryId,
      content: chunk.enhancedContent || chunk.content,
      embedding,
      metadata: {
        ...chunk.metadata,
        type: chunk.type,
        windowContext: chunk.windowContext
      },
      source_type: sourceType,
      source_id: sourceId,
      chunk_index: chunk.metadata.chunkIndex,
      total_chunks: chunk.metadata.totalChunks,
      storage_type: storageType,
      quality_score: 0.8, // Default quality score
      relevance_score: 0.8 // Default relevance score
    };
    
    // Set TTL based on storage type
    if (storageType === 'cached') {
      const ttlHours = 24 * 7; // 1 week
      record.ttl = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();
    } else if (storageType === 'temporary') {
      const ttlHours = 24; // 1 day
      record.ttl = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();
    }
    
    const { error } = await this.supabase
      .from('analysis_chunks')
      .upsert(record, { onConflict: 'id' });
    
    if (error) {
      throw new Error(`Failed to store chunk: ${error.message}`);
    }
  }
  
  /**
   * Store multiple chunks in a batch
   */
  async storeChunks(
    chunks: EnhancedChunk[],
    embeddings: number[][],
    repositoryId: string,
    sourceType: string,
    sourceId: string,
    storageType: 'permanent' | 'cached' | 'temporary' = 'cached'
  ): Promise<StorageResult> {
    if (chunks.length !== embeddings.length) {
      throw new Error('Number of chunks and embeddings must match');
    }
    
    const batchSize = this.config.storage.batchSize;
    const errors: Error[] = [];
    let stored = 0;
    
    // Process in batches
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batchChunks = chunks.slice(i, i + batchSize);
      const batchEmbeddings = embeddings.slice(i, i + batchSize);
      
      try {
        await this.storeBatch(
          batchChunks,
          batchEmbeddings,
          repositoryId,
          sourceType,
          sourceId,
          storageType
        );
        stored += batchChunks.length;
      } catch (error) {
        errors.push(error as Error);
      }
    }
    
    return {
      stored,
      failed: chunks.length - stored,
      errors
    };
  }
  
  /**
   * Store a batch of chunks
   */
  private async storeBatch(
    chunks: EnhancedChunk[],
    embeddings: number[][],
    repositoryId: string,
    sourceType: string,
    sourceId: string,
    storageType: 'permanent' | 'cached' | 'temporary'
  ): Promise<void> {
    const records: VectorRecord[] = chunks.map((chunk, index) => {
      const record: VectorRecord = {
        id: chunk.id,
        repository_id: repositoryId,
        content: chunk.enhancedContent || chunk.content,
        embedding: embeddings[index],
        metadata: {
          ...chunk.metadata,
          type: chunk.type,
          windowContext: chunk.windowContext
        },
        source_type: sourceType,
        source_id: sourceId,
        chunk_index: chunk.metadata.chunkIndex,
        total_chunks: chunk.metadata.totalChunks,
        storage_type: storageType,
        quality_score: 0.8, // Default quality score
        relevance_score: 0.8 // Default relevance score
      };
      
      // Set TTL based on storage type
      if (storageType === 'cached') {
        const ttlHours = 24 * 7; // 1 week
        record.ttl = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();
      } else if (storageType === 'temporary') {
        const ttlHours = 24; // 1 day
        record.ttl = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();
      }
      
      return record;
    });
    
    const { error } = await this.supabase
      .from('analysis_chunks')
      .upsert(records, { onConflict: 'id' });
    
    if (error) {
      throw new Error(`Failed to store batch: ${error.message}`);
    }
  }
  
  /**
   * Search functionality has been moved to UnifiedSearchService
   * @deprecated Use UnifiedSearchService.search() instead
   */
  
  /**
   * Get chunks by source
   */
  async getChunksBySource(
    sourceType: string,
    sourceId: string,
    repositoryId: string
  ): Promise<VectorRecord[]> {
    const { data, error } = await this.supabase
      .from('analysis_chunks')
      .select('*')
      .eq('repository_id', repositoryId)
      .eq('source_type', sourceType)
      .eq('source_id', sourceId)
      .order('chunk_index', { ascending: true });
    
    if (error) {
      throw new Error(`Failed to get chunks: ${error.message}`);
    }
    
    return data || [];
  }
  
  /**
   * Update chunk metadata
   */
  async updateChunkMetadata(
    chunkId: string,
    metadata: Record<string, any>
  ): Promise<void> {
    const { error } = await this.supabase
      .from('analysis_chunks')
      .update({ 
        metadata,
        updated_at: new Date().toISOString()
      })
      .eq('id', chunkId);
    
    if (error) {
      throw new Error(`Failed to update metadata: ${error.message}`);
    }
  }
  
  /**
   * Delete chunks by repository
   */
  async deleteChunksByRepository(repositoryId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('analysis_chunks')
      .delete()
      .eq('repository_id', repositoryId)
      .select('id');
    
    if (error) {
      throw new Error(`Failed to delete chunks: ${error.message}`);
    }
    
    return data?.length || 0;
  }
  
  /**
   * Delete chunks by source
   */
  async deleteChunksBySource(
    sourceType: string,
    sourceId: string,
    repositoryId: string
  ): Promise<number> {
    const { data, error } = await this.supabase
      .from('analysis_chunks')
      .delete()
      .eq('repository_id', repositoryId)
      .eq('source_type', sourceType)
      .eq('source_id', sourceId)
      .select('id');
    
    if (error) {
      throw new Error(`Failed to delete chunks: ${error.message}`);
    }
    
    return data?.length || 0;
  }
  
  /**
   * Clean up expired chunks
   */
  async cleanExpiredChunks(): Promise<number> {
    const { data, error } = await this.supabase
      .from('analysis_chunks')
      .delete()
      .lt('ttl', new Date().toISOString())
      .not('ttl', 'is', null)
      .select('id');
    
    if (error) {
      throw new Error(`Failed to clean expired chunks: ${error.message}`);
    }
    
    return data?.length || 0;
  }
  
  /**
   * Get storage statistics
   */
  async getStorageStats(repositoryId: string): Promise<{
    totalChunks: number;
    byType: Record<string, number>;
    bySource: Record<string, number>;
    byStorage: Record<string, number>;
  }> {
    // Get total count
    const { count: totalChunks, error: countError } = await this.supabase
      .from('analysis_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('repository_id', repositoryId);
    
    if (countError) {
      throw new Error(`Failed to get stats: ${countError.message}`);
    }
    
    // Get counts by type
    const { data: typeData, error: typeError } = await this.supabase
      .from('analysis_chunks')
      .select('metadata->type as type')
      .eq('repository_id', repositoryId);
    
    if (typeError) {
      throw new Error(`Failed to get type stats: ${typeError.message}`);
    }
    
    const byType: Record<string, number> = {};
    typeData?.forEach((record: any) => {
      const type = record.type || 'unknown';
      byType[type] = (byType[type] || 0) + 1;
    });
    
    // Get counts by source
    const { data: sourceData, error: sourceError } = await this.supabase
      .from('analysis_chunks')
      .select('source_type')
      .eq('repository_id', repositoryId);
    
    if (sourceError) {
      throw new Error(`Failed to get source stats: ${sourceError.message}`);
    }
    
    const bySource: Record<string, number> = {};
    sourceData?.forEach((record: any) => {
      bySource[record.source_type] = (bySource[record.source_type] || 0) + 1;
    });
    
    // Get counts by storage type
    const { data: storageData, error: storageError } = await this.supabase
      .from('analysis_chunks')
      .select('storage_type')
      .eq('repository_id', repositoryId);
    
    if (storageError) {
      throw new Error(`Failed to get storage stats: ${storageError.message}`);
    }
    
    const byStorage: Record<string, number> = {};
    storageData?.forEach((record: any) => {
      byStorage[record.storage_type] = (byStorage[record.storage_type] || 0) + 1;
    });
    
    return {
      totalChunks: totalChunks || 0,
      byType,
      bySource,
      byStorage
    };
  }
  
  /**
   * Create chunk relationships
   */
  async createRelationship(
    sourceChunkId: string,
    targetChunkId: string,
    relationshipType: 'sequential' | 'hierarchical' | 'reference' | 'similar',
    strength = 1.0
  ): Promise<void> {
    const { error } = await this.supabase
      .from('chunk_relationships')
      .insert({
        source_chunk_id: sourceChunkId,
        target_chunk_id: targetChunkId,
        relationship_type: relationshipType,
        strength
      });
    
    if (error) {
      throw new Error(`Failed to create relationship: ${error.message}`);
    }
  }
  
  /**
   * Get related chunks
   */
  async getRelatedChunks(
    chunkId: string,
    relationshipType?: string,
    minStrength = 0.5
  ): Promise<Array<{
    chunk: VectorRecord;
    relationshipType: string;
    strength: number;
  }>> {
    let query = this.supabase
      .from('chunk_relationships')
      .select(`
        relationship_type,
        strength,
        target_chunk:analysis_chunks!target_chunk_id(*)
      `)
      .eq('source_chunk_id', chunkId)
      .gte('strength', minStrength);
    
    if (relationshipType) {
      query = query.eq('relationship_type', relationshipType);
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Failed to get related chunks: ${error.message}`);
    }
    
    return (data || []).map((record: any) => ({
      chunk: record.target_chunk,
      relationshipType: record.relationship_type,
      strength: record.strength
    }));
  }
}
