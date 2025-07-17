# How CodeQual Splits Repository vs PR Analysis

## Overview

CodeQual intelligently separates repository-wide analysis from PR-specific changes through multiple mechanisms:

1. **PR Context Extraction** - Identifies what changed
2. **DeepWiki Dual Analysis** - Analyzes both repository and changes
3. **Agent Role Distribution** - Different focus for different aspects
4. **Tool Targeting** - Tools know what to analyze

## 1. PR Context Extraction

### Getting Changed Files
```typescript
// Step 1: Fetch PR details from GitHub/GitLab
const prDetails = await prContextService.fetchPRDetails(repositoryUrl, prNumber);

// Step 2: Get the diff/patch data
const diff = await prContextService.getPRDiff(prDetails);

// Step 3: Extract list of changed files
const changedFiles = prContextService.extractChangedFiles(diff);
// Returns: ['src/components/Button.js', 'src/utils/api.js', ...]
```

### Diff Data Structure
```typescript
interface DiffData {
  files: FileDiff[];
  totalAdditions: number;
  totalDeletions: number;
  totalChanges: number;
}

interface FileDiff {
  filename: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;  // The actual diff/patch content
}
```

## 2. DeepWiki Branch-Aware Analysis

### Repository + PR Analysis
```typescript
// DeepWiki analyzes PR branch WITH context
const jobId = await deepWikiManager.triggerRepositoryAnalysis(repositoryUrl, {
  branch: prBranch,        // Analyzes PR branch
  baseBranch: baseBranch,  // Compares against main
  includeDiff: true,       // Generates diff-specific insights
  prNumber: prNumber
});
```

### What DeepWiki Provides

#### A. Repository-Wide Analysis (PR Branch State)
```typescript
{
  "architecture": {
    "patterns": ["MVC", "Microservices"],
    "complexity": "high",
    "technicalDebt": ["Legacy API", "Monolithic database"],
    "recommendations": ["Refactor auth module", "Split database"]
  },
  "security": {
    "vulnerabilities": [
      { "type": "SQL Injection", "severity": "high", "file": "api/users.js" }
    ],
    "score": 7.5,
    "recommendations": ["Update dependencies", "Add input validation"]
  }
  // ... other categories
}
```

#### B. PR-Specific Insights (When includeDiff=true)
```typescript
{
  "diffAnalysis": {
    "impactedAreas": ["Authentication", "User Management"],
    "riskAssessment": {
      "level": "medium",
      "factors": ["Modifies auth flow", "Changes user model"]
    },
    "qualityDelta": {
      "before": 7.2,
      "after": 7.8,
      "improved": ["Test coverage", "Code complexity"]
    }
  }
}
```

## 3. How Agents Use This Information

### Repository Context (from DeepWiki)
```typescript
// Agents receive repository-wide context
const agentContext = {
  repositoryAnalysis: deepWikiData.analysis,  // Full repo state
  existingIssues: {
    security: [...],      // All security issues in repo
    architecture: [...],  // All architecture issues
    performance: [...]    // All performance issues
  }
};
```

### PR Context (from PR Service)
```typescript
// Agents also receive PR-specific context
const prContext = {
  changedFiles: ['src/auth.js', 'src/user.js'],
  files: [
    {
      path: 'src/auth.js',
      content: '...', // From DeepWiki PR branch cache
      diff: '@@ -10,5 +10,8 @@...'  // What changed
    }
  ],
  totalChanges: 150,
  prInsights: "Focus on authentication changes"
};
```

## 4. MCP Tools Analysis Split

### Tools Analyze BOTH Repository and PR

#### Example: ESLint
```typescript
// ESLint runs on PR files but reports ALL issues
const eslintResults = {
  "src/auth.js": [
    {
      line: 42,
      message: "Missing semicolon",
      isNewInPR: false  // Existing issue
    },
    {
      line: 156,
      message: "Unused variable 'token'",
      isNewInPR: true   // Introduced by PR
    }
  ]
};
```

#### Example: Security Scanner
```typescript
// Semgrep scans PR files for ALL vulnerabilities
const securityResults = {
  findings: [
    {
      file: "src/auth.js",
      line: 89,
      issue: "Hardcoded secret",
      existedBefore: true,    // Was already in repo
      inChangedLines: false   // Not in PR diff
    },
    {
      file: "src/auth.js", 
      line: 156,
      issue: "SQL injection",
      existedBefore: false,   // New in this PR
      inChangedLines: true    // In the PR changes
    }
  ]
};
```

## 5. Agent Decision Making

### Security Agent Example
```typescript
class SecurityAgent {
  analyze(context) {
    // 1. Repository-wide security posture
    const repoSecurityScore = context.deepWiki.security.score;
    const existingVulnerabilities = context.deepWiki.security.vulnerabilities;
    
    // 2. PR-specific security impact
    const prFiles = context.pr.changedFiles;
    const newVulnerabilities = context.tools.security.findings
      .filter(f => f.inChangedLines);
    
    // 3. Combined analysis
    return {
      summary: "Repository has 15 existing vulnerabilities, PR introduces 2 new ones",
      
      repositoryFindings: {
        total: existingVulnerabilities.length,
        critical: existingVulnerabilities.filter(v => v.severity === 'critical'),
        recommendation: "Address critical vulnerabilities in auth module"
      },
      
      prFindings: {
        introduced: newVulnerabilities,
        fixed: this.identifyFixedIssues(existingVulnerabilities, prFiles),
        recommendation: "Fix SQL injection before merging"
      },
      
      overallImpact: "PR slightly improves security by fixing 3 issues but introduces 2 new ones"
    };
  }
}
```

## 6. Practical Example

### PR Changes 2 Files
```
modified: src/auth/login.js (150 lines changed)
modified: src/utils/validator.js (20 lines changed)
```

### What Happens:

1. **DeepWiki** clones entire PR branch
   - Analyzes ALL files for repository health
   - Identifies that auth system has complexity issues
   - Notes that PR modifies critical auth flow

2. **MCP Tools** run on changed files
   - ESLint finds 50 total issues in login.js (45 existing, 5 new)
   - Semgrep finds security issue in new code
   - Madge detects no new circular dependencies

3. **Agents** combine insights:
   - **Security**: "PR adds input validation (good) but introduces timing attack (bad)"
   - **Architecture**: "Changes align with modular design patterns"
   - **Code Quality**: "Reduces complexity score from 15 to 12"

4. **Final Report** shows:
   ```
   Repository Overview:
   - Overall Health: 7.2/10
   - Technical Debt: High in auth module
   - Security Score: 6.8/10
   
   PR Impact:
   - Files Changed: 2
   - Security: +1 vulnerability, +3 fixes
   - Quality: Improved (complexity reduced)
   - Risk: Medium (touches authentication)
   
   Recommendations:
   - Fix timing attack before merge
   - Consider refactoring entire auth module
   - Add tests for new validation logic
   ```

## Summary

The system identifies changed files through PR APIs but analyzes them in the context of the entire repository. This dual approach ensures:

1. **Complete Context**: Agents understand the full repository state
2. **Focused Analysis**: Tools know which files changed
3. **Impact Assessment**: Can determine if PR improves or degrades quality
4. **Intelligent Recommendations**: Based on both repo state and PR changes

This separation allows CodeQual to provide both strategic (repository-wide) and tactical (PR-specific) insights.