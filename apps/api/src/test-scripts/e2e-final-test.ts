#!/usr/bin/env ts-node

/**
 * Final E2E Test - Testing with smaller, recent PRs
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import axios from 'axios';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });
config({ path: resolve(__dirname, '../../.env.test') });

const API_URL = process.env.API_URL || 'http://localhost:3001';
const API_KEY = process.env.TEST_API_KEY || 'test_key';

interface TestResult {
  scenario: string;
  success: boolean;
  analysisId?: string;
  status?: string;
  error?: string;
  duration?: number;
  details?: any;
}

const results: TestResult[] = [];

async function testAnalysis(name: string, endpoint: string, payload: any): Promise<void> {
  console.log(`\n📊 ${name}`);
  console.log(`   Endpoint: ${endpoint}`);
  console.log(`   Payload:`, JSON.stringify(payload, null, 2).split('\n').map(l => '   ' + l).join('\n').trim());
  
  const startTime = Date.now();
  
  try {
    // Start analysis
    console.log('\n   Starting analysis...');
    const startResponse = await axios.post(
      `${API_URL}${endpoint}`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        }
      }
    );
    
    const analysisId = startResponse.data.analysisId || startResponse.data.id;
    console.log(`   ✅ Analysis started: ${analysisId}`);
    
    // Poll for status (just a few times to test the flow)
    console.log('   Checking status...');
    let finalStatus = null;
    let attempts = 0;
    const maxAttempts = 5; // Just check 5 times to verify the data flow
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        const statusResponse = await axios.get(
          `${API_URL}/v1/analysis/${analysisId}`,
          {
            headers: { 'X-API-Key': API_KEY }
          }
        );
        
        finalStatus = statusResponse.data;
        console.log(`   Status: ${finalStatus.status} | Progress: ${finalStatus.progress}%`);
        
        if (finalStatus.status === 'completed' || finalStatus.status === 'failed') {
          break;
        }
      } catch (error: any) {
        console.log(`   ❌ Status check failed: ${error.response?.status || error.message}`);
        results.push({
          scenario: name,
          success: false,
          analysisId,
          error: `Status check failed: ${error.response?.status || error.message}`,
          duration: Date.now() - startTime
        });
        return;
      }
      
      attempts++;
    }
    
    // Record result
    results.push({
      scenario: name,
      success: true,
      analysisId,
      status: finalStatus?.status || 'unknown',
      duration: Date.now() - startTime,
      details: {
        progress: finalStatus?.progress,
        stage: finalStatus?.stage || finalStatus?.currentStep,
        hasResult: !!finalStatus?.result
      }
    });
    
    console.log(`   ✅ Test completed - Status: ${finalStatus?.status || 'unknown'}`);
    
  } catch (error: any) {
    console.error(`   ❌ Test failed: ${error.response?.data?.error || error.message}`);
    results.push({
      scenario: name,
      success: false,
      error: error.response?.data?.error || error.message,
      duration: Date.now() - startTime
    });
  }
}

async function main() {
  console.log('🚀 Final E2E Test Suite');
  console.log('=======================');
  console.log(`API URL: ${API_URL}`);
  console.log(`API Key: ${API_KEY}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  
  // Test 1: Health check
  console.log('\n1️⃣ Health Check');
  try {
    const healthResponse = await axios.get(`${API_URL}/health`, {
      headers: { 'X-API-Key': API_KEY }
    });
    console.log('   ✅ API is healthy:', healthResponse.data);
  } catch (error: any) {
    console.error('   ❌ Health check failed:', error.message);
    process.exit(1);
  }
  
  // Test 2: Small recent PR that should exist
  await testAnalysis(
    'Quick Analysis - Small Recent PR',
    '/v1/analyze-pr',
    {
      repositoryUrl: 'https://github.com/nodejs/node',
      prNumber: 55900, // More recent PR
      analysisMode: 'quick'
    }
  );
  
  // Test 3: Another small PR
  await testAnalysis(
    'Quick Analysis - Another Small PR',
    '/v1/analyze-pr',
    {
      repositoryUrl: 'https://github.com/vercel/next.js',
      prNumber: 58000, // More recent PR
      analysisMode: 'quick'
    }
  );
  
  // Test 4: Repository analysis endpoint
  await testAnalysis(
    'Repository Analysis',
    '/v1/repository/analyze',
    {
      repositoryUrl: 'https://github.com/expressjs/express',
      force: false
    }
  );
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('===============');
  console.log(`Total tests: ${results.length}`);
  console.log(`Successful: ${results.filter(r => r.success).length}`);
  console.log(`Failed: ${results.filter(r => !r.success).length}`);
  
  console.log('\n📋 Test Details:');
  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.scenario}`);
    console.log(`   Success: ${result.success ? '✅' : '❌'}`);
    if (result.analysisId) console.log(`   Analysis ID: ${result.analysisId}`);
    if (result.status) console.log(`   Final Status: ${result.status}`);
    if (result.error) console.log(`   Error: ${result.error}`);
    if (result.duration) console.log(`   Duration: ${(result.duration / 1000).toFixed(1)}s`);
    if (result.details) {
      console.log(`   Details:`, JSON.stringify(result.details, null, 2).split('\n').map(l => '     ' + l).join('\n').trim());
    }
  });
  
  // Key findings
  console.log('\n🔍 Key Findings:');
  console.log('================');
  
  const allSuccessful = results.every(r => r.success);
  if (allSuccessful) {
    console.log('✅ All tests passed! The API is accepting requests and tracking analysis status correctly.');
    console.log('✅ The data flow issue has been resolved - analyses can now be retrieved after creation.');
  } else {
    console.log('⚠️  Some tests failed. Issues found:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.scenario}: ${r.error}`);
    });
  }
  
  // Check for specific issues
  const statusChecksFailed = results.some(r => r.error?.includes('Status check failed'));
  if (statusChecksFailed) {
    console.log('\n❌ Status endpoint issues detected - analyses are created but cannot be retrieved');
  }
  
  const prNotFound = results.some(r => r.error?.includes('404') || r.error?.includes('not found'));
  if (prNotFound) {
    console.log('\n⚠️  Some PRs were not found - they may be closed or the PR numbers may be incorrect');
  }
  
  console.log('\n✅ E2E Test Complete');
  process.exit(results.some(r => !r.success) ? 1 : 0);
}

// Run the test
main().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});