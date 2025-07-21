/**
 * Run REAL Researcher Discovery with OpenRouter
 * This will fetch actual models and generate real configurations
 */

import { config as loadEnv } from 'dotenv';
import { join } from 'path';
// import { createLogger } from '@codequal/core/utils';
// import { ResearcherDiscoveryService } from '@codequal/agents/researcher/final/researcher-discovery-service';
// import { scoreModelsForResearcher } from '@codequal/agents/researcher/final/researcher-model-selector';
import { createSupabaseClient } from '../utils/supabase';

// Load environment
loadEnv({ path: join(__dirname, '../../../../.env') });

const logger = createLogger('RealResearcherDiscovery');

// Languages, sizes, and roles for configuration generation
const LANGUAGES = ['javascript', 'typescript', 'python', 'java', 'go', 'rust', 'csharp', 'cpp', 'ruby', 'php'];
const SIZE_CATEGORIES = ['small', 'medium', 'large'];
const AGENT_ROLES = ['security', 'architecture', 'performance', 'code_quality', 'dependencies', 'documentation', 'testing', 'deepwiki', 'translator'];

const RESEARCHER_CONFIG_REPO_ID = '00000000-0000-0000-0000-000000000001';

interface ModelConfiguration {
  context: string; // e.g., "javascript/small/security"
  provider: string;
  modelName: string;
  costPerMillion: number;
  performanceScore: number;
  contextLength: number;
  isPrimary: boolean;
  reasoning: string;
  evaluatedAt: Date;
}

async function runRealResearch() {
  console.log('================================================================================');
  console.log('🚀 REAL RESEARCHER DISCOVERY - FETCHING LIVE DATA FROM OPENROUTER');
  console.log('================================================================================\n');
  
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (!openRouterKey) {
    console.error('❌ OPENROUTER_API_KEY not found in environment');
    process.exit(1);
  }
  
  try {
    // Initialize discovery service
    const discoveryService = new ResearcherDiscoveryService(logger, openRouterKey);
    
    // Step 1: Fetch all available models from OpenRouter
    console.log('📡 Fetching live models from OpenRouter API...');
    const availableModels = await discoveryService.fetchAvailableModels();
    console.log(`✅ Found ${availableModels.length} models\n`);
    
    // Step 2: Score all models for researcher use case
    console.log('📊 Scoring models for researcher agent use case...');
    const scoredModels = scoreModelsForResearcher(availableModels);
    console.log(`✅ Scored ${scoredModels.length} suitable models\n`);
    
    // Step 3: Display top models
    console.log('🏆 Top 10 Models for Researcher Agent:\n');
    scoredModels.slice(0, 10).forEach((model, idx) => {
      console.log(`${idx + 1}. ${model.id}`);
      console.log(`   Provider: ${model.provider}`);
      console.log(`   Model: ${model.model}`);
      console.log(`   Composite Score: ${model.compositeScore.toFixed(2)}`);
      console.log(`   Quality: ${model.quality.toFixed(1)}/10`);
      console.log(`   Cost: $${model.avgCost.toFixed(2)}/million tokens`);
      console.log(`   Speed: ${model.speed.toFixed(1)}/10`);
      console.log(`   Context: ${model.contextWindow.toLocaleString()} tokens`);
      console.log(`   Reasoning: Fast (${model.speed > 8 ? 'Yes' : 'No'}), Affordable (${model.avgCost < 5 ? 'Yes' : 'No'}), Quality (${model.quality > 7 ? 'High' : 'Medium'})`);
      console.log('');
    });
    
    // Step 4: Generate configurations for different contexts
    console.log('🔧 Generating model configurations for all contexts...\n');
    
    const configurations: ModelConfiguration[] = [];
    let configCount = 0;
    
    // For each language/size/role combination
    for (const language of LANGUAGES) {
      for (const size of SIZE_CATEGORIES) {
        for (const role of AGENT_ROLES) {
          const context = `${language}/${size}/${role}`;
          
          // Select models based on context requirements
          let selectedModels = scoredModels;
          
          // Filter based on size requirements
          if (size === 'small') {
            // Prefer faster, cheaper models for small contexts
            selectedModels = scoredModels.filter(m => m.speed > 7 && m.avgCost < 10);
          } else if (size === 'large') {
            // Need models with larger context windows
            selectedModels = scoredModels.filter(m => m.contextWindow >= 32000);
          }
          
          // Filter based on role requirements
          if (role === 'security' || role === 'architecture') {
            // Need high quality models
            selectedModels = selectedModels.filter(m => m.quality >= 8);
          } else if (role === 'documentation' || role === 'testing') {
            // Can use more affordable models
            selectedModels = selectedModels.filter(m => m.avgCost < 5);
          }
          
          // Fallback to all models if filters are too restrictive
          if (selectedModels.length === 0) {
            selectedModels = scoredModels;
          }
          
          // Select primary and fallback
          const primary = selectedModels[0];
          const fallback = selectedModels.find(m => m.provider !== primary.provider) || selectedModels[1];
          
          if (primary) {
            configurations.push({
              context,
              provider: primary.provider,
              modelName: primary.model,
              costPerMillion: primary.avgCost,
              performanceScore: primary.compositeScore,
              contextLength: primary.contextWindow,
              isPrimary: true,
              reasoning: `Selected for ${context}: Score ${primary.compositeScore.toFixed(2)}, Quality ${primary.quality.toFixed(1)}, Cost $${primary.avgCost.toFixed(2)}/M`,
              evaluatedAt: new Date()
            });
            configCount++;
          }
          
          if (fallback && fallback !== primary) {
            configurations.push({
              context,
              provider: fallback.provider,
              modelName: fallback.model,
              costPerMillion: fallback.avgCost,
              performanceScore: fallback.compositeScore,
              contextLength: fallback.contextWindow,
              isPrimary: false,
              reasoning: `Fallback for ${context}: Different provider, Score ${fallback.compositeScore.toFixed(2)}`,
              evaluatedAt: new Date()
            });
            configCount++;
          }
        }
      }
    }
    
    console.log(`✅ Generated ${configCount} configurations\n`);
    
    // Step 5: Show sample configurations
    console.log('📋 Sample Configurations:\n');
    
    const samples = [
      'javascript/small/security',
      'python/large/architecture',
      'typescript/medium/performance',
      'go/small/dependencies',
      'rust/large/security'
    ];
    
    samples.forEach(context => {
      const configs = configurations.filter(c => c.context === context);
      if (configs.length > 0) {
        console.log(`\n${context}:`);
        configs.forEach(config => {
          console.log(`  ${config.isPrimary ? 'Primary' : 'Fallback'}: ${config.provider}/${config.modelName}`);
          console.log(`    Cost: $${config.costPerMillion.toFixed(2)}/M, Score: ${config.performanceScore.toFixed(2)}`);
          console.log(`    ${config.reasoning}`);
        });
      }
    });
    
    // Step 6: Analyze provider distribution
    console.log('\n\n📊 Provider Distribution:');
    const providerCounts: Record<string, number> = {};
    configurations.forEach(config => {
      providerCounts[config.provider] = (providerCounts[config.provider] || 0) + 1;
    });
    
    Object.entries(providerCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([provider, count]) => {
        console.log(`  ${provider}: ${count} configurations (${(count / configurations.length * 100).toFixed(1)}%)`);
      });
    
    // Step 7: Calculate cost analysis
    console.log('\n\n💰 Cost Analysis:');
    const avgCost = configurations.reduce((sum, c) => sum + c.costPerMillion, 0) / configurations.length;
    const minCost = Math.min(...configurations.map(c => c.costPerMillion));
    const maxCost = Math.max(...configurations.map(c => c.costPerMillion));
    
    console.log(`  Average cost: $${avgCost.toFixed(2)}/million tokens`);
    console.log(`  Min cost: $${minCost.toFixed(2)}/million tokens`);
    console.log(`  Max cost: $${maxCost.toFixed(2)}/million tokens`);
    console.log(`  Monthly estimate (3M tokens/day): $${(avgCost * 3 * 30).toFixed(2)}`);
    
    // Step 8: Store configurations (optional)
    const shouldStore = process.argv.includes('--store');
    if (shouldStore) {
      console.log('\n\n💾 Storing configurations in Vector DB...');
      const supabase = createSupabaseClient();
      
      // Store configurations in batches
      const batchSize = 50;
      for (let i = 0; i < configurations.length; i += batchSize) {
        const batch = configurations.slice(i, i + batchSize);
        
        const chunks = batch.map(config => ({
          repository_id: RESEARCHER_CONFIG_REPO_ID,
          content: JSON.stringify(config, null, 2),
          metadata: {
            content_type: 'model_configuration',
            source: 'researcher_discovery',
            context: config.context,
            provider: config.provider,
            model: config.modelName,
            is_primary: config.isPrimary,
            timestamp: config.evaluatedAt.toISOString()
          }
        }));
        
        const { error } = await supabase
          .from('analysis_chunks')
          .insert(chunks);
        
        if (error) {
          console.error(`❌ Failed to store batch ${i / batchSize + 1}:`, error.message);
        } else {
          console.log(`✅ Stored batch ${i / batchSize + 1} (${batch.length} configs)`);
        }
      }
    } else {
      console.log('\n\n💡 To store configurations in Vector DB, run with --store flag');
    }
    
    // Step 9: Save results to file
    const results = {
      timestamp: new Date().toISOString(),
      modelsEvaluated: availableModels.length,
      modelsSuitable: scoredModels.length,
      configurationsGenerated: configurations.length,
      topModels: scoredModels.slice(0, 10),
      providerDistribution: providerCounts,
      costAnalysis: {
        average: avgCost,
        min: minCost,
        max: maxCost,
        monthlyEstimate: avgCost * 3 * 30
      },
      sampleConfigurations: samples.map(context => ({
        context,
        configs: configurations.filter(c => c.context === context)
      }))
    };
    
    const fs = require('fs').promises;
    const resultsPath = join(__dirname, 'researcher-discovery-results.json');
    await fs.writeFile(resultsPath, JSON.stringify(results, null, 2));
    
    console.log(`\n\n✅ Full results saved to: ${resultsPath}`);
    
  } catch (error) {
    console.error('\n❌ Error during discovery:', error);
    process.exit(1);
  }
  
  console.log('\n================================================================================');
  console.log('✅ REAL RESEARCHER DISCOVERY COMPLETE');
  console.log('================================================================================\n');
}

// Run the discovery
runRealResearch().catch(console.error);