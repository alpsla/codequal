#!/usr/bin/env ts-node

/**
 * E2E Test Suite with Open PRs
 * Tests with currently open PRs to avoid branch deletion issues
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import axios, { AxiosError } from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });
config({ path: resolve(__dirname, '../../.env.test') });

const API_URL = process.env.API_URL || 'http://localhost:3001';
const API_KEY = process.env.TEST_API_KEY || 'test_key';

// Test scenarios with open PRs (as of late 2024)
const TEST_SCENARIOS = [
  {
    name: 'Quick PR Analysis - Open PR',
    endpoint: '/v1/analyze-pr',
    payload: {
      repositoryUrl: 'https://github.com/microsoft/vscode',
      prNumber: 210000, // Recent PR likely to be open
      analysisMode: 'quick'
    }
  },
  {
    name: 'Comprehensive PR Analysis - Open PR',
    endpoint: '/v1/analyze-pr',
    payload: {
      repositoryUrl: 'https://github.com/kubernetes/kubernetes',
      prNumber: 125000, // Recent PR likely to be open
      analysisMode: 'comprehensive'
    }
  },
  {
    name: 'Deep PR Analysis - Small Open PR',
    endpoint: '/v1/analyze-pr',
    payload: {
      repositoryUrl: 'https://github.com/golang/go',
      prNumber: 65000, // Recent PR likely to be open
      analysisMode: 'deep'
    }
  },
  {
    name: 'Repository Analysis',
    endpoint: '/v1/repository/analyze',
    payload: {
      repositoryUrl: 'https://github.com/nodejs/node',
      force: false
    }
  }
];

// Error tracking
interface ErrorLog {
  timestamp: string;
  scenario: string;
  stage: string;
  error: {
    message: string;
    stack?: string;
    code?: string;
    statusCode?: number;
    response?: any;
  };
  request?: {
    url: string;
    method: string;
    headers?: any;
    data?: any;
  };
}

const errors: ErrorLog[] = [];
const successfulAnalyses: any[] = [];

// Monitoring functions
function logError(scenario: string, stage: string, error: any, request?: any) {
  const errorLog: ErrorLog = {
    timestamp: new Date().toISOString(),
    scenario,
    stage,
    error: {
      message: error.message || String(error),
      stack: error.stack,
      code: error.code,
      statusCode: error.response?.status,
      response: error.response?.data
    },
    request
  };
  
  errors.push(errorLog);
  console.error(`\n❌ Error in ${scenario} at ${stage}:`);
  console.error(`   Message: ${errorLog.error.message}`);
  if (errorLog.error.statusCode) {
    console.error(`   Status: ${errorLog.error.statusCode}`);
  }
  if (errorLog.error.stack) {
    console.error(`   Stack trace saved to error log`);
  }
}

// Test execution functions
async function testHealthCheck(): Promise<boolean> {
  console.log('\n🏥 Testing API Health...');
  
  try {
    const response = await axios.get(`${API_URL}/health`, {
      headers: { 'X-API-Key': API_KEY }
    });
    
    console.log('   ✅ API is healthy');
    console.log(`   Version: ${response.data.version}`);
    console.log(`   Environment: ${response.data.environment || 'unknown'}`);
    return true;
  } catch (error: any) {
    logError('Health Check', 'API Request', error, {
      url: `${API_URL}/health`,
      method: 'GET',
      headers: { 'X-API-Key': '***' }
    });
    return false;
  }
}

async function testEndpoints(): Promise<void> {
  console.log('\n🔍 Testing Available Endpoints...');
  
  const endpoints = [
    { path: '/v1/monitoring/health', name: 'Monitoring Health' },
    { path: '/v1/vector/search', name: 'Vector Search' },
    { path: '/v1/admin/stats', name: 'Admin Stats' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(`${API_URL}${endpoint.path}`, {
        headers: { 'X-API-Key': API_KEY }
      });
      console.log(`   ✅ ${endpoint.name}: Available (${response.status})`);
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log(`   ⚠️  ${endpoint.name}: Not implemented (404)`);
      } else if (error.response?.status === 401) {
        console.log(`   🔒 ${endpoint.name}: Requires authentication`);
      } else {
        console.log(`   ❌ ${endpoint.name}: Error ${error.response?.status || error.message}`);
      }
    }
  }
}

async function runAnalysisScenario(scenario: typeof TEST_SCENARIOS[0]): Promise<void> {
  console.log(`\n📊 Testing: ${scenario.name}`);
  console.log(`   Endpoint: ${scenario.endpoint}`);
  console.log(`   Payload:`, JSON.stringify(scenario.payload, null, 2).split('\n').map(l => '   ' + l).join('\n').trim());
  
  try {
    // Start analysis
    console.log('\n   1️⃣ Starting analysis...');
    const startResponse = await axios.post(
      `${API_URL}${scenario.endpoint}`,
      scenario.payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        }
      }
    );
    
    const analysisId = startResponse.data.analysisId || startResponse.data.id;
    console.log(`   ✅ Analysis started: ${analysisId}`);
    
    // For repository analysis, we might get immediate results
    if (scenario.endpoint === '/v1/repository/analyze' && startResponse.data.status === 'completed') {
      console.log('   ✅ Repository analysis completed immediately (cached)');
      successfulAnalyses.push({
        scenario: scenario.name,
        analysisId,
        result: startResponse.data
      });
      return;
    }
    
    // Poll for completion
    console.log('\n   2️⃣ Polling for results...');
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes max for longer analyses
    let completed = false;
    let finalStatus = null;
    
    while (attempts < maxAttempts && !completed) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        const statusResponse = await axios.get(
          `${API_URL}/v1/analysis/${analysisId}`,
          {
            headers: { 'X-API-Key': API_KEY }
          }
        );
        
        const { status, progress } = statusResponse.data;
        process.stdout.write(`\r   Progress: ${progress || 0}% | Status: ${status} (${attempts + 1}/${maxAttempts})`);
        
        if (status === 'completed' || status === 'failed') {
          completed = true;
          finalStatus = statusResponse.data;
          console.log(''); // New line after progress
        }
      } catch (pollError: any) {
        if (pollError.response?.status !== 404) {
          logError(scenario.name, 'Status Polling', pollError, {
            url: `${API_URL}/v1/analysis/${analysisId}`,
            method: 'GET'
          });
        }
      }
      
      attempts++;
    }
    
    if (!completed) {
      console.log('\n   ⏱️  Analysis timed out');
      return;
    }
    
    // Verify results
    console.log('\n   3️⃣ Verifying results...');
    if (finalStatus?.status === 'completed') {
      console.log('   ✅ Analysis completed successfully');
      
      successfulAnalyses.push({
        scenario: scenario.name,
        analysisId,
        result: finalStatus
      });
      
      // Check for result data
      if (finalStatus.result) {
        const resultKeys = Object.keys(finalStatus.result);
        console.log(`   📋 Result contains: ${resultKeys.join(', ')}`);
        
        // Check for expected fields based on analysis type
        if (scenario.endpoint === '/v1/analyze-pr') {
          const prResult = finalStatus.result;
          console.log(`   📊 PR Analysis Details:`);
          console.log(`      - Quality Score: ${prResult.qualityScore || 'N/A'}`);
          console.log(`      - Risk Level: ${prResult.riskLevel || 'N/A'}`);
          console.log(`      - Files Changed: ${prResult.filesChanged || 'N/A'}`);
          console.log(`      - Lines Changed: ${prResult.linesAdded || 0} added, ${prResult.linesDeleted || 0} deleted`);
          
          if (prResult.findings) {
            const findingTypes = Object.keys(prResult.findings);
            console.log(`      - Finding Types: ${findingTypes.join(', ')}`);
          }
          
          // Test deep analysis specific features
          if (scenario.payload.analysisMode === 'deep') {
            console.log('\n   4️⃣ Testing deep analysis features...');
            if (prResult.deepAnalysis) {
              console.log(`      - Deep Analysis Available: Yes`);
              console.log(`      - Components: ${Object.keys(prResult.deepAnalysis).join(', ')}`);
            } else {
              console.log(`      - Deep Analysis Available: No`);
            }
          }
        }
      } else {
        console.log('   ⚠️  No result data in response');
      }
    } else {
      console.log(`   ❌ Analysis failed: ${finalStatus?.error || 'Unknown error'}`);
      if (finalStatus?.stackTrace) {
        logError(scenario.name, 'Analysis Failed', {
          message: finalStatus.error,
          stack: finalStatus.stackTrace
        });
      }
    }
    
  } catch (error: any) {
    logError(scenario.name, 'Analysis Request', error, {
      url: `${API_URL}${scenario.endpoint}`,
      method: 'POST',
      data: scenario.payload
    });
  }
}

async function saveTestReport(): Promise<void> {
  const report = {
    timestamp: new Date().toISOString(),
    apiUrl: API_URL,
    summary: {
      totalTests: TEST_SCENARIOS.length,
      successful: successfulAnalyses.length,
      failed: errors.length,
      successRate: `${Math.round((successfulAnalyses.length / TEST_SCENARIOS.length) * 100)}%`
    },
    successfulAnalyses,
    errors
  };
  
  const reportPath = path.join(__dirname, `../../e2e-test-report-${Date.now()}.json`);
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  
  console.log('\n📊 Test Summary:');
  console.log(`   Total Tests: ${report.summary.totalTests}`);
  console.log(`   Successful: ${report.summary.successful}`);
  console.log(`   Failed: ${report.summary.failed}`);
  console.log(`   Success Rate: ${report.summary.successRate}`);
  console.log(`\n📄 Full report saved to: ${reportPath}`);
  
  if (errors.length > 0) {
    console.log('\n🔍 Error Summary:');
    const errorsByScenario = errors.reduce((acc, err) => {
      acc[err.scenario] = (acc[err.scenario] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(errorsByScenario).forEach(([scenario, count]) => {
      console.log(`   ${scenario}: ${count} errors`);
    });
  }
}

// Main execution
async function main() {
  console.log('🚀 E2E Test Suite with Open PRs');
  console.log('=====================================');
  console.log(`API URL: ${API_URL}`);
  console.log(`Test Key: ${API_KEY}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  
  // Run tests
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    console.log('\n⚠️  API health check failed, exiting...');
    process.exit(1);
  }
  
  await testEndpoints();
  
  // Run all scenarios
  for (const scenario of TEST_SCENARIOS) {
    await runAnalysisScenario(scenario);
  }
  
  // Save report
  await saveTestReport();
  
  console.log('\n✅ E2E test complete!');
  process.exit(errors.length > 0 ? 1 : 0);
}

// Run tests
main().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});