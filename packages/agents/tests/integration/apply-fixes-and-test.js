#!/usr/bin/env node
/**
 * Apply LSP Fixes to Repository
 * 
 * Applies fixes from LSP JSON to a git repository, creates a new branch,
 * runs build & lint, and prepares for V9 analysis.
 * 
 * Usage:
 *   node apply-fixes-and-test.js <lsp-json> <repo-path> <new-branch-name>
 * 
 * Example:
 *   node apply-fixes-and-test.js test-outputs/codequal-lsp-actions.json ~/test-repo test/autofix-applied
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

function header(message) {
    console.log('\n' + '='.repeat(80));
    log(message, 'bright');
    console.log('='.repeat(80));
}

function applyFixesAndTest(lspFilePath, repoPath, newBranchName) {
    header('APPLY LSP FIXES AND TEST');

    // 1. Validate inputs
    log('\n📋 Validating inputs...', 'cyan');

    if (!fs.existsSync(lspFilePath)) {
        log(`❌ LSP file not found: ${lspFilePath}`, 'red');
        process.exit(1);
    }

    if (!fs.existsSync(repoPath)) {
        log(`❌ Repository not found: ${repoPath}`, 'red');
        process.exit(1);
    }

    if (!fs.existsSync(path.join(repoPath, '.git'))) {
        log(`❌ Not a git repository: ${repoPath}`, 'red');
        process.exit(1);
    }

    log(`✅ LSP file: ${lspFilePath}`, 'green');
    log(`✅ Repository: ${repoPath}`, 'green');
    log(`✅ New branch: ${newBranchName}`, 'green');

    // 2. Load LSP JSON
    header('LOADING LSP FIXES');

    const lspContent = fs.readFileSync(lspFilePath, 'utf8');
    const lspActions = JSON.parse(lspContent);

    log(`\n📊 Total actions: ${lspActions.length}`, 'cyan');

    // Find "Apply All" action (should be index 0)
    const applyAllAction = lspActions[0];
    if (!applyAllAction.title.includes('Apply All')) {
        log(`⚠️  First action is not "Apply All": ${applyAllAction.title}`, 'yellow');
        log(`   This script expects "Apply All" at index 0`, 'yellow');
    }

    const changes = applyAllAction.edit?.changes || {};
    const files = Object.keys(changes);

    log(`📁 Files to modify: ${files.length}`, 'cyan');
    log(`✏️  Total edits: ${files.reduce((sum, f) => sum + changes[f].length, 0)}`, 'cyan');

    if (files.length === 0) {
        log(`\n⚠️  No direct code replacements found in "Apply All"`, 'yellow');
        log(`   This is expected if all fixes are comment blocks (hybrid strategy)`, 'yellow');
        log(`\n💡 To test comment-based fixes, manually copy them from individual actions`, 'cyan');
        return;
    }

    // 3. Create new branch
    header('CREATING NEW BRANCH');

    try {
        // Check current branch
        const currentBranch = execSync('git branch --show-current', { cwd: repoPath, encoding: 'utf8' }).trim();
        log(`\n📍 Current branch: ${currentBranch}`, 'cyan');

        // Create and checkout new branch
        log(`\n🔀 Creating branch: ${newBranchName}`, 'cyan');
        execSync(`git checkout -b ${newBranchName}`, { cwd: repoPath, stdio: 'pipe' });
        log(`✅ Branch created and checked out`, 'green');
    } catch (error) {
        log(`❌ Failed to create branch: ${error.message}`, 'red');
        process.exit(1);
    }

    // 4. Apply fixes
    header('APPLYING FIXES');

    let appliedCount = 0;
    let skippedCount = 0;

    files.forEach((fileUri, index) => {
        // Convert file URI to local path
        const filePath = fileUri.replace(/^file:\/\/.*?\/([^/].*)$/, '$1');
        const fullPath = path.join(repoPath, filePath);

        log(`\n📄 [${index + 1}/${files.length}] ${filePath}`, 'cyan');

        if (!fs.existsSync(fullPath)) {
            log(`   ⏭️  File not found (may be from different repo), skipping`, 'yellow');
            skippedCount++;
            return;
        }

        // Read current file content
        let content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');

        // Apply edits in reverse order (to preserve line numbers)
        const edits = changes[fileUri].sort((a, b) => b.range.start.line - a.range.start.line);

        edits.forEach((edit, editIndex) => {
            const { range, newText } = edit;
            const startLine = range.start.line;
            const endLine = range.end.line;

            log(`   ✏️  Edit ${editIndex + 1}: Lines ${startLine}-${endLine}`, 'dim');

            // Replace lines
            const before = lines.slice(0, startLine);
            const after = lines.slice(endLine);
            const replacement = newText.split('\n');

            // Reconstruct
            const newLines = [...before, ...replacement, ...after];
            lines.length = 0;
            lines.push(...newLines);
        });

        // Write back
        fs.writeFileSync(fullPath, lines.join('\n'), 'utf8');
        log(`   ✅ Applied ${edits.length} edit(s)`, 'green');
        appliedCount++;
    });

    log(`\n📊 Summary:`, 'bright');
    log(`   Applied: ${appliedCount} files`, 'green');
    log(`   Skipped: ${skippedCount} files`, 'yellow');

    // 5. Run build
    header('RUNNING BUILD');

    try {
        log('\n🔨 Running: npm run build', 'cyan');
        execSync('npm run build', { cwd: repoPath, stdio: 'inherit' });
        log('\n✅ Build succeeded', 'green');
    } catch (error) {
        log('\n❌ Build failed', 'red');
        log('   Review the errors above and fix manually', 'yellow');
    }

    // 6. Run lint
    header('RUNNING LINT');

    try {
        log('\n🔍 Running: npm run lint', 'cyan');
        execSync('npm run lint', { cwd: repoPath, stdio: 'inherit' });
        log('\n✅ Lint passed', 'green');
    } catch (error) {
        log('\n⚠️  Lint found issues', 'yellow');
        log('   Review the warnings above', 'yellow');
    }

    // 7. Commit changes
    header('COMMITTING CHANGES');

    try {
        log('\n📝 Staging changes...', 'cyan');
        execSync('git add -A', { cwd: repoPath });

        log('💾 Committing...', 'cyan');
        execSync(`git commit -m "Apply CodeQual auto-fixes from LSP"`, { cwd: repoPath });

        log('✅ Changes committed', 'green');

        // Show commit
        const commitHash = execSync('git rev-parse --short HEAD', { cwd: repoPath, encoding: 'utf8' }).trim();
        log(`   Commit: ${commitHash}`, 'dim');
    } catch (error) {
        log(`⚠️  Commit failed: ${error.message}`, 'yellow');
    }

    // 8. Final instructions
    header('NEXT STEPS');

    log(`
✅ Fixes applied and committed to branch: ${newBranchName}

📋 To complete validation:

1. Push the branch:
   cd ${repoPath}
   git push origin ${newBranchName}

2. Run V9 analysis on the fixed branch:
   TARGET_BRANCH=${newBranchName} npx ts-node tests/integration/test-v9-typescript-lite-e2e.ts

3. Compare results:
   - Baseline: test/autofix-baseline
   - Fixed: ${newBranchName}
   - Expected: Fewer issues, higher score

4. Review the V9 report to confirm improvements
`, 'cyan');

    console.log('='.repeat(80) + '\n');
}

// Main execution
const args = process.argv.slice(2);
if (args.length < 3) {
    console.error('Usage: node apply-fixes-and-test.js <lsp-json> <repo-path> <new-branch-name>');
    console.error('\nExample:');
    console.error('  node apply-fixes-and-test.js test-outputs/codequal-lsp-actions.json ~/test-repo test/autofix-applied');
    process.exit(1);
}

const lspFilePath = path.resolve(args[0]);
const repoPath = path.resolve(args[1]);
const newBranchName = args[2];

applyFixesAndTest(lspFilePath, repoPath, newBranchName);
