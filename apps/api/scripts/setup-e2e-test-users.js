#!/usr/bin/env node
const { config } = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const { join } = require('path');

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
  console.log('Setting up E2E test users...\n');
  
  const testUsers = [
    { email: 'slavataichi@gmail.com', name: 'Slava Taichi' },
    { email: 'rostislav.alpin@gmail.com', name: 'Rostislav Alpin' }
  ];
  
  for (const testUser of testUsers) {
    try {
      // Check if user exists
      let { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', testUser.email)
        .single();
      
      let userId;
      
      if (!existingUser) {
        // Create user
        const { data: newUser, error: userError } = await supabase
          .from('users')
          .insert({
            email: testUser.email,
            name: testUser.name
          })
          .select()
          .single();
        
        if (userError) {
          console.error(`Failed to create user ${testUser.email}:`, userError.message);
          continue;
        }
        
        userId = newUser.id;
        console.log(`✅ Created user: ${testUser.email}`);
      } else {
        userId = existingUser.id;
        console.log(`✅ User exists: ${testUser.email}`);
      }
      
      // Check for active subscription
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();
      
      if (!subscription) {
        // Create subscription
        const { error: subError } = await supabase
          .from('subscriptions')
          .insert({
            user_id: userId,
            plan_type: 'pro',
            status: 'active',
            start_date: new Date().toISOString(),
            end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          });
        
        if (subError) {
          console.error(`Failed to create subscription for ${testUser.email}:`, subError.message);
        } else {
          console.log(`✅ Created subscription for: ${testUser.email}`);
        }
      } else {
        console.log(`✅ Subscription exists for: ${testUser.email}`);
      }
      
      // Check for API key
      const { data: apiKey } = await supabase
        .from('api_keys')
        .select('key')
        .eq('user_id', userId)
        .eq('status', 'active')
        .eq('name', 'E2E Test Key')
        .single();
      
      if (!apiKey) {
        // Generate API key
        const key = 'ck_test_' + require('crypto').randomBytes(32).toString('hex');
        
        const { error: keyError } = await supabase
          .from('api_keys')
          .insert({
            user_id: userId,
            key: key,
            name: 'E2E Test Key',
            status: 'active'
          });
        
        if (keyError) {
          console.error(`Failed to create API key for ${testUser.email}:`, keyError.message);
        } else {
          console.log(`✅ Created API key for: ${testUser.email}`);
          console.log(`   Key: ${key}\n`);
        }
      } else {
        console.log(`✅ API key exists for: ${testUser.email}`);
        console.log(`   Key: ${apiKey.key}\n`);
      }
      
    } catch (error) {
      console.error(`Error processing ${testUser.email}:`, error.message);
    }
  }
  
  // Display summary
  console.log('\n📊 Test Users Summary:');
  console.log('======================\n');
  
  for (const testUser of testUsers) {
    const { data: user } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', testUser.email)
      .single();
    
    if (user) {
      const { data: apiKey } = await supabase
        .from('api_keys')
        .select('key')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();
      
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('plan_type, status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();
      
      console.log(`Email: ${user.email}`);
      console.log(`User ID: ${user.id}`);
      console.log(`API Key: ${apiKey?.key || 'Not found'}`);
      console.log(`Subscription: ${subscription?.plan_type || 'None'} (${subscription?.status || 'inactive'})`);
      console.log('---');
    }
  }
  
  console.log('\n✨ Setup complete!');
}

setupTestUsers().catch(console.error);