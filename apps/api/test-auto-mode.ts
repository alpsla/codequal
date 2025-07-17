#!/usr/bin/env node

import axios from 'axios';

const API_URL = 'http://localhost:3001';

async function testAutoMode() {
  console.log('🤖 Testing Automatic Mode Selection\n');
  
  try {
    console.log('Sending PR analysis request with analysisMode: "auto"...\n');
    
    const response = await axios.post(
      `${API_URL}/v1/analyze-pr`,
      {
        repositoryUrl: 'https://github.com/facebook/react',
        prNumber: 27804,
        analysisMode: 'auto' // Let the system automatically decide
      },
      {
        headers: {
          'X-API-Key': 'test_key',
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Success! Analysis started with automatic mode selection');
    console.log('Analysis ID:', response.data.analysisId);
    console.log('Status:', response.data.status);
    console.log('\n📋 Check server.log to see:');
    console.log('- The automatically selected mode (quick/comprehensive/deep)');
    console.log('- The reasoning behind the selection');
    console.log('- Which agents were selected based on the mode');
    
  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testAutoMode();