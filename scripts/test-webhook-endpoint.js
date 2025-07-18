const axios = require('axios');

async function testWebhookEndpoint() {
  const endpoints = [
    'http://localhost:3001/stripe/webhook',
    'https://65c68660979b.ngrok-free.app/stripe/webhook'
  ];
  
  console.log('🔍 Testing webhook endpoints...\n');
  
  for (const endpoint of endpoints) {
    console.log(`Testing: ${endpoint}`);
    
    try {
      // Send a simple POST request (it will fail signature validation but should not 404)
      const response = await axios.post(endpoint, 
        { test: true },
        { 
          headers: {
            'Content-Type': 'application/json',
            'stripe-signature': 'test'
          },
          timeout: 5000
        }
      );
      
      console.log(`✅ Response: ${response.status} ${response.statusText}`);
      console.log(`   Data: ${JSON.stringify(response.data)}`);
    } catch (error) {
      if (error.response) {
        console.log(`❌ Response: ${error.response.status} ${error.response.statusText}`);
        console.log(`   Data: ${error.response.data}`);
        
        if (error.response.status === 404) {
          console.log('   ⚠️  404 ERROR - Endpoint not found!');
          console.log('   Possible issues:');
          console.log('   1. API server not running');
          console.log('   2. Wrong port (should be 3001)');
          console.log('   3. Route not properly mounted');
          console.log('   4. ngrok not forwarding to correct port');
        } else if (error.response.status === 400) {
          console.log('   ✅ This is expected - webhook signature validation failed');
          console.log('   The endpoint exists and is working!');
        }
      } else if (error.code === 'ECONNREFUSED') {
        console.log(`❌ Connection refused - Server not running at ${endpoint}`);
      } else if (error.code === 'ETIMEDOUT') {
        console.log(`❌ Timeout - Could not reach ${endpoint}`);
      } else {
        console.log(`❌ Error: ${error.message}`);
      }
    }
    console.log('');
  }
  
  console.log('💡 Next steps:');
  console.log('1. Make sure your API server is running on port 3001');
  console.log('2. If using ngrok, ensure it\'s forwarding to the correct port:');
  console.log('   ngrok http 3001');
  console.log('3. Update the webhook URL in Stripe Dashboard to match your setup');
}

testWebhookEndpoint().then(() => process.exit(0));