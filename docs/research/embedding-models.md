# Embedding Models Configuration

## Model Selection Priority

The embedding service automatically selects the best model based on content type:

### For Code Content

| Priority | Model | Provider | Dimensions | Context | Cost/M tokens | Requirements |
|----------|-------|----------|------------|---------|---------------|--------------|
| 1 | voyage-code-3 | Voyage AI | 1024 | 32,000 | $0.12 | VOYAGE_API_KEY |
| 2 | voyage-code-2 | Voyage AI | 1536 | 16,000 | $0.12 | VOYAGE_API_KEY |
| 3 | text-embedding-3-large | OpenAI | 3072 | 8,191 | $0.13 | OPENAI_API_KEY |

### For Documentation & General Text

| Priority | Model | Provider | Dimensions | Context | Cost/M tokens | Requirements |
|----------|-------|----------|------------|---------|---------------|--------------|
| 1 | text-embedding-3-small | OpenAI | 1536 | 8,191 | $0.02 | OPENAI_API_KEY |

## Model Features

### voyage-code-3 (Recommended for Code)
- **Latest model** as of 2025
- Specifically optimized for code retrieval
- Smaller dimensions (1024) but better performance
- Larger context window (32K tokens)
- Best for: Source code, technical documentation with code examples

### voyage-code-2
- Previous generation code-specific model
- Still excellent for code retrieval (14.52% better than competitors)
- Maintained for compatibility
- Best for: Legacy systems or when code-3 unavailable

### text-embedding-3-large
- OpenAI's large embedding model
- Good general performance, including code
- Higher dimensions (3072) for richer representations
- Best for: Code when Voyage models unavailable

### text-embedding-3-small
- OpenAI's efficient embedding model
- Cost-effective for general text
- Balanced performance for documentation
- Best for: README files, documentation, comments

## Configuration

Add your API keys to `.env`:

```bash
# Required for all embeddings
OPENAI_API_KEY=your-openai-api-key

# Optional: For optimal code embeddings
VOYAGE_API_KEY=your-voyage-api-key
```

## Usage

The service automatically selects models based on content type:

```typescript
// Automatically uses voyage-code-3 (if available) or text-embedding-3-large
await vectorService.embedRepositoryDocuments(userId, repoId, [{
  contentType: 'code',
  // ...
}]);

// Automatically uses text-embedding-3-small
await vectorService.embedRepositoryDocuments(userId, repoId, [{
  contentType: 'documentation',
  // ...
}]);
```