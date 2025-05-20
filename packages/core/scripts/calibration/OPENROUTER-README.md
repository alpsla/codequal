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

## Usage in the Orchestrator

The orchestrator should select the appropriate model based on repository characteristics and calibration data, then pass it to DeepWiki using the OpenRouter provider format:

```javascript
// Example model selection and API call
const model = 'anthropic/claude-3-5-sonnet'; // Selected by orchestrator
const repositoryUrl = 'https://github.com/owner/repo';

// Call DeepWiki API with the selected model
const analysis = await deepwikiService.analyzeRepository(repositoryUrl, model);
```

## Supported Models

OpenRouter provides access to a wide range of models. The most commonly used in our system include:

- `anthropic/claude-3-5-sonnet`: Balanced performance for most repositories
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

## Additional Documentation

For more detailed information, refer to the following documentation:

- [OpenRouter Integration Implementation Guide](/docs/Deepwiki/configuration/openrouter-integration-implementation.md)
- [OpenRouter Configuration Guide](/docs/Deepwiki/configuration/openrouter-integration.md)
- [DeepWiki API Reference](/docs/deepwiki-integration/deepwiki-api-reference.md)

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