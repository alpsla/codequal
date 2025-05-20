# DeepWiki Documentation

This is the centralized documentation for the DeepWiki integration in the CodeQual project.

## Main Documentation

- [README](./final/README.md) - Main OpenRouter integration documentation
- [Model Fallback Guide](./final/Model_Fallback_Guide.md) - Detailed guide for using model fallback
- [DeepWiki OpenRouter Integration](./final/DeepWiki_OpenRouter_Integration.md) - Comprehensive integration documentation

## Scripts

All DeepWiki scripts have been consolidated in a single directory:
- `/scripts/deepwiki/` - Central location for all DeepWiki integration scripts
- `/deepwiki_analyze_repository.sh` - Main repository analysis script at the root level

## Configuration

DeepWiki is configured to use OpenRouter exclusively, with automatic fallback capabilities if the primary model fails. See the Model Fallback Guide for details on configuring and using this feature.

## Usage

For basic repository analysis:

```bash
./deepwiki_analyze_repository.sh <repo_url> [primary_model]
```

For more advanced usage with fallback model customization, see the scripts directory.
