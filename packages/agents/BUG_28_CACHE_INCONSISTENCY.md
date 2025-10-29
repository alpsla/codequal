# Bug #28: Cached Scores Show Inconsistent Data

**Status**: 🔍 IDENTIFIED - Fix Ready  
**Severity**: HIGH (Shows incorrect scores to users)  
**Discovered**: 2025-10-20 (Session 2025-10-20)

## 🐛 Problem

The database contains **inconsistent cached scores** for commit `e00be57`:

```
Database shows:
  overall_score: 0/100
  security_score: 63/100
  performance_score: 50/100
  architecture_score: 100/100
  dependency_score: 100/100
  code_quality_score: 50/100
```

**This is mathematically impossible!** 

Since `overall_score = MIN(category_scores)`, it should be:
```
overall_score = MIN(63, 50, 100, 100, 50) = 50
NOT 0!
```

## 🔍 Root Cause

1. In a **previous test run**, the scoring logic was broken
2. It saved **inconsistent scores** to Supabase:
   - Category scores: calculated (63, 50, 100, 100, 50)
   - Overall score: incorrectly saved as 0

3. In the **current test run**:
   - Cache lookup finds commit `e00be57` ✅
   - Returns all scores from database ✅
   - **BUT the cached data is wrong!** ❌

## 📊 Expected vs Actual

With **150,099 NEW issues**, the scores SHOULD be:

```
Security: 0/100 (massive deductions)
Performance: 0/100 (107 critical issues alone = -535)
Architecture: 0/100 (thousands of issues)
Dependencies: 0/100 (thousands of issues)
Code Quality: 0/100 (thousands of issues)

APP Score: 0/100 (MIN of all categories)
Skill Score: 0/100 (baseline 50 - massive deductions)
```

**The user is correct** - with that many issues, scores should be 0!

The cached category scores (63, 50, 100, 100, 50) are from a **different analysis** with fewer issues.

## 🔧 Fix

### Step 1: Inspect Bad Data (Supabase SQL Editor)

```sql
SELECT 
  pr_number,
  LEFT(commit_sha, 7) as commit,
  overall_score,
  security_score,
  performance_score,
  architecture_score,
  dependency_score,
  code_quality_score,
  analyzed_at
FROM app_scores
WHERE repo_name = 'https://github.com/apache/kafka.git'
  AND commit_sha LIKE 'e00be57%';
```

### Step 2: Delete Corrupted Cache

```sql
-- Delete app scores
DELETE FROM app_scores
WHERE repo_name = 'https://github.com/apache/kafka.git'
  AND commit_sha LIKE 'e00be57%';

-- Delete skill scores
DELETE FROM skill_scores
WHERE repo_name = 'https://github.com/apache/kafka.git'
  AND commit_sha LIKE 'e00be57%';
```

### Step 3: Verify Deletion

```sql
SELECT 
  (SELECT COUNT(*) FROM app_scores WHERE commit_sha LIKE 'e00be57%') as app,
  (SELECT COUNT(*) FROM skill_scores WHERE commit_sha LIKE 'e00be57%') as skill;
-- Should return: app: 0, skill: 0
```

### Step 4: Re-run Test

```bash
ssh oracle "cd ~/codequal/packages/agents && npx ts-node test-v9-e2e-complete.ts"
```

This will calculate fresh scores without cached data.

## 🎯 Expected Result After Fix

With 150,099 NEW issues, the report should show:

```
Security: 0/100
Performance: 0/100
Architecture: 0/100
Dependencies: 0/100
Code Quality: 0/100

APP Score: 0/100
Skill Score: 0/100

Decision: ⛔ DECLINED (10 blocking issues)
```

## 📝 Lessons Learned

1. **Cache validation needed**: Should verify MIN(categories) = overall before using cache
2. **Issue count tracking**: Should log issue counts when saving scores for debugging
3. **Data integrity**: Add database constraints to prevent inconsistent saves

## 🔗 Related

- **Cache Logic**: `v9-grouped-report-formatter.ts:700-705` (checkCachedScoresForCommit)
- **Save Logic**: `v9-grouped-report-formatter.ts:859-916` (calculateFullV9Score)
- **Display Logic**: `v9-grouped-report-formatter.ts:1129-1165` (generateExecutiveSummary)

## ✅ Verification Checklist

After cleanup and re-run:

- [ ] No cached scores found for commit e00be57
- [ ] Fresh calculation runs
- [ ] All category scores = 0/100 (or close to 0)
- [ ] APP score = 0/100
- [ ] Skill score = 0/100
- [ ] Overall score = MIN(category scores)
- [ ] New scores saved to database with correct values

