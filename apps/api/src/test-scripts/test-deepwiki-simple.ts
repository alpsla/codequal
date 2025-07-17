#!/usr/bin/env ts-node

import axios from 'axios';
import chalk from 'chalk';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function testSimpleAnalysis() {
  console.log(chalk.cyan('\n🚀 Testing Simple DeepWiki Analysis\n'));
  
  // Use a small, simple repository for quick testing
  const testRepo = 'https://github.com/expressjs/cors'; // Small Express middleware
  const testPR = 274; // A recent small PR
  
  // Use the pay-per-scan API key
  const apiKey = process.env.TEST_API_KEY_PAY_PER_SCAN!;
  
  const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json'
    },
    timeout: 30000
  });
  
  try {
    // Step 1: Start the analysis with quick mode
    console.log(chalk.blue('1️⃣ Starting Quick Analysis...'));
    console.log(`   Repository: ${testRepo}`);
    console.log(`   PR Number: #${testPR}`);
    console.log(`   Analysis Mode: quick`);
    console.log();
    
    const startTime = Date.now();
    const startResponse = await apiClient.post('/v1/analyze-pr', {
      repositoryUrl: testRepo,
      prNumber: testPR,
      analysisMode: 'quick' // Use quick mode for faster results
    });
    
    const { analysisId } = startResponse.data;
    console.log(chalk.green(`✓ Analysis started successfully!`));
    console.log(`   Analysis ID: ${analysisId}`);
    console.log(`   Status: ${startResponse.data.status}`);
    console.log();
    
    // Step 2: Wait a bit and check status
    console.log(chalk.blue('2️⃣ Checking Analysis Status...'));
    
    // Wait 10 seconds
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    const progressResponse = await apiClient.get(`/v1/analysis/${analysisId}/progress`);
    console.log(`   Status: ${progressResponse.data.status}`);
    console.log(`   Progress: ${progressResponse.data.progress}%`);
    if (progressResponse.data.currentStep) {
      console.log(`   Current step: ${progressResponse.data.currentStep}`);
    }
    
    console.log();
    console.log(chalk.green('✅ DeepWiki analysis is working!'));
    console.log(chalk.gray('\nNote: Full analysis may take several minutes to complete.'));
    console.log(chalk.gray(`You can check progress at: ${API_URL}/v1/analysis/${analysisId}/progress`));
    
  } catch (error) {
    console.error(chalk.red('\n❌ Analysis test failed:'));
    if (axios.isAxiosError(error)) {
      console.error(`   Status: ${error.response?.status}`);
      console.error(`   Message: ${error.response?.data?.error || error.message}`);
      if (error.response?.data?.details) {
        console.error(`   Details:`, error.response.data.details);
      }
    } else {
      console.error(`   Error:`, error);
    }
    throw error;
  }
}

// Run the test
if (require.main === module) {
  console.log(chalk.gray('Using pay-per-scan API key'));
  
  testSimpleAnalysis()
    .then(() => {
      console.log(chalk.green('\n✅ Simple test completed successfully!'));
      process.exit(0);
    })
    .catch(error => {
      console.error(chalk.red('\n💥 Test failed:'), error.message);
      process.exit(1);
    });
}