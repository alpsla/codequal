# Bug #34 Testing Guide: Lazy Loading Manifest

**Date**: October 20, 2025  
**Bug**: #34 - IDE Integration Architecture  
**Implementation**: Lazy loading with 1 manifest file

---

## 🎯 **What We're Testing**

Bug #34 changed the IDE file generation from:
- ❌ **Before**: 67 individual files (user loads each manually)
- ✅ **After**: 1 manifest file (critical embedded + lazy URLs)

---

## ✅ **Test Checklist**

### **Test 1: File Count**
**Expected**: 4 files total
- `all-issues-manifest.json` (user downloads this)
- `high-issues.json` (uploaded to cloud)
- `medium-issues.json` (uploaded to cloud)
- `low-issues.json` (uploaded to cloud)

**Command**:
```bash
ls -la /tmp/v9-reports/attachments/

# Expected output:
all-issues-manifest.json  (1.0 MB)
high-issues.json          (500 KB)
medium-issues.json        (5.0 MB)
low-issues.json           (25 MB)
```

**Pass Criteria**: Exactly 4 files (not 67!)

---

### **Test 2: Manifest Has Embedded Critical**
**Expected**: Critical issues are IN the manifest, not just a URL

**Command**:
```bash
jq '.critical.groups | length' /tmp/v9-reports/attachments/all-issues-manifest.json

# Expected output: 10 (or whatever number of critical groups)
# NOT: null or 0
```

**Pass Criteria**: Critical groups array has content

---

### **Test 3: Manifest Has Lazy Load URLs**
**Expected**: high/medium/low have URLs, not embedded data

**Command**:
```bash
jq '.lazy_load' /tmp/v9-reports/attachments/all-issues-manifest.json

# Expected output:
{
  "high": {
    "url": "https://gist.githubusercontent.com/.../high-issues.json",
    "groups": 9,
    "issues": 9000,
    "estimated_size_kb": 500,
    "download_after": "user_starts_fixing_critical"
  },
  "medium": {
    "url": "https://gist.../medium-issues.json",
    ...
  },
  "low": {
    "url": "https://gist.../low-issues.json",
    ...
  }
}
```

**Pass Criteria**: 
- ✅ URLs are present
- ✅ `download_after` strategy is defined
- ✅ Metadata (groups, issues, size) is correct

---

### **Test 4: Download Strategy**
**Expected**: Manifest specifies lazy loading strategy

**Command**:
```bash
jq '.download_strategy' /tmp/v9-reports/attachments/all-issues-manifest.json

# Expected output:
{
  "type": "lazy-loading",
  "description": "Critical issues embedded for instant start. High/Medium/Low downloaded in background.",
  "auto_download": true,
  "parallel": false
}
```

**Pass Criteria**: Strategy clearly defines lazy loading behavior

---

### **Test 5: Manifest Size**
**Expected**: ~1 MB (large because critical is embedded)

**Command**:
```bash
ls -lh /tmp/v9-reports/attachments/all-issues-manifest.json | awk '{print $5}'

# Expected: 1.0M or similar (not 10K!)
```

**Pass Criteria**: 
- ✅ Size is ~1 MB (not tiny like 10 KB)
- ✅ This proves critical issues are embedded

---

### **Test 6: Critical Issues Content**
**Expected**: First critical group has full issue data

**Command**:
```bash
jq '.critical.groups[0]' /tmp/v9-reports/attachments/all-issues-manifest.json | head -30

# Expected output: Full issue group with:
{
  "id": 1,
  "rule": "unsafe-reflection",
  "severity": "critical",
  "category": "Security",
  "fix": { ... },
  "locations": [
    {
      "file": "server-common/src/.../Utils.java",
      "line": 435,
      "snippet": "Class.forName(...)"
    },
    ...
  ]
}
```

**Pass Criteria**: 
- ✅ Full fix pattern present
- ✅ All locations with code snippets
- ✅ Not just metadata

---

### **Test 7: Cloud Files Are Complete**
**Expected**: high/medium/low files have full issue data (for upload)

**Command**:
```bash
# Check high-issues.json structure
jq '{
  version,
  metadata,
  groups_count: (.groups | length),
  first_group: .groups[0]
}' /tmp/v9-reports/attachments/high-issues.json | head -20

# Expected: Same structure as critical, full issue data
```

**Pass Criteria**: Cloud files are complete and ready for upload

---

## 🎯 **Automated Test Script**

Run this after test completes:

```bash
# On Oracle Cloud
ssh -i '$SSH_KEY' opc@129.213.49.128 'bash -s' << 'EOF'
ATTACHMENTS_DIR="/tmp/v9-reports/attachments"

echo "🔍 Bug #34 Verification"
echo ""

# Test 1: File count
FILE_COUNT=$(ls "$ATTACHMENTS_DIR"/*.json 2>/dev/null | wc -l | tr -d ' ')
echo "Files: $FILE_COUNT (expected: 4)"

# Test 2: Manifest exists
if [ -f "$ATTACHMENTS_DIR/all-issues-manifest.json" ]; then
  echo "✅ Manifest exists"
  
  # Test 3: Critical embedded
  CRITICAL_COUNT=$(jq '.critical.groups | length' "$ATTACHMENTS_DIR/all-issues-manifest.json")
  echo "✅ Critical groups embedded: $CRITICAL_COUNT"
  
  # Test 4: Lazy load URLs
  HIGH_URL=$(jq -r '.lazy_load.high.url' "$ATTACHMENTS_DIR/all-issues-manifest.json")
  echo "✅ High URL: $HIGH_URL"
  
  # Test 5: Manifest size
  SIZE=$(ls -lh "$ATTACHMENTS_DIR/all-issues-manifest.json" | awk '{print $5}')
  echo "✅ Manifest size: $SIZE"
  
  # Test 6: Show structure
  echo ""
  echo "📦 Manifest Structure:"
  jq '{
    version,
    critical_groups: (.critical.groups | length),
    lazy_load_priorities: (.lazy_load | keys)
  }' "$ATTACHMENTS_DIR/all-issues-manifest.json"
else
  echo "❌ Manifest not found"
fi
EOF
```

---

## 🚨 **Common Issues to Watch For**

### **Issue 1: Still Generating 67 Files**
**Symptom**: `ls attachments/*.json | wc -l` returns 67  
**Cause**: Old code still running  
**Fix**: Ensure latest code is uploaded

### **Issue 2: Manifest Only Has Metadata**
**Symptom**: Manifest is 10 KB, critical is not embedded  
**Cause**: Critical issues not being added to manifest  
**Fix**: Check line 950 in test file: `critical: criticalFiles.length > 0 ? combinePriorityFiles(criticalFiles) : { groups: [] }`

### **Issue 3: No Lazy Load URLs**
**Symptom**: `jq '.lazy_load'` returns null  
**Cause**: lazy_load section not generated  
**Fix**: Check line 952-974 in test file

### **Issue 4: URLs Are Wrong**
**Symptom**: URLs point to `GIST_ID` placeholder  
**Cause**: `ATTACHMENT_BASE_URL` env var not set  
**Fix**: This is expected for now (will be replaced with real URLs after upload)

---

## 📊 **Expected Output Example**

### **Manifest File Structure**:
```json
{
  "version": "3.0",
  "metadata": {
    "repository": "apache/kafka",
    "pr_number": 17620,
    "commit_sha": "e00be57...",
    "total_issues": 524586,
    "total_groups": 67,
    "generated_at": "2025-10-20T17:30:00Z"
  },
  "download_strategy": {
    "type": "lazy-loading",
    "description": "Critical issues embedded for instant start...",
    "auto_download": true,
    "parallel": false
  },
  "critical": {
    "version": "3.0",
    "metadata": {
      "total_groups": 10,
      "total_occurrences": 120
    },
    "groups": [
      {
        "id": 1,
        "rule": "unsafe-reflection",
        "severity": "critical",
        "category": "Security",
        "fix": {
          "pattern": "Remove unsafe reflection usage",
          "confidence": "high",
          "recommended_code": "..."
        },
        "locations": [
          {
            "file": "server-common/src/main/java/Utils.java",
            "line": 435,
            "column": 12,
            "snippet": "Class.forName(className);",
            "category": "NEW"
          }
        ]
      }
      // ... 9 more critical groups
    ]
  },
  "lazy_load": {
    "high": {
      "url": "https://gist.githubusercontent.com/codequal-bot/abc123/raw/high-issues.json",
      "groups": 9,
      "issues": 9451,
      "estimated_size_kb": 512,
      "download_after": "user_starts_fixing_critical"
    },
    "medium": {
      "url": "https://gist.../medium-issues.json",
      "groups": 20,
      "issues": 58442,
      "estimated_size_kb": 5120,
      "download_after": "high_loaded"
    },
    "low": {
      "url": "https://gist.../low-issues.json",
      "groups": 28,
      "issues": 456573,
      "estimated_size_kb": 25600,
      "download_after": "medium_loaded"
    }
  }
}
```

---

## ✅ **Success Criteria Summary**

| Test | Expected | Command |
|------|----------|---------|
| File count | 4 files | `ls attachments/*.json \| wc -l` |
| Manifest exists | Yes | `ls attachments/all-issues-manifest.json` |
| Critical embedded | 10+ groups | `jq '.critical.groups \| length'` |
| Lazy URLs present | 3 URLs | `jq '.lazy_load \| keys'` |
| Manifest size | ~1 MB | `ls -lh \| grep manifest` |
| Download strategy | lazy-loading | `jq '.download_strategy.type'` |

**All 6 tests must pass** ✅

---

## 🎯 **Next Steps After Verification**

### **If All Tests Pass**
1. ✅ Bug #34 is VERIFIED FIXED
2. ✅ Proceed with cloud upload testing (GitHub Gist)
3. ✅ Test IDE integration (download manifest + lazy load)

### **If Any Test Fails**
1. ❌ Identify which test failed
2. ❌ Check test output for specific issue
3. ❌ Fix code and re-test

---

**Run verification after test completes**: `bash /tmp/verify-bug34.sh`

