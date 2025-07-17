#!/usr/bin/env ts-node

import chalk from 'chalk';
import axios from 'axios';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function testRealPREndpoint() {
  console.log(chalk.cyan('\n🚀 Testing Real PR Analysis Endpoint\n'));
  
  const apiKey = process.env.TEST_API_KEY_INDIVIDUAL!;
  
  const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json'
    }
  });
  
  try {
    // Check if there's a test endpoint for real PR analysis
    console.log(chalk.blue('1️⃣ Looking for test endpoints...'));
    
    // Try the test-real-pr endpoint mentioned in the HTML files
    const testUrl = '/v1/analysis/real-pr-test';
    console.log(`   Trying: ${testUrl}`);
    
    const response = await apiClient.get(testUrl);
    
    if (response.data) {
      console.log(chalk.green('\n✅ Test endpoint found!'));
      console.log('\nResponse:', JSON.stringify(response.data, null, 2));
      
      // If it returns a report URL, fetch it
      if (response.data.reportUrl || response.data.htmlUrl) {
        const reportUrl = response.data.reportUrl || response.data.htmlUrl;
        console.log(chalk.cyan('\n📊 Report URL:'));
        console.log(`   ${reportUrl}`);
      }
    }
    
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      console.log(chalk.yellow('Test endpoint not found at /v1/analysis/real-pr-test'));
      
      // Try alternative endpoints
      console.log(chalk.blue('\n2️⃣ Trying alternative test endpoints...'));
      
      const alternatives = [
        '/analysis/real-pr-test',
        '/api/analysis/real-pr-test',
        '/test/real-pr',
        '/demo/pr-analysis'
      ];
      
      for (const alt of alternatives) {
        try {
          console.log(`   Trying: ${alt}`);
          const response = await apiClient.get(alt);
          console.log(chalk.green(`   ✓ Found at ${alt}!`));
          console.log('   Response:', response.data);
          break;
        } catch (e) {
          console.log(chalk.gray(`   ✗ Not found`));
        }
      }
    } else {
      console.error(chalk.red('\n❌ Error:'), error);
    }
  }
}

// Check what test HTML files suggest
async function checkTestPages() {
  console.log(chalk.blue('\n3️⃣ Checking test HTML pages for clues...'));
  
  const testPages = [
    'http://localhost:3001/test-real-pr.html',
    'http://localhost:3001/test-api-simulation.html',
    'http://localhost:3001/test-report-generation.html'
  ];
  
  console.log(chalk.cyan('\nAvailable test pages:'));
  testPages.forEach(page => {
    console.log(`   - ${page}`);
  });
  
  console.log(chalk.yellow('\n💡 You can open these URLs in your browser to test the analysis with a real PR'));
}

// Run the tests
if (require.main === module) {
  testRealPREndpoint()
    .then(() => checkTestPages())
    .then(() => {
      console.log(chalk.cyan('\n✨ Test complete\n'));
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}