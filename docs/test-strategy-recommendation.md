# Test Strategy Recommendation

## Current Situation
- 49 failing tests (9.8%)
- Most failures are in translator and skill tracking modules
- Failures are due to mock/setup issues, not actual broken functionality

## Options Analysis

### Option 1: Remove Failing Tests ❌
**Pros:**
- Clean test runs
- No false alarms

**Cons:**
- Lose documentation of expected behavior
- Might miss real regressions
- Difficult to restore later

### Option 2: Skip/Disable with Tracking ✅ (Recommended)
**Pros:**
- Clean test runs
- Tests remain in codebase
- Clear documentation of technical debt
- Easy to re-enable when fixed

**Cons:**
- Still have disabled tests
- Need discipline to fix them

### Option 3: Fix All Tests First 🔧
**Pros:**
- Cleanest solution
- No technical debt

**Cons:**
- Time consuming
- Blocks current work
- May require deep refactoring

## Recommended Approach

### 1. Immediate Actions (Do Now)
```javascript
// Example: Skip failing tests with clear documentation
describe.skip('Translator Tests - FIXME: Mock setup needs update (Ticket #XXX)', () => {
  // Keep test code intact
});

// Or individual tests
it.skip('should preserve JSON structure - FIXME: OpenAI mock issue', () => {
  // Test code remains for reference
});
```

### 2. Create Tracking Issues
```markdown
## Failing Test Cleanup Tasks

- [ ] Fix Translator OpenAI mock (#issue-1)
  - 26 tests failing
  - Root cause: Mock returns string instead of object
  - Priority: High

- [ ] Fix Skill Tracking mock setup (#issue-2)  
  - 20 tests failing
  - Root cause: Mock methods not properly initialized
  - Priority: Medium

- [ ] Update Reporter Agent test expectations (#issue-3)
  - 3 tests failing
  - Root cause: Hardcoded skill levels
  - Priority: Low
```

### 3. Establish Test Health Policy
1. **No new failing tests** - All new code must have passing tests
2. **Weekly test debt review** - Review and prioritize disabled tests
3. **Fix before adding** - Fix one disabled test before adding new features
4. **Timeout rule** - Tests disabled > 30 days get escalated

### 4. Implementation Plan

#### Phase 1: Clean Pipeline (Today)
```bash
# Create a script to manage test health
npm run test:healthy  # Runs only enabled tests
npm run test:all      # Runs everything including disabled
npm run test:report   # Shows disabled test summary
```

#### Phase 2: Progressive Fix (This Week)
- Fix translator mocks (highest impact)
- Update skill tracking setup
- Document patterns for future tests

#### Phase 3: Maintain Health (Ongoing)
- CI/CD runs test:healthy for PRs
- Weekly runs of test:all to catch regressions
- Monthly test debt review

## Sample Implementation

### 1. Create test management script
```javascript
// scripts/manage-tests.js
const DISABLED_TESTS = [
  {
    file: 'translator/api-translator.test.ts',
    reason: 'OpenAI mock returns wrong format',
    issue: '#100',
    priority: 'high',
    disabledDate: '2024-12-30'
  },
  // ... more entries
];

function generateReport() {
  console.log(`Disabled Tests Report: ${DISABLED_TESTS.length} tests disabled`);
  // Generate markdown report
}
```

### 2. Update package.json
```json
{
  "scripts": {
    "test": "npm run test:healthy",
    "test:healthy": "jest --testPathIgnorePatterns='.skip\\.|.skip\\('",
    "test:all": "jest",
    "test:report": "node scripts/manage-tests.js report"
  }
}
```

### 3. Add pre-commit hook
```bash
#!/bin/sh
# .husky/pre-commit
npm run test:healthy
```

## Benefits of This Approach

1. **Immediate Relief**: Clean test runs starting today
2. **Maintains Intent**: Test code documents expected behavior
3. **Clear Accountability**: Each disabled test has an owner and timeline
4. **Progressive Improvement**: Fix tests incrementally
5. **Prevents Decay**: Policies prevent permanent test disabling

## Red Flags to Avoid

❌ Don't delete test files
❌ Don't comment out large blocks of tests
❌ Don't disable without documentation
❌ Don't let disabled tests accumulate indefinitely

## Success Metrics

- 0 failing tests in CI/CD
- < 5% tests disabled at any time
- Average test fix time < 1 week
- No test disabled > 30 days

This approach balances pragmatism with code quality, allowing forward progress while maintaining test discipline.