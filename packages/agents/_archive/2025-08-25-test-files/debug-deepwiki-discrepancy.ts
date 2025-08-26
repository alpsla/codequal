#!/usr/bin/env npx ts-node

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

async function debugDeepWikiAnalysis() {
  console.log('🔍 Debugging DeepWiki Issue Detection Discrepancy');
  console.log('================================================\n');

  const DEEPWIKI_API_URL = process.env.DEEPWIKI_API_URL || 'http://localhost:8001';
  const DEEPWIKI_API_KEY = process.env.DEEPWIKI_API_KEY || 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f';

  // Test with a simple repository that should have clear issues
  const testRepo = 'https://github.com/sindresorhus/ky';
  const prNumber = 700;

  console.log('🌐 Testing DeepWiki API directly...');
  console.log(`Repository: ${testRepo}`);
  console.log(`PR: #${prNumber}`);
  console.log(`API URL: ${DEEPWIKI_API_URL}\n`);

  try {
    // Test 1: Raw DeepWiki API call
    console.log('📡 Test 1: Raw DeepWiki API Call');
    console.log('---------------------------------');
    
    const rawResponse = await axios.post(
      `${DEEPWIKI_API_URL}/chat/completions/stream`,
      {
        repo_url: testRepo,
        messages: [{
          role: 'user',
          content: `Analyze this repository for critical security vulnerabilities, performance issues, and code quality problems. 
                   For each issue found, provide:
                   1. Issue type (security/performance/quality)
                   2. Severity (critical/high/medium/low)
                   3. Exact file path (e.g., src/api/database.ts)
                   4. Line number (e.g., 45)
                   5. Clear description of the problem
                   6. Code snippet showing the issue
                   
                   Focus on finding real, specific issues like:
                   - SQL injection vulnerabilities
                   - XSS vulnerabilities
                   - Missing input validation
                   - Hardcoded secrets
                   - Performance bottlenecks
                   - Memory leaks`
        }],
        stream: false,
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 4000
      },
      {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPWIKI_API_KEY}`
        },
        timeout: 60000
      }
    );

    console.log('✅ Response received');
    console.log('Response type:', typeof rawResponse.data);
    
    // Save raw response
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const rawResponseFile = path.join(__dirname, `debug-logs/deepwiki-raw-${timestamp}.json`);
    
    // Create debug-logs directory if it doesn't exist
    if (!fs.existsSync(path.join(__dirname, 'debug-logs'))) {
      fs.mkdirSync(path.join(__dirname, 'debug-logs'));
    }
    
    fs.writeFileSync(rawResponseFile, JSON.stringify(rawResponse.data, null, 2));
    console.log(`📁 Raw response saved to: ${rawResponseFile}\n`);

    // Parse response
    let parsedIssues: any[] = [];
    
    if (typeof rawResponse.data === 'string') {
      console.log('📝 Text response received (length: ' + rawResponse.data.length + ')');
      console.log('First 500 characters:', rawResponse.data.substring(0, 500));
      
      // Try to extract issues from text
      const issuePattern = /(?:Issue|Problem|Vulnerability|Bug)[\s\S]*?(?:File|Location|Path):\s*([^\n]+)[\s\S]*?(?:Line|Lines?):\s*(\d+)/gi;
      const matches = [...rawResponse.data.matchAll(issuePattern)];
      
      console.log(`\n🔍 Found ${matches.length} issue patterns in text`);
      
      matches.forEach((match, index) => {
        console.log(`  Issue ${index + 1}: ${match[1]} at line ${match[2]}`);
      });
    } else if (rawResponse.data?.choices?.[0]?.message?.content) {
      const content = rawResponse.data.choices[0].message.content;
      console.log('📦 OpenAI format response');
      console.log('Content length:', content.length);
      console.log('First 500 characters:', content.substring(0, 500));
    } else {
      console.log('📦 JSON response structure:', Object.keys(rawResponse.data));
      if (rawResponse.data.vulnerabilities) {
        parsedIssues = rawResponse.data.vulnerabilities;
        console.log(`Found ${parsedIssues.length} vulnerabilities in response`);
      }
    }

    // Test 2: Check what files DeepWiki is analyzing
    console.log('\n📡 Test 2: Check PR Branch Analysis');
    console.log('------------------------------------');
    
    const prBranchResponse = await axios.post(
      `${DEEPWIKI_API_URL}/chat/completions/stream`,
      {
        repo_url: `${testRepo}/tree/pull/${prNumber}/head`,
        messages: [{
          role: 'user',
          content: 'List the first 5 files you can see in this repository with their full paths'
        }],
        stream: false,
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 1000
      },
      {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPWIKI_API_KEY}`
        },
        timeout: 30000
      }
    );

    console.log('✅ PR branch check response received');
    if (typeof prBranchResponse.data === 'string') {
      console.log('Files visible to DeepWiki:', prBranchResponse.data.substring(0, 500));
    }

    // Test 3: Compare with mock data
    console.log('\n📡 Test 3: Mock Data Structure');
    console.log('-------------------------------');
    
    // Load mock data to see expected structure
    const mockPath = path.join(__dirname, 'src/standard/mocks/deepwiki-mock-data-realistic.json');
    if (fs.existsSync(mockPath)) {
      const mockData = JSON.parse(fs.readFileSync(mockPath, 'utf-8'));
      console.log('Mock data structure:');
      console.log('- vulnerabilities:', Array.isArray(mockData.vulnerabilities) ? mockData.vulnerabilities.length : 'not array');
      
      if (mockData.vulnerabilities?.[0]) {
        console.log('- First mock issue structure:', Object.keys(mockData.vulnerabilities[0]));
        console.log('- Example location:', mockData.vulnerabilities[0].location);
      }
    }

    // Summary
    console.log('\n📊 Analysis Summary');
    console.log('-------------------');
    console.log('1. DeepWiki is responding:', rawResponse.status === 200 ? '✅ Yes' : '❌ No');
    console.log('2. Response contains file paths:', 
      rawResponse.data.toString().includes('.ts') || 
      rawResponse.data.toString().includes('.js') ? '✅ Yes' : '❌ No (Generic issues only)');
    console.log('3. Response contains line numbers:',
      /line\s*\d+/i.test(rawResponse.data.toString()) ? '✅ Yes' : '❌ No');
    console.log('4. Response mentions specific vulnerabilities:',
      /SQL|XSS|injection|validation|sanitize/i.test(rawResponse.data.toString()) ? '✅ Yes' : '❌ No');

    console.log('\n⚠️  Key Finding:');
    if (!rawResponse.data.toString().includes('.ts') && !rawResponse.data.toString().includes('.js')) {
      console.log('DeepWiki is NOT analyzing actual code files!');
      console.log('It appears to be returning generic package.json issues only.');
      console.log('This explains why all locations show as "Unknown location"');
      console.log('\nPossible causes:');
      console.log('1. DeepWiki is not properly cloning/accessing the repository');
      console.log('2. DeepWiki is only scanning package.json and not source files');
      console.log('3. The repository URL format may be incorrect');
    } else {
      console.log('DeepWiki appears to be analyzing code files correctly.');
    }

  } catch (error: any) {
    console.error('❌ Error during analysis:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    if (error.code === 'ECONNREFUSED') {
      console.log('\n⚠️  DeepWiki is not running!');
      console.log('Start it with: kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001');
    }
  }
}

// Run the debug script
debugDeepWikiAnalysis().catch(console.error);