const Stripe = require('stripe');
const stripe = new Stripe('sk_test_51RiLenH9VfPdHERjw6vRQ9IqaG4g2opDmmGBLHYpmGNKGxoYGo7jnWJS7QlMya6OVh8MLNWe5lhTSC7OhnIYSl3G00tf2ryUnu');

async function checkSessions() {
  try {
    console.log('Fetching recent checkout sessions...\n');
    
    const sessions = await stripe.checkout.sessions.list({
      limit: 10
    });
    
    sessions.data.forEach(session => {
      console.log(`Session ID: ${session.id}`);
      console.log(`Status: ${session.status}`);
      console.log(`Customer: ${session.customer}`);
      console.log(`Customer Email: ${session.customer_email || session.customer_details?.email || 'N/A'}`);
      console.log(`Payment Status: ${session.payment_status}`);
      console.log(`Created: ${new Date(session.created * 1000).toLocaleString()}`);
      console.log('---');
    });
    
    // Check the most recent completed session
    const completedSession = sessions.data.find(s => s.status === 'complete');
    if (completedSession && completedSession.subscription) {
      console.log('\nMost recent completed session has subscription:', completedSession.subscription);
      
      // Get subscription details
      const subscription = await stripe.subscriptions.retrieve(completedSession.subscription);
      console.log('\nSubscription details:');
      console.log(`ID: ${subscription.id}`);
      console.log(`Status: ${subscription.status}`);
      console.log(`Customer: ${subscription.customer}`);
      console.log(`Price ID: ${subscription.items.data[0].price.id}`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkSessions();