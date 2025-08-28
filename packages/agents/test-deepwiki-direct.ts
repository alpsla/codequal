/**
 * Test DeepWiki API directly without complex wrappers
 * This helps diagnose connection and API issues
 */

import axios from 'axios';

async function testDeepWikiDirect() {
  console.log('🔍 Testing DeepWiki API Directly\n');
  console.log('='.repeat(60));
  
  const DEEPWIKI_URL = 'http://localhost:8001';
  const DEEPWIKI_API_KEY = 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f';
  
  // Test 1: Health check
  console.log('\n1️⃣ Testing DeepWiki health endpoint...');
  try {
    const health = await axios.get(`${DEEPWIKI_URL}/health`, {
      timeout: 5000
    });
    console.log('   ✅ Health check passed:', health.data);
  } catch (error: any) {
    console.log('   ❌ Health check failed:', error.message);
  }
  
  // Test 2: Simple analysis request
  console.log('\n2️⃣ Testing simple analysis request...');
  
  const simpleRequest = {
    repo_url: 'https://github.com/sindresorhus/is-odd',
    messages: [{
      role: 'user',
      content: `Analyze this repository for code quality issues.
Format each issue as:
Issue: [title]
Severity: [critical|high|medium|low]
File: [file path]
Line: [number]
Description: [brief description]`
    }],
    stream: false,
    provider: 'openrouter',
    model: 'openai/gpt-4o-mini',
    temperature: 0.1,
    max_tokens: 2000
  };
  
  try {
    console.log('   📤 Sending request to DeepWiki...');
    const startTime = Date.now();
    
    const response = await axios.post(
      `${DEEPWIKI_URL}/chat/completions/stream`,
      simpleRequest,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPWIKI_API_KEY}`
        },
        timeout: 60000 // 60 seconds timeout
      }
    );
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`   ✅ Response received in ${duration}s`);
    
    // Parse response
    const responseText = typeof response.data === 'string' 
      ? response.data 
      : JSON.stringify(response.data, null, 2);
    
    console.log('\n   📝 Response (first 1000 chars):');
    console.log('   ' + responseText.substring(0, 1000).split('\n').join('\n   '));
    
    // Try to extract issues
    const issues = extractIssues(responseText);
    console.log(`\n   📊 Issues found: ${issues.length}`);
    
    if (issues.length > 0) {
      console.log('\n   First 3 issues:');
      issues.slice(0, 3).forEach((issue, i) => {
        console.log(`\n   ${i + 1}. ${issue.title}`);
        console.log(`      Severity: ${issue.severity}`);
        console.log(`      File: ${issue.file}`);
        console.log(`      Line: ${issue.line}`);
      });
    }
    
  } catch (error: any) {
    console.log('   ❌ Request failed:', error.message);
    if (error.response) {
      console.log('   Response status:', error.response.status);
      console.log('   Response data:', error.response.data);
    }
    if (error.code === 'ECONNRESET') {
      console.log('   💡 Connection reset - DeepWiki might be restarting or overloaded');
    }
    if (error.code === 'ETIMEDOUT') {
      console.log('   💡 Request timed out - try increasing timeout or using smaller repository');
    }
  }
  
  // Test 3: Check if port forward is working
  console.log('\n3️⃣ Checking port forward status...');
  try {
    const testConnection = await axios.get('http://localhost:8001', {
      timeout: 2000,
      validateStatus: () => true // Accept any status
    });
    console.log('   ✅ Port forward is active (status:', testConnection.status + ')');
  } catch (error: any) {
    console.log('   ❌ Port forward issue:', error.message);
    console.log('   💡 Run: kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📋 Diagnosis Summary:');
  console.log('   - DeepWiki pod: Check with "kubectl get pods -n codequal-dev"');
  console.log('   - Port forward: Ensure port 8001 is forwarded');
  console.log('   - API Key: Using hardcoded test key');
  console.log('   - Timeouts: May need adjustment for large repos');
}

function extractIssues(text: string): any[] {
  const issues = [];
  const lines = text.split('\n');
  
  let currentIssue: any = {};
  
  for (const line of lines) {
    if (line.includes('Issue:') || line.includes('Title:')) {
      if (currentIssue.title) {
        issues.push(currentIssue);
      }
      currentIssue = { title: line.split(':').slice(1).join(':').trim() };
    } else if (line.includes('Severity:')) {
      currentIssue.severity = line.split(':')[1].trim();
    } else if (line.includes('File:')) {
      currentIssue.file = line.split(':').slice(1).join(':').trim();
    } else if (line.includes('Line:')) {
      currentIssue.line = line.split(':')[1].trim();
    } else if (line.includes('Description:')) {
      currentIssue.description = line.split(':').slice(1).join(':').trim();
    }
  }
  
  if (currentIssue.title) {
    issues.push(currentIssue);
  }
  
  return issues;
}

// Run the test
testDeepWikiDirect().catch(console.error);