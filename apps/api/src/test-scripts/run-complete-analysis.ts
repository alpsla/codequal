#!/usr/bin/env ts-node

import chalk from 'chalk';
import axios, { AxiosInstance } from 'axios';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function runCompleteAnalysis() {
  console.log(chalk.cyan('\n🚀 Running Complete Analysis Test\n'));
  
  // Use a smaller repository for faster analysis
  const testRepo = 'https://github.com/facebook/react'; // Well-known public repo
  const testPR = 28000; // Recent small PR
  
  const apiKey = process.env.TEST_API_KEY_INDIVIDUAL!;
  
  const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json'
    }
  });
  
  try {
    // Start analysis
    console.log(chalk.blue('1️⃣ Starting analysis...'));
    console.log(`   Repository: ${testRepo}`);
    console.log(`   PR: #${testPR}`);
    
    const startResponse = await apiClient.post('/v1/analyze-pr', {
      repositoryUrl: testRepo,
      prNumber: testPR,
      analysisMode: 'quick'
    });
    
    const { analysisId } = startResponse.data;
    console.log(chalk.green(`   ✓ Analysis started: ${analysisId}`));
    
    // Poll for completion
    console.log(chalk.blue('\n2️⃣ Waiting for analysis to complete...'));
    let attempts = 0;
    const maxAttempts = 120; // 10 minutes with 5-second intervals
    let completed = false;
    
    while (attempts < maxAttempts && !completed) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      const progressResponse = await apiClient.get(`/v1/analysis/${analysisId}/progress`);
      const { status, progress } = progressResponse.data;
      
      if (attempts % 6 === 0 || status === 'complete' || status === 'completed') {
        console.log(`   Status: ${status}, Progress: ${progress}%`);
      }
      
      if (status === 'complete' || status === 'completed') {
        completed = true;
        console.log(chalk.green('   ✓ Analysis completed!'));
      } else if (status === 'failed') {
        throw new Error('Analysis failed');
      }
      
      attempts++;
    }
    
    if (!completed) {
      throw new Error('Analysis timed out after 10 minutes');
    }
    
    // Get the report
    console.log(chalk.blue('\n3️⃣ Fetching analysis report...'));
    
    // Try JSON format
    try {
      const jsonReport = await apiClient.get(`/v1/analysis/${analysisId}/report`);
      
      console.log(chalk.green('\n✅ Report Retrieved Successfully!'));
      console.log('\n📊 Report Summary:');
      console.log(JSON.stringify(jsonReport.data, null, 2));
      
      // Save to file for review
      const fs = require('fs');
      const reportPath = resolve(__dirname, `../../analysis-report-${analysisId}.json`);
      fs.writeFileSync(reportPath, JSON.stringify(jsonReport.data, null, 2));
      console.log(chalk.green(`\n💾 Report saved to: ${reportPath}`));
      
    } catch (reportError) {
      if (axios.isAxiosError(reportError)) {
        console.log(chalk.yellow('\n⚠️  Could not fetch report in JSON format'));
        console.log('Error:', reportError.response?.data);
        
        // Try markdown format
        try {
          const markdownReport = await apiClient.get(`/v1/analysis/${analysisId}/report?format=markdown`);
          console.log(chalk.green('\n📄 Markdown Report:'));
          console.log(markdownReport.data);
        } catch (mdError) {
          console.log(chalk.red('Could not fetch markdown report either'));
        }
      }
    }
    
  } catch (error) {
    console.error(chalk.red('\n❌ Test failed:'), error);
    if (axios.isAxiosError(error)) {
      console.error('Response:', error.response?.data);
    }
  }
}

// Run the test
if (require.main === module) {
  runCompleteAnalysis().then(() => {
    console.log(chalk.cyan('\n✨ Test complete\n'));
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}