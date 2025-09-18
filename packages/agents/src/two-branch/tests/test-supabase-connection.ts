/**
 * Test Supabase Connection and API Calls
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase Connection');
  console.log('=' .repeat(60));
  
  // Check environment variables
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  
  console.log('\n📋 Environment Variables Check:');
  console.log(`SUPABASE_URL: ${supabaseUrl ? '✅ Set' : '❌ Not set'}`);
  console.log(`SUPABASE_KEY: ${supabaseKey ? '✅ Set' : '❌ Not set'}`);
  console.log(`OPENROUTER_API_KEY: ${openRouterKey ? '✅ Set' : '❌ Not set'}`);
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('\n❌ Missing Supabase credentials!');
    console.log('\n💡 To fix this:');
    console.log('1. Create a .env file in the packages/agents directory');
    console.log('2. Add the following variables:');
    console.log('   SUPABASE_URL=your_supabase_url');
    console.log('   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
    console.log('   OPENROUTER_API_KEY=your_openrouter_api_key');
    return;
  }
  
  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);
  console.log('\n🔗 Supabase client created');
  
  // Test 1: Check if we can connect and query
  console.log('\n📊 Test 1: Fetching model configurations...');
  try {
    const { data, error } = await supabase
      .from('model_configurations')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('❌ Error fetching model configurations:', error);
      console.log('\nPossible issues:');
      console.log('- Table might not exist');
      console.log('- API key might not have permissions');
      console.log('- Wrong Supabase project URL');
    } else {
      console.log(`✅ Successfully fetched ${data?.length || 0} model configurations`);
      if (data && data.length > 0) {
        console.log('\nSample configuration:');
        console.log(JSON.stringify(data[0], null, 2));
      }
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
  
  // Test 2: Check if we can query analysis_results
  console.log('\n📊 Test 2: Checking analysis_results table...');
  try {
    const { data, error } = await supabase
      .from('analysis_results')
      .select('id, created_at, repository')
      .limit(3)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Error fetching analysis results:', error);
    } else {
      console.log(`✅ Successfully fetched ${data?.length || 0} analysis results`);
      if (data && data.length > 0) {
        console.log('\nRecent analyses:');
        data.forEach(item => {
          console.log(`- ${item.repository} (${new Date(item.created_at).toLocaleDateString()})`);
        });
      }
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
  
  // Test 3: Test OpenRouter API
  console.log('\n🌐 Test 3: Testing OpenRouter API...');
  if (!openRouterKey) {
    console.log('⚠️ OpenRouter API key not set, skipping test');
  } else {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data: any = await response.json();
        console.log(`✅ OpenRouter API working - ${data.data?.length || 0} models available`);
        
        // Check for specific models we use
        const modelsWeUse = [
          'anthropic/claude-3.5-sonnet',
          'deepseek/deepseek-chat',
          'google/gemini-2.0-flash-exp'
        ];
        
        console.log('\n📋 Checking our models:');
        modelsWeUse.forEach(modelId => {
          const found = data.data?.find((m: any) => m.id === modelId);
          console.log(`${modelId}: ${found ? '✅ Available' : '❌ Not found'}`);
        });
      } else {
        console.error('❌ OpenRouter API error:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error details:', errorText);
      }
    } catch (err) {
      console.error('❌ Error calling OpenRouter:', err);
    }
  }
  
  // Test 4: Check if we're using real or mock data
  console.log('\n🔍 Test 4: Checking if real API calls would be made...');
  console.log('Current configuration:');
  console.log(`- Supabase: ${supabaseUrl && supabaseKey ? '✅ Real' : '❌ Mock'}`);
  console.log(`- OpenRouter: ${openRouterKey ? '✅ Real' : '❌ Mock'}`);
  
  if (!supabaseUrl || !supabaseKey || !openRouterKey) {
    console.log('\n⚠️ Running in MOCK mode - no real API calls will be made');
    console.log('💰 This is why your OpenRouter balance is not changing');
  } else {
    console.log('\n✅ Running in REAL mode - API calls should deduct from balance');
    console.log('💡 If balance still not changing, check:');
    console.log('- OpenRouter dashboard for API activity');
    console.log('- Whether responses are being cached');
    console.log('- If the test is actually making model calls');
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('Test complete!');
}

// Run the test
testSupabaseConnection().catch(console.error);