#!/usr/bin/env ts-node

/**
 * Direct DeepWiki model discovery and storage script
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import axios from 'axios';
import { initSupabase, getSupabase } from '@codequal/database';
import { VectorContextService } from '@codequal/agents/multi-agent/vector-context-service';
import { createLogger } from '@codequal/core/utils';
import { AgentRole } from '@codequal/core/config/agent-registry';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

const logger = createLogger('DeepWikiDiscovery');

// DeepWiki scoring weights
const DEEPWIKI_WEIGHTS = {
  quality: 0.50,
  cost: 0.30,
  speed: 0.20
};

// Test user
const testUser = {
  id: 'deepwiki-discovery',
  email: 'deepwiki@codequal.dev',
  role: 'admin' as const,
  status: 'active' as const,
  tenantId: 'deepwiki-tenant',
  session: {
    id: 'discovery-session',
    fingerprint: 'discovery',
    ipAddress: '127.0.0.1',
    userAgent: 'DeepWiki',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
  },
  permissions: {
    repositories: { '*': { read: true, write: true, admin: true } },
    organizations: [],
    globalPermissions: ['manageUsers'],
    quotas: { requestsPerHour: 10000, maxConcurrentExecutions: 10, storageQuotaMB: 10000 }
  },
  metadata: { lastLogin: new Date(), loginCount: 1, preferredLanguage: 'en', timezone: 'UTC' },
  features: { deepAnalysis: true, aiRecommendations: true, advancedReports: true }
};

// Score model for DeepWiki
function scoreModelForDeepWiki(model: any) {
  const id = model.id.toLowerCase();
  const inputCost = parseFloat(model.pricing.prompt) * 1000000;
  const outputCost = parseFloat(model.pricing.completion) * 1000000;
  const avgCost = (inputCost + outputCost) / 2;
  const contextWindow = model.context_length || 0;
  
  // Quality score (0-10)
  let quality = 7.0;
  if (id.includes('opus-4') || id.includes('claude-opus-4')) quality = 9.8;
  else if (id.includes('gpt-4.5')) quality = 9.7;
  else if (id.includes('sonnet-4') || id.includes('claude-sonnet-4')) quality = 9.5;
  else if (id.includes('gpt-4.1') && !id.includes('nano')) quality = 9.3;
  else if (id.includes('claude-3.7-sonnet')) quality = 9.2;
  else if (id.includes('opus') || id.includes('gpt-4-turbo')) quality = 9.0;
  else if (id.includes('gpt-4.1-nano')) quality = 8.5;
  else if (id.includes('claude-3.5-sonnet')) quality = 8.7;
  else if (id.includes('gpt-4o') && !id.includes('mini')) quality = 8.6;
  else if (id.includes('gpt-4o-mini')) quality = 7.8;
  else if (id.includes('claude') && id.includes('haiku')) quality = 7.5;
  
  // Large context bonus for DeepWiki
  if (contextWindow >= 100000) quality += 0.3;
  if (contextWindow >= 200000) quality += 0.5;
  
  // Speed score (0-10)
  let speed = 6.0;
  if (id.includes('haiku') || id.includes('flash')) speed = 9.5;
  else if (id.includes('gpt-4o-mini')) speed = 9.0;
  else if (id.includes('nano')) speed = 8.8;
  else if (id.includes('sonnet')) speed = 7.5;
  else if (id.includes('opus') || id.includes('gpt-4.5')) speed = 5.0;
  
  // Price score (0-10, inverse of cost)
  const priceScore = 10 - Math.min(avgCost / 2, 10);
  
  // Composite score
  const compositeScore = 
    quality * DEEPWIKI_WEIGHTS.quality +
    priceScore * DEEPWIKI_WEIGHTS.cost +
    speed * DEEPWIKI_WEIGHTS.speed;
  
  return {
    id: model.id,
    provider: model.id.split('/')[0],
    model: model.id.split('/').slice(1).join('/'),
    inputCost,
    outputCost,
    avgCost,
    contextWindow,
    quality,
    speed,
    priceScore,
    compositeScore
  };
}

async function main() {
  try {
    logger.info('Starting DeepWiki model discovery...');
    
    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
    }
    
    initSupabase(supabaseUrl, supabaseKey);
    const supabase = getSupabase();
    
    // Fetch models from OpenRouter
    logger.info('Fetching models from OpenRouter...');
    const response = await axios.get('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://codequal.com',
        'X-Title': 'CodeQual DeepWiki'
      }
    });
    
    const models = response.data.data || [];
    logger.info(`Found ${models.length} models`);
    
    // Filter and score models
    const validModels = models.filter((m: any) => {
      const id = m.id.toLowerCase();
      return !id.includes('embed') && 
             !id.includes('vision') && 
             !id.includes('sonar') && 
             !id.includes('online') && 
             !id.includes('base') &&
             m.pricing &&
             (parseFloat(m.pricing.prompt) > 0 || parseFloat(m.pricing.completion) > 0);
    });
    
    const scoredModels = validModels.map(scoreModelForDeepWiki);
    scoredModels.sort((a: any, b: any) => b.compositeScore - a.compositeScore);
    
    // Display top 10
    console.log('\n=== Top 10 Models for DeepWiki ===\n');
    scoredModels.slice(0, 10).forEach((model: any, i: number) => {
      console.log(`${i + 1}. ${model.id}`);
      console.log(`   Score: ${model.compositeScore.toFixed(2)} (Q:${model.quality.toFixed(1)} C:${model.priceScore.toFixed(1)} S:${model.speed.toFixed(1)})`);
      console.log(`   Cost: $${model.avgCost.toFixed(2)}/1M (In:$${model.inputCost.toFixed(2)} Out:$${model.outputCost.toFixed(2)})`);
      console.log(`   Context: ${model.contextWindow.toLocaleString()} tokens`);
      console.log('');
    });
    
    // Select models
    const primary = scoredModels[0];
    const fallback = scoredModels.find((m: any) => m.provider !== primary.provider) || scoredModels[1];
    
    console.log('=== Selected Models ===\n');
    console.log(`Primary: ${primary.id} (Score: ${primary.compositeScore.toFixed(2)})`);
    console.log(`Fallback: ${fallback.id} (Score: ${fallback.compositeScore.toFixed(2)})`);
    
    // Store in Vector DB
    const vectorService = new VectorContextService(testUser);
    const SPECIAL_REPO_UUID = '00000000-0000-0000-0000-000000000001';
    
    const analysisResult = {
      type: 'model_configuration',
      severity: 'high',
      findings: [
        {
          type: 'multi-language/large/orchestrator',
          severity: 'high',
          location: 'deepwiki_primary',
          description: JSON.stringify({
            provider: primary.provider,
            model: primary.model,
            versionId: 'latest',
            capabilities: { contextWindow: primary.contextWindow },
            pricing: { 
              input: primary.inputCost / 1000000,
              output: primary.outputCost / 1000000 
            },
            tier: 'high-performance',
            preferredFor: ['deepwiki', 'repository_analysis'],
            reason: `DeepWiki primary: Score ${primary.compositeScore.toFixed(2)}, Context ${primary.contextWindow.toLocaleString()}`
          }),
          suggestion: 'Primary model for DeepWiki repository analysis'
        },
        {
          type: 'multi-language/large/orchestrator',
          severity: 'high',
          location: 'deepwiki_fallback',
          description: JSON.stringify({
            provider: fallback.provider,
            model: fallback.model,
            versionId: 'latest',
            capabilities: { contextWindow: fallback.contextWindow },
            pricing: { 
              input: fallback.inputCost / 1000000,
              output: fallback.outputCost / 1000000 
            },
            tier: 'balanced',
            preferredFor: ['deepwiki', 'fallback'],
            reason: `DeepWiki fallback: Score ${fallback.compositeScore.toFixed(2)}, Different provider`
          }),
          suggestion: 'Fallback model for DeepWiki'
        }
      ],
      metrics: { priority: 10 },
      categories: ['model_configuration', 'deepwiki', 'orchestrator']
    };
    
    await vectorService.storeAnalysisResults(
      SPECIAL_REPO_UUID,
      [analysisResult],
      testUser.id
    );
    
    console.log('\n✅ DeepWiki models stored in Vector DB');
    console.log('\nConfiguration:');
    console.log(`  Primary: ${primary.id} ($${primary.avgCost.toFixed(2)}/1M tokens)`);
    console.log(`  Fallback: ${fallback.id} ($${fallback.avgCost.toFixed(2)}/1M tokens)`);
    console.log(`  Weights: Quality ${DEEPWIKI_WEIGHTS.quality*100}%, Cost ${DEEPWIKI_WEIGHTS.cost*100}%, Speed ${DEEPWIKI_WEIGHTS.speed*100}%`);
    
    // Save results
    const fs = require('fs').promises;
    const results = {
      timestamp: new Date().toISOString(),
      weights: DEEPWIKI_WEIGHTS,
      primary,
      fallback,
      topModels: scoredModels.slice(0, 10)
    };
    await fs.writeFile(
      resolve(__dirname, '../../deepwiki-models.json'),
      JSON.stringify(results, null, 2)
    );
    
  } catch (error) {
    logger.error('Discovery failed', { error });
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main().catch(console.error);