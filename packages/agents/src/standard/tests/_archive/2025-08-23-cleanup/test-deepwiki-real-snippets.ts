#!/usr/bin/env ts-node

/**
 * Test DeepWiki with prompts designed to extract real code snippets
 */

import axios from 'axios';

const DEEPWIKI_API_URL = process.env.DEEPWIKI_API_URL || 'http://localhost:8001';
const DEEPWIKI_API_KEY = process.env.DEEPWIKI_API_KEY || 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f';

async function testRealCodeExtraction() {
  console.log('🔍 Testing DeepWiki Real Code Snippet Extraction\n');
  
  const requestPayload = {
    repo_url: 'https://github.com/sindresorhus/ky',
    pr_number: 700,  // Test with PR 700
    messages: [{
      role: 'user',
      content: `Analyze pull request #700 in the ky repository. Focus on code quality issues.

IMPORTANT INSTRUCTIONS FOR CODE SNIPPETS:
1. You have access to the actual repository code through RAG embeddings
2. When reporting an issue, QUOTE THE EXACT CODE from the repository
3. Use your knowledge base to extract the actual lines of code
4. Do NOT create example code - only use what exists in the files

For each issue, provide this JSON structure:
{
  "issues": [
    {
      "id": "unique-id",
      "severity": "critical|high|medium|low",
      "category": "security|performance|code-quality",
      "title": "Issue title",
      "description": "Detailed description",
      "location": {
        "file": "path/to/actual/file.ts",
        "line": <actual line number>,
        "column": <column if known>
      },
      "codeSnippet": "<PASTE THE ACTUAL CODE HERE FROM THE REPOSITORY>\\n<Include 3-5 lines for context>\\n<Mark the problematic line with a comment>",
      "evidence": "Quote the specific problematic code",
      "suggestion": "How to fix",
      "remediation": "Example of fixed code"
    }
  ],
  "scores": {
    "overall": 75,
    "security": 80,
    "performance": 70,
    "maintainability": 75
  },
  "metadata": {
    "timestamp": "${new Date().toISOString()}",
    "repository": "https://github.com/sindresorhus/ky",
    "pr_number": 700,
    "files_analyzed": 50
  }
}

Remember: Extract REAL code from the ky repository, not examples!`
    }],
    stream: false,
    provider: 'openrouter',
    model: 'openai/gpt-4o-mini',
    temperature: 0.1,
    max_tokens: 4000
  };

  try {
    console.log('📤 Sending request to DeepWiki...');
    const startTime = Date.now();
    
    const response = await axios.post(
      `${DEEPWIKI_API_URL}/chat/completions/stream`,
      requestPayload,
      {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPWIKI_API_KEY}`
        },
        timeout: 120000
      }
    );

    const duration = Date.now() - startTime;
    console.log(`📥 Response received in ${duration}ms\n`);
    
    // Parse response
    let parsedResponse: any;
    if (typeof response.data === 'string') {
      // Handle markdown wrapped JSON
      const jsonMatch = response.data.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[1]);
      } else {
        // Try to find JSON in the response
        const lines = response.data.split('\n');
        let jsonStart = -1;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim().startsWith('{')) {
            jsonStart = i;
            break;
          }
        }
        if (jsonStart >= 0) {
          const jsonContent = lines.slice(jsonStart).join('\n');
          parsedResponse = JSON.parse(jsonContent);
        } else {
          parsedResponse = JSON.parse(response.data);
        }
      }
    } else {
      parsedResponse = response.data;
    }

    // Analyze the response
    const issues = parsedResponse.issues || [];
    console.log(`📊 Analysis Results:`);
    console.log(`   Total issues found: ${issues.length}`);
    
    let realSnippets = 0;
    let fakeSnippets = 0;
    let noSnippets = 0;
    
    for (const issue of issues) {
      const snippet = issue.codeSnippet || issue.code || issue.snippet;
      if (!snippet) {
        noSnippets++;
      } else if (snippet.includes('// THE ISSUE') || 
                 snippet.includes('hardcoded') || 
                 snippet.includes('example') ||
                 snippet.includes('Line 41') ||
                 snippet.includes('secret')) {
        fakeSnippets++;
      } else {
        realSnippets++;
      }
    }
    
    console.log(`   Issues with real code snippets: ${realSnippets}`);
    console.log(`   Issues with fake/example snippets: ${fakeSnippets}`);
    console.log(`   Issues without snippets: ${noSnippets}\n`);
    
    // Show examples
    if (issues.length > 0) {
      console.log('📝 Sample Issues:\n');
      
      for (let i = 0; i < Math.min(3, issues.length); i++) {
        const issue = issues[i];
        console.log(`Issue ${i + 1}: ${issue.title}`);
        console.log(`  File: ${issue.location?.file || 'unknown'}`);
        console.log(`  Line: ${issue.location?.line || 'unknown'}`);
        console.log(`  Severity: ${issue.severity}`);
        
        const snippet = issue.codeSnippet || issue.code || issue.snippet;
        if (snippet) {
          console.log(`  Code Snippet:`);
          console.log('  ```');
          snippet.split('\n').forEach((line: string) => {
            console.log(`  ${line}`);
          });
          console.log('  ```');
        } else {
          console.log(`  Code Snippet: [MISSING]`);
        }
        console.log();
      }
    }
    
    // Check if snippets look real
    if (realSnippets > 0) {
      console.log('✅ SUCCESS: DeepWiki returned real code snippets!');
    } else if (fakeSnippets > 0) {
      console.log('⚠️  WARNING: DeepWiki returned fake/example snippets');
      console.log('   The RAG system may not be preserving actual code');
    } else {
      console.log('❌ FAILURE: No code snippets returned');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
testRealCodeExtraction().catch(console.error);