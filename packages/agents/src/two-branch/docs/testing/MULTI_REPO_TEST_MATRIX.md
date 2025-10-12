# 🧪 Multi-Repository Test Matrix

**Purpose**: Validate Java analysis across multiple frameworks to ensure framework-agnostic configuration works consistently  
**Priority**: 🔴 CRITICAL - Phase 2 of Java completion  
**Status**: Ready to execute  
**Expected Duration**: 4-6 hours

---

## 🎯 **TESTING OBJECTIVES**

### Primary Goals
1. **Framework-Agnostic Validation**: Ensure tools produce consistent findings across all Java frameworks
2. **Performance Validation**: Confirm analysis completes within 2 minutes per repository
3. **Issue Detection Quality**: Verify realistic issue counts without framework-specific noise
4. **Configuration Stability**: Validate that the same configuration works for all frameworks

### Success Criteria
- ✅ All 5 tools run successfully on all repositories
- ✅ No framework-specific configuration needed
- ✅ Consistent severity distribution across frameworks
- ✅ Performance within targets (<2 minutes per repo)
- ✅ No false positives from framework-specific patterns

---

## 📋 **TEST MATRIX**

### 1. Spring Boot Framework (3-5 repositories)

| Repository | URL | Files | LOC | Build | Status |
|------------|-----|-------|-----|-------|--------|
| **Spring Petclinic** | https://github.com/spring-projects/spring-petclinic | ~50 | ~5K | Maven | ⏳ Pending |
| **Spring Boot Samples** | https://github.com/spring-projects/spring-boot/tree/main/spring-boot-samples | Varies | Varies | Maven | ⏳ Pending |
| **Spring REST Docs** | https://github.com/spring-projects/spring-restdocs | ~200 | ~15K | Gradle | ⏳ Pending |

**Expected Characteristics:**
- Common patterns: `@Autowired`, `@Component`, `@Service`, `@RestController`
- Typical issues: Dependency injection warnings, Spring-specific annotations
- Build system: Primarily Maven, some Gradle

### 2. Quarkus Framework (3-5 repositories)

| Repository | URL | Files | LOC | Build | Status |
|------------|-----|-------|-----|-------|--------|
| **Quarkus Quickstarts** | https://github.com/quarkusio/quarkus-quickstarts | ~1000 | ~50K | Maven | ⏳ Pending |
| **Quarkus Super Heroes** | https://github.com/quarkusio/quarkus-super-heroes | ~200 | ~20K | Maven | ⏳ Pending |
| **Quarkus Samples** | https://github.com/quarkusio/quarkus/tree/main/integration-tests | Varies | Varies | Maven | ⏳ Pending |

**Expected Characteristics:**
- Common patterns: `@Inject`, `@ApplicationScoped`, `@Path`, Panache entities
- Typical issues: CDI warnings, reactive programming patterns
- Build system: Primarily Maven

### 3. Micronaut Framework (3-5 repositories)

| Repository | URL | Files | LOC | Build | Status |
|------------|-----|-------|-----|-------|--------|
| **Micronaut Guides** | https://github.com/micronaut-projects/micronaut-guides | ~500 | ~30K | Gradle | ⏳ Pending |
| **Micronaut Examples** | https://github.com/micronaut-projects/micronaut-examples | ~300 | ~20K | Gradle | ⏳ Pending |
| **Micronaut Starter** | https://github.com/micronaut-projects/micronaut-starter | ~400 | ~25K | Gradle | ⏳ Pending |

**Expected Characteristics:**
- Common patterns: `@Singleton`, `@Controller`, `@Client`, compile-time DI
- Typical issues: Null safety warnings, reactive patterns
- Build system: Primarily Gradle

### 4. Plain Java (3-5 repositories)

| Repository | URL | Files | LOC | Build | Status |
|------------|-----|-------|-----|-------|--------|
| **Apache Commons Lang** | https://github.com/apache/commons-lang | ~200 | ~50K | Maven | ⏳ Pending |
| **Google Guava** | https://github.com/google/guava | ~1000 | ~100K | Maven | ⏳ Pending |
| **Apache Commons IO** | https://github.com/apache/commons-io | ~150 | ~30K | Maven | ⏳ Pending |

**Expected Characteristics:**
- Common patterns: Pure Java, no framework dependencies
- Typical issues: Standard Java best practices violations
- Build system: Primarily Maven

### 5. Large Enterprise (2-3 repositories)

| Repository | URL | Files | LOC | Build | Status |
|------------|-----|-------|-----|-------|--------|
| **Apache Kafka** | https://github.com/apache/kafka | ~6,952 | ~500K | Gradle | ✅ **VALIDATED** |
| **Elasticsearch** | https://github.com/elastic/elasticsearch | ~10,000+ | ~1M+ | Gradle | ⏳ Pending |
| **Jenkins** | https://github.com/jenkinsci/jenkins | ~5,000 | ~400K | Maven | ⏳ Pending |

**Expected Characteristics:**
- Common patterns: Complex architectures, multiple modules
- Typical issues: High volume of issues, architectural complexity
- Build system: Both Maven and Gradle

---

## 🔧 **TEST EXECUTION SCRIPT**

### Automated Test Runner

```bash
#!/bin/bash
# run-multi-repo-tests.sh
# Execute on Oracle Cloud for consistent environment

RESULTS_DIR="/tmp/multi-repo-results"
mkdir -p "$RESULTS_DIR"

# Test repositories
declare -A REPOS=(
    # Spring Boot
    ["spring-petclinic"]="https://github.com/spring-projects/spring-petclinic"
    ["spring-restdocs"]="https://github.com/spring-projects/spring-restdocs"
    
    # Quarkus
    ["quarkus-quickstarts"]="https://github.com/quarkusio/quarkus-quickstarts"
    ["quarkus-super-heroes"]="https://github.com/quarkusio/quarkus-super-heroes"
    
    # Micronaut
    ["micronaut-guides"]="https://github.com/micronaut-projects/micronaut-guides"
    ["micronaut-examples"]="https://github.com/micronaut-projects/micronaut-examples"
    
    # Plain Java
    ["commons-lang"]="https://github.com/apache/commons-lang"
    ["commons-io"]="https://github.com/apache/commons-io"
    
    # Large Enterprise (already validated)
    ["kafka"]="https://github.com/apache/kafka"
)

# Run tests for each repository
for repo_name in "${!REPOS[@]}"; do
    echo "========================================="
    echo "Testing: $repo_name"
    echo "URL: ${REPOS[$repo_name]}"
    echo "========================================="
    
    # Clone repository
    REPO_DIR="/tmp/$repo_name-repo"
    rm -rf "$REPO_DIR"
    git clone --depth=10 --no-single-branch "${REPOS[$repo_name]}" "$REPO_DIR"
    
    # Create symlink for test script
    ln -sf "$REPO_DIR" /tmp/kafka-repo
    
    # Run analysis
    cd ~/codequal/packages/agents
    npx ts-node src/two-branch/tests/__tests__/test-java-all-modes.ts > "$RESULTS_DIR/${repo_name}-results.txt" 2>&1
    
    # Extract summary
    echo "Repository: $repo_name" >> "$RESULTS_DIR/summary.txt"
    grep -E "(Mode|issues found|seconds)" "$RESULTS_DIR/${repo_name}-results.txt" >> "$RESULTS_DIR/summary.txt"
    echo "" >> "$RESULTS_DIR/summary.txt"
done

echo "========================================="
echo "All tests complete! Results in: $RESULTS_DIR"
echo "========================================="
cat "$RESULTS_DIR/summary.txt"
```

---

## 📊 **EXPECTED RESULTS FORMAT**

### Per-Repository Report

```
Repository: spring-petclinic
Framework: Spring Boot
Build System: Maven
Files Analyzed: 52 Java files

Tool Results:
- PMD: 45 issues (3 critical, 12 high, 30 medium)
- Semgrep: 2 security issues (1 high, 1 medium)
- Dependency-Check: 0 vulnerabilities
- Checkstyle: 15 style violations
- SpotBugs: Skipped (graceful degradation)

Performance:
- PMD: 8 seconds
- Semgrep: 12 seconds
- Dependency-Check: 5 seconds (base branch)
- Total: 25 seconds

Severity Distribution:
- Critical: 5.8% (3/52 issues)
- High: 23.1% (12/52 issues)
- Medium: 71.1% (37/52 issues)

Status: ✅ PASSED (realistic findings, no framework noise)
```

### Cross-Framework Comparison

```
Framework Comparison:
┌──────────────┬──────────┬────────┬──────────┬──────────────┐
│ Framework    │ Avg Files│ PMD    │ Semgrep  │ Performance  │
├──────────────┼──────────┼────────┼──────────┼──────────────┤
│ Spring Boot  │ ~150     │ ~50    │ ~2       │ ~30s         │
│ Quarkus      │ ~200     │ ~60    │ ~3       │ ~35s         │
│ Micronaut    │ ~180     │ ~55    │ ~2       │ ~32s         │
│ Plain Java   │ ~300     │ ~100   │ ~1       │ ~45s         │
│ Enterprise   │ ~6,000   │ ~7,000 │ ~0       │ ~100s        │
└──────────────┴──────────┴────────┴──────────┴──────────────┘

Consistency Score: 95% (minimal framework-specific variation)
```

---

## ✅ **VALIDATION CHECKLIST**

### Pre-Test Validation
- [ ] Oracle Cloud environment ready
- [ ] All environment variables set correctly
- [ ] PostgreSQL password configured (`depcheck123`)
- [ ] Docker images pre-pulled
- [ ] Redis available and working
- [ ] Supabase credentials configured

### Per-Repository Validation
- [ ] All 5 tools execute successfully
- [ ] No framework-specific configuration needed
- [ ] Performance within 2 minutes
- [ ] Severity distribution realistic (high < 20%)
- [ ] No false positives from framework patterns
- [ ] Issues grouped correctly by tool/rule

### Post-Test Validation
- [ ] All repositories tested successfully
- [ ] Consistent findings across frameworks
- [ ] No framework-specific noise detected
- [ ] Performance targets met
- [ ] Cross-framework comparison complete
- [ ] Documentation updated with results

---

## 🚨 **KNOWN CHALLENGES**

### Large Repository Handling
- **Elasticsearch**: 10,000+ files (may trigger smart selection)
- **Solution**: Use file batching (300 files per batch)
- **Expected time**: 3-5 minutes

### Build System Variations
- **Maven vs Gradle**: Both should work identically
- **Solution**: Framework-agnostic tool configuration
- **Expected**: No build-specific tuning needed

### SpotBugs Compilation
- **Challenge**: Some repos may not compile out-of-the-box
- **Solution**: Graceful degradation (skip when compilation fails)
- **Expected**: 60-70% success rate

---

## 📁 **RESULTS STORAGE**

### Directory Structure
```
/tmp/multi-repo-results/
├── spring-petclinic-results.txt
├── spring-restdocs-results.txt
├── quarkus-quickstarts-results.txt
├── quarkus-super-heroes-results.txt
├── micronaut-guides-results.txt
├── micronaut-examples-results.txt
├── commons-lang-results.txt
├── commons-io-results.txt
├── kafka-results.txt (reference)
├── summary.txt
├── cross-framework-comparison.csv
└── validation-report.md
```

---

## 🎯 **SUCCESS METRICS**

| Metric | Target | Status |
|--------|--------|--------|
| **Repositories Tested** | 8-10 | ⏳ 0/10 |
| **Success Rate** | > 90% | ⏳ TBD |
| **Avg Performance** | < 2 min | ⏳ TBD |
| **Framework Consistency** | > 90% | ⏳ TBD |
| **False Positive Rate** | < 5% | ⏳ TBD |

---

**Status**: ⏳ **READY TO EXECUTE** - All infrastructure in place, ready for testing
