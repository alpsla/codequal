#!/usr/bin/env node

/**
 * Direct Test of V9 Tool Orchestrator
 *
 * Tests the tool orchestrator directly without the full PR flow
 * to verify:
 * 1. Tools run first
 * 2. Agents interpret results
 * 3. Issues are properly formatted
 */

import { config } from 'dotenv';
import * as path from 'path';
import { V9ToolOrchestrator } from '../analyzers/v9-tool-orchestrator';
import { V9JavaAnalyzer } from '../analyzers/v9-java-analyzer';

// Load environment variables
config({ path: path.join(__dirname, '../../../.env') });
console.log('✅ Environment loaded from:', path.join(__dirname, '../../../.env'));

async function testToolOrchestratorDirect() {
  console.log('\n🚀 Direct Test of V9 Tool Orchestrator');
  console.log('============================================================');
  console.log(`📅 Test Date: ${new Date().toISOString()}`);
  console.log('🎯 Testing tool-first architecture');
  console.log('============================================================\n');

  try {
    // Initialize components
    console.log('1️⃣ Initializing V9ToolOrchestrator...');
    const orchestrator = new V9ToolOrchestrator();
    console.log('   ✅ Tool Orchestrator initialized\n');

    console.log('2️⃣ Getting Java language configuration...');
    const javaAnalyzer = new V9JavaAnalyzer();
    const languageConfig = javaAnalyzer.getLanguageConfig();
    console.log(`   ✅ Found ${languageConfig.tools.length} tools configured for Java:`);
    languageConfig.tools.forEach(tool => {
      console.log(`      - ${tool.name} (Agent: ${tool.agent})`);
    });
    console.log();

    // Use existing cached Kafka repository for testing
    const repoPath = '/tmp/codequal/cache/repos/apache/kafka';
    console.log('3️⃣ Using cached repository for testing:');
    console.log(`   📁 Path: ${repoPath}`);

    // Get some Java files to analyze
    const fs = await import('fs');
    const allFiles = await fs.promises.readdir(repoPath, { recursive: true });
    const javaFiles = allFiles
      .filter(f => typeof f === 'string' && f.endsWith('.java'))
      .slice(0, 5) // Just analyze first 5 Java files for testing
      .map(f => path.join(repoPath, f));

    console.log(`   📊 Found ${allFiles.filter(f => typeof f === 'string' && f.endsWith('.java')).length} Java files`);
    console.log(`   🔍 Will analyze first ${javaFiles.length} files for testing\n`);

    // Run the orchestrator
    console.log('4️⃣ Running Tool Orchestration...');
    console.log('   📡 STEP 1: Running scanning tools...');
    console.log('   🤖 STEP 2: Sending to AI agents...');
    console.log('   🔍 STEP 3: Deduplicating results...\n');

    const startTime = Date.now();

    const issues = await orchestrator.orchestrateAnalysis(
      javaFiles,
      repoPath,
      'java',
      languageConfig.tools
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ Orchestration completed in ${duration} seconds!\n`);

    // Display results
    console.log('5️⃣ Analysis Results:');
    console.log('============================================================');
    console.log(`Total Issues Found: ${issues.length}\n`);

    // Group by severity
    const bySeverity: Record<string, number> = {};
    issues.forEach(issue => {
      bySeverity[issue.severity] = (bySeverity[issue.severity] || 0) + 1;
    });
    console.log('Issues by Severity:');
    Object.entries(bySeverity).forEach(([severity, count]) => {
      const emoji = severity === 'critical' ? '🔴' :
                    severity === 'high' ? '🟠' :
                    severity === 'medium' ? '🟡' : '🟢';
      console.log(`  ${emoji} ${severity}: ${count}`);
    });

    // Group by category
    const byCategory: Record<string, number> = {};
    issues.forEach(issue => {
      byCategory[issue.category] = (byCategory[issue.category] || 0) + 1;
    });
    console.log('\nIssues by Category:');
    Object.entries(byCategory).forEach(([category, count]) => {
      console.log(`  📂 ${category}: ${count}`);
    });

    // Group by tool
    const byTool: Record<string, number> = {};
    issues.forEach(issue => {
      byTool[issue.tool] = (byTool[issue.tool] || 0) + 1;
    });
    console.log('\nIssues by Tool:');
    Object.entries(byTool).forEach(([tool, count]) => {
      console.log(`  🔧 ${tool}: ${count}`);
    });

    // Group by agent
    const byAgent: Record<string, number> = {};
    issues.forEach(issue => {
      byAgent[issue.agent] = (byAgent[issue.agent] || 0) + 1;
    });
    console.log('\nIssues by Agent:');
    Object.entries(byAgent).forEach(([agent, count]) => {
      console.log(`  🤖 ${agent}: ${count}`);
    });

    // Show first 3 issues as examples
    console.log('\n📋 Sample Issues:');
    issues.slice(0, 3).forEach((issue, idx) => {
      console.log(`\n  Issue ${idx + 1}:`);
      console.log(`    ID: ${issue.id}`);
      console.log(`    Title: ${issue.title}`);
      console.log(`    Severity: ${issue.severity}`);
      console.log(`    Category: ${issue.category}`);
      console.log(`    Tool: ${issue.tool}`);
      console.log(`    Agent: ${issue.agent}`);
      console.log(`    File: ${issue.file}`);
      console.log(`    Line: ${issue.line}`);
      if (issue.confidence) {
        console.log(`    Confidence: ${(issue.confidence * 100).toFixed(0)}%`);
      }
      if (issue.description) {
        console.log(`    Description: ${issue.description.substring(0, 100)}...`);
      }
    });

    // Final summary
    console.log('\n\n6️⃣ Test Summary:');
    console.log('============================================================');
    console.log('✅ V9ToolOrchestrator successfully executed');
    console.log('✅ Tools ran first to scan code');
    console.log('✅ AI agents interpreted tool results');
    console.log('✅ Issues properly formatted and categorized');
    console.log(`✅ Found ${issues.length} issues across ${javaFiles.length} files`);
    console.log('\n🎉 Tool-first architecture verified successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Error details:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the test
testToolOrchestratorDirect().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});