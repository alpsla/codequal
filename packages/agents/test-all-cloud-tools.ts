#!/usr/bin/env ts-node

/**
 * Test All Cloud Analysis Tools
 * Comprehensive test of all integrated tools
 */

import { CloudAnalysisClient } from './src/two-branch/services/CloudAnalysisClient';

async function testAllTools() {
  console.log('🚀 Testing All Cloud Analysis Tools');
  console.log('=====================================\n');

  const client = new CloudAnalysisClient();
  
  // Get available tools
  console.log('📋 Fetching available tools...');
  const { tools } = await client.getAvailableTools();
  console.log(`   Found ${tools.length} tools\n`);

  // Test repositories for different languages
  const testRepos = {
    'javascript': 'https://github.com/sindresorhus/ky',
    'python': 'https://github.com/psf/requests',
    'multi': 'https://github.com/microsoft/vscode'
  };

  // JavaScript/TypeScript tools
  console.log('📦 JavaScript/TypeScript Tools:');
  console.log('================================');
  
  const jsTools = ['eslint', 'tsc', 'jshint', 'madge', 'npm-audit'];
  for (const tool of jsTools) {
    try {
      console.log(`\n🔧 Testing ${tool}...`);
      const result = await client.analyze({
        tool: tool as any,
        repository: testRepos.javascript,
        branch: 'main'
      });
      console.log(`   Status: ${result.status}`);
      if (result.status === 'completed') {
        console.log(`   Success: ✅`);
        if (tool === 'cloc' && result.results) {
          console.log(`   Files analyzed: ${result.results.header?.n_files}`);
        }
      } else if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    } catch (error) {
      console.log(`   ❌ Failed: ${error}`);
    }
  }

  // Python tools
  console.log('\n\n🐍 Python Tools:');
  console.log('================');
  
  const pyTools = ['bandit', 'pylint', 'mypy', 'safety'];
  for (const tool of pyTools) {
    try {
      console.log(`\n🔧 Testing ${tool}...`);
      const result = await client.analyze({
        tool: tool as any,
        repository: testRepos.python,
        branch: 'main'
      });
      console.log(`   Status: ${result.status}`);
      if (result.status === 'completed') {
        console.log(`   Success: ✅`);
      } else if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    } catch (error) {
      console.log(`   ❌ Failed: ${error}`);
    }
  }

  // Multi-language tools
  console.log('\n\n🌐 Multi-language Tools:');
  console.log('========================');
  
  const multiTools = ['semgrep', 'jscpd', 'cloc'];
  for (const tool of multiTools) {
    try {
      console.log(`\n🔧 Testing ${tool}...`);
      const result = await client.analyze({
        tool: tool as any,
        repository: testRepos.javascript,
        branch: 'main'
      });
      console.log(`   Status: ${result.status}`);
      if (result.status === 'completed') {
        console.log(`   Success: ✅`);
        if (tool === 'cloc' && result.results) {
          const header = result.results.header;
          if (header) {
            console.log(`   Files: ${header.n_files}, Lines: ${header.n_lines}`);
          }
        }
        if (tool === 'jscpd' && result.results) {
          console.log(`   Duplicates found: ${result.results.statistics?.total?.percentage || 0}%`);
        }
      } else if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    } catch (error) {
      console.log(`   ❌ Failed: ${error}`);
    }
  }

  // Test batch analysis
  console.log('\n\n🔄 Batch Analysis Test:');
  console.log('=======================');
  
  try {
    const batchTools = ['eslint', 'semgrep', 'cloc'];
    console.log(`\nAnalyzing with ${batchTools.join(', ')}...`);
    
    const batchResults = await client.batchAnalyze(
      testRepos.javascript,
      batchTools,
      { branch: 'main' }
    );
    
    for (const [tool, result] of batchResults) {
      console.log(`   ${tool}: ${result.status} ${result.status === 'completed' ? '✅' : '❌'}`);
    }
  } catch (error) {
    console.error('   ❌ Batch analysis failed:', error);
  }

  console.log('\n\n✅ All tool tests complete!');
  console.log('============================');
  
  // Summary
  console.log('\n📊 Summary:');
  console.log(`   Total tools available: ${tools.length}`);
  console.log(`   JavaScript tools: ${jsTools.length}`);
  console.log(`   Python tools: ${pyTools.length}`);
  console.log(`   Multi-language tools: ${multiTools.length}`);
  console.log('\n   Cloud service: http://157.230.9.119:3010');
}

// Run tests
testAllTools().catch(console.error);