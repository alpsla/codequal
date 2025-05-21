#!/bin/bash

# Navigate to the agents package
cd "$(dirname "$0")"

# Print current directory and date
echo "Running in directory: $(pwd)"
echo "Date: $(date)"
echo ""

# Auto-fix all ESLint issues
echo "Fixing ESLint issues..."
npx eslint "src/**/*.ts" --fix

ESLINT_FIX_RESULT=$?
if [ $ESLINT_FIX_RESULT -eq 0 ]; then
  echo "✅ ESLint auto-fix successful!"
else
  echo "⚠️ Some ESLint issues couldn't be automatically fixed."
  echo "Manual intervention may be required for remaining issues."
fi

# Check TypeScript compilation
echo ""
echo "Running TypeScript check..."
npx tsc --noEmit --skipLibCheck

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
npx tsc --skipLibCheck

BUILD_RESULT=$?
if [ $BUILD_RESULT -eq 0 ]; then
  echo "✅ Build successful!"
else
  echo "❌ Build failed. See errors above."
  exit 1
fi

# Run final ESLint check to verify results
echo ""
echo "Running final ESLint check..."
npx eslint "src/**/*.ts" --format stylish

FINAL_ESLINT_RESULT=$?
if [ $FINAL_ESLINT_RESULT -eq 0 ]; then
  echo "✅ Final ESLint check passed with no issues!"
else
  echo "⚠️ Some ESLint issues remain. These might need manual fixing:"
  npx eslint "src/**/*.ts" --format stylish
fi

echo ""
echo "✅ Build and clean process completed successfully!"
echo "   Any remaining warnings are documented above."