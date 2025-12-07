/**
 * ESLint Diagnostic Test
 *
 * Standalone test to diagnose why ESLint is returning 0 issues.
 * This test creates a minimal setup and validates ESLint detection.
 *
 * Usage: npx ts-node tests/integration/typescript/test-eslint-diagnostic.ts
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║           ESLint Diagnostic Test                              ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

// Create temp directory
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eslint-diagnostic-'));
console.log(`📁 Test directory: ${tmpDir}\n`);

try {
  // Step 1: Create package.json
  console.log('Step 1: Creating package.json...');
  const packageJson = {
    name: 'eslint-diagnostic-test',
    version: '1.0.0',
    devDependencies: {
      'eslint': '^8.0.0',
      '@typescript-eslint/parser': '^6.0.0',
      '@typescript-eslint/eslint-plugin': '^6.0.0',
      'typescript': '^5.0.0'
    }
  };
  fs.writeFileSync(
    path.join(tmpDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
  console.log('✅ package.json created\n');

  // Step 2: Install dependencies
  console.log('Step 2: Installing ESLint and TypeScript...');
  try {
    execSync('npm install', { cwd: tmpDir, stdio: 'inherit' });
    console.log('✅ Dependencies installed\n');
  } catch (error) {
    console.log('⚠️  npm install failed, trying with --legacy-peer-deps...');
    execSync('npm install --legacy-peer-deps', { cwd: tmpDir, stdio: 'inherit' });
    console.log('✅ Dependencies installed\n');
  }

  // Step 3: Create .eslintrc.json
  console.log('Step 3: Creating .eslintrc.json...');
  const eslintConfig = {
    extends: ['eslint:recommended'],
    parser: '@typescript-eslint/parser',
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module'
    },
    plugins: ['@typescript-eslint'],
    env: {
      node: true,
      es6: true
    },
    rules: {
      'no-unused-vars': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      'no-console': 'warn'
    }
  };
  fs.writeFileSync(
    path.join(tmpDir, '.eslintrc.json'),
    JSON.stringify(eslintConfig, null, 2)
  );
  console.log('✅ .eslintrc.json created\n');

  // Step 4: Create test file with known issues
  console.log('Step 4: Creating test.ts with known ESLint issues...');
  const testFileContent = `// Test file with intentional ESLint issues

// Issue 1: Unused variable
const unusedVariable = 'test';

// Issue 2: Another unused variable
const anotherUnused = 42;

// Issue 3: Unused function parameter
export function testFunction(unusedParam: string) {
  return 'test';
}

// Issue 4: Console.log
console.log('This should trigger no-console warning');

// Issue 5: Unused import would go here if we had imports
`;
  const testFilePath = path.join(tmpDir, 'test.ts');
  fs.writeFileSync(testFilePath, testFileContent);
  console.log('✅ test.ts created with 4 intentional issues\n');

  // Step 5: Run ESLint WITHOUT --config flag
  console.log('Step 5: Running ESLint WITHOUT --config flag...');
  try {
    const result1 = execSync('npx eslint test.ts --format json', {
      cwd: tmpDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    const results1 = JSON.parse(result1);
    const issues1 = results1[0]?.messages?.length || 0;
    console.log(`   Result: ${issues1} issues found`);
    if (issues1 === 0) {
      console.log('   ⚠️  No issues found without --config flag\n');
    } else {
      console.log('   ✅ Issues detected!\n');
    }
  } catch (error: any) {
    if (error.stdout) {
      try {
        const results1 = JSON.parse(error.stdout);
        const issues1 = results1[0]?.messages?.length || 0;
        console.log(`   Result: ${issues1} issues found (ESLint exit code 1 = has issues)`);
        console.log('   ✅ Issues detected!\n');
      } catch {
        console.log(`   ⚠️  Failed to parse: ${error.stdout.substring(0, 200)}\n`);
      }
    } else {
      console.log(`   ❌ Error: ${error.message}\n`);
    }
  }

  // Step 6: Run ESLint WITH --config flag
  console.log('Step 6: Running ESLint WITH --config .eslintrc.json flag...');
  try {
    const result2 = execSync('npx eslint test.ts --config .eslintrc.json --format json', {
      cwd: tmpDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    const results2 = JSON.parse(result2);
    const issues2 = results2[0]?.messages?.length || 0;
    console.log(`   Result: ${issues2} issues found`);
    if (issues2 === 0) {
      console.log('   🚨 CRITICAL: No issues found even with --config flag!\n');
    } else {
      console.log('   ✅ Issues detected!\n');
    }
  } catch (error: any) {
    if (error.stdout) {
      try {
        const results2 = JSON.parse(error.stdout);
        const issues2 = results2[0]?.messages?.length || 0;
        console.log(`   Result: ${issues2} issues found (ESLint exit code 1 = has issues)`);
        if (issues2 > 0) {
          console.log('   ✅ Issues detected!\n');
          console.log('   📋 Issues found:');
          results2[0].messages.forEach((msg: any, idx: number) => {
            console.log(`      ${idx + 1}. ${msg.ruleId} (line ${msg.line}): ${msg.message}`);
          });
          console.log('');
        }
      } catch {
        console.log(`   ⚠️  Failed to parse: ${error.stdout.substring(0, 200)}\n`);
      }
    } else {
      console.log(`   ❌ Error: ${error.message}\n`);
    }
  }

  // Step 7: Check config file
  console.log('Step 7: Verifying .eslintrc.json content...');
  const configContent = fs.readFileSync(path.join(tmpDir, '.eslintrc.json'), 'utf-8');
  const config = JSON.parse(configContent);
  console.log('   Config rules:');
  console.log(`      no-unused-vars: ${config.rules['no-unused-vars']}`);
  console.log(`      @typescript-eslint/no-unused-vars: ${config.rules['@typescript-eslint/no-unused-vars']}`);
  console.log(`      no-console: ${config.rules['no-console']}`);
  console.log('');

  // Step 8: Summary
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                    Diagnostic Summary                         ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  console.log('Expected behavior:');
  console.log('  - ESLint should find 4 issues (3 no-unused-vars + 1 no-console)');
  console.log('  - Using --config flag should ensure our .eslintrc.json is used');
  console.log('');
  console.log('If ESLint found 0 issues:');
  console.log('  1. Check if eslint/typescript packages installed correctly');
  console.log('  2. Check if parser is compatible with TypeScript version');
  console.log('  3. Verify .eslintrc.json syntax is valid');
  console.log('  4. Try using .eslintrc.js instead of .json');
  console.log('');
  console.log(`Test directory: ${tmpDir}`);
  console.log('(Directory left intact for manual inspection)');
  console.log('');

} catch (error: any) {
  console.error('❌ Diagnostic test failed:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
