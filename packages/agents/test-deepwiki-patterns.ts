/**
 * Test script to understand DeepWiki response patterns
 */

import axios from 'axios';

async function testDeepWikiPatterns() {
  console.log('🔍 Testing DeepWiki Response Patterns\n');
  
  const testPrompts = [
    {
      name: 'JSON Request',
      prompt: 'Analyze this repo and return 3 issues in JSON format with file and line fields',
      format: { type: 'json' as const }
    },
    {
      name: 'Structured Text',
      prompt: 'Find 3 issues. Format: File: <path>, Line: <number>, Issue: <description>',
      format: undefined
    },
    {
      name: 'Markdown List',
      prompt: 'List 3 issues as markdown:\n- File: path/to/file\n- Line: number\n- Issue: description',
      format: undefined
    }
  ];
  
  for (const test of testPrompts) {
    console.log(`\n=== Test: ${test.name} ===`);
    
    try {
      const response = await axios.post(
        'http://localhost:8001/chat/completions/stream',
        {
          repo_url: 'https://github.com/sindresorhus/is-odd',
          messages: [{
            role: 'user',
            content: test.prompt
          }],
          stream: false,
          provider: 'openrouter',
          model: 'openai/gpt-4o-mini',
          temperature: 0.1,
          max_tokens: 1000,
          ...(test.format && { response_format: test.format })
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000
        }
      );
      
      const data = response.data;
      console.log('Response Type:', typeof data);
      
      if (typeof data === 'string') {
        console.log('Response (first 500 chars):');
        console.log(data.substring(0, 500));
        
        // Test our patterns
        const patterns = [
          /File:\s*([^\n,]+),?\s*Line:\s*(\d+)/gi,
          /\*\*File Path:\s*([^\*\n]+)\*\*.*?Line\s*(\d+)/gi,
          /`([^`]+\.[tj]sx?)`.*?line\s*(\d+)/gi,
          /([a-zA-Z0-9\/_-]+\.[tj]sx?):\s*(\d+)/g
        ];
        
        console.log('\nPattern Matches:');
        patterns.forEach((pattern, idx) => {
          const matches = [...data.matchAll(pattern)];
          if (matches.length > 0) {
            console.log(`  Pattern ${idx + 1}: Found ${matches.length} matches`);
            console.log(`    Example: File="${matches[0][1]}", Line=${matches[0][2]}`);
          }
        });
      } else {
        console.log('Response (JSON):');
        console.log(JSON.stringify(data, null, 2).substring(0, 500));
      }
      
    } catch (error: any) {
      console.log('Error:', error.message);
      if (error.response?.data) {
        console.log('Error Response:', error.response.data);
      }
    }
  }
}

// Test with mock data to understand format
function testPatternMatching() {
  console.log('\n=== Testing Pattern Matching ===\n');
  
  const sampleResponses = [
    `1. **Memory leak in test file**
     File: test/index.js, Line: 42
     The test doesn't properly clean up resources`,
    
    `Issues found:
     - File Path: src/utils.ts
       Line 15: Unused variable 'config'
     - test/main.test.js:27 - Missing error handling`,
    
    `**File Path: lib/validator.js**
     **Line 88**: Potential XSS vulnerability in input validation`
  ];
  
  const pattern = /(?:File(?:\s+Path)?:?\s*|^|\s)([a-zA-Z0-9\/_.-]+\.[tj]sx?)(?:[,:\s]+Line:?\s*(\d+))?/gi;
  
  sampleResponses.forEach((response, idx) => {
    console.log(`Sample ${idx + 1}:`);
    const matches = [...response.matchAll(pattern)];
    matches.forEach(match => {
      console.log(`  File: ${match[1]}, Line: ${match[2] || 'not found'}`);
    });
  });
}

// Run tests
testPatternMatching();
testDeepWikiPatterns().catch(console.error);