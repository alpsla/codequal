#!/usr/bin/env node
/**
 * LSP Fix Applicator (Dry Run)
 * 
 * Simulates applying LSP fixes to show what would change.
 * Does NOT actually modify files - just shows a preview.
 * 
 * Usage:
 *   node apply-lsp-fixes-dry-run.js <lsp-json> <action-index> [repo-path]
 * 
 * Examples:
 *   # Preview "Apply All" (index 0)
 *   node apply-lsp-fixes-dry-run.js test-outputs/codequal-lsp-actions.json 0
 *   
 *   # Preview "Apply High Severity" (index 1)
 *   node apply-lsp-fixes-dry-run.js test-outputs/codequal-lsp-actions.json 1
 *   
 *   # Preview specific fix (index 10)
 *   node apply-lsp-fixes-dry-run.js test-outputs/codequal-lsp-actions.json 10
 */

const fs = require('fs');
const path = require('path');

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function previewLSPFix(lspFilePath, actionIndex, repoPath) {
    console.log('\n' + '='.repeat(80));
    log('LSP FIX APPLICATOR (DRY RUN)', 'bright');
    console.log('='.repeat(80) + '\n');

    // Load LSP JSON
    const lspContent = fs.readFileSync(lspFilePath, 'utf8');
    const lspActions = JSON.parse(lspContent);

    if (actionIndex >= lspActions.length) {
        log(`❌ Invalid action index: ${actionIndex} (max: ${lspActions.length - 1})`, 'red');
        process.exit(1);
    }

    const action = lspActions[actionIndex];
    const changes = action.edit?.changes || {};
    const files = Object.keys(changes);

    log(`📋 Action: ${action.title}`, 'cyan');
    log(`📁 Files to modify: ${files.length}`, 'cyan');
    log(`✏️  Total edits: ${files.reduce((sum, f) => sum + changes[f].length, 0)}\n`, 'cyan');

    if (files.length === 0) {
        log('⚠️  No changes in this action', 'yellow');
        return;
    }

    // Show preview for each file
    files.forEach((fileUri, index) => {
        const fileName = fileUri.split('/').pop();
        const edits = changes[fileUri];

        console.log('─'.repeat(80));
        log(`\n📄 File ${index + 1}/${files.length}: ${fileName}`, 'bright');
        log(`   URI: ${fileUri}`, 'dim');
        log(`   Edits: ${edits.length}\n`, 'cyan');

        edits.forEach((edit, editIndex) => {
            const { range, newText } = edit;
            const startLine = range.start.line;
            const endLine = range.end.line;

            log(`  Edit ${editIndex + 1}:`, 'yellow');
            log(`    Lines: ${startLine}-${endLine}`, 'dim');
            log(`    Type: ${newText.includes('TODO: CodeQual') ? 'Comment Block' : 'Code Replacement'}`,
                newText.includes('TODO: CodeQual') ? 'yellow' : 'green');

            // Show preview of newText (first 200 chars)
            const preview = newText.length > 200
                ? newText.substring(0, 200) + '...'
                : newText;

            log(`    Preview:`, 'dim');
            preview.split('\n').forEach(line => {
                log(`      ${line}`, 'cyan');
            });

            if (newText.length > 200) {
                log(`    ... (${newText.length - 200} more characters)`, 'dim');
            }

            console.log();
        });
    });

    console.log('='.repeat(80));
    log('\n✅ DRY RUN COMPLETE - No files were modified', 'green');
    log('\nTo actually apply these fixes, use an IDE extension or manual application.\n', 'cyan');
}

// Main execution
const args = process.argv.slice(2);
if (args.length < 2) {
    console.error('Usage: node apply-lsp-fixes-dry-run.js <lsp-json> <action-index> [repo-path]');
    console.error('\nExamples:');
    console.error('  node apply-lsp-fixes-dry-run.js test-outputs/codequal-lsp-actions.json 0');
    console.error('  node apply-lsp-fixes-dry-run.js test-outputs/codequal-lsp-actions.json 1');
    process.exit(1);
}

const lspFilePath = path.resolve(args[0]);
const actionIndex = parseInt(args[1], 10);
const repoPath = args[2] ? path.resolve(args[2]) : null;

previewLSPFix(lspFilePath, actionIndex, repoPath);
