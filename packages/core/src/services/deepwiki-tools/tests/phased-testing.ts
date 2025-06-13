/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-unused-vars, no-console */

/**
 * Phased Testing Script for DeepWiki Tool Integration
 * Tests each tool with real repositories and provides detailed output for review
 */

import { ToolRunnerService } from '../tool-runner.service';
import { ToolResultStorageService } from '../tool-result-storage.service';
import type { VectorStorageService } from '@codequal/database';
import { Logger } from '../../../utils/logger';
import * as fs from 'fs';
import * as readline from 'readline';
import * as path from 'path';
import { execSync } from 'child_process';

// Logger implementation
const logger: Logger = {
  info: (msg: string, meta?: any) => console.log('[INFO]', msg, meta || ''),
  warn: (msg: string, meta?: any) => console.warn('[WARN]', msg, meta || ''),
  error: (msg: string, meta?: any) => console.error('[ERROR]', msg, meta || ''),
  debug: (msg: string, meta?: any) => console.debug('[DEBUG]', msg, meta || '')
} as Logger;

// Test repositories configuration
interface TestRepo {
  name: string;
  path: string;
  description: string;
  expectedTools: string[];
  knownIssues?: {
    vulnerabilities?: boolean;
    licenses?: string[];
    circularDeps?: boolean;
    outdated?: boolean;
  };
}

const TEST_REPOSITORIES: TestRepo[] = [
  {
    name: 'CodeQual MCP-Hybrid',
    path: path.join(__dirname, '../../../../../mcp-hybrid'),
    description: 'MCP Hybrid package with multiple adapters',
    expectedTools: ['npm-audit', 'license-checker', 'madge', 'dependency-cruiser', 'npm-outdated'],
    knownIssues: {
      licenses: ['MIT', 'ISC', 'Apache-2.0'],
      outdated: true
    }
  },
  {
    name: 'CodeQual Core',
    path: path.join(__dirname, '../../../../../core'),
    description: 'Core package with TypeScript',
    expectedTools: ['npm-audit', 'license-checker', 'madge', 'dependency-cruiser', 'npm-outdated'],
    knownIssues: {
      licenses: ['MIT', 'ISC'],
      circularDeps: false
    }
  },
  {
    name: 'CodeQual Root',
    path: path.join(__dirname, '../../../../../../'),
    description: 'Monorepo root with all packages',
    expectedTools: ['npm-audit', 'license-checker', 'madge', 'dependency-cruiser', 'npm-outdated'],
    knownIssues: {
      licenses: ['MIT', 'ISC', 'Apache-2.0', 'BSD-3-Clause'],
      outdated: true
    }
  }
];

// External repositories for broader testing
const EXTERNAL_REPOSITORIES: TestRepo[] = [
  {
    name: 'Express.js',
    path: '/tmp/test-repos/express',
    description: 'Popular Node.js web framework',
    expectedTools: ['npm-audit', 'license-checker', 'madge', 'dependency-cruiser', 'npm-outdated'],
    knownIssues: {
      licenses: ['MIT'],
      circularDeps: false
    }
  },
  {
    name: 'React',
    path: '/tmp/test-repos/react',
    description: 'Facebook React library',
    expectedTools: ['npm-audit', 'license-checker', 'madge', 'dependency-cruiser', 'npm-outdated'],
    knownIssues: {
      licenses: ['MIT'],
      circularDeps: false
    }
  }
];

// Output formatter
class TestReporter {
  private outputDir: string;
  
  constructor() {
    this.outputDir = path.join(__dirname, 'test-results', new Date().toISOString().split('T')[0]);
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }
  
  saveToolResult(repoName: string, toolId: string, result: any) {
    const filename = `${repoName.replace(/[^a-z0-9]/gi, '-')}_${toolId}.json`;
    const filepath = path.join(this.outputDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(result, null, 2));
    console.log(`   📄 Saved to: ${filepath}`);
  }
  
  generateSummary(results: Map<string, any>) {
    const summary = {
      timestamp: new Date().toISOString(),
      totalRepos: results.size,
      results: Array.from(results.entries()).map(([repo, data]) => ({
        repository: repo,
        tools: Object.entries(data).map(([toolId, result]: [string, any]) => ({
          tool: toolId,
          success: result.success,
          executionTime: result.executionTime,
          key_findings: this.extractKeyFindings(toolId, result)
        }))
      }))
    };
    
    const summaryPath = path.join(this.outputDir, 'test-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`\n📊 Test summary saved to: ${summaryPath}`);
    
    return summary;
  }
  
  private extractKeyFindings(toolId: string, result: any): any {
    if (!result.success || !result.output) return null;
    
    switch (toolId) {
      case 'npm-audit':
        return {
          total: result.metadata?.totalVulnerabilities || 0,
          critical: result.metadata?.vulnerabilities?.critical || 0,
          high: result.metadata?.vulnerabilities?.high || 0
        };
      
      case 'license-checker':
        return {
          total: result.output.totalPackages || 0,
          risky: result.output.riskyLicenses?.length || 0,
          unknown: result.output.unknownLicenses?.length || 0
        };
      
      case 'madge':
        return {
          circular: result.output.circular?.length || 0,
          orphans: result.output.orphans?.length || 0,
          totalModules: result.metadata?.moduleCount || 0
        };
      
      case 'dependency-cruiser':
        return {
          violations: result.output.violations?.length || 0,
          errors: result.output.errors?.length || 0,
          warnings: result.output.warnings?.length || 0
        };
      
      case 'npm-outdated':
        return {
          outdated: result.output.outdatedCount || 0,
          major: result.metadata?.majorUpdates || 0,
          minor: result.metadata?.minorUpdates || 0
        };
      
      default:
        return null;
    }
  }
}

// Phase 1: Local Tool Testing
async function runPhase1(repos: TestRepo[] = TEST_REPOSITORIES) {
  console.log('\n' + '='.repeat(80));
  console.log('PHASE 1: Local Tool Testing');
  console.log('='.repeat(80));
  
  const toolRunner = new ToolRunnerService(logger);
  const reporter = new TestReporter();
  const results = new Map<string, any>();
  
  for (const repo of repos) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📦 Testing: ${repo.name}`);
    console.log(`📍 Path: ${repo.path}`);
    console.log(`📝 Description: ${repo.description}`);
    console.log('─'.repeat(60));
    
    // Check if repo exists
    if (!fs.existsSync(repo.path)) {
      console.log(`⚠️  Repository path does not exist: ${repo.path}`);
      continue;
    }
    
    // Check for package.json
    const packageJsonPath = path.join(repo.path, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      console.log(`⚠️  No package.json found in: ${repo.path}`);
      continue;
    }
    
    try {
      // Run tools
      console.log('\n🔧 Running tools...');
      const startTime = Date.now();
      
      const toolResults = await toolRunner.runTools({
        repositoryPath: repo.path,
        enabledTools: repo.expectedTools,
        timeout: 120000 // 2 minutes per repo
      });
      
      const totalTime = Date.now() - startTime;
      console.log(`⏱️  Total execution time: ${totalTime}ms`);
      
      // Store results
      results.set(repo.name, toolResults);
      
      // Display and save results
      console.log('\n📊 Results:');
      for (const [toolId, result] of Object.entries(toolResults)) {
        console.log(`\n🔸 ${toolId.toUpperCase()}:`);
        
        if (result.success) {
          console.log(`   ✅ Success (${result.executionTime}ms)`);
          
          // Display key findings
          const findings = reporter['extractKeyFindings'](toolId, result);
          if (findings) {
            console.log(`   📈 Key findings:`, findings);
          }
          
          // Save full result
          reporter.saveToolResult(repo.name, toolId, result);
          
          // Interactive review prompt
          if (process.stdout.isTTY) {
            console.log(`   💡 Review the full output in the saved file`);
          }
        } else {
          console.log(`   ❌ Failed: ${result.error}`);
          reporter.saveToolResult(repo.name, toolId, result);
        }
      }
      
      // Compare with known issues
      if (repo.knownIssues) {
        console.log('\n🔍 Validation against known issues:');
        
        if (repo.knownIssues.vulnerabilities !== undefined) {
          const auditResult = toolResults['npm-audit'];
          const hasVulns = auditResult?.metadata?.totalVulnerabilities > 0;
          console.log(`   - Vulnerabilities: ${hasVulns ? '⚠️ Found' : '✅ None'} (expected: ${repo.knownIssues.vulnerabilities ? 'Yes' : 'No'})`);
        }
        
        if (repo.knownIssues.circularDeps !== undefined) {
          const madgeResult = toolResults['madge'];
          const hasCircular = madgeResult?.output?.circular?.length > 0;
          console.log(`   - Circular deps: ${hasCircular ? '⚠️ Found' : '✅ None'} (expected: ${repo.knownIssues.circularDeps ? 'Yes' : 'No'})`);
        }
      }
      
    } catch (error) {
      console.error(`\n❌ Error testing ${repo.name}:`, error);
      results.set(repo.name, { error: error instanceof Error ? error.message : String(error) });
    }
  }
  
  // Generate summary
  reporter.generateSummary(results);
  
  return results;
}

// Phase 2: Docker Testing
async function runPhase2() {
  console.log('\n' + '='.repeat(80));
  console.log('PHASE 2: Docker Container Testing');
  console.log('='.repeat(80));
  
  const dockerfilePath = path.join(__dirname, '../docker/Dockerfile');
  
  // Check if Docker is available
  try {
    execSync('docker --version', { stdio: 'pipe' });
  } catch (error) {
    console.log('❌ Docker is not installed or not running');
    return false;
  }
  
  console.log('\n🐳 Building Docker image...');
  
  try {
    // Build the image
    const buildCmd = `docker build -t deepwiki-tools-test:latest -f ${dockerfilePath} ${path.dirname(dockerfilePath)}`;
    console.log(`   Running: ${buildCmd}`);
    execSync(buildCmd, { stdio: 'inherit' });
    
    console.log('\n✅ Docker image built successfully');
    
    // Test with a sample repository
    const testRepo = TEST_REPOSITORIES[0];
    console.log(`\n🧪 Testing tools in container with: ${testRepo.name}`);
    
    const runCmd = `docker run --rm -v "${testRepo.path}:/workspace/test-repo" deepwiki-tools-test:latest node /tools/tool-executor.js /workspace/test-repo`;
    console.log(`   Running: ${runCmd}`);
    
    const output = execSync(runCmd, { encoding: 'utf-8' });
    console.log('\n📄 Container output:');
    console.log(output);
    
    return true;
    
  } catch (error) {
    console.error('❌ Docker test failed:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

// Phase 3: Integration Testing
async function runPhase3() {
  console.log('\n' + '='.repeat(80));
  console.log('PHASE 3: Integration Testing');
  console.log('='.repeat(80));
  
  // Check for Supabase credentials
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.log('⚠️  Supabase credentials not configured');
    console.log('   Set SUPABASE_URL and SUPABASE_ANON_KEY to test Vector DB integration');
    return false;
  }
  
  const toolRunner = new ToolRunnerService(logger);
  const vectorStorage = new VectorStorageService();
  const mockEmbeddingService = {
    generateEmbedding: async (text: string) => {
      return new Array(1536).fill(0).map(() => Math.random());
    }
  };
  const toolStorage = new ToolResultStorageService(vectorStorage, mockEmbeddingService);
  
  const testRepo = TEST_REPOSITORIES[0];
  
  try {
    console.log(`\n🧪 Testing full integration with: ${testRepo.name}`);
    
    // 1. Run tools
    console.log('\n1️⃣ Running tools...');
    const results = await toolRunner.runTools({
      repositoryPath: testRepo.path,
      enabledTools: testRepo.expectedTools
    });
    
    const successCount = Object.values(results).filter((r: any) => r.success).length;
    console.log(`   ✅ ${successCount}/${testRepo.expectedTools.length} tools succeeded`);
    
    // 2. Store in Vector DB
    console.log('\n2️⃣ Storing results in Vector DB...');
    const repoId = `integration-test-${Date.now()}`;
    
    await toolStorage.storeToolResults(repoId, results as any, {
      scheduledRun: false
    });
    
    console.log('   ✅ Results stored successfully');
    
    // 3. Verify retrieval
    console.log('\n3️⃣ Verifying Vector DB retrieval...');
    const chunks = await vectorStorage.getChunksBySource(
      'tool',
      repoId,
      repoId
    );
    
    console.log(`   ✅ Retrieved ${chunks.length} chunks`);
    console.log(`   📊 Chunk types:`);
    
    const toolCounts = chunks.reduce((acc: Record<string, number>, chunk: any) => {
      const toolName = chunk.metadata?.tool_name || 'unknown';
      acc[toolName] = (acc[toolName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(toolCounts).forEach(([tool, count]) => {
      console.log(`      - ${tool}: ${count} chunks`);
    });
    
    return true;
    
  } catch (error) {
    console.error('❌ Integration test failed:', error);
    return false;
  }
}

// Interactive test runner
async function runInteractiveTests() {
  console.log('\n🚀 DeepWiki Tool Integration Testing Suite');
  console.log('==========================================\n');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const question = (query: string): Promise<string> => {
    return new Promise(resolve => rl.question(query, resolve));
  };
  
  try {
    // Phase 1
    const runPhase1Choice = await question('\n📋 Run Phase 1 (Local Tool Testing)? [Y/n]: ');
    if (runPhase1Choice.toLowerCase() !== 'n') {
      const results = await runPhase1();
      
      const reviewChoice = await question('\n🔍 Review individual tool outputs? [y/N]: ');
      if (reviewChoice.toLowerCase() === 'y') {
        console.log(`\n📂 Tool outputs saved in: ${path.join(__dirname, 'test-results')}`);
        console.log('   Open the JSON files to review detailed findings');
      }
    }
    
    // Phase 2
    const runPhase2Choice = await question('\n📋 Run Phase 2 (Docker Testing)? [Y/n]: ');
    if (runPhase2Choice.toLowerCase() !== 'n') {
      await runPhase2();
    }
    
    // Phase 3
    const runPhase3Choice = await question('\n📋 Run Phase 3 (Integration Testing)? [Y/n]: ');
    if (runPhase3Choice.toLowerCase() !== 'n') {
      await runPhase3();
    }
    
    console.log('\n✅ Testing complete!');
    
  } finally {
    rl.close();
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--phase1')) {
    await runPhase1();
  } else if (args.includes('--phase2')) {
    await runPhase2();
  } else if (args.includes('--phase3')) {
    await runPhase3();
  } else if (args.includes('--all')) {
    await runPhase1();
    await runPhase2();
    await runPhase3();
  } else {
    // Interactive mode
    await runInteractiveTests();
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runPhase1, runPhase2, runPhase3 };
