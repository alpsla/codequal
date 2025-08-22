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

4. **GitHub Repository Clone Failures**
   
   DeepWiki needs to clone GitHub repositories for analysis. Common issues include:

   #### Symptoms:
   - Error: `"Error preparing retriever: Error during cloning..."`
   - Error: `"fatal: could not read Username for 'https://github.com'"`
   - Error: `"Repository not found"`

   #### Root Causes:
   
   **a) GitHub Token Issues:**
   - Token is expired or invalid
   - Token lacks necessary permissions (needs `repo` scope for private repos)
   - Token not properly configured in the pod

   **b) Repository Issues:**
   - Repository doesn't exist
   - Repository is private and token lacks access
   - Repository URL is malformed

   #### Diagnostic Steps:

   ```bash
   # 1. Check if GitHub token is configured
   kubectl exec -n codequal-dev deployment/deepwiki -- echo $GITHUB_TOKEN
   
   # 2. Validate the token (should return user info)
   kubectl exec -n codequal-dev deployment/deepwiki -- \
     curl -s -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user | grep login
   
   # 3. Check git configuration
   kubectl exec -n codequal-dev deployment/deepwiki -- git config --global --list
   
   # 4. Test cloning a public repository
   kubectl exec -n codequal-dev deployment/deepwiki -- bash -c \
     "cd /tmp && git clone https://github.com/sindresorhus/ky test-repo && rm -rf test-repo && echo 'Clone successful'"
   ```

   #### Fix GitHub Authentication:

   ```bash
   # Option 1: Configure git to use the token for HTTPS
   kubectl exec -n codequal-dev deployment/deepwiki -- \
     git config --global url."https://${GITHUB_TOKEN}@github.com/".insteadOf "https://github.com/"
   
   # Option 2: If token is invalid, update it
   # First, generate a new Personal Access Token on GitHub with 'repo' scope
   # Then update the environment variable:
   kubectl set env -n codequal-dev deployment/deepwiki GITHUB_TOKEN=ghp_YOUR_NEW_TOKEN_HERE
   
   # Restart the pod to apply changes
   kubectl rollout restart -n codequal-dev deployment/deepwiki
   
   # Option 3: For immediate testing, configure git directly with the token
   kubectl exec -n codequal-dev deployment/deepwiki -- \
     git config --global url."https://ghp_YOUR_TOKEN_HERE@github.com/".insteadOf "https://github.com/"
   ```

   #### Verify Repository Exists:

   ```bash
   # Check if repository exists (replace with your repo)
   curl -s https://api.github.com/repos/owner/repo | jq -r '.full_name'
   
   # Search for repository
   curl -s "https://api.github.com/search/repositories?q=repo-name+user:owner" | jq -r '.items[0].full_name'
   ```

5. **Enhanced Error Diagnostics**

   The CodeQual integration now includes enhanced error handling that provides specific diagnostics:

   | Error Type | Description | Solution |
   |------------|-------------|----------|
   | `GITHUB_TOKEN_INVALID` | Token is invalid or expired | Generate new PAT with `repo` scope |
   | `GITHUB_TOKEN_EXPIRED` | Token has expired | Generate new PAT on GitHub |
   | `GITHUB_TOKEN_INSUFFICIENT_SCOPE` | Token lacks permissions | Regenerate with `repo` scope |
   | `REPOSITORY_NOT_FOUND` | Repository doesn't exist | Verify repository URL |
   | `AUTHENTICATION_FAILED` | Git auth not configured | Configure git with token |
   | `API_CONNECTION_FAILED` | Cannot reach DeepWiki | Check port forwarding |
   | `TIMEOUT` | Analysis took too long | Retry or check pod resources |

   The error handler provides:
   - Specific error type identification
   - Context-aware suggested actions
   - Troubleshooting commands
   - Retry guidance

   Example error output:
   ```
   🔑 DeepWiki Analysis Failed
   Error Type: GITHUB_TOKEN_INVALID
   Message: GitHub token is invalid or expired
   
   💡 Suggested Action:
     The GitHub token configured in DeepWiki appears to be invalid or expired. 
     Generate a new Personal Access Token with "repo" scope and update the 
     GITHUB_TOKEN environment variable in the DeepWiki deployment.
   
   🛠️ Troubleshooting Commands:
     1. Check token: kubectl exec -n codequal-dev deployment/deepwiki -- echo $GITHUB_TOKEN
     2. Update token: kubectl set env -n codequal-dev deployment/deepwiki GITHUB_TOKEN=<new-token>
     3. Restart pod: kubectl rollout restart -n codequal-dev deployment/deepwiki
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

## Automated Testing

### Quick Start Testing

We provide automated scripts to ensure the environment is properly configured before running tests:

#### 1. Environment Setup Script

Run this script to automatically configure everything needed for testing:

```bash
# From project root or packages/agents directory
./scripts/test-environment-setup.sh
```

This script will:
- ✅ Check prerequisites (kubectl, Node.js, npm)
- ✅ Verify Kubernetes connection
- ✅ Setup DeepWiki port forwarding
- ✅ Configure GitHub authentication in DeepWiki
- ✅ Setup Redis (if available)
- ✅ Create environment variables (.env.test)
- ✅ Build the project
- ✅ Create test runner scripts

#### 2. Health Check

Quick health check to verify all services:

```bash
./check-health.sh
```

Output example:
```
🏥 CodeQual Health Check
========================
DeepWiki API: ✅ Running
Redis: ✅ Running
Kubernetes: ✅ Connected
DeepWiki Pod: ✅ Running
GitHub Auth: ✅ Valid
```

#### 3. Run Tests

After setup, run tests using the generated test runner:

```bash
# Run all tests
./run-tests.sh all

# Run specific test suites
./run-tests.sh unit        # Unit tests only
./run-tests.sh integration # Integration tests
./run-tests.sh api         # API tests
./run-tests.sh deepwiki    # DeepWiki specific tests
./run-tests.sh regression  # Regression suite
```

### Comprehensive Test Suite

For thorough testing with detailed reporting:

```bash
# Run comprehensive test suite
cd packages/agents
npx ts-node test-suite/comprehensive-test.ts
```

This runs:
1. Environment health checks
2. DeepWiki connection tests
3. Repository analysis tests
4. Error handling validation
5. Mock integration tests
6. Response transformation tests
7. Location validation tests
8. API endpoint tests (if API is running)
9. Report generation tests

Results are saved to `test-results.json` with detailed pass/fail information.

### Test Environment Variables

The setup script creates `.env.test` with all necessary configuration:

```bash
# DeepWiki Configuration
DEEPWIKI_API_URL=http://localhost:8001
USE_DEEPWIKI_MOCK=false  # Set to true for faster testing

# Redis Configuration  
REDIS_URL=redis://localhost:6379

# API Configuration
API_URL=http://localhost:3001
API_PORT=3001

# Feature Flags
ENABLE_AI_LOCATION=true
USE_V8_GENERATOR=true
```

### Troubleshooting Test Failures

| Issue | Solution |
|-------|----------|
| DeepWiki not accessible | Run `kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001` |
| GitHub auth failing | Update token: `kubectl set env -n codequal-dev deployment/deepwiki GITHUB_TOKEN=<token>` |
| Build errors | Run `npm run build` to rebuild |
| Redis not available | Tests will use in-memory cache (optional) |
| API tests failing | Start API: `npm run dev` in apps/api directory |

### Continuous Testing

For continuous integration:

```bash
# Run in CI/CD pipeline
export USE_DEEPWIKI_MOCK=true
export SKIP_HEALTH_CHECK=true
npm test
```

### Test Data Management

Mock data is automatically provided for:
- Repository analysis results
- PR comparisons (main vs feature branch)
- Error scenarios
- Edge cases

No manual test data setup required.

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

*Last updated: August 21, 2025*