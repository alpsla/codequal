#!/usr/bin/env npx ts-node
/**
 * Test script to see full DeepWiki response including code snippets and recommendations
 */

import axios from 'axios';

async function testDeepWikiFullResponse() {
  const config = {
    apiUrl: 'http://localhost:8001',
    apiKey: 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f'
  };

  const repoUrl = 'https://github.com/sindresorhus/ky';
  const branch = 'main';

  console.log('🔍 Testing DeepWiki full response with code snippets and recommendations...\n');

  try {
    // Create a prompt that explicitly asks for code snippets and recommendations
    const prompt = `Analyze the repository ${repoUrl} (branch: ${branch}) for code quality issues.

For EACH issue found, you MUST provide:
1. **Title**: Brief description of the issue
2. **File**: exact/path/to/file.ts, Line: exact line number
3. **Code Snippet**: The actual problematic code (2-3 lines)
4. **Recommendation**: How to fix this issue
5. **Fixed Code**: The corrected version of the code

Example format:
1. **Security Issue**: SQL Injection vulnerability
   File: src/api/users.ts, Line: 45
   Code Snippet: \`\`\`
   const query = "SELECT * FROM users WHERE id = " + userId;
   db.query(query);
   \`\`\`
   Recommendation: Use parameterized queries to prevent SQL injection
   Fixed Code: \`\`\`
   const query = "SELECT * FROM users WHERE id = ?";
   db.query(query, [userId]);
   \`\`\`

Find at least 3 issues with code snippets and fix recommendations.`;

    const response = await axios.post(
      `${config.apiUrl}/chat/completions/stream`,
      {
        repo_url: repoUrl,
        messages: [{
          role: 'user',
          content: prompt
        }],
        stream: false,
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 3000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        timeout: 60000
      }
    );

    console.log('=== RAW DEEPWIKI RESPONSE ===\n');
    const content = typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2);
    console.log(content);
    console.log('\n=== END OF RESPONSE ===\n');

    // Now analyze what we got
    console.log('\n=== ANALYSIS OF RESPONSE CONTENT ===\n');
    
    // Check for code snippets
    const codeSnippetMatches = content.match(/```[\s\S]*?```/g) || [];
    console.log(`✅ Found ${codeSnippetMatches.length} code snippets`);
    
    // Check for recommendations
    const recommendationMatches = content.match(/Recommendation:/gi) || [];
    console.log(`✅ Found ${recommendationMatches.length} recommendations`);
    
    // Check for fixed code examples
    const fixedCodeMatches = content.match(/Fixed Code:/gi) || [];
    console.log(`✅ Found ${fixedCodeMatches.length} fixed code examples`);
    
    // Parse with our parser to see what it extracts
    const { parseDeepWikiResponse } = require('./src/standard/deepwiki/services/deepwiki-response-parser');
    const parsed = parseDeepWikiResponse(content);
    
    console.log(`\n=== PARSED ISSUES (${parsed.issues.length} total) ===\n`);
    
    parsed.issues.forEach((issue: any, index: number) => {
      console.log(`${index + 1}. [${issue.severity.toUpperCase()}] ${issue.title}`);
      console.log(`   File: ${issue.location.file}, Line: ${issue.location.line}`);
      console.log(`   Has code snippet: ${issue.codeSnippet ? 'YES' : 'NO'}`);
      console.log(`   Has recommendation: ${issue.recommendation ? 'YES' : 'NO'}`);
      console.log(`   Has suggestion: ${issue.suggestion ? 'YES' : 'NO'}`);
      
      if (issue.codeSnippet) {
        console.log(`   Code Snippet: ${issue.codeSnippet.substring(0, 50)}...`);
      }
      if (issue.recommendation) {
        console.log(`   Recommendation: ${issue.recommendation.substring(0, 80)}...`);
      }
      console.log('');
    });

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testDeepWikiFullResponse().catch(console.error);