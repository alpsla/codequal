# V9 Framework Fixes - Implementation Guide

**Date:** 2025-10-27
**Session:** 11 - Critical Bug Fixes
**Source:** Porting logic from `test-v9-e2e-complete.ts` to V9 framework

---

## Fix #1: Score Calculation Logic

### Current Problem
Scores calculated incorrectly (48/100, 0/100, 16/100)

### Correct Logic (from user specification)
```typescript
// START at 100, DEDUCT per issue
let categoryScore = 100;

issues.forEach(issue => {
  switch(issue.severity) {
    case 'critical': categoryScore -= 5; break;
    case 'high': categoryScore -= 3; break;
    case 'medium': categoryScore -= 1; break;
    case 'low': categoryScore -= 0.5; break;
  }
});

// Ensure score stays within bounds
categoryScore = Math.max(0, Math.min(100, categoryScore));
```

### Example Calculation
**Micronaut: 2 HIGH + 65 MEDIUM**
```
Score = 100 - (2 × 3) - (65 × 1)
Score = 100 - 6 - 65
Score = 29/100 ✓
```

### Implementation Location
**File:** `packages/agents/src/two-branch/analyzers/v9-integrated-analyzer.ts`
**Method:** `calculateCategoryScore()` (lines 904-922)

### Current Broken Code
```typescript
calculateCategoryScore(issues: any[], category: string): number {
  if (!issues || issues.length === 0) return 50;

  // WRONG: Some incorrect calculation here
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const highCount = issues.filter(i => i.severity === 'high').length;

  // Returns wrong values
  return someWrongCalculation;
}
```

### Fixed Code
```typescript
private calculateCategoryScore(issues: any[], category: string): number {
  // Start at 100/100
  let score = 100;

  if (!issues || issues.length === 0) {
    return 100; // Perfect score if no issues
  }

  // Deduct points per severity
  issues.forEach(issue => {
    switch(issue.severity) {
      case 'critical':
        score -= 5;
        break;
      case 'high':
        score -= 3;
        break;
      case 'medium':
        score -= 1;
        break;
      case 'low':
        score -= 0.5;
        break;
    }
  });

  // Ensure score stays within 0-100 range
  return Math.max(0, Math.min(100, score));
}
```

---

## Fix #2: Blocking Decision Logic

### Current Problem
HIGH severity issues in NEW files NOT flagged as blockers

### Correct Logic (from test-v9-e2e-complete.ts:575-580)
```typescript
const blockingIssues = categorizedIssues.filter(issue =>
  (issue.category === 'NEW' || issue.category === 'EXISTING_MODIFIED') &&
  (issue.severity === 'critical' || issue.severity === 'high')
);

const decision: 'APPROVED' | 'DECLINED' = blockingIssues.length > 0 ? 'DECLINED' : 'APPROVED';
```

### Decision Matrix
| Category | Severity | Blocking? |
|----------|----------|-----------|
| NEW | CRITICAL | ✅ YES |
| NEW | HIGH | ✅ YES |
| NEW | MEDIUM | ❌ NO |
| NEW | LOW | ❌ NO |
| EXISTING_MODIFIED | CRITICAL | ✅ YES |
| EXISTING_MODIFIED | HIGH | ✅ YES |
| EXISTING_MODIFIED | MEDIUM | ❌ NO |
| RESOLVED | ANY | ❌ NO |
| EXISTING_REST | ANY | ❌ NO |

### Implementation Location
**File:** `packages/agents/src/two-branch/analyzers/v9-grouped-report-formatter.ts`
**Method:** `formatReport()` or similar decision logic

### Fixed Code
```typescript
private calculateBlockingDecision(issues: EnrichedIssue[]): {
  decision: 'APPROVED' | 'DECLINED';
  blockingIssues: EnrichedIssue[];
  blockingCount: number;
} {
  // Filter for blocking issues: NEW or EXISTING_MODIFIED with CRITICAL or HIGH severity
  const blockingIssues = issues.filter(issue =>
    (issue.category === 'NEW' || issue.category === 'EXISTING_MODIFIED') &&
    (issue.severity === 'critical' || issue.severity === 'high')
  );

  // Decision: DECLINED if ANY blocking issues, else APPROVED
  const decision = blockingIssues.length > 0 ? 'DECLINED' : 'APPROVED';

  return {
    decision,
    blockingIssues,
    blockingCount: blockingIssues.length
  };
}
```

---

## Fix #3: PR Number Propagation

### Current Problem
Reports show `PR #0` instead of actual PR number

### Root Cause Analysis
The `prNumber` is passed correctly in test (950, 100, 200) but not propagated to final report metadata.

### Check Points
1. ✅ `test-v9-lite-e2e.ts` passes `prNumber: 950`
2. ✅ `V9IntegratedAnalyzer.analyzeRepository()` receives `prNumber` parameter
3. ❓ `compileReport()` - does it include `prNumber` in metadata?
4. ❓ `V9GroupedReportFormatter.formatReport()` - does it use `metadata.prNumber`?

### Investigation Steps
```typescript
// Step 1: Check analyzeRepository
async analyzeRepository(repoUrl: string, prNumber: number, options?) {
  console.log('DEBUG: PR Number =', prNumber); // Should print 950

  // Step 2: Check compileReport
  const report = await this.compileReport({
    repository: repoUrl,
    prNumber,  // ← Is this being passed?
    // ...
  });
}

// Step 3: Check compileReport
async compileReport(data: any) {
  console.log('DEBUG: data.prNumber =', data.prNumber); // Should print 950

  const metadata = {
    prNumber: data.prNumber,  // ← Is this being set?
    // ...
  };
}

// Step 4: Check formatReport
formatReport(report: any) {
  console.log('DEBUG: report.metadata.prNumber =', report.metadata.prNumber); // Should print 950

  return `**Pull Request:** #${report.metadata.prNumber}`;  // ← Should render correctly
}
```

### Fixed Code Pattern
```typescript
// In compileReport
const metadata = {
  repository: data.repository,
  repoUrl: data.repoUrl || data.repository,
  prNumber: data.prNumber,  // ENSURE this is set
  prTitle: data.prTitle || `PR #${data.prNumber}`,
  branch: data.branch || `pr-${data.prNumber}`,
  baseBranch: data.baseBranch || 'main',
  prAuthor: data.prAuthor || 'unknown',
  prAuthorEmail: data.prAuthorEmail || 'unknown@example.com',
  // ...
};
```

---

## Fix #4: AI-Generated Fix Recommendations

### Current Problem
No AI-generated code fixes, just generic descriptions

### Implementation Location
**File:** `packages/agents/src/two-branch/analyzers/v9-integrated-analyzer.ts`
**Method:** `generateEnhancedFixSuggestion()` (lines 698-735)

### Check if Being Called
The method exists but may not be invoked during report generation.

### Investigation
```typescript
// Check in compileReport or formatReport
async compileReport(data: any) {
  // ...

  // For each issue group, generate AI fix
  for (const group of issueGroups) {
    console.log('DEBUG: Generating fix for', group.type);

    const fixSuggestion = await this.generateEnhancedFixSuggestion(
      group.issues,
      group.type,
      data.language
    );

    group.aiGeneratedFix = fixSuggestion;
  }
}
```

### Required Prompt Structure
```typescript
async generateEnhancedFixSuggestion(
  issues: any[],
  issueType: string,
  language: string
): Promise<string> {
  const prompt = `You are a code quality expert. Generate a specific code fix for this issue.

Issue Type: ${issueType}
Language: ${language}
Occurrences: ${issues.length}

Example locations:
${issues.slice(0, 3).map(i => `- ${i.file}:${i.line}`).join('\n')}

Provide:
1. **Specific Code Fix** - Show exact code changes
2. **Why This Matters** - Explain the specific impact in THIS codebase
3. **Implementation Steps** - Numbered steps to apply the fix

Format as markdown with code blocks.`;

  const response = await this.aiClient.generateCompletion(prompt, {
    model: 'fast',  // Use fast model for fix generation
    temperature: 0.3
  });

  return response.content;
}
```

---

## Fix #5: Risk Matrix Calculation

### Current Problem
Risk Matrix shows all 0s

### Required Output
```markdown
### Risk Matrix by Category
| Category | Critical | High | Medium | Low | Total | Risk Score |
|----------|----------|------|--------|-----|-------|------------|
| Security | 0 | 2 | 10 | 0 | 12 | 🔴 HIGH |
| Performance | 0 | 0 | 5 | 2 | 7 | 🟡 MEDIUM |
| Code Quality | 0 | 1 | 50 | 0 | 51 | 🟠 HIGH |
```

### Calculation Logic
```typescript
interface RiskMatrix {
  category: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
  riskScore: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskLevel: string; // Emoji + text
}

private calculateRiskMatrix(issues: any[]): RiskMatrix[] {
  const categories = ['Security', 'Performance', 'Architecture', 'Code Quality', 'Dependencies'];

  return categories.map(category => {
    const categoryIssues = issues.filter(i => i.category === category);

    const critical = categoryIssues.filter(i => i.severity === 'critical').length;
    const high = categoryIssues.filter(i => i.severity === 'high').length;
    const medium = categoryIssues.filter(i => i.severity === 'medium').length;
    const low = categoryIssues.filter(i => i.severity === 'low').length;
    const total = categoryIssues.length;

    // Risk score calculation
    let riskScore: RiskMatrix['riskScore'];
    let riskLevel: string;

    if (critical > 0) {
      riskScore = 'CRITICAL';
      riskLevel = '🔴 CRITICAL';
    } else if (high > 0) {
      riskScore = 'HIGH';
      riskLevel = '🟠 HIGH';
    } else if (medium > 5) {
      riskScore = 'MEDIUM';
      riskLevel = '🟡 MEDIUM';
    } else {
      riskScore = 'LOW';
      riskLevel = '🟢 LOW';
    }

    return {
      category,
      critical,
      high,
      medium,
      low,
      total,
      riskScore,
      riskLevel
    };
  });
}
```

---

## Fix #6: AI Context-Specific Descriptions

### Current Problem
Generic descriptions like "Parameter reassignment makes code harder to understand"

### Required Output
AI should analyze the actual code and provide:
- Why THIS specific issue matters in THIS codebase
- Common causes RELEVANT to this project
- Real impact based on actual code patterns

### Enhanced Prompt
```typescript
async generateContextualDescription(
  issue: any,
  codeSnippet: string,
  projectContext: any
): Promise<{
  whatIsIt: string;
  whyMatters: string;
  commonCauses: string[];
  impactIfNotFixed: string;
}> {
  const prompt = `Analyze this specific code issue in context.

Project: ${projectContext.repository}
Language: ${projectContext.language}
Framework: ${projectContext.framework}

Issue Type: ${issue.type}
Location: ${issue.file}:${issue.line}

Code Context:
\`\`\`${projectContext.language}
${codeSnippet}
\`\`\`

Provide a context-specific analysis:
1. **What is this issue?** (1-2 sentences, specific to this code)
2. **Why does it matter HERE?** (Explain impact on THIS specific codebase)
3. **Common causes in ${projectContext.framework}** (3-4 specific causes)
4. **Impact if not fixed** (Real consequences for this project)

Be specific, not generic. Reference the actual code patterns.`;

  const response = await this.aiClient.generateCompletion(prompt, {
    model: 'smart',  // Use smarter model for analysis
    temperature: 0.5
  });

  return this.parseAIDescription(response.content);
}
```

---

## Implementation Order

### Phase 1: Critical Fixes (Blocking Production)
1. ✅ Fix #2: Blocking Decision Logic
   - File: `v9-grouped-report-formatter.ts`
   - Method: Add `calculateBlockingDecision()`
   - Priority: CRITICAL

2. ✅ Fix #1: Score Calculation
   - File: `v9-integrated-analyzer.ts`
   - Method: Replace `calculateCategoryScore()`
   - Priority: CRITICAL

### Phase 2: High Priority (User Value)
3. ✅ Fix #3: PR Number Propagation
   - Files: `v9-integrated-analyzer.ts`, `v9-grouped-report-formatter.ts`
   - Debug and fix metadata flow
   - Priority: HIGH

4. ✅ Fix #4: AI Fix Recommendations
   - File: `v9-integrated-analyzer.ts`
   - Ensure `generateEnhancedFixSuggestion()` is called
   - Priority: HIGH

### Phase 3: Quality Improvements
5. ✅ Fix #5: Risk Matrix
   - File: `v9-grouped-report-formatter.ts`
   - Add `calculateRiskMatrix()` method
   - Priority: MEDIUM

6. ✅ Fix #6: Contextual Descriptions
   - File: `v9-integrated-analyzer.ts`
   - Enhance AI prompts
   - Priority: MEDIUM

---

## Testing Checklist

After implementing fixes, test with:
- [ ] Spring Boot (spring-petclinic PR #950)
- [ ] Quarkus (quarkus-quickstarts PR #100)
- [ ] Micronaut (micronaut-core PR #200)

**Verify:**
- [ ] Scores start at 100 and deduct correctly
- [ ] HIGH issues flagged as blockers
- [ ] PR numbers show correctly
- [ ] AI-generated fixes appear in reports
- [ ] Risk matrix has non-zero values
- [ ] Descriptions are context-specific

---

## Files to Modify

### Primary Files
1. **`src/two-branch/analyzers/v9-integrated-analyzer.ts`**
   - `calculateCategoryScore()` - Fix score calculation
   - `compileReport()` - Add PR number, ensure AI fix generation
   - `generateEnhancedFixSuggestion()` - Verify being called

2. **`src/two-branch/analyzers/v9-grouped-report-formatter.ts`**
   - Add `calculateBlockingDecision()` method
   - Add `calculateRiskMatrix()` method
   - Verify `prNumber` usage in report template

### Test Files
3. **`test-v9-lite-e2e.ts`**
   - Add debug logging to verify PR numbers
   - Add assertions for scores and blocking decisions

---

**Status:** Ready for implementation. Start with Fix #2 and #1 as they are CRITICAL.
