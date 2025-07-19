import axios from 'axios';
import { config } from 'dotenv';
import * as path from 'path';

// Load environment variables
config({ path: path.join(__dirname, '../../.env') });

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const TEST_API_KEY = 'test_key';

async function testDeepWikiConnection() {
  console.log('🧪 Testing DeepWiki Connection...\n');

  try {
    // Test 1: Simple PR analysis that triggers DeepWiki
    console.log('📋 Test 1: Triggering PR analysis with DeepWiki...');
    
    const prAnalysisResponse = await axios.post(
      `${API_BASE_URL}/v1/analyze-pr`,
      {
        repositoryUrl: 'https://github.com/vercel/next.js',
        prNumber: 59000,
        analysisMode: 'quick'
      },
      {
        headers: {
          'X-API-Key': TEST_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ PR Analysis triggered successfully!');
    console.log('Response:', JSON.stringify(prAnalysisResponse.data, null, 2));

    const analysisId = prAnalysisResponse.data.analysisId;
    console.log(`\n📊 Analysis ID: ${analysisId}`);

    // Wait a bit and check analysis status
    console.log('\n⏳ Waiting 10 seconds before checking status...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Test 2: Check analysis status
    console.log('\n📋 Test 2: Checking analysis status...');
    
    try {
      const statusResponse = await axios.get(
        `${API_BASE_URL}/v1/analysis/${analysisId}`,
        {
          headers: {
            'X-API-Key': TEST_API_KEY
          }
        }
      );

      console.log('✅ Status retrieved successfully!');
      console.log('Status:', JSON.stringify(statusResponse.data, null, 2));

      // Check if DeepWiki was triggered
      if (statusResponse.data.processingSteps?.includes('Triggering repository analysis')) {
        console.log('\n🎉 DeepWiki integration confirmed! Repository analysis was triggered.');
      }

    } catch (statusError: any) {
      if (statusError.response?.status === 404) {
        console.log('⚠️  Analysis not found yet (404) - this is expected for quick checks');
      } else {
        console.error('❌ Error checking status:', statusError.message);
      }
    }

  } catch (error: any) {
    console.error('\n❌ Test failed!');
    console.error('Error:', error.response?.data || error.message);
    
    if (error.message.includes('DeepWiki service unavailable')) {
      console.log('\n💡 DeepWiki connection issue detected!');
      console.log('Make sure:');
      console.log('1. DeepWiki pod is running in codequal-dev namespace');
      console.log('2. kubectl is configured correctly');
      console.log('3. DEEPWIKI_NAMESPACE=codequal-dev is set in .env');
    }
  }

  console.log('\n✅ DeepWiki connection test completed!');
}

// Run the test
testDeepWikiConnection().catch(console.error);