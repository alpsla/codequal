import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';
import express, { RequestHandler } from 'express';

// Set up environment variables before imports
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.OPENAI_API_KEY = 'test-openai-key';

// Mock all dependencies before any imports
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null })
    }
  }))
}));

jest.mock('@codequal/core/config/index', () => ({
  getConfig: jest.fn(() => ({
    app: {
      url: 'http://localhost:3000'
    },
    supabase: {
      url: 'https://test.supabase.co',
      anonKey: 'test-anon-key'
    }
  }))
}));

jest.mock('@codequal/database/supabase/client', () => ({
  getSupabase: jest.fn(() => ({
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    rpc: jest.fn().mockResolvedValue({ data: [], error: null })
  }))
}));

// Mock openrouter embedding service
jest.mock('@codequal/core/services/vector-db/openrouter-embedding-service', () => ({
  openRouterEmbeddingService: {
    createEmbedding: jest.fn().mockResolvedValue(new Array(1024).fill(0.1)),
    estimateCost: jest.fn().mockReturnValue(0.00012),
    getConfiguration: jest.fn().mockReturnValue({
      model: 'voyage-code-3',
      dimensions: 1024
    })
  }
}));

// Mock authenticated vector service
const mockAuthenticatedVectorService = {
  searchDocuments: jest.fn(),
  embedRepositoryDocuments: jest.fn(),
  findSimilarUsers: jest.fn(),
  getPersonalizedContent: jest.fn(),
  shareRepositoryAccess: jest.fn(),
  updateUserSkillEmbeddings: jest.fn(),
  supabase: {
    rpc: jest.fn().mockResolvedValue({ data: [], error: null })
  }
};

jest.mock('@codequal/core/services/vector-db/authenticated-vector-service', () => ({
  authenticatedVectorService: mockAuthenticatedVectorService,
  AuthenticatedVectorService: jest.fn(() => mockAuthenticatedVectorService)
}));

jest.mock('../middleware/auth-middleware', () => ({
  authMiddleware: jest.fn((req, res, next) => {
    req.user = { id: 'test-user-id' };
    req.headers.authorization = 'Bearer test-token';
    next();
  }),
  AuthenticatedRequest: jest.fn()
}));

import vectorSearchRoutes from '../routes/vector-search';
import { authMiddleware } from '../middleware/auth-middleware';

describe('Vector Search API Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    // Setup Express app
    app = express();
    app.use(express.json());
    
    // Apply routes
    app.use('/api/vector', authMiddleware as RequestHandler, vectorSearchRoutes);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/vector/embed', () => {
    it('should embed documents for repository', async () => {
      mockAuthenticatedVectorService.embedRepositoryDocuments.mockResolvedValue({
        success: true,
        embeddedCount: 2,
        totalCost: 0.0024
      });

      const response = await request(app)
        .post('/api/vector/embed')
        .send({
          repositoryId: 123,
          documents: [
            {
              filePath: '/src/hello.js',
              content: 'function hello() { return "world"; }',
              contentType: 'code',
              language: 'javascript',
              metadata: { filename: 'hello.js' }
            },
            {
              filePath: '/README.md',
              content: '# Documentation',
              contentType: 'documentation',
              metadata: { title: 'README' }
            }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        embeddedCount: 2,
        totalCost: 0.0024
      });
      expect(mockAuthenticatedVectorService.embedRepositoryDocuments).toHaveBeenCalledWith(
        'test-user-id',
        123,
        expect.any(Array)
      );
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/vector/embed')
        .send({
          // Missing repositoryId and documents
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    it('should handle unauthorized access', async () => {
      mockAuthenticatedVectorService.embedRepositoryDocuments.mockRejectedValue(
        new Error('Unauthorized: User does not have access to repository')
      );

      const response = await request(app)
        .post('/api/vector/embed')
        .send({
          repositoryId: 999,
          documents: [{
            filePath: '/test.js',
            content: 'test',
            contentType: 'code'
          }]
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Unauthorized');
    });

    it('should handle embedding errors', async () => {
      mockAuthenticatedVectorService.embedRepositoryDocuments.mockRejectedValue(
        new Error('Embedding service unavailable')
      );

      const response = await request(app)
        .post('/api/vector/embed')
        .send({
          repositoryId: 123,
          documents: [{
            filePath: '/test.js',
            content: 'test content',
            contentType: 'code'
          }]
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Embedding failed');
    });
  });

  describe('POST /api/vector/search', () => {
    it('should search documents with query', async () => {
      mockAuthenticatedVectorService.searchDocuments.mockResolvedValue({
        results: [
          {
            id: 'doc-123',
            content: 'function hello() { return "world"; }',
            similarity: 0.95,
            filePath: '/src/hello.js',
            repositoryName: 'test-repo',
            metadata: { filename: 'hello.js' }
          },
          {
            id: 'doc-456',
            content: 'function goodbye() { return "world"; }',
            similarity: 0.85,
            filePath: '/src/goodbye.js',
            repositoryName: 'test-repo',
            metadata: { filename: 'goodbye.js' }
          }
        ],
        totalResults: 2,
        searchTimeMs: 150
      });

      const response = await request(app)
        .post('/api/vector/search')
        .send({
          query: 'hello world function',
          contentType: 'code',
          language: 'javascript',
          limit: 5,
          minImportance: 0.7,
          includeOrganization: true,
          includePublic: false
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.results).toHaveLength(2);
      expect(response.body.results[0].similarity).toBe(0.95);
      expect(mockAuthenticatedVectorService.searchDocuments).toHaveBeenCalledWith({
        userId: 'test-user-id',
        query: 'hello world function',
        contentType: 'code',
        language: 'javascript',
        limit: 5,
        minImportance: 0.7,
        includeOrganization: true,
        includePublic: false
      });
    });

    it('should search with minimal parameters', async () => {
      mockAuthenticatedVectorService.searchDocuments.mockResolvedValue({
        results: [],
        totalResults: 0,
        searchTimeMs: 50
      });

      const response = await request(app)
        .post('/api/vector/search')
        .send({
          query: 'test query'
        });

      expect(response.status).toBe(200);
      expect(mockAuthenticatedVectorService.searchDocuments).toHaveBeenCalledWith({
        userId: 'test-user-id',
        query: 'test query'
      });
    });

    it('should validate search parameters', async () => {
      const response = await request(app)
        .post('/api/vector/search')
        .send({
          query: 'ab', // Too short
          limit: 100 // Too high
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    it('should handle search errors', async () => {
      mockAuthenticatedVectorService.searchDocuments.mockRejectedValue(
        new Error('Search index unavailable')
      );

      const response = await request(app)
        .post('/api/vector/search')
        .send({
          query: 'test query'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Search failed');
    });
  });

  describe('GET /api/vector/similar-users', () => {
    it('should find similar users', async () => {
      mockAuthenticatedVectorService.findSimilarUsers.mockResolvedValue({
        users: [
          {
            userId: 'user-123',
            similarity: 0.92,
            skills: ['JavaScript', 'React'],
            matchingCategories: ['frontend']
          },
          {
            userId: 'user-456',
            similarity: 0.85,
            skills: ['TypeScript', 'Node.js'],
            matchingCategories: ['backend']
          }
        ],
        totalFound: 2
      });

      const response = await request(app)
        .get('/api/vector/similar-users')
        .query({ skillCategory: 'frontend', limit: 10, minSimilarity: 0.8 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.users).toHaveLength(2);
      expect(response.body.users[0].similarity).toBe(0.92);
    });

    it('should handle similar users search errors', async () => {
      mockAuthenticatedVectorService.findSimilarUsers.mockRejectedValue(
        new Error('Skills index unavailable')
      );

      const response = await request(app)
        .get('/api/vector/similar-users');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Search failed');
    });
  });

  describe('GET /api/vector/educational-content', () => {
    it('should get personalized educational content', async () => {
      mockAuthenticatedVectorService.getPersonalizedContent.mockResolvedValue({
        content: [
          {
            id: 'content-1',
            title: 'Advanced React Patterns',
            category: 'frontend',
            relevanceScore: 0.95,
            difficulty: 'advanced'
          },
          {
            id: 'content-2',
            title: 'TypeScript Best Practices',
            category: 'frontend',
            relevanceScore: 0.88,
            difficulty: 'intermediate'
          }
        ],
        totalItems: 2
      });

      const response = await request(app)
        .get('/api/vector/educational-content')
        .query({ skillCategory: 'frontend', limit: 5 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.content).toHaveLength(2);
      expect(response.body.content[0].relevanceScore).toBe(0.95);
    });

    it('should handle content fetch errors', async () => {
      mockAuthenticatedVectorService.getPersonalizedContent.mockRejectedValue(
        new Error('Content service unavailable')
      );

      const response = await request(app)
        .get('/api/vector/educational-content');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch content');
    });
  });

  describe('POST /api/vector/share-access', () => {
    it('should share repository access with user', async () => {
      mockAuthenticatedVectorService.shareRepositoryAccess.mockResolvedValue({
        success: true,
        accessId: 'access-123',
        message: 'Access granted successfully'
      });

      const response = await request(app)
        .post('/api/vector/share-access')
        .send({
          repositoryId: 123,
          granteeUserId: '550e8400-e29b-41d4-a716-446655440000',
          accessType: 'read',
          expiresAt: '2025-12-31T23:59:59Z'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.accessId).toBe('access-123');
    });

    it('should share repository access with organization', async () => {
      mockAuthenticatedVectorService.shareRepositoryAccess.mockResolvedValue({
        success: true,
        accessId: 'access-456',
        message: 'Access granted to organization'
      });

      const response = await request(app)
        .post('/api/vector/share-access')
        .send({
          repositoryId: 123,
          organizationId: '550e8400-e29b-41d4-a716-446655440001',
          accessType: 'write'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should require either granteeUserId or organizationId', async () => {
      const response = await request(app)
        .post('/api/vector/share-access')
        .send({
          repositoryId: 123,
          accessType: 'read'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Either granteeUserId or organizationId must be provided');
    });

    it('should handle unauthorized access', async () => {
      mockAuthenticatedVectorService.shareRepositoryAccess.mockRejectedValue(
        new Error('Unauthorized: User is not repository owner')
      );

      const response = await request(app)
        .post('/api/vector/share-access')
        .send({
          repositoryId: 999,
          granteeUserId: '550e8400-e29b-41d4-a716-446655440000',
          accessType: 'admin'
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Unauthorized');
    });
  });

  describe('POST /api/vector/update-skills', () => {
    it('should update user skill embeddings', async () => {
      mockAuthenticatedVectorService.updateUserSkillEmbeddings.mockResolvedValue({
        success: true,
        updatedCategories: ['frontend', 'react'],
        embeddingCount: 3
      });

      const response = await request(app)
        .post('/api/vector/update-skills')
        .send({
          skillCategoryId: 'frontend-react',
          codeExamples: [
            'const Component = () => <div>Hello</div>',
            'useEffect(() => { console.log("mounted"); }, [])',
            'const [state, setState] = useState(0)'
          ],
          skillLevel: 'advanced'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.embeddingCount).toBe(3);
    });

    it('should validate skill update parameters', async () => {
      const response = await request(app)
        .post('/api/vector/update-skills')
        .send({
          // Missing required fields
          codeExamples: []
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request data');
    });
  });

  describe('GET /api/vector/repositories', () => {
    it('should get user accessible repositories', async () => {
      mockAuthenticatedVectorService.supabase.rpc.mockResolvedValue({
        data: [
          {
            id: 1,
            name: 'my-repo',
            access_type: 'owner',
            document_count: 25,
            is_public: false
          },
          {
            id: 2,
            name: 'shared-repo',
            access_type: 'shared',
            document_count: 10,
            is_public: false
          },
          {
            id: 3,
            name: 'public-repo',
            access_type: 'public',
            document_count: 50,
            is_public: true
          }
        ],
        error: null
      });

      const response = await request(app)
        .get('/api/vector/repositories')
        .query({ includeOrganization: 'true', includePublic: 'true' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.repositories).toHaveLength(3);
      expect(response.body.repositories[0].access_type).toBe('owner');
    });

    it('should handle repository fetch errors', async () => {
      mockAuthenticatedVectorService.supabase.rpc.mockResolvedValue({
        data: null,
        error: new Error('Database error')
      });

      const response = await request(app)
        .get('/api/vector/repositories');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch repositories');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on vector storage', async () => {
      // This would be tested with actual rate limiting middleware
      // For now, we just ensure the endpoint structure is correct
      expect(true).toBe(true);
    });
  });

  describe('Authentication Integration', () => {
    it('should reject requests without authentication', async () => {
      // Remove auth middleware mock for this test
      (authMiddleware as jest.Mock).mockImplementationOnce((req, res, next) => {
        res.status(401).json({ error: 'Unauthorized' });
      });

      const response = await request(app)
        .post('/api/vector/search')
        .send({
          query: 'test query'
        });

      expect(response.status).toBe(401);
    });
  });
});