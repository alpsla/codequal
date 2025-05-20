# DeepWiki OpenRouter Integration

This document describes the integration of DeepWiki with OpenRouter, particularly focusing on the specific model identification approach.

## Overview

DeepWiki will be configured to use OpenRouter as a unified API gateway to access multiple models including DeepSeek Coder, Claude, and others. This approach allows the system to:

1. Use a single provider configuration (OpenRouter)
2. Specify different models at runtime based on the orchestrator's requirements
3. Maintain consistency in embedding dimensions and model configurations

## Model Specification Format

When using OpenRouter, the model format follows this pattern:

```
provider/model-name
```

For example:
- `deepseek/deepseek-coder-v2`
- `anthropic/claude-3-7-sonnet`
- `openai/gpt-4o`

The orchestrator will provide this full model identifier when requesting repository analysis.

## Configuration

### Provider Configuration

DeepWiki is configured with OpenRouter as a provider:

```yaml
enabled: true
api_key: ${OPENROUTER_API_KEY}
api_base: https://openrouter.ai/api/v1
embedding_model: text-embedding-ada-002
embedding_dimension: 1536

# Define all models that will be used via the orchestrator
models:
  - name: deepseek/deepseek-coder
    max_tokens: 16384
    supports_functions: false
    supports_vision: false
  - name: deepseek/deepseek-coder-v2
    max_tokens: 16384
    supports_functions: false
    supports_vision: false
  - name: anthropic/claude-3-7-sonnet
    max_tokens: 16384
    supports_functions: true
    supports_vision: true
  - name: anthropic/claude-3-opus
    max_tokens: 32768
    supports_functions: true
    supports_vision: true
  - name: openai/gpt-4o
    max_tokens: 8192
    supports_functions: true
    supports_vision: true
```

### Embedding Configuration

To ensure consistency across providers, a global embedding configuration is used:

```yaml
# Global embedding configuration
default_embedding_model: text-embedding-ada-002
embedding_dimension: 1536
normalize_embeddings: true

# Use the same embedding model across all operations
openrouter:
  embedding_model: text-embedding-ada-002
```

## Usage in the Orchestrator

The orchestrator will:

1. Determine the optimal model for a given repository (based on language, size, etc.)
2. Use the DeepWiki API to request analysis with the selected model
3. Pass the full model identifier in the OpenRouter format

Example API call:

```javascript
const response = await axios.post(`${DEEPWIKI_URL}/chat/completions/stream`, {
  model: 'deepseek/deepseek-coder-v2',  // Full model identifier in OpenRouter format
  repo_url: repositoryUrl,
  messages: [
    { 
      role: 'system', 
      content: 'You are an expert code analyst.'
    },
    { 
      role: 'user', 
      content: 'Analyze this repository and provide an overview.'
    }
  ],
  max_tokens: 1000,
  stream: true
});
```

## Benefits of This Approach

1. **Simplicity**: Only one provider configuration (OpenRouter) needs to be maintained
2. **Flexibility**: New models can be added to the configuration without changing the integration code
3. **Consistency**: Embedding dimensions and model parameters are standardized
4. **Cost Optimization**: OpenRouter allows for dynamic selection of the most cost-effective provider for each model type

## Testing

The integration can be tested using the scripts in `packages/core/scripts/calibration/`:

```bash
# Run the automated test with DeepSeek Coder
./run-openrouter-deepseek-test.sh
```

## Known Limitations

- DeepWiki only supports streaming endpoints (`/chat/completions/stream`)
- Repository size is limited by available disk space in the DeepWiki pod
- Only models explicitly defined in the configuration can be used