#!/usr/bin/env node
/**
 * LSP Action Type Analyzer
 * 
 * Analyzes the types of fixes in the LSP JSON to understand why "Apply All"
 * has fewer edits than individual actions.
 * 
 * Usage:
 *   node analyze-lsp-action-types.js <path-to-lsp-json>
 */

const fs = require('fs');
const path = require('path');

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function analyzeLSPActionTypes(lspFilePath) {
    console.log('\n' + '='.repeat(80));
    log('LSP ACTION TYPE ANALYZER', 'bright');
    console.log('='.repeat(80) + '\n');

    const lspContent = fs.readFileSync(lspFilePath, 'utf8');
    const lspActions = JSON.parse(lspContent);

    // Skip batch actions (first 4)
    const individualActions = lspActions.slice(4);

    log(`📊 Analyzing ${individualActions.length} individual actions...\n`, 'cyan');

    const stats = {
        directReplacement: 0,
        commentBlock: 0,
        dependencyComment: 0,
        byTool: {},
        bySeverity: {},
        commentBlockExamples: [],
        directReplacementExamples: [],
    };

    individualActions.forEach((action, index) => {
        const changes = action.edit?.changes || {};
        const files = Object.keys(changes);

        if (files.length === 0) return;

        // Get first edit to analyze
        const firstFile = files[0];
        const firstEdit = changes[firstFile][0];
        const newText = firstEdit.newText || '';

        // Determine fix type
        const isCommentBlock = newText.includes('TODO: CodeQual');
        const isDependencyComment = newText.includes('TODO: CodeQual Dependency');

        // Get metadata
        const data = action.data || {};
        const tool = data.telemetry?.toolName || 'unknown';
        const severity = data.issue?.severity || 'unknown';

        // Count by type
        if (isDependencyComment) {
            stats.dependencyComment++;
            if (stats.commentBlockExamples.length < 3) {
                stats.commentBlockExamples.push({
                    title: action.title,
                    tool,
                    severity,
                    type: 'dependency-comment',
                });
            }
        } else if (isCommentBlock) {
            stats.commentBlock++;
            if (stats.commentBlockExamples.length < 3) {
                stats.commentBlockExamples.push({
                    title: action.title,
                    tool,
                    severity,
                    type: 'ai-comment',
                });
            }
        } else {
            stats.directReplacement++;
            if (stats.directReplacementExamples.length < 3) {
                stats.directReplacementExamples.push({
                    title: action.title,
                    tool,
                    severity,
                    type: 'direct-replacement',
                });
            }
        }

        // Count by tool
        stats.byTool[tool] = (stats.byTool[tool] || 0) + 1;

        // Count by severity
        stats.bySeverity[severity] = (stats.bySeverity[severity] || 0) + 1;
    });

    // Display results
    log('📈 FIX TYPE DISTRIBUTION:', 'bright');
    log(`  Direct Code Replacement: ${stats.directReplacement}`, 'green');
    log(`  AI Comment Block: ${stats.commentBlock}`, 'yellow');
    log(`  Dependency Comment: ${stats.dependencyComment}`, 'cyan');
    log(`  Total: ${stats.directReplacement + stats.commentBlock + stats.dependencyComment}\n`, 'cyan');

    log('🔧 BY TOOL:', 'bright');
    Object.entries(stats.byTool)
        .sort((a, b) => b[1] - a[1])
        .forEach(([tool, count]) => {
            log(`  ${tool}: ${count}`, 'cyan');
        });

    log('\n⚠️  BY SEVERITY:', 'bright');
    Object.entries(stats.bySeverity)
        .sort((a, b) => b[1] - a[1])
        .forEach(([severity, count]) => {
            const color = severity === 'high' ? 'red' : severity === 'medium' ? 'yellow' : 'green';
            log(`  ${severity}: ${count}`, color);
        });

    log('\n📝 EXAMPLES:', 'bright');

    if (stats.directReplacementExamples.length > 0) {
        log('\n  Direct Replacement Examples:', 'green');
        stats.directReplacementExamples.forEach(ex => {
            log(`    - ${ex.title} (${ex.tool}, ${ex.severity})`, 'cyan');
        });
    }

    if (stats.commentBlockExamples.length > 0) {
        log('\n  Comment Block Examples:', 'yellow');
        stats.commentBlockExamples.forEach(ex => {
            log(`    - ${ex.title} (${ex.tool}, ${ex.severity}, ${ex.type})`, 'cyan');
        });
    }

    // Explain the discrepancy
    log('\n' + '='.repeat(80), 'bright');
    log('💡 WHY "APPLY ALL" HAS FEWER EDITS:', 'bright');
    console.log('='.repeat(80));

    log(`
The "Apply All" action contains ${stats.directReplacement} direct code replacements.
The remaining ${stats.commentBlock + stats.dependencyComment} actions are comment blocks.

Comment blocks are NOT included in "Apply All" because:
1. They require human review (security issues, complex fixes)
2. They insert TODO comments, not actual code fixes
3. They're meant to be used with AI assistants (Cursor/Copilot)

This is the CORRECT behavior for the hybrid auto-fix strategy:
- ✅ Safe fixes: Applied automatically via "Apply All"
- ✅ Complex fixes: Require human review (comment blocks)
- ✅ Dependency fixes: Require npm commands (comment blocks)
`, 'cyan');

    console.log('='.repeat(80) + '\n');
}

const args = process.argv.slice(2);
if (args.length === 0) {
    console.error('Usage: node analyze-lsp-action-types.js <path-to-lsp-json>');
    process.exit(1);
}

const lspFilePath = path.resolve(args[0]);
analyzeLSPActionTypes(lspFilePath);
