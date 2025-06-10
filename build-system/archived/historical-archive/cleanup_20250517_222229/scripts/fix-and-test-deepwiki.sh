#!/bin/bash

# Comprehensive DeepWiki Fix Script
# This script:
# 1. Applies the correct DeepWiki configuration
# 2. Sets up the environment for DeepWiki access
# 3. Creates provider configurations
# 4. Tests the connection to verify it's working
# 5. Runs validation for each provider
# 6. Updates the .env file for use with calibration-modes.sh

set -e

echo "==== DeepWiki Fix and Test Script ===="
echo "This script will fix your DeepWiki configuration and test it"
echo ""

# Check if we have access to the Kubernetes cluster
echo "Step 1: Verifying Kubernetes access..."
if ! kubectl get nodes > /dev/null 2>&1; then
  echo "Error: Cannot access Kubernetes cluster. Please make sure you're connected to the right cluster."
  exit 1
fi
echo "✅ Kubernetes access confirmed"

# Get the original API keys from environment or .env file
echo "Step 2: Reading API keys from environment..."
if [ -f "../../../../.env" ]; then
  echo "Reading API keys from .env file..."
  OPENAI_API_KEY=$(grep -E '^OPENAI_API_KEY=' "../../../../.env" | cut -d= -f2)
  ANTHROPIC_API_KEY=$(grep -E '^ANTHROPIC_API_KEY=' "../../../../.env" | cut -d= -f2)
  GOOGLE_API_KEY=$(grep -E '^GOOGLE_API_KEY=' "../../../../.env" | cut -d= -f2)
  DEEPSEEK_API_KEY=$(grep -E '^DEEPSEEK_API_KEY=' "../../../../.env" | cut -d= -f2)
fi

# Verify that we have all required API keys
if [ -z "$OPENAI_API_KEY" ] || [ -z "$ANTHROPIC_API_KEY" ] || [ -z "$GOOGLE_API_KEY" ] || [ -z "$DEEPSEEK_API_KEY" ]; then
  echo "Error: Missing one or more API keys in environment or .env file."
  echo "Please make sure the following variables are set:"
  echo "- OPENAI_API_KEY"
  echo "- ANTHROPIC_API_KEY"
  echo "- GOOGLE_API_KEY"
  echo "- DEEPSEEK_API_KEY"
  exit 1
fi
echo "✅ All API keys found"

# Update the fix-deepwiki-env.yaml file with the latest API keys
echo "Step 3: Updating DeepWiki environment configuration..."
OPENAI_API_KEY_BASE64=$(echo -n "$OPENAI_API_KEY" | base64)
ANTHROPIC_API_KEY_BASE64=$(echo -n "$ANTHROPIC_API_KEY" | base64)
GOOGLE_API_KEY_BASE64=$(echo -n "$GOOGLE_API_KEY" | base64)
DEEPSEEK_API_KEY_BASE64=$(echo -n "$DEEPSEEK_API_KEY" | base64)

# Create a temporary file with updated keys
cat > fix-deepwiki-env.yaml.tmp << EOF
apiVersion: v1
kind: Secret
metadata:
  name: deepwiki-env-fixed
  namespace: codequal-dev
type: Opaque
data:
  # Use the correct keys (base64 encoded)
  OPENAI_API_KEY: $OPENAI_API_KEY_BASE64
  GOOGLE_API_KEY: $GOOGLE_API_KEY_BASE64
  ANTHROPIC_API_KEY: $ANTHROPIC_API_KEY_BASE64
  DEEPSEEK_API_KEY: $DEEPSEEK_API_KEY_BASE64
  # Add specific provider configurations
  PROVIDER_CONFIG_OPENAI: ZW5hYmxlZDogdHJ1ZQ==  # enabled: true
  PROVIDER_CONFIG_ANTHROPIC: ZW5hYmxlZDogdHJ1ZQ==  # enabled: true
  PROVIDER_CONFIG_GOOGLE: ZW5hYmxlZDogdHJ1ZQ==    # enabled: true
  PROVIDER_CONFIG_DEEPSEEK: ZW5hYmxlZDogdHJ1ZQ==  # enabled: true
  # Add debug mode to show more detailed logs
  DEBUG: dHJ1ZQ==  # true
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: deepwiki-data-large
  namespace: codequal-dev
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: do-block-storage
  resources:
    requests:
      storage: 15Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: deepwiki-fixed
  namespace: codequal-dev
  labels:
    app: deepwiki-fixed
spec:
  replicas: 1
  selector:
    matchLabels:
      app: deepwiki-fixed
  template:
    metadata:
      labels:
        app: deepwiki-fixed
    spec:
      containers:
      - name: deepwiki
        image: ghcr.io/asyncfuncai/deepwiki-open:latest
        ports:
        - containerPort: 8001
        - containerPort: 3000
        envFrom:
        - secretRef:
            name: deepwiki-env-fixed
        env:
        - name: SERVER_BASE_URL
          value: http://deepwiki-fixed:8001
        - name: NEXT_PUBLIC_SERVER_BASE_URL
          value: http://deepwiki-fixed:8001
        volumeMounts:
        - name: deepwiki-data
          mountPath: /root/.adalflow
      volumes:
      - name: deepwiki-data
        persistentVolumeClaim:
          claimName: deepwiki-data-large
---
apiVersion: v1
kind: Service
metadata:
  name: deepwiki-fixed
  namespace: codequal-dev
spec:
  selector:
    app: deepwiki-fixed
  ports:
  - port: 8001
    targetPort: 8001
    name: api
  - port: 80
    targetPort: 3000
    name: frontend
EOF

# Verify the updated configuration
echo "Verifying updated configuration..."
if ! diff -q fix-deepwiki-env.yaml.tmp fix-deepwiki-env.yaml > /dev/null 2>&1; then
  echo "Configuration updated with new API keys"
  mv fix-deepwiki-env.yaml.tmp fix-deepwiki-env.yaml
else
  echo "Configuration is already up to date"
  rm fix-deepwiki-env.yaml.tmp
fi
echo "✅ DeepWiki environment configuration ready"

# Apply the fixed DeepWiki configuration
echo "Step 4: Deploying fixed DeepWiki environment..."
kubectl apply -f fix-deepwiki-env.yaml

# Wait for the pod to start
echo "Waiting for the DeepWiki pod to start..."
TIMEOUT=300
for i in $(seq 1 $TIMEOUT); do
  if kubectl get pods -n codequal-dev -l app=deepwiki-fixed -o jsonpath='{.items[0].metadata.name}' 2>/dev/null; then
    break
  fi
  if [ $i -eq $TIMEOUT ]; then
    echo "Error: Timed out waiting for DeepWiki pod to start"
    exit 1
  fi
  echo -n "."
  sleep 1
done
echo ""

# Wait for the pod to be ready
echo "Waiting for the DeepWiki pod to become ready..."
kubectl wait --for=condition=ready pod -l app=deepwiki-fixed -n codequal-dev --timeout=300s
echo "✅ DeepWiki pod is running"

# Get the pod name
DEEPWIKI_POD=$(kubectl get pods -n codequal-dev -l app=deepwiki-fixed -o jsonpath='{.items[0].metadata.name}')
echo "DeepWiki pod name: $DEEPWIKI_POD"

# Initialize provider configurations
echo "Step 5: Initializing provider configurations..."
./initialize-deepwiki-providers.sh
echo "✅ Provider configurations initialized"

# Set up port forwarding
echo "Step 6: Setting up port forwarding..."
# Kill any existing port-forwarding process
pkill -f "kubectl port-forward.*8001:8001" || true

# Set up port forwarding in the background
kubectl port-forward -n codequal-dev svc/deepwiki-fixed 8001:8001 &
PF_PID=$!

# Verify port forwarding is working
echo "Verifying port forwarding is working..."
sleep 3
if ! ps -p $PF_PID > /dev/null; then
  echo "Error: Port forwarding failed to start"
  exit 1
fi
echo "Port forwarding started (PID: $PF_PID)"
echo "✅ DeepWiki API should be accessible at http://localhost:8001"

# Update environment settings for calibration
echo "Step 7: Updating calibration environment..."
cat > .env.calibration << EOF
# DeepWiki API Configuration
DEEPWIKI_API_URL=http://localhost:8001
DEEPSEEK_API_KEY=$DEEPSEEK_API_KEY
OPENAI_API_KEY=$OPENAI_API_KEY
ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
GOOGLE_API_KEY=$GOOGLE_API_KEY
USE_REAL_DEEPWIKI=true
SIMULATE_REAL_DELAY=false
SKIP_PROVIDERS=
EOF

echo "Environment settings created. Loading into current environment..."
source .env.calibration
export DEEPWIKI_API_URL=http://localhost:8001
export USE_REAL_DEEPWIKI=true
export SIMULATE_REAL_DELAY=false
echo "✅ Environment updated"

# Update the global .env file with the calibration settings
echo "Step 8: Updating global .env file..."
if grep -q "DEEPWIKI_API_URL" "../../../../.env"; then
  # Update existing entries
  sed -i.bak -e "s|DEEPWIKI_API_URL=.*|DEEPWIKI_API_URL=http://localhost:8001|" \
             -e "s|USE_REAL_DEEPWIKI=.*|USE_REAL_DEEPWIKI=true|" \
             -e "s|SIMULATE_REAL_DELAY=.*|SIMULATE_REAL_DELAY=false|" \
             -e "s|# DeepWiki API Configuration|# DeepWiki API Configuration - Updated by fix script|" "../../../../.env"
  echo "✅ Updated existing DeepWiki settings in global .env file"
else
  # Add new entries
  cat >> "../../../../.env" << EOF

# DeepWiki API Configuration - Added by fix script
DEEPWIKI_API_URL=http://localhost:8001
USE_REAL_DEEPWIKI=true
SIMULATE_REAL_DELAY=false
EOF
  echo "✅ Added DeepWiki settings to global .env file"
fi

# Wait for DeepWiki service to be fully ready
echo "Step 8: Waiting for DeepWiki service to initialize (10 seconds)..."
sleep 10

# Check the DeepWiki configuration
echo "Step 9: Checking DeepWiki configuration..."
./check-deepwiki-config.sh
echo "✅ DeepWiki configuration verified"

# Test the connection to DeepWiki
echo "Step 10: Testing connection to DeepWiki API..."
if ! curl -s http://localhost:8001/ > /dev/null; then
  echo "Error: Cannot connect to DeepWiki API"
  exit 1
fi
echo "✅ DeepWiki API base URL is accessible"

# Test if the API provides the expected endpoints
if ! curl -s http://localhost:8001/ | grep -q "chat/completions/stream"; then
  echo "Warning: DeepWiki API doesn't seem to expose the expected endpoints"
  echo "This may cause issues with calibration"
else
  echo "✅ DeepWiki API exposes the expected endpoints"
fi

# Validate provider connections
echo "Step 11: Running provider validation..."
node validate-connection.js
echo "✅ Provider validation completed"

# Update the .env file with the calibration settings
echo "Step 12: Updating global .env file..."
if grep -q "DEEPWIKI_API_URL" "../../../../.env"; then
  # Update existing entries
  sed -i.bak -e "s|DEEPWIKI_API_URL=.*|DEEPWIKI_API_URL=http://localhost:8001|" \
             -e "s|USE_REAL_DEEPWIKI=.*|USE_REAL_DEEPWIKI=true|" \
             -e "s|SIMULATE_REAL_DELAY=.*|SIMULATE_REAL_DELAY=false|" "../../../../.env"
else
  # Add new entries
  cat .env.calibration >> "../../../../.env"
fi
echo "✅ Global .env file updated"

echo ""
echo "==== DeepWiki Fix and Test Complete ===="
echo ""
echo "DeepWiki is now running on http://localhost:8001"
echo "Port forwarding is active with PID: $PF_PID"
echo ""
echo "✅ Environment has been updated to use the fixed DeepWiki configuration"
echo "✅ Global .env file has been updated with the necessary settings"
echo ""
echo "To run calibration with the fixed DeepWiki:"
echo "./calibration-modes.sh full"
echo ""
echo "If some providers are still not working, you can skip them:"
echo "./calibration-modes.sh full deepseek,google"
echo ""
echo "To validate the connection again:"
echo "node validate-connection.js"
echo ""
echo "IMPORTANT: If you restart your computer or close this terminal,"
echo "you'll need to set up port forwarding again with:"
echo "kubectl port-forward -n codequal-dev svc/deepwiki-fixed 8001:8001"
echo ""
echo "If you continue to have issues with the DeepWiki API, please check:"
echo "1. Pod logs: kubectl logs -n codequal-dev deployment/deepwiki-fixed"
echo "2. Provider configurations: ./check-deepwiki-config.sh"
echo "3. Network connectivity: Test access to http://localhost:8001"