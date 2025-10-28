#!/bin/bash

echo "=== AI FIX SUGGESTIONS ANALYSIS ==="
echo ""

# Count total "How to Fix" sections
total_fixes=$(grep -c "#### 🔧 How to Fix" v9-quarkus-FINAL-AI-ENRICHED.md)
echo "Total Fix Sections: $total_fixes"

# Count failures (AI-generated fix not available)
failures=$(grep -c "AI-generated fix not available" v9-quarkus-FINAL-AI-ENRICHED.md)
echo "Complete Failures: $failures"

# Count AI thinking leaks
thinking_leaks=$(grep -c "First, I need to\|First, what's" v9-quarkus-FINAL-AI-ENRICHED.md)
echo "AI Thinking Leaks: $thinking_leaks"

# Count raw JSON responses
json_responses=$(grep -c '"fix":' v9-quarkus-FINAL-AI-ENRICHED.md)
echo "Raw JSON Responses: $json_responses"

# Calculate percentages
if [ $total_fixes -gt 0 ]; then
    failure_pct=$((failures * 100 / total_fixes))
    thinking_pct=$((thinking_leaks * 100 / total_fixes))
    json_pct=$((json_responses * 100 / total_fixes))
    
    echo ""
    echo "=== PERCENTAGE BREAKDOWN ==="
    echo "Complete Failures: ${failure_pct}%"
    echo "AI Thinking Leaks: ${thinking_pct}%"
    echo "Raw JSON Responses: ${json_pct}%"
    
    # Calculate success (not perfect, but gives an idea)
    problematic=$((failures + thinking_leaks + json_responses))
    success=$((total_fixes - problematic))
    success_pct=$((success * 100 / total_fixes))
    echo "Clean AI Responses: ${success_pct}%"
fi

echo ""
echo "=== EXTRACTING EXAMPLES ==="

# Extract all groups to see what was enriched
echo ""
echo "Groups enriched (from log):"
grep "AI Enrichment.*✅" ~/../../tmp/test-bug-76-ai-enrichment-final.log 2>/dev/null | head -10 || echo "Log not accessible, checking report..."

