# DeepWiki Configuration Investigation Results

## Current Situation

### What We Found

1. **Primary Config**: `/app/api/config/embedder.json`
   - Successfully overridden by ConfigMap ✅
   - DeepWiki loads this at startup

2. **Secondary Hardcoded Reference**: `/app/api/data_pipeline.py` (line 49)
   ```python
   encoding = tiktoken.encoding_for_model("text-embedding-3-small")
   ```
   - This is used for **token counting**, not actual embeddings
   - Could cause issues with text splitting if tokenizer doesn't match model

3. **Actual Embedding Creation**: `/app/api/openai_client.py`
   ```python
   return self.sync_client.embeddings.create(**api_kwargs)
   ```
   - Uses `api_kwargs` which should come from the loaded config

## Risks of Current ConfigMap Solution

### 1. **Tokenizer Mismatch**
- Config says `text-embedding-3-large` but tokenizer uses `text-embedding-3-small`
- Could lead to:
  - Incorrect text chunking
  - Token limit violations
  - Suboptimal embedding quality

### 2. **Incomplete Override**
- We only override one file
- Other hardcoded references might exist
- Behavior is inconsistent

### 3. **Maintenance Risk**
- DeepWiki updates could break our ConfigMap
- No validation of config compatibility
- Team confusion about overrides

## Recommended Solutions

### Option 1: Build Custom DeepWiki Image (Most Stable)

**Steps:**
1. Clone DeepWiki repository
2. Fix the hardcoded reference in `data_pipeline.py`
3. Make config respect environment variables
4. Build and push custom image
5. Use in production

**Benefits:**
- Complete control over configuration
- No ConfigMap needed
- Can contribute fixes back to DeepWiki

**Implementation:**
```dockerfile
FROM ghcr.io/asyncfuncai/deepwiki-open:latest

# Fix hardcoded tokenizer
RUN sed -i 's/text-embedding-3-small/${EMBEDDING_MODEL:-text-embedding-3-small}/g' /app/api/data_pipeline.py

# Or better: patch the file to read from config
COPY fixed-data-pipeline.py /app/api/data_pipeline.py
```

### Option 2: Extended ConfigMap (Current + Patches)

**Extend current solution:**
1. Keep current ConfigMap for `embedder.json`
2. Add a startup script that patches `data_pipeline.py`
3. Mount the script and run it on container start

**Implementation:**
```yaml
initContainers:
- name: patch-deepwiki
  image: ghcr.io/asyncfuncai/deepwiki-open:latest
  command: ['/bin/sh']
  args:
    - -c
    - |
      sed -i 's/text-embedding-3-small/text-embedding-3-large/g' /app/api/data_pipeline.py
  volumeMounts:
  - name: app-data
    mountPath: /app
```

### Option 3: Fork and Contribute (Best Long-term)

**Steps:**
1. Fork DeepWiki
2. Add proper configuration support:
   ```python
   # In data_pipeline.py
   from api.config import get_embedder_config
   
   config = get_embedder_config()
   model = config.get('model_kwargs', {}).get('model', 'text-embedding-3-small')
   encoding = tiktoken.encoding_for_model(model)
   ```
3. Submit PR to DeepWiki
4. Use fork until merged

## Investigation Commands

### Find All Hardcoded References
```bash
# Search for any hardcoded model references
kubectl exec -n codequal-dev deployment/deepwiki -- \
  find /app -name "*.py" -type f -exec grep -l "text-embedding-3-small" {} \;

# Check for environment variable usage
kubectl exec -n codequal-dev deployment/deepwiki -- \
  grep -r "EMBEDDING_MODEL\|getenv" /app/api/
```

### Test Current Behavior
```bash
# Monitor actual API calls
kubectl logs -n codequal-dev -l app=deepwiki -f | \
  grep -E "(api_kwargs|embedding|model)"
```

## Recommendation

**For immediate production**: Use Option 1 (Custom Image)
- Most stable and predictable
- Full control over configuration
- Can be done in 1-2 hours

**For long-term**: Pursue Option 3 (Fork and Contribute)
- Benefits the community
- Proper solution
- Reduces maintenance burden

The current ConfigMap solution works but has risks. Building a custom image with proper configuration support is the most stable approach for production use.
