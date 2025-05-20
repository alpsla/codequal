# OpenRouter Integration Findings

**Date:** May 16, 2025  
**Focus:** Testing DeepWiki with OpenRouter for repository analysis

## Summary

We've successfully tested the OpenRouter integration for repository analysis, with the following findings:

1. **Successfully added 30GB disk to DeepWiki pod**:
   - Updated the deployment to use a larger persistent volume claim
   - Freed up significant disk space (28GB available vs. 1.4GB previously)
   - Confirmed the disk is correctly mounted and operational

2. **OpenRouter API works correctly for direct requests**:
   - Successfully tested with both `anthropic/claude-3-7-sonnet` and `deepseek/deepseek-coder`
   - Repository analysis produces high-quality results when directly accessing OpenRouter API
   - API key is valid and properly configured

3. **DeepWiki integration with OpenRouter has format issues**:
   - DeepWiki reports: `Error in streaming response: 400 * GenerateContentRequest.model: unexpected model name format`
   - This occurs with all tested model formats (`deepseek/deepseek-coder`, `deepseek/deepseek-coder-v2`, and `anthropic/claude-3-7-sonnet`)
   - The issue is specific to how DeepWiki is parsing the model name format from OpenRouter

## Technical Details

### Working Direct Integration

The direct OpenRouter integration works flawlessly:

```javascript
const response = await axios.post(
  'https://openrouter.ai/api/v1/chat/completions',
  {
    model: 'anthropic/claude-3-7-sonnet',
    messages: [
      { role: 'system', content: 'You are an expert code analyst.' },
      { role: 'user', content: `Analyze the repository at ${REPO_URL}...` }
    ],
    max_tokens: 500
  },
  {
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://github.com/asyncfuncai/codequal',
    }
  }
);
```

### DeepWiki Error

```
2025-05-17 00:44:19,197 - 541 simple_chat.py:response_stream - ERROR - Error in streaming response: 400 * GenerateContentRequest.model: unexpected model name format
```

This error suggests DeepWiki may be trying to parse the OpenRouter model format internally without accounting for the provider-prefix format.

## Recommendations

Based on our findings, we recommend:

1. **DeepWiki Configuration Update**:
   - The DeepWiki integration needs to properly handle OpenRouter model formats like `provider/model-name`
   - This likely requires an update to the DeepWiki code or configuration

2. **Interim Direct Integration**:
   - Until the DeepWiki issue is resolved, we can implement a direct OpenRouter integration
   - The `test-openrouter-direct-full.js` script demonstrates this working approach

3. **Model Format Standardization**:
   - Standardize on the format `provider/model-name` for all OpenRouter requests
   - Update documentation to clarify this format requirement

4. **Further Investigation**:
   - Look into DeepWiki's source code to understand how it processes OpenRouter requests
   - Check if there's a configuration option to bypass the model name format validation

## Next Steps

1. Continue using the direct OpenRouter integration for immediate needs
2. Investigate the DeepWiki codebase to identify where the model format parsing happens
3. Develop a patch for DeepWiki to handle the OpenRouter model format correctly

The storage capacity issue has been resolved, providing ample space for repository analysis - the only remaining issue is the model format parsing in DeepWiki.