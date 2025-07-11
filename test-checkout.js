const fetch = require('node-fetch');

async function testCheckout() {
  try {
    // Get a valid token first
    const loginResp = await fetch('http://localhost:3001/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'slavataichi@gmail.com',
        password: 'password123'
      })
    });
    
    const loginData = await loginResp.json();
    
    if (!loginData.session || !loginData.session.access_token) {
      console.log('Login failed:', loginData);
      return;
    }
    
    console.log('Login successful, got token');
    
    // Try create checkout
    const resp = await fetch('http://localhost:3001/api/billing/create-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + loginData.session.access_token
      },
      body: JSON.stringify({
        priceId: 'price_1RjBXQH9VfPdHERjHqKZxVtO'
      })
    });
    
    const data = await resp.json();
    console.log('Checkout Response:', resp.status);
    console.log('Response Data:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testCheckout();