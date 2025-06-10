#!/bin/bash
# DeepWiki API Testing Script
# This script runs tests against the DeepWiki API to evaluate different providers and models

# Set working directory
RESULTS_DIR="/Users/alpinro/Code Prjects/codequal/docs/deepwiki-testing/results"
mkdir -p "$RESULTS_DIR"

# Create log file
LOG_FILE="$RESULTS_DIR/test_log.txt"
echo "DeepWiki API Testing Log - $(date)" > "$LOG_FILE"

# Test configuration
API_BASE="http://localhost:8001"

# Function to run a full wiki export test
run_wiki_export_test() {
  local test_id=$1
  local owner=$2
  local repo=$3
  local provider=$4
  local model=$5
  local description=$6

  echo "-----------------------------------------------------" >> "$LOG_FILE"
  echo "Running test: $test_id - $description" >> "$LOG_FILE"
  echo "Repository: $owner/$repo" >> "$LOG_FILE"
  echo "Provider: $provider, Model: $model" >> "$LOG_FILE"
  echo "Start time: $(date)" >> "$LOG_FILE"

  # Create test output directory
  mkdir -p "$RESULTS_DIR/$test_id"
  
  # Record start time
  START_TIME=$(date +%s)

  # Create request payload
  local payload=""
  if [ -z "$provider" ] || [ -z "$model" ]; then
    payload='{
      "owner": "'$owner'",
      "repo": "'$repo'",
      "repo_type": "github",
      "format": "json",
      "language": "en"
    }'
  else
    payload='{
      "owner": "'$owner'",
      "repo": "'$repo'",
      "repo_type": "github",
      "format": "json",
      "language": "en",
      "provider": "'$provider'",
      "model": "'$model'"
    }'
  fi

  # Save request payload
  echo "$payload" > "$RESULTS_DIR/$test_id/request.json"

  # Run the test
  HTTP_CODE=$(curl -s -o "$RESULTS_DIR/$test_id/response.json" -w "%{http_code}" \
    -X POST "$API_BASE/export/wiki" \
    -H "Content-Type: application/json" \
    -d "$payload")

  # Calculate elapsed time
  END_TIME=$(date +%s)
  ELAPSED=$((END_TIME - START_TIME))

  # Get response size
  RESPONSE_SIZE=$(wc -c < "$RESULTS_DIR/$test_id/response.json" | xargs)

  # Record results
  echo "HTTP Status: $HTTP_CODE" >> "$LOG_FILE"
  echo "Elapsed time: $ELAPSED seconds" >> "$LOG_FILE"
  echo "Response size: $RESPONSE_SIZE bytes" >> "$LOG_FILE"

  # Check if it looks like an error
  if [ "$HTTP_CODE" != "200" ] || [ "$RESPONSE_SIZE" -lt 1000 ]; then
    echo "WARNING: Possible error in response!" >> "$LOG_FILE"
    echo "Response content:" >> "$LOG_FILE"
    cat "$RESULTS_DIR/$test_id/response.json" >> "$LOG_FILE"
  fi

  echo "Completed at: $(date)" >> "$LOG_FILE"
  echo "" >> "$LOG_FILE"

  # Return results as a CSV line
  echo "$test_id,$owner/$repo,wiki_export,$provider,$model,$HTTP_CODE,$ELAPSED,$RESPONSE_SIZE"
}

# Function to run a targeted chat query test
run_chat_query_test() {
  local test_id=$1
  local repo_url=$2
  local query=$3
  local provider=$4
  local model=$5
  local description=$6

  echo "-----------------------------------------------------" >> "$LOG_FILE"
  echo "Running test: $test_id - $description" >> "$LOG_FILE"
  echo "Repository: $repo_url" >> "$LOG_FILE"
  echo "Query: $query" >> "$LOG_FILE"
  echo "Provider: $provider, Model: $model" >> "$LOG_FILE"
  echo "Start time: $(date)" >> "$LOG_FILE"

  # Create test output directory
  mkdir -p "$RESULTS_DIR/$test_id"
  
  # Record start time
  START_TIME=$(date +%s)

  # Create request payload
  local payload=""
  if [ -z "$provider" ] || [ -z "$model" ]; then
    payload='{
      "repo_url": "'$repo_url'",
      "messages": [
        {
          "role": "user",
          "content": "'$query'"
        }
      ]
    }'
  else
    payload='{
      "repo_url": "'$repo_url'",
      "messages": [
        {
          "role": "user",
          "content": "'$query'"
        }
      ],
      "provider": "'$provider'",
      "model": "'$model'"
    }'
  fi

  # Save request payload
  echo "$payload" > "$RESULTS_DIR/$test_id/request.json"

  # Run the test
  HTTP_CODE=$(curl -s -o "$RESULTS_DIR/$test_id/response.json" -w "%{http_code}" \
    -X POST "$API_BASE/chat/completions" \
    -H "Content-Type: application/json" \
    -d "$payload")

  # Calculate elapsed time
  END_TIME=$(date +%s)
  ELAPSED=$((END_TIME - START_TIME))

  # Get response size
  RESPONSE_SIZE=$(wc -c < "$RESULTS_DIR/$test_id/response.json" | xargs)

  # Record results
  echo "HTTP Status: $HTTP_CODE" >> "$LOG_FILE"
  echo "Elapsed time: $ELAPSED seconds" >> "$LOG_FILE"
  echo "Response size: $RESPONSE_SIZE bytes" >> "$LOG_FILE"

  # Check if it looks like an error
  if [ "$HTTP_CODE" != "200" ] || [ "$RESPONSE_SIZE" -lt 100 ]; then
    echo "WARNING: Possible error in response!" >> "$LOG_FILE"
    echo "Response content:" >> "$LOG_FILE"
    cat "$RESULTS_DIR/$test_id/response.json" >> "$LOG_FILE"
  fi

  echo "Completed at: $(date)" >> "$LOG_FILE"
  echo "" >> "$LOG_FILE"

  # Return results as a CSV line
  echo "$test_id,$repo_url,chat_query,$provider,$model,$HTTP_CODE,$ELAPSED,$RESPONSE_SIZE"
}

# Create CSV results file
RESULTS_CSV="$RESULTS_DIR/test_results.csv"
echo "test_id,repository,test_type,provider,model,http_status,duration_sec,size_bytes" > "$RESULTS_CSV"

# Run tests
echo "Starting DeepWiki API tests at $(date)"

# Test 1: Default provider (baseline)
result=$(run_wiki_export_test "T01-DEFAULT" "pallets" "click" "" "" "Small Python repo with default provider")
echo "$result" >> "$RESULTS_CSV"

# Test 2: Google Gemini
result=$(run_wiki_export_test "T02-GOOGLE" "pallets" "click" "google" "gemini-2.5-pro-preview-05-06" "Small Python repo with Google Gemini")
echo "$result" >> "$RESULTS_CSV"

# Test 3: OpenAI GPT-4o
result=$(run_wiki_export_test "T03-OPENAI" "pallets" "click" "openai" "gpt-4o" "Small Python repo with OpenAI GPT-4o")
echo "$result" >> "$RESULTS_CSV"

# Test 4: Claude via OpenRouter
result=$(run_wiki_export_test "T04-CLAUDE" "pallets" "click" "openrouter" "anthropic/claude-3.7-sonnet" "Small Python repo with Claude")
echo "$result" >> "$RESULTS_CSV"

# Test 5-8: Targeted queries for the same repo with different providers
result=$(run_chat_query_test "T05-CHAT-DEFAULT" "https://github.com/pallets/click" "What is the overall architecture of this repository?" "" "" "Architecture query with default provider")
echo "$result" >> "$RESULTS_CSV"

result=$(run_chat_query_test "T06-CHAT-GOOGLE" "https://github.com/pallets/click" "What is the overall architecture of this repository?" "google" "gemini-2.5-pro-preview-05-06" "Architecture query with Google Gemini")
echo "$result" >> "$RESULTS_CSV"

result=$(run_chat_query_test "T07-CHAT-OPENAI" "https://github.com/pallets/click" "What is the overall architecture of this repository?" "openai" "gpt-4o" "Architecture query with OpenAI GPT-4o")
echo "$result" >> "$RESULTS_CSV"

result=$(run_chat_query_test "T08-CHAT-CLAUDE" "https://github.com/pallets/click" "What is the overall architecture of this repository?" "openrouter" "anthropic/claude-3.7-sonnet" "Architecture query with Claude")
echo "$result" >> "$RESULTS_CSV"

# Medium-sized repository tests
result=$(run_wiki_export_test "T09-MED-DEFAULT" "expressjs" "express" "" "" "Medium JS repo with default provider")
echo "$result" >> "$RESULTS_CSV"

result=$(run_chat_query_test "T10-MED-PATTERNS" "https://github.com/expressjs/express" "What design patterns are used in this codebase?" "openai" "gpt-4o" "Design pattern query with OpenAI")
echo "$result" >> "$RESULTS_CSV"

# Large repository test
result=$(run_wiki_export_test "T11-LARGE-CLAUDE" "microsoft" "TypeScript" "openrouter" "anthropic/claude-3.7-sonnet" "Large TS repo with Claude")
echo "$result" >> "$RESULTS_CSV"

result=$(run_chat_query_test "T12-LARGE-PERF" "https://github.com/microsoft/TypeScript" "What are potential performance bottlenecks in this codebase?" "openrouter" "anthropic/claude-3.7-sonnet" "Performance query with Claude")
echo "$result" >> "$RESULTS_CSV"

echo "Testing completed at $(date)"
echo "Results saved to $RESULTS_CSV"
echo "Detailed logs available in $LOG_FILE"
