// Copy and paste this entire script into your browser console
// Make sure you're logged in first at http://localhost:3000

(async function testCheckout() {
  try {
    const token = localStorage.getItem('access_token');
    
    if (!token) {
      console.log('No access token found. Please log in first.');
      return;
    }
    
    console.log('Using existing access token from browser');
    
    // Try create checkout
    const resp = await fetch('http://localhost:3001/api/billing/create-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({
        priceId: 'price_1RjBXQH9VfPdHERjHqKZxVtO'
      })
    });
    
    const data = await resp.json();
    console.log('Checkout Response:', resp.status);
    console.log('Response Data:', data);
    
    if (data.checkoutUrl) {
      console.log('\n✅ Success! Checkout URL:', data.checkoutUrl);
      console.log('\nYou can open this URL to complete the subscription:');
      console.log(data.checkoutUrl);
    } else {
      console.log('\n❌ Failed to create checkout session');
      console.log('Error details:', data);
    }
  } catch (err) {
    console.error('Error:', err);
  }
})();