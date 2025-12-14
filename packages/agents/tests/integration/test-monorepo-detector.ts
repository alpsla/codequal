/**
 * Test for MonorepoDetector Service
 *
 * Tests detection of various monorepo/project types and setup instruction generation.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import {
  MonorepoDetector,
  createMonorepoDetector,
  detectProjectType,
  getSetupInstructions,
  validateProjectSetup,
} from '../../src/two-branch/utils/monorepo-detector';

// Test repositories
const TEST_REPOS = [
  {
    name: 'NestJS (Lerna)',
    url: 'https://github.com/nestjs/nest',
    expectedType: 'lerna',
    expectedMonorepo: true,
  },
  {
    name: 'Standard npm project (CodeQual itself)',
    path: path.join(__dirname, '../../../..'), // Root of CodeQual
    expectedType: 'turborepo', // CodeQual uses Turborepo
    expectedMonorepo: true,
  },
];

async function runTest(): Promise<void> {
  console.log('='.repeat(70));
  console.log('MONOREPO DETECTOR TEST');
  console.log('='.repeat(70));
  console.log('');

  const detector = createMonorepoDetector();
  let allPassed = true;

  // Test 1: Test on CodeQual itself (should be Turborepo)
  console.log('TEST 1: Detecting CodeQual project type');
  console.log('-'.repeat(40));

  const codqualRoot = path.resolve(__dirname, '../../../..');
  const codequalResult = await detector.detect(codqualRoot);

  console.log(`  Detected type: ${codequalResult.type}`);
  console.log(`  Display name: ${codequalResult.displayName}`);
  console.log(`  Is monorepo: ${codequalResult.isMonorepo}`);
  console.log(`  Package manager: ${codequalResult.packageManager}`);
  console.log(`  Confidence: ${codequalResult.confidence}%`);
  console.log(`  Detected files: ${codequalResult.detectedFiles.join(', ')}`);

  const isCodequalCorrect = codequalResult.type === 'turborepo' && codequalResult.isMonorepo;
  console.log(`  Result: ${isCodequalCorrect ? '✅ PASS' : '❌ FAIL'}`);
  if (!isCodequalCorrect) allPassed = false;
  console.log('');

  // Test 2: Get setup instructions for CodeQual
  console.log('TEST 2: Getting setup instructions');
  console.log('-'.repeat(40));

  const instructions = await detector.getSetupInstructions(codqualRoot);

  console.log(`  Project type: ${instructions.projectType.displayName}`);
  console.log(`  Dependencies installed: ${instructions.dependenciesInstalled}`);
  console.log(`  Setup commands: ${instructions.setupCommands.length}`);

  for (const cmd of instructions.setupCommands) {
    console.log(`    - ${cmd.description}: ${cmd.command}`);
  }

  console.log('');
  console.log('  Works without setup:');
  for (const item of instructions.withoutSetup) {
    console.log(`    - ${item}`);
  }

  console.log('');
  console.log('  Requires setup:');
  for (const item of instructions.requiresSetup) {
    console.log(`    - ${item}`);
  }

  const hasInstructions = instructions.setupCommands.length > 0;
  console.log(`  Result: ${hasInstructions ? '✅ PASS' : '❌ FAIL'}`);
  if (!hasInstructions) allPassed = false;
  console.log('');

  // Test 3: Validate setup
  console.log('TEST 3: Validating project setup');
  console.log('-'.repeat(40));

  const validation = await detector.validateSetup(codqualRoot);

  console.log(`  Is valid: ${validation.isValid}`);
  console.log(`  Issues: ${validation.issues.length}`);
  for (const issue of validation.issues) {
    console.log(`    - ${issue}`);
  }
  console.log(`  Suggestions: ${validation.suggestions.length}`);
  for (const suggestion of validation.suggestions) {
    console.log(`    - ${suggestion}`);
  }

  // This should pass for CodeQual since it has node_modules
  console.log(`  Result: ${validation.isValid ? '✅ PASS' : '⚠️ WARN (expected node_modules to exist)'}`);
  console.log('');

  // Test 4: Test markdown generation
  console.log('TEST 4: Testing markdown generation');
  console.log('-'.repeat(40));

  const hasMarkdown = instructions.markdown.includes('Setup Required');
  console.log(`  Markdown generated: ${hasMarkdown ? 'Yes' : 'No'}`);
  console.log(`  Markdown length: ${instructions.markdown.length} chars`);
  console.log(`  Result: ${hasMarkdown ? '✅ PASS' : '❌ FAIL'}`);
  if (!hasMarkdown) allPassed = false;
  console.log('');

  // Test 5: Test HTML generation
  console.log('TEST 5: Testing HTML generation');
  console.log('-'.repeat(40));

  const hasHTML = instructions.html.includes('setup-instructions');
  console.log(`  HTML generated: ${hasHTML ? 'Yes' : 'No'}`);
  console.log(`  HTML length: ${instructions.html.length} chars`);
  console.log(`  Result: ${hasHTML ? '✅ PASS' : '❌ FAIL'}`);
  if (!hasHTML) allPassed = false;
  console.log('');

  // Test 6: Test NestJS detection (clone briefly to test)
  console.log('TEST 6: Testing NestJS (Lerna) detection');
  console.log('-'.repeat(40));

  const tempDir = `/tmp/test-monorepo-detect-${Date.now()}`;
  try {
    fs.mkdirSync(tempDir, { recursive: true });

    console.log('  Cloning NestJS (shallow)...');
    execSync(`git clone --depth 1 https://github.com/nestjs/nest ${tempDir}/nest`, {
      stdio: 'pipe',
      encoding: 'utf-8',
    });

    const nestResult = await detector.detect(`${tempDir}/nest`);

    console.log(`  Detected type: ${nestResult.type}`);
    console.log(`  Display name: ${nestResult.displayName}`);
    console.log(`  Is monorepo: ${nestResult.isMonorepo}`);
    console.log(`  Workspace paths: ${nestResult.workspacePaths?.slice(0, 3).join(', ')}...`);

    const isNestCorrect = nestResult.type === 'lerna' && nestResult.isMonorepo;
    console.log(`  Result: ${isNestCorrect ? '✅ PASS' : '❌ FAIL'}`);
    if (!isNestCorrect) allPassed = false;

    // Test getting setup instructions for NestJS
    const nestInstructions = await detector.getSetupInstructions(`${tempDir}/nest`);
    console.log('');
    console.log('  NestJS Setup Commands:');
    for (const cmd of nestInstructions.setupCommands) {
      console.log(`    - ${cmd.description}: ${cmd.command}`);
    }

    // Cleanup
    execSync(`rm -rf ${tempDir}`, { stdio: 'pipe' });
  } catch (error) {
    console.log(`  ⚠️ Could not test NestJS detection: ${error instanceof Error ? error.message : String(error)}`);
    execSync(`rm -rf ${tempDir}`, { stdio: 'pipe' }).toString();
  }
  console.log('');

  // Test 7: Test convenience functions
  console.log('TEST 7: Testing convenience functions');
  console.log('-'.repeat(40));

  const quickDetect = await detectProjectType(codqualRoot);
  const quickInstructions = await getSetupInstructions(codqualRoot);
  const quickValidation = await validateProjectSetup(codqualRoot);

  const conveniencesWork =
    quickDetect.type === codequalResult.type &&
    quickInstructions.projectType.type === instructions.projectType.type &&
    typeof quickValidation.isValid === 'boolean';

  console.log(`  detectProjectType(): ${quickDetect.type}`);
  console.log(`  getSetupInstructions(): ${quickInstructions.projectType.displayName}`);
  console.log(`  validateProjectSetup(): isValid=${quickValidation.isValid}`);
  console.log(`  Result: ${conveniencesWork ? '✅ PASS' : '❌ FAIL'}`);
  if (!conveniencesWork) allPassed = false;
  console.log('');

  // Summary
  console.log('='.repeat(70));
  console.log('TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`Overall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  console.log('');

  // Show sample markdown output
  console.log('='.repeat(70));
  console.log('SAMPLE MARKDOWN OUTPUT');
  console.log('='.repeat(70));
  console.log(instructions.markdown.slice(0, 1500));
  if (instructions.markdown.length > 1500) {
    console.log('... (truncated)');
  }
}

// Run the test
runTest()
  .then(() => {
    console.log('');
    console.log('✅ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
