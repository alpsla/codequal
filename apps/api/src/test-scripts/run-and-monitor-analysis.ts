#!/usr/bin/env ts-node

import axios from 'axios';
import chalk from 'chalk';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function runAndMonitorAnalysis() {
  console.log(chalk.cyan('\n🚀 Starting and Monitoring Analysis\n'));
  
  // Use a very small repository for quick testing
  const testRepo = 'https://github.com/sindresorhus/is-npm'; // Tiny utility
  const testPR = 3; // Small PR
  
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
    // Start the analysis
    console.log(chalk.blue('📋 Starting analysis...'));
    console.log(`   Repository: ${testRepo}`);
    console.log(`   PR: #${testPR}`);
    console.log();
    
    const startTime = Date.now();
    const startResponse = await apiClient.post('/v1/analyze-pr', {
      repositoryUrl: testRepo,
      prNumber: testPR,
      analysisMode: 'quick'
    });
    
    const { analysisId } = startResponse.data;
    console.log(chalk.green(`✓ Analysis started: ${analysisId}`));
    console.log();
    
    // Monitor progress
    console.log(chalk.blue('📊 Monitoring progress...'));
    let completed = false;
    let lastProgress = -1;
    
    while (!completed) {
      await new Promise(resolve => setTimeout(resolve, 3000)); // Check every 3 seconds
      
      try {
        const progressResponse = await apiClient.get(`/v1/analysis/${analysisId}/progress`);
        const { status, progress, currentStep } = progressResponse.data;
        
        if (progress !== lastProgress) {
          const elapsed = Math.round((Date.now() - startTime) / 1000);
          console.log(`[${elapsed}s] Status: ${status}, Progress: ${progress}%, Step: ${currentStep || 'N/A'}`);
          lastProgress = progress;
        }
        
        if (status === 'complete' || status === 'completed') {
          completed = true;
          console.log();
          console.log(chalk.green('✅ Analysis completed!'));
          
          // Try to get the report
          console.log();
          console.log(chalk.blue('📄 Retrieving report...'));
          try {
            const reportResponse = await apiClient.get(`/v1/analysis/${analysisId}/report`);
            console.log(chalk.green('✓ Report retrieved successfully!'));
            
            const report = reportResponse.data;
            if (report.summary) {
              console.log();
              console.log(chalk.cyan('Summary:'));
              console.log(`  Total Findings: ${report.summary.totalFindings || 0}`);
            }
          } catch (reportError: any) {
            console.log(chalk.red('❌ Failed to retrieve report'));
            console.log(`  Error: ${reportError.response?.data?.error || reportError.message}`);
          }
        } else if (status === 'failed') {
          completed = true;
          console.log(chalk.red('\n❌ Analysis failed'));
        }
      } catch (error: any) {
        console.log(chalk.red(`Error checking progress: ${error.message}`));
      }
    }
    
  } catch (error: any) {
    console.error(chalk.red('\n❌ Failed to start analysis:'));
    if (axios.isAxiosError(error)) {
      console.error(`   Status: ${error.response?.status}`);
      console.error(`   Message: ${error.response?.data?.error || error.message}`);
    } else {
      console.error(`   Error:`, error);
    }
  }
}

// Run the test
runAndMonitorAnalysis()
  .then(() => {
    console.log(chalk.green('\n✅ Test completed'));
    process.exit(0);
  })
  .catch(error => {
    console.error(chalk.red('\n💥 Fatal error:'), error);
    process.exit(1);
  });