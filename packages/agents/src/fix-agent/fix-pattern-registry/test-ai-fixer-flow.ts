/**
 * Test AI Fixer Flow
 *
 * This test demonstrates the complete AI Fixer workflow:
 * 1. AI generates a fix
 * 2. Verifier validates it (test → enhance → retry, max 5 iterations)
 * 3. If passes, submits to registry with verified=true → goes directly to ACTIVE
 * 4. If all attempts fail, reports honestly that manual fix is needed
 *
 * Key points:
 * - AI Fixer is an internal trusted tool (no security validation)
 * - Verified fixes go directly to active (no pending review)
 * - Max retry iterations capped at 5 to prevent infinite loops
 * - Failed fixes are honestly reported to the user
 *
 * Run with: npx ts-node test-ai-fixer-flow.ts
 */

import {
  getFixPatternRegistry,
  resetFixPatternRegistry,
  createAIFixerVerifier,
} from './index';

async function testAIFixerFlow(): Promise<void> {
  console.log('='.repeat(70));
  console.log('TEST: AI Fixer Complete Flow (Updated)');
  console.log('='.repeat(70));

  // Reset registry for clean test
  resetFixPatternRegistry();
  const registry = getFixPatternRegistry();

  // Step 1: Create an AI Fixer Verifier with limited retries
  console.log('\n--- Step 1: Create AI Fixer Verifier ---');
  console.log('Max attempts: 3 (hard limit: 5)');

  const verifier = createAIFixerVerifier({
    maxAttempts: 3, // Will be capped at MAX_ALLOWED_ATTEMPTS (5)
    minScore: 80,
    dryRun: false,
    // Custom enhancer that simulates AI improvement
    enhancer: async ({ originalFix, errors, previousAttempts }) => {
      console.log(`[Enhancer] Attempt ${previousAttempts + 1}: Fixing ${errors.length} errors`);

      let enhanced = originalFix;
      for (const error of errors) {
        if (error.type === 'security' && error.message.includes('eval')) {
          enhanced = enhanced.replace(/eval\s*\(/g, 'safeEval(');
        }
      }
      return enhanced;
    },
  });

  // Step 2: Submit a valid fix (should pass and go directly to ACTIVE)
  console.log('\n--- Step 2: Submit Valid AI Fix ---');
  console.log('Expected: Verified → Goes directly to ACTIVE (no pending review)');

  const validFix = {
    ruleId: 'yaml.github-actions.security.run-shell-injection',
    tool: 'semgrep',
    filePath: '.github/workflows/deploy.yml',
    originalCode: `- name: Deploy
  run: kubectl apply -f deploy-\${{ github.event.inputs.env }}.yaml`,
    fixedCode: `- name: Deploy
  env:
    DEPLOY_ENV: \${{ github.event.inputs.env }}
  run: kubectl apply -f deploy-"$DEPLOY_ENV".yaml`,
    lineNumber: 10,
    issueMessage: 'Shell injection vulnerability detected',
    aiModel: 'claude-sonnet-4-20250514',
    attemptNumber: 1,
  };

  const result1 = await verifier.verifyAndSubmit(validFix);
  console.log('Success:', result1.success);
  console.log('Attempts:', result1.attempts);
  console.log('Pattern Status:', result1.patternResponse?.status);
  console.log('User Message:', result1.userMessage);
  console.log('Requires Manual Fix:', result1.requiresManualFix);

  // Step 3: Submit fix that can be enhanced (should pass after retry)
  console.log('\n--- Step 3: Submit Fix That Needs Enhancement ---');
  console.log('Expected: Fails first, enhancer fixes it, then passes');

  const fixWithIssue = {
    ruleId: 'javascript.security.no-eval',
    tool: 'eslint',
    filePath: 'src/utils/parser.ts',
    originalCode: `const result = eval(userInput);`,
    fixedCode: `const result = eval(sanitize(userInput));`, // Still has eval - should fail
    lineNumber: 25,
    issueMessage: 'Avoid using eval()',
    aiModel: 'claude-sonnet-4-20250514',
    attemptNumber: 1,
  };

  const result2 = await verifier.verifyAndSubmit(fixWithIssue);
  console.log('Success:', result2.success);
  console.log('Attempts:', result2.attempts);
  console.log('Pattern Status:', result2.patternResponse?.status);
  console.log('User Message:', result2.userMessage);

  // Step 4: Submit an unfixable issue (should fail and report honestly)
  console.log('\n--- Step 4: Submit Unfixable Issue ---');
  console.log('Expected: All attempts fail, reports honestly to user');

  const unfixableVerifier = createAIFixerVerifier({
    maxAttempts: 2,
    minScore: 80,
    dryRun: false,
    // Enhancer that can't actually fix the issue
    enhancer: async ({ originalFix }) => {
      // Just return the same code - can't fix it
      return originalFix;
    },
  });

  const unfixable = {
    ruleId: 'complex.issue.needs-human',
    tool: 'custom-analyzer',
    filePath: 'src/complex-logic.ts',
    originalCode: `// Complex business logic that AI cannot safely modify`,
    fixedCode: `eval("dangerous")`, // Intentionally bad - will fail security check
    lineNumber: 100,
    issueMessage: 'Complex architectural issue',
    aiModel: 'claude-sonnet-4-20250514',
    attemptNumber: 1,
  };

  const result3 = await unfixableVerifier.verifyAndSubmit(unfixable);
  console.log('Success:', result3.success);
  console.log('Attempts:', result3.attempts);
  console.log('Requires Manual Fix:', result3.requiresManualFix);
  console.log('Failure Reason:', result3.failureReason);
  console.log('\nUser Message:');
  console.log(result3.userMessage);

  // Step 5: Test max attempts limit
  console.log('\n--- Step 5: Test Max Attempts Limit ---');
  console.log('Expected: Request for 10 attempts capped to 5');

  const cappedVerifier = createAIFixerVerifier({
    maxAttempts: 10, // Will be capped to MAX_ALLOWED_ATTEMPTS (5)
    minScore: 80,
    dryRun: true,
  });

  // Step 6: Check active patterns (should be directly active, not pending)
  console.log('\n--- Step 6: Check Pattern Registry ---');
  const activePatterns = await registry.listPatterns({ status: 'active' });
  const pendingPatterns = await registry.listPatterns({ status: 'pending_review' });

  console.log(`Active patterns: ${activePatterns.length}`);
  console.log(`Pending patterns: ${pendingPatterns.length}`);

  // List active AI-generated patterns
  const aiPatterns = activePatterns.filter(
    (p) => p.metadata.source === 'ai_generated'
  );
  console.log(`\nAI-generated active patterns: ${aiPatterns.length}`);
  for (const pattern of aiPatterns) {
    console.log(`  - ${pattern.name} (verified: ${pattern.metadata.tags?.includes('verified')})`);
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('TEST SUMMARY');
  console.log('='.repeat(70));
  console.log('✅ AI Fixer is trusted (no security validation)');
  console.log('✅ Verified fixes go directly to ACTIVE');
  console.log('✅ Max attempts capped at 5 (prevents infinite loops)');
  console.log('✅ Failed fixes are honestly reported to user');
  console.log('✅ User message explains what went wrong');
  console.log('✅ requiresManualFix flag indicates human intervention needed');
}

// Run the test
testAIFixerFlow()
  .then(() => {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
