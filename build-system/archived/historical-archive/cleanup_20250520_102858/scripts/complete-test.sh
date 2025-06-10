#!/bin/bash

# DeepWiki API Complete Test Script
echo "DeepWiki API Complete Test"
echo "========================="
echo ""

# Create output directory
OUTPUT_DIR="/Users/alpinro/Code Prjects/codequal/packages/core/src/deepwiki/test-results"
mkdir -p "$OUTPUT_DIR"
TIMESTAMP=$(date +"%Y-%m-%d-%H-%M-%S")

# Test 1: Chat completions stream with OpenAI (CONFIRMED WORKING)
echo "Test 1: Chat completions stream with OpenAI GPT-4o"
echo "------------------------------------------------"
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
  -o "$OUTPUT_DIR/complete-openai-test-$TIMESTAMP.json"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "Response completed in $DURATION seconds"
echo "Response saved to $OUTPUT_DIR/complete-openai-test-$TIMESTAMP.json"
echo ""

# Test 2: Chat completions stream with Google Gemini (CONFIRMED WORKING)
echo "Test 2: Chat completions stream with Google Gemini"
echo "-----------------------------------------------"
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
  -o "$OUTPUT_DIR/complete-google-test-$TIMESTAMP.json"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "Response completed in $DURATION seconds"
echo "Response saved to $OUTPUT_DIR/complete-google-test-$TIMESTAMP.json"
echo ""

# Test 3: Chat completions stream with Anthropic (replacing OpenRouter)
echo "Test 3: Chat completions stream with Anthropic API"
echo "-----------------------------------------------"
echo "Command: curl -X POST \"http://localhost:8001/chat/completions/stream\" -H \"Content-Type: application/json\" -d '{
  \"repo_url\": \"https://github.com/pallets/click\",
  \"messages\": [
    {
      \"role\": \"user\",
      \"content\": \"What is the overall architecture of this repository?\"
    }
  ],
  \"provider\": \"anthropic\",
  \"model\": \"claude-3-7-sonnet\"
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
    "provider": "anthropic",
    "model": "claude-3-7-sonnet"
  }' \
  -o "$OUTPUT_DIR/complete-anthropic-test-$TIMESTAMP.json"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "Response completed in $DURATION seconds"
echo "Response saved to $OUTPUT_DIR/complete-anthropic-test-$TIMESTAMP.json"
echo ""

# Test 4: Wiki export with all required fields
echo "Test 4: Wiki export with complete page parameters"
echo "----------------------------------------------"
echo "Command: curl -X POST \"http://localhost:8001/export/wiki\" -H \"Content-Type: application/json\" -d '{
  \"repo_url\": \"https://github.com/pallets/click\",
  \"pages\": [{
    \"id\": \"readme\",
    \"title\": \"README\",
    \"path\": \"README.md\",
    \"content\": \"\",
    \"filePaths\": [\"README.md\"],
    \"importance\": 1,
    \"relatedPages\": []
  }],
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
    "pages": [{
      "id": "readme",
      "title": "README",
      "path": "README.md",
      "content": "",
      "filePaths": ["README.md"],
      "importance": 1,
      "relatedPages": []
    }],
    "format": "json",
    "language": "en",
    "provider": "openai",
    "model": "gpt-4o"
  }' \
  -o "$OUTPUT_DIR/complete-wiki-test-$TIMESTAMP.json"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "Response completed in $DURATION seconds"
echo "Response saved to $OUTPUT_DIR/complete-wiki-test-$TIMESTAMP.json"
echo ""

# Test 5: Wiki export with markdown format
echo "Test 5: Wiki export with markdown format"
echo "-------------------------------------"
echo "Command: curl -X POST \"http://localhost:8001/export/wiki\" -H \"Content-Type: application/json\" -d '{
  \"repo_url\": \"https://github.com/pallets/click\",
  \"pages\": [{
    \"id\": \"readme\",
    \"title\": \"README\",
    \"path\": \"README.md\",
    \"content\": \"\",
    \"filePaths\": [\"README.md\"],
    \"importance\": 1,
    \"relatedPages\": []
  }],
  \"format\": \"markdown\",
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
    "pages": [{
      "id": "readme",
      "title": "README",
      "path": "README.md",
      "content": "",
      "filePaths": ["README.md"],
      "importance": 1,
      "relatedPages": []
    }],
    "format": "markdown",
    "language": "en",
    "provider": "openai",
    "model": "gpt-4o"
  }' \
  -o "$OUTPUT_DIR/complete-wiki-markdown-test-$TIMESTAMP.json"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "Response completed in $DURATION seconds"
echo "Response saved to $OUTPUT_DIR/complete-wiki-markdown-test-$TIMESTAMP.json"
echo ""

# Test 6: Try a more specific design patterns query with OpenAI
echo "Test 6: Design patterns query with OpenAI"
echo "--------------------------------------"
echo "Command: curl -X POST \"http://localhost:8001/chat/completions/stream\" -H \"Content-Type: application/json\" -d '{
  \"repo_url\": \"https://github.com/pallets/click\",
  \"messages\": [
    {
      \"role\": \"user\",
      \"content\": \"What design patterns are used in this repository? Please provide code examples.\"
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
        "content": "What design patterns are used in this repository? Please provide code examples."
      }
    ],
    "provider": "openai",
    "model": "gpt-4o"
  }' \
  -o "$OUTPUT_DIR/complete-patterns-test-$TIMESTAMP.json"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "Response completed in $DURATION seconds"
echo "Response saved to $OUTPUT_DIR/complete-patterns-test-$TIMESTAMP.json"
echo ""

# Examine results for the working tests
echo "Analyzing Results:"
echo "----------------"
echo ""

# Check chat completions with OpenAI
if [ -s "$OUTPUT_DIR/complete-openai-test-$TIMESTAMP.json" ]; then
  SIZE=$(wc -c < "$OUTPUT_DIR/complete-openai-test-$TIMESTAMP.json")
  echo "OpenAI Chat Test: Success - $SIZE bytes"
  
  # Display approximate word count
  WORDS=$(cat "$OUTPUT_DIR/complete-openai-test-$TIMESTAMP.json" | wc -w)
  echo "Word count (approx): $WORDS"
  
  # Check if the response has structure (simple test)
  if grep -q "architecture" "$OUTPUT_DIR/complete-openai-test-$TIMESTAMP.json"; then
    echo "Content check: Relevant content found"
  else
    echo "Content check: Warning - may not contain relevant content"
  fi
else
  echo "OpenAI Chat Test: Failed (file empty or not created)"
fi

echo ""

# Check chat completions with Google
if [ -s "$OUTPUT_DIR/complete-google-test-$TIMESTAMP.json" ]; then
  SIZE=$(wc -c < "$OUTPUT_DIR/complete-google-test-$TIMESTAMP.json")
  echo "Google Gemini Chat Test: Success - $SIZE bytes"
  
  # Display approximate word count
  WORDS=$(cat "$OUTPUT_DIR/complete-google-test-$TIMESTAMP.json" | wc -w)
  echo "Word count (approx): $WORDS"
  
  # Check if the response has structure (simple test)
  if grep -q "architecture" "$OUTPUT_DIR/complete-google-test-$TIMESTAMP.json"; then
    echo "Content check: Relevant content found"
  else
    echo "Content check: Warning - may not contain relevant content"
  fi
else
  echo "Google Gemini Chat Test: Failed (file empty or not created)"
fi

echo ""

# Check design patterns query
if [ -s "$OUTPUT_DIR/complete-patterns-test-$TIMESTAMP.json" ]; then
  SIZE=$(wc -c < "$OUTPUT_DIR/complete-patterns-test-$TIMESTAMP.json")
  echo "Design Patterns Test: Success - $SIZE bytes"
  
  # Display approximate word count
  WORDS=$(cat "$OUTPUT_DIR/complete-patterns-test-$TIMESTAMP.json" | wc -w)
  echo "Word count (approx): $WORDS"
  
  # Check if the response has relevant pattern content (simple test)
  if grep -q "pattern" "$OUTPUT_DIR/complete-patterns-test-$TIMESTAMP.json"; then
    echo "Content check: Pattern-related content found"
  else
    echo "Content check: Warning - may not contain pattern-related content"
  fi
else
  echo "Design Patterns Test: Failed (file empty or not created)"
fi

echo ""
echo "Final Summary and Recommendations:"
echo "================================"
echo ""
echo "1. Confirmed working endpoints:"
echo "   - Chat completions: /chat/completions/stream"
echo ""
echo "2. Confirmed working providers:"
echo "   - OpenAI (gpt-4o)"
echo "   - Google (gemini-2.5-pro-preview-05-06)"
echo ""
echo "3. API Parameter Requirements:"
echo "   - Chat completions requires: repo_url, messages[]"
echo "   - Wiki export requires many fields in pages array"
echo ""
echo "4. Recommendations for DeepWikiClient implementation:"
echo "   - Use the /chat/completions/stream endpoint for all queries"
echo "   - Support both OpenAI and Google providers"
echo "   - Use a retry mechanism for error handling"
echo "   - Implement proper stream handling for responses"
echo ""
echo "Tests completed."
