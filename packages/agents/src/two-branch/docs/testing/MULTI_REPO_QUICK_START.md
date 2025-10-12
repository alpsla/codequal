# 🚀 Multi-Repository Testing - Quick Start Guide

**Purpose**: Execute Phase 2 validation across multiple Java frameworks  
**Priority**: 🔴 CRITICAL  
**Expected Duration**: 4-6 hours  
**Status**: ⏳ **READY TO EXECUTE**

---

## ⚡ **QUICK START**

### Step 1: Connect to Oracle Cloud

```bash
# From your local machine
ssh -i "/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key" opc@129.213.49.128
```

### Step 2: Navigate to Project Directory

```bash
cd ~/codequal/packages/agents
```

### Step 3: Verify Environment

```bash
# Check environment variables
echo "ORACLE_DEPCHECK_DB_URL: $ORACLE_DEPCHECK_DB_URL"
echo "ORACLE_DEPCHECK_DB_USER: $ORACLE_DEPCHECK_DB_USER"
echo "ORACLE_DEPCHECK_DB_PASSWORD: $ORACLE_DEPCHECK_DB_PASSWORD"
echo "SUPABASE_URL: $SUPABASE_URL"

# Verify PostgreSQL connection
sudo -u postgres psql -c "SELECT usename FROM pg_user WHERE usename = 'depcheck_scanner';"

# Check Redis
redis-cli ping

# Check Docker
docker images | grep analyzer
```

### Step 4: Run Multi-Repository Validation

```bash
# Execute the automated test suite
./run-multi-repo-validation.sh
```

### Step 5: Monitor Progress

```bash
# In a separate terminal, watch the log
tail -f /tmp/multi-repo-results/execution-log-*.txt
```

---

## 📊 **EXPECTED OUTPUT**

### During Execution

```
🚀 Multi-Repository Validation Starting...
==========================================

Results will be saved to: /tmp/multi-repo-results
Log file: /tmp/multi-repo-results/execution-log-20251010_120000.txt

🍃 Testing Spring Boot Repositories
==========================================

=========================================
🧪 Testing: spring-petclinic
📦 Framework: Spring Boot
🔗 URL: https://github.com/spring-projects/spring-petclinic
=========================================
📥 Cloning repository...
📊 Java files found: 52
🔧 Running Java analysis...
✅ Analysis complete in 28s

=========================================
🧪 Testing: spring-restdocs
📦 Framework: Spring Boot
🔗 URL: https://github.com/spring-projects/spring-restdocs
=========================================
...
```

### Final Report

```
=========================================
📊 FINAL RESULTS
=========================================
Total Tests: 8
Passed: 8
Failed: 0
Success Rate: 100.00%

Results saved to: /tmp/multi-repo-results
Summary: /tmp/multi-repo-results/summary.txt
```

---

## 📋 **TEST REPOSITORIES**

### Spring Boot (2 repositories)
- ✅ spring-petclinic (~50 files, Maven)
- ✅ spring-restdocs (~200 files, Gradle)

### Quarkus (2 repositories)
- ✅ quarkus-quickstarts (~1000 files, Maven)
- ✅ quarkus-super-heroes (~200 files, Maven)

### Micronaut (2 repositories)
- ✅ micronaut-guides (~500 files, Gradle)
- ✅ micronaut-examples (~300 files, Gradle)

### Plain Java (2 repositories)
- ✅ commons-lang (~200 files, Maven)
- ✅ commons-io (~150 files, Maven)

---

## 🔍 **VALIDATION CHECKLIST**

### Pre-Execution
- [ ] Connected to Oracle Cloud
- [ ] Environment variables verified
- [ ] PostgreSQL password set (`depcheck123`)
- [ ] Redis available
- [ ] Docker images present
- [ ] Sufficient disk space (>10GB free)

### During Execution
- [ ] Repositories cloning successfully
- [ ] All 5 tools running on each repo
- [ ] No PostgreSQL connection errors
- [ ] Performance within targets (<2 min per repo)
- [ ] No framework-specific errors

### Post-Execution
- [ ] All repositories tested
- [ ] Summary.txt generated
- [ ] Cross-framework comparison complete
- [ ] Success rate > 90%
- [ ] Documentation updated

---

## 🚨 **TROUBLESHOOTING**

### Issue: "FATAL: password authentication failed"
```bash
# Fix PostgreSQL password
sudo -u postgres psql -c "ALTER USER depcheck_scanner PASSWORD 'depcheck123';"
```

### Issue: Repository clone fails
```bash
# Check network connectivity
ping github.com

# Try manual clone
git clone --depth=10 https://github.com/spring-projects/spring-petclinic /tmp/test-clone
```

### Issue: Analysis timeout
```bash
# Check Docker resources
docker stats

# Check disk space
df -h /tmp
```

### Issue: Environment variables not set
```bash
# Reload .env file
cd ~/codequal/packages/agents
source .env

# Verify
env | grep ORACLE_DEPCHECK
```

---

## 📁 **RESULTS LOCATION**

All results are saved to `/tmp/multi-repo-results/`:

```
/tmp/multi-repo-results/
├── execution-log-20251010_120000.txt    # Complete execution log
├── summary.txt                          # Summary of all tests
├── spring-petclinic-results.txt        # Detailed results per repo
├── spring-restdocs-results.txt
├── quarkus-quickstarts-results.txt
├── quarkus-super-heroes-results.txt
├── micronaut-guides-results.txt
├── micronaut-examples-results.txt
├── commons-lang-results.txt
└── commons-io-results.txt
```

---

## 📊 **ANALYSIS OF RESULTS**

After execution, analyze the results:

```bash
# View summary
cat /tmp/multi-repo-results/summary.txt

# Check for failures
grep -i "FAILED" /tmp/multi-repo-results/summary.txt

# Compare performance across frameworks
grep "Duration:" /tmp/multi-repo-results/summary.txt | sort -n

# Check tool breakdown
grep "Tool breakdown:" /tmp/multi-repo-results/*.txt
```

---

## ✅ **SUCCESS CRITERIA**

| Metric | Target | How to Verify |
|--------|--------|---------------|
| **Success Rate** | > 90% | Check final report |
| **Avg Performance** | < 2 min | Check duration in summary |
| **Framework Consistency** | Realistic findings | Check tool breakdown |
| **No Framework Noise** | < 5% false positives | Manual review of samples |
| **All Tools Working** | 5/5 tools | Check each result file |

---

## 🎯 **NEXT STEPS AFTER COMPLETION**

1. **Review Results**: Analyze summary.txt for patterns
2. **Document Findings**: Update QUICK_START_NEXT_SESSION.md
3. **Create Comparison Report**: Cross-framework analysis
4. **Update Documentation**: Add validated frameworks to README
5. **Proceed to Python**: Begin Phase 3 (multi-language support)

---

**Status**: ⏳ **READY TO EXECUTE**  
**Command**: `./run-multi-repo-validation.sh`  
**Location**: Oracle Cloud (129.213.49.128)  
**Expected Duration**: 4-6 hours
