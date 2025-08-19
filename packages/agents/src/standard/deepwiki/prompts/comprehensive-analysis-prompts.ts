/**
 * Comprehensive Analysis Prompts for DeepWiki
 * 
 * These prompts ensure we get complete data for all report sections
 */

export const COMPREHENSIVE_ANALYSIS_PROMPT = `
Analyze this repository comprehensively for code quality, security, and architectural issues.

For EACH issue found, provide ALL of the following information:

1. **Issue Identification**
   - Title: Clear, descriptive title
   - Category: security|performance|code-quality|dependency|breaking-change|documentation|architecture
   - Severity: critical|high|medium|low
   - File: exact/path/to/file.ext
   - Line: exact line number
   - Column: column number (if applicable)

2. **Impact Analysis**
   - Impact: Detailed description of how this issue affects the application
   - Business Impact: How this affects end users or business operations
   - Technical Debt: Long-term maintenance implications
   - Risk Level: Immediate risk vs future risk assessment

3. **Code Context**
   - Code Snippet: The problematic code (5-10 lines with context)
   - Root Cause: Why this code is problematic
   - Related Code: Other files/functions affected

4. **Fix Information**
   - Recommendation: High-level fix strategy
   - Suggestion: Step-by-step fix instructions
   - Code Fix Example: Exact code showing the corrected version
   - Estimated Effort: Time/complexity to fix (minutes/hours/days)
   - Breaking Change: Will fixing this break existing functionality?

5. **Testing & Validation**
   - Test Coverage: Is this code covered by tests?
   - Test Suggestions: What tests should be added?
   - Validation Steps: How to verify the fix works

6. **Dependencies** (if applicable)
   - Package Name: The dependency with issues
   - Current Version: Version in use
   - Latest Version: Most recent version available
   - Vulnerabilities: Known CVEs or security issues
   - Update Path: Safe upgrade strategy

7. **Documentation** (if missing/inadequate)
   - Missing Docs: What documentation is missing
   - Suggested Content: What should be documented
   - Priority: How critical is this documentation

Example format:
\`\`\`
1. **SQL Injection Vulnerability**
   Category: security
   Severity: critical
   File: src/api/users.ts
   Line: 45
   Column: 12
   
   Impact: Direct SQL injection allows attackers to read/modify/delete database data
   Business Impact: Complete data breach, regulatory violations (GDPR/CCPA)
   Technical Debt: Requires immediate fix, will compound if left unaddressed
   Risk Level: IMMEDIATE - Exploitable in production
   
   Code Snippet:
   \`\`\`typescript
   // Line 43-48
   async function getUser(req: Request) {
     const userId = req.params.id;
     const query = "SELECT * FROM users WHERE id = " + userId; // VULNERABLE!
     const result = await db.query(query);
     return result;
   }
   \`\`\`
   
   Root Cause: Direct string concatenation of user input into SQL query
   Related Code: Similar patterns found in src/api/posts.ts:67, src/api/comments.ts:89
   
   Recommendation: Use parameterized queries to prevent SQL injection
   Suggestion: 
   1. Replace string concatenation with parameterized query
   2. Add input validation
   3. Use an ORM like Prisma or TypeORM for better security
   
   Code Fix Example:
   \`\`\`typescript
   async function getUser(req: Request) {
     const userId = req.params.id;
     // Validate input
     if (!userId || !/^\d+$/.test(userId)) {
       throw new ValidationError('Invalid user ID');
     }
     // Use parameterized query
     const query = "SELECT * FROM users WHERE id = ?";
     const result = await db.query(query, [userId]);
     return result;
   }
   \`\`\`
   
   Estimated Effort: 30 minutes per endpoint
   Breaking Change: No, maintains same API contract
   
   Test Coverage: 0% - No tests for this endpoint
   Test Suggestions: Add integration tests for SQL injection attempts
   Validation Steps: Run OWASP ZAP scan, test with sqlmap tool
\`\`\`

IMPORTANT: Also analyze and report on:
- Overall test coverage percentage
- Architecture patterns and anti-patterns
- Team collaboration indicators (commit frequency, PR patterns)
- Developer skill areas based on code patterns
- Educational opportunities based on common mistakes
`;

export const DEPENDENCY_ANALYSIS_PROMPT = `
Analyze ALL dependencies in package.json, requirements.txt, go.mod, etc.

For EACH dependency issue, provide:
1. Package name and current version
2. Latest available version
3. Security vulnerabilities (CVE numbers if any)
4. Breaking changes between versions
5. Update recommendation and migration path
6. Risk assessment

Include:
- Total dependencies count
- Outdated dependencies count
- Vulnerable dependencies count
- License compliance issues
`;

export const CODE_QUALITY_METRICS_PROMPT = `
Analyze code quality metrics comprehensively:

1. **Test Coverage**
   - Overall percentage
   - Coverage by module/package
   - Uncovered critical paths
   - Test quality assessment

2. **Code Complexity**
   - Cyclomatic complexity scores
   - Cognitive complexity
   - Duplicate code percentage
   - Dead code detection

3. **Documentation**
   - API documentation coverage
   - Inline comment ratio
   - README completeness
   - Missing critical documentation

4. **Best Practices**
   - Design pattern usage
   - SOLID principles adherence
   - Error handling patterns
   - Logging and monitoring coverage

Provide specific examples and locations for each metric.
`;

export const TEAM_IMPACT_PROMPT = `
Analyze team collaboration patterns:

1. **Commit Patterns**
   - Frequency and size of commits
   - Commit message quality
   - Branch management practices

2. **Code Ownership**
   - Primary contributors by module
   - Knowledge silos or bus factor risks
   - Collaboration patterns

3. **Review Practices**
   - PR review turnaround time
   - Review depth and quality
   - Test coverage in PRs

4. **Team Recommendations**
   - Process improvements
   - Knowledge sharing opportunities
   - Training needs
`;

export const BREAKING_CHANGES_PROMPT = `
Identify ALL breaking changes in this PR/branch:

1. **API Changes**
   - Removed endpoints
   - Changed signatures
   - Modified response formats
   - Authentication changes

2. **Database Changes**
   - Schema modifications
   - Removed columns
   - Type changes
   - Migration requirements

3. **Configuration Changes**
   - New required env variables
   - Changed config formats
   - Removed options

4. **Dependency Changes**
   - Major version updates
   - Removed packages
   - New system requirements

For each breaking change provide:
- Exact location and description
- Migration strategy
- Rollback plan
- Communication template for users
`;

/**
 * Get comprehensive prompt based on analysis type
 */
export function getComprehensivePrompt(
  analysisType: 'full' | 'dependencies' | 'quality' | 'team' | 'breaking-changes' = 'full'
): string {
  switch (analysisType) {
    case 'dependencies':
      return DEPENDENCY_ANALYSIS_PROMPT;
    case 'quality':
      return CODE_QUALITY_METRICS_PROMPT;
    case 'team':
      return TEAM_IMPACT_PROMPT;
    case 'breaking-changes':
      return BREAKING_CHANGES_PROMPT;
    case 'full':
    default:
      return COMPREHENSIVE_ANALYSIS_PROMPT;
  }
}

/**
 * Combine multiple prompts for complete analysis
 */
export function getCombinedAnalysisPrompt(): string {
  return `
${COMPREHENSIVE_ANALYSIS_PROMPT}

Additionally, provide the following analyses:

--- DEPENDENCIES ---
${DEPENDENCY_ANALYSIS_PROMPT}

--- CODE QUALITY ---
${CODE_QUALITY_METRICS_PROMPT}

--- TEAM IMPACT ---
${TEAM_IMPACT_PROMPT}

--- BREAKING CHANGES ---
${BREAKING_CHANGES_PROMPT}

Provide all information in a structured format that can be parsed programmatically.
`;
}