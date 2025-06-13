#!/bin/bash

# Deployment script for DeepWiki with Tools
set -e

echo "Deploying DeepWiki with Tools to Kubernetes..."

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "Error: kubectl is not installed or not in PATH"
    exit 1
fi

# Check if we can connect to the cluster
if ! kubectl cluster-info &> /dev/null; then
    echo "Error: Cannot connect to Kubernetes cluster"
    exit 1
fi

# Build Docker image first
echo "Building Docker image..."
bash "$SCRIPT_DIR/build-docker.sh"

# Apply Kubernetes manifests
echo "Applying Kubernetes manifests..."
kubectl apply -f "$SCRIPT_DIR/kubernetes-deployment.yaml"

# Wait for deployment to be ready
echo "Waiting for deployment to be ready..."
kubectl rollout status deployment/deepwiki-with-tools --timeout=300s

# Verify the deployment
echo "Verifying deployment..."
kubectl get pods -l app=deepwiki-with-tools
kubectl get services -l app=deepwiki-with-tools

# Show service details
echo ""
echo "Deployment completed successfully!"
echo ""
echo "Service details:"
kubectl describe service deepwiki-with-tools

echo ""
echo "Pod status:"
kubectl get pods -l app=deepwiki-with-tools -o wide

echo ""
echo "To view logs, run:"
echo "  kubectl logs -l app=deepwiki-with-tools -f"

echo ""
echo "To scale the deployment, run:"
echo "  kubectl scale deployment deepwiki-with-tools --replicas=N"

echo ""
echo "Deployment complete!"