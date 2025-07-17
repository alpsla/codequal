#!/usr/bin/env ts-node

import axios from 'axios';
import chalk from 'chalk';
import { config } from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function testMainBranchAnalysis() {
  console.log(chalk.cyan('\n🚀 Testing Main Branch Analysis (DeepWiki)\n'));
  
  // Use a small repository for testing
  const testRepo = 'https://github.com/tj/commander.js'; // Popular CLI library
  
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
    // Step 1: Start main branch analysis
    console.log(chalk.blue('1️⃣ Starting Main Branch Analysis...'));
    console.log(`   Repository: ${testRepo}`);
    console.log(`   Branch: main`);
    console.log(`   Analysis Mode: quick`);
    console.log();
    
    const startTime = Date.now();
    const startResponse = await apiClient.post('/v1/repositories', {
      repositoryUrl: testRepo,
      branch: 'main',
      analysisMode: 'quick'
    });
    
    const { analysisId } = startResponse.data;
    console.log(chalk.green(`✓ Analysis started successfully!`));
    console.log(`   Analysis ID: ${analysisId}`);
    console.log(`   Status: ${startResponse.data.status}`);
    console.log();
    
    // Step 2: Monitor progress
    console.log(chalk.blue('2️⃣ Monitoring Analysis Progress...'));
    
    let completed = false;
    let attempts = 0;
    const maxAttempts = 30; // 2.5 minutes with 5-second intervals
    
    while (attempts < maxAttempts && !completed) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      try {
        const progressResponse = await apiClient.get(`/v1/analysis/${analysisId}/progress`);
        const { status, progress, currentStep } = progressResponse.data;
        
        console.log(`   [${(Date.now() - startTime) / 1000}s] Status: ${status}, Progress: ${progress}%`);
        if (currentStep) {
          console.log(`   Current step: ${currentStep}`);
        }
        
        if (status === 'complete' || status === 'completed') {
          completed = true;
          console.log();
          console.log(chalk.green(`✓ Analysis completed!`));
          
          // Get the report
          const reportResponse = await apiClient.get(`/v1/analysis/${analysisId}/report`);
          const report = reportResponse.data;
          
          // Display summary
          console.log();
          console.log(chalk.cyan('📊 Analysis Summary:'));
          console.log('─'.repeat(50));
          
          if (report.summary) {
            console.log(`Total Findings: ${report.summary.totalFindings || 0}`);
            if (report.summary.severity) {
              console.log(`Severity Breakdown:`);
              console.log(`  - Critical: ${report.summary.severity.critical || 0}`);
              console.log(`  - High: ${report.summary.severity.high || 0}`);
              console.log(`  - Medium: ${report.summary.severity.medium || 0}`);
              console.log(`  - Low: ${report.summary.severity.low || 0}`);
            }
          }
          
          // Check if this was a DeepWiki analysis
          if (report.metadata?.provider || report.metadata?.model) {
            console.log();
            console.log(chalk.cyan('🤖 DeepWiki Analysis Details:'));
            console.log(`   Provider: ${report.metadata.provider || 'N/A'}`);
            console.log(`   Model: ${report.metadata.model || 'N/A'}`);
            console.log(`   Branch: ${report.metadata.branch || 'main'}`);
          }
          
          // Save report
          const reportDir = resolve(__dirname, '../../analysis-reports');
          if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
          }
          
          const jsonPath = resolve(reportDir, `main-branch-report-${analysisId}.json`);
          fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
          console.log();
          console.log(chalk.green(`💾 Report saved to: ${jsonPath}`));
          
        } else if (status === 'failed') {
          throw new Error('Analysis failed');
        }
        
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status !== 404) {
          throw error;
        }
      }
      
      attempts++;
    }
    
    if (!completed) {
      console.log(chalk.yellow('\n⏳ Analysis is taking longer than expected...'));
      console.log(chalk.gray(`Analysis ID: ${analysisId}`));
      console.log(chalk.gray('You can check progress later using the check-analysis-result.ts script'));
    }
    
  } catch (error) {
    console.error(chalk.red('\n❌ Analysis failed:'));
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
  console.log(chalk.gray('Using pay-per-scan API key for main branch analysis'));
  
  testMainBranchAnalysis()
    .then(() => {
      console.log(chalk.green('\n✅ Main branch analysis test completed!'));
      process.exit(0);
    })
    .catch(error => {
      console.error(chalk.red('\n💥 Test failed:'), error.message);
      process.exit(1);
    });
}