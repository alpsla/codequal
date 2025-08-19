/**
 * Research script to test different DeepWiki output formats
 */

import axios from 'axios';
import * as fs from 'fs';

const DEEPWIKI_URL = process.env.DEEPWIKI_API_URL || 'http://localhost:8001';
const DEEPWIKI_KEY = process.env.DEEPWIKI_API_KEY || '';

interface TestCase {
  name: string;
  params: any;
  prompt?: string;
}

async function testDeepWikiFormat(testCase: TestCase) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing: ${testCase.name}`);
  console.log(`${'='.repeat(80)}`);
  
  try {
    const response = await axios.post(
      `${DEEPWIKI_URL}/chat/completions/stream`,
      {
        repo_url: 'https://github.com/sindresorhus/ky', // Valid repo for testing
        messages: [{
          role: 'user',
          content: testCase.prompt || 'Find code issues in this repository'
        }],
        stream: false,
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 2000,
        ...testCase.params // Additional parameters to test
      },
      {
        headers: {
          'Content-Type': 'application/json',
          ...(DEEPWIKI_KEY && { 'Authorization': `Bearer ${DEEPWIKI_KEY}` })
        },
        timeout: 30000
      }
    );
    
    const responseData = response.data;
    const responseType = typeof responseData;
    
    console.log(`Response Type: ${responseType}`);
    console.log(`Response Length: ${JSON.stringify(responseData).length} chars`);
    
    // Save response for analysis
    const filename = `deepwiki-test-${testCase.name.replace(/\s+/g, '-').toLowerCase()}.txt`;
    fs.writeFileSync(filename, JSON.stringify(responseData, null, 2));
    console.log(`Saved to: ${filename}`);
    
    // Analyze response structure
    if (responseType === 'object') {
      console.log('Response Keys:', Object.keys(responseData));
      if (responseData.choices) {
        console.log('Has choices array');
        if (responseData.choices[0]) {
          console.log('First choice keys:', Object.keys(responseData.choices[0]));
          if (responseData.choices[0].message) {
            console.log('Message keys:', Object.keys(responseData.choices[0].message));
          }
        }
      }
      if (responseData.issues) {
        console.log(`Has issues array with ${responseData.issues.length} items`);
      }
    }
    
    // Show sample of response
    console.log('\nFirst 500 chars of response:');
    console.log(JSON.stringify(responseData).substring(0, 500));
    
  } catch (error: any) {
    console.log(`ERROR: ${error.message}`);
    if (error.response) {
      console.log('Error response:', error.response.data);
    }
  }
}

async function runTests() {
  console.log('🔍 Researching DeepWiki Output Format Options\n');
  
  const testCases: TestCase[] = [
    // Test 1: Default format
    {
      name: 'Default Format',
      params: {}
    },
    
    // Test 2: Request JSON explicitly
    {
      name: 'JSON Format Request',
      params: {
        response_format: { type: 'json' }
      },
      prompt: 'Analyze this repository and return results in JSON format with keys: issues, testCoverage, dependencies'
    },
    
    // Test 3: System message for JSON
    {
      name: 'System Message JSON',
      params: {
        messages: [
          {
            role: 'system',
            content: 'You are a code analyzer. Always return responses in valid JSON format.'
          },
          {
            role: 'user',
            content: 'Analyze this repository and return: {"issues": [...], "testCoverage": {...}, "dependencies": {...}}'
          }
        ]
      }
    },
    
    // Test 4: Output format parameter
    {
      name: 'Output Format Parameter',
      params: {
        output_format: 'json'
      }
    },
    
    // Test 5: Format in prompt
    {
      name: 'Format in Prompt',
      params: {},
      prompt: `Analyze this repository. 
      
      IMPORTANT: Return ONLY valid JSON in this exact format:
      {
        "issues": [
          {"title": "...", "severity": "...", "file": "...", "line": 0}
        ],
        "testCoverage": {"overall": 0},
        "dependencies": {"outdated": []}
      }`
    },
    
    // Test 6: Response mode
    {
      name: 'Response Mode Structured',
      params: {
        response_mode: 'structured'
      }
    },
    
    // Test 7: Different model with JSON mode
    {
      name: 'GPT-4 with JSON',
      params: {
        model: 'openai/gpt-4-turbo',
        response_format: { type: 'json_object' }
      },
      prompt: 'Return a JSON object with code issues found in this repository'
    },
    
    // Test 8: Tool/Function calling format
    {
      name: 'Function Calling Format',
      params: {
        functions: [{
          name: 'report_issues',
          description: 'Report code issues',
          parameters: {
            type: 'object',
            properties: {
              issues: { type: 'array' },
              testCoverage: { type: 'object' },
              dependencies: { type: 'object' }
            }
          }
        }],
        function_call: { name: 'report_issues' }
      }
    },
    
    // Test 9: Stream with JSON
    {
      name: 'Stream JSON Lines',
      params: {
        stream: true,
        stream_format: 'jsonl'
      }
    },
    
    // Test 10: Custom headers
    {
      name: 'Accept JSON Header',
      params: {
        headers: {
          'Accept': 'application/json'
        }
      }
    }
  ];
  
  // Run tests sequentially
  for (const testCase of testCases) {
    await testDeepWikiFormat(testCase);
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ Testing complete! Check the generated files for detailed responses.');
  console.log('='.repeat(80));
}

// Run the tests
runTests().catch(console.error);