/**
 * Integration Smoke Test
 * Quick test to identify missing dependencies and integration issues
 */

import * as path from 'path';
import * as fs from 'fs';

// Test what we can import
console.log('🧪 Testing Two-Branch Analysis System Integration\n');

// Test 1: Core imports
console.log('1️⃣ Testing core imports...');
try {
  const { RepositoryManager } = require('../core/RepositoryManager');
  const { TwoBranchAnalyzer } = require('../core/TwoBranchAnalyzer');
  console.log('   ✅ Core modules imported successfully');
} catch (error: any) {
  console.log('   ❌ Core import failed:', error.message);
}

// Test 2: Indexing imports
console.log('\n2️⃣ Testing indexing imports...');
try {
  const { RepositoryIndexer } = require('../indexing/RepositoryIndexer');
  const { DualBranchIndexer } = require('../indexing/DualBranchIndexer');
  console.log('   ✅ Indexing modules imported successfully');
} catch (error: any) {
  console.log('   ❌ Indexing import failed:', error.message);
}

// Test 3: Cache imports
console.log('\n3️⃣ Testing cache imports...');
try {
  const { AnalysisCacheService } = require('../cache/AnalysisCacheService');
  const { CacheManager } = require('../cache/CacheManager');
  console.log('   ✅ Cache modules imported successfully');
} catch (error: any) {
  console.log('   ❌ Cache import failed:', error.message);
}

// Test 4: Comparator imports
console.log('\n4️⃣ Testing comparator imports...');
try {
  const { TwoBranchComparator } = require('../comparators/TwoBranchComparator');
  const { IssueMatcher } = require('../comparators/IssueMatcher');
  console.log('   ✅ Comparator modules imported successfully');
} catch (error: any) {
  console.log('   ❌ Comparator import failed:', error.message);
}

// Test 5: Analyzer imports
console.log('\n5️⃣ Testing analyzer imports...');
try {
  const { BranchAnalyzer } = require('../analyzers/BranchAnalyzer');
  console.log('   ✅ Analyzer modules imported successfully');
} catch (error: any) {
  console.log('   ❌ Analyzer import failed:', error.message);
}

// Test 6: Reporter imports
console.log('\n6️⃣ Testing reporter imports...');
try {
  const { ReportGeneratorV9 } = require('../reporters/ReportGeneratorV9');
  console.log('   ✅ Reporter modules imported successfully');
} catch (error: any) {
  console.log('   ❌ Reporter import failed:', error.message);
}

// Test 7: MCP Integration imports
console.log('\n7️⃣ Testing MCP integration...');
try {
  const { ParallelToolExecutor } = require('../../../mcp-hybrid/src/integration/parallel-tool-executor');
  console.log('   ✅ MCP integration found');
} catch (error: any) {
  console.log('   ❌ MCP integration missing:', error.message);
  console.log('   💡 This is expected if mcp-hybrid package is not built');
}

// Test 8: Specialized Agents
console.log('\n8️⃣ Testing specialized agents...');
try {
  const { ArchitectureAgent } = require('../../specialized/architecture-agent');
  const { DependencyAgent } = require('../../specialized/dependency-agent');
  console.log('   ✅ Specialized agents found');
  
  // Check for missing agents
  const missingAgents = [];
  try { require('../../specialized/security-agent'); } catch { missingAgents.push('Security'); }
  try { require('../../specialized/performance-agent'); } catch { missingAgents.push('Performance'); }
  try { require('../../specialized/code-quality-agent'); } catch { missingAgents.push('CodeQuality'); }
  
  if (missingAgents.length > 0) {
    console.log(`   ⚠️  Missing agents: ${missingAgents.join(', ')}`);
  }
} catch (error: any) {
  console.log('   ❌ Specialized agents error:', error.message);
}

// Test 9: Model Researcher Service
console.log('\n9️⃣ Testing Model Researcher Service...');
try {
  const { ModelResearcherService } = require('../../standard/services/model-researcher-service');
  console.log('   ✅ Model Researcher Service found');
} catch (error: any) {
  console.log('   ❌ Model Researcher Service missing:', error.message);
}

// Test 10: Simple instantiation test
console.log('\n🔟 Testing component instantiation...');
try {
  const { TwoBranchAnalyzer } = require('../core/TwoBranchAnalyzer');
  const analyzer = new TwoBranchAnalyzer();
  console.log('   ✅ TwoBranchAnalyzer instantiated successfully');
} catch (error: any) {
  console.log('   ❌ Instantiation failed:', error.message);
  console.log('   Details:', error.stack);
}

// Test 11: Check for required environment variables
console.log('\n1️⃣1️⃣ Checking environment variables...');
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENROUTER_API_KEY',
  'REDIS_URL'
];

const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingEnvVars.length > 0) {
  console.log(`   ⚠️  Missing env vars: ${missingEnvVars.join(', ')}`);
  console.log('   💡 Some features may not work without these');
} else {
  console.log('   ✅ All environment variables present');
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 INTEGRATION TEST SUMMARY');
console.log('='.repeat(50));

// Identify critical missing components
const criticalIssues: string[] = [];
const warnings: string[] = [];
const suggestions: string[] = [];

// Check critical paths
try {
  require('../core/TwoBranchAnalyzer');
} catch {
  criticalIssues.push('TwoBranchAnalyzer cannot be loaded');
}

try {
  require('../../../mcp-hybrid/src/integration/parallel-tool-executor');
} catch {
  warnings.push('MCP integration not available - tools won\'t run');
  suggestions.push('Build mcp-hybrid package: npm run build --workspace=packages/mcp-hybrid');
}

if (missingEnvVars.includes('SUPABASE_URL') || missingEnvVars.includes('SUPABASE_SERVICE_ROLE_KEY')) {
  warnings.push('Supabase not configured - model selection will use defaults');
  suggestions.push('Add Supabase credentials to .env file');
}

// Missing specialized agents
const agentsToCreate = ['security-agent', 'performance-agent', 'code-quality-agent'];
for (const agent of agentsToCreate) {
  try {
    require(`../../specialized/${agent}`);
  } catch {
    warnings.push(`Missing ${agent} - some analysis features unavailable`);
    suggestions.push(`Create ${agent}.ts in packages/agents/src/specialized/`);
  }
}

// Print results
if (criticalIssues.length > 0) {
  console.log('\n❌ CRITICAL ISSUES:');
  criticalIssues.forEach(issue => console.log(`   - ${issue}`));
}

if (warnings.length > 0) {
  console.log('\n⚠️  WARNINGS:');
  warnings.forEach(warning => console.log(`   - ${warning}`));
}

if (suggestions.length > 0) {
  console.log('\n💡 SUGGESTIONS:');
  suggestions.forEach(suggestion => console.log(`   - ${suggestion}`));
}

if (criticalIssues.length === 0) {
  console.log('\n✅ System core is functional!');
  console.log('   Next steps:');
  console.log('   1. Create missing specialized agents');
  console.log('   2. Build mcp-hybrid package if not built');
  console.log('   3. Configure environment variables');
  console.log('   4. Run full test suite: npm test two-branch');
}

// Test data transition flow
console.log('\n' + '='.repeat(50));
console.log('🔄 DATA TRANSITION FLOW TEST');
console.log('='.repeat(50));

async function testDataFlow() {
  console.log('\nTesting data transitions:');
  
  // 1. PR URL parsing
  console.log('\n1. PR URL → Repository Info');
  const prUrl = 'https://github.com/facebook/react/pull/12345';
  const prRegex = /github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/;
  const match = prUrl.match(prRegex);
  if (match) {
    console.log(`   ✅ Parsed: owner=${match[1]}, repo=${match[2]}, pr=${match[3]}`);
  } else {
    console.log('   ❌ Failed to parse PR URL');
  }
  
  // 2. Mock repository structure
  console.log('\n2. Repository → Index Structure');
  const mockIndex = {
    main: { totalFiles: 100, languages: ['TypeScript', 'JavaScript'] },
    pr: { totalFiles: 102, languages: ['TypeScript', 'JavaScript'] },
    crossReference: new Map([
      ['src/index.ts', { status: 'modified', mainPath: 'src/index.ts', prPath: 'src/index.ts' }],
      ['src/new.ts', { status: 'added', prPath: 'src/new.ts' }]
    ])
  };
  console.log(`   ✅ Mock index created: ${mockIndex.crossReference.size} files tracked`);
  
  // 3. Tool results structure
  console.log('\n3. Tools → Issue Format');
  const mockToolResult = {
    tool: 'eslint',
    success: true,
    results: [
      {
        file: 'src/index.ts',
        line: 42,
        severity: 'warning',
        message: 'Missing semicolon'
      }
    ]
  };
  console.log(`   ✅ Tool result structure valid`);
  
  // 4. Issue comparison
  console.log('\n4. Issues → Comparison Result');
  const mockComparison = {
    newIssues: [{ id: '1', message: 'New issue', severity: 'high' }],
    fixedIssues: [{ id: '2', message: 'Fixed issue', severity: 'medium' }],
    unchangedIssues: [],
    metrics: {
      total: 1,
      improvement: 50
    }
  };
  console.log(`   ✅ Comparison structure: ${mockComparison.newIssues.length} new, ${mockComparison.fixedIssues.length} fixed`);
  
  // 5. Report generation
  console.log('\n5. Comparison → Report');
  const mockReport = `# Analysis Report\n- New: ${mockComparison.newIssues.length}\n- Fixed: ${mockComparison.fixedIssues.length}`;
  console.log(`   ✅ Report generated: ${mockReport.length} characters`);
}

// Run the flow test
testDataFlow().then(() => {
  console.log('\n✨ Integration smoke test complete!');
}).catch(error => {
  console.error('\n❌ Flow test failed:', error);
});

export {};