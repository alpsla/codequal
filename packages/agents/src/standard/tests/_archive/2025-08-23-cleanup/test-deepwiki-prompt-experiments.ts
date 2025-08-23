#!/usr/bin/env ts-node

/**
 * DeepWiki Prompt Experiments
 * 
 * Testing different prompts to get DeepWiki to return actual code snippets
 */

import axios from 'axios';

const DEEPWIKI_API_URL = process.env.DEEPWIKI_API_URL || 'http://localhost:8001';
const DEEPWIKI_API_KEY = process.env.DEEPWIKI_API_KEY || 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f';

async function testDeepWikiPrompt(promptVersion: string, prompt: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing Prompt Version: ${promptVersion}`);
  console.log(`${'='.repeat(80)}\n`);
  
  try {
    const requestPayload = {
      repo_url: 'https://github.com/sindresorhus/ky',  // Using ky repo for testing
      messages: [{
        role: 'user',
        content: prompt
      }],
      stream: false,
      provider: 'openrouter',
      model: 'openai/gpt-4o-mini',
      temperature: 0.1,
      max_tokens: 4000
    };

    console.log('📤 Sending request to DeepWiki...');
    const response = await axios.post(
      `${DEEPWIKI_API_URL}/chat/completions/stream`,
      requestPayload,
      {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPWIKI_API_KEY}`
        },
        timeout: 60000
      }
    );

    console.log('📥 Response received');
    
    // Parse response
    let parsedResponse: any;
    if (typeof response.data === 'string') {
      // Try to extract JSON from the response
      const jsonMatch = response.data.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[1]);
      } else {
        // Try direct parse
        parsedResponse = JSON.parse(response.data);
      }
    } else {
      parsedResponse = response.data;
    }

    // Check if we got code snippets
    const issues = parsedResponse.issues || [];
    let snippetCount = 0;
    let exampleSnippet = null;
    
    for (const issue of issues) {
      if (issue.codeSnippet || issue.code || issue.snippet) {
        snippetCount++;
        if (!exampleSnippet) {
          exampleSnippet = issue.codeSnippet || issue.code || issue.snippet;
        }
      }
    }

    console.log(`\n✅ Found ${issues.length} issues`);
    console.log(`📝 ${snippetCount} issues have code snippets (${Math.round(snippetCount/issues.length*100)}%)`);
    
    if (exampleSnippet) {
      console.log('\n📌 Example code snippet:');
      console.log('---');
      console.log(exampleSnippet);
      console.log('---');
    } else {
      console.log('\n❌ No code snippets found in response');
    }

    // Show first issue structure
    if (issues.length > 0) {
      console.log('\n📊 First issue structure:');
      console.log(JSON.stringify(issues[0], null, 2));
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('Response data:', error.response.data);
    }
  }
}

async function main() {
  console.log('🧪 DeepWiki Prompt Experiments');
  console.log('Testing different prompts to get code snippets...\n');

  // Prompt 1: Explicit code snippet request
  await testDeepWikiPrompt('V1 - Explicit Code Request', `
    Analyze this repository for code quality issues. Find at least 3-5 issues.
    
    FOR EACH ISSUE YOU MUST INCLUDE:
    1. The exact code snippet showing the problematic code (3-5 lines with context)
    2. File path and line number
    3. Severity and category
    
    Return as JSON with this EXACT structure:
    {
      "issues": [
        {
          "id": "issue-1",
          "severity": "high",
          "category": "security",
          "title": "Issue title",
          "description": "Description",
          "location": {
            "file": "exact/path/to/file.js",
            "line": 42
          },
          "codeSnippet": "// Line 41\\nconst password = 'hardcoded';  // Line 42 - THE ISSUE\\n// Line 43",
          "suggestion": "How to fix"
        }
      ]
    }
    
    IMPORTANT: The codeSnippet field MUST contain the actual code from the repository, not examples!
  `);

  // Prompt 2: Context-focused request
  await testDeepWikiPrompt('V2 - Context and Evidence', `
    Analyze this repository and find code quality issues.
    
    For each issue, provide:
    - The ACTUAL CODE from the repository showing the issue (not examples)
    - Include 2-3 lines before and after for context
    - Exact file path and line numbers
    
    Format each issue with these fields:
    {
      "title": "...",
      "location": { "file": "...", "line": X },
      "codeSnippet": "THE ACTUAL CODE FROM THE FILE",
      "evidence": "Quote the exact problematic line",
      "suggestion": "..."
    }
    
    Show me the real code, not hypothetical examples.
  `);

  // Prompt 3: RAG-style extraction
  await testDeepWikiPrompt('V3 - RAG Extraction Style', `
    Task: Code quality analysis with evidence extraction
    
    Instructions:
    1. Scan the repository for issues
    2. For each issue found, EXTRACT the relevant code directly from the source files
    3. Include the extracted code in a "codeSnippet" field
    
    Requirements:
    - codeSnippet MUST be copied directly from the repository files
    - Include line numbers in comments
    - Show 3-5 lines of context around the issue
    
    Example format (but use REAL code from the repo):
    {
      "issue": "Hardcoded credentials",
      "file": "src/config.js",
      "line": 15,
      "codeSnippet": "// Line 14: function connect() {\\n// Line 15:   const apiKey = 'sk-1234'; // <-- ISSUE HERE\\n// Line 16:   return api.init(apiKey);"
    }
  `);

  // Prompt 4: Step-by-step instruction
  await testDeepWikiPrompt('V4 - Step by Step', `
    Perform a code review following these steps:
    
    STEP 1: Identify an issue in the code
    STEP 2: Locate the exact file and line number
    STEP 3: Copy the problematic code snippet (3-5 lines)
    STEP 4: Format as JSON
    
    For the codeSnippet field:
    - COPY AND PASTE the actual code from the file
    - Do NOT write example code
    - Do NOT write hypothetical code
    - ONLY use code that exists in the repository
    
    If you cannot access the actual code, set codeSnippet to null.
  `);

  // Prompt 5: With embeddings hint
  await testDeepWikiPrompt('V5 - Embeddings Reference', `
    Use your embedded knowledge of this repository to analyze code issues.
    
    When you identify an issue:
    1. Reference the specific code from your embeddings
    2. Quote the exact lines that demonstrate the problem
    3. Include surrounding context (2-3 lines before/after)
    
    Return JSON with:
    - "codeSnippet": The verbatim code from the repository (not examples)
    - "extractedFrom": The file path where this code exists
    - "lineRange": The line numbers included in the snippet
    
    Your embeddings contain the actual repository code - use it!
  `);

  console.log('\n' + '='.repeat(80));
  console.log('🏁 All prompt experiments completed');
  console.log('='.repeat(80));
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}