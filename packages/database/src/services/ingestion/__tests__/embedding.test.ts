import { EmbeddingService } from '../embedding.service';
import { EnhancedChunk } from '../types';

// Mock OpenAI
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => {
    return {
      embeddings: {
        create: jest.fn()
      }
    };
  });
});

// Mock config
jest.mock('@codequal/core', () => ({
  getEmbeddingConfig: () => ({
    provider: 'openai',
    openai: {
      model: 'text-embedding-3-large',
      dimensions: 1536,
      apiKey: 'test-api-key',
      maxRetries: 3,
      timeout: 30000,
      batchSize: 100
    },
    cache: {
      enabled: true,
      ttl: 86400,
      maxSize: 100
    }
  })
}));

describe('EmbeddingService', () => {
  let service: EmbeddingService;
  let mockCreate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EmbeddingService();
    mockCreate = (service as any).openai.embeddings.create;
  });

  describe('generateEmbedding', () => {
    it('should generate embedding for a single chunk', async () => {
      const mockEmbedding = Array(1536).fill(0).map(() => Math.random());
      mockCreate.mockResolvedValueOnce({
        data: [{ embedding: mockEmbedding }],
        usage: { total_tokens: 50 }
      });

      const chunk: EnhancedChunk = {
        id: 'test-chunk',
        content: 'Test content',
        enhancedContent: 'Enhanced test content with metadata',
        type: 'section',
        windowContext: {},
        metadata: {
          chunkIndex: 0,
          totalChunks: 1,
          startOffset: 0,
          endOffset: 100,
          tokenCount: 20,
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
      };

      const result = await service.generateEmbedding(chunk);

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'text-embedding-3-large',
        input: 'Enhanced test content with metadata',
        dimensions: 1536
      });

      expect(result).toEqual({
        embedding: mockEmbedding,
        tokenCount: 50,
        model: 'text-embedding-3-large'
      });
    });

    it('should use cached embedding if available', async () => {
      const mockEmbedding = Array(1536).fill(0).map(() => Math.random());
      mockCreate.mockResolvedValueOnce({
        data: [{ embedding: mockEmbedding }],
        usage: { total_tokens: 50 }
      });

      const chunk: EnhancedChunk = {
        id: 'test-chunk',
        content: 'Test content',
        enhancedContent: 'Cached content',
        type: 'section',
        windowContext: {},
        metadata: {
          chunkIndex: 0,
          totalChunks: 1,
          startOffset: 0,
          endOffset: 100,
          tokenCount: 20,
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
      };

      // First call - should hit API
      await service.generateEmbedding(chunk);
      expect(mockCreate).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const result = await service.generateEmbedding(chunk);
      expect(mockCreate).toHaveBeenCalledTimes(1); // Still only 1 call
      expect(result.embedding).toEqual(mockEmbedding);
    });

    it('should handle rate limit errors with retry', async () => {
      const mockEmbedding = Array(1536).fill(0).map(() => Math.random());
      const rateLimitError = {
        status: 429,
        headers: { 'retry-after': '0.1' }
      };

      mockCreate
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({
          data: [{ embedding: mockEmbedding }],
          usage: { total_tokens: 50 }
        });

      const chunk: EnhancedChunk = {
        id: 'test-chunk',
        content: 'Test content',
        type: 'section',
        windowContext: {},
        metadata: {
          chunkIndex: 0,
          totalChunks: 1,
          startOffset: 0,
          endOffset: 100,
          tokenCount: 20,
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
      };

      const result = await service.generateEmbedding(chunk);

      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(result.embedding).toEqual(mockEmbedding);
    });
  });

  describe('generateBatchEmbeddings', () => {
    it('should generate embeddings for multiple chunks', async () => {
      const mockEmbeddings = [
        Array(1536).fill(0).map(() => Math.random()),
        Array(1536).fill(0).map(() => Math.random()),
        Array(1536).fill(0).map(() => Math.random())
      ];

      mockCreate.mockResolvedValueOnce({
        data: mockEmbeddings.map(embedding => ({ embedding })),
        usage: { prompt_tokens: 150 }
      });

      const chunks: EnhancedChunk[] = [
        {
          id: 'chunk-1',
          content: 'Content 1',
          enhancedContent: 'Enhanced content 1',
          type: 'section',
          windowContext: {},
          metadata: {
            chunkIndex: 0,
            totalChunks: 3,
            startOffset: 0,
            endOffset: 100,
            tokenCount: 20,
            semanticTags: [],
            codeReferences: { files: [], functions: [], classes: [], imports: [] },
            potentialQuestions: [],
            contextWindow: {
              hasPrevious: false,
              hasNext: true,
              previousTokens: 0,
              nextTokens: 10
            }
          }
        },
        {
          id: 'chunk-2',
          content: 'Content 2',
          enhancedContent: 'Enhanced content 2',
          type: 'item',
          windowContext: {},
          metadata: {
            chunkIndex: 1,
            totalChunks: 3,
            startOffset: 100,
            endOffset: 200,
            tokenCount: 25,
            semanticTags: [],
            codeReferences: { files: [], functions: [], classes: [], imports: [] },
            potentialQuestions: [],
            contextWindow: {
              hasPrevious: true,
              hasNext: true,
              previousTokens: 10,
              nextTokens: 10
            }
          }
        },
        {
          id: 'chunk-3',
          content: 'Content 3',
          enhancedContent: 'Enhanced content 3',
          type: 'section',
          windowContext: {},
          metadata: {
            chunkIndex: 2,
            totalChunks: 3,
            startOffset: 200,
            endOffset: 300,
            tokenCount: 20,
            semanticTags: [],
            codeReferences: { files: [], functions: [], classes: [], imports: [] },
            potentialQuestions: [],
            contextWindow: {
              hasPrevious: true,
              hasNext: false,
              previousTokens: 10,
              nextTokens: 0
            }
          }
        }
      ];

      const result = await service.generateBatchEmbeddings(chunks);

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'text-embedding-3-large',
        input: ['Enhanced content 1', 'Enhanced content 2', 'Enhanced content 3'],
        dimensions: 1536
      });

      expect(result.embeddings).toHaveLength(3);
      expect(result.embeddings[0]).toEqual(mockEmbeddings[0]);
      expect(result.embeddings[1]).toEqual(mockEmbeddings[1]);
      expect(result.embeddings[2]).toEqual(mockEmbeddings[2]);
      expect(result.totalTokens).toBeGreaterThan(0);
    });

    it('should handle large batches by splitting them', async () => {
      // Create 150 chunks (more than batch size of 100)
      const chunks: EnhancedChunk[] = Array(150).fill(null).map((_, i) => ({
        id: `chunk-${i}`,
        content: `Content ${i}`,
        enhancedContent: `Enhanced content ${i}`,
        type: 'item',
        windowContext: {},
        metadata: {
          chunkIndex: i,
          totalChunks: 150,
          startOffset: i * 100,
          endOffset: (i + 1) * 100,
          tokenCount: 20,
          semanticTags: [],
          codeReferences: { files: [], functions: [], classes: [], imports: [] },
          potentialQuestions: [],
          contextWindow: {
            hasPrevious: i > 0,
            hasNext: i < 149,
            previousTokens: i > 0 ? 10 : 0,
            nextTokens: i < 149 ? 10 : 0
          }
        }
      }));

      // Mock responses for two batches
      const firstBatchEmbeddings = Array(100).fill(null).map(() => 
        Array(1536).fill(0).map(() => Math.random())
      );
      const secondBatchEmbeddings = Array(50).fill(null).map(() => 
        Array(1536).fill(0).map(() => Math.random())
      );

      mockCreate
        .mockResolvedValueOnce({
          data: firstBatchEmbeddings.map(embedding => ({ embedding })),
          usage: { prompt_tokens: 2000 }
        })
        .mockResolvedValueOnce({
          data: secondBatchEmbeddings.map(embedding => ({ embedding })),
          usage: { prompt_tokens: 1000 }
        });

      const result = await service.generateBatchEmbeddings(chunks);

      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(result.embeddings).toHaveLength(150);
      expect(result.totalTokens).toBe(3000);
    });

    it('should use cache for batch embeddings', async () => {
      const mockEmbeddings = [
        Array(1536).fill(0).map(() => Math.random()),
        Array(1536).fill(0).map(() => Math.random())
      ];

      // First, generate embeddings for two chunks
      mockCreate.mockResolvedValueOnce({
        data: mockEmbeddings.map(embedding => ({ embedding })),
        usage: { prompt_tokens: 100 }
      });

      const chunks: EnhancedChunk[] = [
        {
          id: 'chunk-1',
          content: 'Content 1',
          enhancedContent: 'Cached content 1',
          type: 'section',
          windowContext: {},
          metadata: {
            chunkIndex: 0,
            totalChunks: 2,
            startOffset: 0,
            endOffset: 100,
            tokenCount: 20,
            semanticTags: [],
            codeReferences: { files: [], functions: [], classes: [], imports: [] },
            potentialQuestions: [],
            contextWindow: {
              hasPrevious: false,
              hasNext: true,
              previousTokens: 0,
              nextTokens: 10
            }
          }
        },
        {
          id: 'chunk-2',
          content: 'Content 2',
          enhancedContent: 'New content 2',
          type: 'item',
          windowContext: {},
          metadata: {
            chunkIndex: 1,
            totalChunks: 2,
            startOffset: 100,
            endOffset: 200,
            tokenCount: 25,
            semanticTags: [],
            codeReferences: { files: [], functions: [], classes: [], imports: [] },
            potentialQuestions: [],
            contextWindow: {
              hasPrevious: true,
              hasNext: false,
              previousTokens: 10,
              nextTokens: 0
            }
          }
        }
      ];

      // First call
      await service.generateBatchEmbeddings(chunks);

      // Now create new chunks where one has cached content
      const newChunks: EnhancedChunk[] = [
        {
          ...chunks[0], // Same enhanced content - should use cache
          id: 'chunk-3'
        },
        {
          id: 'chunk-4',
          content: 'Content 4',
          enhancedContent: 'New content 4',
          type: 'item',
          windowContext: {},
          metadata: {
            chunkIndex: 0,
            totalChunks: 1,
            startOffset: 0,
            endOffset: 100,
            tokenCount: 20,
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
      ];

      mockCreate.mockResolvedValueOnce({
        data: [{ embedding: Array(1536).fill(0).map(() => Math.random()) }],
        usage: { prompt_tokens: 50 }
      });

      const result = await service.generateBatchEmbeddings(newChunks);

      // Should only call API once more for the new content
      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(mockCreate.mock.calls[1][0].input).toEqual(['New content 4']);
      expect(result.embeddings).toHaveLength(2);
    });
  });

  describe('cosineSimilarity', () => {
    it('should calculate cosine similarity correctly', () => {
      const a = [1, 0, 0];
      const b = [0, 1, 0];
      const c = [1, 0, 0];
      const d = [0.707, 0.707, 0];

      // Orthogonal vectors
      expect(service.cosineSimilarity(a, b)).toBeCloseTo(0);
      
      // Same vectors
      expect(service.cosineSimilarity(a, c)).toBeCloseTo(1);
      
      // 45-degree angle
      expect(service.cosineSimilarity(a, d)).toBeCloseTo(0.707);
    });

    it('should handle zero vectors', () => {
      const zero = [0, 0, 0];
      const nonZero = [1, 2, 3];

      expect(service.cosineSimilarity(zero, nonZero)).toBe(0);
      expect(service.cosineSimilarity(zero, zero)).toBe(0);
    });

    it('should throw error for different dimensions', () => {
      const a = [1, 2, 3];
      const b = [1, 2];

      expect(() => service.cosineSimilarity(a, b)).toThrow(
        'Embeddings must have the same dimension'
      );
    });
  });

  describe('findTopSimilar', () => {
    it('should find top-k most similar embeddings', () => {
      const queryEmbedding = [1, 0, 0];
      const embeddings = [
        [0, 1, 0],      // orthogonal
        [1, 0, 0],      // same
        [0.8, 0.6, 0],  // similar
        [-1, 0, 0],     // opposite
        [0.5, 0.5, 0.707] // somewhat similar
      ];

      const results = service.findTopSimilar(queryEmbedding, embeddings, 3);

      expect(results).toHaveLength(3);
      expect(results[0].index).toBe(1); // same vector
      expect(results[0].similarity).toBeCloseTo(1);
      expect(results[1].index).toBe(2); // similar
      expect(results[1].similarity).toBeCloseTo(0.8);
      expect(results[2].index).toBe(4); // somewhat similar
    });
  });

  describe('normalizeEmbedding', () => {
    it('should normalize embeddings correctly', () => {
      const embedding = [3, 4, 0];
      const normalized = service.normalizeEmbedding(embedding);

      // Should have magnitude 1
      const magnitude = Math.sqrt(
        normalized.reduce((sum, val) => sum + val * val, 0)
      );
      expect(magnitude).toBeCloseTo(1);

      // Check values
      expect(normalized[0]).toBeCloseTo(0.6);
      expect(normalized[1]).toBeCloseTo(0.8);
      expect(normalized[2]).toBe(0);
    });

    it('should handle zero vector', () => {
      const zero = [0, 0, 0];
      const normalized = service.normalizeEmbedding(zero);
      expect(normalized).toEqual(zero);
    });
  });

  describe('validateEmbedding', () => {
    it('should validate embedding dimensions', () => {
      const validEmbedding = Array(1536).fill(0);
      const invalidEmbedding = Array(1000).fill(0);

      expect(service.validateEmbedding(validEmbedding)).toBe(true);
      expect(service.validateEmbedding(invalidEmbedding)).toBe(false);
    });
  });

  describe('cache management', () => {
    it('should clear cache', async () => {
      const mockEmbedding = Array(1536).fill(0).map(() => Math.random());
      mockCreate.mockResolvedValue({
        data: [{ embedding: mockEmbedding }],
        usage: { total_tokens: 50 }
      });

      const chunk: EnhancedChunk = {
        id: 'test-chunk',
        content: 'Test content',
        enhancedContent: 'Test for cache',
        type: 'section',
        windowContext: {},
        metadata: {
          chunkIndex: 0,
          totalChunks: 1,
          startOffset: 0,
          endOffset: 100,
          tokenCount: 20,
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
      };

      // Generate embedding (cached)
      await service.generateEmbedding(chunk);
      expect(mockCreate).toHaveBeenCalledTimes(1);

      // Clear cache
      service.clearCache();

      // Generate again (should hit API)
      await service.generateEmbedding(chunk);
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });

    it('should provide cache statistics', () => {
      const stats = service.getCacheStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
      expect(stats).toHaveProperty('hitRate');
      expect(stats.size).toBeGreaterThanOrEqual(0);
      expect(stats.maxSize).toBeGreaterThan(0);
    });
  });
});
