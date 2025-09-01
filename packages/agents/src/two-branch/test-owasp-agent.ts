#!/usr/bin/env npx ts-node
/**
 * Test script for OWASP Dependency Check Agent
 */

import { OWASPDependencyCheckAgent } from './agents/OWASPDependencyCheckAgent';
import * as dotenv from 'dotenv';
import { performance } from 'perf_hooks';

// Load environment variables
dotenv.config({ path: '../../../.env' });

// Color codes for terminal output
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

async function testOWASPAgent() {
  log('\n═══════════════════════════════════════════════', colors.cyan);
  log('  Testing OWASP Dependency Check Agent (FULL MODE)', colors.cyan);
  log('═══════════════════════════════════════════════\n', colors.cyan);
  
  const agent = new OWASPDependencyCheckAgent();
  
  // Test with a JavaScript project (current directory has package.json)
  const testPath = '/Users/alpinro/Code Prjects/codequal/packages/agents';
  
  log('📊 Testing with path: ' + testPath, colors.blue);
  log('   Language: JavaScript/TypeScript\n', colors.gray);
  
  const startTime = performance.now();
  
  try {
    const result = await agent.analyze({
      targetPath: testPath,
      language: 'javascript'
    });
    
    const duration = Math.round(performance.now() - startTime);
    
    log(`✅ Analysis completed in ${duration}ms`, colors.green);
    log(`   Tools executed: ${result.tools.join(', ')}`, colors.gray);
    log(`   Issues found: ${result.summary.total}`, colors.gray);
    
    if (result.summary.total > 0) {
      log('\n   Issue breakdown:', colors.gray);
      log(`   - Critical: ${result.summary.critical || 0}`, colors.gray);
      log(`   - High: ${result.summary.high || 0}`, colors.gray);
      log(`   - Medium: ${result.summary.medium || 0}`, colors.gray);
      log(`   - Low: ${result.summary.low || 0}`, colors.gray);
      
      if ((result.summary as any).topPackages?.length > 0) {
        log('\n   Top packages with issues:', colors.gray);
        (result.summary as any).topPackages.forEach((pkg: string) => {
          log(`   - ${pkg}`, colors.gray);
        });
      }
    }
    
    // Show sample issues
    if (result.issues.length > 0) {
      log('\n📋 Sample issues (first 3):', colors.blue);
      result.issues.slice(0, 3).forEach((issue: any, index: number) => {
        log(`\n   ${index + 1}. ${issue.type}`, colors.gray);
        log(`      Severity: ${issue.severity}`, colors.gray);
        log(`      Package: ${issue.package}`, colors.gray);
        if (issue.vulnerability) {
          log(`      CVE: ${issue.vulnerability}`, colors.gray);
        }
        if (issue.cvssScore) {
          log(`      CVSS Score: ${issue.cvssScore}`, colors.gray);
        }
        if (issue.description) {
          log(`      Description: ${issue.description.substring(0, 100)}...`, colors.gray);
        }
      });
    }
    
    // Check if using mock data
    if (result.metadata?.toolsFailed?.length > 0) {
      log('\n⚠️  Note: OWASP Dependency Check not installed', colors.yellow);
      log('   Using mock data for testing', colors.gray);
      log('\n   To install OWASP Dependency Check:', colors.gray);
      log('   brew install dependency-check', colors.gray);
      log('   or download from: https://owasp.org/www-project-dependency-check/', colors.gray);
    }
    
    return { success: true, duration, issueCount: result.summary.total };
    
  } catch (error: any) {
    log(`❌ Analysis failed: ${error.message}`, colors.red);
    return { success: false, error: error.message };
  }
}

// Run test
async function main() {
  console.clear();
  log(`
╔══════════════════════════════════════════════════════════╗
║     OWASP Dependency Check Agent Test                     ║
║     Enterprise-grade Vulnerability Scanning               ║
╚══════════════════════════════════════════════════════════╝
`, colors.cyan);
  
  const result = await testOWASPAgent();
  
  log('\n═══════════════════════════════════════════════', colors.cyan);
  log('  Test Results', colors.cyan);
  log('═══════════════════════════════════════════════\n', colors.cyan);
  
  if (result.success) {
    log('✅ OWASP Agent: WORKING', colors.green);
    log(`   Execution time: ${result.duration}ms`, colors.gray);
    log(`   Issues found: ${result.issueCount}`, colors.gray);
  } else {
    log('❌ OWASP Agent: FAILED', colors.red);
    log(`   Error: ${result.error}`, colors.gray);
  }
  
  log('\n✨ Test complete!\n', colors.green);
}

// Handle errors
process.on('unhandledRejection', (error: any) => {
  log(`\n❌ Unhandled error: ${error.message}`, colors.red);
  process.exit(1);
});

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    log(`\n❌ Fatal error: ${error.message}`, colors.red);
    process.exit(1);
  });
}

export { testOWASPAgent };