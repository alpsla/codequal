# DeepWiki Embedding Fix - Action Plan

## Immediate Next Steps

### Step 1: Check Current API Key Configuration
```bash
# Check if API keys are properly set in the pod
kubectl exec -n codequal-dev deployment/deepwiki -- env | grep -E "(OPENROUTER|EMBEDDING|OPENAI)"
```

### Step 2: Verify API Key in Kubernetes Secret
```bash
# View the secret (base64 encoded)
kubectl get secret deepwiki-api-keys -n codequal-dev -o yaml

# Decode to verify it's not empty or invalid
kubectl get secret deepwiki-api-keys -n codequal-dev -o jsonpath='{.data.OPENROUTER_API_KEY}' | base64 -d
```

### Step 3: Test Embedding Service Directly
```bash
# Test if the embedding service is accessible
kubectl exec -n codequal-dev deployment/deepwiki -- bash -c '
curl -s -X POST https://openrouter.ai/api/v1/embeddings \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"input\": \"test code\", \"model\": \"openai/text-embedding-3-large\"}" | jq .
'
```

### Step 4: Update API Key if Needed
If the API key is missing or invalid:

```bash
# Create/update the secret with a valid OpenRouter API key
kubectl create secret generic deepwiki-api-keys \
  --from-literal=OPENROUTER_API_KEY='your-valid-openrouter-api-key' \
  --namespace codequal-dev \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart the deployment to pick up new secret
kubectl rollout restart deployment/deepwiki -n codequal-dev
```

### Step 5: Alternative - Use OpenAI Directly
If OpenRouter is problematic, switch to direct OpenAI:

```bash
# Update deployment to use OpenAI directly
kubectl set env deployment/deepwiki -n codequal-dev \
  OPENAI_API_KEY='your-openai-api-key' \
  OPENAI_BASE_URL='https://api.openai.com/v1' \
  EMBEDDING_MODEL='text-embedding-3-large'
```

### Step 6: Monitor Logs After Fix
```bash
# Watch logs for successful embedding generation
kubectl logs -n codequal-dev -l app=deepwiki -f | grep -i embedding
```

### Step 7: Test Repository Analysis
Once embeddings are working, test with a small repository:

```bash
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents
npx ts-node test-deepwiki-no-cache.ts
```

## Expected Success Indicators

After fixing the API key configuration, you should see:

1. **In DeepWiki logs:**
   ```
   INFO - Generating embeddings for document...
   INFO - Successfully created embedding vector of size 3072
   ```

2. **In API response:**
   - Files Analyzed: > 0
   - Total Lines: > 0
   - Issues Found: Actual issues, not empty

3. **No more errors about:**
   - "empty embedding vector"
   - "No valid embeddings found"

## Quick Validation Script

Create this script to validate the fix:

```bash
#!/bin/bash
# validate-deepwiki.sh

echo "1. Checking DeepWiki pod status..."
kubectl get pods -n codequal-dev -l app=deepwiki

echo -e "\n2. Checking environment variables..."
kubectl exec -n codequal-dev deployment/deepwiki -- env | grep -E "(OPENROUTER|EMBEDDING|OPENAI)" | sort

echo -e "\n3. Testing embedding service..."
kubectl exec -n codequal-dev deployment/deepwiki -- bash -c '
  curl -s -X POST https://openrouter.ai/api/v1/embeddings \
    -H "Authorization: Bearer $OPENROUTER_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"input\": \"test\", \"model\": \"openai/text-embedding-3-large\"}" | \
    jq -r "if .error then \"ERROR: \" + .error.message else \"SUCCESS: Embedding dimension = \" + (.data[0].embedding | length | tostring) end"
'

echo -e "\n4. Checking recent logs for embedding errors..."
kubectl logs -n codequal-dev -l app=deepwiki --tail=20 | grep -i "embedding\|vector" || echo "No recent embedding logs found"
```

## Root Cause Summary

The issue is that DeepWiki cannot generate embeddings because:
1. The OpenRouter/OpenAI API key is either missing, invalid, or expired
2. The embedding service endpoint is not accessible
3. The model name might be incorrect for the API being used

This is purely a configuration issue - your integration code is correct and will work automatically once embeddings are generated properly.