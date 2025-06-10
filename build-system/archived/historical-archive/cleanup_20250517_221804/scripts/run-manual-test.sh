#!/bin/bash

# DeepWiki Manual Test Script
# This script runs a manual test against a repository using the DeepWiki API

# Default values
REPO="pallets/click"
MODE="wiki"  # Either "wiki" or "chat"
PROVIDER="openai"
MODEL="gpt-4o"
API_URL="http://localhost:8001"
OUTPUT_DIR="./test-results"
QUERY="What is the overall architecture of this repository?"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
        --repo=*)
        REPO="${key#*=}"
        shift
        ;;
        --mode=*)
        MODE="${key#*=}"
        shift
        ;;
        --provider=*)
        PROVIDER="${key#*=}"
        shift
        ;;
        --model=*)
        MODEL="${key#*=}"
        shift
        ;;
        --api-url=*)
        API_URL="${key#*=}"
        shift
        ;;
        --output-dir=*)
        OUTPUT_DIR="${key#*=}"
        shift
        ;;
        --query=*)
        QUERY="${key#*=}"
        shift
        ;;
        --help)
        echo "Usage: $(basename $0) [options]"
        echo "Options:"
        echo "  --repo=OWNER/REPO        Repository to analyze (default: pallets/click)"
        echo "  --mode=MODE              Mode: wiki or chat (default: wiki)"
        echo "  --provider=PROVIDER      Provider: openai, google, openrouter (default: openai)"
        echo "  --model=MODEL            Model name (default: gpt-4o)"
        echo "  --api-url=URL            DeepWiki API URL (default: http://localhost:8001)"
        echo "  --output-dir=DIR         Output directory (default: ./test-results)"
        echo "  --query=QUERY            Query for chat mode (default: architecture query)"
        echo "  --help                   Show this help message"
        exit 0
        ;;
        *)
        echo "Unknown option: $key"
        exit 1
        ;;
    esac
done

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Extract owner and repo
OWNER=$(echo $REPO | cut -d'/' -f1)
REPO_NAME=$(echo $REPO | cut -d'/' -f2)

# Generate timestamp
TIMESTAMP=$(date +"%Y-%m-%d-%H-%M-%S")

# Generate output filename
OUTPUT_FILE="$OUTPUT_DIR/${MODE}-${OWNER}-${REPO_NAME}-${PROVIDER}-${MODEL}-${TIMESTAMP}.json"

# Display test configuration
echo "DeepWiki Manual Test"
echo "===================="
echo "Repository: $REPO (Owner: $OWNER, Repo: $REPO_NAME)"
echo "Mode: $MODE"
echo "Provider: $PROVIDER"
echo "Model: $MODEL"
echo "API URL: $API_URL"
echo "Output File: $OUTPUT_FILE"
if [ "$MODE" == "chat" ]; then
    echo "Query: $QUERY"
fi
echo

# Run the test
echo "Running test... (This may take a while)"
echo

if [ "$MODE" == "wiki" ]; then
    # Wiki mode
    START_TIME=$(date +%s)
    
    # Run wiki export
    curl -X POST "$API_URL/export/wiki" \
      -H "Content-Type: application/json" \
      -d '{
        "owner": "'"$OWNER"'",
        "repo": "'"$REPO_NAME"'",
        "repo_type": "github",
        "format": "json",
        "language": "en",
        "provider": "'"$PROVIDER"'",
        "model": "'"$MODEL"'"
      }' > "$OUTPUT_FILE"
    
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    # Check for errors in output
    if grep -q "\"error\":" "$OUTPUT_FILE"; then
        echo "Error occurred during wiki export:"
        cat "$OUTPUT_FILE"
        exit 1
    fi
    
    # Get file size
    SIZE=$(wc -c < "$OUTPUT_FILE" | xargs)
    
    echo "Wiki export completed in $DURATION seconds"
    echo "Response size: $SIZE bytes"
    echo "Output saved to: $OUTPUT_FILE"
    
    # Extract some basic stats from the response
    echo
    echo "Wiki Content Summary:"
    echo "====================="
    
    # Count sections
    SECTION_COUNT=$(grep -o "\"title\":" "$OUTPUT_FILE" | wc -l | xargs)
    echo "Sections: $SECTION_COUNT"
    
    # Count code blocks (rough estimate)
    CODE_BLOCK_COUNT=$(grep -o "\"code\":" "$OUTPUT_FILE" | wc -l | xargs)
    echo "Code Blocks: $CODE_BLOCK_COUNT"
    
    # List top-level sections (simplified approach)
    echo
    echo "Top Sections:"
    grep "\"title\":" "$OUTPUT_FILE" | head -10 | sed 's/.*"title": "\(.*\)",/  - \1/'
    
    echo
    echo "View the full wiki content in: $OUTPUT_FILE"
    
else
    # Chat mode
    START_TIME=$(date +%s)
    
    # Run chat completions
    curl -X POST "$API_URL/chat/completions" \
      -H "Content-Type: application/json" \
      -d '{
        "repo_url": "https://github.com/'"$REPO"'",
        "messages": [
          {
            "role": "user",
            "content": "'"$QUERY"'"
          }
        ],
        "provider": "'"$PROVIDER"'",
        "model": "'"$MODEL"'"
      }' > "$OUTPUT_FILE"
    
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    # Check for errors in output
    if grep -q "\"error\":" "$OUTPUT_FILE"; then
        echo "Error occurred during chat completion:"
        cat "$OUTPUT_FILE"
        exit 1
    fi
    
    # Get file size
    SIZE=$(wc -c < "$OUTPUT_FILE" | xargs)
    
    echo "Chat completion completed in $DURATION seconds"
    echo "Response size: $SIZE bytes"
    echo "Output saved to: $OUTPUT_FILE"
    
    # Extract the content from the response
    echo
    echo "Response Preview:"
    echo "================="
    
    # Extract content (simplified approach)
    grep "\"content\":" "$OUTPUT_FILE" | head -1 | sed 's/.*"content": "\(.*\)",/\1/' | cut -c 1-200
    
    echo "..."
    echo
    echo "View the full response in: $OUTPUT_FILE"
fi

echo
echo "Test completed successfully."
