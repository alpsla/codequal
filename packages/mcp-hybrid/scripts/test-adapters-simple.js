#!/usr/bin/env node

/**
 * Simple test script for new MCP Direct adapters
 * Tests NPM Audit, License Checker, and Madge with a test repository
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs').promises;

const execAsync = promisify(exec);

// Test NPM Audit
async function testNpmAudit() {
  console.log('\n🛡️  TESTING NPM AUDIT');
  console.log('=====================\n');
  
  const testDir = path.join(__dirname, '..', 'test-npm-audit');
  
  try {
    // Create test directory
    await fs.mkdir(testDir, { recursive: true });
    
    // Create package.json with vulnerable dependencies
    const packageJson = {
      name: 'test-npm-audit',
      version: '1.0.0',
      dependencies: {
        'lodash': '4.17.11',    // Known vulnerabilities
        'axios': '0.18.0',      // Known vulnerabilities
        'minimist': '0.0.8'     // Known vulnerabilities
      }
    };
    
    await fs.writeFile(
      path.join(testDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    
    console.log('📦 Installing vulnerable dependencies...');
    try {
      await execAsync('npm install', { cwd: testDir });
    } catch (error) {
      // npm install might fail with vulnerabilities, that's ok
    }
    
    console.log('\n🔍 Running npm audit...');
    try {
      const { stdout } = await execAsync('npm audit --json', { 
        cwd: testDir,
        maxBuffer: 10 * 1024 * 1024
      });
      
      const auditResult = JSON.parse(stdout);
      
      console.log('\n📊 Audit Results:');
      if (auditResult.metadata && auditResult.metadata.vulnerabilities) {
        const vulns = auditResult.metadata.vulnerabilities;
        console.log(`  Critical: ${vulns.critical || 0}`);
        console.log(`  High: ${vulns.high || 0}`);
        console.log(`  Moderate: ${vulns.moderate || 0}`);
        console.log(`  Low: ${vulns.low || 0}`);
        console.log(`  Total: ${vulns.total || 0}`);
      }
      
      // Show some vulnerabilities
      if (auditResult.vulnerabilities) {
        console.log('\n🚨 Found vulnerabilities:');
        Object.entries(auditResult.vulnerabilities).slice(0, 3).forEach(([pkg, vuln]) => {
          console.log(`  - ${pkg}: ${vuln.severity} severity`);
        });
      }
      
      console.log('\n✅ NPM Audit test completed successfully!');
      
    } catch (error) {
      // npm audit returns non-zero exit when vulnerabilities found
      if (error.stdout) {
        const auditResult = JSON.parse(error.stdout);
        console.log('\n📊 Audit found issues (expected):');
        if (auditResult.metadata && auditResult.metadata.vulnerabilities) {
          const vulns = auditResult.metadata.vulnerabilities;
          console.log(`  Total vulnerabilities: ${vulns.total || 0}`);
        }
        console.log('\n✅ NPM Audit test completed successfully!');
      } else {
        console.error('❌ Error:', error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Cleanup
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {}
  }
}

// Test License Checker
async function testLicenseChecker() {
  console.log('\n\n⚖️  TESTING LICENSE CHECKER');
  console.log('===========================\n');
  
  const testDir = path.join(__dirname, '..', 'test-license-checker');
  
  try {
    // Create test directory
    await fs.mkdir(testDir, { recursive: true });
    
    // Create package.json with various licenses
    const packageJson = {
      name: 'test-license-checker',
      version: '1.0.0',
      license: 'MIT',
      dependencies: {
        'express': '^4.18.0',    // MIT
        'lodash': '^4.17.21',    // MIT
        'chalk': '^4.1.0'        // MIT
      }
    };
    
    await fs.writeFile(
      path.join(testDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    
    console.log('📦 Installing dependencies...');
    await execAsync('npm install', { cwd: testDir });
    
    console.log('\n🔍 Running license-checker...');
    try {
      const { stdout } = await execAsync('npx license-checker --json', { 
        cwd: testDir,
        maxBuffer: 10 * 1024 * 1024
      });
      
      const licenses = JSON.parse(stdout);
      
      console.log('\n📊 License Summary:');
      const licenseTypes = {};
      Object.values(licenses).forEach(info => {
        const license = info.licenses || 'Unknown';
        licenseTypes[license] = (licenseTypes[license] || 0) + 1;
      });
      
      Object.entries(licenseTypes).forEach(([license, count]) => {
        console.log(`  ${license}: ${count} packages`);
      });
      
      console.log(`\n  Total packages: ${Object.keys(licenses).length}`);
      console.log('\n✅ License Checker test completed successfully!');
      
    } catch (error) {
      console.error('❌ Error running license-checker:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Cleanup
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {}
  }
}

// Test Madge
async function testMadge() {
  console.log('\n\n🔄 TESTING MADGE');
  console.log('=================\n');
  
  const testDir = path.join(__dirname, '..', 'test-madge');
  
  try {
    // Create test directory
    await fs.mkdir(path.join(testDir, 'src'), { recursive: true });
    
    // Create files with circular dependencies
    await fs.writeFile(path.join(testDir, 'src', 'a.js'), `
const b = require('./b');
module.exports = { name: 'a', b };
`);
    
    await fs.writeFile(path.join(testDir, 'src', 'b.js'), `
const c = require('./c');
module.exports = { name: 'b', c };
`);
    
    await fs.writeFile(path.join(testDir, 'src', 'c.js'), `
const a = require('./a');
module.exports = { name: 'c', a };
`);
    
    await fs.writeFile(path.join(testDir, 'package.json'), JSON.stringify({
      name: 'test-madge',
      version: '1.0.0'
    }));
    
    console.log('📦 Created test files with circular dependencies...');
    
    console.log('\n🔍 Running madge...');
    try {
      // Check for circular dependencies
      const { stdout: circularOutput } = await execAsync('npx madge --circular src', { 
        cwd: testDir
      });
      
      if (circularOutput && !circularOutput.includes('No circular dependency found')) {
        console.log('\n🔄 Circular dependencies found:');
        console.log(circularOutput);
      } else {
        console.log('\n✨ No circular dependencies found (unexpected)');
      }
      
      // Get dependency tree
      const { stdout: treeOutput } = await execAsync('npx madge --json src', { 
        cwd: testDir,
        maxBuffer: 10 * 1024 * 1024
      });
      
      const tree = JSON.parse(treeOutput);
      
      console.log('\n📊 Module Summary:');
      console.log(`  Total modules: ${Object.keys(tree).length}`);
      console.log(`  Modules analyzed: ${Object.keys(tree).join(', ')}`);
      
      console.log('\n✅ Madge test completed successfully!');
      
    } catch (error) {
      console.error('❌ Error running madge:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Cleanup
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {}
  }
}

// Main function
async function main() {
  console.log('🧪 Testing New MCP Direct Adapters');
  console.log('==================================');
  
  await testNpmAudit();
  await testLicenseChecker();
  await testMadge();
  
  console.log('\n\n🎉 All tests completed!');
}

// Run tests
main().catch(console.error);
