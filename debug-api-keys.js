// Run this in the browser console to debug the API keys issue

(async function debugApiKeys() {
  console.log('\n=== Debugging API Keys Endpoint ===\n');
  
  const token = localStorage.getItem('access_token');
  
  if (!token) {
    console.log('❌ No access token found');
    return;
  }
  
  console.log('✅ Found access token');
  
  try {
    // Test the API keys endpoint
    const response = await fetch('http://localhost:3001/api/keys', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('Response data:', data);
    
    if (!response.ok) {
      console.error('❌ API keys request failed:', data);
      
      // Also check billing status
      console.log('\n=== Checking Billing Status ===');
      const billingResponse = await fetch('http://localhost:3001/api/billing/status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const billingData = await billingResponse.json();
      console.log('Billing data:', billingData);
    } else {
      console.log('✅ API keys loaded successfully');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
})();