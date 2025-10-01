# Archived: Supabase CVE Scripts

**Status:** ❌ DEPRECATED - DO NOT USE

**Date Archived:** 2025-10-01

**Reason:** Switched to OWASP Dependency-Check instead of custom Supabase CVE matching

---

## Why These Scripts Were Archived

### Decision: Use OWASP Dependency-Check

After extensive testing on Oracle Cloud ARM64, we decided to use OWASP Dependency-Check (Docker-based) instead of maintaining a custom CVE database in Supabase.

**Key Findings:**
- ✅ Dependency-Check works despite H2 database errors (99.97% CVE coverage)
- ✅ Successfully detects Log4Shell (CVE-2021-44228) and other critical vulnerabilities
- ✅ Industry standard, battle-tested tool
- ✅ Lower maintenance burden than custom CVE matching

**Problems with Supabase Approach:**
- ❌ CPE extraction failed (TypeScript compilation caching issue)
- ❌ High maintenance burden (keeping CVE database synced with NVD)
- ❌ Custom vulnerability matching logic (unproven, complex)
- ❌ Not worth engineering effort vs proven Dependency-Check tool

---

## Archived Files

### initial-cve-load.ts
**Purpose:** Original CVE loader from NVD API v2.0

**Problem:** Did NOT extract CPE entries (required for dependency matching)

**Result:** Loaded 312,138 CVEs but all had NULL `cpe_entries` field

### nvd-direct-download.ts
**Purpose:** Fixed CVE loader with CPE extraction logic

**Problem:**
1. First version had incorrect API structure assumptions
2. Fixed version still produced NULL CPE entries (TypeScript caching issue)

**CPE Extraction Bug:**
```typescript
// WRONG (what we initially had):
item.configurations?.nodes?.forEach(node => { ... });

// CORRECT (what we fixed it to):
item.configurations?.forEach(config => {
  config.nodes?.forEach(node => { ... });
});
```

**Result:** Even after fix, database still had NULL CPE entries after 22-minute reload

### truncate-and-reload-cve.ts
**Purpose:** Orchestrate database truncation and reload

**Used:** Twice - both resulted in NULL CPE entries despite fix

**Logs:**
- First attempt: `/tmp/cve-reload.log`
- Second attempt (with fix): `/tmp/cve-reload-fixed.log`

### cleanup-cve-data.ts
**Purpose:** Old cleanup script (pre-2025-10-01)

**Superseded by:** `cleanup-supabase-cve.ts` (final cleanup script used on 2025-10-01)

### test-nvd-single-cve.ts
**Purpose:** Test NVD API response structure for single CVE (CVE-2021-44228)

**Findings:**
- Successfully extracted 385 CPE entries from Log4Shell
- Confirmed API structure is `configurations: [ { nodes: [...] } ]`
- Proved fix was correct but database still had NULL values

### verify-cve-database.ts
**Purpose:** Verify CVE database contents and CPE extraction

**Result:** Confirmed all 312,324 CVEs had NULL `cpe_entries` field

---

## What Replaced These Scripts

### Production Solution: OWASP Dependency-Check

**Pre-warming Script:**
```bash
# /usr/local/bin/prewarm-dependency-check.sh
# Cron: 0 2 * * * (daily at 2 AM)

docker run --rm \
  -v /var/lib/dependency-check-data:/usr/share/dependency-check/data:rw \
  analyzer:lang-java-v5.3-arm \
  dependency-check \
    --updateonly \
    --nvdApiKey "$NVD_API_KEY" \
    --data /usr/share/dependency-check/data \
    --failOnCVSS 0
```

**V9 Integration:**
```typescript
// src/two-branch/tools/java/dependency-check-tool.ts
async function runDependencyCheck(repoPath: string): Promise<Vulnerability[]> {
  const result = await execDocker({
    image: 'analyzer:lang-java-v5.3-arm',
    command: [
      'dependency-check',
      '--scan', '/workspace',
      '--format', 'JSON',
      '--data', '/data/depcheck',  // Pre-warmed database
      '--failOnCVSS', '0'
    ],
    volumes: [
      `${repoPath}:/workspace:ro`,
      '/var/lib/dependency-check-data:/data/depcheck:ro'
    ]
  });

  return parseDependencyCheckReport(result.stdout);
}
```

---

## Supabase CVE Table Status

**Table:** `cve_database` (312,324 CVEs)

**Action Taken (2025-10-01):** TRUNCATED (freed ~298 MB)

**Why Keep Schema:**
- Table schema preserved for potential future use
- Can be repurposed for CVE metadata caching if needed
- Minimal cost to keep empty table

**Why NOT Keep Data:**
- Incomplete (NULL CPE entries)
- High maintenance (NVD sync required)
- Not used by Dependency-Check approach

---

## Lessons Learned

### 1. Industry Standard Tools > Custom Solutions
- OWASP Dependency-Check is widely trusted and battle-tested
- Custom CVE matching logic would require ongoing maintenance
- Not worth engineering effort when proven tool works

### 2. TypeScript Compilation Caching Can Hide Bugs
- Fixed source code but compiled code still had old logic
- Would require full rebuild and careful cache clearing
- Time better spent on proven solution

### 3. ARM64 H2 Database Issues Are Non-Blocking
- Dependency-Check works despite ~100 database errors
- 99.97% CVE coverage is sufficient for production
- `--failOnCVSS 0` flag allows analysis to continue

---

## References

**Documentation:**
- `docs/dependency_check/DEPENDENCY_CHECK_ARM64_DATABASE_ISSUES.md`
- `docs/dependency_check/SESSION_2025_10_01_DEPENDENCY_CHECK_PRODUCTION_READY.md`
- `docs/dependency_check/DEPENDENCY_CHECK_PREWARM_SETUP.md`

**Test Logs:**
- `/tmp/cve-reload.log` - First reload attempt (wrong extraction)
- `/tmp/cve-reload-fixed.log` - Second reload attempt (still failed)
- `/tmp/depcheck-test-output.log` - Oracle Cloud ARM64 test (successful)

**Production Scripts:**
- `scripts/prewarm-dependency-check.sh` - Daily CVE update cron job
- `scripts/cleanup-supabase-cve.ts` - Final cleanup script (executed 2025-10-01)

---

## Do NOT Use These Scripts

**If you need CVE functionality:**
1. Use OWASP Dependency-Check (see docs/dependency_check/)
2. Deploy daily pre-warming cron job
3. Integrate into V9ToolOrchestrator

**If you want to understand why we switched:**
1. Read `docs/dependency_check/SESSION_2025_10_01_DEPENDENCY_CHECK_PRODUCTION_READY.md`
2. Review test logs (especially `/tmp/depcheck-test-output.log`)
3. Check ARM64 database issues documentation

---

**Last Updated:** 2025-10-01
**Archived By:** CodeQual DevOps Team
**Status:** Permanently Deprecated ❌
