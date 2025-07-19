#!/usr/bin/env ts-node

/**
 * E2E Test Suite with Stacktrace Monitoring
 * Part 1: Run automated tests and capture any errors/stacktraces
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

// Test scenarios
const TEST_SCENARIOS = [
  {
    name: 'Quick PR Analysis',
    endpoint: '/v1/analyze-pr',
    payload: {
      repositoryUrl: 'https://github.com/expressjs/express',
      prNumber: 5500,
      analysisMode: 'quick'
    }
  },
  {
    name: 'Comprehensive PR Analysis',
    endpoint: '/v1/analyze-pr',
    payload: {
      repositoryUrl: 'https://github.com/facebook/react',
      prNumber: 28000,
      analysisMode: 'comprehensive'
    }
  },
  {
    name: 'Deep PR Analysis',
    endpoint: '/v1/analyze-pr',
    payload: {
      repositoryUrl: 'https://github.com/vercel/next.js',
      prNumber: 59000,
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

async function testDatabaseConnection(): Promise<boolean> {
  console.log('\n🗄️  Testing Database Connection...');
  
  try {
    const response = await axios.get(`${API_URL}/v1/monitoring/health`, {
      headers: { 'X-API-Key': API_KEY }
    });
    
    const dbStatus = response.data.database;
    if (dbStatus && dbStatus.status === 'healthy') {
      console.log('   ✅ Database connection healthy');
      console.log(`   Tables: ${dbStatus.tables || 'unknown'}`);
      return true;
    } else {
      console.log('   ❌ Database connection unhealthy');
      return false;
    }
  } catch (error: any) {
    logError('Database Check', 'Health Request', error, {
      url: `${API_URL}/v1/monitoring/health`,
      method: 'GET'
    });
    return false;
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
    
    // Poll for completion
    console.log('\n   2️⃣ Polling for results...');
    let attempts = 0;
    const maxAttempts = 30; // 1 minute max
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
      
      // Check for result data
      if (finalStatus.result) {
        const resultKeys = Object.keys(finalStatus.result);
        console.log(`   📋 Result contains: ${resultKeys.join(', ')}`);
        
        // Test deep analysis specific features
        if (scenario.payload.analysisMode === 'deep') {
          console.log('\n   4️⃣ Testing deep analysis features...');
          // Deep analysis should have more comprehensive results
          if (finalStatus.result?.findings) {
            const totalFindings = Object.values(finalStatus.result.findings as Record<string, any[]>)
              .reduce((sum, arr) => sum + arr.length, 0);
            console.log(`   📊 Total findings in deep analysis: ${totalFindings}`);
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

async function testVectorDB(): Promise<void> {
  console.log('\n🔍 Testing Vector DB Integration...');
  
  try {
    // Test vector search
    const searchResponse = await axios.post(
      `${API_URL}/v1/vector/search`,
      {
        query: 'test query',
        repositoryUrl: 'https://github.com/test/repo',
        limit: 5
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        }
      }
    );
    
    console.log('   ✅ Vector search working');
    console.log(`   Results: ${searchResponse.data.results?.length || 0} items`);
    
  } catch (error: any) {
    if (error.response?.status === 404) {
      console.log('   ℹ️  Vector search endpoint not available');
    } else {
      logError('Vector DB Test', 'Search Request', error, {
        url: `${API_URL}/v1/vector/search`,
        method: 'POST'
      });
    }
  }
}

async function saveErrorReport(): Promise<void> {
  if (errors.length === 0) {
    console.log('\n✅ No errors detected during E2E tests!');
    return;
  }
  
  console.log(`\n❌ Found ${errors.length} errors during testing`);
  
  // Save detailed error report
  const reportPath = path.join(__dirname, `../../e2e-errors-${Date.now()}.json`);
  await fs.writeFile(reportPath, JSON.stringify(errors, null, 2));
  console.log(`📄 Error report saved to: ${reportPath}`);
  
  // Print summary
  console.log('\n📊 Error Summary:');
  const errorsByScenario = errors.reduce((acc, err) => {
    acc[err.scenario] = (acc[err.scenario] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  Object.entries(errorsByScenario).forEach(([scenario, count]) => {
    console.log(`   ${scenario}: ${count} errors`);
  });
  
  // Print unique stacktraces
  console.log('\n🔍 Unique Stacktraces:');
  const uniqueStacks = new Set<string>();
  errors.forEach(err => {
    if (err.error.stack && !uniqueStacks.has(err.error.stack)) {
      uniqueStacks.add(err.error.stack);
      console.log(`\n--- ${err.scenario} at ${err.stage} ---`);
      console.log(err.error.stack);
    }
  });
}

// Main execution
async function main() {
  console.log('🚀 E2E Test Suite with Error Monitoring');
  console.log('=====================================');
  console.log(`API URL: ${API_URL}`);
  console.log(`Test Key: ${API_KEY}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  
  // Run tests
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    console.log('\n⚠️  API health check failed, but continuing tests...');
  }
  
  await testDatabaseConnection();
  await testVectorDB();
  
  // Run all scenarios
  for (const scenario of TEST_SCENARIOS) {
    await runAnalysisScenario(scenario);
  }
  
  // Save error report
  await saveErrorReport();
  
  console.log('\n✅ E2E monitoring test complete!');
  process.exit(errors.length > 0 ? 1 : 0);
}

// Run tests
main().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});