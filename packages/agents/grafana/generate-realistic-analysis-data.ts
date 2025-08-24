#!/usr/bin/env npx ts-node

/**
 * Generate realistic CodeQual analysis data
 * Real PR analysis takes 30 seconds to several minutes
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

// Realistic pricing per 1K tokens
const MODEL_PRICING = {
  'openai/gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'openai/gpt-4': { input: 0.03, output: 0.06 },
  'openai/gpt-4o': { input: 0.005, output: 0.015 },
  'openai/gpt-4-turbo': { input: 0.01, output: 0.03 },
  'claude-3-haiku': { input: 0.00025, output: 0.00125 },
  'claude-3-opus': { input: 0.015, output: 0.075 }
};

async function clearAndGenerateRealisticData() {
  console.log('🗑️  Clearing existing test data...\n');
  
  // Clear existing data
  await supabase
    .from('agent_activity')
    .delete()
    .gte('id', '00000000-0000-0000-0000-000000000000');
  
  console.log('✅ Data cleared\n');
  console.log('📊 Generating realistic CodeQual analysis data...\n');
  
  const agents = ['comparator', 'educator', 'researcher', 'orchestrator', 'deepwiki'];
  const operations = ['analyze', 'compare', 'find_resources', 'research_models', 'coordinate', 'enhance_location'];
  const repositories = [
    'https://github.com/vercel/next.js',
    'https://github.com/facebook/react', 
    'https://github.com/sindresorhus/ky',
    'https://github.com/microsoft/vscode',
    'https://github.com/nodejs/node'
  ];
  
  const records = [];
  const now = Date.now();
  const dayAgo = now - (24 * 60 * 60 * 1000);
  
  // Generate 50 PR analyses (not individual operations)
  const totalPRs = 50;
  
  for (let prIndex = 0; prIndex < totalPRs; prIndex++) {
    const prNumber = (100 + prIndex).toString();
    const repository = repositories[Math.floor(Math.random() * repositories.length)];
    
    // Determine repository size based on the repo
    let repoSize: string;
    if (repository.includes('ky')) {
      repoSize = 'small';
    } else if (repository.includes('react')) {
      repoSize = 'medium';
    } else {
      repoSize = 'large';
    }
    
    // Each PR analysis consists of multiple agent operations
    const operationsPerPR = repoSize === 'small' ? 3 + Math.floor(Math.random() * 2) :
                           repoSize === 'medium' ? 5 + Math.floor(Math.random() * 3) :
                           8 + Math.floor(Math.random() * 4);
    
    // Base timestamp for this PR analysis
    const prStartTime = dayAgo + Math.random() * (now - dayAgo);
    
    // Realistic total analysis time (30 seconds to 5 minutes)
    const baseDuration = repoSize === 'small' ? 30000 :   // 30-60 seconds for small
                        repoSize === 'medium' ? 60000 :   // 60-120 seconds for medium
                        120000;                            // 120-300 seconds for large
    
    const totalAnalysisTime = baseDuration + Math.random() * baseDuration * (repoSize === 'large' ? 1.5 : 1);
    
    for (let opIndex = 0; opIndex < operationsPerPR; opIndex++) {
      const agent = agents[Math.floor(Math.random() * agents.length)];
      const operation = operations[Math.floor(Math.random() * operations.length)];
      
      // Stagger operations throughout the analysis period
      const operationOffset = (totalAnalysisTime / operationsPerPR) * opIndex;
      const timestamp = Math.floor(prStartTime + operationOffset);
      
      // Model selection based on agent and operation complexity
      let model: string;
      if (agent === 'deepwiki' || operation === 'analyze') {
        // Complex operations use better models
        model = Math.random() < 0.6 ? 'openai/gpt-4o' : 'openai/gpt-4-turbo';
      } else if (agent === 'orchestrator') {
        model = 'openai/gpt-4o';
      } else if (agent === 'researcher') {
        model = Math.random() < 0.5 ? 'openai/gpt-4-turbo' : 'claude-3-opus';
      } else {
        // Simple operations can use cheaper models
        model = Math.random() < 0.7 ? 'openai/gpt-3.5-turbo' : 'openai/gpt-4o';
      }
      
      // Realistic token counts for code analysis
      const baseTokens = repoSize === 'small' ? 2000 : repoSize === 'medium' ? 4000 : 8000;
      const inputTokens = Math.floor(baseTokens * (0.5 + Math.random()));
      const outputTokens = Math.floor(inputTokens * (0.3 + Math.random() * 0.4));
      
      // Calculate cost
      const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING] || MODEL_PRICING['openai/gpt-3.5-turbo'];
      const cost = (inputTokens * pricing.input / 1000) + (outputTokens * pricing.output / 1000);
      
      // Operation duration (part of the total analysis time)
      const operationDuration = Math.floor(totalAnalysisTime / operationsPerPR * (0.8 + Math.random() * 0.4));
      
      const success = Math.random() < 0.95;
      
      records.push({
        timestamp,
        agent_role: agent,
        operation,
        repository_url: repository,
        pr_number: prNumber,
        language: 'TypeScript',
        repository_size: repoSize,
        model_used: model,
        model_version: 'latest',
        is_fallback: false,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        duration_ms: operationDuration,
        success,
        error: success ? null : `Timeout after ${Math.floor(operationDuration/1000)}s`,
        retry_count: 0,
        cost: parseFloat(cost.toFixed(6))
      });
    }
  }
  
  // Insert in batches
  const batchSize = 50;
  let totalCost = 0;
  let totalOperations = 0;
  
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    const { error } = await supabase
      .from('agent_activity')
      .insert(batch);
    
    if (error) {
      console.error(`Error inserting batch:`, error);
    } else {
      console.log(`✓ Inserted batch (${batch.length} records)`);
      batch.forEach(r => {
        totalCost += r.cost;
        totalOperations++;
      });
    }
  }
  
  // Calculate statistics
  const avgCostPerPR = totalCost / totalPRs;
  const avgOperationsPerPR = totalOperations / totalPRs;
  
  // Calculate average duration per PR
  const prDurations: Record<string, number[]> = {};
  records.forEach(r => {
    if (!prDurations[r.pr_number]) prDurations[r.pr_number] = [];
    prDurations[r.pr_number].push(r.duration_ms);
  });
  
  const avgDurationPerPR = Object.values(prDurations).reduce((sum, durations) => {
    return sum + Math.max(...durations);
  }, 0) / totalPRs;
  
  console.log(`\n✅ Successfully generated realistic CodeQual data!\n`);
  console.log('📊 Summary Statistics:');
  console.log(`   Total PRs Analyzed: ${totalPRs}`);
  console.log(`   Total Operations: ${totalOperations}`);
  console.log(`   Avg Operations per PR: ${avgOperationsPerPR.toFixed(1)}`);
  console.log(`   Total Cost (24h): $${totalCost.toFixed(2)}`);
  console.log(`   Avg Cost per PR: $${avgCostPerPR.toFixed(4)}`);
  console.log(`   Avg Analysis Time: ${Math.round(avgDurationPerPR / 1000)} seconds\n`);
  
  // Show breakdown by repo size
  const sizeStats: Record<string, { count: number, totalTime: number, totalCost: number }> = {
    small: { count: 0, totalTime: 0, totalCost: 0 },
    medium: { count: 0, totalTime: 0, totalCost: 0 },
    large: { count: 0, totalTime: 0, totalCost: 0 }
  };
  
  Object.entries(prDurations).forEach(([pr, durations]) => {
    const prRecords = records.filter(r => r.pr_number === pr);
    if (prRecords.length > 0) {
      const size = prRecords[0].repository_size;
      sizeStats[size].count++;
      sizeStats[size].totalTime += Math.max(...durations);
      sizeStats[size].totalCost += prRecords.reduce((sum, r) => sum + r.cost, 0);
    }
  });
  
  console.log('📏 Performance by Repository Size:');
  Object.entries(sizeStats).forEach(([size, stats]) => {
    if (stats.count > 0) {
      console.log(`   ${size.toUpperCase()}:`);
      console.log(`     PRs: ${stats.count}`);
      console.log(`     Avg Time: ${Math.round(stats.totalTime / stats.count / 1000)} seconds`);
      console.log(`     Avg Cost: $${(stats.totalCost / stats.count).toFixed(4)}`);
    }
  });
  
  console.log('\n🎉 Your Grafana dashboard should now show realistic data!');
  console.log('   - Execution times: 30 seconds to 5 minutes');
  console.log('   - Costs reflect actual PR analysis complexity');
  console.log('   - Model usage based on operation requirements');
}

clearAndGenerateRealisticData().catch(console.error);