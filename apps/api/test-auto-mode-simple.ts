#!/usr/bin/env node

import axios from 'axios';

const API_URL = 'http://localhost:3001';

async function testAutoModeWithSimplePR() {
  console.log('🤖 Testing Auto Mode with Different PR Types\n');
  
  // Test with a smaller, simpler PR (likely to trigger quick mode)
  try {
    console.log('Testing with a smaller React PR #28449 (recent small change)...\n');
    
    const response = await axios.post(
      `${API_URL}/v1/analyze-pr`,
      {
        repositoryUrl: 'https://github.com/facebook/react',
        prNumber: 28449, // A recent smaller PR
        analysisMode: 'auto'
      },
      {
        headers: {
          'X-API-Key': 'test_key',
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Success! Analysis started');
    console.log('Analysis ID:', response.data.analysisId);
    console.log('\n📋 This smaller PR should trigger either quick or comprehensive mode');
    console.log('Check server.log for the automatic mode selection');
    
  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testAutoModeWithSimplePR();