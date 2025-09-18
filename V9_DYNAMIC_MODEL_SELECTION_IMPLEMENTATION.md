# V9 Dynamic Model Selection - Complete Implementation Guide

## 🎯 Overview
The V9 system uses a sophisticated dynamic model selection mechanism that:
1. Queries Supabase for optimal model configurations
2. Falls back to Researcher Agent when no config exists
3. Self-updates every 3 months with latest models

## 📂 Implementation Files

### Core Components

#### 1. **Model Researcher Service**
`packages/agents/src/two-branch/research-services/model-researcher-service.ts`
```typescript
class ModelResearcherService {
  // Main entry point for model selection
  async getOptimalModelForContext(context: ContextRequest): Promise<string> {
    // 1. Check if research data is fresh (within 90 days)
    const hasRecentResearch = await this.checkResearchFreshness();

    // 2. If stale, trigger new research
    if (!hasRecentResearch) {
      await this.conductQuarterlyResearch();
    }

    // 3. Query Supabase for best model based on context
    return await this.querySupabaseForModel(context);
  }

  // Scheduled every 3 months
  async conductQuarterlyResearch(): Promise<void> {
    // Searches for new models via OpenRouter
    // Tests performance on sample tasks
    // Updates Supabase configurations
  }
}
```

#### 2. **Researcher Agent**
`packages/agents/src/two-branch/researcher/researcher-agent.ts`
```typescript
class ResearcherAgent {
  async discoverOptimalModel(context: ModelContext): Promise<ModelConfig> {
    // Uses ModelResearcherService
    const modelResearcher = new ModelResearcherService();

    // Check if quarterly research is needed
    const hasRecentResearch = await modelResearcher.checkResearchFreshness();

    if (!hasRecentResearch) {
      console.log('🔬 Triggering quarterly model research...');
      await modelResearcher.conductQuarterlyResearch();
    }

    // Get optimal model for context
    const optimalModel = await modelResearcher.getOptimalModelForContext(context);
    return optimalModel;
  }
}
```

#### 3. **V9 Tool Orchestrator**
`packages/agents/src/two-branch/analyzers/v9-tool-orchestrator.ts`
```typescript
class V9ToolOrchestrator {
  private async getModelForAgent(agent: string, language: string): Promise<string | null> {
    try {
      // Query Supabase first
      const { data, error } = await this.supabase
        .from('model_configurations')
        .select('primary_model')
        .eq('role', role)
        .eq('language', language)
        .limit(1);

      if (data && data[0]?.primary_model) {
        return data[0].primary_model;
      }

      // CURRENT: Throws error if not found
      // TODO: Should call ResearcherAgent here for discovery
      throw new Error(`No model configured for ${agent}`);
    } catch (error) {
      // This is where Researcher fallback should be added
      logger.error(`Failed to get model for ${agent}:`, error);
      throw error;
    }
  }
}
```

## 🔄 Complete Flow

### Primary Flow: Model Already Configured
```
1. V9ToolOrchestrator.getModelForAgent(agent, language)
   ↓
2. Query: SELECT * FROM model_configurations WHERE role=X AND language=Y
   ↓
3. Found → Return model (e.g., "gpt-4o-mini")
   ↓
4. Use model via OpenRouter API
```

### Fallback Flow: No Configuration Exists
```
1. V9ToolOrchestrator.getModelForAgent(agent, language)
   ↓
2. Query Supabase → No results
   ↓
3. SHOULD: Invoke ResearcherAgent.discoverOptimalModel()
   ↓
4. ResearcherAgent calls ModelResearcherService.getOptimalModelForContext()
   ↓
5. ModelResearcherService:
   - Searches available models via OpenRouter
   - Tests performance
   - Stores new config in Supabase
   ↓
6. Returns newly discovered model
   ↓
7. Use model via OpenRouter API
```

### Scheduled Update Flow: Every 3 Months
```
1. Scheduler triggers (via cron or manual)
   ↓
2. ModelResearcherService.conductQuarterlyResearch()
   ↓
3. For each role/language combination:
   - Fetch latest models from OpenRouter
   - Run performance benchmarks
   - Compare with existing configs
   ↓
4. Update Supabase with improvements
   ↓
5. Log research results
```

## 📊 Database Schema

### `model_configurations` Table
```sql
CREATE TABLE model_configurations (
  id UUID PRIMARY KEY,
  role VARCHAR(50),           -- analyzer, security, performance, etc.
  language VARCHAR(20),        -- java, python, rust, etc.
  repository_size VARCHAR(20), -- small, medium, large, enterprise
  primary_model VARCHAR(100),  -- e.g., "openai/gpt-4o-mini"
  fallback_model VARCHAR(100), -- backup model
  temperature DECIMAL(2,1),    -- 0.1 to 1.0
  max_tokens INTEGER,          -- context window
  last_updated TIMESTAMP,
  performance_score DECIMAL,   -- benchmark score
  cost_per_million DECIMAL     -- pricing info
);
```

### `model_research_metadata` Table
```sql
CREATE TABLE model_research_metadata (
  id UUID PRIMARY KEY,
  last_research_date TIMESTAMP,
  next_scheduled_date TIMESTAMP,
  models_discovered INTEGER,
  models_updated INTEGER,
  research_duration_ms INTEGER
);
```

## 🐛 Current Implementation Gap

**Issue:** The V9ToolOrchestrator currently THROWS AN ERROR when no model configuration is found, instead of triggering the Researcher Agent.

**Current Code (Line 688-693):**
```typescript
// NO FALLBACK - Throw error with full details
throw new Error(`Failed to get model configuration for ${agent} from Supabase...`);
```

**Should Be:**
```typescript
// Fallback to Researcher Agent for discovery
const researcher = new ResearcherAgent();
const context = {
  role: this.mapAgentToRole(agent),
  language,
  repositorySize: this.determineRepoSize()
};
const discoveredModel = await researcher.discoverOptimalModel(context);

// Store for future use
await this.storeModelConfiguration(agent, language, discoveredModel);

return discoveredModel;
```

## 🔧 Scheduler Implementation

`packages/agents/src/two-branch/scheduler/run-scheduler.ts`
```typescript
// Scheduler that runs every 3 months
const researcherAgent = new ResearcherAgent(systemUser);
const modelResearcher = new ModelResearcherService();

// Check and update models
const researcherHealth = await monitoringService.checkHealth('researcher');
if (shouldRunQuarterlyUpdate()) {
  await modelResearcher.conductQuarterlyResearch();
}
```

## 🚀 How to Trigger Manual Research

```bash
# Trigger immediate model research
npx ts-node packages/agents/src/two-branch/scripts/trigger-model-research.ts

# Run scheduled update
npx ts-node packages/agents/src/two-branch/scheduler/run-scheduler.ts
```

## 📝 Key Findings

1. **ResearcherAgent** exists at: `packages/agents/src/two-branch/researcher/researcher-agent.ts`
2. **ModelResearcherService** exists at: `packages/agents/src/two-branch/research-services/model-researcher-service.ts`
3. **Quarterly updates** are implemented in `conductQuarterlyResearch()`
4. **Supabase lookup** is implemented in `V9ToolOrchestrator.getModelForAgent()`
5. **Missing piece:** Orchestrator doesn't fallback to Researcher when config not found

## 💡 Recommendations

1. **Implement Fallback:** Modify `V9ToolOrchestrator.getModelForAgent()` to call ResearcherAgent when Supabase returns no results
2. **Add Caching:** Cache discovered models in memory for faster subsequent lookups
3. **Add Metrics:** Track how often fallback is triggered
4. **Add Alerts:** Notify when new models are discovered or performance improvements found

---

*This implementation allows the V9 system to:*
- **Self-discover** optimal models for new contexts
- **Self-update** with latest models every quarter
- **Self-optimize** based on performance benchmarks
- **Access all models** via OpenRouter as the single payment gateway