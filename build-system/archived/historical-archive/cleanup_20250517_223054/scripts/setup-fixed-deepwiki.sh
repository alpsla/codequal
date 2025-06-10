#!/bin/bash

# Deploy the fixed DeepWiki environment
# This script creates a fresh DeepWiki deployment with:
# 1. Correctly configured API keys
# 2. Larger persistent volume (15Gi)
# 3. Port forwarding to access the service locally

set -e

echo "Applying fixed DeepWiki configuration..."
kubectl apply -f fix-deepwiki-env.yaml

echo "Waiting for the new DeepWiki pod to become ready..."
# Wait for the pod to be ready
kubectl wait --for=condition=ready pod -l app=deepwiki-fixed -n codequal-dev --timeout=300s

echo "Setting up port forwarding to the new DeepWiki service..."
# Get the pod name
DEEPWIKI_POD=$(kubectl get pods -n codequal-dev -l app=deepwiki-fixed -o jsonpath='{.items[0].metadata.name}')

# Kill any existing port-forwarding process
pkill -f "kubectl port-forward.*8001:8001" || true

# Set up port forwarding in the background
kubectl port-forward -n codequal-dev svc/deepwiki-fixed 8001:8001 &
PF_PID=$!

echo "Port forwarding started (PID: $PF_PID)"
echo "DeepWiki API should now be accessible at http://localhost:8001"

# Update environment settings for calibration
echo "Updating calibration environment..."
cat > .env.calibration << EOF
# DeepWiki API Configuration
DEEPWIKI_API_URL=http://localhost:8001
DEEPSEEK_API_KEY=sk-d513de3f650e4497b0b67d542b2ad190
USE_REAL_DEEPWIKI=true
SIMULATE_REAL_DELAY=false
SKIP_PROVIDERS=
EOF

echo "Environment prepared. To use these settings:"
echo "cat .env.calibration >> ../../../../.env"
echo "or source .env.calibration"

echo "To test the connection to the new DeepWiki service:"
echo "./calibration-modes.sh validate"