#!/usr/bin/env npx ts-node

import axios from 'axios';
import { setTimeout } from 'timers/promises';

const DEEPWIKI_URL = process.env.DEEPWIKI_API_URL || 'http://localhost:8001';
const DEEPWIKI_API_KEY = process.env.DEEPWIKI_API_KEY || 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f';

interface TestResult {
  testName: string;
  success: boolean;
  response?: any;
  error?: string;
  duration: number;
  contextAvailable?: boolean;
}

const results: TestResult[] = [];

async function callDeepWikiChat(repoUrl: string, message: string, testName: string): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    console.log(`\n🔬 Running test: ${testName}`);
    console.log(`   Repository: ${repoUrl}`);
    console.log(`   Message: ${message.substring(0, 100)}...`);
    
    const response = await axios.post(
      `${DEEPWIKI_URL}/chat/completions/stream`,
      {
        repo_url: repoUrl,
        messages: [{
          role: 'user',
          content: message
        }],
        stream: false,
        provider: 'openrouter',
        model: 'openai/gpt-4o',
        temperature: 0.1,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      },
      {
        headers: {
          'Authorization': `Bearer ${DEEPWIKI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );
    
    const duration = Date.now() - startTime;
    const hasContext = response.data?.choices?.[0]?.message?.content?.includes('repository') ||
                       response.data?.choices?.[0]?.message?.content?.includes('code') ||
                       response.data?.choices?.[0]?.message?.content?.includes('file');
    
    console.log(`   ✅ Success (${duration}ms)`);
    console.log(`   Context available: ${hasContext ? 'YES' : 'NO'}`);
    
    return {
      testName,
      success: true,
      response: response.data,
      duration,
      contextAvailable: hasContext
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.log(`   ❌ Failed (${duration}ms): ${error.message}`);
    
    return {
      testName,
      success: false,
      error: error.message,
      duration,
      contextAvailable: false
    };
  }
}

async function runContextTests() {
  console.log('🚀 DeepWiki Context Mechanism Test Suite');
  console.log('=' .repeat(50));
  
  // Test repositories
  const testRepos = [
    'https://github.com/sindresorhus/ky',  // Small repo for quick tests
    'https://github.com/vercel/swr',        // Medium repo
    'https://github.com/facebook/react'     // Large repo (if needed)
  ];
  
  const selectedRepo = testRepos[0]; // Use small repo for initial tests
  
  // Test 1: Initial analysis to establish context
  console.log('\n📋 Test 1: Initial Repository Analysis');
  const analysisPrompt = `Analyze this repository and return a JSON object with this structure:
{
  "issues": [
    {
      "severity": "critical|high|medium|low",
      "file": "path/to/file.ts",
      "line": 123,
      "description": "Issue description"
    }
  ],
  "summary": "Overall repository analysis"
}`;
  
  const initialResult = await callDeepWikiChat(
    selectedRepo,
    analysisPrompt,
    'Initial Analysis'
  );
  results.push(initialResult);
  
  // Test 2: Immediate follow-up (should have context)
  console.log('\n📋 Test 2: Immediate Follow-up Query');
  await setTimeout(2000); // Small delay
  
  const followupResult = await callDeepWikiChat(
    selectedRepo,
    'Based on the previous analysis, which files have the most critical issues? Return as JSON.',
    'Immediate Follow-up'
  );
  results.push(followupResult);
  
  // Test 3: Query after 1 minute
  console.log('\n📋 Test 3: Query after 1 minute');
  console.log('   Waiting 60 seconds...');
  await setTimeout(60000);
  
  const oneMinResult = await callDeepWikiChat(
    selectedRepo,
    'List the main security issues found in this repository. Return as JSON.',
    'After 1 minute'
  );
  results.push(oneMinResult);
  
  // Test 4: Query after 5 minutes
  console.log('\n📋 Test 4: Query after 5 minutes');
  console.log('   Waiting 4 more minutes...');
  await setTimeout(240000);
  
  const fiveMinResult = await callDeepWikiChat(
    selectedRepo,
    'What are the performance issues in this codebase? Return as JSON.',
    'After 5 minutes'
  );
  results.push(fiveMinResult);
  
  // Test 5: Query unanalyzed repository
  console.log('\n📋 Test 5: Query Unanalyzed Repository');
  const unanalyzedRepo = 'https://github.com/sindresorhus/is-odd'; // Different small repo
  
  const unanalyzedResult = await callDeepWikiChat(
    unanalyzedRepo,
    'What issues exist in this repository? Return as JSON.',
    'Unanalyzed Repository'
  );
  results.push(unanalyzedResult);
  
  // Test 6: Try to provide custom context
  console.log('\n📋 Test 6: Custom Context Attempt');
  const customContextPrompt = `Given this context about the repository:
- It's a TypeScript HTTP client library
- Main file is src/index.ts
- Has retry logic and error handling

Find issues related to error handling. Return as JSON.`;
  
  const customContextResult = await callDeepWikiChat(
    selectedRepo,
    customContextPrompt,
    'Custom Context'
  );
  results.push(customContextResult);
  
  // Generate summary report
  console.log('\n' + '=' .repeat(50));
  console.log('📊 Test Results Summary');
  console.log('=' .repeat(50));
  
  results.forEach(result => {
    const contextStatus = result.contextAvailable ? '✅ Has Context' : '❌ No Context';
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.testName}: ${contextStatus} (${result.duration}ms)`);
  });
  
  // Analyze context persistence
  console.log('\n🔍 Context Persistence Analysis:');
  const contextResults = results.filter(r => r.success);
  const withContext = contextResults.filter(r => r.contextAvailable).length;
  const withoutContext = contextResults.filter(r => !r.contextAvailable).length;
  
  console.log(`   Tests with context: ${withContext}/${contextResults.length}`);
  console.log(`   Tests without context: ${withoutContext}/${contextResults.length}`);
  
  // Check if context expires
  const timeBasedResults = results.slice(1, 5); // Tests 2-5 are time-based
  const contextExpired = timeBasedResults.findIndex(r => !r.contextAvailable);
  
  if (contextExpired === -1) {
    console.log('   ✅ Context persisted throughout all time-based tests');
  } else {
    const expiredTest = timeBasedResults[contextExpired];
    console.log(`   ⚠️ Context appears to expire at: ${expiredTest.testName}`);
  }
  
  // Save detailed results
  const fs = require('fs');
  const reportPath = './test-results/deepwiki-context-mechanism-results.json';
  
  fs.mkdirSync('./test-results', { recursive: true });
  fs.writeFileSync(
    reportPath,
    JSON.stringify({
      timestamp: new Date().toISOString(),
      repository: selectedRepo,
      results,
      summary: {
        totalTests: results.length,
        successfulTests: results.filter(r => r.success).length,
        testsWithContext: withContext,
        testsWithoutContext: withoutContext,
        averageDuration: Math.round(results.reduce((acc, r) => acc + r.duration, 0) / results.length)
      }
    }, null, 2)
  );
  
  console.log(`\n💾 Detailed results saved to: ${reportPath}`);
  
  // Key findings
  console.log('\n🎯 Key Findings:');
  console.log('   1. Context availability after initial analysis:', 
    results[1]?.contextAvailable ? 'YES' : 'NO');
  console.log('   2. Context persistence over time:', 
    contextExpired === -1 ? 'PERSISTENT' : `EXPIRES (${timeBasedResults[contextExpired]?.testName})`);
  console.log('   3. Unanalyzed repo has context:', 
    results.find(r => r.testName === 'Unanalyzed Repository')?.contextAvailable ? 'YES' : 'NO');
  console.log('   4. Custom context works:', 
    results.find(r => r.testName === 'Custom Context')?.contextAvailable ? 'YES' : 'NO');
}

// Quick mode for faster testing
const QUICK_MODE = process.env.QUICK_TEST === 'true';

async function runQuickTests() {
  console.log('🚀 DeepWiki Context Mechanism Test Suite (QUICK MODE)');
  console.log('=' .repeat(50));
  
  const testRepo = 'https://github.com/sindresorhus/is-odd'; // Very small repo
  
  // Quick Test 1: Initial analysis
  const analysisResult = await callDeepWikiChat(
    testRepo,
    'Analyze this repository and find any issues. Return as JSON with issues array.',
    'Quick Analysis'
  );
  results.push(analysisResult);
  
  // Quick Test 2: Immediate follow-up (5 seconds)
  await setTimeout(5000);
  const followupResult = await callDeepWikiChat(
    testRepo,
    'What were the main issues found? Return as JSON.',
    'Quick Follow-up'
  );
  results.push(followupResult);
  
  // Quick Test 3: Different repo without analysis
  const differentRepo = 'https://github.com/sindresorhus/is-even';
  const differentResult = await callDeepWikiChat(
    differentRepo,
    'Find issues in this code. Return as JSON.',
    'Different Repository'
  );
  results.push(differentResult);
  
  // Summary
  console.log('\n📊 Quick Test Summary:');
  results.forEach(r => {
    console.log(`   ${r.success ? '✅' : '❌'} ${r.testName}: Context=${r.contextAvailable ? 'YES' : 'NO'}`);
  });
}

// Main execution
(async () => {
  try {
    if (QUICK_MODE) {
      console.log('⚡ Running in QUICK MODE (set QUICK_TEST=false for full tests)');
      await runQuickTests();
    } else {
      console.log('🔬 Running FULL test suite (this will take ~6 minutes)');
      console.log('💡 Tip: Use QUICK_TEST=true for faster testing');
      await runContextTests();
    }
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
})();