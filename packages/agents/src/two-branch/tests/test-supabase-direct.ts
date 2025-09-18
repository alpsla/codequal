#!/usr/bin/env npx ts-node

/**
 * Test Direct Supabase Connection
 */

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';

// Load environment variables from .env file
const envPath = path.join(__dirname, '../../../.env');
console.log(`Loading env from: ${envPath}`);
dotenv.config({ path: envPath });

async function testSupabase() {
  console.log('🔍 Testing Direct Supabase Connection');
  console.log('=' .repeat(60));
  
  // Check environment variables
  console.log('\n1️⃣ Environment Variables:');
  console.log(`   SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing'}`);
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('\n❌ Missing Supabase credentials!');
    return;
  }
  
  // Show partial values for debugging
  console.log(`\n   URL: ${process.env.SUPABASE_URL}`);
  console.log(`   Key (first 20 chars): ${process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20)}...`);
  
  // Create Supabase client
  console.log('\n2️⃣ Creating Supabase Client...');
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  console.log('✅ Client created');
  
  // Test query to model_configurations
  console.log('\n3️⃣ Testing Query to model_configurations...');
  try {
    const { data, error, count } = await supabase
      .from('model_configurations')
      .select('*', { count: 'exact' })
      .limit(5);
    
    if (error) {
      console.error('❌ Query failed:', error);
      console.error('   Error details:', {
        message: error.message,
        hint: error.hint,
        details: error.details,
        code: error.code
      });
    } else {
      console.log(`✅ Query successful! Found ${count || data?.length || 0} configurations`);
      
      if (data && data.length > 0) {
        console.log('\n   Sample configurations:');
        data.slice(0, 3).forEach(config => {
          console.log(`   - ${config.role}: ${config.primary_model}`);
        });
      }
    }
  } catch (e) {
    console.error('❌ Exception:', e);
  }
  
  // Test query for latest models
  console.log('\n4️⃣ Fetching Latest Models (< 6 months old)...');
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const { data, error } = await supabase
      .from('model_configurations')
      .select('role, primary_model, fallback_model, last_updated')
      .gte('last_updated', sixMonthsAgo.toISOString())
      .in('role', ['security', 'architecture', 'performance'])
      .order('last_updated', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('❌ Query failed:', error);
    } else if (data && data.length > 0) {
      console.log(`✅ Found ${data.length} recent configurations:`);
      data.forEach(config => {
        const updated = new Date(config.last_updated);
        const daysAgo = Math.floor((Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24));
        console.log(`   ${config.role}: ${config.primary_model} (${daysAgo} days ago)`);
      });
    } else {
      console.log('⚠️  No recent configurations found');
    }
  } catch (e) {
    console.error('❌ Exception:', e);
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('✅ Test complete!');
}

testSupabase().catch(console.error);