# OpenRewrite Setup Guide

> Session 104: Documentation for using OpenRewrite with fix-agent.

## Overview

OpenRewrite is a Maven/Gradle plugin for recipe-based code refactoring. Unlike CLI tools (ruff, eslint), it requires project-level configuration.

**Key difference from other tier 2 tools:**
- NOT a standalone CLI tool
- Requires Maven or Gradle plugin configuration
- Uses "recipes" for specific transformations
- Best for project-wide refactoring

## Maven Setup

### Add to pom.xml

```xml
<build>
  <plugins>
    <plugin>
      <groupId>org.openrewrite.maven</groupId>
      <artifactId>rewrite-maven-plugin</artifactId>
      <version>5.44.0</version>
      <configuration>
        <activeRecipes>
          <!-- Code quality recipes -->
          <recipe>org.openrewrite.staticanalysis.CommonStaticAnalysis</recipe>
          <!-- Java upgrade recipes -->
          <recipe>org.openrewrite.java.migrate.UpgradeToJava21</recipe>
        </activeRecipes>
        <activeStyles>
          <style>org.openrewrite.java.IntelliJStyle</style>
        </activeStyles>
      </configuration>
      <dependencies>
        <dependency>
          <groupId>org.openrewrite.recipe</groupId>
          <artifactId>rewrite-static-analysis</artifactId>
          <version>1.19.1</version>
        </dependency>
        <dependency>
          <groupId>org.openrewrite.recipe</groupId>
          <artifactId>rewrite-migrate-java</artifactId>
          <version>2.28.0</version>
        </dependency>
      </dependencies>
    </plugin>
  </plugins>
</build>
```

## Usage

### Dry run (see what would change)
```bash
mvn rewrite:dryRun
```

### Apply fixes
```bash
mvn rewrite:run
```

### Discover available recipes
```bash
mvn rewrite:discover
```

## Common Recipes

### Code Quality (rewrite-static-analysis)
| Recipe | What It Fixes |
|--------|---------------|
| `CommonStaticAnalysis` | Common code smells (unused imports, dead code, etc.) |
| `FinalizePrivateFields` | Add `final` to private fields that should be immutable |
| `SimplifyBooleanExpression` | Simplify boolean expressions |
| `UseDiamondOperator` | Use `<>` instead of explicit generic types |

### Java Migration (rewrite-migrate-java)
| Recipe | What It Does |
|--------|--------------|
| `UpgradeToJava17` | Migrate code patterns to Java 17 |
| `UpgradeToJava21` | Migrate code patterns to Java 21 |
| `UseLambdaForFunctionalInterface` | Convert anonymous classes to lambdas |
| `UseTextBlocks` | Convert string concatenation to text blocks |

### Testing (rewrite-testing-frameworks)
| Recipe | What It Does |
|--------|--------------|
| `JUnit4to5Migration` | Migrate JUnit 4 to JUnit 5 |
| `AssertJBestPractices` | Apply AssertJ best practices |
| `MockitoBestPractices` | Apply Mockito best practices |

## Example: Fix Common Static Analysis Issues

```xml
<!-- Add this to pom.xml -->
<configuration>
  <activeRecipes>
    <recipe>org.openrewrite.staticanalysis.CommonStaticAnalysis</recipe>
  </activeRecipes>
</configuration>
```

Then run:
```bash
mvn rewrite:run
```

This fixes:
- Remove unused imports
- Simplify boolean expressions
- Use diamond operator
- Add missing serialVersionUID
- Remove unnecessary type casts

## Integration with fix-agent

Since OpenRewrite requires Maven project context, it should be used as:

1. **Detection**: fix-agent detects Maven project (`pom.xml` exists)
2. **Recipe Selection**: Map SonarQube/PMD rules to OpenRewrite recipes
3. **Execution**: Run `mvn rewrite:run` with appropriate recipes

### Recipe Mapping

| Tool/Rule | OpenRewrite Recipe |
|-----------|-------------------|
| PMD:UselessParentheses | `org.openrewrite.staticanalysis.SimplifyBooleanExpression` |
| Checkstyle:UnusedImports | `org.openrewrite.java.RemoveUnusedImports` |
| SonarQube:S1220 | `org.openrewrite.staticanalysis.DefaultComesLast` |

## Limitations

1. **Project-bound**: Cannot run on single files without project context
2. **Setup required**: Need to add plugin to pom.xml first
3. **Build system specific**: Separate setup for Maven vs Gradle
4. **Not real-time**: Better for batch refactoring than individual fixes

## Gradle Setup

```groovy
plugins {
    id("org.openrewrite.rewrite") version "6.27.2"
}

rewrite {
    activeRecipe("org.openrewrite.staticanalysis.CommonStaticAnalysis")
}

dependencies {
    rewrite("org.openrewrite.recipe:rewrite-static-analysis:1.19.1")
}
```

Run with:
```bash
./gradlew rewriteRun
```

## Resources

- [OpenRewrite Documentation](https://docs.openrewrite.org/)
- [Recipe Catalog](https://docs.openrewrite.org/recipes)
- [GitHub: openrewrite/rewrite](https://github.com/openrewrite/rewrite)

---

*Last updated: Session 104 (2026-01-19)*
