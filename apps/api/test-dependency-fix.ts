#!/usr/bin/env node

import axios from 'axios';

const API_URL = 'http://localhost:3001';

async function testDependencyAgent() {
  console.log('🔍 Testing Dependency Agent Fix\n');
  
  try {
    // Test with deep mode which should include dependency agent
    console.log('1. Testing deep analysis mode (includes dependency agent)...');
    
    const response = await axios.post(
      `${API_URL}/v1/analyze-pr`,
      {
        repositoryUrl: 'https://github.com/facebook/react',
        prNumber: 27804,
        analysisMode: 'deep', // Deep mode should include dependency agent
        features: {
          security_analysis: true,
          code_quality: true,
          architecture_analysis: true,
          performance_analysis: true,
          dependency_analysis: true,
          educational_content: true,
          generate_report: true
        }
      },
      {
        headers: {
          'X-API-Key': 'test_key',
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('\n✅ Deep analysis started successfully');
    console.log('Analysis Mode:', response.data.analysisMode || 'deep');
    
    console.log('\n2. Expected agents in deep mode:');
    console.log('- Security');
    console.log('- Architecture'); 
    console.log('- Performance');
    console.log('- Code Quality');
    console.log('- Dependency (should work now!)');
    console.log('- Educational');
    console.log('- Reporting');
    
    console.log('\n3. Check server.log for:');
    console.log('- "selectedAgents:" showing dependency');
    console.log('- "MCP tools for dependency"');
    console.log('- "dependency.*completed" (not dependencies)');
    
    console.log('\n✨ Test complete - Check server.log for dependency agent execution');
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run the test
testDependencyAgent();