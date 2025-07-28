#!/usr/bin/env node

/**
 * Script to get JWT token for monitoring dashboard testing
 */

const fetch = require('node-fetch');
const chalk = require('chalk');

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function getJWTToken() {
  console.log(chalk.blue('🔐 Getting JWT Token for Monitoring Dashboard\n'));
  
  // Try different authentication methods
  
  // Method 1: Try with test user credentials
  console.log(chalk.yellow('1. Trying test user login...'));
  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'test123'
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.token) {
        console.log(chalk.green('✅ Successfully got JWT token with test user!'));
        console.log(chalk.cyan('\nYour JWT Token:'));
        console.log(chalk.white.bgBlack(data.token));
        console.log(chalk.gray('\nCopy this token and paste it when the monitoring dashboard prompts you.'));
        return data.token;
      }
    }
  } catch (error) {
    console.log(chalk.yellow('Test user login not available'));
  }
  
  // Method 2: Try to get from existing session
  console.log(chalk.yellow('\n2. Checking for existing session...'));
  try {
    // Check if there's a test API key we can use
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Try to sign in with test user
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'test123'
      });
      
      if (data?.session?.access_token) {
        console.log(chalk.green('✅ Got token from Supabase session!'));
        console.log(chalk.cyan('\nYour JWT Token:'));
        console.log(chalk.white.bgBlack(data.session.access_token));
        return data.session.access_token;
      }
    }
  } catch (error) {
    console.log(chalk.yellow('Supabase session not available'));
  }
  
  // Method 3: Generate a test token
  console.log(chalk.yellow('\n3. Generating test token...'));
  try {
    const jwt = require('jsonwebtoken');
    const testToken = jwt.sign(
      {
        sub: '00000000-0000-0000-0000-000000000000',
        email: 'test@example.com',
        role: 'authenticated',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
      },
      process.env.JWT_SECRET || 'test-secret-key-for-development-only'
    );
    
    console.log(chalk.green('✅ Generated test JWT token!'));
    console.log(chalk.cyan('\nYour JWT Token:'));
    console.log(chalk.white.bgBlack(testToken));
    console.log(chalk.yellow('\n⚠️  Note: This is a test token. For production, use proper authentication.'));
    return testToken;
  } catch (error) {
    console.log(chalk.red('Failed to generate test token:', error.message));
  }
  
  // If all methods fail, provide instructions
  console.log(chalk.red('\n❌ Could not get JWT token automatically.'));
  console.log(chalk.cyan('\nManual Options:'));
  console.log('1. Use the web UI to login and get token from browser DevTools:');
  console.log('   - Open: http://localhost:3000');
  console.log('   - Login with your credentials');
  console.log('   - Open DevTools > Application > Local Storage');
  console.log('   - Look for "jwt_token" or "access_token"');
  console.log('\n2. Use curl to login:');
  console.log(chalk.gray(`   curl -X POST ${API_URL}/api/auth/login \\`));
  console.log(chalk.gray('     -H "Content-Type: application/json" \\'));
  console.log(chalk.gray('     -d \'{"email":"your@email.com","password":"yourpassword"}\''));
}

// Run the script
getJWTToken().catch(error => {
  console.error(chalk.red('Error:'), error);
  process.exit(1);
});