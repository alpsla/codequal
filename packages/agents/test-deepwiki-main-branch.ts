/**
 * Test DeepWiki main branch analysis directly
 */

import axios from 'axios';
import { loadEnvironment } from './src/standard/utils/env-loader';

loadEnvironment();

async function testMainBranch() {
  console.log('🔍 Testing DeepWiki Main Branch Analysis\n');
  
  const deepwikiUrl = process.env.DEEPWIKI_API_URL || 'http://localhost:8001';
  
  const prompt = `Analyze the ky repository (https://github.com/sindresorhus/ky) for code quality and security issues.
Find at least 10 issues covering:
- Security vulnerabilities (XSS, injection, etc.)
- Performance issues
- Error handling problems
- Code quality issues
- Best practice violations

For each issue provide:
1. Issue title/description
2. Severity (critical/high/medium/low)
3. Category (security/performance/quality/etc)
4. File path
5. Line number (approximate is ok)
6. Code snippet showing the issue

Format each issue like:
Issue: [title]
Severity: [level]
Category: [type]
File: [path]
Line: [number]
Code:
\`\`\`
[actual code snippet]
\`\`\``;

  try {
    console.log('🚀 Calling DeepWiki API...');
    const response = await axios.post(
      `${deepwikiUrl}/chat/completions/stream`,
      {
        repo_url: 'https://github.com/sindresorhus/ky',
        messages: [{
          role: 'user',
          content: prompt
        }],
        stream: false,
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 3000
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000
      }
    );
    
    console.log('✅ Response received\n');
    console.log('Response type:', typeof response.data);
    
    if (typeof response.data === 'string') {
      console.log('\n📄 Raw response (first 2000 chars):');
      console.log('----------------------------------------');
      console.log(response.data.substring(0, 2000));
      console.log('----------------------------------------\n');
      
      // Count issues found
      const issueMatches = response.data.match(/Issue:/gi);
      const severityMatches = response.data.match(/Severity:/gi);
      const fileMatches = response.data.match(/File:/gi);
      
      console.log('📊 Response Analysis:');
      console.log(`  Issues found: ${issueMatches ? issueMatches.length : 0}`);
      console.log(`  Severities: ${severityMatches ? severityMatches.length : 0}`);
      console.log(`  Files: ${fileMatches ? fileMatches.length : 0}`);
      
    } else {
      console.log('📦 JSON response:', JSON.stringify(response.data, null, 2));
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    if (error.code === 'ECONNREFUSED') {
      console.log('\n⚠️  DeepWiki is not running. Start it with:');
      console.log('kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001');
    }
  }
}

testMainBranch().catch(console.error);