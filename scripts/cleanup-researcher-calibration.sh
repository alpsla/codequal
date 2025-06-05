#!/bin/bash

# Cleanup script for researcher calibration files
# Removes all exploratory scripts and keeps only the final implementation

echo "🧹 Cleaning up researcher calibration files..."

# Navigate to calibration directory
cd /Users/alpinro/Code\ Prjects/codequal/scripts/calibration

# Remove all exploratory calibration scripts
echo "Removing exploratory calibration scripts..."
rm -f claude-*.js
rm -f gemini-*.js
rm -f test-*.js
rm -f *-calibration.js
rm -f *-test.js
rm -f list-*.js
rm -f run*.sh
rm -f single-*.js
rm -f two-part-*.js
rm -f system-*.js
rm -f hybrid-*.js
rm -f improved-*.js
rm -f optimized-*.js
rm -f prompt-*.js
rm -f enhanced-*.js
rm -f current-*.js
rm -f fixed-*.js

# Remove result directories except researcher-meta
echo "Removing result directories..."
rm -rf calibration-results
rm -rf enhanced-results
rm -rf gemini-25-results
rm -rf gemini-25-fixed-results
rm -rf latest-models-results
rm -rf researcher-self-selection

# Clean up researcher-meta directory
echo "Cleaning up researcher-meta directory..."
cd researcher-meta
rm -f debug-*.js
rm -f find-best-*.js
rm -f interactive-*.js
rm -f self-evaluation-*.js
rm -f test-*.js
rm -f dynamic-*.js
rm -f researcher-scoring-discovery.js
rm -f *.json

# Keep only the essential files
echo "Keeping only essential files..."
# The final implementation is now in packages/agents/src/researcher/final/

cd ..
# Remove researcher-meta if empty
if [ -z "$(ls -A researcher-meta)" ]; then
   rm -rf researcher-meta
fi

echo "✅ Cleanup complete!"
echo ""
echo "📁 Final implementation location:"
echo "   /Users/alpinro/Code Prjects/codequal/packages/agents/src/researcher/final/"
echo ""
echo "📄 Files preserved:"
echo "   - researcher-model-selector.ts (core scoring logic)"
echo "   - researcher-discovery-service.ts (discovery service)"
echo "   - compare-researchers.js (comparison tool)"
echo "   - README.md (documentation)"
