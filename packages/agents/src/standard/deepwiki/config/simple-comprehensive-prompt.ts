/**
 * Simplified comprehensive prompt that works with DeepWiki
 */

export const SIMPLE_COMPREHENSIVE_PROMPT = `Analyze this repository comprehensively.

For each issue found, provide:
1. **Title**: Clear issue description
2. **Category**: security|performance|dependency|code-quality|breaking-change
3. **Severity**: critical|high|medium|low
4. **Impact**: How this affects the application (1-2 sentences)
5. **File**: exact/path/file.ts
6. **Line**: line number
7. **Code**: The problematic code (3-5 lines)
8. **Fix**: How to fix it with example code
9. **Test Coverage**: Is this code tested? (yes/no/partial)

Also analyze:
- Dependencies: List outdated packages with current vs latest versions
- Test Coverage: Estimate overall % and list untested critical paths
- Architecture: Note any anti-patterns or improvement opportunities
- Team Impact: Count contributors and note any knowledge silos
- Breaking Changes: List any API/schema changes

Format each issue as:
**[SEVERITY-CATEGORY-001] Title**
- Impact: [business/technical impact]
- Location: path/to/file.ts:123
- Code:
\`\`\`
problematic code here
\`\`\`
- Fix:
\`\`\`
corrected code here
\`\`\`
- Test Coverage: no

Find at least 10-15 real issues with exact locations.`;

export const SIMPLE_JSON_PROMPT = `Analyze this repository. Return a simple JSON with issues.

Example format:
{
  "issues": [
    {
      "title": "SQL Injection Risk",
      "severity": "critical",
      "category": "security",
      "impact": "Allows database manipulation",
      "file": "src/api.ts",
      "line": 45,
      "code": "db.query('SELECT * FROM users WHERE id = ' + userId)",
      "fix": "db.query('SELECT * FROM users WHERE id = ?', [userId])"
    }
  ],
  "testCoverage": 65,
  "dependencies": {
    "outdated": [
      {"name": "express", "current": "4.0.0", "latest": "4.18.0"}
    ]
  }
}

Find 10+ issues with exact file paths and line numbers.`;