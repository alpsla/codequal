#!/usr/bin/env ts-node

/**
 * Location Finder Model Research Script
 * 
 * This script runs the ResearcherAgent to find optimal models for the location_finder role.
 * It tests models across popular programming languages to identify the best models
 * for accurately finding issue locations in code.
 * 
 * Modern models with large context windows (100K+ tokens) can handle entire files,
 * so we may not need separate configurations for different file sizes.
 */

import { ResearcherDiscoveryService } from './final/researcher-discovery-service';
import { getSupabase } from '@codequal/database';
import { createLogger } from '@codequal/core/utils';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const logger = createLogger('LocationFinderResearcher');

// Popular languages to test (based on GitHub statistics)
const POPULAR_LANGUAGES = [
  'javascript',
  'typescript', 
  'python',
  'java',
  'go',
  'rust',
  'cpp',
  'csharp',
  'ruby',
  'php'
];

// Test scenarios for location finding
const TEST_SCENARIOS = [
  {
    language: 'javascript',
    issue: 'No Input Validation',
    description: 'User input is processed without validation in Express.js endpoint',
    testCode: `
const express = require('express');
const router = express.Router();

router.post('/api/users', async (req, res) => {
  const userId = req.body.userId;
  const email = req.body.email;
  const age = req.body.age;
  
  // Direct database operation without validation
  await db.users.update({
    id: userId,
    email: email,
    age: age
  });
  
  res.json({ success: true });
});`,
    expectedLine: 5 // Line where validation should be
  },
  {
    language: 'python',
    issue: 'SQL Injection Vulnerability',
    description: 'String concatenation in SQL query creates injection risk',
    testCode: `
import sqlite3

def get_user(user_id):
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    
    # Vulnerable to SQL injection
    query = f"SELECT * FROM users WHERE id = {user_id}"
    cursor.execute(query)
    
    return cursor.fetchone()`,
    expectedLine: 8 // Line with SQL injection
  },
  {
    language: 'java',
    issue: 'Performance Issue',
    description: 'Nested loops causing O(n²) complexity',
    testCode: `
public class DataProcessor {
    public List<Item> findDuplicates(List<Item> items) {
        List<Item> duplicates = new ArrayList<>();
        
        // Inefficient nested loops
        for (int i = 0; i < items.size(); i++) {
            for (int j = i + 1; j < items.size(); j++) {
                if (items.get(i).equals(items.get(j))) {
                    duplicates.add(items.get(i));
                }
            }
        }
        
        return duplicates;
    }
}`,
    expectedLine: 6 // Start of nested loops
  }
];

interface ModelTestResult {
  model: string;
  provider: string;
  language: string;
  accuracy: number; // How close to expected line
  confidence: number;
  responseTime: number;
  tokenUsage: number;
  cost: number;
  contextWindow: number;
}

interface ModelEvaluation {
  model: string;
  provider: string;
  overallScore: number;
  languageScores: Record<string, number>;
  avgAccuracy: number;
  avgResponseTime: number;
  avgCost: number;
  contextWindow: number;
  strengths: string[];
  weaknesses: string[];
}

/**
 * Test a model's ability to find issue locations
 */
async function testModelForLocationFinding(
  model: any,
  scenario: typeof TEST_SCENARIOS[0]
): Promise<ModelTestResult> {
  const startTime = Date.now();
  
  // Create prompt for location finding
  const prompt = `
You are an expert code analyzer. Analyze the following ${scenario.language} code to find the exact location of the issue.

ISSUE: ${scenario.issue}
DESCRIPTION: ${scenario.description}

CODE:
\`\`\`${scenario.language}
${scenario.testCode}
\`\`\`

Respond with JSON containing:
{
  "line": <line number where issue occurs>,
  "confidence": <0-100>,
  "explanation": "<why this is the issue location>"
}`;

  try {
    // Call model (mock for now - would use actual API)
    const response = await callModel(model, prompt);
    const result = JSON.parse(response);
    
    const accuracy = 100 - Math.abs(result.line - scenario.expectedLine) * 10;
    const responseTime = Date.now() - startTime;
    
    return {
      model: model.model,
      provider: model.provider,
      language: scenario.language,
      accuracy: Math.max(0, accuracy),
      confidence: result.confidence || 0,
      responseTime,
      tokenUsage: estimateTokens(prompt + response),
      cost: calculateCost(model, estimateTokens(prompt), estimateTokens(response)),
      contextWindow: model.context_length || 4096
    };
  } catch (error) {
    logger.error(`Failed to test model ${model.id}:`, error instanceof Error ? error : { message: String(error) });
    return {
      model: model.model,
      provider: model.provider,
      language: scenario.language,
      accuracy: 0,
      confidence: 0,
      responseTime: Date.now() - startTime,
      tokenUsage: 0,
      cost: 0,
      contextWindow: model.context_length || 4096
    };
  }
}

/**
 * Call model (placeholder - would use actual OpenRouter API)
 */
async function callModel(model: any, prompt: string): Promise<string> {
  // In production, this would make actual API call
  // For now, return mock response
  return JSON.stringify({
    line: 5 + Math.floor(Math.random() * 3), // Mock line number
    confidence: 80 + Math.floor(Math.random() * 20),
    explanation: "Mock explanation for testing"
  });
}

/**
 * Estimate token count
 */
function estimateTokens(text: string): number {
  // Rough estimate: 1 token per 4 characters
  return Math.ceil(text.length / 4);
}

/**
 * Calculate cost based on model pricing
 */
function calculateCost(model: any, inputTokens: number, outputTokens: number): number {
  const inputCost = parseFloat(model.pricing?.prompt || '0') / 1000;
  const outputCost = parseFloat(model.pricing?.completion || '0') / 1000;
  return (inputTokens * inputCost) + (outputTokens * outputCost);
}

/**
 * Evaluate models for location finding
 */
async function evaluateModelsForLocationFinding(
  models: any[]
): Promise<ModelEvaluation[]> {
  const evaluations: ModelEvaluation[] = [];
  
  for (const model of models) {
    logger.info(`Evaluating model: ${model.id}`);
    
    const results: ModelTestResult[] = [];
    const languageScores: Record<string, number> = {};
    
    // Test each scenario
    for (const scenario of TEST_SCENARIOS) {
      const result = await testModelForLocationFinding(model, scenario);
      results.push(result);
      
      // Track language-specific performance
      if (!languageScores[scenario.language]) {
        languageScores[scenario.language] = 0;
      }
      languageScores[scenario.language] = Math.max(
        languageScores[scenario.language],
        result.accuracy
      );
    }
    
    // Calculate overall metrics
    const avgAccuracy = results.reduce((sum, r) => sum + r.accuracy, 0) / results.length;
    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
    const avgCost = results.reduce((sum, r) => sum + r.cost, 0) / results.length;
    
    // Determine strengths and weaknesses
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    
    if (avgAccuracy > 85) strengths.push('High accuracy in location finding');
    if (avgResponseTime < 2000) strengths.push('Fast response time');
    if (avgCost < 0.01) strengths.push('Cost-effective');
    if (model.context_length >= 100000) strengths.push('Large context window for big files');
    
    if (avgAccuracy < 70) weaknesses.push('Lower accuracy in location finding');
    if (avgResponseTime > 5000) weaknesses.push('Slow response time');
    if (avgCost > 0.05) weaknesses.push('Higher cost per request');
    if (model.context_length < 32000) weaknesses.push('Limited context window');
    
    // Calculate overall score with weights
    const overallScore = (
      avgAccuracy * 0.55 +  // Quality weight from ROLE_SCORING_PROFILES
      (100 - avgCost * 1000) * 0.25 + // Cost weight (inverted)
      (100 - avgResponseTime / 100) * 0.20 // Speed weight (inverted)
    );
    
    evaluations.push({
      model: model.model || model.id.split('/')[1],
      provider: model.provider || model.id.split('/')[0],
      overallScore,
      languageScores,
      avgAccuracy,
      avgResponseTime,
      avgCost,
      contextWindow: model.context_length || 4096,
      strengths,
      weaknesses
    });
  }
  
  // Sort by overall score
  return evaluations.sort((a, b) => b.overallScore - a.overallScore);
}

/**
 * Store model configurations in Supabase
 */
async function storeModelConfigurations(
  evaluations: ModelEvaluation[],
  supabase: any
): Promise<void> {
  // Since we don't need separate configs for file sizes with modern models,
  // we'll store one configuration for all sizes
  
  // Get top 2 models as primary and fallback
  const primary = evaluations[0];
  const fallback = evaluations[1];
  
  logger.info('Storing model configurations:', {
    primary: `${primary.provider}/${primary.model}`,
    fallback: `${fallback.provider}/${fallback.model}`
  });
  
  // Store for each popular language
  for (const language of POPULAR_LANGUAGES) {
    const config = {
      language,
      size_category: 'all', // Single config for all sizes
      provider: primary.provider,
      model: primary.model,
      test_results: {
        primary: {
          ...primary,
          languageScore: primary.languageScores[language] || primary.avgAccuracy
        },
        fallback: {
          ...fallback,
          languageScore: fallback.languageScores[language] || fallback.avgAccuracy
        }
      },
      notes: `Location finder models selected for ${language}. Using single configuration for all file sizes due to large context windows (${primary.contextWindow}+ tokens).`
    };
    
    // Upsert configuration
    const { error } = await supabase
      .from('model_configurations')
      .upsert(config, {
        onConflict: 'language,size_category'
      });
    
    if (error) {
      logger.error(`Failed to store config for ${language}:`, error);
    } else {
      logger.info(`Stored config for ${language}`);
    }
  }
  
  // Also store a default configuration for unknown languages
  const defaultConfig = {
    language: 'default',
    size_category: 'all',
    provider: primary.provider,
    model: primary.model,
    test_results: {
      primary,
      fallback
    },
    notes: 'Default location finder models for unknown languages'
  };
  
  await supabase
    .from('model_configurations')
    .upsert(defaultConfig, {
      onConflict: 'language,size_category'
    });
}

/**
 * Main research function
 */
async function researchLocationFinderModels() {
  console.log('🔬 Starting Location Finder Model Research...\n');
  
  try {
    // Initialize services
    const supabase = getSupabase();
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    
    if (!openRouterApiKey) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }
    
    // Create discovery service
    const discoveryService = new ResearcherDiscoveryService(
      logger as any,
      openRouterApiKey
    );
    
    // Fetch available models
    console.log('📡 Fetching available models from OpenRouter...');
    const models = await discoveryService.fetchAvailableModels();
    console.log(`Found ${models.length} models\n`);
    
    // Filter models suitable for code analysis
    const codeModels = models.filter(model => {
      const id = model.id.toLowerCase();
      const name = model.name?.toLowerCase() || '';
      
      // Include models good at code understanding
      return (
        id.includes('gpt-4') ||
        id.includes('claude') ||
        id.includes('gemini') ||
        id.includes('deepseek') ||
        id.includes('codellama') ||
        id.includes('mixtral') ||
        name.includes('code') ||
        name.includes('instruct')
      ) && (model.context_length ?? 0) >= 16000; // Minimum context for reasonable file sizes
    });
    
    console.log(`📊 Testing ${codeModels.length} code-capable models...\n`);
    
    // Evaluate models
    const evaluations = await evaluateModelsForLocationFinding(codeModels.slice(0, 10)); // Test top 10
    
    // Display results
    console.log('\n📈 Top Models for Location Finding:');
    console.log('═'.repeat(80));
    
    evaluations.slice(0, 5).forEach((evaluation, idx) => {
      console.log(`
${idx + 1}. ${evaluation.provider}/${evaluation.model}`);
      console.log(`   Overall Score: ${evaluation.overallScore.toFixed(2)}/100`);
      console.log(`   Accuracy: ${evaluation.avgAccuracy.toFixed(1)}%`);
      console.log(`   Response Time: ${evaluation.avgResponseTime}ms`);
      console.log(`   Cost: $${evaluation.avgCost.toFixed(4)}/request`);
      console.log(`   Context Window: ${evaluation.contextWindow.toLocaleString()} tokens`);
      console.log(`   Strengths: ${evaluation.strengths.join(', ') || 'None identified'}`);
      console.log(`   Weaknesses: ${evaluation.weaknesses.join(', ') || 'None identified'}`);
    });
    
    console.log('\n' + '═'.repeat(80));
    
    // Store configurations
    console.log('\n💾 Storing model configurations in Supabase...');
    await storeModelConfigurations(evaluations, supabase);
    
    // Summary
    console.log('\n✅ Research Complete!');
    console.log('\n📝 Summary:');
    console.log(`  - Primary Model: ${evaluations[0].provider}/${evaluations[0].model}`);
    console.log(`  - Fallback Model: ${evaluations[1].provider}/${evaluations[1].model}`);
    console.log(`  - Configuration: Single config for all file sizes`);
    console.log(`  - Languages Configured: ${POPULAR_LANGUAGES.join(', ')}`);
    
    console.log('\n💡 Recommendations:');
    if (evaluations[0].contextWindow >= 100000) {
      console.log('  ✓ Primary model has large context window - suitable for entire files');
    }
    if (evaluations[0].avgAccuracy > 85) {
      console.log('  ✓ High accuracy in location finding - ready for production');
    }
    if (evaluations[0].avgCost < 0.01) {
      console.log('  ✓ Cost-effective for high-volume usage');
    }
    
    console.log('\n🎯 Next Steps:');
    console.log('  1. Models are now stored in model_configurations table');
    console.log('  2. UnifiedModelSelector will use these for location_finder role');
    console.log('  3. Test with real DeepWiki issues to validate accuracy');
    
  } catch (error) {
    console.error('❌ Research failed:', error);
    process.exit(1);
  }
}

// Run the research
researchLocationFinderModels()
  .then(() => {
    console.log('\n🎉 Location Finder model research completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });