#!/bin/bash

# Configure DeepWiki Git Authentication
# This script configures git inside the DeepWiki pod to use GitHub token for authentication

set -e

echo "🔧 Configuring DeepWiki Git Authentication..."

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed or not in PATH"
    exit 1
fi

# Check if GITHUB_TOKEN is set in environment
if [ -z "$GITHUB_TOKEN" ]; then
    # Try to load from .env file
    if [ -f ".env" ]; then
        export $(grep GITHUB_TOKEN .env | xargs)
    fi
fi

if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ GITHUB_TOKEN not found in environment or .env file"
    exit 1
fi

# Check if DeepWiki pod is running
POD_STATUS=$(kubectl get pods -n codequal-dev -l app=deepwiki --no-headers 2>/dev/null | awk '{print $3}')

if [ "$POD_STATUS" != "Running" ]; then
    echo "❌ DeepWiki pod is not running (status: $POD_STATUS)"
    exit 1
fi

echo "✅ DeepWiki pod is running"

# Configure git in the pod
echo "📝 Setting git configuration..."

# Configure git to use token for HTTPS authentication
kubectl exec -n codequal-dev deployment/deepwiki -- bash -c "git config --global url.\"https://${GITHUB_TOKEN}@github.com/\".insteadOf \"https://github.com/\"" 2>/dev/null

# Set git user info
kubectl exec -n codequal-dev deployment/deepwiki -- bash -c 'git config --global user.email "deepwiki@codequal.dev"' 2>/dev/null
kubectl exec -n codequal-dev deployment/deepwiki -- bash -c 'git config --global user.name "DeepWiki Bot"' 2>/dev/null

# Verify configuration
echo "🔍 Verifying git configuration..."
CONFIG_CHECK=$(kubectl exec -n codequal-dev deployment/deepwiki -- git config --global --list 2>/dev/null | grep -c "url.https://" || echo "0")

if [ "$CONFIG_CHECK" -gt "0" ]; then
    echo "✅ Git configuration successfully applied"
else
    echo "⚠️  Git configuration may not have been applied correctly"
fi

# Test cloning capability
echo "🧪 Testing git clone capability..."
TEST_RESULT=$(kubectl exec -n codequal-dev deployment/deepwiki -- bash -c 'cd /tmp && rm -rf test-repo 2>/dev/null; git clone https://github.com/sindresorhus/ky test-repo >/dev/null 2>&1 && echo "SUCCESS" || echo "FAILED"' 2>/dev/null)

if [ "$TEST_RESULT" = "SUCCESS" ]; then
    echo "✅ Git cloning test successful"
    kubectl exec -n codequal-dev deployment/deepwiki -- rm -rf /tmp/test-repo 2>/dev/null
else
    echo "❌ Git cloning test failed"
    echo "   Please check the GitHub token and network connectivity"
    exit 1
fi

echo ""
echo "✅ DeepWiki Git configuration complete!"
echo ""
echo "📌 Next steps:"
echo "   1. Ensure port forwarding is active:"
echo "      kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001"
echo ""
echo "   2. Test DeepWiki API:"
echo "      curl http://localhost:8001/health"
echo ""