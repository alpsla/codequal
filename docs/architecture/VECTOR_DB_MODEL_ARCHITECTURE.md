# Vector DB Model Architecture - Correct Implementation

## Overview

The system uses a dynamic model selection mechanism where:

1. **Researcher Agent** runs quarterly to research and store optimal models in Vector DB
2. **Model configurations** are stored per role, language, and repository size
3. **Orchestrator** pulls configurations from Vector DB (both primary and fallback)
4. **No hardcoded agent types** - agents are created dynamically based on what's in DB
5. **OpenRouter** is used as the API gateway (models access it via their API keys)

## Key Principles

### 1. No Hardcoded Models or Agent Types
- Agent types (ChatGPT, Claude, etc.) are NOT hardcoded
- Researcher determines which provider/model is best for each context
- Agent factory creates agents dynamically based on DB configuration

### 2. Both Primary and Fallback Models Stored
- Researcher provides TWO models for each configuration
- Primary model: Best overall score
- Fallback model: Second best, preferably different provider
- Both stored in Vector DB

### 3. Role-Based Cost Weights
Each agent role has specific cost vs capability tradeoffs:

```typescript
const roleWeights = {
  security: {
    capabilities: { codeQuality: 0.3, reasoning: 0.4, detailLevel: 0.2, speed: 0.1 },
    costWeight: 0.2  // 20% cost, 80% capability - prioritize quality
  },
  dependency: {
    capabilities: { speed: 0.4, codeQuality: 0.3, reasoning: 0.2, detailLevel: 0.1 },
    costWeight: 0.4  // 40% cost, 60% capability - can use cheaper models
  },
  orchestrator: {
    capabilities: { reasoning: 0.4, speed: 0.3, codeQuality: 0.2, detailLevel: 0.1 },
    costWeight: 0.15 // 15% cost, 85% capability - needs high quality
  }
  // ... other roles
}
```

## Database Schema

### model_configurations Table
```typescript
{
  id: string;
  language: string;          // "javascript", "python", etc.
  size_category: string;     // "small", "medium", "large"
  agent_role: string;        // "security", "performance", etc.
  primary_model: {
    provider: string;        // "openai", "anthropic", etc.
    model: string;          // "gpt-4", "claude-3-5-sonnet", etc.
    temperature: number;
    maxTokens: number;
  };
  fallback_model: {
    provider: string;
    model: string;
    temperature: number;
    maxTokens: number;
  };
  test_results: {
    primary: { qualityScore, avgResponseTime, cost, etc. },
    fallback: { qualityScore, avgResponseTime, cost, etc. }
  };
  created_at: string;
  updated_at: string;
}
```

## Flow Diagram

```
┌─────────────────┐
│ Researcher Agent│ ← Runs quarterly
└────────┬────────┘
         │ Tests models with role-specific weights
         │ Stores primary + fallback
         ▼
┌─────────────────┐
│   Vector DB     │
│ model_configs   │
└────────┬────────┘
         │ findOptimalModel(role, language, size)
         │ Returns: [primary, fallback]
         ▼
┌─────────────────┐
│  Orchestrator   │
└────────┬────────┘
         │ Creates agents dynamically
         ▼
┌─────────────────┐
│ Agent Factory   │ ← No hardcoded types!
└─────────────────┘
```

## Researcher Agent Process

1. **Load Role Template**: Each role has a specific prompt template
2. **Apply Role Weights**: Cost vs capability based on role
3. **Test Models**: 
   - Test various providers/models
   - Consider language compatibility
   - Consider repository size
   - Apply role-specific scoring
4. **Select Models**:
   - Primary: Best overall score
   - Fallback: Second best, preferably different provider
5. **Store in DB**: Both configurations saved

## Example Configuration Process

```typescript
// Orchestrator requests configuration
const models = await modelVersionSync.findOptimalModel({
  language: 'javascript',
  sizeCategory: 'medium',
  tags: ['security']  // agent role
}, undefined, true);  // includeFallback = true

// Returns from DB:
{
  primary: {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet',
    temperature: 0.3,
    maxTokens: 8000
  },
  fallback: {
    provider: 'openai',
    model: 'gpt-4',
    temperature: 0.3,
    maxTokens: 4000
  }
}

// Agent factory creates appropriate agent type
// No hardcoded ChatGPTAgent or ClaudeAgent!
const agent = AgentFactory.createAgent(role, provider, config);
```

## Key Differences from Wrong Implementation

### ❌ Wrong:
- Hardcoded ChatGPTAgent, ClaudeAgent classes
- OpenRouter configuration in agent code
- Single model per configuration
- Fixed cost weights

### ✅ Correct:
- Dynamic agent creation based on DB
- OpenRouter is just the API gateway (transparent to agents)
- Both primary and fallback models stored
- Role-specific cost weights
- Researcher agent determines optimal models quarterly

## Environment Variables

```bash
# API Keys for providers (used by agents)
OPENAI_API_KEY=sk-xxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxx
DEEPSEEK_API_KEY=sk-xxxxx

# OR use OpenRouter for unified access
OPENROUTER_API_KEY=sk-or-v1-xxxxx

# Vector DB
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxxxx

# Only hardcoded models (embeddings)
VECTOR_EMBEDDING_MODEL=text-embedding-3-large
VOYAGE_API_KEY=pa-xxxxx
```

## Summary

The correct implementation:
1. Uses Vector DB as the source of truth for models
2. No hardcoded agent types or models
3. Researcher agent maintains optimal configurations
4. Both primary and fallback models stored
5. Role-specific cost/capability weights applied
6. Dynamic agent creation based on what's in DB