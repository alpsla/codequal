import request from 'supertest';
import app from '../index';

// Simple mock for Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    customers: {
      create: jest.fn().mockResolvedValue({ id: 'cus_test123' })
    },
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          id: 'cs_test123',
          url: 'https://checkout.stripe.com/test'
        })
      }
    }
  }));
});

// Mock Supabase
jest.mock('@codequal/database/supabase/client', () => ({
  getSupabase: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: null,
            error: { code: 'PGRST116' }
          }))
        }))
      })),
      upsert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: {
              user_id: 'test-user',
              subscription_tier: 'free',
              trial_scans_used: 0,
              trial_scans_limit: 10
            },
            error: null
          }))
        }))
      }))
    }))
  }))
}));

describe('Payment Flow - Simple Tests', () => {
  it('should return 401 without authentication', async () => {
    const response = await request(app)
      .get('/api/billing/status');
      
    expect(response.status).toBe(401);
  });
  
  it('should reject checkout without auth', async () => {
    const response = await request(app)
      .post('/api/billing/create-checkout')
      .send({ priceId: 'test_price' });
      
    expect(response.status).toBe(401);
  });
});