#!/usr/bin/env tsx
/**
 * Cleanup Analysis Script
 * Analyzes what can be removed from the current implementation
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { promisify } from 'util';
import glob from 'glob';
const globAsync = promisify(glob);

interface CleanupItem {
  type: 'file' | 'directory' | 'code-section';
  path: string;
  reason: string;
  keepAlternative?: string;
}

async function analyzeCleanupOpportunities() {
  console.log('🧹 Analyzing Cleanup Opportunities\n');
  
  const cleanupItems: CleanupItem[] = [];
  
  // 1. Analyze tool adapters
  console.log('📦 Analyzing Tool Adapters...');
  
  const toolsToRemove = [
    // Tools that provide no value for PR analysis
    { pattern: '**/madge-direct.ts', reason: 'Only returns info messages, no actual circular dependency detection in PRs' },
    { pattern: '**/dependency-cruiser-direct.ts', reason: 'Returns 0 findings, only info messages' },
    { pattern: '**/prettier-direct.ts', reason: 'Format checking not valuable without fixing' },
    { pattern: '**/bundlephobia-direct.ts', reason: 'Bundle size not relevant for PR analysis' },
    { pattern: '**/eslint-direct.ts', reason: 'Returns 0 findings on non-JS files', keepAlternative: 'Run in CI instead' },
    { pattern: '**/sonarjs-direct.ts', reason: 'Returns 0 findings on non-JS files', keepAlternative: 'Run in CI instead' },
    { pattern: '**/serena-mcp.ts', reason: 'Mock implementation with errors, no real value' },
    { pattern: '**/context-retrieval-mcp.ts', reason: 'Returns hardcoded mock data' },
    { pattern: '**/ref-mcp.ts', reason: 'Replaced by Tavily for web search' },
  ];
  
  const toolsToKeep = [
    { pattern: '**/git-mcp.ts', reason: 'Useful for git operations' },
    { pattern: '**/tavily-mcp*.ts', reason: 'Provides web context (could be optional)' },
    { pattern: '**/npm-audit-direct.ts', reason: 'Security scanning has some value' },
    { pattern: '**/license-checker-direct.ts', reason: 'License compliance has some value' },
  ];
  
  for (const tool of toolsToRemove) {
    const files = await globAsync(tool.pattern, { cwd: process.cwd() });
    files.forEach((file: string) => {
      cleanupItems.push({
        type: 'file',
        path: file,
        reason: tool.reason,
        keepAlternative: tool.keepAlternative
      });
    });
  }
  
  // 2. Analyze complex aggregation logic
  console.log('\n🔧 Analyzing Complex Logic to Simplify...');
  
  const complexFiles = [
    {
      path: 'src/integration/tool-results-aggregator.ts',
      reason: 'Complex aggregation not needed if using DeepWiki',
      keepAlternative: 'Simple storage of DeepWiki reports'
    },
    {
      path: 'src/integration/mcp-context-aggregator.ts',
      reason: 'Role-based aggregation not providing value',
      keepAlternative: 'Direct DeepWiki analysis'
    },
    {
      path: 'src/integration/parallel-tool-executor.ts',
      reason: 'Not needed with DeepWiki approach',
      keepAlternative: 'Sequential DeepWiki runs'
    }
  ];
  
  complexFiles.forEach(file => {
    cleanupItems.push({
      type: 'code-section',
      path: file.path,
      reason: file.reason,
      keepAlternative: file.keepAlternative
    });
  });
  
  // 3. Print analysis results
  console.log('\n📊 Cleanup Analysis Results:\n');
  
  console.log('🗑️  Files/Components to Remove:');
  const toRemove = cleanupItems.filter(item => !item.keepAlternative || item.keepAlternative !== 'Keep');
  toRemove.forEach((item, index) => {
    console.log(`\n${index + 1}. ${item.path}`);
    console.log(`   Reason: ${item.reason}`);
    if (item.keepAlternative) {
      console.log(`   Alternative: ${item.keepAlternative}`);
    }
  });
  
  console.log('\n\n✅ Components to Keep:');
  for (const tool of toolsToKeep) {
    console.log(`- ${tool.pattern}: ${tool.reason}`);
  }
  
  // 4. Estimate impact
  console.log('\n\n📈 Impact Estimation:');
  const fileCount = toRemove.filter(item => item.type === 'file').length;
  console.log(`- Tool files to remove: ${fileCount}`);
  console.log(`- Estimated code reduction: ~${fileCount * 200} lines`);
  console.log(`- Complexity reduction: HIGH`);
  console.log(`- Maintenance burden reduction: SIGNIFICANT`);
  
  // 5. Proposed new architecture
  console.log('\n\n🏗️  Proposed Simplified Architecture:');
  console.log(`
  ┌─────────────┐     ┌─────────────┐
  │   PR URL    │────▶│ Clone Repo  │
  └─────────────┘     └──────┬──────┘
                             │
                    ┌────────▼────────┐
                    │ DeepWiki Main   │
                    │   (Cached)       │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Switch Branch   │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │DeepWiki Feature │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Store in DB    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Analyze Diff    │
                    │ (Chat or Agent) │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Generate Report │
                    └─────────────────┘
  `);
  
  // 6. Migration steps
  console.log('\n📝 Recommended Migration Steps:');
  console.log('1. Create DeepWiki integration module');
  console.log('2. Test dual-branch analysis approach');
  console.log('3. Remove tool adapters in phases');
  console.log('4. Simplify aggregation to just storage');
  console.log('5. Implement diff analysis (agent or chat)');
  console.log('6. Update tests and documentation');
  
  return cleanupItems;
}

// Run analysis
analyzeCleanupOpportunities()
  .then((items) => {
    console.log('\n✨ Cleanup analysis complete!');
    console.log(`\nTotal items identified for removal: ${items.length}`);
  })
  .catch((error) => {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  });