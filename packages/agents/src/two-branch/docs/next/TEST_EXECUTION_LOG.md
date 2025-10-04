# Test Execution Log - Skill Score Validation

**Repository:** apache/kafka
**Test Developer:** test@codequal.com
**Purpose:** Validate skill score calculation, baseline tracking, and delta logic
**Start Date:** 2025-10-03

---

## Test Configuration

| Setting | Value |
|---------|-------|
| Repository | apache/kafka |
| Test PR | #17620 (consumer timeout fix) |
| Developer Email | test@codequal.com |
| Penalty/Bonus | Critical: ±5, High: ±2, Medium: ±1, Low: ±0.5 |
| Baseline Logic | AVG(last 5 PRs) or 50 for first-time |

---

## Execution History

| Run # | Date | Time | PR # | New Issues (C/H/M/L) | Resolved (C/H/M/L) | Score | Baseline | Delta | Database Confirmed | Notes |
|-------|------|------|------|----------------------|--------------------|-------|----------|-------|-------------------|-------|
| 1 | | | 17620 | 0/2/8/2 | 1/2/2/0 | | 50 | | ⏸️ | First PR - baseline should be 50 |
| 2 | | | 17620 | 0/2/8/2 | 1/2/2/0 | | | 0 | ⏸️ | Identical - baseline = Run 1 score |
| 3 | | | 17621 | 1/5/10/4 | 0/0/0/0 | | | | ⏸️ | More issues - baseline = AVG(1,2) |
| 4 | | | 17622 | 0/1/3/1 | 2/3/5/0 | | | | ⏸️ | Cleanup - baseline = AVG(1,2,3) |
| 5 | | | 17623 | 0/0/5/3 | 0/1/2/0 | | | | ⏸️ | Baseline = AVG(1,2,3,4) |
| 6 | | | 17624 | 0/0/2/1 | 1/0/3/0 | | | | ⏸️ | Baseline = AVG(2,3,4,5) **← Excludes Run 1!** |

---

## Score Calculation Validation

### Run 1: First PR Analysis
**Expected Score Calculation:**
```
New Issues: 0 critical, 2 high, 8 medium, 2 low
Penalties: (0 × -5) + (2 × -2) + (8 × -1) + (2 × -0.5) = 0 - 4 - 8 - 1 = -13

Resolved: 1 critical, 2 high, 2 medium, 0 low
Bonuses: (1 × +5) + (2 × +2) + (2 × +1) + (0 × +0.5) = 5 + 4 + 2 + 0 = +11

Score = 100 - 13 + 11 = 98/100
Baseline = 50 (first PR)
Delta = +48
```

**Actual Results:**
- Score: _____
- Baseline: _____
- Delta: _____
- **Status:** ⏸️ PENDING

### Run 2: Identical PR (Baseline Update Test)
**Expected Score Calculation:**
```
Issues identical to Run 1
Score = 98/100 (same calculation)
Baseline = 98 (from Run 1)
Delta = 0
```

**Actual Results:**
- Score: _____
- Baseline: _____
- Delta: _____
- **Status:** ⏸️ PENDING

### Run 3: Increased Issues (Decline Test)
**Expected Score Calculation:**
```
New Issues: 1 critical, 5 high, 10 medium, 4 low
Penalties: (1 × -5) + (5 × -2) + (10 × -1) + (4 × -0.5) = -5 - 10 - 10 - 2 = -27

Resolved: 0 (no fixes)
Bonuses: 0

Score = 100 - 27 = 73/100
Baseline = (98 + 98) / 2 = 98
Delta = -25 (decline)
```

**Actual Results:**
- Score: _____
- Baseline: _____
- Delta: _____
- **Status:** ⏸️ PENDING

### Run 4: Major Cleanup (Improvement Test)
**Expected Score Calculation:**
```
New Issues: 0 critical, 1 high, 3 medium, 1 low
Penalties: (0 × -5) + (1 × -2) + (3 × -1) + (1 × -0.5) = -2 - 3 - 0.5 = -5.5

Resolved: 2 critical, 3 high, 5 medium, 0 low
Bonuses: (2 × +5) + (3 × +2) + (5 × +1) + (0 × +0.5) = 10 + 6 + 5 = +21

Score = 100 - 5.5 + 21 = 115.5 → Capped at 100/100
Baseline = (98 + 98 + 73) / 3 = 89.67
Delta = +11 (rounded from +10.33)
```

**Actual Results:**
- Score: _____
- Baseline: _____
- Delta: _____
- **Status:** ⏸️ PENDING

---

## Baseline Calculation Validation

### ✅ Test 1: First PR Baseline
- **Expected:** Baseline = 50 (default for new developer)
- **Actual:** _____
- **SQL Query:**
```sql
SELECT overall_score, analyzed_at
FROM skill_scores
WHERE developer_email = 'test@codequal.com'
  AND repo_name = 'apache/kafka'
ORDER BY analyzed_at ASC
LIMIT 1;
-- Should show first PR with no previous baseline
```
- **Status:** ⏸️ PENDING

### ✅ Test 2: Second PR Baseline (Single Score)
- **Expected:** Baseline = Run 1 score
- **Actual:** _____
- **SQL Query:**
```sql
SELECT
  pr_number,
  overall_score,
  analyzed_at
FROM skill_scores
WHERE developer_email = 'test@codequal.com'
  AND repo_name = 'apache/kafka'
ORDER BY analyzed_at ASC
LIMIT 2;
-- Run 2 baseline should equal Run 1 score
```
- **Status:** ⏸️ PENDING

### ✅ Test 3: Third PR Baseline (Two-Score Average)
- **Expected:** Baseline = (Run 1 + Run 2) / 2
- **Actual:** _____
- **SQL Query:**
```sql
SELECT
  AVG(overall_score) as calculated_baseline,
  COUNT(*) as count_used
FROM (
  SELECT overall_score
  FROM skill_scores
  WHERE developer_email = 'test@codequal.com'
    AND repo_name = 'apache/kafka'
  ORDER BY analyzed_at DESC
  LIMIT 5  -- Will only get 2 scores at this point
) subquery;
-- Should show avg of 2 scores
```
- **Status:** ⏸️ PENDING

### ✅ Test 4: Sixth PR Baseline (Last 5 Only - Excludes First)
- **Expected:** Baseline = (Run 2 + Run 3 + Run 4 + Run 5) / 4 **← NO Run 1!**
- **Actual:** _____
- **SQL Query:**
```sql
SELECT
  pr_number,
  overall_score,
  analyzed_at,
  ROW_NUMBER() OVER (ORDER BY analyzed_at DESC) as recency_rank
FROM skill_scores
WHERE developer_email = 'test@codequal.com'
  AND repo_name = 'apache/kafka'
ORDER BY analyzed_at DESC;
-- Rows with recency_rank 1-5 should be used for baseline
-- Run 1 should have recency_rank = 6 and be EXCLUDED
```
- **Status:** ⏸️ PENDING

---

## Delta Calculation Validation

### ✅ Test 1: Positive Delta (Improvement)
**Scenario:** Run 4 - Major cleanup
- **Expected:** Delta > 0
- **Actual:** _____
- **Status:** ⏸️ PENDING

### ✅ Test 2: Negative Delta (Decline)
**Scenario:** Run 3 - Increased issues
- **Expected:** Delta < 0
- **Actual:** _____
- **Status:** ⏸️ PENDING

### ✅ Test 3: Zero Delta (Consistent)
**Scenario:** Run 2 - Identical to Run 1
- **Expected:** Delta = 0
- **Actual:** _____
- **Status:** ⏸️ PENDING

---

## Database Consistency Checks

### Check 1: skill_scores Table
```sql
SELECT
  pr_number,
  overall_score,
  quality_score,
  new_issues_count,
  resolved_issues_count,
  critical_issues_count,
  high_issues_count,
  medium_issues_count,
  low_issues_count,
  analyzed_at
FROM skill_scores
WHERE developer_email = 'test@codequal.com'
  AND repo_name = 'apache/kafka'
ORDER BY analyzed_at ASC;
```

**Expected:** 6 rows after all tests complete
**Actual:** _____

### Check 2: developer_metrics Table
```sql
SELECT
  developer_email,
  current_score,
  best_score,
  average_score,
  total_prs_analyzed,
  total_issues_resolved,
  total_issues_introduced,
  current_streak,
  best_streak,
  first_analysis_at,
  last_analysis_at
FROM developer_metrics
WHERE developer_email = 'test@codequal.com';
```

**Expected Values After 6 Runs:**
- `total_prs_analyzed`: 6
- `current_score`: Score from Run 6
- `best_score`: Maximum of all 6 scores
- `average_score`: AVG of last 5 scores
- `current_streak`: Depends on improvements
- `best_streak`: Longest consecutive improvement streak

**Actual:** _____

### Check 3: pr_analysis_history Table
```sql
SELECT
  repo_name,
  pr_number,
  decision,
  quality_score,
  grade,
  new_issues_count,
  resolved_issues_count,
  analyzed_at
FROM pr_analysis_history
WHERE repo_name = 'apache/kafka'
  AND pr_number IN (17620, 17621, 17622, 17623, 17624)
ORDER BY analyzed_at ASC;
```

**Expected:** 6 rows with complete V9 report data
**Actual:** _____

---

## Streak Calculation Validation

### ✅ Streak Test 1: Consecutive Improvements
**Scenario:**
- Run 1: Score 98, Baseline 50 → Improved (+48)
- Run 2: Score 98, Baseline 98 → Stable (0)
- Run 3: Score 73, Baseline 98 → Declined (-25)
- Run 4: Score 100, Baseline 89.67 → Improved (+10.33)

**Expected Streak After Run 4:**
- `current_streak`: 1 (only Run 4 improved)
- `best_streak`: 1 (Run 1 improved, then broken by Run 2)

**Actual:**
- `current_streak`: _____
- `best_streak`: _____
- **Status:** ⏸️ PENDING

---

## Issues Found During Testing

| Issue # | Run # | Description | Severity | Status | Resolution |
|---------|-------|-------------|----------|--------|------------|
| | | | | ⏸️ | |

---

## Testing Notes

### Pre-Test Checklist
- [ ] Database tables created (`skill_scores`, `developer_metrics`, `pr_analysis_history`)
- [ ] Test developer account (`test@codequal.com`) ready
- [ ] Apache Kafka repository cloned
- [ ] Environment variables set (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
- [ ] Test script ready (`test-v9-optimized-report.ts`)

### Post-Test Actions
- [ ] Review all score calculations
- [ ] Verify baseline logic
- [ ] Confirm delta calculations
- [ ] Check database consistency
- [ ] Document any issues found
- [ ] Update V9_CRITICAL_KNOWLEDGE_BASE.md with findings

---

## Test Execution Commands

### Run Test
```bash
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents
npx ts-node src/two-branch/tests/__tests__/test-v9-optimized-report.ts
```

### Check Database After Each Run
```bash
# Quick check
psql $SUPABASE_DATABASE_URL -c "SELECT pr_number, overall_score, analyzed_at FROM skill_scores WHERE developer_email = 'test@codequal.com' ORDER BY analyzed_at DESC LIMIT 5;"

# Full check
psql $SUPABASE_DATABASE_URL -f src/two-branch/docs/next/validate-scores.sql
```

---

**Last Updated:** _____
**Tested By:** _____
**Overall Status:** ⏸️ PENDING - Awaiting first test run

---

## Quick Reference

**Score Formula:**
```
Score = 100 - Σ(new issue penalties) + Σ(resolved bonuses)
Critical: ±5, High: ±2, Medium: ±1, Low: ±0.5
```

**Baseline Formula:**
```
Baseline = AVG(last 5 PR scores) or 50 for first-time developer
```

**Delta Formula:**
```
Delta = Current Score - Baseline
Positive = Improvement 🎉
Zero = Consistent ➡️
Negative = Decline ⚠️
```
