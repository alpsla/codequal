/**
 * DeepWiki Prompt Templates
 * Structured prompts to get better responses from DeepWiki
 */

export const STRUCTURED_ANALYSIS_PROMPT = `
Analyze this repository and return a JSON object with the following structure:
{
  "issues": [
    {
      "id": "unique-id",
      "severity": "critical|high|medium|low",
      "category": "security|performance|code-quality|best-practice|maintainability",
      "title": "Short descriptive title",
      "description": "Detailed description of the issue",
      "location": {
        "file": "exact/path/to/file.ts",
        "line": 123,
        "column": 45,
        "endLine": 125,
        "endColumn": 10
      },
      "codeSnippet": "The problematic code snippet",
      "recommendation": "Specific recommendation on how to fix this issue",
      "confidence": 0.95
    }
  ],
  "scores": {
    "overall": 85,
    "security": 90,
    "performance": 80,
    "maintainability": 85,
    "reliability": 88
  },
  "summary": {
    "totalIssues": 15,
    "criticalCount": 2,
    "highCount": 5,
    "mediumCount": 6,
    "lowCount": 2
  }
}

Focus on finding actual code issues with specific file locations and line numbers.
Analyze all code files including TypeScript, JavaScript, Python, Java, Go, etc.
Include security vulnerabilities, performance issues, code smells, and best practice violations.
`;

export const LOCATION_ENHANCEMENT_PROMPT = `
For the following code issues, provide specific file paths and line numbers where they occur:

{{issues}}

Return a JSON array with enhanced location information:
[
  {
    "issueId": "original-issue-id",
    "location": {
      "file": "exact/path/to/file.ts",
      "line": 123,
      "column": 45,
      "functionName": "functionWhereIssueOccurs",
      "className": "ClassNameIfApplicable"
    },
    "context": "3 lines of code around the issue"
  }
]
`;

export const PR_ANALYSIS_PROMPT = `
Analyze the changes in pull request #{{prNumber}} for the {{branch}} branch.

Focus on:
1. New issues introduced by the changes
2. Issues resolved by the changes
3. Potential breaking changes
4. Performance implications
5. Security considerations

Return a structured JSON response with:
{
  "newIssues": [...],
  "resolvedIssues": [...],
  "breakingChanges": [...],
  "performanceImpact": "positive|neutral|negative",
  "securityAssessment": {...}
}
`;

export const SECURITY_SCAN_PROMPT = `
Perform a comprehensive security scan of this repository.

Look for:
- SQL injection vulnerabilities
- XSS vulnerabilities
- Authentication/authorization issues
- Sensitive data exposure
- Dependency vulnerabilities
- Insecure configurations
- Cryptographic weaknesses

For each vulnerability found, provide:
- CVE ID if applicable
- OWASP category
- Severity score (CVSS)
- Specific file location and line number
- Proof of concept if possible
- Remediation steps

Return results in JSON format.
`;

export const PERFORMANCE_ANALYSIS_PROMPT = `
Analyze the repository for performance issues and optimization opportunities.

Focus on:
- Database query optimization
- Memory leaks
- Inefficient algorithms (O(n²) or worse)
- Unnecessary re-renders (React/Vue)
- Bundle size optimization opportunities
- Caching opportunities
- Async/await optimizations

For each issue, provide specific file locations and suggested optimizations.
Return results in JSON format with performance impact estimates.
`;

export const CODE_QUALITY_PROMPT = `
Evaluate the code quality of this repository.

Check for:
- Code duplication
- Long methods/functions (>50 lines)
- Complex methods (cyclomatic complexity >10)
- Large classes (>500 lines)
- Poor naming conventions
- Missing error handling
- Lack of input validation
- Missing or poor documentation

Provide specific locations and refactoring suggestions.
Return results in JSON format with maintainability scores.
`;

export const BEST_PRACTICES_PROMPT = `
Review the repository for adherence to best practices.

Evaluate:
- Design patterns usage
- SOLID principles compliance
- DRY (Don't Repeat Yourself) violations
- Testing coverage and quality
- Documentation completeness
- Error handling patterns
- Logging practices
- Configuration management

Provide specific examples and improvement suggestions.
Return results in JSON format.
`;

/**
 * Get a combined prompt for comprehensive analysis
 */
export function getCombinedAnalysisPrompt(options: {
  includeSecurity?: boolean;
  includePerformance?: boolean;
  includeQuality?: boolean;
  includeBestPractices?: boolean;
  branch?: string;
  prNumber?: number;
}): string {
  const prompts: string[] = [STRUCTURED_ANALYSIS_PROMPT];
  
  if (options.includeSecurity) {
    prompts.push('Additionally, ' + SECURITY_SCAN_PROMPT);
  }
  
  if (options.includePerformance) {
    prompts.push('Also, ' + PERFORMANCE_ANALYSIS_PROMPT);
  }
  
  if (options.includeQuality) {
    prompts.push('Furthermore, ' + CODE_QUALITY_PROMPT);
  }
  
  if (options.includeBestPractices) {
    prompts.push('Finally, ' + BEST_PRACTICES_PROMPT);
  }
  
  if (options.prNumber) {
    prompts.push(PR_ANALYSIS_PROMPT
      .replace('{{prNumber}}', options.prNumber.toString())
      .replace('{{branch}}', options.branch || 'main')
    );
  }
  
  return prompts.join('\n\n');
}

/**
 * Get a prompt for specific issue type
 */
export function getIssueTypePrompt(issueType: 'security' | 'performance' | 'quality' | 'best-practices'): string {
  switch (issueType) {
    case 'security':
      return SECURITY_SCAN_PROMPT;
    case 'performance':
      return PERFORMANCE_ANALYSIS_PROMPT;
    case 'quality':
      return CODE_QUALITY_PROMPT;
    case 'best-practices':
      return BEST_PRACTICES_PROMPT;
    default:
      return STRUCTURED_ANALYSIS_PROMPT;
  }
}