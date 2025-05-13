#!/bin/bash

# Direct Test Script
# This script runs tests directly with environment variables

echo "DeepWiki Direct Test"
echo "==================="
echo ""

# Load environment variables from .env
ENV_FILE="/Users/alpinro/Code Prjects/codequal/.env"
if [ -f "$ENV_FILE" ]; then
  echo "Loading environment variables from $ENV_FILE"
  set -a
  source "$ENV_FILE"
  set +a
  echo "Environment variables loaded"
else
  echo "No .env file found at $ENV_FILE"
  echo "Using existing environment variables"
fi

# Configuration
OUTPUT_DIR="/Users/alpinro/Code Prjects/codequal/packages/core/src/deepwiki/direct-test-results"
API_URL="http://localhost:8001"
TIMESTAMP=$(date +"%Y-%m-%d-%H-%M-%S")

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Check for API keys
echo ""
echo "Checking API keys:"
if [ -n "$OPENAI_API_KEY" ]; then
  echo "✓ OPENAI_API_KEY found"
  HAS_OPENAI=true
else
  echo "✗ OPENAI_API_KEY not found"
  HAS_OPENAI=false
fi

if [ -n "$GOOGLE_API_KEY" ] || [ -n "$GEMINI_API_KEY" ]; then
  echo "✓ GOOGLE_API_KEY or GEMINI_API_KEY found"
  HAS_GOOGLE=true
  # Use GEMINI_API_KEY as fallback
  if [ -z "$GOOGLE_API_KEY" ] && [ -n "$GEMINI_API_KEY" ]; then
    GOOGLE_API_KEY=$GEMINI_API_KEY
  fi
else
  echo "✗ GOOGLE_API_KEY or GEMINI_API_KEY not found"
  HAS_GOOGLE=false
fi

if [ -n "$ANTHROPIC_API_KEY" ]; then
  echo "✓ ANTHROPIC_API_KEY found"
  HAS_ANTHROPIC=true
else
  echo "✗ ANTHROPIC_API_KEY not found"
  HAS_ANTHROPIC=false
fi

if [ -n "$OPENROUTER_API_KEY" ]; then
  echo "✓ OPENROUTER_API_KEY found"
  HAS_OPENROUTER=true
  echo "OPENROUTER_API_KEY value: ${OPENROUTER_API_KEY:0:4}...${OPENROUTER_API_KEY: -4}"
else
  echo "✗ OPENROUTER_API_KEY not found"
  
  # Allow manual entry if missing
  echo ""
  echo "Enter OPENROUTER_API_KEY manually for testing:"
  read -s OPENROUTER_API_KEY
  
  if [ -n "$OPENROUTER_API_KEY" ]; then
    HAS_OPENROUTER=true
    echo "OPENROUTER_API_KEY manually entered"
  else
    HAS_OPENROUTER=false
    echo "No OPENROUTER_API_KEY provided"
  fi
fi

# Test a single repository with OpenRouter
if [ "$HAS_OPENROUTER" = true ]; then
  echo ""
  echo "Testing with OpenRouter and Claude:"
  
  REPO="pallets/flask"
  QUERY="What is the overall architecture of this repository? Please explain the main components, their relationships, and how they work together."
  OUTPUT_FILE="$OUTPUT_DIR/openrouter-claude-test-$TIMESTAMP.json"
  
  echo "Repository: $REPO"
  echo "Output file: $OUTPUT_FILE"
  
  # Create a temporary file for the request body
  TEMP_FILE=$(mktemp)
  cat > "$TEMP_FILE" << EOL
{
  "repo_url": "https://github.com/$REPO",
  "messages": [
    {
      "role": "user",
      "content": "$QUERY"
    }
  ],
  "provider": "openrouter",
  "model": "anthropic/claude-3.7-sonnet"
}
EOL
  
  # Use curl to make the API call with explicit auth header
  echo "Making API call with curl..."
  curl -v -X POST "$API_URL/chat/completions/stream" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $OPENROUTER_API_KEY" \
    -d @"$TEMP_FILE" > "$OUTPUT_FILE" 2>"$OUTPUT_DIR/curl-debug-$TIMESTAMP.log"
  
  # Show result
  SIZE=$(wc -c < "$OUTPUT_FILE" | xargs)
  echo "Response size: $SIZE bytes"
  
  if [ "$SIZE" -lt 200 ]; then
    echo "WARNING: Response size is small, possible error. First 100 characters:"
    head -c 100 "$OUTPUT_FILE"
    echo ""
    echo "Check the debug log for more information: $OUTPUT_DIR/curl-debug-$TIMESTAMP.log"
  else
    echo "Response preview:"
    head -n 5 "$OUTPUT_FILE"
    echo "..."
    echo "Test completed successfully."
  fi
fi

echo ""
echo "Testing complete."
echo "To run the full test with all detected keys, use:"
echo "source $ENV_FILE && bash /Users/alpinro/Code\\ Prjects/codequal/packages/core/src/deepwiki/simple-multi-test.sh"
