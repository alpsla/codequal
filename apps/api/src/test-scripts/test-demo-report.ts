#!/usr/bin/env ts-node

import chalk from 'chalk';
import axios from 'axios';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function testDemoReport() {
  console.log(chalk.cyan('\n🚀 Testing Demo Report Endpoint\n'));
  
  const apiKey = process.env.TEST_API_KEY_INDIVIDUAL!;
  
  const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json'
    }
  });
  
  try {
    // First, let's check if there's a demo report endpoint
    console.log(chalk.blue('1️⃣ Checking for demo report...'));
    
    const demoResponse = await apiClient.get('/v1/analysis/demo-report');
    
    console.log(chalk.green('\n✅ Demo Report Retrieved!'));
    console.log('\nReport Type:', typeof demoResponse.data);
    
    if (typeof demoResponse.data === 'string') {
      // It's an HTML report
      console.log(chalk.blue('\n📄 HTML Report Preview:'));
      const lines = demoResponse.data.split('\n').slice(0, 50);
      lines.forEach(line => console.log(line));
      
      // Save the HTML report
      const fs = require('fs');
      const reportPath = resolve(__dirname, '../../demo-report.html');
      fs.writeFileSync(reportPath, demoResponse.data);
      console.log(chalk.green(`\n💾 HTML report saved to: ${reportPath}`));
      console.log(chalk.yellow('📌 Open this file in a web browser to view the formatted report'));
      
    } else {
      // It's JSON data
      console.log(chalk.blue('\n📊 JSON Report:'));
      console.log(JSON.stringify(demoResponse.data, null, 2));
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

// Run the test
if (require.main === module) {
  testDemoReport().then(() => {
    console.log(chalk.cyan('\n✨ Demo test complete\n'));
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}