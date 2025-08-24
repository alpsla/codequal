#!/bin/bash

# Script to view DeepWiki analysis metrics

echo "📊 DeepWiki Analysis Metrics Viewer"
echo "===================================="
echo ""

METRICS_FILE="/tmp/codequal-metrics/analysis-metrics.jsonl"

if [ ! -f "$METRICS_FILE" ]; then
    echo "❌ No metrics file found at: $METRICS_FILE"
    echo "   Run some analyses first to generate metrics."
    exit 1
fi

echo "📁 Metrics file: $METRICS_FILE"
echo "📏 File size: $(du -h $METRICS_FILE | cut -f1)"
echo "📈 Total records: $(wc -l < $METRICS_FILE)"
echo ""

# Show last 5 analyses
echo "Recent Analyses (last 5):"
echo "-------------------------"
tail -5 "$METRICS_FILE" | while read line; do
    repo=$(echo $line | jq -r '.repositoryUrl' | rev | cut -d'/' -f1-2 | rev)
    iterations=$(echo $line | jq -r '.iterations')
    duration=$(echo $line | jq -r '.duration')
    success=$(echo $line | jq -r '.success')
    issues=$(echo $line | jq -r '.issuesFound')
    timestamp=$(echo $line | jq -r '.timestamp')
    
    if [ "$success" = "true" ]; then
        status="✅"
    else
        status="❌"
    fi
    
    duration_s=$(echo "scale=1; $duration / 1000" | bc)
    echo "$status $repo: $iterations iterations, ${duration_s}s, $issues issues"
done

echo ""
echo "Iteration Statistics:"
echo "--------------------"

# Calculate iteration statistics
iterations=$(cat "$METRICS_FILE" | jq -r 'select(.success == true) | .iterations')
if [ ! -z "$iterations" ]; then
    avg=$(echo "$iterations" | awk '{sum+=$1} END {printf "%.2f", sum/NR}')
    min=$(echo "$iterations" | sort -n | head -1)
    max=$(echo "$iterations" | sort -n | tail -1)
    
    echo "Average: $avg iterations"
    echo "Min: $min iterations"
    echo "Max: $max iterations"
    
    # Show distribution
    echo ""
    echo "Distribution:"
    echo "$iterations" | sort -n | uniq -c | while read count iter; do
        pct=$(echo "scale=1; $count * 100 / $(echo "$iterations" | wc -l)" | bc)
        bars=$(printf '█%.0s' $(seq 1 $(echo "$count * 30 / $(echo "$iterations" | wc -l)" | bc)))
        printf "%d iterations: %s %d (%.1f%%)\n" "$iter" "$bars" "$count" "$pct"
    done
else
    echo "No successful analyses found."
fi

echo ""
echo "💡 Tips:"
echo "  - Run 'npx ts-node review-metrics.ts' for detailed analysis"
echo "  - Open 'metrics-dashboard.html' in browser for visual dashboard"
echo "  - Metrics are persisted in: $METRICS_FILE"