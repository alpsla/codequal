# V9 Cleanup Policy

## Overview

The V9 architecture includes comprehensive cleanup mechanisms to ensure no analysis artifacts persist after report delivery. This prevents data accumulation, protects user privacy, and maintains system performance.

## What Gets Cleaned

### 1. Repository Data
- Cloned repository directories (`/tmp/*-repo`)
- Git metadata (`.git` directories)
- Checked out branches and working trees

### 2. Report Artifacts
- Markdown reports (`*.md`)
- IDE fix files (`*-fix-*.json`)
- Manifest file (`all-issues-manifest.json`)
- Location attachments

### 3. Temporary Data
- Tool output files
- Intermediate analysis results
- Cached data (when TTL expires)

## Cleanup Configuration

### Default Settings (Production)
```typescript
{
  cleanupAfterDelivery: true,      // ✅ Auto-cleanup enabled
  cleanupDelaySeconds: 300,         // 5 minutes (allows download time)
  keepSuccessfulReports: false,    // Don't keep reports
  maxReportAge: 86400,             // 24 hours for manual cleanup
  excludePaths: []                 // No exclusions
}
```

### Development/Testing Settings
```typescript
{
  cleanupAfterDelivery: false,     // ❌ Keep files for debugging
  cleanupDelaySeconds: 0,          // Immediate (when enabled)
  keepSuccessfulReports: true,     // Keep successful reports
  maxReportAge: 604800,            // 7 days
  excludePaths: ['/tmp/test-outputs'] // Don't clean test outputs
}
```

## Cleanup Lifecycle

### Automatic Cleanup Flow
```
Analysis Complete
   ↓
Report Generated
   ↓
Report Delivered to User
   ↓
Wait 5 minutes (download time)
   ↓
Clean All Artifacts
   ↓
Log Cleanup Results
   ↓
Done ✓
```

### Manual Cleanup
```typescript
const cleanup = new V9CleanupService(config);

// Immediate cleanup
await cleanup.cleanupAfterReport(analysisId, {
  repository: repoPath,
  outputDir: outputPath,
  ideFixFilesDir: outputPath
});

// Scheduled cleanup
cleanup.scheduleCleanup(analysisId, targets);
```

## Safety Mechanisms

### Path Validation
The cleanup service validates all paths before deletion:

**Allowed Paths:**
- `/tmp/*`
- `/var/tmp/*`
- Working directory subdirectories

**Blocked Paths (Will Never Clean):**
- `/` (root)
- `/home`, `/Users`
- `/usr`, `/etc`, `/var`, `/bin`, `/sbin`, `/opt`
- Any path in `excludePaths` configuration

### Multi-Method Cleanup
Cleanup attempts multiple methods to handle permission issues:

1. **Standard removal** - Node.js `fs.unlinkSync()` and `fs.rmdirSync()`
2. **Sudo removal** - `sudo rm -rf` (Linux/macOS only)
3. **Git clean** - `git clean -fdx` (for Git repositories)

If all methods fail, logs warning but continues (non-fatal).

## Integration

### V9PRAnalyzer
```typescript
const analyzer = new V9PRAnalyzer({
  cleanupAfterDelivery: true,
  cleanupDelaySeconds: 300
});

const result = await analyzer.analyzePR(request);
// Cleanup scheduled automatically after report delivery
```

### Test Scripts
```typescript
// Disable cleanup for testing
const analyzer = new V9PRAnalyzer({
  cleanupAfterDelivery: false
});

// Or use custom delay
const analyzer = new V9PRAnalyzer({
  cleanupDelaySeconds: 10 // 10 seconds for quick tests
});
```

## Cleanup Results

The cleanup service returns detailed results:

```typescript
interface CleanupResult {
  success: boolean;
  cleaned: {
    repositories: number;      // Number of repos cleaned
    reports: number;           // Number of .md files cleaned
    ideFixFiles: number;       // Number of fix files cleaned
    manifests: number;         // Number of manifest files cleaned
    totalSizeMB: number;       // Total space freed
  };
  errors: string[];            // Any errors encountered
  duration: number;            // Cleanup duration (ms)
}
```

**Example Output:**
```
🧹 Starting cleanup for analysis: spring-petclinic-pr950-1761826239759
   Config: cleanupAfterDelivery=true, delay=300s
   ⏳ Waiting 300s before cleanup...
   🗂️  Cleaning repository: /tmp/spring-petclinic-repo
   ✅ Cleanup successful (standard)
   📄 Cleaning report outputs: /tmp/v9-reports/spring-petclinic
   🔧 Cleaning IDE fix files: /tmp/v9-reports/spring-petclinic

   ✅ Cleanup complete:
      Repositories: 1
      Reports: 1
      IDE Fix Files: 29
      Manifests: 1
      Total Size Freed: 156.42 MB
```

## Monitoring

### Cleanup Logs
All cleanup operations are logged with timestamps:
- Start/end times
- Files/directories cleaned
- Size freed
- Any errors or warnings

### Metrics Tracked
- Number of cleanups performed
- Average cleanup duration
- Total space freed
- Cleanup failure rate

## Best Practices

### For Production
1. ✅ **Always enable** `cleanupAfterDelivery: true`
2. ✅ **Use 5-minute delay** to allow report downloads
3. ✅ **Monitor cleanup logs** for failures
4. ✅ **Set alerts** for cleanup errors

### For Development
1. ✅ **Disable cleanup** when debugging: `cleanupAfterDelivery: false`
2. ✅ **Keep test outputs** in excluded paths
3. ✅ **Use shorter delays** for faster iteration
4. ✅ **Manually clean** old test files periodically

### For CI/CD
1. ✅ **Enable immediate cleanup** after tests: `cleanupDelaySeconds: 0`
2. ✅ **Keep artifacts** for failed builds: `keepSuccessfulReports: false`
3. ✅ **Clean old artifacts** before new runs
4. ✅ **Verify cleanup** in CI pipeline

## Troubleshooting

### Cleanup Fails with Permission Errors
**Symptom:** Cleanup logs show "Standard cleanup failed: EACCES"

**Solution:**
1. Check that Docker volumes are mounted with correct permissions
2. Ensure user has write access to `/tmp` directory
3. Try running with sudo (Linux/macOS)
4. Check `excludePaths` configuration

### Reports Not Being Cleaned
**Symptom:** Old reports accumulate in output directory

**Solution:**
1. Verify `cleanupAfterDelivery: true` in configuration
2. Check that `maxReportAge` is appropriate (default: 24 hours)
3. Ensure cleanup service is properly integrated
4. Run manual cleanup: `cleanup.cleanOldReports(outputDir, maxAgeSeconds)`

### Cleanup Takes Too Long
**Symptom:** Cleanup duration > 30 seconds

**Solution:**
1. Check for large repository directories (reduce clone depth)
2. Verify disk I/O performance
3. Consider parallel cleanup (multiple background processes)
4. Monitor for stuck cleanup processes

## Environment Variables

Control cleanup behavior via environment:

```bash
# Disable cleanup for debugging
export CLEANUP_DISABLED=true

# Set custom delay
export CLEANUP_DELAY_SECONDS=60

# Keep successful reports
export CLEANUP_KEEP_SUCCESSFUL=true

# Set max report age (seconds)
export CLEANUP_MAX_REPORT_AGE=172800  # 2 days
```

## Related Documentation

- [V9 Architecture Overview](/V9-SYSTEM-OVERVIEW.md)
- [Smart Cache Management](/src/standard/docs/architecture/SMART_CACHE_MANAGEMENT.md)
- [Repository Manager](/src/two-branch/services/v9-repository-manager.ts)
- [Cleanup Service API](/src/two-branch/services/v9-cleanup-service.ts)

---

**Last Updated:** 2025-10-30
**Version:** 1.0.0
**Status:** Production Ready ✅
