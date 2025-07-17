#!/usr/bin/env node
const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const { join } = require('path');
const crypto = require('crypto');

// Load environment variables
config({ path: join(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function setupTestUsers() {
  console.log('Setting up E2E test users with correct schema...\n');
  
  const testUsers = [
    { email: 'slavataichi@gmail.com', name: 'Slava Taichi' },
    { email: 'rostislav.alpin@gmail.com', name: 'Rostislav Alpin' }
  ];
  
  for (const testUser of testUsers) {
    try {
      // First, create auth user if doesn't exist
      let { data: authUser, error: authError } = await supabase.auth.admin.getUserByEmail(testUser.email);
      
      if (!authUser || authError) {
        // Create auth user
        const { data: newAuthUser, error: createError } = await supabase.auth.admin.createUser({
          email: testUser.email,
          password: 'TestPassword123!',
          email_confirm: true
        });
        
        if (createError) {
          console.error(`Failed to create auth user ${testUser.email}:`, createError.message);
          continue;
        }
        
        authUser = newAuthUser.user;
        console.log(`✅ Created auth user: ${testUser.email}`);
      } else {
        console.log(`✅ Auth user exists: ${testUser.email}`);
      }
      
      const userId = authUser.user.id;
      
      // Create or update user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: userId,
          email: testUser.email,
          full_name: testUser.name
        }, {
          onConflict: 'user_id'
        });
      
      if (profileError) {
        console.error(`Failed to create profile for ${testUser.email}:`, profileError.message);
      } else {
        console.log(`✅ Created/updated profile for: ${testUser.email}`);
      }
      
      // Create or update user billing
      const stripeCustomerId = `cus_test_${crypto.randomBytes(8).toString('hex')}`;
      const stripeSubscriptionId = `sub_test_${crypto.randomBytes(8).toString('hex')}`;
      
      const { error: billingError } = await supabase
        .from('user_billing')
        .upsert({
          user_id: userId,
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: stripeSubscriptionId,
          subscription_status: 'active',
          subscription_tier: 'individual',
          trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          trial_scans_used: 0,
          trial_scans_limit: 10
        }, {
          onConflict: 'user_id'
        });
      
      if (billingError) {
        console.error(`Failed to create billing for ${testUser.email}:`, billingError.message);
      } else {
        console.log(`✅ Created/updated billing for: ${testUser.email}`);
      }
      
      // Check for existing API key
      const { data: existingKeys } = await supabase
        .from('api_keys')
        .select('key_prefix')
        .eq('user_id', userId)
        .eq('active', true)
        .eq('name', 'E2E Test Key');
      
      if (!existingKeys || existingKeys.length === 0) {
        // Generate API key
        const apiKey = 'ck_' + crypto.randomBytes(32).toString('hex');
        const keyPrefix = apiKey.substring(0, 8);
        const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
        
        const { error: keyError } = await supabase
          .from('api_keys')
          .insert({
            user_id: userId,
            name: 'E2E Test Key',
            key_prefix: keyPrefix,
            key_hash: keyHash,
            permissions: ['read', 'write'],
            usage_limit: 10000,
            usage_count: 0,
            rate_limit_per_minute: 60,
            rate_limit_per_hour: 1000,
            active: true
          });
        
        if (keyError) {
          console.error(`Failed to create API key for ${testUser.email}:`, keyError.message);
        } else {
          console.log(`✅ Created API key for: ${testUser.email}`);
          console.log(`   Key: ${apiKey}`);
          
          // Store the full key temporarily for testing
          await supabase
            .from('api_keys')
            .update({ 
              metadata: { full_key_for_testing: apiKey }
            })
            .eq('user_id', userId)
            .eq('key_prefix', keyPrefix);
        }
      } else {
        console.log(`✅ API key exists for: ${testUser.email}`);
        
        // Try to retrieve the full key from metadata
        const { data: keyData } = await supabase
          .from('api_keys')
          .select('metadata')
          .eq('user_id', userId)
          .eq('active', true)
          .eq('name', 'E2E Test Key')
          .single();
        
        if (keyData?.metadata?.full_key_for_testing) {
          console.log(`   Key: ${keyData.metadata.full_key_for_testing}`);
        }
      }
      
    } catch (error) {
      console.error(`Error processing ${testUser.email}:`, error.message);
    }
  }
  
  // Display summary
  console.log('\n📊 Test Users Summary:');
  console.log('======================\n');
  
  for (const testUser of testUsers) {
    try {
      const { data: authUser } = await supabase.auth.admin.getUserByEmail(testUser.email);
      
      if (authUser?.user) {
        const userId = authUser.user.id;
        
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userId)
          .single();
        
        const { data: billing } = await supabase
          .from('user_billing')
          .select('*')
          .eq('user_id', userId)
          .single();
        
        const { data: apiKeys } = await supabase
          .from('api_keys')
          .select('key_prefix, metadata, active')
          .eq('user_id', userId)
          .eq('active', true);
        
        console.log(`Email: ${testUser.email}`);
        console.log(`User ID: ${userId}`);
        console.log(`Profile: ${profile ? 'Yes' : 'No'}`);
        console.log(`Billing: ${billing?.subscription_tier || 'None'} (${billing?.subscription_status || 'inactive'})`);
        console.log(`API Keys: ${apiKeys?.length || 0} active`);
        
        if (apiKeys && apiKeys.length > 0) {
          apiKeys.forEach(key => {
            if (key.metadata?.full_key_for_testing) {
              console.log(`  - ${key.metadata.full_key_for_testing}`);
            } else {
              console.log(`  - ${key.key_prefix}...`);
            }
          });
        }
        
        console.log('---');
      }
    } catch (error) {
      console.error(`Error getting summary for ${testUser.email}:`, error.message);
    }
  }
  
  console.log('\n✨ Setup complete!');
  console.log('\nNote: API keys are stored in metadata for testing only.');
  console.log('In production, full keys should never be stored.');
}

setupTestUsers().catch(console.error);