#!/bin/bash
# Generate a test bundle with sample attachment files for local review

set -e

echo "🎁 Creating Test Bundle for Local Review"
echo "=========================================="
echo ""

# Create test directory
TEST_DIR="/tmp/codequal-test-bundle"
ATTACHMENTS_DIR="$TEST_DIR/attachments"
rm -rf "$TEST_DIR"
mkdir -p "$ATTACHMENTS_DIR"

echo "📁 Created directory: $TEST_DIR"

# Copy the sample files we already created
cp "/Users/alpinro/Code Prjects/codequal/reports/SAMPLE-group-indentationcheck-cursor-fix.json" \
   "$ATTACHMENTS_DIR/group-com-puppycrawl-tools-checkstyle-checks-indentation-indentationcheck-low-checkstyle-cursor-fix.json"

cp "/Users/alpinro/Code Prjects/codequal/reports/SAMPLE-group-unsafe-reflection-cursor-fix.json" \
   "$ATTACHMENTS_DIR/group-java-lang-security-audit-unsafe-reflection-unsafe-reflection-high-semgrep-cursor-fix.json"

cp "/Users/alpinro/Code Prjects/codequal/reports/SAMPLE-locations-security-critical.json" \
   "$ATTACHMENTS_DIR/group-java-lang-security-audit-command-injection-process-builder-command-injection-process-builder-critical-semgrep-locations.json"

echo "✅ Copied 3 sample attachment files"

# Copy the report
cp "/Users/alpinro/Code Prjects/codequal/reports/v9-BUG28-FIXED-FINAL-REPORT.md" \
   "$TEST_DIR/v9-grouped-report.md"

echo "✅ Copied report markdown"

# Create a simple index
cat > "$TEST_DIR/README.md" << 'EOF'
# CodeQual Test Bundle - Local Review

## 📦 Contents

### Main Report
- `v9-grouped-report.md` - Complete analysis report (173 KB, 5020 lines)

### Attachment Files (3 samples)

#### 1. Auto-Fixable Style Issue (Low Severity)
**File**: `attachments/group-com-puppycrawl-tools-checkstyle-checks-indentation-indentationcheck-low-checkstyle-cursor-fix.json`
- **Rule**: IndentationCheck  
- **Occurrences**: 371,129 files  
- **Auto-fixable**: Yes (safe batch-apply)  
- **Tool**: CheckStyle  
- **Fix Time**: ~3 minutes with google-java-format

#### 2. Security Issue (High Severity)
**File**: `attachments/group-java-lang-security-audit-unsafe-reflection-unsafe-reflection-high-semgrep-cursor-fix.json`
- **Rule**: Unsafe Reflection (RCE risk)  
- **Occurrences**: 9 files  
- **Auto-fixable**: No (requires manual review)  
- **Tool**: Semgrep  
- **Risk**: Remote Code Execution

#### 3. Location-Only Data (Critical Severity)
**File**: `attachments/group-java-lang-security-audit-command-injection-process-builder-command-injection-process-builder-critical-semgrep-locations.json`
- **Rule**: Command Injection  
- **Occurrences**: 2 files  
- **Format**: Locations only (no fix pattern)  
- **Tool**: Semgrep

---

## 🔍 How to Review

### 1. Check JSON Structure
```bash
# View formatted JSON
cat attachments/*.json | jq '.' | less
```

### 2. Validate Required Fields
Each cursor-fix file should have:
- `version`: "1.0"
- `group_id`: Unique identifier
- `rule`: Tool-specific rule name
- `severity`: critical | high | medium | low
- `description`: Human-readable explanation
- `fix_pattern`: Object with type, example, instructions
- `locations`: Array of affected files
- `metadata`: Stats and auto-apply flags

### 3. Test IDE Integration (Mock)
```typescript
// Pseudo-code for IDE plugin
const fixFile = JSON.parse(fs.readFileSync('attachments/group-...json'));

if (fixFile.metadata.safe_auto_apply) {
  // Batch apply to all locations
  fixFile.locations.forEach(loc => {
    applyFix(loc.file, loc.line, fixFile.fix_pattern);
  });
} else {
  // Show manual review UI
  showSecurityWarning(fixFile);
}
```

### 4. Verify Links in Report
The main report should reference attachments like:
```markdown
[Fix Group 1](attachments/group-...-cursor-fix.json)
[View All Locations](attachments/group-...-locations.json)
```

These links should work if:
- Files are in same directory structure
- Report and attachments are bundled together
- Relative paths are preserved

---

## ✅ Validation Checklist

- [ ] All 3 JSON files are valid (can be parsed)
- [ ] Required fields present in each file
- [ ] Code snippets are included in `locations` array
- [ ] Fix patterns have before/after examples
- [ ] `safe_auto_apply` flag is accurate
- [ ] File sizes are reasonable (< 10 MB each)
- [ ] Report links match actual file names

---

## 🚀 Next Steps

Once validated:
1. ✅ **This Week**: Use bundle approach for testing
2. 📦 **Week 2**: Implement Oracle Object Storage with 24h TTL
3. 🐙 **Week 3**: Switch to GitHub Gist for production

---

## 💾 Storage Options

### Option 1: Local Bundle (Current)
**Pros**: Simple, works offline, no infrastructure  
**Cons**: Large files (225 MB for full report)  
**Use Case**: Testing, validation this week

### Option 2: Oracle Object Storage (MVP)
**Pros**: We're already on Oracle, pre-authenticated URLs, 24h TTL  
**Cons**: Requires setup, small storage costs  
**Use Case**: Testing on Oracle infra (Week 2)

```bash
# Upload to Oracle Object Storage
oci os object put \
  --bucket-name codequal-reports \
  --file attachments/group-1.json \
  --name "kafka/17620/e00be57/attachments/group-1.json"

# Generate pre-authenticated URL (24h expiry)
oci os preauth-request create \
  --bucket-name codequal-reports \
  --object-name "kafka/17620/e00be57/attachments/group-1.json" \
  --access-type ObjectRead \
  --time-expires "2025-10-21T23:59:59Z"
```

### Option 3: GitHub Gist (Production)
**Pros**: Free, native GitHub integration, viral growth  
**Cons**: 100 MB limit per file, rate limits  
**Use Case**: Production (Week 3-4)

```typescript
const gist = await octokit.gists.create({
  description: `CodeQual: kafka PR #17620`,
  public: false,
  files: {
    'report.md': { content: reportMd },
    'group-1-fix.json': { content: JSON.stringify(group1Fix) },
    // ... up to 100 files
  }
});
```

---

**Questions?** Review the 3 sample files and let me know if the format meets your expectations!
EOF

echo "✅ Created README.md"

# Get sizes
echo ""
echo "📊 Bundle Contents:"
echo "==================="
find "$TEST_DIR" -type f -exec ls -lh {} \; | awk '{print $5, $9}'

# Create tarball
BUNDLE_FILE="/Users/alpinro/Code Prjects/codequal/reports/codequal-test-bundle.tar.gz"
tar -czf "$BUNDLE_FILE" -C /tmp codequal-test-bundle

echo ""
echo "✅ Bundle created: $BUNDLE_FILE"
echo "📦 Size: $(du -sh "$BUNDLE_FILE" | cut -f1)"
echo ""
echo "🎯 Next Steps:"
echo "   1. Extract: tar -xzf $BUNDLE_FILE"
echo "   2. Review: cat codequal-test-bundle/attachments/*.json | jq '.'"
echo "   3. Validate: Check README.md for validation checklist"
echo ""
echo "✨ Done!"

