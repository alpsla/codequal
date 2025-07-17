#!/usr/bin/env ts-node

import chalk from 'chalk';
import axios, { AxiosInstance } from 'axios';
import { config } from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function runRealPRAnalysis() {
  console.log(chalk.cyan('\n🚀 Running Real PR Analysis\n'));
  
  // Using a real PR from a smaller public repository
  // This is testing with the Axios library
  const testRepo = 'https://github.com/axios/axios';
  const testPR = 6000; // A recent PR
  
  // Use the Individual subscription user's API key (limits removed for testing)
  const apiKey = process.env.TEST_API_KEY_INDIVIDUAL!;
  
  const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json'
    },
    timeout: 30000 // 30 second timeout for API calls
  });
  
  try {
    // Step 1: Start the analysis
    console.log(chalk.blue('1️⃣ Starting PR Analysis...'));
    console.log(`   Repository: ${testRepo}`);
    console.log(`   PR Number: #${testPR}`);
    console.log(`   Analysis Mode: comprehensive`);
    console.log();
    
    const startTime = Date.now();
    const startResponse = await apiClient.post('/v1/analyze-pr', {
      repositoryUrl: testRepo,
      prNumber: testPR,
      analysisMode: 'comprehensive' // Use comprehensive mode for full analysis
    });
    
    const { analysisId } = startResponse.data;
    console.log(chalk.green(`✓ Analysis started successfully!`));
    console.log(`   Analysis ID: ${analysisId}`);
    console.log(`   Status: ${startResponse.data.status}`);
    console.log(`   Estimated time: ${startResponse.data.estimatedTime || 'calculating...'}s`);
    console.log();
    
    // Step 2: Poll for completion
    console.log(chalk.blue('2️⃣ Monitoring Analysis Progress...'));
    console.log('   (This may take 2-5 minutes for a comprehensive analysis)');
    console.log();
    
    let attempts = 0;
    const maxAttempts = 180; // 15 minutes with 5-second intervals
    let completed = false;
    let lastProgress = 0;
    
    while (attempts < maxAttempts && !completed) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      try {
        const progressResponse = await apiClient.get(`/v1/analysis/${analysisId}/progress`);
        const { status, progress, currentStep, estimatedTimeRemaining } = progressResponse.data;
        
        // Show progress updates
        if (progress > lastProgress || attempts % 12 === 0) { // Every minute or on progress change
          const elapsed = Math.round((Date.now() - startTime) / 1000);
          console.log(`   [${elapsed}s] Status: ${status}, Progress: ${progress}%`);
          if (currentStep) {
            console.log(`   Current step: ${currentStep}`);
          }
          if (estimatedTimeRemaining) {
            console.log(`   Estimated time remaining: ${estimatedTimeRemaining}s`);
          }
          lastProgress = progress;
        }
        
        if (status === 'complete' || status === 'completed') {
          completed = true;
          const totalTime = Math.round((Date.now() - startTime) / 1000);
          console.log();
          console.log(chalk.green(`✓ Analysis completed in ${totalTime} seconds!`));
        } else if (status === 'failed') {
          throw new Error(`Analysis failed after ${attempts * 5} seconds`);
        }
        
      } catch (error) {
        console.log(chalk.yellow(`   Warning: Could not get progress update (attempt ${attempts})`));
      }
      
      attempts++;
    }
    
    if (!completed) {
      throw new Error('Analysis timed out after 15 minutes');
    }
    
    // Step 3: Retrieve the report
    console.log();
    console.log(chalk.blue('3️⃣ Retrieving Analysis Report...'));
    
    // Get JSON report
    const jsonReport = await apiClient.get(`/v1/analysis/${analysisId}/report`);
    console.log(chalk.green('✓ JSON report retrieved successfully!'));
    
    // Display summary
    console.log();
    console.log(chalk.cyan('📊 Analysis Summary:'));
    console.log('─'.repeat(50));
    
    const report = jsonReport.data;
    if (report.summary) {
      console.log(`Total Findings: ${report.summary.totalFindings || 0}`);
      if (report.summary.severity) {
        console.log(`Severity Breakdown:`);
        console.log(`  - Critical: ${report.summary.severity.critical || 0}`);
        console.log(`  - High: ${report.summary.severity.high || 0}`);
        console.log(`  - Medium: ${report.summary.severity.medium || 0}`);
        console.log(`  - Low: ${report.summary.severity.low || 0}`);
      }
      console.log(`Confidence Score: ${report.summary.confidence || 'N/A'}`);
    }
    
    // Show some findings
    if (report.report?.findings) {
      console.log();
      console.log(chalk.cyan('🔍 Sample Findings:'));
      console.log('─'.repeat(50));
      
      let findingCount = 0;
      for (const [category, items] of Object.entries(report.report.findings)) {
        if (Array.isArray(items) && items.length > 0) {
          console.log();
          console.log(chalk.yellow(`${category}:`));
          items.slice(0, 2).forEach((finding: any) => {
            console.log(`  • [${finding.severity}] ${finding.title || finding.message}`);
            if (finding.file) {
              console.log(`    File: ${finding.file}${finding.line ? `:${finding.line}` : ''}`);
            }
            if (finding.recommendation) {
              console.log(`    Fix: ${finding.recommendation}`);
            }
            findingCount++;
          });
          if (items.length > 2) {
            console.log(`  ... and ${items.length - 2} more ${category} findings`);
          }
        }
      }
      
      if (findingCount === 0) {
        console.log(chalk.green('No issues found - code looks good!'));
      }
    }
    
    // Save the full report
    const reportDir = resolve(__dirname, '../../analysis-reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const jsonPath = resolve(reportDir, `report-${analysisId}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    console.log();
    console.log(chalk.green(`💾 Full JSON report saved to:`));
    console.log(`   ${jsonPath}`);
    
    // Get HTML report URL
    console.log();
    console.log(chalk.cyan('🌐 View HTML Report:'));
    console.log(`   http://localhost:3001/v1/analysis/${analysisId}/report?format=html&api_key=${apiKey}`);
    
    return { analysisId, report };
    
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

// Run the analysis
if (require.main === module) {
  console.log(chalk.gray('Using API key for: rostislav.alpin@gmail.com (Individual subscription - limits disabled)'));
  
  runRealPRAnalysis()
    .then(({ analysisId }) => {
      console.log();
      console.log(chalk.green('✅ Real PR analysis completed successfully!'));
      console.log(chalk.cyan(`\n🎉 Analysis ID: ${analysisId}`));
      console.log(chalk.gray('\nYou can view the full report using the HTML URL above.'));
    })
    .catch(error => {
      console.error(chalk.red('\n💥 Fatal error:'), error.message);
      process.exit(1);
    });
}