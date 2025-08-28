#!/usr/bin/env ts-node

/**
 * Test script to demonstrate fix suggestions with mock DeepWiki data
 * This simulates what would happen with real issues from DeepWiki
 */

import * as path from 'path';
import * as fs from 'fs';

// Mock DeepWiki response for demonstration
process.env.USE_DEEPWIKI_MOCK = 'true';

// Create mock data in the format DeepWiki would return
const mockDeepWikiResponse = {
  mainBranch: {
    issues: [
      {
        id: 'mock-001',
        title: 'Potential SQL Injection vulnerability',
        message: 'SQL injection vulnerability detected in database query',
        severity: 'critical',
        category: 'security',
        type: 'vulnerability',
        location: { file: 'src/core/Ky.ts', line: 245 },
        codeSnippet: 'const query = `SELECT * FROM users WHERE id = ${userId}`; db.execute(query);'
      },
      {
        id: 'mock-002', 
        title: 'Missing input validation',
        message: 'User input is not validated before processing',
        severity: 'high',
        category: 'security',
        location: { file: 'src/utils.ts', line: 89 },
        codeSnippet: 'function processData(userInput) { return transform(userInput); }'
      }
    ]
  },
  prBranch: {
    issues: [
      {
        id: 'mock-001',
        title: 'Potential SQL Injection vulnerability',
        message: 'SQL injection vulnerability detected in database query',
        severity: 'critical',
        category: 'security',
        type: 'vulnerability',
        location: { file: 'src/core/Ky.ts', line: 245 },
        codeSnippet: 'const query = `SELECT * FROM users WHERE id = ${userId}`; db.execute(query);'
      },
      {
        id: 'mock-002',
        title: 'Missing input validation',
        message: 'User input is not validated before processing', 
        severity: 'high',
        category: 'security',
        location: { file: 'src/utils.ts', line: 89 },
        codeSnippet: 'function processData(userInput) { return transform(userInput); }'
      },
      {
        id: 'mock-003',
        title: 'Cross-Site Scripting (XSS) vulnerability',
        message: 'User input rendered without escaping',
        severity: 'critical',
        category: 'security',
        type: 'vulnerability',
        location: { file: 'src/index.ts', line: 156 },
        codeSnippet: 'element.innerHTML = userData;'
      },
      {
        id: 'mock-004',
        title: 'Missing error handling',
        message: 'Async operation without error handling',
        severity: 'medium',
        category: 'code-quality',
        location: { file: 'src/api.ts', line: 78 },
        codeSnippet: 'async function fetchData() { const res = await fetch(url); return res.json(); }'
      }
    ]
  }
};

// Save mock data for the validator to use
const mockDataPath = path.join(__dirname, 'mock-deepwiki-data.json');
fs.writeFileSync(mockDataPath, JSON.stringify(mockDeepWikiResponse, null, 2));

console.log('📝 Mock data created at:', mockDataPath);
console.log('\n🚀 Now running PR analysis with fix suggestions...\n');

// Import and run the analysis
import('./src/standard/tests/regression/manual-pr-validator').then(module => {
  // The validator will use the mock data when USE_DEEPWIKI_MOCK is true
  console.log('Analysis starting with mock issues that will trigger fix suggestions...');
}).catch(error => {
  console.error('Error running analysis:', error);
});