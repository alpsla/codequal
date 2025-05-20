#!/bin/bash
# Direct execution of diagnostic script with debugging
# Created: May 15, 2025

echo "Starting manual diagnostic troubleshooting..."

# Make the diagnostic script executable with verbose output
echo "Making kubernetes_diagnostic.sh executable..."
chmod +x /Users/alpinro/Code\ Prjects/codequal/scripts/kubernetes_diagnostic.sh
echo "chmod command completed"

# Run the diagnostic script with bash explicitly
echo "Running diagnostic script with bash explicitly..."
bash /Users/alpinro/Code\ Prjects/codequal/scripts/kubernetes_diagnostic.sh

# If that fails, print diagnostic information
if [ $? -ne 0 ]; then
  echo "Diagnostic script failed. Collecting additional information..."
  
  echo "Shell environment:"
  echo "SHELL=$SHELL"
  echo "PATH=$PATH"
  
  echo "Script file info:"
  ls -la /Users/alpinro/Code\ Prjects/codequal/scripts/kubernetes_diagnostic.sh
  
  echo "Kubectl availability:"
  which kubectl 2>&1 || echo "kubectl not found"
  
  echo "Kubectl version:"
  kubectl version --client 2>&1 || echo "kubectl version command failed"
  
  echo "Kubernetes cluster info:"
  kubectl cluster-info 2>&1 || echo "kubectl cluster-info command failed"
fi

echo "Manual diagnostic troubleshooting complete."
