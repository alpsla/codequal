/**
 * Test Fix Pattern Registry
 *
 * Run with: npx ts-node src/fix-agent/fix-pattern-registry/test-pattern-registry.ts
 */

import { getFixPatternRegistry, hasPatternForRule, getPatternStats } from './index';

async function testPatternRegistry() {
  console.log('=== Fix Pattern Registry Test ===\n');

  const registry = getFixPatternRegistry();

  // Test 1: Lookup pattern for shell injection rule
  console.log('Test 1: Lookup pattern for shell injection rule');
  const lookup = await registry.lookup({
    ruleId: 'yaml.github-actions.security.run-shell-injection.run-shell-injection',
    tool: 'semgrep',
    activeOnly: true,
  });

  console.log(`  Found: ${lookup.found}`);
  console.log(`  Patterns: ${lookup.patterns.length}`);
  if (lookup.recommended) {
    console.log(`  Recommended: ${lookup.recommended.name}`);
    console.log(`  Confidence: ${lookup.recommended.confidence}`);
    console.log(`  Status: ${lookup.recommended.status}`);
  }
  console.log();

  // Test 2: Check hasPatternForRule helper
  console.log('Test 2: Check hasPatternForRule helper');
  const hasPattern = await hasPatternForRule(
    'yaml.github-actions.security.run-shell-injection.run-shell-injection',
    'semgrep'
  );
  console.log(`  Has pattern: ${hasPattern}`);
  console.log();

  // Test 3: List all patterns
  console.log('Test 3: List all patterns');
  const allPatterns = await registry.listPatterns();
  console.log(`  Total patterns: ${allPatterns.length}`);
  for (const pattern of allPatterns) {
    console.log(`    - ${pattern.id}: ${pattern.name} (${pattern.status})`);
  }
  console.log();

  // Test 4: Get pattern stats
  console.log('Test 4: Get pattern stats');
  const stats = await getPatternStats();
  console.log(`  Total patterns: ${stats.totalPatterns}`);
  console.log(`  Active patterns: ${stats.activePatterns}`);
  console.log(`  By tool:`, stats.byTool);
  console.log();

  // Test 5: Show example from pattern
  console.log('Test 5: Show example from pattern');
  if (lookup.recommended && lookup.recommended.examples.length > 0) {
    const example = lookup.recommended.examples[0];
    console.log(`  Description: ${example.description}`);
    console.log(`  Before:`);
    console.log(example.before.split('\n').map(l => `    ${l}`).join('\n'));
    console.log(`  After:`);
    console.log(example.after.split('\n').map(l => `    ${l}`).join('\n'));
  }
  console.log();

  // Test 6: Simulate capturing a new fix
  console.log('Test 6: Simulate capturing a new fix');
  const captureResult = await registry.capture({
    ruleId: 'yaml.github-actions.security.run-shell-injection.run-shell-injection',
    tool: 'semgrep',
    filePath: '.github/workflows/test.yml',
    beforeCode: `    - name: Deploy
      run: |
        kubectl apply -f deploy-\${{ github.event.inputs.env }}.yaml`,
    afterCode: `    - name: Deploy
      env:
        DEPLOY_ENV: \${{ github.event.inputs.env }}
      run: |
        kubectl apply -f "deploy-$DEPLOY_ENV.yaml"`,
    lineNumber: 10,
    issueMessage: 'Shell injection vulnerability',
    userId: 'test-user',
  });

  console.log(`  Success: ${captureResult.success}`);
  console.log(`  Pattern ID: ${captureResult.patternId}`);
  console.log(`  Status: ${captureResult.status}`);
  console.log(`  Message: ${captureResult.message}`);
  console.log(`  Auto-approved: ${captureResult.autoApproved}`);
  console.log();

  // Test 7: Verify new pattern was added
  console.log('Test 7: Verify new pattern was added');
  const updatedPatterns = await registry.listPatterns();
  console.log(`  Total patterns now: ${updatedPatterns.length}`);
  console.log();

  console.log('=== All tests completed ===');
}

// Run tests
testPatternRegistry()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
