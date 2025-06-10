#!/bin/bash
# Script to organize DeepWiki integration files

# Target directories
INTEGRATION_DIR="/Users/alpinro/Code Prjects/codequal/packages/core/scripts/deepwiki_integration"
ARCHIVE_DIR="${INTEGRATION_DIR}/archive"
DOCS_DIR="/Users/alpinro/Code Prjects/codequal/docs/deepwiki"

# Create directories if they don't exist
mkdir -p "${ARCHIVE_DIR}"
mkdir -p "${DOCS_DIR}"

# Move documentation to docs directory
echo "Copying documentation to docs directory..."
cp "${INTEGRATION_DIR}/deepwiki_openrouter_integration.md" "${DOCS_DIR}/openrouter_integration.md"
cp "${INTEGRATION_DIR}/model_compatibility_report.md" "${DOCS_DIR}/model_compatibility_report.md"

# Archive intermediate development files
echo "Archiving intermediate development files..."
mv "${INTEGRATION_DIR}/test_openrouter.py" "${ARCHIVE_DIR}/" 2>/dev/null || true
mv "${INTEGRATION_DIR}/improved_test_openrouter.py" "${ARCHIVE_DIR}/" 2>/dev/null || true
mv "${INTEGRATION_DIR}/implement_fix.sh" "${ARCHIVE_DIR}/" 2>/dev/null || true
mv "${INTEGRATION_DIR}/improved_fix.sh" "${ARCHIVE_DIR}/" 2>/dev/null || true
mv "${INTEGRATION_DIR}/test_integration.sh" "${ARCHIVE_DIR}/" 2>/dev/null || true
mv "${INTEGRATION_DIR}/complete_testing.sh" "${ARCHIVE_DIR}/" 2>/dev/null || true
mv "${INTEGRATION_DIR}/final_test.sh" "${ARCHIVE_DIR}/" 2>/dev/null || true

# Keep only the essential files in the main directory
echo "Keeping essential files in the main directory:"
echo "1. openrouter_patch.py - The core fix implementation"
echo "2. comprehensive_test.py - The comprehensive test script"
echo "3. comprehensive_test.sh - The script to run comprehensive tests"
echo "4. fix_script_issues.sh - Script to fix issues in test scripts"
echo "5. organize_project.sh - This organization script"
echo "6. deepwiki_openrouter_integration.md - The main documentation"
echo "7. model_compatibility_report.md - Test results report"

# Create a README for the integration directory
cat > "${INTEGRATION_DIR}/README.md" << 'EOF'
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
EOF

echo "Project organization complete!"
echo "- Essential files kept in: ${INTEGRATION_DIR}"
echo "- Documentation copied to: ${DOCS_DIR}"
echo "- Intermediate files archived in: ${ARCHIVE_DIR}"
echo ""
echo "Next steps:"
echo "1. Review the documentation in ${DOCS_DIR}"
echo "2. Integrate with the orchestrator as described in the documentation"
echo "3. Rotate your OpenRouter API key for security reasons"
