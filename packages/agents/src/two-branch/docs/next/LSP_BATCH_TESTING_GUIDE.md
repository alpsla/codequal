# LSP Batch Action Testing Guide

**Date**: November 24, 2025  
**Purpose**: Validate "Apply All" and "Apply by Severity" batch operations

---

## Testing Scripts Created

### 1. `validate-lsp-batch-actions.js`
**Purpose**: Validates that batch actions are correctly generated

**Usage**:
```bash
node tests/integration/validate-lsp-batch-actions.js test-outputs/codequal-lsp-actions.json
```

**What it checks**:
- ✅ "Apply All Fixes" action exists
- ✅ "Apply High/Medium/Low Severity" actions exist
- ✅ File coverage is complete
- ✅ Edit counts are reasonable
- ✅ Severity filtering is correct

### 2. `analyze-lsp-action-types.js`
**Purpose**: Analyzes the distribution of fix types

**Usage**:
```bash
node tests/integration/analyze-lsp-action-types.js test-outputs/codequal-lsp-actions.json
```

**What it shows**:
- Direct code replacements vs. comment blocks
- Distribution by tool (semgrep, npm-audit, etc.)
- Distribution by severity (high, medium, low)
- Example fixes of each type

### 3. `apply-lsp-fixes-dry-run.js`
**Purpose**: Preview what a specific action would do (without modifying files)

**Usage**:
```bash
# Preview "Apply All" (action index 0)
node tests/integration/apply-lsp-fixes-dry-run.js test-outputs/codequal-lsp-actions.json 0

# Preview "Apply High Severity" (action index 1)
node tests/integration/apply-lsp-fixes-dry-run.js test-outputs/codequal-lsp-actions.json 1

# Preview a specific fix (action index 10)
node tests/integration/apply-lsp-fixes-dry-run.js test-outputs/codequal-lsp-actions.json 10
```

**What it shows**:
- Files that would be modified
- Number of edits per file
- Preview of each edit (first 200 characters)
- Whether it's a comment block or code replacement

---

## Expected Results

### Action Distribution
The LSP JSON should contain:
- **4 Batch Actions** (Apply All, Apply High, Apply Medium, Apply Low)
- **256 Individual Actions** (one per issue)
- **Total**: 260 actions

### Fix Type Distribution (After npm-audit Fix)
- **Direct Code Replacement**: 0 (all moved to comment blocks)
- **AI Comment Blocks**: 251 (Semgrep security issues)
- **Dependency Comment Blocks**: 5 (npm-audit with npm commands)

### Why "Apply All" Has Fewer Edits
The "Apply All" action should have **0 edits** after our npm-audit fix because:
1. All Semgrep issues use comment blocks (require human review)
2. All npm-audit issues use comment blocks (require npm commands)
3. Comment blocks are NOT included in "Apply All" - they're for manual review

This is **CORRECT BEHAVIOR** for the hybrid strategy:
- ✅ Safe fixes → "Apply All"
- ✅ Complex fixes → Individual review (comment blocks)
- ✅ Dependency fixes → npm commands (comment blocks)

---

## Testing Workflow

### Step 1: Regenerate LSP File
After making changes to `lsp-sarif-converter.ts`, regenerate the LSP file:

```bash
TARGET_BRANCH=test/autofix-baseline npx ts-node tests/integration/test-v9-typescript-lite-e2e.ts
```

### Step 2: Validate Batch Actions
```bash
node tests/integration/validate-lsp-batch-actions.js test-outputs/codequal-lsp-actions.json
```

Expected output:
- ✅ All batch actions found
- ✅ Severity filtering correct
- ⚠️ "Apply All" has 0 edits (correct - all are comment blocks)

### Step 3: Analyze Fix Types
```bash
node tests/integration/analyze-lsp-action-types.js test-outputs/codequal-lsp-actions.json
```

Expected output:
- Direct Replacement: 0
- AI Comment Block: 251
- Dependency Comment: 5

### Step 4: Preview Specific Actions
```bash
# Preview "Apply All"
node tests/integration/apply-lsp-fixes-dry-run.js test-outputs/codequal-lsp-actions.json 0

# Preview "Apply High Severity"
node tests/integration/apply-lsp-fixes-dry-run.js test-outputs/codequal-lsp-actions.json 1

# Preview first individual fix
node tests/integration/apply-lsp-fixes-dry-run.js test-outputs/codequal-lsp-actions.json 4
```

---

## Validation Checklist

- [ ] LSP file regenerated after npm-audit fix
- [ ] Batch actions validation passes
- [ ] Fix type distribution shows 0 direct replacements
- [ ] npm-audit fixes show dependency comment blocks
- [ ] Semgrep fixes show AI comment blocks
- [ ] "Apply All" correctly has 0 edits (all are comment blocks)
- [ ] Severity-based actions filter correctly
- [ ] Preview shows correct comment syntax for each language

---

## Next Steps

Once validation passes:
1. ✅ Batch operations are working correctly
2. ✅ Ready for IDE extension development
3. ✅ Can proceed with VSCode/Cursor extension prototype

---

## Notes

### Why No Direct Replacements?
After our npm-audit fix, ALL fixes are comment blocks because:
- **Semgrep** (249 issues): Security issues require human review
- **npm-audit** (5 issues): Dependency updates require npm commands
- **madge** (2 issues): Circular dependencies require refactoring

This is the **intended behavior** of the hybrid strategy - prioritize safety over automation.

### Future Enhancements
To have some direct replacements in "Apply All", we could:
1. Add high-confidence fixes from other tools (e.g., ESLint auto-fixable rules)
2. Implement smarter dependency update logic (parse package.json, suggest specific versions)
3. Add template-based fixes for common patterns (e.g., missing semicolons)

But for now, the comment-based approach is the safest and most educational.
