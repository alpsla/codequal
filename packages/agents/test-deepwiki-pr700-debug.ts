/**
 * Debug script to see actual DeepWiki response for PR #700
 */

import axios from 'axios';
import * as fs from 'fs';

const DEEPWIKI_URL = 'http://localhost:8001';

async function testDeepWikiRaw() {
  console.log('🔍 Testing DeepWiki Raw Response for PR #700\n');
  
  // Test 1: Main branch
  console.log('=' .repeat(60));
  console.log('TEST 1: Main Branch');
  console.log('=' .repeat(60));
  
  try {
    const mainResponse = await axios.post(
      `${DEEPWIKI_URL}/chat/completions/stream`,
      {
        repo_url: 'https://github.com/sindresorhus/ky',
        branch: 'main',
        messages: [{
          role: 'user',
          content: 'Analyze this repository and find all code quality issues, bugs, and security vulnerabilities. List each issue with exact file path and line number.'
        }],
        stream: false,
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 3000
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000
      }
    );
    
    console.log('Response type:', typeof mainResponse.data);
    console.log('Response length:', JSON.stringify(mainResponse.data).length);
    
    // Save raw response
    fs.writeFileSync('deepwiki-main-raw.json', JSON.stringify(mainResponse.data, null, 2));
    
    // Display response
    if (typeof mainResponse.data === 'string') {
      console.log('\n📝 Text Response (first 1500 chars):');
      console.log(mainResponse.data.substring(0, 1500));
    } else {
      console.log('\n📦 JSON Response:');
      console.log(JSON.stringify(mainResponse.data, null, 2).substring(0, 1500));
    }
    
  } catch (error: any) {
    console.log('❌ Main branch error:', error.message);
    if (error.response?.data) {
      console.log('Error details:', error.response.data);
    }
  }
  
  // Test 2: PR branch
  console.log('\n' + '=' .repeat(60));
  console.log('TEST 2: PR #700 Branch');
  console.log('=' .repeat(60));
  
  try {
    const prResponse = await axios.post(
      `${DEEPWIKI_URL}/chat/completions/stream`,
      {
        repo_url: 'https://github.com/sindresorhus/ky',
        pr_number: 700,
        messages: [{
          role: 'user',
          content: 'Analyze pull request #700 and identify all issues. For each issue provide: file path, line number, issue description, severity, and suggested fix code.'
        }],
        stream: false,
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 3000
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000
      }
    );
    
    console.log('Response type:', typeof prResponse.data);
    console.log('Response length:', JSON.stringify(prResponse.data).length);
    
    // Save raw response
    fs.writeFileSync('deepwiki-pr700-raw.json', JSON.stringify(prResponse.data, null, 2));
    
    // Display response
    if (typeof prResponse.data === 'string') {
      console.log('\n📝 Text Response (first 1500 chars):');
      console.log(prResponse.data.substring(0, 1500));
    } else {
      console.log('\n📦 JSON Response:');
      console.log(JSON.stringify(prResponse.data, null, 2).substring(0, 1500));
    }
    
  } catch (error: any) {
    console.log('❌ PR branch error:', error.message);
    if (error.response?.data) {
      console.log('Error details:', error.response.data);
    }
  }
  
  // Test 3: Check if we can get PR diff
  console.log('\n' + '=' .repeat(60));
  console.log('TEST 3: GitHub PR Info');
  console.log('=' .repeat(60));
  
  try {
    // Get PR files
    const filesResponse = await axios.get(
      'https://api.github.com/repos/sindresorhus/ky/pulls/700/files',
      { headers: { 'Accept': 'application/vnd.github.v3+json' } }
    );
    
    console.log(`\n📄 Files changed in PR #700:`);
    for (const file of filesResponse.data) {
      console.log(`\nFile: ${file.filename}`);
      console.log(`Status: ${file.status}`);
      console.log(`Additions: +${file.additions}`);
      console.log(`Deletions: -${file.deletions}`);
      console.log(`Changes: ${file.changes}`);
      
      if (file.patch) {
        console.log('\nPatch:');
        console.log(file.patch.substring(0, 500));
      }
    }
    
    // Save PR info
    fs.writeFileSync('pr700-github-info.json', JSON.stringify(filesResponse.data, null, 2));
    
  } catch (error: any) {
    console.log('❌ GitHub API error:', error.message);
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('📄 Files saved:');
  console.log('   - deepwiki-main-raw.json');
  console.log('   - deepwiki-pr700-raw.json');
  console.log('   - pr700-github-info.json');
  console.log('=' .repeat(60));
}

testDeepWikiRaw().catch(console.error);