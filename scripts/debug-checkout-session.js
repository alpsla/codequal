const Stripe = require('stripe');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function debugCheckoutSession() {
  const customerEmail = process.argv[2] || 'tester7@grr.la';
  
  console.log(`🔍 Debugging checkout sessions for ${customerEmail}\n`);
  
  try {
    // Find customer
    const customers = await stripe.customers.list({
      email: customerEmail,
      limit: 10
    });
    
    if (customers.data.length === 0) {
      console.error('No customer found');
      return;
    }
    
    for (const customer of customers.data) {
      console.log(`\nCustomer: ${customer.id}`);
      console.log(`Email: ${customer.email}`);
      
      // Find checkout sessions for this customer
      const sessions = await stripe.checkout.sessions.list({
        customer: customer.id,
        limit: 10
      });
      
      console.log(`Found ${sessions.data.length} checkout sessions:`);
      
      for (const session of sessions.data) {
        console.log(`\n  Session: ${session.id}`);
        console.log(`  Status: ${session.status}`);
        console.log(`  Created: ${new Date(session.created * 1000).toISOString()}`);
        console.log(`  Mode: ${session.mode}`);
        console.log(`  Metadata:`, session.metadata);
        
        // Check if metadata has user_id
        if (!session.metadata?.user_id) {
          console.log(`  ⚠️  WARNING: No user_id in metadata!`);
        } else {
          console.log(`  ✅ Has user_id: ${session.metadata.user_id}`);
        }
        
        // Check subscription
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          console.log(`  Subscription: ${subscription.id} (${subscription.status})`);
        }
      }
    }
    
    console.log('\n💡 Common issues:');
    console.log('1. If no user_id in metadata: Check billing route sets it correctly');
    console.log('2. If webhook not firing: Check webhook logs in Stripe Dashboard');
    console.log('3. If handler failing: Check API server logs for errors');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugCheckoutSession().then(() => process.exit(0));