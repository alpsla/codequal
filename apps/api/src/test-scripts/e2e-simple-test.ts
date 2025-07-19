#!/usr/bin/env ts-node

/**
 * Simple E2E Test to identify remaining issues
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import axios from 'axios';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });
config({ path: resolve(__dirname, '../../.env.test') });

const API_URL = process.env.API_URL || 'http://localhost:3001';
const API_KEY = process.env.TEST_API_KEY || 'test_key';

async function testSimplePR() {
  console.log('🚀 Simple E2E Test');
  console.log('==================');
  console.log(`API URL: ${API_URL}`);
  console.log(`API Key: ${API_KEY}`);
  
  try {
    // Test 1: Health check
    console.log('\n1. Testing Health Check...');
    const healthResponse = await axios.get(`${API_URL}/health`, {
      headers: { 'X-API-Key': API_KEY }
    });
    console.log('✅ Health check passed:', healthResponse.data);
    
    // Test 2: Start a simple PR analysis with a small, recent PR
    console.log('\n2. Starting PR Analysis...');
    const analysisResponse = await axios.post(
      `${API_URL}/v1/analyze-pr`,
      {
        repositoryUrl: 'https://github.com/nodejs/node',
        prNumber: 56000, // Recent PR, more likely to be open
        analysisMode: 'quick'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        }
      }
    );
    
    const analysisId = analysisResponse.data.analysisId || analysisResponse.data.id;
    console.log('✅ Analysis started:', analysisId);
    console.log('Response:', JSON.stringify(analysisResponse.data, null, 2));
    
    // Test 3: Check analysis status immediately
    console.log('\n3. Checking Analysis Status...');
    try {
      const statusResponse = await axios.get(
        `${API_URL}/v1/analysis/${analysisId}`,
        {
          headers: { 'X-API-Key': API_KEY }
        }
      );
      console.log('✅ Status check successful:', statusResponse.data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log('❌ Analysis not found (404) - this indicates a data flow issue');
        console.log('   The analysis was created but is not being stored/retrieved properly');
      } else {
        console.log('❌ Status check failed:', error.response?.data || error.message);
      }
    }
    
    // Test 4: List all analyses
    console.log('\n4. Listing All Analyses...');
    try {
      const listResponse = await axios.get(
        `${API_URL}/v1/analyses`,
        {
          headers: { 'X-API-Key': API_KEY }
        }
      );
      console.log('✅ Analyses list:', listResponse.data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log('⚠️  List endpoint not implemented (404)');
      } else {
        console.log('❌ List failed:', error.response?.data || error.message);
      }
    }
    
    // Test 5: Check database directly
    console.log('\n5. Checking Database State...');
    try {
      const dbCheckResponse = await axios.get(
        `${API_URL}/v1/admin/analyses`,
        {
          headers: { 'X-API-Key': API_KEY }
        }
      );
      console.log('✅ Database check:', dbCheckResponse.data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log('⚠️  Admin endpoint not available (404)');
      } else {
        console.log('❌ Database check failed:', error.response?.data || error.message);
      }
    }
    
    // Wait a bit and check status again
    console.log('\n6. Waiting 5 seconds and checking again...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    try {
      const finalStatusResponse = await axios.get(
        `${API_URL}/v1/analysis/${analysisId}`,
        {
          headers: { 'X-API-Key': API_KEY }
        }
      );
      console.log('✅ Final status:', finalStatusResponse.data);
    } catch (error: any) {
      console.log('❌ Final status check failed:', error.response?.status, error.response?.data || error.message);
    }
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
  }
}

// Run the test
testSimplePR().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});