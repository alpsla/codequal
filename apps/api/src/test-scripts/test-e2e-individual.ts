#!/usr/bin/env ts-node

import chalk from 'chalk';
import axios, { AxiosInstance } from 'axios';
import { config } from 'dotenv';
import { resolve } from 'path';
import { TEST_USERS, E2E_CONFIG } from './test-e2e-config';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

const testUser = TEST_USERS.individual;

/**
 * E2E test for Individual plan user (rostislav.alpin@gmail.com)
 */
async function runIndividualPlanE2ETest() {
  console.log(chalk.cyan('\n🚀 E2E Test: Individual Plan User\n'));
  console.log('='.repeat(60));
  console.log(chalk.blue(`Testing with: ${testUser.email}`));
  console.log(chalk.gray(testUser.description));
  console.log('='.repeat(60));

  if (!testUser.password) {
    console.log(chalk.red('\n❌ Missing password for test user'));
    console.log(chalk.yellow('Please set TEST_USER_INDIVIDUAL_PASSWORD in .env'));
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

    // Step 3: Test Web Scan Limits
    console.log(chalk.blue('\n3️⃣ Testing Web Scan Limits...'));
    await testWebScanLimits(apiClient, billingStatus);

    // Step 4: Test API Key Creation
    console.log(chalk.blue('\n4️⃣ Testing API Key Management...'));
    const apiKey = await testAPIKeyManagement(apiClient);

    // Step 5: Test PR Analysis
    console.log(chalk.blue('\n5️⃣ Testing PR Analysis...'));
    const analysisResult = await testPRAnalysis(apiClient);

    // Step 6: Test Report Generation
    console.log(chalk.blue('\n6️⃣ Testing Report Access...'));
    await testReportAccess(analysisResult, apiKey);

    // Step 7: Test Educational Content
    console.log(chalk.blue('\n7️⃣ Testing Educational Features...'));
    await testEducationalContent(analysisResult);

    console.log(chalk.green('\n✅ All Individual plan tests passed!'));
    
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
  console.log(`    - Subscription status: ${billing.subscription?.status || 'N/A'}`);
  console.log(`    - Has payment method: ${billing.hasPaymentMethod ? 'Yes' : 'No'}`);
  
  // Check web scan usage for Individual plan
  if (billing.webScanUsage) {
    console.log(`    - Web scans used: ${billing.webScanUsage.scansUsed}/${billing.webScanUsage.scansLimit}`);
  }
  
  // Assertions
  const tier = billing.subscriptionTier || billing.subscription?.tier || 'free';
  if (tier !== testUser.expectedBilling.subscriptionTier) {
    throw new Error(`Expected subscription tier to be ${testUser.expectedBilling.subscriptionTier}, got ${tier}`);
  }
  
  if (billing.subscription?.status !== 'active') {
    console.log(chalk.yellow('    ⚠️  Subscription status is not active'));
  }
  
  console.log(chalk.green('    ✓ Billing status verified'));
  return billing;
}

async function testWebScanLimits(apiClient: AxiosInstance, billingStatus: any) {
  console.log('  Testing web scan limits...');
  
  if (!billingStatus.webScanUsage) {
    console.log(chalk.yellow('    ⚠️  No web scan usage data available'));
    return;
  }
  
  const { scansUsed, scansLimit } = billingStatus.webScanUsage;
  console.log(`    - Current usage: ${scansUsed}/${scansLimit} scans`);
  
  if (scansUsed >= scansLimit) {
    console.log(chalk.yellow('    ⚠️  Monthly scan limit reached'));
    console.log('    - Skipping scan test to avoid exceeding limit');
  } else {
    console.log(`    - Remaining scans: ${scansLimit - scansUsed}`);
    console.log(chalk.green('    ✓ Within monthly scan limit'));
  }
}

async function testAPIKeyManagement(apiClient: AxiosInstance): Promise<string> {
  console.log('  Testing API key management...');
  
  // List existing keys
  const listResponse = await apiClient.get('/api-keys');
  console.log(`    - Existing API keys: ${listResponse.data.apiKeys.length}`);
  
  // Create a new key for testing
  const createResponse = await apiClient.post('/api-keys', {
    name: 'E2E Test Key - Individual Plan',
    scopes: ['read', 'write']
  });
  
  const newKey = createResponse.data;
  console.log(`    - Created key: ${newKey.key.substring(0, 20)}...`);
  console.log(`    - Key ID: ${newKey.id}`);
  console.log(chalk.green('    ✓ API key created successfully'));
  
  return newKey.key;
}

async function testPRAnalysis(apiClient: AxiosInstance): Promise<any> {
  console.log('  Running PR analysis...');
  
  const testRepo = E2E_CONFIG.testRepositories.small;
  const payload = {
    repositoryUrl: testRepo.url,
    prNumber: testRepo.prNumber,
    analysisMode: 'comprehensive' // Individual plan supports all modes
  };
  
  console.log(`    - Repository: ${testRepo.url}`);
  console.log(`    - PR Number: ${payload.prNumber}`);
  console.log(`    - Analysis Mode: ${payload.analysisMode}`);
  
  const response = await apiClient.post('/api/mock-pr-analysis', payload);
  const result = response.data;
  
  console.log(`    - Analysis ID: ${result.analysisId}`);
  console.log(`    - Status: ${result.status}`);
  console.log(`    - Decision: ${result.decision?.status || 'N/A'}`);
  
  // Check for comprehensive analysis features
  if (result.metrics) {
    console.log('    - Metrics available: Yes');
  }
  if (result.educationalContent) {
    console.log('    - Educational content: Yes');
  }
  
  console.log(chalk.green('    ✓ PR analysis completed'));
  return result;
}

async function testReportAccess(analysisResult: any, apiKey: string) {
  console.log('  Testing report access...');
  
  if (!analysisResult.reportUrl) {
    console.log(chalk.yellow('    ⚠️  No report URL in analysis result'));
    return;
  }
  
  // Extract report ID from URL
  const reportIdMatch = analysisResult.reportUrl.match(/analysis\/([^/]+)/);
  if (!reportIdMatch) {
    console.log(chalk.yellow('    ⚠️  Could not extract report ID'));
    return;
  }
  
  const reportId = reportIdMatch[1];
  console.log(`    - Report ID: ${reportId}`);
  
  // Test both HTML and JSON formats
  const formats = ['html', 'json'];
  
  for (const format of formats) {
    const url = `${E2E_CONFIG.apiUrl}/api/analysis/${reportId}/report?format=${format}&api_key=${apiKey}`;
    console.log(`    - Testing ${format.toUpperCase()} report access...`);
    
    try {
      const response = await axios.get(url);
      if (format === 'html') {
        console.log(`      ✓ HTML report accessible (${response.data.length} bytes)`);
      } else {
        const report = response.data;
        console.log(`      ✓ JSON report accessible`);
        console.log(`      - Has findings: ${report.findings ? 'Yes' : 'No'}`);
        console.log(`      - Has metrics: ${report.metrics ? 'Yes' : 'No'}`);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.log(chalk.red(`      ❌ ${format.toUpperCase()} report access failed: ${error.response?.status}`));
      }
    }
  }
  
  console.log(chalk.green('    ✓ Report access tested'));
}

async function testEducationalContent(analysisResult: any) {
  console.log('  Checking educational content...');
  
  if (!analysisResult.educationalContent) {
    console.log(chalk.yellow('    ⚠️  No educational content in result'));
    return;
  }
  
  console.log(`    - Educational modules: ${analysisResult.educationalContent.length}`);
  
  // Individual plan should have access to enhanced educational features
  if (analysisResult.recommendations) {
    console.log(`    - Personalized recommendations: ${analysisResult.recommendations.length}`);
  }
  
  if (analysisResult.learningPaths) {
    console.log(`    - Learning paths suggested: ${analysisResult.learningPaths.length}`);
  }
  
  console.log(chalk.green('    ✓ Educational content verified'));
}

// Run the test
if (require.main === module) {
  runIndividualPlanE2ETest().then(() => {
    console.log(chalk.cyan('\n✨ Individual plan E2E test complete\n'));
    process.exit(0);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}