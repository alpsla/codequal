# Custom DeepWiki Docker Image

This directory contains the files needed to build a custom DeepWiki image that fixes the hardcoded embedding model configuration.

## What This Fixes

1. **Tokenizer Mismatch**: The original DeepWiki has `text-embedding-3-small` hardcoded in `data_pipeline.py`
2. **Configuration Consistency**: Our patch makes the tokenizer read from the same config as embeddings

## Prerequisites

1. Docker Desktop installed and running
2. Access to your container registry (DigitalOcean)
3. `doctl` CLI configured (for DigitalOcean registry)

## Quick Build & Deploy

```bash
# 1. Start Docker Desktop
open -a Docker  # On macOS

# 2. Login to DigitalOcean registry
doctl registry login

# 3. Build and deploy
./build-and-deploy.sh
```

## Manual Steps

If the script doesn't work:

### 1. Build the Image
```bash
cd kubernetes/deepwiki-custom/
docker build -t registry.digitalocean.com/codequal/deepwiki-custom:latest .
```

### 2. Push to Registry
```bash
doctl registry login
docker push registry.digitalocean.com/codequal/deepwiki-custom:latest
```

### 3. Update Deployment
```bash
# Edit the deployment to use custom image
kubectl set image deployment/deepwiki deepwiki=registry.digitalocean.com/codequal/deepwiki-custom:latest -n codequal-dev

# Or apply the full deployment
kubectl apply -f ../deepwiki-deployment-custom.yaml
```

## Verification

1. **Check Pod Status**
   ```bash
   kubectl get pods -n codequal-dev -l app=deepwiki
   ```

2. **Verify Custom Image**
   ```bash
   kubectl logs -n codequal-dev -l app=deepwiki | grep "CUSTOM"
   ```

3. **Test Functionality**
   ```bash
   cd ../../packages/agents
   npx ts-node test-deepwiki-simple.ts
   ```

## What the Dockerfile Does

1. **Base Image**: Uses the official DeepWiki image
2. **Patches data_pipeline.py**: Replaces hardcoded model with dynamic config
3. **Adds Startup Message**: Confirms custom image is running
4. **Maintains Compatibility**: No breaking changes

## Rollback

If needed, rollback to original:
```bash
kubectl set image deployment/deepwiki deepwiki=ghcr.io/asyncfuncai/deepwiki-open:latest -n codequal-dev
```
