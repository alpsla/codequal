#!/bin/bash

# OpenRouter Test for Claude Access
# This script tests using OpenRouter to access Claude models when direct Anthropic API access is unavailable

echo "DeepWiki OpenRouter Test for Claude"
echo "=================================="
echo ""

# Load environment variables from .env file if it exists
if [ -f "/Users/alpinro/Code Prjects/codequal/.env" ]; then
  echo "Loading environment variables from .env file..."
  export $(grep -v '^#' "/Users/alpinro/Code Prjects/codequal/.env" | xargs)
fi

# Configuration
OUTPUT_DIR="/Users/alpinro/Code Prjects/codequal/packages/core/src/deepwiki/openrouter-test-results"
API_URL="http://localhost:8001"
TIMESTAMP=$(date +"%Y-%m-%d-%H-%M-%S")
TEST_REPO="pallets/click"
REPO_URL="https://github.com/pallets/click"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Log file setup
LOG_FILE="$OUTPUT_DIR/openrouter-test-$TIMESTAMP.log"
echo "DeepWiki OpenRouter Test - $(date)" > "$LOG_FILE"
echo "Repository: $TEST_REPO" >> "$LOG_FILE"
echo "API URL: $API_URL" >> "$LOG_FILE"
echo "----------------------------------------" >> "$LOG_FILE"

# Check if OPENROUTER_API_KEY is set
if [ -z "$OPENROUTER_API_KEY" ]; then
  echo "Error: OPENROUTER_API_KEY environment variable is not set."
  echo "Please set it before running this script."
  echo "You mentioned you added it to .env, but shell scripts don't automatically load from .env."
  echo ""
  echo "Please try one of these options:"
  echo "1. Run directly with the key: OPENROUTER_API_KEY=your_key_here bash $0"
  echo "2. Export the key first: export OPENROUTER_API_KEY=your_key_here"
  echo "3. Check the .env file location and format"
  echo ""
  echo "Current environment variables:"
  env | grep -i key || echo "No API keys found in environment"
  exit 1
fi

echo "OpenRouter API key detected: ${OPENROUTER_API_KEY:0:4}..." 
echo "This will test direct Claude access via OpenRouter."
echo ""

# Function to run a test
run_test() {
  local provider=$1
  local model=$2
  local task=$3
  local query=$4
  local output_file="$OUTPUT_DIR/${provider}-${model//\\//-}-${task}-$TIMESTAMP.json"
  
  echo ""
  echo "Testing $provider/$model on task: $task"
  echo "Query: $query"
  echo "Output: $output_file"
  echo ""
  
  echo "Testing $provider/$model on task: $task" >> "$LOG_FILE"
  echo "Query: $query" >> "$LOG_FILE"
  echo "Output: $output_file" >> "$LOG_FILE"
  
  START_TIME=$(date +%s.%N)
  
  # Create a temporary file for the request body
  TEMP_FILE=$(mktemp)
  cat > "$TEMP_FILE" << EOL
{
  "repo_url": "$REPO_URL",
  "messages": [
    {
      "role": "user",
      "content": "$query"
    }
  ],
  "provider": "$provider",
  "model": "$model"
}
EOL
  
  # Use stream endpoint for chat completions with the API key
  curl -s -X POST "$API_URL/chat/completions/stream" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $OPENROUTER_API_KEY" \
    -d @"$TEMP_FILE" > "$output_file"
  
  # Remove temporary file
  rm "$TEMP_FILE"
  
  END_TIME=$(date +%s.%N)
  DURATION=$(echo "$END_TIME - $START_TIME" | bc)
  SIZE=$(wc -c < "$output_file" | xargs)
  
  echo "Completed in $DURATION seconds"
  echo "Response size: $SIZE bytes"
  echo ""
  
  echo "Completed in $DURATION seconds" >> "$LOG_FILE"
  echo "Response size: $SIZE bytes" >> "$LOG_FILE"
  echo "----------------------------------------" >> "$LOG_FILE"
  
  # Add to summary file
  echo "$provider,$model,$task,$DURATION,$SIZE,$output_file" >> "$OUTPUT_DIR/openrouter-summary-$TIMESTAMP.csv"
}

# Create summary CSV header
echo "provider,model,task,duration_seconds,size_bytes,output_file" > "$OUTPUT_DIR/openrouter-summary-$TIMESTAMP.csv"

# Define test tasks and queries
TASKS=(
  "architecture,What is the overall architecture of this repository? Please explain the main components, their relationships, and how they work together."
  "patterns,What design patterns are used in this repository? Provide specific examples of each pattern and explain how they're implemented."
  "code-quality,Analyze the code quality of this repository. Evaluate factors like readability, maintainability, and adherence to best practices."
)

# Test OpenRouter with Claude models
echo "Testing OpenRouter with Claude models..."
for task_info in "${TASKS[@]}"; do
  IFS=',' read -r task query <<< "$task_info"
  
  # Test with Claude 3.7 Sonnet via OpenRouter
  run_test "openrouter" "anthropic/claude-3.7-sonnet" "$task" "$query"
done

# Generate a simple HTML report
HTML_REPORT="$OUTPUT_DIR/openrouter-report-$TIMESTAMP.html"

cat > "$HTML_REPORT" << EOL
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DeepWiki OpenRouter Test Results</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3 {
      color: #1a73e8;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      margin-bottom: 40px;
    }
    th, td {
      padding: 12px 15px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background-color: #f2f2f2;
      font-weight: bold;
    }
    tr:hover {
      background-color: #f5f5f5;
    }
    .task-section {
      margin-bottom: 40px;
      padding: 20px;
      background-color: #f8f9fa;
      border-radius: 8px;
    }
    .response {
      white-space: pre-wrap;
      background-color: #f8f9fa;
      border: 1px solid #ddd;
      padding: 15px;
      border-radius: 4px;
      overflow-x: auto;
      margin-top: 15px;
    }
  </style>
</head>
<body>
  <h1>DeepWiki OpenRouter Test Results</h1>
  <p>Repository: <strong>${TEST_REPO}</strong></p>
  <p>Generated on: <strong>$(date)</strong></p>
  
  <h2>Performance Summary</h2>
  <table>
    <tr>
      <th>Provider</th>
      <th>Model</th>
      <th>Average Response Time</th>
      <th>Average Response Size</th>
    </tr>
EOL

# Add provider summary to HTML
AVG_TIME=$(awk -F, '
  BEGIN {total=0; count=0}
  NR>1 {total+=$4; count++}
  END {if(count>0) printf "%.2f", total/count; else print "N/A"}
' "$OUTPUT_DIR/openrouter-summary-$TIMESTAMP.csv")

AVG_SIZE=$(awk -F, '
  BEGIN {total=0; count=0}
  NR>1 {total+=$5; count++}
  END {if(count>0) printf "%.0f", total/count; else print "N/A"}
' "$OUTPUT_DIR/openrouter-summary-$TIMESTAMP.csv")

# Add to HTML
cat >> "$HTML_REPORT" << EOL
    <tr>
      <td>OpenRouter</td>
      <td>anthropic/claude-3.7-sonnet</td>
      <td>${AVG_TIME} seconds</td>
      <td>${AVG_SIZE} bytes</td>
    </tr>
  </table>
  
  <h2>Task Results</h2>
EOL

# Add detailed task results
for task_info in "${TASKS[@]}"; do
  IFS=',' read -r task query <<< "$task_info"
  task_title=$(echo "$task" | tr '-' ' ' | sed -e 's/\b\(.\)/\u\1/g')
  
  cat >> "$HTML_REPORT" << EOL
  <div class="task-section">
    <h3>${task_title}</h3>
    <p><strong>Query:</strong> ${query}</p>
EOL
  
  # Find result file for this task
  result_file=$(ls "$OUTPUT_DIR"/openrouter-anthropic*-"$task"-"$TIMESTAMP".json 2>/dev/null)
  
  if [ -n "$result_file" ]; then
    # Get file info
    file_size=$(wc -c < "$result_file" | xargs)
    time_taken=$(awk -F, -v task="$task" '
      NR>1 && $3 == task {print $4}
    ' "$OUTPUT_DIR/openrouter-summary-$TIMESTAMP.csv")
    
    # Add file info to HTML
    cat >> "$HTML_REPORT" << EOL
    <p><strong>Response Time:</strong> ${time_taken} seconds</p>
    <p><strong>Response Size:</strong> ${file_size} bytes</p>
    
    <h4>Response:</h4>
    <div class="response">
EOL
    
    # Add response content (sanitized)
    cat "$result_file" | sed 's/</\&lt;/g' | sed 's/>/\&gt;/g' >> "$HTML_REPORT"
    
    # Close response div
    cat >> "$HTML_REPORT" << EOL
    </div>
EOL
  else
    # No result file found
    cat >> "$HTML_REPORT" << EOL
    <p>No results available for this task.</p>
EOL
  fi
  
  # Close task section div
  cat >> "$HTML_REPORT" << EOL
  </div>
EOL
done

# Close HTML
cat >> "$HTML_REPORT" << EOL
</body>
</html>
EOL

echo ""
echo "Testing completed!"
echo "Summary CSV: $OUTPUT_DIR/openrouter-summary-$TIMESTAMP.csv"
echo "Log file: $LOG_FILE"
echo "HTML Report: $HTML_REPORT"
echo ""
echo "Open the HTML report to view detailed results."
