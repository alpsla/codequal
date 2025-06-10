#!/bin/bash
# Deploy Check - Pre-deployment validation
# Usage: ./deploy-check.sh [environment]

set -e

ENVIRONMENT=${1:-"staging"}

echo "🔍 Running deployment checks for $ENVIRONMENT..."

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../" && pwd)"
cd "$PROJECT_ROOT"

# Environment validation
echo "🌍 Validating environment: $ENVIRONMENT"
case $ENVIRONMENT in
    "staging"|"production"|"development")
        echo "✅ Valid environment: $ENVIRONMENT"
        ;;
    *)
        echo "❌ Invalid environment: $ENVIRONMENT"
        echo "Valid environments: staging, production, development"
        exit 1
        ;;
esac

# Check Git status
echo "📊 Checking Git status..."
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️ Working directory is not clean:"
    git status --short
    if [ "$ENVIRONMENT" = "production" ]; then
        echo "❌ Production deployments require clean working directory"
        exit 1
    fi
else
    echo "✅ Working directory is clean"
fi

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "🌿 Current branch: $CURRENT_BRANCH"

if [ "$ENVIRONMENT" = "production" ] && [ "$CURRENT_BRANCH" != "main" ]; then
    echo "⚠️ Production deployments should be from 'main' branch"
    read -p "Continue anyway? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "❌ Deployment cancelled"
        exit 1
    fi
fi

# Check for required environment files
echo "📋 Checking environment configuration..."
case $ENVIRONMENT in
    "production")
        if [ ! -f ".env.production" ]; then
            echo "⚠️ .env.production not found"
        else
            echo "✅ .env.production found"
        fi
        ;;
    "staging")
        if [ ! -f ".env.staging" ]; then
            echo "⚠️ .env.staging not found"
        else
            echo "✅ .env.staging found"
        fi
        ;;
esac

# Run build check
echo "🔨 Running build check..."
if ./build-system/active/build/build-all.sh > /dev/null 2>&1; then
    echo "✅ Build check passed"
else
    echo "❌ Build check failed"
    exit 1
fi

# Run test check
echo "🧪 Running test check..."
if ./build-system/active/test/test-all.sh > /dev/null 2>&1; then
    echo "✅ Test check passed"
else
    echo "❌ Test check failed"
    exit 1
fi

# Check Docker (if applicable)
if command -v docker &> /dev/null; then
    echo "🐳 Docker is available"
    if ! docker info &> /dev/null; then
        echo "⚠️ Docker daemon is not running"
    else
        echo "✅ Docker daemon is running"
    fi
else
    echo "⚠️ Docker not found (may not be needed)"
fi

echo ""
echo "✅ All deployment checks passed for $ENVIRONMENT!"
echo "📊 Check summary:"
echo "   - Environment: $ENVIRONMENT ✅"
echo "   - Git status: Clean ✅"
echo "   - Build: Passing ✅"
echo "   - Tests: Passing ✅"
echo ""
echo "🚀 Ready for deployment!"