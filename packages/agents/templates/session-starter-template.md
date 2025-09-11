# Session Startup Template - Framework Duplication Prevention

**⚠️ MANDATORY: Follow this checklist BEFORE starting any work ⚠️**

## 🔒 Pre-Session Validation Checklist

### Step 1: Framework Protection Validation
```bash
cd packages/agents
npx ts-node src/session-validator.ts
```

**Expected Output:** ✅ VALIDATION SUCCESSFUL - Framework Protection Active

❌ **If validation fails:** STOP immediately. Do not proceed until all issues are resolved.

### Step 2: Component Existence Check
Run this command to verify what already exists:

```bash
npx ts-node src/framework-guards.ts check
```

**What to look for:**
- ✅ No framework violations detected
- ❌ If violations found: Review and remove duplicate files

### Step 3: Naming Convention Compliance
```bash
npx ts-node src/naming-enforcer.ts check
```

**Expected:** All files follow V9 naming conventions

### Step 4: Directory Structure Validation
```bash
npx ts-node src/naming-enforcer.ts structure
```

**Expected:** Directory structure is compliant

## 📋 Current Framework Status

### ✅ ACTIVE IMPLEMENTATION (Use These ONLY)
- **Framework:** V9 Two-Branch Analyzer Framework
- **Version:** 9.0.0
- **Status:** PRODUCTION_READY
- **Entry Point:** `src/two-branch/analyzers/v9-analyzer-framework.ts`
- **Test File:** `test-v9-kafka-fixed.ts`

### 🚫 FORBIDDEN ACTIONS
- ❌ Creating new analyzer frameworks
- ❌ Creating files matching patterns: `*-analyzer-v[0-8].ts`, `v10-*.ts`, `new-analyzer*.ts`
- ❌ Creating directories: `analyzers/`, `new-analyzers/`, `improved-analyzers/`
- ❌ Hardcoding model names (must fetch from Supabase)
- ❌ Modifying file selection logic (use SMART_FILE_SELECTION_GUIDE.md)

### ✅ ALLOWED ACTIONS
- ✅ Using existing V9 framework components
- ✅ Extending language analyzers that inherit from `v9-base-analyzer.ts`
- ✅ Creating test files following `test-v9-{description}.ts` pattern
- ✅ Modifying V9 components (with proper testing)

## 🎯 What Already Exists - DO NOT RECREATE

### Core Framework Components
- `v9-analyzer-framework.ts` - Main orchestrator
- `v9-base-analyzer.ts` - Base class for all analyzers
- `v9-analyzer-factory.ts` - Creates analyzer instances
- `v9-repository-manager.ts` - Handles repository operations
- `v9-report-formatter-complete.ts` - Formats analysis reports
- `v9-pr-comment-generator.ts` - Generates PR comments
- `v9-scoring-calculator.ts` - Calculates quality scores

### Language Analyzers (All inherit from v9-base-analyzer.ts)
- `v9-java-analyzer.ts`
- `v9-python-analyzer.ts`
- `v9-javascript-analyzer.ts`
- `v9-csharp-analyzer.ts`
- `v9-cpp-analyzer.ts`
- `v9-c-analyzer.ts`
- `v9-go-analyzer.ts`
- `v9-rust-analyzer.ts`
- `v9-php-analyzer.ts`
- `v9-ruby-analyzer.ts`
- `v9-swift-analyzer.ts`
- `v9-kotlin-analyzer.ts`

### Utilities
- `repository-utils-factory.ts`
- `optimized-repo-manager.ts`

### Types and Interfaces
- `v9-types.ts` - Core type definitions

## 🧪 Testing

### Primary Test File (WORKING)
```bash
npx ts-node test-v9-kafka-fixed.ts
```
**This is the ONLY verified working test** - reference this for data structures and flow.

### Test File Naming
- ✅ Correct: `test-v9-{description}.ts`
- ❌ Wrong: `test-v8-*.ts`, `test-v7-*.ts`, `test-*.ts`

## 📚 Documentation References

### Essential Reading (Check these FIRST)
- `V9_FRAMEWORK_ESTABLISHED.md` - Framework principles and rules
- `docs/architecture/SMART_FILE_SELECTION_GUIDE.md` - File selection logic
- `src/two-branch/docs/architecture/V9_WORKING_COMPONENTS.md` - Component overview

### Configuration Files
- `.codequal-config.yaml` - Framework registry (single source of truth)
- `.codequal-manifest.json` - Component manifest with checksums

## 🚨 Emergency Procedures

### If You Accidentally Create Duplicates
1. **STOP immediately** - Do not commit
2. Remove the duplicate files
3. Run validation: `npx ts-node src/session-validator.ts`
4. Check for violations: `npx ts-node src/framework-guards.ts check`
5. Only proceed when all validations pass

### If Framework Validation Fails
1. Check `.codequal-config.yaml` exists
2. Check `.codequal-manifest.json` exists
3. Remove any files in forbidden locations
4. Use existing V9 components only

### If You Need to Extend Functionality
1. **First**: Check if it already exists in V9 framework
2. **Then**: Extend existing components rather than create new ones
3. **Always**: Follow V9 naming conventions
4. **Finally**: Test with `test-v9-kafka-fixed.ts` pattern

## 🔄 Session Workflow

### Standard Workflow
1. ✅ Run all validation checks (Steps 1-4 above)
2. ✅ Review existing components (use `ls src/two-branch/analyzers/`)
3. ✅ Identify which V9 components to use
4. ✅ Make changes to existing components OR create compliant extensions
5. ✅ Test using V9 framework
6. ✅ Run validation before committing

### Before Making Changes
```bash
# Always run these before modifying code
npx ts-node src/session-validator.ts
npx ts-node src/framework-guards.ts check
npx ts-node src/naming-enforcer.ts check
```

### Before Committing
```bash
# Git hooks will automatically run, but double-check:
npx ts-node src/session-validator.ts
git add .
git commit -m "your commit message"
# Hooks will prevent commit if violations detected
```

## 🎉 Success Criteria

You've successfully started a session when:
- ✅ All validation checks pass
- ✅ No framework violations detected
- ✅ You understand what components already exist
- ✅ You have a clear plan that uses existing V9 framework
- ✅ You're not planning to recreate anything

## 📞 Help & Support

### If You're Confused
1. Read `V9_FRAMEWORK_ESTABLISHED.md`
2. Look at working test: `test-v9-kafka-fixed.ts`
3. Check component manifest: `.codequal-manifest.json`
4. Run compliance check: `npx ts-node src/framework-guards.ts check`

### Key Principle
**"When in doubt, use existing V9 components - never recreate"**

---

**🛡️ Framework Protection System Active**
**✅ Follow this template for every session**
**❌ Skip these steps at your own risk**