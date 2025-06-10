# DeepWiki OpenRouter Integration

This directory contains scripts and tools for integrating DeepWiki with OpenRouter, focusing on handling provider-prefixed model names.

## Key Files

- `openrouter_patch.py`: The core fix that patches the OpenRouter client in DeepWiki
- `comprehensive_test.py`: Script to test the integration with multiple models
- `comprehensive_test.sh`: Shell script to run the comprehensive test
- `deepwiki_openrouter_integration.md`: Comprehensive documentation of the implementation
- `model_compatibility_report.md`: Report of model compatibility testing

## Usage

### Applying the Fix to a DeepWiki Deployment

1. Copy the patch script to the DeepWiki pod:
   ```bash
   kubectl cp openrouter_patch.py codequal-dev/YOUR_POD_NAME:/tmp/
   ```

2. Execute the script on the pod:
   ```bash
   kubectl exec -it YOUR_POD_NAME -n codequal-dev -- python /tmp/openrouter_patch.py
   ```

3. Set up the OpenRouter API key as a Kubernetes Secret:
   ```bash
   # Base64 encode your API key
   ENCODED_KEY=$(echo -n "YOUR_API_KEY" | base64)
   
   # Create the Secret
   kubectl create secret generic deepwiki-api-keys \
     --from-literal=OPENROUTER_API_KEY=$ENCODED_KEY \
     --namespace codequal-dev
   ```

4. Update the DeepWiki deployment to use the Secret:
   ```bash
   kubectl patch deployment YOUR_DEPLOYMENT -n codequal-dev --type=json \
     -p='[{"op": "add", "path": "/spec/template/spec/containers/0/env/-", "value": {"name": "OPENROUTER_API_KEY", "valueFrom": {"secretKeyRef": {"name": "deepwiki-api-keys", "key": "OPENROUTER_API_KEY"}}}}]'
   ```

5. Restart the DeepWiki pod:
   ```bash
   kubectl delete pod -n codequal-dev YOUR_POD_NAME
   ```

### Testing the Integration

To test the integration with multiple models:
```bash
./comprehensive_test.sh
```

### Orchestrator Integration

When integrating with the CodeQual orchestrator, ensure that:
1. Model names include the provider prefix (e.g., `anthropic/claude-3-opus`)
2. OpenRouter is selected as the provider

## Archive

Intermediate development files have been moved to the `archive` directory for reference.

## Documentation

Comprehensive documentation is available in the `/docs/deepwiki` directory.
