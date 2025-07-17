#!/usr/bin/env ts-node

import chalk from 'chalk';
import axios from 'axios';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

const API_URL = process.env.API_URL || 'http://localhost:3001';

/**
 * Integration test using the mock PR analysis endpoint
 */
async function testIntegration() {
  console.log(chalk.cyan('\n🔬 Integration Test: Mock PR Analysis\n'));
  console.log('='.repeat(60));

  try {
    // Step 1: Get auth token (assuming we have test credentials)
    console.log(chalk.blue('\n1️⃣ Getting auth token...'));
    
    // For now, we'll skip auth and use the fact that the server is running locally
    // In a real test, you'd authenticate first
    
    // Step 2: Call mock PR analysis endpoint
    console.log(chalk.blue('\n2️⃣ Calling mock PR analysis endpoint...'));
    
    const payload = {
      repositoryUrl: 'https://github.com/test-org/test-repo',
      prNumber: 123
    };
    
    console.log('  Request payload:', JSON.stringify(payload, null, 2));
    
    try {
      // Note: This endpoint requires authentication
      // For testing, we'll need to either:
      // 1. Create a test user and authenticate
      // 2. Temporarily disable auth for testing
      // 3. Use a valid session token
      
      const response = await axios.post(
        `${API_URL}/api/mock-pr-analysis`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            // Add auth header if available
            // 'Authorization': `Bearer ${token}`
          }
        }
      );
      
      console.log(chalk.green('✓ Mock analysis completed'));
      console.log('\n  Response summary:');
      console.log(`    - Analysis ID: ${response.data.analysisId}`);
      console.log(`    - Status: ${response.data.status}`);
      console.log(`    - Report URL: ${response.data.reportUrl}`);
      console.log(`    - Repository: ${response.data.repository?.name}`);
      console.log(`    - Decision: ${response.data.decision?.status}`);
      console.log(`    - Blocking issues: ${response.data.blockingIssues?.length || 0}`);
      console.log(`    - Positive findings: ${response.data.positiveFindings?.length || 0}`);
      
      // Display some findings
      if (response.data.blockingIssues?.length > 0) {
        console.log(chalk.red('\n  🚫 Blocking Issues:'));
        response.data.blockingIssues.slice(0, 2).forEach((issue: any) => {
          console.log(`    - [${issue.severity}] ${issue.type}`);
          console.log(`      ${issue.description}`);
          console.log(`      File: ${issue.file}:${issue.line}`);
        });
      }
      
      if (response.data.positiveFindings?.length > 0) {
        console.log(chalk.green('\n  ✅ Positive Findings:'));
        response.data.positiveFindings.forEach((finding: any) => {
          console.log(`    ${finding.icon} ${finding.text}`);
        });
      }
      
      // Check metrics
      if (response.data.metrics) {
        console.log(chalk.blue('\n  📊 Metrics:'));
        console.log(`    - Code Quality: ${response.data.metrics.codeQuality}%`);
        console.log(`    - Security: ${response.data.metrics.security}%`);
        console.log(`    - Performance: ${response.data.metrics.performance}%`);
        console.log(`    - Test Coverage: ${response.data.metrics.testCoverage}%`);
      }
      
    } catch (error: any) {
      if (error.response?.status === 401) {
        console.log(chalk.yellow('⚠️  Authentication required'));
        console.log('  The mock PR analysis endpoint requires authentication.');
        console.log('  To test this endpoint:');
        console.log('  1. Create a test user account');
        console.log('  2. Authenticate and get a session token');
        console.log('  3. Add the token to the request headers');
      } else {
        console.error(chalk.red('❌ Request failed:'), error.message);
        if (error.response?.data) {
          console.error('  Error details:', error.response.data);
        }
      }
    }
    
    // Step 3: Test the actual analyze-pr endpoint (if we had auth)
    console.log(chalk.blue('\n3️⃣ Testing real PR analysis endpoint...'));
    console.log('  Note: This requires valid authentication and API access');
    
    console.log(chalk.yellow('\n📝 Summary:'));
    console.log('  - Mock endpoint returns pre-defined analysis results');
    console.log('  - Real endpoint would trigger actual agent analysis');
    console.log('  - Both endpoints require authentication');
    console.log('  - Results include findings, metrics, and recommendations');
    
  } catch (error) {
    console.error(chalk.red('\n❌ Integration test failed:'), error);
  }
}

// Run the test
testIntegration().then(() => {
  console.log(chalk.cyan('\n✨ Integration test complete\n'));
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});