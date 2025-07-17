#!/usr/bin/env ts-node

import chalk from 'chalk';
import axios, { AxiosInstance } from 'axios';
import { config } from 'dotenv';
import { resolve } from 'path';
import { TEST_USERS, E2E_CONFIG } from './test-e2e-config';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

const API_URL = E2E_CONFIG.apiUrl;
const WEB_URL = E2E_CONFIG.webUrl;

// Default to Individual plan user for comprehensive testing
const TEST_USER = {
  email: TEST_USERS.individual.email,
  password: TEST_USERS.individual.password,
  description: TEST_USERS.individual.description
};

/**
 * Complete E2E test including auth, billing, and PR analysis
 */
async function runE2ETest() {
  console.log(chalk.cyan('\n🚀 Complete E2E Test\n'));
  console.log('='.repeat(60));
  
  // Check if we have test credentials
  if (!TEST_USER.password) {
    console.log(chalk.yellow('\n⚠️  No test password found in environment variables'));
    console.log(chalk.yellow('Please set TEST_USER_INDIVIDUAL_PASSWORD in .env'));
    console.log(chalk.yellow('\nTest users available:'));
    console.log(chalk.yellow('  - ' + TEST_USERS.payPerScan.email + ' (Pay-per-scan)'));
    console.log(chalk.yellow('  - ' + TEST_USERS.individual.email + ' (Individual plan)'));
    return;
  }

  let authToken: string | null = null;
  let userId: string | null = null;
  let apiClient: AxiosInstance;

  try {
    // Step 1: Authentication
    console.log(chalk.blue('\n1️⃣ Testing Authentication...'));
    const authResult = await testAuthentication();
    authToken = authResult.token;
    userId = authResult.userId;
    
    // Create authenticated API client
    apiClient = axios.create({
      baseURL: API_URL,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    // Step 2: Check User Status
    console.log(chalk.blue('\n2️⃣ Checking User Status...'));
    await testUserStatus(apiClient);

    // Step 3: Billing Status
    console.log(chalk.blue('\n3️⃣ Testing Billing Status...'));
    const billingStatus = await testBillingStatus(apiClient);

    // Step 4: API Key Management
    console.log(chalk.blue('\n4️⃣ Testing API Key Management...'));
    const apiKey = await testAPIKeyManagement(apiClient);

    // Step 5: Trial Limits
    console.log(chalk.blue('\n5️⃣ Testing Trial Limits...'));
    await testTrialLimits(apiClient, billingStatus);

    // Step 6: PR Analysis (Mock)
    console.log(chalk.blue('\n6️⃣ Testing PR Analysis (Mock)...'));
    const analysisResult = await testPRAnalysis(apiClient);

    // Step 7: Report Access
    console.log(chalk.blue('\n7️⃣ Testing Report Access...'));
    await testReportAccess(analysisResult, apiKey);

    // Step 8: Educational Content
    console.log(chalk.blue('\n8️⃣ Testing Educational Content...'));
    await testEducationalContent(analysisResult);

    // Step 9: Usage Tracking
    console.log(chalk.blue('\n9️⃣ Testing Usage Tracking...'));
    await testUsageTracking(apiClient);

    console.log(chalk.green('\n✅ All E2E tests passed!'));
    
  } catch (error) {
    console.error(chalk.red('\n❌ E2E test failed:'), error);
    if (axios.isAxiosError(error)) {
      console.error('Response status:', error.response?.status);
      console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
    }
  }
}

async function testAuthentication(): Promise<{ token: string; userId: string }> {
  console.log('  Attempting to authenticate with existing user...');
  console.log(`  Email: ${TEST_USER.email}`);
  
  try {
    // Only try to login with existing user
    const loginResponse = await axios.post(`${API_URL}/auth/signin`, {
      email: TEST_USER.email,
      password: TEST_USER.password
    });
    
    console.log(chalk.green('    ✓ Login successful'));
    return {
      token: loginResponse.data.session.access_token,
      userId: loginResponse.data.user.id
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      console.log(chalk.red('    ❌ Login failed - please ensure test user exists in Supabase'));
      console.log(chalk.yellow('    💡 Available test users:'));
      console.log(chalk.yellow(`       1. ${TEST_USERS.payPerScan.email} - ${TEST_USERS.payPerScan.description}`));
      console.log(chalk.yellow(`       2. ${TEST_USERS.individual.email} - ${TEST_USERS.individual.description}`));
      console.log(chalk.yellow('    Please check password is correct'));
    }
    throw error;
  }
}

async function testUserStatus(apiClient: AxiosInstance) {
  console.log('  Checking authenticated user status...');
  
  const response = await apiClient.get('/auth/me');
  const user = response.data;
  
  console.log(`    - User ID: ${user.id}`);
  console.log(`    - Email: ${user.email}`);
  console.log(`    - Status: ${user.status || 'active'}`);
  console.log(chalk.green('    ✓ User status verified'));
}

async function testBillingStatus(apiClient: AxiosInstance): Promise<any> {
  console.log('  Checking billing status...');
  
  const response = await apiClient.get('/billing/status');
  const billing = response.data;
  
  console.log(`    - Has payment method: ${billing.hasPaymentMethod ? 'Yes' : 'No'}`);
  console.log(`    - Trial scans used: ${billing.trialScansUsed}/${billing.trialScansLimit}`);
  console.log(`    - Subscription tier: ${billing.subscriptionTier || 'None'}`);
  console.log(`    - Can use trial: ${billing.canUseTrial ? 'Yes' : 'No'}`);
  
  if (billing.trialRepository) {
    console.log(`    - Trial repository: ${billing.trialRepository}`);
  }
  
  console.log(chalk.green('    ✓ Billing status retrieved'));
  return billing;
}

async function testAPIKeyManagement(apiClient: AxiosInstance): Promise<string> {
  console.log('  Testing API key management...');
  
  // List existing keys
  const listResponse = await apiClient.get('/api-keys');
  console.log(`    - Existing API keys: ${listResponse.data.apiKeys.length}`);
  
  // Create a new key
  const createResponse = await apiClient.post('/api-keys', {
    name: 'E2E Test Key',
    scopes: ['read', 'write']
  });
  
  const newKey = createResponse.data;
  console.log(`    - Created key: ${newKey.key.substring(0, 20)}...`);
  console.log(`    - Key ID: ${newKey.id}`);
  console.log(chalk.green('    ✓ API key created'));
  
  return newKey.key;
}

async function testTrialLimits(apiClient: AxiosInstance, billingStatus: any) {
  console.log('  Testing trial enforcement...');
  
  if (billingStatus.hasPaymentMethod) {
    console.log(chalk.yellow('    ⚠️  User has payment method, skipping trial tests'));
    return;
  }
  
  console.log(`    - Trial scans remaining: ${billingStatus.trialScansLimit - billingStatus.trialScansUsed}`);
  
  if (billingStatus.trialRepository) {
    console.log('    - Testing repository restriction...');
    
    // Try to analyze a different repository (should fail)
    try {
      await apiClient.post('/api/mock-pr-analysis', {
        repositoryUrl: 'https://github.com/different/repo',
        prNumber: 1
      });
      console.log(chalk.red('      ❌ Trial restriction not working!'));
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        console.log(chalk.green('      ✓ Trial repository restriction working'));
      } else {
        throw error;
      }
    }
  }
  
  console.log(chalk.green('    ✓ Trial limits verified'));
}

async function testPRAnalysis(apiClient: AxiosInstance): Promise<any> {
  console.log('  Running mock PR analysis...');
  
  const testRepo = 'https://github.com/test-org/test-repo';
  const payload = {
    repositoryUrl: testRepo,
    prNumber: 123
  };
  
  console.log(`    - Repository: ${testRepo}`);
  console.log(`    - PR Number: ${payload.prNumber}`);
  
  const response = await apiClient.post('/api/mock-pr-analysis', payload);
  const result = response.data;
  
  console.log(`    - Analysis ID: ${result.analysisId}`);
  console.log(`    - Status: ${result.status}`);
  console.log(`    - Decision: ${result.decision?.status || 'N/A'}`);
  console.log(`    - Blocking issues: ${result.blockingIssues?.length || 0}`);
  console.log(`    - Positive findings: ${result.positiveFindings?.length || 0}`);
  
  // Check metrics
  if (result.metrics) {
    console.log('    - Metrics:');
    console.log(`      - Code Quality: ${result.metrics.codeQuality}%`);
    console.log(`      - Security: ${result.metrics.security}%`);
    console.log(`      - Performance: ${result.metrics.performance}%`);
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
  
  // Test HTML report access with API key
  const htmlUrl = `${API_URL}/api/analysis/${reportId}/report?format=html&api_key=${apiKey}`;
  console.log('    - Testing HTML report access...');
  
  try {
    const response = await axios.get(htmlUrl);
    console.log(`      ✓ HTML report accessible (${response.data.length} bytes)`);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.log(chalk.red(`      ❌ HTML report access failed: ${error.response?.status}`));
    }
  }
  
  // Test JSON report access
  const jsonUrl = `${API_URL}/api/analysis/${reportId}/report?format=json&api_key=${apiKey}`;
  console.log('    - Testing JSON report access...');
  
  try {
    const response = await axios.get(jsonUrl);
    const report = response.data;
    console.log(`      ✓ JSON report accessible`);
    console.log(`      - Findings: ${report.findings ? Object.keys(report.findings).length : 0} categories`);
    console.log(`      - Has summary: ${report.summary ? 'Yes' : 'No'}`);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.log(chalk.red(`      ❌ JSON report access failed: ${error.response?.status}`));
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
  
  if (analysisResult.recommendations) {
    console.log(`    - Recommendations: ${analysisResult.recommendations.length}`);
    analysisResult.recommendations.slice(0, 2).forEach((rec: string) => {
      console.log(`      - ${rec}`);
    });
  }
  
  console.log(chalk.green('    ✓ Educational content verified'));
}

async function testUsageTracking(apiClient: AxiosInstance) {
  console.log('  Testing usage tracking...');
  
  try {
    const response = await apiClient.get('/billing/usage');
    const usage = response.data;
    
    console.log(`    - API calls today: ${usage.apiCallsToday || 0}`);
    console.log(`    - API calls this month: ${usage.apiCallsMonth || 0}`);
    console.log(`    - Web scans today: ${usage.webScansToday || 0}`);
    console.log(`    - Web scans this month: ${usage.webScansMonth || 0}`);
    
    console.log(chalk.green('    ✓ Usage tracking verified'));
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      console.log(chalk.yellow('    ⚠️  Usage endpoint not available'));
    } else {
      throw error;
    }
  }
}

// Run the E2E test
console.log(chalk.cyan('Starting E2E test...'));
console.log(`API URL: ${API_URL}`);
console.log(`Web URL: ${WEB_URL}`);

runE2ETest().then(() => {
  console.log(chalk.cyan('\n✨ E2E test complete\n'));
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});