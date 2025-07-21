/**
 * Run REAL Unified Research with OpenRouter
 * This will actually charge your account and update Vector DB
 */

import { config as loadEnv } from 'dotenv';
import { join } from 'path';
import { createSupabaseClient } from '../utils/supabase';
import axios from 'axios';

loadEnv({ path: join(__dirname, '../../../../.env') });

const RESEARCHER_CONFIG_REPO_ID = '00000000-0000-0000-0000-000000000001';

// Enhanced model selection logic
interface ModelMetadata {
  id: string;
  provider: string;
  model: string;
  status: 'stable' | 'preview' | 'beta' | 'deprecated';
  version?: string;
  releaseDate?: Date;
}

interface ModelEvaluation {
  metadata: ModelMetadata;
  costs: {
    inputCostPerMillion: number;
    outputCostPerMillion: number;
    averageCostPerMillion: number;
  };
  capabilities: {
    quality: number;
    speed: number;
    contextWindow: number;
  };
  score: number;
  adjustedScore: number;
}

function evaluateModel(model: any): ModelEvaluation | null {
  const id = model.id.toLowerCase();
  const name = model.name.toLowerCase();
  
  // Skip free models (usually limited)
  if (model.pricing.prompt === '0' && model.pricing.completion === '0') {
    return null;
  }
  
  // Determine status
  let status: ModelMetadata['status'] = 'stable';
  if (id.includes('preview') || name.includes('preview')) status = 'preview';
  else if (id.includes('beta')) status = 'beta';
  else if (id.includes('deprecated') || id.includes('0613') || id.includes('0314')) status = 'deprecated';
  
  // Calculate costs
  const inputCost = parseFloat(model.pricing.prompt) * 1000000;
  const outputCost = parseFloat(model.pricing.completion) * 1000000;
  const avgCost = (inputCost + outputCost) / 2;
  
  // Skip if too expensive (>$100/M)
  if (avgCost > 100) return null;
  
  // Estimate quality
  let quality = 7.0;
  if (id.includes('gpt-4') && !id.includes('mini')) quality = 9.5;
  else if (id.includes('gpt-4') && id.includes('mini')) quality = 9.3;
  else if (id.includes('claude-3-opus') || id.includes('claude-opus')) quality = 9.5;
  else if (id.includes('claude-3.5-sonnet') || id.includes('claude-sonnet')) quality = 9.2;
  else if (id.includes('gemini-2.5')) quality = 9.0;
  else if (id.includes('gemini-2.0-flash')) quality = 8.5;
  else if (id.includes('deepseek') && id.includes('r1')) quality = 8.3;
  else if (id.includes('qwen') && id.includes('turbo')) quality = 8.4;
  else if (id.includes('mixtral')) quality = 8.2;
  
  // Estimate speed
  let speed = 7.0;
  if (name.includes('flash') || name.includes('turbo') || name.includes('lite')) speed = 9.5;
  else if (name.includes('mini') || name.includes('haiku')) speed = 9.0;
  else if (name.includes('8b')) speed = 8.5;
  else if (name.includes('70b')) speed = 7.0;
  else if (name.includes('405b') || name.includes('opus')) speed = 5.5;
  
  // Calculate base score
  const costScore = Math.max(0, 10 - Math.log10(Math.max(0.01, avgCost)) * 2.5);
  const score = quality * 0.4 + costScore * 0.4 + speed * 0.2;
  
  // Apply stability penalty
  let adjustedScore = score;
  if (status === 'preview') adjustedScore *= 0.9; // 10% penalty
  else if (status === 'beta') adjustedScore *= 0.85; // 15% penalty
  else if (status === 'deprecated') adjustedScore *= 0.5; // 50% penalty
  
  return {
    metadata: {
      id: model.id,
      provider: model.id.split('/')[0],
      model: model.id.split('/').slice(1).join('/'),
      status,
      version: model.id.match(/(\d+\.?\d*)/)?.[1],
      releaseDate: model.created ? new Date(model.created * 1000) : undefined
    },
    costs: { inputCost, outputCost, avgCost },
    capabilities: {
      quality,
      speed,
      contextWindow: model.context_length || 4096
    },
    score,
    adjustedScore
  };
}

async function runRealUnifiedResearch() {
  console.log('================================================================================');
  console.log('🚀 REAL UNIFIED RESEARCHER - OPENROUTER INTEGRATION');
  console.log('================================================================================\n');
  
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENROUTER_API_KEY not found');
    process.exit(1);
  }
  
  if (process.argv[2] !== '--confirm') {
    console.log('⚠️  This will:');
    console.log('1. Call OpenRouter API (charges apply)');
    console.log('2. Clear existing configurations');
    console.log('3. Store new unified configurations\n');
    console.log('Run with --confirm to proceed');
    process.exit(0);
  }
  
  try {
    // Step 1: Fetch models from OpenRouter
    console.log('📡 Fetching models from OpenRouter...');
    const response = await axios.get('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com/codequal/unified-researcher',
        'X-Title': 'CodeQual Unified Researcher'
      }
    });
    
    const models = response.data.data;
    console.log(`✅ Fetched ${models.length} models\n`);
    
    // Step 2: Evaluate and filter models
    console.log('📊 Evaluating models...');
    const evaluations = models
      .map(evaluateModel)
      .filter((e: any): e is ModelEvaluation => e !== null)
      .sort((a, b) => b.adjustedScore - a.adjustedScore);
    
    console.log(`✅ Evaluated ${evaluations.length} suitable models\n`);
    
    // Show top models
    console.log('🏆 Top 10 Models:');
    evaluations.slice(0, 10).forEach((evaluation, idx) => {
      console.log(`${idx + 1}. ${evaluation.metadata.id}`);
      console.log(`   Score: ${evaluation.adjustedScore.toFixed(2)} (${evaluation.metadata.status})`);
      console.log(`   Cost: $${evaluation.costs.avgCost.toFixed(2)}/M, Quality: ${evaluation.capabilities.quality.toFixed(1)}`);
    });
    
    // Step 3: Generate configurations
    console.log('\n\n🔧 Generating configurations...');
    const languages = ['javascript', 'typescript', 'python', 'java', 'go', 'rust'];
    const sizes = ['small', 'medium', 'large'];
    const roles = ['security', 'architecture', 'performance', 'code_quality', 'dependencies', 'documentation', 'testing', 'deepwiki', 'researcher'];
    
    const configurations: any[] = [];
    
    for (const lang of languages) {
      for (const size of sizes) {
        for (const role of roles) {
          const context = `${lang}/${size}/${role}`;
          
          // Filter models based on context
          let suitable = evaluations;
          
          // Size-based filtering
          if (size === 'small') {
            suitable = suitable.filter(e => e.capabilities.speed >= 8 && e.costs.avgCost < 10);
          } else if (size === 'large') {
            suitable = suitable.filter(e => e.capabilities.contextWindow >= 100000);
          }
          
          // Role-based filtering
          if (role === 'security' || role === 'architecture') {
            suitable = suitable.filter(e => e.capabilities.quality >= 8.5 && e.metadata.status === 'stable');
          } else if (role === 'documentation' || role === 'testing') {
            suitable = suitable.filter(e => e.costs.avgCost < 5);
          }
          
          // Fallback if too restrictive
          if (suitable.length === 0) suitable = evaluations.slice(0, 20);
          
          // Select primary
          const primary = suitable[0];
          if (primary) {
            configurations.push({
              context,
              isPrimary: true,
              provider: primary.metadata.provider,
              model: primary.metadata.model,
              costPerMillion: primary.costs.avgCost,
              quality: primary.capabilities.quality,
              contextWindow: primary.capabilities.contextWindow,
              status: primary.metadata.status,
              reasoning: `Best ${primary.metadata.status} model for ${context}`
            });
          }
          
          // Select fallback (different provider)
          const fallback = suitable.find(e => e.metadata.provider !== primary?.metadata.provider) || suitable[1];
          if (fallback && fallback !== primary) {
            configurations.push({
              context,
              isPrimary: false,
              provider: fallback.metadata.provider,
              model: fallback.metadata.model,
              costPerMillion: fallback.costs.avgCost,
              quality: fallback.capabilities.quality,
              contextWindow: fallback.capabilities.contextWindow,
              status: fallback.metadata.status,
              reasoning: `Fallback for ${context}`
            });
          }
        }
      }
    }
    
    console.log(`✅ Generated ${configurations.length} configurations`);
    
    // Step 4: Store in Vector DB
    console.log('\n💾 Storing in Vector DB...');
    const supabase = createSupabaseClient();
    
    // Clear old data
    await supabase
      .from('analysis_chunks')
      .delete()
      .eq('repository_id', RESEARCHER_CONFIG_REPO_ID);
    
    // Store in batches
    const batchSize = 50;
    for (let i = 0; i < configurations.length; i += batchSize) {
      const batch = configurations.slice(i, i + batchSize);
      
      const chunks = batch.map(config => ({
        repository_id: RESEARCHER_CONFIG_REPO_ID,
        content: JSON.stringify({
          provider: config.provider,
          modelName: config.model,
          costPerMillion: config.costPerMillion,
          performanceScore: config.quality,
          contextLength: config.contextWindow,
          isPrimary: config.isPrimary,
          reasoning: config.reasoning
        }, null, 2),
        metadata: {
          content_type: 'model_configuration',
          source: 'unified_researcher_v2',
          context: config.context,
          provider: config.provider,
          model: config.model,
          is_primary: config.isPrimary,
          status: config.status,
          timestamp: new Date().toISOString()
        }
      }));
      
      await supabase
        .from('analysis_chunks')
        .insert(chunks);
      
      console.log(`Stored batch ${Math.floor(i / batchSize) + 1}`);
    }
    
    // Show summary
    console.log('\n\n================================================================================');
    console.log('✅ RESEARCH COMPLETE');
    console.log('================================================================================\n');
    
    console.log(`Models evaluated: ${evaluations.length}`);
    console.log(`Configurations stored: ${configurations.length}`);
    
    // Show sample configs
    console.log('\n📋 Sample Configurations:');
    const samples = [
      'typescript/medium/researcher',
      'python/large/security',
      'javascript/small/documentation'
    ];
    
    samples.forEach(context => {
      const config = configurations.find(c => c.context === context && c.isPrimary);
      if (config) {
        console.log(`\n${context}:`);
        console.log(`  ${config.provider}/${config.model}`);
        console.log(`  Cost: $${config.costPerMillion.toFixed(2)}/M, Quality: ${config.quality.toFixed(1)}`);
      }
    });
    
    console.log('\n✅ All configurations updated successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

runRealUnifiedResearch().catch(console.error);