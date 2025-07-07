#!/usr/bin/env node

/**
 * Debug script for "Database error granting user" issue
 * This script will help diagnose and fix the authentication problem
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase configuration. Please check your .env file');
  process.exit(1);
}

console.log('🔍 Starting authentication debugging...\n');
console.log(`📍 Supabase URL: ${supabaseUrl}`);
console.log(`📧 Testing email: slavataichi@gmail.com\n`);

// Create both anon and service clients
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
const supabaseService = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

async function checkUserStatus() {
  console.log('1️⃣ Checking user status in auth.users...');
  
  if (!supabaseService) {
    console.log('⚠️  No service key available, using anon client (limited access)');
  }
  
  const client = supabaseService || supabaseAnon;
  
  // Try to get user from auth admin (requires service key)
  if (supabaseService) {
    try {
      const { data: { users }, error } = await supabaseService.auth.admin.listUsers();
      if (!error) {
        const user = users.find(u => u.email === 'slavataichi@gmail.com');
        if (user) {
          console.log('✅ User found in auth.users:');
          console.log(`   ID: ${user.id}`);
          console.log(`   Email confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
          console.log(`   Last sign in: ${user.last_sign_in_at || 'Never'}`);
          console.log(`   Created: ${user.created_at}`);
          console.log(`   Providers: ${JSON.stringify(user.app_metadata?.providers || [])}`);
          return user;
        } else {
          console.log('❌ User not found in auth.users');
        }
      } else {
        console.log(`❌ Error listing users: ${error.message}`);
      }
    } catch (err) {
      console.log(`❌ Error accessing auth admin: ${err.message}`);
    }
  }
  
  return null;
}

async function checkUserProfile() {
  console.log('\n2️⃣ Checking user profile...');
  
  const { data: profile, error } = await supabaseAnon
    .from('user_profiles')
    .select('*')
    .eq('email', 'slavataichi@gmail.com')
    .single();
  
  if (!error && profile) {
    console.log('✅ Profile found:');
    console.log(`   ID: ${profile.id}`);
    console.log(`   User ID: ${profile.user_id}`);
    console.log(`   Email: ${profile.email}`);
    console.log(`   Created: ${profile.created_at}`);
    console.log(`   Auth method: ${profile.auth_method || 'Not set'}`);
    return profile;
  } else {
    console.log(`❌ Profile not found or error: ${error?.message || 'No profile'}`);
    return null;
  }
}

async function testMagicLink() {
  console.log('\n3️⃣ Testing magic link generation...');
  
  try {
    const { data, error } = await supabaseAnon.auth.signInWithOtp({
      email: 'slavataichi@gmail.com',
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`,
      }
    });
    
    if (error) {
      console.log(`❌ Magic link error: ${error.message}`);
      console.log(`   Error code: ${error.code || 'N/A'}`);
      console.log(`   Status: ${error.status || 'N/A'}`);
      
      // Check if it's a rate limit error
      if (error.message.includes('rate limit')) {
        console.log('   💡 This might be a rate limiting issue. Wait a few minutes before trying again.');
      }
    } else {
      console.log('✅ Magic link sent successfully!');
      console.log('   Check your email for the login link');
    }
  } catch (err) {
    console.log(`❌ Unexpected error: ${err.message}`);
  }
}

async function testPasswordAuth() {
  console.log('\n4️⃣ Testing password authentication...');
  console.log('   (This will fail if user has no password set)');
  
  try {
    const { data, error } = await supabaseAnon.auth.signInWithPassword({
      email: 'slavataichi@gmail.com',
      password: 'test-password' // This will fail, but we want to see the error
    });
    
    if (error) {
      console.log(`❌ Password auth error: ${error.message}`);
      if (error.message.includes('Invalid login credentials')) {
        console.log('   ℹ️  This is expected if the user uses magic link only');
      } else if (error.message.includes('Database error granting user')) {
        console.log('   🚨 Same "granting user" error occurs with password auth!');
      }
    }
  } catch (err) {
    console.log(`❌ Unexpected error: ${err.message}`);
  }
}

async function createDirectSession() {
  console.log('\n5️⃣ Attempting to create session directly (requires service key)...');
  
  if (!supabaseService) {
    console.log('⚠️  Skipping - service key not available');
    return;
  }
  
  try {
    // First get the user
    const { data: { users }, error: listError } = await supabaseService.auth.admin.listUsers();
    if (listError) {
      console.log(`❌ Error listing users: ${listError.message}`);
      return;
    }
    
    const user = users.find(u => u.email === 'slavataichi@gmail.com');
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    // Try to generate a custom token
    const { data: token, error: tokenError } = await supabaseService.auth.admin.generateLink({
      type: 'magiclink',
      email: 'slavataichi@gmail.com',
    });
    
    if (tokenError) {
      console.log(`❌ Error generating token: ${tokenError.message}`);
    } else {
      console.log('✅ Generated magic link token:');
      console.log(`   ${token.properties.hashed_token.substring(0, 20)}...`);
      console.log(`   Action link: ${token.properties.action_link}`);
    }
  } catch (err) {
    console.log(`❌ Unexpected error: ${err.message}`);
  }
}

async function checkDatabasePermissions() {
  console.log('\n6️⃣ Checking database permissions...');
  
  // Test if we can execute auth functions
  try {
    const { data, error } = await supabaseAnon.rpc('auth.uid');
    if (!error) {
      console.log('✅ Can execute auth.uid() function');
    } else {
      console.log(`❌ Cannot execute auth.uid(): ${error.message}`);
    }
  } catch (err) {
    // This is expected to fail when not authenticated
    console.log('ℹ️  auth.uid() check skipped (requires authentication)');
  }
}

async function suggestFixes() {
  console.log('\n🔧 Suggested fixes:\n');
  
  console.log('1. Run the SQL fix script in Supabase SQL Editor:');
  console.log('   - Go to your Supabase dashboard');
  console.log('   - Navigate to SQL Editor');
  console.log('   - Run the contents of: packages/database/fix-auth-granting-issue.sql');
  
  console.log('\n2. Check Supabase Dashboard logs:');
  console.log('   - Go to Logs > Auth in your Supabase dashboard');
  console.log('   - Look for errors around the time of authentication attempts');
  
  console.log('\n3. Verify email provider settings:');
  console.log('   - Go to Authentication > Providers in Supabase dashboard');
  console.log('   - Ensure "Email" provider is enabled');
  console.log('   - Check SMTP settings if using custom email');
  
  console.log('\n4. Check for custom auth hooks:');
  console.log('   - Go to Database > Functions in Supabase dashboard');
  console.log('   - Look for any custom auth hooks that might be failing');
  
  console.log('\n5. If all else fails, try recreating the user:');
  console.log('   - Delete the user from auth.users and user_profiles');
  console.log('   - Create a new user through Supabase dashboard');
}

// Run all checks
async function runDiagnostics() {
  console.log('🚀 Starting CodeQual Authentication Diagnostics\n');
  console.log('='.'repeat(50) + '\n');
  
  await checkUserStatus();
  await checkUserProfile();
  await testMagicLink();
  await testPasswordAuth();
  await createDirectSession();
  await checkDatabasePermissions();
  await suggestFixes();
  
  console.log('\n' + '='.'repeat(50));
  console.log('✅ Diagnostics complete!\n');
  
  console.log('📋 Next steps:');
  console.log('1. Review the output above for any errors');
  console.log('2. Run the SQL fix script in Supabase');
  console.log('3. Check Supabase logs for more details');
  console.log('4. If the issue persists, check for custom auth hooks or triggers');
}

// Run the diagnostics
runDiagnostics().catch(console.error);