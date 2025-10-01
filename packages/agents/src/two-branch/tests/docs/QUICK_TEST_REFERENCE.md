# Quick Test Reference - Java Flow Testing

**Last Updated**: October 1, 2025
**Status**: ✅ Ready to run

---

## 🚀 Quick Start (30 seconds)

```bash
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents

# Run all automated tests (6/7 tests, ~90 seconds)
npx ts-node src/two-branch/tests/integration/test-complete-java-flow.ts
```

**Expected Output**:
```
✅ PASSED  Daily CVE Update (36s)
✅ PASSED  Status Change and Queue (4s)
✅ PASSED  Rollback Scenarios (38s)
✅ PASSED  Temporary File Cleanup (2s)
✅ PASSED  Dependency-Check Readiness (3s)
✅ PASSED  JavaToolOrchestrator Integration (1s)
❌ FAILED  End-to-End Real Repository (manual)

Total: 6/7 tests passed
```

---

## 📋 Prerequisites Checklist

Before running tests, verify:

- [ ] **Environment variables** set in `.env`:
  ```bash
  SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
  NVD_API_KEY=your_nvd_api_key
  OPENROUTER_API_KEY=your_openrouter_key
  ```

- [ ] **Database schemas deployed**:
  ```bash
  # Check if tables exist
  psql $SUPABASE_DATABASE_URL -c "\dt cve_database"
  psql $SUPABASE_DATABASE_URL -c "\dt analysis_requests"

  # If not, deploy:
  psql $SUPABASE_DATABASE_URL -f src/two-branch/scheduler/migrations/001_create_cve_tables.sql
  psql $SUPABASE_DATABASE_URL -f src/two-branch/scheduler/migrations/002_create_analysis_tracking_tables.sql
  ```

- [ ] **CVE database populated** (312K+ CVEs):
  ```bash
  # Check CVE count
  psql $SUPABASE_DATABASE_URL -c "SELECT COUNT(*) FROM cve_database"

  # If 0 or low, run initial load:
  npx tsx src/two-branch/scripts/nvd-direct-download.ts  # 15-20 min
  ```

- [ ] **Docker image available**:
  ```bash
  docker pull registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.3-arm
  ```

---

## 🧪 Test Scenarios

### Test 1: Daily CVE Update (35-45s)
**What**: Simulates daily cron job for CVE database updates
**Verifies**: NVD API integration, update logging, scheduler integration

### Test 2: Status/Queue (3-4s)
**What**: Creates analysis request, changes status PENDING → IN_PROGRESS → COMPLETED
**Verifies**: Queue management, status transitions, timestamp tracking

### Test 3: Rollback (38-42s)
**What**: Tests failed update handling with invalid API key
**Verifies**: Database integrity, error logging, recovery

### Test 4: Cleanup (1-2s)
**What**: Creates and deletes temporary CVE files in /tmp
**Verifies**: File cleanup logic

### Test 5: Dep-Check (2-3s)
**What**: Tests DependencyCheckSupabaseService with known vulnerabilities
**Verifies**: Log4Shell detection, query performance (< 100ms/dep)

### Test 6: Integration (1s)
**What**: Initializes JavaToolOrchestrator with Dependency-Check enabled
**Verifies**: Configuration, CVE database ready (312K+ CVEs)

### Test 7: End-to-End (Manual)
**What**: Full repository analysis with all tools
**Verifies**: Complete pipeline from clone to results

---

## 🐛 Common Issues

### Issue: "Missing environment variables"
```bash
# Fix: Add to .env
echo "NVD_API_KEY=your_api_key" >> .env
echo "SUPABASE_URL=your_url" >> .env
echo "SUPABASE_SERVICE_ROLE_KEY=your_key" >> .env
```

### Issue: "Table does not exist"
```bash
# Fix: Deploy schemas
psql $SUPABASE_DATABASE_URL -f src/two-branch/scheduler/migrations/001_create_cve_tables.sql
psql $SUPABASE_DATABASE_URL -f src/two-branch/scheduler/migrations/002_create_analysis_tracking_tables.sql
```

### Issue: "CVE database empty"
```bash
# Fix: Run initial download (15-20 min)
npx tsx src/two-branch/scripts/nvd-direct-download.ts
```

### Issue: "Docker image not found"
```bash
# Fix: Pull from registry
docker pull registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.3-arm
```

---

## 📊 Performance Benchmarks

| Test | Duration | Pass Criteria |
|------|----------|---------------|
| Test 1 | 35-45s | CVE count unchanged or increased |
| Test 2 | 3-4s | Status changes logged correctly |
| Test 3 | 38-42s | Database unchanged after failure |
| Test 4 | 1-2s | All test files deleted |
| Test 5 | 2-3s | Log4Shell detected, < 100ms/dep |
| Test 6 | 1s | 312K+ CVEs ready |
| **Total** | **80-95s** | **6/7 passing** |

---

## 🎯 Next Steps After Tests Pass

1. **Manual End-to-End Test** (optional but recommended):
   ```bash
   git clone https://github.com/spring-projects/spring-petclinic /tmp/spring-petclinic
   # Follow guide in: src/two-branch/docs/JAVA_FLOW_TESTING_GUIDE.md
   ```

2. **Production Deployment**:
   - Deploy to Oracle A1.Flex
   - Configure scheduler cron jobs
   - Monitor first scheduled update

3. **V9 Integration**:
   - Add Dependency-Check to V9 report
   - Test with Apache Kafka PR #17620
   - Get user approval

---

## 📖 Full Documentation

- **Testing Guide**: `src/two-branch/docs/JAVA_FLOW_TESTING_GUIDE.md`
- **CVE Deployment**: `src/two-branch/docs/CVE_DATABASE_DEPLOYMENT_COMPLETE.md`
- **Session Summary**: `SESSION_2025_10_01_JAVA_FLOW_TESTING_COMPLETE.md`

---

## ✅ Success Criteria

Tests are passing if you see:
```
✅ PASSED  Daily CVE Update
✅ PASSED  Status Change and Queue
✅ PASSED  Rollback Scenarios
✅ PASSED  Temporary File Cleanup
✅ PASSED  Dependency-Check Readiness
✅ PASSED  JavaToolOrchestrator Integration
❌ FAILED  End-to-End Real Repository  [EXPECTED - manual test]

Total: 6/7 tests passed
```

🎉 **You're production ready!**
