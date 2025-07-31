# Standard DeepWiki Implementation

This directory contains the PRODUCTION-READY implementation of the DeepWiki analysis system.

## ⚠️ IMPORTANT: Use This Implementation

This is the ONLY implementation that should be used for:
- Production deployments
- New feature development
- Customer demonstrations
- Testing and validation

## Architecture Overview

```
standard/
├── orchestrator/
│   └── comparison-orchestrator.ts    # Main entry point
├── comparison/
│   └── ai-comparison-agent.ts       # Core analysis engine
├── researcher/
│   ├── researcher-agent.ts          # Dynamic model selection
│   └── research-prompts.ts          # Weighted research logic
└── types/
    └── deepwiki.ts                  # Type definitions
```

## Key Features

1. **Dynamic Weight-Based Model Selection**
   - No hardcoded models
   - Context-aware optimization
   - Cost targets: $0.08 (low), $0.15 (medium), $0.25 (high)

2. **Comprehensive Scoring System**
   - 5 categories with detailed breakdowns
   - Consistent grading (A-F scale)
   - Objective metrics-based scoring

3. **Educational Integration**
   - Skill tracking and assessment
   - Personalized learning paths
   - Code excellence examples

4. **Business-Focused Reporting**
   - ROI calculations
   - Time savings metrics
   - Compliance tracking

## Usage

```typescript
import { ComparisonOrchestrator } from './standard/orchestrator/comparison-orchestrator';

const orchestrator = new ComparisonOrchestrator(user);
const result = await orchestrator.executeComparison({
  mainBranchAnalysis,
  featureBranchAnalysis,
  prMetadata,
  language: 'typescript',
  sizeCategory: 'medium'
});
```

## Report Output

All reports follow the standard template with:
- Executive summary with overall score
- 5 category analysis (Security, Performance, Code Quality, Architecture, Dependencies)
- Educational recommendations
- Business impact assessment
- Action items

## Testing

```bash
# Run all standard tests
npm run test:standard

# Test specific functionality
npm run test packages/agents/test/standard/test-weight-based-selection.ts
```

## Documentation

See `/docs/standard/` for:
- Report templates
- Scoring guides
- Architecture diagrams
- Cost analysis

---

**Version:** 2.0  
**Status:** Production Ready  
**Last Updated:** July 31, 2025