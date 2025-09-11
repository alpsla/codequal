# Component Creation Template - Before You Create ANYTHING

**🛑 STOP - Read This First Before Creating Any Files 🛑**

## 🔍 Pre-Creation Checklist

### Step 1: Verify Component Doesn't Already Exist
```bash
# Search for similar components
find src/two-branch/analyzers/ -name "*analyzer*.ts" -type f
find src/two-branch/analyzers/ -name "*framework*.ts" -type f
find src/two-branch/analyzers/ -name "*formatter*.ts" -type f

# Check the manifest for existing components
cat .codequal-manifest.json | jq '.components'
```

**❌ STOP if similar component exists** - Use or extend the existing one instead.

### Step 2: Validate Your Naming Convention
```bash
# Check if your proposed filename follows V9 conventions
npx ts-node src/naming-enforcer.ts validate path/to/your/proposed-file.ts
```

**Expected:** ✅ File follows naming conventions

### Step 3: Verify Location Compliance
Your file must be in the correct location:

**✅ Allowed Locations:**
- Analyzers: `src/two-branch/analyzers/`
- Utilities: `src/two-branch/utils/`
- Types: `src/two-branch/types/`
- Tests: Root directory with `test-v9-` prefix

**❌ Forbidden Locations:**
- `src/standard/analyzers/`
- `src/specialized/analyzers/`
- `src/analyzers/`
- Any location outside `src/two-branch/`

## 🎯 What You're Probably Looking For (Use These Instead)

### Want to Create an Analyzer?
**DON'T CREATE NEW** - Use these existing patterns:

#### Language Analyzers (Extend these)
```typescript
// For Java analysis
import JavaAnalyzer from './v9-java-analyzer';

// For Python analysis  
import PythonAnalyzer from './v9-python-analyzer';

// For JavaScript analysis
import JavaScriptAnalyzer from './v9-javascript-analyzer';

// Base class for custom analyzers
import BaseAnalyzer from './v9-base-analyzer';
```

#### Framework Components (Use these directly)
```typescript
// Main framework
import V9AnalyzerFramework from './v9-analyzer-framework';

// Factory for creating analyzers
import AnalyzerFactory from './v9-analyzer-factory';

// Repository management
import RepositoryManager from './v9-repository-manager';
```

### Want to Create a Formatter?
**EXISTING FORMATTER:** `v9-report-formatter-complete.ts`
```typescript
import ReportFormatter from './v9-report-formatter-complete';
// This is the AUTHORITATIVE version - do not create alternatives
```

### Want to Create a Test?
**Use this pattern:**
```bash
# Correct naming
test-v9-{your-description}.ts

# Examples
test-v9-integration.ts
test-v9-java-analysis.ts
test-v9-performance.ts
```

## 📋 Component Creation Decision Tree

### 1. Language Analyzer
**Q:** Does a V9 analyzer already exist for your language?
- **YES** → Use existing `v9-{language}-analyzer.ts`
- **NO** → Create following `v9-{language}-analyzer.ts` pattern

### 2. Framework Enhancement
**Q:** Does this enhance existing framework functionality?
- **YES** → Modify existing V9 component
- **NO** → Are you sure it's needed? Check with framework team.

### 3. Utility Function
**Q:** Is this a reusable utility?
- **YES** → Add to `src/two-branch/utils/`
- **NO** → Consider if it belongs in an existing component

### 4. Test File
**Q:** Are you testing V9 framework?
- **YES** → Use `test-v9-{description}.ts` pattern
- **NO** → Use existing test patterns

## 🚫 Forbidden Component Patterns

### Never Create These File Names
- `*-analyzer-v[0-8].ts` (V7, V8 are deprecated)
- `v10-*.ts` (V10 doesn't exist yet)
- `new-analyzer*.ts`
- `improved-*.ts`
- `enhanced-analyzer*.ts`
- `better-*.ts`
- `analyzer-*.ts` (wrong pattern)
- `framework-*.ts` (wrong pattern)

### Never Create These Directories
- `analyzers/` (outside two-branch)
- `new-analyzers/`
- `improved-analyzers/`
- `v10/`
- `alternative-*/`
- `backup-*/`

## ✅ Approved Creation Process

### If You MUST Create a New Component

#### Step 1: Validate Necessity
```bash
# Check framework registry
cat .codequal-config.yaml

# Check component manifest
cat .codequal-manifest.json

# Confirm no duplicates
npx ts-node src/framework-guards.ts check
```

#### Step 2: Follow V9 Patterns
```typescript
// Template for V9 Language Analyzer
export class V9{Language}Analyzer extends V9BaseAnalyzer {
  constructor() {
    super('{language}');
  }

  async analyze(code: string): Promise<AnalysisResult> {
    // Implementation using V9 patterns
    return super.analyzeWithFramework(code);
  }
}

export default V9{Language}Analyzer;
```

#### Step 3: Validate Before Creation
```bash
# Test your naming
npx ts-node src/naming-enforcer.ts validate src/two-branch/analyzers/v9-newlang-analyzer.ts

# Check for conflicts
npx ts-node src/framework-guards.ts validate src/two-branch/analyzers/v9-newlang-analyzer.ts
```

#### Step 4: Create with Framework Compliance
```bash
# Create the file
touch src/two-branch/analyzers/v9-newlang-analyzer.ts

# Verify it's allowed
npx ts-node src/session-validator.ts
```

#### Step 5: Update Manifest
Add your component to `.codequal-manifest.json`:
```json
{
  "components": {
    "language_analyzers": {
      "v9-newlang-analyzer.ts": {
        "path": "src/two-branch/analyzers/v9-newlang-analyzer.ts",
        "type": "language_analyzer",
        "language": "newlang",
        "status": "active",
        "locked": false,
        "extends": "v9-base-analyzer.ts",
        "purpose": "NewLang-specific code analysis"
      }
    }
  }
}
```

## 🧪 Testing Your New Component

### Test Integration
```bash
# Reference the working test pattern
cp test-v9-kafka-fixed.ts test-v9-your-component.ts
# Modify to test your component
npx ts-node test-v9-your-component.ts
```

### Validate Framework Integration
```bash
# Ensure framework still works
npx ts-node test-v9-kafka-fixed.ts

# Check for any new violations
npx ts-node src/framework-guards.ts check
```

## 🚨 Red Flags - When to STOP

### Stop If:
- ❌ You're recreating something that already exists
- ❌ Your file name doesn't start with `v9-`
- ❌ You're putting files outside `src/two-branch/`
- ❌ Validation scripts fail
- ❌ You're hardcoding models instead of fetching from Supabase
- ❌ You're changing file selection logic

### Proceed Only If:
- ✅ Component truly doesn't exist
- ✅ Follows V9 naming conventions
- ✅ Located in correct directory
- ✅ Extends existing V9 patterns
- ✅ All validation checks pass

## 🎉 Success Indicators

You've successfully created a compliant component when:
- ✅ Framework validation passes
- ✅ No naming convention violations
- ✅ Component integrates with existing V9 framework
- ✅ Test file works using V9 patterns
- ✅ Manifest is updated
- ✅ Git hooks allow commit

## 📞 Still Not Sure?

### Before Creating Anything:
1. **Read:** `V9_FRAMEWORK_ESTABLISHED.md`
2. **Check:** Existing components in `src/two-branch/analyzers/`
3. **Test:** Run `test-v9-kafka-fixed.ts` to see working pattern
4. **Validate:** All validation scripts pass
5. **Ask:** Is this truly necessary, or can I use existing V9 components?

### Remember:
**"Extension over creation - reuse over recreation"**

---

**🛡️ Component Creation Guard Active**
**✅ Follow this template before creating ANY files**
**❌ Skip at your own risk - Git hooks will block non-compliant files**