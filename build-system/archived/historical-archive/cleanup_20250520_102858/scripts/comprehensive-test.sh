#!/bin/bash

# Comprehensive DeepWiki Model Comparison Test
# This script runs a detailed test of the three main models (OpenAI, Google, Anthropic)
# using the same repository and analysis tasks for direct comparison

echo "DeepWiki Comprehensive Model Comparison"
echo "======================================"
echo ""

# Configuration
TEST_REPO="pallets/click"
REPO_URL="https://github.com/pallets/click"
OUTPUT_DIR="/Users/alpinro/Code Prjects/codequal/packages/core/src/deepwiki/comprehensive-test-results"
API_URL="http://localhost:8001"
TIMESTAMP=$(date +"%Y-%m-%d-%H-%M-%S")

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Log file setup
LOG_FILE="$OUTPUT_DIR/comprehensive-test-$TIMESTAMP.log"
echo "DeepWiki Comprehensive Model Comparison - $(date)" > "$LOG_FILE"
echo "Repository: $TEST_REPO" >> "$LOG_FILE"
echo "API URL: $API_URL" >> "$LOG_FILE"
echo "----------------------------------------" >> "$LOG_FILE"

# Function to run a test and record results
run_test() {
  local provider=$1
  local model=$2
  local task=$3
  local query=$4
  local output_file="$OUTPUT_DIR/${provider}-${model//\//-}-${task}-$TIMESTAMP.json"
  
  echo ""
  echo "Testing $provider/$model on task: $task"
  echo "Query: $query"
  echo "Output: $output_file"
  echo ""
  
  echo "Testing $provider/$model on task: $task" >> "$LOG_FILE"
  echo "Query: $query" >> "$LOG_FILE"
  echo "Output: $output_file" >> "$LOG_FILE"
  
  START_TIME=$(date +%s.%N)
  
  # Use stream endpoint for chat completions
  curl -s -X POST "$API_URL/chat/completions/stream" \
    -H "Content-Type: application/json" \
    -d "{
      \"repo_url\": \"$REPO_URL\",
      \"messages\": [
        {
          \"role\": \"user\",
          \"content\": \"$query\"
        }
      ],
      \"provider\": \"$provider\",
      \"model\": \"$model\"
    }" > "$output_file"
  
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
  echo "$provider,$model,$task,$DURATION,$SIZE,$output_file" >> "$OUTPUT_DIR/summary-$TIMESTAMP.csv"
}

# Create summary CSV header
echo "provider,model,task,duration_seconds,size_bytes,output_file" > "$OUTPUT_DIR/summary-$TIMESTAMP.csv"

# Define test models
MODELS=(
  "openai,gpt-4o"
  "google,gemini-2.5-pro-preview-05-06"
  "anthropic,claude-3-7-sonnet"
)

# Define test tasks and queries
TASKS=(
  "architecture,What is the overall architecture of this repository? Please explain the main components, their relationships, and how they work together. Include key design decisions, patterns, and code organization."
  "patterns,What design patterns are used in this repository? Provide specific examples of each pattern with code snippets and explain how they're implemented. Also mention any anti-patterns or areas for improvement."
  "code-quality,Analyze the code quality of this repository. Evaluate factors like readability, maintainability, test coverage, documentation, and adherence to best practices. Provide specific examples of good practices and areas that could be improved."
  "dependency-analysis,Analyze the dependencies of this repository. What external libraries are used, how are they managed, and what role do they play? Evaluate the dependency management approach and suggest any improvements."
  "security,Analyze the security aspects of this repository. Identify any security features, potential vulnerabilities, and best practices that are followed or missing. Provide specific examples and recommendations."
)

# Run tests for each model and task
echo "Starting comprehensive tests across all models and tasks..."
echo "This will take some time to complete."

for model_info in "${MODELS[@]}"; do
  IFS=',' read -r provider model <<< "$model_info"
  
  for task_info in "${TASKS[@]}"; do
    IFS=',' read -r task query <<< "$task_info"
    
    run_test "$provider" "$model" "$task" "$query"
  done
done

# Generate a basic HTML report
HTML_REPORT="$OUTPUT_DIR/report-$TIMESTAMP.html"

cat > "$HTML_REPORT" << EOL
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DeepWiki Model Comparison Report</title>
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
    .model-tab {
      cursor: pointer;
      padding: 10px 20px;
      background-color: #f1f1f1;
      display: inline-block;
      border-radius: 4px 4px 0 0;
      border: 1px solid #ddd;
      border-bottom: none;
    }
    .model-tab.active {
      background-color: white;
      border-bottom: 1px solid white;
    }
    .model-content {
      display: none;
      padding: 20px;
      border: 1px solid #ddd;
      border-radius: 0 0 4px 4px;
    }
    .model-content.active {
      display: block;
    }
    .metric-highlight {
      font-weight: bold;
      color: #1a73e8;
    }
    .summary-table th {
      text-align: center;
    }
  </style>
</head>
<body>
  <h1>DeepWiki Model Comparison Report</h1>
  <p>Repository: <strong>${TEST_REPO}</strong></p>
  <p>Generated on: <strong>$(date)</strong></p>
  
  <h2>Performance Summary</h2>
  <table class="summary-table">
    <tr>
      <th>Provider</th>
      <th>Model</th>
      <th>Average Response Time</th>
      <th>Average Response Size</th>
      <th>Tasks Completed</th>
    </tr>
EOL

# Process CSV to generate summary statistics
echo "Generating summary report..."

# Add provider summaries to HTML
for model_info in "${MODELS[@]}"; do
  IFS=',' read -r provider model <<< "$model_info"
  
  # Calculate average time and size
  if [ -f "$OUTPUT_DIR/summary-$TIMESTAMP.csv" ]; then
    AVG_TIME=$(awk -F, -v p="$provider" -v m="$model" '
      BEGIN {total=0; count=0}
      $1 == p && $2 == m {total+=$4; count++}
      END {if(count>0) printf "%.2f", total/count; else print "N/A"}
    ' "$OUTPUT_DIR/summary-$TIMESTAMP.csv")
    
    AVG_SIZE=$(awk -F, -v p="$provider" -v m="$model" '
      BEGIN {total=0; count=0}
      $1 == p && $2 == m {total+=$5; count++}
      END {if(count>0) printf "%.0f", total/count; else print "N/A"}
    ' "$OUTPUT_DIR/summary-$TIMESTAMP.csv")
    
    TASKS_COMPLETED=$(awk -F, -v p="$provider" -v m="$model" '
      BEGIN {count=0}
      $1 == p && $2 == m && $5 > 100 {count++}
      END {print count}
    ' "$OUTPUT_DIR/summary-$TIMESTAMP.csv")
  else
    AVG_TIME="N/A"
    AVG_SIZE="N/A"
    TASKS_COMPLETED="N/A"
  fi
  
  # Add to HTML
  cat >> "$HTML_REPORT" << EOL
    <tr>
      <td>${provider}</td>
      <td>${model}</td>
      <td>${AVG_TIME} seconds</td>
      <td>${AVG_SIZE} bytes</td>
      <td>${TASKS_COMPLETED} / 5</td>
    </tr>
EOL
done

# Continue HTML report
cat >> "$HTML_REPORT" << EOL
  </table>
  
  <h2>Task Analysis</h2>
EOL

# Add detailed task analysis
for task_info in "${TASKS[@]}"; do
  IFS=',' read -r task query <<< "$task_info"
  task_title=$(echo "$task" | tr '-' ' ' | sed -e 's/\b\(.\)/\u\1/g')
  
  cat >> "$HTML_REPORT" << EOL
  <div class="task-section">
    <h3>${task_title} Analysis</h3>
    <p><strong>Query:</strong> ${query}</p>
    
    <div class="model-tabs">
EOL
  
  # Add tabs
  for model_info in "${MODELS[@]}"; do
    IFS=',' read -r provider model <<< "$model_info"
    model_display="${provider}/${model}"
    active=""
    if [ "$provider" == "openai" ]; then
      active="active"
    fi
    
    cat >> "$HTML_REPORT" << EOL
      <div class="model-tab ${active}" onclick="showModel('${provider}-${task}')">${model_display}</div>
EOL
  done
  
  cat >> "$HTML_REPORT" << EOL
    </div>
    
EOL
  
  # Add content tabs
  for model_info in "${MODELS[@]}"; do
    IFS=',' read -r provider model <<< "$model_info"
    active=""
    if [ "$provider" == "openai" ]; then
      active="active"
    fi
    
    model_file=$(find "$OUTPUT_DIR" -name "${provider}-${model//\//-}-${task}-$TIMESTAMP.json")
    if [ -f "$model_file" ]; then
      response_content=$(cat "$model_file" | sed 's/</\&lt;/g' | sed 's/>/\&gt;/g')
      response_size=$(wc -c < "$model_file" | xargs)
      
      # Extract metrics for this model/task from the CSV
      if [ -f "$OUTPUT_DIR/summary-$TIMESTAMP.csv" ]; then
        TASK_TIME=$(awk -F, -v p="$provider" -v m="$model" -v t="$task" '
          $1 == p && $2 == m && $3 == t {print $4}
        ' "$OUTPUT_DIR/summary-$TIMESTAMP.csv")
      else
        TASK_TIME="N/A"
      fi
      
      cat >> "$HTML_REPORT" << EOL
    <div id="${provider}-${task}" class="model-content ${active}">
      <p><strong>Provider:</strong> ${provider}</p>
      <p><strong>Model:</strong> ${model}</p>
      <p><strong>Response Time:</strong> <span class="metric-highlight">${TASK_TIME} seconds</span></p>
      <p><strong>Response Size:</strong> <span class="metric-highlight">${response_size} bytes</span></p>
      <div class="response">${response_content}</div>
    </div>
EOL
    else
      cat >> "$HTML_REPORT" << EOL
    <div id="${provider}-${task}" class="model-content ${active}">
      <p>No results available for this model/task combination.</p>
    </div>
EOL
    fi
  done
  
  cat >> "$HTML_REPORT" << EOL
  </div>
EOL
done

# Finish HTML
cat >> "$HTML_REPORT" << EOL
  <script>
    function showModel(modelId) {
      // Hide all content
      var contents = document.getElementsByClassName('model-content');
      for (var i = 0; i < contents.length; i++) {
        contents[i].classList.remove('active');
      }
      
      // Show selected content
      document.getElementById(modelId).classList.add('active');
      
      // Update tabs
      var tabs = document.getElementsByClassName('model-tab');
      for (var i = 0; i < tabs.length; i++) {
        tabs[i].classList.remove('active');
      }
      
      // Find and activate the clicked tab
      const tabToActivate = Array.from(event.target.parentNode.children).find(tab => 
        tab.getAttribute('onclick').includes(modelId)
      );
      if (tabToActivate) {
        tabToActivate.classList.add('active');
      }
    }
  </script>
</body>
</html>
EOL

echo ""
echo "Testing completed!"
echo "Summary CSV: $OUTPUT_DIR/summary-$TIMESTAMP.csv"
echo "Log file: $LOG_FILE"
echo "HTML Report: $HTML_REPORT"
echo ""
echo "Open the HTML report to view detailed comparisons between models."
