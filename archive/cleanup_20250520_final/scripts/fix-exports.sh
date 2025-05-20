#!/bin/bash

# Script to fix exports configuration in core package

echo "Fixing exports configuration in core package..."

# Update package.json in core package
cat > packages/core/package.json << 'EOF'
{
  "name": "@codequal/core",
  "version": "0.1.0",
  "type": "commonjs",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js",
    "./utils": "./dist/utils/index.js",
    "./types/*": "./dist/types/*.js",
    "./config/models/model-versions": "./dist/config/models/model-versions.js",
    "./config/agent-registry": "./dist/config/agent-registry.js",
    "./config/*": "./dist/config/*.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc -w",
    "lint": "eslint src",
    "test": "jest"
  },
  "dependencies": {},
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@types/node": "^18.15.0",
    "@typescript-eslint/eslint-plugin": "^5.54.1",
    "@typescript-eslint/parser": "^5.54.1",
    "eslint": "^8.36.0",
    "jest": "^29.5.0",
    "typescript": "^5.0.0"
  }
}
EOF

echo "✅ Exports configuration fixed!"

# Now run the complete-fix script if it exists
if [ -f "./complete-fix.sh" ]; then
  echo "Rebuilding the project..."
  ./complete-fix.sh
else
  echo "Rebuilding core package manually..."
  # Clean up dist directory
  rm -rf packages/core/dist
  
  # Create necessary directories
  mkdir -p packages/core/dist/config/models
  mkdir -p packages/core/dist/types
  mkdir -p packages/core/dist/utils
  
  # Build core package
  cd packages/core
  npm run build
  cd ../..
fi

echo "✅ Fix completed successfully! You can now run the real agent test."
