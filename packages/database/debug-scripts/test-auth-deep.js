#!/usr/bin/env node

/**
 * Deep dive test to identify exactly where the auth flow is failing
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Deep Authentication Flow Test\n');
console.log('='.'repeat(50) + '\n');

// Create client with debug logging
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    debug: true,
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
    flowType: 'pkce', // Try PKCE flow which might avoid the issue
  },
  global: {
    headers: {
      'x-debug-mode': 'true'
    }
  }
});

async function testMagicLinkVariations() {
  console.log('🧪 Testing different magic link configurations...\n');
  
  const variations = [
    {
      name: 'Standard magic link',
      options: {
        email: 'slavataichi@gmail.com',
      }
    },
    {
      name: 'Magic link with redirect',
      options: {
        email: 'slavataichi@gmail.com',
        options: {
          emailRedirectTo: 'http://localhost:3000/auth/callback',
        }
      }
    },
    {
      name: 'Magic link with PKCE',
      options: {
        email: 'slavataichi@gmail.com',
        options: {
          emailRedirectTo: 'http://localhost:3000/auth/callback',
          createUser: false, // Don't try to create user
        }
      }
    },
    {
      name: 'Magic link with custom data',
      options: {
        email: 'slavataichi@gmail.com',
        options: {
          data: {
            test: 'true'
          }
        }
      }
    }
  ];
  
  for (const variation of variations) {
    console.log(`\n📧 Testing: ${variation.name}`);
    try {
      const { data, error } = await supabase.auth.signInWithOtp(variation.options);
      
      if (error) {
        console.log('❌ Error:', {
          message: error.message,
          status: error.status,
          code: error.code,
        });
        
        // Check for specific error
        if (error.message.includes('Database error granting user')) {
          console.log('   🚨 Got the granting error!');
          console.log('   This variation triggers the issue');
        }
      } else {
        console.log('✅ Success! This variation works');
        if (data) {
          console.log('   Response:', JSON.stringify(data, null, 2));
        }
        break; // Found a working variation
      }
    } catch (err) {
      console.log('❌ Unexpected error:', err.message);
    }
    
    // Wait a bit between attempts to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

async function testAlternativeAuth() {
  console.log('\n🔐 Testing alternative authentication methods...\n');
  
  // Test if we can create a user with admin API (requires service key)
  if (supabaseServiceKey) {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    });
    
    try {
      console.log('🔑 Testing admin user creation...');
      const { data: { user }, error } = await supabaseAdmin.auth.admin.createUser({
        email: 'test-' + Date.now() + '@example.com',
        email_confirm: true,
      });
      
      if (error) {
        console.log('❌ Admin create error:', error.message);
      } else {
        console.log('✅ Admin can create users successfully');
        // Clean up test user
        if (user) {
          await supabaseAdmin.auth.admin.deleteUser(user.id);
        }
      }
    } catch (err) {
      console.log('❌ Admin API error:', err.message);
    }
  }
}

async function testDatabaseDirectly() {
  console.log('\n🗄️  Testing database operations directly...\n');
  
  // Test if we can query auth-related data
  const tests = [
    {
      name: 'Query user_profiles',
      query: supabase.from('user_profiles').select('*').eq('email', 'slavataichi@gmail.com')
    },
    {
      name: 'Insert test profile',
      query: supabase.from('user_profiles').insert({
        user_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
        email: 'test-db-' + Date.now() + '@example.com'
      })
    }
  ];
  
  for (const test of tests) {
    console.log(`📊 ${test.name}...`);
    const { data, error } = await test.query;
    
    if (error) {
      console.log(`❌ Error: ${error.message}`);
    } else {
      console.log(`✅ Success:`, data);
    }
  }
}

async function checkSupabaseHealth() {
  console.log('\n🏥 Checking Supabase health...\n');
  
  try {
    // Try to make a simple RPC call
    const { data, error } = await supabase.rpc('auth.email', { email: 'test@example.com' });
    
    if (error) {
      console.log('❌ RPC test failed:', error.message);
    } else {
      console.log('✅ RPC calls working');
    }
  } catch (err) {
    // This is expected to fail, we just want to see the error
    console.log('ℹ️  RPC test error (expected):', err.message);
  }
}

async function runAllTests() {
  await testMagicLinkVariations();
  await testAlternativeAuth();
  await testDatabaseDirectly();
  await checkSupabaseHealth();
  
  console.log('\n' + '='.'repeat(50));
  console.log('📋 Summary:\n');
  console.log('If all magic link variations fail with "Database error granting user",');
  console.log('the issue is likely in Supabase\'s internal auth flow.');
  console.log('\nRecommended actions:');
  console.log('1. Check Supabase Dashboard → Logs → Auth Logs');
  console.log('2. Look for any custom auth hooks in Database → Functions');
  console.log('3. Try creating a fresh user through the dashboard');
  console.log('4. Contact Supabase support with your project ID');
}

runAllTests().catch(console.error);