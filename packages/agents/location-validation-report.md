# Location Validation Report

## Summary

- **Total Issues:** 4
- **Valid Locations:** 0 (0%)
- **File Not Found:** 4
- **Line Not Found:** 0
- **Content Mismatch:** 0
- **Average Confidence:** 0%

## Detailed Results

### ❌ Invalid Locations (4)

- **Hardcoded Database Credentials** (critical)
  - File: `src/config/database.ts:15`
  - Reason: File does not exist: src/config/database.ts
  - Confidence: 0%
- **SQL Injection Vulnerability** (high)
  - File: `src/api/users.ts:45`
  - Reason: File does not exist: src/api/users.ts
  - Confidence: 0%
- **Memory Leak in Cache Service** (medium)
  - File: `src/services/cache.ts:89`
  - Reason: File does not exist: src/services/cache.ts
  - Confidence: 0%
- **Unused Import** (low)
  - File: `src/utils/helpers.ts:3`
  - Reason: File does not exist: src/utils/helpers.ts
  - Confidence: 0%

## Recommendations

⚠️ **Less than 50% of locations are valid.** Consider:
- Using the LocationClarifier service to find real locations
- Updating DeepWiki prompts to emphasize exact location requirements
- Implementing fallback location detection using code search

⚠️ **4 files not found.** Possible causes:
- Repository structure has changed
- Files are in different branch
- Incorrect file paths returned by DeepWiki

