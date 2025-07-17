#!/usr/bin/env ts-node

import axios from 'axios';
import chalk from 'chalk';
import { config } from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function checkAnalysisResult(analysisId: string) {
  console.log(chalk.cyan(`\n📊 Checking Analysis Result: ${analysisId}\n`));
  
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
    // Check current status
    const progressResponse = await apiClient.get(`/v1/analysis/${analysisId}/progress`);
    console.log(chalk.blue('Current Status:'));
    console.log(`   Status: ${progressResponse.data.status}`);
    console.log(`   Progress: ${progressResponse.data.progress}%`);
    if (progressResponse.data.currentStep) {
      console.log(`   Current step: ${progressResponse.data.currentStep}`);
    }
    console.log();
    
    if (progressResponse.data.status === 'completed' || progressResponse.data.status === 'complete') {
      // Get the report
      console.log(chalk.blue('Retrieving Analysis Report...'));
      const reportResponse = await apiClient.get(`/v1/analysis/${analysisId}/report`);
      
      const report = reportResponse.data;
      console.log(chalk.green('✓ Report retrieved successfully!'));
      console.log();
      
      // Display summary
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
        console.log(`Confidence Score: ${report.summary.confidence || 'N/A'}`);
      }
      
      // Check if MCP tools were used
      if (report.metadata?.toolsUsed) {
        console.log();
        console.log(chalk.cyan('🔧 Tools Used:'));
        console.log(report.metadata.toolsUsed.join(', '));
      }
      
      // Check for branch information
      if (report.metadata?.branch) {
        console.log();
        console.log(chalk.cyan('🌿 Branch Analyzed:'));
        console.log(`   Branch: ${report.metadata.branch}`);
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
      
      // Save the report
      const reportDir = resolve(__dirname, '../../analysis-reports');
      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
      }
      
      const jsonPath = resolve(reportDir, `report-${analysisId}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
      console.log();
      console.log(chalk.green(`💾 Full report saved to:`));
      console.log(`   ${jsonPath}`);
      
      // HTML report URL
      console.log();
      console.log(chalk.cyan('🌐 View HTML Report:'));
      console.log(`   ${API_URL}/v1/analysis/${analysisId}/report?format=html&api_key=${apiKey}`);
      
    } else {
      console.log(chalk.yellow('⏳ Analysis is still in progress...'));
      console.log(chalk.gray(`Try again in a few moments.`));
    }
    
  } catch (error) {
    console.error(chalk.red('\n❌ Failed to check analysis:'));
    if (axios.isAxiosError(error)) {
      console.error(`   Status: ${error.response?.status}`);
      console.error(`   Message: ${error.response?.data?.error || error.message}`);
    } else {
      console.error(`   Error:`, error);
    }
    throw error;
  }
}

// Get analysis ID from command line or use the most recent one
const analysisId = process.argv[2] || 'analysis_1752709606360_6ndp2v96b';

checkAnalysisResult(analysisId)
  .then(() => {
    console.log(chalk.green('\n✅ Check completed!'));
  })
  .catch(error => {
    console.error(chalk.red('\n💥 Error:'), error.message);
    process.exit(1);
  });