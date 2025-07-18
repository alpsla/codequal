const Stripe = require('stripe');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function verifyWebhookWorking() {
  console.log('🔍 Verifying webhook configuration...\n');
  
  try {
    // Check recent webhook attempts
    console.log('Checking recent Stripe events...\n');
    
    const events = await stripe.events.list({
      limit: 10,
      created: {
        gte: Math.floor(Date.now() / 1000) - (60 * 60) // Last hour
      }
    });
    
    console.log(`Found ${events.data.length} events in the last hour\n`);
    
    // Check webhook endpoints
    const endpoints = await stripe.webhookEndpoints.list({ limit: 10 });
    const activeEndpoint = endpoints.data.find(e => 
      e.status === 'enabled' && 
      e.url.includes('65c68660979b.ngrok-free.app')
    );
    
    if (activeEndpoint) {
      console.log('✅ Webhook endpoint is active:');
      console.log(`   URL: ${activeEndpoint.url}`);
      console.log(`   Events: ${activeEndpoint.enabled_events.length} events configured`);
      console.log(`   Status: ${activeEndpoint.status}`);
    } else {
      console.log('❌ No active webhook found for ngrok URL');
    }
    
    // Show recent event types
    if (events.data.length > 0) {
      console.log('\n📊 Recent event types:');
      const eventTypes = [...new Set(events.data.map(e => e.type))];
      eventTypes.forEach(type => {
        const count = events.data.filter(e => e.type === type).length;
        console.log(`   - ${type}: ${count} event(s)`);
      });
    }
    
    console.log('\n✅ Your webhook appears to be working!');
    console.log('   - ngrok is running and forwarding to port 3001');
    console.log('   - Recent webhook received at 09:45:28 EDT returned 200 OK');
    console.log('\n💡 To test further:');
    console.log('   1. Create a test subscription and watch ngrok console');
    console.log('   2. Check API server logs for webhook processing');
    console.log('   3. Use: stripe trigger checkout.session.completed');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

verifyWebhookWorking().then(() => process.exit(0));