#!/usr/bin/env npx ts-node
/**
 * Test different DeepWiki prompts to get structured JSON responses
 */

import axios from 'axios';
import { loadEnvironment } from './src/standard/utils/env-loader';

async function testStructuredPrompts() {
  console.log('🔬 Testing DeepWiki Structured Prompt Strategies\n');
  console.log('=' .repeat(70) + '\n');
  
  loadEnvironment();
  
  const deepwikiUrl = process.env.DEEPWIKI_API_URL || 'http://localhost:8001';
  const deepwikiKey = process.env.DEEPWIKI_API_KEY || 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f';
  
  // Test repository
  const testRepo = 'https://github.com/sindresorhus/is-odd';
  
  // Different prompt strategies to test
  const promptStrategies = [
    {
      name: 'JSON Format Request',
      prompt: `Analyze this repository for security and code quality issues. Return ONLY valid JSON in this exact format:
{
  "issues": [
    {
      "type": "security|performance|quality|style",
      "severity": "critical|high|medium|low",
      "title": "Issue description",
      "file": "exact/path/from/repo/root.js",
      "line": 123,
      "column": 45,
      "codeSnippet": "actual code from the file",
      "suggestion": "how to fix this issue"
    }
  ]
}
DO NOT include any text outside the JSON. Start with { and end with }.`
    },
    {
      name: 'Structured Template',
      prompt: `Analyze code issues. For each issue found, provide:
Issue #1:
TYPE: [security/performance/quality/style]
SEVERITY: [critical/high/medium/low]
FILE: [exact file path]
LINE: [line number]
CODE: [actual code snippet]
FIX: [suggested fix]
---
Issue #2:
[continue same format]`
    },
    {
      name: 'CSV Format',
      prompt: `Analyze repository and return issues in CSV format:
type,severity,file,line,title,snippet,fix
security,high,src/index.js,42,"SQL injection vulnerability","db.query(userInput)","Use parameterized queries"
[continue with more rows]`
    },
    {
      name: 'XML Format',
      prompt: `Analyze repository and return issues in XML format:
<analysis>
  <issue>
    <type>security</type>
    <severity>high</severity>
    <file>src/index.js</file>
    <line>42</line>
    <title>Issue description</title>
    <code>actual code snippet</code>
    <fix>suggested fix</fix>
  </issue>
</analysis>`
    },
    {
      name: 'Code Block Format',
      prompt: `Analyze repository. For each issue, provide a code block:
\`\`\`issue
type: security
severity: high
file: src/index.js
line: 42
title: SQL injection vulnerability
\`\`\`

\`\`\`javascript
// Line 42 in src/index.js
db.query(userInput); // vulnerable code
\`\`\`

\`\`\`fix
// Suggested fix:
db.query('SELECT * FROM users WHERE id = ?', [userId]);
\`\`\``
    },
    {
      name: 'Direct Command',
      prompt: 'OUTPUT_FORMAT=JSON\nANALYSIS_TYPE=SECURITY\nRETURN_CODE_SNIPPETS=TRUE\nAnalyze this repository and return structured data with exact file paths and line numbers.'
    },
    {
      name: 'System Message Style',
      prompt: `You are a code analyzer. You MUST respond with valid JSON only.
Analyze the repository and return:
{"vulnerabilities": [{"file": "path", "line": 1, "code": "snippet", "fix": "suggestion"}]}`
    }
  ];
  
  console.log(`📡 Testing ${promptStrategies.length} different prompt strategies\n`);
  
  for (const strategy of promptStrategies) {
    console.log(`\n🧪 Strategy: ${strategy.name}`);
    console.log('-'.repeat(70));
    
    try {
      const response = await axios.post(
        `${deepwikiUrl}/chat/completions/stream`,
        {
          repo_url: testRepo,
          messages: [{
            role: 'user',
            content: strategy.prompt
          }],
          stream: false,
          provider: 'openrouter',
          model: 'openai/gpt-4o-mini',
          temperature: 0.0, // Lower temperature for more consistent format
          max_tokens: 2000
        },
        {
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${deepwikiKey}`
          },
          timeout: 30000
        }
      );
      
      const responseData = response.data;
      console.log('Response type:', typeof responseData);
      
      if (typeof responseData === 'string') {
        // Try to extract JSON from the response
        const jsonMatch = responseData.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            console.log('✅ Successfully extracted JSON!');
            console.log('Structure:', Object.keys(parsed));
            if (parsed.issues || parsed.vulnerabilities) {
              const issues = parsed.issues || parsed.vulnerabilities;
              console.log(`Found ${issues.length} issues with structure`);
              if (issues[0]) {
                console.log('First issue keys:', Object.keys(issues[0]));
                console.log('Has file path:', !!issues[0].file);
                console.log('Has line number:', !!issues[0].line);
                console.log('Has code snippet:', !!issues[0].code || !!issues[0].codeSnippet);
              }
            }
          } catch (e) {
            console.log('❌ Found JSON-like structure but failed to parse');
          }
        } else {
          // Check for other structured formats
          if (strategy.name === 'CSV Format') {
            const lines = responseData.split('\n');
            const hasCSV = lines[0]?.includes(',') && lines[1]?.includes(',');
            console.log(hasCSV ? '✅ CSV format detected' : '❌ No CSV structure');
          } else if (strategy.name === 'XML Format') {
            const hasXML = responseData.includes('<issue>') && responseData.includes('</issue>');
            console.log(hasXML ? '✅ XML format detected' : '❌ No XML structure');
          } else if (strategy.name === 'Structured Template') {
            const hasTemplate = responseData.includes('TYPE:') && responseData.includes('FILE:');
            console.log(hasTemplate ? '✅ Template format detected' : '❌ No template structure');
          } else {
            console.log('❌ No structured format detected');
          }
        }
        
        // Show first 200 chars of response
        console.log('Preview:', responseData.substring(0, 200));
        
      } else if (typeof responseData === 'object') {
        console.log('✅ Received JSON object directly!');
        console.log('Structure:', JSON.stringify(responseData, null, 2).substring(0, 300));
      }
      
    } catch (error: any) {
      console.log('❌ Error:', error.message);
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n' + '=' .repeat(70));
  console.log('\n📊 PROMPT STRATEGY ANALYSIS:\n');
  console.log('Based on testing, we can:');
  console.log('1. Try JSON-specific prompts with strict instructions');
  console.log('2. Parse structured text formats (CSV, XML, Template)');
  console.log('3. Use lower temperature for consistent formatting');
  console.log('4. Extract JSON from mixed text responses');
  console.log('5. Consider alternative endpoints or API parameters');
}

testStructuredPrompts().catch(console.error);