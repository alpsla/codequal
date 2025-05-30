import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase/supabase-client.factory';
import { createLogger } from '../../utils/logger';

/**
 * Represents a change in a repository file
 */
export interface FileChange {
  filePath: string;
  changeType: 'added' | 'modified' | 'deleted';
  content?: string; // Only for added/modified files
  previousHash?: string; // For detecting actual changes
  currentHash?: string;
  lastModified?: Date;
}

/**
 * Repository change detection result
 */
export interface RepositoryChanges {
  repositoryId: number;
  repositoryUrl: string;
  commitHash?: string;
  changes: FileChange[];
  detectionMethod: 'git' | 'filesystem' | 'webhook';
  detectedAt: Date;
}

/**
 * Configuration for incremental updates
 */
export interface IncrementalUpdateConfig {
  // Batch size for processing changes
  batchSize?: number;
  
  // Maximum chunks per file to avoid overwhelming the database
  maxChunksPerFile?: number;
  
  // Chunk size for breaking down content
  chunkSize?: number;
  
  // Overlap between chunks for better context
  chunkOverlap?: number;
  
  // File filters
  includePatterns?: string[]; // glob patterns for files to include
  excludePatterns?: string[]; // glob patterns for files to exclude
  
  // Processing options
  extractCodeMetadata?: boolean; // Extract function names, classes, etc.
  calculateImportance?: boolean; // Calculate importance scores
  generateEmbeddings?: boolean; // Generate vector embeddings
  
  // Retention policy
  retentionDays?: number; // How long to keep old embeddings
}

/**
 * Chunk processing result
 */
export interface ProcessedChunk {
  content: string;
  chunkIndex: number;
  chunkTotal: number;
  metadata: Record<string, unknown>;
  
  // Extracted metadata
  functionNames?: string[];
  classNames?: string[];
  dependencies?: string[];
  frameworkReferences?: string[];
  
  // Computed scores
  importanceScore?: number;
  complexityScore?: number;
  
  // Vector embedding
  embedding?: number[];
}

/**
 * File processing result
 */
export interface ProcessedFile {
  filePath: string;
  contentType: string;
  contentLanguage?: string;
  chunks: ProcessedChunk[];
  fileSize: number;
  lastModified: Date;
  gitCommitHash?: string;
}

/**
 * Update operation result
 */
export interface UpdateResult {
  repositoryId: number;
  processed: {
    added: number;
    modified: number;
    deleted: number;
  };
  embeddings: {
    created: number;
    updated: number;
    deleted: number;
  };
  errors: string[];
  processingTimeMs: number;
}

/**
 * Embedding service interface
 */
export interface EmbeddingService {
  generateEmbedding(text: string): Promise<number[]>;
  generateBatchEmbeddings(texts: string[]): Promise<number[][]>;
}

/**
 * Content analysis service interface
 */
export interface ContentAnalysisService {
  extractCodeMetadata(content: string, language: string): Promise<{
    functionNames: string[];
    classNames: string[];
    dependencies: string[];
    frameworkReferences: string[];
    complexityScore: number;
  }>;
  
  calculateImportanceScore(
    filePath: string,
    content: string,
    metadata: Record<string, unknown>
  ): Promise<number>;
  
  determineContentType(filePath: string): string;
  determineContentLanguage(filePath: string, content: string): string;
}

/**
 * Incremental Update Service that efficiently processes repository changes
 * and updates the vector database with minimal impact.
 */
export class IncrementalUpdateService {
  private logger = createLogger('IncrementalUpdateService');
  private supabase = getSupabaseClient();
  
  constructor(
    private embeddingService: EmbeddingService,
    private contentAnalysisService: ContentAnalysisService
  ) {}
  
  /**
   * Process repository changes and update the vector database incrementally
   */
  async processRepositoryChanges(
    changes: RepositoryChanges,
    config: IncrementalUpdateConfig = {}
  ): Promise<UpdateResult> {
    const startTime = Date.now();
    
    const defaultConfig: Required<IncrementalUpdateConfig> = {
      batchSize: 10,
      maxChunksPerFile: 50,
      chunkSize: 1000,
      chunkOverlap: 200,
      includePatterns: ['**/*.ts', '**/*.js', '**/*.py', '**/*.java', '**/*.md', '**/*.rst'],
      excludePatterns: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'],
      extractCodeMetadata: true,
      calculateImportance: true,
      generateEmbeddings: true,
      retentionDays: 30
    };
    
    const finalConfig = { ...defaultConfig, ...config };
    
    this.logger.info('Starting incremental update', {
      repositoryId: changes.repositoryId,
      changeCount: changes.changes.length,
      commitHash: changes.commitHash
    });
    
    const result: UpdateResult = {
      repositoryId: changes.repositoryId,
      processed: { added: 0, modified: 0, deleted: 0 },
      embeddings: { created: 0, updated: 0, deleted: 0 },
      errors: [],
      processingTimeMs: 0
    };
    
    try {
      // Filter changes based on include/exclude patterns
      const filteredChanges = this.filterChanges(changes.changes, finalConfig);
      
      this.logger.debug('Filtered changes', {
        original: changes.changes.length,
        filtered: filteredChanges.length
      });
      
      // Process changes in batches
      const batches = this.createBatches(filteredChanges, finalConfig.batchSize);
      
      for (const [batchIndex, batch] of batches.entries()) {
        this.logger.debug(`Processing batch ${batchIndex + 1}/${batches.length}`, {
          batchSize: batch.length
        });
        
        await this.processBatch(
          changes.repositoryId,
          batch,
          finalConfig,
          result
        );
      }
      
      // Clean up expired embeddings
      await this.cleanupExpiredEmbeddings(changes.repositoryId, finalConfig.retentionDays);
      
      // Update repository metadata
      await this.updateRepositoryMetadata(changes);
      
      result.processingTimeMs = Date.now() - startTime;
      
      this.logger.info('Incremental update completed', {
        repositoryId: changes.repositoryId,
        processed: result.processed,
        embeddings: result.embeddings,
        errors: result.errors.length,
        processingTimeMs: result.processingTimeMs
      });
      
      return result;
      
    } catch (error) {
      result.processingTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(`Failed to process changes: ${errorMessage}`);
      
      this.logger.error('Incremental update failed', {
        error,
        repositoryId: changes.repositoryId
      });
      
      return result;
    }
  }
  
  /**
   * Filter changes based on include/exclude patterns
   */
  private filterChanges(
    changes: FileChange[],
    config: Required<IncrementalUpdateConfig>
  ): FileChange[] {
    return changes.filter(change => {
      const filePath = change.filePath;
      
      // Check exclude patterns first
      for (const pattern of config.excludePatterns) {
        if (this.matchesPattern(filePath, pattern)) {
          return false;
        }
      }
      
      // Check include patterns
      for (const pattern of config.includePatterns) {
        if (this.matchesPattern(filePath, pattern)) {
          return true;
        }
      }
      
      return false;
    });
  }
  
  /**
   * Simple glob pattern matching
   */
  private matchesPattern(filePath: string, pattern: string): boolean {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '[^/]');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(filePath);
  }
  
  /**
   * Create batches for processing
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }
  
  /**
   * Process a batch of changes
   */
  private async processBatch(
    repositoryId: number,
    changes: FileChange[],
    config: Required<IncrementalUpdateConfig>,
    result: UpdateResult
  ): Promise<void> {
    const promises = changes.map(async (change) => {
      try {
        switch (change.changeType) {
          case 'added':
          case 'modified':
            await this.processFileAddition(repositoryId, change, config);
            result.processed[change.changeType]++;
            break;
            
          case 'deleted':
            await this.processFileDeletion(repositoryId, change);
            result.processed.deleted++;
            break;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.errors.push(`Failed to process ${change.filePath}: ${errorMessage}`);
        this.logger.warn('Failed to process file change', {
          filePath: change.filePath,
          changeType: change.changeType,
          error
        });
      }
    });
    
    await Promise.all(promises);
  }
  
  /**
   * Process file addition or modification
   */
  private async processFileAddition(
    repositoryId: number,
    change: FileChange,
    config: Required<IncrementalUpdateConfig>
  ): Promise<void> {
    if (!change.content) {
      throw new Error('Content is required for added/modified files');
    }
    
    // First, remove existing embeddings for this file
    await this.removeFileEmbeddings(repositoryId, change.filePath);
    
    // Process the file
    const processedFile = await this.processFile(change, config);
    
    // Store new embeddings
    await this.storeFileEmbeddings(repositoryId, processedFile);
    
    this.logger.debug('File processed', {
      filePath: change.filePath,
      chunks: processedFile.chunks.length,
      contentType: processedFile.contentType
    });
  }
  
  /**
   * Process file deletion
   */
  private async processFileDeletion(
    repositoryId: number,
    change: FileChange
  ): Promise<void> {
    await this.removeFileEmbeddings(repositoryId, change.filePath);
    
    this.logger.debug('File embeddings removed', {
      filePath: change.filePath
    });
  }
  
  /**
   * Process a single file into chunks with metadata
   */
  private async processFile(
    change: FileChange,
    config: Required<IncrementalUpdateConfig>
  ): Promise<ProcessedFile> {
    const content = change.content!;
    const contentType = this.contentAnalysisService.determineContentType(change.filePath);
    const contentLanguage = this.contentAnalysisService.determineContentLanguage(
      change.filePath,
      content
    );
    
    // Split content into chunks
    const textChunks = this.splitIntoChunks(content, config.chunkSize, config.chunkOverlap);
    
    // Limit chunks per file
    const limitedChunks = textChunks.slice(0, config.maxChunksPerFile);
    
    // Process each chunk
    const processedChunks: ProcessedChunk[] = [];
    
    for (let i = 0; i < limitedChunks.length; i++) {
      const chunk = limitedChunks[i];
      const processedChunk = await this.processChunk(
        chunk,
        i,
        limitedChunks.length,
        change.filePath,
        contentLanguage,
        config
      );
      processedChunks.push(processedChunk);
    }
    
    return {
      filePath: change.filePath,
      contentType,
      contentLanguage,
      chunks: processedChunks,
      fileSize: content.length,
      lastModified: change.lastModified || new Date(),
      gitCommitHash: change.currentHash
    };
  }
  
  /**
   * Process a single chunk
   */
  private async processChunk(
    content: string,
    chunkIndex: number,
    chunkTotal: number,
    filePath: string,
    contentLanguage: string,
    config: Required<IncrementalUpdateConfig>
  ): Promise<ProcessedChunk> {
    const chunk: ProcessedChunk = {
      content,
      chunkIndex,
      chunkTotal,
      metadata: {}
    };
    
    // Extract code metadata if enabled
    if (config.extractCodeMetadata && this.isCodeFile(contentLanguage)) {
      try {
        const codeMetadata = await this.contentAnalysisService.extractCodeMetadata(
          content,
          contentLanguage
        );
        
        chunk.functionNames = codeMetadata.functionNames;
        chunk.classNames = codeMetadata.classNames;
        chunk.dependencies = codeMetadata.dependencies;
        chunk.frameworkReferences = codeMetadata.frameworkReferences;
        chunk.complexityScore = codeMetadata.complexityScore;
      } catch (error) {
        this.logger.warn('Failed to extract code metadata', { error, filePath });
      }
    }
    
    // Calculate importance score if enabled
    if (config.calculateImportance) {
      try {
        chunk.importanceScore = await this.contentAnalysisService.calculateImportanceScore(
          filePath,
          content,
          chunk.metadata
        );
      } catch (error) {
        this.logger.warn('Failed to calculate importance score', { error, filePath });
        chunk.importanceScore = 0.5; // Default
      }
    }
    
    // Generate embedding if enabled
    if (config.generateEmbeddings) {
      try {
        chunk.embedding = await this.embeddingService.generateEmbedding(content);
      } catch (error) {
        this.logger.warn('Failed to generate embedding', { error, filePath });
      }
    }
    
    return chunk;
  }
  
  /**
   * Split content into chunks with overlap
   */
  private splitIntoChunks(content: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    let start = 0;
    
    while (start < content.length) {
      const end = Math.min(start + chunkSize, content.length);
      const chunk = content.slice(start, end);
      chunks.push(chunk);
      
      if (end === content.length) break;
      start = end - overlap;
    }
    
    return chunks;
  }
  
  /**
   * Check if a file is a code file
   */
  private isCodeFile(contentLanguage: string): boolean {
    const codeLanguages = [
      'typescript', 'javascript', 'python', 'java', 'go', 'rust',
      'cpp', 'csharp', 'php', 'ruby', 'swift', 'kotlin'
    ];
    return codeLanguages.includes(contentLanguage);
  }
  
  /**
   * Store file embeddings in the database
   */
  private async storeFileEmbeddings(
    repositoryId: number,
    processedFile: ProcessedFile
  ): Promise<void> {
    if (processedFile.chunks.length === 0) return;
    
    const embeddings = processedFile.chunks.map(chunk => ({
      repository_id: repositoryId,
      file_path: processedFile.filePath,
      content_type: processedFile.contentType,
      content_language: processedFile.contentLanguage,
      content_chunk: chunk.content,
      chunk_index: chunk.chunkIndex,
      chunk_total: chunk.chunkTotal,
      embedding: chunk.embedding,
      metadata: {
        ...chunk.metadata,
        functionNames: chunk.functionNames,
        classNames: chunk.classNames,
        dependencies: chunk.dependencies,
        frameworkReferences: chunk.frameworkReferences
      },
      code_complexity_score: chunk.complexityScore,
      importance_score: chunk.importanceScore || 0.5,
      function_names: chunk.functionNames,
      class_names: chunk.classNames,
      dependencies: chunk.dependencies,
      framework_references: chunk.frameworkReferences,
      file_size_bytes: processedFile.fileSize,
      last_modified_at: processedFile.lastModified,
      git_commit_hash: processedFile.gitCommitHash,
      expires_at: this.calculateExpirationDate()
    }));
    
    const { error } = await this.supabase
      .from('rag_document_embeddings')
      .insert(embeddings);
    
    if (error) {
      throw new Error(`Failed to store embeddings: ${error.message}`);
    }
  }
  
  /**
   * Remove embeddings for a specific file
   */
  private async removeFileEmbeddings(
    repositoryId: number,
    filePath: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('rag_document_embeddings')
      .delete()
      .eq('repository_id', repositoryId)
      .eq('file_path', filePath);
    
    if (error) {
      throw new Error(`Failed to remove file embeddings: ${error.message}`);
    }
  }
  
  /**
   * Clean up expired embeddings
   */
  private async cleanupExpiredEmbeddings(
    repositoryId: number,
    retentionDays: number
  ): Promise<void> {
    try {
      const { data, error } = await this.supabase.rpc('rag_cleanup_expired_embeddings', {});
      
      if (error) {
        this.logger.warn('Failed to cleanup expired embeddings', { error });
      } else {
        this.logger.debug('Cleaned up expired embeddings', { deletedCount: data });
      }
    } catch (error) {
      this.logger.warn('Error during cleanup', { error });
    }
  }
  
  /**
   * Update repository metadata
   */
  private async updateRepositoryMetadata(changes: RepositoryChanges): Promise<void> {
    const { error } = await this.supabase
      .from('rag_repositories')
      .upsert({
        repository_url: changes.repositoryUrl,
        repository_name: this.extractRepositoryName(changes.repositoryUrl),
        last_analyzed_at: changes.detectedAt,
        updated_at: new Date()
      }, {
        onConflict: 'repository_url'
      });
    
    if (error) {
      this.logger.warn('Failed to update repository metadata', { error });
    }
  }
  
  /**
   * Extract repository name from URL
   */
  private extractRepositoryName(repositoryUrl: string): string {
    const match = repositoryUrl.match(/\/([^/]+)\/([^/]+)(?:\.git)?$/);
    return match ? `${match[1]}/${match[2]}` : repositoryUrl;
  }
  
  /**
   * Calculate expiration date for embeddings
   */
  private calculateExpirationDate(): Date {
    const now = new Date();
    return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
  }
}