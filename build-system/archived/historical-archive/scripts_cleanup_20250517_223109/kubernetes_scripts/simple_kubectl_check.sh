#!/bin/bash
# Simple kubectl check script
# This script only checks if kubectl is working

echo "===== Simple kubectl diagnostic ====="

# Check if kubectl is in PATH
echo "Checking for kubectl command..."
if command -v kubectl > /dev/null 2>&1; then
  echo "kubectl found at: $(which kubectl)"
else
  echo "kubectl NOT FOUND in PATH"
  echo "PATH = $PATH"
  exit 1
fi

# Check kubectl version
echo "Checking kubectl version..."
kubectl version --client || echo "Failed to get kubectl version"

# Check if kubectl can connect to cluster
echo "Checking cluster connection..."
kubectl cluster-info || echo "Failed to connect to cluster"

# List all pods in all namespaces
echo "Listing all pods (this may take a moment)..."
kubectl get pods --all-namespaces || echo "Failed to list pods"

echo "===== Diagnostic complete ====="
