# DeepWiki Embedding Investigation Summary

## Current Status

DeepWiki is running but unable to analyze repositories due to embedding configuration limitations.

## Key Findings

### 1. Configuration is Hardcoded
- DeepWiki loads embedder configuration from `/app/api/config/embedder.json` at startup
- This file is baked into the container image with:
  ```json
  {
    "embedder": {
      "client_class": "OpenAIClient",
      "batch_size": 500,
      "model_kwargs": {
        "model": "text-embedding-3-small",
        "dimensions": 256,
        "encoding_format": "float"
      }
    }
  }
  ```

### 2. Environment Variables Don't Override
- We set correct environment variables:
  - `EMBEDDING_MODEL=text-embedding-3-large`
  - `EMBEDDING_DIMENSIONS=3072`
  - `OPENAI_API_KEY` is properly configured
- However, DeepWiki ignores these and uses the JSON configuration

### 3. DeepWiki Doesn't Support Voyage AI
- DeepWiki only has clients for: OpenAI, OpenRouter, Azure AI, Bedrock, Dashscope
- No native support for Voyage AI embeddings

### 4. Container Image Issue
- Configuration reverts on pod restart because it's part of the image
- Changes to embedder.json are lost when pod is deleted/restarted

## Recommendations

### Option 1: Use ConfigMap (Recommended)
Create a Kubernetes ConfigMap with the correct configuration and mount it:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: deepwiki-embedder-config
  namespace: codequal-dev
data:
  embedder.json: |
    {
      "embedder": {
        "client_class": "OpenAIClient",
        "batch_size": 500,
        "model_kwargs": {
          "model": "text-embedding-3-large",
          "dimensions": 3072,
          "encoding_format": "float"
        }
      },
      "retriever": {
        "top_k": 20
      },
      "text_splitter": {
        "split_by": "word",
        "chunk_size": 350,
        "chunk_overlap": 100
      }
    }
```

Then mount it in the deployment:
```yaml
volumeMounts:
- name: embedder-config
  mountPath: /app/api/config/embedder.json
  subPath: embedder.json
volumes:
- name: embedder-config
  configMap:
    name: deepwiki-embedder-config
```

### Option 2: Build Custom Image
Fork DeepWiki and build a custom image with:
- Updated embedder.json configuration
- Support for environment variable overrides
- Potentially add Voyage AI client support

### Option 3: Continue with Current Setup
- Accept that DeepWiki uses text-embedding-3-small
- This is still a good embedding model from OpenAI
- Focus on getting the system working with this configuration

### Option 4: Contact DeepWiki Team
- Report the issue to the DeepWiki open-source project
- Request feature to allow environment variable overrides
- Request support for Voyage AI embeddings

## Immediate Next Steps

1. **Test with Current Configuration**: Try to get DeepWiki working with text-embedding-3-small to ensure the rest of the system works

2. **Check OpenAI API Key**: Verify the OpenAI API key has access to embedding models:
   ```bash
   curl https://api.openai.com/v1/embeddings \
     -H "Authorization: Bearer $OPENAI_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "input": "test",
       "model": "text-embedding-3-small"
     }'
   ```

3. **Monitor DeepWiki Logs**: Look for specific embedding errors that might indicate other issues

4. **Consider ConfigMap**: If embeddings work but you need text-embedding-3-large, implement the ConfigMap solution

## Conclusion

The DeepWiki integration is correctly implemented in your codebase. The issue is with DeepWiki's hardcoded configuration. The quickest path forward is to either:
1. Get it working with text-embedding-3-small (current config)
2. Use a ConfigMap to override the configuration
3. Continue using mock data until DeepWiki configuration can be properly updated
