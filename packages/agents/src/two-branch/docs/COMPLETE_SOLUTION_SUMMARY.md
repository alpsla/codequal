# Complete Solution: Iterative Collection with Consistent Enhanced Prompts

## Problem Statement
DeepWiki may return data inconsistently, which is why we need:
1. **Iterative collection** (3-10 iterations) to gather a complete unique list of findings
2. **Consistent prompts** across all iterations requesting code snippets, categories, impact, and education
3. **Code snippet to location search** to find real file locations in the repository

## Solution Implemented

### 1. Enhanced Comprehensive Prompt (Iteration 1)
**File:** `src/standard/deepwiki/prompts/enhanced-comprehensive-prompt.ts`

Key features:
- Explicitly requires ALL fields for every issue
- Emphasizes REAL file paths and ACTUAL code snippets
- Mandates categories, impact, and educational content
- Provides clear examples of expected format

### 2. Enhanced Iteration Prompts (Iterations 2-10)
**File:** `src/standard/deepwiki/prompts/iteration-prompts-enhanced.ts`

Created specific prompts for each iteration phase:
- **Iteration 2:** Focus on edge cases and hidden issues
- **Iteration 3:** Search for subtle problems and race conditions
- **Iterations 4-10:** Exhaustive search in overlooked areas

Each iteration prompt maintains the SAME requirements:
```
Every issue MUST include:
1. title, category, severity, impact
2. file (ACTUAL path), line (EXACT number)
3. codeSnippet (REAL code from repository)
4. recommendation, education
```

### 3. Updated AdaptiveDeepWikiAnalyzer
**File:** `src/standard/deepwiki/services/adaptive-deepwiki-analyzer.ts`

Changes:
```typescript
private generateIterationPrompt(gaps: GapAnalysis, iteration: number): string {
  if (iteration === 0) {
    return ENHANCED_COMPREHENSIVE_PROMPT;
  }
  
  // Subsequent iterations use enhanced prompts
  const baseIterationPrompt = getIterationPrompt(iteration + 1);
  const gapPrompt = this.gapAnalyzer.generateGapFillingPrompt(gaps.gaps, iteration + 1);
  
  if (baseIterationPrompt) {
    return baseIterationPrompt; // Use specific iteration prompt
  } else {
    return combineWithGapPrompt(gapPrompt, iteration + 1); // Enhance gap prompt
  }
}
```

### 4. Enhanced DeepWiki API with Location Search
**File:** `src/standard/services/direct-deepwiki-api-with-location.ts`

Complete flow implementation:
1. Clone/cache repository
2. Run iterative collection (3-10 iterations)
3. Search for real locations using code snippets
4. Return enhanced results with accurate file:line mapping

## How It Works

### Iteration Flow
```
Iteration 1: Comprehensive analysis with ENHANCED_COMPREHENSIVE_PROMPT
  ↓ (Find 20-30 issues with code snippets)
Iteration 2: Find additional unique issues with ITERATION_2_ENHANCED_PROMPT
  ↓ (Find 10-15 more edge cases)
Iteration 3: Deep search for subtle issues with ITERATION_3_ENHANCED_PROMPT
  ↓ (Find 5-10 final issues)
Iterations 4-10: Continue until no new unique issues for 2 iterations
  ↓ (Exhaustive search)
Result: Complete unique list with consistent structured data
```

### Data Consistency Across Iterations

Each iteration maintains these requirements:

| Field | Requirement | Example |
|-------|------------|---------|
| **title** | Clear, specific, unique | "Retry Logic Missing Error Boundaries" |
| **category** | One of 6 defined categories | "code-quality" |
| **severity** | critical/high/medium/low | "high" |
| **impact** | 2-3 sentence business impact | "Can crash application..." |
| **file** | ACTUAL repository path | "source/index.ts" |
| **line** | EXACT line number | 234 |
| **codeSnippet** | REAL code (5-10 lines) | `async retry(fn) {...}` |
| **recommendation** | Specific fix with code | "Add try-catch..." |
| **education** | Best practices explanation | "Retry logic should..." |

## Testing Results

### Before Enhancement
- Single iteration only
- Generic/hallucinated data
- No code snippets
- Inconsistent categories
- Missing impact/education

### After Enhancement
- ✅ 3-10 iterations with unique finding collection
- ✅ Real file paths from repository
- ✅ Actual code snippets in all iterations
- ✅ Consistent categories across iterations
- ✅ Complete impact and educational content
- ✅ Location search integration

## Key Improvements

1. **Consistency**: All iterations use the same data requirements
2. **Uniqueness**: Each iteration explicitly searches for NEW issues
3. **Completeness**: Continues until finding set is stable (2 iterations with no new issues)
4. **Quality**: Every issue has complete structured data with real code
5. **Accuracy**: Code snippets enable location search for real file:line mapping

## Configuration

The system is configured for:
- **Minimum iterations:** 3 (ensures thoroughness)
- **Maximum iterations:** 10 (prevents infinite loops)
- **Stop condition:** No new unique issues for 2 consecutive iterations
- **Timeout per iteration:** 60 seconds
- **Total timeout:** 5 minutes

## Usage

### Direct Usage
```typescript
import { DirectDeepWikiApiWithLocation } from './src/standard/services/direct-deepwiki-api-with-location';

const api = new DirectDeepWikiApiWithLocation();
const result = await api.analyzeRepository('https://github.com/owner/repo', {
  branch: 'main',
  prId: 123
});
```

### Testing
```bash
# Test enhanced prompts
npx ts-node test-enhanced-prompts.ts

# Test iterative consistency
npx ts-node test-iterative-consistency.ts

# Test with real PR
npx ts-node src/standard/tests/regression/manual-pr-validator-enhanced.ts <PR_URL>
```

## Files Created/Modified

### New Files
1. `src/standard/deepwiki/prompts/enhanced-comprehensive-prompt.ts`
2. `src/standard/deepwiki/prompts/iteration-prompts-enhanced.ts`
3. `src/standard/services/direct-deepwiki-api-with-location.ts`
4. `src/standard/tests/regression/manual-pr-validator-enhanced.ts`
5. `test-enhanced-prompts.ts`
6. `test-iterative-consistency.ts`

### Modified Files
1. `src/standard/deepwiki/services/adaptive-deepwiki-analyzer.ts`
   - Uses enhanced prompts for all iterations
   - Maintains consistency requirements

## Conclusion

The complete solution ensures:
1. **Iterative collection** works correctly (3-10 iterations)
2. **All iterations** request the same structured data with code snippets
3. **Unique findings** are collected across iterations
4. **Real locations** can be found using code snippet search

This addresses the concern that "DeepWiki may return data inconsistently" by:
- Running multiple iterations to ensure completeness
- Maintaining consistent requirements across all iterations
- Collecting unique findings until the set stabilizes
- Providing real, searchable data for accurate location mapping