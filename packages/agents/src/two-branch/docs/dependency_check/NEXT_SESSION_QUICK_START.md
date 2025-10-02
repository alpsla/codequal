# Dependency-Check: Next Session Quick Start

**Last Updated:** 2025-10-02 00:20 UTC
**Current Status:** 🔴 **BLOCKING ISSUE - Docker v6.0 ENTRYPOINT Pattern Fix Required**
**Priority:** HIGH - Start here immediately

---

## 🔴 CRITICAL: Docker v6.0 Architecture Issue (2025-10-02)

### Problem Discovered
The `analyzer:lang-java-v6.0-arm` Docker image uses a **custom ENTRYPOINT** instead of standard bash/sh shells. All JavaToolOrchestrator methods are using the wrong pattern.

**Current Pattern** (❌ Broken):
```typescript
docker run image bash -c 'command'  // Cannot execute binary file error
```

**Required Pattern** (✅ Working):
```typescript
docker run image -c "command"  // Uses ENTRYPOINT, works perfectly
```

### Proof It Works
The monthly-log4shell-validation.sh script **runs successfully** on Oracle Cloud using the same v6.0 image with the correct pattern.

### Immediate Action Required

**File to Fix**: `src/two-branch/tools/java/java-tool-orchestrator.ts`

**4 Methods Need Updates**:
1. `runPMD()` - Line ~303
2. `runCheckstyle()` - Line ~384
3. `runSemgrep()` - Line ~450
4. `runDependencyCheck()` - Line ~605

**Simple Change for Each Method**:
- Remove: `bash -c 'command'`
- Replace with: `-c "command"`
- Change single quotes to double quotes

**Estimated Time**: 2 hours total (30 min coding + 90 min testing)

**Complete Instructions**: See `DOCKER_V6_ARCHITECTURE_DISCOVERY.md`

---

## Previous Session Summary (2025-10-01)

### Major Achievement: PostgreSQL Migration Complete ✅

**Problem Solved:** H2 database corruption on ARM64 architecture

**Solution Implemented:** Migrated to PostgreSQL with OWASP's official schema

**Current Progress:**
- ✅ PostgreSQL 13.22 installed on Oracle Cloud
- ✅ OWASP schema initialized (8 tables)
- ✅ PostgreSQL JDBC driver mounted (postgresql-42.7.1.jar)
- ✅ First CVE load: 65,480 records (1999-2017)
- ✅ CPE extraction validated: 153,976 entries
- ⏳ Continuation load running: 2018-2025 CVEs (67% complete)

---

## Immediate Next Steps (When You Resume)

###  1. Check CVE Load Status

**Command:**
```bash
ssh -i "/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-05-08.key" opc@129.213.49.128 \
  "tail -50 /tmp/cve-load-postgres-continue.log"
```

**Expected Outcome:**
- ✅ **Success:** "✅ Log4Shell data loaded!" → Proceed to Step 2
- ❌ **Failure:** CVSS v4 errors continued → See "Troubleshooting" section

### 2. Verify Log4Shell CVEs in Database

**Command:**
```bash
ssh -i "/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-05-08.key" opc@129.213.49.128 \
  "PGPASSWORD='depcheck_update_2025' psql -h 127.0.0.1 -U depcheck_updater -d depcheck -c \"SELECT cve, cvssV3BaseScore FROM vulnerability WHERE cve LIKE 'CVE-2021-442%';\""
```

**Expected Output:**
```
       cve        | cvssV3BaseScore
------------------+-----------------
 CVE-2021-44228   | 10.0
 CVE-2021-44832   | 6.6
 CVE-2021-442XX   | X.X
```

**If 0 rows returned:** CVE load did not reach 2021 → See "Troubleshooting: Incomplete Load"

### 3. Validate Log4Shell Detection

**Command:**
```bash
# Copy validation script to Oracle
scp -i "/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-05-08.key" \
  "/Users/alpinro/Code Prjects/codequal/packages/agents/src/two-branch/scripts/validate-log4shell-detection.sh" \
  opc@129.213.49.128:/tmp/

# Run validation
ssh -i "/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-05-08.key" opc@129.213.49.128 \
  "source ~/.env && export NVD_API_KEY && /tmp/validate-log4shell-detection.sh"
```

**Expected Output:**
```
✅ VALIDATION PASSED
- Log4Shell (CVE-2021-44228) detected: ✅
- Exit code: 1 (expected, vulnerability found)
- Duration: ~30 seconds (with pre-warmed database)
```

**If validation passes:** ✅ **PRODUCTION READY** → Proceed to deployment

### 4. Deploy Production Infrastructure

See `PRODUCTION_DEPLOYMENT.md` (to be created) for:
- Daily CVE update cron job
- V9 Dependency-Check integration
- PostgreSQL connection pooling
- Redis caching layer

---

## Scripts Reference

### Oracle Cloud Scripts

**CVE Loading:**
```bash
/tmp/load-cve-postgres-fixed.sh       # Initial load (1999-2017) - COMPLETED
/tmp/continue-cve-load.sh             # Continuation load (2018-2025) - RUNNING
```

**Validation:**
```bash
/tmp/validate-log4shell-detection.sh  # Log4Shell detection test
```

**PostgreSQL JDBC Driver:**
```bash
/tmp/jdbc-drivers/postgresql-42.7.1.jar  # 1.1M driver file
```

### Database Access Commands

**Check CVE Count:**
```bash
ssh opc@129.213.49.128 "PGPASSWORD='depcheck_update_2025' psql -h 127.0.0.1 -U depcheck_updater -d depcheck -c 'SELECT COUNT(*) FROM vulnerability;'"
```

**Check CPE Count:**
```bash
ssh opc@129.213.49.128 "PGPASSWORD='depcheck_update_2025' psql -h 127.0.0.1 -U depcheck_updater -d depcheck -c 'SELECT COUNT(*) FROM cpeentry;'"
```

**Check Date Range:**
```bash
ssh opc@129.213.49.128 "PGPASSWORD='depcheck_update_2025' psql -h 127.0.0.1 -U depcheck_updater -d depcheck -c 'SELECT MIN(cve), MAX(cve) FROM vulnerability;'"
```

**Search for Specific CVE:**
```bash
ssh opc@129.213.49.128 "PGPASSWORD='depcheck_update_2025' psql -h 127.0.0.1 -U depcheck_updater -d depcheck -c \"SELECT * FROM vulnerability WHERE cve = 'CVE-2021-44228';\""
```

---

## Troubleshooting

### Scenario 1: CVE Load Failed (Connection Pool Exhausted)

**Symptoms:**
- Log shows: `NullPointerException: Cannot invoke "org.apache.commons.dbcp2.BasicDataSource.getConnection()"`
- Database has < 200,000 CVEs

**Solution: Run Another Continuation Load**
```bash
ssh opc@129.213.49.128 "/tmp/continue-cve-load.sh"
```

**Explanation:** OWASP Dependency-Check should skip already-loaded CVEs and continue from where it stopped.

### Scenario 2: Incomplete Load (CVSS v4 Blocker)

**Symptoms:**
- Log shows: `ValueInstantiationException: Cannot construct instance... CVSS v4`
- Database has CVEs but missing 2024-2025 range

**Options:**

**A. Accept Partial Database (Recommended):**
- If Log4Shell (2021) is loaded → Production ready for most use cases
- Missing only newest CVEs with CVSS v4 scores
- Dependency-Check 11.2.0+ may fix this

**B. Skip CVSS v4 CVEs:**
- Research: Can OWASP Dependency-Check skip specific CVE ranges?
- Alternative: Load CVEs in year ranges (2018-2023, skip 2024-2025)

**C. Upgrade Dependency-Check:**
- Check if version 11.2.0+ released with CVSS v4 support
- Rebuild analyzer:lang-java Docker image with new version

### Scenario 3: Log4Shell NOT Detected in Validation

**Symptoms:**
- CVE-2021-44228 in database ✅
- Validation script doesn't detect it ❌

**Debugging Steps:**

1. **Check if database is being used:**
```bash
# Run with verbose logging
docker run --rm \
  -v "/tmp/log4shell-test:/workspace:ro" \
  --network host \
  --add-host=host.docker.internal:127.0.0.1 \
  -v "/tmp/jdbc-drivers:/jdbc:ro" \
  -e CLASSPATH="/opt/dependency-check/lib/*:/jdbc/*" \
  analyzer:lang-java-v5.3-arm \
  dependency-check \
    --scan /workspace \
    --format JSON \
    --out /workspace/report.json \
    --connectionString "jdbc:postgresql://host.docker.internal:5432/depcheck" \
    --dbUser "depcheck_scanner" \
    --dbPassword "depcheck_scan_2025" \
    --dbDriverName "org.postgresql.Driver" \
    --dbDriverPath "/jdbc/postgresql-42.7.1.jar" \
    --log /workspace/debug.log \
    --disableNodeAudit
```

2. **Check database connection:**
```bash
# Verify scanner user has SELECT permissions
ssh opc@129.213.49.128 "PGPASSWORD='depcheck_scan_2025' psql -h 127.0.0.1 -U depcheck_scanner -d depcheck -c 'SELECT COUNT(*) FROM vulnerability;'"
```

3. **Check CPE matching:**
```bash
# Verify log4j-core:2.14.1 has CPE entry
ssh opc@129.213.49.128 "PGPASSWORD='depcheck_scan_2025' psql -h 127.0.0.1 -U depcheck_scanner -d depcheck -c \"SELECT * FROM cpeentry WHERE product = 'log4j';\""
```

### Scenario 4: PostgreSQL Connection Refused

**Symptoms:**
- Docker container can't connect to PostgreSQL
- Error: `Connection refused` or `Unknown host`

**Solutions:**

**A. Check PostgreSQL Running:**
```bash
ssh opc@129.213.49.128 "sudo systemctl status postgresql"
```

**B. Check pg_hba.conf:**
```bash
ssh opc@129.213.49.128 "sudo cat /var/lib/pgsql/data/pg_hba.conf | grep depcheck"
```

Expected:
```
host    depcheck        depcheck_updater    127.0.0.1/32            md5
host    depcheck        depcheck_scanner    127.0.0.1/32            md5
```

**C. Reload PostgreSQL Config:**
```bash
ssh opc@129.213.49.128 "sudo systemctl reload postgresql"
```

**D. Test Connection from Host:**
```bash
ssh opc@129.213.49.128 "PGPASSWORD='depcheck_update_2025' psql -h 127.0.0.1 -U depcheck_updater -d depcheck -c 'SELECT 1;'"
```

---

## Current Infrastructure Status

### Oracle Cloud (129.213.49.128)

**PostgreSQL Database:**
- Version: 13.22
- Database: depcheck
- Users: depcheck_updater (full), depcheck_scanner (read-only)
- Status: ✅ Running
- Data: ⏳ Loading (67% complete)

**Docker Image:**
- analyzer:lang-java-v5.3-arm (native ARM64)
- Includes: Dependency-Check 11.1.0, PMD, SpotBugs
- Registry: Oracle Container Registry

**JDBC Driver:**
- Path: /tmp/jdbc-drivers/postgresql-42.7.1.jar
- Size: 1.1M
- Status: ✅ Mounted and working

**Scripts:**
- /tmp/load-cve-postgres-fixed.sh
- /tmp/continue-cve-load.sh
- /tmp/validate-log4shell-detection.sh

---

## Key Facts to Remember

### PostgreSQL vs H2 Decision

**Why PostgreSQL?**
1. H2 corrupts on ARM64 (both emulated and native)
2. PostgreSQL officially supported by OWASP
3. Enterprise-grade stability
4. Better connection pooling
5. Remote monitoring capabilities

**Critical Distinction from Supabase Attempt:**
- **Supabase (failed):** Custom TypeScript CVE parsing → CPE extraction bugs
- **PostgreSQL + OWASP (working):** OWASP's battle-tested code → 153,976 CPE entries ✅

### Database Schema (8 Tables)

1. **vulnerability** - Core CVE records (65,480+ rows)
2. **cpeentry** - Software identification (153,976+ rows)
3. **reference** - CVE references
4. **software** - CVE-to-CPE mappings
5. **properties** - Database metadata
6. **cweentry** - Weakness enumeration
7. **knownexploited** - CISA KEV catalog
8. **cpeecosystemcache** - Ecosystem mappings

### Performance Expectations

**CVE Database Load:**
- First load (1999-2017): ~10 minutes → 65,480 CVEs
- Continuation (2018-2025): ~10-15 minutes → ~247,000 CVEs
- Total expected: 312,353 CVEs

**Vulnerability Scan (with pre-warmed DB):**
- Apache Kafka (3,472 files): ~30 seconds
- log4j-core pom.xml: ~10 seconds
- Cold start (first scan): +30 seconds (database query caching)

### Known Limitations

1. **CVSS v4 Parsing:** Dependency-Check 11.1.0 can't parse newest CVE format
   - Impact: Some 2024-2025 CVEs may fail to load
   - Workaround: --failOnCVSS 0 flag continues despite errors
   - Future: Version 11.2.0+ may add support

2. **Connection Pool Limits:** Large loads may exhaust connection pool
   - Symptom: NullPointerException on connection
   - Solution: Run continuation script (skips already-loaded CVEs)

3. **Incremental Loading:** Not yet confirmed if OWASP skips loaded CVEs
   - Testing: Current continuation load will validate
   - Alternative: Truncate and reload if necessary

---

## Documentation Files

### Created This Session

**Comprehensive:**
- `SESSION_2025_10_01_POSTGRESQL_MIGRATION.md` - Complete session details (7,000+ words)
- `NEXT_SESSION_QUICK_START.md` - This file

**To Update:**
- `README.md` - Add PostgreSQL architecture
- `LOG4SHELL_VALIDATION_RESULTS.md` - Update with PostgreSQL results
- `DEPENDENCY_CHECK_ARM64_DATABASE_ISSUES.md` - Document PostgreSQL solution

### To Create Next Session

**Production Deployment:**
- `PRODUCTION_DEPLOYMENT.md` - Daily cron job, V9 integration, monitoring
- `POSTGRESQL_OPERATIONS_GUIDE.md` - Backup, restore, troubleshooting
- `V9_DEPENDENCY_CHECK_INTEGRATION.md` - V9ToolOrchestrator integration

---

## Quick Copy-Paste Commands

### Check Current Status
```bash
ssh -i "/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-05-08.key" opc@129.213.49.128 << 'EOF'
echo "=== PostgreSQL Status ==="
sudo systemctl status postgresql | grep Active

echo ""
echo "=== CVE Database Status ==="
PGPASSWORD='depcheck_update_2025' psql -h 127.0.0.1 -U depcheck_updater -d depcheck -c "
  SELECT
    (SELECT COUNT(*) FROM vulnerability) as total_cves,
    (SELECT COUNT(*) FROM cpeentry) as total_cpe,
    (SELECT MIN(cve) FROM vulnerability) as oldest_cve,
    (SELECT MAX(cve) FROM vulnerability) as newest_cve,
    (SELECT COUNT(*) FROM vulnerability WHERE cve LIKE 'CVE-2021-442%') as log4shell_count;
"

echo ""
echo "=== CVE Load Logs ==="
if [ -f /tmp/cve-load-postgres-continue.log ]; then
  tail -20 /tmp/cve-load-postgres-continue.log
else
  echo "Continuation log not found (load may not have started)"
fi
EOF
```

### Run Log4Shell Validation
```bash
# Copy script
scp -i "/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-05-08.key" \
  "/Users/alpinro/Code Prjects/codequal/packages/agents/src/two-branch/scripts/validate-log4shell-detection.sh" \
  opc@129.213.49.128:/tmp/

# Execute validation
ssh -i "/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-05-08.key" opc@129.213.49.128 \
  "source ~/.env && export NVD_API_KEY && /tmp/validate-log4shell-detection.sh"
```

### Manual CVE Load (if needed)
```bash
ssh -i "/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-05-08.key" opc@129.213.49.128 \
  "/tmp/continue-cve-load.sh"
```

---

## Success Criteria

### Phase 1: Database Ready ✅ (95% Complete)
- [x] PostgreSQL installed and running
- [x] OWASP schema initialized
- [x] PostgreSQL JDBC driver working
- [x] First CVE load: 65,480 records
- [x] CPE extraction validated: 153,976 entries
- [ ] Full CVE load: 312,353 records (⏳ 67% complete)

### Phase 2: Log4Shell Validation (Next)
- [ ] CVE-2021-44228 in database
- [ ] Dependency-Check detects log4j-core:2.14.1
- [ ] Report shows CVSS 10.0 severity
- [ ] Exit code 1 (vulnerability found)

### Phase 3: Production Deployment (After Validation)
- [ ] Daily CVE update cron job
- [ ] V9ToolOrchestrator integration
- [ ] Redis caching layer
- [ ] Monthly Log4Shell regression test

---

## Important Reminders

### Do NOT

- ❌ Delete PostgreSQL database (contains 65,480+ CVEs, 153,976+ CPE entries)
- ❌ Modify pg_hba.conf without backup
- ❌ Run Dependency-Check without --failOnCVSS 0 (will fail on CVSS v4 errors)
- ❌ Use H2 database (fundamentally broken on ARM64)
- ❌ Write custom CVE parsing code (OWASP's code works perfectly)

### Do

- ✅ Check CVE load completion before starting validation
- ✅ Verify Log4Shell CVEs in database before testing detection
- ✅ Use --failOnCVSS 0 for all CVE loads
- ✅ Keep /tmp/jdbc-drivers/ mounted for all Dependency-Check runs
- ✅ Use depcheck_scanner user (read-only) for V9 integration

---

**Next Session Start:** Check CVE load status → Validate Log4Shell → Deploy to production

**Estimated Time to Production:** 30 minutes (if CVE load completed successfully)

**Blocker Risk:** Low (PostgreSQL stable, CVE load at 67%, CVSS v4 errors expected but manageable)

**Last Updated:** 2025-10-01 18:00 UTC (CVE load running)
