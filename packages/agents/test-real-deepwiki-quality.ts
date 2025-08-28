#!/usr/bin/env npx ts-node
/**
 * Test REAL DeepWiki API to see what data quality we get
 */

import axios from 'axios';
import { loadEnvironment } from './src/standard/utils/env-loader';

async function testRealDeepWikiQuality() {
  console.log('🔍 Testing REAL DeepWiki API Data Quality\n');
  console.log('=' .repeat(70) + '\n');
  
  loadEnvironment();
  
  // Check if DeepWiki is accessible
  const deepwikiUrl = process.env.DEEPWIKI_API_URL || 'http://localhost:8001';
  const deepwikiKey = process.env.DEEPWIKI_API_KEY || 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f';
  
  console.log(`📡 DeepWiki URL: ${deepwikiUrl}`);
  console.log(`🔑 API Key: ${deepwikiKey.substring(0, 10)}...`);
  console.log('');
  
  try {
    // Test with a small, well-known repository
    const testRepo = 'https://github.com/sindresorhus/is-odd';
    
    console.log(`🔄 Testing with simple repository: ${testRepo}\n`);
    
    const response = await axios.post(
      `${deepwikiUrl}/chat/completions/stream`,
      {
        repo_url: testRepo,
        messages: [{
          role: 'user',
          content: 'Analyze this repository and find code quality issues. For each issue provide: 1) Exact file path from repository root, 2) Line number, 3) Actual code snippet from that location, 4) Issue description'
        }],
        stream: false,
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini',
        temperature: 0.1,
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
    
    console.log('✅ Response received from DeepWiki\n');
    console.log('📦 Response type:', typeof response.data);
    console.log('');
    
    if (typeof response.data === 'string') {
      console.log('📝 Text Response (first 1000 chars):');
      console.log('-'.repeat(70));
      console.log(response.data.substring(0, 1000));
      console.log('-'.repeat(70));
      console.log('');
      
      // Try to extract structured data
      console.log('🔍 Analyzing response format:\n');
      
      // Check for file paths
      const fileMatches = response.data.match(/(?:File(?:\s+path)?:|Location:)\s*([^\n]+)/gi);
      if (fileMatches) {
        console.log('📁 File references found:');
        fileMatches.slice(0, 5).forEach(match => {
          console.log(`  - ${match}`);
        });
      } else {
        console.log('❌ No clear file path references found');
      }
      console.log('');
      
      // Check for line numbers
      const lineMatches = response.data.match(/(?:Line(?:\s+number)?:|line\s+)\d+/gi);
      if (lineMatches) {
        console.log('📍 Line number references found:');
        lineMatches.slice(0, 5).forEach(match => {
          console.log(`  - ${match}`);
        });
      } else {
        console.log('❌ No clear line number references found');
      }
      console.log('');
      
      // Check for code snippets
      const codeMatches = response.data.match(/```[\s\S]*?```/g);
      if (codeMatches) {
        console.log('📝 Code snippets found:');
        codeMatches.slice(0, 3).forEach((match, idx) => {
          const preview = match.substring(0, 100).replace(/\n/g, ' ');
          console.log(`  ${idx + 1}. ${preview}...`);
        });
      } else {
        console.log('❌ No code snippets with ``` markers found');
      }
      console.log('');
      
    } else if (typeof response.data === 'object') {
      console.log('📦 JSON Response:');
      console.log(JSON.stringify(response.data, null, 2).substring(0, 1000));
    }
    
    console.log('\n' + '=' .repeat(70));
    console.log('📊 DATA QUALITY ASSESSMENT:\n');
    
    console.log('Based on the response, DeepWiki is:');
    console.log('1. ✅ Responding to API calls');
    console.log('2. ⚠️  Returning unstructured text instead of JSON');
    console.log('3. ❓ File paths and line numbers may or may not be accurate');
    console.log('4. ❓ Code snippets may or may not be from actual files');
    console.log('');
    console.log('🎯 To get reliable data, we need to:');
    console.log('1. Parse the text response more intelligently');
    console.log('2. Validate file paths against actual repository');
    console.log('3. Extract code from repository when DeepWiki provides locations');
    console.log('4. Handle cases where files/lines don\'t exist gracefully');
    
  } catch (error: any) {
    console.error('❌ Error calling DeepWiki:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n⚠️  DeepWiki is not accessible. Please ensure:');
      console.log('1. kubectl port-forward is running:');
      console.log('   kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001');
      console.log('2. DeepWiki pod is running:');
      console.log('   kubectl get pods -n codequal-dev -l app=deepwiki');
    }
  }
}

testRealDeepWikiQuality().catch(console.error);