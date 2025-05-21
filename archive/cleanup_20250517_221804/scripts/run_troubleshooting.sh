#!/bin/bash
# Script to make all troubleshooting scripts executable and run them
# Created: May 15, 2025

echo "Making troubleshooting scripts executable..."

# Make scripts executable
chmod +x /Users/alpinro/Code\ Prjects/codequal/scripts/troubleshoot_diagnostics.sh
chmod +x /Users/alpinro/Code\ Prjects/codequal/scripts/simple_kubectl_check.sh
chmod +x /Users/alpinro/Code\ Prjects/codequal/scripts/manual_kubectl.sh

echo "Scripts are now executable."
echo ""
echo "Please choose which script to run:"
echo "1. Troubleshoot Diagnostics (troubleshoot_diagnostics.sh)"
echo "2. Simple kubectl Check (simple_kubectl_check.sh)"
echo "3. Manual kubectl Configuration (manual_kubectl.sh)"
read -p "Enter choice (1, 2, or 3): " choice

case $choice in
  1)
    echo "Running troubleshoot_diagnostics.sh..."
    /Users/alpinro/Code\ Prjects/codequal/scripts/troubleshoot_diagnostics.sh
    ;;
  2)
    echo "Running simple_kubectl_check.sh..."
    /Users/alpinro/Code\ Prjects/codequal/scripts/simple_kubectl_check.sh
    ;;
  3)
    echo "Running manual_kubectl.sh..."
    /Users/alpinro/Code\ Prjects/codequal/scripts/manual_kubectl.sh
    ;;
  *)
    echo "Invalid choice. Please run one of the scripts manually:"
    echo "/Users/alpinro/Code\ Prjects/codequal/scripts/troubleshoot_diagnostics.sh"
    echo "/Users/alpinro/Code\ Prjects/codequal/scripts/simple_kubectl_check.sh"
    echo "/Users/alpinro/Code\ Prjects/codequal/scripts/manual_kubectl.sh"
    ;;
esac
