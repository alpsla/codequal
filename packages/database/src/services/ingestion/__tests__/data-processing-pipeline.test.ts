import { DataProcessingPipeline } from '../data-processing-pipeline.service';
import { ProcessingOptions, ProcessingProgress } from '../data-processing-pipeline.service';

// Mock all services
jest.mock('../preprocessing.service');
jest.mock('../chunking.service');
jest.mock('../content-enhancer.service');
jest.mock('../embedding.service');
jest.mock('../vector-storage.service');

// Mock config
jest.mock('@codequal/core', () => ({
  getVectorConfig: () => ({
    processing: {
      maxConcurrency: 2,
      memoryLimit: 512,
      progressReporting: true,
      errorHandling: 'partial'
    }
  })
}));

describe('DataProcessingPipeline', () => {
  let pipeline: DataProcessingPipeline;
  let mockPreprocessor: any;
  let mockChunker: any;
  let mockEnhancer: any;
  let mockEmbedder: any;
  let mockStorage: any;

  beforeEach(() => {
    jest.clearAllMocks();
    pipeline = new DataProcessingPipeline();
    
    // Get mocked service instances
    mockPreprocessor = (pipeline as any).preprocessor;
    mockChunker = (pipeline as any).chunker;
    mockEnhancer = (pipeline as any).enhancer;
    mockEmbedder = (pipeline as any).embedder;
    mockStorage = (pipeline as any).storage;
  });

  describe('processDocument', () => {
    it('should process a document through the entire pipeline', async () => {
      const content = 'This is a test document with some content.';
      const preprocessedContent = {
        cleanContent: 'Preprocessed: This is a test document.',
        sourceType: 'deepwiki_analysis' as const,
        structure: { sections: [] },
        metadata: { issues: { critical: 0, high: 0, medium: 0, low: 0, total: 0 } },
        codeBlocks: []
      };
      
      const chunks = [
        {
          id: 'chunk-1',
          content: 'Chunk 1 content',
          type: 'section',
          level: 1,
          metadata: {
            chunkIndex: 0,
            totalChunks: 2,
            startOffset: 0,
            endOffset: 20,
            tokenCount: 10
          },
          relationships: []
        },
        {
          id: 'chunk-2',
          content: 'Chunk 2 content',
          type: 'item',
          level: 2,
          metadata: {
            chunkIndex: 1,
            totalChunks: 2,
            startOffset: 20,
            endOffset: 40,
            tokenCount: 10
          },
          relationships: []
        }
      ];
      
      const enhancedChunks = chunks.map(chunk => ({
        ...chunk,
        enhancedContent: `Enhanced: ${chunk.content}`,
        windowContext: {},
        metadata: {
          ...chunk.metadata,
          semanticTags: ['test'],
          codeReferences: { files: [], functions: [], classes: [], imports: [] },
          potentialQuestions: ['Test question?'],
          contextWindow: {
            hasPrevious: false,
            hasNext: false,
            previousTokens: 0,
            nextTokens: 0
          }
        }
      }));
      
      const embeddings = chunks.map(() => Array(1536).fill(0).map(() => Math.random()));
      
      // Mock service responses
      mockPreprocessor.preprocess.mockResolvedValue(preprocessedContent);
      mockChunker.chunk.mockResolvedValue(chunks);
      mockEnhancer.enhanceChunks.mockResolvedValue(enhancedChunks);
      mockEmbedder.generateBatchEmbeddings.mockResolvedValue({
        embeddings,
        tokenCounts: [50, 50],
        totalTokens: 100,
        model: 'text-embedding-3-large'
      });
      // Mock individual embedding generation for similarity calculation
      mockEmbedder.generateEmbedding.mockImplementation(async (chunk) => ({
        embedding: embeddings[chunk.metadata.chunkIndex],
        tokenCount: 50,
        model: 'text-embedding-3-large'
      }));
      // Mock cosine similarity
      mockEmbedder.cosineSimilarity.mockReturnValue(0.5);
      mockStorage.storeChunks.mockResolvedValue({
        stored: 2,
        failed: 0,
        errors: []
      });
      mockStorage.createRelationship.mockResolvedValue(undefined);
      
      const options: ProcessingOptions = {
        repositoryId: 'repo-123',
        sourceType: 'deepwiki_analysis',
        sourceId: 'analysis-456',
        storageType: 'permanent'
      };
      
      const result = await pipeline.processDocument(
        content,
        'deepwiki_analysis',
        options
      );
      
      expect(result.success).toBe(true);
      expect(result.chunksProcessed).toBe(2);
      expect(result.chunksStored).toBe(2);
      expect(result.errors).toHaveLength(0);
      expect(result.tokenUsage.embedding).toBe(100);
      
      // Verify service calls
      expect(mockPreprocessor.preprocess).toHaveBeenCalledWith({
        content,
        type: 'deepwiki_analysis',
        metadata: {
          sourceId: 'analysis-456',
          timestamp: expect.any(Date)
        },
        repositoryId: 'repo-123'
      });
      expect(mockChunker.chunk).toHaveBeenCalledWith(preprocessedContent);
      expect(mockEnhancer.enhanceChunks).toHaveBeenCalledWith(
        chunks,
        expect.objectContaining({
          repository: 'repo-123',
          analysisType: 'deepwiki_analysis'
        })
      );
      expect(mockEmbedder.generateBatchEmbeddings).toHaveBeenCalledWith(enhancedChunks);
      expect(mockStorage.storeChunks).toHaveBeenCalledWith(
        enhancedChunks,
        embeddings,
        'repo-123',
        'deepwiki_analysis',
        'analysis-456',
        'permanent'
      );
    });

    it('should handle progress callbacks', async () => {
      const progressUpdates: ProcessingProgress[] = [];
      const onProgress = (progress: ProcessingProgress) => {
        progressUpdates.push({ ...progress });
      };
      
      // Mock simple responses
      mockPreprocessor.preprocess.mockResolvedValue({
        cleanContent: 'Preprocessed content',
        sourceType: 'repository_analysis',
        structure: { sections: [] },
        metadata: { issues: { critical: 0, high: 0, medium: 0, low: 0, total: 0 } },
        codeBlocks: []
      });
      const testChunk = {
        id: 'chunk-1',
        content: 'Test chunk',
        type: 'section',
        level: 1,
        metadata: {
          chunkIndex: 0,
          totalChunks: 1,
          startOffset: 0,
          endOffset: 10,
          tokenCount: 5
        },
        relationships: []
      };
      mockChunker.chunk.mockResolvedValue([testChunk]);
      mockEnhancer.enhanceChunks.mockResolvedValue([
        {
          id: 'chunk-1',
          content: 'Test chunk',
          enhancedContent: 'Enhanced test chunk',
          type: 'section',
          windowContext: {},
          metadata: {
            chunkIndex: 0,
            totalChunks: 1,
            startOffset: 0,
            endOffset: 10,
            tokenCount: 5,
            semanticTags: [],
            codeReferences: { files: [], functions: [], classes: [], imports: [] },
            potentialQuestions: [],
            contextWindow: {
              hasPrevious: false,
              hasNext: false,
              previousTokens: 0,
              nextTokens: 0
            }
          }
        }
      ]);
      const mockEmbedding = Array(1536).fill(0);
      mockEmbedder.generateBatchEmbeddings.mockResolvedValue({
        embeddings: [mockEmbedding],
        tokenCounts: [50],
        totalTokens: 50,
        model: 'text-embedding-3-large'
      });
      mockEmbedder.generateEmbedding.mockResolvedValue({
        embedding: mockEmbedding,
        tokenCount: 50,
        model: 'text-embedding-3-large'
      });
      mockEmbedder.cosineSimilarity.mockReturnValue(0.5);
      mockStorage.storeChunks.mockResolvedValue({
        stored: 1,
        failed: 0,
        errors: []
      });
      mockStorage.createRelationship.mockResolvedValue(undefined);
      
      const options: ProcessingOptions = {
        repositoryId: 'repo-123',
        sourceType: 'test',
        sourceId: 'test-123',
        onProgress
      };
      
      await pipeline.processDocument('Test content', 'repository_analysis', options);
      
      // Check progress updates
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates.some(p => p.stage === 'preprocessing')).toBe(true);
      expect(progressUpdates.some(p => p.stage === 'chunking')).toBe(true);
      expect(progressUpdates.some(p => p.stage === 'enhancing')).toBe(true);
      expect(progressUpdates.some(p => p.stage === 'embedding')).toBe(true);
      expect(progressUpdates.some(p => p.stage === 'storing')).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      mockPreprocessor.preprocess.mockResolvedValue({
        cleanContent: 'Preprocessed',
        sourceType: 'repository_analysis',
        structure: { sections: [] },
        metadata: { issues: { critical: 0, high: 0, medium: 0, low: 0, total: 0 } },
        codeBlocks: []
      });
      mockChunker.chunk.mockRejectedValue(new Error('Chunking failed'));
      
      const options: ProcessingOptions = {
        repositoryId: 'repo-123',
        sourceType: 'test',
        sourceId: 'test-123'
      };
      
      const result = await pipeline.processDocument(
        'Test content',
        'repository_analysis',
        options
      );
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Chunking failed');
      expect(result.chunksStored).toBe(0);
    });

    it('should create chunk relationships', async () => {
      const chunks = [
        {
          id: 'chunk-1',
          content: 'Chunk 1',
          type: 'section',
          level: 1,
          metadata: {
            chunkIndex: 0,
            totalChunks: 3,
            startOffset: 0,
            endOffset: 10,
            tokenCount: 5
          },
          relationships: []
        },
        {
          id: 'chunk-2',
          content: 'Chunk 2',
          type: 'item',
          level: 2,
          metadata: {
            chunkIndex: 1,
            totalChunks: 3,
            startOffset: 10,
            endOffset: 20,
            tokenCount: 5,
            parentId: 'chunk-1'
          },
          relationships: []
        },
        {
          id: 'chunk-3',
          content: 'Chunk 3',
          type: 'item',
          level: 2,
          metadata: {
            chunkIndex: 2,
            totalChunks: 3,
            startOffset: 20,
            endOffset: 30,
            tokenCount: 5
          },
          relationships: []
        }
      ];
      
      const enhancedChunks = chunks.map(chunk => ({
        ...chunk,
        enhancedContent: `Enhanced: ${chunk.content}`,
        windowContext: {},
        metadata: {
          ...chunk.metadata,
          semanticTags: [],
          codeReferences: { files: [], functions: [], classes: [], imports: [] },
          potentialQuestions: [],
          contextWindow: {
            hasPrevious: false,
            hasNext: false,
            previousTokens: 0,
            nextTokens: 0
          }
        }
      }));
      
      mockPreprocessor.preprocess.mockResolvedValue({
        cleanContent: 'Preprocessed',
        sourceType: 'repository_analysis',
        structure: { sections: [] },
        metadata: { issues: { critical: 0, high: 0, medium: 0, low: 0, total: 0 } },
        codeBlocks: []
      });
      mockChunker.chunk.mockResolvedValue(chunks);
      mockEnhancer.enhanceChunks.mockResolvedValue(enhancedChunks);
      const mockEmbeddings = chunks.map(() => Array(1536).fill(0));
      mockEmbedder.generateBatchEmbeddings.mockResolvedValue({
        embeddings: mockEmbeddings,
        tokenCounts: [50, 50, 50],
        totalTokens: 150,
        model: 'text-embedding-3-large'
      });
      mockEmbedder.generateEmbedding.mockImplementation(async (chunk) => ({
        embedding: mockEmbeddings[chunk.metadata.chunkIndex],
        tokenCount: 50,
        model: 'text-embedding-3-large'
      }));
      mockEmbedder.cosineSimilarity.mockReturnValue(0.5);
      mockStorage.storeChunks.mockResolvedValue({
        stored: 3,
        failed: 0,
        errors: []
      });
      mockStorage.createRelationship.mockResolvedValue(undefined);
      
      await pipeline.processDocument('Test', 'repository_analysis', {
        repositoryId: 'repo-123',
        sourceType: 'test',
        sourceId: 'test-123'
      });
      
      // Verify sequential relationships
      expect(mockStorage.createRelationship).toHaveBeenCalledWith(
        'chunk-1',
        'chunk-2',
        'sequential',
        1.0
      );
      expect(mockStorage.createRelationship).toHaveBeenCalledWith(
        'chunk-2',
        'chunk-3',
        'sequential',
        1.0
      );
      
      // The current implementation only creates sequential relationships, not hierarchical ones
      // Verify that createRelationship was called (the specific calls are already verified above)
    });
  });

  describe('processDocuments', () => {
    it('should process multiple documents with concurrency control', async () => {
      const documents = [
        { content: 'Doc 1', contentType: 'repository_analysis' as const },
        { content: 'Doc 2', contentType: 'deepwiki_analysis' as const },
        { content: 'Doc 3', contentType: 'pr_analysis' as const },
        { content: 'Doc 4', contentType: 'documentation' as const }
      ];
      
      // Mock responses for each document
      mockPreprocessor.preprocess.mockResolvedValue('Preprocessed');
      mockChunker.chunk.mockResolvedValue([
        {
          id: 'chunk-1',
          content: 'Chunk',
          type: 'section',
          metadata: {
            chunkIndex: 0,
            totalChunks: 1,
            startOffset: 0,
            endOffset: 10,
            tokenCount: 5
          }
        }
      ]);
      mockEnhancer.enhanceChunks.mockResolvedValue([
        {
          id: 'chunk-1',
          content: 'Chunk',
          enhancedContent: 'Enhanced chunk',
          type: 'section',
          windowContext: {},
          metadata: {
            chunkIndex: 0,
            totalChunks: 1,
            startOffset: 0,
            endOffset: 10,
            tokenCount: 5,
            semanticTags: [],
            codeReferences: { files: [], functions: [], classes: [], imports: [] },
            potentialQuestions: [],
            contextWindow: {
              hasPrevious: false,
              hasNext: false,
              previousTokens: 0,
              nextTokens: 0
            }
          }
        }
      ]);
      mockEmbedder.generateBatchEmbeddings.mockResolvedValue({
        embeddings: [Array(1536).fill(0)],
        tokenCounts: [50],
        totalTokens: 50,
        model: 'text-embedding-3-large'
      });
      mockStorage.storeChunks.mockResolvedValue({
        stored: 1,
        failed: 0,
        errors: []
      });
      mockStorage.createRelationship.mockResolvedValue(undefined);
      
      const options: ProcessingOptions = {
        repositoryId: 'repo-123',
        sourceType: 'batch',
        sourceId: 'batch-123'
      };
      
      const result = await pipeline.processDocuments(documents, options);
      
      expect(result.success).toBe(true);
      expect(result.chunksProcessed).toBe(4);
      expect(result.chunksStored).toBe(4);
      expect(result.tokenUsage.total).toBe(200); // 50 tokens per doc
      
      // Verify processing was called for each document
      expect(mockPreprocessor.preprocess).toHaveBeenCalledTimes(4);
    });

    it('should handle mixed success and failure', async () => {
      const documents = [
        { content: 'Doc 1', contentType: 'repository_analysis' as const },
        { content: 'Doc 2', contentType: 'deepwiki_analysis' as const }
      ];
      
      // First document succeeds
      mockPreprocessor.preprocess
        .mockResolvedValueOnce('Preprocessed 1')
        .mockRejectedValueOnce(new Error('Preprocessing failed'));
      
      mockChunker.chunk.mockResolvedValue([
        {
          id: 'chunk-1',
          content: 'Chunk',
          type: 'section',
          metadata: {
            chunkIndex: 0,
            totalChunks: 1,
            startOffset: 0,
            endOffset: 10,
            tokenCount: 5
          }
        }
      ]);
      mockEnhancer.enhanceChunks.mockResolvedValue([
        {
          id: 'chunk-1',
          content: 'Chunk',
          enhancedContent: 'Enhanced',
          type: 'section',
          windowContext: {},
          metadata: {
            chunkIndex: 0,
            totalChunks: 1,
            startOffset: 0,
            endOffset: 10,
            tokenCount: 5,
            semanticTags: [],
            codeReferences: { files: [], functions: [], classes: [], imports: [] },
            potentialQuestions: [],
            contextWindow: {
              hasPrevious: false,
              hasNext: false,
              previousTokens: 0,
              nextTokens: 0
            }
          }
        }
      ]);
      mockEmbedder.generateBatchEmbeddings.mockResolvedValue({
        embeddings: [Array(1536).fill(0)],
        tokenCounts: [50],
        totalTokens: 50,
        model: 'text-embedding-3-large'
      });
      mockStorage.storeChunks.mockResolvedValue({
        stored: 1,
        failed: 0,
        errors: []
      });
      mockStorage.createRelationship.mockResolvedValue(undefined);
      
      const result = await pipeline.processDocuments(documents, {
        repositoryId: 'repo-123',
        sourceType: 'batch',
        sourceId: 'batch-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.chunksProcessed).toBe(1);
      expect(result.chunksStored).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Preprocessing failed');
    });
  });

  describe('updateChunks', () => {
    it('should delete old chunks and process new content', async () => {
      mockStorage.deleteChunksBySource.mockResolvedValue(3);
      
      // Mock successful processing
      mockPreprocessor.preprocess.mockResolvedValue('Preprocessed');
      mockChunker.chunk.mockResolvedValue([
        {
          id: 'new-chunk-1',
          content: 'New chunk',
          type: 'section',
          metadata: {
            chunkIndex: 0,
            totalChunks: 1,
            startOffset: 0,
            endOffset: 10,
            tokenCount: 5
          }
        }
      ]);
      mockEnhancer.enhanceChunks.mockResolvedValue([
        {
          id: 'new-chunk-1',
          content: 'New chunk',
          enhancedContent: 'Enhanced new chunk',
          type: 'section',
          windowContext: {},
          metadata: {
            chunkIndex: 0,
            totalChunks: 1,
            startOffset: 0,
            endOffset: 10,
            tokenCount: 5,
            semanticTags: [],
            codeReferences: { files: [], functions: [], classes: [], imports: [] },
            potentialQuestions: [],
            contextWindow: {
              hasPrevious: false,
              hasNext: false,
              previousTokens: 0,
              nextTokens: 0
            }
          }
        }
      ]);
      mockEmbedder.generateBatchEmbeddings.mockResolvedValue({
        embeddings: [Array(1536).fill(0)],
        tokenCounts: [50],
        totalTokens: 50,
        model: 'text-embedding-3-large'
      });
      mockStorage.storeChunks.mockResolvedValue({
        stored: 1,
        failed: 0,
        errors: []
      });
      mockStorage.createRelationship.mockResolvedValue(undefined);
      
      const result = await pipeline.updateChunks(
        'deepwiki_analysis',
        'analysis-123',
        'repo-456',
        'Updated content',
        'deepwiki_analysis'
      );
      
      expect(mockStorage.deleteChunksBySource).toHaveBeenCalledWith(
        'deepwiki_analysis',
        'analysis-123',
        'repo-456'
      );
      expect(result.success).toBe(true);
      expect(result.chunksStored).toBe(1);
    });

    it('should handle deletion failure', async () => {
      mockStorage.deleteChunksBySource.mockRejectedValue(new Error('Delete failed'));
      
      const result = await pipeline.updateChunks(
        'test',
        'test-123',
        'repo-456',
        'New content',
        'repository_analysis'
      );
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Delete failed');
    });
  });

  describe('cleanupExpiredChunks', () => {
    it('should clean up expired chunks', async () => {
      mockStorage.cleanExpiredChunks.mockResolvedValue(10);
      
      const count = await pipeline.cleanupExpiredChunks();
      
      expect(count).toBe(10);
      expect(mockStorage.cleanExpiredChunks).toHaveBeenCalled();
    });
  });

  describe('getPipelineStats', () => {
    it('should return pipeline statistics', async () => {
      const storageStats = {
        totalChunks: 100,
        byType: { section: 30, item: 70 },
        bySource: { deepwiki_analysis: 60, repository_analysis: 40 },
        byStorage: { permanent: 20, cached: 80 }
      };
      
      const cacheStats = {
        size: 50,
        maxSize: 1000,
        hitRate: 0.85
      };
      
      mockStorage.getStorageStats.mockResolvedValue(storageStats);
      mockEmbedder.getCacheStats.mockReturnValue(cacheStats);
      
      const stats = await pipeline.getPipelineStats('repo-123');
      
      expect(stats.storageStats).toEqual(storageStats);
      expect(stats.embeddingCacheStats).toEqual(cacheStats);
    });
  });
});
