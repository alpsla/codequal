# Granular Process Validation Guide

## Overview

This guide explains how to validate the entire CodeQual analysis process at the most granular level, ensuring each component (DeepWiki, MCP Tools, PR Analysis) works correctly and data flows properly.

## Components Validated

### 1. DeepWiki Analysis
- Repository analysis completion
- Recommendations generation by role
- File caching for MCP tools
- Vector DB storage

### 2. MCP Tools (Individual Execution)
Each tool is executed separately to validate:
- **ESLint**: JavaScript/TypeScript code quality
- **Semgrep**: Security vulnerability detection
- **npm-audit**: Dependency vulnerabilities
- **Madge**: Circular dependency detection
- **Dependency-cruiser**: Dependency rule validation

### 3. PR Branch Analysis
- PR branch file fetching
- Content enrichment from PR branch
- Fallback to DeepWiki cache + patches
- File coverage metrics

### 4. Data Flow Validation
- DeepWiki → Vector DB
- DeepWiki → MCP Tools (cached files)
- PR Branch → MCP Tools (latest content)
- Tools → Agents (findings)
- Recommendations → Final Report

## Running the Validation

```bash
# Quick run
./run-granular-validation.sh

# Or manually
npm run build
npx ts-node test-granular-validation.ts
```

## Output Files

The validation creates:
1. **Console Output**: Real-time progress and results
2. **Log File**: `validation-reports/validation-TIMESTAMP.log`
3. **JSON Report**: `validation-reports/validation-report-TIMESTAMP.json`

## Interpreting Results

### Success Criteria

✅ **DeepWiki**:
- Completes within 10 seconds
- Generates recommendations for each role
- Caches repository files

✅ **MCP Tools**:
- At least 80% success rate
- Each tool returns findings (may be 0 for clean code)
- Execution time under 30s per tool

✅ **PR Analysis**:
- Files enriched with content (>80% coverage)
- Correct PR branch identified
- Findings aggregated properly

✅ **Data Flow**:
- All checkpoints show ✅
- Recommendations flow to final report
- No data loss between components

### Common Issues

❌ **DeepWiki Timeout**:
- Check network connectivity
- Verify repository URL is valid
- Ensure authentication is working

❌ **Tool Failures**:
- Check file content is available
- Verify tool dependencies installed
- Review error messages in log

❌ **Low File Coverage**:
- PR branch may not exist
- GitHub API rate limits
- Authentication issues

## Sample Output

```
📊 FINAL VALIDATION REPORT
==================================================

1. DeepWiki Analysis:
   - Completed: ✅
   - Time: 5.43s
   - Recommendations: 12 total

2. MCP Tools Execution:
   - Success Rate: 4/5 (80%)
   - Total Findings: 47
   - eslint: ✅ 15 findings
   - semgrep: ✅ 8 findings
   - npm-audit: ✅ 3 findings
   - madge: ✅ 21 findings
   - dependency-cruiser: ❌ Failed

3. PR Branch Analysis:
   - Files Coverage: 12/15 (80.0%)
   - Branch: feature/new-component
   - Total Findings: 52

4. Data Flow Validation:
   - DeepWiki → Vector DB: ✅
   - DeepWiki → MCP Tools: ✅
   - PR Branch → MCP Tools: ✅
   - Tools → Agents: ✅
   - Recommendations → Report: ✅
```

## Troubleshooting

### No DeepWiki Recommendations
- Check DeepWiki mock data in `deepwiki-manager.ts`
- Verify analysis completion
- Check Vector DB connection

### Zero Tool Findings
- Verify files have actual security/quality issues
- Check tool configuration
- Review file content passed to tools

### PR Branch Not Found
- Verify PR exists and is accessible
- Check GitHub token permissions
- Try with a known PR number

## Next Steps

After successful validation:
1. Review the JSON report for detailed findings
2. Check log file for any warnings
3. Run actual PR analysis with real repositories
4. Monitor production metrics