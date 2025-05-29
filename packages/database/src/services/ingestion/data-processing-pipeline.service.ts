import { PreprocessingService } from './preprocessing.service';
import { HierarchicalChunker } from './chunking.service';
import { ContentEnhancer } from './content-enhancer.service';
import { EmbeddingService } from './embedding.service';
import { VectorStorageService } from './vector-storage.service';
import { getVectorConfig } from '@codequal/core';
import { Chunk, EnhancedChunk, EnhancementContext, SourceType } from './types';

export interface ProcessingOptions {
  repositoryId: string;
  sourceType: string;
  sourceId: string;
  storageType?: 'permanent' | 'cached' | 'temporary';
  enhancementContext?: EnhancementContext;
  onProgress?: (progress: ProcessingProgress) => void;
}

interface ProcessingProgress {
  stage: 'preprocessing' | 'chunking' | 'enhancing' | 'embedding' | 'storing';
  current: number;
  total: number;
  message: string;
}

interface ProcessingResult {
  success: boolean;
  chunksProcessed: number;
  chunksStored: number;
  errors: Error[];
  duration: number;
  tokenUsage: {
    preprocessing: number;
    embedding: number;
    total: number;
  };
}

export class DataProcessingPipeline {
  private preprocessor: PreprocessingService;
  private chunker: HierarchicalChunker;
  private enhancer: ContentEnhancer;
  private embedder: EmbeddingService;
  private storage: VectorStorageService;
  private config = getVectorConfig();
  
  constructor() {
    this.preprocessor = new PreprocessingService();
    this.chunker = new HierarchicalChunker();
    this.enhancer = new ContentEnhancer();
    this.embedder = new EmbeddingService();
    this.storage = new VectorStorageService();
  }
  
  /**
   * Process a single document through the entire pipeline
   */
  async processDocument(
    content: string,
    contentType: SourceType,
    options: ProcessingOptions
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const errors: Error[] = [];
    let chunks: Chunk[] = [];
    let enhancedChunks: EnhancedChunk[] = [];
    let embeddings: number[][] = [];
    
    const tokenUsage = {
      preprocessing: 0,
      embedding: 0,
      total: 0
    };
    
    try {
      // 1. Preprocessing
      this.reportProgress(options.onProgress, {
        stage: 'preprocessing',
        current: 0,
        total: 1,
        message: 'Preprocessing document...'
      });
      
      const preprocessed = await this.preprocessor.preprocess({
        content,
        type: contentType,
        metadata: {
          sourceId: options.sourceId,
          timestamp: new Date()
        },
        repositoryId: options.repositoryId
      });
      tokenUsage.preprocessing = this.estimateTokenCount(preprocessed.cleanContent);
      
      // 2. Chunking
      this.reportProgress(options.onProgress, {
        stage: 'chunking',
        current: 0,
        total: 1,
        message: 'Creating chunks...'
      });
      
      chunks = await this.chunker.chunk(preprocessed);
      
      // 3. Enhancement
      this.reportProgress(options.onProgress, {
        stage: 'enhancing',
        current: 0,
        total: chunks.length,
        message: `Enhancing ${chunks.length} chunks...`
      });
      
      const enhancementContext: EnhancementContext = {
        repository: options.repositoryId,
        analysisType: contentType,
        ...options.enhancementContext
      };
      
      enhancedChunks = await this.enhancer.enhanceChunks(chunks, enhancementContext);
      
      // Update progress for each enhanced chunk
      for (let i = 0; i < enhancedChunks.length; i++) {
        this.reportProgress(options.onProgress, {
          stage: 'enhancing',
          current: i + 1,
          total: enhancedChunks.length,
          message: `Enhanced chunk ${i + 1} of ${enhancedChunks.length}`
        });
      }
      
      // 4. Embedding Generation
      this.reportProgress(options.onProgress, {
        stage: 'embedding',
        current: 0,
        total: enhancedChunks.length,
        message: `Generating embeddings for ${enhancedChunks.length} chunks...`
      });
      
      const embeddingResult = await this.embedder.generateBatchEmbeddings(enhancedChunks);
      embeddings = embeddingResult.embeddings;
      tokenUsage.embedding = embeddingResult.totalTokens;
      
      // 5. Storage
      this.reportProgress(options.onProgress, {
        stage: 'storing',
        current: 0,
        total: enhancedChunks.length,
        message: `Storing ${enhancedChunks.length} chunks...`
      });
      
      const storageResult = await this.storage.storeChunks(
        enhancedChunks,
        embeddings,
        options.repositoryId,
        options.sourceType,
        options.sourceId,
        options.storageType || 'cached'
      );
      
      // Create chunk relationships
      await this.createChunkRelationships(enhancedChunks, options.repositoryId);
      
      this.reportProgress(options.onProgress, {
        stage: 'storing',
        current: storageResult.stored,
        total: enhancedChunks.length,
        message: `Stored ${storageResult.stored} chunks`
      });
      
      // Add storage errors to the error list
      errors.push(...storageResult.errors);
      
      tokenUsage.total = tokenUsage.preprocessing + tokenUsage.embedding;
      
      return {
        success: errors.length === 0,
        chunksProcessed: chunks.length,
        chunksStored: storageResult.stored,
        errors,
        duration: Date.now() - startTime,
        tokenUsage
      };
    } catch (error) {
      errors.push(error as Error);
      
      return {
        success: false,
        chunksProcessed: chunks.length,
        chunksStored: 0,
        errors,
        duration: Date.now() - startTime,
        tokenUsage
      };
    }
  }
  
  /**
   * Process multiple documents in parallel
   */
  async processDocuments(
    documents: Array<{
      content: string;
      contentType: SourceType;
      metadata?: Record<string, any>;
    }>,
    options: ProcessingOptions
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const errors: Error[] = [];
    let totalChunksProcessed = 0;
    let totalChunksStored = 0;
    const totalTokenUsage = {
      preprocessing: 0,
      embedding: 0,
      total: 0
    };
    
    // Process documents with concurrency control
    const concurrency = this.config.processing.maxConcurrency;
    const results: ProcessingResult[] = [];
    
    for (let i = 0; i < documents.length; i += concurrency) {
      const batch = documents.slice(i, i + concurrency);
      
      const batchResults = await Promise.all(
        batch.map((doc, index) =>
          this.processDocument(doc.content, doc.contentType, {
            ...options,
            sourceId: `${options.sourceId}-doc-${i + index}`,
            enhancementContext: {
              repository: options.repositoryId,
              ...options.enhancementContext,
              ...doc.metadata
            }
          })
        )
      );
      
      results.push(...batchResults);
    }
    
    // Aggregate results
    for (const result of results) {
      totalChunksProcessed += result.chunksProcessed;
      totalChunksStored += result.chunksStored;
      totalTokenUsage.preprocessing += result.tokenUsage.preprocessing;
      totalTokenUsage.embedding += result.tokenUsage.embedding;
      errors.push(...result.errors);
    }
    
    totalTokenUsage.total = totalTokenUsage.preprocessing + totalTokenUsage.embedding;
    
    return {
      success: errors.length === 0,
      chunksProcessed: totalChunksProcessed,
      chunksStored: totalChunksStored,
      errors,
      duration: Date.now() - startTime,
      tokenUsage: totalTokenUsage
    };
  }
  
  /**
   * Update existing chunks (for incremental updates)
   */
  async updateChunks(
    sourceType: string,
    sourceId: string,
    repositoryId: string,
    newContent: string,
    contentType: SourceType
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    
    try {
      // Delete existing chunks
      await this.storage.deleteChunksBySource(sourceType, sourceId, repositoryId);
      
      // Process new content
      return await this.processDocument(newContent, contentType, {
        repositoryId,
        sourceType,
        sourceId,
        storageType: 'cached'
      });
    } catch (error) {
      return {
        success: false,
        chunksProcessed: 0,
        chunksStored: 0,
        errors: [error as Error],
        duration: Date.now() - startTime,
        tokenUsage: { preprocessing: 0, embedding: 0, total: 0 }
      };
    }
  }
  
  /**
   * Clean up expired chunks across all repositories
   */
  async cleanupExpiredChunks(): Promise<number> {
    return await this.storage.cleanExpiredChunks();
  }
  
  /**
   * Get pipeline statistics
   */
  async getPipelineStats(repositoryId: string): Promise<{
    storageStats: any;
    embeddingCacheStats: any;
  }> {
    const storageStats = await this.storage.getStorageStats(repositoryId);
    const embeddingCacheStats = this.embedder.getCacheStats();
    
    return {
      storageStats,
      embeddingCacheStats
    };
  }
  
  /**
   * Create relationships between chunks
   */
  private async createChunkRelationships(
    chunks: EnhancedChunk[],
    repositoryId: string
  ): Promise<void> {
    // Create sequential relationships
    for (let i = 0; i < chunks.length - 1; i++) {
      await this.storage.createRelationship(
        chunks[i].id,
        chunks[i + 1].id,
        'sequential',
        1.0
      );
    }
    
    // Create hierarchical relationships based on chunk relationships
    for (const chunk of chunks) {
      for (const rel of chunk.relationships) {
        if (rel.type === 'parent') {
          await this.storage.createRelationship(
            rel.targetChunkId,
            chunk.id,
            'hierarchical',
            1.0
          );
        }
      }
    }
    
    // Find and create similarity relationships
    // This is optional and can be done asynchronously
    if (chunks.length < 100) { // Only for small sets to avoid performance issues
      await this.createSimilarityRelationships(chunks, repositoryId);
    }
  }
  
  /**
   * Create similarity relationships between chunks
   */
  private async createSimilarityRelationships(
    chunks: EnhancedChunk[],
    repositoryId: string,
    threshold = 0.85
  ): Promise<void> {
    // Get embeddings for all chunks
    const chunkEmbeddings = await Promise.all(
      chunks.map(async chunk => {
        const result = await this.embedder.generateEmbedding(chunk);
        return result.embedding;
      })
    );
    
    // Compare all pairs and create relationships for similar chunks
    for (let i = 0; i < chunks.length; i++) {
      for (let j = i + 1; j < chunks.length; j++) {
        const similarity = this.embedder.cosineSimilarity(
          chunkEmbeddings[i],
          chunkEmbeddings[j]
        );
        
        if (similarity >= threshold) {
          await this.storage.createRelationship(
            chunks[i].id,
            chunks[j].id,
            'similar',
            similarity
          );
        }
      }
    }
  }
  
  /**
   * Helper methods
   */
  
  private reportProgress(
    onProgress: ((progress: ProcessingProgress) => void) | undefined,
    progress: ProcessingProgress
  ): void {
    if (onProgress) {
      onProgress(progress);
    }
  }
  
  private estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
