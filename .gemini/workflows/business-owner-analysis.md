---
description: Strategic business analysis with market intelligence (CEO-level oversight)
---

# Business Owner Analysis Workflow

**Purpose**: Provide comprehensive strategic business analysis combining internal progress with external market intelligence.

**When to use**: Weekly status reviews, feature prioritization, launch decisions, competitive analysis, strategic planning.

**Trigger**: "Run business owner analysis" or "BO analysis"

## Workflow Steps

### Phase 1: Read Current Status (REQUIRED)

1. Read `packages/agents/src/two-branch/docs/next/QUICK_START_NEXT_SESSION.md`
   - Get latest status, current todos, immediate context

2. Read `packages/agents/src/two-branch/docs/next/V9_CRITICAL_KNOWLEDGE_BASE.md`
   - Current solutions, expectations, recent fixes

### Phase 2: Read All Planning Documents (REQUIRED)

3. Read all files in `packages/agents/src/two-branch/docs/planning/`:
   - IMPLEMENTATION_PLAN_2025.md
   - COST_ANALYSIS.md
   - TESTING_STRATEGY.md
   - PRODUCTION_ENVIRONMENT_SETUP.md
   - PHASE_IMPLEMENTATION_PLAN.md
   - TODO_WORKSPACE_FIX.md

### Phase 3: Read Bug Status (REQUIRED)

4. Read all files in `docs/bugs/`
   - Current bug count, blockers, resolution status

### Phase 4: Read Marketing Intelligence (REQUIRED)

5. Read all files in `docs/marketing/`:
   - marketing-plan.md
   - COST_ADVANTAGE_MESSAGING.md
   - backend_critical_services_plan.md
   - implementation-checklist.md
   - Automation initiatives.md

### Phase 5: Read Architecture (REQUIRED)

6. Read `docs/architecture/updated-architecture-document-v4.md`
   - System architecture context

### Phase 6: Check Previous Reports (REQUIRED)

7. Read recent business intelligence reports:
   - `docs/business-intelligence/weekly-reports/` (last 4 weeks)
   - `docs/business-intelligence/strategic-guidance/` (last 3 months)
   - `docs/business-intelligence/feature-priorities/` (all)
   - `docs/business-intelligence/decisions/` (last 30 days)

### Phase 7: Build Context Summary

After reading all files, create mental model:
- Where are we vs. plan?
- What changed since last analysis?
- What are current blockers?
- What decisions are pending?
- What market context is needed?

### Phase 8: Trigger Market Intelligence (if needed)

**Determine if market research is needed:**
- Competitive analysis? → Run market researcher workflow
- Launch timing? → Run market researcher workflow
- Feature prioritization with market context? → Run market researcher workflow
- Pricing decisions? → Run market researcher workflow

**If market intelligence needed:**
- Run the `market-researcher.md` workflow first
- Wait for results
- Incorporate findings into analysis

### Phase 9: Generate Strategic Analysis

Create comprehensive analysis including:

**Strategic Focus:**
- Current top priority based on roadmap analysis

**Key Metrics:**
- Development: Features completed, bugs fixed
- Users: Signups, conversion rates
- Revenue: MRR, growth rates
- Costs: Infrastructure, AI API

**Risks & Blockers:**
- Critical risks with mitigation plans
- Blockers requiring decisions

**Wins This Week/Month:**
- Major achievements
- Progress milestones

**Next Priorities:**
- Top 3 priorities ranked

**Strategic Recommendations:**
- Data-driven recommendations
- Internal analysis + market intelligence
- Actionable next steps

### Phase 10: Save Report

Save to appropriate location in `/docs/business-intelligence/`:

**Weekly Reports:**
```
/docs/business-intelligence/weekly-reports/YYYY-MM-DD-weekly-report.md
```

**Strategic Guidance:**
```
/docs/business-intelligence/strategic-guidance/YYYY-MM-DD-[topic].md
```

**Feature Priorities:**
```
/docs/business-intelligence/feature-priorities/YYYY-MM-DD-[feature-decision].md
```

**Launch Decisions:**
```
/docs/business-intelligence/decisions/YYYY-MM-DD-[decision-topic].md
```

## Output Format

```markdown
## CodeQual Strategic Analysis - [Date]

### 🎯 Strategic Focus
[Current top priority based on roadmap analysis]

### 📊 Key Metrics
- Development: X features completed, Y bugs fixed
- Users: Z signups, conversion rate A%
- Revenue: $MRR, B% growth
- Costs: $C infrastructure, $D AI API

### ⚠️ Risks & Blockers
1. [Critical risk with mitigation plan]
2. [Blocker requiring decision]

### ✅ Wins This [Week/Month]
1. [Major achievement]
2. [Progress milestone]

### 🔮 Next Priorities
1. [Top priority]
2. [Secondary priority]
3. [Third priority]

### 💡 Strategic Recommendations
[Data-driven recommendations combining internal analysis + market intelligence]

### 📈 Market Intelligence
[If market researcher was triggered, include key findings]

### 🎯 Decision Required
[Any decisions that need user input]
```

## Common Use Cases

### Weekly Status Report
**Trigger**: "Run business owner analysis for weekly status"

**Focus**: Development progress, bug status, immediate priorities

### Feature Prioritization
**Trigger**: "Run business owner analysis for feature X vs Y decision"

**Focus**: Market demand, ROI analysis, competitive positioning

### Launch Decision
**Trigger**: "Run business owner analysis for beta launch go/no-go"

**Focus**: Technical readiness, market timing, risk assessment

### Competitive Response
**Trigger**: "Run business owner analysis for competitor X announcement"

**Focus**: Threat assessment, response strategy, positioning

## Integration with Market Researcher

When market intelligence is needed, this workflow automatically triggers the market researcher workflow:

**Example orchestration:**
1. Business Owner reads internal status
2. Identifies need for competitive pricing data
3. Triggers Market Researcher workflow: "Get latest pricing from SonarQube, Snyk, Codacy"
4. Market Researcher returns concise intelligence
5. Business Owner synthesizes internal + external data
6. Generates comprehensive recommendation

## Success Criteria

✅ All required documents read
✅ Context summary created
✅ Market intelligence gathered (if needed)
✅ Strategic analysis generated
✅ Report saved to correct location
✅ Actionable recommendations provided
✅ Decision points clearly identified
