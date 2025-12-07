#!/usr/bin/env npx ts-node
/**
 * Quarterly Research Runner
 *
 * Runs all research services to keep configurations up-to-date.
 * Execute this quarterly (every 90 days) via cron job or manually.
 *
 * Usage:
 *   npx ts-node run-quarterly-research.ts
 *   npx ts-node run-quarterly-research.ts --tools-only
 *   npx ts-node run-quarterly-research.ts --models-only
 *   npx ts-node run-quarterly-research.ts --ai-fixer-only
 *   npx ts-node run-quarterly-research.ts --rule-tools-only
 */

import { ToolResearcherService } from './tool-researcher-service';
import { ModelResearcherService } from './model-researcher-service';
import { RuleBasedToolResearcherService } from './rule-based-tool-researcher';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface ResearchReport {
  timestamp: Date;
  toolResearch?: {
    toolsChecked: number;
    needsUpdate: number;
    errors: string[];
  };
  ruleToolResearch?: {
    rulesProcessed: number;
    toolsKept: number;
    toolsUpdated: number;
    toolsReplaced: number;
  };
  modelResearch?: {
    modelsEvaluated: number;
    configsUpdated: number;
  };
  aiFixerResearch?: {
    languagesTested: string[];
    weightsTuned: boolean;
    recommendations: string[];
  };
}

async function runToolResearch(): Promise<ResearchReport['toolResearch']> {
  console.log('\n' + '='.repeat(80));
  console.log('🔧 TOOL VERSION RESEARCH');
  console.log('='.repeat(80));

  const toolResearcher = new ToolResearcherService();

  // Check if research is fresh
  const isFresh = await toolResearcher.isResearchFresh();
  if (isFresh) {
    console.log('✅ Tool research is still fresh (within 90 days)');
    console.log('   Run with --force to re-run anyway');

    // Return cached stats
    const toolsNeedingUpdate = await toolResearcher.getToolsNeedingUpdate();
    return {
      toolsChecked: 0,
      needsUpdate: toolsNeedingUpdate.length,
      errors: [],
    };
  }

  return await toolResearcher.conductQuarterlyResearch();
}

async function runRuleToolResearch(): Promise<ResearchReport['ruleToolResearch']> {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 RULE-BASED TOOL RESEARCH');
  console.log('='.repeat(80));

  console.log('\n📋 Rule-Based Tool Research Steps:');
  console.log('   1. Get all rules from Supabase');
  console.log('   2. For each rule category/language, search for best tool on the market');
  console.log('   3. Compare with current tools:');
  console.log('      - If same tool, same version → keep');
  console.log('      - If same tool, new version → update version');
  console.log('      - If better tool found → recommend replacement');
  console.log('   4. Apply changes to Supabase');

  const ruleToolResearcher = new RuleBasedToolResearcherService();
  const report = await ruleToolResearcher.conductResearch();

  return {
    rulesProcessed: report.rulesProcessed,
    toolsKept: report.toolsKept,
    toolsUpdated: report.toolsUpdated,
    toolsReplaced: report.toolsReplaced,
  };
}

async function runModelResearch(): Promise<ResearchReport['modelResearch']> {
  console.log('\n' + '='.repeat(80));
  console.log('🤖 AI MODEL RESEARCH');
  console.log('='.repeat(80));

  const modelResearcher = new ModelResearcherService();

  // Run quarterly model research
  await modelResearcher.conductQuarterlyResearch();

  // Update analysis role configurations
  console.log('\n📊 Updating analysis role configurations...');
  await modelResearcher.updateAnalysisRoleConfigurations();

  // Update meta role configurations
  console.log('\n📊 Updating meta role configurations...');
  await modelResearcher.updateMetaRoleConfigurations();

  return {
    modelsEvaluated: 0, // Would need to track this
    configsUpdated: 0,
  };
}

async function runAIFixerResearch(): Promise<ResearchReport['aiFixerResearch']> {
  console.log('\n' + '='.repeat(80));
  console.log('🔬 AI FIXER RESEARCH');
  console.log('='.repeat(80));

  // Languages to test (same as in ai-fixer-researcher.ts)
  const languages = [
    'typescript', 'javascript', 'python', 'java', 'go', 'rust',
    'cpp', 'c', 'csharp', 'kotlin', 'swift', 'ruby', 'php'
  ];

  console.log('\n📋 AI Fixer Research Steps:');
  console.log('   1. Populate model_configurations for role=ai_fixer');
  console.log('   2. Run weight configuration research');
  console.log('   3. Store results in ai_fixer_research table');

  // Step 1: Populate AI Fixer model configurations
  console.log('\n🔧 Step 1: Setting up AI Fixer model configurations...');
  const modelResearcher = new ModelResearcherService();
  await modelResearcher.updateAIFixerRoleConfigurations();

  // Step 2: Run AI Fixer weight research using AIFixerResearcherService
  console.log('\n🔬 Step 2: Running AI Fixer weight research...');
  const { AIFixerResearcherService } = await import('./ai-fixer-researcher');
  const aiFixerResearcher = new AIFixerResearcherService();
  const results = await aiFixerResearcher.conductResearch();

  // Extract recommendations from results
  const recommendations: string[] = [];
  for (const result of results) {
    if (result.recommendedFor.length > 0) {
      const configName = Object.keys(result.config).length > 0 ? 'config' : 'unknown';
      recommendations.push(`${configName}: Best for ${result.recommendedFor.join(', ')}`);
    }
  }

  return {
    languagesTested: languages,
    weightsTuned: true,
    recommendations,
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const report: ResearchReport = { timestamp: new Date() };

  console.log('🔬 CodeQual Quarterly Research');
  console.log(`   Date: ${report.timestamp.toISOString()}`);
  console.log(`   Args: ${args.join(' ') || '(all research)'}`);

  // Check required environment variables
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing required environment variables:');
    console.error('   SUPABASE_URL');
    console.error('   SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  try {
    // Run research based on args
    if (args.includes('--tools-only')) {
      report.toolResearch = await runToolResearch();
    } else if (args.includes('--rule-tools-only')) {
      report.ruleToolResearch = await runRuleToolResearch();
    } else if (args.includes('--models-only')) {
      report.modelResearch = await runModelResearch();
    } else if (args.includes('--ai-fixer-only')) {
      report.aiFixerResearch = await runAIFixerResearch();
    } else {
      // Run all research
      report.toolResearch = await runToolResearch();
      report.ruleToolResearch = await runRuleToolResearch();
      report.modelResearch = await runModelResearch();
      report.aiFixerResearch = await runAIFixerResearch();
    }

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESEARCH SUMMARY');
    console.log('='.repeat(80));

    if (report.toolResearch) {
      console.log(`\n🔧 Tool Version Research:`);
      console.log(`   Tools checked: ${report.toolResearch.toolsChecked}`);
      console.log(`   Needs update: ${report.toolResearch.needsUpdate}`);
      console.log(`   Errors: ${report.toolResearch.errors.length}`);
    }

    if (report.ruleToolResearch) {
      console.log(`\n🔍 Rule-Based Tool Research:`);
      console.log(`   Rules processed: ${report.ruleToolResearch.rulesProcessed}`);
      console.log(`   Tools kept (no change): ${report.ruleToolResearch.toolsKept}`);
      console.log(`   Tools updated (new version): ${report.ruleToolResearch.toolsUpdated}`);
      console.log(`   Tools to replace: ${report.ruleToolResearch.toolsReplaced}`);
    }

    if (report.modelResearch) {
      console.log(`\n🤖 Model Research:`);
      console.log(`   Models evaluated: ${report.modelResearch.modelsEvaluated}`);
      console.log(`   Configs updated: ${report.modelResearch.configsUpdated}`);
    }

    if (report.aiFixerResearch) {
      console.log(`\n🔬 AI Fixer Research:`);
      console.log(`   Languages tested: ${report.aiFixerResearch.languagesTested.join(', ')}`);
      console.log(`   Weights tuned: ${report.aiFixerResearch.weightsTuned}`);
    }

    console.log('\n✅ Quarterly research complete!');
    console.log(`   Next scheduled: ${new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()}`);

  } catch (error) {
    console.error('\n❌ Research failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
main();
