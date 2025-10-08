# PMD Configuration Guide - Proper Severity Tuning

## Problem
We're currently hardcoding severity overrides in code. Better approach: Configure PMD itself.

## Solution: Custom PMD Ruleset

PMD allows custom rulesets with severity levels per rule.

### Current Approach (Hardcoded)
```typescript
// severity-mapper.ts
const styleRules: Record<string, CodeQualSeverity> = {
  'loggerisnotstaticfinal': 'medium',
  'returnemptycollectionratherthannull': 'medium'
};
```

### Better Approach: PMD Custom Ruleset

Create `pmd-custom-ruleset.xml`:

```xml
<?xml version="1.0"?>
<ruleset name="CodeQual Custom Rules"
    xmlns="http://pmd.sourceforge.net/ruleset/2.0.0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://pmd.sourceforge.net/ruleset/2.0.0 
                        https://pmd.sourceforge.io/ruleset_2_0_0.xsd">

    <description>
        CodeQual customized PMD rules with appropriate severity levels
    </description>

    <!-- Include base rulesets but override specific rules -->
    
    <!-- ERROR PRONE RULES - Keep defaults (HIGH/CRITICAL) -->
    <rule ref="category/java/errorprone.xml">
        <!-- Downgrade style issues from errorprone -->
        <exclude name="AvoidBranchingStatementAsLastInLoop"/>
    </rule>
    
    <!-- Style issue - MEDIUM not HIGH -->
    <rule ref="category/java/errorprone.xml/AvoidBranchingStatementAsLastInLoop">
        <priority>3</priority> <!-- 3 = MEDIUM in our mapping -->
    </rule>

    <!-- BEST PRACTICES RULES -->
    <rule ref="category/java/bestpractices.xml">
        <!-- Downgrade logging style issues -->
        <exclude name="LoggerIsNotStaticFinal"/>
        <exclude name="GuardLogStatement"/>
    </rule>
    
    <!-- Logging style - MEDIUM not HIGH -->
    <rule ref="category/java/bestpractices.xml/LoggerIsNotStaticFinal">
        <priority>3</priority> <!-- MEDIUM -->
        <properties>
            <property name="violationSuppressXPath" value=""/>
        </properties>
    </rule>
    
    <rule ref="category/java/bestpractices.xml/GuardLogStatement">
        <priority>4</priority> <!-- LOW - performance optimization only -->
    </rule>

    <!-- CODE STYLE RULES - All should be MEDIUM/LOW -->
    <rule ref="category/java/codestyle.xml">
        <priority>3</priority> <!-- Default: MEDIUM -->
        <exclude name="AtLeastOneConstructor"/>
        <exclude name="OnlyOneReturn"/>
        <exclude name="TooManyStaticImports"/>
    </rule>
    
    <!-- Constructor not required - LOW -->
    <rule ref="category/java/codestyle.xml/AtLeastOneConstructor">
        <priority>4</priority> <!-- LOW -->
    </rule>

    <!-- DESIGN RULES - Complexity/Architecture -->
    <rule ref="category/java/design.xml">
        <priority>2</priority> <!-- Default: HIGH for architecture issues -->
        <exclude name="LawOfDemeter"/> <!-- Too strict -->
        <exclude name="LoosePackageCoupling"/> <!-- Too strict -->
    </rule>

    <!-- SECURITY RULES - Keep HIGH/CRITICAL -->
    <rule ref="category/java/security.xml">
        <priority>1</priority> <!-- CRITICAL for security -->
    </rule>

    <!-- PERFORMANCE RULES - Keep HIGH -->
    <rule ref="category/java/performance.xml">
        <priority>2</priority> <!-- HIGH for performance issues -->
    </rule>

    <!-- MULTITHREADING RULES - Keep HIGH/CRITICAL -->
    <rule ref="category/java/multithreading.xml">
        <priority>2</priority> <!-- HIGH for concurrency bugs -->
    </rule>

    <!-- DOCUMENTATION RULES - All LOW -->
    <rule ref="category/java/documentation.xml">
        <priority>4</priority> <!-- LOW - documentation is optional -->
    </rule>

</ruleset>
```

## Priority Mapping

PMD Priority → CodeQual Severity:
- **Priority 1** → CRITICAL (Security, dangerous bugs)
- **Priority 2** → HIGH (Error prone, performance, threading)
- **Priority 3** → MEDIUM (Best practices, design, code style)
- **Priority 4-5** → LOW (Documentation, minor style)

## Implementation

### 1. Save Custom Ruleset

```bash
# Save to docker image or mount as volume
/app/pmd/rulesets/codequal-custom.xml
```

### 2. Update JavaToolOrchestrator

```typescript
// java-tool-orchestrator.ts
const pmdCommand = `
  docker run --rm \\
    -v ${repositoryPath}:/workspace \\
    ${IMAGE_NAME} \\
    pmd check \\
      --dir /workspace \\
      --rulesets /app/pmd/rulesets/codequal-custom.xml \\  # Use custom
      --format json \\
      --no-cache
`;
```

### 3. Benefits

✅ **No Code Changes**: Severity in PMD config, not TypeScript
✅ **Version Control**: Ruleset in git
✅ **Transparent**: Easy to see what rules = what severity
✅ **Maintainable**: Change XML, not code
✅ **Standard**: PMD's native priority system
✅ **Portable**: Same config across environments

## Rule Categories & Severities

### CRITICAL (Priority 1)
- Security vulnerabilities
- SQL injection risks
- XSS vulnerabilities
- Insecure crypto usage

### HIGH (Priority 2)
- NullPointerException risks
- Resource leaks
- Concurrency bugs
- Performance bottlenecks

### MEDIUM (Priority 3)
- Code style violations
- Best practice violations
- Design pattern issues
- Logging conventions

### LOW (Priority 4-5)
- Documentation missing
- Comment style
- Minor formatting

## Customization Per Project

Users can override in `.codequal-config.yaml`:

```yaml
analysis:
  java:
    pmd:
      ruleset: custom  # Use our custom ruleset
      # OR
      customRuleset: /path/to/project-specific-pmd.xml
      
      # Override specific rules
      ruleOverrides:
        LoggerIsNotStaticFinal: medium
        ReturnEmptyCollectionRatherThanNull: medium
```

## Migration Plan

1. **Phase 1**: Create codequal-custom.xml with proper priorities
2. **Phase 2**: Update Docker images with custom ruleset
3. **Phase 3**: Add config option for custom rulesets
4. **Phase 4**: Remove hardcoded overrides from severity-mapper.ts
5. **Phase 5**: Document for users

## Result

Instead of 84 HIGH issues (LoggerIsNotStaticFinal), we'll get:
- ~5-10 CRITICAL/HIGH issues (actual bugs)
- ~30-40 MEDIUM issues (style/best practices)
- ~40-50 LOW issues (documentation)

This gives realistic severity distribution!
