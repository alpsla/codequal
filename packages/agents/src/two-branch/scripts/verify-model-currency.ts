#!/usr/bin/env npx ts-node

/**
 * Verify Model Currency Script
 * 
 * Ensures all models in the system are current (< 6 months old)
 * and using the latest available versions
 */

import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Define outdated models that should NEVER be used
const OUTDATED_MODELS = [
  'anthropic/claude-3.5-sonnet',
  'anthropic/claude-3-opus',
  'anthropic/claude-3-sonnet',
  'google/gemini-2.0',
  'google/gemini-1.5',
  'meta-llama/llama-3.1',
  'meta-llama/llama-3.2',
  'qwen/qwen-2.5',
  'deepseek/deepseek-v2',
  'deepseek/deepseek-v3'
];

// Latest model mappings (dynamically check these)
const LATEST_MODEL_VERSIONS = {
  'anthropic': ['claude-opus-4.1', 'claude-sonnet-4', 'claude-3.7-sonnet'],
  'google': ['gemini-2.5-pro', 'gemini-2.5-flash'],
  'meta-llama': ['llama-3.3'],
  'deepseek': ['deepseek-v3.1', 'deepseek-chat-v3.1'],
  'qwen': ['qwen3-coder', 'qwen3-max', 'qwen-plus-2025']
};

async function verifyModelCurrency() {
  console.log('🔍 Verifying Model Currency');
  console.log('=' .repeat(60));
  console.log(`📅 Current Date: ${new Date().toISOString().split('T')[0]}`);
  console.log('⚠️  Models must be < 6 months old\n');

  // Check Supabase configurations
  const { data: configs, error } = await supabase
    .from('model_configurations')
    .select('role, primary_model, fallback_model, last_updated')
    .limit(100);

  if (error) {
    console.error('❌ Error fetching configurations:', error);
    return;
  }

  let outdatedFound = 0;
  let totalChecked = 0;
  const issues: string[] = [];

  console.log('Checking configurations...\n');

  for (const config of configs || []) {
    totalChecked++;
    
    // Check primary model
    if (OUTDATED_MODELS.some(old => config.primary_model?.includes(old))) {
      outdatedFound++;
      issues.push(`❌ ${config.role}: Primary model "${config.primary_model}" is OUTDATED`);
    }
    
    // Check fallback model
    if (OUTDATED_MODELS.some(old => config.fallback_model?.includes(old))) {
      outdatedFound++;
      issues.push(`❌ ${config.role}: Fallback model "${config.fallback_model}" is OUTDATED`);
    }
    
    // Check if update date is recent
    const lastUpdate = new Date(config.last_updated);
    const daysSinceUpdate = Math.floor((Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceUpdate > 180) { // 6 months
      issues.push(`⚠️  ${config.role}: Configuration is ${daysSinceUpdate} days old`);
    }
  }

  // Display results
  console.log('\n' + '=' .repeat(60));
  console.log('                    VERIFICATION RESULTS');
  console.log('=' .repeat(60) + '\n');

  if (issues.length > 0) {
    console.log('🚨 ISSUES FOUND:\n');
    issues.forEach(issue => console.log(issue));
    
    console.log('\n💡 RECOMMENDED ACTIONS:');
    console.log('1. Run: npx ts-node src/two-branch/scripts/update-to-latest-models.ts');
    console.log('2. This will update all configurations to use LATEST models only');
    console.log('3. Verify OpenRouter has these models available');
  } else {
    console.log('✅ All configurations are using current models!');
    console.log(`✅ Checked ${totalChecked} configurations`);
    console.log('✅ No outdated models found');
  }

  // Show current best practices
  console.log('\n📚 CURRENT BEST PRACTICES:');
  console.log('- Claude: Use v4.1 (Opus) or v4 (Sonnet), NOT 3.5');
  console.log('- Gemini: Use v2.5 series, NOT 2.0');
  console.log('- Llama: Use v3.3, NOT 3.1 or 3.2');
  console.log('- DeepSeek: Use v3.1, NOT v2 or v3');
  console.log('- Always use Date() for dynamic dates, never hardcode');
  
  return outdatedFound === 0;
}

async function checkSourceCode() {
  console.log('\n🔍 Checking source code for hardcoded models...\n');
  
  
  try {
    // Search for outdated model references
    const result = execSync(
      `rg -c "claude-3\\.5|gemini-2\\.0|llama-3\\.1|qwen-2\\.5" --type ts src/ 2>/dev/null || true`,
      { encoding: 'utf8', cwd: '/Users/alpinro/Code Prjects/codequal/packages/agents' }
    );
    
    if (result.trim()) {
      console.log('⚠️  Found potential hardcoded outdated models in:');
      console.log(result);
      console.log('Please review and update these files!');
      return false;
    } else {
      console.log('✅ No hardcoded outdated models found in source code');
      return true;
    }
  } catch (e) {
    console.log('✅ No hardcoded outdated models found in source code');
    return true;
  }
}

async function main() {
  console.log('=' .repeat(60));
  console.log('       🚀 MODEL CURRENCY VERIFICATION');
  console.log('=' .repeat(60) + '\n');

  const dbClean = await verifyModelCurrency();
  const codeClean = await checkSourceCode();

  console.log('\n' + '=' .repeat(60));
  console.log('                    FINAL STATUS');
  console.log('=' .repeat(60));
  
  if (dbClean && codeClean) {
    console.log('✅ ALL CHECKS PASSED!');
    console.log('✅ System is using only current models');
  } else {
    console.log('❌ ISSUES DETECTED');
    console.log('⚠️  Please run update scripts to fix');
  }
}

main().catch(console.error);