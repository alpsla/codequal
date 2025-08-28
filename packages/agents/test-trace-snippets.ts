#!/usr/bin/env npx ts-node

import { ComparisonAgent } from './src/standard/comparison/comparison-agent';
import { DirectDeepWikiApiWithLocation } from './src/standard/services/direct-deepwiki-api-with-location';

async function traceSnippets() {
  console.log('=== Tracing Code Snippet Generation ===\n');
  
  // Force mock mode
  process.env.USE_DEEPWIKI_MOCK = 'true';
  
  const deepWikiClient = new DirectDeepWikiApiWithLocation();
  
  // Step 1: Test what DirectDeepWikiApiWithLocation returns with mock mode
  console.log('Step 1: Testing DirectDeepWikiApiWithLocation...');
  
  try {
    const result = await deepWikiClient.analyzeRepository('https://github.com/sindresorhus/ky', {
      branch: 'main'
    });
    
    console.log('\nIssues returned:');
    result.issues?.slice(0, 3).forEach((issue: any, idx: number) => {
      console.log(`\nIssue ${idx + 1}:`);
      console.log('  Title:', issue.title);
      console.log('  Code Snippet:', issue.codeSnippet || 'MISSING');
    });
  } catch (error: any) {
    console.log('Error:', error.message);
    
    // The DirectDeepWikiApiWithLocation doesn't check USE_DEEPWIKI_MOCK
    // It always tries to call the real DeepWiki API
    // So when USE_DEEPWIKI_MOCK=true, we need a different approach
    
    console.log('\nDirectDeepWikiApiWithLocation doesn\'t support mock mode.');
    console.log('It always calls the real DeepWiki API at localhost:8001');
  }
  
  // Step 2: Create mock issues directly
  console.log('\n\nStep 2: Creating mock issues with placeholder snippets...');
  
  const mockMainIssues = [
    {
      id: 'issue-1',
      title: 'Potential denial of service due to unbounded request retries',
      severity: 'high',
      category: 'performance',
      location: { file: 'index.ts', line: 125 },
      codeSnippet: '// Code related to request retries' // <-- Placeholder!
    },
    {
      id: 'issue-2',
      title: 'Lack of input validation for URL parameters',
      severity: 'high',
      category: 'security',
      location: { file: 'src/index.ts', line: 56 },
      codeSnippet: '// Code that handles URL parameters' // <-- Placeholder!
    }
  ];
  
  console.log('\nMock issues created with placeholder snippets:');
  mockMainIssues.forEach((issue, idx) => {
    console.log(`Issue ${idx + 1}: ${issue.codeSnippet}`);
  });
  
  // Step 3: Check ComparisonAgent's mockAIAnalysis
  console.log('\n\nStep 3: Testing ComparisonAgent.mockAIAnalysis...');
  
  const agent = new ComparisonAgent();
  
  const mockMainAnalysis = { issues: mockMainIssues, scores: {} };
  const mockPRAnalysis = { issues: [...mockMainIssues], scores: {} };
  
  const comparisonResult = (agent as any).mockAIAnalysis(mockMainAnalysis, mockPRAnalysis);
  
  console.log('\nUnchanged issues from mockAIAnalysis:');
  comparisonResult.unchangedIssues.issues.slice(0, 2).forEach((item: any, idx: number) => {
    console.log(`\nIssue ${idx + 1}:`);
    console.log('  Title:', item.issue.title);
    console.log('  Code Snippet:', item.issue.codeSnippet || 'MISSING');
  });
  
  console.log('\n\n=== CONCLUSION ===');
  console.log('The placeholder snippets are coming from:');
  console.log('1. When USE_DEEPWIKI_MOCK=true, the test needs to generate mock data');
  console.log('2. The mock data generator creates placeholder snippets like "// Code related to..."');
  console.log('3. ComparisonAgent.mockAIAnalysis preserves these placeholders');
  console.log('4. The report generator shows these placeholders in the final report');
  console.log('\nThe real issue is that DirectDeepWikiApiWithLocation doesn\'t check USE_DEEPWIKI_MOCK!');
  console.log('It always tries to call real DeepWiki, which fails when port-forwarding is not active.');
}

traceSnippets().catch(console.error);