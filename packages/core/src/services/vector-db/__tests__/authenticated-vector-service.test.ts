import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Set up environment variables before imports
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.OPENAI_API_KEY = 'test-openai-key';

// Mock logger before any imports
jest.mock('../../../utils/logger', () => ({
  createLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }))
}));

// Mock embedding config
jest.mock('../../../config/embedding-models', () => ({
  getEmbeddingConfig: jest.fn(() => ({
    defaultModel: 'openai-3-small',
    codeModel: 'voyage-code-3',
    documentModel: 'text-embedding-3-large',
    fallbackModel: 'openai-3-small'
  })),
  getModelForContent: jest.fn((contentType: string) => {
    if (contentType === 'code') return 'voyage-code-3';
    if (contentType === 'documentation') return 'text-embedding-3-large';
    return 'openai-3-small';
  }),
  EMBEDDING_MODELS: {
    'openai-3-small': {
      provider: 'openai',
      modelName: 'text-embedding-3-small',
      dimensions: 512,
      maxTokens: 8191,
      apiKeyEnvVar: 'OPENAI_API_KEY',
      description: 'OpenAI\'s small, efficient embedding model',
      costPer1kTokens: 0.00002,
      lastUpdated: '2024-01-25'
    },
    'voyage-code-3': {
      provider: 'voyage',
      modelName: 'voyage-code-3',
      dimensions: 1024,
      maxTokens: 16000,
      apiKeyEnvVar: 'VOYAGE_API_KEY',
      description: 'Optimized for code embeddings',
      costPer1kTokens: 0.00012,
      lastUpdated: '2024-10-01'
    },
    'text-embedding-3-large': {
      provider: 'openai',
      modelName: 'text-embedding-3-large',
      dimensions: 1536,
      maxTokens: 8191,
      apiKeyEnvVar: 'OPENAI_API_KEY',
      description: 'OpenAI\'s large embedding model',
      costPer1kTokens: 0.00013,
      lastUpdated: '2024-01-25'
    }
  }
}));

// Mock dependencies before imports
jest.mock('@supabase/supabase-js');
jest.mock('../openrouter-embedding-service');

// Create mock supabase client
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null })
  },
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  upsert: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  rpc: jest.fn().mockResolvedValue({ data: [], error: null })
};

jest.mock('@codequal/database/supabase/client', () => ({
  getSupabase: jest.fn(() => mockSupabaseClient)
}));

import { AuthenticatedVectorService } from '../authenticated-vector-service';
import { openRouterEmbeddingService } from '../openrouter-embedding-service';

describe('AuthenticatedVectorService', () => {
  let service: AuthenticatedVectorService;
  const mockUser = { id: 'user-123', email: 'test@example.com' };
  
  beforeEach(() => {
    // Clear mocks
    jest.clearAllMocks();
    
    // Reset mock implementations for this test
    mockSupabaseClient.auth.getUser.mockResolvedValue({ 
      data: { user: mockUser }, 
      error: null 
    });
    
    // Mock embedding service
    (openRouterEmbeddingService.createEmbedding as jest.Mock).mockResolvedValue(
      new Array(1024).fill(0.1)
    );
    (openRouterEmbeddingService.estimateCost as jest.Mock).mockReturnValue(0.00012);
    
    // Create service instance
    service = new AuthenticatedVectorService();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('Document Search', () => {
    it('should search documents with user access control', async () => {
      const mockResults = [
        {
          id: 'doc-1',
          content: 'matching content',
          similarity: 0.95,
          metadata: { filename: 'test.js' }
        }
      ];
      
      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockResults,
        error: null
      });
      
      const result = await service.searchDocuments({
        userId: 'user-123',
        query: 'search query',
        contentType: 'code',
        limit: 5
      });
      
      expect(openRouterEmbeddingService.createEmbedding).toHaveBeenCalledWith(
        'search query',
        { contentType: 'code' }
      );
      
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'rag_search_user_documents',
        expect.objectContaining({
          p_user_id: 'user-123',
          query_embedding: expect.any(Array),
          match_count: 5
        })
      );
      
      expect(result.results).toHaveLength(1);
      expect(result.results[0].similarity).toBe(0.95);
    });
    
    it('should filter search by content type and repository', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: [],
        error: null
      });
      
      await service.searchDocuments({
        userId: 'user-123',
        query: 'search query',
        repositoryId: 42,
        contentType: 'documentation',
        minImportance: 0.8
      });
      
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'rag_search_user_documents',
        expect.objectContaining({
          repository_filter: 42,
          content_type_filter: 'documentation',
          min_importance: 0.8
        })
      );
    });
    
    it('should handle search errors', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: new Error('Search failed')
      });
      
      await expect(service.searchDocuments({
        userId: 'user-123',
        query: 'search query'
      })).rejects.toThrow('Search failed');
    });
  });
  
  describe('Document Embedding', () => {
    beforeEach(() => {
      // Mock repository access check
      mockSupabaseClient.rpc.mockImplementation((fnName: string, params: any) => {
        if (fnName === 'user_has_repository_access') {
          return Promise.resolve({ data: true, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });
    });
    
    it('should embed repository documents with proper access check', async () => {
      mockSupabaseClient.from().insert.mockResolvedValue({
        data: null,
        error: null
      });
      
      const documents = [
        {
          filePath: 'src/index.js',
          content: 'function test() { return true; }',
          contentType: 'code',
          language: 'javascript'
        }
      ];
      
      const result = await service.embedRepositoryDocuments(
        'user-123',
        42,
        documents
      );
      
      // Check access was verified
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'user_has_repository_access',
        {
          p_user_id: 'user-123',
          p_repository_id: 42,
          p_required_access: 'write'
        }
      );
      
      // Check embedding was created
      expect(openRouterEmbeddingService.createEmbedding).toHaveBeenCalledWith(
        'function test() { return true; }',
        { contentType: 'code' }
      );
      
      // Check data was inserted
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('rag_document_embeddings');
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          repository_id: 42,
          file_path: 'src/index.js',
          content_type: 'code',
          content_language: 'javascript',
          embedding: expect.any(Array),
          indexed_by_user_id: 'user-123'
        })
      ]);
      
      expect(result.success).toBe(true);
      expect(result.documentsProcessed).toBe(1);
    });
    
    it('should reject embedding without write access', async () => {
      mockSupabaseClient.rpc.mockImplementation((fnName: string) => {
        if (fnName === 'user_has_repository_access') {
          return Promise.resolve({ data: false, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });
      
      await expect(service.embedRepositoryDocuments(
        'user-123',
        42,
        []
      )).rejects.toThrow('Unauthorized: No write access to repository');
    });
    
    it('should split long documents into chunks', async () => {
      mockSupabaseClient.from().insert.mockResolvedValue({
        data: null,
        error: null
      });
      
      const longContent = 'a'.repeat(2000); // Long content that needs splitting
      const documents = [{
        filePath: 'large.txt',
        content: longContent,
        contentType: 'documentation'
      }];
      
      const result = await service.embedRepositoryDocuments(
        'user-123',
        42,
        documents
      );
      
      // Should create multiple embeddings for chunks
      expect(openRouterEmbeddingService.createEmbedding).toHaveBeenCalledTimes(2);
      expect(result.embeddingsCreated).toBeGreaterThan(1);
    });
  });
  
  describe('Skill Management', () => {
    it('should find users with similar skills', async () => {
      const mockUsers = [
        {
          user_id: 'user-456',
          similarity_score: 0.85,
          skill_level: 7
        }
      ];
      
      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockUsers,
        error: null
      });
      
      const result = await service.findSimilarUsers({
        userId: 'user-123',
        skillCategory: 'javascript',
        minSimilarity: 0.7,
        limit: 5
      });
      
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'find_similar_skilled_users',
        {
          p_user_id: 'user-123',
          p_skill_category: 'javascript',
          p_min_similarity: 0.7,
          p_limit: 5
        }
      );
      
      expect(result.users).toHaveLength(1);
      expect(result.users[0].similarity_score).toBe(0.85);
    });
    
    it('should update user skill embeddings', async () => {
      mockSupabaseClient.from().upsert.mockResolvedValue({
        data: null,
        error: null
      });
      
      const codeExamples = [
        'const x = 5;',
        'function add(a, b) { return a + b; }'
      ];
      
      const result = await service.updateUserSkillEmbeddings(
        'user-123',
        'skill-js',
        codeExamples,
        6
      );
      
      // Check embeddings were created for both code and learning path
      expect(openRouterEmbeddingService.createEmbedding).toHaveBeenCalledTimes(2);
      
      // Check skill embedding was upserted
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_skill_embeddings');
      expect(mockSupabaseClient.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          skill_category_id: 'skill-js',
          skill_level: 6,
          evidence_count: 2
        }),
        { onConflict: 'user_id,skill_category_id' }
      );
      
      expect(result.success).toBe(true);
    });
  });
  
  describe('Educational Content', () => {
    it('should get personalized educational content', async () => {
      const mockContent = [
        {
          content_id: 'edu-1',
          title: 'Advanced JavaScript',
          relevance_score: 0.9
        }
      ];
      
      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockContent,
        error: null
      });
      
      const result = await service.getPersonalizedContent({
        userId: 'user-123',
        skillCategory: 'javascript',
        limit: 3
      });
      
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'get_personalized_educational_content',
        {
          p_user_id: 'user-123',
          p_skill_category: 'javascript',
          p_limit: 3
        }
      );
      
      expect(result.content).toHaveLength(1);
      expect(result.content[0].title).toBe('Advanced JavaScript');
    });
  });
  
  describe('Repository Access Sharing', () => {
    beforeEach(() => {
      // Default to granting admin access for tests
      mockSupabaseClient.rpc.mockImplementation((fnName: string, params: any) => {
        if (fnName === 'user_has_repository_access') {
          return Promise.resolve({ data: true, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });
    });
    
    it('should share repository access with another user', async () => {
      mockSupabaseClient.from().insert.mockResolvedValue({
        data: null,
        error: null
      });
      
      const result = await service.shareRepositoryAccess(
        'user-123',
        42,
        'user-456',
        null,
        'read',
        new Date('2025-12-31')
      );
      
      // Check admin access was verified
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'user_has_repository_access',
        {
          p_user_id: 'user-123',
          p_repository_id: 42,
          p_required_access: 'admin'
        }
      );
      
      // Check access was granted
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('rag_repository_access');
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith({
        repository_id: 42,
        user_id: 'user-456',
        organization_id: null,
        access_type: 'read',
        granted_by: 'user-123',
        expires_at: new Date('2025-12-31')
      });
      
      expect(result.success).toBe(true);
    });
    
    it('should reject sharing without admin access', async () => {
      mockSupabaseClient.rpc.mockImplementation((fnName: string) => {
        if (fnName === 'user_has_repository_access') {
          return Promise.resolve({ data: false, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });
      
      await expect(service.shareRepositoryAccess(
        'user-123',
        42,
        'user-456',
        null,
        'read'
      )).rejects.toThrow('Unauthorized: No admin access to repository');
    });
  });
  
  describe('Error Recovery', () => {
    it('should handle embedding service failures gracefully', async () => {
      (openRouterEmbeddingService.createEmbedding as jest.Mock).mockRejectedValue(
        new Error('Embedding service unavailable')
      );
      
      await expect(service.searchDocuments({
        userId: 'user-123',
        query: 'test query'
      })).rejects.toThrow('Embedding service unavailable');
    });
    
    it('should log vector access even on failure', async () => {
      // Make the main operation fail but access log succeed
      mockSupabaseClient.rpc.mockImplementation((fnName: string) => {
        if (fnName === 'rag_search_user_documents') {
          return Promise.resolve({ data: null, error: new Error('Search error') });
        }
        return Promise.resolve({ data: null, error: null });
      });
      
      mockSupabaseClient.from().insert.mockResolvedValue({
        data: null,
        error: null
      });
      
      try {
        await service.searchDocuments({
          userId: 'user-123',
          query: 'test'
        });
      } catch (error) {
        // Expected to throw
      }
      
      // The service should have attempted to log despite the error
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('vector_db_access_log');
    });
  });
});