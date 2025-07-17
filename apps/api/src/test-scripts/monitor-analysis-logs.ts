#!/usr/bin/env ts-node

import { config } from 'dotenv';
import { resolve } from 'path';
import chalk from 'chalk';
import axios from 'axios';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function monitorAnalysisLogs(analysisId: string, duration: number = 120) {
  console.log(chalk.cyan(`\n📊 Monitoring Analysis: ${analysisId}\n`));
  console.log(chalk.gray(`Will check every 5 seconds for ${duration} seconds\n`));
  
  const apiKey = process.env.TEST_API_KEY_PAY_PER_SCAN!;
  const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json'
    },
    timeout: 30000
  });
  
  const startTime = Date.now();
  let lastStatus = '';
  let lastProgress = -1;
  
  const checkInterval = setInterval(async () => {
    try {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      
      if (elapsed > duration) {
        console.log(chalk.yellow(`\n⏱️ Monitoring timeout reached (${duration}s)`));
        clearInterval(checkInterval);
        return;
      }
      
      const response = await apiClient.get(`/v1/analysis/${analysisId}/progress`);
      const { status, progress, currentStep } = response.data;
      
      // Only log if something changed
      if (status !== lastStatus || progress !== lastProgress) {
        console.log(chalk.blue(`[${elapsed}s] Status: ${status}, Progress: ${progress}%, Step: ${currentStep || 'N/A'}`));
        lastStatus = status;
        lastProgress = progress;
        
        if (status === 'complete' || status === 'completed') {
          console.log(chalk.green('\n✅ Analysis completed!'));
          clearInterval(checkInterval);
          
          // Try to get the report
          try {
            await apiClient.get(`/v1/analysis/${analysisId}/report`);
            console.log(chalk.green('📄 Report is available'));
          } catch (err) {
            console.log(chalk.red('❌ Report not available'));
          }
        } else if (status === 'failed') {
          console.log(chalk.red('\n❌ Analysis failed'));
          clearInterval(checkInterval);
        }
      }
    } catch (error: any) {
      console.log(chalk.red(`[Error] Failed to check status: ${error.message || error}`));
    }
  }, 5000);
  
  // Initial check
  try {
    const response = await apiClient.get(`/v1/analysis/${analysisId}/progress`);
    const { status, progress, currentStep } = response.data;
    console.log(chalk.blue(`[0s] Status: ${status}, Progress: ${progress}%, Step: ${currentStep || 'N/A'}`));
    lastStatus = status;
    lastProgress = progress;
  } catch (error: any) {
    console.log(chalk.red(`[Error] Initial check failed: ${error.message || error}`));
  }
}

// Get analysis ID from command line
const analysisId = process.argv[2];
const duration = parseInt(process.argv[3]) || 120;

if (!analysisId) {
  console.error(chalk.red('Please provide an analysis ID'));
  console.log('Usage: ts-node monitor-analysis-logs.ts <analysisId> [duration]');
  process.exit(1);
}

monitorAnalysisLogs(analysisId, duration)
  .catch(error => {
    console.error(chalk.red('\n💥 Fatal error:'), error);
    process.exit(1);
  });