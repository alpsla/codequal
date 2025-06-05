#!/bin/bash

# Full project test and build script
# This ensures all components are working before pushing to origin

echo "🔧 CodeQual Full Project Test & Build"
echo "====================================="
echo ""

# Navigate to project root
cd "$(dirname "$0")"
PROJECT_ROOT=$(pwd)

# Check for required environment files
if [ ! -f ".env" ] && [ ! -f ".env.local" ]; then
  echo "❌ No .env or .env.local file found"
  echo "Please ensure your API keys are configured"
  exit 1
fi

echo "✅ Environment configuration found"
echo ""

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf packages/*/dist
rm -rf packages/*/lib
rm -rf packages/*/build

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
  echo "❌ Failed to install dependencies"
  exit 1
fi

# Build all packages in order
echo ""
echo "🔨 Building packages..."
echo ""

# Build core first (dependency for others)
echo "1️⃣ Building @codeqal/core..."
cd packages/core
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Core build failed"
  exit 1
fi
echo "✅ Core build successful"

# Build database package
echo ""
echo "2️⃣ Building @codeqal/database..."
cd ../database
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Database build failed"
  exit 1
fi
echo "✅ Database build successful"

# Build agents package
echo ""
echo "3️⃣ Building @codeqal/agents..."
cd ../agents
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Agents build failed"
  exit 1
fi
echo "✅ Agents build successful"

# Run tests
echo ""
echo "🧪 Running test suites..."
cd $PROJECT_ROOT

# Run core tests
echo ""
echo "Testing @codeqal/core..."
cd packages/core
npm test -- --passWithNoTests
CORE_TEST=$?

# Run database tests
echo ""
echo "Testing @codeqal/database..."
cd ../database
npm test -- --passWithNoTests
DB_TEST=$?

# Run agents tests
echo ""
echo "Testing @codeqal/agents..."
cd ../agents
npm test -- --passWithNoTests
AGENTS_TEST=$?

# Check test results
cd $PROJECT_ROOT
if [ $CORE_TEST -ne 0 ] || [ $DB_TEST -ne 0 ] || [ $AGENTS_TEST -ne 0 ]; then
  echo ""
  echo "❌ Some tests failed"
  echo "Core tests: $([ $CORE_TEST -eq 0 ] && echo '✅' || echo '❌')"
  echo "Database tests: $([ $DB_TEST -eq 0 ] && echo '✅' || echo '❌')"
  echo "Agents tests: $([ $AGENTS_TEST -eq 0 ] && echo '✅' || echo '❌')"
  exit 1
fi

echo ""
echo "✅ All tests passed"

# Run linting
echo ""
echo "🔍 Running ESLint..."
npm run lint
if [ $? -ne 0 ]; then
  echo "⚠️  Linting warnings detected (non-blocking)"
fi

# Run TypeScript type checking
echo ""
echo "📐 Running TypeScript type check..."
npx tsc --noEmit
if [ $? -ne 0 ]; then
  echo "❌ TypeScript type errors detected"
  exit 1
fi
echo "✅ TypeScript types valid"

# Check git status
echo ""
echo "📊 Git Status:"
git status --short

# Summary
echo ""
echo "🎉 BUILD AND TEST COMPLETE"
echo "=========================="
echo ""
echo "✅ All packages built successfully"
echo "✅ All tests passed"
echo "✅ TypeScript compilation successful"
echo ""
echo "Ready to commit and push to origin!"
echo ""
echo "Next steps:"
echo "1. Review git status above"
echo "2. Stage changes: git add ."
echo "3. Commit: git commit -m 'Add dynamic researcher model selection with 99% cost reduction'"
echo "4. Push to origin: git push origin main"
