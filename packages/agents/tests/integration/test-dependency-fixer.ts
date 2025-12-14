/**
 * Test Dependency Vulnerability Fixer
 *
 * Tests the new dependency fixer that handles npm-audit and dependency-check issues.
 */

import {
  DependencyFixerExecutor,
  createDependencyFixer,
  getDependencyFixer,
  isDependencyVulnerability,
  getKnownFixablePackages,
  hasKnownFix,
  type DependencyVulnerability,
} from '../../src/fix-agent/tool-fixers/dependency-fixer';
import * as fs from 'fs';
import * as path from 'path';

// =============================================================================
// TESTS
// =============================================================================

async function runTests(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  DEPENDENCY VULNERABILITY FIXER TESTS                                ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('');

  let passed = 0;
  let failed = 0;

  // Test 1: isDependencyVulnerability detection
  console.log('Test 1: isDependencyVulnerability detection');
  const depTests = [
    { tool: 'npm-audit', rule: 'GHSA-xxxx-xxxx-xxxx', expected: true },
    { tool: 'dependency-check', rule: 'CVE-2021-12345', expected: true },
    { tool: 'snyk', rule: 'SNYK-JS-123', expected: true },
    { tool: 'eslint', rule: 'no-unused-vars', expected: false },
    { tool: 'typescript', rule: 'TS2304', expected: false },
    { tool: 'semgrep', rule: 'detect-child-process', expected: false },
  ];

  for (const test of depTests) {
    const result = isDependencyVulnerability(test.tool, test.rule);
    if (result === test.expected) {
      console.log(`   ✅ ${test.tool}/${test.rule}: ${result}`);
      passed++;
    } else {
      console.log(`   ❌ ${test.tool}/${test.rule}: expected ${test.expected}, got ${result}`);
      failed++;
    }
  }

  // Test 2: Known fix packages
  console.log('');
  console.log('Test 2: Known fixable packages');
  const knownPackages = getKnownFixablePackages();
  console.log(`   Found ${knownPackages.length} known fixable packages:`);
  console.log(`   ${knownPackages.slice(0, 10).join(', ')}${knownPackages.length > 10 ? '...' : ''}`);

  if (knownPackages.length > 20) {
    console.log(`   ✅ More than 20 packages with known fixes`);
    passed++;
  } else {
    console.log(`   ❌ Expected more packages`);
    failed++;
  }

  // Test 3: hasKnownFix
  console.log('');
  console.log('Test 3: hasKnownFix');
  const fixTests = [
    { pkg: 'lodash', expected: true },
    { pkg: 'minimist', expected: true },
    { pkg: 'axios', expected: true },
    { pkg: 'react', expected: false },
    { pkg: 'express', expected: false },
    { pkg: 'unknown-package-xyz', expected: false },
  ];

  for (const test of fixTests) {
    const result = hasKnownFix(test.pkg);
    if (result === test.expected) {
      console.log(`   ✅ ${test.pkg}: ${result}`);
      passed++;
    } else {
      console.log(`   ❌ ${test.pkg}: expected ${test.expected}, got ${result}`);
      failed++;
    }
  }

  // Test 4: Parse vulnerability from message
  console.log('');
  console.log('Test 4: Parse vulnerability from message');
  const fixer = createDependencyFixer();

  const parseTests = [
    {
      message: 'Package: lodash@4.17.11 - Prototype Pollution',
      rule: 'GHSA-35jh-r3h4-6jhm',
      severity: 'high',
      expectedPackage: 'lodash',
    },
    {
      message: 'minimist Prototype Pollution vulnerability',
      rule: 'GHSA-xvch-5gv4-984h',
      severity: 'critical',
      expectedPackage: 'minimist',
    },
    {
      message: 'Vulnerability in "axios" - SSRF',
      rule: 'GHSA-wf5p-g6vw-rhxx',
      severity: 'medium',
      expectedPackage: 'axios',
    },
  ];

  for (const test of parseTests) {
    const result = fixer.parseVulnerabilityFromMessage(test.message, test.rule, test.severity);
    if (result && result.packageName === test.expectedPackage) {
      console.log(`   ✅ Parsed ${test.expectedPackage} from "${test.message.substring(0, 40)}..."`);
      passed++;
    } else {
      console.log(`   ❌ Failed to parse ${test.expectedPackage} (got: ${result?.packageName})`);
      failed++;
    }
  }

  // Test 5: Dry run fix single vulnerability
  console.log('');
  console.log('Test 5: Dry run fix (creates temp package.json)');

  const testDir = `/tmp/test-dep-fixer-${Date.now()}`;
  fs.mkdirSync(testDir, { recursive: true });

  // Create a minimal package.json
  const packageJson = {
    name: 'test-project',
    version: '1.0.0',
    dependencies: {
      express: '^4.17.1',
    },
    devDependencies: {},
  };
  fs.writeFileSync(
    path.join(testDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  const vuln: DependencyVulnerability = {
    packageName: 'lodash',
    advisoryId: 'GHSA-35jh-r3h4-6jhm',
    severity: 'high',
    description: 'Prototype Pollution',
  };

  const fixResult = await fixer.fixVulnerability(testDir, vuln, { dryRun: true, verbose: true });

  if (fixResult.success) {
    console.log(`   ✅ Dry run succeeded`);
    passed++;
  } else {
    console.log(`   ❌ Dry run failed: ${fixResult.error}`);
    failed++;
  }

  // Clean up
  fs.rmSync(testDir, { recursive: true, force: true });

  // Test 6: Fix multiple vulnerabilities
  console.log('');
  console.log('Test 6: Fix multiple vulnerabilities (dry run)');

  const testDir2 = `/tmp/test-dep-fixer-multi-${Date.now()}`;
  fs.mkdirSync(testDir2, { recursive: true });

  fs.writeFileSync(
    path.join(testDir2, 'package.json'),
    JSON.stringify({
      name: 'test-multi',
      version: '1.0.0',
      dependencies: {},
    }, null, 2)
  );

  const vulns: DependencyVulnerability[] = [
    { packageName: 'lodash', advisoryId: 'GHSA-35jh-r3h4-6jhm', severity: 'high' },
    { packageName: 'minimist', advisoryId: 'GHSA-xvch-5gv4-984h', severity: 'critical' },
    { packageName: 'axios', advisoryId: 'GHSA-wf5p-g6vw-rhxx', severity: 'medium' },
    { packageName: 'unknown-pkg', advisoryId: 'GHSA-unknown', severity: 'low' }, // No fix available
  ];

  const multiResult = await fixer.fixMultipleVulnerabilities(testDir2, vulns, { dryRun: true });

  console.log(`   Overrides to add: ${multiResult.overridesAdded}`);
  console.log(`   Packages: ${multiResult.overriddenPackages.join(', ')}`);
  console.log(`   Unfixable: ${multiResult.unfixable.map(u => u.packageName).join(', ')}`);

  if (multiResult.overridesAdded >= 3 && multiResult.unfixable.length === 1) {
    console.log(`   ✅ Multi-fix handled correctly`);
    passed++;
  } else {
    console.log(`   ❌ Unexpected results`);
    failed++;
  }

  // Clean up
  fs.rmSync(testDir2, { recursive: true, force: true });

  // Summary
  console.log('');
  console.log('═'.repeat(70));
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log('═'.repeat(70));

  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('Test error:', error);
  process.exit(1);
});
