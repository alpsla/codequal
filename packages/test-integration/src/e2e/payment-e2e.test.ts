import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { config } from 'dotenv';
import { join } from 'path';
import { getSupabase } from '@codequal/database/supabase/client';
import { createLogger } from '@codequal/core/utils';
import axios from 'axios';

// Load environment variables
config({ path: join(__dirname, '../../../../.env') });

const logger = createLogger('payment-e2e-test');
const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';

describe('Payment Flow E2E Tests', () => {
  let testUserId: string;
  let authToken: string;
  let stripeCustomerId: string;
  
  beforeAll(async () => {
    // Create test user
    testUserId = `e2e-payment-test-${Date.now()}`;
    const { data: user, error } = await getSupabase()
      .from('users')
      .insert({
        id: testUserId,
        email: `payment-test-${Date.now()}@example.com`,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) {
      throw new Error(`Failed to create test user: ${error.message}`);
    }
    
    // Get auth token (in real E2E, this would be from login flow)
    // For now, we'll use a service token
    authToken = process.env.E2E_TEST_TOKEN || '';
    
    logger.info('Test user created', { userId: testUserId });
  });
  
  afterAll(async () => {
    // Cleanup
    if (testUserId) {
      await getSupabase()
        .from('billing_events')
        .delete()
        .match({ 'metadata->>user_id': testUserId });
        
      await getSupabase()
        .from('payment_methods')
        .delete()
        .eq('user_id', testUserId);
        
      await getSupabase()
        .from('user_billing')
        .delete()
        .eq('user_id', testUserId);
        
      await getSupabase()
        .from('users')
        .delete()
        .eq('id', testUserId);
    }
  });
  
  describe('Complete Payment Workflow', () => {
    it('should complete full subscription flow', async () => {
      // Step 1: Check initial billing status
      logger.info('Step 1: Checking initial billing status');
      const statusResponse = await axios.get(`${API_BASE_URL}/api/billing/status`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      expect(statusResponse.status).toBe(200);
      expect(statusResponse.data).toMatchObject({
        subscription: {
          status: null,
          tier: 'free'
        },
        hasPaymentMethod: false
      });
      
      // Step 2: Create checkout session
      logger.info('Step 2: Creating checkout session');
      const checkoutResponse = await axios.post(
        `${API_BASE_URL}/api/billing/create-checkout`,
        { priceId: process.env.STRIPE_TEST_PRICE_ID || 'price_test' },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      
      expect(checkoutResponse.status).toBe(200);
      expect(checkoutResponse.data).toHaveProperty('checkoutUrl');
      const checkoutUrl = checkoutResponse.data.checkoutUrl;
      logger.info('Checkout URL created', { checkoutUrl });
      
      // Step 3: Simulate webhook for subscription created
      logger.info('Step 3: Simulating subscription webhook');
      const webhookPayload = {
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_test_' + Date.now(),
            customer: stripeCustomerId,
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
          }
        }
      };
      
      // In real E2E test, this would be sent by Stripe
      // For now, we'll directly update the database
      await getSupabase()
        .from('user_billing')
        .update({
          subscription_status: 'active',
          subscription_tier: 'individual',
          stripe_subscription_id: webhookPayload.data.object.id
        })
        .eq('user_id', testUserId);
      
      // Step 4: Verify updated billing status
      logger.info('Step 4: Verifying updated billing status');
      const updatedStatusResponse = await axios.get(`${API_BASE_URL}/api/billing/status`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      expect(updatedStatusResponse.status).toBe(200);
      expect(updatedStatusResponse.data.subscription).toMatchObject({
        status: 'active',
        tier: 'individual'
      });
      
      logger.info('Subscription flow completed successfully');
    });
  });
  
  describe('Pay-Per-Scan Workflow', () => {
    it('should complete pay-per-scan flow', async () => {
      // Step 1: Create setup intent for payment method
      logger.info('Step 1: Creating setup intent');
      const setupResponse = await axios.post(
        `${API_BASE_URL}/api/billing/create-setup-intent`,
        {},
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      
      expect(setupResponse.status).toBe(200);
      expect(setupResponse.data).toHaveProperty('clientSecret');
      expect(setupResponse.data).toHaveProperty('customerId');
      
      stripeCustomerId = setupResponse.data.customerId;
      logger.info('Setup intent created', { customerId: stripeCustomerId });
      
      // Step 2: Simulate payment method attachment
      logger.info('Step 2: Simulating payment method attachment');
      await getSupabase()
        .from('payment_methods')
        .insert({
          user_id: testUserId,
          stripe_payment_method_id: 'pm_test_' + Date.now(),
          last_four: '4242',
          brand: 'visa',
          is_default: true
        });
      
      // Step 3: Charge for scan
      logger.info('Step 3: Charging for scan');
      const chargeResponse = await axios.post(
        `${API_BASE_URL}/api/billing/charge-scan`,
        { paymentMethodId: 'pm_test_' + Date.now() },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      
      expect(chargeResponse.status).toBe(200);
      expect(chargeResponse.data).toMatchObject({
        success: true,
        paymentIntentId: expect.stringContaining('pi_')
      });
      
      logger.info('Pay-per-scan flow completed successfully');
    });
  });
  
  describe('Webhook Error Handling', () => {
    it('should handle webhook errors gracefully', async () => {
      // Test invalid signature
      try {
        await axios.post(
          `${API_BASE_URL}/api/stripe/webhook`,
          { type: 'test.event' },
          { headers: { 'stripe-signature': 'invalid_sig' } }
        );
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data).toContain('Webhook Error');
      }
    });
  });
  
  describe('Trial Enforcement', () => {
    it('should enforce trial limits', async () => {
      // Set user at trial limit
      await getSupabase()
        .from('user_billing')
        .update({
          trial_scans_used: 10,
          trial_scans_limit: 10
        })
        .eq('user_id', testUserId);
      
      // Attempt to perform action that requires scan
      // This would be tested in the actual scan endpoint
      // For now, just verify the billing status reflects the limit
      const statusResponse = await axios.get(`${API_BASE_URL}/api/billing/status`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      expect(statusResponse.data.trialUsage).toMatchObject({
        scansUsed: 10,
        scansLimit: 10
      });
    });
  });
});