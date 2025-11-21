# File Organization Guide

**Purpose**: Prevent root-level clutter and maintain organized codebase  
**Updated**: 2025-11-07  
**Status**: Enforced in `.cursorrules`

---

## 🎯 **Golden Rule**

**NEVER create files in project root or `packages/agents` root!**

Always use appropriate subdirectories.

---

## 📁 **Standard Directory Structure**

### **Documentation**
```
packages/agents/src/two-branch/docs/
├── next/                            ← PRIMARY! Session continuity
│   └── QUICK_START_NEXT_SESSION.md  (Single source of truth)
│
├── infrastructure/                  ← Oracle, Docker, performance
│   ├── scripts/                     ← Build & deploy scripts
│   │   ├── build-*.sh
│   │   └── deploy-*.sh
│   ├── ORACLE_*.md
│   ├── PARALLEL_TOOL_EXECUTION.md
│   └── README.md
│
├── multi-language/                  ← Language support, roadmaps
│   ├── MULTI_LANGUAGE_*.md
│   └── README.md
│
├── planning/                        ← Implementation plans, analysis
│   ├── IMPLEMENTATION_PLAN_*.md
│   └── *_ANALYSIS.md
│
├── next/                            ← Current session continuity
│   └── QUICK_START_NEXT_SESSION.md (PRIMARY!)
│
└── archive/                         ← Old sessions, resolved bugs
    ├── sessions/
    ├── bugs/
    └── v9_fixes/
```

### **Tests**
```
packages/agents/tests/
├── integration/                     ← E2E tests
│   ├── typescript/
│   │   ├── test-v9-typescript-lite-e2e.ts
│   │   └── test-v9-typescript-validation.ts
│   ├── java/
│   │   └── test-v9-java-lite-e2e.ts
│   └── test-v9-e2e-complete.ts
│
└── unit/                            ← Unit tests
    ├── typescript/
    ├── java/
    └── ...
```

### **Scripts**
```
packages/agents/src/two-branch/docs/infrastructure/scripts/
├── build-all-languages-oracle.sh
├── build-typescript-oracle.sh
├── deploy-typescript-oracle.sh
└── ... (all infrastructure scripts)
```

---

## ✅ **Correct File Placement**

| File Type | Correct Location | Example |
|-----------|-----------------|---------|
| **Session achievements** | Update `docs/next/QUICK_START_NEXT_SESSION.md` | (No separate files!) |
| **Build scripts** | `docs/infrastructure/scripts/` | `build-typescript-oracle.sh` |
| **Deploy scripts** | `docs/infrastructure/scripts/` | `deploy-typescript-oracle.sh` |
| **E2E tests** | `tests/integration/<language>/` | `test-v9-typescript-lite-e2e.ts` |
| **Unit tests** | `tests/unit/<language>/` | `typescript-tool-orchestrator.test.ts` |
| **Validation tests** | `tests/integration/<language>/` | `test-v9-typescript-validation.ts` |
| **Infrastructure docs** | `docs/infrastructure/` | `ORACLE_INFRASTRUCTURE_*.md` |
| **Multi-language docs** | `docs/multi-language/` | `MULTI_LANGUAGE_READINESS_*.md` |
| **Analysis docs** | `docs/planning/` | `COST_ANALYSIS.md` |
| **Comparison docs** | `docs/infrastructure/` | `TYPESCRIPT_VS_JAVA_*.md` |
| **Incident reports** | `docs/archive/bugs/` | `BUG_089_INCIDENT.md` |

---

## ❌ **NEVER Create Here**

```
❌ packages/agents/SESSION_*.md          (use QUICK_START instead!)
❌ packages/agents/SUMMARY_*.md          (use QUICK_START instead!)
❌ packages/agents/HANDOFF_*.md          (use QUICK_START instead!)
❌ packages/agents/test-*.ts             (use tests/integration/)
❌ packages/agents/test-*.sh             (use tests/integration/)
❌ packages/agents/build-*.sh            (use docs/infrastructure/scripts/)
❌ packages/agents/deploy-*.sh           (use docs/infrastructure/scripts/)
❌ packages/agents/*_ANALYSIS.md         (use docs/multi-language/ or docs/planning/)
❌ packages/agents/*_COMPARISON.md       (use docs/infrastructure/)
❌ /Users/.../codequal/*.md (root)       (use packages/agents/src/two-branch/docs/)

GOLDEN RULE: Update QUICK_START_NEXT_SESSION.md, don't create SESSION files!
```

---

## 🔄 **End-of-Session Organization Checklist**

### **Step 1: Check for Misplaced Files**
```bash
cd packages/agents

# List all potentially misplaced files
ls -la SESSION_*.md test-*.ts test-*.sh build-*.sh deploy-*.sh *_ANALYSIS.md 2>/dev/null
```

### **Step 2: Move to Proper Locations (or Delete)**
```bash
# ❌ SESSION files should NOT exist - delete them!
# (Achievements should be in QUICK_START_NEXT_SESSION.md instead)
rm SESSION_*.md SUMMARY_*.md HANDOFF_*.md

# Build/deploy scripts
mv build-*.sh deploy-*.sh src/two-branch/docs/infrastructure/scripts/

# Test files
mv test-*.ts tests/integration/<language>/

# Analysis docs
mv *_ANALYSIS.md src/two-branch/docs/multi-language/
# OR
mv *_ANALYSIS.md src/two-branch/docs/planning/
```

### **Step 3: Verify Clean Root**
```bash
# Should show NO untracked files in packages/agents root
git status | grep "packages/agents/[A-Z]"
# Should be empty!
```

---

## 📚 **Example: Session 16 Organization**

### **Before** (Cluttered ❌):
```
packages/agents/
├── SESSION_16_SUMMARY.md                    ← ROOT (bad! Delete!)
├── SESSION_16_FINAL_SUMMARY.md              ← ROOT (bad! Delete!)
├── TYPESCRIPT_VS_JAVA_TEST_COMPARISON.md    ← ROOT (bad! Move!)
├── build-all-languages-oracle.sh            ← ROOT (bad! Move!)
├── build-typescript-oracle.sh               ← ROOT (bad! Move!)
├── deploy-typescript-oracle.sh              ← ROOT (bad! Move!)
├── test-v9-typescript-e2e.ts                ← ROOT (bad! Move!)
└── test-v9-typescript-validation.ts         ← ROOT (bad! Move!)
```

### **After** (Organized ✅):
```
packages/agents/
├── src/two-branch/docs/
│   ├── next/
│   │   └── QUICK_START_NEXT_SESSION.md      ✅ (Session 16 added to top!)
│   │
│   └── infrastructure/
│       ├── TYPESCRIPT_VS_JAVA_*.md          ✅
│       └── scripts/
│           ├── build-all-languages-oracle.sh    ✅
│           ├── build-typescript-oracle.sh       ✅
│           └── deploy-typescript-oracle.sh      ✅
│
└── tests/integration/typescript/
    ├── test-v9-typescript-lite-e2e.ts       ✅
    └── test-v9-typescript-validation.ts     ✅
```

**Result**: 
- ✅ Clean root (zero session files!)
- ✅ All info in QUICK_START (single source of truth)
- ✅ Scripts organized
- ✅ Tests organized
- ✅ No confusion!

---

## 🚀 **Benefits of Proper Organization**

1. **Easy Navigation**: Know exactly where to find files
2. **No Root Clutter**: Clean `packages/agents/` directory
3. **Consistency**: Same pattern across all sessions
4. **Scalability**: Structure supports growth
5. **Clarity**: Purpose clear from location
6. **Git History**: Related files grouped together

---

## 📖 **Quick Reference**

### **Creating New Files?**

**Ask yourself:**
1. What type of file is this?
2. Which subdirectory does it belong in?
3. Is there an existing directory for this?

**Use this mapping:**
- Session docs → `docs/sessions/YYYY-MM/`
- Infrastructure → `docs/infrastructure/`
- Multi-language → `docs/multi-language/`
- Scripts → `docs/infrastructure/scripts/`
- Tests → `tests/integration/<language>/`

### **Never Ask:**
- ❌ "Should I create in root?" - Answer is always NO
- ❌ "Is packages/agents OK?" - Answer is always NO

---

## 🔧 **Enforced in `.cursorrules`**

This organization is **mandatory** and enforced in:
- `.cursorrules` line 87-109 (FILE ORGANIZATION RULES)
- `.cursorrules` line 116-147 (END-OF-SESSION CHECKLIST)
- `.cursorrules` line 160-170 (SESSION DOCUMENTATION RULES)

**Future sessions will automatically follow this structure!**

---

**Last Updated**: 2025-11-07  
**Applied Starting**: Session 16  
**Status**: Enforced in `.cursorrules`

