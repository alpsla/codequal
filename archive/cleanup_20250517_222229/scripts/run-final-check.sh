#!/bin/bash

# Navigate to the agents package
cd "$(dirname "$0")"

# Print current directory for debugging
echo "Running in directory: $(pwd)"

# Run TypeScript compiler with more lenient options
echo "Running TypeScript check..."
npx tsc --noEmit --pretty --allowJs --esModuleInterop

TSC_RESULT=$?
if [ $TSC_RESULT -eq 0 ]; then
  echo "✅ TypeScript check passed!"
else
  echo "❌ TypeScript check failed. See errors above."
  exit 1
fi

# Clean the dist directory
echo ""
echo "Cleaning dist directory..."
rm -rf dist

# Run the actual build
echo ""
echo "Building the project..."
npx tsc

BUILD_RESULT=$?
if [ $BUILD_RESULT -eq 0 ]; then
  echo "✅ Build successful!"
else
  echo "❌ Build failed. See errors above."
  exit 1
fi

# Check ESLint warnings and errors
echo ""
echo "Checking ESLint issues (warnings only)..."
npx eslint src/claude/claude-agent.ts src/chatgpt/chatgpt-agent.ts

echo ""
echo "All checks completed successfully!"