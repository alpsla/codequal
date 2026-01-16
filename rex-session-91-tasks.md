## Tasks

### 1. Run KB bypass unit tests
Execute the kb-fix-applicator test suite and verify all tests pass.
```bash
cd packages/agents && npm test -- --testPathPattern="kb-fix-applicator"
```
Validate: All tests should pass (16+ tests expected covering bypass conditions and metrics)

### 2. Run AI fixer integration tests
Execute the ai-fixer-agent test suite which includes KB bypass integration.
```bash
cd packages/agents && npm test -- --testPathPattern="ai-fixer-agent"
```
Validate: Tests should pass including KB bypass methods

### 3. Add KB bypass summary logging
Enhance processBatch() in ai-fixer-agent.ts to log KB bypass metrics at end of batch.
File: packages/agents/src/fix-agent/agents/ai-fixer-agent.ts

Add after batch processing completes:
```typescript
import { getKBBypassMetrics } from '../state/kb-fix-applicator';

// At end of processBatch():
const metrics = getKBBypassMetrics();
console.log(`[AI-Fixer] KB Bypass Summary: ${metrics.kbAppliedCount} KB, ${metrics.aiAppliedCount} AI, saved $${metrics.kbBypassSavings.toFixed(4)}`);
```

### 4. Create E2E test script for KB bypass
Create a test script that demonstrates the two-scan scenario:
- First scan: AI fixer runs, patterns saved to KB
- Second scan: KB bypass triggers (if success rate >= 95%)
File: packages/agents/scripts/test-kb-bypass-e2e.ts (new file)

Script should:
1. Mock or create a test issue (e.g., CloseResource)
2. Run through processIssue() - expect AI to be used
3. Simulate high success rate in KB
4. Run through processIssue() again - expect KB bypass

### 5. Make KB bypass threshold configurable
Add environment variable support for KB_BYPASS_THRESHOLD.
File: packages/agents/src/fix-agent/state/kb-fix-applicator.ts

Change:
```typescript
const KB_BYPASS_THRESHOLD = 95;
```
To:
```typescript
const KB_BYPASS_THRESHOLD = parseInt(process.env.KB_BYPASS_THRESHOLD || '95', 10);
```

This allows easy tuning without code changes.
