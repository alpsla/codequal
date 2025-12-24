# UI Development Transition Document

*Created: December 23, 2025*
*Status: Backend Implementation In Progress*
*Next Session: Review Reports + Visualization Tasks*

---

## 📍 Current Status

### Completed ✅
1. **UX Design** - Complete flow for BASIC and PRO tiers
2. **Backend Specification** - Comprehensive requirements documented
3. **Database Schema** - All tables and migrations defined
4. **API Contracts** - All endpoints specified

### In Progress 🔄
**Backend Implementation** (User completing over next few days):
- Unified report generation (BASIC + PRO)
- Database migrations and repositories
- API service layer

### Next Phase ⏭️
**Visualization & UI Development** - After backend verification

---

## 🎯 Next Session Objectives

### 1. Review Implemented Reports

The user will have implemented two report versions. Review and verify:

**BASIC Tier Report** should contain:
| Section | Must Have |
|---------|-----------|
| Header & Score | Score, grade, decision, stats |
| Progress History | Chart OR first-time baseline |
| Remaining Issues | ALL issues with full detail |
| Business Impact | Estimated manual effort |
| Educational | Learning paths for ALL categories |
| Skills & Achievements | Level, XP, basic achievements |
| Metadata | Tools, duration, exports |

**PRO Tier Report** should contain:
| Section | Must Have |
|---------|-----------|
| Header & Score | BEFORE → AFTER score, improvement % |
| Progress History | Same as BASIC |
| **Fix Summary** | ✅ Fixed (grouped by rule), ⚠️ Review required, 🔄 Rolled back, ❌ Cannot fix |
| Remaining Issues | Only UNFIXED issues |
| Business Impact | Time/cost SAVED |
| Educational | Only for REMAINING issues |
| Skills & Achievements | + Community impact, pattern contributions |
| **Commit Info** | Branch, SHA, files modified, review doc |
| Metadata | Same as BASIC |

### 2. Verification Checklist

Run through these checks:

```
□ BASIC report generates successfully
□ PRO report generates successfully  
□ Score improvement displays correctly (PRO)
□ Fixed issues grouped by rule (PRO)
□ Security/Deps/Performance flagged for review (PRO)
□ Rolled back fixes shown separately (PRO)
□ First-time users see baseline message
□ Returning users see history chart
□ Educational content only for remaining issues (PRO)
□ Skills update after analysis
□ XP earned tracked correctly
□ Export formats work (markdown, HTML, SARIF, JSON)
```

### 3. Continue with Visualization Tasks

After verification, proceed with:

1. **Interactive Charts**
   - Score progression line chart
   - Category radar/spider chart
   - Fix distribution pie chart

2. **Fix Pipeline Visualization** (PRO)
   - Real-time progress indicator
   - Tier breakdown visualization
   - Confidence meter

3. **Achievement System Visuals**
   - Badge designs (professional + gamified)
   - Progress bars
   - Level indicators

4. **Component Design**
   - Issue cards with severity indicators
   - Collapsible rule groups
   - Review required banners

---

## 📂 Key Files to Review

### Specification Documents
```
docs/implementation-todos/
├── backend-complete-requirements.md    ← PRIMARY SPEC (58KB)
└── pro-report-generation-requirements.md  ← Detailed section specs

docs/ui-preparation/
├── pro-tier-ux-flow-refined.md        ← UX flow with all decisions
├── ux-design-decisions-summary.md     ← Quick reference
└── visual-design-specs.md             ← Design system (colors, typography)
```

### Expected Implementation Files
```
packages/agents/src/
├── two-branch/report/
│   ├── unified-report-generator.ts    ← Main generator
│   ├── unified-report-types.ts        ← Type definitions
│   └── sections/
│       ├── header-section.ts
│       ├── progress-section.ts
│       ├── fix-summary-section.ts
│       ├── remaining-issues-section.ts
│       ├── business-impact-section.ts
│       ├── educational-section.ts
│       ├── skills-section.ts
│       ├── commit-info-section.ts
│       └── metadata-section.ts
├── api/
│   ├── routes/
│   ├── controllers/
│   └── services/
└── database/
    ├── migrations/
    └── repositories/
```

---

## 🔑 Key Design Decisions (Locked)

These decisions are FINAL - do not revisit:

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Report structure | Same sections, different depth | Inclusive design |
| Fixed issues display | Grouped by rule, collapsible | Not overwhelming |
| Progress tracking | Last 5 PRs default, configurable | Balance detail vs noise |
| First-time users | Baseline message, no chart | Clear starting point |
| Review flagging | Security/Deps/Perf always, confidence threshold | Safety first |
| Output config | User preferences with sensible defaults | Flexibility |
| Report format | Single unified (not separate analysis/fixes) | Simpler UX |
| Skills storage | Cross-repo (account level) | Unified progression |
| Scores storage | Per-repo | Context-specific |

---

## 📊 Sample Report Structures

### BASIC Report JSON Structure
```json
{
  "id": "rpt_xxx",
  "version": "2.0",
  "tier": "basic",
  "header": {
    "score": { "value": 75, "grade": "C" },
    "decision": { "status": "DECLINED", "blockingIssuesCount": 3 },
    "stats": { "totalIssuesFound": 45 }
  },
  "progressHistory": {
    "isFirstTimeUser": false,
    "history": { "analyses": [...], "displayCount": 5 },
    "trend": { "direction": "improving", "changePercent": 12 }
  },
  "remainingIssues": {
    "summary": { "total": 45, "bySeverity": {...} },
    "blocking": [...],
    "highPriority": [...],
    "mediumLow": [...]
  },
  "businessImpact": {
    "time": { "manual": { "value": 270, "formatted": "4.5 hours" } },
    "remainingEffort": { "totalHours": 4.5 }
  },
  "educational": {
    "learningPaths": [...],
    "phasedPlan": {...}
  },
  "skillsAndAchievements": {
    "level": { "current": 5, "title": "Code Guardian" },
    "xpEarned": { "total": 50 }
  },
  "metadata": {...}
}
```

### PRO Report JSON Structure (Additional Fields)
```json
{
  "tier": "pro",
  "header": {
    "score": {
      "value": 92,
      "grade": "A",
      "previous": 75,
      "improvement": 17,
      "improvementPercent": 23
    },
    "decision": {
      "status": "APPROVED",
      "previousStatus": "DECLINED"
    },
    "stats": {
      "totalIssuesFound": 45,
      "issuesFixed": 38,
      "issuesRemaining": 7,
      "issuesRequiringReview": 2
    }
  },
  "fixSummary": {
    "overview": {
      "totalAttempted": 40,
      "totalSuccessful": 38,
      "totalRequiringReview": 2,
      "totalRolledBack": 0,
      "successRate": 95
    },
    "successfullyFixed": {
      "total": 38,
      "byRule": [
        {
          "ruleId": "no-unused-vars",
          "count": 12,
          "tier": "tier1_native",
          "files": [...]
        }
      ]
    },
    "requiresReview": {
      "highPriority": [...],
      "lowConfidence": [...]
    }
  },
  "commitInfo": {
    "branch": { "name": "codequal/fixes-pr-123" },
    "commit": { "sha": "abc123", "message": "fix: CodeQual auto-fixes" },
    "filesModified": { "total": 15 }
  },
  "skillsAndAchievements": {
    "communityImpact": {
      "patternsContributed": 3,
      "developersHelped": 127
    }
  }
}
```

---

## 🎨 Visualization Priority List

When ready for UI work, tackle in this order:

### Priority 1 (Must Have)
1. **Score display component** - Large number with grade badge
2. **Issue severity indicators** - Color-coded severity badges
3. **Progress chart** - Line chart for score history
4. **Fix summary cards** - Grouped fixes with expand/collapse

### Priority 2 (Should Have)
1. **Confidence meter** - Visual confidence indicator
2. **Category breakdown** - Pie or bar chart
3. **Time saved display** - Before/after comparison
4. **Achievement badges** - Basic badge design

### Priority 3 (Nice to Have)
1. **Animated counters** - Counting up animations
2. **Interactive tooltips** - Hover details
3. **Comparison view** - Side-by-side BASIC vs PRO
4. **Export previews** - Preview before download

---

## 🔧 Technical Context

### Current V9 Report Formatter
The existing `v9-grouped-report-formatter.ts` generates a 34-section markdown report. The new unified report generator will:
- Replace this for web reports
- Keep markdown export as one format option
- Add structured JSON for frontend consumption

### Integration Points
```
V9PRAnalyzer.analyzePR()
       ↓
FixBranchOrchestrator.orchestrate()  (PRO only)
       ↓
UnifiedReportGenerator.generate()    ← NEW
       ↓
API Service → Frontend
```

### Database Dependencies
- `fix_patterns` table already exists (for pattern lookups)
- New tables needed: users, user_preferences, user_skills, achievements, analyses, reports

---

## 📝 Session Start Checklist

When starting next session:

1. **Read this document first**

2. **Check implementation status**:
   ```bash
   ls -la packages/agents/src/two-branch/report/
   ls -la packages/agents/src/api/
   ls -la packages/agents/src/database/
   ```

3. **Review sample outputs** (user should provide):
   - BASIC tier sample report JSON
   - PRO tier sample report JSON

4. **Verify acceptance criteria** using checklist above

5. **Proceed to visualization tasks** if backend is complete

---

## 📞 Questions for User

When reviewing implementation:

1. Are both BASIC and PRO reports generating correctly?
2. Any edge cases encountered during implementation?
3. Are database migrations applied and working?
4. Is the API layer complete or partial?
5. Any deviations from the spec that need documenting?

---

*This transition document ensures continuity between backend implementation and UI visualization phases.*
