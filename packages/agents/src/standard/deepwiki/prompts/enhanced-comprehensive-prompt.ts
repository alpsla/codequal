/**
 * Enhanced Comprehensive Prompt for DeepWiki
 * Explicitly requests code snippets, categories, impact, and educational content
 */

export const ENHANCED_COMPREHENSIVE_PROMPT = `
Analyze this repository and provide a COMPREHENSIVE analysis with the following MANDATORY fields for EVERY issue found.

## CRITICAL REQUIREMENTS - MUST FOLLOW EXACTLY

Every single issue MUST include ALL of these fields:
1. **title**: Clear, specific issue title
2. **category**: One of: security, performance, code-quality, dependencies, testing, architecture
3. **severity**: One of: critical, high, medium, low
4. **impact**: Business/technical impact description (2-3 sentences)
5. **file**: EXACT file path from the repository (e.g., "source/index.ts", "test/retry.ts")
6. **line**: EXACT line number where issue occurs
7. **codeSnippet**: ACTUAL code from the repository (5-10 lines showing the issue)
8. **recommendation**: Specific fix with code example
9. **education**: Educational explanation of why this is an issue and best practices

## OUTPUT FORMAT - MANDATORY STRUCTURE

EVERY issue must follow this EXACT format:

{
  "title": "Retry Logic Missing Error Boundaries",
  "category": "code-quality",
  "severity": "high",
  "impact": "Uncaught errors in retry logic can crash the application. This affects system stability and user experience when network requests fail.",
  "file": "source/index.ts",
  "line": 234,
  "codeSnippet": "async retry(fn: Function, times: number) {\\n  for (let i = 0; i < times; i++) {\\n    const result = await fn(); // No try-catch\\n    if (result) return result;\\n  }\\n}",
  "recommendation": "Wrap the function call in try-catch:\\nasync retry(fn: Function, times: number) {\\n  for (let i = 0; i < times; i++) {\\n    try {\\n      const result = await fn();\\n      if (result) return result;\\n    } catch (error) {\\n      if (i === times - 1) throw error;\\n      await delay(1000 * Math.pow(2, i));\\n    }\\n  }\\n}",
  "education": "Retry logic should always include error boundaries to handle failures gracefully. Without try-catch, a single error will break the retry loop and potentially crash the application. Best practice is to implement exponential backoff and only re-throw on the final attempt."
}

## CATEGORIES TO ANALYZE

### 1. SECURITY ISSUES
Find all security vulnerabilities. For EACH issue provide:
- SQL/NoSQL injection vulnerabilities with ACTUAL code showing the vulnerability
- XSS vulnerabilities with the EXACT unsafe HTML/JS code
- Authentication/authorization flaws with the SPECIFIC insecure code
- Hardcoded secrets/credentials with the ACTUAL line containing them
- Insecure dependencies with EXACT package names and versions

### 2. PERFORMANCE ISSUES  
Find all performance problems. For EACH issue provide:
- N+1 query problems with the ACTUAL loop code causing them
- Missing indexes with the SPECIFIC queries that need optimization
- Memory leaks with the EXACT code holding references
- Synchronous blocking operations with the ACTUAL blocking code
- Inefficient algorithms with the SPECIFIC O(n²) implementations

### 3. CODE QUALITY ISSUES
Find all code quality problems. For EACH issue provide:
- Functions over 50 lines with ACTUAL function code
- Cyclomatic complexity > 10 with the SPECIFIC complex function
- Duplicate code blocks with BOTH instances shown
- God objects/classes with the ACTUAL class definition
- Deep nesting with the EXACT nested code

### 4. DEPENDENCY ISSUES
Find all dependency problems. For EACH issue provide:
- Outdated packages with CURRENT and LATEST versions
- Vulnerable dependencies with CVE numbers
- Deprecated packages with migration paths
- Unused dependencies with package names
- Duplicate dependencies with all versions listed

### 5. TESTING GAPS
Find all testing issues. For EACH issue provide:
- Untested critical functions with the SPECIFIC function code
- Missing test cases with the EXACT scenarios not covered
- Low coverage areas with the SPECIFIC files and percentages
- Test quality issues with ACTUAL test code problems

### 6. ARCHITECTURE ISSUES
Find all architectural problems. For EACH issue provide:
- Circular dependencies with the EXACT import statements
- Layer violations with the SPECIFIC violating code
- Anti-patterns with the ACTUAL implementation
- Missing abstractions with the CONCRETE code needing abstraction

## ADDITIONAL REQUIRED INFORMATION

### Test Coverage Metrics
{
  "testCoverage": {
    "overall": 67.5,  // EXACT percentage
    "untested": [
      {
        "file": "source/api/payment.ts",
        "function": "processPayment",
        "lines": "45-89",
        "criticality": "high"
      }
    ]
  }
}

### Educational Insights
For EACH issue, provide:
1. **Why it matters**: Business/technical impact
2. **Best practice**: Industry standard solution
3. **Learning resources**: Relevant documentation/articles
4. **Common mistakes**: What developers often get wrong

### Impact Analysis
For EACH issue, categorize impact as:
- **User Impact**: How end users are affected
- **Developer Impact**: How it affects development speed/quality
- **Business Impact**: Cost, risk, compliance implications
- **Technical Debt**: Long-term maintenance burden

## SEARCH THE ACTUAL REPOSITORY

IMPORTANT: You MUST search through the ACTUAL files in the repository and provide:
- REAL file paths that exist in the repo (not generic examples)
- ACTUAL line numbers from the real files
- GENUINE code snippets copied from the repository
- TRUE issues found in the codebase (not hypothetical)

Search specifically in:
- Source files: src/, source/, lib/, app/
- Test files: test/, tests/, __tests__/, spec/
- Config files: package.json, tsconfig.json, webpack.config.js
- Documentation: README.md, docs/, API.md

## MINIMUM REQUIREMENTS

You MUST find and report:
- At least 20-30 total issues
- At least 3-5 issues per category
- EVERY issue must have ALL required fields
- EVERY code snippet must be from the ACTUAL repository
- EVERY file path must be REAL and exist in the repo
- EVERY line number must be ACCURATE

Return the complete analysis with all issues properly formatted according to the structure above.
`;