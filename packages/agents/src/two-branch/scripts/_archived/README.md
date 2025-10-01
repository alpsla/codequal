# Archived CVE Scripts

## Why These Scripts Were Archived

These scripts were part of the original Dependency-Check integration approach, which encountered ARM64 H2 database corruption issues.

### Archived Files:

**1. `initial-cve-load.ts`** (Deprecated: 2025-09-30)
- **Original Purpose**: Download NVD data via Dependency-Check Docker → Upload to Supabase
- **Problem**: Dependency-Check uses H2 database which corrupts on ARM64
- **Errors Encountered**:
  - H2 database corruption: `MVStoreException: Reading from file failed`
  - Null pointer exceptions in H2 SQL parsing
  - Connection pool errors on ARM64 architecture
- **Replaced By**: `nvd-direct-download.ts` (bypasses Dependency-Check entirely)

**2. `verify-supabase-connection.ts`** (Deprecated: 2025-09-30)
- **Original Purpose**: Pre-deployment validation for Supabase connection
- **Status**: Functionality merged into main scripts
- **Replaced By**: Built-in validation in `nvd-direct-download.ts`

## Current Approach (NVD Direct API)

**Active Script**: `nvd-direct-download.ts`

**Why It's Better**:
```
Old Approach (BROKEN):
NVD API → Dependency-Check → H2 Database → Export JSON → Parse → Supabase
          ↑                   ↑
          Docker              ARM64 corruption issues

New Approach (WORKING):
NVD API → TypeScript Transform → Supabase
          ↑
          No database, no Docker, no corruption
```

**Advantages**:
- ✅ No H2 database (no ARM64 issues)
- ✅ Direct NVD API access (official source)
- ✅ TypeScript transformation (type-safe)
- ✅ Retry logic with exponential backoff
- ✅ Resumable (uses upsert, not insert)
- ✅ 312K CVEs in ~20 minutes

## If You Need To Reference These Files

These files are kept for historical reference only. Do NOT use them for production.

If you encounter similar issues, refer to:
- `nvd-direct-download.ts` - Current working implementation
- `cleanup-cve-data.ts` - Database cleanup utility
- Migration: `scheduler/migrations/001_create_cve_tables.sql`

## Related Documentation

- NVD API v2.0: https://nvd.nist.gov/developers/vulnerabilities
- Supabase Integration: `../../scheduler/tasks/cve-update-task.ts`
- Oracle A1.Flex Issues: See V9_CRITICAL_KNOWLEDGE_BASE.md
