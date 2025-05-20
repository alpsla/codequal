#!/bin/bash

# Check the configuration of the DeepWiki pod
# This script:
# 1. Gathers environment variables
# 2. Shows the config file structure
# 3. Checks API key configuration

# Get the pod name
POD_NAME=$(kubectl get pods -n codequal-dev -l app=deepwiki-fixed -o jsonpath='{.items[0].metadata.name}')

if [ -z "$POD_NAME" ]; then
  POD_NAME=$(kubectl get pods -n codequal-dev -l app=deepwiki -o jsonpath='{.items[0].metadata.name}')
fi

if [ -z "$POD_NAME" ]; then
  echo "No DeepWiki pod found!"
  exit 1
fi

echo "Checking configuration for pod: $POD_NAME"
echo "----------------------------------------"

echo "1. Environment Variables:"
echo "-------------------------"
kubectl exec -n codequal-dev $POD_NAME -- env | grep -E 'API_KEY|SERVER|BASE|URL'

echo -e "\n2. Config Files:"
echo "------------------"
kubectl exec -n codequal-dev $POD_NAME -- ls -la /root/.adalflow/

echo -e "\n3. Provider Configuration Files:"
echo "--------------------------------"
kubectl exec -n codequal-dev $POD_NAME -- find /root/.adalflow -name "*.yml" -o -name "*.yaml" | xargs -I{} echo "Config file: {}"

echo -e "\n4. Checking for provider config files:"
echo "---------------------------------------"
for provider in openai anthropic google deepseek; do
  echo "Searching for $provider configuration files:"
  kubectl exec -n codequal-dev $POD_NAME -- find /root/.adalflow -type f -exec grep -l "$provider" {} \; 2>/dev/null || echo "No files found"
done

echo -e "\n5. Checking configuration content:"
echo "-----------------------------------"
CONFIG_FILES=$(kubectl exec -n codequal-dev $POD_NAME -- find /root/.adalflow -name "*.yml" -o -name "*.yaml" 2>/dev/null)

for file in $CONFIG_FILES; do
  echo -e "\nContents of $file:"
  echo "------------------------------------------------"
  kubectl exec -n codequal-dev $POD_NAME -- cat $file 2>/dev/null || echo "Failed to read file"
  echo "------------------------------------------------"
done

echo -e "\n6. Last few log lines:"
echo "------------------------"
kubectl logs -n codequal-dev $POD_NAME --tail=20