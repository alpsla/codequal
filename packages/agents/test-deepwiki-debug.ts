/**
 * Debug script to check what DeepWiki is actually returning
 */

import axios from 'axios';

async function debugDeepWikiResponse() {
  console.log('🔍 Debugging DeepWiki Response...\n');
  
  const response = await axios.post(
    'http://localhost:8001/chat/completions/stream',
    {
      repo_url: 'https://github.com/sindresorhus/ky',
      branch: 'main',
      messages: [{
        role: 'system',
        content: `You are a code analysis expert. Analyze the repository for issues.
Return response in JSON format with this structure:
{
  "issues": [{"title": "...", "severity": "...", "category": "...", "file": "path/to/file.ts", "line": 123, ...}],
  "testCoverage": {"overall": 70},
  "dependencies": {...},
  "teamMetrics": {...},
  "documentation": {...}
}`
      }, {
        role: 'user',
        content: 'Find code issues with exact file paths and line numbers'
      }],
      stream: false,
      provider: 'openrouter',
      model: 'openai/gpt-4o-mini',
      temperature: 0.1,
      max_tokens: 2000,
      response_format: { type: 'json' }
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer dw-key-e48329b6c05b4a36a18d65af21ac3c2f'
      },
      timeout: 60000
    }
  );
  
  console.log('Response type:', typeof response.data);
  console.log('Response length:', response.data.length);
  console.log('First 500 chars:', response.data.substring(0, 500));
  
  if (typeof response.data === 'string') {
    try {
      const parsed = JSON.parse(response.data);
      console.log('Parsed JSON structure:');
      console.log('- Has issues:', !!parsed.issues);
      console.log('- Issue count:', parsed.issues?.length || 0);
      
      if (parsed.issues && parsed.issues.length > 0) {
        console.log('\nFirst issue structure:');
        const firstIssue = parsed.issues[0];
        console.log(JSON.stringify(firstIssue, null, 2));
        
        console.log('\nLocation data check:');
        console.log('- Has file:', !!firstIssue.file);
        console.log('- Has line:', !!firstIssue.line);
        console.log('- Has location:', !!firstIssue.location);
        console.log('- File value:', firstIssue.file);
        console.log('- Line value:', firstIssue.line);
      }
    } catch (e) {
      console.log('Failed to parse as JSON:', e.message);
      // Try to extract JSON from the response
      const jsonMatch = response.data.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const extracted = JSON.parse(jsonMatch[0]);
          console.log('\nExtracted JSON successfully!');
          if (extracted.issues && extracted.issues[0]) {
            console.log('First issue:', JSON.stringify(extracted.issues[0], null, 2));
          }
        } catch (e2) {
          console.log('Failed to extract JSON:', e2.message);
        }
      }
    }
  } else {
    console.log('Response is already an object');
    if (response.data.issues && response.data.issues.length > 0) {
      console.log('\nFirst issue:');
      console.log(JSON.stringify(response.data.issues[0], null, 2));
    }
  }
}

debugDeepWikiResponse().catch(console.error);