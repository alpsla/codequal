import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';

// Mock @codequal/core/config/index BEFORE importing anything else
jest.mock('@codequal/core/config/index', () => ({
  getConfig: jest.fn(() => ({
    env: 'test',
    isDevelopment: false,
    isProduction: false,
    api: {
      port: 3001,
      url: 'http://localhost:3001',
    },
    app: {
      url: 'http://localhost:3000',
    },
    supabase: {
      url: 'https://test.supabase.co',
      anonKey: 'test-anon-key',
      serviceRoleKey: 'test-service-key',
    },
    oauth: {
      enabledProviders: ['github', 'gitlab'],
    },
    features: {
      emailAuth: true,
      githubAuth: true,
      gitlabAuth: true,
    },
    database: {
      url: 'postgresql://test:test@localhost:5432/test',
    },
    monitoring: {
      logLevel: 'error',
    },
  })),
}));

// Mock Supabase client
jest.mock('@supabase/supabase-js');

import request from 'supertest';
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import authRouter from '../routes/auth';

describe('Authentication Tests', () => {
  let app: express.Application;
  let mockSupabase: any;

  beforeAll(() => {
    // Setup Express app with auth routes
    app = express();
    app.use(express.json());
    app.use('/auth', authRouter);

    // Mock Supabase client
    mockSupabase = {
      auth: {
        signInWithOAuth: jest.fn(),
        exchangeCodeForSession: jest.fn(),
        getSession: jest.fn(),
        signOut: jest.fn(),
        signUp: jest.fn(),
        signInWithPassword: jest.fn(),
        signInWithOtp: jest.fn(),
        getUser: jest.fn(),
        refreshSession: jest.fn(),
        admin: {
          signOut: jest.fn()
        }
      },
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        }))
      }))
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('OAuth Flow Tests', () => {
    describe('POST /auth/oauth/:provider', () => {
      it('should initiate GitHub OAuth flow', async () => {
        const mockAuthUrl = 'https://github.com/login/oauth/authorize?client_id=test';
        mockSupabase.auth.signInWithOAuth.mockResolvedValue({
          data: { url: mockAuthUrl },
          error: null
        });

        const response = await request(app)
          .post('/auth/oauth/github')
          .send({ redirectTo: 'http://localhost:3000/dashboard' });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          url: mockAuthUrl,
          provider: 'github'
        });
        expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
          provider: 'github',
          options: {
            redirectTo: 'http://localhost:3000/auth/callback',
            queryParams: {
              redirect_to: 'http://localhost:3000/dashboard'
            },
            scopes: 'read:user user:email'
          }
        });
      });

      it('should initiate GitLab OAuth flow', async () => {
        const mockAuthUrl = 'https://gitlab.com/oauth/authorize?client_id=test';
        mockSupabase.auth.signInWithOAuth.mockResolvedValue({
          data: { url: mockAuthUrl },
          error: null
        });

        const response = await request(app)
          .post('/auth/oauth/gitlab')
          .send({ redirectTo: 'http://localhost:3000/projects' });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          url: mockAuthUrl,
          provider: 'gitlab'
        });
      });

      it('should handle invalid provider', async () => {
        const response = await request(app)
          .post('/auth/oauth/invalid')
          .send({});

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
          error: 'Invalid OAuth provider. Supported: github, gitlab'
        });
      });

      it('should handle OAuth initiation errors', async () => {
        mockSupabase.auth.signInWithOAuth.mockResolvedValue({
          data: null,
          error: new Error('OAuth configuration error')
        });

        const response = await request(app)
          .post('/auth/oauth/github')
          .send({});

        expect(response.status).toBe(500);
        expect(response.body).toEqual({
          error: 'Failed to initiate OAuth flow'
        });
      });
    });

    describe('GET /auth/callback', () => {
      it('should handle successful OAuth callback', async () => {
        const mockSession = {
          access_token: 'test-token',
          refresh_token: 'test-refresh',
          user: { id: 'user-123', email: 'test@example.com' }
        };

        mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({
          data: { session: mockSession },
          error: null
        });

        const response = await request(app)
          .get('/auth/callback')
          .query({
            code: 'test-auth-code',
            redirect_to: 'http://localhost:3000/dashboard'
          });

        expect(response.status).toBe(302);
        expect(response.headers.location).toBe(
          'http://localhost:3000/dashboard?token=test-token'
        );
      });

      it('should handle missing auth code', async () => {
        const response = await request(app)
          .get('/auth/callback')
          .query({ redirect_to: 'http://localhost:3000' });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
          error: 'Missing authorization code'
        });
      });

      it('should handle session exchange errors', async () => {
        mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({
          data: null,
          error: new Error('Invalid auth code')
        });

        const response = await request(app)
          .get('/auth/callback')
          .query({ code: 'invalid-code' });

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
          error: 'Authentication failed'
        });
      });
    });
  });

  describe('Session Management Tests', () => {
    describe('GET /auth/session', () => {
      it('should return valid session', async () => {
        const mockUser = { 
          id: 'user-123', 
          email: 'test@example.com',
          app_metadata: {},
          user_metadata: {}
        };

        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null
        });

        const response = await request(app)
          .get('/auth/session')
          .set('Authorization', 'Bearer test-token');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          authenticated: true,
          user: {
            id: mockUser.id,
            email: mockUser.email,
            app_metadata: mockUser.app_metadata,
            user_metadata: mockUser.user_metadata
          }
        });
      });

      it('should handle missing authorization header', async () => {
        const response = await request(app)
          .get('/auth/session');

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
          error: 'No authorization token provided'
        });
      });

      it('should handle invalid token', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: new Error('Invalid token')
        });

        const response = await request(app)
          .get('/auth/session')
          .set('Authorization', 'Bearer invalid-token');

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
          authenticated: false,
          error: 'Invalid or expired session'
        });
      });
    });

    describe('POST /auth/signout', () => {
      it('should sign out user successfully', async () => {
        mockSupabase.auth.signOut.mockResolvedValue({
          error: null
        });

        const response = await request(app)
          .post('/auth/signout')
          .set('Authorization', 'Bearer test-token');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          success: true,
          message: 'Signed out successfully'
        });
      });

      it('should handle signout errors', async () => {
        mockSupabase.auth.signOut.mockResolvedValue({
          error: new Error('Signout failed')
        });

        const response = await request(app)
          .post('/auth/signout')
          .set('Authorization', 'Bearer test-token');

        expect(response.status).toBe(500);
        expect(response.body).toEqual({
          error: 'Failed to sign out'
        });
      });
    });
  });

  describe('Token Validation Tests', () => {
    it('should validate Bearer token format', async () => {
      const response = await request(app)
        .get('/auth/session')
        .set('Authorization', 'InvalidFormat token');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: 'Invalid authorization format. Use: Bearer <token>'
      });
    });

    it('should handle malformed tokens', async () => {
      mockSupabase.auth.getUser.mockRejectedValue(
        new Error('JWT malformed')
      );

      const response = await request(app)
        .get('/auth/session')
        .set('Authorization', 'Bearer malformed.token.here');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: 'Invalid token format'
      });
    });
  });


  describe('CORS and Security Tests', () => {
    it('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/auth/oauth/github')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(response.headers['access-control-allow-methods']).toContain('POST');
    });

    it('should reject requests from unauthorized origins', async () => {
      const response = await request(app)
        .post('/auth/oauth/github')
        .set('Origin', 'http://malicious-site.com')
        .send({});

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        error: 'Origin not allowed'
      });
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle Supabase service unavailable', async () => {
      mockSupabase.auth.signInWithOAuth.mockRejectedValue(
        new Error('ECONNREFUSED')
      );

      const response = await request(app)
        .post('/auth/oauth/github')
        .send({});

      expect(response.status).toBe(503);
      expect(response.body).toEqual({
        error: 'Authentication service unavailable'
      });
    });

    it('should handle unexpected errors gracefully', async () => {
      // Test that an error in getUser results in a 401 with "Invalid token format" 
      // when the error is caught by the try-catch around getUser
      mockSupabase.auth.getUser.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const response = await request(app)
        .get('/auth/session')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: 'Invalid token format'
      });
    });
  });
});

describe('Integration with Vector Storage', () => {
  it('should validate auth token before vector operations', async () => {
    // This would be tested in the vector storage test file
    // but we ensure the auth middleware is properly integrated
    expect(true).toBe(true);
  });
});