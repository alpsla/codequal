/**
 * Enhanced Iteration Prompts for Consistent Data Collection
 * Ensures all iterations request code snippets and structured data
 */

/**
 * Iteration 2: Find additional unique issues not found in iteration 1
 */
export const ITERATION_2_ENHANCED_PROMPT = `
Continue analyzing this repository. Find ADDITIONAL unique issues not already reported.

## CRITICAL REQUIREMENTS - SAME AS BEFORE

Every single NEW issue MUST include ALL of these fields:
1. **title**: Clear, specific issue title (DIFFERENT from previous issues)
2. **category**: One of: security, performance, code-quality, dependencies, testing, architecture
3. **severity**: One of: critical, high, medium, low
4. **impact**: Business/technical impact description (2-3 sentences)
5. **file**: EXACT file path from the repository (e.g., "source/index.ts", "test/retry.ts")
6. **line**: EXACT line number where issue occurs
7. **codeSnippet**: ACTUAL code from the repository (5-10 lines showing the issue)
8. **recommendation**: Specific fix with code example
9. **education**: Educational explanation of why this is an issue and best practices

## FOCUS AREAS FOR ITERATION 2

Look deeper for:
1. **Edge Cases**: Issues in error handling, boundary conditions, null checks
2. **Hidden Performance Issues**: Nested loops, unnecessary re-renders, cache misses
3. **Security in Dependencies**: Transitive vulnerabilities, outdated sub-dependencies
4. **Test Quality Issues**: Tests that don't actually test, missing assertions
5. **Architecture Debt**: Tight coupling, missing interfaces, violating SOLID principles
6. **Documentation Gaps**: Undocumented APIs, missing JSDoc, outdated examples

## AVOID DUPLICATES

DO NOT report issues similar to what was already found. Focus on:
- Different files not yet analyzed
- Different types of issues
- Deeper, more subtle problems
- Issues in test files, configuration files, build scripts

## OUTPUT FORMAT - MANDATORY

Return ONLY NEW issues in this exact JSON format:
{
  "issues": [
    {
      "title": "Memory Leak in Event Listener Registration",
      "category": "performance",
      "severity": "high",
      "impact": "Event listeners not cleaned up causing memory leaks in long-running applications. Can lead to browser crashes after extended use.",
      "file": "source/core/Ky.ts",
      "line": 456,
      "codeSnippet": "window.addEventListener('resize', this.handleResize);\\n// No corresponding removeEventListener in cleanup",
      "recommendation": "Add cleanup in destructor: window.removeEventListener('resize', this.handleResize);",
      "education": "Event listeners must be explicitly removed to prevent memory leaks. This is especially critical in single-page applications where components are frequently mounted/unmounted."
    }
  ]
}

Find at least 10-15 NEW unique issues with REAL code snippets from ACTUAL files.
`;

/**
 * Iteration 3: Find remaining edge cases and subtle issues
 */
export const ITERATION_3_ENHANCED_PROMPT = `
Final deep analysis. Find REMAINING unique issues not yet reported in previous iterations.

## CRITICAL REQUIREMENTS - MAINTAIN CONSISTENCY

Every single NEW issue MUST include ALL fields with REAL data:
- title, category, severity, impact
- file (ACTUAL path), line (EXACT number)
- codeSnippet (REAL code from repository)
- recommendation, education

## FOCUS ON SUBTLE ISSUES

Search for:
1. **Race Conditions**: Async operations without proper synchronization
2. **Resource Leaks**: Unclosed connections, file handles, timers
3. **Accessibility Issues**: Missing ARIA labels, keyboard navigation problems
4. **Internationalization**: Hard-coded strings, locale-specific assumptions
5. **Build/Deploy Issues**: Problems in webpack config, CI/CD scripts
6. **Cross-browser Compatibility**: Issues with older browsers, polyfill needs

## SEARCH IN OVERLOOKED AREAS

Check files that might have been missed:
- Configuration files: tsconfig.json, .eslintrc, webpack.config.js
- GitHub workflows: .github/workflows/*.yml
- Package files: package.json dependencies and scripts
- Documentation: README.md code examples
- Helper utilities: Small utility functions often have bugs

## MANDATORY FORMAT

{
  "issues": [
    {
      "title": "Race Condition in Concurrent Request Handling",
      "category": "code-quality",
      "severity": "high",
      "impact": "Concurrent requests can overwrite each other's results leading to incorrect data being returned to users.",
      "file": "source/utils/requestQueue.ts",
      "line": 89,
      "codeSnippet": "if (!this.queue[key]) {\\n  this.queue[key] = promise;\\n  // Race condition: another request can check between these lines\\n  const result = await promise;\\n  delete this.queue[key];",
      "recommendation": "Use atomic operations or locks: const existing = this.queue[key]; if (existing) return existing;",
      "education": "Race conditions in JavaScript can occur even in single-threaded code due to async operations. Always use atomic checks and updates for shared state."
    }
  ]
}

Find at least 5-10 FINAL unique issues with complete information.
`;

/**
 * Iteration 4-10: Exhaustive search for any remaining issues
 */
export const ITERATION_4_PLUS_ENHANCED_PROMPT = `
Exhaustive search iteration. Find ANY remaining issues not yet discovered.

## SAME REQUIREMENTS APPLY

ALL issues MUST have:
- Complete structured data (title, category, severity, impact)
- REAL file paths and line numbers from the repository
- ACTUAL code snippets (not examples or pseudocode)
- Specific recommendations and educational content

## EXHAUSTIVE SEARCH AREAS

1. **Regex Patterns**: ReDoS vulnerabilities, incorrect patterns
2. **Number Handling**: Integer overflow, floating-point precision issues
3. **Time/Date Issues**: Timezone bugs, DST handling, leap year problems
4. **Concurrency**: Deadlocks, livelocks, starvation in async code
5. **Memory**: Stack overflow risks, excessive recursion
6. **Third-party Integration**: API contract violations, version mismatches
7. **Error Messages**: Information disclosure in error messages
8. **Logging**: Sensitive data in logs, excessive logging
9. **Caching**: Cache invalidation issues, stale data problems
10. **State Management**: State mutation, inconsistent state updates

## DEEP CODE INSPECTION

Examine:
- Complex conditional logic (cyclomatic complexity > 10)
- Deeply nested callbacks or promises
- Large functions (> 50 lines)
- Files with high churn rate
- Recently modified code
- Code with TODO/FIXME comments

## OUTPUT REQUIREMENT

Return ANY new issues found, even if only 1-2. Quality over quantity.
Each issue MUST have complete information with real code snippets.

{
  "issues": [...],
  "searchComplete": true // Set to true if no more issues can be found
}
`;

/**
 * Generate the appropriate prompt based on iteration number
 */
export function getIterationPrompt(iteration: number): string {
  switch (iteration) {
    case 1:
      // This is handled by ENHANCED_COMPREHENSIVE_PROMPT
      return '';
    case 2:
      return ITERATION_2_ENHANCED_PROMPT;
    case 3:
      return ITERATION_3_ENHANCED_PROMPT;
    default:
      // Iterations 4-10
      return ITERATION_4_PLUS_ENHANCED_PROMPT;
  }
}

/**
 * Combine gap-specific prompts with enhanced requirements
 */
export function combineWithGapPrompt(gapPrompt: string, iteration: number): string {
  if (!gapPrompt || gapPrompt.trim() === '') {
    return getIterationPrompt(iteration);
  }
  
  // Combine gap-specific requests with our enhanced requirements
  return `${gapPrompt}

## ADDITIONAL MANDATORY REQUIREMENTS

Every issue found MUST include:
1. **file**: EXACT file path from the repository (not generic examples)
2. **line**: EXACT line number where issue occurs
3. **codeSnippet**: ACTUAL code from the repository (5-10 lines)
4. **category**: One of: security, performance, code-quality, dependencies, testing, architecture
5. **severity**: One of: critical, high, medium, low
6. **impact**: Business/technical impact (2-3 sentences)
7. **recommendation**: Specific fix with code example
8. **education**: Why this matters and best practices

Search the ACTUAL repository files and provide REAL code snippets, not hypothetical examples.
Focus on finding UNIQUE issues not already reported in previous iterations.`;
}