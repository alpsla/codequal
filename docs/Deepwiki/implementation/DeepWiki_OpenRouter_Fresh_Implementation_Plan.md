# DeepWiki OpenRouter Fresh Implementation Plan

## Overview

This document outlines a comprehensive plan for a fresh implementation of the DeepWiki OpenRouter integration, based on our extensive troubleshooting experience and established research. The new implementation will focus on a minimalist, three-parameter approach (repository URL, primary model, and fallback models) to ensure reliability and maintainability.

## 1. Knowledge Foundation

### 1.1 Architectural Understanding

#### DeepWiki Architecture
- DeepWiki uses a client interface architecture requiring specific model integrations
- The system supports repository analysis through a series of API calls
- Models are specified with provider prefixes (e.g., `anthropic/claude-3-opus`)
- The current implementation attempts to handle model fallback but has reliability issues

#### OpenRouter Requirements
- OpenRouter requires provider-prefixed model names (e.g., `anthropic/claude-3-opus`)
- Authentication requires valid API keys in the proper headers
- All requests need proper formatting to ensure compatibility
- Models must be specified in a consistent format to ensure proper routing

### 1.2 Identified Issues from Previous Implementation

#### Authentication Problems
- Inconsistent API key handling across different parts of the system
- Missing or incorrect header formats in requests
- API key environment variable configuration inconsistencies

#### Interface Mismatches
- DeepWiki client interface expectations vs. OpenRouter requirements
- Inconsistent handling of provider-prefixed model names
- Problems with parameter passing from orchestrator to DeepWiki

#### Model Fallback Issues
- Unreliable fallback mechanism when primary models fail
- Inconsistent error handling during fallback process
- Lack of proper error propagation to calling systems

### 1.3 OpenRouter API Requirements

#### Authentication
- Requires `Authorization: Bearer API_KEY` header format
- Also requires `X-OpenRouter-API-Key: API_KEY` for some endpoints
- API keys must be stored securely in Kubernetes secrets

#### Model Naming Convention
- All models must be specified with provider prefixes
- Format: `provider/model-name` (e.g., `anthropic/claude-3-opus`)
- Default to `openai/` prefix if none is specified

#### Request Structure
- JSON payload must include proper model specification
- Messages array required for completions
- Additional parameters like temperature and top_p should be consistent

## 2. Fresh Implementation Plan

### 2.1 Preparation Phase

#### 2.1.1 Create Clean Kubernetes Namespace
```bash
# Create new namespace for clean installation
kubectl create namespace deepwiki-fresh

# Label the namespace for easier management
kubectl label namespace deepwiki-fresh purpose=repository-analysis
```

#### 2.1.2 Configure API Key Secret
```bash
# Create secret for OpenRouter API key
kubectl create secret generic deepwiki-api-keys \
  --from-literal=OPENROUTER_API_KEY=$OPENROUTER_API_KEY \
  --namespace deepwiki-fresh
```

#### 2.1.3 Configure Persistent Storage
```yaml
# Create persistent volume claim for DeepWiki
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: deepwiki-data
  namespace: deepwiki-fresh
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
```

#### 2.1.4 Set Up Network Policies
```yaml
# Create network policy to control access
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deepwiki-network-policy
  namespace: deepwiki-fresh
spec:
  podSelector:
    matchLabels:
      app: deepwiki
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: codequal-dev
    ports:
    - protocol: TCP
      port: 8001
```

### 2.2 DeepWiki Installation

#### 2.2.1 Deploy DeepWiki Base
```yaml
# DeepWiki deployment with proper configuration
apiVersion: apps/v1
kind: Deployment
metadata:
  name: deepwiki
  namespace: deepwiki-fresh
spec:
  replicas: 1
  selector:
    matchLabels:
      app: deepwiki
  template:
    metadata:
      labels:
        app: deepwiki
    spec:
      containers:
      - name: deepwiki
        image: deepwiki/deepwiki:latest
        ports:
        - containerPort: 8001
        env:
        - name: OPENROUTER_API_KEY
          valueFrom:
            secretKeyRef:
              name: deepwiki-api-keys
              key: OPENROUTER_API_KEY
        volumeMounts:
        - name: deepwiki-data
          mountPath: /data
      volumes:
      - name: deepwiki-data
        persistentVolumeClaim:
          claimName: deepwiki-data
```

#### 2.2.2 Create DeepWiki Service
```yaml
# Create service for DeepWiki
apiVersion: v1
kind: Service
metadata:
  name: deepwiki-service
  namespace: deepwiki-fresh
spec:
  selector:
    app: deepwiki
  ports:
  - port: 8001
    targetPort: 8001
  type: ClusterIP
```

#### 2.2.3 Wait for DeepWiki to Initialize
```bash
# Wait for pods to be ready
kubectl wait --for=condition=ready pod -l app=deepwiki -n deepwiki-fresh --timeout=300s
```

### 2.3 OpenRouter Integration

#### 2.3.1 Create OpenRouter Client Patch
```python
# Create OpenRouter client patch with provider-prefix handling
def ensure_model_prefix(self, model_name):
    '''
    Ensures the model name has a provider prefix.
    If no prefix exists, it defaults to 'openai/' prefix.
    '''
    if not model_name:
        return "openai/gpt-3.5-turbo"
    if '/' not in model_name:
        return f"openai/{model_name}"
    return model_name
```

#### 2.3.2 Create Model Fallback Script
```bash
#!/bin/bash
# Script to run repository analysis with fallback models

REPO_URL="$1"
PRIMARY_MODEL="$2"
FALLBACK_MODELS="$3"

# Convert fallback models into array
IFS=',' read -ra FALLBACK_ARRAY <<< "$FALLBACK_MODELS"

# Try primary model first
echo "Attempting analysis with primary model: $PRIMARY_MODEL"
if run_analysis "$REPO_URL" "$PRIMARY_MODEL"; then
  echo "Analysis successful with primary model"
  exit 0
fi

# Try each fallback model in sequence
for model in "${FALLBACK_ARRAY[@]}"; do
  echo "Attempting analysis with fallback model: $model"
  if run_analysis "$REPO_URL" "$model"; then
    echo "Analysis successful with fallback model: $model"
    exit 0
  fi
done

echo "All models failed. Analysis could not be completed."
exit 1
```

#### 2.3.3 Create Simplified Analysis Script
```bash
#!/bin/bash
# Script for simplified repository analysis

# Required parameters
REPO_URL="$1"
MODEL="$2"

# Optional parameters (if not provided, fallback models won't be used)
FALLBACK_MODELS="${3:-}"

POD_NAME=$(kubectl get pods -n deepwiki-fresh -l app=deepwiki -o jsonpath='{.items[0].metadata.name}')

# Execute analysis command
if [ -z "$FALLBACK_MODELS" ]; then
  # Run without fallback
  kubectl exec -n deepwiki-fresh "$POD_NAME" -- python -m deepwiki.cli analyze-repo \
    --url "$REPO_URL" \
    --model "$MODEL" \
    --format json
else
  # Run with fallback
  kubectl exec -n deepwiki-fresh "$POD_NAME" -- python -m deepwiki.cli analyze-repo \
    --url "$REPO_URL" \
    --model "$MODEL" \
    --fallback-models "$FALLBACK_MODELS" \
    --format json
fi
```

### 2.4 Testing and Validation

#### 2.4.1 Create Simple Validation Script
```bash
#!/bin/bash
# Script to validate DeepWiki installation and OpenRouter integration

echo "Testing basic pod connectivity..."
POD_NAME=$(kubectl get pods -n deepwiki-fresh -l app=deepwiki -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n deepwiki-fresh "$POD_NAME" -- echo "Pod connectivity successful"

echo "Testing OpenRouter API connectivity..."
kubectl exec -n deepwiki-fresh "$POD_NAME" -- curl -s "https://openrouter.ai/api/v1/models" \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "X-OpenRouter-API-Key: $OPENROUTER_API_KEY"

echo "Testing simple repository analysis..."
./simple_analysis.sh "https://github.com/pallets/click" "anthropic/claude-3-haiku"
```

#### 2.4.2 Create Comprehensive Test Suite
```bash
#!/bin/bash
# Comprehensive test script for DeepWiki OpenRouter integration

# Test models in order of expected reliability
MODELS=(
  "anthropic/claude-3-haiku"     # Fast and reliable
  "anthropic/claude-3-opus"      # Powerful but slower
  "openai/gpt-4o"                # Good alternative
  "anthropic/claude-3.7-sonnet"  # Latest Claude model
  "openai/gpt-4.1"               # Latest GPT model
  "google/gemini-2.5-pro-preview" # Google's model
  "deepseek/deepseek-coder"      # Specialized for code
)

# Test repositories of varying complexity
REPOS=(
  "https://github.com/pallets/click"           # Small, well-structured
  "https://github.com/expressjs/express"       # Medium, popular
  "https://github.com/django/django"           # Large, complex
)

# Run tests with different combinations
for repo in "${REPOS[@]}"; do
  for model in "${MODELS[@]}"; do
    echo "=== Testing $repo with $model ==="
    ./simple_analysis.sh "$repo" "$model"
    echo ""
  done
done

# Test fallback functionality
echo "=== Testing fallback functionality ==="
./simple_analysis.sh "https://github.com/pallets/click" \
  "invalid/model" \
  "anthropic/claude-3-haiku,openai/gpt-4o"
```

#### 2.4.3 Create Monitoring Script
```bash
#!/bin/bash
# Script to monitor DeepWiki pod and logs

POD_NAME=$(kubectl get pods -n deepwiki-fresh -l app=deepwiki -o jsonpath='{.items[0].metadata.name}')

echo "=== Pod Status ==="
kubectl describe pod "$POD_NAME" -n deepwiki-fresh

echo "=== Recent Logs ==="
kubectl logs "$POD_NAME" -n deepwiki-fresh --tail=100

echo "=== Resource Usage ==="
kubectl top pod "$POD_NAME" -n deepwiki-fresh
```

### 2.5 Orchestrator Integration

#### 2.5.1 Create TypeScript Service for DeepWiki
```typescript
// DeepWiki service for orchestrator integration
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface DeepWikiAnalysisOptions {
  repositoryUrl: string;
  primaryModel: string;
  fallbackModels?: string[];
}

interface AnalysisResult {
  success: boolean;
  result?: any;
  error?: string;
  modelUsed?: string;
}

export class DeepWikiService {
  /**
   * Analyze a repository with fallback support
   */
  async analyzeRepositoryWithFallback(options: DeepWikiAnalysisOptions): Promise<AnalysisResult> {
    const { repositoryUrl, primaryModel, fallbackModels = [] } = options;
    
    // Convert fallback models to comma-separated string if provided
    const fallbackModelsStr = fallbackModels.length > 0 ? fallbackModels.join(',') : '';
    
    try {
      // Execute the analysis script
      const { stdout, stderr } = await execAsync(
        `./simple_analysis.sh "${repositoryUrl}" "${primaryModel}" "${fallbackModelsStr}"`
      );
      
      if (stderr && !stdout) {
        return {
          success: false,
          error: stderr
        };
      }
      
      // Parse the result
      const result = JSON.parse(stdout);
      
      return {
        success: true,
        result,
        modelUsed: result.model_used || primaryModel
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }
}
```

#### 2.5.2 Create Example Orchestrator Usage
```typescript
// Example usage in orchestrator
import { DeepWikiService } from './deepwiki-service';

async function analyzePullRequest(repoUrl: string, prContext: any) {
  const deepwikiService = new DeepWikiService();
  
  // Select model based on repository characteristics
  const primaryModel = 'anthropic/claude-3-opus';
  const fallbackModels = ['openai/gpt-4o', 'anthropic/claude-3.7-sonnet'];
  
  try {
    const analysisResult = await deepwikiService.analyzeRepositoryWithFallback({
      repositoryUrl: repoUrl,
      primaryModel,
      fallbackModels
    });
    
    if (analysisResult.success) {
      console.log(`Analysis completed successfully using model: ${analysisResult.modelUsed}`);
      return analysisResult.result;
    } else {
      console.error(`Analysis failed: ${analysisResult.error}`);
      return null;
    }
  } catch (error) {
    console.error('Unexpected error during analysis:', error);
    return null;
  }
}
```

### 2.6 Documentation

#### 2.6.1 Create Updated README
```markdown
# DeepWiki OpenRouter Integration

This repository contains scripts and configuration for integrating DeepWiki with OpenRouter for repository analysis.

## Usage

To analyze a repository:

```bash
./simple_analysis.sh REPO_URL PRIMARY_MODEL [FALLBACK_MODELS]
```

Example:
```bash
./simple_analysis.sh https://github.com/pallets/click anthropic/claude-3-opus openai/gpt-4o,anthropic/claude-3.7-sonnet
```

## Parameters

1. `REPO_URL`: URL of the repository to analyze
2. `PRIMARY_MODEL`: Primary model to use with provider prefix (e.g., "anthropic/claude-3-opus")
3. `FALLBACK_MODELS`: Optional comma-separated list of fallback models

## Supported Models

- `anthropic/claude-3-opus`: Best for detailed analysis
- `anthropic/claude-3-haiku`: Fast for quick analysis
- `openai/gpt-4o`: Good all-around performance
- `anthropic/claude-3.7-sonnet`: Latest Claude model
- `openai/gpt-4.1`: Latest GPT model
- `google/gemini-2.5-pro-preview`: Google's model
- `deepseek/deepseek-coder`: Specialized for code

## Troubleshooting

If you encounter issues:

1. Check OpenRouter API key
2. Verify pod status
3. Check network connectivity
4. Review pod logs
```

#### 2.6.2 Create Integration Guide
```markdown
# DeepWiki OpenRouter Integration Guide

This guide explains how to use the DeepWiki OpenRouter integration for repository analysis.

## Setup

1. Ensure Kubernetes access configured
2. Set OpenRouter API key
3. Verify pod status

## Basic Usage

```typescript
const analysis = await deepwikiService.analyzeRepositoryWithFallback({
  repositoryUrl: "https://github.com/owner/repo",
  primaryModel: "anthropic/claude-3-opus",
  fallbackModels: ["openai/gpt-4o", "anthropic/claude-3.7-sonnet"]
});
```

## Best Practices

1. Always provide fallback models
2. Mix providers in fallback list
3. Start with faster models for initial analysis
4. Use specialized models for specific needs
```

#### 2.6.3 Create Troubleshooting Guide
```markdown
# DeepWiki OpenRouter Troubleshooting Guide

## Common Issues

### Authentication Errors

If you receive 401 Unauthorized:
1. Check OpenRouter API key
2. Verify secret configuration
3. Ensure environment variables are correctly set

### Model Not Found Errors

If you receive "model not found":
1. Verify model name has correct provider prefix
2. Check OpenRouter supported models
3. Try with a different model

### Connection Issues

If you can't connect to DeepWiki:
1. Check pod status
2. Verify service is running
3. Test network connectivity
4. Check port forwarding

### Analysis Failures

If repository analysis fails:
1. Check repository accessibility
2. Verify repository size isn't too large
3. Test with a simpler repository
4. Review error logs for specific issues
```

## 3. Implementation Timeline

### Day 1: Setup and Preparation
- Create new Kubernetes namespace
- Configure API key secrets
- Set up persistent storage
- Create network policies
- Prepare implementation scripts

### Day 2: DeepWiki Installation
- Deploy DeepWiki base
- Create DeepWiki service
- Verify basic functionality
- Implement OpenRouter client patch
- Create and test simple scripts

### Day 3: Testing and Documentation
- Implement comprehensive test suite
- Create monitoring scripts
- Test with various repositories and models
- Document findings and best practices
- Create detailed troubleshooting guide

### Day 4: Orchestrator Integration
- Create TypeScript service for orchestrator
- Implement example usage patterns
- Test integration with orchestrator
- Refine and optimize integration
- Create integration documentation

## 4. Maintenance Plan

### Regular Maintenance Tasks
- Verify API connectivity weekly
- Rotate API keys monthly
- Test new models as they become available
- Monitor for changes in OpenRouter API
- Update documentation as needed

### Monitoring
- Set up alerts for pod failures
- Monitor analysis success rates
- Track model performance over time
- Analyze error patterns
- Optimize model selection based on performance

### Backup Strategy
- Back up configuration scripts
- Document deployment procedures
- Create restore procedures
- Test restoration process monthly

## 5. Conclusion

This fresh implementation plan provides a clean, minimalist approach to integrating DeepWiki with OpenRouter, focusing on the three key parameters requested (repo URL, primary model/version, and fallback model/version). By following this plan, we can create a reliable, maintainable integration that leverages our existing knowledge while avoiding the issues encountered in the previous implementation.
