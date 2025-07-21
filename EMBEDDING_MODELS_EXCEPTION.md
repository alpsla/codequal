# Embedding Models Exception Documentation
**Date: July 20, 2025**

## Important: Hardcoded Embedding Models

### ⚠️ EXCEPTION TO DYNAMIC MODEL SELECTION

The following embedding models MUST remain hardcoded and are exempt from the dynamic model selection system:

### 1. **OpenAI text-embedding-3-large**
- **Purpose**: Text embeddings for vector search
- **Provider**: OpenAI (direct API)
- **Reason**: Not available through OpenRouter
- **Usage**: Document and code chunk embeddings

### 2. **Voyage AI Embedding Models**
- **Purpose**: Specialized code embeddings
- **Provider**: Voyage AI (direct API)
- **Reason**: Not available through OpenRouter
- **Usage**: Code understanding and similarity search

## Why These Are Exceptions

1. **Embedding models are fundamentally different** from language models
   - They produce vector representations, not text
   - Used for search and similarity, not generation
   - Have different API endpoints and response formats

2. **Not available through OpenRouter**
   - OpenRouter focuses on text generation models
   - Embedding models require direct API access

3. **Stable and rarely change**
   - Unlike LLMs, embedding models are more stable
   - Changes would require re-embedding entire databases
   - Model consistency is critical for vector search

## Implementation Guidelines

### ✅ KEEP Hardcoded:
```typescript
// Embedding configurations
const EMBEDDING_MODELS = {
  OPENAI: 'text-embedding-3-large',
  VOYAGE: 'voyage-code-2' // or specific voyage model
};

// Vector storage service
const embeddingModel = process.env.VECTOR_EMBEDDING_MODEL || 'text-embedding-3-large';
```

### ❌ DO NOT Apply Dynamic Selection:
- Vector storage services
- Embedding generation functions
- Similarity search implementations

## Current Usage Locations

Based on the .env file:
```
VECTOR_EMBEDDING_MODEL=text-embedding-3-large
VECTOR_EMBEDDING_DIMENSIONS=1536
```

These settings should remain as environment variables and NOT be moved to the dynamic model selection system.

## Maintenance Notes

1. **If embedding model changes are needed:**
   - Requires careful migration planning
   - May need to re-embed existing content
   - Should be done as a separate, controlled process

2. **Cost considerations:**
   - Embedding models have different pricing structures
   - Usually much cheaper than generation models
   - Billed per token embedded, not generated

3. **Version stability:**
   - OpenAI's text-embedding-3-large is the current best for general text
   - Voyage models are specialized for code
   - Both are stable and unlikely to change frequently

## Summary

While the rest of the system uses dynamic model selection from Vector DB, embedding models are a special case that should remain hardcoded due to their fundamental differences in purpose, availability, and stability requirements.