# CodeQL Integration Plan

## Overview

CodeQL provides deep semantic analysis with data flow tracking, taint analysis, and cross-function vulnerability detection. This document outlines the phased integration plan.

## Key Decisions

### 1. CodeQL vs Semgrep - Complementary Tools

| Aspect | Semgrep | CodeQL |
|--------|---------|--------|
| Analysis Type | Pattern-based (AST matching) | Semantic (data flow, taint tracking) |
| Speed | Fast (~30s for most repos) | Slow (~5-15 min depending on size) |
| Coverage | Surface-level patterns | Deep analysis across functions |
| Best For | Quick scans, CI integration | Thorough security audits |
| Example Finding | `eval(userInput)` pattern | Tracks `userInput` through 5 functions to eval |

**Decision**: Run BOTH tools - Semgrep for all tiers, CodeQL as optional PRO-tier add-on.

### 2. Fix Generation Flow

```
CodeQL (detect issues)
    ↓
Issue List (file:line, severity, description)
    ↓
AI Fixer (generates fix code)
    ↓
Pattern Store (caches fix for reuse)
    ↓
Next occurrence → Pattern Reuse (no AI call)
```

**Important**: CodeQL only DETECTS issues. AI Fixer creates ALL fixes.

### 3. Tier Availability

| Feature | Basic Tier | PRO Tier |
|---------|------------|----------|
| Semgrep | ✅ | ✅ |
| Dependency Check | ✅ | ✅ |
| CodeQL | ❌ | ✅ (opt-in) |
| Estimated Time | ~2-4 min | +10-15 min |

---

## Phase 1: Self-Hosted CodeQL (Current Implementation)

### Scope
- PRO tier only
- User must explicitly opt-in via config
- Runs on our Oracle ARM64 via Docker x86_64 emulation
- All languages supported by CodeQL (JavaScript, TypeScript, Java, Python, Go, etc.)

### User Config Interface

```typescript
interface AnalysisConfig {
  // Existing
  mode: 'fast' | 'standard' | 'thorough' | 'complete';

  // New CodeQL options (PRO tier only)
  codeql?: {
    enabled: boolean;        // Default: false
    queryPack?: 'security' | 'security-extended';  // Default: 'security'
  };
}
```

### Warning Message (UI/API)

When user enables CodeQL:
```
⚠️ CodeQL Deep Security Analysis

CodeQL provides thorough semantic analysis but adds significant time:
- Small repos (<10k LOC): +5-8 minutes
- Medium repos (10k-100k LOC): +10-15 minutes
- Large repos (>100k LOC): +15-30 minutes

Benefits:
✓ Detects complex vulnerabilities (taint tracking, data flow)
✓ Finds issues spanning multiple functions/files
✓ Higher confidence than pattern matching

Continue with CodeQL? [Enable / Skip]
```

### Implementation Changes

#### 1. Add DEEP_SECURITY Category

```typescript
// In analysis-modes.ts
export enum ToolCategory {
  CODE_QUALITY = 'code_quality',
  SECURITY = 'security',
  DEPENDENCY_SCAN = 'dependency_scan',
  STYLE_LINT = 'style_lint',
  ADVANCED = 'advanced',
  DEEP_SECURITY = 'deep_security'  // NEW - CodeQL
}
```

#### 2. Update Language Tool Mappings

```typescript
// Example for TypeScript
typescript: {
  language: 'typescript',
  toolsByCategory: {
    [ToolCategory.CODE_QUALITY]: ['eslint', 'tslint'],
    [ToolCategory.SECURITY]: ['eslint-plugin-security', 'semgrep'],
    [ToolCategory.DEPENDENCY_SCAN]: ['npm-audit', 'snyk'],
    [ToolCategory.STYLE_LINT]: ['prettier', 'eslint'],
    [ToolCategory.ADVANCED]: ['typescript-compiler'],
    [ToolCategory.DEEP_SECURITY]: ['codeql']  // NEW
  }
}
```

#### 3. Update Analysis Mode Config

```typescript
export interface AnalysisModeConfig {
  mode: AnalysisMode;
  description: string;
  estimatedTime: string;
  toolCategories: {
    codeQuality: boolean;
    security: boolean;
    dependencyScan: boolean;
    styleLint: boolean;
    advanced: boolean;
    deepSecurity: boolean;  // NEW - controlled separately
  };
  includeStyleIssues: boolean;
  requiresCompilation: boolean;
}
```

#### 4. Separate Deep Security Toggle

Deep security (CodeQL) is NOT controlled by analysis mode - it's a separate opt-in:

```typescript
export function getToolsForMode(
  language: string,
  mode: AnalysisMode,
  options?: { includeCodeQL?: boolean }  // Separate from mode
): string[] {
  const tools = [...]; // Get standard tools for mode

  // Add CodeQL only if explicitly enabled
  if (options?.includeCodeQL) {
    const mapping = LANGUAGE_TOOL_MAPPINGS[language];
    tools.push(...mapping.toolsByCategory[ToolCategory.DEEP_SECURITY]);
  }

  return tools;
}
```

### Files to Modify

1. **`analysis-modes.ts`** - Add DEEP_SECURITY category
2. **`typescript-tool-orchestrator.ts`** - Add CodeQL tool config
3. **`java-tool-orchestrator.ts`** - Add CodeQL tool config
4. **`python-tool-orchestrator.ts`** - Add CodeQL tool config
5. **`scan-fix-executor.ts`** - Handle CodeQL results in fix pipeline
6. **New: `codeql-config.ts`** - User-facing CodeQL configuration

### Existing CodeQL Runner

The `codeql-runner.ts` is already complete with:
- ARM64 Docker support
- Query pack configuration
- SARIF output parsing
- Issue extraction

```typescript
// Already available in codeql-runner.ts
import { runCodeQL, runCodeQLFast, runCodeQLExtended } from './codeql-runner';

// Usage
const issues = await runCodeQL(workspace, 'typescript', {
  queryPack: 'security'  // or 'security-extended'
});
```

---

## Phase 2: GitHub/GitLab Native Integration (Future)

### Scope
- Trigger native code scanning workflows
- Fetch SARIF results from platform APIs
- No additional infrastructure cost

### GitHub Code Scanning API

```typescript
// Trigger workflow (requires workflow_dispatch)
POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches

// Fetch alerts after scan
GET /repos/{owner}/{repo}/code-scanning/alerts
```

### GitLab SAST API

```typescript
// Trigger pipeline
POST /api/v4/projects/{id}/trigger/pipeline
  with variables: { SAST_DISABLED: 'false' }

// Fetch vulnerabilities
GET /api/v4/projects/{id}/vulnerabilities
```

### Unified SARIF Processor

```typescript
interface UnifiedScanResult {
  source: 'self-hosted' | 'github' | 'gitlab';
  sarif: SARIFReport;
  issues: SecurityIssue[];
}

// Process results from any source
const result = await unifiedProcessor.process(sarif);
```

---

## Phase 3: Dedicated Infrastructure (Post-Deployment)

### Option A: Oracle x86_64 VM

**Specs**: E2.4 (4 OCPU, 32GB RAM)
**Cost**: ~$50-60/month

**Benefits**:
- Native x86_64 (no emulation overhead)
- ~3-5x faster than ARM64 emulation
- Dedicated resources for CodeQL

### Option B: Container Service

Use Oracle Container Engine for Kubernetes (OKE) with:
- x86_64 node pool for CodeQL jobs
- Auto-scaling based on queue depth
- Pay-per-use pricing

---

## Cost Analysis

| Approach | Monthly Cost | Speed | Complexity |
|----------|-------------|-------|------------|
| ARM64 + Emulation | $0 (existing) | Slow | Low |
| Dedicated x86 VM | ~$50-60 | Fast | Medium |
| GitHub GHAS | $30/committer | Fast | Medium |
| GitLab Ultimate | Varies | Fast | Medium |

**Recommendation**: Start with ARM64 emulation (Phase 1), add x86 VM if CodeQL becomes popular with users.

---

## Implementation Checklist

### Phase 1 - Self-Hosted (Current Sprint)

- [ ] Add `DEEP_SECURITY` tool category to `analysis-modes.ts`
- [ ] Update language tool mappings with CodeQL
- [ ] Create CodeQL config interface
- [ ] Add CodeQL opt-in to scan-fix-executor
- [ ] Update V9ToolOrchestrator to support CodeQL
- [ ] Add warning message for time impact
- [ ] Test with sample TypeScript/Java repos
- [ ] Document user-facing configuration

### Phase 2 - Platform Integration (Future)

- [ ] GitHub Code Scanning API integration
- [ ] GitLab SAST API integration
- [ ] Unified SARIF processor
- [ ] Platform detection and routing

### Phase 3 - Infrastructure (Post-Launch)

- [ ] Evaluate CodeQL usage metrics
- [ ] Cost-benefit analysis for x86 VM
- [ ] Auto-scaling implementation

---

## Testing Strategy

### Unit Tests
- CodeQL tool integration
- Config validation
- SARIF parsing

### Integration Tests
- End-to-end CodeQL scan
- Fix generation for CodeQL findings
- Pattern store caching

### Performance Tests
- ARM64 emulation timing
- Memory usage monitoring
- Large repo handling

---

## Related Files

- `src/two-branch/tools/universal/codeql-runner.ts` - CodeQL runner implementation
- `src/two-branch/config/analysis-modes.ts` - Analysis mode configuration
- `src/two-branch/tools/typescript/typescript-tool-orchestrator.ts` - TypeScript tools
- `src/fix-agent/scan-fix-executor.ts` - Fix pipeline
- `tests/integration/test-codeql-comparison.ts` - Performance comparison test
