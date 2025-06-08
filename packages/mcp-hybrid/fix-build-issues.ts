#!/usr/bin/env ts-node

/**
 * Script to identify and help fix build/lint issues in mcp-hybrid package
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const rootDir = path.join(__dirname);
const srcDir = path.join(rootDir, 'src');

// Issues to fix
const issues = {
  imports: [],
  types: [],
  eslint: [],
  other: []
};

// Common import fixes
const importFixes = new Map([
  // Fix @codequal/core imports
  ["import { Agent, AnalysisResult } from '@codequal/core'", "import type { Agent, AnalysisResult } from '@codequal/core'"],
  ["import { createLogger } from '@codequal/core/utils'", "import { logging } from '@codequal/core';\nconst { createLogger } = logging"],
]);

// Check TypeScript compilation
console.log('🔍 Checking TypeScript compilation...\n');
try {
  execSync('npx tsc --noEmit', { cwd: rootDir, stdio: 'pipe' });
  console.log('✅ TypeScript compilation successful!\n');
} catch (error: any) {
  console.log('❌ TypeScript compilation errors found:\n');
  const output = error.stdout?.toString() || error.message;
  console.log(output);
  
  // Parse TypeScript errors
  const lines = output.split('\n');
  lines.forEach(line => {
    if (line.includes('error TS')) {
      issues.types.push(line);
    }
  });
}

// Check ESLint
console.log('\n🔍 Checking ESLint...\n');
try {
  execSync('npx eslint src --ext .ts', { cwd: rootDir, stdio: 'pipe' });
  console.log('✅ ESLint check successful!\n');
} catch (error: any) {
  console.log('❌ ESLint errors found:\n');
  const output = error.stdout?.toString() || error.message;
  console.log(output);
  
  // Parse ESLint errors
  const lines = output.split('\n');
  lines.forEach(line => {
    if (line.includes('error') || line.includes('warning')) {
      issues.eslint.push(line);
    }
  });
}

// Summary
console.log('\n📊 Summary of issues:');
console.log(`- TypeScript errors: ${issues.types.length}`);
console.log(`- ESLint errors: ${issues.eslint.length}`);
console.log(`- Import issues: ${issues.imports.length}`);

// Suggest fixes
console.log('\n💡 Suggested fixes:\n');

// Common TypeScript fixes
if (issues.types.some(e => e.includes("Module '@codequal/core' has no exported member"))) {
  console.log('1. Fix @codequal/core imports:');
  console.log('   - Change: import { Agent, AnalysisResult } from "@codequal/core"');
  console.log('   - To: import type { Agent, AnalysisResult } from "@codequal/core"');
  console.log('');
}

if (issues.types.some(e => e.includes("Cannot find module '@codequal/core/utils'"))) {
  console.log('2. Fix @codequal/core/utils imports:');
  console.log('   - Change: import { createLogger } from "@codequal/core/utils"');
  console.log('   - To: import { logging } from "@codequal/core"');
  console.log('        const { createLogger } = logging;');
  console.log('');
}

// Common ESLint fixes
if (issues.eslint.some(e => e.includes('no-explicit-any'))) {
  console.log('3. Fix no-explicit-any warnings:');
  console.log('   - Replace "any" with specific types where possible');
  console.log('   - Use "unknown" for truly unknown types');
  console.log('   - Add // eslint-disable-next-line @typescript-eslint/no-explicit-any for justified uses');
  console.log('');
}

if (issues.eslint.some(e => e.includes('no-unused-vars'))) {
  console.log('4. Fix no-unused-vars warnings:');
  console.log('   - Remove unused variables');
  console.log('   - Prefix with underscore for intentionally unused: _unusedVar');
  console.log('   - For unused imports, remove them');
  console.log('');
}

console.log('\n🛠️  Run the following commands to fix issues:');
console.log('1. npm run lint -- --fix   # Auto-fix ESLint issues');
console.log('2. npm run type-check      # Re-check TypeScript');
console.log('3. npm run build           # Build the package');
