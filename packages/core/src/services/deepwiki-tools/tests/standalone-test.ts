/**
 * Standalone Tool Testing Script
 * Tests tools without database dependencies
 */

import { ToolRunnerService } from '../tool-runner.service';
import { Logger } from '../../../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

// Simple logger for testing
const logger: Logger = {
  info: (msg: string, meta?: any) => console.log('[INFO]', msg, meta || ''),
  warn: (msg: string, meta?: any) => console.warn('[WARN]', msg, meta || ''),
  error: (msg: string, meta?: any) => console.error('[ERROR]', msg, meta || ''),
  debug: (msg: string, meta?: any) => console.debug('[DEBUG]', msg, meta || '')
} as Logger;

// Test repositories
const TEST_REPOSITORIES = [
  {
    name: 'CodeQual MCP-Hybrid',
    path: path.join(__dirname, '../../../../../mcp-hybrid'),
    tools: ['npm-audit', 'license-checker', 'madge', 'dependency-cruiser', 'npm-outdated']
  },
  {
    name: 'CodeQual Core', 
    path: path.join(__dirname, '../../../../../core'),
    tools: ['npm-audit', 'license-checker', 'madge', 'dependency-cruiser', 'npm-outdated']
  }
];

// Result formatter
function formatToolResult(toolId: string, result: any) {
  console.log(`\n🔸 ${toolId.toUpperCase()}:`);
  
  if (result.success) {
    console.log(`   ✅ Success (${result.executionTime}ms)`);
    
    // Display key findings based on tool
    switch (toolId) {
      case 'npm-audit': {
        const vulns = result.metadata?.totalVulnerabilities || 0;
        console.log(`   📊 Vulnerabilities: ${vulns}`);
        if (result.metadata?.vulnerabilities) {
          const v = result.metadata.vulnerabilities;
          if (v.critical > 0) console.log(`      Critical: ${v.critical}`);
          if (v.high > 0) console.log(`      High: ${v.high}`);
          if (v.moderate > 0) console.log(`      Moderate: ${v.moderate}`);
        }
        break;
      }
        
      case 'license-checker':
        console.log(`   📊 Total packages: ${result.output?.totalPackages || 0}`);
        if (result.output?.riskyLicenses?.length > 0) {
          console.log(`   ⚠️  Risky licenses: ${result.output.riskyLicenses.length}`);
        }
        break;
        
      case 'madge': {
        const circular = result.output?.circular?.length || 0;
        console.log(`   📊 Circular dependencies: ${circular}`);
        if (circular > 0 && result.output?.circular) {
          console.log(`   Details:`);
          result.output.circular.slice(0, 3).forEach((cycle: string[]) => {
            console.log(`      - ${cycle.join(' → ')}`);
          });
        }
        break;
      }
        
      case 'dependency-cruiser': {
        const violations = result.output?.violations?.length || 0;
        console.log(`   📊 Rule violations: ${violations}`);
        break;
      }
        
      case 'npm-outdated': {
        const outdated = result.output?.outdatedCount || 0;
        console.log(`   📊 Outdated packages: ${outdated}`);
        if (result.metadata?.majorUpdates > 0) {
          console.log(`      Major updates: ${result.metadata.majorUpdates}`);
        }
        break;
      }
    }
    
    // Save detailed result
    const outputDir = path.join(__dirname, 'standalone-results');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const filename = `${toolId}-result.json`;
    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(result, null, 2));
    console.log(`   💾 Full result saved to: standalone-results/${filename}`);
    
  } else {
    console.log(`   ❌ Failed: ${result.error}`);
  }
}

// Main test function
async function runStandaloneTests() {
  console.log('🚀 Standalone Tool Testing');
  console.log('==========================\n');
  console.log('This tests the tools without database dependencies.\n');
  
  const toolRunner = new ToolRunnerService(logger);
  
  for (const repo of TEST_REPOSITORIES) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📦 Testing: ${repo.name}`);
    console.log(`📍 Path: ${repo.path}`);
    console.log('='.repeat(60));
    
    // Check if repo exists
    if (!fs.existsSync(repo.path)) {
      console.log('⚠️  Repository path does not exist');
      continue;
    }
    
    // Check for package.json
    const packageJsonPath = path.join(repo.path, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      console.log('⚠️  No package.json found');
      continue;
    }
    
    try {
      console.log('\n🔧 Running tools...');
      const startTime = Date.now();
      
      const results = await toolRunner.runTools({
        repositoryPath: repo.path,
        enabledTools: repo.tools,
        timeout: 60000 // 1 minute per repo
      });
      
      const totalTime = Date.now() - startTime;
      console.log(`\n⏱️  Total execution time: ${totalTime}ms`);
      
      // Display results
      for (const [toolId, result] of Object.entries(results)) {
        formatToolResult(toolId, result);
      }
      
      // Summary
      const successful = Object.values(results).filter((r: any) => r.success).length;
      const failed = Object.values(results).filter((r: any) => !r.success).length;
      
      console.log(`\n📊 Summary: ${successful} succeeded, ${failed} failed`);
      
    } catch (error) {
      console.error('\n❌ Error running tools:', error);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Standalone testing completed!');
  console.log('\nResults saved in: standalone-results/');
  console.log('='.repeat(60));
}

// Run if executed directly
if (require.main === module) {
  runStandaloneTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runStandaloneTests };
