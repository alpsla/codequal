#!/bin/bash

# Navigate to the agents package
cd "$(dirname "$0")"

# Run tsc directly
echo "Building agents package..."
npx tsc

echo ""
if [ $? -eq 0 ]; then
  echo "✅ Build successful!"
else
  echo "❌ Build failed. See errors above."
fi
