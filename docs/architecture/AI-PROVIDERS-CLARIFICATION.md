# AI Providers Architecture Clarification

**Last Updated: January 2025**

## Overview

This document clarifies how CodeQual integrates with AI providers to prevent any confusion about the architecture.

## Two Distinct Systems

### 1. Embeddings (Direct Connections)

We use **direct connections** to embedding providers:

- **OpenAI API**: `text-embedding-3-large` for documentation embeddings
- **Voyage AI API**: `voyage-code-3` for code embeddings

These are called directly because:
- Embeddings are simple vector generation tasks
- No need for unified gateway
- Cost-effective direct billing
- Low latency requirements

### 2. LLMs (ALL Through OpenRouter)

**ALL** language model requests go through **OpenRouter** as a single gateway:

```
CodeQual → OpenRouter → [OpenAI/Anthropic/Google/etc]
```

Benefits:
- **Single API**: One integration point for all LLMs
- **Unified Billing**: One invoice, one token system
- **Model Flexibility**: Easy to switch between providers
- **Cost Control**: Centralized usage tracking
- **No Direct LLM Connections**: We do NOT connect directly to OpenAI/Anthropic/Google for LLM tasks

## Model Selection

Models are **dynamically selected** from our Vector DB based on:
- Task requirements
- Cost optimization
- Performance needs
- Latest available models

The RESEARCHER agent continuously updates these configurations to ensure we use the best and most cost-effective models.

## Common Misconceptions

❌ **WRONG**: "Routes to different AI providers (OpenAI, Anthropic, Google)"
✅ **CORRECT**: "Routes through OpenRouter to access different AI providers"

❌ **WRONG**: "Direct connections to model providers for LLMs"
✅ **CORRECT**: "OpenRouter handles all LLM connections as a gateway"

❌ **WRONG**: "Hardcoded model selection"
✅ **CORRECT**: "Dynamic model selection from Vector DB configurations"

## API Keys Required

- `OPENAI_API_KEY`: For embeddings only (text-embedding-3-large)
- `VOYAGE_API_KEY`: For code embeddings
- `OPENROUTER_API_KEY`: For ALL LLM requests
- ~~`ANTHROPIC_API_KEY`~~: NOT USED (goes through OpenRouter)
- ~~`GOOGLE_API_KEY`~~: NOT USED for LLMs (goes through OpenRouter)

## Implementation Details

### DeepWiki Request Structure
```typescript
const deepwikiRequest = {
  provider: 'openrouter',  // ALWAYS OpenRouter
  model: selectedModel,    // e.g., "anthropic/claude-3-opus"
  // OpenRouter handles routing to the actual provider
}
```

### Model Format in OpenRouter
When we specify a model like `anthropic/claude-3-opus`, this is:
- An OpenRouter model identifier
- NOT a direct connection to Anthropic
- OpenRouter handles the actual provider connection

## Cost Benefits

Using OpenRouter provides:
- Volume discounts across all models
- Single billing relationship
- Easier cost tracking and budgeting
- No need to manage multiple provider subscriptions

## Summary

1. **Embeddings**: Direct connections (OpenAI + Voyage)
2. **LLMs**: ALL through OpenRouter gateway
3. **No hardcoded models**: Dynamic selection from Vector DB
4. **Cost optimization**: Unified billing and smart model selection