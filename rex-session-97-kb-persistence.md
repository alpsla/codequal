# Session 97: KB Persistence to Supabase

## Overview
The AI fixer generates fixes via `processIssue()` but doesn't persist successful patterns to Supabase. Need to add persistence call after successful fix generation.

---

### 1. Analyze Current AI Fixer Flow
**Goal**: Understand how `processIssue()` generates fixes and where to add persistence
**Steps**:
1. Read `packages/agents/src/fix-agent/ai-fixer-agent.ts`
2. Identify where fixes are generated successfully
3. Find the `validateAndSubmitFix()` function or equivalent
4. Document the integration point

---

### 2. Add KB Persistence Call to AI Fixer
**Goal**: Persist successful fix patterns to Supabase after generation
**Steps**:
1. Import KB persistence function if not already imported
2. After successful fix generation in `processIssue()`, call persistence
3. Include: ruleId, language, tool, original code, fixed code, pattern learned
4. Handle errors gracefully (don't fail the fix if persistence fails)

---

### 3. Create KB Count Test Script
**Goal**: Create a test script to count KB patterns before/after
**Steps**:
1. Check if `tests/integration/count-kb.ts` exists
2. If not, create it to query Supabase for pattern counts
3. Should output: total patterns, patterns by language, patterns by rule

---

### 4. Test KB Persistence End-to-End
**Goal**: Verify fixes are being persisted to Supabase
**Steps**:
1. Run count-kb.ts to get baseline count
2. Run AI fixer on a small batch (5 issues from apache/commons-lang)
3. Run count-kb.ts again to verify increase
4. Log the new patterns added

---

### 5. Build and Typecheck Verification
**Goal**: Ensure all changes compile correctly
**Steps**:
1. Run `turbo run build --filter=@codequal/agents`
2. Run `npx tsc --noEmit --skipLibCheck`
3. Fix any type errors
4. Commit changes with descriptive message
