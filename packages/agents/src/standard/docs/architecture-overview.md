# Architecture Overview

## Clean Architecture Implementation

This implementation follows clean architecture principles with clear separation between business logic and infrastructure.

## Directory Structure

```
packages/agents/src/
├── standard/                    # Core business logic (no external dependencies)
│   ├── orchestrator/           # Main orchestration logic
│   │   ├── comparison-orchestrator.ts
│   │   └── interfaces/         # Abstract interfaces
│   │       ├── config-provider.interface.ts
│   │       └── skill-provider.interface.ts
│   ├── comparison/             # Core analysis engine & report generation
│   │   └── ai-comparison-agent.ts  # GENERATES THE FULL REPORT
│   ├── researcher/             # Model research & selection
│   │   └── interfaces/
│   │       ├── model-registry.interface.ts
│   │       └── scheduler.interface.ts
│   ├── educator/               # Educational resource discovery
│   │   ├── educator-agent.ts
│   │   └── interfaces/
│   │       └── educator.interface.ts
│   ├── services/               # Business services
│   │   └── interfaces/
│   │       └── data-store.interface.ts
│   ├── types/                  # Shared type definitions
│   │   └── analysis-types.ts
│   ├── templates/              # Report templates (used by comparison agent)
│   ├── examples/               # Example outputs
│   └── docs/                   # Documentation
│
├── infrastructure/             # External dependencies & implementations
│   ├── factory.ts             # Dependency injection
│   ├── supabase/              # Supabase implementations
│   │   ├── supabase-config-provider.ts
│   │   ├── supabase-skill-provider.ts
│   │   └── supabase-data-store.ts
│   ├── redis/                 # Redis cache (optional)
│   └── mock/                  # Mock implementations for testing
│
├── api/                       # API layer (future)
│   ├── routes/
│   └── middleware/
│
└── web/                       # Web interface (future)
    └── components/
```

## Key Design Principles

### 1. Interface-Based Design
All external dependencies are accessed through interfaces:
- `IConfigProvider` - Configuration management
- `ISkillProvider` - Developer skill tracking
- `IDataStore` - Data persistence
- `IModelRegistry` - Model information
- `IScheduler` - Task scheduling
- `IEducatorAgent` - Educational resource discovery

### 2. Dependency Injection
The orchestrator receives all dependencies through constructor injection:

```typescript
class ComparisonOrchestrator {
  constructor(
    private configProvider: IConfigProvider,
    private skillProvider: ISkillProvider,
    private dataStore: IDataStore,
    private researcherAgent: ResearcherAgent,
    private educatorAgent?: IEducatorAgent,  // Optional
    private logger?: any
  ) {}
}
```

### 3. Factory Pattern
The factory creates and wires dependencies based on environment:

```typescript
// Production
const orchestrator = createProductionOrchestrator();

// Testing
const orchestrator = createTestOrchestrator();

// Custom
const orchestrator = createOrchestrator(env, options);
```

### 4. Clean Separation
- **Core Logic** (`/standard`): No framework dependencies
- **Infrastructure** (`/infrastructure`): Framework-specific code
- **API** (`/api`): HTTP/REST concerns
- **Web** (`/web`): UI concerns

## Data Flow

```
User Request
    ↓
API Layer (Express/Fastify/etc)
    ↓
Orchestrator (Core Logic)
    ↓
├── Config Provider → Get/Create Configuration
├── Researcher → Find Optimal Model (if needed)
├── Comparison Agent → Analyze Code & Generate Report
├── Skill Provider → Update Skills
├── Educator Agent → Find Real Courses (optional)
└── Data Store → Save Complete Results
    ↓
Response (Markdown Report + Education + JSON)
```

## Benefits

1. **Testability**: Easy to mock interfaces for unit tests
2. **Flexibility**: Swap implementations without changing core logic
3. **Reusability**: Core logic works in API, CLI, or Web contexts
4. **Maintainability**: Clear boundaries between layers
5. **Scalability**: Add new providers without modifying core

## Usage Examples

### API Usage
```typescript
import { createProductionOrchestrator } from './infrastructure/factory';

app.post('/api/analyze', async (req, res) => {
  const orchestrator = createProductionOrchestrator();
  const result = await orchestrator.executeComparison(req.body);
  res.json(result);
});
```

### CLI Usage
```typescript
import { createOrchestrator } from './infrastructure/factory';

const orchestrator = createOrchestrator(process.env, {
  useCache: true
});

const result = await orchestrator.executeComparison(params);
console.log(result);
```

### Testing
```typescript
import { createTestOrchestrator } from './infrastructure/factory';

describe('Orchestrator', () => {
  it('should analyze PR', async () => {
    const orchestrator = createTestOrchestrator();
    const result = await orchestrator.executeComparison(mockData);
    expect(result.success).toBe(true);
  });
});
```

## Key Insights

### Report Generation
- **Comparison Agent generates the complete report** - No separate reporter needed!
- Uses the markdown template directly
- Includes all sections: analysis, skills, education suggestions, PR comment

### Educator Role
- **Enhances** the report with real course/article/video links
- Searches internet using AI search models (Perplexity, Tavily, etc.)
- Optional component - only runs if requested

### Simplified Flow
1. Orchestrator coordinates the pipeline
2. Comparison agent analyzes AND generates full report
3. Educator finds real learning resources
4. Everything saved and returned

## Migration Path

1. ✅ **Phase 1**: Create interfaces and core logic
2. ✅ **Phase 2**: Implement infrastructure providers
3. ✅ **Phase 3**: Create dependency injection
4. ✅ **Phase 4**: Create educator agent
5. 🚧 **Phase 5**: Migrate comparison & researcher agents
6. 📋 **Phase 6**: Separate API routes
7. 📋 **Phase 7**: Add monitoring and observability

## Next Steps

1. Copy remaining agents (comparison, researcher, reporter)
2. Update imports to use interfaces
3. Create mock providers for testing
4. Migrate API routes to separate layer
5. Add error handling and retry logic
6. Implement caching layer
7. Add metrics and monitoring

---

*Last Updated: July 31, 2025*