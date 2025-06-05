#!/usr/bin/env node

/**
 * Simple Researcher Selection - Pre-calculated scores
 * Just present the top models and ask to pick #1 and #2
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../../.env') });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  console.error('❌ OPENROUTER_API_KEY not found');
  process.exit(1);
}

const CURRENT_RESEARCHER = 'google/gemini-2.5-flash-preview-05-20';

// Same functions as before
async function getModelCatalog() {
  const response = await fetch('https://openrouter.ai/api/v1/models', {
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://github.com/codequal/researcher-calibration',
      'X-Title': 'CodeQual Research'
    }
  });
  
  const data = await response.json();
  
  return data.data
    .filter(m => {
      const id = m.id.toLowerCase();
      return !id.includes('embed') && !id.includes('vision') && 
             !id.includes('sonar') && !id.includes('online') && 
             !id.includes('base') && m.pricing &&
             (parseFloat(m.pricing.prompt) > 0 || parseFloat(m.pricing.completion) > 0);
    })
    .map(m => ({
      id: m.id,
      inputCost: parseFloat(m.pricing.prompt) * 1000000,
      outputCost: parseFloat(m.pricing.completion) * 1000000,
      avgCost: (parseFloat(m.pricing.prompt) + parseFloat(m.pricing.completion)) * 500000,
      contextWindow: m.context_length || 0,
      quality: inferResearcherQuality(m.id, m.context_length),
      speed: inferSpeed(m.id)
    }));
}

function inferResearcherQuality(modelId, contextWindow) {
  const id = modelId.toLowerCase();
  let score = 7.0;
  
  if (id.includes('opus-4') || id.includes('claude-opus-4')) score = 9.8;
  else if (id.includes('sonnet-4') || id.includes('claude-sonnet-4')) score = 9.6;
  else if (id.includes('gpt-4.5')) score = 9.7;
  else if (id.includes('gpt-4.1') && !id.includes('nano')) score = 9.5;
  else if (id.includes('gpt-4.1-nano')) score = 9.3;
  else if (id.includes('claude-3.7')) score = 9.4;
  else if (id.includes('opus') || (id.includes('gpt-4') && !id.includes('mini'))) score = 9.2;
  else if (id.includes('sonnet')) score = 9.0;
  else if (id.includes('claude-3.5')) score = 8.9;
  else if (id.includes('gpt-4o') && !id.includes('mini')) score = 8.8;
  else if (id.includes('deepseek') && id.includes('r1')) score = 8.6;
  else if (id.includes('gemini') && id.includes('pro')) score = 8.5;
  else if (id.includes('gemini') && id.includes('flash')) score = 8.0;
  else if (id.includes('claude') && id.includes('haiku')) score = 7.8;
  else if (id.includes('gpt-4o-mini')) score = 7.9;
  else if (id.includes('mistral') && id.includes('large')) score = 7.6;
  
  if (id.includes('thinking') || id.includes('reason')) score += 0.3;
  if (contextWindow >= 100000) score += 0.2;
  if (contextWindow >= 200000) score += 0.3;
  if (id.includes('2025') || id.includes('preview')) score += 0.1;
  if (id.includes('4.1') || id.includes('3.7') || id.includes('4.5')) score += 0.2;
  
  return Math.min(score, 10);
}

function inferSpeed(modelId) {
  const id = modelId.toLowerCase();
  if (id.includes('flash') || (id.includes('mini') && !id.includes('4.1'))) return 9.5;
  if (id.includes('haiku') || id.includes('small')) return 9.0;
  if (id.includes('thinking')) return 6.0;
  if (id.includes('nano')) return 9.0;
  if (id.includes('1b') || id.includes('3b')) return 10.0;
  if (id.includes('7b') || id.includes('8b')) return 8.5;
  if (id.includes('32b') || id.includes('34b')) return 7.0;
  if (id.includes('70b')) return 5.0;
  if (id.includes('opus') || id.includes('pro')) return 4.0;
  return 6.0;
}

async function main() {
  console.log('🔬 SIMPLE RESEARCHER SELECTION\n');
  
  // Get models
  const models = await getModelCatalog();
  console.log(`Found ${models.length} models\n`);
  
  // Calculate composite scores
  const weights = { quality: 0.50, price: 0.35, speed: 0.15 };
  
  const scoredModels = models.map(m => {
    const priceScore = 10 - (Math.min(m.avgCost, 20) / 2);
    const compositeScore = (
      m.quality * weights.quality +
      priceScore * weights.price +
      m.speed * weights.speed
    );
    
    return { ...m, priceScore, compositeScore };
  }).sort((a, b) => b.compositeScore - a.compositeScore);
  
  // Show top 10
  console.log('TOP 10 BY COMPOSITE SCORE:');
  scoredModels.slice(0, 10).forEach((m, i) => {
    console.log(`${i + 1}. ${m.id}: Score=${m.compositeScore.toFixed(2)}, Cost=$${m.avgCost.toFixed(1)}/1M`);
  });
  
  // Create SIMPLE prompt
  const top5 = scoredModels.slice(0, 5);
  const simplePrompt = `Pick the best 2 models for AI research from this ranked list:

1. ${top5[0].id} - Score: ${top5[0].compositeScore.toFixed(2)} - $${top5[0].inputCost}/$${top5[0].outputCost}
2. ${top5[1].id} - Score: ${top5[1].compositeScore.toFixed(2)} - $${top5[1].inputCost}/$${top5[1].outputCost}
3. ${top5[2].id} - Score: ${top5[2].compositeScore.toFixed(2)} - $${top5[2].inputCost}/$${top5[2].outputCost}
4. ${top5[3].id} - Score: ${top5[3].compositeScore.toFixed(2)} - $${top5[3].inputCost}/$${top5[3].outputCost}
5. ${top5[4].id} - Score: ${top5[4].compositeScore.toFixed(2)} - $${top5[4].inputCost}/$${top5[4].outputCost}

Output only 2 CSV rows for #1 and #2:
provider,model,input,output,RESEARCHER,context`;
  
  console.log('\n\nSIMPLE PROMPT:');
  console.log('-'.repeat(60));
  console.log(simplePrompt);
  console.log('-'.repeat(60));
  console.log(`\nPrompt size: ${simplePrompt.length} chars (~${Math.ceil(simplePrompt.length/4)} tokens)`);
  
  // Call API
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/codequal/researcher-calibration',
        'X-Title': 'CodeQual Researcher Selection'
      },
      body: JSON.stringify({
        model: CURRENT_RESEARCHER,
        messages: [{ role: 'user', content: simplePrompt }],
        max_tokens: 100,
        temperature: 0
      })
    });

    const data = await response.json();
    const result = data.choices[0].message.content;
    const usage = data.usage;
    
    console.log('\n📊 TOKEN USAGE:');
    console.log(`- Prompt tokens: ${usage.prompt_tokens}`);
    console.log(`- Completion tokens: ${usage.completion_tokens}`);
    console.log(`- Total tokens: ${usage.prompt_tokens + usage.completion_tokens}`);
    console.log(`- Cost: $${(usage.prompt_tokens * 0.15 + usage.completion_tokens * 0.60) / 1000000}`);
    
    console.log('\n📋 RESPONSE:');
    console.log(result);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);
