require('dotenv').config({ path: './apps/api/.env' });
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

async function verifyTestCharges() {
  console.log('\n=== Verifying Recent Test Charges ===\n');
  console.log('Stripe Mode:', process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? 'TEST MODE' : 'LIVE MODE');
  console.log('');

  try {
    // 1. List recent payment intents
    console.log('--- Recent Payment Intents (Last 20) ---\n');
    
    const paymentIntents = await stripe.paymentIntents.list({
      limit: 20,
    });

    const scanCharges = paymentIntents.data.filter(pi => 
      pi.amount === 50 && // $0.50
      (pi.description?.includes('scan') || pi.description?.includes('analysis'))
    );

    if (scanCharges.length === 0) {
      console.log('No $0.50 scan charges found.\n');
    } else {
      console.log(`Found ${scanCharges.length} scan charges:\n`);
      
      scanCharges.forEach((intent, index) => {
        console.log(`Charge ${index + 1}:`);
        console.log('  ID:', intent.id);
        console.log('  Amount:', `$${(intent.amount / 100).toFixed(2)}`);
        console.log('  Status:', intent.status);
        console.log('  Description:', intent.description);
        console.log('  Customer:', intent.customer);
        console.log('  Created:', new Date(intent.created * 1000).toLocaleString());
        
        if (intent.metadata) {
          console.log('  Metadata:');
          Object.entries(intent.metadata).forEach(([key, value]) => {
            console.log(`    ${key}:`, value);
          });
        }
        console.log('');
      });
    }

    // 2. List all payment intents to see what's happening
    console.log('--- All Recent Payment Intents ---\n');
    
    paymentIntents.data.slice(0, 5).forEach((intent, index) => {
      console.log(`Payment Intent ${index + 1}:`);
      console.log('  ID:', intent.id);
      console.log('  Amount:', `$${(intent.amount / 100).toFixed(2)}`);
      console.log('  Status:', intent.status);
      console.log('  Description:', intent.description || '(no description)');
      console.log('  Customer:', intent.customer || '(no customer)');
      console.log('  Created:', new Date(intent.created * 1000).toLocaleString());
      console.log('');
    });

    // 3. Check for specific customer if email provided
    const email = process.argv[2];
    if (email) {
      console.log(`\n--- Searching for customer: ${email} ---\n`);
      
      const customers = await stripe.customers.search({
        query: `email:'${email}'`,
        limit: 10,
      });

      if (customers.data.length === 0) {
        console.log('No customer found with this email in Stripe.\n');
      } else {
        for (const customer of customers.data) {
          console.log('Customer found:');
          console.log('  ID:', customer.id);
          console.log('  Email:', customer.email);
          console.log('  Created:', new Date(customer.created * 1000).toLocaleString());
          
          // Get recent charges for this customer
          const customerCharges = await stripe.paymentIntents.list({
            customer: customer.id,
            limit: 10,
          });

          console.log(`\n  Recent charges (${customerCharges.data.length}):`);
          customerCharges.data.forEach((charge, idx) => {
            console.log(`    ${idx + 1}. $${(charge.amount / 100).toFixed(2)} - ${charge.status} - ${charge.description || 'No description'}`);
          });
          console.log('');
        }
      }
    }

    // 4. Summary
    console.log('\n--- SUMMARY ---');
    console.log(`Total payment intents checked: ${paymentIntents.data.length}`);
    console.log(`Scan charges found: ${scanCharges.length}`);
    console.log(`Successful scan charges: ${scanCharges.filter(c => c.status === 'succeeded').length}`);
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.type === 'StripeAuthenticationError') {
      console.error('\nStripe authentication failed. Please check your STRIPE_SECRET_KEY in .env');
    }
  }
}

console.log('Stripe API Key:', process.env.STRIPE_SECRET_KEY ? `${process.env.STRIPE_SECRET_KEY.substring(0, 14)}...` : 'NOT SET');

verifyTestCharges().then(() => process.exit(0));