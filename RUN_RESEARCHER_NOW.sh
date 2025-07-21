#!/bin/bash
# Quick script to run the researcher immediately

echo "=== STARTING RESEARCHER EXECUTION ==="
echo "Time: $(date)"
echo ""

# Check if OPENROUTER_API_KEY is set
if [ -z "$OPENROUTER_API_KEY" ]; then
    echo "❌ ERROR: OPENROUTER_API_KEY not set"
    echo ""
    echo "Please run:"
    echo "export OPENROUTER_API_KEY='your-api-key-here'"
    echo ""
    echo "Or run with the key inline:"
    echo "OPENROUTER_API_KEY='your-key' ./RUN_RESEARCHER_NOW.sh"
    exit 1
fi

echo "✅ OPENROUTER_API_KEY is set"
echo ""
echo "Starting researcher to evaluate and update all 800 model configurations..."
echo "This will:"
echo "- Fetch latest models from OpenRouter"
echo "- Evaluate them with dynamic scoring"
echo "- Update configurations for all role/language/size combinations"
echo "- Store results in Vector DB"
echo ""

# Change to project directory
cd "/Users/alpinro/Code Prjects/codequal"

# Run the scheduled researcher
npx tsx packages/agents/src/researcher/scheduled-research-runner.ts

echo ""
echo "=== RESEARCHER EXECUTION COMPLETE ==="