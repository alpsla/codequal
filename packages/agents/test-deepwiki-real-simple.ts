#!/usr/bin/env ts-node
import axios from 'axios';

async function testRealDeepWiki() {
  console.log('🚀 Testing Real DeepWiki API (Simple Direct Test)\n');
  
  const deepwikiUrl = process.env.DEEPWIKI_API_URL || 'http://localhost:8001';
  const isUsingMock = process.env.USE_DEEPWIKI_MOCK === 'true';
  
  console.log(`📌 DeepWiki Mode: ${isUsingMock ? 'MOCK' : 'REAL'}`);
  console.log(`📌 DeepWiki URL: ${deepwikiUrl}\n`);
  
  if (isUsingMock) {
    console.log('⚠️  Warning: USE_DEEPWIKI_MOCK=true - Set to false for real test');
    return;
  }
  
  try {
    console.log('📝 Sending request to DeepWiki...');
    console.log('─'.repeat(50));
    
    const response = await axios.post(
      `${deepwikiUrl}/chat/completions/stream`,
      {
        repo_url: 'https://github.com/sindresorhus/is-odd',
        messages: [{
          role: 'user',
          content: 'Find security vulnerabilities, bugs, and code quality issues. For each issue provide: 1) Issue type, 2) File path, 3) Line number if known, 4) Severity, 5) Brief description'
        }],
        stream: false,
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 2000
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000
      }
    );
    
    console.log('\n✅ Response received!');
    console.log(`📦 Response type: ${typeof response.data}`);
    console.log(`📏 Response length: ${JSON.stringify(response.data).length} chars\n`);
    
    // Try to parse the response
    let issues: any[] = [];
    let rawText = '';
    
    if (typeof response.data === 'string') {
      rawText = response.data;
      console.log('📝 Text Response (first 500 chars):');
      console.log('─'.repeat(50));
      console.log(response.data.substring(0, 500));
      console.log('─'.repeat(50));
      
      // Try to extract issues from text
      const lines = response.data.split('\n');
      lines.forEach(line => {
        // Look for patterns like "File: path/to/file.js" or "Line: 123"
        if (line.includes('File:') || line.includes('file:')) {
          console.log(`\n📁 Found file reference: ${line}`);
        }
        if (line.includes('Line:') || line.includes('line:')) {
          console.log(`📍 Found line reference: ${line}`);
        }
      });
      
    } else if (response.data.vulnerabilities) {
      issues = response.data.vulnerabilities;
      console.log('📦 Structured Response with vulnerabilities array');
    } else if (response.data.issues) {
      issues = response.data.issues;
      console.log('📦 Structured Response with issues array');
    } else if (response.data.choices?.[0]?.message?.content) {
      rawText = response.data.choices[0].message.content;
      console.log('📦 OpenAI-style response format');
    }
    
    // Analyze issues
    console.log('\n📊 Analysis Results:');
    console.log('─'.repeat(50));
    
    if (issues.length > 0) {
      console.log(`✅ Found ${issues.length} structured issues:\n`);
      issues.slice(0, 5).forEach((issue, idx) => {
        console.log(`${idx + 1}. ${issue.title || issue.message || 'Unknown'}`);
        console.log(`   File: ${issue.file || issue.location?.file || 'unknown'}`);
        console.log(`   Line: ${issue.line || issue.location?.line || '?'}`);
        console.log(`   Severity: ${issue.severity || 'unknown'}`);
        console.log('');
      });
    } else if (rawText) {
      // Count issue mentions in text
      const securityCount = (rawText.match(/security|vulnerability|injection|XSS|SQL/gi) || []).length;
      const bugCount = (rawText.match(/bug|error|issue|problem/gi) || []).length;
      const fileCount = (rawText.match(/\.(js|ts|py|java|go|rb|php)/gi) || []).length;
      
      console.log(`📝 Text analysis:`);
      console.log(`   Security mentions: ${securityCount}`);
      console.log(`   Bug/issue mentions: ${bugCount}`);
      console.log(`   File references: ${fileCount}`);
    }
    
    // Test location extraction
    console.log('\n📍 Location Extraction Test:');
    console.log('─'.repeat(50));
    
    const hasValidLocations = issues.some(i => 
      (i.file || i.location?.file) && 
      (i.file || i.location?.file) !== 'unknown'
    );
    
    if (hasValidLocations) {
      console.log('✅ Valid file locations found in structured data');
    } else if (rawText.includes('.js') || rawText.includes('.ts')) {
      console.log('⚠️  File extensions found in text but not in structured format');
      console.log('   This indicates the parser needs improvement');
    } else {
      console.log('❌ No valid file locations found');
      console.log('   DeepWiki may not be returning location data');
    }
    
    // Summary
    console.log('\n' + '═'.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('═'.repeat(50));
    
    const testPassed = response.data && (issues.length > 0 || rawText.length > 0);
    
    console.log(`\n🏆 Status: ${testPassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('\nDetails:');
    console.log(`   API Response: ${response.data ? '✅' : '❌'}`);
    console.log(`   Issues Found: ${issues.length > 0 ? `✅ (${issues.length})` : '❌'}`);
    console.log(`   Text Content: ${rawText.length > 0 ? `✅ (${rawText.length} chars)` : '❌'}`);
    console.log(`   Valid Locations: ${hasValidLocations ? '✅' : '❌'}`);
    
    if (!hasValidLocations) {
      console.log('\n⚠️  Location extraction issue detected!');
      console.log('   This is a known issue (BUG-068) with DeepWiki parser.');
      console.log('   Recommendation: Use USE_DEEPWIKI_MOCK=true for now.');
    }
    
    return {
      success: testPassed,
      hasLocations: hasValidLocations,
      issueCount: issues.length,
      responseType: typeof response.data
    };
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n⚠️  Cannot connect to DeepWiki. Please ensure:');
      console.log('   1. Pod is running: kubectl get pods -n codequal-dev -l app=deepwiki');
      console.log('   2. Port forward: kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001');
    } else if (error.response) {
      console.log('\n❌ DeepWiki returned error:');
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${JSON.stringify(error.response.data).substring(0, 200)}`);
    }
    
    throw error;
  }
}

// Run test
testRealDeepWiki().catch(error => {
  console.error('\n💥 Fatal error:', error.message);
  process.exit(1);
});