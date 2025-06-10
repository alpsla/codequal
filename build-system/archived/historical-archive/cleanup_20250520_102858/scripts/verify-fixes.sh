#!/bin/bash

# Navigate to the agents package
cd "$(dirname "$0")"

# Print current directory for debugging
echo "Running in directory: $(pwd)"

# Run TypeScript compiler to check for type errors
echo "Running TypeScript check..."
npx tsc --noEmit --pretty 2>&1

TSC_RESULT=$?
if [ $TSC_RESULT -eq 0 ]; then
  echo "✅ TypeScript check passed!"
else
  echo "❌ TypeScript check failed. See errors above."
  exit 1
fi

# Check for ESLint issues
echo ""
echo "Checking for ESLint issues..."
npx eslint src/claude/claude-agent.ts src/chatgpt/chatgpt-agent.ts --fix

# Run build
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

echo ""
echo "All checks completed successfully!"