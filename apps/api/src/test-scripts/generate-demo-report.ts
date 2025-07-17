#!/usr/bin/env ts-node

import chalk from 'chalk';
import axios from 'axios';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function generateDemoReport() {
  console.log(chalk.cyan('\n🎨 Generating Demo Report\n'));
  
  const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
      'X-API-Key': 'test_key',
      'Content-Type': 'application/json'
    }
  });
  
  try {
    // Call the demo report endpoint
    console.log(chalk.blue('1️⃣ Requesting demo report...'));
    
    const response = await apiClient.get('/v1/analysis/demo-report');
    
    if (response.data) {
      console.log(chalk.green('\n✅ Demo report generated!'));
      console.log('\nReport details:');
      console.log(JSON.stringify(response.data, null, 2));
      
      if (response.data.htmlUrl) {
        console.log(chalk.cyan('\n🌐 View HTML Report:'));
        console.log(`   ${response.data.htmlUrl}`);
        console.log(chalk.gray('\n   (Copy and paste this URL in your browser)'));
      }
      
      // Also try to fetch the actual HTML
      if (response.data.reportId) {
        console.log(chalk.blue('\n2️⃣ Fetching HTML content...'));
        try {
          const htmlResponse = await apiClient.get(`/v1/analysis/${response.data.reportId}/report?format=html`);
          console.log(chalk.green('   ✓ HTML report is accessible!'));
        } catch (e) {
          console.log(chalk.yellow('   ⚠️  Could not fetch HTML directly'));
        }
      }
    }
    
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(chalk.red('\n❌ Error:'), error.response?.status, error.response?.statusText);
      console.error('Response:', error.response?.data);
    } else {
      console.error(chalk.red('\n❌ Error:'), error);
    }
  }
}

// Run the generator
if (require.main === module) {
  generateDemoReport()
    .then(() => {
      console.log(chalk.cyan('\n✨ Done!\n'));
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}