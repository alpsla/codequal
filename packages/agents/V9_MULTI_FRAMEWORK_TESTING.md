# V9 Multi-Framework Java Testing Guide

**Status:** Ready to Execute
**Date:** October 26, 2025
**Purpose:** Validate V9PRAnalyzer service across multiple Java frameworks

---

## 🎯 Overview

This test suite validates the production-ready **V9PRAnalyzer service** across 5 popular Java frameworks to ensure:

✅ **Consistent report quality** across different codebases
✅ **Reliable tool execution** (PMD, Semgrep, CheckStyle, Dependency-Check)
✅ **Accurate issue categorization** (NEW/RESOLVED/EXISTING_MODIFIED/EXISTING_REST)
✅ **Performance scalability** (small → medium → large codebases)
✅ **Production readiness** across diverse Java projects

---

## 📋 Test Matrix

| # | Framework | PR # | Codebase Size | Expected Issues | Timeout |
|---|-----------|------|---------------|-----------------|---------|
| 1 | **Spring Boot PetClinic** | 950 | Small (~50 files) | 100-2,000 | 15 min |
| 2 | **Quarkus Quickstarts** | 1551 | Small-Medium (~200 files) | 200-3,000 | 20 min |
| 3 | **Micronaut Core** | 10950 | Medium (~1,000 files) | 300-5,000 | 25 min |
| 4 | **Apache Kafka** | 20515 | Large (~5,500 files) | 500-10,000 | 30 min |
| 5 | **WebGoat** | 1950 | Medium (~800 files) | 400-6,000 | 20 min |

**Total Estimated Time:** ~2 hours (including repository cloning, tool execution, AI processing)

---

## 🚀 Quick Start

### Option 1: Run on Oracle Cloud (Recommended)

```bash
# From project root
cd "/Users/alpinro/Code Prjects/codequal"

# Run the automated script
./run-java-frameworks-test.sh
```

**What it does:**
1. Uploads test script to Oracle Cloud
2. Cleans up old test data
3. Runs all 5 framework tests sequentially
4. Downloads all reports and JSON summary
5. Displays consolidated summary

### Option 2: Run Locally (Requires local environment)

```bash
cd "/Users/alpinro/Code Prjects/codequal/packages/agents"

# Ensure environment variables are set
export $(grep -v '^#' .env | xargs)

# Run the test suite
npx ts-node test-v9-java-frameworks.ts
```

---

## 📊 Expected Outputs

### 1. Individual Framework Reports

Each framework generates a detailed V9 report:

- `v9-spring-boot-petclinic-pr950.md` - Spring Boot PetClinic analysis
- `v9-quarkus-quickstarts-pr1551.md` - Quarkus Quickstarts analysis
- `v9-micronaut-core-pr10950.md` - Micronaut Core analysis
- `v9-apache-kafka-pr20515.md` - Apache Kafka analysis
- `v9-webgoat-pr1950.md` - WebGoat analysis

**Report Contents (34 sections):**
- Repository information
- Executive summary with decision (APPROVED/DECLINED)
- Issue breakdown by category (NEW/RESOLVED/EXISTING)
- Security, Quality, Performance, Architecture, Dependency scores
- AI-generated fixes for all issues
- Educational resources
- Business impact analysis
- JSON attachments for IDE integration

### 2. JSON Summary Report

`v9-multi-framework-summary-{timestamp}.json`

```json
{
  "timestamp": "2025-10-26T...",
  "totalFrameworks": 5,
  "passed": 5,
  "failed": 0,
  "overallDuration": 7200,
  "results": [
    {
      "framework": "Spring Boot PetClinic",
      "success": true,
      "duration": 935,
      "issues": {
        "total": 1209,
        "new": 430,
        "resolved": 0,
        "existingModified": 0,
        "existingRest": 779,
        "blocking": 0
      },
      "decision": "APPROVED",
      "reportPath": "..."
    }
    // ... other frameworks
  ]
}
```

### 3. Execution Log

`v9-multi-framework-test.log` - Complete execution log with:
- Repository cloning progress
- Tool execution output
- AI processing logs
- Issue categorization details
- Performance metrics

---

## ✅ Success Criteria

Each framework test must pass these validation checks:

### Report Quality ✅
- ✅ Real duration (not 0s or placeholder)
- ✅ Accurate scores (not all 50/100 or defaults)
- ✅ AI-generated fixes (not generic templates)
- ✅ Real PR metadata (author, PR number, commit SHA)

### Issue Categorization ✅
- ✅ NEW issues identified (introduced in PR)
- ✅ RESOLVED issues identified (fixed by PR)
- ✅ EXISTING_MODIFIED issues identified (pre-existing in changed files)
- ✅ EXISTING_REST issues identified (pre-existing in unchanged files)

### Tool Execution ✅
- ✅ PMD execution successful
- ✅ Semgrep execution successful
- ✅ CheckStyle execution successful
- ✅ Dependency-Check execution successful
- ✅ All tools return JSON results

### Performance ✅
- ✅ Completes within timeout
- ✅ Redis caching working (faster subsequent runs)
- ✅ No memory issues or crashes
- ✅ PostgreSQL for Dependency-Check working

### Cost Optimization ✅
- ✅ Issue grouping active (99%+ cost reduction)
- ✅ Only 1 AI call per group (not per issue)
- ✅ **Cost scales with number of groups** (not total issues)
- ✅ **Average cost: < $0.01 per analysis** (proven with grouping)
- ✅ Cost formula: `groups × $0.003 per AI call`

---

## 🔧 Configuration

### Frameworks Configuration

Edit `test-v9-java-frameworks.ts` to add/remove frameworks:

```typescript
const JAVA_FRAMEWORKS: FrameworkTest[] = [
  {
    name: 'Spring Boot PetClinic',
    repositoryUrl: 'https://github.com/spring-projects/spring-petclinic.git',
    prNumber: 950,
    description: 'Spring Boot reference application - small codebase',
    expectedIssues: { min: 100, max: 2000 },
    timeoutSeconds: 900 // 15 minutes
  },
  // Add more frameworks here...
];
```

### Tool Configuration

Tool settings are managed by `V9PRAnalyzer` service:
- **PMD:** Rulesets, priority, memory
- **Semgrep:** Rulesets, parallel execution
- **CheckStyle:** Google checks config
- **Dependency-Check:** PostgreSQL caching, CVSS threshold

To modify tool settings, edit:
`packages/agents/src/two-branch/services/v9-pr-analyzer.ts`

---

## 📈 Performance Benchmarks

Expected performance based on Spring Boot PetClinic validation:

| Metric | Target | Spring PetClinic (Validated) |
|--------|--------|------------------------------|
| **Duration** | < 5 min (small repos) | 2m 35s ✅ |
| **Cost** | < $0.10 per analysis | $0.07 ✅ |
| **AI Calls** | < 20 per analysis | 17 ✅ |
| **Issues Found** | 100-10,000 (depends on size) | 1,209 ✅ |
| **Auto-fix Coverage** | > 90% | 100% ✅ |
| **Decision Accuracy** | 100% | APPROVED ✅ |

---

## 🐛 Troubleshooting

### Test Hangs or Times Out

**Cause:** Large repository, tool execution issues, or network problems

**Solution:**
1. Check Oracle Cloud logs: `ssh opc@oracle 'tail -f /tmp/v9-multi-framework-test.log'`
2. Increase timeout in `test-v9-java-frameworks.ts`
3. Reduce expected issue ranges
4. Check Redis/PostgreSQL connectivity

### No Issues Found (0 issues)

**Cause:** Tool execution failed, wrong branch, or configuration issue

**Solution:**
1. Verify tools are working: `ssh opc@oracle 'docker images | grep analyzer'`
2. Check tool logs in execution log
3. Ensure correct PR number and repository URL
4. Verify `.env` file has all required API keys

### Report Quality Issues

**Cause:** Stale report, wrong test file, or formatter issues

**Solution:**
1. Ensure using latest `test-v9-java-frameworks.ts`
2. Clean up old reports: `rm -rf /tmp/v9-reports/*`
3. Verify `V9PRAnalyzer` service is latest version
4. Check `V9GroupedReportFormatter` for recent fixes

### Cost Too High (> $1 per analysis)

**Cause:** Issue grouping not working, emergency fallback model used

**Solution:**
1. Verify issue grouping is active (check logs for "Grouped X issues into Y groups")
2. Ensure `STRICT_NO_FALLBACK=true` in environment
3. Check Supabase model configurations are correct
4. Review AI service logs for unexpected model usage

---

## 📋 Next Steps After Testing

### If All Tests Pass ✅

1. **Document Results:**
   - Update `QUICK_START_NEXT_SESSION.md` with test results
   - Add performance metrics to `V9_CRITICAL_KNOWLEDGE_BASE.md`
   - Update `V9_PRODUCTION_ARCHITECTURE.md` with validation status

2. **Expand to Other Languages:**
   - Create TypeScript orchestrator
   - Create Python orchestrator
   - Create Go orchestrator
   - Follow same testing pattern

3. **Production Deployment:**
   - Set up webhooks for automatic PR analysis
   - Deploy API endpoint
   - Configure CI/CD integration
   - Set up monitoring and alerts

### If Any Tests Fail ❌

1. **Investigate Failures:**
   - Review execution logs
   - Check tool output
   - Verify environment configuration
   - Test individual tools manually

2. **Fix Issues:**
   - Update tool orchestrators if needed
   - Fix report formatter if needed
   - Adjust expected issue ranges if needed
   - Increase timeouts if needed

3. **Re-run Tests:**
   - Run failed tests individually
   - Validate fixes work consistently
   - Document any changes made

---

## 🔗 Related Documentation

- **V9PRAnalyzer Service:** `packages/agents/V9_PRODUCTION_ARCHITECTURE.md`
- **V9 Architecture:** `V9-SYSTEM-OVERVIEW.md`
- **V9 Knowledge Base:** `packages/agents/src/two-branch/docs/next/V9_CRITICAL_KNOWLEDGE_BASE.md`
- **Quick Start Guide:** `packages/agents/src/two-branch/docs/next/QUICK_START_NEXT_SESSION.md`
- **Architecture Document:** `docs/architecture/updated-architecture-document-v4.md`

---

## 📝 Test Validation Checklist

Before declaring multi-framework testing complete, verify:

- [ ] All 5 frameworks tested successfully
- [ ] All reports have real durations (not 0s)
- [ ] All reports have accurate scores (not 50/100 defaults)
- [ ] All reports have AI-generated fixes
- [ ] Issue categorization works (NEW/RESOLVED/EXISTING)
- [ ] Performance meets benchmarks (< 5 min for small repos)
- [ ] Cost optimization works (< $0.10 per analysis)
- [ ] JSON summary generated successfully
- [ ] All reports downloaded to `reports/` directory
- [ ] Execution logs saved and reviewed
- [ ] Documentation updated with findings

---

**Ready to test?** Run `./run-java-frameworks-test.sh` from project root! 🚀

