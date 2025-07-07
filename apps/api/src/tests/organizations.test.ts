// Mock dependencies before imports
jest.mock('@codequal/database/supabase/client');
jest.mock('../middleware/auth-middleware');
jest.mock('uuid', () => ({
  v4: () => 'test-uuid'
}));

import request from 'supertest';
import express from 'express';
import { getSupabase } from '@codequal/database/supabase/client';
import organizationsRouter from '../routes/organizations';
import { authMiddleware } from '../middleware/auth-middleware';

const app = express();
app.use(express.json());

// Mock auth middleware
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

app.use('/api/organizations', authMiddleware as any, organizationsRouter);

describe('Organization Management Endpoints', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup Supabase mock
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis()
    };
    
    (getSupabase as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('POST /api/organizations', () => {
    it('should create a new organization', async () => {
      const newOrg = {
        name: 'Test Organization',
        slug: 'test-org-123',
        allowed_email_domains: ['example.com']
      };

      // Check slug doesn't exist
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: null });
      
      // Create organization
      mockSupabase.single.mockResolvedValueOnce({ 
        data: { id: 'new-org-id', ...newOrg, owner_id: 'test-user-id' }, 
        error: null 
      });
      
      // Add member
      mockSupabase.insert.mockResolvedValueOnce({ error: null });

      const response = await request(app)
        .post('/api/organizations')
        .set('Authorization', 'Bearer test-token')
        .send(newOrg);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Organization created successfully');
      expect(response.body.organization).toMatchObject(newOrg);
    });

    it('should reject duplicate slug', async () => {
      mockSupabase.single.mockResolvedValueOnce({ 
        data: { id: 'existing-org' }, 
        error: null 
      });

      const response = await request(app)
        .post('/api/organizations')
        .set('Authorization', 'Bearer test-token')
        .send({
          name: 'Test Org',
          slug: 'existing-slug'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Organization slug already taken');
    });

    it('should validate slug format', async () => {
      const response = await request(app)
        .post('/api/organizations')
        .set('Authorization', 'Bearer test-token')
        .send({
          name: 'Test Org',
          slug: 'Invalid Slug!' // Contains uppercase and special char
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/organizations/:id', () => {
    it('should return organization details for members', async () => {
      const orgId = 'test-org-id';
      
      // Mock membership check
      mockSupabase.single.mockResolvedValueOnce({ 
        data: { role: 'admin' }, 
        error: null 
      });
      
      // Mock organization data
      mockSupabase.single.mockResolvedValueOnce({ 
        data: {
          id: orgId,
          name: 'Test Org',
          slug: 'test-org',
          owner: { id: 'owner-id', email: 'owner@example.com' }
        }, 
        error: null 
      });
      
      // Mock member count
      mockSupabase.eq.mockResolvedValueOnce({ count: 5 });

      const response = await request(app)
        .get(`/api/organizations/${orgId}`)
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.organization).toMatchObject({
        id: orgId,
        name: 'Test Org',
        member_count: 5,
        user_role: 'admin'
      });
    });

    it('should reject non-members', async () => {
      mockSupabase.single.mockResolvedValueOnce({ 
        data: null, 
        error: { message: 'Not found' } 
      });

      const response = await request(app)
        .get('/api/organizations/other-org-id')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Not a member of this organization');
    });
  });

  describe('Organization Settings', () => {
    const orgId = 'test-org-id';

    beforeEach(() => {
      // Mock membership check as admin
      mockSupabase.single.mockResolvedValueOnce({ 
        data: { role: 'admin' }, 
        error: null 
      });
    });

    describe('GET /api/organizations/:id/settings', () => {
      it('should return organization settings with defaults', async () => {
        const customSettings = {
          scan_settings: {
            scan_frequency: 'weekly'
          }
        };

        mockSupabase.single.mockResolvedValueOnce({ 
          data: { settings: customSettings }, 
          error: null 
        });

        const response = await request(app)
          .get(`/api/organizations/${orgId}/settings`)
          .set('Authorization', 'Bearer test-token');

        expect(response.status).toBe(200);
        expect(response.body.settings).toMatchObject({
          scan_settings: expect.objectContaining({
            scan_frequency: 'weekly', // Custom value
            auto_scan_enabled: true, // Default value
            scan_on_push: true // Default value
          }),
          notification_settings: expect.any(Object),
          integration_settings: expect.any(Object),
          display_settings: expect.any(Object),
          limits: expect.any(Object)
        });
      });
    });

    describe('PUT /api/organizations/:id/settings', () => {
      it('should update organization settings', async () => {
        // Mock admin check
        mockSupabase.single.mockResolvedValueOnce({ 
          data: { role: 'admin' }, 
          error: null 
        });

        // Mock current settings
        mockSupabase.single.mockResolvedValueOnce({ 
          data: { settings: {} }, 
          error: null 
        });

        // Mock update
        mockSupabase.eq.mockResolvedValueOnce({ error: null });

        const updates = {
          scan_settings: {
            scan_frequency: 'hourly',
            scan_on_push: false
          },
          notification_settings: {
            slack_enabled: true,
            slack_webhook_url: 'https://hooks.slack.com/test'
          }
        };

        const response = await request(app)
          .put(`/api/organizations/${orgId}/settings`)
          .set('Authorization', 'Bearer test-token')
          .send(updates);

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Settings updated successfully');
        expect(response.body.settings).toMatchObject(updates);
      });

      it('should validate scan frequency', async () => {
        // Mock admin check
        mockSupabase.single.mockResolvedValueOnce({ 
          data: { role: 'admin' }, 
          error: null 
        });

        const response = await request(app)
          .put(`/api/organizations/${orgId}/settings`)
          .set('Authorization', 'Bearer test-token')
          .send({
            scan_settings: {
              scan_frequency: 'invalid'
            }
          });

        expect(response.status).toBe(400);
      });

      it('should require admin permissions', async () => {
        // Override membership check as regular member
        mockSupabase.single.mockReset();
        mockSupabase.single.mockResolvedValueOnce({ 
          data: { role: 'member' }, 
          error: null 
        });

        const response = await request(app)
          .put(`/api/organizations/${orgId}/settings`)
          .set('Authorization', 'Bearer test-token')
          .send({
            scan_settings: { scan_frequency: 'daily' }
          });

        expect(response.status).toBe(403);
        expect(response.body.error).toBe('Admin permissions required');
      });
    });
  });

  describe('Organization Members', () => {
    const orgId = 'test-org-id';

    beforeEach(() => {
      // Mock membership check
      mockSupabase.single.mockResolvedValueOnce({ 
        data: { role: 'admin' }, 
        error: null 
      });
    });

    describe('POST /api/organizations/:id/members', () => {
      it('should invite new member', async () => {
        // Mock admin check
        mockSupabase.single.mockResolvedValueOnce({ 
          data: { role: 'admin' }, 
          error: null 
        });

        // Check user exists
        mockSupabase.single.mockResolvedValueOnce({ 
          data: { user_id: 'invited-user-id' }, 
          error: null 
        });

        // Check not already member
        mockSupabase.single.mockResolvedValueOnce({ 
          data: null, 
          error: null 
        });

        // Add member
        mockSupabase.insert.mockResolvedValueOnce({ error: null });

        const response = await request(app)
          .post(`/api/organizations/${orgId}/members`)
          .set('Authorization', 'Bearer test-token')
          .send({
            email: 'newmember@example.com',
            role: 'member'
          });

        expect(response.status).toBe(201);
        expect(response.body.message).toBe('Member invited successfully');
      });

      it('should reject if user not found', async () => {
        // Mock admin check
        mockSupabase.single.mockResolvedValueOnce({ 
          data: { role: 'admin' }, 
          error: null 
        });

        // User not found
        mockSupabase.single.mockResolvedValueOnce({ 
          data: null, 
          error: null 
        });

        const response = await request(app)
          .post(`/api/organizations/${orgId}/members`)
          .set('Authorization', 'Bearer test-token')
          .send({
            email: 'unknown@example.com',
            role: 'member'
          });

        expect(response.status).toBe(404);
        expect(response.body.error).toContain('User not found');
      });
    });
  });
});