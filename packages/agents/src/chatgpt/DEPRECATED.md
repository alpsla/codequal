# DEPRECATED: ChatGPT Agent

This agent implementation is **DEPRECATED** and should not be used directly.

## Why is this deprecated?

The CodeQual system now uses dynamic model selection through:
1. **Vector DB Model Configurations** - Models are selected based on repository context
2. **OpenRouter API** - All model calls go through OpenRouter, not directly to OpenAI
3. **ModelVersionSync Service** - Dynamically selects optimal models from Vector DB

## What to use instead?

- Use the `ResultOrchestrator` which automatically selects models from Vector DB
- Models are configured in the `model_configurations` table
- The system uses OpenRouter for all API calls

## Current Architecture

```
Vector DB (model_configurations)
    ↓
ModelVersionSync.findOptimalModel()
    ↓
ResultOrchestrator.configureAgents()
    ↓
EnhancedMultiAgentExecutor
    ↓
OpenRouter API (handles all providers)
```

## Note

This file is kept for historical reference and may be removed in future versions.