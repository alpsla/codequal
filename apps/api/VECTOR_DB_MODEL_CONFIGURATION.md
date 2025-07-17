# Vector DB Model Configuration Implementation

## Overview

The system uses a sophisticated model selection mechanism where:
1. **Researcher Agent** runs quarterly to research and update model configurations
2. **Model configurations** are stored in Vector DB (`model_configurations` table)
3. **Orchestrator** pulls model configs from Vector DB based on context
4. If no config exists, orchestrator requests Researcher agent to create one

## Architecture Flow

```
┌─────────────────┐
│ Researcher Agent│ (Runs quarterly)
└────────┬────────┘
         │ Researches & Updates
         ▼
┌─────────────────┐
│   Vector DB     │
│model_configurations
└────────┬────────┘
         │ Pulls configs
         ▼
┌─────────────────┐
│  Orchestrator   │
└────────┬────────┘
         │ Configures
         ▼
┌─────────────────┐
│ Agent Instances │
└─────────────────┘
```

## Model Configuration Selection

### 1. ModelVersionSync Service
- Connects to Supabase to access `model_configurations` table
- Caches model configurations for performance
- Selects optimal models based on:
  - **Language**: Primary programming language
  - **Size Category**: small, medium, large, extra_large
  - **Agent Role**: security, performance, architecture, etc.
  - **Capabilities**: Code quality, speed, context window, reasoning
  - **Cost**: Balances cost vs capability based on repo size

### 2. Agent Roles and Weights

Each agent role has different capability requirements:

- **Security Agent**: High code quality, high reasoning
- **Performance Agent**: High speed, medium reasoning
- **Architecture Agent**: High reasoning, high detail level
- **Code Quality Agent**: High code quality, high detail level
- **Dependency Agent**: Medium speed, high accuracy
- **Educational Agent**: High detail level, high reasoning
- **Reporter Agent**: High speed, medium detail

### 3. Database Schema

The `model_configurations` table stores:
```typescript
{
  id: string;
  language: string;          // e.g., "javascript", "python"
  size_category: string;     // "small", "medium", "large"
  provider: string;          // "openai", "anthropic", "deepseek"
  model: string;             // "gpt-4", "claude-3-5-sonnet"
  test_results: {
    status: string;
    avgResponseTime: number;
    avgResponseSize: number;
    qualityScore?: number;
    testCount: number;
    lastTested: string;
    pricing?: {
      input: number;
      output: number;
    };
  };
  notes?: string;
  created_at: string;
  updated_at: string;
}
```

## Implementation Details

### 1. Initialization (in ResultOrchestrator)
```typescript
// Pass Supabase credentials to ModelVersionSync
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

this.modelVersionSync = new ModelVersionSync(
  this.logger,
  supabaseUrl,
  supabaseKey
);
```

### 2. Model Selection Process
```typescript
// Try to find optimal model from DB
config = await this.modelVersionSync.findOptimalModel({
  language: context.primaryLanguage,
  sizeCategory: context.repositorySize,
  tags: [agentType]
});
```

### 3. OpenRouter Integration
- All models are accessed through OpenRouter API
- Model names are converted to OpenRouter format:
  - DB: `gpt-4` → OpenRouter: `openai/gpt-4`
  - DB: `claude-3-5-sonnet` → OpenRouter: `anthropic/claude-3.5-sonnet`

### 4. Fallback Mechanism
1. Try to get model from Vector DB
2. If not found, request Researcher agent
3. If Researcher unavailable, use emergency fallback

## Key Services

### 1. Real RAG Service
- Connects to Supabase `vector_embeddings` table
- Provides context for agent analysis
- No longer returns empty mock data

### 2. Real Vector Storage Service
- Connects to Supabase `vector_chunks` table
- Stores and retrieves analysis results
- Provides tool results for agents

### 3. Agent Configuration
- ChatGPTAgent and ClaudeAgent updated to support OpenRouter
- Automatically uses OpenRouter when configured
- Falls back to direct API if OpenRouter not available

## Environment Variables Required

```bash
# OpenRouter for AI models
OPENROUTER_API_KEY=sk-or-v1-xxxxx

# Supabase for Vector DB
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxxxx

# Embedding models (hardcoded, not from DB)
VECTOR_EMBEDDING_MODEL=text-embedding-3-large  # OpenAI
VOYAGE_API_KEY=xxxxx                           # Voyage
```

## Benefits

1. **No Hardcoded Models**: All models (except embeddings) come from DB
2. **Dynamic Selection**: Models selected based on actual requirements
3. **Cost Optimization**: Balances cost vs capability
4. **Unified Billing**: All AI calls through OpenRouter
5. **Research-Based**: Quarterly updates ensure optimal models
6. **Real Analysis**: No mock data, actual AI-powered analysis

## Testing

1. Ensure all environment variables are set
2. Check that `model_configurations` table has data
3. Run analysis and verify agents use models from DB
4. Check logs for "Configured [agent] with model from DB"

## Future Improvements

1. Implement actual Researcher agent communication
2. Add model performance tracking
3. Implement automatic model rotation based on performance
4. Add cost tracking per analysis