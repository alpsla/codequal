# 🚨 DO NOT DELETE - DeepWiki Standard Implementation

## Critical Files for DeepWiki System

The following files represent MONTHS of work on the DeepWiki standard implementation. They are the PRODUCTION standard and should NEVER be deleted:

### Core Implementation Files
```
packages/agents/src/orchestrator/comparison-orchestrator.ts
packages/agents/src/comparison/ai-comparison-agent.ts
packages/agents/src/researcher/researcher-agent.ts
packages/agents/src/researcher/research-prompts.ts
packages/agents/src/types/deepwiki.ts
```

### Test Files (Validate the System)
```
packages/agents/test/test-weight-based-selection.ts
packages/agents/test/test-dynamic-model-research.ts
packages/agents/test/test-cost-optimized-comparison.ts
```

### Documentation (Months of Design Work)
```
packages/agents/docs/category-scoring-guide.md
packages/agents/docs/skill-tracking-design.md
packages/agents/docs/dependency-analysis-examples.md
packages/agents/docs/dynamic-model-selection-report.md
packages/agents/docs/comparison-agent-performance-analysis.md
```

### Report Templates (Customer-Facing Standards)
```
packages/agents/docs/customer-reports/low-complexity-pr-analysis.md
packages/agents/docs/customer-reports/medium-complexity-pr-analysis.md
packages/agents/docs/customer-reports/high-complexity-pr-analysis.md
packages/agents/docs/customer-reports/enterprise-saas-platform-pr-analysis.md
```

## Key Features Implemented

1. **Dynamic Weight-Based Model Selection**
   - Calculates weights based on repository context
   - No hardcoded models or costs
   - Targets: $0.08 (low), $0.15 (medium), $0.25 (high)

2. **5-Category Scoring System**
   - Security (30% weight)
   - Performance (20% weight)
   - Code Quality (20% weight)
   - Architecture (20% weight)
   - Dependencies (10% weight)

3. **Educational Integration**
   - Skill tracking framework
   - Learning recommendations
   - Progress monitoring

4. **Business Impact Analysis**
   - ROI calculations
   - Time savings metrics
   - Compliance tracking

## The Standard Flow

```
PR Analysis Request 
    → Comparison Orchestrator (dynamic weights)
    → Researcher Agent (finds models 3-6 months old)
    → AI Comparison Agent (generates core report)
    → Reporter Agent (enhances with links/customization)
    → Final Customer Report
```

## Migration in Progress

We are moving to a `/standard/` directory structure but the above files contain ALL the working implementation. Copy, don't delete!

## Contact

If you have questions about this implementation, check:
1. DEEPWIKI-STANDARD-SETUP.md
2. The test files for examples
3. The report templates for output format

---

**THIS IS THE PRODUCTION STANDARD - PRESERVE AT ALL COSTS**