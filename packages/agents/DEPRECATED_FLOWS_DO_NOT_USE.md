# ⛔ DEPRECATED FLOWS - DO NOT USE

**CRITICAL**: These implementations are DEPRECATED and must not be used or recreated.

## ❌ Deprecated Implementations

### 1. Template-Based Fix Generation
- **Files**: `enhanced-fix-generator.ts` (if using templates)
- **Why Deprecated**: Uses hardcoded templates instead of AI
- **Use Instead**: `specialized-agents.ts` with AI generation

### 2. Direct Tool-to-Report Flows
- **Files**: Any that bypass agent processing
- **Why Deprecated**: Skips AI enrichment step
- **Use Instead**: Full V9 flow through agents

### 3. Fallback Simulations
- **Files**: `*-simulation.ts`, `*-fallback.ts`
- **Pattern**: `if (!realExecution) { return simulatedData; }`
- **Why Deprecated**: Hides real issues, creates false positives
- **Use Instead**: Fail fast with clear error messages

### 4. Single Branch Analysis
- **Files**: Any analyzer not comparing both branches
- **Why Deprecated**: Can't identify new vs existing issues
- **Use Instead**: Two-branch comparison via `two-branch-comparator.ts`

### 5. Manual Model Selection
- **Pattern**: `model: 'gpt-4'` hardcoded
- **Why Deprecated**: Doesn't adapt to context
- **Use Instead**: `DynamicModelSelector.selectModelsForRole()`

### 6. Alternative Test Files
- **Files to Remove**:
  - `test-v9-with-env.js`
  - `test-v9-real-errors.js`
  - `test-v9-complete-final.js`
  - Any test not using canonical flow
- **Keep Only**: `test-v9-final-report.js` (follows canonical flow)

## 🚫 Anti-Patterns to Avoid

### Anti-Pattern 1: Creating "Fixed" Versions
```typescript
// ❌ WRONG
enhanced-fix-generator.ts
enhanced-fix-generator-v2.ts
enhanced-fix-generator-proper.ts
enhanced-fix-generator-final.ts

// ✅ CORRECT
// Use only: specialized-agents.ts
```

### Anti-Pattern 2: Fallback Logic
```typescript
// ❌ WRONG
try {
  return await executeRealTools();
} catch {
  return simulateToolResults();  // NEVER DO THIS
}

// ✅ CORRECT
try {
  return await executeRealTools();
} catch (error) {
  throw new Error(`Tool execution failed: ${error.message}`);
}
```

### Anti-Pattern 3: Bypassing Steps
```typescript
// ❌ WRONG
const toolResults = await runTools();
const report = generateReport(toolResults); // Skips agents!

// ✅ CORRECT
const toolResults = await runTools();
const enrichedIssues = await sendToAgents(toolResults);
const dedupedIssues = await orchestrator.deduplicate(enrichedIssues);
const [education, comparison] = await Promise.all([
  educator.generateResources(dedupedIssues),
  comparator.classify(dedupedIssues)
]);
const report = generateReport(comparison, education);
```

### Anti-Pattern 4: Alternative Flows
```typescript
// ❌ WRONG - Creating new flow
class QuickAnalyzer {
  async analyze() {
    // Some new way of doing things
  }
}

// ✅ CORRECT
// Use ONLY v9-tool-orchestrator.ts flow
```

## 📝 Migration Guide

### If Your Code Uses Deprecated Patterns:

1. **Stop using templates** → Use AI via `specialized-agents.ts`
2. **Stop simulation fallbacks** → Fail with clear errors
3. **Stop bypassing agents** → Always use 5-agent flow
4. **Stop single-branch analysis** → Always compare main vs PR
5. **Stop hardcoding models** → Use DynamicModelSelector
6. **Stop creating alternatives** → Use canonical V9 flow only

## 🔴 Removal Schedule

### Immediate Removal (NOW):
- All simulation code
- All fallback logic
- All template-based fixes

### Phase Out (This Week):
- Alternative test files
- Duplicate implementations
- Experimental flows

### Archive (Keep for Reference Only):
- Move to `_ARCHIVED_DO_NOT_USE/` folder
- Add README explaining why deprecated

## ⚠️ Warning for Future Development

**BEFORE** creating ANY new file or flow:
1. Check `V9_CANONICAL_ARCHITECTURE.md`
2. Verify it doesn't already exist
3. Confirm it follows canonical flow
4. Get approval if adding new capability

**Creating alternative flows will result in PR rejection.**

---

Last Updated: 2025-09-17
Status: ENFORCED