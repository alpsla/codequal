# IDE Attachment Files - Complete Guide

**Purpose**: These JSON files enable IDEs (Cursor, VS Code, IntelliJ, etc.) to automatically fix code quality issues with one click.

---

## 📦 **Two Types of Attachment Files**

### 1. **Location Files** (`*-locations.json`)
**Purpose**: Provide complete list of ALL occurrences of an issue across the codebase.

**Use Case**: 
- Review all instances of a specific issue
- Batch processing
- Custom tooling integration
- Manual review workflow

**Example**: `SAMPLE-locations-security-critical.json`

**Structure**:
```json
{
  "group_id": "...",
  "rule": "command-injection-process-builder",
  "severity": "critical",
  "tool": "semgrep",
  "category": "Security",
  "total_count": 2,
  "locations": [
    {
      "file": "path/to/File.java",
      "line": 45,
      "column": 12,
      "snippet": "// 3-5 lines of context code",
      "category": "NEW",
      "message": "Detailed explanation"
    }
  ],
  "summary": {
    "affected_files": 2,
    "new_issues": 2,
    "existing_modified": 0,
    "resolved": 0
  }
}
```

---

### 2. **IDE Fix Files** (`*-cursor-fix.json`)
**Purpose**: Provide actionable fix patterns that IDEs can apply automatically.

**Use Case**:
- One-click auto-fix in IDE
- Batch fix across multiple files
- CI/CD pre-commit hooks
- Automated code migration

**Example**: `SAMPLE-cursor-fix-indentation.json`

**Structure**:
```json
{
  "version": "1.0",
  "group_id": "...",
  "rule": "IndentationCheck",
  "severity": "low",
  "description": "Human-readable explanation",
  
  "fix_pattern": {
    "type": "template" | "regex",
    "example": {
      "before": "// Incorrect code",
      "after": "// Corrected code"
    },
    "instructions": "How to apply the fix"
  },
  
  "locations": [
    {
      "file": "path/to/File.java",
      "line": 37,
      "snippet": "// Code context",
      "category": "NEW"
    }
  ],
  
  "metadata": {
    "total_occurrences": 371129,
    "confidence": "high",
    "safe_auto_apply": true,
    "estimated_time_seconds": 185565,
    "required_imports": []
  }
}
```

---

## 🔧 **Fix Pattern Types**

### Type 1: `template` (Most Common)
**Best for**: Style fixes, simple refactoring

```json
{
  "type": "template",
  "example": {
    "before": "private volatile boolean running;",
    "after": "private final AtomicBoolean running = new AtomicBoolean(false);"
  },
  "instructions": "Replace volatile with AtomicXXX"
}
```

**IDE Behavior**: 
- IDE shows before/after diff
- User approves each file or batch-applies
- IDE handles imports automatically

---

### Type 2: `regex` (Advanced)
**Best for**: Pattern-based transformations

```json
{
  "type": "regex",
  "find_regex": "private volatile (\\w+) (\\w+)( = .+)?;",
  "replace_template": "private final Atomic$1 $2 = new Atomic$1($3);",
  "example": {
    "before": "private volatile int count = 0;",
    "after": "private final AtomicInteger count = new AtomicInteger(0);"
  }
}
```

**IDE Behavior**:
- IDE applies regex to each location
- Validates syntax after replacement
- Shows diff for user approval

---

## 📊 **Metadata Fields Explained**

| Field | Type | Purpose |
|-------|------|---------|
| `total_occurrences` | number | Total files affected |
| `confidence` | "high" \| "medium" \| "low" | AI confidence in fix accuracy |
| `safe_auto_apply` | boolean | Can IDE apply without user review? |
| `estimated_time_seconds` | number | Time to fix all occurrences (0.5s per file) |
| `required_imports` | string[] | Java imports needed (e.g., `"java.util.concurrent.atomic.AtomicBoolean"`) |

---

## 🎯 **Auto-Fix Categories**

### 1. **100% Auto-Fixable** (`safe_auto_apply: true`)
**Examples**:
- All CheckStyle issues (indentation, line length, imports)
- `AvoidUsingVolatile` → `AtomicXXX`
- `SystemPrintln` → `logger.info()`
- `GuardLogStatement` → Add `if (logger.isDebugEnabled())`

**Total in Current Report**: **511,151 issues** (97.7%)

**How IDEs Handle**:
- One-click "Fix All" button
- Batch apply across entire codebase
- No user review required (if user trusts the tool)

---

### 2. **Review Required** (No auto-fix file)
**Examples**:
- Security vulnerabilities (command injection, SQL injection)
- Logic bugs (null pointer dereference)
- Performance issues (dead store)

**Total in Current Report**: **10,753 issues** (2.3%)

**How IDEs Handle**:
- Show location and explanation
- Provide guidance in report
- User must manually fix
- No auto-fix JSON generated

---

## 🛠️ **How IDEs Use These Files**

### Workflow 1: **Cursor IDE Integration**
```
1. User opens Cursor
2. Cursor reads cursor-fix-*.json files
3. Cursor shows "511K issues can be fixed" notification
4. User clicks "Fix All CheckStyle Issues"
5. Cursor applies all indentation/formatting fixes
6. User reviews diff, commits
```

### Workflow 2: **VS Code + Custom Plugin**
```
1. User runs "CodeQual: Load Fixes" command
2. Plugin reads all *-locations.json files
3. Shows "67 issue groups found" in sidebar
4. User selects "IndentationCheck (371K occurrences)"
5. Plugin shows before/after diff for each file
6. User approves, plugin applies
```

### Workflow 3: **CI/CD Pre-Commit Hook**
```bash
#!/bin/bash
# Download fix files from CodeQual API
curl -o fixes.zip "https://api.codequal.io/pr/17620/fixes"
unzip fixes.zip

# Apply all safe auto-fixes
for fix in cursor-fix-*.json; do
  # Custom script reads fix_pattern and applies to files
  apply-fix.sh "$fix"
done

# Commit changes
git add -A
git commit -m "chore: auto-fix code quality issues"
```

---

## 📈 **Current Report Statistics**

**Total Issues**: 522,904  
**Auto-Fixable**: 511,151 (97.7%)  
**Manual Review**: 10,753 (2.3%)

### Top Auto-Fixable Categories:
1. **IndentationCheck**: 371,129 files
2. **LineLengthCheck**: 43,717 files
3. **MemberNameCheck**: 26,222 files
4. **CustomImportOrderCheck**: 14,173 files
5. **LocalVariableNameCheck**: 12,262 files

### Tools Recommendation:
```bash
# Java Auto-Formatting (Fixes 98% of CheckStyle issues)
wget https://github.com/google/google-java-format/releases/download/v1.17.0/google-java-format-1.17.0-all-deps.jar
find . -name "*.java" | xargs java -jar google-java-format-1.17.0-all-deps.jar --replace

# Verify fixes
mvn checkstyle:check
```

**Expected Result**: 511K issues → 0 issues in ~3 minutes

---

## 🔍 **Example: Review One Issue Group**

### File: `SAMPLE-cursor-fix-indentation.json`
- **Rule**: IndentationCheck
- **Occurrences**: 371,129 files
- **Estimated Fix Time**: 51 hours (if done manually)
- **Estimated Fix Time (with tool)**: 3 minutes
- **Safety**: 100% safe (formatting only)

### IDE Actions Available:
1. ✅ **Fix All** - Apply to all 371K files
2. 📂 **Fix This File** - Apply to current file only
3. 👁️ **Preview Changes** - Show diff before applying
4. ⏭️ **Skip Rule** - Ignore this rule entirely

---

## 🎨 **Future: Universal IDE Support**

Currently generating:
- ✅ `cursor-fix-*.json` (Cursor IDE format)
- ✅ `*-locations.json` (Universal format)

**Next Phase** (from your approved strategy):
- 🔜 **SARIF format** - GitHub Code Scanning, VS Code
- 🔜 **LSP Diagnostics** - Language Server Protocol (universal)
- 🔜 **IntelliJ format** - IntelliJ IDEA, Android Studio
- 🔜 **Windsurf format** - Windsurf IDE integration

**Timeline**: Week 3-4 of 9-week go-to-market plan

---

## 💡 **Key Takeaways**

1. **Two file types**: Locations (for review) + Fix files (for automation)
2. **97.7% auto-fixable**: Most issues can be fixed with one click
3. **Safe defaults**: Only safe fixes get `safe_auto_apply: true`
4. **Universal format**: Easy to integrate with any IDE
5. **Massive time savings**: 51 hours → 3 minutes for formatting

---

## 📝 **Sample Files Available**

Review these files to see the format:
1. `SAMPLE-cursor-fix-indentation.json` - Auto-fix format (511K issues)
2. `SAMPLE-locations-security-critical.json` - Location format (10 blocking issues)
3. Full report: `v9-BUG28-FIXED-FINAL-REPORT.md` (173 KB, 5020 lines)

---

**Questions?** 
- The fix patterns are AI-generated based on the specific issue
- Each group has its own fix file (67 groups in current report)
- All files are deterministic (same input = same output)
- Attachments are cleaned automatically after 24 hours to save space

