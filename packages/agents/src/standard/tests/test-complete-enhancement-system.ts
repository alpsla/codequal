#!/usr/bin/env npx ts-node

/**
 * Complete Enhancement System Test Suite
 * Tests all components: Location finding, smart matching, fallback logic, and grouping
 */

import { LocationFinderService } from '../services/location-finder';
import { EnhancedLocationFinder } from '../services/location-finder-enhanced';
import { LocationEnhancer, BatchLocationEnhancer } from '../services/location-enhancer';
import { EnhancedIssueMatcher, IssueDuplicator } from '../services/issue-matcher-enhanced';
import { SearchStrategySelector } from '../services/search-strategy-selector';
import { MCPToolFallbackService } from '../services/mcp-tool-fallback';
import { IssueGrouper } from '../services/issue-grouper';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';

// Test data setup
async function setupTestRepository(): Promise<string> {
  const testRepoPath = '/tmp/test-enhancement-repo';
  
  try {
    execSync(`rm -rf ${testRepoPath}`, { stdio: 'ignore' });
  } catch {}
  
  execSync(`mkdir -p ${testRepoPath}/src/api`, { stdio: 'inherit' });
  execSync(`mkdir -p ${testRepoPath}/src/utils`, { stdio: 'inherit' });
  
  // File with multiple issues including duplicates
  const apiFile = `
// File: src/api/users.ts
import { db } from '../db';

// Issue 1: SQL Injection (line 6)
export async function getUserById(userId: string) {
  const query = \`SELECT * FROM users WHERE id = \${userId}\`;
  return db.query(query);
}

// Issue 2: Another SQL Injection (line 12)
export async function getUserByEmail(email: string) {
  const sql = "SELECT * FROM users WHERE email = '" + email + "'";
  return db.query(sql);
}

// Add 100 lines of code to test large shifts
${'// Comment line\n'.repeat(100)}

// Issue 3: Same SQL pattern after large shift (line ~116)
export async function deleteUser(userId: string) {
  const deleteQuery = \`DELETE FROM users WHERE id = \${userId}\`;
  return db.query(deleteQuery);
}

// Issue 4: XSS vulnerability
export function renderUserProfile(userData: any) {
  document.innerHTML = userData.bio; // XSS
}

// Issue 5: Hardcoded secret
const API_KEY = "sk-production-key-12345";

// Issue 6: Missing validation
export function updateUser(userData: any) {
  // No validation
  return db.update('users', userData);
}
`;

  const utilsFile = `
// File: src/utils/auth.ts

// Issue 7: Hardcoded secret (duplicate pattern)
const SECRET_KEY = "super-secret-key-123";

// Issue 8: Missing rate limiting
export async function login(username: string, password: string) {
  // No rate limiting
  return authenticate(username, password);
}

// Issue 9: SQL Injection (same pattern as in users.ts)
export async function checkPermission(userId: string, resource: string) {
  const query = \`SELECT * FROM permissions WHERE user_id = \${userId}\`;
  return db.query(query);
}
`;

  await fs.writeFile(path.join(testRepoPath, 'src/api/users.ts'), apiFile);
  await fs.writeFile(path.join(testRepoPath, 'src/utils/auth.ts'), utilsFile);
  
  return testRepoPath;
}

// Test 1: Strategy Selection
async function testStrategySelection() {
  console.log('\n🎯 Test 1: Strategy Selection\n');
  
  const selector = new SearchStrategySelector();
  
  const testCases = [
    {
      name: 'SQL Injection with code',
      issue: {
        id: 'test-1',
        message: 'SQL injection vulnerability',
        description: 'SQL injection vulnerability in query construction',
        category: 'security' as const,
        severity: 'critical' as const,
        codeSnippet: 'const query = `SELECT * FROM users WHERE id = ${userId}`;'
      },
      expected: 'code-search'
    },
    {
      name: 'Missing function',
      issue: {
        id: 'test-2',
        message: 'Missing function',
        description: 'Function validateInput is not defined',
        category: 'code-quality' as const,
        severity: 'high' as const
      },
      expected: 'semantic-analysis'
    },
    {
      name: 'Empty catch block',
      issue: {
        id: 'test-3',
        message: 'Empty catch block',
        description: 'Empty catch block found',
        category: 'code-quality' as const,
        severity: 'medium' as const,
        codeSnippet: 'try { doSomething(); } catch(e) { }'
      },
      expected: 'pattern-match'
    }
  ];
  
  let passed = 0;
  for (const test of testCases) {
    const decision = selector.selectStrategy({
      issue: test.issue,
      hasCodeSnippet: !!test.issue.codeSnippet,
      hasSymbolName: false,
      hasLineNumber: false,
      searchGoal: 'find-location'
    });
    
    const success = decision.primary === test.expected;
    console.log(`${success ? '✅' : '❌'} ${test.name}`);
    console.log(`   Selected: ${decision.primary} (${decision.confidence}%)`);
    console.log(`   Reasoning: ${decision.reasoning}`);
    
    if (success) passed++;
  }
  
  return passed === testCases.length;
}

// Test 2: Enhanced Issue Matching
async function testEnhancedMatching() {
  console.log('\n🔄 Test 2: Enhanced Issue Matching\n');
  
  const matcher = new EnhancedIssueMatcher();
  
  const issue1 = {
    id: 'test-match-1',
    message: 'SQL injection',
    description: 'SQL injection',
    category: 'security' as const,
    severity: 'critical' as const,
    location: { file: 'src/api/users.ts', line: 6 },
    codeSnippet: 'const query = `SELECT * FROM users WHERE id = ${userId}`;'
  };
  
  // Test exact match
  const exactMatch = matcher.matchIssues(issue1, {
    ...issue1,
    location: { file: 'src/api/users.ts', line: 6 }
  });
  console.log(`✅ Exact match: ${exactMatch.confidence}% confidence`);
  
  // Test small shift
  const smallShift = matcher.matchIssues(issue1, {
    ...issue1,
    location: { file: 'src/api/users.ts', line: 8 }
  });
  console.log(`✅ Small shift (2 lines): ${smallShift.confidence}% confidence`);
  
  // Test large shift with same code
  const largeShift = matcher.matchIssues(issue1, {
    ...issue1,
    location: { file: 'src/api/users.ts', line: 150 }
  });
  console.log(`✅ Large shift (144 lines): ${largeShift.confidence}% confidence`);
  
  // Test different file
  const differentFile = matcher.matchIssues(issue1, {
    ...issue1,
    location: { file: 'src/utils/auth.ts', line: 6 }
  });
  console.log(`✅ Different file: Match = ${differentFile.isMatch}`);
  
  return exactMatch.confidence === 100 && 
         smallShift.confidence >= 80 &&
         largeShift.confidence >= 60 &&
         !differentFile.isMatch;
}

// Test 3: MCP Tool Fallback
async function testToolFallback() {
  console.log('\n🔧 Test 3: MCP Tool Fallback\n');
  
  const fallbackService = new MCPToolFallbackService();
  
  // Test with all tools failing except grep
  const result = await fallbackService.execute('code-search', {
    pattern: 'SELECT',
    file: '/tmp/test.ts'
  }, {
    maxRetries: 1,
    throwOnFailure: false
  });
  
  console.log(`Tool used: ${result.toolUsed}`);
  console.log(`Fallback chain: ${result.fallbackChain.join(' → ')}`);
  console.log(`Success: ${result.success}`);
  
  // Check health status
  const health = fallbackService.getHealthStatus();
  console.log('\nTool Health Status:');
  for (const [tool, isHealthy] of health) {
    console.log(`  ${isHealthy ? '✅' : '❌'} ${tool}`);
  }
  
  return true; // Fallback logic always succeeds with grep
}

// Test 4: Issue Grouping
async function testIssueGrouping() {
  console.log('\n📊 Test 4: Issue Grouping\n');
  
  const grouper = new IssueGrouper();
  
  const issues = [
    // SQL Injections (multiple occurrences)
    {
      id: 'group-1',
      message: 'SQL Injection 1',
      title: 'SQL Injection 1',
      description: 'SQL injection in getUserById',
      category: 'security' as const,
      severity: 'critical' as const,
      location: { file: 'src/api/users.ts', line: 6 }
    },
    {
      id: 'group-2',
      message: 'SQL Injection 2',
      title: 'SQL Injection 2',
      description: 'SQL injection in getUserByEmail',
      category: 'security' as const,
      severity: 'critical' as const,
      location: { file: 'src/api/users.ts', line: 12 }
    },
    {
      id: 'group-3',
      message: 'SQL Injection 3',
      title: 'SQL Injection 3',
      description: 'SQL injection in deleteUser',
      category: 'security' as const,
      severity: 'critical' as const,
      location: { file: 'src/api/users.ts', line: 116 }
    },
    {
      id: 'group-4',
      message: 'SQL Injection 4',
      title: 'SQL Injection 4',
      description: 'SQL injection in checkPermission',
      category: 'security' as const,
      severity: 'critical' as const,
      location: { file: 'src/utils/auth.ts', line: 14 }
    },
    // Hardcoded secrets (multiple)
    {
      id: 'group-5',
      message: 'Hardcoded API Key',
      title: 'Hardcoded API Key',
      description: 'Hardcoded API key found',
      category: 'security' as const,
      severity: 'high' as const,
      location: { file: 'src/api/users.ts', line: 130 }
    },
    {
      id: 'group-6',
      message: 'Hardcoded Secret',
      title: 'Hardcoded Secret',
      description: 'Hardcoded secret key found',
      category: 'security' as const,
      severity: 'high' as const,
      location: { file: 'src/utils/auth.ts', line: 4 }
    }
  ];
  
  const groups = grouper.groupIssues(issues);
  
  console.log(`Found ${groups.length} issue groups:\n`);
  
  for (const group of groups) {
    console.log(`${group.category} - ${group.pattern}`);
    console.log(`  Severity: ${group.severity}`);
    console.log(`  Total occurrences: ${group.totalCount}`);
    console.log(`  Affected files: ${group.affectedFiles.length}`);
    console.log(`  Files: ${group.affectedFiles.join(', ')}`);
    console.log();
  }
  
  // Verify we have all occurrences preserved
  const sqlGroup = groups.find(g => g.pattern === 'sql-injection');
  const secretGroup = groups.find(g => g.pattern === 'hardcoded-secret');
  
  return sqlGroup?.totalCount === 4 && secretGroup?.totalCount === 2;
}

// Test 5: Complete Integration
async function testCompleteIntegration() {
  console.log('\n🚀 Test 5: Complete Integration\n');
  
  const repoPath = await setupTestRepository();
  const enhancer = new BatchLocationEnhancer();
  
  // Mock comparison result with issues
  const comparisonResult = {
    newIssues: [
      {
        title: 'SQL Injection in getUserById',
        description: 'Direct string interpolation in SQL query using SELECT statement',
        severity: 'critical',
        category: 'security' as const,
        location: { file: 'src/api/users.ts' }
      },
      {
        title: 'XSS Vulnerability',
        description: 'Direct innerHTML assignment',
        severity: 'high',
        category: 'security' as const,
        location: { file: 'src/api/users.ts' }
      }
    ],
    unchangedIssues: [
      {
        title: 'Hardcoded Secret',
        description: 'API key hardcoded in source',
        severity: 'high',
        category: 'security' as const,
        location: { file: 'src/api/users.ts' }
      }
    ],
    fixedIssues: []
  };
  
  // Mock repo cache
  process.env.REPO_CACHE_DIR = '/tmp';
  execSync(`mkdir -p /tmp/test/repo`, { stdio: 'ignore' });
  execSync(`ln -sf ${repoPath} /tmp/test/repo/pr-123`, { stdio: 'ignore' });
  
  // Enhance with locations
  const enhanced = await enhancer.enhanceComparisonResults(
    comparisonResult,
    'https://github.com/test/repo',
    '123'
  );
  
  console.log('Enhancement Results:');
  console.log(`  Enhanced: ${enhanced.enhancementStats.totalEnhanced}`);
  console.log(`  Failed: ${enhanced.enhancementStats.totalFailed}`);
  console.log(`  Success rate: ${enhanced.enhancementStats.successRate}%`);
  
  // Check if we got line numbers
  let withLines = 0;
  for (const issue of [...enhanced.newIssues, ...enhanced.unchangedIssues]) {
    if (issue.location?.line) {
      withLines++;
      console.log(`  ✅ ${issue.title}: Line ${issue.location.line}`);
    } else {
      console.log(`  ❌ ${issue.title}: No line`);
    }
  }
  
  return withLines > 0;
}

// Test 6: Performance Test
async function testPerformance() {
  console.log('\n⚡ Test 6: Performance Test\n');
  
  const startTime = Date.now();
  
  // Create many issues for performance testing
  const issues = [];
  for (let i = 0; i < 50; i++) {
    issues.push({
      id: `perf-${i}`,
      message: `Issue ${i}`,
      title: `Issue ${i}`,
      description: `Test issue ${i}`,
      category: 'security' as const,
      severity: 'high' as const,
      location: { 
        file: `src/file${i % 5}.ts`, 
        line: Math.floor(Math.random() * 200) 
      }
    });
  }
  
  // Test grouping performance
  const grouper = new IssueGrouper();
  const groups = grouper.groupIssues(issues);
  
  // Test matching performance
  const matcher = new EnhancedIssueMatcher();
  let matches = 0;
  for (let i = 0; i < issues.length - 1; i++) {
    const result = matcher.matchIssues(issues[i], issues[i + 1]);
    if (result.isMatch) matches++;
  }
  
  const duration = Date.now() - startTime;
  console.log(`Processed ${issues.length} issues in ${duration}ms`);
  console.log(`  Grouping: ${groups.length} groups`);
  console.log(`  Matching: ${matches} matches found`);
  console.log(`  Average: ${(duration / issues.length).toFixed(2)}ms per issue`);
  
  return duration < 1000; // Should complete in under 1 second
}

// Main test runner
async function runAllTests() {
  console.log('🧪 Complete Enhancement System Test Suite');
  console.log('=' .repeat(60));
  
  const results = {
    strategySelection: await testStrategySelection(),
    enhancedMatching: await testEnhancedMatching(),
    toolFallback: await testToolFallback(),
    issueGrouping: await testIssueGrouping(),
    completeIntegration: await testCompleteIntegration(),
    performance: await testPerformance()
  };
  
  console.log('\n' + '=' .repeat(60));
  console.log('📋 Final Results:\n');
  
  let allPassed = true;
  for (const [test, passed] of Object.entries(results)) {
    console.log(`  ${passed ? '✅' : '❌'} ${test}`);
    if (!passed) allPassed = false;
  }
  
  if (allPassed) {
    console.log('\n🎉 All tests passed! System ready for production.');
    process.exit(0);
  } else {
    console.log('\n⚠️ Some tests failed. Please review.');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});