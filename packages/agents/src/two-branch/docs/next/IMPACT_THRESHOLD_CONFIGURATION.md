# Impact Threshold Configuration Guide

**Date:** October 3, 2025
**Status:** ✅ IMPLEMENTED - Option B (Stricter) with Team-Configurable Thresholds

---

## Overview

The V9 Impact Calculation determines whether a PR should be **APPROVED** or **DECLINED** based on the severity and count of issues found. Teams can now configure custom thresholds to match their quality standards.

## Decision Logic

**DECLINED** if ANY of the following conditions are met:
- Critical issues > `IMPACT_CRITICAL_THRESHOLD` (default: 0)
- High issues > `IMPACT_HIGH_THRESHOLD` (default: 0)
- Medium issues > `IMPACT_MEDIUM_THRESHOLD` (default: 0)

**APPROVED** if:
- Only low-severity issues found
- Issue counts below configured thresholds

---

## Configuration Options

### Option 1: Default (Recommended - Critical/High Only)

```bash
# .env configuration
IMPACT_CRITICAL_THRESHOLD=0     # ANY critical = DECLINED
IMPACT_HIGH_THRESHOLD=0         # ANY high = DECLINED
IMPACT_MEDIUM_THRESHOLD=999999  # Medium does NOT decline (default)
```

**Use Case:**
- Most production applications
- Balance between quality and velocity
- Focus on serious security/quality issues only

**Result:**
- ✅ 0 critical, 0 high, 100 medium → APPROVED ✅
- ✅ 0 critical, 0 high, 2000 low → APPROVED ✅
- ❌ 1 critical → DECLINED
- ❌ 1 high → DECLINED
- ✅ 100 medium + 2000 low → APPROVED (medium/low don't block)

---

### Option 2: Strict (Include Medium Issues)

```bash
# .env configuration
IMPACT_CRITICAL_THRESHOLD=0   # ANY critical = DECLINED
IMPACT_HIGH_THRESHOLD=0       # ANY high = DECLINED
IMPACT_MEDIUM_THRESHOLD=0     # ANY medium = DECLINED (strictest)
```

**Use Case:**
- Security-critical applications (banking, healthcare)
- Financial trading platforms
- Zero-tolerance quality policies

**Result:**
- ✅ 0 critical, 0 high, 0 medium → APPROVED
- ❌ 1 critical → DECLINED
- ❌ 1 high → DECLINED
- ❌ 1 medium → DECLINED (stricter than default)

---

### Option 3: Lenient (Focus on Critical Only)

```bash
# .env configuration
IMPACT_CRITICAL_THRESHOLD=0   # ANY critical = DECLINED
IMPACT_HIGH_THRESHOLD=10      # 1-10 high = OK, 11+ = DECLINED
IMPACT_MEDIUM_THRESHOLD=50    # 1-50 medium = OK, 51+ = DECLINED
```

**Use Case:**
- Legacy codebases under migration
- POC/MVP development
- Internal tools with lower risk

**Result:**
- ✅ 0 critical, 8 high, 40 medium → APPROVED
- ❌ 0 critical, 11 high, 0 medium → DECLINED
- ❌ 1 critical → DECLINED (always blocks)

---

## How to Configure

### 1. Environment Variables (.env)

```bash
# packages/agents/.env
IMPACT_CRITICAL_THRESHOLD=0
IMPACT_HIGH_THRESHOLD=0
IMPACT_MEDIUM_THRESHOLD=0
```

### 2. Team Settings (Database - Future)

```typescript
// Future: Store team preferences in Supabase
interface TeamSettings {
  teamId: string;
  impactThresholds: {
    critical: number;  // Default: 0
    high: number;      // Default: 0
    medium: number;    // Default: 0
  };
  autoDecline: boolean;  // Auto-decline on threshold breach
  notifyOnDecline: boolean;
}
```

### 3. Per-Repository Settings (Future)

```yaml
# .codequal.yml in repository root
quality:
  impact_thresholds:
    critical: 0
    high: 5
    medium: 20
  auto_decline: true
```

---

## Impact Display

The Risk Matrix shows impact level per category:

| Category | NEW | RESOLVED | EXISTING | Impact |
|----------|-----|----------|----------|--------|
| Security | 1 🔴 Critical | 0 | 2 | 🔴 Critical |
| Quality  | 8 🟠 High | 5 | 120 | 🟠 High |
| Performance | 15 🟡 Medium | 2 | 40 | 🟡 Medium |
| Architecture | 3 🟢 Low | 1 | 10 | 🟢 Low |

**Impact Legend:**
- 🔴 **Critical** - Blocks PR (critical issues found)
- 🟠 **High** - Blocks PR (high issues above threshold)
- 🟡 **Medium** - Blocks PR (medium issues above threshold)
- 🟢 **Low** - Approved (only low-severity issues)

---

## Testing Different Configurations

### Test 1: Default (Strictest)

```bash
# Test with strictest settings
export IMPACT_CRITICAL_THRESHOLD=0
export IMPACT_HIGH_THRESHOLD=0
export IMPACT_MEDIUM_THRESHOLD=0

npx ts-node src/two-branch/tests/__tests__/test-v9-optimized-report.ts
```

**Expected:**
- 0 critical, 0 high, 0 medium → ✅ APPROVED
- 1 high → ❌ DECLINED

### Test 2: Balanced

```bash
# Test with balanced settings
export IMPACT_CRITICAL_THRESHOLD=0
export IMPACT_HIGH_THRESHOLD=5
export IMPACT_MEDIUM_THRESHOLD=20

npx ts-node src/two-branch/tests/__tests__/test-v9-optimized-report.ts
```

**Expected:**
- 3 high, 15 medium → ✅ APPROVED
- 6 high → ❌ DECLINED

### Test 3: Lenient

```bash
# Test with lenient settings
export IMPACT_CRITICAL_THRESHOLD=0
export IMPACT_HIGH_THRESHOLD=10
export IMPACT_MEDIUM_THRESHOLD=50

npx ts-node src/two-branch/tests/__tests__/test-v9-optimized-report.ts
```

**Expected:**
- 8 high, 40 medium → ✅ APPROVED
- 11 high → ❌ DECLINED

---

## Recommendations by Industry

| Industry | Critical | High | Medium | Rationale |
|----------|----------|------|--------|-----------|
| **Banking/Finance** | 0 | 0 | 0 | Zero tolerance for security/quality issues |
| **Healthcare** | 0 | 0 | 5 | Patient safety critical, tolerate minor style issues |
| **E-commerce** | 0 | 3 | 15 | Security critical, performance important |
| **SaaS Products** | 0 | 5 | 20 | Balance speed and quality |
| **Internal Tools** | 0 | 10 | 50 | Focus on critical/high only |
| **Open Source** | 0 | 5 | 20 | Encourage contributions, maintain quality |

---

## Migration Guide

### From Old Logic (Count-based) → New Logic (Severity-based)

**Old (WRONG):**
```typescript
// Based on total count - 2,061 LOW issues = Critical!
if (blocking > 10) impact = '🔴 Critical';
```

**New (CORRECT):**
```typescript
// Based on severity - 2,061 LOW issues = Low
if (critical > IMPACT_CRITICAL_THRESHOLD) impact = '🔴 Critical';
else if (high > IMPACT_HIGH_THRESHOLD) impact = '🟠 High';
else if (medium > IMPACT_MEDIUM_THRESHOLD) impact = '🟡 Medium';
else impact = '🟢 Low';
```

---

## Monitoring and Adjustment

### Track DECLINED PRs

```sql
-- Count declined PRs by threshold
SELECT
  COUNT(*) as declined_count,
  AVG(critical_issues) as avg_critical,
  AVG(high_issues) as avg_high,
  AVG(medium_issues) as avg_medium
FROM pr_analysis_history
WHERE decision = 'DECLINED'
  AND analyzed_at > NOW() - INTERVAL '30 days';
```

### Adjust Thresholds Based on Data

If DECLINED rate > 50%, consider relaxing thresholds:
- Increase `HIGH_THRESHOLD` by 5
- Increase `MEDIUM_THRESHOLD` by 10

If DECLINED rate < 10%, consider tightening:
- Keep `CRITICAL_THRESHOLD` at 0 (always)
- Decrease `HIGH_THRESHOLD` to 0
- Decrease `MEDIUM_THRESHOLD` to 10

---

## FAQ

**Q: Why is CRITICAL_THRESHOLD always 0?**
A: Even 1 critical issue (SQL injection, RCE, auth bypass) is unacceptable. Teams cannot configure this.

**Q: Can teams disable auto-decline?**
A: Yes (future feature). Teams can get reports without auto-declining PRs.

**Q: What happens if we don't set thresholds?**
A: Defaults to 0 (strictest) - ANY critical/high/medium = DECLINED.

**Q: How do we see what caused the DECLINED decision?**
A: Check the Risk Matrix in the V9 report - shows exact counts and impact per category.

---

## Implementation

**File:** `src/two-branch/analyzers/v9-report-formatter.ts`
**Lines:** 205-221

```typescript
// Team-configurable thresholds
const criticalThreshold = parseInt(process.env.IMPACT_CRITICAL_THRESHOLD || '0', 10);
const highThreshold = parseInt(process.env.IMPACT_HIGH_THRESHOLD || '0', 10);
const mediumThreshold = parseInt(process.env.IMPACT_MEDIUM_THRESHOLD || '0', 10);

let impact = '🟢 Low';
if (critical > criticalThreshold) {
  impact = '🔴 Critical';
} else if (high > highThreshold) {
  impact = '🟠 High';
} else if (medium > mediumThreshold) {
  impact = '🟡 Medium';
}
```

---

**Status:** ✅ Production Ready
**Default Behavior:** Strictest (0, 0, 0) - Best for security
**Configurable:** Yes, via environment variables
**Future Enhancements:** Database team settings, per-repo config files
