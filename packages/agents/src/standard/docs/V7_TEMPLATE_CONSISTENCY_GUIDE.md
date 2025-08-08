# V7 Report Template Consistency Guide

## Why Consistency Matters

The V7 report template faced multiple consistency issues during development:
1. Sections showing different data than claimed
2. Missing sections due to incomplete implementations
3. Generic text appearing instead of actual issues
4. Inconsistent metrics between sections

## Core Principles for Consistency

### 1. Single Source of Truth
**ALWAYS** use `analyzeAllIssues()` as the single source for all issue data:

```typescript
const issueAnalysis = this.analyzeAllIssues(comparison);
// Pass this same analysis to ALL section generators
```

### 2. Never Return Empty Strings
**NEVER** stub methods with `return '';'`:

```typescript
// ❌ BAD - Section disappears
private generateSection(): string {
  return '';
}

// ✅ GOOD - Always implement or throw
private generateSection(): string {
  throw new Error('Not implemented');
}
```

### 3. Type Everything
**ALWAYS** use proper types instead of `any`:

```typescript
// ❌ BAD
private generateSection(data: any): string

// ✅ GOOD
private generateSection(data: IssueAnalysis): string
```

## Required Sections Checklist

### Header Requirements
- [ ] NO breaking changes count in header
- [ ] Repository, PR number, author, date
- [ ] Model used and scan duration

### Decision Requirements
- [ ] Show ALL blocking issues (critical + breaking + high)
- [ ] List specific counts for each type
- [ ] Confidence percentage

### Executive Summary Requirements
- [ ] Overall score and grade
- [ ] Visual distribution bars
- [ ] Separate counts for new/resolved/existing
- [ ] Pre-existing issues with priority breakdown

### Category Sections (1-5) Requirements
Each must have:
- [ ] Numbered section header (## 1. Security, ## 2. Performance, etc.)
- [ ] Score and grade
- [ ] Actual issues found (not generic text)
- [ ] Category-specific metrics
- [ ] Visual elements where applicable

### PR Issues Section Requirements
- [ ] Group by severity
- [ ] Show actual code snippets
- [ ] Required Fix with ACTUAL suggestions (never TODO)
- [ ] Impact description

### Business Impact Requirements
- [ ] Negative impacts for blocking issues
- [ ] Positive impacts once fixed
- [ ] Risk assessment
- [ ] Timeline and cost for breaking changes

### PR Comment Requirements
- [ ] Clear approved/declined status
- [ ] List all blocking issues
- [ ] Required actions
- [ ] PR statistics
- [ ] Quality score

## Common Pitfalls to Avoid

### 1. Inconsistent Issue Counts
```typescript
// ❌ BAD - Different sections count differently
Security: "2 vulnerabilities found"
Summary: "3 security issues"

// ✅ GOOD - All use same source
const securityIssues = issueAnalysis.new.byCategory.security;
// Use this everywhere
```

### 2. Generic Fix Suggestions
```typescript
// ❌ BAD
return "// TODO: Fix issue";

// ✅ GOOD - Specific to issue type
if (issue.category === 'dependencies') {
  return `npm update ${packageName}`;
}
```

### 3. Missing Visual Elements
```typescript
// ❌ BAD - Just numbers
"High: 1, Medium: 2"

// ✅ GOOD - Visual bars
"High: █░░░░░░░░░ 1"
"Medium: ██░░░░░░░░ 2"
```

### 4. Inconsistent Metrics
```typescript
// ❌ BAD
Issue: "Complexity: 12"
Metrics: "Average: 8.2 ✅"

// ✅ GOOD
Issue: "Complexity: 12"
Metrics: "Max: 12, Average: 8.2 ⚠️"
```

## Testing for Consistency

Always run these checks:

```typescript
// 1. Validate all sections present
const validator = new ReportTemplateValidator();
const result = validator.validateReport(generatedReport);

// 2. Check no TODOs in fixes
assert(!report.includes('// TODO: Fix'));

// 3. Verify decision matches issues
if (hasBlockingIssues) {
  assert(report.includes('DECLINED'));
}

// 4. Ensure visual elements present
assert(report.includes('█')); // Has bars
assert(report.includes('┌─')); // Has diagrams
```

## Data Flow Architecture

```
comparison (input)
    ↓
analyzeAllIssues() ← Single Source of Truth
    ↓
issueAnalysis = {
  new: { critical, high, medium, low, byCategory },
  resolved: { total, byCategory },
  unchanged: { total, critical, high, medium, low },
  breakingChanges: { critical, high, medium, total }
}
    ↓
All sections use issueAnalysis
    ↓
Consistent Report Output
```

## Maintenance Guidelines

1. **Never modify section generators independently** - Always consider impact on other sections
2. **Test with edge cases** - No issues, only breaking changes, only high issues, etc.
3. **Run validator after changes** - Catch inconsistencies early
4. **Update types when adding features** - Keep TypeScript interfaces in sync
5. **Document any deviations** - If you must break pattern, document why

## Version Control

When making changes:
1. Update version in `report-generator-v7-*.ts` filename
2. Keep old version for rollback
3. Update this guide with lessons learned
4. Add tests for new requirements

## Example: Adding a New Section

```typescript
// 1. Update interface
interface V7ReportTemplate {
  sections: {
    // ... existing
    newSection: NewSectionType; // Add here
  }
}

// 2. Implement generator
private generateNewSection(comparison: any, issues: IssueAnalysis): string {
  // MUST use issues parameter, not comparison.issues
  // MUST return actual content, not empty string
  // MUST follow visual style of other sections
}

// 3. Add to generateReport()
report += this.generateNewSection(comparison, issueAnalysis);

// 4. Update validator
requiredSections.push('New Section Name');

// 5. Test thoroughly
```

## Conclusion

Consistency comes from:
1. Single source of truth for data
2. Complete implementations (no stubs)
3. Type safety
4. Validation
5. Documentation
6. Testing

Follow these principles and the V7 template will remain consistent across all reports.