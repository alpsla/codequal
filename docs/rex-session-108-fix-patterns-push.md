# Session 108: Fix Failing Patterns + Push to Main

**Goal**: Clean up the 6 failing patterns in `fix_failure_tracking`, validate, and push to main branch.

**Prerequisites**:
- Supabase connection active
- Access to `fix_pattern_guidance` table
- All Session 106-107 work complete

---

## Tasks

### 1. Create Pattern for UselessParentheses (pmd/java)
**Goal**: Add guidance pattern for UselessParentheses rule
**Steps**:
1. Navigate to fix-pattern-registry directory
2. Create pattern with anti-patterns and correct patterns
3. Add to Supabase `fix_pattern_guidance` table
4. Verify pattern is active
**Pattern**:
```typescript
{
  ruleId: 'UselessParentheses',
  language: 'java',
  tool: 'pmd',
  antiPatterns: [
    'Removing ALL parentheses without checking operator precedence',
    'Changing expression meaning by removing grouping'
  ],
  correctPatterns: [
    'Only remove parentheses that do not affect precedence',
    'Keep parentheses around complex boolean expressions',
    'Check Java operator precedence: *, /, % > +, - > ==, != > && > ||'
  ],
  promptAdditions: 'Check Java operator precedence before removing. Only remove redundant parens that do not affect evaluation order.'
}
```

---

### 2. Create Pattern for F632 (ruff/python)
**Goal**: Add guidance pattern for F632 rule (is literal comparison)
**Steps**:
1. Create pattern for F632 rule
2. Add anti-patterns for common mistakes
3. Add correct patterns with examples
4. Insert into Supabase
**Pattern**:
```typescript
{
  ruleId: 'F632',
  language: 'python',
  tool: 'ruff',
  antiPatterns: [
    'Using is True or is False for comparisons',
    'Using == True in boolean context where truthiness works'
  ],
  correctPatterns: [
    'Remove comparison entirely if checking truthiness: if x: not if x == True:',
    'Use is None for None checks, == True/False only for explicit bool comparison',
    'For boolean flags, prefer if flag: over if flag == True:'
  ],
  promptAdditions: 'In boolean context, prefer if x: over if x == True:. Only keep explicit comparison when the variable might not be a boolean.'
}
```

---

### 3. Create Pattern for @typescript-eslint/no-explicit-any
**Goal**: Add guidance pattern for no-explicit-any rule
**Steps**:
1. Create pattern for TypeScript any type issues
2. Add anti-patterns for incorrect fixes
3. Add correct patterns with type inference guidance
4. Insert into Supabase
**Pattern**:
```typescript
{
  ruleId: '@typescript-eslint/no-explicit-any',
  language: 'typescript',
  tool: 'eslint',
  antiPatterns: [
    'Replacing any with unknown without updating usage code',
    'Using overly generic types that lose all type safety',
    'Adding type assertions (as Type) everywhere'
  ],
  correctPatterns: [
    'Replace any with specific interface or type based on actual usage',
    'Use unknown with type guards when type is truly unknown',
    'Use generics for flexible but type-safe code',
    'For event handlers, use the specific event type (MouseEvent, ChangeEvent, etc.)'
  ],
  promptAdditions: 'Analyze the actual usage of the variable to determine the proper type. Prefer specific interfaces over unknown. Check what properties/methods are accessed.'
}
```

---

### 4. Create Pattern for AvoidDollarSigns (pmd/java)
**Goal**: Add guidance pattern for AvoidDollarSigns rule
**Steps**:
1. Create pattern for dollar sign in identifiers
2. Document when dollar signs are intentional (generated code, inner classes)
3. Insert into Supabase
**Pattern**:
```typescript
{
  ruleId: 'AvoidDollarSigns',
  language: 'java',
  tool: 'pmd',
  antiPatterns: [
    'Removing dollar signs from generated code or inner class references',
    'Renaming variables that are part of framework conventions'
  ],
  correctPatterns: [
    'Rename user-defined variables to use camelCase without dollar signs',
    'Keep dollar signs in generated code (mark as suppressed if needed)',
    'For inner class references like Outer$Inner, this is compiler-generated - suppress'
  ],
  promptAdditions: 'Dollar signs are reserved for compiler-generated code. For user variables, rename to camelCase. If this is generated code or inner class reference, add @SuppressWarnings instead.'
}
```

---

### 5. Create Pattern for UnnecessaryAnnotationValueElement (pmd/java)
**Goal**: Add guidance pattern for UnnecessaryAnnotationValueElement rule
**Steps**:
1. Create pattern for annotation value simplification
2. Add examples of correct simplification
3. Insert into Supabase
**Pattern**:
```typescript
{
  ruleId: 'UnnecessaryAnnotationValueElement',
  language: 'java',
  tool: 'pmd',
  antiPatterns: [
    'Removing value= when multiple elements exist in annotation',
    'Breaking annotation syntax by incorrect removal'
  ],
  correctPatterns: [
    '@SuppressWarnings(value = "unchecked") -> @SuppressWarnings("unchecked")',
    '@RequestMapping(value = "/path") -> @RequestMapping("/path")',
    'Only remove value= when it is the ONLY element in the annotation'
  ],
  promptAdditions: 'Only simplify when value is the single element. @Anno(value="x") becomes @Anno("x"). But @Anno(value="x", other="y") must keep value= explicit.'
}
```

---

### 6. Create Pattern for UseUtilityClass (pmd/java)
**Goal**: Add guidance pattern for UseUtilityClass rule
**Steps**:
1. Create pattern for utility class detection
2. Add guidance on private constructor placement
3. Insert into Supabase
**Pattern**:
```typescript
{
  ruleId: 'UseUtilityClass',
  language: 'java',
  tool: 'pmd',
  antiPatterns: [
    'Adding private constructor to classes that are meant to be instantiated',
    'Adding private constructor to Spring @Configuration or @Component classes',
    'Breaking dependency injection by making class non-instantiable'
  ],
  correctPatterns: [
    'Add private constructor only to true utility classes (all static methods)',
    'For Spring beans, suppress the warning instead',
    'Private constructor should be: private ClassName() { throw new UnsupportedOperationException(); }'
  ],
  promptAdditions: 'Check if class is a Spring bean (@Component, @Service, @Configuration) - if so, suppress warning. Only add private constructor to pure utility classes with all static methods.'
}
```

---

### 7. Remove Fixed Patterns from fix_failure_tracking
**Goal**: Clean up the failure tracking table
**Steps**:
1. Query fix_failure_tracking for the 6 rules
2. Delete entries that now have guidance patterns
3. Verify table is clean

---

### 8. Run Validation Tests
**Goal**: Verify patterns work correctly
**Steps**:
1. Run live integration tests
2. Verify no regressions
3. Check pattern lookup works
**Commands**:
```bash
cd packages/agents
npm test -- --testPathPattern="live-" --verbose
```

---

### 9. Commit Changes
**Goal**: Commit pattern additions
**Steps**:
1. Stage all changes
2. Create descriptive commit message
3. Verify commit
**Commands**:
```bash
git add -A
git status
git commit -m "feat(kb): Add 6 guidance patterns for failing rules

- UselessParentheses (pmd/java): Operator precedence guidance
- F632 (ruff/python): Boolean comparison guidance
- no-explicit-any (eslint/typescript): Type inference guidance
- AvoidDollarSigns (pmd/java): Generated code handling
- UnnecessaryAnnotationValueElement (pmd/java): Annotation simplification
- UseUtilityClass (pmd/java): Spring bean detection

Resolves 6 entries in fix_failure_tracking table."
```

---

### 10. Push to Main
**Goal**: Push validated changes to main branch
**Steps**:
1. Verify on main branch
2. Push to origin
3. Verify push succeeded
**Commands**:
```bash
git branch
git push origin main
git log --oneline -3
```

---

## Validation

```bash
# Run all live tests
cd packages/agents
npm test -- --testPathPattern="live-" --verbose

# Check Supabase pattern count
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
supabase.from('fix_pattern_guidance').select('rule_id', { count: 'exact' })
  .then(({count}) => console.log('Guidance patterns:', count));
"
```

## Expected Outcomes

- 6 new entries in `fix_pattern_guidance` table (total: 19)
- 0 entries remaining in `fix_failure_tracking` for these rules
- All live tests passing
- Clean commit pushed to main

## Notes

- Patterns should be tested with actual issues before marking complete
- If a pattern still causes regressions, refine the guidance
- Document any edge cases discovered during testing
