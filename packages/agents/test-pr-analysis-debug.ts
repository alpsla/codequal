#!/usr/bin/env npx ts-node

import axios from 'axios';
import { parseDeepWikiResponse } from './src/standard/tests/regression/parse-deepwiki-response';

async function testPRAnalysis() {
  console.log('Testing PR branch analysis directly...\n');
  
  const config = {
    deepwikiUrl: process.env.DEEPWIKI_API_URL || 'http://localhost:8001',
    timeout: 30000
  };

  try {
    // Test PR branch
    console.log('1. Calling DeepWiki for PR branch (pull/700/head)...');
    const prResponse = await axios.post(
      `${config.deepwikiUrl}/chat/completions/stream`,
      {
        repo_url: 'https://github.com/sindresorhus/ky',
        messages: [{
          role: 'user',
          content: `Analyze the repository https://github.com/sindresorhus/ky (branch: pull/700/head) for code quality issues.

For EACH issue found, provide:
1. **Title**: Brief description
2. File: exact/path/to/file.ts, Line: number
3. Code Snippet: The problematic code
4. Recommendation: How to fix
5. Severity: critical/high/medium/low`
        }],
        stream: false,
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 3000
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: config.timeout
      }
    );

    const prContent = typeof prResponse.data === 'string' ? prResponse.data : JSON.stringify(prResponse.data);
    console.log('PR Response length:', prContent.length);
    console.log('First 500 chars:', prContent.substring(0, 500));
    
    // Parse the response
    console.log('\n2. Parsing PR response...');
    const parsedPR = await parseDeepWikiResponse(prContent);
    console.log('Parsed PR issues:', parsedPR.issues.length);
    
    if (parsedPR.issues.length > 0) {
      console.log('\nFirst PR issue:', JSON.stringify(parsedPR.issues[0], null, 2));
    }

    // Test main branch for comparison
    console.log('\n3. Calling DeepWiki for main branch...');
    const mainResponse = await axios.post(
      `${config.deepwikiUrl}/chat/completions/stream`,
      {
        repo_url: 'https://github.com/sindresorhus/ky',
        messages: [{
          role: 'user',
          content: `Analyze the repository https://github.com/sindresorhus/ky (branch: main) for code quality issues.

For EACH issue found, provide:
1. **Title**: Brief description
2. File: exact/path/to/file.ts, Line: number
3. Code Snippet: The problematic code
4. Recommendation: How to fix
5. Severity: critical/high/medium/low`
        }],
        stream: false,
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 3000
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: config.timeout
      }
    );

    const mainContent = typeof mainResponse.data === 'string' ? mainResponse.data : JSON.stringify(mainResponse.data);
    console.log('\nMain Response length:', mainContent.length);
    
    // Parse the response
    console.log('\n4. Parsing main response...');
    const parsedMain = await parseDeepWikiResponse(mainContent);
    console.log('Parsed main issues:', parsedMain.issues.length);
    
    // Compare results
    console.log('\n=== COMPARISON ===');
    console.log('Main branch issues:', parsedMain.issues.length);
    console.log('PR branch issues:', parsedPR.issues.length);
    console.log('Difference:', parsedMain.issues.length - parsedPR.issues.length);
    
    // Save for debugging
    require('fs').writeFileSync('debug-pr-content.txt', prContent);
    require('fs').writeFileSync('debug-main-content.txt', mainContent);
    console.log('\nDebug files saved: debug-pr-content.txt, debug-main-content.txt');
    
  } catch (error: any) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testPRAnalysis().catch(console.error);