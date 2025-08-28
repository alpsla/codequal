#!/usr/bin/env npx ts-node
/**
 * Get raw DeepWiki response to understand format
 */

import axios from 'axios';
import { loadEnvironment } from './src/standard/utils/env-loader';
import * as fs from 'fs';

async function getRawResponse() {
  loadEnvironment();
  
  const deepwikiUrl = process.env.DEEPWIKI_API_URL || 'http://localhost:8001';
  const deepwikiKey = process.env.DEEPWIKI_API_KEY || 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f';
  
  try {
    const response = await axios.post(
      `${deepwikiUrl}/chat/completions/stream`,
      {
        repo_url: 'https://github.com/sindresorhus/ky',
        messages: [{
          role: 'user',
          content: `Analyze for issues. Return exactly in this format:

FILE: path/to/file.js
LINE: 42
TYPE: security
SEVERITY: high
DESCRIPTION: Issue description here
CODE: actual code snippet
FIX: suggested fix
---
FILE: another/file.js
LINE: 10
[continue same format]`
        }],
        stream: false,
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini',
        temperature: 0.0,
        max_tokens: 2000
      },
      {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${deepwikiKey}`
        },
        timeout: 60000
      }
    );
    
    const data = response.data;
    console.log('Response type:', typeof data);
    console.log('\n=== FULL RESPONSE ===\n');
    console.log(data);
    
    // Save to file for analysis
    fs.writeFileSync('deepwiki-raw-response.txt', typeof data === 'string' ? data : JSON.stringify(data, null, 2));
    console.log('\n\nResponse saved to deepwiki-raw-response.txt');
    
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

getRawResponse().catch(console.error);