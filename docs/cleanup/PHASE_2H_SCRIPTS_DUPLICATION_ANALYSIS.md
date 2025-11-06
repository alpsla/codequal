# Phase 2H Scripts Duplication Analysis

**Date**: November 5, 2025
**Directory**: `packages/agents/src/standard/scripts/`
**Status**: 🔍 **ANALYSIS - Identifying redundant scripts**

---

## 📊 Current State

**16 model configuration scripts** in `standard/scripts/` with clear duplication patterns:

```bash
Total: 16 scripts, ~130 KB

Scripts by category:
- update-* (4 scripts) - Model update scripts
- show-* (2 scripts) - Display/query scripts
- check-* (2 scripts) - Validation scripts
- *-configs* (5 scripts) - Config management
- Other (3 scripts) - Session starter, monitoring
```

---

## 🔍 Duplication Analysis

### 1. Update Scripts (3 duplicates - likely iterative development)

#### update-with-fresh-models.ts (410 lines, 15K) - Sep 12
```typescript
/**
 * Update Configurations with FRESH OpenRouter Models Only
 * Uses dynamic date calculation - NO HARDCODED DATES
 * Only models from last 6 months are considered fresh
 */
```
**Approach**: Dynamic date-based filtering (last 6 months)

#### update-with-latest-models.ts (236 lines, 9.7K) - Sep 12
```typescript
/**
 * Update Configurations with LATEST OpenRouter Models ONLY
 * Prioritizes freshness - NO OLD MODELS ALLOWED
 */
const LATEST_MODELS_2025 = {
  highQuality: {
    primary: 'anthropic/claude-3.5-sonnet-20241022',
```
**Approach**: Hardcoded 2024-2025 model list

#### update-with-real-models.ts (127 lines, 4.9K) - **Sep 15** ✅
```typescript
/**
 * Update configurations with real model discoveries
 * Simulates what the researcher agent would do
 */
import { ModelResearcher } from '../../two-branch/research-services/model-researcher';
```
**Approach**: Uses ModelResearcher (production code)

**VERDICT**:
- ✅ **KEEP**: `update-with-real-models.ts` (most recent, uses ModelResearcher)
- ❌ **DELETE**: `update-with-fresh-models.ts`, `update-with-latest-models.ts` (superseded)

**Reasoning**:
- Most recent (Sep 15 vs Sep 12)
- Uses actual ModelResearcher from two-branch (production)
- User confirmed: "we recently worked with the researcher agent and we had able to generate a new config"

---

### 2. Show/Display Scripts

#### show-discovered-models.ts (180 lines, 8.0K)
```bash
Purpose: Display discovered models
Usage: Likely for debugging/inspection
```

#### show-sample-configs.ts (59 lines, 2.0K)
```bash
Purpose: Show sample configurations
Usage: Likely for documentation/examples
```

**VERDICT**: ⚠️ **VERIFY USAGE** - May be useful for debugging, but check if actually used

---

### 3. Check/Validation Scripts

#### check-latest-models.ts (155 lines, 6.0K)
```bash
Purpose: Validate latest models
```

#### check-table-schema.ts (63 lines, 1.7K)
```bash
Purpose: Check database table schema
```

**VERDICT**: ⚠️ **VERIFY USAGE** - Validation scripts may be useful, but check if actually run

---

### 4. Config Management Scripts (5 scripts)

#### update-configs-with-openrouter.ts (174 lines, 6.2K)
```bash
Purpose: Update configs with OpenRouter models
Likely: Superseded by update-with-real-models.ts
```

#### generate-model-configs.ts (290 lines, 11K)
```bash
Purpose: Generate model configurations
```

#### apply-model-configs-migration.ts (99 lines, 3.5K)
```bash
Purpose: One-time migration script
Likely: Can be deleted (migration complete)
```

#### clear-and-regenerate-configs.ts (37 lines, 1.1K)
```bash
Purpose: Clear and regenerate configs
```

#### retrieve-actual-configs.ts (176 lines, 6.6K)
```bash
Purpose: Retrieve current configs from DB
```

#### verify-stored-configs.ts (80 lines, 2.5K)
```bash
Purpose: Verify configs in database
```

#### discover-openrouter-models.ts (355 lines, 14K)
```bash
Purpose: Discover OpenRouter models
Likely: Superseded by ModelResearcher
```

**VERDICT**:
- ❌ **DELETE**: `apply-model-configs-migration.ts` (one-time migration)
- ❌ **DELETE**: `update-configs-with-openrouter.ts` (likely superseded)
- ❌ **DELETE**: `discover-openrouter-models.ts` (superseded by ModelResearcher)
- ⚠️ **VERIFY**: Others may still be useful for DB operations

---

### 5. Utility Scripts

#### codequal-session-starter.ts (19K)
```bash
Purpose: Session management utilities
Status: Large utility, likely used
```

#### monitoring-dashboard.ts (3.7K) - **Sep 15** ✅
```bash
Purpose: Monitoring dashboard
Status: IMPORTED by standard/utils/session-state-manager.ts
VERDICT: ✅ KEEP (actively used)
```

---

## 📋 Recommended Deletions

### High Confidence (6 scripts, ~58K)

**Superseded by ModelResearcher** (3 scripts):
```bash
❌ update-with-fresh-models.ts (410 lines, 15K)
❌ update-with-latest-models.ts (236 lines, 9.7K)
❌ discover-openrouter-models.ts (355 lines, 14K)
```

**Superseded/One-time** (2 scripts):
```bash
❌ apply-model-configs-migration.ts (99 lines, 3.5K) - migration complete
❌ update-configs-with-openrouter.ts (174 lines, 6.2K) - superseded
```

**Low utility** (1 script):
```bash
❌ show-sample-configs.ts (59 lines, 2.0K) - likely not used
```

**Total**: 6 scripts, ~58KB, 1,333 lines

---

### Medium Confidence (4 scripts, ~30K)

**Validation/Check scripts** - may be useful but check usage:
```bash
⚠️ check-latest-models.ts (155 lines, 6.0K)
⚠️ check-table-schema.ts (63 lines, 1.7K)
⚠️ show-discovered-models.ts (180 lines, 8.0K)
⚠️ clear-and-regenerate-configs.ts (37 lines, 1.1K)
```

**Need to verify**: Are these run manually or referenced anywhere?

---

### Keep (6 scripts, ~42K)

**Actively used**:
```bash
✅ monitoring-dashboard.ts (3.7K) - imported by session-state-manager
✅ update-with-real-models.ts (4.9K) - uses ModelResearcher (most recent)
✅ codequal-session-starter.ts (19K) - session utilities
```

**Likely useful DB operations**:
```bash
✅ generate-model-configs.ts (11K) - may generate initial configs
✅ retrieve-actual-configs.ts (6.6K) - DB query utility
✅ verify-stored-configs.ts (2.5K) - DB validation utility
```

---

## 🎯 Proposed Cleanup Plan

### Option A: Conservative (High Confidence Only)
**Delete 6 scripts** (superseded/one-time):
- update-with-fresh-models.ts
- update-with-latest-models.ts
- discover-openrouter-models.ts
- apply-model-configs-migration.ts
- update-configs-with-openrouter.ts
- show-sample-configs.ts

**Impact**: ~58KB freed, 1,333 lines removed, 16 → 10 scripts

---

### Option B: Aggressive (Include Medium Confidence)
**Delete 10 scripts** (superseded + likely unused):
- All from Option A (6 scripts)
- check-latest-models.ts
- check-table-schema.ts
- show-discovered-models.ts
- clear-and-regenerate-configs.ts

**Impact**: ~88KB freed, 1,768 lines removed, 16 → 6 scripts

---

## ✅ Verification Steps

Before deletion, verify:

1. **No package.json references**:
```bash
grep -r "update-with-fresh-models\|update-with-latest-models\|discover-openrouter" package.json
# Already verified: No results ✅
```

2. **No code imports**:
```bash
rg "import.*from.*scripts/(update-with-fresh|update-with-latest|discover-openrouter)" --type ts
# Already verified: No results ✅
```

3. **ModelResearcher is active**:
```bash
# update-with-real-models.ts imports ModelResearcher ✅
# User confirmed: "we recently worked with the researcher agent" ✅
```

---

## 📊 Before & After

### Before
```
standard/scripts/ (16 files, ~130KB)
├── 4 update-* scripts (3 duplicates!)
├── 2 show-* scripts
├── 2 check-* scripts
├── 5 config management scripts (2 one-time!)
└── 3 utility scripts
```

### After Option A (Conservative)
```
standard/scripts/ (10 files, ~72KB)
├── 1 update-* script (update-with-real-models ✅)
├── 1 show-* script (show-discovered-models)
├── 2 check-* scripts
├── 3 config management scripts
└── 3 utility scripts
```

### After Option B (Aggressive)
```
standard/scripts/ (6 files, ~42KB)
├── 1 update-* script (update-with-real-models ✅)
├── 3 config management scripts (generate, retrieve, verify)
└── 2 utility scripts (monitoring-dashboard, codequal-session-starter)
```

---

## 🔍 User Decision Required

**Which option do you prefer?**

**Option A** (Conservative - RECOMMENDED):
- Delete 6 clearly superseded scripts
- ~58KB freed
- Safe: only removing duplicates and one-time migrations

**Option B** (Aggressive):
- Delete 10 scripts (including validation/check scripts)
- ~88KB freed
- Higher cleanup but may lose debugging utilities

**After your choice**, I'll:
1. Verify zero dependencies (as before)
2. Delete approved scripts
3. Add to Phase 2H commit
4. Update documentation

---

**Status**: ⏳ **AWAITING USER DECISION**
**Recommendation**: Option A (conservative) - clear duplicates only

---

_Phase 2H Scripts Analysis - November 5, 2025_
_Identifying redundant model configuration scripts_
