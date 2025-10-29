# Bug #77: Trend Display Not Implemented

**Date:** 2025-10-27
**Status:** 🆕 NEW
**Priority:** MEDIUM (Post Bug Fixes 1-6)

---

## 📋 Description

The skill score baseline is correctly fetched and stored, but the **trend visualization** is not implemented in the reports. The baseline is used for comparison but not displayed to show developer progress over time.

---

## 🔍 Current Behavior

- ✅ Baseline fetched correctly (latest score)
- ✅ Baseline stored correctly after each scan
- ❌ Baseline/trend NOT displayed in reports
- ❌ No visual indicator of improvement/decline

---

## 🎯 Expected Behavior

Reports should show:

```markdown
## Developer Skill Score Progress

**Current Score:** 66/100
**Previous Score:** 70/100
**Trend:** 📉 -4 points

### Historical Trend
- Scan 1 (PR #100): 70/100
- Scan 2 (PR #101): 66/100 ⬇️
- Scan 3 (PR #102): 75/100 ⬆️

**Category Trends:**
- Security: 40 → 50 (+10) ⬆️
- Performance: 40 → 50 (+10) ⬆️
- Quality: 100 → 80 (-20) ⬇️
- Architecture: 100 → 90 (-10) ⬇️
- Dependency: 70 → 60 (-10) ⬇️
```

---

## 🛠️ Implementation Plan

### Phase 1: Display Current vs Previous
1. Add trend section to report template
2. Show current score and baseline
3. Calculate and display delta (+/- points)
4. Add trend indicator emoji (⬆️ ⬇️ ➡️)

### Phase 2: Historical Chart
1. Query last 5-10 scans
2. Generate ASCII chart or sparkline
3. Show trend over time

### Phase 3: Category-Level Trends
1. Track category scores per scan
2. Show improvement/decline per category
3. Highlight biggest changes

---

## 📁 Files to Modify

1. **`v9-grouped-report-formatter.ts`**
   - Add `_generateSkillTrendSection()` method
   - Format baseline vs current comparison
   - Add to report template

2. **`v9-skill-score-manager.ts`**
   - Add `getHistoricalScores()` method
   - Return last N scans for trend display

3. **`score-calculator.ts`**
   - Include baseline in metadata
   - Pass baseline to report formatter

---

## ⏳ Priority

**MEDIUM** - Implement after Bugs #1-6 are fixed

User directive: "We will work on that after bug fixes"

---

## 📝 Notes

- Baseline calculation is CORRECT ✅
- Baseline storage is CORRECT ✅
- Only missing: Display/visualization in reports
- This is an enhancement, not a critical bug

---

**Status:** Logged for implementation after critical bug fixes complete
