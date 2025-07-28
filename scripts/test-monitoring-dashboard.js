#!/usr/bin/env node

/**
 * Test script for monitoring dashboard functionality
 */

const fetch = require('node-fetch');
const chalk = require('chalk');

const API_BASE = process.env.API_URL || 'http://localhost:3001';

// Get JWT token from environment or generate one
async function getAuthToken() {
  // For testing, we'll use the test user credentials
  const testEmail = 'test@example.com';
  const testPassword = 'test123';
  
  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword })
    });
    
    if (!response.ok) {
      console.log(chalk.yellow('Attempting to use API key instead...'));
      // Try with API key
      return process.env.CODEQUAL_API_KEY || 'test-api-key';
    }
    
    const data = await response.json();
    return data.token;
  } catch (error) {
    console.log(chalk.yellow('Auth endpoint not available, using test token'));
    return 'test-jwt-token';
  }
}

// Test DeepWiki temp metrics endpoint
async function testMetricsEndpoint(token) {
  console.log(chalk.blue('\n📊 Testing DeepWiki Temp Metrics Endpoint...'));
  
  try {
    const response = await fetch(`${API_BASE}/api/deepwiki/temp/metrics`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(chalk.green('✅ Metrics endpoint working!'));
      console.log(chalk.gray('Response:'), JSON.stringify(data, null, 2));
      
      // Validate response structure
      const requiredFields = ['usedGB', 'totalGB', 'availableGB', 'percentUsed', 'activeAnalyses'];
      const missingFields = requiredFields.filter(field => !(field in data));
      
      if (missingFields.length === 0) {
        console.log(chalk.green('✅ All required fields present'));
      } else {
        console.log(chalk.yellow('⚠️  Missing fields:'), missingFields);
      }
      
      // Check status logic
      if (data.status) {
        console.log(chalk.blue(`System Status: ${data.status}`));
        if (data.percentUsed > 85 && data.status !== 'critical') {
          console.log(chalk.yellow('⚠️  Status should be critical when usage > 85%'));
        }
      }
      
      return true;
    } else {
      console.log(chalk.red(`❌ Metrics endpoint failed: ${response.status} ${response.statusText}`));
      const error = await response.text();
      console.log(chalk.red('Error:'), error);
      return false;
    }
  } catch (error) {
    console.log(chalk.red('❌ Failed to connect to metrics endpoint'));
    console.log(chalk.red('Error:'), error.message);
    return false;
  }
}

// Test active analyses endpoint
async function testActiveAnalysesEndpoint(token) {
  console.log(chalk.blue('\n🔍 Testing Active Analyses Endpoint...'));
  
  try {
    const response = await fetch(`${API_BASE}/api/deepwiki/temp/active-analyses`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(chalk.green('✅ Active analyses endpoint working!'));
      console.log(chalk.gray('Response:'), JSON.stringify(data, null, 2));
      
      // Validate response structure
      if ('active' in data && 'analyses' in data && Array.isArray(data.analyses)) {
        console.log(chalk.green('✅ Response structure valid'));
        console.log(chalk.blue(`Active analyses: ${data.active}`));
        
        if (data.analyses.length > 0) {
          console.log(chalk.blue('Sample analysis:'), data.analyses[0]);
        }
      } else {
        console.log(chalk.yellow('⚠️  Unexpected response structure'));
      }
      
      return true;
    } else {
      console.log(chalk.red(`❌ Active analyses endpoint failed: ${response.status} ${response.statusText}`));
      const error = await response.text();
      console.log(chalk.red('Error:'), error);
      return false;
    }
  } catch (error) {
    console.log(chalk.red('❌ Failed to connect to active analyses endpoint'));
    console.log(chalk.red('Error:'), error.message);
    return false;
  }
}

// Test dashboard HTML accessibility
async function testDashboardHTML() {
  console.log(chalk.blue('\n🖥️  Testing Dashboard HTML...'));
  
  const fs = require('fs');
  const path = require('path');
  
  const dashboardPath = path.join(__dirname, '../testing/deepwiki-dashboard.html');
  
  if (fs.existsSync(dashboardPath)) {
    console.log(chalk.green('✅ Dashboard HTML file exists'));
    
    // Check file size
    const stats = fs.statSync(dashboardPath);
    console.log(chalk.gray(`File size: ${stats.size} bytes`));
    
    // Check for required elements
    const content = fs.readFileSync(dashboardPath, 'utf8');
    const requiredElements = [
      'storage-percent',
      'active-count',
      'available-gb',
      'system-status',
      'analyses-list'
    ];
    
    const missingElements = requiredElements.filter(id => !content.includes(`id="${id}"`));
    
    if (missingElements.length === 0) {
      console.log(chalk.green('✅ All required UI elements present'));
    } else {
      console.log(chalk.yellow('⚠️  Missing UI elements:'), missingElements);
    }
    
    return true;
  } else {
    console.log(chalk.red('❌ Dashboard HTML file not found'));
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log(chalk.cyan('🚀 Starting Monitoring Dashboard Tests'));
  console.log(chalk.gray(`API Base: ${API_BASE}`));
  
  // Get authentication token
  const token = await getAuthToken();
  console.log(chalk.gray(`Using token: ${token.substring(0, 20)}...`));
  
  // Run tests
  const results = {
    metrics: await testMetricsEndpoint(token),
    activeAnalyses: await testActiveAnalysesEndpoint(token),
    dashboardHTML: await testDashboardHTML()
  };
  
  // Summary
  console.log(chalk.cyan('\n📋 Test Summary:'));
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  
  if (passed === total) {
    console.log(chalk.green(`✅ All tests passed (${passed}/${total})`));
  } else {
    console.log(chalk.yellow(`⚠️  Some tests failed (${passed}/${total})`));
  }
  
  // Recommendations
  console.log(chalk.cyan('\n💡 Recommendations:'));
  if (results.metrics && results.activeAnalyses && results.dashboardHTML) {
    console.log(chalk.green('✅ Dashboard is ready for use!'));
    console.log(chalk.blue('   Open testing/deepwiki-dashboard.html in a browser'));
    console.log(chalk.blue('   Ensure API server is running on port 3001'));
  } else {
    console.log(chalk.yellow('⚠️  Fix the failing tests before using the dashboard'));
  }
  
  // Grafana integration notes
  console.log(chalk.cyan('\n🔗 Grafana Integration:'));
  console.log(chalk.blue('1. Import monitoring/codequal-alerts-dashboard.json to Grafana'));
  console.log(chalk.blue('2. Configure data source to point to Supabase'));
  console.log(chalk.blue('3. Set up notification channels for alerts'));
  console.log(chalk.blue('4. Customize alert thresholds based on your needs'));
}

// Run the tests
runTests().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});