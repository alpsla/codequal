import { EnhancedChunk } from './types';
interface VectorRecord {
    id: string;
    repository_id: string;
    content: string;
    embedding: number[];
    metadata: Record<string, unknown>;
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
export declare class VectorStorageService {
    private supabase;
    private config;
    constructor();
    /**
     * Store a single chunk with its embedding
     */
    storeChunk(chunk: EnhancedChunk, embedding: number[], repositoryId: string, sourceType: string, sourceId: string, storageType?: 'permanent' | 'cached' | 'temporary'): Promise<void>;
    /**
     * Store multiple chunks in a batch
     */
    storeChunks(chunks: EnhancedChunk[], embeddings: number[][], repositoryId: string, sourceType: string, sourceId: string, storageType?: 'permanent' | 'cached' | 'temporary'): Promise<StorageResult>;
    /**
     * Store a batch of chunks
     */
    private storeBatch;
    /**
     * Search by metadata fields
     * This is a simple metadata search without vector similarity
     */
    searchByMetadata(criteria: Record<string, unknown>, limit?: number): Promise<VectorRecord[]>;
    /**
     * Search functionality has been moved to UnifiedSearchService
     * @deprecated Use UnifiedSearchService.search() instead for vector similarity search
     */
    /**
     * Get chunks by source
     */
    getChunksBySource(sourceType: string, sourceId: string, repositoryId: string): Promise<VectorRecord[]>;
    /**
     * Update chunk metadata
     */
    updateChunkMetadata(chunkId: string, metadata: Record<string, unknown>): Promise<void>;
    /**
     * Delete chunks by repository
     */
    deleteChunksByRepository(repositoryId: string): Promise<number>;
    /**
     * Delete chunks by source
     */
    deleteChunksBySource(sourceType: string, sourceId: string, repositoryId: string): Promise<number>;
    /**
     * Clean up expired chunks
     */
    cleanExpiredChunks(): Promise<number>;
    /**
     * Get storage statistics
     */
    getStorageStats(repositoryId: string): Promise<{
        totalChunks: number;
        byType: Record<string, number>;
        bySource: Record<string, number>;
        byStorage: Record<string, number>;
    }>;
    /**
     * Create chunk relationships
     */
    createRelationship(sourceChunkId: string, targetChunkId: string, relationshipType: 'sequential' | 'hierarchical' | 'reference' | 'similar', strength?: number): Promise<void>;
    /**
     * Get related chunks
     */
    getRelatedChunks(chunkId: string, relationshipType?: string, minStrength?: number): Promise<Array<{
        chunk: VectorRecord;
        relationshipType: string;
        strength: number;
    }>>;
}
export {};
//# sourceMappingURL=vector-storage.service.d.ts.map