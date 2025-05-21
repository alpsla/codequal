# DeepWiki OpenRouter Integration: Fresh Implementation

This directory contains the scripts and documentation for the fresh implementation of the DeepWiki OpenRouter integration. This new approach focuses on simplicity and reliability, using a three-parameter approach (repository URL, primary model, and fallback models).

## Overview

After extensive troubleshooting of the previous integration, we've decided to implement a clean, streamlined approach that avoids the issues encountered previously. This implementation leverages our existing knowledge while providing a more maintainable solution.

## Quick Start

1. **Validate the integration**:
   ```bash
   ./validate_integration.sh codequal-dev deepwiki-fixed 8001
   ```

2. **Run a repository analysis**:
   ```bash
   ./simple_analysis.sh https://github.com/owner/repo anthropic/claude-3-opus openai/gpt-4o,anthropic/claude-3.7-sonnet
   ```

3. **Use in orchestrator**:
   ```typescript
   const deepwikiService = new DeepWikiService();
   const result = await deepwikiService.analyzeRepositoryWithFallback({
     repositoryUrl: 'https://github.com/owner/repo',
     primaryModel: 'anthropic/claude-3-opus',
     fallbackModels: ['openai/gpt-4o', 'anthropic/claude-3.7-sonnet']
   });
   ```

## Implementation Files

### Scripts

- `validate_integration.sh`: Validates the DeepWiki OpenRouter integration setup
- `simple_analysis.sh`: Main script for repository analysis with fallback support

### TypeScript Service

- `deepwiki-service.ts`: Service for orchestrator integration

## Implementation Plan

The full implementation plan is available in:
`/Users/alpinro/Code Prjects/codequal/docs/Deepwiki/implementation/DeepWiki_OpenRouter_Fresh_Implementation_Plan.md`

This document provides a comprehensive plan including:
- Knowledge foundation based on previous troubleshooting
- Detailed implementation steps
- Testing and validation approach
- Orchestrator integration
- Documentation and maintenance plan

## Supported Models

This implementation supports all provider-prefixed models available through OpenRouter:

- `anthropic/claude-3-opus`: Best for detailed analysis
- `anthropic/claude-3-haiku`: Fast for quick analysis
- `openai/gpt-4o`: Good all-around performance
- `anthropic/claude-3.7-sonnet`: Latest Claude model
- `openai/gpt-4.1`: Latest GPT model
- `google/gemini-2.5-pro-preview`: Google's model
- `deepseek/deepseek-coder`: Specialized for code

## Model Fallback

The fallback mechanism automatically tries each specified model in sequence if the primary model fails. To specify fallback models, provide a comma-separated list as the third parameter:

```bash
./simple_analysis.sh REPO_URL PRIMARY_MODEL "MODEL1,MODEL2,MODEL3"
```

## Best Practices

1. **Always provide fallback models** to ensure analysis completion
2. **Mix providers in fallback list** to handle provider-specific issues
3. **Start with faster models** for initial analysis then fall back to more powerful models
4. **Use specialized models** for specific types of repositories

## Troubleshooting

If you encounter issues:

1. Run the validation script to verify the integration setup
2. Check pod logs for detailed error messages
3. Verify API key configuration
4. Test with different models or repositories

For more detailed troubleshooting, refer to:
`/Users/alpinro/Code Prjects/codequal/docs/Deepwiki/implementation/DeepWiki_OpenRouter_Fresh_Implementation_Plan.md`
