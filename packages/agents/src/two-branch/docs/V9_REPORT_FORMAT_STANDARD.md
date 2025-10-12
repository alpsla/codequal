# V9 Report Format Standard

**Version**: 9.0  
**Date**: October 12, 2025  
**Status**: PRODUCTION READY ✅  
**Baseline**: All Languages (Java, Python, JavaScript, Go, TypeScript, Ruby, PHP, Rust, Kotlin, Swift)

---

## 🎯 Purpose

This document defines the **canonical report format** for all CodeQual V9 analysis reports across all programming languages.

**Key Principles**:
1. **Complete Metadata**: All issues have full metadata structure
2. **Language Agnostic**: Structure works for any programming language
3. **Cost Optimized**: Group-based analysis (99.8% AI cost savings)
4. **API Ready**: Structured data for automation/integration
5. **UI Flexible**: Presentation layer controls visibility

---

## 📋 Report Structure

### 1. Header Section (Required)

```markdown
# Code Quality Analysis Report

**Repository**: {owner}/{repo}  
**PR**: #{pr_number}  
**Decision**: {✅ APPROVED | ⛔ DECLINED} ({blocking_count} blocking issues)
```

**Fields**:
- `repository`: Format `owner/repo` (e.g., `apache/kafka`)
- `pr_number`: Integer pull request number
- `decision`: `APPROVED` or `DECLINED`
- `blocking_count`: Number of blocking issues (NEW or EXISTING_MODIFIED with critical/high severity)

---

### 2. Executive Summary (Required)

```markdown
## 📊 Executive Summary

**Total Issues**: {total_count} ({group_count} unique types)

**By Severity**:
- 🔴 Critical: {critical_count} ({critical_percent}%)
- 🟠 High: {high_count} ({high_percent}%)
- 🟡 Medium: {medium_count} ({medium_percent}%)
- 🟢 Low: {low_count} ({low_percent}%)

**By Category**:
- 🆕 NEW: {new_count} (introduced in this PR)
- ⚠️  EXISTING_MODIFIED: {modified_count} (pre-existing in modified files)
- ✅ RESOLVED: {resolved_count} (fixed by this PR)
- 📝 EXISTING_REST: {rest_count} (pre-existing in unchanged files)

**Blocking Decision**:
- {blocking_count} blocking issues (NEW or EXISTING_MODIFIED with critical/high severity)
- {✅ | ⛔} PR {approved | requires fixes before merge}

**Analysis Results**:
- **{group_count} issue groups** analyzed with AI
- **Cost savings**: ${savings_usd} ({savings_percent}%)
- **Coverage**: 100% of detected issues

**IDE Integration**: {auto_fix_count} groups support one-click fix
```

**Category Definitions**:
- `NEW`: Issues introduced by this PR (blocking if critical/high)
- `EXISTING_MODIFIED`: Pre-existing issues in files modified by this PR (blocking if critical/high)
- `RESOLVED`: Issues that existed in base branch but fixed in PR branch
- `EXISTING_REST`: Pre-existing issues in files not modified by this PR (informational only)

---

### 3. Issue Groups by Severity (Required)

**Structure**: Critical → High → Medium → Low

Each issue group MUST have complete metadata:

```markdown
## 🔴 Critical Issues (Immediate Action Required)

### 🔴 {rule_name}
**Severity**: CRITICAL  
**Tool**: {tool_name}  
**Occurrences**: {count} files  
**Category**: {NEW | EXISTING_MODIFIED | RESOLVED | EXISTING_REST}  
**IDE Fix**: ✅ One-click fix available ([Download for Cursor](attachments/group-{id}-cursor-fix.json))  (if auto-fixable)

**Description**: {issue_description}

**Example**:
- File: `{file_path}`
- Line: {line_number}

```language
{code_snippet}  (if available)
```

**Fix Recommendation**:
{fix_description}

```language
// Current code:  (if available)
{current_code}

// Recommended fix:
{fixed_code}
```

**Best Practices**:  (if available)
- {best_practice_1}
- {best_practice_2}

**All Occurrences**: 📎 [group-{id}-locations.json](attachments/group-{id}-locations.json) ({count} files)

---
```

**Repeat for High, Medium, Low severities**

---

### 4. Attachments Section (Required)

```markdown
## 🔗 Attachments

1. [Issue Groups Mapping](issue-groups-map.json) - Index of all {N} groups
2. [Group 1 Locations](attachments/group-{id}-locations.json) - {rule_name} ({count} files)
...
N. [Group N Locations](attachments/group-{id}-locations.json) - {rule_name} ({count} files)
```

**Attachment Format** (JSON):
```json
{
  "group_id": "string",
  "rule": "string",
  "tool": "string",
  "severity": "critical|high|medium|low",
  "category": "NEW|EXISTING_MODIFIED|RESOLVED|EXISTING_REST",
  "total_occurrences": number,
  
  "representative": {
    "file": "string",
    "line": number,
    "column": number,
    "snippet": "string"
  },
  
  "ai_fix": {
    "fix": "string",
    "corrected_code": "string",
    "explanation": "string",
    "best_practices": ["string", "string"]
  },
  
  "locations": [
    {
      "file": "string",
      "line": number,
      "column": number,
      "snippet": "string",
      "category": "NEW|EXISTING_MODIFIED|..."
    }
  ],
  
  "statistics": {
    "files_affected": number,
    "lines_affected": number,
    "categories": {
      "NEW": number,
      "EXISTING_MODIFIED": number,
      "RESOLVED": number,
      "EXISTING_REST": number
    }
  }
}
```

---

### 5. IDE Integration Section (Required if applicable)

```markdown
## 🔧 IDE Integration Files

**{N} groups** support one-click fix in Cursor IDE:

1. [Fix Group 1](attachments/group-{id}-cursor-fix.json) - {rule_name}
...
N. [Fix Group N](attachments/group-{id}-cursor-fix.json) - {rule_name}

**How to use**: Download the fix file and open in Cursor. Click "Apply All Fixes" to automatically fix all {total_count} occurrences.
```

**IDE Fix Format** (JSON):
```json
{
  "version": "1.0",
  "group_id": "string",
  "rule": "string",
  "severity": "critical|high|medium|low",
  "description": "string",
  
  "fix_pattern": {
    "type": "regex|template",
    "find_regex": "string",  (if type=regex)
    "replace_template": "string",  (if type=regex)
    "example": {
      "before": "string",
      "after": "string"
    },
    "instructions": "string"
  },
  
  "locations": [
    {
      "file": "string",
      "line": number,
      "column": number,
      "snippet": "string"
    }
  ],
  
  "metadata": {
    "total_occurrences": number,
    "confidence": "high|medium|low",
    "safe_auto_apply": boolean,
    "estimated_time_seconds": number,
    "required_imports": ["string", "string"]
  }
}
```

---

### 6. Footer (Required)

```markdown
---

*Generated by CodeQual V9 - Grouped Report Format*  
*{ISO_8601_timestamp}*
```

---

## 🎨 Presentation Layer Guidelines

### Data Completeness
**Rule**: ALL issues (critical/high/medium/low) MUST have complete metadata in the data layer.

### UI Display Options

1. **Default View (Recommended)**:
   - Show summary for all issue groups
   - Expand critical/high by default
   - Collapse medium/low (user clicks to expand)

2. **Compact View**:
   - Show only group titles and counts
   - User clicks to expand any group
   - Good for mobile devices

3. **Filtered View**:
   - Severity filter: Show only critical/high/medium/low
   - Category filter: Show only NEW/EXISTING_MODIFIED
   - Tool filter: Show only specific tools

4. **Paginated View**:
   - Show 5-10 groups per page
   - Prevents overwhelming users with 100+ groups

5. **Progressive Loading**:
   - First load: Summary only
   - On expand: Fetch fix recommendations
   - On demand: Load attachments/locations

**Key Principle**: **Complete data ≠ Show everything**

---

## 📊 Cost Optimization Strategy

### Grouping Logic

**Problem**: Individual AI analysis for 10,000 issues = $28+ per PR

**Solution**: Group by `tool-rule-severity`, analyze representative:

```
Before: 9,453 issues × $0.003/issue = $28.36
After:  17 groups × $0.003/group = $0.05
Savings: 99.8% ($28.31 saved)
```

### Representative Selection

**Algorithm**:
1. Group issues by `{tool}-{rule}-{severity}`
2. Select first issue as representative
3. Run AI analysis on representative only
4. Apply fix to all group members
5. Generate attachments with all locations

**Inheritance**:
```json
{
  "group": "AvoidThrowingRawExceptionTypes",
  "representative": {
    "file": "DescribeConfigsResult.java",
    "line": 64,
    "ai_fix": {
      "fix": "Use specific exception types",
      "code": "throws InterruptedException, ExecutionException"
    }
  },
  "members": 5326,  // All inherit the same fix
  "cost": "$0.003",  // One AI call, not 5,326
  "savings": "$15.98"
}
```

---

## 🌍 Language-Specific Adaptations

### Universal Structure (Language Agnostic)
- Header format
- Executive summary
- Severity levels (critical/high/medium/low)
- Category classification
- Grouping strategy
- Cost calculation
- Attachments structure
- IDE integration format

### Language-Specific Elements

| Language | Tools | Code Syntax | File Extensions |
|----------|-------|-------------|-----------------|
| Java | PMD, Semgrep, SpotBugs, Checkstyle, Dependency-Check | ```java | .java |
| Python | Pylint, Bandit, mypy, Radon | ```python | .py |
| JavaScript | ESLint, SonarJS, npm audit | ```javascript | .js, .jsx |
| TypeScript | ESLint, TSLint, tsc | ```typescript | .ts, .tsx |
| Go | golangci-lint, gosec, staticcheck | ```go | .go |
| Ruby | RuboCop, Brakeman, bundler-audit | ```ruby | .rb |
| PHP | PHPCS, PHPStan, Psalm | ```php | .php |
| Rust | Clippy, Cargo audit | ```rust | .rs |
| Kotlin | Detekt, ktlint | ```kotlin | .kt |
| Swift | SwiftLint, SwiftFormat | ```swift | .swift |

**Adaptation Example** (Python):
```markdown
### 🔴 sql-injection
**Severity**: CRITICAL  
**Tool**: bandit  
**Occurrences**: 3 files  

**Fix Recommendation**:
Use parameterized queries with `cursor.execute()`

```python
# Current code:
cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")

# Recommended fix:
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
```
```

---

## 🔌 API Integration

### GET /api/v1/analysis/{pr_id}/report

**Response** (JSON):
```json
{
  "version": "V9.0",
  "repository": "owner/repo",
  "pr_number": 12345,
  "decision": "DECLINED",
  "blocking_count": 7,
  
  "summary": {
    "total_issues": 9453,
    "groups": 17,
    "severity_breakdown": { "critical": 2, "high": 13, "medium": 9434, "low": 0 },
    "category_breakdown": { "NEW": 1746, "EXISTING_MODIFIED": 3, "RESOLVED": 2139, "EXISTING_REST": 5561 }
  },
  
  "issue_groups": [/* array of groups */],
  
  "cost": {
    "ai_calls": 17,
    "cost_usd": 0.05,
    "savings_usd": 28.36,
    "reduction_percent": 99.8
  },
  
  "attachments": {
    "locations": [/* array of location file URLs */],
    "ide_fixes": [/* array of IDE fix file URLs */],
    "mapping": "url/to/issue-groups-map.json"
  },
  
  "metadata": {
    "generated_at": "2025-10-12T16:21:01.092Z",
    "analysis_mode": "standard",
    "tools_used": ["pmd", "semgrep", "dependency-check"],
    "execution_time_seconds": 271
  }
}
```

### Pagination

```
GET /api/v1/analysis/{pr_id}/report?page=1&limit=10
GET /api/v1/analysis/{pr_id}/report?page=2&limit=10
```

### Filtering

```
GET /api/v1/analysis/{pr_id}/report?severity=critical,high
GET /api/v1/analysis/{pr_id}/report?category=NEW,EXISTING_MODIFIED
GET /api/v1/analysis/{pr_id}/report?tool=semgrep,bandit
```

### Export Formats

```
GET /api/v1/analysis/{pr_id}/report?format=markdown
GET /api/v1/analysis/{pr_id}/report?format=json
GET /api/v1/analysis/{pr_id}/report?format=pdf
GET /api/v1/analysis/{pr_id}/report?format=html
```

---

## ✅ Validation Checklist

Before approving a report as V9-compliant:

### Data Completeness
- [ ] All issue groups have complete metadata
- [ ] All groups have fix recommendations (or "No fix available")
- [ ] All groups have code examples (if snippets available)
- [ ] All groups have attachment links
- [ ] No "N/A" placeholders in user-facing fields
- [ ] No internal references (BUG-XXX, etc.)

### Structure
- [ ] Header section present
- [ ] Executive summary with all fields
- [ ] Issues grouped by severity (critical → high → medium → low)
- [ ] Attachments section with all groups listed
- [ ] IDE integration section (if applicable)
- [ ] Footer with timestamp

### Cost Optimization
- [ ] Grouping applied (not 1:1 issue → AI call)
- [ ] Representative analysis documented
- [ ] Cost savings calculated and reported
- [ ] Reduction percentage shown

### Language Agnostic
- [ ] Structure works for any language
- [ ] Tool names are parameterized
- [ ] Code syntax highlighting is correct
- [ ] File extensions are appropriate

### API Ready
- [ ] JSON attachments are valid
- [ ] Mapping index is generated
- [ ] IDE fix files follow schema
- [ ] All URLs/links are accessible

---

## 🎉 Reference Implementation

**File**: `/packages/agents/reports/v9-e2e-complete-metadata.md`

**Metrics**:
- Lines: 794
- Size: 29 KB
- Groups: 17
- Fix Recommendations: 17 (100%)
- Cost: $0.05
- Savings: $28.36 (99.8%)

**Validation**: ✅ APPROVED as baseline for all languages

---

## 📚 Related Documentation

- `V9_CRITICAL_KNOWLEDGE_BASE.md` - V9 architecture and principles
- `ANALYSIS_MODES.md` - User-selectable analysis depth
- `FRAMEWORK_AGNOSTIC_CONFIGURATION.md` - Tool configuration principles
- `DEPENDENCY_CHECK_PRODUCTION_CONFIGURATION.md` - PostgreSQL setup
- `MULTI_REPO_TEST_MATRIX.md` - Multi-repository validation

---

*Version: 9.0*  
*Last Updated: 2025-10-12*  
*Status: PRODUCTION READY ✅*

