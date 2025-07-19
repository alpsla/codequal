import axios from 'axios';
import { config } from 'dotenv';
import * as path from 'path';

// Load environment variables
config({ path: path.join(__dirname, '../../.env') });

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const TEST_API_KEY = 'test_key';

async function testDeepWikiPod() {
  console.log('🧪 Testing DeepWiki Pod Connection...\n');

  try {
    // Test: Repository analysis (should use DeepWiki pod for main branch)
    console.log('📋 Triggering repository analysis to test DeepWiki pod...');
    
    const repoAnalysisResponse = await axios.post(
      `${API_BASE_URL}/v1/repository/analyze`,
      {
        repositoryUrl: 'https://github.com/expressjs/express',
        force: true
      },
      {
        headers: {
          'X-API-Key': TEST_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Repository Analysis triggered successfully!');
    console.log('Response:', JSON.stringify(repoAnalysisResponse.data, null, 2));

    const jobId = repoAnalysisResponse.data.jobId || repoAnalysisResponse.data.analysisId;
    console.log(`\n📊 Job ID: ${jobId}`);

    // Monitor the logs to see DeepWiki pod interaction
    console.log('\n⏳ Waiting 15 seconds to observe DeepWiki pod interaction...');
    console.log('Check the API logs for:');
    console.log('- "[DeepWiki] Using pod: <pod-name>"');
    console.log('- Port forwarding setup');
    console.log('- API calls to localhost:8001');
    
    await new Promise(resolve => setTimeout(resolve, 15000));

    console.log('\n✅ Test completed!');
    console.log('\nTo verify DeepWiki pod was used, check the API logs for pod connection details.');
    console.log('If you see "DeepWiki service unavailable", the pod connection failed.');

  } catch (error: any) {
    console.error('\n❌ Test failed!');
    console.error('Error:', error.response?.data || error.message);
    console.error('Full error:', JSON.stringify(error.response?.data || error, null, 2));
    
    if (error.message?.includes('DeepWiki service unavailable')) {
      console.log('\n💡 DeepWiki pod connection issue detected!');
      console.log('Troubleshooting steps:');
      console.log('1. Check pod status: kubectl get pods -n codequal-dev');
      console.log('2. Check pod logs: kubectl logs <pod-name> -n codequal-dev');
      console.log('3. Verify kubectl context: kubectl config current-context');
      console.log('4. Test port forwarding manually: kubectl port-forward -n codequal-dev pod/<pod-name> 8001:8001');
    }
  }

  console.log('\n✅ DeepWiki pod connection test completed!');
}

// Run the test
testDeepWikiPod().catch(console.error);