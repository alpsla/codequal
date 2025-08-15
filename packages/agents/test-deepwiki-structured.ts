#!/usr/bin/env npx ts-node
/**
 * Test DeepWiki API with different parameters to get structured issues
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

async function testDeepWikiStructured() {
  console.log('🔍 Testing DeepWiki API for Structured Response\n');
  console.log('==============================================\n');
  
  const apiUrl = process.env.DEEPWIKI_API_URL || 'http://localhost:8001';
  const apiKey = process.env.DEEPWIKI_API_KEY || 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f';
  
  const repoUrl = 'https://github.com/sindresorhus/ky';
  
  // Test different prompts to get structured output
  const prompts = [
    {
      name: 'Structured JSON Request',
      content: `Analyze this repository and return a JSON array of issues with the following structure:
{
  "issues": [
    {
      "id": "unique-id",
      "severity": "critical|high|medium|low",
      "category": "security|performance|code-quality",
      "title": "Short title",
      "description": "Detailed description",
      "location": {
        "file": "path/to/file.ts",
        "line": 123,
        "column": 45
      },
      "codeSnippet": "problematic code",
      "recommendation": "How to fix"
    }
  ]
}

Focus on finding actual code issues with specific file locations.`
    },
    {
      name: 'Code Issues Request',
      content: 'List all code quality issues, security vulnerabilities, and performance problems in this repository. For each issue, provide: file path, line number, severity, category, and a fix recommendation. Format as JSON.'
    },
    {
      name: 'Vulnerability Scan',
      content: 'Perform a vulnerability scan and return results as structured JSON with file paths and line numbers'
    }
  ];
  
  for (const prompt of prompts) {
    console.log(`\n📝 Testing: ${prompt.name}\n`);
    console.log('-------------------------------------------\n');
    
    try {
      const response = await axios.post(
        `${apiUrl}/chat/completions/stream`,
        {
          repo_url: repoUrl,
          messages: [{
            role: "user",
            content: prompt.content
          }],
          stream: false,
          provider: "openrouter",
          model: "openai/gpt-4o",
          temperature: 0.1,
          max_tokens: 4000,
          response_format: { type: "json_object" }  // Try to force JSON response
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey
          },
          timeout: 60000
        }
      );
      
      console.log('✅ Response received\n');
      
      // Save response
      const outputDir = path.join(__dirname, 'test-outputs', 'debug');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = prompt.name.toLowerCase().replace(/\s+/g, '-');
      const outputFile = path.join(outputDir, `deepwiki-${fileName}-${timestamp}.json`);
      
      fs.writeFileSync(outputFile, JSON.stringify(response.data, null, 2));
      console.log(`💾 Saved to: ${outputFile}\n`);
      
      // Check if response is structured
      const data = response.data;
      
      // Check if it's plain text
      if (typeof data === 'string') {
        console.log('⚠️  Response is plain text, not structured\n');
        console.log('Preview:', data.substring(0, 200), '...\n');
        
        // Try to parse if it contains JSON
        const jsonMatch = data.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            console.log('✨ Found embedded JSON!');
            console.log('Structure:', Object.keys(parsed));
            if (parsed.issues) {
              console.log(`Issues count: ${parsed.issues.length}`);
            }
          } catch (e) {
            console.log('Could not parse embedded JSON');
          }
        }
      } else if (data.choices && data.choices[0]) {
        // OpenAI format response
        const content = data.choices[0].message?.content || data.choices[0].text;
        console.log('📦 OpenAI format response\n');
        
        if (typeof content === 'string') {
          console.log('Content preview:', content.substring(0, 200), '...\n');
          
          // Try to parse content as JSON
          try {
            const parsed = JSON.parse(content);
            console.log('✨ Content is valid JSON!');
            console.log('Structure:', Object.keys(parsed));
            if (parsed.issues) {
              console.log(`Issues count: ${parsed.issues.length}`);
              
              // Check first issue structure
              if (parsed.issues[0]) {
                console.log('First issue keys:', Object.keys(parsed.issues[0]));
                console.log('First issue location:', parsed.issues[0].location);
              }
            }
          } catch (e) {
            console.log('Content is not JSON');
            
            // Try to extract JSON from markdown code blocks
            const codeBlockMatch = content.match(/```json\n([\s\S]*?)\n```/);
            if (codeBlockMatch) {
              try {
                const parsed = JSON.parse(codeBlockMatch[1]);
                console.log('✨ Found JSON in code block!');
                console.log('Structure:', Object.keys(parsed));
              } catch (e2) {
                console.log('Could not parse code block JSON');
              }
            }
          }
        }
      } else if (data.issues) {
        console.log('🎉 Direct issues array found!');
        console.log(`Issues count: ${data.issues.length}`);
        if (data.issues[0]) {
          console.log('First issue structure:', Object.keys(data.issues[0]));
        }
      }
      
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', JSON.stringify(error.response.data, null, 2).substring(0, 500));
      }
    }
  }
  
  // Also test different endpoints
  console.log('\n\n🔍 Testing Alternative Endpoints\n');
  console.log('==================================\n');
  
  const endpoints = [
    '/analyze',
    '/api/analyze',
    '/scan',
    '/api/scan',
    '/issues',
    '/api/issues'
  ];
  
  for (const endpoint of endpoints) {
    console.log(`Testing ${endpoint}...`);
    try {
      const response = await axios.post(
        `${apiUrl}${endpoint}`,
        {
          repo_url: repoUrl,
          branch: 'main',
          format: 'json'
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey
          },
          timeout: 5000
        }
      );
      
      console.log(`✅ ${endpoint} works! Response keys:`, Object.keys(response.data));
      
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log(`❌ ${endpoint} not found (404)`);
      } else {
        console.log(`❌ ${endpoint} error:`, error.response?.status || error.message);
      }
    }
  }
}

// Run the test
testDeepWikiStructured().catch(console.error);