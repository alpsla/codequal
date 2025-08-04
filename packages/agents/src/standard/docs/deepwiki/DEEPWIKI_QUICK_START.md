# DeepWiki Quick Start Guide

## Overview

This guide provides a streamlined process for setting up and connecting to the DeepWiki Kubernetes pod for testing and development. No more spending time figuring out how to start DeepWiki each session!

## Prerequisites

- `kubectl` installed and configured
- Access to the Kubernetes cluster where DeepWiki is deployed
- Node.js and npm installed for running tests

## Quick Start (One Command)

```bash
# Run this from the project root
./setup-deepwiki.sh

# Or run directly from its location:
./packages/agents/src/standard/scripts/deepwiki/setup-deepwiki-environment.sh
```

This script will:
1. ✅ Check kubectl and cluster connection
2. ✅ Verify namespace exists
3. ✅ Find or deploy DeepWiki pod
4. ✅ Setup port forwarding (API on 8001, Frontend on 3000)
5. ✅ Test the connection
6. ✅ Create helper scripts
7. ✅ Generate environment variables file

## What the Setup Script Does

### 1. **Automatic Health Checks**
- Verifies kubectl is installed
- Checks Kubernetes cluster connection
- Ensures `codequal-dev` namespace exists
- Finds existing DeepWiki pod or offers to deploy one

### 2. **Port Forwarding Setup**
- Automatically sets up port forwarding for:
  - API: `localhost:8001`
  - Frontend: `localhost:3000`
- Kills any existing port forwards to avoid conflicts
- Maintains port forwarding in the background

### 3. **Connection Testing**
- Tests the API health endpoint
- Performs a sample analysis request
- Provides feedback on connection status

### 4. **Environment Configuration**
Creates `.env.deepwiki` file with:
```bash
DEEPWIKI_API_URL=http://localhost:8001
DEEPWIKI_NAMESPACE=codequal-dev
DEEPWIKI_POD_NAME=<actual-pod-name>
USE_DEEPWIKI_MOCK=false
```

### 5. **Helper Scripts Creation**
Creates two helper scripts:

- `scripts/deepwiki-connect.sh` - Quick reconnect to existing pod
- `scripts/test-deepwiki-analysis.sh` - Test analysis with any repo

## Using DeepWiki After Setup

### 1. **Source the Environment**
```bash
source .env.deepwiki
```

### 2. **Run Your Tests**

#### Option A: Run the Orchestrator Test
```bash
cd packages/agents
npm test src/standard/tests/integration/orchestrator-real-flow.test.ts
```

#### Option B: Test DeepWiki Directly
```bash
# Test with default React repo
./scripts/test-deepwiki-analysis.sh

# Test with custom repo
./scripts/test-deepwiki-analysis.sh https://github.com/vercel/next.js main
```

### 3. **Access DeepWiki UI**
Open browser to: http://localhost:3000

## Common Commands

### Check DeepWiki Pod Status
```bash
kubectl get pods -n codequal-dev -l app=deepwiki
```

### View DeepWiki Logs
```bash
kubectl logs -n codequal-dev -l app=deepwiki --tail=100
```

### Execute Commands in Pod
```bash
kubectl exec -it -n codequal-dev $(kubectl get pods -n codequal-dev -l app=deepwiki -o jsonpath='{.items[0].metadata.name}') -- bash
```

### Check Disk Usage
```bash
kubectl exec -n codequal-dev $(kubectl get pods -n codequal-dev -l app=deepwiki -o jsonpath='{.items[0].metadata.name}') -- df -h
```

## Reconnecting to Existing Pod

If you've already set up DeepWiki and just need to reconnect:

```bash
./scripts/deepwiki-connect.sh
```

This will quickly re-establish port forwarding without going through the full setup.

## Cleanup

To stop port forwarding and cleanup:

```bash
./setup-deepwiki.sh --cleanup
```

Or simply press `Ctrl+C` in the terminal where the script is running.

## Troubleshooting

### Port Already in Use
If you get "bind: address already in use" errors:
```bash
# Kill all kubectl port-forward processes
pkill -f "kubectl port-forward"

# Then retry
./scripts/deepwiki-connect.sh
```

### Pod Not Found
If the pod is not found:
```bash
# Check if deployment exists
kubectl get deployment deepwiki -n codequal-dev

# Check pod status
kubectl get pods -n codequal-dev

# Restart deployment if needed
kubectl rollout restart deployment/deepwiki -n codequal-dev
```

### Connection Refused
If API calls fail with "connection refused":
1. Check port forwarding is active: `ps aux | grep port-forward`
2. Check pod is running: `kubectl get pods -n codequal-dev -l app=deepwiki`
3. Check pod logs: `kubectl logs -n codequal-dev -l app=deepwiki`

### API Key Issues
If you need to set the OpenRouter API key:
```bash
# Create/update the secret
kubectl create secret generic deepwiki-api-keys \
  --from-literal=OPENROUTER_API_KEY=your-key-here \
  --namespace codequal-dev \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart the pod to pick up new secret
kubectl rollout restart deployment/deepwiki -n codequal-dev
```

## Integration with Tests

### Using Real DeepWiki in Tests
When running tests, ensure:
1. Environment is sourced: `source .env.deepwiki`
2. Port forwarding is active (check with `ps aux | grep port-forward`)
3. `USE_DEEPWIKI_MOCK=false` is set

### Example Test Run
```bash
# Full orchestrator test with real DeepWiki
cd packages/agents
USE_DEEPWIKI_MOCK=false npm test orchestrator-real-flow.test.ts

# Direct comparison agent test
USE_DEEPWIKI_MOCK=false npm test comparison-agent-real-flow.test.ts
```

## API Endpoints

Once connected, these endpoints are available:

- **Health Check**: `GET http://localhost:8001/health`
- **Analyze Repository**: `POST http://localhost:8001/api/v1/analyze`
- **Get Analysis Status**: `GET http://localhost:8001/api/v1/analysis/{id}`
- **Frontend UI**: `http://localhost:3000`

## Best Practices

1. **Always use the setup script** for initial connection - it handles all the checks
2. **Keep the terminal open** where you ran the setup script to maintain port forwarding
3. **Use the helper scripts** for quick testing and reconnection
4. **Check pod health** before running extensive tests
5. **Monitor disk usage** during large repository analyses

## Summary

With this setup:
- ✅ No more manual port forwarding commands
- ✅ Automatic health checks and validation
- ✅ Environment variables automatically configured
- ✅ Helper scripts for common tasks
- ✅ Clear troubleshooting steps

Just run `./scripts/setup-deepwiki-environment.sh` and you're ready to test!