#!/bin/bash
# Manual kubectl execution wrapper
# This script helps bypass path and permission issues by using full paths

echo "===== Manual kubectl execution ====="

# Try to find kubectl using 'which'
KUBECTL_PATH=$(which kubectl 2>/dev/null)

# Check common locations if not found
if [ -z "$KUBECTL_PATH" ]; then
  for path in \
    "/usr/local/bin/kubectl" \
    "/usr/bin/kubectl" \
    "/opt/homebrew/bin/kubectl" \
    "$HOME/bin/kubectl" \
    "$HOME/.kube/kubectl"
  do
    if [ -x "$path" ]; then
      KUBECTL_PATH="$path"
      break
    fi
  done
fi

# Report kubectl path
if [ -n "$KUBECTL_PATH" ]; then
  echo "Found kubectl at: $KUBECTL_PATH"
else
  echo "kubectl not found in PATH or common locations."
  echo "Please install kubectl or provide its location."
  exit 1
fi

# Try to execute a simple kubectl command
echo "Trying to execute kubectl version..."
"$KUBECTL_PATH" version --client || echo "Failed to get kubectl version"

# Ask user for pod details
echo ""
echo "Please provide details about your DeepWiki pod:"
read -p "Namespace (e.g., default): " NAMESPACE
read -p "Pod name (e.g., deepwiki-deployment-xyz): " POD_NAME
read -p "Container name (e.g., deepwiki): " CONTAINER_NAME

# Validate inputs
if [ -z "$NAMESPACE" ] || [ -z "$POD_NAME" ] || [ -z "$CONTAINER_NAME" ]; then
  echo "Error: Namespace, pod name, and container name are required."
  exit 1
fi

# Save pod information for future use
cat > /Users/alpinro/Code\ Prjects/codequal/scripts/deepwiki_pod_info.sh << EOF
# DeepWiki pod information
# Generated: $(date)
DEEPWIKI_NAMESPACE="$NAMESPACE"
DEEPWIKI_POD_NAME="$POD_NAME"
DEEPWIKI_CONTAINER_NAME="$CONTAINER_NAME"
EOF

echo "Pod information saved to deepwiki_pod_info.sh"

# Try to get pod information
echo "Trying to get pod information..."
"$KUBECTL_PATH" get pod "$POD_NAME" -n "$NAMESPACE" || echo "Failed to get pod"

# Try to execute a command in the pod
echo "Trying to execute 'ls -la /' in the container..."
"$KUBECTL_PATH" exec "$POD_NAME" -n "$NAMESPACE" -c "$CONTAINER_NAME" -- ls -la / || echo "Failed to execute command in container"

echo ""
echo "If the above commands worked, you can use the following information:"
echo "- Kubectl path: $KUBECTL_PATH"
echo "- Namespace: $NAMESPACE"
echo "- Pod name: $POD_NAME"
echo "- Container name: $CONTAINER_NAME"
echo ""
echo "You can use these values in the test_deepwiki_cli.sh script like this:"
echo "./test_deepwiki_cli.sh -n $NAMESPACE -p $POD_NAME -c $CONTAINER_NAME -r https://github.com/example/repo"
