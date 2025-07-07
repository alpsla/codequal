#!/usr/bin/env node

/**
 * Test authentication flow to identify the exact "Database error granting user" issue
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    debug: true, // Enable debug mode
    persistSession: false,
    autoRefreshToken: false,
  }
});

async function testDirectSignIn() {
  console.log('🔍 Testing direct sign-in with existing session...\n');
  
  try {
    // First, try to get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.log('❌ Session error:', sessionError);
    } else if (session) {
      console.log('✅ Existing session found:', session.user.email);
    } else {
      console.log('ℹ️  No existing session');
    }
    
    // Try to sign in with a magic link
    console.log('\n📧 Attempting magic link sign-in...');
    const { data, error } = await supabase.auth.signInWithOtp({
      email: 'slavataichi@gmail.com',
      options: {
        shouldCreateUser: false, // Don't create user if doesn't exist
        emailRedirectTo: 'http://localhost:3000/auth/callback',
      }
    });
    
    if (error) {
      console.log('❌ Magic link error:', {
        message: error.message,
        status: error.status,
        code: error.code,
        details: error
      });
      
      // Check if it's specifically the granting error
      if (error.message.includes('Database error granting user')) {
        console.log('\n🚨 This is the "granting user" error!');
        console.log('   This typically means:');
        console.log('   1. Missing grants on auth schema objects');
        console.log('   2. Custom auth hook failing');
        console.log('   3. RLS policy blocking session creation');
        console.log('   4. Missing user profile trigger');
      }
    } else {
      console.log('✅ Magic link sent successfully');
      console.log('   Check email for login link');
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

async function testAuthConfig() {
  console.log('\n🔧 Checking auth configuration...\n');
  
  try {
    // Test if we can call auth methods
    const tests = [
      {
        name: 'Get session',
        test: () => supabase.auth.getSession()
      },
      {
        name: 'Get user (should fail without session)',
        test: () => supabase.auth.getUser()
      }
    ];
    
    for (const { name, test } of tests) {
      try {
        const result = await test();
        if (result.error) {
          console.log(`❌ ${name}: ${result.error.message}`);
        } else {
          console.log(`✅ ${name}: Success`);
        }
      } catch (err) {
        console.log(`❌ ${name}: ${err.message}`);
      }
    }
    
  } catch (err) {
    console.error('❌ Config test error:', err);
  }
}

async function checkDatabaseConnection() {
  console.log('\n🗄️  Testing database connection...\n');
  
  try {
    // Try to query user_profiles table
    const { data, error, count } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log('❌ Cannot access user_profiles:', error.message);
    } else {
      console.log('✅ Can access user_profiles table');
      console.log(`   Total profiles: ${count || 0}`);
    }
    
    // Try to check if specific user profile exists
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_id, email')
      .eq('email', 'slavataichi@gmail.com')
      .single();
    
    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = no rows
      console.log('❌ Error checking profile:', profileError.message);
    } else if (profile) {
      console.log('✅ User profile exists:', profile);
    } else {
      console.log('⚠️  No profile found for slavataichi@gmail.com');
    }
    
  } catch (err) {
    console.error('❌ Database test error:', err);
  }
}

async function suggestNextSteps() {
  console.log('\n📋 Recommended Actions:\n');
  
  console.log('1. Run the minimal fix SQL script:');
  console.log('   packages/database/fix-auth-minimal.sql');
  
  console.log('\n2. Check Supabase Dashboard:');
  console.log('   - Go to Authentication > Logs');
  console.log('   - Look for errors with "grant" in the message');
  console.log('   - Check Database > Functions for any auth-related functions');
  
  console.log('\n3. Verify in SQL Editor:');
  console.log('   Run: SELECT * FROM auth.config;');
  console.log('   Check if any custom settings might be causing issues');
  
  console.log('\n4. Test with a fresh user:');
  console.log('   Try creating a completely new user to see if the issue is user-specific');
  
  console.log('\n5. Check Supabase project settings:');
  console.log('   - Ensure email provider is properly configured');
  console.log('   - Check if there are any custom auth hooks enabled');
}

// Run all tests
async function runTests() {
  console.log('🚀 CodeQual Authentication Diagnostics\n');
  console.log('='.'repeat(50) + '\n');
  
  await testDirectSignIn();
  await testAuthConfig();
  await checkDatabaseConnection();
  await suggestNextSteps();
  
  console.log('\n' + '='.'repeat(50));
  console.log('✅ Diagnostics complete!\n');
}

runTests().catch(console.error);