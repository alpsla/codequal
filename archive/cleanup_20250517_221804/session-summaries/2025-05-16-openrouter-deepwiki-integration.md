# OpenRouter DeepWiki Integration

**Date: May 16, 2025**

## Summary

This document details the implementation of a comprehensive integration between DeepWiki and OpenRouter, allowing DeepWiki to seamlessly use any model available through OpenRouter including DeepSeek Coder. The solution addresses model format compatibility issues and provides a robust implementation that follows the research findings from our previous analysis.

## Technical Implementation

### Root Cause Analysis

The primary issue was that DeepWiki's OpenRouter client wasn't properly handling the model format with provider prefixes (e.g., `deepseek/deepseek-coder`). This caused errors when trying to use models through OpenRouter that require the provider prefix.

### Solution Components

1. **OpenRouter Configuration**: Created proper configuration files for OpenRouter in DeepWiki, including:
   - `openrouter.yaml`: Provider configuration with correct model formats
   - `generator.json`: Configuration for the generator service
   - `embeddings.yaml`: Standardized embedding configuration

2. **OpenRouter Client Patch**: Modified the `openrouter_client.py` file in DeepWiki to:
   - Add a `ensure_model_prefix` method for handling model name formats
   - Update the request formatting to use the model prefix handler
   - Ensure backward compatibility with existing code

3. **Environment Configuration**: Set up environment variables correctly in the pod:
   - Added `OPENROUTER_API_KEY` to the pod's environment
   - Ensured the key is available in multiple places for reliability

4. **Testing Framework**: Developed comprehensive testing scripts:
   - Direct OpenRouter API testing for model format verification
   - Repository analysis testing with DeepWiki
   - Streaming response handling for report generation

### Implementation Scripts

Several scripts were created to implement and test the solution:

1. **`fix-deepwiki-openrouter-integration.sh`**: Main fix script that:
   - Configures DeepWiki with correct OpenRouter settings
   - Patches the OpenRouter client code
   - Sets environment variables and resets the database

2. **`test-deepseek-coder-fixed.js`**: Tests the integration with DeepSeek Coder

3. **`test-deepseek-fixed.js`**: Focused test specifically for the fixed DeepSeek integration

4. **`complete-openrouter-integration.sh`**: End-to-end solution that:
   - Tests direct connection to OpenRouter
   - Applies the integration fix
   - Sets up port forwarding
   - Cleans up disk space
   - Tests the integration and generates a report

## Usage Instructions

### Setting Up the Integration

1. Make sure you have an OpenRouter API key available
2. Set the key in your environment: `export OPENROUTER_API_KEY=your-api-key`
3. Run the complete integration script:
   ```bash
   ./complete-openrouter-integration.sh
   ```

### Using Specific Models

The integration supports multiple models through OpenRouter. To use a specific model, specify it in your requests with the provider prefix:

- **DeepSeek Coder**: `deepseek/deepseek-coder`
- **Claude 3 Sonnet**: `anthropic/claude-3-7-sonnet`
- **Claude 3 Opus**: `anthropic/claude-3-opus`
- **GPT-4o**: `openai/gpt-4o`

Example:
```javascript
const response = await axios.post(`${DEEPWIKI_URL}/chat/completions/stream`, {
  model: 'deepseek/deepseek-coder',
  repo_url: 'https://github.com/example/repo',
  messages: [...],
  // other options
});
```

### Testing Different Models

To test different models, you can run:
```bash
MODEL="anthropic/claude-3-7-sonnet" node test-deepseek-fixed.js
```

## Troubleshooting

### Common Issues

1. **"No space left on device"**: 
   - Solution: Run the cleanup script to remove old repositories:
   ```bash
   kubectl exec -n codequal-dev $POD -- bash -c "find /root/.adalflow/repos -mindepth 1 -maxdepth 1 -type d -mtime +1 -exec rm -rf {} \; || true"
   ```

2. **"unexpected model name format"**:
   - Solution: Ensure you're using the correct provider prefix format (e.g., `deepseek/deepseek-coder` not just `deepseek-coder`)
   - Check that the OpenRouter client patch has been applied correctly

3. **Connection Issues**:
   - Verify port forwarding is active: `ps aux | grep "kubectl port-forward.*8001:8001"`
   - Restart port forwarding: `kubectl port-forward -n codequal-dev svc/deepwiki-fixed 8001:8001 > /dev/null 2>&1 &`

## Future Improvements

1. **Enhanced Error Handling**: Add better error handling for stream interruptions and API failures
2. **Model Format Detection**: Automatic detection and correction of model formats
3. **Configuration UI**: A web interface for managing OpenRouter settings
4. **Caching Layer**: Implement caching for repository cloning and analysis to improve performance
5. **Monitoring Integration**: Add metrics and monitoring for OpenRouter API usage

## Conclusion

The implemented solution provides a robust integration between DeepWiki and OpenRouter, enabling the use of a wide range of models through a single consistent interface. The patch ensures proper handling of model formats across different providers, making it easier to use specialized models like DeepSeek Coder alongside general-purpose models like Claude and GPT-4.

---

## References

- OpenRouter API Documentation: https://openrouter.ai/docs
- DeepWiki Documentation: [Internal Link]
- DeepSeek Coder Documentation: https://openrouter.ai/deepseek/deepseek-coder/api