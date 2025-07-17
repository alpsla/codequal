#!/usr/bin/env ts-node

import chalk from 'chalk';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

const API_URL = 'http://localhost:3001';
const WEB_URL = 'http://localhost:3000';

async function testRealUserFlow() {
  console.log(chalk.cyan('\n🚀 Testing Real User Flow\n'));
  
  // Initialize Supabase client (as the web app would)
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY! // Web app uses anon key
  );
  
  // Test user credentials
  const testUser = {
    email: 'rostislav.alpin@gmail.com',
    password: process.env.TEST_USER_INDIVIDUAL_PASSWORD || 'testpass123'
  };
  
  console.log(chalk.blue('1️⃣ Simulating user login...'));
  console.log(`   Email: ${testUser.email}`);
  
  try {
    // Login (as web app would)
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password
    });
    
    if (authError) {
      console.log(chalk.red(`   ❌ Login failed: ${authError.message}`));
      console.log(chalk.yellow('\n   💡 Please set TEST_USER_INDIVIDUAL_PASSWORD in .env'));
      console.log(chalk.yellow('   💡 Or login manually at http://localhost:3000'));
      return;
    }
    
    console.log(chalk.green('   ✓ Login successful!'));
    console.log(`   Session: ${authData.session?.access_token.substring(0, 20)}...`);
    
    // Create authenticated API client (as web app would)
    const apiClient = axios.create({
      baseURL: API_URL,
      headers: {
        'Authorization': `Bearer ${authData.session?.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Test API access
    console.log(chalk.blue('\n2️⃣ Testing API access...'));
    
    const profileResponse = await apiClient.get('/api/profile');
    console.log(`   ✓ Profile accessible`);
    console.log(`   - Name: ${profileResponse.data.full_name || 'Not set'}`);
    console.log(`   - Subscription: ${profileResponse.data.subscription_tier}`);
    
    // Submit PR for analysis
    console.log(chalk.blue('\n3️⃣ Submitting PR for analysis...'));
    
    // Use a small, public repository
    const testPR = {
      repositoryUrl: 'https://github.com/vercel/ms',
      prNumber: 50,
      analysisMode: 'quick' as const
    };
    
    console.log(`   Repository: ${testPR.repositoryUrl}`);
    console.log(`   PR: #${testPR.prNumber}`);
    console.log(`   Mode: ${testPR.analysisMode}`);
    
    const analysisResponse = await apiClient.post('/api/analyze-pr', testPR);
    const { analysisId } = analysisResponse.data;
    
    console.log(chalk.green(`   ✓ Analysis started: ${analysisId}`));
    
    // Poll for completion
    console.log(chalk.blue('\n4️⃣ Waiting for analysis to complete...'));
    
    let completed = false;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes
    
    while (!completed && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5 seconds
      
      const progressResponse = await apiClient.get(`/api/analysis/${analysisId}/progress`);
      const { status, progress } = progressResponse.data;
      
      if (attempts % 6 === 0 || status === 'completed' || status === 'complete') {
        console.log(`   [${attempts * 5}s] Status: ${status}, Progress: ${progress}%`);
      }
      
      if (status === 'completed' || status === 'complete') {
        completed = true;
      } else if (status === 'failed') {
        throw new Error('Analysis failed');
      }
      
      attempts++;
    }
    
    if (!completed) {
      throw new Error('Analysis timed out');
    }
    
    console.log(chalk.green('   ✓ Analysis completed!'));
    
    // Get the report
    console.log(chalk.blue('\n5️⃣ Retrieving report...'));
    
    const reportResponse = await apiClient.get(`/api/analysis/${analysisId}/report`);
    
    console.log(chalk.green('   ✓ Report retrieved!'));
    console.log('\n   Summary:');
    console.log(`   - Total Findings: ${reportResponse.data.summary?.totalFindings || 0}`);
    console.log(`   - Report URL: ${WEB_URL}/reports/${analysisId}`);
    
    console.log(chalk.cyan('\n\n✅ Complete user flow successful!'));
    console.log(chalk.yellow(`\n📊 View the report at: ${WEB_URL}/reports/${analysisId}`));
    
  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), error);
    if (axios.isAxiosError(error)) {
      console.error('Response:', error.response?.data);
    }
  } finally {
    // Logout
    await supabase.auth.signOut();
  }
}

// Run the test
if (require.main === module) {
  console.log(chalk.gray('This test simulates exactly what a real user would experience'));
  console.log(chalk.gray('through the web interface at http://localhost:3000'));
  
  testRealUserFlow().catch(console.error);
}