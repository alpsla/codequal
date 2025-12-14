# Python Language Support Testing Plan

## Overview

This document outlines the multi-session plan for validating Python support in CodeQual's V9 Analysis system, following the same 3-phase approach successfully used for Java and TypeScript.

**Started**: Session 49
**Status**: Planning Complete
**Previous Languages**: Java (validated), TypeScript (validated)

---

## Background: Session 48 Java Success Metrics

Before starting Python, here are the baseline metrics from Java pattern collection:

| Metric | Value |
|--------|-------|
| Total Patterns | 511 |
| Pattern Growth | 1,210% (39 → 511) |
| Pattern Reuse Ratio | 271,056:1 |
| Unique Rules Covered | 291 |
| Tools with Patterns | eslint (208), pmd (123), checkstyle (88), semgrep (50), dependency-check (42) |

---

## Phase 1: V9 Report Validation

### Objective
Validate that Python V9 analysis generates accurate, comprehensive reports comparable to Java/TypeScript quality.

### Existing Infrastructure

| Component | Status | Location |
|-----------|--------|----------|
| PythonToolOrchestrator | ✅ Built | `src/two-branch/tools/python/python-tool-orchestrator.ts` |
| Python E2E Test | ✅ Exists | `tests/integration/python/test-v9-python-lite-e2e.ts` |
| Docker Image | ✅ Available | `analyzer:lang-python-v4.1-arm` |

### Tools Configured

```typescript
// From python-tool-orchestrator.ts
{
  pylint: { enabled: true },           // Code quality
  bandit: { enabled: true },           // Security scanner
  mypy: { enabled: true, strict: true }, // Type checking
  safety: { enabled: true, level: 'moderate' }, // Dependency vulnerabilities
  semgrep: { enabled: true, config: 'auto' }    // Security patterns
}
```

### Tasks

#### Task 1.1: Run Existing Python V9 Test
- [ ] Execute `test-v9-python-lite-e2e.ts` against Flask repository
- [ ] Verify all 5 tools execute successfully
- [ ] Check issue detection and categorization
- [ ] Validate report generation

**Command:**
```bash
cd packages/agents
npx ts-node tests/integration/python/test-v9-python-lite-e2e.ts
```

#### Task 1.2: Expand Test Scenarios
- [ ] Add Django repository test case
- [ ] Add FastAPI repository test case
- [ ] Verify two-branch comparison works correctly

**Test Repos:**
| Framework | Repository | PR # (suggested) |
|-----------|------------|------------------|
| Flask | pallets/flask | 5000 |
| Django | django/django | 18000 |
| FastAPI | tiangolo/fastapi | 12000 |

#### Task 1.3: Validate Report Quality
- [ ] Check all 34 V9 report sections are populated
- [ ] Verify issue severity mapping is correct
- [ ] Confirm tool attribution is accurate
- [ ] Test grouped report formatting

### Success Criteria (Phase 1)
- [ ] All 5 Python tools execute without errors
- [ ] Issue detection rate > 0 for all major repos
- [ ] Report generation completes successfully
- [ ] Two-branch comparison categorizes issues correctly

---

## Phase 2: Fixing Flow Validation

### Objective
Validate that ScanFixExecutor can generate accurate fixes for Python-specific issues.

### Existing Infrastructure

| Component | Status | Notes |
|-----------|--------|-------|
| ScanFixExecutor | ✅ Built | Language-agnostic, works with any tool |
| Pattern Database | ✅ Ready | Supabase with 511 patterns (mostly Java/TS) |
| AI Fixer | ✅ Operational | OpenRouter integration working |

### Tasks

#### Task 2.1: Create Python Fix Test
- [ ] Create `test-python-fix-flow.ts` following Java pattern
- [ ] Test with small Python repo first
- [ ] Verify fix generation for pylint issues
- [ ] Verify fix generation for bandit issues

**New Test File:** `tests/integration/test-python-fix-flow.ts`

#### Task 2.2: Validate Tool-Specific Fixes
- [ ] Test pylint fixes (code quality)
- [ ] Test bandit fixes (security)
- [ ] Test mypy fixes (type annotations)
- [ ] Test safety fixes (dependency upgrades)
- [ ] Test semgrep fixes (security patterns)

#### Task 2.3: Test Pattern Reuse
- [ ] Run AI fixer on multiple Python repos
- [ ] Check if patterns are being saved
- [ ] Verify pattern lookup works for Python rules
- [ ] Measure initial reuse rate

### Success Criteria (Phase 2)
- [ ] Fixes generated for all 5 tool types
- [ ] Fix application rate > 50%
- [ ] Patterns saved to Supabase successfully
- [ ] No "empty template" broken patterns

---

## Phase 3: Pattern Collection

### Objective
Build comprehensive Python pattern library by processing multiple high-quality repos.

### Target Repositories

| Framework | Repositories | Expected Issues |
|-----------|--------------|-----------------|
| Flask | pallets/flask, pallets/werkzeug | ~500 |
| Django | django/django, djangorestframework | ~2,000 |
| FastAPI | tiangolo/fastapi, pydantic | ~300 |
| Data Science | pandas, numpy, scikit-learn | ~1,000 |
| Utilities | requests, httpx, aiohttp | ~400 |

### Tasks

#### Task 3.1: Create Pattern Collection Test
- [ ] Create `test-python-pattern-collection.ts`
- [ ] Follow Java pattern from `test-java-extended-patterns.ts`
- [ ] Configure all 5 Python tools
- [ ] Set up logging and progress tracking

#### Task 3.2: Run Framework Collections
- [ ] Flask/Werkzeug collection
- [ ] Django/DRF collection
- [ ] FastAPI/Pydantic collection
- [ ] Data science libraries collection
- [ ] HTTP libraries collection

#### Task 3.3: Validate Pattern Quality
- [ ] Check for broken patterns (empty templates)
- [ ] Run cleanup migration if needed
- [ ] Verify pattern confidence levels
- [ ] Test pattern reuse on new repos

### Success Criteria (Phase 3)
- [ ] 100+ unique Python patterns created
- [ ] Pattern reuse ratio > 10:1
- [ ] Coverage for all 5 Python tools
- [ ] No broken patterns in database

---

## Session Checkpoints

### Session 49 Goals
1. ✅ Create this planning document
2. [ ] Run Phase 1 Task 1.1 (existing Python E2E test)
3. [ ] Evaluate results and identify gaps
4. [ ] Begin Phase 1 Task 1.2 if time permits

### Session 50 Goals
1. [ ] Complete Phase 1 validation
2. [ ] Start Phase 2 fix flow testing
3. [ ] Create Python-specific fix test

### Session 51 Goals
1. [ ] Complete Phase 2 validation
2. [ ] Start Phase 3 pattern collection
3. [ ] First batch: Flask + Django repos

### Future Sessions
- Continue pattern collection
- Expand to data science libraries
- Move to Go language support

---

## Commands Reference

### Run Python V9 Test
```bash
cd packages/agents
npx ts-node tests/integration/python/test-v9-python-lite-e2e.ts
```

### Check Pattern Database Status
```bash
# On Oracle server
cd ~/codequal/packages/agents
node -e "
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { count } = await supabase.from('fix_patterns').select('*', { count: 'exact', head: true });
  const { data } = await supabase.from('fix_patterns').select('tool');
  const byTool = {};
  data?.forEach(p => { byTool[p.tool] = (byTool[p.tool] || 0) + 1; });
  console.log('Total patterns:', count);
  console.log('By tool:', byTool);
}
check();
"
```

### Run Pattern Collection (when ready)
```bash
cd packages/agents
LOG_FILE="/tmp/python-patterns-$(date +%Y%m%d_%H%M%S).log"
npx ts-node tests/integration/test-python-pattern-collection.ts 2>&1 | tee "$LOG_FILE"
```

---

## Risk Mitigation

### Known Risks

1. **Docker Image Availability**
   - Python image `analyzer:lang-python-v4.1-arm` must be accessible
   - Fallback: Run tools natively if Docker unavailable

2. **Tool Configuration**
   - Some tools may need Python version-specific configs
   - mypy strict mode may cause many false positives
   - Mitigation: Adjust tool configs based on Phase 1 findings

3. **Pattern Quality**
   - AI may generate Python-specific patterns with syntax errors
   - Mitigation: Add Python-specific validation in pattern save

4. **Repository Selection**
   - Some repos may have unusual structures
   - Mitigation: Test with well-known, standard repos first

---

## Documentation Updates Required

After each phase completion, update:
- [ ] `QUICK_START_NEXT_SESSION.md` - Current status
- [ ] `V9_CRITICAL_KNOWLEDGE_BASE.md` - Python-specific learnings
- [ ] This document - Progress checkboxes

---

## Related Files

| File | Purpose |
|------|---------|
| `src/two-branch/tools/python/python-tool-orchestrator.ts` | Python tool configuration |
| `tests/integration/python/test-v9-python-lite-e2e.ts` | Existing E2E test |
| `src/fix-agent/scan-fix-executor.ts` | Fix execution engine |
| `src/fix-agent/fix-pattern-registry/supabase-pattern-store.ts` | Pattern persistence |

---

*Document created: Session 49*
*Last updated: Session 49*
