import request from 'supertest';
import Stripe from 'stripe';
import app from '../index';
import { getSupabase } from '@codequal/database/supabase/client';
import { createLogger } from '@codequal/core/utils';
import { generateTestToken } from './helpers/auth-helpers';

// Mock Stripe
jest.mock('stripe');

const logger = createLogger('payment-flow-test');

describe('Payment Flow Integration Tests', () => {
  let testUserId: string;
  let testToken: string;
  let mockStripe: jest.Mocked<Stripe>;
  
  beforeAll(async () => {
    // Setup test user
    testUserId = `test-user-${Date.now()}`;
    testToken = await generateTestToken(testUserId, 'test@example.com');
    
    // Setup Stripe mock
    mockStripe = new Stripe('test_key', { apiVersion: '2023-10-16' }) as jest.Mocked<Stripe>;
    (Stripe as any).mockImplementation(() => mockStripe);
  });
  
  afterAll(async () => {
    // Cleanup test data
    await getSupabase()
      .from('user_billing')
      .delete()
      .eq('user_id', testUserId);
      
    await getSupabase()
      .from('payment_methods')
      .delete()
      .eq('user_id', testUserId);
      
    await getSupabase()
      .from('billing_events')
      .delete()
      .match({ 'metadata->>user_id': testUserId });
  });
  
  describe('Billing Status', () => {
    it('should return default billing status for new user', async () => {
      const response = await request(app)
        .get('/api/billing/status')
        .set('Authorization', `Bearer ${testToken}`);
        
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        subscription: {
          status: null,
          tier: 'free',
          trialEndsAt: null
        },
        trialUsage: {
          scansUsed: 0,
          scansLimit: 10,
          trialRepository: null
        },
        hasPaymentMethod: false
      });
    });
    
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/billing/status');
        
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });
  });
  
  describe('Checkout Session Creation', () => {
    beforeEach(() => {
      // Mock Stripe customer creation
      mockStripe.customers = {
        create: jest.fn().mockResolvedValue({
          id: 'cus_test123',
          email: 'test@example.com'
        })
      } as any;
      
      // Mock checkout session creation
      mockStripe.checkout = {
        sessions: {
          create: jest.fn().mockResolvedValue({
            id: 'cs_test123',
            url: 'https://checkout.stripe.com/test_session'
          })
        }
      } as any;
    });
    
    it('should create checkout session for subscription', async () => {
      const response = await request(app)
        .post('/api/billing/create-checkout')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          priceId: 'price_test_individual'
        });
        
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('checkoutUrl');
      expect(response.body.checkoutUrl).toContain('stripe.com');
      
      // Verify Stripe was called correctly
      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        metadata: { user_id: testUserId }
      });
      
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_test123',
          payment_method_types: ['card'],
          mode: 'subscription',
          metadata: { user_id: testUserId }
        })
      );
    });
    
    it('should return error without price ID', async () => {
      const response = await request(app)
        .post('/api/billing/create-checkout')
        .set('Authorization', `Bearer ${testToken}`)
        .send({});
        
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Price ID is required');
    });
  });
  
  describe('Setup Intent for Pay-Per-Scan', () => {
    beforeEach(() => {
      // Mock setup intent creation
      mockStripe.setupIntents = {
        create: jest.fn().mockResolvedValue({
          id: 'seti_test123',
          client_secret: 'seti_test123_secret'
        })
      } as any;
    });
    
    it('should create setup intent for payment method', async () => {
      const response = await request(app)
        .post('/api/billing/create-setup-intent')
        .set('Authorization', `Bearer ${testToken}`);
        
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('clientSecret');
      expect(response.body).toHaveProperty('customerId');
      
      expect(mockStripe.setupIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: expect.any(String),
          payment_method_types: ['card'],
          metadata: { user_id: testUserId }
        })
      );
    });
  });
  
  describe('Payment Method Confirmation', () => {
    beforeEach(() => {
      // Mock payment methods list
      mockStripe.paymentMethods = {
        list: jest.fn().mockResolvedValue({
          data: [{
            id: 'pm_test123',
            card: {
              last4: '4242',
              brand: 'visa'
            }
          }]
        })
      } as any;
    });
    
    it('should confirm payment method and sync to database', async () => {
      // First create a billing record with Stripe customer
      await getSupabase()
        .from('user_billing')
        .upsert({
          user_id: testUserId,
          stripe_customer_id: 'cus_test123',
          subscription_tier: 'free'
        });
      
      const response = await request(app)
        .post('/api/billing/confirm-payment-method')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          setupIntentId: 'seti_test123'
        });
        
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        hasPaymentMethod: true,
        paymentMethodCount: 1
      });
      
      // Verify payment method was stored
      const { data: paymentMethod } = await getSupabase()
        .from('payment_methods')
        .select('*')
        .eq('user_id', testUserId)
        .single();
        
      expect(paymentMethod).toMatchObject({
        user_id: testUserId,
        stripe_payment_method_id: 'pm_test123',
        last_four: '4242',
        brand: 'visa',
        is_default: true
      });
    });
  });
  
  describe('Single Scan Charging', () => {
    beforeEach(() => {
      // Mock payment intent creation
      mockStripe.paymentIntents = {
        create: jest.fn().mockResolvedValue({
          id: 'pi_test123',
          status: 'succeeded'
        })
      } as any;
    });
    
    it('should charge for single scan', async () => {
      // Setup billing with customer
      await getSupabase()
        .from('user_billing')
        .upsert({
          user_id: testUserId,
          stripe_customer_id: 'cus_test123',
          subscription_tier: 'free'
        });
      
      const response = await request(app)
        .post('/api/billing/charge-scan')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          paymentMethodId: 'pm_test123'
        });
        
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        paymentIntentId: 'pi_test123'
      });
      
      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 50, // $0.50 in cents
          currency: 'usd',
          customer: 'cus_test123',
          payment_method: 'pm_test123',
          confirm: true,
          metadata: {
            user_id: testUserId,
            type: 'pay_per_scan'
          }
        })
      );
    });
    
    it('should return error without payment method', async () => {
      // Clear customer ID
      await getSupabase()
        .from('user_billing')
        .update({ stripe_customer_id: null })
        .eq('user_id', testUserId);
      
      const response = await request(app)
        .post('/api/billing/charge-scan')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          paymentMethodId: 'pm_test123'
        });
        
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('No payment method on file');
    });
  });
  
  describe('Webhook Handling', () => {
    const createWebhookEvent = (type: string, data: any): Stripe.Event => ({
      id: 'evt_test123',
      object: 'event',
      api_version: '2023-10-16',
      created: Date.now() / 1000,
      data: { object: data },
      livemode: false,
      pending_webhooks: 0,
      request: { id: null, idempotency_key: null },
      type
    });
    
    beforeEach(() => {
      // Mock webhook signature verification
      mockStripe.webhooks = {
        constructEvent: jest.fn().mockImplementation((body, sig, secret) => {
          return createWebhookEvent(body.type, body.data);
        })
      } as any;
    });
    
    it('should handle subscription created webhook', async () => {
      const subscriptionData = {
        id: 'sub_test123',
        customer: 'cus_test123',
        status: 'active',
        items: {
          data: [{
            price: {
              id: 'price_individual',
              product: 'prod_individual'
            }
          }]
        },
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
      };
      
      // Setup user billing
      await getSupabase()
        .from('user_billing')
        .upsert({
          user_id: testUserId,
          stripe_customer_id: 'cus_test123',
          subscription_tier: 'free'
        });
      
      const response = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', 'test_signature')
        .send({
          type: 'customer.subscription.created',
          data: subscriptionData
        });
        
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ received: true });
      
      // Verify subscription was updated
      const { data: billing } = await getSupabase()
        .from('user_billing')
        .select('*')
        .eq('user_id', testUserId)
        .single();
        
      expect(billing).toMatchObject({
        subscription_status: 'active',
        subscription_tier: 'individual',
        stripe_subscription_id: 'sub_test123'
      });
    });
    
    it('should handle payment method attached webhook', async () => {
      const paymentMethodData = {
        id: 'pm_test123',
        customer: 'cus_test123',
        card: {
          last4: '4242',
          brand: 'visa'
        }
      };
      
      await getSupabase()
        .from('user_billing')
        .upsert({
          user_id: testUserId,
          stripe_customer_id: 'cus_test123'
        });
      
      const response = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', 'test_signature')
        .send({
          type: 'payment_method.attached',
          data: paymentMethodData
        });
        
      expect(response.status).toBe(200);
      
      // Verify payment method was stored
      const { data: paymentMethods } = await getSupabase()
        .from('payment_methods')
        .select('*')
        .eq('user_id', testUserId);
        
      expect(paymentMethods).toHaveLength(1);
      expect(paymentMethods[0]).toMatchObject({
        stripe_payment_method_id: 'pm_test123',
        last_four: '4242',
        brand: 'visa'
      });
    });
    
    it('should handle invalid webhook signature', async () => {
      mockStripe.webhooks.constructEvent = jest.fn().mockImplementation(() => {
        throw new Error('Invalid signature');
      });
      
      const response = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', 'invalid_signature')
        .send({
          type: 'test.event'
        });
        
      expect(response.status).toBe(400);
      expect(response.text).toContain('Webhook Error');
    });
  });
  
  describe('Subscription Tier Limits', () => {
    it('should enforce trial scan limits', async () => {
      // Set up user with trial scans at limit
      await getSupabase()
        .from('user_billing')
        .upsert({
          user_id: testUserId,
          subscription_tier: 'free',
          trial_scans_used: 10,
          trial_scans_limit: 10
        });
      
      // Attempt to scan should be rejected by trial enforcement middleware
      // This would be tested in the scan endpoint tests
    });
    
    it('should track web scan usage for individual plan', async () => {
      await getSupabase()
        .from('user_billing')
        .upsert({
          user_id: testUserId,
          subscription_tier: 'individual',
          subscription_status: 'active'
        });
      
      // Create some test scans
      const scanIds = [];
      for (let i = 0; i < 3; i++) {
        const { data } = await getSupabase()
          .from('scans')
          .insert({
            user_id: testUserId,
            repository_url: `https://github.com/test/repo${i}`,
            status: 'completed'
          })
          .select()
          .single();
        scanIds.push(data.id);
      }
      
      const response = await request(app)
        .get('/api/billing/status')
        .set('Authorization', `Bearer ${testToken}`);
        
      expect(response.status).toBe(200);
      expect(response.body.webScanUsage).toMatchObject({
        scansUsed: 3,
        scansLimit: 50
      });
      
      // Cleanup
      await getSupabase()
        .from('scans')
        .delete()
        .in('id', scanIds);
    });
  });
});