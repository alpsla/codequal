#!/bin/bash
# Ultra-simple kubectl test with verbose error output
# Created: May 15, 2025

echo "=== KUBECTL BASIC TEST ==="
echo "Current date and time: $(date)"
echo "Current user: $(whoami)"
echo "Current directory: $(pwd)"
echo

# Check if kubectl exists
echo "CHECKING FOR KUBECTL"
echo "-------------------"
which kubectl
if [ $? -ne 0 ]; then
  echo "ERROR: kubectl not found in PATH"
  echo "PATH is: $PATH"
  exit 1
fi
echo "kubectl found at: $(which kubectl)"
echo

# Try kubectl version (client only, no server)
echo "CHECKING KUBECTL CLIENT VERSION"
echo "-----------------------------"
kubectl version --client=true
if [ $? -ne 0 ]; then
  echo "ERROR: Failed to get kubectl client version"
  exit 1
fi
echo

# Try to get current context
echo "CHECKING CURRENT CONTEXT"
echo "----------------------"
kubectl config current-context
if [ $? -ne 0 ]; then
  echo "ERROR: Failed to get current context"
  echo "Available contexts:"
  kubectl config get-contexts
  exit 1
fi
echo

# Try to list namespaces
echo "CHECKING NAMESPACE ACCESS"
echo "-----------------------"
kubectl get namespaces
if [ $? -ne 0 ]; then
  echo "ERROR: Failed to list namespaces"
  exit 1
fi
echo

# Try to list pods in all namespaces
echo "CHECKING POD ACCESS"
echo "-----------------"
kubectl get pods --all-namespaces
if [ $? -ne 0 ]; then
  echo "ERROR: Failed to list pods in all namespaces"
  exit 1
fi
echo

echo "=== KUBECTL TEST SUCCESSFUL ==="
