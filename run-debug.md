# Run Debug Script

Please run the following script in your browser console at http://localhost:3000:

```javascript
// Run this in browser console to debug auth and API keys issue

(async function debugAuth() {
  console.log('\n=== Full Auth Debug ===\n');
  
  const token = localStorage.getItem('access_token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  console.log('Token present:', \!\!token);
  console.log('User email:', user.email);
  console.log('User ID:', user.id);
  
  // Test auth debug endpoint
  console.log('\n=== Testing Auth Debug Endpoint ===');
  try {
    const debugResp = await fetch('http://localhost:3001/api/test-auth/debug', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const debugData = await debugResp.json();
    console.log('Auth debug response:', debugData);
  } catch (e) {
    console.error('Auth debug failed:', e);
  }
  
  // Test billing status
  console.log('\n=== Testing Billing Status ===');
  try {
    const billingResp = await fetch('http://localhost:3001/api/billing/status', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const billingData = await billingResp.json();
    console.log('Billing response:', billingData);
  } catch (e) {
    console.error('Billing check failed:', e);
  }
  
  // Test API keys endpoint
  console.log('\n=== Testing API Keys Endpoint ===');
  try {
    const keysResp = await fetch('http://localhost:3001/api/keys', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('Status:', keysResp.status);
    console.log('Status Text:', keysResp.statusText);
    
    const keysText = await keysResp.text();
    console.log('Raw response:', keysText);
    
    try {
      const keysData = JSON.parse(keysText);
      console.log('Parsed response:', keysData);
    } catch (e) {
      console.log('Response is not JSON');
    }
  } catch (e) {
    console.error('API keys check failed:', e);
  }
})();
```

Please share the console output, especially any error details from the API keys endpoint.
