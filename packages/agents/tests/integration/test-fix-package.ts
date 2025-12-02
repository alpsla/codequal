#!/usr/bin/env npx ts-node
/**
 * Fix Package Generator Test
 *
 * Tests the complete fix package generation workflow:
 * 1. Load LSP actions
 * 2. Generate Cursor/Copilot/Generic prompts
 * 3. Create ZIP file
 *
 * Usage:
 *   npx ts-node tests/integration/test-fix-package.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateFixPackageFromLSP } from '../../src/fix-agent';
import { createFixPackageZip, formatFileSize } from '../../src/fix-agent/zip-generator';

// ============================================================================
// Configuration
// ============================================================================

const TEST_CONFIG = {
  lspActionsPath: path.join(__dirname, '../../test-outputs/codequal-lsp-actions.json'),
  outputDir: path.join(__dirname, '../../test-outputs/fix-package'),
  repository: 'test/codequal',
  branch: 'test/autofix-baseline'
};

// ============================================================================
// Tests
// ============================================================================

async function main(): Promise<void> {
  console.log('📦 Fix Package Generator Test');
  console.log('==============================\n');

  // Check if LSP actions file exists
  if (!fs.existsSync(TEST_CONFIG.lspActionsPath)) {
    console.log(`❌ LSP actions file not found: ${TEST_CONFIG.lspActionsPath}`);
    console.log('   Run a V9 analysis first to generate this file.');
    process.exit(1);
  }

  // Clean output directory
  if (fs.existsSync(TEST_CONFIG.outputDir)) {
    fs.rmSync(TEST_CONFIG.outputDir, { recursive: true });
  }

  console.log('📄 Generating fix package...\n');

  // Generate fix package
  const result = await generateFixPackageFromLSP(
    TEST_CONFIG.lspActionsPath,
    TEST_CONFIG.outputDir,
    {
      repository: TEST_CONFIG.repository,
      branch: TEST_CONFIG.branch
    }
  );

  console.log('✅ Fix package generated!\n');
  console.log('📊 Summary:');
  console.log(`   Total Issues: ${result.totalIssues}`);
  console.log(`   Critical: ${result.bySeverity.critical}`);
  console.log(`   High: ${result.bySeverity.high}`);
  console.log(`   Medium: ${result.bySeverity.medium}`);
  console.log(`   Low: ${result.bySeverity.low}`);
  console.log('');

  console.log('📁 Generated Files:');
  for (const file of result.files) {
    const fullPath = path.join(result.outputDir, file);
    if (fs.existsSync(fullPath)) {
      const stat = fs.statSync(fullPath);
      console.log(`   ✅ ${file} (${formatFileSize(stat.size)})`);
    } else {
      console.log(`   ❌ ${file} (missing)`);
    }
  }
  console.log('');

  // Create ZIP file
  console.log('📦 Creating ZIP file...\n');

  const zipResult = await createFixPackageZip(TEST_CONFIG.outputDir);

  console.log('✅ ZIP created!');
  console.log(`   Path: ${zipResult.zipPath}`);
  console.log(`   Size: ${formatFileSize(zipResult.size)}`);
  console.log(`   Files: ${zipResult.files}`);
  console.log('');

  // Verify key files exist
  console.log('🔍 Verifying package contents...\n');

  const requiredFiles = [
    'README.md',
    'FIXES-BY-SEVERITY.md',
    'cursor/fix-all-high.md',
    'copilot/fix-all-high.md',
    'generic/fix-all-high.md',
    'data/issues.json'
  ];

  let allPresent = true;
  for (const file of requiredFiles) {
    const fullPath = path.join(result.outputDir, file);
    if (fs.existsSync(fullPath)) {
      console.log(`   ✅ ${file}`);
    } else {
      console.log(`   ❌ ${file} (MISSING)`);
      allPresent = false;
    }
  }
  console.log('');

  // Show sample Cursor prompt
  console.log('📝 Sample Cursor Prompt (first 30 lines):');
  console.log('─'.repeat(50));
  const cursorPromptPath = path.join(result.outputDir, 'cursor/fix-all-high.md');
  if (fs.existsSync(cursorPromptPath)) {
    const content = fs.readFileSync(cursorPromptPath, 'utf-8');
    const lines = content.split('\n').slice(0, 30);
    console.log(lines.join('\n'));
    console.log('...');
  }
  console.log('─'.repeat(50));
  console.log('');

  // Final result
  if (allPresent) {
    console.log('═'.repeat(50));
    console.log('✅ ALL TESTS PASSED');
    console.log('═'.repeat(50));
    console.log('');
    console.log('📦 Fix package ready for download:');
    console.log(`   ${zipResult.zipPath}`);
    console.log('');
    console.log('🚀 Users can now:');
    console.log('   1. Download this ZIP');
    console.log('   2. Open cursor/fix-all-high.md');
    console.log('   3. Copy & paste into Cursor/Copilot');
    console.log('   4. Apply fixes with their AI subscription');
  } else {
    console.log('═'.repeat(50));
    console.log('❌ SOME TESTS FAILED');
    console.log('═'.repeat(50));
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
