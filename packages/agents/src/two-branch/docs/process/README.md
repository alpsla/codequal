# Process Documentation Index

**Last Updated**: 2025-09-29
**Status**: Current and Maintained

---

## 📚 Current Documentation (Use These!)

### Primary Reference
- **[TWO_BRANCH_ANALYSIS_COMPLETE_GUIDE.md](./TWO_BRANCH_ANALYSIS_COMPLETE_GUIDE.md)** ⭐
  - **Most comprehensive and up-to-date**
  - Complete two-branch execution strategy
  - Performance calibration results (Java)
  - Multi-tool execution framework
  - Language-specific calibration templates
  - Caching strategy with Redis
  - Production deployment guide

### Supporting Documentation

1. **[ORACLE_PERFORMANCE_SUMMARY.md](./ORACLE_PERFORMANCE_SUMMARY.md)**
   - Executive summary of calibration results
   - Quick reference for optimal configurations
   - Deployment commands
   - Production recommendations

2. **[PERFORMANCE_CALIBRATION_RESULTS.md](./PERFORMANCE_CALIBRATION_RESULTS.md)**
   - Detailed calibration test results
   - Performance degradation analysis
   - Technical findings and graphs
   - Hardware specifications

3. **[MULTI_TOOL_EXECUTION_STRATEGY.md](./MULTI_TOOL_EXECUTION_STRATEGY.md)**
   - Multi-tool orchestration design
   - Tool-specific configurations
   - Resource allocation matrix
   - Testing plan

4. **[MULTI_TOOL_STRATEGY_SUMMARY.md](./MULTI_TOOL_STRATEGY_SUMMARY.md)**
   - Session summary for multi-tool work
   - Issues discovered during testing
   - Next steps and priorities

---

## 🗂️ Documentation Organization

```
/packages/agents/src/two-branch/docs/
├── process/                          ← YOU ARE HERE
│   ├── README.md                     ← This index file
│   ├── TWO_BRANCH_ANALYSIS_COMPLETE_GUIDE.md  ⭐ PRIMARY REFERENCE
│   ├── ORACLE_PERFORMANCE_SUMMARY.md
│   ├── PERFORMANCE_CALIBRATION_RESULTS.md
│   ├── MULTI_TOOL_EXECUTION_STRATEGY.md
│   ├── MULTI_TOOL_STRATEGY_SUMMARY.md
│   ├── V9_ANALYZER_FIX_PROCESS.md    (older, kept for reference)
│   └── V9_DEPENDENCY_MIGRATION_PLAN.md (older, kept for reference)
│
├── next/
│   └── QUICK_START_NEXT_SESSION.md   ← Session handoff
│
└── session_summary/
    ├── SESSION_2025_09_29_BATCHING_OPTIMIZATION.md
    └── SESSION_2025_09_29_FINAL_CALIBRATION_COMPLETE.md
```

---

## 🎯 Quick Navigation

### I want to...

**Understand two-branch analysis**
→ Read [TWO_BRANCH_ANALYSIS_COMPLETE_GUIDE.md](./TWO_BRANCH_ANALYSIS_COMPLETE_GUIDE.md) - Section: "Two-Branch Execution Strategy"

**See calibration results**
→ Read [ORACLE_PERFORMANCE_SUMMARY.md](./ORACLE_PERFORMANCE_SUMMARY.md) - Quick summary
→ Read [PERFORMANCE_CALIBRATION_RESULTS.md](./PERFORMANCE_CALIBRATION_RESULTS.md) - Detailed analysis

**Deploy to production**
→ Read [TWO_BRANCH_ANALYSIS_COMPLETE_GUIDE.md](./TWO_BRANCH_ANALYSIS_COMPLETE_GUIDE.md) - Section: "Production Deployment"
→ Read [ORACLE_PERFORMANCE_SUMMARY.md](./ORACLE_PERFORMANCE_SUMMARY.md) - Section: "Deployment Commands"

**Configure tools for a language**
→ Read [TWO_BRANCH_ANALYSIS_COMPLETE_GUIDE.md](./TWO_BRANCH_ANALYSIS_COMPLETE_GUIDE.md) - Section: "Language-Specific Configurations"

**Run multi-tool analysis**
→ Read [MULTI_TOOL_EXECUTION_STRATEGY.md](./MULTI_TOOL_EXECUTION_STRATEGY.md) - Complete implementation details

**Start next session**
→ Read [../next/QUICK_START_NEXT_SESSION.md](../next/QUICK_START_NEXT_SESSION.md)

---

## ✅ What's Complete

- [x] **Java PMD calibration** - 4 parallel, 300 batch, 3 threads = 63s
- [x] **Two-branch strategy** - Clear workflow for main + PR analysis
- [x] **Caching implementation** - Redis with 24h TTL, validated
- [x] **Multi-tool framework** - Staged execution design
- [x] **Documentation consolidated** - All in proper location

---

## 🔄 What's In Progress

- [ ] **Java multi-tool calibration** - Semgrep, Checkstyle, SpotBugs testing
- [ ] **Python calibration** - Need to select test repo and calibrate
- [ ] **JavaScript/TypeScript calibration** - Not started
- [ ] **V9ToolOrchestrator integration** - Code changes needed

---

## 📋 Outdated Files (For Reference Only)

These files contain historical information but may be outdated:

1. **V9_ANALYZER_FIX_PROCESS.md** (2025-09-10)
   - Historical process documentation
   - Some information superseded by newer docs
   - Keep for historical reference

2. **V9_DEPENDENCY_MIGRATION_PLAN.md** (2025-09-10)
   - Historical migration planning
   - Most actions completed
   - Keep for historical reference

3. **ORACLE_FINAL_TEST_RESULTS.md** (moved to ../ORACLE_FINAL_TEST_RESULTS.md)
   - Initial test results (68s baseline)
   - Superseded by PERFORMANCE_CALIBRATION_RESULTS.md (63s optimal)
   - Keep for comparison

---

## 🔑 Key Concepts

### Two-Branch Analysis
Execute analysis on BOTH main and PR branches, then compare:
```
Main Branch → Analyze → Cache (24h)
PR Branch → Analyze → Compare with Main
Result: NEW / RESOLVED / EXISTING issues
```

### Performance Calibration
Find optimal configuration for each tool on target hardware:
```
Test: 4, 5, 6, 8, 10, 12 parallel configurations
Result: 4 parallel is optimal for 4-core Oracle A1.Flex
Reason: Resource contention with more parallelism
```

### Language-Specific Configuration
Each language needs its own calibration:
```
Java PMD: 4 parallel, 300 batch, 3 threads ✅
Python pylint: TBD (needs calibration) 🔄
JavaScript ESLint: TBD (needs calibration) 🔄
```

### Caching Strategy
Main branch results cached for 24h:
```
First PR: 168s (main) + 168s (PR) = 336s
Next PRs: <1s (main cache) + 168s (PR) = 168s
Benefit: 50% faster!
```

---

## 📞 Contact / Questions

For questions or updates:
1. Check [TWO_BRANCH_ANALYSIS_COMPLETE_GUIDE.md](./TWO_BRANCH_ANALYSIS_COMPLETE_GUIDE.md) first
2. Review session summaries in `/session_summary/`
3. Check next session plan in `/next/QUICK_START_NEXT_SESSION.md`

---

## 🔄 Document Maintenance

**When to update this index**:
- New documentation added
- Major process changes
- Files become outdated
- New language calibrations complete

**Last Major Update**: 2025-09-29 (Two-branch analysis consolidation)

---

**Status**: ✅ Current and Comprehensive