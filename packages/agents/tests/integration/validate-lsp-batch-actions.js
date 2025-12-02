#!/usr/bin/env node
/**
 * LSP Batch Action Validator
 * 
 * Validates the "Apply All" and "Apply by Severity" batch actions in the LSP JSON.
 * 
 * Usage:
 *   node validate-lsp-batch-actions.js <path-to-lsp-json>
 * 
 * Example:
 *   node validate-lsp-batch-actions.js test-outputs/codequal-lsp-actions.json
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(message) {
    console.log('\n' + '='.repeat(80));
    log(message, 'bright');
    console.log('='.repeat(80));
}

function validateLSPBatchActions(lspFilePath) {
    header('LSP BATCH ACTION VALIDATOR');

    // 1. Load LSP JSON
    log('\n📂 Loading LSP file...', 'cyan');
    if (!fs.existsSync(lspFilePath)) {
        log(`❌ File not found: ${lspFilePath}`, 'red');
        process.exit(1);
    }

    const lspContent = fs.readFileSync(lspFilePath, 'utf8');
    const lspActions = JSON.parse(lspContent);

    log(`✅ Loaded ${lspActions.length} LSP actions`, 'green');

    // 2. Identify batch actions
    header('BATCH ACTIONS ANALYSIS');

    const batchActions = {
        applyAll: null,
        applyHigh: null,
        applyMedium: null,
        applyLow: null,
    };

    const individualActions = [];

    lspActions.forEach((action, index) => {
        const title = action.title || '';

        if (title.includes('Apply All Fixes')) {
            batchActions.applyAll = { action, index };
        } else if (title.includes('Apply High Severity')) {
            batchActions.applyHigh = { action, index };
        } else if (title.includes('Apply Medium Severity')) {
            batchActions.applyMedium = { action, index };
        } else if (title.includes('Apply Low Severity')) {
            batchActions.applyLow = { action, index };
        } else {
            individualActions.push({ action, index });
        }
    });

    // 3. Validate batch actions exist
    log('\n🔍 Batch Actions Found:', 'cyan');

    const validateBatchAction = (name, batchAction) => {
        if (batchAction) {
            const issueCount = batchAction.action.title.match(/\((\d+) issues?\)/)?.[1] || '?';
            log(`  ✅ ${name}: ${issueCount} issues (index ${batchAction.index})`, 'green');
            return true;
        } else {
            log(`  ❌ ${name}: NOT FOUND`, 'red');
            return false;
        }
    };

    const hasApplyAll = validateBatchAction('Apply All Fixes', batchActions.applyAll);
    const hasApplyHigh = validateBatchAction('Apply High Severity', batchActions.applyHigh);
    const hasApplyMedium = validateBatchAction('Apply Medium Severity', batchActions.applyMedium);
    const hasApplyLow = validateBatchAction('Apply Low Severity', batchActions.applyLow);

    log(`\n📊 Individual Actions: ${individualActions.length}`, 'cyan');

    // 4. Validate "Apply All" coverage
    if (hasApplyAll) {
        header('APPLY ALL FIXES - COVERAGE VALIDATION');

        const applyAllAction = batchActions.applyAll.action;
        const applyAllChanges = applyAllAction.edit?.changes || {};

        // Count files and edits in "Apply All"
        const applyAllFiles = Object.keys(applyAllChanges);
        const applyAllEditCount = applyAllFiles.reduce((sum, file) => {
            return sum + (applyAllChanges[file]?.length || 0);
        }, 0);

        log(`\n📁 Files affected: ${applyAllFiles.length}`, 'cyan');
        log(`✏️  Total edits: ${applyAllEditCount}`, 'cyan');

        // Count files and edits in individual actions
        const individualFiles = new Set();
        let individualEditCount = 0;

        individualActions.forEach(({ action }) => {
            const changes = action.edit?.changes || {};
            Object.keys(changes).forEach(file => {
                individualFiles.add(file);
                individualEditCount += changes[file]?.length || 0;
            });
        });

        log(`\n🔍 Validation:`, 'yellow');
        log(`  Individual actions: ${individualActions.length} actions`, 'cyan');
        log(`  Individual files: ${individualFiles.size} files`, 'cyan');
        log(`  Individual edits: ${individualEditCount} edits`, 'cyan');

        // Compare
        const filesCovered = applyAllFiles.length >= individualFiles.size;
        const editsCovered = applyAllEditCount >= individualEditCount;

        if (filesCovered && editsCovered) {
            log(`\n✅ PASS: "Apply All" covers all individual actions`, 'green');
        } else {
            log(`\n❌ FAIL: "Apply All" missing some actions`, 'red');
            if (!filesCovered) {
                log(`  Missing files: ${individualFiles.size - applyAllFiles.length}`, 'red');
            }
            if (!editsCovered) {
                log(`  Missing edits: ${individualEditCount - applyAllEditCount}`, 'red');
            }
        }

        // Show file breakdown
        log(`\n📋 File Breakdown (top 10):`, 'cyan');
        const fileCounts = {};
        applyAllFiles.forEach(file => {
            const fileName = file.split('/').pop();
            fileCounts[fileName] = applyAllChanges[file].length;
        });

        Object.entries(fileCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .forEach(([file, count]) => {
                log(`  ${file}: ${count} edits`, 'cyan');
            });
    }

    // 5. Validate severity-based actions
    if (hasApplyHigh || hasApplyMedium || hasApplyLow) {
        header('SEVERITY-BASED ACTIONS - VALIDATION');

        const validateSeverityAction = (name, batchAction, expectedSeverity) => {
            if (!batchAction) return;

            const action = batchAction.action;
            const changes = action.edit?.changes || {};
            const files = Object.keys(changes);
            const editCount = files.reduce((sum, file) => sum + (changes[file]?.length || 0), 0);

            log(`\n${name}:`, 'yellow');
            log(`  Files: ${files.length}`, 'cyan');
            log(`  Edits: ${editCount}`, 'cyan');

            // Check if this matches individual actions of the same severity
            const matchingIndividual = individualActions.filter(({ action }) => {
                const diagnostics = action.diagnostics || [];
                return diagnostics.some(d => {
                    const severity = d.severity;
                    if (expectedSeverity === 'high') return severity === 1;
                    if (expectedSeverity === 'medium') return severity === 2;
                    if (expectedSeverity === 'low') return severity === 3 || severity === 4;
                    return false;
                });
            });

            log(`  Matching individual actions: ${matchingIndividual.length}`, 'cyan');

            if (matchingIndividual.length > 0) {
                log(`  ✅ Severity filter appears correct`, 'green');
            } else {
                log(`  ⚠️  No matching individual actions found`, 'yellow');
            }
        };

        validateSeverityAction('Apply High Severity', batchActions.applyHigh, 'high');
        validateSeverityAction('Apply Medium Severity', batchActions.applyMedium, 'medium');
        validateSeverityAction('Apply Low Severity', batchActions.applyLow, 'low');
    }

    // 6. Final summary
    header('VALIDATION SUMMARY');

    const allPassed = hasApplyAll && hasApplyHigh && hasApplyMedium;

    if (allPassed) {
        log('\n✅ ALL VALIDATIONS PASSED', 'green');
        log('\nBatch actions are correctly generated and ready for IDE extension.', 'green');
    } else {
        log('\n⚠️  SOME VALIDATIONS FAILED', 'yellow');
        log('\nReview the issues above before proceeding.', 'yellow');
    }

    console.log('\n' + '='.repeat(80) + '\n');

    return allPassed;
}

// Main execution
const args = process.argv.slice(2);
if (args.length === 0) {
    console.error('Usage: node validate-lsp-batch-actions.js <path-to-lsp-json>');
    console.error('Example: node validate-lsp-batch-actions.js test-outputs/codequal-lsp-actions.json');
    process.exit(1);
}

const lspFilePath = path.resolve(args[0]);
const passed = validateLSPBatchActions(lspFilePath);

process.exit(passed ? 0 : 1);
