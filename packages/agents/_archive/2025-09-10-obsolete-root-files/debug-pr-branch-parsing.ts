#!/usr/bin/env npx ts-node

import axios from 'axios';

async function testDeepWikiPRBranch() {
  console.log('🔍 Testing DeepWiki PR branch analysis...\n');
  
  const apiUrl = process.env.DEEPWIKI_API_URL || 'http://localhost:8001';
  const repoUrl = 'https://github.com/sindresorhus/ky';
  const branch = 'pull/700/head';
  
  try {
    console.log('📡 Calling DeepWiki API...');
    console.log(`   URL: ${apiUrl}/chat/completions/stream`);
    console.log(`   Repo: ${repoUrl}`);
    console.log(`   Branch: ${branch}\n`);
    
    const response = await axios.post(
      `${apiUrl}/chat/completions/stream`,
      {
        repo_url: repoUrl,
        branch: branch,
        messages: [{
          role: 'user',
          content: 'Analyze this repository for code quality issues, security vulnerabilities, and best practice violations. Format each issue with File:, Line:, and Issue: labels.'
        }],
        stream: false,
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 4000
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000
      }
    );
    
    console.log('✅ Response received!\n');
    console.log('📊 Response details:');
    console.log(`   Status: ${response.status}`);
    console.log(`   Type: ${typeof response.data}`);
    console.log(`   Length: ${JSON.stringify(response.data).length} chars\n`);
    
    console.log('📝 Raw response data:');
    console.log('=' .repeat(80));
    
    if (typeof response.data === 'string') {
      console.log(response.data);
    } else {
      console.log(JSON.stringify(response.data, null, 2));
    }
    
    console.log('=' .repeat(80));
    
    // Check if it looks like an error response
    const dataStr = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    if (dataStr.includes("I'm sorry") || dataStr.includes("can't analyze") || dataStr.includes("cannot")) {
      console.log('\n⚠️  WARNING: Response appears to be an error message!');
      console.log('   DeepWiki may have failed to analyze the PR branch.');
    } else {
      // Count potential issues
      const issueMatches = dataStr.match(/File:|Line:|Issue:/gi) || [];
      console.log(`\n✅ Found ${issueMatches.length / 3} potential issues in response`);
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testDeepWikiPRBranch();