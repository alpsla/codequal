#!/usr/bin/env node

/**
 * Pre-commit Regression Test Hook - BUG-017 Implementation
 * 
 * This script is called by git pre-commit hooks to validate
 * that no critical functionality has been broken.
 * 
 * Usage (in .git/hooks/pre-commit):
 *   #!/bin/bash
 *   node packages/agents/scripts/run-pre-commit-regression.js
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🔍 Running pre-commit regression tests...');
console.log('=' .repeat(60));

// Run the TypeScript regression suite
const scriptPath = path.join(__dirname, '..', 'src', 'standard', 'orchestrator', 'dev-cycle-orchestrator.ts');

const child = spawn('npx', ['ts-node', scriptPath], {
  stdio: 'inherit',
  cwd: process.cwd()
});

child.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ Pre-commit regression tests PASSED');
    console.log('   Commit is allowed to proceed');
    process.exit(0);
  } else {
    console.log('\n❌ Pre-commit regression tests FAILED');
    console.log('   Commit is BLOCKED');
    console.log('   Run: npm run test:regression for details');
    console.log('   Or:  npm run test:regression:fix to auto-fix');
    process.exit(1);
  }
});

child.on('error', (error) => {
  console.error('\n💥 Error running pre-commit tests:', error.message);
  console.log('   Commit is BLOCKED due to test execution failure');
  process.exit(1);
});