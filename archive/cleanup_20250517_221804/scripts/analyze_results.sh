#!/bin/bash
# DeepWiki Analysis Performance Evaluation Script
# This script analyzes the results of the DeepWiki repository analysis

if [ -z "$1" ]; then
  echo "Usage: ./analyze_results.sh <results_directory>"
  echo "Example: ./analyze_results.sh /Users/alpinro/Code Prjects/codequal/packages/testing/results/deepwiki_analysis/20250517_120000"
  exit 1
fi

RESULTS_DIR="$1"

if [ ! -d "$RESULTS_DIR" ]; then
  echo "Error: Directory $RESULTS_DIR does not exist"
  exit 1
fi

echo "Analyzing results in: $RESULTS_DIR"
echo "=================================="

# Create performance analysis report
REPORT_FILE="${RESULTS_DIR}/performance_analysis.md"

cat > "$REPORT_FILE" << EOF
# DeepWiki Repository Analysis Performance Report

This report provides performance metrics and quality assessment for the DeepWiki analysis using openai/gpt-4.1.

## Performance Metrics

| Repository | Size Category | File Size | Analysis Time | Token Count (est.) |
|------------|---------------|-----------|---------------|-------------------|
EOF

# Function to estimate token count based on file size (rough approximation)
estimate_tokens() {
  local file_size=$1
  # Rough estimate: 1KB ≈ 200 tokens for JSON content
  echo $(( file_size / 5 ))
}

# Process each JSON file
for json_file in "$RESULTS_DIR"/*.json; do
  if [ -f "$json_file" ]; then
    filename=$(basename "$json_file")
    
    # Extract repository and size category from filename
    repo_name=$(echo "$filename" | sed -E 's/^(small|medium|large)_(.*)\.json$/\2/')
    size_category=$(echo "$filename" | sed -E 's/^(small|medium|large)_(.*)\.json$/\1/')
    
    # Get file size in KB
    file_size=$(du -k "$json_file" | cut -f1)
    
    # Estimate token count
    token_count=$(estimate_tokens "$file_size")
    
    # Extract analysis time if available (we'd need to modify the original script to store this)
    analysis_time="N/A"
    
    # Add to report
    echo "| $repo_name | $size_category | ${file_size}KB | $analysis_time | ~$token_count |" >> "$REPORT_FILE"
  fi
done

# Add quality assessment section
cat >> "$REPORT_FILE" << EOF

## Quality Assessment

### Small Repositories
- **fastify/fastify-cli**: 
- **sveltejs/svelte-hmr**: 
- **pallets/flask**: 

### Medium Repositories
- **nestjs/nest**: 
- **django/django**: 
- **gin-gonic/gin**: 

### Large Repositories
- **microsoft/TypeScript**: 
- **facebook/react**: 

## Analysis Completeness

| Repository | Complete Analysis | Truncation Issues | Quality Rating (1-5) |
|------------|------------------|-------------------|----------------------|
| fastify/fastify-cli | | | |
| sveltejs/svelte-hmr | | | |
| pallets/flask | | | |
| nestjs/nest | | | |
| django/django | | | |
| gin-gonic/gin | | | |
| microsoft/TypeScript | | | |
| facebook/react | | | |

## Recommendations

- 
- 
- 

EOF

echo "Performance analysis report created: $REPORT_FILE"
echo "Please manually fill in the quality assessment details after reviewing the results."
