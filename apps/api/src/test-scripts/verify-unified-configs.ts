/**
 * Verify the unified configurations and compare with previous selections
 */

import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import { join } from 'path';

loadEnv({ path: join(__dirname, '../../../../.env') });

const RESEARCHER_CONFIG_REPO_ID = '00000000-0000-0000-0000-000000000001';

async function verifyConfigurations() {
  console.log('================================================================================');
  console.log('🔍 VERIFYING UNIFIED CONFIGURATIONS');
  console.log('================================================================================\n');
  
  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
  
  // Get total count
  const { count } = await supabase
    .from('analysis_chunks')
    .select('*', { count: 'exact', head: true })
    .eq('repository_id', RESEARCHER_CONFIG_REPO_ID)
    .eq('metadata->content_type', 'model_configuration');
    
  console.log(`✅ Total model configurations: ${count}\n`);
  
  // Check specific contexts we analyzed before
  const contexts = [
    'typescript/medium/researcher',
    'python/large/security', 
    'javascript/small/documentation',
    'go/medium/deepwiki',
    'rust/large/architecture'
  ];
  
  console.log('📋 Configuration Details:\n');
  
  for (const context of contexts) {
    console.log(`\n${context}:`);
    
    // Get primary
    const { data: primary } = await supabase
      .from('analysis_chunks')
      .select('*')
      .eq('repository_id', RESEARCHER_CONFIG_REPO_ID)
      .eq('metadata->context', context)
      .eq('metadata->is_primary', true)
      .single();
      
    if (primary) {
      const config = JSON.parse(primary.content);
      const metadata = primary.metadata as any;
      console.log(`  Primary: ${metadata.provider}/${metadata.model}`);
      console.log(`  Status: ${metadata.status || 'stable'}`);
      console.log(`  Cost: $${config.costPerMillion}/M tokens`);
      console.log(`  Quality: ${config.performanceScore}/10`);
      console.log(`  Context: ${config.contextLength?.toLocaleString() || 'N/A'} tokens`);
      console.log(`  Reasoning: ${config.reasoning}`);
    }
    
    // Get fallback
    const { data: fallback } = await supabase
      .from('analysis_chunks')
      .select('*')
      .eq('repository_id', RESEARCHER_CONFIG_REPO_ID)
      .eq('metadata->context', context)
      .eq('metadata->is_primary', false)
      .single();
      
    if (fallback) {
      const config = JSON.parse(fallback.content);
      const metadata = fallback.metadata as any;
      console.log(`  Fallback: ${metadata.provider}/${metadata.model}`);
      console.log(`  Cost: $${config.costPerMillion}/M`);
    }
  }
  
  // Analyze Gemini selection
  console.log('\n\n🔬 GEMINI ANALYSIS (Researcher Role):');
  const { data: geminiConfigs } = await supabase
    .from('analysis_chunks')
    .select('*')
    .eq('repository_id', RESEARCHER_CONFIG_REPO_ID)
    .eq('metadata->provider', 'google')
    .like('metadata->context', '%/researcher')
    .limit(5);
    
  if (geminiConfigs && geminiConfigs.length > 0) {
    geminiConfigs.forEach(chunk => {
      const metadata = chunk.metadata as any;
      const config = JSON.parse(chunk.content);
      console.log(`\n${metadata.context}:`);
      console.log(`  Model: ${metadata.model}`);
      console.log(`  Status: ${metadata.status}`);
      console.log(`  Cost: $${config.costPerMillion}/M`);
      console.log(`  Selected because: ${config.reasoning}`);
    });
  }
  
  // Provider distribution
  console.log('\n\n📊 PROVIDER DISTRIBUTION:');
  const { data: allConfigs } = await supabase
    .from('analysis_chunks')
    .select('metadata')
    .eq('repository_id', RESEARCHER_CONFIG_REPO_ID)
    .eq('metadata->content_type', 'model_configuration');
    
  const providers: Record<string, number> = {};
  allConfigs?.forEach(chunk => {
    const provider = (chunk.metadata as any).provider;
    providers[provider] = (providers[provider] || 0) + 1;
  });
  
  Object.entries(providers)
    .sort((a, b) => b[1] - a[1])
    .forEach(([provider, count]) => {
      console.log(`  ${provider}: ${count} configurations (${(count / (allConfigs?.length || 1) * 100).toFixed(1)}%)`);
    });
    
  // Cost analysis
  console.log('\n\n💰 COST ANALYSIS:');
  const costs: number[] = [];
  allConfigs?.forEach(chunk => {
    try {
      const content = JSON.parse((chunk as any).content || '{}');
      if (content.costPerMillion) {
        costs.push(content.costPerMillion);
      }
    } catch (e) {}
  });
  
  if (costs.length > 0) {
    const avgCost = costs.reduce((a, b) => a + b, 0) / costs.length;
    const minCost = Math.min(...costs);
    const maxCost = Math.max(...costs);
    
    console.log(`  Average: $${avgCost.toFixed(2)}/M tokens`);
    console.log(`  Minimum: $${minCost.toFixed(2)}/M tokens`);
    console.log(`  Maximum: $${maxCost.toFixed(2)}/M tokens`);
  }
  
  console.log('\n✅ Verification complete!');
}

verifyConfigurations().catch(console.error);