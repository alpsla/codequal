#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

const supabaseUrl = 'https://ftjhmbbcuqjqmmbaymqb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0amhtYmJjdXFqcW1tYmF5bXFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg4NTk3MzQsImV4cCI6MjA1NDQzNTczNH0.coUpXWXWCuztUyaGSHx1-qfL1CG5wlVh3I33Rq6NMNI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function testMagicLink() {
  return new Promise((resolve) => {
    rl.question('Enter your email address: ', async (email) => {
      console.log('\nSending magic link to:', email);
      
      const { data, error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: 'http://localhost:3000/auth/callback',
        }
      });

      if (error) {
        console.error('❌ Magic link error:', error.message);
      } else {
        console.log('✅ Magic link sent successfully!');
        console.log('Check your email for the login link.');
      }
      
      resolve();
    });
  });
}

async function testGitLabOAuth() {
  console.log('\nTesting GitLab OAuth...');
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'gitlab',
    options: {
      redirectTo: 'http://localhost:3000/auth/callback',
      scopes: 'read_user',
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    console.error('❌ GitLab OAuth Error:', error.message);
    console.log('\nTroubleshooting steps:');
    console.log('1. Check Supabase Dashboard URL configuration');
    console.log('2. Verify GitLab OAuth app settings');
    console.log('3. Ensure redirect URLs match exactly');
  } else {
    console.log('✅ GitLab OAuth URL generated successfully!');
    console.log('\nOAuth URL:', data.url);
    console.log('\nTo test: Open this URL in your browser');
  }
}

async function testGitHubOAuth() {
  console.log('\nTesting GitHub OAuth...');
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: 'http://localhost:3000/auth/callback',
      scopes: 'read:user user:email',
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    console.error('❌ GitHub OAuth Error:', error.message);
  } else {
    console.log('✅ GitHub OAuth URL generated successfully!');
    console.log('\nOAuth URL:', data.url);
  }
}

async function main() {
  console.log('=== CodeQual Authentication Test Suite ===\n');
  
  console.log('Select test to run:');
  console.log('1. Test Magic Link');
  console.log('2. Test GitLab OAuth');
  console.log('3. Test GitHub OAuth');
  console.log('4. Test All');
  console.log('0. Exit');
  
  rl.question('\nEnter your choice (0-4): ', async (choice) => {
    switch (choice) {
      case '1':
        await testMagicLink();
        break;
      case '2':
        await testGitLabOAuth();
        break;
      case '3':
        await testGitHubOAuth();
        break;
      case '4':
        await testMagicLink();
        await testGitLabOAuth();
        await testGitHubOAuth();
        break;
      case '0':
        console.log('Exiting...');
        break;
      default:
        console.log('Invalid choice');
    }
    
    rl.close();
  });
}

main();