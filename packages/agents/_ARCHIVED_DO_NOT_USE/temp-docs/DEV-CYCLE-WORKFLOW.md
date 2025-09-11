# Dev-Cycle Orchestrator Workflow

## Overview

The dev-cycle-orchestrator provides a comprehensive pre-commit validation workflow that ensures code quality and prevents regression issues before they reach the repository.

## Workflow Phases

### Phase 1: Build Validation ✅
- TypeScript compilation check
- Build artifact verification
- Syntax error detection
- **Time**: ~2-3 seconds

### Phase 2: Unit Tests ✅
- **AI Impact Categorization Test**
  - Validates Breaking Changes logic
  - Tests Dependencies scoring
  - Ensures proper error handling
- **Report Generation Test**
  - Validates all 12 report sections
  - Checks scoring calculations
  - Verifies format compliance
- **Time**: ~5 seconds total

### Phase 3: Integration Tests ✅
- Tests against real PRs:
  - sindresorhus/ky #500 (Small TypeScript)
  - vercel/swr #2950 (Medium TypeScript)
  - facebook/react #31616 (Large JavaScript)
- Validates model selection
- Checks performance metrics
- **Time**: ~30-60 seconds

### Phase 4: Report Generation ✅
- Generates HTML validation report
- Includes all test results
- Provides visual summary
- **Location**: `test-outputs/dev-cycle-validation/`

### Phase 5: Manual Validation 📋
- Interactive checklist review
- Optional PR-specific testing
- Final approval before commit

## Running the Workflow

### 1. Automated Simulation
```bash
# Run the complete simulation
npx ts-node simulate-dev-cycle.ts

# This will:
# - Run all automated tests
# - Generate HTML report
# - Provide review instructions
```

### 2. Interactive Validation
```bash
# Run the interactive workflow
npx ts-node manual-validation-workflow.ts

# This provides:
# - Step-by-step validation
# - Interactive checklist
# - Option for manual PR testing
# - Commit approval process
```

### 3. Quick Unit Tests Only
```bash
# Fast feedback loop (5 seconds)
npx ts-node test-runner.ts
```

## Validation Report Features

The generated HTML report includes:

### Summary Cards
- **Tests Passed**: Green indicator with count
- **Tests Failed**: Red indicator with count
- **Total Time**: Execution duration
- **Commit Status**: READY or BLOCKED

### Detailed Test Results
- ✅ Build validation status
- ✅ Unit test results with details
- ✅ Integration test metrics
- ✅ Performance measurements

### Manual Review Section
- Interactive approval buttons
- Clear action items
- Review checklist

## Sample Output

```
╔════════════════════════════════════════════════════════════════╗
║           🚀 DEV-CYCLE ORCHESTRATOR SIMULATION                 ║
║                                                                ║
║  Simulating pre-commit validation workflow with manual review  ║
╚════════════════════════════════════════════════════════════════╝

PHASE 1: BUILD VALIDATION
[1/1] Running TypeScript build...
  ✓ Build artifacts found
  ✓ TypeScript compilation successful

PHASE 2: UNIT TESTS
[1/2] Running AI Impact Categorization Test...
  ✓ All AI categorization tests passed
[2/2] Running Report Generation Test...
  ✓ All 12 report sections validated successfully

PHASE 3: INTEGRATION TESTS
[1/3] Testing sindresorhus/ky PR #500...
  ✓ TypeScript analysis completed
  - Issues found: 20
  - Time: 22.0s

VALIDATION SUMMARY
═════════════════════════════════════════════════════════════════
Total Tests:    6
Passed:         6
Failed:         0
Time Elapsed:   2.8s

✅ ALL TESTS PASSED - Ready for commit after manual review
```

## Pre-Commit Hook Integration

To integrate with git hooks:

```bash
# .git/hooks/pre-commit
#!/bin/bash

echo "Running dev-cycle validation..."
npx ts-node simulate-dev-cycle.ts

if [ $? -ne 0 ]; then
  echo "❌ Validation failed. Commit blocked."
  exit 1
fi

echo "✅ Validation passed. Proceeding with commit."
```

## Manual Validation Checklist

Before committing, ensure:

1. ✅ **Unit tests passed** - All AI and report generation tests
2. ✅ **Build successful** - No TypeScript errors
3. ✅ **No unintended breaking changes** - SQL injection not in breaking changes
4. ✅ **Dependencies properly scored** - Points deducted for vulnerabilities
5. ✅ **AI categorization reviewed** - No mock responses
6. ✅ **Generated reports reviewed** - All sections present and correct
7. ✅ **Manual PR test passed** - Optional but recommended

## Validation Stamp

After successful validation, a `.validation-stamp.json` is created:

```json
{
  "timestamp": "2025-08-13T20:45:00.000Z",
  "validations": [
    { "id": "unit", "label": "Unit tests passed", "checked": true },
    { "id": "build", "label": "Build successful", "checked": true },
    { "id": "breaking", "label": "No unintended breaking changes", "checked": true },
    { "id": "dependencies", "label": "Dependencies properly scored", "checked": true },
    { "id": "ai", "label": "AI categorization reviewed", "checked": true },
    { "id": "reports", "label": "Generated reports reviewed", "checked": true },
    { "id": "manual", "label": "Manual PR test passed", "checked": true }
  ],
  "approved": true
}
```

## Benefits

1. **Early Detection**: Catches issues before commit
2. **Comprehensive Coverage**: Tests all critical functionality
3. **Visual Reporting**: Beautiful HTML reports for review
4. **Interactive Workflow**: Guided validation process
5. **Audit Trail**: Validation stamps for compliance
6. **Fast Feedback**: Unit tests complete in ~5 seconds

## Files Created

- `simulate-dev-cycle.ts` - Automated simulation script
- `manual-validation-workflow.ts` - Interactive validation
- `test-runner.ts` - Quick unit test runner
- `test-outputs/dev-cycle-validation/*.html` - Generated reports

## Next Steps

1. **Review the generated HTML report**
   ```bash
   open test-outputs/dev-cycle-validation/validation-report-*.html
   ```

2. **Run interactive validation**
   ```bash
   npx ts-node manual-validation-workflow.ts
   ```

3. **Commit with confidence**
   ```bash
   git commit -m "feat: implemented dev-cycle validation workflow"
   ```

---

The dev-cycle-orchestrator ensures that every commit meets quality standards and prevents regression issues that have previously required re-implementation of features.