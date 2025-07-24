/**
 * Generate a test JWT token for E2E testing
 * This bypasses the UI login flow for testing purposes
 */

import jwt from 'jsonwebtoken';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config({ path: '../../.env' });

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!JWT_SECRET) {
  console.error('JWT_SECRET is not set in environment variables');
  process.exit(1);
}

/**
 * Generate a test token with user claims
 */
function generateTestToken(userId: string, email: string) {
  const payload = {
    sub: userId,
    email: email,
    user_metadata: {
      email: email,
      full_name: 'Test User'
    },
    app_metadata: {
      provider: 'email',
      providers: ['email']
    },
    role: 'authenticated',
    aud: 'authenticated',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    algorithm: 'HS256'
  });

  return token;
}

/**
 * Create or get test user from database
 */
async function getOrCreateTestUser() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    // Fallback to generating token without DB check
    console.log('⚠️  No Supabase credentials, generating token without DB verification');
    const testUserId = 'test-user-' + Date.now();
    return {
      id: testUserId,
      email: 'test@codequal.com'
    };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  // Check if test user exists
  const { data: existingUser, error: fetchError } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', 'test@codequal.com')
    .single();

  if (existingUser) {
    console.log('✅ Found existing test user:', existingUser.id);
    return existingUser;
  }

  // Create test user
  const { data: newUser, error: createError } = await supabase
    .from('users')
    .insert({
      email: 'test@codequal.com',
      full_name: 'Test User',
      created_at: new Date().toISOString()
    })
    .select('id, email')
    .single();

  if (createError) {
    console.error('Failed to create test user:', createError);
    // Fallback to generating token anyway
    return {
      id: 'test-user-' + Date.now(),
      email: 'test@codequal.com'
    };
  }

  console.log('✅ Created test user:', newUser.id);
  return newUser;
}

/**
 * Main function
 */
async function main() {
  console.log('🔐 Generating test JWT token for E2E testing...\n');

  try {
    // Get or create test user
    const user = await getOrCreateTestUser();
    
    // Generate token
    const token = generateTestToken(user.id, user.email);
    
    console.log('✅ Token generated successfully!\n');
    console.log('User ID:', user.id);
    console.log('Email:', user.email);
    console.log('\n📋 Copy this token:\n');
    console.log(token);
    console.log('\n🚀 To use it, run:');
    console.log(`export TEST_USER_TOKEN="${token}"`);
    console.log('\nOr pass it directly to your test script.');
    
    // Also save to a file for convenience
    const fs = require('fs');
    fs.writeFileSync('.test-token', token);
    console.log('\n💾 Token also saved to: .test-token');
    
  } catch (error) {
    console.error('❌ Failed to generate token:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { generateTestToken };