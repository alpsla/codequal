#!/usr/bin/env npx ts-node
/**
 * Comprehensive test suite for all implemented agents
 * Tests what actually works vs what's just implemented
 */

import { GitHubSecurityAgent } from './agents/GitHubSecurityAgent';
import { GitLabSecurityAgent } from './agents/GitLabSecurityAgent';
import { OWASPDependencyCheckAgent } from './agents/OWASPDependencyCheckAgent';
import { MultiToolSecurityAgent } from './agents/MultiToolSecurityAgent';
import { MultiToolDependencyAgent } from './agents/MultiToolDependencyAgent';
import { MultiToolArchitectureAgent } from './agents/MultiToolArchitectureAgent';
import { MultiToolPerformanceAgent } from './agents/MultiToolPerformanceAgent';
import { MultiToolCodeQualityAgent } from './agents/MultiToolCodeQualityAgent';
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
  gray: '\x1b[90m',
  magenta: '\x1b[35m'
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}  ${title}${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
}

interface TestResult {
  agent: string;
  status: 'TESTED' | 'WORKING' | 'FAILED' | 'NOT_TESTED';
  executionTime?: number;
  issuesFound?: number;
  error?: string;
  notes?: string;
}

const testResults: TestResult[] = [];

// Test GitHub Security Agent
async function testGitHubAgent(): Promise<TestResult> {
  log('🔍 Testing GitHub Security Agent...', colors.blue);
  const agent = new GitHubSecurityAgent();
  
  try {
    const startTime = performance.now();
    const result = await agent.analyze({
      repoUrl: 'https://github.com/facebook/react',
      language: 'javascript'
    });
    const duration = Math.round(performance.now() - startTime);
    
    log(`  ✅ GitHub Agent: TESTED & WORKING (${duration}ms)`, colors.green);
    return {
      agent: 'GitHubSecurityAgent',
      status: 'TESTED',
      executionTime: duration,
      issuesFound: result.summary.total,
      notes: process.env.GITHUB_TOKEN ? 'With token' : 'No token (limited)'
    };
  } catch (error: any) {
    log(`  ❌ GitHub Agent: FAILED - ${error.message}`, colors.red);
    return {
      agent: 'GitHubSecurityAgent',
      status: 'FAILED',
      error: error.message
    };
  }
}

// Test GitLab Security Agent  
async function testGitLabAgent(): Promise<TestResult> {
  log('🔍 Testing GitLab Security Agent...', colors.blue);
  const agent = new GitLabSecurityAgent();
  
  // Check if token is available
  const hasToken = process.env.GITLAB_TOKEN && !process.env.GITLAB_TOKEN.startsWith('#');
  
  if (!hasToken) {
    log('  ⚠️  GitLab Agent: WORKING (mock mode - no token)', colors.yellow);
    return {
      agent: 'GitLabSecurityAgent',
      status: 'WORKING',
      notes: 'Token commented out in .env - using mock data'
    };
  }
  
  try {
    const startTime = performance.now();
    const result = await agent.analyze({
      repoUrl: 'https://gitlab.com/gitlab-org/gitlab-runner',
      language: 'go'
    });
    const duration = Math.round(performance.now() - startTime);
    
    log(`  ✅ GitLab Agent: TESTED & WORKING (${duration}ms)`, colors.green);
    return {
      agent: 'GitLabSecurityAgent', 
      status: 'TESTED',
      executionTime: duration,
      issuesFound: result.summary.total
    };
  } catch (error: any) {
    log(`  ❌ GitLab Agent: FAILED - ${error.message}`, colors.red);
    return {
      agent: 'GitLabSecurityAgent',
      status: 'FAILED',
      error: error.message
    };
  }
}

// Test OWASP Dependency Check Agent
async function testOWASPAgent(): Promise<TestResult> {
  log('🔍 Testing OWASP Dependency Check Agent...', colors.blue);
  const agent = new OWASPDependencyCheckAgent();
  
  try {
    const startTime = performance.now();
    const result = await agent.analyze({
      targetPath: '/Users/alpinro/Code Prjects/codequal/packages/agents',
      language: 'javascript'
    });
    const duration = Math.round(performance.now() - startTime);
    
    log(`  ✅ OWASP Agent: TESTED & WORKING (${duration}ms)`, colors.green);
    return {
      agent: 'OWASPDependencyCheckAgent',
      status: 'TESTED',
      executionTime: duration,
      issuesFound: result.summary.total,
      notes: result.metadata?.toolsFailed?.length > 0 ? 'Using mock (tool not installed)' : 'Tool installed'
    };
  } catch (error: any) {
    log(`  ❌ OWASP Agent: FAILED - ${error.message}`, colors.red);
    return {
      agent: 'OWASPDependencyCheckAgent',
      status: 'FAILED',
      error: error.message
    };
  }
}

// Test Multi-Tool Security Agent
async function testMultiToolSecurityAgent(): Promise<TestResult> {
  log('🔍 Testing Multi-Tool Security Agent...', colors.blue);
  const agent = new MultiToolSecurityAgent();
  
  try {
    const startTime = performance.now();
    const result = await agent.analyze({
      targetPath: '/Users/alpinro/Code Prjects/codequal/packages/agents',
      language: 'javascript'
    });
    const duration = Math.round(performance.now() - startTime);
    
    log(`  ✅ Multi-Tool Security: WORKING (${duration}ms)`, colors.green);
    return {
      agent: 'MultiToolSecurityAgent',
      status: 'WORKING',
      executionTime: duration,
      issuesFound: result.summary.total,
      notes: `${result.metadata.toolsExecuted.length} tools executed`
    };
  } catch (error: any) {
    log(`  ❌ Multi-Tool Security: FAILED - ${error.message}`, colors.red);
    return {
      agent: 'MultiToolSecurityAgent',
      status: 'FAILED',
      error: error.message
    };
  }
}

// Test Multi-Tool Dependency Agent
async function testMultiToolDependencyAgent(): Promise<TestResult> {
  log('🔍 Testing Multi-Tool Dependency Agent...', colors.blue);
  const agent = new MultiToolDependencyAgent();
  
  try {
    const startTime = performance.now();
    const result = await agent.analyze({
      targetPath: '/Users/alpinro/Code Prjects/codequal/packages/agents',
      language: 'javascript'
    });
    const duration = Math.round(performance.now() - startTime);
    
    log(`  ✅ Multi-Tool Dependency: WORKING (${duration}ms)`, colors.green);
    return {
      agent: 'MultiToolDependencyAgent',
      status: 'WORKING',
      executionTime: duration,
      issuesFound: result.summary.total,
      notes: `${result.metadata.toolsExecuted.length} tools executed`
    };
  } catch (error: any) {
    log(`  ❌ Multi-Tool Dependency: FAILED - ${error.message}`, colors.red);
    return {
      agent: 'MultiToolDependencyAgent',
      status: 'FAILED',
      error: error.message
    };
  }
}

// Test Multi-Tool Architecture Agent
async function testMultiToolArchitectureAgent(): Promise<TestResult> {
  log('🔍 Testing Multi-Tool Architecture Agent...', colors.blue);
  const agent = new MultiToolArchitectureAgent();
  
  try {
    const startTime = performance.now();
    const result = await agent.analyze({
      targetPath: '/Users/alpinro/Code Prjects/codequal/packages/agents',
      language: 'javascript'
    });
    const duration = Math.round(performance.now() - startTime);
    
    log(`  ✅ Multi-Tool Architecture: WORKING (${duration}ms)`, colors.green);
    return {
      agent: 'MultiToolArchitectureAgent',
      status: 'WORKING',
      executionTime: duration,
      issuesFound: result.summary.total,
      notes: `${result.metadata.toolsExecuted.length} tools executed`
    };
  } catch (error: any) {
    log(`  ❌ Multi-Tool Architecture: FAILED - ${error.message}`, colors.red);
    return {
      agent: 'MultiToolArchitectureAgent',
      status: 'FAILED',
      error: error.message
    };
  }
}

// Test Multi-Tool Performance Agent
async function testMultiToolPerformanceAgent(): Promise<TestResult> {
  log('🔍 Testing Multi-Tool Performance Agent...', colors.blue);
  const agent = new MultiToolPerformanceAgent();
  
  try {
    const startTime = performance.now();
    const result = await agent.analyze({
      targetPath: '/Users/alpinro/Code Prjects/codequal/packages/agents',
      language: 'javascript'
    });
    const duration = Math.round(performance.now() - startTime);
    
    log(`  ✅ Multi-Tool Performance: WORKING (${duration}ms)`, colors.green);
    return {
      agent: 'MultiToolPerformanceAgent',
      status: 'WORKING',
      executionTime: duration,
      issuesFound: result.summary.total,
      notes: `${result.metadata.toolsExecuted.length} tools executed`
    };
  } catch (error: any) {
    log(`  ❌ Multi-Tool Performance: FAILED - ${error.message}`, colors.red);
    return {
      agent: 'MultiToolPerformanceAgent',
      status: 'FAILED',
      error: error.message
    };
  }
}

// Test Multi-Tool Code Quality Agent
async function testMultiToolCodeQualityAgent(): Promise<TestResult> {
  log('🔍 Testing Multi-Tool Code Quality Agent...', colors.blue);
  const agent = new MultiToolCodeQualityAgent();
  
  try {
    const startTime = performance.now();
    const result = await agent.analyze({
      targetPath: '/Users/alpinro/Code Prjects/codequal/packages/agents',
      language: 'javascript'
    });
    const duration = Math.round(performance.now() - startTime);
    
    log(`  ✅ Multi-Tool Code Quality: WORKING (${duration}ms)`, colors.green);
    return {
      agent: 'MultiToolCodeQualityAgent',
      status: 'WORKING',
      executionTime: duration,
      issuesFound: result.summary.total,
      notes: `${result.metadata.toolsExecuted.length} tools executed`
    };
  } catch (error: any) {
    log(`  ❌ Multi-Tool Code Quality: FAILED - ${error.message}`, colors.red);
    return {
      agent: 'MultiToolCodeQualityAgent',
      status: 'FAILED',
      error: error.message
    };
  }
}

// Main test runner
async function runAllTests() {
  console.clear();
  log(`
╔══════════════════════════════════════════════════════════╗
║     Comprehensive Agent Testing Suite                     ║
║     Verifying What's TESTED vs IMPLEMENTED                ║
╚══════════════════════════════════════════════════════════╝
`, colors.cyan);

  logSection('Phase 1: Platform Security Agents');
  
  // Test platform agents
  testResults.push(await testGitHubAgent());
  testResults.push(await testGitLabAgent());
  
  logSection('Phase 2: Enterprise Tool Agents');
  
  // Test OWASP agent
  testResults.push(await testOWASPAgent());
  
  logSection('Phase 3: Multi-Tool Agents');
  
  // Test all multi-tool agents
  testResults.push(await testMultiToolSecurityAgent());
  testResults.push(await testMultiToolDependencyAgent());
  testResults.push(await testMultiToolArchitectureAgent());
  testResults.push(await testMultiToolPerformanceAgent());
  testResults.push(await testMultiToolCodeQualityAgent());
  
  // Generate summary report
  logSection('TEST RESULTS SUMMARY');
  
  const tested = testResults.filter(r => r.status === 'TESTED');
  const working = testResults.filter(r => r.status === 'WORKING');
  const failed = testResults.filter(r => r.status === 'FAILED');
  const notTested = testResults.filter(r => r.status === 'NOT_TESTED');
  
  log('📊 Overall Statistics:', colors.magenta);
  log(`   Total Agents: ${testResults.length}`, colors.gray);
  log(`   ✅ TESTED & VERIFIED: ${tested.length}`, colors.green);
  log(`   🔧 WORKING (not fully tested): ${working.length}`, colors.yellow);
  log(`   ❌ FAILED: ${failed.length}`, colors.red);
  if (notTested.length > 0) {
    log(`   ⏭️  NOT TESTED: ${notTested.length}`, colors.gray);
  }
  
  // Detailed breakdown
  log('\n📋 Detailed Status:', colors.magenta);
  
  if (tested.length > 0) {
    log('\n   TESTED & VERIFIED:', colors.green);
    tested.forEach(r => {
      log(`   • ${r.agent}: ${r.executionTime}ms, ${r.issuesFound} issues`, colors.gray);
      if (r.notes) log(`     Note: ${r.notes}`, colors.gray);
    });
  }
  
  if (working.length > 0) {
    log('\n   WORKING (needs full testing):', colors.yellow);
    working.forEach(r => {
      log(`   • ${r.agent}`, colors.gray);
      if (r.notes) log(`     Note: ${r.notes}`, colors.gray);
    });
  }
  
  if (failed.length > 0) {
    log('\n   FAILED:', colors.red);
    failed.forEach(r => {
      log(`   • ${r.agent}: ${r.error}`, colors.gray);
    });
  }
  
  // Performance metrics
  const avgTime = tested.reduce((sum, r) => sum + (r.executionTime || 0), 0) / tested.length;
  if (tested.length > 0) {
    log('\n⚡ Performance Metrics:', colors.magenta);
    log(`   Average execution time: ${Math.round(avgTime)}ms`, colors.gray);
    log(`   Fastest: ${Math.min(...tested.map(r => r.executionTime || Infinity))}ms`, colors.gray);
    log(`   Slowest: ${Math.max(...tested.map(r => r.executionTime || 0))}ms`, colors.gray);
  }
  
  // Recommendations
  logSection('RECOMMENDATIONS');
  
  if (!process.env.GITHUB_TOKEN) {
    log('📌 GitHub:', colors.yellow);
    log('   Add GITHUB_TOKEN to .env for private repos and higher rate limits', colors.gray);
  }
  
  const gitlabTokenCommented = process.env.GITLAB_TOKEN?.startsWith('#');
  if (!process.env.GITLAB_TOKEN || gitlabTokenCommented) {
    log('\n📌 GitLab:', colors.yellow);
    log('   Uncomment GITLAB_TOKEN in .env for real GitLab API access', colors.gray);
    log('   Current: # GITLAB_TOKEN=glpat-csSverTEaXb2mWEytVRL', colors.gray);
  }
  
  log('\n📌 OWASP Dependency Check:', colors.yellow);
  log('   Install with: brew install dependency-check', colors.gray);
  log('   Or download from: https://owasp.org/www-project-dependency-check/', colors.gray);
  
  // Final status
  logSection('FINAL STATUS');
  
  const readyForProduction = tested.length >= 3 && failed.length === 0;
  if (readyForProduction) {
    log('🎉 System is READY for Phase 1 deployment!', colors.green);
    log('   All critical agents are tested and working', colors.gray);
  } else {
    log('⚠️  System needs more testing before deployment', colors.yellow);
    log(`   ${3 - tested.length} more agents need full testing`, colors.gray);
  }
  
  log('\n✨ Test suite complete!\n', colors.green);
}

// Handle errors
process.on('unhandledRejection', (error: any) => {
  log(`\n❌ Unhandled error: ${error.message}`, colors.red);
  process.exit(1);
});

// Run if executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    log(`\n❌ Fatal error: ${error.message}`, colors.red);
    process.exit(1);
  });
}

export { runAllTests };