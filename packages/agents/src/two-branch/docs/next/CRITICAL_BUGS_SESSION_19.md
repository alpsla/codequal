# Critical Bugs Found - Session 19 Spring PetClinic Test

**Date**: November 8, 2025  
**Test**: Spring PetClinic (Java)  
**Status**: 🔴 **CRITICAL ISSUES FOUND**

---

## 🐛 BUG #1: Learning Links for Tool Instead of Rule

### Problem
Report shows generic tool links instead of specific rule-based educational resources.

**Current** (WRONG):
```markdown
**Semgrep** (1 occurrence):
- [🎥 YouTube Tutorial](https://www.youtube.com/results?search_query=Java%20semgrep%20tutorial)
```

**Expected** (CORRECT):
```markdown
**SQL Injection** (1 occurrence):
- [OWASP SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [CWE-89: SQL Injection](https://cwe.mitre.org/data/definitions/89.html)
```

### Root Cause
The educational resources function is generating links based on tool name, not the specific rule ID.

### Fix Location
`src/two-branch/report/educational-resources.ts` or `ai-enrichment.ts`

---

## 🐛 BUG #2: Checkstyle Not Running

### Problem
Checkstyle tool not included in 'standard' analysis mode.

**Tools Ran**: PMD, Semgrep, Dependency-Check  
**Missing**: Checkstyle, SpotBugs

### Root Cause
Test uses 'standard' mode which only includes:
- CODE_QUALITY: ✅ (PMD)
- SECURITY: ✅ (Semgrep)
- DEPENDENCY_SCAN: ✅ (Dependency-Check)
- STYLE_LINT: ❌ (Checkstyle) - Only in 'thorough' mode
- ADVANCED: ❌ (SpotBugs) - Only in 'complete' mode

### Fix
Change test to use 'thorough' mode for Checkstyle or 'complete' for all tools.

**File**: `tests/integration/run-single-repo-test.ts` line 177, 191

---

## 🐛 BUG #3: SpotBugs Not Running

### Problem
SpotBugs not included in test execution.

### Root Cause
SpotBugs is in ADVANCED category, only runs in 'complete' mode.

### Fix
Use 'complete' analysis mode AND set `ENABLE_SPOTBUGS=true`.

**Note**: SpotBugs requires compilation, adds 1-2 minutes.

---

## 🐛 BUG #4: Dependency-Check Too Slow (181.8s)

### Problem
Dependency-Check took 181.8s (should be ~12s with PostgreSQL).

### Expected Performance
- With PostgreSQL: 11.8s (tested Nov 7)
- Without PostgreSQL: 30+ minutes (downloads NVD data)

### Investigation Needed
1. Check if PostgreSQL connection is being used
2. Verify environment variables are set:
   - `DEPCHECK_DB_HOST=localhost`
   - `DEPCHECK_DB_NAME=depcheck`
   - `DEPCHECK_DB_USER=depcheck_scanner`
   - `DEPCHECK_DB_PASSWORD=depcheck123`
3. Check dependency-check logs for database connection

### Possible Causes
- Environment variables not loaded
- PostgreSQL service not running
- Fallback to file-based database

---

## 🐛 BUG #5: Manifest Missing Critical Data

### Problem
Manifest file lacks essential information for IDE integration.

**Current Structure**:
```json
{
  "filename": "group-semgrep-high-semgrep-fix.json",
  "rule": "semgrep",  // ❌ Generic, not specific rule
  "title": "semgrep",  // ❌ Tool name, not issue title
  "description": "This issue was detected by semgrep...",  // ❌ Generic
  "occurrences": 3,  // ✅ Good
  "autoFixable": false  // ❌ Should be true
}
```

**Missing**:
- ❌ Specific rule ID (e.g., "java.lang.security.audit.sql-injection")
- ❌ File locations where the issue appears
- ❌ Line numbers for each occurrence
- ❌ Actual issue title (user-friendly)
- ❌ Attachment file content or reference

**Expected Structure**:
```json
{
  "filename": "group-sql-injection-high-semgrep-fix.json",
  "rule": "java.lang.security.audit.sql-injection",
  "title": "SQL Injection Vulnerability",
  "description": "User input is directly concatenated into SQL query...",
  "occurrences": 3,
  "autoFixable": true,
  "locations": [
    { "file": "src/main/java/UserController.java", "line": 45 },
    { "file": "src/main/java/OrderService.java", "line": 123 },
    { "file": "src/main/java/ProductDao.java", "line": 67 }
  ],
  "fixFile": {
    "url": "attachments/group-sql-injection-high-semgrep-fix.json",
    "preview": "Replace string concatenation with PreparedStatement..."
  }
}
```

### Root Cause
The manifest generation logic is not including:
1. Specific rule IDs (using tool name instead)
2. File location arrays
3. Proper fix file references

### Fix Location
`src/two-branch/analyzers/v9-grouped-report-formatter.ts` - IDE fix file generation

---

## 🐛 BUG #6: Auto-Fix Count Discrepancy

### Problem
PR Comment says "4/5 issues" but footer says "Total auto-fixable: 5".

### Investigation
The canAutoFix() function was updated to return true for Semgrep, but the manifest shows `"autoFixable": false`.

### Possible Causes
1. Manifest generation happens BEFORE canAutoFix() check
2. Different logic used for manifest vs. report
3. Manifest uses individual issue's `autoFixable` property (not group-based logic)

---

## Priority Fix Order

1. **HIGH**: BUG #5 - Manifest missing data (blocks IDE integration)
2. **HIGH**: BUG #4 - Dependency-Check slow (performance issue)
3. **MEDIUM**: BUG #2 - Enable Checkstyle (use 'thorough' mode)
4. **MEDIUM**: BUG #1 - Rule-specific learning links
5. **LOW**: BUG #3 - SpotBugs (optional, adds time)
6. **LOW**: BUG #6 - Auto-fix count consistency

---

## Verification Checklist

After fixes:
- [ ] Checkstyle runs and finds issues
- [ ] Dependency-Check completes in < 15s
- [ ] SpotBugs runs (if enabled)
- [ ] Manifest includes file locations for each issue
- [ ] Manifest shows correct rule IDs
- [ ] Learning links are rule-specific
- [ ] Auto-fix count consistent across report
- [ ] 100% auto-fixable shown correctly

---

*Discovered during Session 19 Spring PetClinic test review on November 8, 2025.*

