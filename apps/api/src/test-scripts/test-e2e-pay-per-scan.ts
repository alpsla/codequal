#!/usr/bin/env ts-node

import chalk from 'chalk';
import axios, { AxiosInstance } from 'axios';
import { config } from 'dotenv';
import { resolve } from 'path';
import { TEST_USERS, E2E_CONFIG } from './test-e2e-config';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

const testUser = TEST_USERS.payPerScan;

/**
 * E2E test for pay-per-scan user (slavataichi@gmail.com)
 */
async function runPayPerScanE2ETest() {
  console.log(chalk.cyan('\n🚀 E2E Test: Pay-Per-Scan User\n'));
  console.log('='.repeat(60));
  console.log(chalk.blue(`Testing with: ${testUser.email}`));
  console.log(chalk.gray(testUser.description));
  console.log('='.repeat(60));

  if (!testUser.password) {
    console.log(chalk.red('\n❌ Missing password for test user'));
    console.log(chalk.yellow('Please set TEST_USER_PAY_PER_SCAN_PASSWORD in .env'));
    return;
  }

  let authToken: string | null = null;
  let userId: string | null = null;
  let apiClient: AxiosInstance;

  try {
    // Step 1: Authentication
    console.log(chalk.blue('\n1️⃣ Testing Authentication...'));
    const authResult = await authenticate();
    authToken = authResult.token;
    userId = authResult.userId;
    
    // Create authenticated API client
    apiClient = axios.create({
      baseURL: E2E_CONFIG.apiUrl,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    // Step 2: Verify Billing Status
    console.log(chalk.blue('\n2️⃣ Verifying Billing Status...'));
    const billingStatus = await verifyBilling(apiClient);

    // Step 3: Test Pay-Per-Scan Flow
    console.log(chalk.blue('\n3️⃣ Testing Pay-Per-Scan Analysis...'));
    await testPayPerScanAnalysis(apiClient);

    // Step 4: Test Trial Limits (should not apply to this user)
    console.log(chalk.blue('\n4️⃣ Testing Trial Restrictions...'));
    await testNoTrialRestrictions(apiClient);

    // Step 5: Test Multiple Scans
    console.log(chalk.blue('\n5️⃣ Testing Multiple Scans...'));
    await testMultipleScans(apiClient);

    console.log(chalk.green('\n✅ All pay-per-scan tests passed!'));
    
  } catch (error) {
    console.error(chalk.red('\n❌ E2E test failed:'), error);
    if (axios.isAxiosError(error)) {
      console.error('Response status:', error.response?.status);
      console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
    }
  }
}

async function authenticate(): Promise<{ token: string; userId: string }> {
  console.log(`  Authenticating as ${testUser.email}...`);
  
  try {
    const loginResponse = await axios.post(`${E2E_CONFIG.apiUrl}/auth/signin`, {
      email: testUser.email,
      password: testUser.password
    });
    
    console.log(chalk.green('    ✓ Authentication successful'));
    return {
      token: loginResponse.data.session.access_token,
      userId: loginResponse.data.user.id
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      console.log(chalk.red('    ❌ Authentication failed'));
      console.log(chalk.yellow('    Please ensure the test user exists and password is correct'));
    }
    throw error;
  }
}

async function verifyBilling(apiClient: AxiosInstance) {
  console.log('  Fetching billing status...');
  
  const response = await apiClient.get('/billing/status');
  const billing = response.data;
  
  // Verify expected billing configuration
  console.log(`    - Subscription tier: ${billing.subscriptionTier || billing.subscription?.tier || 'free'}`);
  console.log(`    - Has payment method: ${billing.hasPaymentMethod ? 'Yes' : 'No'}`);
  console.log(`    - Trial scans used: ${billing.trialUsage?.scansUsed || 0}`);
  
  // Assertions
  if (billing.hasPaymentMethod !== testUser.expectedBilling.hasPaymentMethod) {
    throw new Error(`Expected hasPaymentMethod to be ${testUser.expectedBilling.hasPaymentMethod}`);
  }
  
  const tier = billing.subscriptionTier || billing.subscription?.tier || 'free';
  if (tier !== testUser.expectedBilling.subscriptionTier) {
    throw new Error(`Expected subscription tier to be ${testUser.expectedBilling.subscriptionTier}, got ${tier}`);
  }
  
  console.log(chalk.green('    ✓ Billing status verified'));
  return billing;
}

async function testPayPerScanAnalysis(apiClient: AxiosInstance) {
  console.log('  Running pay-per-scan analysis...');
  
  const testRepo = E2E_CONFIG.testRepositories.small;
  const payload = {
    repositoryUrl: testRepo.url,
    prNumber: testRepo.prNumber
  };
  
  console.log(`    - Repository: ${testRepo.url}`);
  console.log(`    - PR Number: ${payload.prNumber}`);
  
  try {
    // Note: In a real test environment, this would charge $0.50
    // For testing, we're using the mock endpoint
    const response = await apiClient.post('/api/mock-pr-analysis', payload);
    const result = response.data;
    
    console.log(`    - Analysis ID: ${result.analysisId}`);
    console.log(`    - Status: ${result.status}`);
    console.log(chalk.green('    ✓ Pay-per-scan analysis initiated'));
    
    return result;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 402) {
      console.log(chalk.red('    ❌ Payment required - ensure test user has payment method'));
    }
    throw error;
  }
}

async function testNoTrialRestrictions(apiClient: AxiosInstance) {
  console.log('  Testing that trial restrictions do not apply...');
  
  // User with payment method should be able to scan any repository
  const differentRepo = E2E_CONFIG.testRepositories.medium;
  
  try {
    const response = await apiClient.post('/api/mock-pr-analysis', {
      repositoryUrl: differentRepo.url,
      prNumber: differentRepo.prNumber
    });
    
    console.log(chalk.green('    ✓ Can scan different repositories (no trial restrictions)'));
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      console.log(chalk.red('    ❌ Unexpected trial restriction for paying user'));
    }
    throw error;
  }
}

async function testMultipleScans(apiClient: AxiosInstance) {
  console.log('  Testing multiple scans...');
  
  const repos = [
    E2E_CONFIG.testRepositories.small,
    E2E_CONFIG.testRepositories.medium
  ];
  
  for (let i = 0; i < repos.length; i++) {
    const repo = repos[i];
    console.log(`    - Scan ${i + 1}: ${repo.description}`);
    
    try {
      const response = await apiClient.post('/api/mock-pr-analysis', {
        repositoryUrl: repo.url,
        prNumber: repo.prNumber
      });
      
      console.log(`      ✓ Analysis ID: ${response.data.analysisId}`);
    } catch (error) {
      console.log(chalk.red(`      ❌ Scan ${i + 1} failed`));
      throw error;
    }
  }
  
  console.log(chalk.green('    ✓ Multiple scans completed successfully'));
}

// Run the test
if (require.main === module) {
  runPayPerScanE2ETest().then(() => {
    console.log(chalk.cyan('\n✨ Pay-per-scan E2E test complete\n'));
    process.exit(0);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}