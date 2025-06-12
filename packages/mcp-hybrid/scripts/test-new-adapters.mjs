#!/usr/bin/env node

/**
 * Manual test script for new MCP Direct adapters
 * Tests NPM Audit, License Checker, and Madge with real repositories
 */

import { NpmAuditDirectAdapter } from '../src/adapters/direct/npm-audit-direct.js';
import { LicenseCheckerDirectAdapter } from '../src/adapters/direct/license-checker-direct.js';
import { MadgeDirectAdapter } from '../src/adapters/direct/madge-direct.js';
// Import types from core interfaces instead of adapter types
import * as fs from 'fs-extra';
import * as path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test repositories to clone
const TEST_REPOS = {
  vulnerable: {
    url: 'https://github.com/advisories/npm-audit-test',
    name: 'npm-audit-test',
    description: 'Repository with known vulnerabilities'
  },
  gpl: {
    url: 'https://github.com/tiangolo/fastapi',  // Has GPL dependencies
    name: 'fastapi',
    description: 'Repository with GPL/LGPL dependencies'
  },
  circular: {
    url: 'https://github.com/nodejs/node',  // Complex repo likely to have circular deps
    name: 'node',
    description: 'Repository with potential circular dependencies'
  }
};

const TEMP_DIR = path.join(__dirname, '..', 'temp-test-repos');

async function cloneRepo(repoInfo: typeof TEST_REPOS.vulnerable, targetDir: string) {
  console.log(`\n📦 Cloning ${repoInfo.name}...`);
  
  if (await fs.pathExists(targetDir)) {
    console.log(`  Repository already exists, using existing clone`);
    return;
  }
  
  try {
    execSync(`git clone --depth 1 ${repoInfo.url} ${targetDir}`, { stdio: 'inherit' });
    console.log(`  ✅ Cloned successfully`);
  } catch (error) {
    console.error(`  ❌ Failed to clone: ${error}`);
    throw error;
  }
}

async function runAdapter(
  adapter: any,
  repoPath: string,
  repoName: string
): Promise<void> {
  // Create analysis context for the adapter
  const context = {
    agentRole: adapter.getMetadata().supportedRoles[0], // Use first supported role
    repository: {
      url: `https://github.com/test/${repoName}`,
      languages: ['javascript', 'typescript'],
      framework: 'node'
    },
    pr: {
      url: `https://github.com/test/${repoName}/pull/1`,
      files: [],
      baseBranch: 'main',
      targetBranch: 'feature/test',
      title: 'Test PR',
      description: 'Testing MCP Direct adapters',
      author: 'test-user'
    },
    config: {
      maxFiles: 1000,
      timeout: 60000
    }
  };

  console.log(`\n🔍 Running ${adapter.constructor.name}...`);
  
  try {
    const startTime = Date.now();
    const result = await adapter.analyze(context);
    const duration = Date.now() - startTime;
    
    console.log(`  ⏱️  Execution time: ${duration}ms`);
    console.log(`  📊 Status: ${result.status}`);
    console.log(`  📝 Findings: ${result.findings.length}`);
    
    if (result.metadata) {
      console.log(`  📈 Metadata:`, JSON.stringify(result.metadata, null, 2));
    }
    
    // Show first few findings
    if (result.findings.length > 0) {
      console.log(`\n  First few findings:`);
      result.findings.slice(0, 3).forEach((finding, i) => {
        console.log(`    ${i + 1}. [${finding.severity}] ${finding.message.substring(0, 100)}...`);
        if (finding.file) {
          console.log(`       File: ${finding.file}`);
        }
      });
      
      if (result.findings.length > 3) {
        console.log(`    ... and ${result.findings.length - 3} more findings`);
      }
    }
    
    // Save full results to file
    const resultsDir = path.join(__dirname, '..', 'test-results');
    await fs.ensureDir(resultsDir);
    
    const resultFile = path.join(resultsDir, `${repoName}-${adapter.constructor.name.toLowerCase()}-results.json`);
    await fs.writeJSON(resultFile, result, { spaces: 2 });
    console.log(`\n  💾 Full results saved to: ${path.relative(process.cwd(), resultFile)}`);
    
  } catch (error) {
    console.error(`  ❌ Error: ${error}`);
  }
}

async function testNpmAudit() {
  console.log('\n🛡️  TESTING NPM AUDIT DIRECT');
  console.log('================================');
  
  const adapter = new NpmAuditDirectAdapter();
  
  // Test with a simple repo that has package.json
  const testRepo = path.join(TEMP_DIR, 'npm-audit-test');
  await fs.ensureDir(testRepo);
  
  // Create a test package.json with known vulnerable dependencies
  const packageJson = {
    name: 'vulnerability-test',
    version: '1.0.0',
    dependencies: {
      'lodash': '4.17.11',      // Known prototype pollution
      'minimist': '0.0.8',      // Known vulnerabilities
      'express': '4.16.0',      // Multiple vulnerabilities
      'jquery': '2.2.4',        // XSS vulnerabilities
      'bootstrap': '3.3.7'      // XSS vulnerabilities
    }
  };
  
  await fs.writeJSON(path.join(testRepo, 'package.json'), packageJson, { spaces: 2 });
  
  console.log('\n📦 Installing vulnerable dependencies...');
  try {
    execSync('npm install', { cwd: testRepo, stdio: 'pipe' });
  } catch (error) {
    // npm install might fail due to vulnerabilities, but that's expected
  }
  
  await runAdapter(adapter, testRepo, 'npm-audit-test');
}

async function testLicenseChecker() {
  console.log('\n⚖️  TESTING LICENSE CHECKER DIRECT');
  console.log('===================================');
  
  const adapter = new LicenseCheckerDirectAdapter();
  
  // Test with Express.js repo (has many dependencies)
  const expressRepo = path.join(TEMP_DIR, 'express');
  
  if (!await fs.pathExists(expressRepo)) {
    console.log('\n📦 Cloning Express.js repository...');
    execSync('git clone --depth 1 https://github.com/expressjs/express.git ' + expressRepo, { stdio: 'inherit' });
    
    console.log('\n📦 Installing dependencies...');
    execSync('npm install', { cwd: expressRepo, stdio: 'pipe' });
  }
  
  await runAdapter(adapter, expressRepo, 'express');
}

async function testMadge() {
  console.log('\n🔄 TESTING MADGE DIRECT');
  console.log('========================');
  
  const adapter = new MadgeDirectAdapter();
  
  // Create a test repo with circular dependencies
  const circularRepo = path.join(TEMP_DIR, 'circular-test');
  await fs.ensureDir(circularRepo);
  await fs.ensureDir(path.join(circularRepo, 'src'));
  
  // Create files with intentional circular dependencies
  const fileA = `
const { functionB } = require('./fileB');

function functionA() {
  return functionB() + ' from A';
}

module.exports = { functionA };
`;

  const fileB = `
const { functionC } = require('./fileC');

function functionB() {
  return functionC() + ' from B';
}

module.exports = { functionB };
`;

  const fileC = `
const { functionA } = require('./fileA');

function functionC() {
  return 'C';
}

function functionD() {
  return functionA() + ' from C';
}

module.exports = { functionC, functionD };
`;

  await fs.writeFile(path.join(circularRepo, 'src', 'fileA.js'), fileA);
  await fs.writeFile(path.join(circularRepo, 'src', 'fileB.js'), fileB);
  await fs.writeFile(path.join(circularRepo, 'src', 'fileC.js'), fileC);
  
  await fs.writeJSON(path.join(circularRepo, 'package.json'), {
    name: 'circular-test',
    version: '1.0.0'
  });
  
  await runAdapter(adapter, circularRepo, 'circular-test');
  
  // Also test with a real complex repo
  console.log('\n🔄 Testing with a real repository (webpack)...');
  const webpackRepo = path.join(TEMP_DIR, 'webpack');
  
  if (!await fs.pathExists(webpackRepo)) {
    console.log('\n📦 Cloning webpack repository...');
    execSync('git clone --depth 1 https://github.com/webpack/webpack.git ' + webpackRepo, { stdio: 'inherit' });
  }
  
  await runAdapter(adapter, webpackRepo, 'webpack');
}

async function main() {
  console.log('🧪 MCP Direct Adapters Manual Test Suite');
  console.log('========================================\n');
  
  // Ensure temp directory exists
  await fs.ensureDir(TEMP_DIR);
  
  try {
    // Test each adapter
    await testNpmAudit();
    await testLicenseChecker();
    await testMadge();
    
    console.log('\n\n✅ All tests completed!');
    console.log(`📁 Results saved in: ${path.join(__dirname, '..', 'test-results')}`);
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Clean up function
async function cleanup() {
  console.log('\n🧹 Cleaning up test repositories...');
  try {
    await fs.remove(TEMP_DIR);
    console.log('✅ Cleanup complete');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

// Handle cleanup on exit
process.on('SIGINT', async () => {
  await cleanup();
  process.exit(0);
});

// Run the tests
main().catch(console.error);
