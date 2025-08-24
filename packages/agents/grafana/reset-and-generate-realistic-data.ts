#!/usr/bin/env npx ts-node

/**
 * Clear test data and generate realistic cost data
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Realistic pricing per 1K tokens (based on actual OpenAI/Anthropic pricing)
const MODEL_PRICING = {
  'openai/gpt-3.5-turbo': {
    input: 0.0005,   // $0.50 per 1M tokens
    output: 0.0015   // $1.50 per 1M tokens
  },
  'openai/gpt-4': {
    input: 0.03,     // $30 per 1M tokens
    output: 0.06     // $60 per 1M tokens
  },
  'openai/gpt-4o': {
    input: 0.005,    // $5 per 1M tokens
    output: 0.015    // $15 per 1M tokens
  },
  'openai/gpt-4-turbo': {
    input: 0.01,     // $10 per 1M tokens
    output: 0.03     // $30 per 1M tokens
  },
  'claude-3-haiku': {
    input: 0.00025,  // $0.25 per 1M tokens
    output: 0.00125  // $1.25 per 1M tokens
  },
  'claude-3-opus': {
    input: 0.015,    // $15 per 1M tokens
    output: 0.075    // $75 per 1M tokens
  },
  'gpt-4': {        // Legacy pricing
    input: 0.03,
    output: 0.06
  }
};

async function clearExistingData() {
  console.log('🗑️  Clearing existing test data...\n');
  
  const { error } = await supabase
    .from('agent_activity')
    .delete()
    .gte('id', '00000000-0000-0000-0000-000000000000'); // Delete all
  
  if (error) {
    console.error('Error clearing data:', error);
    return false;
  }
  
  console.log('✅ Existing data cleared\n');
  return true;
}

async function generateRealisticData() {
  console.log('📊 Generating realistic dashboard data...\n');
  
  const agents = [
    'comparator',
    'educator',
    'researcher',
    'orchestrator',
    'deepwiki'
  ];
  
  const operations = [
    'analyze',
    'compare',
    'find_resources',
    'research_models',
    'coordinate',
    'enhance_location'
  ];
  
  const repositories = [
    'https://github.com/vercel/next.js',
    'https://github.com/facebook/react',
    'https://github.com/sindresorhus/ky',
    'https://github.com/microsoft/vscode',
    'https://github.com/nodejs/node'
  ];
  
  const models = Object.keys(MODEL_PRICING);
  const records = [];
  
  // Generate data for the last 24 hours
  const now = Date.now();
  const dayAgo = now - (24 * 60 * 60 * 1000);
  
  // Generate 200 records with realistic patterns
  for (let i = 0; i < 200; i++) {
    const timestamp = Math.floor(dayAgo + Math.random() * (now - dayAgo));
    const agent = agents[Math.floor(Math.random() * agents.length)];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    const repository = repositories[Math.floor(Math.random() * repositories.length)];
    
    // Realistic model selection based on agent type
    let model: string;
    if (agent === 'deepwiki' || agent === 'orchestrator') {
      // These agents might use more powerful models
      model = Math.random() < 0.7 ? 'openai/gpt-4o' : 'openai/gpt-4-turbo';
    } else if (agent === 'researcher') {
      // Researcher uses varied models
      model = models[Math.floor(Math.random() * models.length)];
    } else {
      // Other agents mostly use cheaper models
      model = Math.random() < 0.8 ? 'openai/gpt-3.5-turbo' : 'openai/gpt-4o';
    }
    
    // Realistic token counts based on operation type
    let inputTokens: number;
    let outputTokens: number;
    
    if (operation === 'analyze' || operation === 'enhance_location') {
      // Larger operations
      inputTokens = Math.floor(Math.random() * 2000) + 1000;  // 1000-3000
      outputTokens = Math.floor(Math.random() * 1500) + 500;   // 500-2000
    } else if (operation === 'coordinate' || operation === 'research_models') {
      // Medium operations
      inputTokens = Math.floor(Math.random() * 1000) + 500;    // 500-1500
      outputTokens = Math.floor(Math.random() * 800) + 200;    // 200-1000
    } else {
      // Smaller operations
      inputTokens = Math.floor(Math.random() * 500) + 100;     // 100-600
      outputTokens = Math.floor(Math.random() * 400) + 100;    // 100-500
    }
    
    // Calculate realistic cost
    const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING] || MODEL_PRICING['openai/gpt-3.5-turbo'];
    const cost = (inputTokens * pricing.input / 1000) + (outputTokens * pricing.output / 1000);
    
    // Realistic success rate (higher for simpler operations)
    const successRate = operation === 'coordinate' ? 0.98 : 0.95;
    const success = Math.random() < successRate;
    
    // Realistic duration based on operation complexity
    const baseDuration = operation === 'analyze' ? 2000 : 
                        operation === 'enhance_location' ? 1500 : 
                        operation === 'coordinate' ? 800 : 500;
    const duration = Math.floor(baseDuration + Math.random() * baseDuration);
    
    const isFallback = Math.random() < 0.05; // 5% fallback rate
    
    const record = {
      timestamp,
      agent_role: agent,
      operation,
      repository_url: repository,
      pr_number: Math.floor(Math.random() * 1000).toString(),
      language: 'TypeScript',
      repository_size: ['small', 'medium', 'large'][Math.floor(Math.random() * 3)],
      model_used: isFallback ? 'openai/gpt-3.5-turbo' : model,
      model_version: 'latest',
      is_fallback: isFallback,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      duration_ms: duration,
      success,
      error: success ? null : `Error ${Math.floor(Math.random() * 500)}`,
      retry_count: isFallback ? 1 : 0,
      cost: parseFloat(cost.toFixed(6))
    };
    
    records.push(record);
  }
  
  // Insert in batches
  const batchSize = 50;
  let totalCost = 0;
  let successCount = 0;
  
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    const { error } = await supabase
      .from('agent_activity')
      .insert(batch);
    
    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
    } else {
      console.log(`✓ Inserted batch ${i / batchSize + 1} (${batch.length} records)`);
      
      // Track totals
      batch.forEach(r => {
        totalCost += r.cost;
        if (r.success) successCount++;
      });
    }
  }
  
  // Calculate final statistics
  const avgCost = totalCost / records.length;
  const avgDuration = records.reduce((sum, r) => sum + r.duration_ms, 0) / records.length;
  
  console.log(`\n✅ Successfully generated ${records.length} records with realistic costs!\n`);
  console.log('📊 Summary Statistics:');
  console.log(`   Total Records: ${records.length}`);
  console.log(`   Success Rate: ${((successCount / records.length) * 100).toFixed(1)}%`);
  console.log(`   Total Cost: $${totalCost.toFixed(2)} (realistic!)`);
  console.log(`   Average Cost: $${avgCost.toFixed(4)} per operation`);
  console.log(`   Avg Duration: ${Math.round(avgDuration)}ms`);
  
  // Show cost breakdown by model
  console.log('\n💰 Cost Breakdown by Model:');
  const modelCosts: Record<string, number> = {};
  records.forEach(r => {
    modelCosts[r.model_used] = (modelCosts[r.model_used] || 0) + r.cost;
  });
  
  Object.entries(modelCosts)
    .sort(([, a], [, b]) => b - a)
    .forEach(([model, cost]) => {
      console.log(`   ${model}: $${cost.toFixed(4)}`);
    });
  
  console.log('\n🎉 Your Grafana dashboard should now show realistic costs!');
  console.log('   Refresh the dashboard to see the updated metrics.');
}

// Main execution
async function main() {
  console.log('='.repeat(60));
  console.log('   Realistic Data Generation for Grafana');
  console.log('='.repeat(60) + '\n');
  
  // Clear existing data
  const cleared = await clearExistingData();
  if (!cleared) {
    console.error('Failed to clear existing data. Exiting.');
    process.exit(1);
  }
  
  // Generate new realistic data
  await generateRealisticData();
  
  console.log('\n' + '='.repeat(60));
}

main().catch(console.error);