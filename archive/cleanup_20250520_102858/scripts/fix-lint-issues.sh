#!/bin/bash

# Navigate to the agents package
cd "$(dirname "$0")/.."

# Run build with typescript
echo "Building with TypeScript..."
npx tsc --noEmit

# Check for ESLint issues
echo ""
echo "Checking for ESLint issues..."
npx eslint src/claude/claude-agent.ts src/chatgpt/chatgpt-agent.ts --fix

echo ""
echo "All checks complete!"
