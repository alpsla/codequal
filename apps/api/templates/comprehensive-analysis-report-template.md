# Repository Analysis Report

**Repository:** {{REPOSITORY_URL}}  
**PR:** {{PR_NUMBER}} - {{PR_TITLE}}  
**Analysis Date:** {{DATE}}  
**Model Used:** {{PRIMARY_MODEL}} (Primary), {{FALLBACK_MODEL}} (Fallback)  
**Scan Duration:** {{DURATION}} seconds

---

## Executive Summary

**Overall Score: {{OVERALL_SCORE}}/100 ({{GRADE}})**

{{EXECUTIVE_SUMMARY}}

### Key Metrics
- **Total Issues Found:** {{TOTAL_ISSUES}}
- **Critical Issues:** {{CRITICAL_ISSUES}}
- **Estimated Remediation Time:** {{REMEDIATION_TIME}}
- **Risk Level:** {{RISK_LEVEL}}
- **Trend:** {{TREND_INDICATOR}} {{TREND_DESCRIPTION}}

### Issue Distribution
```
Critical: {{CRITICAL_BAR}} {{CRITICAL_COUNT}}
High:     {{HIGH_BAR}} {{HIGH_COUNT}}
Medium:   {{MEDIUM_BAR}} {{MEDIUM_COUNT}}
Low:      {{LOW_BAR}} {{LOW_COUNT}}
```

---

## 1. Security Analysis

### Score: {{SECURITY_SCORE}}/100 (Grade: {{SECURITY_GRADE}})

**Summary:** {{SECURITY_SUMMARY}}

### Critical Findings

{{#SECURITY_FINDINGS}}
#### {{FINDING_ID}}: {{FINDING_TITLE}} ({{SEVERITY}})
- **CVSS Score:** {{CVSS_SCORE}}/10
- **CWE:** {{CWE_ID}} ({{CWE_NAME}})
- **Impact:** {{IMPACT}}

**Locations:**
```{{LANGUAGE}}
# {{FILE_PATH}} (lines {{LINE_NUMBERS}})
{{CODE_SNIPPET}}
```

**Immediate Action Required:**
{{ACTION_ITEMS}}

{{/SECURITY_FINDINGS}}

### Security Recommendations

**Immediate (Week 1):**
{{IMMEDIATE_SECURITY_ACTIONS}}

**Short-term (Week 2-3):**
{{SHORT_TERM_SECURITY_ACTIONS}}

---

## 2. Performance Analysis

### Score: {{PERFORMANCE_SCORE}}/100 (Grade: {{PERFORMANCE_GRADE}})

**Summary:** {{PERFORMANCE_SUMMARY}}

### Critical Findings

{{#PERFORMANCE_FINDINGS}}
#### {{FINDING_ID}}: {{FINDING_TITLE}} ({{SEVERITY}})
- **Current Latency:** {{CURRENT_LATENCY}}
- **Target Latency:** {{TARGET_LATENCY}}
- **Query Count:** {{QUERY_COUNT}}

**Problem Code:**
```{{LANGUAGE}}
{{PROBLEM_CODE}}
```

**Solution:**
```{{LANGUAGE}}
{{SOLUTION_CODE}}
```

{{/PERFORMANCE_FINDINGS}}

### Performance Metrics

| Metric | Current | Target | Impact |
|--------|---------|--------|--------|
{{#PERFORMANCE_METRICS}}
| {{METRIC_NAME}} | {{CURRENT_VALUE}} | {{TARGET_VALUE}} | {{IMPACT}} |
{{/PERFORMANCE_METRICS}}

### Performance Recommendations

**Immediate:**
{{IMMEDIATE_PERFORMANCE_ACTIONS}}

**Short-term:**
{{SHORT_TERM_PERFORMANCE_ACTIONS}}

---

## 3. Code Quality Analysis

### Score: {{QUALITY_SCORE}}/100 (Grade: {{QUALITY_GRADE}})

**Summary:** {{QUALITY_SUMMARY}}

### Key Issues

{{#QUALITY_ISSUES}}
#### {{ISSUE_ID}}: {{ISSUE_TITLE}}
**{{ISSUE_COUNT}} {{ISSUE_DESCRIPTION}}**

{{ISSUE_DETAILS}}

{{/QUALITY_ISSUES}}

### Code Metrics
```
Maintainability Index:  {{MAINTAINABILITY_INDEX}}/100
Technical Debt Ratio:   {{TECH_DEBT_RATIO}}%
Code Smells:           {{CODE_SMELLS}}
Duplicated Lines:      {{DUPLICATED_LINES}}%
Test Coverage:         {{TEST_COVERAGE}}% (target: {{TARGET_COVERAGE}}%)
```

### Code Quality Recommendations

**Immediate:**
{{IMMEDIATE_QUALITY_ACTIONS}}

---

## 4. Architecture Analysis

### Score: {{ARCHITECTURE_SCORE}}/100 (Grade: {{ARCHITECTURE_GRADE}})

**Summary:** {{ARCHITECTURE_SUMMARY}}

### Architecture Findings

{{#ARCHITECTURE_FINDINGS}}
#### {{FINDING_ID}}: {{FINDING_TITLE}}
{{FINDING_DETAILS}}

**Impact:** {{IMPACT}}

**Solution:** {{SOLUTION}}

{{/ARCHITECTURE_FINDINGS}}

### Positive Patterns
{{POSITIVE_PATTERNS}}

### Architecture Recommendations
{{ARCHITECTURE_RECOMMENDATIONS}}

---

## 5. Dependencies Analysis

### Score: {{DEPENDENCIES_SCORE}}/100 (Grade: {{DEPENDENCIES_GRADE}})

**Summary:** {{DEPENDENCIES_SUMMARY}}

### Critical Vulnerabilities

| Package | Current | Patched | CVE | Severity |
|---------|---------|---------|-----|----------|
{{#VULNERABLE_DEPENDENCIES}}
| {{PACKAGE}} | {{CURRENT_VERSION}} | {{PATCHED_VERSION}} | {{CVE}} | {{SEVERITY}} |
{{/VULNERABLE_DEPENDENCIES}}

### Dependency Statistics
- **Total Dependencies:** {{TOTAL_DEPENDENCIES}}
- **Outdated:** {{OUTDATED_DEPENDENCIES}}
- **Vulnerable:** {{VULNERABLE_DEPENDENCIES_COUNT}}
- **Deprecated:** {{DEPRECATED_DEPENDENCIES}}
- **Unused:** {{UNUSED_DEPENDENCIES}}

### Update Commands
```bash
{{UPDATE_COMMANDS}}
```

---

## 6. Testing Analysis

### Score: {{TESTING_SCORE}}/100 (Grade: {{TESTING_GRADE}})

**Summary:** {{TESTING_SUMMARY}}

### Coverage Breakdown
```
Overall:      {{OVERALL_COVERAGE}}% {{OVERALL_COVERAGE_BAR}}
Unit:         {{UNIT_COVERAGE}}% {{UNIT_COVERAGE_BAR}}
Integration:  {{INTEGRATION_COVERAGE}}% {{INTEGRATION_COVERAGE_BAR}}
E2E:          {{E2E_COVERAGE}}% {{E2E_COVERAGE_BAR}}
```

### Critical Gaps
{{TESTING_GAPS}}

---

## 7. Priority Action Plan

### Week 1: Critical Security & Performance ({{WEEK1_HOURS}} hours)
```markdown
{{WEEK1_ACTIONS}}
```

### Week 2: High Priority Issues ({{WEEK2_HOURS}} hours)
```markdown
{{WEEK2_ACTIONS}}
```

### Week 3-4: Quality & Architecture ({{WEEK3_HOURS}} hours)
```markdown
{{WEEK3_ACTIONS}}
```

---

## 8. Educational Recommendations

### Skill Gap Analysis

| Area | Current | Target | Gap | Priority |
|------|---------|--------|-----|----------|
{{#SKILL_GAPS}}
| {{AREA}} | {{CURRENT_LEVEL}} | {{TARGET_LEVEL}} | {{GAP}} | {{PRIORITY}} |
{{/SKILL_GAPS}}

### Recommended Learning Paths

{{#LEARNING_PATHS}}
#### {{PATH_NUMBER}}. {{PATH_TITLE}} ({{PRIORITY}} - {{DURATION}})
{{PATH_MODULES}}

{{/LEARNING_PATHS}}

### Team Development Actions
{{TEAM_ACTIONS}}

---

## 9. Success Metrics

### Technical Metrics
{{TECHNICAL_METRICS}}

### Business Impact
{{BUSINESS_IMPACT}}

---

## 10. Conclusion

{{CONCLUSION}}

**Recommended Investment:** {{INVESTMENT}}

**Expected ROI:** 
{{ROI_ITEMS}}

---

*Generated by CodeQual Analysis Engine v2.0 | Analysis ID: {{ANALYSIS_ID}}*