const fetch = require('node-fetch');

/**
 * Complete CodeQual API Example
 * Demonstrates both Bearer token and API key authentication
 */

const API_BASE = 'http://localhost:3001';

// Option 1: Using Bearer Token (for web-based API access)
async function testWithBearerToken(email, password) {
  console.log('\n=== Testing with Bearer Token ===');
  
  try {
    // 1. Sign in to get access token
    const signinResponse = await fetch(`${API_BASE}/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const signinData = await signinResponse.json();
    
    if (!signinData.session?.access_token) {
      console.error('❌ Failed to sign in:', signinData);
      return;
    }

    const accessToken = signinData.session.access_token;
    console.log('✅ Signed in successfully');

    // 2. Perform a scan
    console.log('\n🔍 Performing scan...');
    const scanResponse = await fetch(`${API_BASE}/api/simple-scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        repositoryUrl: 'https://github.com/vercel/next.js/pull/58825'
      })
    });

    const scanData = await scanResponse.json();
    
    // Check response headers for API usage info
    const remaining = scanResponse.headers.get('X-API-Calls-Remaining');
    const limit = scanResponse.headers.get('X-API-Calls-Limit');
    
    console.log('✅ Scan result:', {
      status: scanResponse.status,
      reportUrl: scanData.reportUrl,
      analysisId: scanData.analysisId
    });
    
    if (remaining && limit) {
      console.log(`📊 API Usage: ${limit - remaining}/${limit} calls used this month`);
    }

    // 3. Check billing status
    const billingResponse = await fetch(`${API_BASE}/api/billing/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const billingData = await billingResponse.json();
    console.log('\n💳 Billing Status:', {
      tier: billingData.subscription?.tier,
      status: billingData.subscription?.status
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Option 2: Using API Key (for programmatic access)
async function testWithApiKey() {
  console.log('\n=== Testing with API Key ===');
  console.log('First, create an API key at http://localhost:3000/api-keys');
  
  const apiKey = process.env.CODEQUAL_API_KEY;
  
  if (!apiKey) {
    console.log('⚠️  Set CODEQUAL_API_KEY environment variable first');
    console.log('   Example: export CODEQUAL_API_KEY="cq_live_..."');
    return;
  }

  try {
    // Use the v1 API endpoints with API key
    const response = await fetch(`${API_BASE}/v1/analyze-pr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: JSON.stringify({
        repositoryUrl: 'https://github.com/facebook/react/pull/27513'
      })
    });

    const data = await response.json();
    
    // Check response headers for API usage info
    const remaining = response.headers.get('X-API-Calls-Remaining');
    const limit = response.headers.get('X-API-Calls-Limit');
    const resetDate = response.headers.get('X-API-Calls-Reset');
    
    if (response.ok) {
      console.log('✅ Analysis started:', {
        analysisId: data.analysisId,
        status: data.status
      });
      
      if (remaining && limit) {
        console.log(`📊 API Usage: ${limit - remaining}/${limit} calls used`);
        console.log(`   Resets on: ${new Date(resetDate).toLocaleDateString()}`);
      }
    } else {
      console.log('❌ API Error:', data);
      
      if (data.code === 'API_LIMIT_EXCEEDED') {
        console.log(`   You've used all ${data.details.limit} API calls this month`);
        console.log(`   Limit resets on: ${new Date(data.details.reset_date).toLocaleDateString()}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Main execution
async function main() {
  console.log('=== CodeQual API Test Suite ===');
  console.log('\nThis example demonstrates:');
  console.log('1. Bearer token auth (for web integration)');
  console.log('2. API key auth (for CI/CD and automation)');
  console.log('3. Usage tracking and limits');
  
  // Test with bearer token
  const email = process.env.CODEQUAL_EMAIL || 'rostislav.alpin@gmail.com';
  const password = process.env.CODEQUAL_PASSWORD;
  
  if (password) {
    await testWithBearerToken(email, password);
  } else {
    console.log('\n⚠️  Set CODEQUAL_PASSWORD to test bearer token auth');
  }
  
  // Test with API key
  await testWithApiKey();
  
  console.log('\n📚 API Documentation:');
  console.log('   Bearer Token: Use /api/* endpoints');
  console.log('   API Key: Use /v1/* endpoints');
  console.log('   Both count towards your monthly limit');
  console.log('   Individual Plan: 50 calls/month');
  console.log('   API Plan: 1000 calls/month');
  console.log('   Team Plan: Unlimited');
}

// Run the tests
main().catch(console.error);