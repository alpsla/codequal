# Phase 2 Implementation Notes: DeepWiki Dynamic Configuration

## Current State (Tests)
In the Phase 2 integration tests, we're using **hardcoded models** for simplicity:
```typescript
const config: MultiAgentConfig = {
  agents: [
    { provider: 'openai', model: 'gpt-3.5-turbo', role: 'codeQuality' }, // Hardcoded
    { provider: 'claude', model: 'claude-3-opus', role: 'security' }     // Hardcoded
  ]
};
```

## Target Implementation (Production)
The orchestrator should **dynamically select** DeepWiki models based on:

### 1. Repository Context
```typescript
interface DeepWikiModelSelector {
  selectModel(context: {
    repositorySize: 'small' | 'medium' | 'large';
    primaryLanguage: string;
    prComplexity: number;
    securityCritical: boolean;
    performanceCritical: boolean;
  }): DeepWikiModelConfig;
}
```

### 2. Dynamic Configuration Flow
```
PR Analysis → Orchestrator → Vector DB Query → DeepWiki Config → Model Selection
     ↓              ↓               ↓                  ↓               ↓
  Metadata    Complexity      Historical      Optimal Models    Agent Creation
  Extraction   Detection       Patterns        Retrieved         with Config
```

### 3. Configuration Storage in Vector DB
```typescript
// Stored in analysis_chunks table
{
  repository_id: 'deepwiki-model-configs',
  content: {
    configs: [
      {
        context: {
          size: 'small',
          languages: ['javascript', 'typescript'],
          complexity: 'low'
        },
        models: {
          primary: 'gpt-3.5-turbo',
          fallback: 'claude-3-haiku',
          tokenBudget: 4000
        }
      },
      {
        context: {
          size: 'large',
          languages: ['python'],
          complexity: 'high',
          domain: 'ml'
        },
        models: {
          primary: 'gpt-4-turbo',
          fallback: 'claude-3-opus',
          tokenBudget: 32000
        }
      }
    ]
  },
  metadata: {
    content_type: 'deepwiki_model_config',
    last_updated: '2025-06-09',
    version: '1.0'
  }
}
```

### 4. Implementation Components

#### A. DeepWikiConfigService
```typescript
export class DeepWikiConfigService {
  constructor(
    private vectorDB: VectorContextService,
    private researcherAgent: ResearcherAgent // For config updates
  ) {}

  async getOptimalConfig(
    prContext: PRAnalysisContext,
    repositoryHistory: RepositoryVectorContext
  ): Promise<DeepWikiConfig> {
    // 1. Query Vector DB for matching configs
    const configs = await this.vectorDB.searchConfigs({
      repository_size: prContext.size,
      language: prContext.primaryLanguage,
      complexity: prContext.complexityScore
    });

    // 2. Score and rank configurations
    const rankedConfigs = this.rankConfigurations(configs, prContext);

    // 3. Return best match with fallbacks
    return this.buildOptimalConfig(rankedConfigs[0]);
  }

  async updateConfigurations(): Promise<void> {
    // Called periodically by RESEARCHER agent
    const newConfigs = await this.researcherAgent.discoverOptimalConfigs();
    await this.vectorDB.storeConfigurations(newConfigs);
  }
}
```

#### B. Orchestrator Integration
```typescript
// In EnhancedMultiAgentExecutor
private async selectDeepWikiModels(): Promise<ModelSelections> {
  const configService = new DeepWikiConfigService(
    this.vectorContextService,
    this.researcherAgent
  );

  const prContext = this.analyzePRContext();
  const repositoryHistory = await this.vectorContextService.getRepositoryContext(
    this.repositoryData.repositoryId,
    'orchestrator',
    this.authenticatedUser
  );

  const optimalConfig = await configService.getOptimalConfig(
    prContext,
    repositoryHistory
  );

  return this.mapConfigToAgents(optimalConfig);
}
```

### 5. Key Benefits
1. **Adaptive**: Models selected based on actual repository characteristics
2. **Cost-Optimized**: Smaller repos get cheaper models, complex repos get powerful models
3. **Learning**: RESEARCHER agent continuously improves configurations
4. **Fallback-Ready**: Each configuration includes fallback options

### 6. Migration Path
1. **Phase 2 Tests**: Use hardcoded models (current state) ✅
2. **Phase 3**: Implement DeepWikiConfigService with static configs
3. **Phase 4**: Add RESEARCHER agent integration for dynamic updates
4. **Phase 5**: Full adaptive system with learning

### 7. Example: Dynamic Selection in Action
```typescript
// Small JavaScript PR
prContext: { size: 'small', language: 'javascript', complexity: 2 }
→ Selected: gpt-3.5-turbo (fast, cheap, sufficient)

// Large Python ML PR
prContext: { size: 'large', language: 'python', complexity: 8, domain: 'ml' }
→ Selected: gpt-4-turbo (powerful, handles complexity)

// Security-critical PR
prContext: { size: 'medium', language: 'java', securityCritical: true }
→ Selected: claude-3-opus (excellent at security analysis)
```

## Next Steps
1. Complete Phase 2 tests with hardcoded models ✅
2. Design DeepWikiConfigService interface
3. Implement configuration storage schema
4. Add configuration selection logic to orchestrator
5. Integrate with RESEARCHER agent for updates
