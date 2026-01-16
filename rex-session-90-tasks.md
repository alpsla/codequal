## Tasks

### 1. Fix TypeScript errors in complexity-detection.test.ts
Update jest mock typing to use explicit generic types for mockReturnValue calls.
The issue is that `@jest/globals` requires explicit typing like `jest.fn<() => boolean>()`.
File: packages/agents/src/fix-agent/state/__tests__/complexity-detection.test.ts

### 2. Fix TypeScript errors in batch-fixing.test.ts
Update jest mock typing to use explicit generic types for mockReturnValue calls.
Same pattern as task 1 - add explicit generic types to all jest.fn() calls with mockReturnValue.
File: packages/agents/src/fix-agent/state/__tests__/batch-fixing.test.ts

### 3. Implement KB bypass check function
Create checkKBBypass() function that returns true when:
- KB success rate for rule ID >= 95%, OR
- Pattern has toolValidated flag set to true

Interface:
```typescript
interface KBBypassResult {
  canBypass: boolean;
  reason: 'high_success_rate' | 'tool_validated' | 'no_pattern';
  pattern?: FixPattern;
  confidence: number;
}
```

File: packages/agents/src/fix-agent/state/kb-fix-applicator.ts (new file)

### 4. Integrate KB bypass into AI fixer flow
Update ai-fixer-agent.ts to call checkKBBypass() before invoking AI.
If bypass is allowed, apply pattern directly without AI call.
Track metrics: kb_applied vs ai_applied counts.

Flow:
1. Check KB bypass
2. If canBypass=true, apply pattern template directly (no AI cost)
3. If canBypass=false, fall back to AI fixer
4. Record metrics for both paths

File: packages/agents/src/fix-agent/agents/ai-fixer-agent.ts

### 5. Add KB bypass tests
Create tests for KB bypass logic covering:
- High success rate bypass (>=95%)
- Tool-validated pattern bypass
- No pattern fallback to AI
- Metrics recording
- Edge cases (94% rate should NOT bypass, 95% should)

File: packages/agents/src/fix-agent/state/__tests__/kb-fix-applicator.test.ts
