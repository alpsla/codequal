import { VectorStorageService } from '../vector-storage.service';
import { EnhancedChunk } from '../types';

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      upsert: jest.fn(),
      select: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      insert: jest.fn()
    })),
    rpc: jest.fn()
  }))
}));

// Mock config
jest.mock('@codequal/core/config/vector-database.config', () => ({
  getVectorConfig: () => ({
    storage: {
      batchSize: 500,
      transactionTimeout: 60000,
      retryAttempts: 3,
      retryDelay: 1000
    }
  })
}));

// Set environment variables
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-key';

describe('VectorStorageService', () => {
  let service: VectorStorageService;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new VectorStorageService();
    mockSupabase = (service as any).supabase;
  });

  describe('storeChunk', () => {
    it('should store a single chunk with embedding', async () => {
      const mockUpsert = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({ upsert: mockUpsert });

      const chunk: EnhancedChunk = {
        id: 'chunk-1',
        content: 'Original content',
        enhancedContent: 'Enhanced content with metadata',
        type: 'section',
        windowContext: {
          before: 'Previous context',
          after: 'Next context'
        },
        metadata: {
          chunkIndex: 0,
          totalChunks: 1,
          startOffset: 0,
          endOffset: 100,
          tokenCount: 20,
          semanticTags: ['test', 'section'],
          codeReferences: {
            files: ['/src/test.ts'],
            functions: ['testFunc'],
            classes: [],
            imports: []
          },
          potentialQuestions: ['What is this?'],
          contextWindow: {
            hasPrevious: false,
            hasNext: false,
            previousTokens: 0,
            nextTokens: 0
          },
          qualityScore: 0.9,
          relevanceScore: 0.8
        }
      };

      const embedding = Array(1536).fill(0).map(() => Math.random());

      await service.storeChunk(
        chunk,
        embedding,
        'repo-123',
        'deepwiki_analysis',
        'analysis-456',
        'permanent'
      );

      expect(mockSupabase.from).toHaveBeenCalledWith('analysis_chunks');
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'chunk-1',
          repository_id: 'repo-123',
          content: 'Enhanced content with metadata',
          embedding,
          source_type: 'deepwiki_analysis',
          source_id: 'analysis-456',
          chunk_index: 0,
          total_chunks: 1,
          storage_type: 'permanent',
          quality_score: 0.8, // From metadata.relevanceScore
          relevance_score: 0.8,
          metadata: expect.objectContaining({
            qualityScore: 0.9,
            relevanceScore: 0.8,
            chunkIndex: 0,
            totalChunks: 1
          })
        }),
        { onConflict: 'id' }
      );
    });

    it('should set TTL for cached storage', async () => {
      const mockUpsert = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({ upsert: mockUpsert });

      const chunk: EnhancedChunk = {
        id: 'chunk-1',
        content: 'Test content',
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
      };

      const embedding = Array(1536).fill(0);

      await service.storeChunk(
        chunk,
        embedding,
        'repo-123',
        'test',
        'test-123',
        'cached'
      );

      const calledWith = mockUpsert.mock.calls[0][0];
      expect(calledWith.ttl).toBeDefined();
      
      // Check TTL is approximately 1 week from now
      const ttlDate = new Date(calledWith.ttl);
      const expectedTtl = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const diff = Math.abs(ttlDate.getTime() - expectedTtl.getTime());
      expect(diff).toBeLessThan(5000); // Within 5 seconds
    });

    it('should throw error on storage failure', async () => {
      const mockUpsert = jest.fn().mockResolvedValue({ 
        error: { message: 'Storage failed' } 
      });
      mockSupabase.from.mockReturnValue({ upsert: mockUpsert });

      const chunk: EnhancedChunk = {
        id: 'chunk-1',
        content: 'Test content',
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
      };

      const embedding = Array(1536).fill(0);

      await expect(
        service.storeChunk(chunk, embedding, 'repo-123', 'test', 'test-123')
      ).rejects.toThrow('Failed to store chunk: Storage failed');
    });
  });

  describe('storeChunks', () => {
    it('should store multiple chunks in batches', async () => {
      const mockUpsert = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({ upsert: mockUpsert });

      const chunks: EnhancedChunk[] = Array(3).fill(null).map((_, i) => ({
        id: `chunk-${i}`,
        content: `Content ${i}`,
        enhancedContent: `Enhanced content ${i}`,
        type: 'item',
        windowContext: {},
        metadata: {
          chunkIndex: i,
          totalChunks: 3,
          startOffset: i * 100,
          endOffset: (i + 1) * 100,
          tokenCount: 20,
          semanticTags: [],
          codeReferences: { files: [], functions: [], classes: [], imports: [] },
          potentialQuestions: [],
          contextWindow: {
            hasPrevious: i > 0,
            hasNext: i < 2,
            previousTokens: i > 0 ? 10 : 0,
            nextTokens: i < 2 ? 10 : 0
          }
        }
      }));

      const embeddings = chunks.map(() => Array(1536).fill(0).map(() => Math.random()));

      const result = await service.storeChunks(
        chunks,
        embeddings,
        'repo-123',
        'test',
        'test-123',
        'cached'
      );

      expect(result.stored).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockUpsert).toHaveBeenCalledTimes(1); // All in one batch
    });

    it('should handle batch size limits', async () => {
      const mockUpsert = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({ upsert: mockUpsert });

      // Create 600 chunks (more than batch size of 500)
      const chunks: EnhancedChunk[] = Array(600).fill(null).map((_, i) => ({
        id: `chunk-${i}`,
        content: `Content ${i}`,
        type: 'item',
        windowContext: {},
        metadata: {
          chunkIndex: i,
          totalChunks: 600,
          startOffset: i * 100,
          endOffset: (i + 1) * 100,
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
      }));

      const embeddings = chunks.map(() => Array(1536).fill(0));

      await service.storeChunks(
        chunks,
        embeddings,
        'repo-123',
        'test',
        'test-123',
        'cached'
      );

      expect(mockUpsert).toHaveBeenCalledTimes(2); // 500 + 100
    });

    it('should handle partial failures', async () => {
      const mockUpsert = jest.fn()
        .mockResolvedValueOnce({ error: null })
        .mockResolvedValueOnce({ error: { message: 'Batch 2 failed' } });
      
      mockSupabase.from.mockReturnValue({ upsert: mockUpsert });

      // Create 600 chunks to trigger 2 batches
      const chunks: EnhancedChunk[] = Array(600).fill(null).map((_, i) => ({
        id: `chunk-${i}`,
        content: `Content ${i}`,
        type: 'item',
        windowContext: {},
        metadata: {
          chunkIndex: i,
          totalChunks: 600,
          startOffset: i * 100,
          endOffset: (i + 1) * 100,
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
      }));

      const embeddings = chunks.map(() => Array(1536).fill(0));

      const result = await service.storeChunks(
        chunks,
        embeddings,
        'repo-123',
        'test',
        'test-123',
        'cached'
      );

      expect(result.stored).toBe(500); // First batch succeeded
      expect(result.failed).toBe(100); // Second batch failed
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Batch 2 failed');
    });
  });

  // searchSimilar tests removed - functionality moved to UnifiedSearchService
  // @deprecated Use UnifiedSearchService.search() instead

  describe('getChunksBySource', () => {
    it('should retrieve chunks by source', async () => {
      const mockChunks = [
        { id: 'chunk-1', chunk_index: 0 },
        { id: 'chunk-2', chunk_index: 1 },
        { id: 'chunk-3', chunk_index: 2 }
      ];

      const mockOrder = jest.fn().mockResolvedValue({
        data: mockChunks,
        error: null
      });

      const mockEq = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: mockOrder
          })
        })
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: mockEq
        })
      });

      const results = await service.getChunksBySource(
        'deepwiki_analysis',
        'analysis-123',
        'repo-456'
      );

      expect(mockOrder).toHaveBeenCalledWith('chunk_index', { ascending: true });
      expect(results).toEqual(mockChunks);
    });
  });

  describe('cleanExpiredChunks', () => {
    it('should delete expired chunks', async () => {
      const mockSelect = jest.fn().mockResolvedValue({
        data: [{ id: 'chunk-1' }, { id: 'chunk-2' }],
        error: null
      });

      const mockNot = jest.fn().mockReturnValue({
        select: mockSelect
      });

      const mockLt = jest.fn().mockReturnValue({
        not: mockNot
      });

      const mockDelete = jest.fn().mockReturnValue({
        lt: mockLt
      });

      mockSupabase.from.mockReturnValue({
        delete: mockDelete
      });

      const count = await service.cleanExpiredChunks();

      expect(mockLt).toHaveBeenCalledWith('ttl', expect.any(String));
      expect(mockNot).toHaveBeenCalledWith('ttl', 'is', null);
      expect(count).toBe(2);
    });
  });

  describe('getStorageStats', () => {
    it('should return storage statistics', async () => {
      // Mock total count
      const mockHead = jest.fn().mockResolvedValue({
        count: 100,
        error: null
      });

      const mockEq = jest.fn().mockReturnValue({
        data: null,
        count: 100,
        error: null
      });

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: mockEq
        })
      });

      // Mock type data
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [
              { type: 'section' },
              { type: 'section' },
              { type: 'item' },
              { type: 'item' },
              { type: 'item' }
            ],
            error: null
          })
        })
      });

      // Mock source data
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [
              { source_type: 'deepwiki_analysis' },
              { source_type: 'deepwiki_analysis' },
              { source_type: 'repository_analysis' }
            ],
            error: null
          })
        })
      });

      // Mock storage data
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [
              { storage_type: 'permanent' },
              { storage_type: 'cached' },
              { storage_type: 'cached' }
            ],
            error: null
          })
        })
      });

      const stats = await service.getStorageStats('repo-123');

      expect(stats.totalChunks).toBe(100);
      expect(stats.byType).toEqual({
        section: 2,
        item: 3
      });
      expect(stats.bySource).toEqual({
        deepwiki_analysis: 2,
        repository_analysis: 1
      });
      expect(stats.byStorage).toEqual({
        permanent: 1,
        cached: 2
      });
    });
  });

  describe('createRelationship', () => {
    it('should create chunk relationship', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({ insert: mockInsert });

      await service.createRelationship(
        'chunk-1',
        'chunk-2',
        'sequential',
        0.9
      );

      expect(mockInsert).toHaveBeenCalledWith({
        source_chunk_id: 'chunk-1',
        target_chunk_id: 'chunk-2',
        relationship_type: 'sequential',
        strength: 0.9
      });
    });
  });

  describe('getRelatedChunks', () => {
    it('should retrieve related chunks', async () => {
      const mockData = [
        {
          relationship_type: 'sequential',
          strength: 1.0,
          target_chunk: {
            id: 'chunk-2',
            content: 'Next chunk'
          }
        },
        {
          relationship_type: 'similar',
          strength: 0.8,
          target_chunk: {
            id: 'chunk-3',
            content: 'Similar chunk'
          }
        }
      ];

      const mockGte = jest.fn().mockResolvedValue({
        data: mockData,
        error: null
      });

      const mockEq = jest.fn().mockReturnValue({
        gte: mockGte
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect
      });

      const results = await service.getRelatedChunks('chunk-1', undefined, 0.5);

      expect(mockEq).toHaveBeenCalledWith('source_chunk_id', 'chunk-1');
      expect(mockGte).toHaveBeenCalledWith('strength', 0.5);
      
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        chunk: mockData[0].target_chunk,
        relationshipType: 'sequential',
        strength: 1.0
      });
    });
  });
});
