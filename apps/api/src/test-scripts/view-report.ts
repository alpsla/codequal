#!/usr/bin/env ts-node

import chalk from 'chalk';
import axios from 'axios';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function viewReport(analysisId: string, apiKey: string) {
  console.log(chalk.cyan(`\n📊 Fetching report for analysis: ${analysisId}\n`));
  
  const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json'
    }
  });
  
  try {
    // First check the progress
    console.log(chalk.blue('1️⃣ Checking analysis progress...'));
    const progressResponse = await apiClient.get(`/v1/analysis/${analysisId}/progress`);
    const { status, progress } = progressResponse.data;
    
    console.log(`   Status: ${status}`);
    console.log(`   Progress: ${progress}%`);
    
    if (status !== 'completed' && status !== 'complete') {
      console.log(chalk.yellow(`\n⚠️  Analysis is not completed yet (status: ${status})`));
      return;
    }
    
    // Get the report in different formats
    console.log(chalk.blue('\n2️⃣ Fetching report (JSON format)...'));
    const jsonReport = await apiClient.get(`/v1/analysis/${analysisId}/report`);
    
    console.log(chalk.green('\n✅ Report Summary:'));
    console.log(`   Analysis ID: ${jsonReport.data.analysisId}`);
    console.log(`   Total Findings: ${jsonReport.data.summary?.totalFindings || 'N/A'}`);
    console.log(`   Severity: ${JSON.stringify(jsonReport.data.summary?.severity || {})}`);
    console.log(`   Confidence: ${jsonReport.data.summary?.confidence || 'N/A'}`);
    
    // Show some findings
    if (jsonReport.data.report?.findings) {
      console.log(chalk.blue('\n📌 Sample Findings:'));
      const findings = jsonReport.data.report.findings;
      let count = 0;
      
      for (const [category, items] of Object.entries(findings)) {
        if (Array.isArray(items) && items.length > 0) {
          console.log(`\n   ${chalk.yellow(category)}:`);
          items.slice(0, 2).forEach((finding: any) => {
            console.log(`   - ${finding.severity}: ${finding.title}`);
            if (finding.description) {
              console.log(`     ${finding.description.substring(0, 100)}...`);
            }
            count++;
          });
        }
      }
    }
    
    // Get markdown report
    console.log(chalk.blue('\n3️⃣ Fetching report (Markdown format)...'));
    const markdownReport = await apiClient.get(`/v1/analysis/${analysisId}/report?format=markdown`);
    
    // Show first few lines of markdown
    console.log(chalk.green('\n📄 Markdown Report Preview:'));
    const lines = markdownReport.data.split('\n').slice(0, 20);
    lines.forEach((line: string) => console.log(`   ${line}`));
    console.log('   ...\n');
    
    // Get PR comment format
    console.log(chalk.blue('4️⃣ Fetching report (PR Comment format)...'));
    const prCommentReport = await apiClient.get(`/v1/analysis/${analysisId}/report?format=pr-comment`);
    
    if (prCommentReport.data.comment) {
      console.log(chalk.green('\n💬 PR Comment Preview:'));
      const commentLines = prCommentReport.data.comment.split('\n').slice(0, 10);
      commentLines.forEach((line: string) => console.log(`   ${line}`));
      console.log('   ...\n');
    }
    
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(chalk.red(`\n❌ Error: ${error.response?.status} - ${error.response?.statusText}`));
      console.error('Response:', error.response?.data);
    } else {
      console.error(chalk.red('\n❌ Error:'), error);
    }
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 1) {
  console.log(chalk.yellow('Usage: npx ts-node view-report.ts <analysisId> [apiKey]'));
  console.log(chalk.gray('\nExample analysis IDs from our tests:'));
  console.log(chalk.gray('  - analysis_1752488678070_q6jxrwaq8 (pay-per-scan user)'));
  console.log(chalk.gray('  - analysis_1752488682249_vvtz476ub (individual user)'));
  console.log(chalk.gray('\nIf no API key is provided, will use TEST_API_KEY_INDIVIDUAL from .env'));
  process.exit(1);
}

const analysisId = args[0];
const apiKey = args[1] || process.env.TEST_API_KEY_INDIVIDUAL || '';

if (!apiKey) {
  console.error(chalk.red('❌ No API key provided and TEST_API_KEY_INDIVIDUAL not found in .env'));
  process.exit(1);
}

viewReport(analysisId, apiKey).catch(console.error);