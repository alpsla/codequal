// Mock dependencies before imports
jest.mock('@codequal/database/supabase/client');
jest.mock('../middleware/auth-middleware');
jest.mock('multer', () => {
  const multer = () => ({
    single: () => (req: any, res: any, next: any) => {
      req.file = {
        buffer: Buffer.from('test'),
        originalname: 'test.jpg',
        mimetype: 'image/jpeg'
      };
      next();
    }
  });
  multer.memoryStorage = () => ({});
  return multer;
});
jest.mock('uuid', () => ({
  v4: () => 'test-uuid'
}));

import request from 'supertest';
import express from 'express';
import { getSupabase } from '@codequal/database/supabase/client';
import usersRouter from '../routes/users';
import { authMiddleware } from '../middleware/auth-middleware';

const app = express();
app.use(express.json());

// Mock auth middleware to always pass with test user
(authMiddleware as jest.Mock).mockImplementation((req, res, next) => {
  req.user = {
    id: 'test-user-id',
    email: 'test@example.com',
    organizationId: 'test-org-id',
    permissions: [],
    role: 'user',
    status: 'active',
    session: {
      token: 'test-token',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  };
  next();
});

app.use('/api/users', authMiddleware as any, usersRouter);

describe('User Profile Endpoints', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup Supabase mock
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      storage: {
        from: jest.fn().mockReturnThis(),
        upload: jest.fn().mockResolvedValue({ data: { path: 'avatar.jpg' }, error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/avatar.jpg' } })
      },
      auth: {
        admin: {
          deleteUser: jest.fn().mockResolvedValue({ error: null })
        }
      }
    };
    
    (getSupabase as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('GET /api/users/profile', () => {
    it('should return user profile with organization memberships', async () => {
      const mockProfile = {
        id: 'profile-id',
        user_id: 'test-user-id',
        email: 'test@example.com',
        full_name: 'Test User',
        bio: 'Test bio',
        organizations: {
          id: 'org-id',
          name: 'Test Org',
          slug: 'test-org',
          subscription_tier: 'team'
        }
      };

      const mockMemberships = [
        {
          role: 'admin',
          joined_at: '2024-01-01',
          organization: {
            id: 'org-id',
            name: 'Test Org',
            slug: 'test-org'
          }
        }
      ];

      mockSupabase.single.mockResolvedValueOnce({ data: mockProfile, error: null });
      mockSupabase.eq.mockReturnThis();
      mockSupabase.select.mockImplementation(() => {
        if (mockSupabase.from.mock.calls[mockSupabase.from.mock.calls.length - 1][0] === 'organization_members') {
          return { eq: jest.fn().mockResolvedValue({ data: mockMemberships }) };
        }
        return mockSupabase;
      });

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.profile).toMatchObject({
        ...mockProfile,
        memberships: mockMemberships
      });
    });

    it('should return 404 if profile not found', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Profile not found');
    });
  });

  describe('PUT /api/users/profile', () => {
    it('should update user profile', async () => {
      const updateData = {
        full_name: 'Updated Name',
        bio: 'Updated bio',
        location: 'New York',
        website: 'https://example.com'
      };

      mockSupabase.single.mockResolvedValueOnce({ 
        data: { ...updateData, user_id: 'test-user-id' }, 
        error: null 
      });

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', 'Bearer test-token')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Profile updated successfully');
      expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining(updateData));
    });

    it('should validate input data', async () => {
      const invalidData = {
        website: 'not-a-url'
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', 'Bearer test-token')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('PATCH /api/users/settings', () => {
    it('should update user settings', async () => {
      const settingsData = {
        theme: 'dark',
        email_notifications: false,
        preferred_language: 'es'
      };

      mockSupabase.single.mockResolvedValueOnce({ 
        data: settingsData, 
        error: null 
      });

      const response = await request(app)
        .patch('/api/users/settings')
        .set('Authorization', 'Bearer test-token')
        .send(settingsData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Settings updated successfully');
      expect(response.body.settings).toMatchObject(settingsData);
    });

    it('should validate theme values', async () => {
      const invalidSettings = {
        theme: 'invalid-theme'
      };

      const response = await request(app)
        .patch('/api/users/settings')
        .set('Authorization', 'Bearer test-token')
        .send(invalidSettings);

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/users/account', () => {
    it('should delete account with proper confirmation', async () => {
      mockSupabase.select.mockReturnThis();
      mockSupabase.eq.mockResolvedValueOnce({ data: [], error: null });

      const response = await request(app)
        .delete('/api/users/account')
        .set('Authorization', 'Bearer test-token')
        .send({ confirmation: 'DELETE_MY_ACCOUNT' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Account deleted successfully');
      expect(mockSupabase.auth.admin.deleteUser).toHaveBeenCalledWith('test-user-id');
    });

    it('should require confirmation phrase', async () => {
      const response = await request(app)
        .delete('/api/users/account')
        .set('Authorization', 'Bearer test-token')
        .send({ confirmation: 'wrong-phrase' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('confirm account deletion');
    });

    it('should prevent deletion if user owns organizations', async () => {
      const ownedOrgs = [{ id: 'org-1', name: 'My Org' }];
      mockSupabase.select.mockReturnThis();
      mockSupabase.eq.mockResolvedValueOnce({ data: ownedOrgs, error: null });

      const response = await request(app)
        .delete('/api/users/account')
        .set('Authorization', 'Bearer test-token')
        .send({ confirmation: 'DELETE_MY_ACCOUNT' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Cannot delete account while owning organizations');
      expect(response.body.organizations).toEqual(ownedOrgs);
    });
  });

  describe('GET /api/users/repositories', () => {
    it('should return user repositories', async () => {
      const mockRepos = [
        {
          id: 'repo-1',
          repository_url: 'https://github.com/user/repo1',
          provider: 'github',
          repo_name: 'repo1',
          last_accessed_at: '2024-01-01'
        }
      ];

      mockSupabase.order.mockResolvedValueOnce({ data: mockRepos, error: null });

      const response = await request(app)
        .get('/api/users/repositories')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.repositories).toEqual(mockRepos);
    });

    it('should filter by provider', async () => {
      mockSupabase.order.mockResolvedValueOnce({ data: [], error: null });

      const response = await request(app)
        .get('/api/users/repositories?provider=gitlab')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(mockSupabase.eq).toHaveBeenCalledWith('provider', 'gitlab');
    });
  });
});