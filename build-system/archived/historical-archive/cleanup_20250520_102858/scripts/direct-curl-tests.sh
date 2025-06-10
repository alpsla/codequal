#!/bin/bash

# Direct curl tests for DeepWiki API based on discovered endpoints
echo "DeepWiki API Direct Tests"
echo "======================="
echo ""

# Create output directory
OUTPUT_DIR="/Users/alpinro/Code Prjects/codequal/packages/core/src/deepwiki/test-results"
mkdir -p "$OUTPUT_DIR"

# Test 1: Chat completions stream endpoint
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
  -o "$OUTPUT_DIR/stream-test.json"

echo ""
echo "Response saved to $OUTPUT_DIR/stream-test.json"
echo ""

# Test 2: Chat completions without stream (try variation)
echo "Test 2: Chat completions without /stream"
echo "--------------------------------------"
echo "Command: curl -X POST \"http://localhost:8001/chat/completions\" -H \"Content-Type: application/json\" -d '{
  \"repo_url\": \"https://github.com/pallets/click\",
  \"messages\": [
    {
      \"role\": \"user\",
      \"content\": \"What is the overall architecture of this repository?\"
    }
  ]
}'"
echo ""

curl -X POST "http://localhost:8001/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/pallets/click",
    "messages": [
      {
        "role": "user",
        "content": "What is the overall architecture of this repository?"
      }
    ]
  }' \
  -o "$OUTPUT_DIR/no-stream-test.json"

echo ""
echo "Response saved to $OUTPUT_DIR/no-stream-test.json"
echo ""

# Test 3: Wiki export with modified parameters based on error
echo "Test 3: Wiki export with corrected parameters"
echo "------------------------------------------"
echo "Command: curl -X POST \"http://localhost:8001/export/wiki\" -H \"Content-Type: application/json\" -d '{
  \"repo_url\": \"https://github.com/pallets/click\",
  \"pages\": [\"README.md\"],
  \"format\": \"json\",
  \"language\": \"en\",
  \"provider\": \"openai\",
  \"model\": \"gpt-4o\"
}'"
echo ""

curl -X POST "http://localhost:8001/export/wiki" \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/pallets/click",
    "pages": ["README.md"],
    "format": "json",
    "language": "en",
    "provider": "openai",
    "model": "gpt-4o"
  }' \
  -o "$OUTPUT_DIR/wiki-test.json"

echo ""
echo "Response saved to $OUTPUT_DIR/wiki-test.json"
echo ""

# Test 4: Try wiki endpoint without provider/model to use defaults
echo "Test 4: Wiki export with minimal parameters"
echo "----------------------------------------"
echo "Command: curl -X POST \"http://localhost:8001/export/wiki\" -H \"Content-Type: application/json\" -d '{
  \"repo_url\": \"https://github.com/pallets/click\",
  \"pages\": [\"README.md\"],
  \"format\": \"json\"
}'"
echo ""

curl -X POST "http://localhost:8001/export/wiki" \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/pallets/click",
    "pages": ["README.md"],
    "format": "json"
  }' \
  -o "$OUTPUT_DIR/wiki-minimal-test.json"

echo ""
echo "Response saved to $OUTPUT_DIR/wiki-minimal-test.json"
echo ""

# Test 5: Try a simpler query with streaming
echo "Test 5: Simple streaming query"
echo "----------------------------"
echo "Command: curl -X POST \"http://localhost:8001/chat/completions/stream\" -H \"Content-Type: application/json\" -d '{
  \"repo_url\": \"https://github.com/pallets/click\",
  \"messages\": [
    {
      \"role\": \"user\",
      \"content\": \"What does this repository do?\"
    }
  ]
}'"
echo ""

curl -X POST "http://localhost:8001/chat/completions/stream" \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/pallets/click",
    "messages": [
      {
        "role": "user",
        "content": "What does this repository do?"
      }
    ]
  }' \
  -o "$OUTPUT_DIR/simple-stream-test.json"

echo ""
echo "Response saved to $OUTPUT_DIR/simple-stream-test.json"
echo ""

# Examine all results
echo "Examining results:"
echo "----------------"
for FILE in "$OUTPUT_DIR/stream-test.json" "$OUTPUT_DIR/no-stream-test.json" "$OUTPUT_DIR/wiki-test.json" "$OUTPUT_DIR/wiki-minimal-test.json" "$OUTPUT_DIR/simple-stream-test.json"; do
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
      # If not an error, show the first few lines
      echo "Response preview (first 10 lines):"
      head -10 "$FILE"
      echo "..."
      
      # Also check file size
      SIZE=$(wc -c < "$FILE")
      echo "File size: $SIZE bytes"
    fi
  else
    echo "No response or empty file"
  fi
done

echo ""
echo "Tests completed."
