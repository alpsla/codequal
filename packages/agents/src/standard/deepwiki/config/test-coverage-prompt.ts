/**
 * Enhanced prompt for extracting test coverage data consistently
 */

export const TEST_COVERAGE_PROMPT = `
Analyze the test coverage for this repository and provide detailed metrics.

**IMPORTANT TEST COVERAGE INSTRUCTIONS:**

1. Calculate OVERALL test coverage percentage (0-100):
   - Look for test files (*.test.ts, *.spec.js, test/*.js)
   - Count how many source files have corresponding tests
   - Estimate line coverage based on test comprehensiveness
   - If you see test files, coverage should be > 0%
   - Return a single consistent percentage

2. Identify UNTESTED critical paths:
   - Authentication/authorization code
   - Database queries and transactions
   - API endpoints
   - Error handling
   - Security validations
   - Business logic

3. For each untested area provide:
   - File path
   - Function/class name
   - Risk level (critical/high/medium/low)
   - Why it needs testing

**OUTPUT FORMAT:**
{
  "testCoverage": {
    "overall": 75,  // Single consistent percentage
    "byCategory": {
      "unit": 80,
      "integration": 60,
      "e2e": 40
    },
    "untestedCriticalPaths": [
      {
        "path": "src/auth/login.ts",
        "component": "validatePassword",
        "risk": "critical",
        "reason": "Security-critical code without tests"
      }
    ],
    "testFileCount": 45,
    "sourceFileCount": 120,
    "coverageByFile": {
      "src/api.ts": 85,
      "src/auth.ts": 0,
      "src/db.ts": 90
    }
  }
}

**RULES:**
- NEVER return 0% if test files exist
- Be consistent - use the same percentage everywhere
- If unsure, estimate between 60-80% for projects with tests
- Count actual test files you can see
`;

export const ENHANCED_COMPREHENSIVE_PROMPT = `Analyze this repository comprehensively.

**PART 1: CODE ISSUES**
For each issue found, provide:
1. **Title**: Clear issue description
2. **Category**: security|performance|dependency|code-quality|breaking-change|architecture|documentation
3. **Severity**: critical|high|medium|low
4. **Impact**: How this affects the application (1-2 sentences)
5. **File**: exact/path/file.ts (MUST be a real file path)
6. **Line**: exact line number (MUST be a number)
7. **Code**: The actual problematic code (3-5 lines)
8. **Fix**: How to fix it with example code
9. **Test Coverage**: Is this specific code tested? (yes/no/partial)

**PART 2: TEST COVERAGE ANALYSIS**
Provide detailed test coverage metrics:
- Overall percentage (0-100, MUST be consistent)
- Test files count vs source files count
- List of untested critical paths with risk levels
- Coverage breakdown by category (unit/integration/e2e)

**PART 3: DEPENDENCIES**
List all outdated dependencies:
- Package name
- Current version
- Latest version
- Security vulnerabilities (if any)
- Update urgency (critical/high/medium/low)

**PART 4: ARCHITECTURE FINDINGS**
Identify architectural issues:
- Anti-patterns (God objects, circular dependencies, etc.)
- Missing abstractions
- Tight coupling
- Poor separation of concerns
- Each with specific file locations and recommendations

**PART 5: TEAM METRICS**
Analyze team contribution:
- Total number of contributors
- Main contributors (top 5)
- Knowledge silos (files only 1 person knows)
- Recommended knowledge sharing areas

**PART 6: DOCUMENTATION**
Check documentation completeness:
- README.md quality score (0-100)
- API documentation coverage
- Code comments coverage
- Missing critical documentation

Format each issue as:
**[SEVERITY-CATEGORY-001] Title**
- Impact: [specific business/technical impact]
- Location: path/to/file.ts:123
- Code:
\`\`\`language
actual code from the file
\`\`\`
- Fix:
\`\`\`language
corrected code
\`\`\`
- Test Coverage: no

**IMPORTANT RULES:**
1. Find at least 15-25 real issues
2. Every issue MUST have exact file path and line number
3. Test coverage MUST be consistent (same % everywhere)
4. Include code snippets for ALL issues
5. Architectural findings MUST have clear actionable messages
`;