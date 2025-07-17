#!/usr/bin/env node

import axios from 'axios';

const API_URL = 'http://localhost:3001';

async function testAllAgents() {
  console.log('🤖 Testing All Agents with MCP Tools Integration\n');
  console.log('API URL:', API_URL);
  
  try {
    console.log('1. Starting comprehensive analysis with ALL agents...');
    
    const response = await axios.post(
      `${API_URL}/v1/analyze-pr`,
      {
        repositoryUrl: 'https://github.com/facebook/react',
        prNumber: 27804,
        analysisMode: 'comprehensive', // This should trigger all agents
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
    
    console.log('\n✅ Comprehensive analysis started successfully');
    console.log('Job ID:', response.data.job_id);
    console.log('Status:', response.data.status);
    console.log('Analysis Mode:', response.data.analysisMode || 'comprehensive');
    
    console.log('\n2. Expected agents to run:');
    console.log('- Security (mcp-scan, semgrep-mcp, sonarqube)');
    console.log('- Code Quality (eslint-mcp, sonarqube, prettier-direct)');
    console.log('- Architecture (dependency-cruiser-direct, madge-direct, git-mcp)');
    console.log('- Performance (lighthouse-direct, sonarqube, bundlephobia-direct)');
    console.log('- Dependency (npm-audit-direct, license-checker-direct, outdated-direct)');
    console.log('- Educational (context-mcp, knowledge-graph-mcp, mcp-memory, web-search-mcp)');
    console.log('- Reporting (chartjs-mcp, mermaid-mcp, markdown-pdf-mcp, grafana-direct)');
    
    console.log('\n3. Please check server.log for:');
    console.log('- "MCP tools for" entries for ALL agent types');
    console.log('- "Agent analysis completed" for each agent');
    console.log('- "Stored result in Map" showing increasing result counts');
    console.log('- Final "successfulAgents" count (should be 5+ agents)');
    
    console.log('\n✨ Test complete - Check server.log for comprehensive agent execution');
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run the test
testAllAgents();