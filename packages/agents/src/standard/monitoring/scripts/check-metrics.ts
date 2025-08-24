#!/usr/bin/env node
/**
 * Check Metrics Script
 * Verifies that metrics are being properly recorded to Supabase
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from project root
// Script is in: packages/agents/src/standard/monitoring/scripts/
// So we need to go up 6 levels to reach project root
const envPath = path.resolve(__dirname, '../../../../../../.env');
console.log('Loading environment from:', envPath);
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('Error loading .env file:', result.error);
  // Try alternative path
  const altPath = path.resolve(process.cwd(), '../../.env');
  console.log('Trying alternative path:', altPath);
  dotenv.config({ path: altPath });
}

// Check if environment variables are loaded
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables!');
  console.error('   SUPABASE_URL:', process.env.SUPABASE_URL ? '✓ Set' : '✗ Missing');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ Set' : '✗ Missing');
  console.error('\nPlease ensure your .env file contains these variables.');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkMetrics() {
  console.log('🔍 Checking CodeQual Metrics in Supabase...\n');
  
  // Check connection
  console.log('1️⃣ Testing Supabase connection...');
  const { data: testData, error: testError } = await supabase
    .from('agent_activity')
    .select('count')
    .limit(1);
  
  if (testError) {
    console.error('❌ Failed to connect to Supabase:', testError.message);
    console.log('\n🔧 Please check:');
    console.log('   - SUPABASE_URL is set correctly');
    console.log('   - SUPABASE_SERVICE_ROLE_KEY is valid');
    console.log('   - agent_activity table exists');
    process.exit(1);
  }
  
  console.log('✅ Connected to Supabase successfully\n');
  
  // Get recent metrics
  console.log('2️⃣ Fetching recent metrics...');
  const { data: recentData, error: recentError } = await supabase
    .from('agent_activity')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(5);
  
  if (recentError) {
    console.error('❌ Failed to fetch recent data:', recentError.message);
    process.exit(1);
  }
  
  if (!recentData || recentData.length === 0) {
    console.log('⚠️  No agent activity found in the database');
    console.log('\n🔧 To generate metrics:');
    console.log('   1. Run an analysis: npm run analyze -- --repo <url> --pr <number>');
    console.log('   2. Ensure tracking is enabled (USE_DEEPWIKI_MOCK=false)');
    console.log('   3. Check that agents are initialized with tracking');
    return;
  }
  
  console.log(`✅ Found ${recentData.length} recent activities\n`);
  
  // Show summary statistics
  console.log('3️⃣ Summary Statistics (last 24 hours)...');
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  
  const { data: statsData, error: statsError } = await supabase
    .from('agent_activity')
    .select('*')
    .gte('timestamp', oneDayAgo);
  
  if (statsError) {
    console.error('❌ Failed to fetch statistics:', statsError.message);
    process.exit(1);
  }
  
  if (statsData && statsData.length > 0) {
    const stats = {
      totalOperations: statsData.length,
      uniqueAgents: new Set(statsData.map(d => d.agent_role)).size,
      uniqueModels: new Set(statsData.map(d => d.model_used)).size,
      successRate: (statsData.filter(d => d.success).length / statsData.length * 100).toFixed(1),
      fallbackRate: (statsData.filter(d => d.is_fallback).length / statsData.length * 100).toFixed(1),
      totalCost: statsData.reduce((sum, d) => sum + (d.cost || 0), 0).toFixed(2),
      avgDuration: (statsData.reduce((sum, d) => sum + (d.duration_ms || 0), 0) / statsData.length).toFixed(0)
    };
    
    console.log('📊 Metrics Summary:');
    console.log(`   Total Operations: ${stats.totalOperations}`);
    console.log(`   Unique Agents: ${stats.uniqueAgents}`);
    console.log(`   Unique Models: ${stats.uniqueModels}`);
    console.log(`   Success Rate: ${stats.successRate}%`);
    console.log(`   Fallback Rate: ${stats.fallbackRate}%`);
    console.log(`   Total Cost: $${stats.totalCost}`);
    console.log(`   Avg Duration: ${stats.avgDuration}ms\n`);
  } else {
    console.log('⚠️  No activity in the last 24 hours\n');
  }
  
  // Show recent operations
  console.log('4️⃣ Recent Operations:');
  console.log('─'.repeat(80));
  
  recentData.forEach(activity => {
    const time = new Date(activity.timestamp).toLocaleString();
    const status = activity.success ? '✅' : '❌';
    const fallback = activity.is_fallback ? ' (fallback)' : '';
    console.log(`${status} ${time} | ${activity.agent_role} | ${activity.operation}`);
    console.log(`   Model: ${activity.model_used}${fallback}`);
    console.log(`   Duration: ${activity.duration_ms}ms | Tokens: ${activity.input_tokens + activity.output_tokens} | Cost: $${activity.cost?.toFixed(4) || '0'}`);
    if (!activity.success && activity.error) {
      console.log(`   Error: ${activity.error}`);
    }
    console.log('─'.repeat(80));
  });
  
  // Grafana dashboard info
  console.log('\n5️⃣ Grafana Dashboard:');
  console.log('   Import the dashboard from: grafana/codequal-performance-dashboard.json');
  console.log('   Dashboard will automatically use this data');
  console.log('   Ensure your Grafana has PostgreSQL datasource configured for Supabase\n');
  
  console.log('✨ Metrics check complete!');
}

// Run the check
checkMetrics().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});