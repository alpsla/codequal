# Testing DeepSeek Coder via OpenRouter

This directory contains scripts to test the integration of DeepWiki with OpenRouter, specifically for using DeepSeek Coder for repository analysis.

## Overview

The integration approach is:
1. Configure DeepWiki to use OpenRouter as the provider
2. Specify models in the OpenRouter configuration with the correct format (e.g., `deepseek/deepseek-coder-v2`)
3. Use DeepWiki's repository analysis capabilities with the specified model

## Setup

1. Copy the environment template file:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file and add your OpenRouter API key:
   ```
   OPENROUTER_API_KEY=sk-or-v1-your-api-key-here
   ```

## Running the Tests

### Method 1: All-in-One Script

The easiest way to run the test is using the all-in-one script:

```bash
./run-openrouter-deepseek-test.sh
```

This script will:
1. Configure DeepWiki with the correct OpenRouter settings
2. Run a test with DeepSeek Coder on a small repository
3. Save the results to the `reports/` directory

### Method 2: Individual Steps

If you prefer to run the steps individually:

1. Configure DeepWiki for OpenRouter:
   ```bash
   ./fix-openrouter-model-names.sh
   ```

2. Run the DeepSeek Coder test:
   ```bash
   OPENROUTER_API_KEY=your-api-key node test-deepseek-coder-fixed.js
   ```

## Understanding the Scripts

- `fix-openrouter-model-names.sh`: Configures DeepWiki to use OpenRouter with the correct model formats
- `test-deepseek-coder-fixed.js`: Tests repository analysis with DeepSeek Coder via OpenRouter
- `load-env.js`: Helper script to load environment variables
- `test_openrouter_direct.js`: Direct test of OpenRouter API (created by the fix script)

## Troubleshooting

### Disk Space Issues

If you encounter "No space left on device" errors during repository cloning, the scripts already include cleanup operations, but you may need additional cleanup:

```bash
# Get the DeepWiki pod name
POD=$(kubectl get pods -n codequal-dev -l app=deepwiki-fixed -o jsonpath='{.items[0].metadata.name}')

# Remove all repositories and embeddings
kubectl exec -n codequal-dev $POD -- bash -c "rm -rf /root/.adalflow/repos/* /root/.adalflow/embeddings/*"
```

### Model Format Issues

If you encounter "unexpected model name format" errors, verify the correct model format:

```bash
# Test model formats directly against OpenRouter
OPENROUTER_API_KEY=your-api-key node test_openrouter_direct.js
```

### Port Forwarding Issues

If port forwarding fails:

```bash
# Kill any existing port forwarding
pkill -f "kubectl port-forward"

# Restart port forwarding
kubectl port-forward -n codequal-dev svc/deepwiki-fixed 8001:8001
```

## Expected Results

When successful, the test will:
1. Connect to DeepWiki
2. Clean up old repositories
3. Clone a small test repository
4. Analyze it with DeepSeek Coder
5. Save the analysis to the reports directory

The report should contain a detailed analysis of the repository structure, components, and functionality.