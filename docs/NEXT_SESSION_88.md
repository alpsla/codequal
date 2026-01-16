# Session 88 - Performance Optimization Tasks

## Priority Tasks

### 1. Fix Complexity Detection (30 min)
**Goal**: Use Haiku for simple fixes, Sonnet for complex

```typescript
// Add to pattern-aware-fixer.ts
function getFixComplexity(issue): 'simple' | 'complex' {
  const simpleRules = [/unused/i, /import/i, /semicolon/i, /style/i, /formatting/i];
  const complexRules = [/injection/i, /security/i, /vulnerability/i, /xss/i];
  
  if (complexRules.some(p => p.test(issue.ruleId))) return 'complex';
  if (simpleRules.some(p => p.test(issue.ruleId))) return 'simple';
  
  // Check KB success rate
  return kbSuccessRate > 80 ? 'simple' : 'complex';
}
```

### 2. Batch Fixing (1 hour)
**Goal**: Fix multiple issues in one AI call, validate once

Current: `Issue1 → AI → Validate → Issue2 → AI → Validate` (180s for 3 issues)
Target: `Issue1,2,3 → AI (batch) → Validate once` (75s for 3 issues)

Key changes:
- Modify `generateFix` to accept multiple issues
- Update prompt to handle batch: "Fix these N issues in this file"
- Single validation pass for combined changes

### 3. Remove DigitalOcean References (15 min)
**Goal**: Clean up incorrect provider references

Search for:
```bash
grep -r "digitalocean\|digital.ocean\|ocean" packages/
```

Replace with correct provider or remove.

## Connection Details
- **Server**: `opc@129.213.49.128`
- **SSH Key**: `/Users/alpinro/CodePrjects/codequal/keys/oracle/ssh-key-2025-10-07.key`
- **API**: `http://129.213.49.128:3000`

## Current State
- API is running and healthy
- All Session 87 fixes deployed
- 10 AI-generated patterns in KB database
- Parallel processing active (4 workers)
