#!/bin/bash

# Final DeepWiki API Test Based on Confirmed Endpoints
echo "DeepWiki API Final Test"
echo "======================"
echo ""

# Create output directory
OUTPUT_DIR="/Users/alpinro/Code Prjects/codequal/packages/core/src/deepwiki/test-results"
mkdir -p "$OUTPUT_DIR"
TIMESTAMP=$(date +"%Y-%m-%d-%H-%M-%S")

# Test 1: Chat completions stream endpoint (CONFIRMED WORKING)
echo "Test 1: Chat completions stream endpoint"
echo "---------------------------------------"
echo "Command: curl -X POST \"http://localhost:8001/chat/completions/stream\" -H \"Content-Type: application/json\" -d '{
  \"repo_url\": \"https://github.com/pallets/click\",
  \"messages\": [
    {
      \"role\": \"user\",
      \"content\": \"What is the overall architecture of this repository?\"
    }
  ],
  \"provider\": \"openai\",
  \"model\": \"gpt-4o\"
}'"
echo ""

START_TIME=$(date +%s)

curl -X POST "http://localhost:8001/chat/completions/stream" \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/pallets/click",
    "messages": [
      {
        "role": "user",
        "content": "What is the overall architecture of this repository?"
      }
    ],
    "provider": "openai",
    "model": "gpt-4o"
  }' \
  -o "$OUTPUT_DIR/final-stream-test-$TIMESTAMP.json"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "Response completed in $DURATION seconds"
echo "Response saved to $OUTPUT_DIR/final-stream-test-$TIMESTAMP.json"
echo ""

# Test 2: Wiki export with corrected format for pages parameter
echo "Test 2: Wiki export with corrected pages format"
echo "---------------------------------------------"
echo "Command: curl -X POST \"http://localhost:8001/export/wiki\" -H \"Content-Type: application/json\" -d '{
  \"repo_url\": \"https://github.com/pallets/click\",
  \"pages\": [{\"path\": \"README.md\"}],
  \"format\": \"json\",
  \"language\": \"en\",
  \"provider\": \"openai\",
  \"model\": \"gpt-4o\"
}'"
echo ""

START_TIME=$(date +%s)

curl -X POST "http://localhost:8001/export/wiki" \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/pallets/click",
    "pages": [{"path": "README.md"}],
    "format": "json",
    "language": "en",
    "provider": "openai",
    "model": "gpt-4o"
  }' \
  -o "$OUTPUT_DIR/final-wiki-test-$TIMESTAMP.json"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "Response completed in $DURATION seconds"
echo "Response saved to $OUTPUT_DIR/final-wiki-test-$TIMESTAMP.json"
echo ""

# Test 3: Try a different wiki format (Markdown)
echo "Test 3: Wiki export with Markdown format"
echo "-------------------------------------"
echo "Command: curl -X POST \"http://localhost:8001/export/wiki\" -H \"Content-Type: application/json\" -d '{
  \"repo_url\": \"https://github.com/pallets/click\",
  \"pages\": [{\"path\": \"README.md\"}],
  \"format\": \"md\",
  \"language\": \"en\",
  \"provider\": \"openai\",
  \"model\": \"gpt-4o\"
}'"
echo ""

START_TIME=$(date +%s)

curl -X POST "http://localhost:8001/export/wiki" \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/pallets/click",
    "pages": [{"path": "README.md"}],
    "format": "md",
    "language": "en",
    "provider": "openai",
    "model": "gpt-4o"
  }' \
  -o "$OUTPUT_DIR/final-wiki-md-test-$TIMESTAMP.json"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "Response completed in $DURATION seconds"
echo "Response saved to $OUTPUT_DIR/final-wiki-md-test-$TIMESTAMP.json"
echo ""

# Test 4: Try with Google's Gemini model
echo "Test 4: Chat completions with Google Gemini"
echo "----------------------------------------"
echo "Command: curl -X POST \"http://localhost:8001/chat/completions/stream\" -H \"Content-Type: application/json\" -d '{
  \"repo_url\": \"https://github.com/pallets/click\",
  \"messages\": [
    {
      \"role\": \"user\",
      \"content\": \"What is the overall architecture of this repository?\"
    }
  ],
  \"provider\": \"google\",
  \"model\": \"gemini-2.5-pro-preview-05-06\"
}'"
echo ""

START_TIME=$(date +%s)

curl -X POST "http://localhost:8001/chat/completions/stream" \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/pallets/click",
    "messages": [
      {
        "role": "user",
        "content": "What is the overall architecture of this repository?"
      }
    ],
    "provider": "google",
    "model": "gemini-2.5-pro-preview-05-06"
  }' \
  -o "$OUTPUT_DIR/final-google-test-$TIMESTAMP.json"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "Response completed in $DURATION seconds"
echo "Response saved to $OUTPUT_DIR/final-google-test-$TIMESTAMP.json"
echo ""

# Test 5: Try with Claude model via OpenRouter
echo "Test 5: Chat completions with Claude via OpenRouter"
echo "------------------------------------------------"
echo "Command: curl -X POST \"http://localhost:8001/chat/completions/stream\" -H \"Content-Type: application/json\" -d '{
  \"repo_url\": \"https://github.com/pallets/click\",
  \"messages\": [
    {
      \"role\": \"user\",
      \"content\": \"What is the overall architecture of this repository?\"
    }
  ],
  \"provider\": \"openrouter\",
  \"model\": \"anthropic/claude-3.7-sonnet\"
}'"
echo ""

START_TIME=$(date +%s)

curl -X POST "http://localhost:8001/chat/completions/stream" \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/pallets/click",
    "messages": [
      {
        "role": "user",
        "content": "What is the overall architecture of this repository?"
      }
    ],
    "provider": "openrouter",
    "model": "anthropic/claude-3.7-sonnet"
  }' \
  -o "$OUTPUT_DIR/final-claude-test-$TIMESTAMP.json"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "Response completed in $DURATION seconds"
echo "Response saved to $OUTPUT_DIR/final-claude-test-$TIMESTAMP.json"
echo ""

# Examine results
echo "Examining results:"
echo "----------------"
for FILE in "$OUTPUT_DIR/final-stream-test-$TIMESTAMP.json" "$OUTPUT_DIR/final-wiki-test-$TIMESTAMP.json" "$OUTPUT_DIR/final-wiki-md-test-$TIMESTAMP.json" "$OUTPUT_DIR/final-google-test-$TIMESTAMP.json" "$OUTPUT_DIR/final-claude-test-$TIMESTAMP.json"; do
  echo ""
  echo "Results from $FILE:"
  echo ""
  
  # Check if file exists and is not empty
  if [ -s "$FILE" ]; then
    # Check for error responses
    if grep -q "\"error\":" "$FILE" || grep -q "\"detail\":" "$FILE"; then
      echo "Error response:"
      cat "$FILE"
    else
      # If not an error, show the first 10 lines and file size
      echo "Response preview (first 10 lines):"
      head -10 "$FILE"
      echo "..."
      
      # Check file size
      SIZE=$(wc -c < "$FILE")
      echo "File size: $SIZE bytes"
      
      # If it's a small file, show all content
      if [ "$SIZE" -lt 500 ]; then
        echo ""
        echo "Full response (small file):"
        cat "$FILE"
      fi
    fi
  else
    echo "No response or empty file"
  fi
done

echo ""
echo "Final test summary:"
echo "-------------------"
echo "Based on our testing, the DeepWiki API requires these endpoints and parameters:"
echo ""
echo "1. Chat completions: POST /chat/completions/stream"
echo "   Required parameters: repo_url, messages[]"
echo "   Optional parameters: provider, model"
echo ""
echo "2. Wiki export: POST /export/wiki"
echo "   Required parameters: repo_url, pages[{path: 'filepath'}]"
echo "   Optional parameters: format ('json' or 'md'), language, provider, model"
echo ""
echo "These findings will help us update the DeepWikiClient implementation."
echo ""
echo "Tests completed."
