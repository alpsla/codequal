const Stripe = require('stripe');
const axios = require('axios');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function testWebhookLocally() {
  const customerId = 'cus_ShcOUvx15fvIjz';
  
  try {
    console.log('Testing webhook locally...\n');
    
    // Get the latest subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1
    });
    
    if (subscriptions.data.length === 0) {
      console.error('No subscription found');
      return;
    }
    
    const subscription = subscriptions.data[0];
    console.log('Found subscription:', subscription.id);
    console.log('Status:', subscription.status);
    console.log('Price ID:', subscription.items.data[0]?.price.id);
    
    // Create a test event
    const event = {
      id: 'evt_test_' + Date.now(),
      object: 'event',
      api_version: '2023-10-16',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: subscription
      },
      livemode: false,
      pending_webhooks: 1,
      request: {
        id: null,
        idempotency_key: null
      },
      type: 'customer.subscription.updated'
    };
    
    console.log('\nSending test webhook to local endpoint...');
    
    // Send to local endpoint
    try {
      const response = await axios.post('http://localhost:3001/stripe/webhook', event, {
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'test_signature' // This will fail signature validation
        }
      });
      
      console.log('Response:', response.status, response.data);
    } catch (error) {
      if (error.response) {
        console.error('Webhook error:', error.response.status, error.response.data);
        console.log('\nThis is expected if webhook signature validation is enabled.');
        console.log('The webhook handler requires a valid Stripe signature.');
      } else {
        console.error('Connection error:', error.message);
        console.log('\nMake sure the API server is running on port 3001');
      }
    }
    
    console.log('\nTo properly test webhooks:');
    console.log('1. Use Stripe CLI: stripe listen --forward-to localhost:3001/stripe/webhook');
    console.log('2. Then trigger events: stripe trigger customer.subscription.updated');
    console.log('3. Or use the Stripe Dashboard to resend webhook events');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testWebhookLocally().then(() => process.exit(0));