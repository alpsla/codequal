# Build Tool Detection Flow - V9 Architecture

**Purpose**: Explains how build tool detection integrates with V9ToolOrchestrator
**Created**: October 2, 2025
**Status**: Design Document

---

## 🎯 Overview

Build tool detection is a **repository-level concern** handled by the **V9ToolOrchestrator**, not by individual language orchestrators. This ensures:

1. **Single detection per repository** - Avoid redundant checks
2. **Shared build artifacts** - All agents use the same compiled classes
3. **Consistent tool enablement** - Security, Quality, Performance agents all know if SpotBugs is available
4. **Language-agnostic design** - Easy to extend to Python, JavaScript, etc.

---

## 📊 Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│ V9ToolOrchestrator                                          │
│ (Main orchestrator - runs once per PR)                     │
└─────────────────────────────────────────────────────────────┘
                         │
                         ├─ 1. Clone repository
                         │
                         ├─ 2. Detect build tools ★
                         │    BuildToolDetector.detectBuildTools(repoPath)
                         │    Returns: RepositoryBuildInfo
                         │    {
                         │      language: 'java',
                         │      buildTool: { tool: 'gradle', compileCommand: '...' },
                         │      supportsSpotBugs: true,
                         │      compilationRequired: true
                         │    }
                         │
                         ├─ 3. Compile if needed ★
                         │    IF buildInfo.compilationRequired:
                         │      BuildToolDetector.compileRepository(repoPath, buildInfo)
                         │    Cache compiled classes for all agents
                         │
                         ├─ 4. Execute language orchestrator(s)
                         │    Pass buildInfo to each orchestrator
                         │
                         ├────────────────────────────────────────┐
                         │                                        │
            ┌────────────▼───────────┐           ┌───────────────▼──────────┐
            │ JavaToolOrchestrator   │           │ PythonToolOrchestrator   │
            │ (Language-specific)    │           │ (Language-specific)      │
            └────────────────────────┘           └──────────────────────────┘
                         │                                        │
            ┌────────────┴──────────┐              ┌─────────────┴────────────┐
            │                       │              │                          │
    ┌───────▼────────┐   ┌─────────▼────────┐   ┌▼──────────┐   ┌──────────▼──┐
    │ Security Agent │   │ Quality Agent    │   │ Security  │   │ Quality     │
    │ - Semgrep      │   │ - PMD            │   │ - Bandit  │   │ - Pylint    │
    │                │   │ - Checkstyle     │   │           │   │             │
    └────────────────┘   │ - SpotBugs ★     │   └───────────┘   └─────────────┘
                         │   (if buildInfo  │
                         │    supports it)  │
                         └──────────────────┘
```

---

## 🔑 Key Responsibilities

### V9ToolOrchestrator (Main Orchestrator)

**Responsibilities**:
1. ✅ Clone/checkout repository
2. ✅ **Detect build tools** (once per repository)
3. ✅ **Compile repository** (if needed, once for all agents)
4. ✅ Pass `buildInfo` to language orchestrators
5. ✅ Aggregate results from all agents

**Does NOT**:
- ❌ Know about specific tools (PMD, SpotBugs, etc.)
- ❌ Parse tool outputs
- ❌ Decide which tools to run
- ❌ Re-compile for different agents

### JavaToolOrchestrator (Language Orchestrator)

**Responsibilities**:
1. ✅ Receive `buildInfo` from V9ToolOrchestrator
2. ✅ **Decide which tools to enable** based on `buildInfo`
3. ✅ Execute tools in optimal order
4. ✅ Parse tool outputs
5. ✅ Return standardized issues

**Does NOT**:
- ❌ Detect build tools (uses provided `buildInfo`)
- ❌ Compile repository (assumes already compiled if needed)
- ❌ Know about other languages

### Agents (Security, Quality, Performance, etc.)

**Responsibilities**:
1. ✅ Receive tool results from language orchestrator
2. ✅ Categorize issues (NEW/RESOLVED/EXISTING)
3. ✅ Generate agent-specific insights
4. ✅ Return structured results

**Does NOT**:
- ❌ Execute tools directly
- ❌ Know about build tools
- ❌ Compile code

---

## 🛠️ Build Tool Detection API

### 1. Detect Build Tools

```typescript
import { detectBuildTools } from './tools/build-tool-detector';

const buildInfo = await detectBuildTools(repoPath);

// Returns:
{
  language: 'java',
  buildTool: {
    tool: 'gradle',
    compileCommand: './gradlew compileJava --no-daemon',
    cleanCommand: './gradlew clean --no-daemon',
    testCommand: './gradlew test --no-daemon',
    outputDir: 'build/classes/java/main',
    classPath: ['build/classes/java/main', 'build/classes/java/test'],
    configFile: 'build.gradle',
    detected: true,
    requiresCompilation: true
  },
  supportsSpotBugs: true,
  supportsErrorProne: false,
  compilationRequired: true
}
```

### 2. Compile Repository

```typescript
import { compileRepository } from './tools/build-tool-detector';

if (buildInfo.compilationRequired) {
  const result = await compileRepository(repoPath, buildInfo);

  if (result.success) {
    console.log(`✅ Compiled in ${result.duration}ms`);
  } else {
    console.error(`❌ Compilation failed: ${result.error}`);
  }
}
```

### 3. Check for Existing Compiled Classes

```typescript
import { hasCompiledClasses } from './tools/build-tool-detector';

// Skip compilation if already compiled
if (await hasCompiledClasses(repoPath, buildInfo)) {
  console.log('✅ Using cached compiled classes');
} else {
  await compileRepository(repoPath, buildInfo);
}
```

---

## 📝 Integration with JavaToolOrchestrator

### Before (Without Build Detection)

```typescript
// ❌ PROBLEM: JavaToolOrchestrator doesn't know if SpotBugs can run
class JavaToolOrchestrator {
  async orchestrate(repoPath: string, branch: string) {
    // Should we run SpotBugs? We don't know!
    if (this.config.spotbugs?.enabled) {
      await this.runSpotBugs(repoPath, branch);  // Might fail
    }
  }
}
```

### After (With Build Detection)

```typescript
// ✅ SOLUTION: V9ToolOrchestrator detects build tools first
class V9ToolOrchestrator {
  async analyzePR(prUrl: string) {
    // 1. Clone repo
    const repoPath = await this.cloneRepository(prUrl);

    // 2. Detect build tools
    const buildInfo = await detectBuildTools(repoPath);

    // 3. Compile if needed
    if (buildInfo.compilationRequired) {
      await compileRepository(repoPath, buildInfo);
    }

    // 4. Pass buildInfo to language orchestrator
    const javaOrchestrator = new JavaToolOrchestrator(config);
    const results = await javaOrchestrator.orchestrate(
      repoPath,
      branch,
      buildInfo  // ★ Pass build info
    );
  }
}

class JavaToolOrchestrator {
  async orchestrate(
    repoPath: string,
    branch: string,
    buildInfo?: RepositoryBuildInfo  // ★ Receive build info
  ) {
    // Enable SpotBugs only if supported
    if (buildInfo?.supportsSpotBugs && this.config.spotbugs?.enabled) {
      await this.runSpotBugs(repoPath, branch);  // Will work!
    } else {
      logger.info('⏭️ Skipping SpotBugs (not supported or disabled)');
    }
  }
}
```

---

## 🎯 Agent Integration Example

### Security Agent

```typescript
class SecurityAgent {
  async analyze(
    mainResults: ToolResult[],
    prResults: ToolResult[],
    buildInfo: RepositoryBuildInfo  // ★ Receives build info
  ) {
    // Security agent doesn't care about build tools
    // It just processes tool results
    const newIssues = this.categorizeIssues(mainResults, prResults);

    return {
      category: 'Security',
      issues: newIssues,
      insights: this.generateInsights(newIssues)
    };
  }
}
```

### Quality Agent

```typescript
class QualityAgent {
  async analyze(
    mainResults: ToolResult[],
    prResults: ToolResult[],
    buildInfo: RepositoryBuildInfo  // ★ Receives build info
  ) {
    // Quality agent can use buildInfo for context
    const spotBugsResults = buildInfo.supportsSpotBugs
      ? prResults.find(r => r.tool === 'SpotBugs')
      : null;

    const insights = [
      ...this.analyzePMDResults(prResults),
      ...(spotBugsResults ? this.analyzeSpotBugsResults(spotBugsResults) : [])
    ];

    return {
      category: 'Quality',
      issues: this.categorizeIssues(mainResults, prResults),
      insights
    };
  }
}
```

---

## ⚡ Performance Optimization

### Compilation Caching Strategy

```typescript
class V9ToolOrchestrator {
  private compilationCache = new Map<string, {
    commitHash: string;
    compiledAt: Date;
    outputDir: string;
  }>();

  async analyzePR(prUrl: string) {
    const repoPath = await this.cloneRepository(prUrl);
    const buildInfo = await detectBuildTools(repoPath);

    if (buildInfo.compilationRequired) {
      const commitHash = await this.getCommitHash(repoPath);
      const cached = this.compilationCache.get(repoPath);

      // Skip compilation if same commit already compiled
      if (cached?.commitHash === commitHash) {
        logger.info('✅ Using cached compilation');
      } else {
        await compileRepository(repoPath, buildInfo);
        this.compilationCache.set(repoPath, {
          commitHash,
          compiledAt: new Date(),
          outputDir: buildInfo.buildTool.outputDir!
        });
      }
    }

    // Continue with analysis...
  }
}
```

### Parallel Compilation + Analysis

```typescript
// Compile main branch while analyzing PR with non-compilation tools
const [mainCompiled, prSecurityResults] = await Promise.all([
  compileRepository(mainRepoPath, buildInfo),
  javaOrchestrator.runSecurityTools(prRepoPath)  // Semgrep doesn't need compilation
]);

// Now run quality tools that need compilation
const prQualityResults = await javaOrchestrator.runQualityTools(prRepoPath, buildInfo);
```

---

## 🧪 Testing Strategy

### 1. Build Tool Detection Tests

```typescript
describe('BuildToolDetector', () => {
  it('should detect Gradle in Kafka repo', async () => {
    const buildInfo = await detectBuildTools('/tmp/kafka-repo');

    expect(buildInfo.language).toBe('java');
    expect(buildInfo.buildTool.tool).toBe('gradle');
    expect(buildInfo.supportsSpotBugs).toBe(true);
    expect(buildInfo.compilationRequired).toBe(true);
  });

  it('should detect Maven in Spring PetClinic', async () => {
    const buildInfo = await detectBuildTools('/tmp/petclinic-repo');

    expect(buildInfo.buildTool.tool).toBe('maven');
    expect(buildInfo.buildTool.compileCommand).toBe('mvn compile -q');
  });

  it('should handle Python projects (no compilation)', async () => {
    const buildInfo = await detectBuildTools('/tmp/python-repo');

    expect(buildInfo.language).toBe('python');
    expect(buildInfo.compilationRequired).toBe(false);
    expect(buildInfo.supportsSpotBugs).toBe(false);
  });
});
```

### 2. Integration Tests

```typescript
describe('V9ToolOrchestrator with Build Detection', () => {
  it('should enable SpotBugs for Java repos with Gradle', async () => {
    const orchestrator = new V9ToolOrchestrator();
    const results = await orchestrator.analyzePR('https://github.com/apache/kafka/pull/123');

    const spotBugsResults = results.toolResults.find(r => r.tool === 'SpotBugs');
    expect(spotBugsResults).toBeDefined();
  });

  it('should skip SpotBugs for Python repos', async () => {
    const orchestrator = new V9ToolOrchestrator();
    const results = await orchestrator.analyzePR('https://github.com/python/cpython/pull/456');

    const spotBugsResults = results.toolResults.find(r => r.tool === 'SpotBugs');
    expect(spotBugsResults).toBeUndefined();
  });
});
```

---

## 📊 Supported Languages & Build Tools

| Language | Build Tools | Compilation Required | SpotBugs Support |
|----------|-------------|----------------------|------------------|
| **Java** | Gradle, Maven, Ant, Bazel | ✅ Yes | ✅ Yes |
| **Python** | None (interpreted) | ❌ No | ❌ No |
| **JavaScript** | npm, yarn | ❌ No* | ❌ No |
| **TypeScript** | npm, yarn, tsc | ⚠️ Optional* | ❌ No |
| **Go** | go build | ✅ Yes | ❌ No |
| **Rust** | Cargo | ✅ Yes | ❌ No |

\* TypeScript can be analyzed directly or after compilation - ESLint works on both

---

## 🚀 Future Enhancements

### 1. Build Tool Version Detection

```typescript
// Detect Gradle version for compatibility
{
  tool: 'gradle',
  version: '8.10',  // ★ Add version detection
  compileCommand: './gradlew compileJava --no-daemon'
}
```

### 2. Multi-Module Support

```typescript
// Detect multi-module projects
{
  tool: 'maven',
  modules: [
    { name: 'core', outputDir: 'core/target/classes' },
    { name: 'api', outputDir: 'api/target/classes' }
  ]
}
```

### 3. Incremental Compilation

```typescript
// Only compile changed modules
await compileRepository(repoPath, buildInfo, {
  incremental: true,
  changedFiles: ['core/src/main/java/Foo.java']
});
```

---

## ✅ Benefits of This Design

1. **Separation of Concerns**
   - V9ToolOrchestrator handles build detection
   - Language orchestrators handle tool execution
   - Agents handle issue categorization

2. **Performance**
   - Compile once, use for all agents
   - Cache compilation results
   - Parallel compilation + analysis

3. **Extensibility**
   - Easy to add new languages
   - Easy to add new build tools
   - Easy to add new analysis tools

4. **Maintainability**
   - Single source of truth for build detection
   - Clear responsibilities
   - Easy to test

5. **User Experience**
   - Automatic tool enablement
   - No manual configuration needed
   - Clear error messages when compilation fails

---

## 📝 Summary

**Key Principle**: Build tool detection is a **repository-level concern**, not a tool-level concern.

**Flow**:
1. V9ToolOrchestrator detects build tools once
2. Compiles repository if needed (once for all agents)
3. Passes `buildInfo` to language orchestrators
4. Language orchestrators decide which tools to enable
5. Agents process results without knowing about build tools

**Result**: Clean, performant, maintainable architecture! 🎯

---

**Last Updated**: October 2, 2025
**Status**: Design Complete - Ready for Implementation
