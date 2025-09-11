#!/usr/bin/env node

/**
 * Setup test user for monitoring dashboard
 */

const { createClient } = require('@supabase/supabase-js');
const chalk = require('chalk');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(chalk.red('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables'));
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function setupTestUser() {
  console.log(chalk.blue('🔐 Setting up test user for monitoring dashboard\n'));
  
  const testEmail = 'monitoring-test@codequal.com';
  const testPassword = 'monitoring-test-123';
  
  try {
    // First, try to sign in with existing user
    console.log(chalk.yellow('Attempting to sign in with existing test user...'));
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (signInData?.session?.access_token) {
      console.log(chalk.green('✅ Successfully signed in with existing test user!'));
      console.log(chalk.cyan('\n📋 JWT Token for Monitoring Dashboard:'));
      console.log(chalk.white.bgBlack(signInData.session.access_token));
      console.log(chalk.gray('\nThis token is valid for 1 hour.'));
      return signInData.session.access_token;
    }
    
    // If sign in failed, try to create the user
    console.log(chalk.yellow('Creating new test user...'));
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true
    });
    
    if (createError) {
      console.error(chalk.red('Failed to create test user:'), createError.message);
      
      // If user exists, try to update password
      if (createError.message.includes('already exists')) {
        console.log(chalk.yellow('User exists, updating password...'));
        const { data: users } = await supabase.auth.admin.listUsers();
        const testUser = users?.users?.find(u => u.email === testEmail);
        
        if (testUser) {
          await supabase.auth.admin.updateUserById(testUser.id, {
            password: testPassword
          });
          
          // Try to sign in again
          const { data: retryData } = await supabase.auth.signInWithPassword({
            email: testEmail,
            password: testPassword
          });
          
          if (retryData?.session?.access_token) {
            console.log(chalk.green('✅ Successfully updated and signed in!'));
            console.log(chalk.cyan('\n📋 JWT Token for Monitoring Dashboard:'));
            console.log(chalk.white.bgBlack(retryData.session.access_token));
            return retryData.session.access_token;
          }
        }
      }
      
      throw createError;
    }
    
    // Sign in with the newly created user
    console.log(chalk.yellow('Signing in with new test user...'));
    const { data: newSignInData, error: newSignInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (newSignInData?.session?.access_token) {
      console.log(chalk.green('✅ Test user created and signed in successfully!'));
      console.log(chalk.cyan('\n📋 JWT Token for Monitoring Dashboard:'));
      console.log(chalk.white.bgBlack(newSignInData.session.access_token));
      console.log(chalk.gray('\nThis token is valid for 1 hour.'));
      
      // Also create user profile
      await supabase.from('user_profiles').upsert({
        id: createData.user.id,
        email: testEmail,
        full_name: 'Monitoring Test User',
        role: 'admin'
      });
      
      return newSignInData.session.access_token;
    }
    
    throw new Error('Failed to get session after creating user');
    
  } catch (error) {
    console.error(chalk.red('Error setting up test user:'), error.message);
    
    // Provide alternative
    console.log(chalk.cyan('\n📌 Alternative: Use API key authentication'));
    console.log(chalk.gray('You can also use an API key instead of JWT token.'));
    console.log(chalk.gray('Check if you have any API keys in the database:'));
    console.log(chalk.gray('SELECT key_prefix FROM api_keys LIMIT 5;'));
  }
}

// Run the setup
setupTestUser().then(token => {
  if (token) {
    console.log(chalk.cyan('\n📝 Instructions:'));
    console.log('1. Copy the JWT token above');
    console.log('2. Open the monitoring dashboard');
    console.log('3. Paste the token when prompted');
    console.log('4. Or click "Update Token" button to change it later');
    console.log(chalk.green('\n✅ Setup complete!'));
  }
}).catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});