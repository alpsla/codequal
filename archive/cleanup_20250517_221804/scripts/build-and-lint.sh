#!/bin/bash

# Navigate to the agents package
cd "$(dirname "$0")"

# Print current directory for debugging
echo "Running in directory: $(pwd)"

# Run TypeScript compiler with skipLibCheck
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

# Run ESLint on all TypeScript files
echo ""
echo "Running ESLint on all TypeScript files..."
npx eslint "src/**/*.ts"

ESLINT_RESULT=$?
if [ $ESLINT_RESULT -eq 0 ]; then
  echo "✅ ESLint check passed with no errors!"
else
  echo ""
  echo "❌ ESLint check found issues."
  echo ""
  echo "Do you want to attempt auto-fixing ESLint issues? (y/n)"
  read answer
  
  if [ "$answer" == "y" ] || [ "$answer" == "Y" ]; then
    echo "Running ESLint with auto-fix..."
    npx eslint "src/**/*.ts" --fix
    
    echo ""
    echo "Re-running ESLint to check results..."
    npx eslint "src/**/*.ts"
  fi
fi

echo ""
echo "Build and lint process completed."
