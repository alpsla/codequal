#!/usr/bin/env node

import axios from 'axios';

const API_URL = 'http://localhost:3001';

async function testMCPToolsIntegration() {
  console.log('🔧 Testing MCP Tools Integration\n');
  console.log('API URL:', API_URL);
  
  try {
    console.log('1. Testing PR analysis with MCP tools...');
    
    const response = await axios.post(
      `${API_URL}/v1/analyze-pr`,
      {
        repositoryUrl: 'https://github.com/facebook/react',
        prNumber: 27804,
        analysisMode: 'quick',
        features: {
          security_analysis: true,
          code_quality: true
        }
      },
      {
        headers: {
          'X-API-Key': 'test_key',
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('\n✅ Analysis started successfully');
    console.log('Job ID:', response.data.job_id);
    console.log('Status:', response.data.status);
    
    // Check logs for MCP tool execution
    console.log('\n2. Checking server logs for MCP tool execution...');
    console.log('\nPlease check server.log for:');
    console.log('- "MCP tools for" log entries');
    console.log('- "MCP tools execution complete" messages');
    console.log('- "toolsExecuted" in the logs');
    
    console.log('\n✨ Test complete - Check server.log for MCP tool execution details');
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run the test
testMCPToolsIntegration();