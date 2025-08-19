/**
 * Robust comprehensive prompt that works reliably with DeepWiki
 */

export const ROBUST_COMPREHENSIVE_PROMPT = `Analyze this repository for code quality issues.

Find issues in these categories:
- Security vulnerabilities
- Performance problems
- Code quality issues
- Outdated dependencies
- Breaking changes
- Architecture problems

Return your analysis in this exact JSON format:
{
  "issues": [
    {
      "title": "Issue title",
      "severity": "critical|high|medium|low",
      "category": "security|performance|code-quality|dependencies|breaking-change|architecture",
      "file": "path/to/file.ts",
      "line": 123,
      "impact": "Description of impact",
      "codeSnippet": "The problematic code",
      "fix": "Suggested fix with example code",
      "recommendation": "What to do about it"
    }
  ],
  "testCoverage": {
    "overall": 75,
    "testFileCount": 25,
    "sourceFileCount": 50,
    "byCategory": {
      "unit": 80,
      "integration": 60,
      "e2e": 40
    }
  },
  "dependencies": {
    "total": 45,
    "outdated": [
      {"name": "package-name", "current": "1.0.0", "latest": "2.0.0", "type": "major"}
    ],
    "vulnerable": []
  },
  "teamMetrics": {
    "contributors": 15,
    "mainContributors": ["user1", "user2"]
  },
  "documentation": {
    "score": 70,
    "missing": ["API docs", "Contributing guide"]
  },
  "architecture": {
    "score": 65,
    "antiPatterns": ["God objects", "Circular dependencies"],
    "recommendations": ["Split large files", "Extract interfaces"]
  }
}

Find at least 15 real issues with exact file paths and line numbers.`;

export const FALLBACK_SIMPLE_PROMPT = `List code issues in this repository. Return JSON format:
{
  "issues": [
    {"title": "Issue name", "severity": "high", "file": "path/to/file", "line": 123}
  ],
  "testCoverage": {"overall": 0},
  "dependencies": {"outdated": []}
}`;