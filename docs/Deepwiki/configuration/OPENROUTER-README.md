# DeepWiki OpenRouter Integration

This directory contains scripts and configuration files for integrating DeepWiki with OpenRouter as a unified model provider gateway. This approach simplifies our integration by allowing access to multiple AI models through a single standardized interface.

## Overview

The OpenRouter integration allows our orchestrator to dynamically select the optimal model for each repository analysis task while maintaining a consistent API interface. By using OpenRouter exclusively, we eliminate provider-specific configuration issues and streamline our implementation.

## Key Files

- `fix-openrouter-config.sh`: Script to configure DeepWiki to use OpenRouter as the exclusive provider
- `test-openrouter-integration.js`: Test script to validate the OpenRouter integration
- `validate-connection.js`: Utility to verify API connectivity and provider configuration

## Setup Instructions

1. **Set OpenRouter API Key**

```bash
export OPENROUTER_API_KEY="your-openrouter-api-key"
```

2. **Run Configuration Script**

```bash
./fix-openrouter-config.sh
```

3. **Verify Integration**

```bash
node test-openrouter-integration.js
```

## Using Model Fallback

Our implementation includes a robust fallback mechanism to ensure reliable analysis even when specific models encounter errors. This is implemented in the analysis scripts and can be configured by the orchestrator.

### Script Execution with Model Fallback

When using the repository analysis script, you can specify both a primary model and fallback models:

```bash
# Basic usage with default fallback models
./analyze_repository.sh https://github.com/owner/repo "anthropic/claude-3-opus"

# Advanced usage with custom fallback models
./analyze_repository.sh https://github.com/owner/repo "anthropic/claude-3-opus" "openai/gpt-4.1,anthropic/claude-3.7-sonnet,openai/gpt-4"
```

### Orchestrator Integration with Fallback

When integrating with the orchestrator, you can pass both primary and fallback models:

```javascript
// Example model selection with fallback in the orchestrator
const primaryModel = 'anthropic/claude-3-opus'; // Selected by orchestrator
const fallbackModels = ['openai/gpt-4.1', 'anthropic/claude-3.7-sonnet', 'openai/gpt-4'];
const repositoryUrl = 'https://github.com/owner/repo';

// Call DeepWiki API with model fallback configuration
const analysis = await deepwikiService.analyzeRepositoryWithFallback(
  repositoryUrl, 
  primaryModel,
  fallbackModels
);
```

### Template Command Usage

The template command script accepts both primary model and fallback models as parameters:

```bash
# Template command usage
./template_command.sh \
  "https://github.com/example/repo" \  # Repository URL
  "anthropic/claude-3-opus" \          # Primary model
  "standard" \                         # Prompt template
  "./analysis_results.json" \          # Output path
  "codequal-dev" \                     # Namespace
  "deepwiki-fixed" \                   # Pod selector
  "8001" \                             # Port
  "openai/gpt-4.1,anthropic/claude-3.7-sonnet,openai/gpt-4"  # Fallback models (comma-separated)
```

### Fallback Process

The fallback process works as follows:

1. The script attempts to run the analysis with the primary model
2. If successful, it saves the results and proceeds to the next analysis
3. If unsuccessful, it tries each fallback model in sequence until one succeeds
4. If all models fail, it creates a placeholder with error information and assigns a default score of 5/10

### Fallback Model Selection

We recommend providing fallback models from different providers in alternating sequence to maximize the chance of success. For example:

- Primary model: `anthropic/claude-3-opus`
- Fallback models: `openai/gpt-4.1`, `anthropic/claude-3.7-sonnet`, `openai/gpt-4`

## Supported Models

OpenRouter provides access to a wide range of models. The most commonly used in our system include:

- `anthropic/claude-3-7-sonnet`: Enhanced performance for complex tasks
- `anthropic/claude-3-opus`: Highest capability for detailed analysis
- `openai/gpt-4o`: Strong performance with visual elements
- `google/gemini-2.5-pro-preview-05-06`: Good balance of cost and performance
- `deepseek/deepseek-coder`: Specialized for code analysis

## Troubleshooting

If you encounter issues with the OpenRouter integration, try the following:

1. **Check API Key**: Verify your OpenRouter API key is valid and properly set
   ```bash
   echo $OPENROUTER_API_KEY
   ```

2. **Verify Port Forwarding**: Ensure port forwarding is active
   ```bash
   ps aux | grep "kubectl port-forward.*8001:8001"
   ```

3. **Check Pod Status**: Verify the DeepWiki pod is running
   ```bash
   kubectl get pods -n codequal-dev -l app=deepwiki-fixed
   ```

4. **Review Pod Logs**: Check for errors in the DeepWiki logs
   ```bash
   kubectl logs -n codequal-dev $(kubectl get pods -n codequal-dev -l app=deepwiki-fixed -o jsonpath='{.items[0].metadata.name}')
   ```

5. **Re-run Configuration**: If problems persist, re-run the configuration script
   ```bash
   ./fix-openrouter-config.sh
   ```

6. **Check Model Availability**: Verify the models you're using are available on OpenRouter
   ```bash
   curl -H "Authorization: Bearer $OPENROUTER_API_KEY" https://openrouter.ai/api/v1/models
   ```

7. **Review Raw Responses**: If analysis fails, check the raw response files for more detailed error messages
   ```bash
   cat /path/to/output/directory/analysis_type_model_name_raw.txt
   ```

## Additional Documentation

For more detailed information, refer to the following documentation:

- [OpenRouter Integration Implementation Guide](/docs/Deepwiki/configuration/openrouter-integration-implementation.md)
- [OpenRouter Configuration Guide](/docs/Deepwiki/configuration/openrouter-integration.md)
- [DeepWiki API Reference](/docs/deepwiki-integration/deepwiki-api-reference.md)
- [Fallback Scoring Approach](/docs/architecture/Deepwiki/fallback_scoring_approach.md)

## Maintenance

It's recommended to periodically verify the OpenRouter integration is working correctly. Add the verification script to your maintenance routine:

```bash
# Add to your periodic maintenance tasks
node test-openrouter-integration.js
```

If issues are detected, run the configuration script to restore the setup:

```bash
./fix-openrouter-config.sh
```
