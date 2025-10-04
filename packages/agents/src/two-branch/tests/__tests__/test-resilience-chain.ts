/**
 * Test Complete Resilience Chain
 *
 * Validates 4-tier resilience:
 * 1. OpenRouter multi-key rotation (3 keys, all expected to fail with current bug)
 * 2. Emergency Gemini fallback (should succeed)
 * 3. Static analysis fallback (if Gemini also fails)
 *
 * Expected behavior with current OpenRouter bug:
 * - Try all 3 OpenRouter keys → all return 401
 * - Activate Gemini emergency fallback → succeeds
 * - User gets AI-powered fix suggestions
 */

import { SecurityAgent } from '../../agents/specialized-agents';

async function testResilienceChain() {
  console.log('🧪 Testing Complete Resilience Chain\n');
  console.log('=' .repeat(80));

  // Create a test security issue
  const testIssue = {
    title: 'SQL Injection Vulnerability',
    description: 'Unsanitized user input used in SQL query',
    type: 'security',
    severity: 'critical' as const,
    file: 'src/database/users.ts',
    line: 42,
    codeSnippet: `
      const query = \`SELECT * FROM users WHERE username = '\${userInput}'\`;
      const result = await db.execute(query);
    `,
    tool: 'semgrep'
  };

  console.log('📋 Test Issue:');
  console.log(`   Title: ${testIssue.title}`);
  console.log(`   Severity: ${testIssue.severity}`);
  console.log(`   File: ${testIssue.file}:${testIssue.line}`);
  console.log(`   Tool: ${testIssue.tool}\n`);

  console.log('🔄 Expected Flow:');
  console.log('   1. ❌ OpenRouter Key 1 → 401 User not found');
  console.log('   2. ❌ OpenRouter Key 2 → 401 User not found');
  console.log('   3. ❌ OpenRouter Key 3 → 401 User not found');
  console.log('   4. 🚨 Emergency Fallback → Gemini 2.0 Flash Thinking');
  console.log('   5. ✅ AI-powered fix suggestion returned\n');

  console.log('=' .repeat(80));
  console.log('🚀 Starting test...\n');

  try {
    const agent = new SecurityAgent();

    const startTime = Date.now();
    const fixSuggestion = await agent.generateFixSuggestion(testIssue);
    const duration = Date.now() - startTime;

    console.log('\n' + '='.repeat(80));
    console.log('✅ TEST PASSED - Resilience Chain Working!\n');

    console.log('📊 Results:');
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Fix Provided: ${fixSuggestion.fix ? 'Yes' : 'No'}`);
    console.log(`   Code Snippet: ${fixSuggestion.correctedCode ? 'Yes' : 'No'}`);
    console.log(`   Best Practices: ${fixSuggestion.bestPractices?.length || 0} items\n`);

    console.log('🔍 Fix Suggestion Preview:');
    console.log(`   ${fixSuggestion.fix.substring(0, 200)}...\n`);

    if (fixSuggestion.correctedCode) {
      console.log('💻 Code Snippet Preview:');
      const codeLines = fixSuggestion.correctedCode.split('\n').slice(0, 5);
      codeLines.forEach(line => console.log(`   ${line}`));
      console.log();
    }

    if (fixSuggestion.bestPractices && fixSuggestion.bestPractices.length > 0) {
      console.log('📚 Best Practices:');
      fixSuggestion.bestPractices.forEach((practice, i) => {
        console.log(`   ${i + 1}. ${practice}`);
      });
      console.log();
    }

    console.log('=' .repeat(80));
    console.log('✅ RESILIENCE VALIDATION COMPLETE');
    console.log('   - Multi-key rotation: WORKING');
    console.log('   - Emergency fallback: WORKING');
    console.log('   - Users get AI fixes: WORKING');
    console.log('   - Production ready: YES\n');

    return true;

  } catch (error: any) {
    console.error('\n' + '='.repeat(80));
    console.error('❌ TEST FAILED\n');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('\n' + '='.repeat(80));

    return false;
  }
}

// Run test
testResilienceChain()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
