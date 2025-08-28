#!/usr/bin/env npx ts-node
/**
 * Test different DeepWiki endpoints and API parameters
 */

import axios from 'axios';
import { loadEnvironment } from './src/standard/utils/env-loader';

async function testDeepWikiEndpoints() {
  console.log('🔍 Testing DeepWiki API Endpoints and Parameters\n');
  console.log('=' .repeat(70) + '\n');
  
  loadEnvironment();
  
  const baseUrl = process.env.DEEPWIKI_API_URL || 'http://localhost:8001';
  const apiKey = process.env.DEEPWIKI_API_KEY || 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f';
  const testRepo = 'https://github.com/sindresorhus/is-odd';
  
  // Different endpoint configurations to test
  const endpointTests = [
    {
      name: 'Standard Chat Completions',
      endpoint: '/chat/completions/stream',
      payload: {
        repo_url: testRepo,
        messages: [{
          role: 'user',
          content: 'Analyze repository for security issues. Return JSON format.'
        }],
        stream: false,
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 2000
      }
    },
    {
      name: 'System Message Approach',
      endpoint: '/chat/completions/stream',
      payload: {
        repo_url: testRepo,
        messages: [
          {
            role: 'system',
            content: 'You are a security analyzer. Always respond with valid JSON format. Never include explanatory text.'
          },
          {
            role: 'user',
            content: 'Analyze this repository and return security issues as JSON: {"issues": [{"file": "path", "line": 1, "issue": "description"}]}'
          }
        ],
        stream: false,
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini',
        temperature: 0.0,
        max_tokens: 2000
      }
    },
    {
      name: 'Response Format Parameter',
      endpoint: '/chat/completions/stream',
      payload: {
        repo_url: testRepo,
        messages: [{
          role: 'user',
          content: 'Analyze repository for security issues.'
        }],
        stream: false,
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini',
        temperature: 0.0,
        response_format: { type: 'json_object' }, // OpenAI JSON mode
        max_tokens: 2000
      }
    },
    {
      name: 'Alternative Analyze Endpoint',
      endpoint: '/analyze',
      payload: {
        repository_url: testRepo,
        analysis_type: 'security',
        output_format: 'json'
      }
    },
    {
      name: 'Code Analysis Endpoint',
      endpoint: '/code/analyze',
      payload: {
        repo: testRepo,
        branch: 'main',
        format: 'structured'
      }
    },
    {
      name: 'Security Scan Endpoint',
      endpoint: '/security/scan',
      payload: {
        url: testRepo,
        detailed: true,
        format: 'json'
      }
    },
    {
      name: 'Repository Insights',
      endpoint: '/repository/insights',
      payload: {
        repo_url: testRepo,
        include_code: true,
        structured_output: true
      }
    },
    {
      name: 'With Tool/Function Calling',
      endpoint: '/chat/completions/stream',
      payload: {
        repo_url: testRepo,
        messages: [{
          role: 'user',
          content: 'Use the analyze_code function to scan this repository'
        }],
        tools: [
          {
            type: 'function',
            function: {
              name: 'analyze_code',
              description: 'Analyze code for security issues',
              parameters: {
                type: 'object',
                properties: {
                  issues: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        file: { type: 'string' },
                        line: { type: 'number' },
                        severity: { type: 'string' },
                        description: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        ],
        tool_choice: 'auto',
        stream: false,
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini',
        temperature: 0.0
      }
    }
  ];
  
  // Test each endpoint configuration
  for (const test of endpointTests) {
    console.log(`\n🔌 Testing: ${test.name}`);
    console.log(`Endpoint: ${test.endpoint}`);
    console.log('-'.repeat(70));
    
    try {
      const response = await axios.post(
        `${baseUrl}${test.endpoint}`,
        test.payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json' // Explicitly request JSON
          },
          timeout: 20000,
          validateStatus: () => true // Don't throw on any status
        }
      );
      
      console.log(`Status: ${response.status}`);
      
      if (response.status === 404) {
        console.log('❌ Endpoint not found');
      } else if (response.status === 200 || response.status === 201) {
        const data = response.data;
        console.log('Response type:', typeof data);
        
        if (typeof data === 'object') {
          console.log('✅ Received structured data!');
          console.log('Keys:', Object.keys(data));
          
          // Check for various response structures
          if (data.choices) {
            console.log('Has choices array (OpenAI format)');
            if (data.choices[0]?.message?.tool_calls) {
              console.log('Has tool calls!');
              console.log('Tool response:', JSON.stringify(data.choices[0].message.tool_calls[0], null, 2));
            }
          }
          if (data.issues || data.vulnerabilities || data.results) {
            console.log('Has issues/vulnerabilities/results array!');
            const items = data.issues || data.vulnerabilities || data.results;
            console.log(`Found ${items.length} items`);
          }
          
          console.log('Sample:', JSON.stringify(data, null, 2).substring(0, 300));
        } else if (typeof data === 'string') {
          console.log('❌ Received string response');
          
          // Try to find JSON in the string
          const jsonMatches = data.match(/\{[\s\S]*\}/g);
          if (jsonMatches) {
            for (const match of jsonMatches) {
              try {
                const parsed = JSON.parse(match);
                console.log('Found embedded JSON with keys:', Object.keys(parsed));
                break;
              } catch {}
            }
          }
          
          console.log('Preview:', data.substring(0, 200));
        }
      } else {
        console.log(`Unexpected status: ${response.status}`);
        console.log('Response:', response.data);
      }
      
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        console.log('❌ Connection refused - endpoint not available');
      } else {
        console.log('❌ Error:', error.message);
      }
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n' + '=' .repeat(70));
  console.log('\n🎯 ENDPOINT ANALYSIS:\n');
  console.log('Key findings:');
  console.log('1. Main endpoint is /chat/completions/stream');
  console.log('2. Alternative endpoints likely don\'t exist (404s)');
  console.log('3. Response format parameter might work with newer models');
  console.log('4. System messages could help enforce format');
  console.log('5. Tool/function calling might provide structured output');
}

testDeepWikiEndpoints().catch(console.error);