const Stripe = require('stripe');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function checkWebhookEvents() {
  console.log('🔍 Checking recent webhook events...\n');
  
  try {
    // Get recent events
    const events = await stripe.events.list({
      type: 'checkout.session.completed',
      created: {
        gte: Math.floor(Date.now() / 1000) - (24 * 60 * 60) // Last 24 hours
      },
      limit: 20
    });
    
    console.log(`Found ${events.data.length} checkout.session.completed events in last 24 hours\n`);
    
    for (const event of events.data) {
      const session = event.data.object;
      console.log(`Event: ${event.id}`);
      console.log(`Created: ${new Date(event.created * 1000).toISOString()}`);
      console.log(`Session: ${session.id}`);
      console.log(`Customer: ${session.customer}`);
      console.log(`Customer Email: ${session.customer_details?.email}`);
      console.log(`Metadata:`, session.metadata);
      
      // Check webhook endpoint responses
      if (event.request && event.request.id) {
        console.log('\nChecking webhook delivery...');
        try {
          // Get event attempts (this requires specific API version)
          console.log(`Request ID: ${event.request.id}`);
          console.log(`Webhook endpoint responses: Check in Stripe Dashboard`);
        } catch (err) {
          console.log('Unable to fetch delivery details via API');
        }
      }
      
      console.log('---\n');
    }
    
    // Check webhook endpoints
    console.log('📡 Active Webhook Endpoints:');
    const endpoints = await stripe.webhookEndpoints.list({ limit: 10 });
    
    for (const endpoint of endpoints.data) {
      if (endpoint.status === 'enabled') {
        console.log(`\nEndpoint: ${endpoint.url}`);
        console.log(`Events: ${endpoint.enabled_events.filter(e => e.includes('checkout')).join(', ') || 'No checkout events'}`);
        
        // Check if our handler is in the URL
        if (endpoint.url.includes('/stripe/webhook')) {
          console.log('✅ This looks like our webhook endpoint');
        }
      }
    }
    
    console.log('\n💡 To check webhook logs:');
    console.log('1. Go to Stripe Dashboard → Developers → Webhooks');
    console.log('2. Click on your endpoint');
    console.log('3. Check "Webhook attempts" to see if events are being delivered');
    console.log('4. Look for any 4xx or 5xx errors');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkWebhookEvents().then(() => process.exit(0));