/**
 * Test Pattern Application
 *
 * Verifies that the shell injection pattern actually fixes vulnerable code.
 */

import { getFixPatternRegistry, resetFixPatternRegistry } from './index';

async function testPatternApplication() {
  // Reset registry to ensure we get fresh instance with updated code
  resetFixPatternRegistry();
  const registry = getFixPatternRegistry();

  // Sample vulnerable code (shell injection)
  const vulnerableCode = `- name: Deploy to environment
  run: |
    kubectl apply -f deploy-\${{ github.event.inputs.environment }}.yaml`;

  console.log('=== SHELL INJECTION PATTERN TEST ===\n');

  // Look up the pattern
  // Note: Semgrep rule IDs have the full path
  const lookup = await registry.lookup({
    ruleId: 'yaml.github-actions.security.run-shell-injection.run-shell-injection',
    tool: 'semgrep',
    fileType: 'yaml',
    activeOnly: true
  });

  console.log('Pattern Lookup:');
  console.log('  Found:', lookup.found);

  if (lookup.found && lookup.recommended) {
    console.log('  Pattern ID:', lookup.recommended.id);
    console.log('  Pattern Name:', lookup.recommended.name);
    console.log('  Confidence:', lookup.recommended.confidence);
    console.log('  Status:', lookup.recommended.status);

    // Apply the pattern
    const applyResult = await registry.apply({
      patternId: lookup.recommended.id,
      fileContent: vulnerableCode,
      filePath: '.github/workflows/deploy.yml',
      lineNumber: 1
    });

    console.log('\nPattern Application:');
    console.log('  Success:', applyResult.success);
    console.log('  Confidence:', applyResult.confidence);

    console.log('\n--- BEFORE (Vulnerable) ---');
    console.log(vulnerableCode);

    console.log('\n--- AFTER (Fixed) ---');
    console.log(applyResult.fixedCode || '(no fix generated)');

    // Verify the fix contains the expected env: block
    const fixedCode = applyResult.fixedCode || '';
    const hasEnvBlock = fixedCode.includes('env:');
    const usesShellVar = fixedCode.includes('$DEPLOY_ENV') || fixedCode.includes('$INPUT_') || fixedCode.includes('"$');

    // The ${{ }} should ONLY appear in the env: block (YAML context), not in run: block (shell context)
    // Split the code and check run: section separately
    const runSection = fixedCode.split('run:')[1] || '';
    const noInterpolationInRun = !runSection.includes('${{');
    const hasInterpolationInEnv = fixedCode.split('run:')[0].includes('${{');

    console.log('\n=== FIX VALIDATION ===');
    console.log('  Has env: block:', hasEnvBlock);
    console.log('  Uses shell variable in run::', usesShellVar);
    console.log('  ${{ in env: block (expected):', hasInterpolationInEnv);
    console.log('  No ${{ in run: block:', noInterpolationInRun);

    const isValid = hasEnvBlock && usesShellVar && noInterpolationInRun;
    console.log('\n  FIX IS VALID:', isValid);

    if (!isValid) {
      console.log('\n  ❌ FIX VALIDATION FAILED');
      if (!hasEnvBlock) console.log('     - Missing env: block');
      if (!usesShellVar) console.log('     - Not using shell variable');
      if (!noInterpolationInRun) console.log('     - Still has ${{ in run: block');
    }

    return isValid;
  } else {
    console.log('\n❌ No pattern found for shell injection rule!');
    return false;
  }
}

// Run the test
testPatternApplication()
  .then((success) => {
    console.log('\n=== TEST RESULT ===');
    if (success) {
      console.log('✅ PASSED: Shell injection pattern generates correct fix');
    } else {
      console.log('❌ FAILED: Pattern did not generate correct fix');
    }
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Test error:', error);
    process.exit(1);
  });
