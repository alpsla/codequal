#!/usr/bin/env npx ts-node
/**
 * Test script to verify JavaSecurityAgent and CppSecurityAgent work correctly
 */

import { JavaSecurityAgent } from './agents/JavaSecurityAgent';
import { CppSecurityAgent } from './agents/CppSecurityAgent';
import * as path from 'path';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testJavaAgent() {
  log('\n🔧 Testing JavaSecurityAgent\n', colors.cyan);
  
  const agent = new JavaSecurityAgent();
  const testPath = '/tmp/mock-java-project';
  
  // Test isApplicable
  log('Testing isApplicable...', colors.gray);
  const isApplicable = await agent.isApplicable(testPath);
  log(`  isApplicable: ${isApplicable}`, isApplicable ? colors.green : colors.yellow);
  
  // Test analyze
  log('\nTesting analyze with mock tools...', colors.gray);
  try {
    const result = await agent.analyze({
      targetPath: testPath,
      language: 'java',
      context: { branch: 'main' }
    });
    
    log(`  ✅ Analysis completed`, colors.green);
    log(`  Issues found: ${result.issues.length}`, colors.blue);
    log(`  Tools executed: ${result.metadata.toolsExecuted.join(', ')}`, colors.blue);
    
    // Show sample issues
    if (result.issues.length > 0) {
      log('\n  Sample issues:', colors.gray);
      result.issues.slice(0, 3).forEach(issue => {
        log(`    • [${issue.severity}] ${issue.message} (${issue.file}:${issue.line})`, colors.gray);
      });
    }
  } catch (error) {
    log(`  ❌ Analysis failed: ${error.message}`, colors.red);
  }
}

async function testCppAgent() {
  log('\n🔧 Testing CppSecurityAgent\n', colors.cyan);
  
  const agent = new CppSecurityAgent();
  const testPath = '/tmp/mock-cpp-project';
  
  // Test isApplicable
  log('Testing isApplicable...', colors.gray);
  const isApplicable = await agent.isApplicable(testPath);
  log(`  isApplicable: ${isApplicable}`, isApplicable ? colors.green : colors.yellow);
  
  // Test analyze
  log('\nTesting analyze with mock tools...', colors.gray);
  try {
    const result = await agent.analyze({
      targetPath: testPath,
      language: 'cpp',
      context: { branch: 'main' }
    });
    
    log(`  ✅ Analysis completed`, colors.green);
    log(`  Issues found: ${result.issues.length}`, colors.blue);
    log(`  Tools executed: ${result.metadata.toolsExecuted.join(', ')}`, colors.blue);
    
    // Show sample issues
    if (result.issues.length > 0) {
      log('\n  Sample issues:', colors.gray);
      result.issues.slice(0, 3).forEach(issue => {
        log(`    • [${issue.severity}] ${issue.message} (${issue.file}:${issue.line})`, colors.gray);
      });
    }
  } catch (error) {
    log(`  ❌ Analysis failed: ${error.message}`, colors.red);
  }
}

async function main() {
  log('=' .repeat(60), colors.cyan);
  log('Language-Specific Security Agents Test', colors.cyan);
  log('=' .repeat(60), colors.cyan);
  
  await testJavaAgent();
  await testCppAgent();
  
  log('\n' + '=' .repeat(60), colors.cyan);
  log('✨ Test Complete!', colors.green);
  log('=' .repeat(60), colors.cyan);
}

// Run the test
main().catch(console.error);