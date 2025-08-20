import axios from 'axios';
import * as fs from 'fs';

async function testRawDeepWikiAPI() {
  console.log('🔍 Testing Raw DeepWiki API Response\n');
  
  try {
    const response = await axios.post(
      'http://localhost:8001/analyze',
      {
        repo_url: 'https://github.com/sindresorhus/ky',
        branch: 'main'
      },
      {
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f'
        },
        timeout: 60000
      }
    );
    
    console.log('✅ Response received');
    console.log('Response type:', typeof response.data);
    console.log('Response keys:', Object.keys(response.data || {}));
    
    // Save full response
    fs.writeFileSync('deepwiki-raw-api-response.json', JSON.stringify(response.data, null, 2));
    console.log('\n📁 Full response saved to deepwiki-raw-api-response.json');
    
    if (response.data && response.data.issues) {
      console.log('\n📊 Issues Analysis:');
      console.log('Total issues:', response.data.issues.length);
      
      if (response.data.issues.length > 0) {
        console.log('\n🔍 First issue structure:');
        console.log(JSON.stringify(response.data.issues[0], null, 2));
      }
    }
    
  } catch (error: any) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.statusText);
      console.error('Response:', error.response.data);
    } else if (error.code === 'ECONNREFUSED') {
      console.error('❌ Cannot connect to DeepWiki at http://localhost:8001');
      console.error('Make sure port forwarding is active:');
      console.error('kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001');
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

testRawDeepWikiAPI();
