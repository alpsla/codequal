#!/usr/bin/env node

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Generate API key
function generateApiKey() {
  const randomBytes = crypto.randomBytes(16);
  return `ck_${randomBytes.toString('hex')}`;
}

// Hash API key
function hashApiKey(apiKey) {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

async function createTestApiKey() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // First, get a user ID (you can modify this to use a specific user)
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id')
    .limit(1);

  if (userError || !users || users.length === 0) {
    console.error('No users found in database. Please create a user first.');
    process.exit(1);
  }

  const userId = users[0].id;

  // Generate new API key
  const apiKey = generateApiKey();
  const keyHash = hashApiKey(apiKey);

  // Insert into database
  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      user_id: userId,
      name: 'E2E Test Key',
      key_hash: keyHash,
      key_prefix: 'ck_',
      usage_limit: 10000,
      active: true,
      permissions: { endpoints: '*' }
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating API key:', error);
    process.exit(1);
  }

  console.log('✅ API Key created successfully!');
  console.log('');
  console.log('API Key:', apiKey);
  console.log('');
  console.log('⚠️  IMPORTANT: Save this key now! It cannot be retrieved later.');
  console.log('');
  console.log('To use in E2E tests:');
  console.log(`API Key: ${apiKey}`);
}

createTestApiKey().catch(console.error);