#!/usr/bin/env node

/**
 * Simple tool test - runs tools directly without TypeScript compilation
 */

const path = require('path');
const { execSync } = require('child_process');

// Change to the correct directory
const scriptDir = __dirname;
const projectRoot = path.join(scriptDir, '../../../../../..');

// Set up paths
process.env.NODE_PATH = path.join(projectRoot, 'node_modules');
require('module').Module._initPaths();

console.log('🧪 Simple Tool Test Runner');
console.log('=========================\n');

// Test repository paths
const testRepos = {
  'MCP-Hybrid': path.join(projectRoot, 'packages/mcp-hybrid'),
  'Core': path.join(projectRoot, 'packages/core'),
  'Root': projectRoot
};

// Tools to test
const tools = [
  'npm-audit',
  'license-checker',
  'madge',
  'dependency-cruiser',
  'npm-outdated'
];

// Run a simple test for each tool
async function runSimpleTests() {
  for (const [repoName, repoPath] of Object.entries(testRepos)) {
    console.log(`\n📦 Testing ${repoName} at: ${repoPath}`);
    console.log('─'.repeat(60));
    
    // Check if package.json exists
    const packageJsonPath = path.join(repoPath, 'package.json');
    const fs = require('fs');
    
    if (!fs.existsSync(packageJsonPath)) {
      console.log('⚠️  No package.json found, skipping...');
      continue;
    }
    
    // Run each tool
    for (const tool of tools) {
      console.log(`\n🔧 ${tool}:`);
      
      try {
        let output;
        const cwd = repoPath;
        
        switch (tool) {
          case 'npm-audit':
            // Check if package-lock.json exists
            if (!fs.existsSync(path.join(repoPath, 'package-lock.json'))) {
              console.log('   ⚠️  No package-lock.json found');
              continue;
            }
            output = execSync('npm audit --json 2>/dev/null || true', { cwd, encoding: 'utf-8' });
            const audit = JSON.parse(output || '{}');
            console.log(`   Total vulnerabilities: ${audit.metadata?.vulnerabilities?.total || 0}`);
            if (audit.metadata?.vulnerabilities) {
              const vulns = audit.metadata.vulnerabilities;
              console.log(`   - Critical: ${vulns.critical || 0}`);
              console.log(`   - High: ${vulns.high || 0}`);
              console.log(`   - Moderate: ${vulns.moderate || 0}`);
              console.log(`   - Low: ${vulns.low || 0}`);
            }
            break;
            
          case 'license-checker':
            // Simple check - just count packages
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
            const deps = Object.keys(packageJson.dependencies || {});
            const devDeps = Object.keys(packageJson.devDependencies || {});
            console.log(`   Total dependencies: ${deps.length + devDeps.length}`);
            console.log(`   - Runtime: ${deps.length}`);
            console.log(`   - Development: ${devDeps.length}`);
            break;
            
          case 'madge':
            // Check if madge is available
            try {
              execSync('which madge', { stdio: 'pipe' });
              output = execSync(`madge --circular ${repoPath} 2>/dev/null || echo "[]"`, { encoding: 'utf-8' });
              const circular = JSON.parse(output.trim() || '[]');
              console.log(`   Circular dependencies: ${Array.isArray(circular) ? circular.length : 0}`);
            } catch (e) {
              console.log('   ⚠️  Madge not installed globally');
            }
            break;
            
          case 'dependency-cruiser':
            // Just check if .dependency-cruiser.js exists
            const cruiserConfig = path.join(repoPath, '.dependency-cruiser.js');
            console.log(`   Config exists: ${fs.existsSync(cruiserConfig) ? 'Yes' : 'No'}`);
            break;
            
          case 'npm-outdated':
            try {
              output = execSync('npm outdated --json 2>/dev/null || echo "{}"', { cwd, encoding: 'utf-8' });
              const outdated = JSON.parse(output || '{}');
              const count = Object.keys(outdated).length;
              console.log(`   Outdated packages: ${count}`);
              if (count > 0 && count <= 5) {
                Object.entries(outdated).slice(0, 5).forEach(([pkg, info]) => {
                  console.log(`   - ${pkg}: ${info.current} → ${info.latest}`);
                });
              }
            } catch (e) {
              console.log('   ✅ All packages up to date');
            }
            break;
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
  }
}

// Run the tests
console.log('Running simple tool tests...\n');
runSimpleTests().then(() => {
  console.log('\n✅ Simple tests completed!');
  console.log('\nThese are basic checks. For full testing, use the phased testing framework.');
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
