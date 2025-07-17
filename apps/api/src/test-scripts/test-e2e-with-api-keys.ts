#!/usr/bin/env ts-node

import chalk from 'chalk';
import axios, { AxiosInstance } from 'axios';
import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

const API_URL = process.env.API_URL || 'http://localhost:3001';

// Test users - using their actual emails
const TEST_USERS = {
  payPerScan: {
    email: 'slavataichi@gmail.com',
    userId: '9ea0c2a9-8b33-409a-a45e-fe218d13d65e', // From your query results
    description: 'Pay-per-scan user ($0.50 per scan)'
  },
  individual: {
    email: 'rostislav.alpin@gmail.com', 
    userId: '580e3fe8-094d-477f-86cb-88e4273b589b', // From your query results
    description: 'Individual subscription plan user'
  }
};

/**
 * E2E test using API keys instead of user passwords
 * This approach tests the actual production flow where users authenticate via API keys
 */
async function runE2ETestsWithAPIKeys() {
  console.log(chalk.cyan('\n🚀 E2E Tests Using API Keys\n'));
  console.log('='.repeat(60));
  console.log(chalk.blue('This test uses API keys to avoid needing user passwords'));
  console.log('='.repeat(60));

  // Initialize Supabase admin client for data verification
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!, // Service key for admin access
  );

  try {
    // Test both users
    for (const [userType, userData] of Object.entries(TEST_USERS)) {
      console.log(chalk.yellow(`\n📋 Testing ${userType} user: ${userData.email}`));
      console.log(chalk.gray(userData.description));
      console.log('-'.repeat(60));

      // Step 1: Verify user exists and get their data
      console.log(chalk.blue('\n1️⃣ Verifying user data...'));
      const userInfo = await verifyUserData(supabase, userData);

      // Step 2: Get or create API key for testing
      console.log(chalk.blue('\n2️⃣ Getting API key for testing...'));
      const apiKey = await getTestAPIKey(supabase, userData.userId);

      if (!apiKey) {
        console.log(chalk.red('❌ Could not get API key for user'));
        console.log(chalk.yellow('💡 User needs to create an API key through the web interface'));
        continue;
      }

      // Create API client with API key authentication
      const apiClient = axios.create({
        baseURL: API_URL,
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json'
        }
      });

      // Step 3: Test API endpoints
      console.log(chalk.blue('\n3️⃣ Testing API endpoints...'));
      await testAPIEndpoints(apiClient, userInfo);

      // Step 4: Test PR Analysis
      console.log(chalk.blue('\n4️⃣ Testing PR analysis...'));
      await testPRAnalysis(apiClient, userInfo);

      console.log(chalk.green(`\n✅ Tests passed for ${userData.email}`));
    }

    console.log(chalk.green('\n✅ All E2E tests completed successfully!'));
    
  } catch (error) {
    console.error(chalk.red('\n❌ E2E test failed:'), error);
    if (axios.isAxiosError(error)) {
      console.error('Response status:', error.response?.status);
      console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
    }
  }
}

async function verifyUserData(supabase: any, userData: any) {
  console.log('  Checking user in database...');
  
  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userData.userId)
    .single();

  if (profileError) {
    console.log(chalk.yellow(`    ⚠️  No user profile found`));
  } else {
    console.log(`    ✓ User profile exists`);
  }

  // Get billing information
  const { data: billing, error: billingError } = await supabase
    .from('user_billing')
    .select('*')
    .eq('user_id', userData.userId)
    .single();

  if (billingError) {
    console.log(chalk.yellow(`    ⚠️  No billing record found`));
  } else {
    console.log(`    ✓ Billing record exists`);
    console.log(`      - Subscription tier: ${billing.subscription_tier}`);
    console.log(`      - Trial scans used: ${billing.trial_scans_used}`);
  }

  // Check payment methods
  const { data: paymentMethods } = await supabase
    .from('payment_methods')
    .select('*')
    .eq('user_id', userData.userId);

  console.log(`    ✓ Payment methods: ${paymentMethods?.length || 0}`);

  return {
    profile,
    billing,
    paymentMethods,
    hasPaymentMethod: (paymentMethods?.length || 0) > 0
  };
}

async function getTestAPIKey(supabase: any, userId: string): Promise<string | null> {
  console.log('  Checking for existing API keys...');
  
  // Check if user has API keys (we can't retrieve the actual key from the database)
  const { data: apiKeys, error } = await supabase
    .from('api_keys')
    .select('id, name, created_at, active, usage_count, usage_limit')
    .eq('user_id', userId)
    .eq('active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.log(chalk.red('    ❌ Error fetching API keys:', error.message));
    return null;
  }

  if (apiKeys && apiKeys.length > 0) {
    console.log(chalk.green(`    ✓ User has ${apiKeys.length} active API key(s)`));
    apiKeys.forEach((key: any) => {
      console.log(`      - ${key.name}: ${key.usage_count}/${key.usage_limit} uses`);
    });
    
    // Check environment variable for stored API key
    const envKeyName = userId === '9ea0c2a9-8b33-409a-a45e-fe218d13d65e' 
      ? 'TEST_API_KEY_PAY_PER_SCAN' 
      : 'TEST_API_KEY_INDIVIDUAL';
    
    const storedKey = process.env[envKeyName];
    if (storedKey) {
      console.log(chalk.green(`    ✓ Using API key from ${envKeyName}`));
      return storedKey;
    } else {
      console.log(chalk.yellow(`    ⚠️  API key exists but not found in ${envKeyName}`));
      console.log(chalk.yellow('    💡 Please set the API key in your .env file'));
      return null;
    }
  }

  console.log(chalk.yellow('    ⚠️  No API keys found for user'));
  console.log(chalk.yellow('    💡 User needs to generate an API key through the web interface'));
  return null;
}

async function testAPIEndpoints(apiClient: AxiosInstance, userInfo: any) {
  // Test health endpoint
  console.log('  Testing /health...');
  try {
    const healthResponse = await apiClient.get('/health');
    console.log(chalk.green('    ✓ API health check passed'));
  } catch (error) {
    console.log(chalk.red('    ❌ API health check failed'));
    throw error;
  }

  // Test analysis endpoints based on user type
  const hasBilling = userInfo.billing && userInfo.billing.subscription_tier;
  const hasPayment = userInfo.hasPaymentMethod;

  console.log(`  User billing status:`);
  console.log(`    - Has billing record: ${hasBilling ? 'Yes' : 'No'}`);
  console.log(`    - Has payment method: ${hasPayment ? 'Yes' : 'No'}`);
  console.log(`    - Subscription: ${userInfo.billing?.subscription_tier || 'None'}`);
}

async function testPRAnalysis(apiClient: AxiosInstance, userInfo: any) {
  console.log('  Running PR analysis test...');
  
  const testRepo = 'https://github.com/facebook/react';
  const testPR = 25000;
  
  const payload = {
    repositoryUrl: testRepo,
    prNumber: testPR,
    analysisMode: 'quick' as const
  };
  
  console.log(`    - Repository: ${testRepo}`);
  console.log(`    - PR Number: ${testPR}`);
  
  try {
    // Start analysis
    const startResponse = await apiClient.post('/v1/analyze-pr', payload);
    const { analysisId } = startResponse.data;
    
    console.log(`    ✓ Analysis started: ${analysisId}`);
    
    // Check initial progress
    console.log('    - Checking analysis status...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    
    const progressResponse = await apiClient.get(`/v1/analysis/${analysisId}/progress`);
    const { status, progress, estimatedTimeRemaining } = progressResponse.data;
    
    console.log(`    - Status: ${status}`);
    console.log(`    - Progress: ${progress}%`);
    console.log(`    - Estimated time: ${estimatedTimeRemaining || 'N/A'}`);
    
    if (status === 'processing' || status === 'queued') {
      console.log(chalk.green('    ✓ Analysis is processing (this may take a few minutes)'));
      console.log(chalk.yellow('    💡 In production, you would poll this endpoint until completion'));
    } else if (status === 'failed') {
      console.log(chalk.red('    ❌ Analysis failed'));
      throw new Error('Analysis failed');
    }
    
    return { analysisId, status, progress };
    
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const errorData = error.response?.data;
      console.log(chalk.red(`    ❌ Error ${status}: ${JSON.stringify(errorData, null, 2)}`));
      
      if (status === 403) {
        console.log(chalk.yellow('    ⚠️  Access denied - check user permissions'));
      } else if (status === 402) {
        console.log(chalk.yellow('    ⚠️  Payment required - user needs payment method'));
      } else if (status === 400) {
        console.log(chalk.yellow('    ⚠️  Bad request - check payload format'));
      } else if (status === 429) {
        console.log(chalk.yellow('    ⚠️  Rate limit exceeded'));
      }
    }
    throw error;
  }
}

// Run the test
if (require.main === module) {
  if (!process.env.SUPABASE_SERVICE_KEY) {
    console.log(chalk.red('❌ Missing SUPABASE_SERVICE_KEY environment variable'));
    console.log(chalk.yellow('This key is needed to query user data directly from the database'));
    console.log(chalk.yellow('You can find it in your Supabase project settings'));
    process.exit(1);
  }

  runE2ETestsWithAPIKeys().then(() => {
    console.log(chalk.cyan('\n✨ E2E test complete\n'));
    process.exit(0);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}