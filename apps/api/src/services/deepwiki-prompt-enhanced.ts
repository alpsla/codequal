/**
 * Enhanced DeepWiki Prompt Builder
 * 
 * Builds prompts that explicitly request exact file locations from DeepWiki
 */

export function buildEnhancedAnalysisPrompt(
  repositoryUrl: string,
  options?: { branch?: string; commit?: string }
): string {
  const isPRBranch = options?.branch?.includes('pr/');
  const maxIssues = isPRBranch ? 10 : 15;
  
  return `Analyze this repository for security vulnerabilities and code quality issues.

CRITICAL REQUIREMENTS:
1. For EVERY issue found, you MUST provide the EXACT file path and line number from the actual codebase
2. DO NOT use placeholder locations like "unknown", "src/example.ts", or random file names
3. SEARCH the repository to find the actual location of each issue before reporting it
4. Only report issues where you can identify the EXACT location in the codebase

Find the TOP ${maxIssues} most critical issues in these categories:
- Security vulnerabilities (SQL injection, XSS, authentication flaws, etc.)
- Performance bottlenecks (N+1 queries, memory leaks, inefficient algorithms)
- Critical code quality issues (circular dependencies, dead code, etc.)
- Dependency vulnerabilities (outdated or vulnerable packages)

${isPRBranch ? 'For PR branches, identify which issues are new vs existing.' : ''}

Return ONLY valid JSON in this EXACT format:
{
  "vulnerabilities": [
    {
      "id": "SEC-001",
      "severity": "critical|high|medium|low",
      "category": "security|performance|quality|dependencies",
      "title": "Clear description of the issue",
      "location": {
        "file": "exact/path/to/file.ts",
        "line": <exact line number as integer>,
        "column": <optional column number>
      },
      "evidence": {
        "snippet": "The actual code from that location"
      },
      "impact": "Description of the security/performance impact",
      "remediation": {
        "immediate": "Quick fix description",
        "steps": ["Step 1", "Step 2"]
      }
    }
  ],
  "scores": {
    "overall": <0-100>,
    "security": <0-100>,
    "performance": <0-100>,
    "maintainability": <0-100>,
    "testing": <0-100>
  },
  "statistics": {
    "files_analyzed": <number>,
    "total_issues": <number>,
    "issues_by_severity": {
      "critical": <number>,
      "high": <number>,
      "medium": <number>,
      "low": <number>
    }
  },
  "summary": "Brief overall assessment"
}

IMPORTANT VALIDATION RULES:
- Each issue MUST have a real file path that exists in the repository
- Each line number MUST be a valid integer pointing to actual code
- The code snippet MUST be from the actual file at that line
- If you cannot find the exact location, DO NOT include that issue

Remember: Users will click on these locations in their IDE, so they MUST be accurate!`;
}

/**
 * Build a follow-up prompt to get exact locations for issues
 */
export function buildLocationQueryPrompt(
  issue: {
    title: string;
    description?: string;
    category?: string;
  }
): string {
  return `For the following issue in the repository, provide the EXACT file location:

Issue: ${issue.title}
${issue.description ? `Description: ${issue.description}` : ''}
${issue.category ? `Category: ${issue.category}` : ''}

Requirements:
1. Search the repository to find where this issue occurs
2. Provide the EXACT file path (not a guess or example)
3. Provide the EXACT line number where the issue starts
4. Include the actual code snippet from that location

Return ONLY valid JSON:
{
  "found": true|false,
  "location": {
    "file": "exact/path/to/file.ts",
    "line": <exact line number>,
    "column": <optional column>
  },
  "snippet": "The actual code at that location",
  "confidence": <0-100 percentage of confidence in this location>
}

If you cannot find the exact location with high confidence, return:
{
  "found": false,
  "reason": "Could not locate this specific issue in the codebase"
}`;
}

/**
 * Build a validation prompt to verify locations
 */
export function buildLocationValidationPrompt(
  file: string,
  line: number,
  issueDescription: string
): string {
  return `Verify if the following location contains the described issue:

File: ${file}
Line: ${line}
Issue: ${issueDescription}

Check the code at this location and confirm:
1. Does this file exist in the repository?
2. Is there code at line ${line}?
3. Does the code at this location match the issue description?

Return JSON:
{
  "valid": true|false,
  "exists": true|false,
  "matches_issue": true|false,
  "actual_code": "The code found at this location",
  "explanation": "Why this does or doesn't match the issue"
}`;
}