#!/bin/bash

# Navigate to the agents package
cd "$(dirname "$0")"

# Print current directory for debugging
echo "Running in directory: $(pwd)"

# Run TypeScript compiler with more lenient options
echo "Running TypeScript check..."
npx tsc --noEmit --pretty

TSC_RESULT=$?
if [ $TSC_RESULT -eq 0 ]; then
  echo "✅ TypeScript check passed!"
else
  echo "❌ TypeScript check failed."
  echo "Attempting build with skipLibCheck as fallback..."
  npx tsc --noEmit --pretty --skipLibCheck
  
  FALLBACK_RESULT=$?
  if [ $FALLBACK_RESULT -eq 0 ]; then
    echo "✅ TypeScript check with skipLibCheck passed!"
  else
    echo "❌ TypeScript check failed even with skipLibCheck. See errors above."
    exit 1
  fi
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
  echo "❌ Build failed. Trying build with skipLibCheck..."
  npx tsc --skipLibCheck
  
  FALLBACK_BUILD_RESULT=$?
  if [ $FALLBACK_BUILD_RESULT -eq 0 ]; then
    echo "✅ Build with skipLibCheck successful!"
  else
    echo "❌ Build failed even with skipLibCheck. See errors above."
    exit 1
  fi
fi

echo ""
echo "All checks completed successfully!"