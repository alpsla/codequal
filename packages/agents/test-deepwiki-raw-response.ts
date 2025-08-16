#!/usr/bin/env npx ts-node
/**
 * Test script to see raw DeepWiki response
 */

import axios from 'axios';
import { PRIORITY_BASED_STRATEGY } from './src/standard/deepwiki/config/optimized-prompts';

async function testDeepWikiRaw() {
  const config = {
    apiUrl: 'http://localhost:8001',
    apiKey: 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f'
  };

  const repoUrl = 'https://github.com/sindresorhus/ky';
  const branch = 'main';

  console.log('🔍 Testing DeepWiki raw response...\n');

  try {
    // Create a focused prompt that explicitly asks for file locations
    const prompt = `Analyze the repository ${repoUrl} (branch: ${branch}) for code quality issues.

For EACH issue found, you MUST provide:
- File: exact/path/to/file.ts
- Line: exact line number (e.g., Line: 45)

Example format:
1. **Security Issue**: SQL Injection vulnerability
   File: src/api/users.ts, Line: 45
   Description: User input not sanitized in database query

Find at least 5 issues with EXACT file paths and line numbers from the actual repository code.`;

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
        max_tokens: 2000
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
    console.log(typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2));
    console.log('\n=== END OF RESPONSE ===\n');

    // Now test our parser
    if (typeof response.data === 'string') {
      const { parseDeepWikiResponse } = require('./src/standard/deepwiki/services/deepwiki-response-parser');
      const parsed = parseDeepWikiResponse(response.data);
      
      console.log('\n=== PARSED ISSUES ===\n');
      console.log(`Found ${parsed.issues.length} issues:\n`);
      
      parsed.issues.forEach((issue: any, index: number) => {
        console.log(`${index + 1}. [${issue.severity.toUpperCase()}] ${issue.title}`);
        console.log(`   File: ${issue.location.file}, Line: ${issue.location.line}`);
        console.log(`   ${issue.description}\n`);
      });
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testDeepWikiRaw().catch(console.error);