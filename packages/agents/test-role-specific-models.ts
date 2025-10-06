#!/usr/bin/env ts-node
/**
 * Test Role-Specific Model Selection
 *
 * Validates that each agent gets different models based on role-specific weights
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

import { DynamicModelSelector } from './src/two-branch/services/dynamic-model-selector';

console.log("╔══════════════════════════════════════════════════════════════╗");
console.log("║  Testing Role-Specific Model Selection (BUG FIX VALIDATION) ║");
console.log("╚══════════════════════════════════════════════════════════════╝\n");

// Role-specific weights (should match v9-base-analyzer.ts)
const roleWeights: Record<string, { quality: number; speed: number; cost: number }> = {
  SecurityAgent: { quality: 0.8, speed: 0.1, cost: 0.1 },
  PerformanceAgent: { quality: 0.5, speed: 0.3, cost: 0.2 },
  ArchitectureAgent: { quality: 0.7, speed: 0.2, cost: 0.1 },
  CodeQualityAgent: { quality: 0.4, speed: 0.3, cost: 0.3 },
  DependencyAgent: { quality: 0.3, speed: 0.4, cost: 0.3 }
};

async function testRoleSpecificModels() {
  const selector = new DynamicModelSelector(process.env.OPENROUTER_API_KEY);

  console.log("📊 Testing model selection for each agent role:\n");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const results: any[] = [];

  for (const [role, weights] of Object.entries(roleWeights)) {
    console.log(`🔍 Selecting model for: ${role}`);
    console.log(`   Weights: Quality=${weights.quality}, Speed=${weights.speed}, Cost=${weights.cost}`);

    try {
      const requirements = {
        role,
        description: `Agent for ${role}`,
        repositorySize: 'medium' as const,
        weights
      };

      const { primary, fallback, reasoning } = await selector.selectModelsForRole(requirements);

      console.log(`   ✅ Primary:  ${primary.id} (Score: ${primary.totalScore?.toFixed(3)})`);
      console.log(`   ✅ Fallback: ${fallback.id} (Score: ${fallback.totalScore?.toFixed(3)})`);
      console.log(``);

      results.push({
        role,
        weights,
        primary: primary.id,
        primaryScore: primary.totalScore,
        fallback: fallback.id,
        fallbackScore: fallback.totalScore
      });

    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}\n`);
      results.push({
        role,
        weights,
        error: error.message
      });
    }
  }

  console.log("═══════════════════════════════════════════════════════════════\n");
  console.log("📊 RESULTS SUMMARY\n");
  console.log("═══════════════════════════════════════════════════════════════\n");

  // Check for diversity
  const uniquePrimaryModels = new Set(results.filter(r => r.primary).map(r => r.primary));
  const uniqueFallbackModels = new Set(results.filter(r => r.fallback).map(r => r.fallback));

  console.log(`✅ Unique Primary Models:  ${uniquePrimaryModels.size}/${results.length}`);
  console.log(`✅ Unique Fallback Models: ${uniqueFallbackModels.size}/${results.length}\n`);

  if (uniquePrimaryModels.size === 1) {
    console.log("⚠️  WARNING: All agents selected the SAME primary model!");
    console.log("    This indicates the role-specific weights are NOT working.\n");
  } else if (uniquePrimaryModels.size >= 3) {
    console.log("✅ EXCELLENT: Agents selected different models based on their roles!");
    console.log(`   Model diversity: ${uniquePrimaryModels.size} different models\n`);
  } else {
    console.log("⚠️  PARTIAL: Some diversity but could be better.");
    console.log(`   Model diversity: ${uniquePrimaryModels.size} different models\n`);
  }

  // Display model distribution
  console.log("═══════════════════════════════════════════════════════════════\n");
  console.log("📋 MODEL DISTRIBUTION BY AGENT\n");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const table: any[] = [];
  results.forEach(r => {
    if (r.primary) {
      table.push({
        'Agent': r.role,
        'Quality': `${(r.weights.quality * 100).toFixed(0)}%`,
        'Speed': `${(r.weights.speed * 100).toFixed(0)}%`,
        'Cost': `${(r.weights.cost * 100).toFixed(0)}%`,
        'Primary Model': r.primary.split('/')[1] || r.primary,
        'Score': r.primaryScore?.toFixed(3) || 'N/A'
      });
    }
  });

  console.table(table);

  // Validation
  console.log("\n═══════════════════════════════════════════════════════════════\n");
  console.log("✅ VALIDATION RESULTS\n");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const allSuccess = results.every(r => r.primary);
  const hasDeversity = uniquePrimaryModels.size >= 3;

  if (allSuccess && hasDeversity) {
    console.log("✅ TEST PASSED: Role-specific model selection working correctly!\n");
    console.log("   ✅ All agents successfully selected models");
    console.log(`   ✅ Model diversity: ${uniquePrimaryModels.size} different models`);
    console.log("   ✅ Bug fix validated!\n");
  } else if (!allSuccess) {
    console.log("❌ TEST FAILED: Some agents failed to select models\n");
  } else if (!hasDeversity) {
    console.log("❌ TEST FAILED: No model diversity - all agents using same model\n");
    console.log("   ❌ Role-specific weights may not be working\n");
  }

  // Expected behavior
  console.log("═══════════════════════════════════════════════════════════════\n");
  console.log("📚 EXPECTED BEHAVIOR (For Reference)\n");
  console.log("═══════════════════════════════════════════════════════════════\n");
  console.log("SecurityAgent (Q:80%, S:10%, C:10%):");
  console.log("  → Should select highest quality model (e.g., Claude Opus 4.1)\n");
  console.log("PerformanceAgent (Q:50%, S:30%, C:20%):");
  console.log("  → Should select balanced model (e.g., Gemini 2.5 Pro)\n");
  console.log("ArchitectureAgent (Q:70%, S:20%, C:10%):");
  console.log("  → Should select high quality model (e.g., Claude Sonnet 4)\n");
  console.log("CodeQualityAgent (Q:40%, S:30%, C:30%):");
  console.log("  → Should select cost-effective model (e.g., GPT-4o-mini)\n");
  console.log("DependencyAgent (Q:30%, S:40%, C:30%):");
  console.log("  → Should select fast model (e.g., Gemini 2.5 Flash)\n");
  console.log("\n═══════════════════════════════════════════════════════════════\n");
}

// Run the test
testRoleSpecificModels().catch(console.error);
