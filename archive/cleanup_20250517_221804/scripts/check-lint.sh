#!/bin/bash

echo "Checking ESLint issues..."
npx eslint src/claude/claude-agent.ts src/chatgpt/chatgpt-agent.ts

echo ""
echo "Running TypeScript compiler in noEmit mode to check for type errors..."
npx tsc --noEmit

echo ""
echo "Running tests to make sure all imports resolve correctly..."
npx jest --passWithNoTests