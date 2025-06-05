#!/bin/bash

# Prompt Optimization Calibration Test Runner
# This script runs the prompt calibration with limited iterations

echo "🚀 Starting Prompt Optimization Calibration"
echo "============================================"

# Check if Google API key is set
if [ -z "$GOOGLE_API_KEY" ]; then
    echo "❌ Error: GOOGLE_API_KEY environment variable not set"
    echo "Please set your Google API key:"
    echo "export GOOGLE_API_KEY=your_api_key_here"
    exit 1
fi

echo "✅ Google API key found"

# Navigate to the project root
cd "$(dirname "$0")"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js not found"
    exit 1
fi

echo "✅ Node.js found"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Create results directory
mkdir -p scripts/calibration/prompt-optimization-results

echo "🔬 Running prompt optimization calibration..."
echo "   - Testing 2 prompt variants"
echo "   - Limited to 10 iterations maximum"
echo "   - Using Google Gemini models directly"
echo ""

# Run the calibration script
node scripts/calibration/prompt-optimization-calibration.js

# Check if calibration was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Calibration completed successfully!"
    echo ""
    echo "📊 Results saved to: scripts/calibration/prompt-optimization-results/"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Review the analysis files for recommendations"
    echo "   2. Compare token usage between variants"
    echo "   3. Select the most efficient prompt variant"
    echo "   4. Update the production prompt generators"
else
    echo ""
    echo "❌ Calibration failed!"
    echo "Check the logs above for error details"
    exit 1
fi