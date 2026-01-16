# Session 89 Tasks

**Previous Session**: 88 (Complexity Detection, Batch Fixing, Oracle Registry)

---

## Priority Tasks

### 1. Test Complexity Detection & Batch Fixing (30 min)

**Goal**: Verify Session 88 implementations work correctly

**Steps**:
1. Create test file for complexity detection:
   ```typescript
   // Test simple rules
   expect(getFixComplexity('unused-import')).toBe('simple');
   expect(getFixComplexity('formatting-error')).toBe('simple');

   // Test complex rules
   expect(getFixComplexity('sql-injection')).toBe('complex');
   expect(getFixComplexity('xss-vulnerability')).toBe('complex');
   ```

2. Create integration test for batch fixing:
   - Mock 3 issues in same story
   - Verify single AI call is made
   - Verify all 3 fixes are validated

**Files to Create**:
- `packages/agents/src/fix-agent/state/__tests__/complexity-detection.test.ts`
- `packages/agents/src/fix-agent/state/__tests__/batch-fixing.test.ts`

---

### 2. Implement generateBatchFix Callback (1 hour)

**Goal**: Create the AI callback that handles batch prompts

**Location**: `packages/agents/src/fix-agent/agents/ai-fixer-agent.ts`

**Implementation**:
```typescript
async generateBatchFix(
  context: StoryFixContext,
  issues: FreshContextIssue[]
): Promise<{
  fixes: Array<{ fixCode: string; confidence: number }>;
  totalConfidence: number;
}> {
  const batchPrompt = buildBatchPrompt(issues);
  const response = await this.callAI(batchPrompt);
  return this.parseBatchResponse(response, issues.length);
}
```

**Batch Prompt Template**:
```
Fix ALL of the following issues in a single response.
Return a JSON array with fixes in order.

=== ISSUES ===
[For each issue: file, line, rule, message, code context]

=== EXPECTED OUTPUT ===
{
  "fixes": [
    { "issueIndex": 0, "correctedCode": "...", "explanation": "..." },
    { "issueIndex": 1, "correctedCode": "...", "explanation": "..." },
    ...
  ]
}
```

---

### 3. Documentation Cleanup (15 min)

**Goal**: Update remaining DigitalOcean references in docs

**Files to Update**:
- `packages/agents/docs/HYBRID_ARCHITECTURE_ROADMAP.md`
- `packages/agents/src/two-branch/docs/next/V9-SYSTEM-OVERVIEW.md`
- `packages/agents/src/two-branch/docs/next/V9_SESSION_HANDOFF_PROTOCOL.md`

**Changes**:
- Replace `registry.digitalocean.com` → `iad.ocir.io/idzaw9ddo1h5/codequal`
- Update references to "DigitalOcean" → "Oracle Cloud"
- Mark deprecated guides (DROPLET_SETUP_GUIDE.md) as archived

---

## Medium Priority

### 4. Add KB Success Rate to Complexity Detection

**Enhancement**: Use KB success rate to improve model selection

```typescript
// In getFixComplexity()
if (kbSuccessRate >= 80) {
  return 'simple';  // Proven pattern, Haiku can handle it
}
```

**Requires**:
- Pass KB success rate to complexity detection
- Update stats to track KB-based routing

---

### 5. Optimize Batch Validation

**Current**: Validate each fix in batch individually
**Improved**: Batch validate when same tool/rule

```typescript
// Group fixes by tool
const fixesByTool = groupBy(fixes, 'tool');

// Batch validate per tool
for (const [tool, toolFixes] of Object.entries(fixesByTool)) {
  await batchValidate(tool, toolFixes);
}
```

---

## Session Start Command

```bash
claude --dangerously-skip-permissions
# Then: Read /Users/alpinro/CodePrjects/codequal/docs/NEXT_SESSION_89.md
```
