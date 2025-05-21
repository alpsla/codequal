#!/bin/bash

# Check if API keys are set
if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "⚠️  ANTHROPIC_API_KEY is not set. Claude agent test will fail."
  echo "Please export ANTHROPIC_API_KEY='your-api-key'"
fi

if [ -z "$OPENAI_API_KEY" ]; then
  echo "⚠️  OPENAI_API_KEY is not set. OpenAI agent test will fail."
  echo "Please export OPENAI_API_KEY='your-api-key'"
fi

if [ -z "$DEEPSEEK_API_KEY" ]; then
  echo "⚠️  DEEPSEEK_API_KEY is not set. DeepSeek agent test will fail."
  echo "Please export DEEPSEEK_API_KEY='your-api-key'"
fi

if [ -z "$GEMINI_API_KEY" ]; then
  echo "⚠️  GEMINI_API_KEY is not set. Gemini agent test will fail."
  echo "Please export GEMINI_API_KEY='your-api-key'"
fi

# Install ts-node if not already installed
if ! command -v ts-node &> /dev/null; then
  echo "Installing ts-node..."
  npm install -g ts-node typescript
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
