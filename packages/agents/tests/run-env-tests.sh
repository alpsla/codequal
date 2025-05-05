#!/bin/bash

# Navigate to the agents package
cd "$(dirname "$0")/.."

# Load environment variables from .env.local
echo "Loading environment variables from .env.local..."
eval $(grep -v '^#' .env.local | sed 's/^/export /')

# Show loaded variables (masking the values)
echo "Loaded API keys:"
if [ -n "$ANTHROPIC_API_KEY" ]; then
  echo "- ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:0:4}...${ANTHROPIC_API_KEY:(-4)}"
else
  echo "⚠️ ANTHROPIC_API_KEY not found in .env.local"
fi

if [ -n "$OPENAI_API_KEY" ]; then
  echo "- OPENAI_API_KEY: ${OPENAI_API_KEY:0:4}...${OPENAI_API_KEY:(-4)}"
else
  echo "⚠️ OPENAI_API_KEY not found in .env.local"
fi

# Build all packages
echo "Building packages..."
cd ../../
npm run build

# Run the template checks and creation
echo "Checking and creating templates..."
cd packages/agents
ts-node tests/create-templates.ts
ts-node tests/templates-check.ts

# Run the integration test
echo "Running integration test..."
ts-node tests/manual-integration-test.ts
