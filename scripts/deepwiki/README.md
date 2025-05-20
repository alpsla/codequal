# DeepWiki Integration Scripts

These are the consolidated scripts for the DeepWiki integration in the CodeQual project.

## Key Scripts

1. **complete_openrouter_fix.py**: The comprehensive fix script for the OpenRouter integration
   - Applies all necessary patches to make OpenRouter work with DeepWiki
   - Supports provider-prefixed model names (e.g., anthropic/claude-3-opus)

2. **comprehensive_test.py**: A comprehensive test script for the OpenRouter integration
   - Tests multiple models across different providers
   - Provides detailed reporting on model performance

3. **template_command_updated.sh**: The updated template command with model fallback support
   - Accepts primary model and fallback models as parameters
   - Provides automatic fallback if primary model fails

## Testing Scripts

Various scripts for testing different aspects of the DeepWiki integration:
- Testing the API
- Exploring the Kubernetes CLI
- Running direct interactions with DeepWiki

## Usage

For standard repository analysis with fallback capability, use:

```bash
# At project root
./deepwiki_analyze_repository.sh <repo_url> [primary_model]
```

For a detailed guide on using the OpenRouter integration, see:
- /docs/DeepWiki/final/README.md
- /docs/DeepWiki/final/Model_Fallback_Guide.md
- /docs/DeepWiki/final/DeepWiki_OpenRouter_Integration.md
