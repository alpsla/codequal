#!/bin/bash

# Navigate to the agents package directory
cd "$(dirname "$0")"

# Run TypeScript compiler to check for type errors
echo "Running TypeScript check..."
npx tsc --noEmit

if [ $? -eq 0 ]; then
  echo "✅ TypeScript check passed!"
else
  echo "❌ TypeScript check failed. See errors above."
  exit 1
fi

# Run build
echo ""
echo "Building the project..."
npx tsc

if [ $? -eq 0 ]; then
  echo "✅ Build successful!"
else
  echo "❌ Build failed. See errors above."
  exit 1
fi

echo ""
echo "All done! You can now install the ESLint dependencies with:"
echo "npm install eslint-config-prettier eslint-plugin-prettier prettier"