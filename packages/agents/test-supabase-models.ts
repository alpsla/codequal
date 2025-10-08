/**
 * Test script to check Supabase model_configurations table
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkModelConfigurations() {
  console.log('🔍 Checking Supabase model_configurations table\n');

  // Query all model configurations
  const { data, error } = await supabase
    .from('model_configurations')
    .select('role, language, size_category, primary_model, fallback_model')
    .order('role', { ascending: true });

  if (error) {
    console.error('❌ Error querying Supabase:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️  NO MODEL CONFIGURATIONS FOUND IN SUPABASE!');
    console.log('   This explains why all agents use the same default model.\n');
    console.log('📋 Need to populate with:');
    console.log('   - security/java/large → anthropic/claude-opus-4.1');
    console.log('   - performance/java/large → deepseek/deepseek-chat-v3.1');
    console.log('   - architecture/java/large → anthropic/claude-sonnet-4');
    console.log('   - codequality/java/large → google/gemini-2.5-pro');
    console.log('   - dependency/java/large → qwen/qwen3-coder-30b-a3b-instruct');
    return;
  }

  console.log(`✅ Found ${data.length} model configuration(s):\n`);

  // Group by role
  const byRole = new Map<string, any[]>();
  data.forEach(config => {
    if (!byRole.has(config.role)) {
      byRole.set(config.role, []);
    }
    byRole.get(config.role)!.push(config);
  });

  // Display by role
  for (const [role, configs] of byRole.entries()) {
    console.log(`📦 ${role.toUpperCase()}:`);
    configs.forEach(cfg => {
      console.log(`   ${cfg.language}/${cfg.size_category} → ${cfg.primary_model}`);
      console.log(`      Fallback: ${cfg.fallback_model}`);
    });
    console.log('');
  }

  // Check for the 5 agent roles needed for V9
  const requiredRoles = ['security', 'performance', 'architecture', 'codequality', 'dependency'];
  const missingRoles = requiredRoles.filter(role => !byRole.has(role));

  if (missingRoles.length > 0) {
    console.log('⚠️  MISSING CONFIGURATIONS FOR:');
    missingRoles.forEach(role => {
      console.log(`   - ${role}/java/large`);
    });
    console.log('\n   These will fallback to default model (causing duplicate models)');
  } else {
    console.log('✅ All 5 agent roles have configurations!');
  }
}

checkModelConfigurations().catch(console.error);
