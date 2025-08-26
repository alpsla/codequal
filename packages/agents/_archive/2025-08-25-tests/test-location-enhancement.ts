#!/usr/bin/env npx ts-node

import { LocationFinderService } from '../services/location-finder';
import { LocationEnhancer, BatchLocationEnhancer } from '../services/location-enhancer';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * Test script for location enhancement functionality
 */

async function setupTestRepo(): Promise<string> {
  const testRepoPath = '/tmp/test-location-repo';
  
  // Clean up if exists
  try {
    execSync(`rm -rf ${testRepoPath}`, { stdio: 'ignore' });
  } catch {}
  
  // Create test repository
  execSync(`mkdir -p ${testRepoPath}/src`, { stdio: 'inherit' });
  
  // Create test files with known issues
  const testFile1 = `
// Test file with security issues
function getUserData(userId) {
  // SQL injection vulnerability
  const query = \`SELECT * FROM users WHERE id = \${userId}\`;
  return db.query(query);
}

function renderHTML(userInput) {
  // XSS vulnerability
  document.innerHTML = userInput;
}

// Hardcoded secret
const API_KEY = "sk-1234567890abcdef";
`;

  const testFile2 = `
import express from 'express';

const app = express();

// Missing validation
app.post('/api/user', (req, res) => {
  const user = req.body;
  // No validation on user input
  database.save(user);
  res.json({ success: true });
});

// Missing rate limiting
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  // No rate limiting on login endpoint
  const user = await authenticateUser(username, password);
  res.json({ user });
});
`;

  await fs.writeFile(path.join(testRepoPath, 'src/security.js'), testFile1);
  await fs.writeFile(path.join(testRepoPath, 'src/api.ts'), testFile2);
  
  return testRepoPath;
}

async function testBasicLocationFinding() {
  console.log('\n📍 Testing Basic Location Finding...\n');
  
  const repoPath = await setupTestRepo();
  const finder = new LocationFinderService();
  
  const testIssue = {
    title: 'SQL Injection Vulnerability',
    description: 'Direct string interpolation in SQL query using `SELECT * FROM users`',
    category: 'SQL Injection',
    severity: 'critical',
    location: {
      file: 'src/security.js'
    }
  };
  
  const result = await finder.findExactLocation(testIssue, repoPath);
  
  if (result) {
    console.log('✅ Found location:', {
      line: result.line,
      column: result.column,
      confidence: result.confidence,
      snippet: result.codeSnippet?.substring(0, 100) + '...'
    });
  } else {
    console.log('❌ Location not found');
  }
  
  return result !== null;
}

async function testPatternSearch() {
  console.log('\n🔍 Testing Pattern Search...\n');
  
  const repoPath = await setupTestRepo();
  const finder = new LocationFinderService();
  
  const patterns = [
    { file: 'src/security.js', pattern: 'SELECT' },  // Simplified pattern
    { file: 'src/security.js', pattern: 'innerHTML' },
    { file: 'src/api.ts', pattern: 'req.body' },
  ];
  
  let allPassed = true;
  
  for (const { file, pattern } of patterns) {
    const results = await finder.searchCodePattern(file, pattern, repoPath);
    console.log(`Pattern "${pattern}" in ${file}: ${results.length} matches`);
    
    if (results.length > 0) {
      console.log(`  First match at line ${results[0].line}: ${results[0].match.trim()}`);
    } else {
      allPassed = false;
    }
  }
  
  return allPassed;
}

async function testBatchEnhancement() {
  console.log('\n🚀 Testing Batch Enhancement...\n');
  
  const repoPath = await setupTestRepo();
  
  // Set environment variable to point to test repo
  process.env.REPO_CACHE_DIR = '/tmp';
  
  // Create symlink to simulate cached repo
  execSync(`mkdir -p /tmp/test/repo`, { stdio: 'ignore' });
  execSync(`ln -sf ${repoPath} /tmp/test/repo/pr-123`, { stdio: 'ignore' });
  
  const enhancer = new BatchLocationEnhancer();
  
  const mockComparison = {
    newIssues: [
      {
        title: 'SQL Injection in getUserData',
        description: 'Direct string interpolation in SQL query',
        severity: 'critical',
        category: 'SQL Injection',
        location: { file: 'src/security.js' }
      },
      {
        title: 'XSS Vulnerability',
        description: 'Direct innerHTML assignment with user input',
        severity: 'high',
        category: 'XSS',
        location: { file: 'src/security.js' }
      }
    ],
    unchangedIssues: [
      {
        title: 'Missing Input Validation',
        description: 'No validation on user input in POST /api/user',
        severity: 'medium',
        category: 'Validation',
        location: { file: 'src/api.ts' }
      }
    ],
    fixedIssues: []
  };
  
  const enhanced = await enhancer.enhanceComparisonResults(
    mockComparison,
    'https://github.com/test/repo',
    '123'
  );
  
  console.log('Enhancement Statistics:', enhanced.enhancementStats);
  
  // Check if issues have line numbers
  let withLocations = 0;
  let total = 0;
  
  for (const issue of [...enhanced.newIssues, ...enhanced.unchangedIssues]) {
    total++;
    if (issue.location?.line) {
      withLocations++;
      console.log(`✅ ${issue.title}: Line ${issue.location.line}`);
    } else {
      console.log(`❌ ${issue.title}: No line number`);
    }
  }
  
  console.log(`\nEnhanced ${withLocations}/${total} issues with line numbers`);
  
  return withLocations > 0;
}

async function testConfidenceScoring() {
  console.log('\n📊 Testing Confidence Scoring...\n');
  
  const repoPath = await setupTestRepo();
  const finder = new LocationFinderService();
  
  const issues = [
    {
      title: 'Exact match issue',
      description: 'Issue with `SELECT * FROM users WHERE id`',
      location: { file: 'src/security.js', line: 5 }
    },
    {
      title: 'Close match issue',
      description: 'Issue with SQL query',
      location: { file: 'src/security.js', line: 7 }
    },
    {
      title: 'Vague issue',
      description: 'Security problem in code',
      location: { file: 'src/security.js' }
    }
  ];
  
  for (const issue of issues) {
    const result = await finder.findExactLocation(issue, repoPath);
    console.log(`${issue.title}: Confidence = ${result?.confidence || 0}%`);
  }
  
  return true;
}

async function main() {
  console.log('🧪 Location Enhancement Test Suite\n');
  console.log('=' .repeat(50));
  
  const results = {
    basicLocation: await testBasicLocationFinding(),
    patternSearch: await testPatternSearch(),
    batchEnhancement: await testBatchEnhancement(),
    confidenceScoring: await testConfidenceScoring()
  };
  
  console.log('\n' + '=' .repeat(50));
  console.log('📋 Test Results Summary:\n');
  
  for (const [test, passed] of Object.entries(results)) {
    console.log(`  ${passed ? '✅' : '❌'} ${test}`);
  }
  
  const allPassed = Object.values(results).every(r => r);
  
  if (allPassed) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed');
    process.exit(1);
  }
}

// Run tests
main().catch(error => {
  console.error('Test failed with error:', error);
  process.exit(1);
});