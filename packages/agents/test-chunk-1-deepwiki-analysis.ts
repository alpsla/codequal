/**
 * Test Chunk 1: DeepWiki Analysis Performance
 * Focus: Raw DeepWiki call performance and response quality
 */

import axios from 'axios';
import { performance } from 'perf_hooks';

interface PerformanceMetrics {
  callDuration: number;
  responseSize: number;
  issuesFound: number;
  hasJSON: boolean;
  parseTime: number;
}

async function testDeepWikiAnalysis() {
  console.log('🔍 TEST CHUNK 1: DeepWiki Analysis Performance');
  console.log('=' .repeat(60));
  
  const deepwikiUrl = 'http://localhost:8001';
  const testRepo = 'https://github.com/sindresorhus/ky';
  const metrics: PerformanceMetrics[] = [];
  
  // Test configurations
  const testCases = [
    { 
      name: 'Simple analysis (main)',
      branch: 'main',
      maxTokens: 2000,
      prompt: 'Find 5 critical issues with exact file paths and line numbers'
    },
    {
      name: 'Detailed analysis (PR)',
      branch: 'pull/700/head',
      maxTokens: 4000,
      prompt: 'Analyze this PR for code quality, security, and performance issues. Include file paths and line numbers.'
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📊 ${testCase.name}`);
    console.log('-'.repeat(40));
    
    const startTime = performance.now();
    
    try {
      // Direct DeepWiki call
      const response = await axios.post(
        `${deepwikiUrl}/chat/completions/stream`,
        {
          repo_url: testRepo,
          branch: testCase.branch,
          messages: [{
            role: 'user',
            content: testCase.prompt + '\n\nIMPORTANT: Return response in JSON format with "issues" array.'
          }],
          stream: false,
          provider: 'openrouter',
          model: 'openai/gpt-4o-mini',
          temperature: 0.1,
          max_tokens: testCase.maxTokens,
          response_format: { type: 'json' }
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 60000 // 1 minute timeout
        }
      );
      
      const callDuration = performance.now() - startTime;
      const responseData = typeof response.data === 'string' 
        ? response.data 
        : JSON.stringify(response.data);
      
      // Parse response
      const parseStart = performance.now();
      let issuesFound = 0;
      let hasJSON = false;
      
      try {
        const parsed = JSON.parse(responseData);
        hasJSON = true;
        issuesFound = parsed.issues?.length || 0;
      } catch {
        // Count issues in text
        const issueMatches = responseData.match(/issue|problem|vulnerability|error/gi) || [];
        issuesFound = issueMatches.length;
      }
      
      const parseTime = performance.now() - parseStart;
      
      const metric: PerformanceMetrics = {
        callDuration,
        responseSize: responseData.length,
        issuesFound,
        hasJSON,
        parseTime
      };
      
      metrics.push(metric);
      
      // Display results
      console.log(`✅ Success`);
      console.log(`   Call duration: ${(callDuration / 1000).toFixed(2)}s`);
      console.log(`   Response size: ${(responseData.length / 1024).toFixed(1)} KB`);
      console.log(`   Issues found: ${issuesFound}`);
      console.log(`   Format: ${hasJSON ? 'JSON' : 'Plain text'}`);
      console.log(`   Parse time: ${parseTime.toFixed(0)}ms`);
      
      // Sample of response
      if (hasJSON && issuesFound > 0) {
        const parsed = JSON.parse(responseData);
        const firstIssue = parsed.issues[0];
        console.log(`\n   Sample issue:`);
        console.log(`   - Title: ${firstIssue.title || firstIssue.description?.substring(0, 50)}`);
        console.log(`   - File: ${firstIssue.file || 'Not provided'}`);
        console.log(`   - Line: ${firstIssue.line || 'Not provided'}`);
      }
      
    } catch (error: any) {
      console.log(`❌ Failed: ${error.message}`);
      metrics.push({
        callDuration: performance.now() - startTime,
        responseSize: 0,
        issuesFound: 0,
        hasJSON: false,
        parseTime: 0
      });
    }
  }
  
  // Performance Summary
  console.log('\n' + '='.repeat(60));
  console.log('📈 PERFORMANCE SUMMARY');
  console.log('='.repeat(60));
  
  const avgCallTime = metrics.reduce((sum, m) => sum + m.callDuration, 0) / metrics.length;
  const avgResponseSize = metrics.reduce((sum, m) => sum + m.responseSize, 0) / metrics.length;
  const totalIssues = metrics.reduce((sum, m) => sum + m.issuesFound, 0);
  const jsonSuccess = metrics.filter(m => m.hasJSON).length;
  
  console.log(`\nAverage call time: ${(avgCallTime / 1000).toFixed(2)}s`);
  console.log(`Average response size: ${(avgResponseSize / 1024).toFixed(1)} KB`);
  console.log(`Total issues found: ${totalIssues}`);
  console.log(`JSON success rate: ${jsonSuccess}/${metrics.length}`);
  
  // Optimization recommendations
  console.log('\n🔧 OPTIMIZATION OPPORTUNITIES:');
  if (avgCallTime > 30000) {
    console.log('⚠️ Calls taking >30s - Consider:');
    console.log('   - Reducing max_tokens');
    console.log('   - Using faster model (gpt-4o-mini)');
    console.log('   - Caching results');
  }
  
  if (jsonSuccess < metrics.length) {
    console.log('⚠️ Not all responses are JSON - Consider:');
    console.log('   - Stronger prompt engineering');
    console.log('   - Fallback parser improvements');
  }
  
  if (avgResponseSize > 50 * 1024) {
    console.log('⚠️ Large responses - Consider:');
    console.log('   - More focused prompts');
    console.log('   - Pagination for large repos');
  }
  
  return metrics;
}

// Run test
testDeepWikiAnalysis().catch(console.error);