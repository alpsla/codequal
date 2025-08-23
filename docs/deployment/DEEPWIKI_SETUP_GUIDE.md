# DeepWiki Setup and Configuration Guide

## Overview
This guide documents the setup and configuration of DeepWiki for the CodeQual system, including solutions for common issues and the architectural design.

## Architecture

### 3-Tier Parser System (Key Design)
The system uses a sophisticated multi-iteration, 3-tier parsing architecture:

1. **AdaptiveDeepWikiAnalyzer** (`packages/agents/src/standard/deepwiki/services/adaptive-deepwiki-analyzer.ts`)
   - Implements 3-iteration adaptive analysis with gap filling
   - Each iteration improves on the previous one by identifying and filling gaps
   - Uses GapAnalyzer to detect missing data

2. **UnifiedAIParser** (`packages/agents/src/standard/deepwiki/services/unified-ai-parser.ts`)
   - Creates specialized sub-agents for each category
   - Handles both JSON and plain text responses
   - Uses AI models selected dynamically for parsing

3. **CachedDeepWikiAnalyzer** (`packages/agents/src/standard/deepwiki/services/cached-deepwiki-analyzer.ts`)
   - Extends AdaptiveDeepWikiAnalyzer with caching capabilities
   - Uses Redis for persistent caching across analyses

## Common Issues and Solutions

### Issue 1: Git Authentication in DeepWiki Pod

**Problem**: DeepWiki pod cannot clone GitHub repositories, resulting in error:
```
fatal: could not read Username for 'https://github.com': No such device or address
```

**Solution**: Configure git to use GitHub token for authentication.

#### Quick Fix (Manual)
Run the configuration script:
```bash
./scripts/configure-deepwiki-git.sh
```

This script:
1. Verifies the DeepWiki pod is running
2. Configures git to use the GitHub token from environment
3. Sets git user information
4. Tests cloning capability

#### Permanent Fix (Kubernetes)
Add an init container or startup script to the DeepWiki deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: deepwiki
spec:
  template:
    spec:
      initContainers:
      - name: git-config
        image: your-deepwiki-image
        command: ["/bin/bash", "-c"]
        args:
          - |
            git config --global url."https://${GITHUB_TOKEN}@github.com/".insteadOf "https://github.com/"
            git config --global user.email "deepwiki@codequal.dev"
            git config --global user.name "DeepWiki Bot"
        env:
        - name: GITHUB_TOKEN
          valueFrom:
            secretKeyRef:
              name: github-credentials
              key: token
```

### Issue 2: Port Forwarding Setup

**Problem**: Cannot connect to DeepWiki API

**Solution**: Ensure port forwarding is active:
```bash
kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001
```

Verify connection:
```bash
curl http://localhost:8001/health
```

Expected response:
```json
{"status":"healthy","timestamp":"...","service":"deepwiki-api"}
```

## Testing

### Test with Mock Mode (Recommended for Development)
```bash
cd packages/agents
USE_DEEPWIKI_MOCK=true npx ts-node test-real-pr-browser.ts
```

### Test with Real DeepWiki
1. Ensure git is configured:
```bash
./scripts/configure-deepwiki-git.sh
```

2. Ensure port forwarding is active:
```bash
kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001
```

3. Run test:
```bash
cd packages/agents
USE_DEEPWIKI_MOCK=false \
DEEPWIKI_API_URL=http://localhost:8001 \
DEEPWIKI_API_KEY=dw-key-e48329b6c05b4a36a18d65af21ac3c2f \
npx ts-node test-real-pr-deepwiki.ts
```

## Environment Variables

Required environment variables for real DeepWiki:
- `DEEPWIKI_API_URL`: URL of DeepWiki API (default: http://localhost:8001)
- `DEEPWIKI_API_KEY`: API key for DeepWiki
- `GITHUB_TOKEN`: GitHub personal access token for repository access
- `USE_DEEPWIKI_MOCK`: Set to "false" for real DeepWiki, "true" for mock

## Data Flow

1. **Request**: Application → DeepWikiApiWrapper → DeepWiki Pod
2. **DeepWiki Processing**: 
   - Clones repository using configured git credentials
   - Analyzes code
   - Returns response (JSON or plain text)
3. **Response Parsing**:
   - AdaptiveDeepWikiAnalyzer performs up to 3 iterations
   - UnifiedAIParser handles category-specific parsing
   - GapAnalyzer identifies missing data for next iteration
4. **Result**: Structured data returned to application

## Key Files

- **Configuration Script**: `/scripts/configure-deepwiki-git.sh`
- **Adaptive Analyzer**: `/packages/agents/src/standard/deepwiki/services/adaptive-deepwiki-analyzer.ts`
- **Unified Parser**: `/packages/agents/src/standard/deepwiki/services/unified-ai-parser.ts`
- **API Wrapper**: `/packages/agents/src/standard/services/deepwiki-api-wrapper.ts`
- **Test Scripts**:
  - `/packages/agents/test-real-pr-browser.ts` (Mock mode)
  - `/packages/agents/test-real-pr-deepwiki.ts` (Real mode)

## V8 Critical Fixes Completed

1. ✅ **PR metadata flow** through UnifiedAnalysisWrapper
2. ✅ **Score calculation** using correct weights (critical: 5, high: 3, medium: 1, low: 0.5)
3. ✅ **Issue type validation** to prevent "undefined" categories
4. ✅ **Dynamic model selection** from Supabase (no hardcoded models)
5. ✅ **Git authentication** for DeepWiki pod
6. ✅ **3-tier parser architecture** preserved and documented

## Next Steps

1. Add git configuration to Kubernetes deployment for automatic setup
2. Implement health checks that verify git configuration
3. Add monitoring for DeepWiki analysis success/failure rates
4. Optimize caching strategy for frequently analyzed repositories