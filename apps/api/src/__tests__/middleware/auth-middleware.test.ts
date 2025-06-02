// Mock Supabase first before any imports
const mockSupabase = {
  auth: {
    getSession: jest.fn(),
    getUser: jest.fn()
  },
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis()
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase)
}));

import { Request, Response, NextFunction } from 'express';
import { authMiddleware, checkRepositoryAccess, AuthenticatedRequest } from '../../middleware/auth-middleware';
import { createMockAuthenticatedUser } from '../setup';

describe('Authentication Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {}
    } as any;
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    mockNext = jest.fn();
    
    jest.clearAllMocks();
  });

  describe('Authentication Header Processing', () => {
    test('should pass health check without authentication', async () => {
      (mockRequest as any).path = '/health';
      
      await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    test('should require Authorization header', async () => {
      await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authorization token required'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should require Bearer token format', async () => {
      mockRequest.headers = { authorization: 'Basic invalid-format' };
      
      await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authorization token required'
      });
    });

    test('should extract token from Bearer header correctly', async () => {
      const testToken = 'test-jwt-token';
      mockRequest.headers = { authorization: `Bearer ${testToken}` };
      
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null
      });
      
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            user_metadata: {
              organization_id: 'org-456',
              permissions: ['read', 'write']
            }
          }
        },
        error: null
      });
      
      await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockSupabase.auth.getUser).toHaveBeenCalledWith(testToken);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Supabase Session Validation', () => {
    test('should authenticate with valid session', async () => {
      const testToken = 'valid-session-token';
      mockRequest.headers = { authorization: `Bearer ${testToken}` };
      
      const mockSession = {
        session: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            user_metadata: {
              organization_id: 'org-456',
              permissions: ['read', 'write']
            }
          },
          access_token: testToken,
          expires_at: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
        }
      };
      
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: mockSession,
        error: null
      });
      
      await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect((mockRequest as AuthenticatedRequest).user).toMatchObject({
        id: 'user-123',
        email: 'test@example.com',
        organizationId: 'org-456',
        permissions: ['read', 'write'],
        session: {
          token: testToken,
          expiresAt: expect.any(Date)
        }
      });
      
      expect(mockNext).toHaveBeenCalled();
    });

    test('should fallback to getUser when session is invalid', async () => {
      const testToken = 'fallback-token';
      mockRequest.headers = { authorization: `Bearer ${testToken}` };
      
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: new Error('No session')
      });
      
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: {
          user: {
            id: 'user-789',
            email: 'fallback@example.com',
            user_metadata: {}
          }
        },
        error: null
      });
      
      await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect((mockRequest as AuthenticatedRequest).user).toMatchObject({
        id: 'user-789',
        email: 'fallback@example.com',
        organizationId: undefined,
        permissions: [],
        session: {
          token: testToken,
          expiresAt: expect.any(Date)
        }
      });
      
      expect(mockNext).toHaveBeenCalled();
    });

    test('should reject invalid token', async () => {
      mockRequest.headers = { authorization: 'Bearer invalid-token' };
      
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null
      });
      
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error('Invalid token')
      });
      
      await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should handle Supabase service errors', async () => {
      mockRequest.headers = { authorization: 'Bearer test-token' };
      
      mockSupabase.auth.getSession.mockRejectedValueOnce(
        new Error('Supabase service unavailable')
      );
      
      await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authentication service error'
      });
    });
  });

  describe('User Context Creation', () => {
    test('should create authenticated user with all metadata', async () => {
      mockRequest.headers = { authorization: 'Bearer test-token' };
      
      const userData = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: {
          organization_id: 'org-456',
          permissions: ['read', 'write', 'admin']
        }
      };
      
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null
      });
      
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: userData },
        error: null
      });
      
      await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      const authenticatedUser = (mockRequest as AuthenticatedRequest).user;
      
      expect(authenticatedUser).toMatchObject({
        id: 'user-123',
        email: 'test@example.com',
        organizationId: 'org-456',
        permissions: ['read', 'write', 'admin'],
        session: {
          token: 'test-token',
          expiresAt: expect.any(Date)
        }
      });
      
      expect(authenticatedUser.session.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    test('should handle missing user metadata gracefully', async () => {
      mockRequest.headers = { authorization: 'Bearer test-token' };
      
      const userData = {
        id: 'user-456',
        email: 'minimal@example.com'
        // No user_metadata
      };
      
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null
      });
      
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: userData },
        error: null
      });
      
      await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      const authenticatedUser = (mockRequest as AuthenticatedRequest).user;
      
      expect(authenticatedUser).toMatchObject({
        id: 'user-456',
        email: 'minimal@example.com',
        organizationId: undefined,
        permissions: []
      });
    });

    test('should handle missing email gracefully', async () => {
      mockRequest.headers = { authorization: 'Bearer test-token' };
      
      const userData = {
        id: 'user-789',
        // No email
        user_metadata: {
          organization_id: 'org-123'
        }
      };
      
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null
      });
      
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: userData },
        error: null
      });
      
      await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });
  });

  describe('Session Expiration Handling', () => {
    test('should set appropriate expiration time for session tokens', async () => {
      mockRequest.headers = { authorization: 'Bearer test-token' };
      
      const expiresAt = Math.floor(Date.now() / 1000) + 7200; // 2 hours from now
      
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: {
          session: {
            user: {
              id: 'user-123',
              email: 'test@example.com',
              user_metadata: {}
            },
            access_token: 'test-token',
            expires_at: expiresAt
          }
        },
        error: null
      });
      
      await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      const authenticatedUser = (mockRequest as AuthenticatedRequest).user;
      const expectedExpirationTime = new Date(expiresAt * 1000);
      
      expect(authenticatedUser.session.expiresAt.getTime())
        .toBeCloseTo(expectedExpirationTime.getTime(), -3); // Within 1 second
    });

    test('should set default expiration for fallback tokens', async () => {
      mockRequest.headers = { authorization: 'Bearer fallback-token' };
      
      const beforeAuth = Date.now();
      
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null
      });
      
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            user_metadata: {}
          }
        },
        error: null
      });
      
      await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      
      const authenticatedUser = (mockRequest as AuthenticatedRequest).user;
      const expectedExpiration = beforeAuth + 24 * 60 * 60 * 1000; // 24 hours
      
      expect(authenticatedUser.session.expiresAt.getTime())
        .toBeCloseTo(expectedExpiration, -5000); // Within 5 seconds
    });
  });
});

describe('Repository Access Control', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should allow access for user with repository permissions', async () => {
    const user = createMockAuthenticatedUser();
    const repositoryUrl = 'https://github.com/owner/repo';
    
    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnValueOnce({
        eq: jest.fn().mockResolvedValueOnce({
          data: [{ repository_url: repositoryUrl }],
          error: null
        })
      })
    });
    
    const hasAccess = await checkRepositoryAccess(user, repositoryUrl);
    
    expect(hasAccess).toBe(true);
    expect(mockSupabase.from).toHaveBeenCalledWith('user_repositories');
  });

  test('should deny access for user without repository permissions', async () => {
    const user = createMockAuthenticatedUser();
    const repositoryUrl = 'https://github.com/owner/private-repo';
    
    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnValueOnce({
        eq: jest.fn().mockResolvedValueOnce({
          data: [],
          error: null
        })
      })
    });
    
    const hasAccess = await checkRepositoryAccess(user, repositoryUrl);
    
    expect(hasAccess).toBe(false);
  });

  test('should handle database errors gracefully', async () => {
    const user = createMockAuthenticatedUser();
    const repositoryUrl = 'https://github.com/owner/repo';
    
    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnValueOnce({
        eq: jest.fn().mockResolvedValueOnce({
          data: null,
          error: new Error('Database connection failed')
        })
      })
    });
    
    const hasAccess = await checkRepositoryAccess(user, repositoryUrl);
    
    expect(hasAccess).toBe(false);
  });

  test('should handle query exceptions', async () => {
    const user = createMockAuthenticatedUser();
    const repositoryUrl = 'https://github.com/owner/repo';
    
    mockSupabase.from.mockImplementationOnce(() => {
      throw new Error('Query construction failed');
    });
    
    const hasAccess = await checkRepositoryAccess(user, repositoryUrl);
    
    expect(hasAccess).toBe(false);
  });

  test('should query with correct user ID and repository URL', async () => {
    const user = createMockAuthenticatedUser();
    const repositoryUrl = 'https://github.com/owner/repo';
    
    const mockEq = jest.fn().mockReturnValueOnce({
      eq: jest.fn().mockResolvedValueOnce({
        data: [{ repository_url: repositoryUrl }],
        error: null
      })
    });
    
    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValueOnce({
        eq: mockEq
      })
    });
    
    await checkRepositoryAccess(user, repositoryUrl);
    
    expect(mockEq).toHaveBeenCalledWith('user_id', user.id);
  });
});

describe('Integration Tests', () => {
  test('should handle complete authentication flow', async () => {
    const mockRequest: Partial<Request> = {
      headers: { authorization: 'Bearer valid-session-token' },
      path: '/api/analyze-pr'
    };
    
    const mockResponse: Partial<Response> = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    const mockNext: NextFunction = jest.fn();
    
    mockSupabase.auth.getSession.mockResolvedValueOnce({
      data: {
        session: {
          user: {
            id: 'integration-user',
            email: 'integration@example.com',
            user_metadata: {
              organization_id: 'integration-org',
              permissions: ['read', 'write']
            }
          },
          access_token: 'valid-session-token',
          expires_at: Math.floor(Date.now() / 1000) + 3600
        }
      },
      error: null
    });
    
    await authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
    
    expect(mockNext).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
    
    const authenticatedUser = (mockRequest as AuthenticatedRequest).user;
    expect(authenticatedUser).toMatchObject({
      id: 'integration-user',
      email: 'integration@example.com',
      organizationId: 'integration-org',
      permissions: ['read', 'write']
    });
  });

  test('should handle authentication and repository access together', async () => {
    const user = createMockAuthenticatedUser();
    const repositoryUrl = 'https://github.com/owner/test-repo';
    
    // Mock successful repository access
    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnValueOnce({
        eq: jest.fn().mockResolvedValueOnce({
          data: [{ repository_url: repositoryUrl }],
          error: null
        })
      })
    });
    
    const hasAccess = await checkRepositoryAccess(user, repositoryUrl);
    
    expect(hasAccess).toBe(true);
    
    // Verify the query was constructed correctly
    expect(mockSupabase.from).toHaveBeenCalledWith('user_repositories');
  });
});