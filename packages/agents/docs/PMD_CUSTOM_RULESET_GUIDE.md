# PMD Custom Ruleset Guide - For Project Teams

## Overview

CodeQual now supports **native PMD configuration** through custom rulesets instead of hardcoded severity overrides. This gives project teams full control over PMD rule priorities and severity mappings.

## Three Ruleset Options

### 1. CodeQual Default Ruleset (Recommended)
**Location:** `packages/agents/src/two-branch/tools/java/rulesets/pmd-codequal-default.xml`

Used automatically when no custom ruleset is specified. This ruleset:
- ✅ Downgrades style issues to MEDIUM (LoggerIsNotStaticFinal, ReturnEmptyCollectionRatherThanNull)
- ✅ Keeps security issues as CRITICAL
- ✅ Keeps error-prone issues as HIGH
- ✅ Sets documentation rules to LOW
- ✅ Provides balanced, production-ready priorities

**No configuration needed** - works out of the box!

### 2. Project-Specific Custom Ruleset (Team Control)
**For teams who want their own PMD configuration**

Create your own PMD ruleset XML file and reference it in your V9 configuration:

```typescript
const config: JavaToolConfig = {
  pmd: {
    enabled: true,
    minimumPriority: 2,
    rulesets: ['category/java/errorprone.xml'], // Fallback if custom not found
    customRuleset: '/path/to/your-project-pmd-ruleset.xml', // Your custom rules!
    parallel: 2,
    threads: 3,
    memory: '5g'
  },
  // ... other tool configs
};
```

### 3. Standard PMD Rulesets (Fallback)
**Uses PMD's default priorities** - only if custom rulesets aren't found

CodeQual falls back to standard PMD rulesets like:
- `category/java/errorprone.xml`
- `category/java/bestpractices.xml`
- `category/java/security.xml`

## Creating Your Own Custom Ruleset

### Step 1: Create Ruleset XML

Create `your-project-pmd-ruleset.xml`:

```xml
<?xml version="1.0"?>
<ruleset name="My Project PMD Rules"
    xmlns="http://pmd.sourceforge.net/ruleset/2.0.0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://pmd.sourceforge.net/ruleset/2.0.0
                        https://pmd.sourceforge.io/ruleset_2_0_0.xsd">

    <description>
        Custom PMD rules for our project with appropriate severity levels
    </description>

    <!-- Include all error-prone rules (bugs, crashes) -->
    <rule ref="category/java/errorprone.xml">
        <!-- But downgrade this style issue -->
        <exclude name="AvoidBranchingStatementAsLastInLoop"/>
    </rule>

    <!-- Downgrade to MEDIUM (not HIGH) -->
    <rule ref="category/java/errorprone.xml/AvoidBranchingStatementAsLastInLoop">
        <priority>3</priority> <!-- 3 = MEDIUM -->
    </rule>

    <!-- Include all best practices -->
    <rule ref="category/java/bestpractices.xml">
        <!-- Exclude logging style rules -->
        <exclude name="LoggerIsNotStaticFinal"/>
    </rule>

    <!-- Logging style - MEDIUM not HIGH -->
    <rule ref="category/java/bestpractices.xml/LoggerIsNotStaticFinal">
        <priority>3</priority> <!-- MEDIUM -->
    </rule>

    <!-- Security rules stay CRITICAL -->
    <rule ref="category/java/security.xml">
        <priority>1</priority> <!-- CRITICAL -->
    </rule>

</ruleset>
```

### Step 2: Priority Mapping

PMD Priority → CodeQual Severity:

| PMD Priority | CodeQual Severity | Use For |
|-------------|------------------|---------|
| **1** | CRITICAL | Security vulnerabilities, dangerous bugs |
| **2** | HIGH | Error-prone code, performance issues, threading bugs |
| **3** | MEDIUM | Best practices, design patterns, code style |
| **4-5** | LOW | Documentation, minor formatting |

### Step 3: Configure CodeQual to Use Your Ruleset

```typescript
import { JavaToolOrchestrator } from './two-branch/tools/java/java-tool-orchestrator';

const config = {
  pmd: {
    enabled: true,
    minimumPriority: 2,              // Analyze CRITICAL + HIGH
    rulesets: ['category/java/errorprone.xml'], // Fallback
    customRuleset: './pmd-rules/my-project-ruleset.xml', // YOUR RULES
    parallel: 2,
    threads: 3,
    memory: '5g'
  },
  // ... other configs
};

const orchestrator = new JavaToolOrchestrator(config);
```

### Step 4: Test Your Ruleset

```bash
# Test locally
cd packages/agents
npx ts-node test-v9-e2e-complete.ts

# Check logs for:
# "Using project-specific PMD ruleset: ./pmd-rules/my-project-ruleset.xml"
```

## Common Customizations

### Example 1: Strict Security, Lenient Style

```xml
<!-- All security issues CRITICAL -->
<rule ref="category/java/security.xml">
    <priority>1</priority>
</rule>

<!-- Most code style LOW (not important) -->
<rule ref="category/java/codestyle.xml">
    <priority>4</priority>
</rule>
```

### Example 2: Disable Specific Rules

```xml
<!-- Include all best practices EXCEPT these -->
<rule ref="category/java/bestpractices.xml">
    <exclude name="LoggerIsNotStaticFinal"/>
    <exclude name="GuardLogStatement"/>
    <exclude name="JUnitTestsShouldIncludeAssert"/>
</rule>
```

### Example 3: Make Performance Rules HIGH Priority

```xml
<!-- Performance issues are critical for us -->
<rule ref="category/java/performance.xml">
    <priority>2</priority> <!-- HIGH -->
</rule>
```

## Benefits of Custom Rulesets

✅ **Version Controlled** - Ruleset in git, not hardcoded
✅ **Team Ownership** - Each team controls their own priorities
✅ **Transparent** - Easy to see what rules = what severity
✅ **Standard** - Uses PMD's native priority system
✅ **Portable** - Same ruleset across all environments
✅ **Maintainable** - Change XML, not TypeScript code

## Ruleset Priority Order

CodeQual uses this priority order:

1. **Project-specific custom ruleset** (if `customRuleset` path provided)
2. **CodeQual default ruleset** (`pmd-codequal-default.xml`)
3. **Standard PMD rulesets** (from `rulesets` array)

Logs will show which ruleset is used:
```
Using project-specific PMD ruleset: /path/to/your-ruleset.xml
Using CodeQual default PMD ruleset with tuned severity priorities
Using standard PMD rulesets (default ruleset not found)
```

## Migration from Hardcoded Overrides

**Old way (hardcoded in TypeScript):**
```typescript
const styleRules: Record<string, CodeQualSeverity> = {
  'loggerisnotstaticfinal': 'medium',
  'returnemptycollectionratherthannull': 'medium',
};
```

**New way (PMD native configuration):**
```xml
<rule ref="category/java/bestpractices.xml/LoggerIsNotStaticFinal">
    <priority>3</priority> <!-- MEDIUM -->
</rule>
```

## Backward Compatibility

If you don't provide a custom ruleset:
- CodeQual uses `pmd-codequal-default.xml` (balanced defaults)
- Severity mapper still has fallback overrides (for compatibility)

This ensures existing code continues working while teams migrate to custom rulesets.

## References

- **CodeQual Default Ruleset:** `packages/agents/src/two-branch/tools/java/rulesets/pmd-codequal-default.xml`
- **PMD Official Docs:** https://pmd.github.io/latest/pmd_userdocs_making_rulesets.html
- **Priority Configuration:** `docs/PMD_CONFIGURATION_GUIDE.md`
- **Severity Mapping:** `src/two-branch/utils/severity-mapper.ts`

## Support

Questions about custom rulesets? Check:
1. CodeQual default ruleset (good example to copy)
2. PMD official ruleset documentation
3. Your team's coding standards document
