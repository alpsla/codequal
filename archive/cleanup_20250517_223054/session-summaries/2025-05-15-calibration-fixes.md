# Calibration Script Fixes (May 15, 2025)

## Overview

This document summarizes the improvements made to the targeted calibration script, which is used to test models across different repository categories and find the optimal models for each language/size combination.

## Key Improvements

### Environment Variable Handling

- Fixed environment variable loading to properly locate the `.env` file at the project root
- Added better error handling and fallback for environment variable loading
- Added verbose logging to help debug environment variable issues

### Model Name and Configuration Updates

- Updated model names to match the latest versions:
  - Anthropic: Added `claude-3-7-sonnet-20250219` as a new model option
  - OpenAI: Updated to use `gpt-4o` as the premium model
  - Google: Added `gemini-2.5-pro-preview-05-06` for newer Gemini models
  - DeepSeek: Added proper model variant support (standard, plus, lite)

### API Key Validation

- Improved API key validation and formatting
  - Added cleanup of whitespace and quotes
  - Added more descriptive validation error messages
  - Added key format checking for Anthropic keys (should start with `sk-ant-`)
  - Added fallback methods for validation (checking models list, then simple completion)

### API Request Formats

- Fixed API request formats for all providers:
  - Anthropic: Used proper system message format
  - OpenAI: Added specific handling for GPT-4o
  - Google: Added specific handling for Gemini 2.5 models
  - DeepSeek: Added correct model name expansions (e.g., deepseek-coder → deepseek-coder-1.5-instruct)
  - OpenRouter: Fixed provider prefix handling

### Error Handling and Logging

- Added more detailed error logging
- Added warnings for empty responses
- Added more context for API calls
- Improved debug output for troubleshooting

### Provider Configuration

- Enhanced dynamic model discovery:
  - Gemini: Automatically detects and configures available models
  - OpenRouter: Improved model selection with preference for Claude and GPT-4 models
  - DeepSeek: Added automatic model variant expansion 

## Using the Script

The targeted calibration script can now be run with the following options:

```
node targeted-calibration.js --language=javascript --size=medium
node targeted-calibration.js --all-categories
node targeted-calibration.js --generate-config
```

The script now progressively tests models from fastest/cheapest to most comprehensive, focusing on specific repository categories first. This targeted approach provides quicker insights into which models perform best for each language and size combination.

## Next Steps

1. Test the script with actual API keys to verify it works correctly
2. Consider adding more repository samples to each category for more comprehensive testing
3. Integrate the calibration results into the main model selection service