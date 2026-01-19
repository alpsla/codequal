# Session 95: KB Pattern Expansion & Calibration

**Goal**: Expand KB coverage for high-volume rules that lack patterns, prioritized by usage impact.

## Analysis Summary from Session 94

### Current KB Coverage

| Status | Rules | Examples |
|--------|-------|----------|
| **Has KB Pattern** | 15 | CloseResource, ShortVariable, FieldDeclarationsShouldBeAtStartOfClass |
| **Needs KB Pattern** | 10+ | no-console, LongVariable, LinguisticNaming |
| **Not AI-Fixable** | 5+ | OnlyOneReturn, CyclomaticComplexity |

### Prioritization Matrix

**Priority Score** = Volume × Fixability × (1 - Current Coverage)

| Rank | Rule | Tool | Volume | Category | Priority Score | Has KB? |
|------|------|------|--------|----------|----------------|---------|
| 1 | **no-console** | ESLint | 2,588 | needs-context | 2,588 | ❌ |
| 2 | **LongVariable** | PMD | 155 | needs-context | 155 | ❌ |
| 3 | **LinguisticNaming** | PMD | 45 | needs-context | 45 | ❌ |
| 4 | **AvoidReassigningParameters** | PMD | 26 | needs-context | 26 | ❌ |
| 5 | **AvoidDuplicateLiterals** | PMD | 21 | needs-context | 21 | ❌ |
| 6 | **LiteralsFirstInComparisons** | PMD | 7 | syntax-only | 7 | ❌ |
| - | OnlyOneReturn | PMD | 415 | architectural | 0 | N/A |
| - | CyclomaticComplexity | PMD | 32 | architectural | 0 | N/A |

---

## Task Queue for Session 95

### Phase 1: High-Volume ESLint Pattern (Estimated: 1 hour)

#### Task 1: Create no-console KB Pattern
**Volume Impact**: 2,588 issues (54% of all unfixed)

**Why Complex**: Requires project-specific logging framework detection

**Steps**:
1. Analyze common logging frameworks: winston, pino, bunyan, console (allowed in Node scripts)
2. Create pattern that detects project's logging setup
3. Generate KB guidance with multiple correct patterns:
   - `logger.info()` for winston/pino
   - `console.log()` acceptable in CLI tools
   - Remove entirely for browser code
4. Test on 10 sample no-console violations
5. Add to KB with confidence levels per context

**Expected Pattern**:
```typescript
['no-console:typescript:eslint', {
  ruleId: 'no-console',
  language: 'typescript',
  tool: 'eslint',
  antiPatterns: [
    { pattern: 'console.log for debugging', why: 'Should use proper logger or remove' },
    { pattern: 'console.error without logger', why: 'Loses structured logging benefits' }
  ],
  correctPatterns: [
    { pattern: 'Use project logger', example: "import { logger } from './logger';\nlogger.info('message');" },
    { pattern: 'Remove debug logs', example: '// Remove console.log entirely' }
  ],
  promptAdditions: `CRITICAL for no-console:
- First check if project has logging utility (look for logger.ts, pino, winston)
- If logger exists: import and use logger.info/warn/error
- If no logger: remove the console statement entirely
- Exception: CLI tools in /cli/ or /scripts/ can use console`
}]
```

---

### Phase 2: Naming Rules KB Patterns (Estimated: 1.5 hours)

#### Task 2: Create LongVariable KB Pattern
**Volume Impact**: 155 issues

**Challenge**: Need heuristics for acceptable shortening

**Steps**:
1. Analyze common long variable patterns in commons-io
2. Create shortening rules that maintain clarity
3. Test on 10 samples
4. Add to KB

**Expected Pattern**:
```typescript
['LongVariable:java:pmd', {
  antiPatterns: [
    { pattern: 'redundant type in name', why: 'arrayListOfStrings → strings' },
    { pattern: 'excessive qualification', why: 'currentUserAccountBalance → balance' }
  ],
  correctPatterns: [
    { pattern: 'remove type suffix', example: 'fileInputStream → inputStream or stream' },
    { pattern: 'use context', example: 'In FileReader: currentLineNumber → lineNumber' }
  ],
  promptAdditions: `CRITICAL for LongVariable:
- Max recommended length: 25 characters
- Remove redundant type info: stringBuffer → buffer
- Use method/class context: in copyFile(), sourceFile → source
- Keep domain terms: transactionId is fine, don't shorten to txId`
}]
```

#### Task 3: Create LinguisticNaming KB Pattern
**Volume Impact**: 45 issues

**Steps**:
1. Analyze boolean naming violations (is/has/can/should prefixes)
2. Create naming convention rules
3. Test on 10 samples
4. Add to KB

**Expected Pattern**:
```typescript
['LinguisticNaming:java:pmd', {
  antiPatterns: [
    { pattern: 'boolean without is/has/can', why: 'enabled() should be isEnabled()' },
    { pattern: 'getter returning void', why: 'getName() returning void is misleading' }
  ],
  correctPatterns: [
    { pattern: 'boolean prefix', example: 'isEnabled, hasPermission, canWrite' },
    { pattern: 'getter returns value', example: 'String getName() { return name; }' }
  ]
}]
```

---

### Phase 3: Code Transformation Patterns (Estimated: 1 hour)

#### Task 4: Create AvoidReassigningParameters KB Pattern
**Volume Impact**: 26 issues

**Steps**:
1. Create pattern for local variable copy
2. Handle common cases: modification before use, accumulation
3. Test on 10 samples
4. Add to KB

**Expected Pattern**:
```typescript
['AvoidReassigningParameters:java:pmd', {
  antiPatterns: [
    { pattern: 'parameter = newValue', why: 'Modifying parameters hides intent' }
  ],
  correctPatterns: [
    { pattern: 'create local copy', example: 'String localName = name;\nlocalName = process(localName);' },
    { pattern: 'use final parameter', example: 'void process(final String name) { String result = transform(name); }' }
  ],
  promptAdditions: `CRITICAL for AvoidReassigningParameters:
- Create local variable with same or descriptive name
- Copy parameter value to local variable FIRST
- Then modify the local variable
- Parameter should remain unchanged`
}]
```

#### Task 5: Create AvoidDuplicateLiterals KB Pattern
**Volume Impact**: 21 issues

**Steps**:
1. Create constant extraction pattern
2. Handle naming conventions for extracted constants
3. Test on 10 samples
4. Add to KB

**Expected Pattern**:
```typescript
['AvoidDuplicateLiterals:java:pmd', {
  antiPatterns: [
    { pattern: 'same string literal 3+ times', why: 'Maintenance burden, typo risk' }
  ],
  correctPatterns: [
    { pattern: 'extract to constant', example: 'private static final String ERROR_PREFIX = "Error: ";' },
    { pattern: 'constant naming', example: 'UPPER_SNAKE_CASE for all constants' }
  ],
  promptAdditions: `CRITICAL for AvoidDuplicateLiterals:
- Extract to private static final constant
- Name describes PURPOSE not value: ERROR_MESSAGE not STRING_ERROR
- Place constants at top of class
- If literal is in multiple classes, consider shared constants class`
}]
```

#### Task 6: Create LiteralsFirstInComparisons KB Pattern
**Volume Impact**: 7 issues (but trivial fix)

**Steps**:
1. Create simple swap pattern
2. Handle null checks and equals
3. Test on samples
4. Add to KB

---

### Phase 4: Calibration Testing (Estimated: 30 min)

#### Task 7: Run Calibration Test Suite
**Goal**: Validate all new patterns improve fix quality

**Steps**:
1. Create test samples for each new pattern (5 per rule)
2. Run AI fixer WITHOUT new KB patterns (baseline)
3. Add new patterns to KB
4. Run AI fixer WITH new KB patterns
5. Compare:
   - Success rate before/after
   - Confidence score before/after
   - Regression rate before/after
6. Document calibration results

**Expected Output**:
```json
{
  "calibrationResults": {
    "no-console": { "before": "70%", "after": "90%", "improvement": "+20%" },
    "LongVariable": { "before": "60%", "after": "85%", "improvement": "+25%" },
    ...
  }
}
```

---

### Phase 5: Documentation & Metrics (Estimated: 30 min)

#### Task 8: Update KB Effectiveness Dashboard
**Steps**:
1. Update fix-pattern-guidance.ts with new patterns
2. Create KB coverage report
3. Calculate new AI-fixable coverage percentage
4. Document recommended patterns for next session

---

## Success Criteria

| Metric | Target |
|--------|--------|
| New KB Patterns Added | 6 |
| KB Coverage (rules with patterns) | 21 (from 15) |
| no-console AI Success Rate | >85% |
| Naming Rules AI Success Rate | >80% |
| Calibration Improvement | >15% avg |

## Files to Create/Modify

| File | Action |
|------|--------|
| `fix-pattern-guidance.ts` | Add 6 new patterns |
| `tests/fixtures/calibration-session-95.json` | Before/after metrics |
| `tests/fixtures/no-console-test-samples.ts` | ESLint test cases |
| `tests/fixtures/naming-rules-test-samples.ts` | PMD naming tests |

## Priority Order

1. **no-console** (2,588 issues) - Highest impact
2. **LongVariable** (155 issues) - Common naming issue
3. **AvoidReassigningParameters** (26) - Clean transformation
4. **LinguisticNaming** (45) - Boolean naming
5. **AvoidDuplicateLiterals** (21) - Constant extraction
6. **LiteralsFirstInComparisons** (7) - Easy win

## Notes for Implementation

### no-console Detection Strategy
```typescript
// Detect project logging setup
async function detectLoggingFramework(projectPath: string): Promise<string> {
  // Check package.json for winston, pino, bunyan
  // Check for logger.ts, logging.ts files
  // Return: 'winston' | 'pino' | 'console' | 'unknown'
}
```

### Variable Naming Heuristics
```typescript
// Shortening rules for LongVariable
const SHORTENING_RULES = [
  { pattern: /^(.*)(String|Integer|Boolean|Array|List|Map)$/, replacement: '$1' },
  { pattern: /^current(.*)$/, replacement: '$1' },
  { pattern: /^(.*)(Object|Instance|Value)$/, replacement: '$1' },
];
```

---

## Appendix: Rules NOT to Create Patterns For

These rules are architectural and require human judgment:

| Rule | Reason |
|------|--------|
| OnlyOneReturn | Requires control flow refactoring |
| CyclomaticComplexity | Requires algorithm redesign |
| TooManyMethods | Requires class splitting |
| LawOfDemeter | Requires dependency restructuring |
| AvoidUncheckedExceptionsInSignatures | API design decision |

---

## Quick Start Command

```bash
# Start Session 95
/rex packages/agents/docs/NEXT_SESSION_95_KB_EXPANSION.md
```
