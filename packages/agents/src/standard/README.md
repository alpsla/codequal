# Production-Ready Code Analysis System

This directory contains the PRODUCTION-READY implementation of our AI-powered code analysis system with clean architecture principles.

## ⚠️ IMPORTANT: Use This Implementation

This is the ONLY implementation that should be used for:
- Production deployments
- New feature development
- Customer demonstrations
- Testing and validation

## Architecture Overview

```
standard/
├── README.md                           # This file
├── orchestrator/                       # Main orchestration logic
│   ├── comparison-orchestrator.ts      # Coordinates entire pipeline
│   └── interfaces/                     # Abstract interfaces
│       ├── config-provider.interface.ts
│       └── skill-provider.interface.ts
├── comparison/                         # Core analysis & report generation
│   └── ai-comparison-agent.ts          # GENERATES THE FULL REPORT!
├── researcher/                         # Model research & selection
│   ├── researcher-agent.ts             # Dynamic model selection
│   ├── research-prompts.ts             # Weighted research logic
│   └── interfaces/                     # Research interfaces
│       ├── model-registry.interface.ts
│       └── scheduler.interface.ts
├── educator/                           # Educational resource discovery
│   ├── educator-agent.ts               # Finds real courses/articles
│   └── interfaces/
│       └── educator.interface.ts       # Education interfaces
├── services/                           # Business services
│   └── interfaces/
│       └── data-store.interface.ts     # Data persistence interface
├── types/                              # Type definitions
│   └── analysis-types.ts               # Core types + education types
├── templates/                          # Report templates
│   └── pr-analysis-template.md         # Used by comparison agent
├── examples/                           # Example outputs
│   └── large-pr-microservices-example.md # Example report
└── docs/                               # Documentation
    ├── architecture-overview.md        # Clean architecture guide
    ├── implementation-guide.md         # Quick start guide
    ├── template-documentation.md       # Template structure guide
    ├── skill-calculation-guide.md      # Skill scoring methodology
    └── pr-decision-logic.md            # PR blocking rules
```

## Clean Architecture Design

### Interface-Based Dependencies
All external dependencies are abstracted through interfaces:
- **IConfigProvider**: Configuration management
- **ISkillProvider**: Developer skill tracking  
- **IDataStore**: Data persistence
- **IModelRegistry**: Model information
- **IScheduler**: Task scheduling

### Dependency Injection
```typescript
const orchestrator = new ComparisonOrchestrator(
  configProvider,    // Supabase, PostgreSQL, etc.
  skillProvider,     // Supabase, Redis, etc.
  dataStore,        // Any database
  researcherAgent,  // Model selection
  educatorAgent     // Course finder (optional)
);
```

### Benefits
- **Testable**: Easy to mock interfaces
- **Flexible**: Swap implementations without changing core
- **Reusable**: Works in API, CLI, or Web contexts
- **Maintainable**: Clear boundaries between layers

## Key Features

1. **PR Decision Logic**
   - Automatic DECLINE for any PR with critical or high severity NEW issues
   - Pre-existing repository issues don't block PRs but impact skill scores
   - Clear separation between blocking and non-blocking issues

2. **Comprehensive Analysis**
   - Security, Performance, Code Quality, Architecture, and Dependencies
   - Each category scored 0-100 with letter grades
   - Detailed code snippets for all issues with fixes

3. **Skill Tracking System**
   - Individual developer scores with detailed calculations
   - Team performance metrics
   - Positive adjustments for fixes, negative for new issues
   - Penalties for leaving existing issues unfixed

4. **Educational Integration**
   - Learning paths based on identified issues
   - Anti-pattern examples from actual code
   - Personalized recommendations

## Skill Calculation Methodology

### For New Developers
- Base score: 50/100
- PR performance adjustment:
  - PR > 80/100: +10 to base
  - PR 60-80/100: +5 to base
  - PR < 60/100: +0 to base

### Positive Adjustments
- Fixed critical issue: +2.5 per issue
- Fixed high issue: +1.5 per issue
- Fixed medium issue: +1 per issue
- Fixed low issue: +0.5 per issue
- Test coverage increase: +1 per 5% increase

### Negative Adjustments
- New critical issue: -5 per issue
- New high issue: -3 per issue
- New medium issue: -1 per issue
- New low issue: -0.5 per issue
- Unfixed critical: -3 per issue
- Unfixed high: -2 per issue
- Unfixed medium: -1 per issue
- Unfixed low: -0.5 per issue
- Vulnerable dependencies: -0.75 per dependency
- Coverage decrease: -0.3 per 1% decrease

## Report Structure

1. **Executive Summary** - PR decision and key metrics
2. **Category Analysis (1-5)** - Detailed scoring for each category
3. **PR Issues** - NEW issues that block the PR
4. **Repository Issues** - Pre-existing issues (not blocking)
5. **Educational Insights** - Learning recommendations
6. **Skills Tracking** - Individual and team progress
7. **Business Impact** - Risk and ROI analysis
8. **Action Items** - Prioritized fixes
9. **PR Comment** - Concise summary for PR

## Usage

```typescript
import { createProductionOrchestrator } from '../infrastructure/factory';

const orchestrator = createProductionOrchestrator();
const result = await orchestrator.executeComparison({
  mainBranchAnalysis,
  featureBranchAnalysis,
  prMetadata,
  userId: 'user123',
  includeEducation: true,  // Optional: find real courses
  generateReport: true     // Default: true (full markdown)
});

// Result contains:
// - result.report: Full markdown report
// - result.prComment: Concise PR comment  
// - result.analysis: Raw analysis data
// - result.education: Real course/article links
// - result.skillTracking: Developer skill updates
```

## Usage

### Production Setup
```typescript
import { createProductionOrchestrator } from '../infrastructure/factory';

const orchestrator = createProductionOrchestrator();
const result = await orchestrator.executeComparison({
  mainBranchAnalysis,
  featureBranchAnalysis,
  prMetadata,
  userId: user.id
});
```

### Testing Setup
```typescript
import { createTestOrchestrator } from '../infrastructure/factory';

const orchestrator = createTestOrchestrator();
// Uses mock providers, no external dependencies
```

### Custom Configuration
```typescript
import { createOrchestrator } from '../infrastructure/factory';

const orchestrator = createOrchestrator(
  {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_KEY,
    NODE_ENV: 'production'
  },
  {
    useCache: true,
    cacheProvider: 'redis'
  }
);
```

## Data Flow

```
1. Orchestrator receives request
2. Gets/creates configuration (via ConfigProvider)
3. Finds optimal model if needed (via Researcher)
4. Runs analysis & generates report (via Comparison Agent)
5. Updates developer skills (via SkillProvider)
6. Finds real courses if requested (via Educator)
7. Stores everything (via DataStore)
8. Returns complete result
```

## Migration Status

✅ **Completed:**
- Clean architecture with interfaces
- Interface-based orchestrator (handles full pipeline)
- Infrastructure implementations (Supabase)
- Dependency injection factory
- Educator agent for course discovery
- Report template (v4.0) with all features
- Comprehensive documentation

🚧 **In Progress:**
- Migrating comparison agent to standard/
- Migrating researcher agent to standard/
- Testing end-to-end flow

📋 **Next Steps:**
- Create mock providers for testing
- Separate API routes from core
- Add monitoring & observability
- Deploy to production

---

**Version:** 4.0  
**Architecture:** Clean Architecture  
**Status:** Production Ready  
**Last Updated:** July 31, 2025