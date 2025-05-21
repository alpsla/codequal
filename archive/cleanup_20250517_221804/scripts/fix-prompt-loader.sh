#!/bin/bash

# Script to fix missing prompt loader module

echo "Fixing prompt loader module..."

# Create directories
mkdir -p packages/agents/dist/prompts/templates
mkdir -p packages/agents/dist/prompts/components/base
mkdir -p packages/agents/dist/prompts/components/focus

# Copy source files to dist
cp -r packages/agents/src/prompts/templates/* packages/agents/dist/prompts/templates/ 2>/dev/null || true
cp -r packages/agents/src/prompts/components/* packages/agents/dist/prompts/components/ 2>/dev/null || true

# Compile the prompt-loader.ts file
echo "Compiling prompt-loader.ts..."
cd packages/agents
npx tsc src/prompts/prompt-loader.ts --outDir dist/prompts --esModuleInterop --target ES2020 --module CommonJS
cd ../..

echo "✅ Prompt loader module fixed successfully!"
