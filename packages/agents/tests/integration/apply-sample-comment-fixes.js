#!/usr/bin/env node
/**
 * Apply Sample Comment-Based Fixes
 * 
 * Applies a selection of comment-based fixes to demonstrate the workflow.
 * These comments will guide manual fixes using Cursor/Copilot.
 * 
 * Usage:
 *   node apply-sample-comment-fixes.js <lsp-json> <repo-path> <sample-count>
 * 
 * Example:
 *   node apply-sample-comment-fixes.js test-outputs/codequal-lsp-actions.json ~/Downloads/tmp/test-codequal-autofix 10
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

function applySampleCommentFixes(lspFilePath, repoPath, sampleCount) {
    header('APPLY SAMPLE COMMENT-BASED FIXES');

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

    log(`✅ LSP file: ${lspFilePath}`, 'green');
    log(`✅ Repository: ${repoPath}`, 'green');
    log(`✅ Sample count: ${sampleCount}`, 'green');

    // 2. Load LSP JSON
    header('LOADING LSP FIXES');

    const lspContent = fs.readFileSync(lspFilePath, 'utf8');
    const lspActions = JSON.parse(lspContent);

    // Skip batch actions (first 4)
    const individualActions = lspActions.slice(4);

    log(`\n📊 Total individual actions: ${individualActions.length}`, 'cyan');

    // 3. Select diverse samples
    header('SELECTING SAMPLE FIXES');

    const samples = [];
    const severities = { high: [], medium: [], low: [] };

    // Categorize by severity
    individualActions.forEach((action, index) => {
        const diagnostics = action.diagnostics || [];
        if (diagnostics.length === 0) return;

        const severity = diagnostics[0].severity;
        if (severity === 1) severities.high.push({ action, index });
        else if (severity === 2) severities.medium.push({ action, index });
        else severities.low.push({ action, index });
    });

    log(`\n📊 By Severity:`, 'cyan');
    log(`   High: ${severities.high.length}`, 'red');
    log(`   Medium: ${severities.medium.length}`, 'yellow');
    log(`   Low: ${severities.low.length}`, 'green');

    // Select samples (proportional to severity)
    const highCount = Math.ceil(sampleCount * 0.4);
    const mediumCount = Math.ceil(sampleCount * 0.4);
    const lowCount = sampleCount - highCount - mediumCount;

    samples.push(...severities.high.slice(0, highCount));
    samples.push(...severities.medium.slice(0, mediumCount));
    samples.push(...severities.low.slice(0, lowCount));

    log(`\n✅ Selected ${samples.length} samples:`, 'green');
    log(`   High: ${highCount}`, 'red');
    log(`   Medium: ${mediumCount}`, 'yellow');
    log(`   Low: ${lowCount}`, 'green');

    // 4. Create new branch
    header('CREATING NEW BRANCH');

    const branchName = 'test/autofix-applied';

    try {
        // Check if we're in the right repo
        const currentBranch = execSync('git branch --show-current', { cwd: repoPath, encoding: 'utf8' }).trim();
        log(`\n📍 Current branch: ${currentBranch}`, 'cyan');

        // Check if branch exists
        try {
            execSync(`git rev-parse --verify ${branchName}`, { cwd: repoPath, stdio: 'pipe' });
            log(`\n⚠️  Branch ${branchName} already exists`, 'yellow');
            log(`   Deleting and recreating...`, 'yellow');
            execSync(`git branch -D ${branchName}`, { cwd: repoPath, stdio: 'pipe' });
        } catch {
            // Branch doesn't exist, that's fine
        }

        // Create and checkout new branch
        log(`\n🔀 Creating branch: ${branchName}`, 'cyan');
        execSync(`git checkout -b ${branchName}`, { cwd: repoPath, stdio: 'pipe' });
        log(`✅ Branch created and checked out`, 'green');
    } catch (error) {
        log(`❌ Failed to create branch: ${error.message}`, 'red');
        process.exit(1);
    }

    // 5. Apply comment blocks
    header('APPLYING COMMENT BLOCKS');

    const appliedFixes = [];
    let appliedCount = 0;
    let skippedCount = 0;

    samples.forEach(({ action, index }) => {
        const changes = action.edit?.changes || {};
        const files = Object.keys(changes);

        if (files.length === 0) {
            skippedCount++;
            return;
        }

        const fileUri = files[0];
        const filePath = fileUri.replace(/^file:\/\/.*?\/([^/].*)$/, '$1');
        const fullPath = path.join(repoPath, filePath);

        if (!fs.existsSync(fullPath)) {
            log(`   ⏭️  File not found: ${filePath}`, 'yellow');
            skippedCount++;
            return;
        }

        const edit = changes[fileUri][0];
        const { range, newText } = edit;
        const startLine = range.start.line;

        // Read file
        let content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');

        // Insert comment block at the specified line
        const before = lines.slice(0, startLine);
        const after = lines.slice(startLine);
        const commentLines = newText.split('\n');

        const newLines = [...before, ...commentLines, ...after];

        // Write back
        fs.writeFileSync(fullPath, newLines.join('\n'), 'utf8');

        log(`\n✅ Applied: ${action.title}`, 'green');
        log(`   File: ${filePath}:${startLine}`, 'dim');

        appliedFixes.push({
            title: action.title,
            file: filePath,
            line: startLine,
            severity: action.diagnostics[0].severity === 1 ? 'HIGH' :
                action.diagnostics[0].severity === 2 ? 'MEDIUM' : 'LOW',
        });

        appliedCount++;
    });

    log(`\n📊 Summary:`, 'bright');
    log(`   Applied: ${appliedCount} comment blocks`, 'green');
    log(`   Skipped: ${skippedCount} (files not found)`, 'yellow');

    // 6. Create fix checklist
    header('CREATING FIX CHECKLIST');

    const checklistPath = path.join(repoPath, 'AUTOFIX_CHECKLIST.md');
    const checklist = `# Auto-Fix Checklist

**Generated**: ${new Date().toISOString()}
**Branch**: ${branchName}
**Fixes Applied**: ${appliedCount} comment blocks

---

## Instructions

Each fix below has a TODO comment inserted in the code. To apply:

1. Open the file in Cursor/VSCode
2. Find the TODO comment (search for "TODO: CodeQual")
3. Copy the AI PROMPT section
4. Paste into Cursor Chat or GitHub Copilot
5. Review the generated code
6. Replace the TODO comment with the fix
7. Check the box below

---

## Fixes to Apply

${appliedFixes.map((fix, i) => `
### ${i + 1}. ${fix.title}

- [ ] **File**: \`${fix.file}\` (line ${fix.line})
- [ ] **Severity**: ${fix.severity}
- [ ] **Status**: Pending

**Steps**:
1. Open \`${fix.file}\`
2. Go to line ${fix.line}
3. Find the TODO comment
4. Copy the AI PROMPT
5. Use Cursor/Copilot to generate fix
6. Review and apply
7. Mark as complete above
`).join('\n')}

---

## After Applying All Fixes

1. Run build:
   \`\`\`bash
   npm run build
   \`\`\`

2. Run lint:
   \`\`\`bash
   npm run lint
   \`\`\`

3. Commit changes:
   \`\`\`bash
   git add -A
   git commit -m "Apply CodeQual auto-fixes"
   git push origin ${branchName}
   \`\`\`

4. Run V9 analysis:
   \`\`\`bash
   TARGET_BRANCH=${branchName} npx ts-node tests/integration/test-v9-typescript-lite-e2e.ts
   \`\`\`

5. Compare results with baseline (test/autofix-baseline)

---

**Expected Outcome**: Fewer issues, higher code quality score
`;

    fs.writeFileSync(checklistPath, checklist, 'utf8');
    log(`\n✅ Checklist created: ${checklistPath}`, 'green');

    // 7. Commit comment blocks
    header('COMMITTING CHANGES');

    try {
        execSync('git add -A', { cwd: repoPath });
        execSync(`git commit -m "Add CodeQual auto-fix TODO comments (${appliedCount} fixes)"`, { cwd: repoPath });

        const commitHash = execSync('git rev-parse --short HEAD', { cwd: repoPath, encoding: 'utf8' }).trim();
        log(`\n✅ Changes committed: ${commitHash}`, 'green');
    } catch (error) {
        log(`\n⚠️  Commit failed: ${error.message}`, 'yellow');
    }

    // 8. Final instructions
    header('NEXT STEPS');

    log(`
✅ ${appliedCount} comment blocks applied to: ${repoPath}

📋 To complete the validation:

1. Open the repository in Cursor/VSCode:
   cd ${repoPath}
   cursor .

2. Follow the checklist:
   Open AUTOFIX_CHECKLIST.md and apply each fix

3. After applying all fixes:
   npm run build
   npm run lint
   git add -A
   git commit -m "Apply CodeQual auto-fixes"
   git push origin ${branchName}

4. Run V9 analysis on the fixed branch:
   TARGET_BRANCH=${branchName} npx ts-node tests/integration/test-v9-typescript-lite-e2e.ts

5. Compare with baseline to verify improvements

`, 'cyan');

    console.log('='.repeat(80) + '\n');
}

// Main execution
const args = process.argv.slice(2);
if (args.length < 3) {
    console.error('Usage: node apply-sample-comment-fixes.js <lsp-json> <repo-path> <sample-count>');
    console.error('\nExample:');
    console.error('  node apply-sample-comment-fixes.js test-outputs/codequal-lsp-actions.json ~/Downloads/tmp/test-codequal-autofix 10');
    process.exit(1);
}

const lspFilePath = path.resolve(args[0]);
const repoPath = path.resolve(args[1]);
const sampleCount = parseInt(args[2], 10);

applySampleCommentFixes(lspFilePath, repoPath, sampleCount);
