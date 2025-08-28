#!/usr/bin/env ts-node

/**
 * Test fix generation for issues found in ky repository
 */

import { FixSuggestionAgentV2 } from './dist/standard/services/fix-suggestion-agent-v2';

async function testFixGeneration() {
  console.log('🔧 Testing Fix Generation for Real Issues');
  console.log('=========================================\n');
  
  // Sample real issues from the ky analysis
  const testIssues = [
    {
      id: 'issue-1',
      title: 'Potential denial of service due to unbounded request retries',
      severity: 'high' as const,
      category: 'performance',
      location: { file: 'source/index.ts', line: 4 },
      codeSnippet: 'this.retryCount = 0;',
      message: 'Unbounded retries can lead to DoS',
      description: 'The retry mechanism lacks upper bounds which could cause infinite loops'
    },
    {
      id: 'issue-2', 
      title: 'Missing input validation for URL parameters',
      severity: 'high' as const,
      category: 'security',
      location: { file: 'source/utils.ts', line: 20 },
      codeSnippet: 'const url = new URL(request.url);',
      message: 'URL parameters are not validated',
      description: 'User input should be validated before use'
    },
    {
      id: 'issue-3',
      title: 'Use of eval() function',
      severity: 'critical' as const,
      category: 'security',
      location: { file: 'src/utils.ts', line: 20 },
      codeSnippet: 'eval(userInput);',
      message: 'eval() is dangerous and should never be used with user input',
      description: 'The eval function executes arbitrary code and is a severe security risk'
    },
    {
      id: 'issue-4',
      title: 'Missing error handling',
      severity: 'medium' as const,
      category: 'error-handling',
      location: { file: 'test/helpers/index.ts', line: 1 },
      codeSnippet: 'await fetch(url);',
      message: 'Network request without error handling',
      description: 'Fetch operations should handle network errors'
    },
    {
      id: 'issue-5',
      title: 'SQL injection vulnerability',
      severity: 'critical' as const,
      category: 'security',
      location: { file: 'src/database.ts', line: 45 },
      codeSnippet: 'const query = `SELECT * FROM users WHERE id = ${userId}`;',
      message: 'SQL query uses string interpolation',
      description: 'String interpolation in SQL queries allows injection attacks'
    }
  ];
  
  const fixAgent = new FixSuggestionAgentV2();
  
  console.log(`📝 Testing ${testIssues.length} issues...\n`);
  
  // Test each issue individually to see what happens
  for (const issue of testIssues) {
    console.log(`\n🔍 Issue: ${issue.title}`);
    console.log(`   Severity: ${issue.severity}`);
    console.log(`   Category: ${issue.category}`);
    console.log(`   Location: ${issue.location.file}:${issue.location.line}`);
    console.log(`   Code: ${issue.codeSnippet}`);
    
    try {
      const fixes = await fixAgent.generateFixes(
        [issue],
        '/tmp/codequal-repos/sindresorhus-ky-main',
        {
          repositoryUrl: 'https://github.com/sindresorhus/ky',
          prNumber: 700,
          modelConfig: { model: 'gemini-2.5-flash', provider: 'google' }
        }
      );
      
      if (fixes.length > 0) {
        console.log(`   ✅ Fix generated!`);
        console.log(`   Template used: ${fixes[0].templateUsed || 'unknown'}`);
        console.log(`   Confidence: ${fixes[0].confidence}`);
        console.log(`   Fixed code:\n${fixes[0].fixedCode.split('\n').map(l => '      ' + l).join('\n')}`);
        console.log(`   Explanation: ${fixes[0].explanation}`);
      } else {
        console.log(`   ❌ No fix generated`);
      }
    } catch (error: any) {
      console.log(`   ⚠️ Error: ${error.message}`);
    }
  }
  
  // Test batch processing
  console.log('\n\n📊 Batch Processing Test');
  console.log('========================\n');
  
  const allFixes = await fixAgent.generateFixes(
    testIssues,
    '/tmp/codequal-repos/sindresorhus-ky-main',
    {
      repositoryUrl: 'https://github.com/sindresorhus/ky',
      prNumber: 700
    }
  );
  
  console.log(`Total fixes generated: ${allFixes.length}/${testIssues.length}`);
  console.log(`Success rate: ${(allFixes.length / testIssues.length * 100).toFixed(1)}%`);
  
  // Analyze why fixes failed
  console.log('\n🔍 Fix Generation Analysis:');
  const fixedIds = new Set(allFixes.map(f => f.issueId));
  
  testIssues.forEach(issue => {
    if (!fixedIds.has(issue.id)) {
      console.log(`   ❌ ${issue.title}`);
      console.log(`      Likely reason: ${
        issue.category === 'performance' ? 'No template for performance issues' :
        issue.category === 'error-handling' ? 'Generic error handling pattern' :
        'Template matching failed or AI generation disabled'
      }`);
    } else {
      const fix = allFixes.find(f => f.issueId === issue.id);
      console.log(`   ✅ ${issue.title} (${fix?.templateUsed || 'ai-generated'})`);
    }
  });
  
  // Check environment
  console.log('\n📋 Environment Check:');
  console.log(`   OPENROUTER_API_KEY: ${process.env.OPENROUTER_API_KEY ? '✅ Set' : '❌ Not set'}`);
  console.log(`   USE_DEEPWIKI_MOCK: ${process.env.USE_DEEPWIKI_MOCK || 'false'}`);
  console.log(`   Templates available: ✅`);
  console.log(`   AI fallback: ${process.env.OPENROUTER_API_KEY ? '✅ Available' : '❌ Unavailable'}`);
  
  return {
    totalIssues: testIssues.length,
    fixesGenerated: allFixes.length,
    successRate: (allFixes.length / testIssues.length * 100).toFixed(1) + '%'
  };
}

// Run the test
testFixGeneration().then(result => {
  console.log('\n\n📊 Final Summary:');
  console.log('================');
  console.log(`Total Issues: ${result.totalIssues}`);
  console.log(`Fixes Generated: ${result.fixesGenerated}`);
  console.log(`Success Rate: ${result.successRate}`);
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});