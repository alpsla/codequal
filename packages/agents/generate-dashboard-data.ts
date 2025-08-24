/**
 * Generate realistic dashboard data for Grafana
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function generateDashboardData() {
  console.log('Generating dashboard data for Grafana...\n');
  
  const agents = [
    'comparator',
    'educator', 
    'researcher',
    'orchestrator',
    'deepwiki'
  ];
  
  const models = [
    'openai/gpt-4o',
    'openai/gpt-4-turbo',
    'openai/gpt-3.5-turbo',
    'claude-3-opus',
    'claude-3-haiku'
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
  
  const records = [];
  
  // Generate data for the last 24 hours
  const now = Date.now();
  const hourAgo = now - (60 * 60 * 1000);
  const dayAgo = now - (24 * 60 * 60 * 1000);
  
  // Generate 200 records spread over the last 24 hours
  for (let i = 0; i < 200; i++) {
    const timestamp = Math.floor(dayAgo + Math.random() * (now - dayAgo));
    const agent = agents[Math.floor(Math.random() * agents.length)];
    const model = models[Math.floor(Math.random() * models.length)];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    const repository = repositories[Math.floor(Math.random() * repositories.length)];
    
    const isFallback = Math.random() < 0.15; // 15% fallback rate
    const success = Math.random() < 0.92; // 92% success rate
    const duration = Math.floor(Math.random() * 3000) + 200; // 200-3200ms
    const inputTokens = Math.floor(Math.random() * 2000) + 100;
    const outputTokens = Math.floor(Math.random() * 3000) + 200;
    
    // Calculate cost based on model and tokens
    let costPerInputToken = 0.00001;
    let costPerOutputToken = 0.00003;
    
    if (model.includes('gpt-4')) {
      costPerInputToken = 0.00003;
      costPerOutputToken = 0.00006;
    } else if (model.includes('claude-3-opus')) {
      costPerInputToken = 0.000015;
      costPerOutputToken = 0.000075;
    }
    
    const cost = (inputTokens * costPerInputToken) + (outputTokens * costPerOutputToken);
    
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
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    const { error } = await supabase
      .from('agent_activity')
      .insert(batch);
    
    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
    } else {
      console.log(`✓ Inserted batch ${i / batchSize + 1} (${batch.length} records)`);
    }
  }
  
  // Get summary
  const { data: summary, error: summaryError } = await supabase
    .from('agent_activity')
    .select('*')
    .gte('timestamp', dayAgo);
  
  if (!summaryError && summary) {
    console.log(`\n✅ Successfully generated ${summary.length} records!`);
    
    // Calculate some stats
    const successCount = summary.filter(r => r.success).length;
    const totalCost = summary.reduce((sum, r) => sum + (r.cost || 0), 0);
    const avgDuration = summary.reduce((sum, r) => sum + (r.duration_ms || 0), 0) / summary.length;
    
    console.log('\n📊 Summary Statistics:');
    console.log(`   Total Records: ${summary.length}`);
    console.log(`   Success Rate: ${((successCount / summary.length) * 100).toFixed(1)}%`);
    console.log(`   Total Cost: $${totalCost.toFixed(2)}`);
    console.log(`   Avg Duration: ${Math.round(avgDuration)}ms`);
    console.log('\n🎉 Your Grafana dashboard should now show data!');
    console.log('   Refresh the dashboard to see the metrics.');
  }
}

// Run the generator
generateDashboardData().catch(console.error);