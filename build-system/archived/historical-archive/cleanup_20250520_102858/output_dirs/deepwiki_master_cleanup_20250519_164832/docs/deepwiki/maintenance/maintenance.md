# DeepWiki Open Maintenance Guide

This document provides instructions for maintaining and operating the DeepWiki Open deployment in the CodeQual Kubernetes environment.

## Overview

DeepWiki Open is an AI-powered tool that analyzes GitHub repositories and generates comprehensive documentation. It's deployed in our Kubernetes cluster as part of the CodeQual project to enhance repository analysis and PR evaluation.

## Deployment Architecture

The DeepWiki deployment consists of:

- **Kubernetes Deployment**: `deepwiki` in the `codequal-dev` namespace
- **Services**:
  - `deepwiki-frontend`: Frontend UI service (port 80 → 3000)
  - `deepwiki-api`: API service (port 8001 → 8001)
- **Persistent Storage**: PVC `deepwiki-data` for storing analysis data
- **Environment Variables**: Configured via Secret `deepwiki-env`

## Basic Operations

### Checking Deployment Status

```bash
# Check the deployment status
kubectl get deployment deepwiki -n codequal-dev

# Check running pods
kubectl get pods -n codequal-dev -l app=deepwiki

# Check services
kubectl get services -n codequal-dev | grep deepwiki
```

### Accessing DeepWiki

#### Port Forwarding (Development/Testing)

```bash
# Forward API port
kubectl port-forward service/deepwiki-api -n codequal-dev 8001:8001

# Forward frontend port (in a separate terminal)
kubectl port-forward service/deepwiki-frontend -n codequal-dev 3000:80
```

Then access:
- Frontend: http://localhost:3000
- API: http://localhost:8001

#### Internal Kubernetes Access

Other services inside the cluster can access DeepWiki using:
- Frontend: `http://deepwiki-frontend.codequal-dev.svc.cluster.local`
- API: `http://deepwiki-api.codequal-dev.svc.cluster.local:8001`

### Restarting the Deployment

```bash
kubectl rollout restart deployment deepwiki -n codequal-dev
```

### Viewing Logs

```bash
# View recent logs
kubectl logs -n codequal-dev -l app=deepwiki --tail=100

# Follow logs in real-time
kubectl logs -n codequal-dev -l app=deepwiki -f

# View logs for a specific pod (if multiple replicas)
POD_NAME=$(kubectl get pods -n codequal-dev -l app=deepwiki -o jsonpath="{.items[0].metadata.name}")
kubectl logs -n codequal-dev $POD_NAME
```

## API Usage

DeepWiki exposes the following key API endpoints:

### 1. Analyze Repository

```bash
curl -X POST "http://localhost:8001/api/analyze-repo" \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "organization",
    "repo": "repository"
  }'
```

### 2. Export Wiki Content

```bash
curl -X POST "http://localhost:8001/export/wiki" \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "organization",
    "repo": "repository",
    "format": "markdown"
  }'
```

### 3. Ask Questions About Repository

```bash
curl -X POST "http://localhost:8001/chat/completions/stream" \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "organization",
    "repo": "repository",
    "message": "Your question about the repository"
  }'
```

## Configuration Management

### Updating API Keys

If you need to update the API keys (for OpenAI, Google AI, or GitHub):

```bash
# First, delete the existing secret
kubectl delete secret deepwiki-env -n codequal-dev

# Create a new secret with updated values
kubectl create secret generic deepwiki-env \
  --namespace=codequal-dev \
  --from-literal=OPENAI_API_KEY="your_new_openai_key" \
  --from-literal=GOOGLE_API_KEY="your_new_google_key" \
  --from-literal=GITHUB_TOKEN="your_new_github_token"

# Restart the deployment to apply changes
kubectl rollout restart deployment deepwiki -n codequal-dev
```

### Scaling the Deployment

To handle more load, you can scale the number of replicas:

```bash
# Scale to 3 replicas
kubectl scale deployment deepwiki -n codequal-dev --replicas=3

# Check the scaling status
kubectl get pods -n codequal-dev -l app=deepwiki
```

## Upgrading DeepWiki

To upgrade to a newer version of DeepWiki:

```bash
# Update the image version
kubectl set image deployment/deepwiki -n codequal-dev deepwiki=ghcr.io/asyncfuncai/deepwiki-open:new_version_tag

# Alternatively, edit the deployment directly
kubectl edit deployment deepwiki -n codequal-dev
```

## Backup and Restore

### Backup Persistent Data

```bash
# Get the PVC name
kubectl get pvc -n codequal-dev | grep deepwiki

# Create a snapshot (if using a storage class that supports snapshots)
# This depends on your cluster configuration
```

### Manual Backup Using Volume Snapshot

If your cluster supports Volume Snapshots:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: deepwiki-data-snapshot
  namespace: codequal-dev
spec:
  volumeSnapshotClassName: csi-snapclass
  source:
    persistentVolumeClaimName: deepwiki-data
```

Save this to a file and apply:
```bash
kubectl apply -f snapshot.yaml
```

## Troubleshooting

### Common Issues

1. **Pod Crash-Looping**
   ```bash
   kubectl describe pod -n codequal-dev -l app=deepwiki
   kubectl logs -n codequal-dev -l app=deepwiki --previous
   ```

2. **API Not Responding**
   ```bash
   # Check if pod is running
   kubectl get pods -n codequal-dev -l app=deepwiki
   
   # Check if service endpoints are correct
   kubectl get endpoints -n codequal-dev | grep deepwiki
   
   # Try accessing directly from another pod
   kubectl run curl-test --image=curlimages/curl -i --rm --restart=Never -- curl http://deepwiki-api.codequal-dev.svc.cluster.local:8001
   ```

3. **Frontend Not Loading**
   ```bash
   # Check frontend logs
   kubectl logs -n codequal-dev -l app=deepwiki
   
   # Verify environment variables
   kubectl exec -n codequal-dev $(kubectl get pods -n codequal-dev -l app=deepwiki -o jsonpath="{.items[0].metadata.name}") -- env | grep NEXT_PUBLIC
   ```

### Getting Additional Help

If issues persist:
1. Check the [AsyncFuncAI/deepwiki-open](https://github.com/AsyncFuncAI/deepwiki-open) GitHub repository
2. Consult the issues section for known problems
3. Check the Discord channel mentioned in the repository README

## Integration with CodeQual

DeepWiki is integrated with CodeQual and can be accessed programmatically:

```typescript
// Example integration code
async function analyzeRepository(owner: string, repo: string) {
  const response = await fetch('http://deepwiki-api.codequal-dev.svc.cluster.local:8001/api/analyze-repo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ owner, repo }),
  });
  
  return await response.json();
}
```

## Resource Monitoring

Monitor resource usage:

```bash
# Check CPU and memory usage
kubectl top pods -n codequal-dev -l app=deepwiki

# Get detailed resource usage
kubectl describe pod -n codequal-dev -l app=deepwiki | grep -A 15 "Resources"
```

## Cleanup

If you need to completely remove DeepWiki:

```bash
# Delete the deployment
kubectl delete deployment deepwiki -n codequal-dev

# Delete the services
kubectl delete service deepwiki-frontend deepwiki-api -n codequal-dev

# Delete the secret
kubectl delete secret deepwiki-env -n codequal-dev

# Delete the PVC (CAUTION: This will delete all stored data)
kubectl delete pvc deepwiki-data -n codequal-dev
```

---

*Last updated: May 12, 2025*