/**
 * Enhanced Iteration 1 Comprehensive Prompt
 * This front-loaded prompt aims to get 80-90% of required data in the first iteration
 */

export const ITERATION_1_COMPREHENSIVE_PROMPT = `
Analyze this repository comprehensively. Provide ALL information requested below with exact details.

## CRITICAL REQUIREMENTS
- Every issue MUST have: title, severity, category, impact, exact file path, line number, code snippet, fix example
- All percentages must be specific numbers (not "low" or "high")
- All counts must be exact numbers
- Include code snippets for EVERY issue

## 1. SECURITY ANALYSIS
Find ALL security vulnerabilities. For each provide:

**Example Format:**
{
  "title": "SQL Injection Vulnerability",
  "severity": "critical",
  "category": "security",
  "impact": "Allows attackers to manipulate database queries, potentially exposing sensitive data or corrupting the database",
  "file": "src/api/users.ts",
  "line": 45,
  "codeSnippet": "const query = 'SELECT * FROM users WHERE id = ' + req.params.id;",
  "fix": "const query = 'SELECT * FROM users WHERE id = ?'; // Use parameterized queries",
  "cwe": "CWE-89",
  "owasp": "A03:2021"
}

Check for:
- SQL/NoSQL injection (CWE-89)
- XSS vulnerabilities (CWE-79)
- Authentication bypass (CWE-287)
- Insecure deserialization (CWE-502)
- Missing authorization (CWE-862)
- Hardcoded credentials (CWE-798)
- Path traversal (CWE-22)
- SSRF vulnerabilities (CWE-918)

## 2. PERFORMANCE ANALYSIS
Find ALL performance issues. For each provide:

**Example Format:**
{
  "title": "N+1 Query Problem",
  "severity": "high",
  "category": "performance",
  "impact": "Each user fetch triggers additional queries, causing 100x slower page loads with 100 users",
  "file": "src/services/userService.ts",
  "line": 78,
  "codeSnippet": "users.forEach(user => { const profile = await db.query('SELECT * FROM profiles WHERE user_id = ?', user.id); })",
  "fix": "const profiles = await db.query('SELECT * FROM profiles WHERE user_id IN (?)', users.map(u => u.id));",
  "metrics": {
    "currentLatency": "2000ms",
    "expectedLatency": "20ms",
    "improvement": "100x"
  }
}

Check for:
- N+1 queries
- Missing database indexes
- Synchronous operations in async context
- Memory leaks
- Inefficient algorithms (O(n²) or worse)
- Missing caching opportunities
- Bundle size issues
- Blocking I/O operations

## 3. CODE QUALITY ANALYSIS
Find ALL code quality issues. For each provide:

**Example Format:**
{
  "title": "God Object Anti-Pattern",
  "severity": "medium",
  "category": "code-quality",
  "impact": "UserService class has 47 methods and 2000+ lines, making it hard to maintain and test",
  "file": "src/services/UserService.ts",
  "line": 1,
  "codeSnippet": "export class UserService { // 47 public methods, 2000+ lines",
  "fix": "Split into UserAuthService, UserProfileService, UserSettingsService",
  "metrics": {
    "currentComplexity": 47,
    "recommendedComplexity": 10,
    "linesOfCode": 2000
  }
}

Check for:
- Cyclomatic complexity > 10
- Functions > 50 lines
- Classes > 200 lines
- Duplicate code blocks
- Dead code
- God objects
- Long parameter lists (> 4 params)
- Deep nesting (> 3 levels)

## 4. TEST COVERAGE ANALYSIS
Provide EXACT test coverage metrics:

**Required Format:**
{
  "testCoverage": {
    "overall": 67.5,  // MUST be a specific number
    "byCategory": {
      "unit": 75.2,
      "integration": 55.8,
      "e2e": 35.0
    },
    "byFile": {
      "src/api/users.ts": 85.5,
      "src/services/auth.ts": 45.0,
      "src/utils/helpers.ts": 95.0
    },
    "untestedCriticalPaths": [
      {
        "file": "src/api/payment.ts",
        "function": "processPayment",
        "lines": "45-78",
        "risk": "critical",
        "reason": "Payment processing without tests risks financial losses"
      }
    ],
    "testFileCount": 45,
    "sourceFileCount": 120,
    "testToSourceRatio": 0.375
  }
}

Calculate by:
- Count test files (*.test.ts, *.spec.js)
- Count source files
- Identify untested exports
- Estimate line coverage based on test comprehensiveness

## 5. DEPENDENCY ANALYSIS
List ALL dependency issues:

**Required Format:**
{
  "dependencies": {
    "total": 45,
    "outdated": [
      {
        "name": "express",
        "current": "4.17.1",
        "latest": "4.19.0",
        "type": "production",
        "severity": "high",
        "vulnerabilities": ["CVE-2022-24999"],
        "breaking": false
      }
    ],
    "vulnerable": [
      {
        "name": "lodash",
        "version": "4.17.11",
        "vulnerability": "Prototype Pollution",
        "cve": "CVE-2021-23337",
        "severity": "high",
        "fixVersion": "4.17.21"
      }
    ],
    "deprecated": ["request", "node-sass"],
    "unused": ["moment", "underscore"],
    "duplicates": [
      {
        "name": "tslib",
        "versions": ["2.0.0", "2.3.0", "2.4.0"]
      }
    ]
  }
}

## 6. ARCHITECTURE ANALYSIS
Identify ALL architectural issues:

**Required Format:**
{
  "architecture": {
    "score": 72,
    "antiPatterns": [
      {
        "pattern": "Circular Dependency",
        "severity": "high",
        "files": ["src/services/UserService.ts", "src/models/User.ts"],
        "impact": "Prevents modular testing and increases coupling",
        "fix": "Introduce UserInterface to break the cycle"
      }
    ],
    "layerViolations": [
      {
        "violation": "Controller accessing database directly",
        "file": "src/controllers/UserController.ts",
        "line": 56,
        "shouldUse": "UserService"
      }
    ],
    "recommendations": [
      "Implement Repository pattern for data access",
      "Add Service layer between Controllers and Models",
      "Use Dependency Injection for better testability"
    ]
  }
}

## 7. BREAKING CHANGES
Identify ALL breaking changes in this PR:

**Required Format:**
{
  "breakingChanges": [
    {
      "type": "API",
      "severity": "high",
      "description": "Changed POST /api/users response format",
      "before": "{ user: { id, name } }",
      "after": "{ data: { userId, userName } }",
      "migration": "Update all clients to use new field names",
      "affectedConsumers": ["mobile-app", "admin-dashboard"]
    }
  ]
}

## 8. TEAM METRICS
Provide EXACT team metrics:

**Required Format:**
{
  "teamMetrics": {
    "contributors": 12,  // EXACT number
    "mainContributors": [
      {"name": "john", "commits": 450, "percentage": 35},
      {"name": "sarah", "commits": 380, "percentage": 29}
    ],
    "knowledgeSilos": [
      {
        "area": "Payment Processing",
        "file": "src/services/payment/",
        "soleExpert": "john",
        "risk": "high",
        "recommendation": "Pair programming sessions needed"
      }
    ],
    "averageReviewTime": "4.5 hours",
    "averagePRSize": "245 lines"
  }
}

## 9. DOCUMENTATION QUALITY
Assess documentation completeness:

**Required Format:**
{
  "documentation": {
    "score": 65,
    "readmeCompleteness": 75,
    "apiDocsCoverage": 45,
    "codeComments": 55,
    "missing": [
      "API endpoint documentation",
      "Setup instructions for Windows",
      "Architecture diagrams",
      "Contributing guidelines"
    ],
    "quality": {
      "clarity": 70,
      "accuracy": 80,
      "upToDate": 60
    }
  }
}

## OUTPUT REQUIREMENTS
1. Find at least 20-30 issues total
2. Every issue must have ALL fields filled
3. Use exact numbers, not ranges
4. Include actual code snippets from files
5. Provide specific line numbers
6. Give actionable fix examples with code

Return results in a structured format that includes ALL categories above.`;

export const ITERATION_1_JSON_FORMAT = {
  issues: [],
  testCoverage: {
    overall: 0,
    byCategory: {},
    byFile: {},
    untestedCriticalPaths: [],
    testFileCount: 0,
    sourceFileCount: 0
  },
  dependencies: {
    total: 0,
    outdated: [],
    vulnerable: [],
    deprecated: [],
    unused: [],
    duplicates: []
  },
  architecture: {
    score: 0,
    antiPatterns: [],
    layerViolations: [],
    recommendations: []
  },
  breakingChanges: [],
  teamMetrics: {
    contributors: 0,
    mainContributors: [],
    knowledgeSilos: [],
    averageReviewTime: "",
    averagePRSize: ""
  },
  documentation: {
    score: 0,
    readmeCompleteness: 0,
    apiDocsCoverage: 0,
    codeComments: 0,
    missing: [],
    quality: {}
  }
};