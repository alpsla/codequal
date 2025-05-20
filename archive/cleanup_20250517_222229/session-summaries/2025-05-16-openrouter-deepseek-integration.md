# Session Summary: OpenRouter Integration with DeepSeek Coder

**Date:** May 16, 2025  
**Focus:** Integrating DeepWiki with OpenRouter to use DeepSeek Coder and other models

## Overview

In this session, we implemented and tested the integration of DeepWiki with OpenRouter, focusing specifically on enabling DeepSeek Coder for repository analysis. This integration allows the system to use a single provider (OpenRouter) to access multiple models with consistent configuration.

## Key Accomplishments

1. **DeepWiki OpenRouter Configuration**
   - Created `fix-openrouter-model-names.sh` to update DeepWiki with the correct OpenRouter configuration
   - Configured the correct model format for DeepSeek Coder (`deepseek/deepseek-coder-v2`)
   - Implemented standard embedding dimensions (1536) for consistency across providers

2. **DeepSeek Coder Testing**
   - Created `test-deepseek-coder-fixed.js` to test repository analysis with DeepSeek Coder
   - Addressed disk space issues by cleaning up old repositories and embeddings
   - Verified model format compatibility with OpenRouter's API

3. **Automation and Documentation**
   - Created `run-openrouter-deepseek-test.sh` for one-click testing
   - Documented the integration approach in `docs/deepwiki-openrouter-integration.md`
   - Created detailed testing instructions in `OPENROUTER_TESTING.md`

## Technical Details

### Model Format

The key insight was identifying the correct model format for OpenRouter:
```
provider/model-name
```

For example:
- `deepseek/deepseek-coder-v2`
- `anthropic/claude-3-7-sonnet`

This format is required for correct provider routing through OpenRouter.

### Disk Space Management

We implemented disk space management in the testing scripts to address "No space left on device" errors:
- Removal of old repositories: `find /root/.adalflow/repos -mindepth 1 -maxdepth 1 -type d -exec rm -rf {} \;`
- Cleanup of embeddings: `rm -rf /root/.adalflow/embeddings/*`
- Use of very small test repositories (e.g., `https://github.com/jpadilla/pyjwt`)

### Key Configurations

**OpenRouter Provider Configuration:**
```yaml
enabled: true
api_key: ${OPENROUTER_API_KEY}
api_base: https://openrouter.ai/api/v1
embedding_model: text-embedding-ada-002
embedding_dimension: 1536

models:
  - name: deepseek/deepseek-coder
    max_tokens: 16384
    supports_functions: false
    supports_vision: false
  # Additional models...
```

**Global Embedding Configuration:**
```yaml
default_embedding_model: text-embedding-ada-002
embedding_dimension: 1536
normalize_embeddings: true

openrouter:
  embedding_model: text-embedding-ada-002
```

## Challenges and Solutions

| Challenge | Solution |
|-----------|----------|
| Incorrect model format | Identified correct OpenRouter format (`provider/model-name`) and added it to the configuration |
| Disk space limitations | Implemented automatic cleanup of old repositories and embeddings |
| Direct API testing | Created `test_openrouter_direct.js` to directly test model compatibility with OpenRouter |
| Consistent embedding dimensions | Created global embedding configuration to standardize across providers |

## Next Steps

1. **Orchestrator Integration**
   - Integrate with the orchestration layer to dynamically select models based on repository context
   - Ensure the orchestrator passes the correct model format to DeepWiki

2. **Expanded Model Testing**
   - Test additional models with different repository types and sizes
   - Document performance characteristics for each model/language combination

3. **Production Deployment**
   - Deploy the updated configuration to production
   - Monitor performance and make adjustments as needed

## Conclusion

The OpenRouter integration with DeepWiki provides a flexible, unified approach to using multiple models, including DeepSeek Coder. The configuration and scripts created in this session ensure proper model format handling, efficient disk space management, and reliable repository analysis.