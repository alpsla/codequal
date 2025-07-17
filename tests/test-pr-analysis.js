#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3001';
const API_KEY = 'test_key';

async function testPRAnalysis() {
  console.log('Testing PR analysis...');
  
  try {
    // Test PR analysis
    const prPayload = {
      repositoryUrl: 'https://github.com/facebook/react',
      prNumber: 25000,
      analysisMode: 'quick'
    };
    
    console.log('Sending PR analysis request...');
    const response = await axios.post(
      `${API_URL}/v1/analyze-pr`,
      prPayload,
      {
        headers: {
          'X-API-Key': API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    // Save the report
    if (response.data.report) {
      const reportPath = path.join(__dirname, 'pr-analysis-report.html');
      fs.writeFileSync(reportPath, response.data.report);
      console.log(`Report saved to: ${reportPath}`);
    }
    
    // Check if the report has actual findings
    if (response.data.report) {
      const hasFindings = response.data.report.includes('class="finding-item"') || 
                         response.data.report.includes('Findings') ||
                         response.data.report.includes('recommendations');
      console.log('Report contains findings:', hasFindings);
      
      // Check for agent results
      const hasAgentResults = response.data.report.includes('Security Analysis') ||
                             response.data.report.includes('Code Quality') ||
                             response.data.report.includes('Dependencies');
      console.log('Report contains agent results:', hasAgentResults);
    }
    
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
    process.exit(1);
  }
}

testPRAnalysis();