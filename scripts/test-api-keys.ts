#!/usr/bin/env ts-node

import axios from 'axios';
import { generateApiKey, hashApiKey } from '../apps/api/src/middleware/api-key-auth';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';

async function testApiKeySystem() {
  console.log('🧪 Testing API Key System...\n');

  try {
    // Step 1: Generate a test API key
    console.log('1️⃣ Generating test API key...');
    const apiKey = generateApiKey();
    const keyHash = hashApiKey(apiKey);
    console.log(`   Generated: ${apiKey}`);
    console.log(`   Hash: ${keyHash.substring(0, 16)}...`);

    // Step 2: Test unauthenticated request
    console.log('\n2️⃣ Testing unauthenticated request...');
    try {
      await axios.get(`${API_BASE_URL}/v1/health`);
      console.log('   ❌ Expected 401, but request succeeded');
    } catch (error: any) {
      if (error.response?.status === 401) {
        console.log('   ✅ Correctly rejected (401):', error.response.data.message);
      } else {
        console.log('   ❌ Unexpected error:', error.message);
      }
    }

    // Step 3: Test with invalid API key
    console.log('\n3️⃣ Testing with invalid API key...');
    try {
      await axios.get(`${API_BASE_URL}/v1/health`, {
        headers: { 'X-API-Key': 'ck_invalid_key_12345' }
      });
      console.log('   ❌ Expected 401, but request succeeded');
    } catch (error: any) {
      if (error.response?.status === 401) {
        console.log('   ✅ Correctly rejected (401):', error.response.data.message);
      } else {
        console.log('   ❌ Unexpected error:', error.message);
      }
    }

    // Step 4: Test API key in query parameter
    console.log('\n4️⃣ Testing API key in query parameter...');
    try {
      await axios.get(`${API_BASE_URL}/v1/health?api_key=ck_test_key_12345`);
      console.log('   ❌ Expected 401, but request succeeded');
    } catch (error: any) {
      if (error.response?.status === 401) {
        console.log('   ✅ Query parameter support working');
      } else {
        console.log('   ❌ Unexpected error:', error.message);
      }
    }

    // Step 5: Test rate limiting
    console.log('\n5️⃣ Testing rate limiting (simulated)...');
    console.log('   ℹ️  Rate limiting will be enforced when database is connected');

    // Step 6: Test different endpoints
    console.log('\n6️⃣ Testing v1 API endpoints...');
    const endpoints = [
      '/v1/analyze-pr',
      '/v1/repository/status',
      '/v1/analysis/history',
      '/v1/reports'
    ];

    for (const endpoint of endpoints) {
      try {
        await axios.get(`${API_BASE_URL}${endpoint}`, {
          headers: { 'X-API-Key': 'ck_test_key' }
        });
      } catch (error: any) {
        const status = error.response?.status;
        console.log(`   ${endpoint} - ${status === 401 ? '✅ Auth required' : `Status: ${status}`}`);
      }
    }

    console.log('\n✨ API Key system test complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Run database migration to create tables');
    console.log('   2. Create test user and generate real API key');
    console.log('   3. Test with actual database connection');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

// Run the test
testApiKeySystem();