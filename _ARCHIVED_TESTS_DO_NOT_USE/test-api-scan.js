const fetch = require('node-fetch');

// Configuration
const API_BASE_URL = 'http://localhost:3001';
const EMAIL = 'rostislav.alpin@gmail.com'; // Your subscribed account
const PASSWORD = 'your-password'; // Replace with your actual password

async function testAPIScan() {
  try {
    console.log('🔐 Step 1: Authenticating...');
    
    // First, sign in to get an access token
    const signinResponse = await fetch(`${API_BASE_URL}/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: EMAIL,
        password: PASSWORD
      })
    });

    const signinData = await signinResponse.json();
    
    if (!signinData.session?.access_token) {
      console.error('❌ Failed to authenticate:', signinData);
      console.log('\nPlease update the PASSWORD variable in this script with your actual password.');
      return;
    }

    const accessToken = signinData.session.access_token;
    console.log('✅ Authentication successful!');
    console.log('   Access token:', accessToken.substring(0, 20) + '...');

    // Step 2: Perform a scan using the API
    console.log('\n🔍 Step 2: Performing API scan...');
    
    const scanResponse = await fetch(`${API_BASE_URL}/api/simple-scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        repositoryUrl: 'https://github.com/facebook/react/pull/27513'
      })
    });

    if (!scanResponse.ok) {
      const errorData = await scanResponse.json();
      console.error('❌ Scan failed:', errorData);
      return;
    }

    const scanResult = await scanResponse.json();
    console.log('✅ Scan completed successfully!');
    console.log('\n📊 Scan Results:');
    console.log('   Report URL:', scanResult.reportUrl);
    console.log('   Analysis ID:', scanResult.analysisId);
    console.log('   Repository:', scanResult.repository);
    console.log('   Status:', scanResult.status);

    // Step 3: Check billing status to see remaining scans
    console.log('\n💳 Step 3: Checking billing status...');
    
    const billingResponse = await fetch(`${API_BASE_URL}/api/billing/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const billingData = await billingResponse.json();
    console.log('✅ Billing status retrieved:');
    console.log('   Subscription Tier:', billingData.subscription?.tier);
    console.log('   Subscription Status:', billingData.subscription?.status);
    
    // Note: For proper scan counting with monthly limits, you'd need to implement
    // a separate counter for subscription scans (not using trial_scans_used)
    
    console.log('\n🎉 API scan test completed successfully!');
    console.log('\n📚 API Documentation:');
    console.log('   - Use Bearer token authentication');
    console.log('   - Endpoint: POST /api/simple-scan');
    console.log('   - Body: { "repositoryUrl": "PR or repo URL" }');
    console.log('   - Returns: { reportUrl, analysisId, status, ... }');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Alternative: Using API Key (if implemented)
async function testAPIKeyAccess() {
  console.log('\n🔑 Alternative: API Key Authentication');
  console.log('   API keys can be generated from the dashboard');
  console.log('   Usage: Add "X-API-Key: your-api-key" header');
  console.log('   This provides a more secure way for programmatic access');
}

// Run the test
console.log('=== CodeQual API Scan Test ===\n');
testAPIScan().then(() => {
  testAPIKeyAccess();
});