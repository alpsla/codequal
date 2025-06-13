import { SelectiveRAGService } from '../selective-rag-service';
import { QueryType, DifficultyLevel } from '../query-analyzer';

// Mock the embedding service
const mockEmbeddingService = {
  generateEmbedding: jest.fn().mockResolvedValue([0.1, 0.2, 0.3])
};

// Mock Supabase
const mockSupabase = {
  rpc: jest.fn(),
  from: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis()
};

describe('SelectiveRAGService', () => {
  let ragService: SelectiveRAGService;

  beforeEach(() => {
    ragService = new SelectiveRAGService(mockEmbeddingService, mockSupabase);
    jest.clearAllMocks();
  });

  describe('search', () => {
    it('should perform basic search successfully', async () => {
      // Mock document search results
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [
          {
            id: 1,
            repository_id: 1,
            file_path: 'src/auth.ts',
            content_chunk: 'function authenticate(token: string) { ... }',
            content_type: 'code',
            content_language: 'typescript',
            importance_score: 0.8,
            similarity: 0.9,
            metadata: {},
            framework_references: ['express'],
            updated_at: new Date().toISOString()
          }
        ],
        error: null
      });

      // Mock educational content search results  
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [
          {
            id: 1,
            title: 'JWT Authentication Guide',
            content: 'How to implement JWT authentication...',
            content_type: 'tutorial',
            programming_language: 'typescript',
            difficulty_level: 'intermediate',
            frameworks: ['express', 'node'],
            quality_score: 0.9,
            similarity: 0.85
          }
        ],
        error: null
      });

      // Mock query logging
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null })
      });

      const result = await ragService.search(
        'how to implement JWT authentication in Express',
        { skillLevel: DifficultyLevel.INTERMEDIATE },
        { repositoryId: 1, primaryLanguage: 'TypeScript' },
        { includeEducationalContent: true }
      );

      expect(result).toBeDefined();
      expect(result.query.queryType).toBe(QueryType.CODE_SEARCH);
      expect(result.documentResults).toHaveLength(1);
      expect(result.educationalResults).toHaveLength(1);
      expect(result.totalResults).toBe(2);
      expect(result.searchDurationMs).toBeGreaterThan(0);
    });

    it('should handle search with no results', async () => {
      // Mock document search returning no results
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [],
        error: null
      });
      
      // Mock educational search returning no results  
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [],
        error: null
      });

      const result = await ragService.search('very specific query with no matches');

      expect(result.documentResults).toHaveLength(0);
      expect(result.educationalResults).toHaveLength(0);
      expect(result.totalResults).toBe(0);
      expect(result.searchInsights?.missingContext).toBeDefined();
    });

    it('should filter by repository context', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null
      });

      const repositoryContext = {
        repositoryId: 123,
        primaryLanguage: 'Python',
        frameworkStack: ['django', 'postgresql']
      };

      await ragService.search(
        'database queries',
        undefined,
        repositoryContext
      );

      // Verify that repository filter was applied
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'rag_search_documents',
        expect.objectContaining({
          repository_filter: 123,
          language_filter: 'sql'  // The implementation maps 'Python' to 'sql' for content detection
        })
      );
    });

    it('should include educational content for example requests', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null
      });

      await ragService.search('show me an example of React hooks');

      // Should call both document and educational search
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'rag_search_documents',
        expect.any(Object)
      );
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'rag_search_educational_content',
        expect.any(Object)
      );
    });

    it('should exclude educational content when not needed', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [],
        error: null
      });

      await ragService.search(
        'specific function in my codebase',
        undefined,
        undefined,
        { includeEducationalContent: false }
      );

      // Should only call document search
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(1);
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'rag_search_documents',
        expect.any(Object)
      );
    });

    it('should apply custom search options', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null
      });

      const options = {
        maxResults: 5,
        similarityThreshold: 0.8,
        boost: {
          importanceWeight: 0.4,
          recencyWeight: 0.2,
          frameworkWeight: 0.3
        }
      };

      await ragService.search('test query', undefined, undefined, options);

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'rag_search_documents',
        expect.objectContaining({
          match_threshold: 0.8,
          match_count: 10 // maxResults * 2 for re-ranking
        })
      );
    });

    it('should re-rank results by relevance', async () => {
      const mockResults = [
        {
          id: 1,
          repository_id: 1,
          file_path: 'low-importance.ts',
          content_chunk: 'some content',
          content_type: 'code',
          content_language: 'typescript',
          importance_score: 0.2,
          similarity: 0.7,
          metadata: {},
          framework_references: [],
          updated_at: new Date().toISOString()
        },
        {
          id: 2,
          repository_id: 1,
          file_path: 'high-importance.ts',
          content_chunk: 'important content',
          content_type: 'code',
          content_language: 'typescript',
          importance_score: 0.9,
          similarity: 0.8,
          metadata: {},
          framework_references: ['react'],
          updated_at: new Date().toISOString()
        }
      ];

      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockResults,
        error: null
      });

      const result = await ragService.search('React components');

      // High importance + framework match should rank higher
      expect(result.documentResults[0].importanceScore).toBeGreaterThan(
        result.documentResults[1]?.importanceScore || 0
      );
    });

    it('should generate search insights for low-confidence queries', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null
      });

      const result = await ragService.search('help'); // Very vague query

      expect(result.searchInsights).toBeDefined();
      expect(result.searchInsights?.suggestedRefinements).toBeDefined();
      expect(result.searchInsights?.missingContext).toBeDefined();
    });

    it('should suggest alternative queries when few results found', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [
          {
            id: 1,
            repository_id: 1,
            file_path: 'test.ts',
            content_chunk: 'minimal content',
            content_type: 'code',
            importance_score: 0.5,
            similarity: 0.7,
            metadata: {}
          }
        ],
        error: null
      });

      const result = await ragService.search('obscure technical term');

      expect(result.searchInsights?.alternativeQueries).toBeDefined();
      expect(result.searchInsights?.alternativeQueries?.length).toBeGreaterThan(0);
    });

    it('should handle database errors gracefully', async () => {
      // Mock complete database failure (throw exception)
      mockSupabase.rpc.mockRejectedValue(new Error('Database connection failed'));

      const result = await ragService.search('test query');

      expect(result.documentResults).toHaveLength(0);
      expect(result.totalResults).toBe(0);
      // When database fails, service still provides normal insights about missing context
      expect(result.searchInsights?.missingContext).toBeDefined();
    });

    it('should log query patterns for learning', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null
      });

      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        insert: mockInsert
      });

      await ragService.search('React hooks tutorial');

      expect(mockSupabase.from).toHaveBeenCalledWith('rag_query_patterns');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          query_text: 'React hooks tutorial',
          query_type: expect.any(String),
          was_successful: expect.any(Boolean),
          search_duration_ms: expect.any(Number)
        })
      );
    });

    it('should handle embedding service errors', async () => {
      mockEmbeddingService.generateEmbedding.mockRejectedValueOnce(
        new Error('Embedding service unavailable')
      );

      const result = await ragService.search('test query');

      expect(result.documentResults).toHaveLength(0);
      expect(result.totalResults).toBe(0);
      expect(result.searchInsights?.missingContext).toContain('Search failed due to technical error. Please try again.');
    });

    it('should filter content types correctly', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null
      });

      await ragService.search('configuration file setup');

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'rag_search_documents',
        expect.objectContaining({
          content_type_filter: 'config'
        })
      );
    });

    it('should adjust minimum importance based on query confidence', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null
      });

      // High-confidence specific query
      await ragService.search('TypeScript React useEffect dependency array optimization');

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'rag_search_documents',
        expect.objectContaining({
          min_importance: expect.any(Number)
        })
      );

      const callArgs = mockSupabase.rpc.mock.calls[0][1];
      expect(callArgs.min_importance).toBeGreaterThan(0.1);
    });
  });

  describe('error handling', () => {
    it('should return empty results on complete failure', async () => {
      mockSupabase.rpc.mockRejectedValue(new Error('Complete system failure'));

      const result = await ragService.search('test query');

      expect(result).toBeDefined();
      expect(result.documentResults).toHaveLength(0);
      expect(result.educationalResults).toHaveLength(0);
      expect(result.totalResults).toBe(0);
      expect(result.searchInsights?.missingContext).toBeDefined();
    });

    it('should continue with document search if educational search fails', async () => {
      // Mock document search to succeed
      mockSupabase.rpc
        .mockResolvedValueOnce({
          data: [{
            id: 1,
            repository_id: 1,
            file_path: 'test.ts',
            content_chunk: 'test content',
            content_type: 'code',
            content_language: 'typescript',
            importance_score: 0.5,
            similarity: 0.8,
            metadata: {},
            framework_references: [],
            updated_at: new Date().toISOString()
          }],
          error: null
        })
        .mockRejectedValueOnce(new Error('Educational search failed'));

      const result = await ragService.search('example query');

      expect(result.documentResults).toHaveLength(1);
      expect(result.educationalResults).toHaveLength(0);
    });
  });
});