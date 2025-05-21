#!/bin/bash
# Script to check and fix OpenRouter API key configuration in DeepWiki

# Base directory
BASE_DIR="/Users/alpinro/Code Prjects/codequal"
cd "$BASE_DIR" || exit 1

# Parameters
NAMESPACE="codequal-dev"
POD_SELECTOR="deepwiki-fixed"

# Get the active pod
ACTIVE_POD=$(kubectl get pods -n "$NAMESPACE" | grep "$POD_SELECTOR" | grep Running | head -n 1 | awk '{print $1}')

if [ -z "$ACTIVE_POD" ]; then
  echo "ERROR: No running DeepWiki pod found matching selector: $POD_SELECTOR"
  exit 1
fi

echo "Using pod: $ACTIVE_POD"

# Check if OpenRouter API key is set in the pod
echo "Checking for OpenRouter API key in the pod..."
ENV_CHECK=$(kubectl exec -n "$NAMESPACE" "$ACTIVE_POD" -- env | grep -i OPENROUTER)

if [ -z "$ENV_CHECK" ]; then
  echo "WARNING: No OpenRouter environment variables found in the pod"
else
  echo "Found OpenRouter environment variables:"
  echo "$ENV_CHECK"
fi

# Check for OpenRouter API key in DeepWiki config
echo "Checking for OpenRouter configuration in DeepWiki..."
CONFIG_CHECK=$(kubectl exec -n "$NAMESPACE" "$ACTIVE_POD" -- find /app -name "*.env" -o -name "*.json" | xargs kubectl exec -n "$NAMESPACE" "$ACTIVE_POD" -- grep -l "openrouter" 2>/dev/null)

if [ -z "$CONFIG_CHECK" ]; then
  echo "WARNING: No OpenRouter configuration files found"
else
  echo "Found OpenRouter configuration files:"
  echo "$CONFIG_CHECK"

  # Check the content of these files
  for file in $CONFIG_CHECK; do
    echo "Content of $file:"
    kubectl exec -n "$NAMESPACE" "$ACTIVE_POD" -- cat "$file" | grep -i "openrouter" -A 5 -B 5
    echo ""
  done
fi

# Provide guidance on how to set the API key
echo ""
echo "====================================================="
echo "API Key Issue Resolution"
echo "====================================================="
echo "The error 'cannot access free variable 'e_unexp' where it is not associated with a value in enclosing scope'"
echo "suggests that the OpenRouter API key is missing or invalid."
echo ""
echo "To resolve this issue, try one of the following approaches:"
echo ""
echo "1. Set the environment variable in the pod:"
echo "   kubectl exec -n $NAMESPACE $ACTIVE_POD -- bash -c 'export OPENROUTER_API_KEY=your_api_key_here'"
echo ""
echo "2. Update the Kubernetes deployment with the environment variable:"
echo "   kubectl set env deployment/$POD_SELECTOR -n $NAMESPACE OPENROUTER_API_KEY=your_api_key_here"
echo ""
echo "3. Create a Kubernetes secret and update the deployment:"
echo "   kubectl create secret generic openrouter-api-key --from-literal=OPENROUTER_API_KEY=your_api_key_here -n $NAMESPACE"
echo "   kubectl set env deployment/$POD_SELECTOR -n $NAMESPACE --from=secret/openrouter-api-key"
echo ""
echo "4. Update the DeepWiki configuration files directly:"
echo "   - Identify the config file from the list above"
echo "   - Update it with a valid OpenRouter API key"
echo ""
echo "For security, you should use approach #3 (Kubernetes secret) for production environments."
echo "====================================================="

# Check if we have any OpenRouter API keys in our local environment
LOCAL_KEY_CHECK=$(grep -r "OPENROUTER_API_KEY" "$BASE_DIR" --include="*.env" --include="*.sh" --include="*.yaml" 2>/dev/null)

if [ -n "$LOCAL_KEY_CHECK" ]; then
  echo ""
  echo "Found potential OpenRouter API key references in local files:"
  echo "$LOCAL_KEY_CHECK" | grep -v "your_api_key_here"
  echo ""
  echo "You may be able to reuse an existing API key from one of these files."
fi

# Create a script to set the API key in the pod
API_KEY_SCRIPT="$BASE_DIR/set_openrouter_key.sh"

cat > "$API_KEY_SCRIPT" << 'EOF'
#!/bin/bash
# Script to set the OpenRouter API key in the DeepWiki pod

# Check if API key is provided
if [ -z "$1" ]; then
  echo "ERROR: Please provide your OpenRouter API key as a parameter"
  echo "Usage: $0 your_api_key_here"
  exit 1
fi

# Parameters
API_KEY="$1"
NAMESPACE="codequal-dev"
POD_SELECTOR="deepwiki-fixed"

# Get the active pod
ACTIVE_POD=$(kubectl get pods -n "$NAMESPACE" | grep "$POD_SELECTOR" | grep Running | head -n 1 | awk '{print $1}')

if [ -z "$ACTIVE_POD" ]; then
  echo "ERROR: No running DeepWiki pod found matching selector: $POD_SELECTOR"
  exit 1
fi

echo "Using pod: $ACTIVE_POD"

# First try to set it using kubectl set env
echo "Setting OpenRouter API key in the deployment..."
kubectl set env deployment/$POD_SELECTOR -n $NAMESPACE OPENROUTER_API_KEY="$API_KEY"

if [ $? -ne 0 ]; then
  echo "WARNING: Could not set environment variable in deployment"
  echo "Trying to set it directly in the pod..."
  
  # Try to set it in the pod's environment
  kubectl exec -n "$NAMESPACE" "$ACTIVE_POD" -- bash -c "export OPENROUTER_API_KEY=\"$API_KEY\""
  
  if [ $? -ne 0 ]; then
    echo "WARNING: Could not set environment variable in pod"
    
    # As a last resort, try to find and update config files
    CONFIG_FILES=$(kubectl exec -n "$NAMESPACE" "$ACTIVE_POD" -- find /app -name "*.env" -o -name "*.json" | xargs kubectl exec -n "$NAMESPACE" "$ACTIVE_POD" -- grep -l "openrouter" 2>/dev/null)
    
    if [ -n "$CONFIG_FILES" ]; then
      echo "Found OpenRouter configuration files. Attempting to update..."
      
      for file in $CONFIG_FILES; do
        echo "Updating $file..."
        
        # Backup the file
        kubectl exec -n "$NAMESPACE" "$ACTIVE_POD" -- cp "$file" "${file}.bak"
        
        # Update the file - this is a simplistic approach that might need refinement
        kubectl exec -n "$NAMESPACE" "$ACTIVE_POD" -- bash -c "sed -i 's/OPENROUTER_API_KEY=.*/OPENROUTER_API_KEY=\"$API_KEY\"/' \"$file\""
        
        echo "Updated $file. Original backed up to ${file}.bak"
      done
    else
      echo "ERROR: Could not find any way to set the API key"
      exit 1
    fi
  fi
fi

echo "API key has been set. Attempting to verify..."

# Check if the API key is set
ENV_CHECK=$(kubectl exec -n "$NAMESPACE" "$ACTIVE_POD" -- env | grep OPENROUTER_API_KEY)

if [ -n "$ENV_CHECK" ]; then
  echo "Success! API key is set in the pod's environment."
  echo "You can now try running the simplified scoring script again."
else
  echo "API key not found in pod's environment. It may still be set in configuration files."
  echo "Try running the simplified scoring script again to see if it works."
fi
EOF

chmod +x "$API_KEY_SCRIPT"

echo ""
echo "I've created a script to help set the OpenRouter API key: $API_KEY_SCRIPT"
echo "To use it, run: $API_KEY_SCRIPT your_api_key_here"
echo ""
echo "After setting the API key, try running the simplified scoring script again."
