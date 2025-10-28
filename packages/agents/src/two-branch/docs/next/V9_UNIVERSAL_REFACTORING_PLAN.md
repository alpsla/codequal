# V9 Universal Refactoring Plan
**Created**: 2025-10-27  
**Goal**: Make V9 truly universal and maintainable for all languages/frameworks

## 🎯 Current State Analysis

### ✅ What's Working Well
1. **Universal Analysis Modes** (`config/analysis-modes.ts`):
   - Language-agnostic mode definitions (fast, standard, thorough, complete)
   - Clean tool category system (CODE_QUALITY, SECURITY, DEPENDENCY_SCAN, STYLE_LINT, ADVANCED)
   - Already supports Java, Python, JavaScript, TypeScript, Go

2. **Language Detection** (`tools/build-tool-detector.ts`):
   - Auto-detects language from file extensions
   - Detects build tools (Maven, Gradle, npm, pip, etc.)
   - Determines compilation requirements

3. **Report Service Architecture**:
   - Successfully extracted 9 service modules (all <500 lines)
   - Clean delegation pattern applied to v9-grouped-report-formatter.ts
   - Zero TypeScript errors, production-ready

### ❌ What Needs Refactoring

1. **Language-Specific Orchestrators** (1,566 lines):
   - Only `java/java-tool-orchestrator.ts` exists
   - ALL orchestration logic embedded in one file
   - Each new language will duplicate this logic

2. **No Framework Detection**:
   - Can't auto-detect Spring vs Quarkus vs Micronaut
   - Framework-specific optimizations not possible
   - User must manually specify framework

3. **Duplicate Formatter Logic** (2,264 lines):
   - `v9-report-formatter.ts` has many duplicate methods
   - Should delegate to services like v9-grouped-report-formatter.ts
   - Can reduce to ~500 lines

## 🏗️ Refactoring Strategy

### Phase 1: Extract Universal Tool Orchestrator Base (Priority: 🔴 CRITICAL)

**Create** `tools/base-tool-orchestrator.ts` (~300 lines):
- Abstract base class with common orchestration logic
- Tool execution pipeline (parallel/sequential)
- Result aggregation and error handling
- Docker container management
- Caching strategy

**Refactor** `java/java-tool-orchestrator.ts` (1,566 → ~400 lines):
- Extend BaseToolOrchestrator
- Only Java-specific logic remains:
  - PMD configuration
  - Checkstyle rules
  - SpotBugs setup
  - Dependency-Check integration

**Benefits**:
- Reduces duplication by ~1,166 lines
- Python/Go/JS orchestrators can reuse base (~200 lines each)
- Consistent error handling across languages

### Phase 2: Create Universal Framework Detector (Priority: 🔴 HIGH)

**Create** `tools/framework-detector.ts` (~200 lines):
```typescript
export interface FrameworkInfo {
  language: string;
  framework: string;           // 'spring-boot', 'quarkus', 'micronaut', 'django', etc.
  version?: string;
  buildTool: string;
  configFiles: string[];
  dependencies: string[];
}

export async function detectFramework(repoPath: string, language: string): Promise<FrameworkInfo>
```

**Detection Strategy**:
- **Java**: Check for Spring/Quarkus/Micronaut dependencies in pom.xml/build.gradle
- **Python**: Check requirements.txt for Django/Flask/FastAPI
- **JavaScript**: Check package.json for React/Vue/Angular/Express
- **Go**: Check go.mod for Gin/Echo/Fiber

**Benefits**:
- Auto-configure tool rulesets per framework
- Framework-specific fix suggestions
- Better educational content (Spring-specific tutorials)

### Phase 3: Apply Delegation Pattern to v9-report-formatter.ts (Priority: 🟡 MEDIUM)

**Current**: 2,264 lines with many duplicate methods from v9-grouped-report-formatter.ts

**Strategy**: Same delegation pattern we used successfully:
1. Identify methods already extracted to services
2. Replace implementations with delegating wrappers
3. Target: ~500 lines

**Estimated Savings**: ~1,764 lines

### Phase 4: Create Universal Tool Registry (Priority: 🟢 LOW)

**Create** `tools/universal-tool-registry.ts` (~150 lines):
```typescript
export interface ToolDefinition {
  name: string;
  category: ToolCategory;
  languages: string[];
  frameworks?: string[];      // Optional framework-specific
  dockerImage: string;
  command: string;
  parseOutput: (output: string) => Issue[];
}

export const UNIVERSAL_TOOL_REGISTRY: ToolDefinition[] = [
  // Java tools
  { name: 'pmd', category: ToolCategory.CODE_QUALITY, languages: ['java'], ... },
  { name: 'semgrep', category: ToolCategory.SECURITY, languages: ['java', 'python', 'js'], ... },
  
  // Python tools
  { name: 'pylint', category: ToolCategory.CODE_QUALITY, languages: ['python'], ... },
  { name: 'bandit', category: ToolCategory.SECURITY, languages: ['python'], ... },
  
  // JavaScript tools
  { name: 'eslint', category: ToolCategory.CODE_QUALITY, languages: ['javascript', 'typescript'], ... },
  ...
]
```

**Benefits**:
- Single source of truth for all tools
- Easy to add new tools/languages
- Consistent tool configuration

## 📊 Expected Results

### Before Refactoring
```
java-tool-orchestrator.ts: 1,566 lines (all Java logic embedded)
v9-report-formatter.ts:    2,264 lines (duplicate methods)
No framework detection
No Python/Go/JS orchestrators
Total: 3,830 lines of language-specific code
```

### After Refactoring
```
base-tool-orchestrator.ts:      300 lines (shared logic)
java-tool-orchestrator.ts:      400 lines (Java-specific only)
python-tool-orchestrator.ts:    200 lines (extends base)
javascript-tool-orchestrator.ts: 200 lines (extends base)
go-tool-orchestrator.ts:        200 lines (extends base)
framework-detector.ts:          200 lines (universal)
v9-report-formatter.ts:         500 lines (delegating)
universal-tool-registry.ts:     150 lines (tool definitions)

Total: 2,150 lines (+4 new languages supported!)
Savings: 1,680 lines (43% reduction)
```

## 🎯 Implementation Order

1. ✅ **Session 10 Complete**: v9-grouped-report-formatter.ts delegation (693 lines saved)
2. 🔴 **Session 11** (Current): Extract BaseToolOrchestrator
3. 🔴 **Session 12**: Create FrameworkDetector
4. 🟡 **Session 13**: Delegate v9-report-formatter.ts
5. 🟢 **Session 14**: Create UniversalToolRegistry
6. ✅ **Session 15**: Test multi-framework (Spring, Quarkus, Micronaut)

## 💡 Key Design Principles

1. **Language-Agnostic First**: Always design for universality
2. **Framework-Aware**: Detect and optimize for specific frameworks
3. **< 500 Lines Per File**: Enforce strict file size limits
4. **Delegation Over Duplication**: Extract to services, delegate from classes
5. **Test Multi-Framework**: Every change must work across frameworks

## 📝 Success Criteria

- ✅ BaseToolOrchestrator extracted and reusable
- ✅ JavaToolOrchestrator reduced to ~400 lines
- ✅ FrameworkDetector works for 3+ Java frameworks
- ✅ v9-report-formatter.ts reduced to ~500 lines
- ✅ Zero TypeScript compilation errors
- ✅ Multi-framework test passes (Spring, Quarkus, Micronaut)
- ✅ Documentation updated

---

**Next Session**: Start with Phase 1 - Extract BaseToolOrchestrator

