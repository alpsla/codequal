# Report Generation Guide

Last Updated: 2025-08-04

## Overview

This guide documents the final report generation system implemented in CodeQual. The system generates comprehensive PR analysis reports with dynamic content, skill tracking, and architectural insights.

## Key Components

### 1. Report Generator (ReportGeneratorV7Complete)

Location: `/packages/agents/src/standard/comparison/report-generator-v7-complete.ts`

**Features:**
- 12 comprehensive sections
- Dynamic architecture diagrams
- Complete code snippets for all issues
- Dynamic username extraction
- Enhanced dependencies analysis

### 2. Comparison Agent

Location: `/packages/agents/src/standard/comparison/comparison-agent-standalone.ts`

**Key Features:**
- Issue fingerprinting for accurate tracking
- Enriched issue data with all required fields
- Integration with ReportGeneratorV7Complete

## Scoring System

### Issue Scoring Values
```typescript
const SCORING_VALUES = {
  critical: 5,
  high: 3,
  medium: 1,
  low: 0.5
};

// IMPORTANT: Unfixed issues have SAME penalties as new issues
const UNFIXED_PENALTIES = {
  critical: 5,  // Same as new issues
  high: 3,      // Same as new issues
  medium: 1,    // Same as new issues
  low: 0.5      // Same as new issues
};
```

### Skill Score Calculation

Developer skills are tracked across 5 categories:
- Security
- Performance
- Code Quality
- Architecture
- Dependencies

**Score Adjustments:**
- **Positive:** Fixed issues (+5/+3/+1/+0.5 based on severity)
- **Negative:** New issues (-5/-3/-1/-0.5) AND unfixed issues (same penalties)

## Report Sections

### Complete 12-Section Structure

1. **Security Analysis** - Detailed security score breakdown
2. **Performance Analysis** - P95, RPS, error rates
3. **Code Quality Analysis** - Maintainability, coverage, duplication
4. **Architecture Analysis** - Dynamic diagrams based on repo type
5. **Dependencies Analysis** - Container size analysis with Dockerfile examples
6. **PR Issues** - New issues with code snippets and fixes
7. **Repository Issues** - Pre-existing issues with ages and fixes
8. **Educational Insights** - Learning paths and anti-patterns
9. **Individual & Team Skills Tracking** - Detailed calculations
10. **Business Impact Analysis** - Risk assessment and costs
11. **Action Items & Recommendations** - Prioritized fixes
12. **PR Comment Conclusion** - Final decision summary

## Dynamic Features

### 1. Architecture Diagram Generation

The system dynamically generates architecture diagrams based on:
- Repository name (react, vue, angular → Frontend)
- Repository type (api, backend, server → Backend)
- Issue content (microservice mentions → Microservices)
- Default → Generic architecture

### 2. Username Extraction

```typescript
private extractUsernameFromRepo(repoUrl?: string): string {
  // Extracts from GitHub, GitLab, Bitbucket, Azure DevOps URLs
  const githubMatch = repoUrl.match(/github\.com\/([^\/]+)\//);
  if (githubMatch) return githubMatch[1];
  // ... other patterns
}
```

### 3. Enhanced Dependencies Section

Includes:
- Container size analysis
- Dockerfile optimization examples
- Security vulnerability counts
- License compliance checks

## Required Issue Fields

All issues must include:
```typescript
interface Issue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'security' | 'performance' | 'code-quality' | 'architecture' | 'dependencies';
  title?: string;
  description?: string;
  location?: { file: string; line: number };
  message?: string;
  codeSnippet?: string;
  suggestedFix?: string;
  age?: string;  // For repository issues
  fingerprint?: string;  // For tracking
  rule?: string;
}
```

## API Integration

The report generator is integrated into the comparison agent workflow:

1. **Comparison Agent** performs analysis
2. **Issue Enrichment** adds required fields
3. **ReportGeneratorV7Complete** generates the report
4. **API Service** returns the complete analysis

## Usage Example

```typescript
// In comparison agent
const reportGenerator = new ReportGeneratorV7Complete();
const report = await reportGenerator.generateReport({
  comparison: comparisonResult,
  repository: repoUrl,
  prNumber: pr.number,
  author: pr.author,
  confidence: 92,
  decision: 'DECLINED',
  decisionReason: 'Critical issues found'
});
```

## Key Decisions Made

1. **Equal Penalties**: Unfixed issues have the same penalty as new issues
2. **All Issues Need Code**: Every issue must have code snippets and fixes
3. **Dynamic Content**: No hardcoded diagrams or usernames
4. **Complete Sections**: All 12 sections are required
5. **Skill Tracking**: Detailed calculation breakdowns

## Migration Notes

When starting a new session:
1. Use `comparison-agent-standalone.ts` with `ReportGeneratorV7Complete`
2. Ensure all issues have required fields (especially codeSnippet, suggestedFix)
3. Repository issues must include age information
4. Use fingerprinting for accurate issue tracking

## Files to Keep

Essential files for the report generation system:
- `/comparison/report-generator-v7-complete.ts` - Final report generator
- `/comparison/comparison-agent-standalone.ts` - Comparison with enrichment
- `/comparison/interfaces/comparison-agent.interface.ts` - Type definitions
- `/types/analysis-types.ts` - Issue and comparison types

## Deprecated Files

The following can be removed:
- `report-generator-v2.ts` through `report-generator-v6.ts`
- `report-generator-v7.ts` and `report-generator-v7-enhanced.ts`
- Test scripts in root directory
- Intermediate report examples