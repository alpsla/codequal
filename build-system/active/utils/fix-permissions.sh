#!/bin/bash
# Fix Permissions - Fix executable permissions for all scripts
# Usage: ./fix-permissions.sh

set -e

echo "🔧 Fixing script permissions..."

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../" && pwd)"
cd "$PROJECT_ROOT"

# Fix permissions for build-system scripts
echo "🔧 Fixing build-system script permissions..."
find build-system -name "*.sh" -exec chmod +x {} \;

# Fix permissions for root scripts
echo "🔧 Fixing root script permissions..."
find . -maxdepth 1 -name "*.sh" -exec chmod +x {} \;

# Fix permissions for scripts directory
echo "🔧 Fixing scripts directory permissions..."
find scripts -name "*.sh" -exec chmod +x {} \;

# Fix permissions for integration-tests scripts
echo "🔧 Fixing integration-tests script permissions..."
find integration-tests/scripts -name "*.sh" -exec chmod +x {} \;

# Fix permissions for Kubernetes scripts
if [ -d "kubernetes" ]; then
    echo "🔧 Fixing Kubernetes script permissions..."
    find kubernetes -name "*.sh" -exec chmod +x {} \;
fi

echo "✅ All script permissions fixed!"
echo "📊 Permissions updated for:"
echo "   - build-system/ scripts"
echo "   - Root directory scripts"
echo "   - scripts/ directory"
echo "   - integration-tests/scripts/"
echo "   - kubernetes/ directory (if exists)"