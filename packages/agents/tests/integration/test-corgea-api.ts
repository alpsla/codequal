/**
 * Test Corgea API Access
 *
 * Verifies if the current CORGEA_API_KEY has API access.
 *
 * Run: npx ts-node tests/integration/test-corgea-api.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const CORGEA_API_KEY = process.env.CORGEA_API_KEY;
// Use www.corgea.app - api.corgea.app returns 522 timeout
const CORGEA_BASE_URL = 'https://www.corgea.app/api/v1';

async function testCorgeaAPI() {
  console.log('=== Testing Corgea API Access ===\n');

  if (!CORGEA_API_KEY) {
    console.log('❌ CORGEA_API_KEY not set in environment');
    console.log('   Add CORGEA_API_KEY to packages/agents/.env');
    return;
  }

  console.log(`API Key: ${CORGEA_API_KEY.substring(0, 8)}...${CORGEA_API_KEY.slice(-4)}`);
  console.log(`Base URL: ${CORGEA_BASE_URL}`);

  // Test 1: Verify token
  console.log('\n1. Testing /verify endpoint...');
  try {
    const verifyResponse = await fetch(`${CORGEA_BASE_URL}/verify`, {
      method: 'GET',
      headers: {
        'CORGEA-TOKEN': CORGEA_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    console.log(`   Status: ${verifyResponse.status} ${verifyResponse.statusText}`);

    if (verifyResponse.ok) {
      const data = await verifyResponse.json() as Record<string, any>;
      console.log('   ✅ API Key is valid!');
      console.log(`   Response: ${JSON.stringify(data, null, 2)}`);

      if (data.rate_limit) {
        console.log('\n   Rate Limits:');
        console.log(`     Limit: ${data.rate_limit.limit}`);
        console.log(`     Remaining: ${data.rate_limit.remaining}`);
        console.log(`     Reset: ${new Date(data.rate_limit.reset_at).toISOString()}`);
      }

      if (data.user) {
        console.log('\n   User Info:');
        console.log(`     Email: ${data.user.email}`);
        console.log(`     Organization: ${data.user.organization}`);
      }
    } else {
      const errorText = await verifyResponse.text();
      console.log('   ❌ API Key verification failed');
      console.log(`   Error: ${errorText}`);
    }
  } catch (error: any) {
    console.log(`   ❌ Request failed: ${error.message}`);
  }

  // Test 2: Try to list scans (requires API access)
  console.log('\n2. Testing /scans endpoint (requires API access)...');
  try {
    const scansResponse = await fetch(`${CORGEA_BASE_URL}/scans?page=1&page_size=1`, {
      method: 'GET',
      headers: {
        'CORGEA-TOKEN': CORGEA_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    console.log(`   Status: ${scansResponse.status} ${scansResponse.statusText}`);

    if (scansResponse.ok) {
      const data = await scansResponse.json() as Record<string, any>;
      console.log('   ✅ API access confirmed!');
      console.log(`   Total scans: ${data.total || data.data?.length || 0}`);
    } else if (scansResponse.status === 403) {
      console.log('   ❌ API access denied (403 Forbidden)');
      console.log('   This likely means Enterprise plan is required for API access');
    } else if (scansResponse.status === 401) {
      console.log('   ❌ Unauthorized (401) - Invalid API key');
    } else {
      const errorText = await scansResponse.text();
      console.log(`   ⚠️ Unexpected response: ${errorText}`);
    }
  } catch (error: any) {
    console.log(`   ❌ Request failed: ${error.message}`);
  }

  // Test 3: Try CLI endpoint (might have different access rules)
  console.log('\n3. Testing /cli/verify endpoint (CLI access)...');
  try {
    const cliResponse = await fetch(`${CORGEA_BASE_URL}/cli/verify/${CORGEA_API_KEY}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`   Status: ${cliResponse.status} ${cliResponse.statusText}`);

    if (cliResponse.ok) {
      const data = await cliResponse.json();
      console.log('   ✅ CLI access works!');
      console.log(`   Response: ${JSON.stringify(data, null, 2)}`);
    } else {
      const errorText = await cliResponse.text();
      console.log(`   Response: ${errorText}`);
    }
  } catch (error: any) {
    console.log(`   ❌ Request failed: ${error.message}`);
  }

  console.log('\n=== Test Complete ===');
  console.log('\nSummary:');
  console.log('- If /verify works but /scans returns 403: Enterprise needed for full API');
  console.log('- If /cli/verify works: CLI-based integration might be possible');
  console.log('- For our use case (programmatic fixes): We need scan-upload + issues API');
}

testCorgeaAPI().catch(console.error);
