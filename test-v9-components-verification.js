#!/usr/bin/env node

/**
 * V9 Components Verification Test
 * Tests all V9 components to verify current working status
 */

console.log('🔍 V9 COMPONENTS VERIFICATION TEST');
console.log('=' .repeat(50));
console.log('Date: ' + new Date().toISOString());
console.log('');

const results = {
  core: {},
  utilities: {},
  summary: { total: 0, passed: 0, failed: 0 }
};

// Test Core V9 Components
console.log('📦 Testing Core V9 Components:');
console.log('-'.repeat(30));

const coreComponents = [
  { name: 'V9ScoringCalculator', path: './packages/agents/dist/two-branch/analyzers/v9-scoring-calculator' },
  { name: 'V9IssueComparator', path: './packages/agents/dist/two-branch/analyzers/v9-issue-comparator' },
  { name: 'V9BusinessImpact', path: './packages/agents/dist/two-branch/analyzers/v9-business-impact' },
  { name: 'V9EducationalResources', path: './packages/agents/dist/two-branch/analyzers/v9-educational-resources' },
  { name: 'V9ReportFormatterComplete', path: './packages/agents/dist/two-branch/analyzers/v9-report-formatter-complete' },
  { name: 'V9PRCommentGenerator', path: './packages/agents/dist/two-branch/analyzers/v9-pr-comment-generator' }
];

coreComponents.forEach(comp => {
  try {
    const module = require(comp.path);
    const ComponentClass = module[comp.name];
    if (ComponentClass) {
      new ComponentClass();
      console.log(`✅ ${comp.name}: Loads and instantiates`);
      results.core[comp.name] = 'PASS';
      results.summary.passed++;
    } else {
      console.log(`❌ ${comp.name}: Class not found in module`);
      results.core[comp.name] = 'FAIL - Class not found';
      results.summary.failed++;
    }
  } catch (e) {
    console.log(`❌ ${comp.name}: ${e.message}`);
    results.core[comp.name] = `FAIL - ${e.message}`;
    results.summary.failed++;
  }
  results.summary.total++;
});

// Test Utility Components
console.log('\n🔧 Testing Utility Components:');
console.log('-'.repeat(30));

const utilityComponents = [
  { name: 'OptimizedRepoManager', path: './packages/agents/dist/two-branch/utils/optimized-repo-manager' },
  { name: 'SmartFileSelector', path: './packages/agents/dist/two-branch/utils/smart-file-selector' },
  { name: 'CloudRepositoryManager', path: './packages/agents/dist/two-branch/utils/cloud-repository-manager' }
];

utilityComponents.forEach(comp => {
  try {
    const module = require(comp.path);
    const ComponentClass = module[comp.name];
    if (ComponentClass) {
      // Don't instantiate CloudRepositoryManager as it needs config
      if (comp.name !== 'CloudRepositoryManager') {
        new ComponentClass();
      }
      console.log(`✅ ${comp.name}: Loads successfully`);
      results.utilities[comp.name] = 'PASS';
      results.summary.passed++;
    } else {
      console.log(`❌ ${comp.name}: Class not found in module`);
      results.utilities[comp.name] = 'FAIL - Class not found';
      results.summary.failed++;
    }
  } catch (e) {
    console.log(`❌ ${comp.name}: ${e.message}`);
    results.utilities[comp.name] = `FAIL - ${e.message}`;
    results.summary.failed++;
  }
  results.summary.total++;
});

// Test V9 Analyzers
console.log('\n🎯 Testing V9 Analyzers:');
console.log('-'.repeat(30));

const analyzerComponents = [
  { name: 'V9RepositoryManager', path: './packages/agents/dist/two-branch/analyzers/v9-repository-manager' },
  { name: 'V9ToolOrchestrator', path: './packages/agents/dist/two-branch/analyzers/v9-tool-orchestrator' }
];

analyzerComponents.forEach(comp => {
  try {
    const module = require(comp.path);
    const ComponentClass = module[comp.name];
    if (ComponentClass) {
      if (comp.name === 'V9RepositoryManager') {
        new ComponentClass({ useSmartSelection: true, maxFiles: 500, forceFullAnalysis: false });
      } else {
        new ComponentClass();
      }
      console.log(`✅ ${comp.name}: Loads and instantiates`);
      results.utilities[comp.name] = 'PASS';
      results.summary.passed++;
    } else {
      console.log(`❌ ${comp.name}: Class not found in module`);
      results.utilities[comp.name] = 'FAIL - Class not found';
      results.summary.failed++;
    }
  } catch (e) {
    console.log(`❌ ${comp.name}: ${e.message}`);
    results.utilities[comp.name] = `FAIL - ${e.message}`;
    results.summary.failed++;
  }
  results.summary.total++;
});

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 VERIFICATION SUMMARY:');
console.log('='.repeat(50));
console.log(`Total Components Tested: ${results.summary.total}`);
console.log(`✅ Passed: ${results.summary.passed}`);
console.log(`❌ Failed: ${results.summary.failed}`);
console.log(`Success Rate: ${((results.summary.passed / results.summary.total) * 100).toFixed(1)}%`);

// Save results
const fs = require('fs');
const reportFile = `v9-component-verification-${Date.now()}.json`;
fs.writeFileSync(reportFile, JSON.stringify(results, null, 2));
console.log(`\n📁 Results saved: ${reportFile}`);

// Exit code
process.exit(results.summary.failed > 0 ? 1 : 0);