#!/bin/bash
# Enhanced Quick Validation Test for DeepWiki OpenRouter Integration
# This script focuses on correctly extracting the API response content

# Base directory
BASE_DIR="/Users/alpinro/Code Prjects/codequal"
cd "$BASE_DIR" || exit 1

# Default parameters
MODEL="anthropic/claude-3-opus"
NAMESPACE="codequal-dev"
POD_SELECTOR="deepwiki-fixed"
PORT="8001"
OUTPUT_DIR="$BASE_DIR/deepwiki_enhanced_validation"
TIMEOUT=180  # 3 minutes timeout

# Make the output directory
mkdir -p "$OUTPUT_DIR"
echo "Analysis results will be saved to: $OUTPUT_DIR"

# Target repository - using a small test repo
REPO_URL="https://github.com/expressjs/express"
REPO_NAME=$(basename "$REPO_URL" .git)

# Get the active pod
ACTIVE_POD=$(kubectl get pods -n "$NAMESPACE" | grep "$POD_SELECTOR" | grep Running | head -n 1 | awk '{print $1}')

if [ -z "$ACTIVE_POD" ]; then
  echo "ERROR: No running DeepWiki pod found matching selector: $POD_SELECTOR"
  exit 1
fi

echo "Using pod: $ACTIVE_POD"

# Simple prompt
PROMPT="Provide a brief analysis of this repository with the following structure:

1. Overview
   - Main purpose
   - Technology stack
   - Key features

2. Architecture
   - Code organization
   - Design patterns
   - Notable components

3. Scoring
   - Score (1-10) for code quality
   - Score (1-10) for documentation
   - Score (1-10) for architecture
   - Overall score (average)

Keep your response concise and focused."

# System message
SYSTEM_MSG="You are an expert code analyst. Provide a concise analysis of the repository."

# Create a request file with proper JSON formatting
REQUEST_JSON_FILE="${OUTPUT_DIR}/enhanced_test_request.json"
cat > "$REQUEST_JSON_FILE" << EOF
{
  "repo_url": "$REPO_URL",
  "messages": [
    {
      "role": "system",
      "content": "$SYSTEM_MSG"
    },
    {
      "role": "user",
      "content": "$PROMPT"
    }
  ],
  "stream": false,
  "provider": "openrouter",
  "model": "$MODEL",
  "temperature": 0.2,
  "max_tokens": 2000
}
EOF

echo "Created request file: $REQUEST_JSON_FILE"

# Set up port forwarding
echo "Setting up port forwarding to DeepWiki API..."
kubectl port-forward -n "$NAMESPACE" "pod/$ACTIVE_POD" "$PORT:$PORT" &
PF_PID=$!

# Wait for port forwarding to establish
sleep 5

# Execute the analysis
echo "Running enhanced validation test with $MODEL..."
echo "This will take 1-3 minutes. Please be patient."

OUTPUT_FILE="${OUTPUT_DIR}/enhanced_validation_${REPO_NAME}.md"
RAW_RESPONSE="${OUTPUT_DIR}/enhanced_validation_raw.json"
DEBUG_FILE="${OUTPUT_DIR}/enhanced_validation_debug.txt"

# Run with the request file
curl -v -X POST "http://localhost:$PORT/chat/completions/stream" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -o "$RAW_RESPONSE" \
  --max-time $TIMEOUT \
  -d @"$REQUEST_JSON_FILE" 2>&1 | tee "$DEBUG_FILE"

RESULT=$?

# Terminate port forwarding
kill $PF_PID 2>/dev/null || true

if [ $RESULT -ne 0 ]; then
  echo "ERROR: Enhanced validation test failed (exit code: $RESULT)"
  if [ -f "$RAW_RESPONSE" ]; then
    echo "Raw response content:"
    cat "$RAW_RESPONSE"
  fi
  exit 1
fi

# Improve the Python script to handle various JSON response formats
cat > "${OUTPUT_DIR}/extract_content.py" << 'EOF'
#!/usr/bin/env python3
import json
import sys
import os
import re

# Input and output file paths from command line arguments
if len(sys.argv) != 3:
    print("Usage: python extract_content.py input_file output_file")
    sys.exit(1)

input_file = sys.argv[1]
output_file = sys.argv[2]

# Read the raw response
try:
    with open(input_file, 'r') as f:
        raw_content = f.read()
    
    print(f"Read {len(raw_content)} bytes from {input_file}")
    
    # Save the raw content for reference
    with open(f"{input_file}.debug", 'w') as f:
        f.write(raw_content)
    
    # First, try to parse as plain JSON
    try:
        data = json.loads(raw_content)
        print("Successfully parsed as JSON")
        
        # Create a detailed debug file for inspection
        with open(f"{input_file}.structure", 'w') as f:
            f.write(f"JSON Keys at root level: {list(data.keys())}\n\n")
            f.write(f"Full JSON structure:\n{json.dumps(data, indent=2)}\n")
        
        # Handle different API response formats
        content = None
        
        # OpenAI format
        if 'choices' in data and len(data['choices']) > 0:
            if 'message' in data['choices'][0] and 'content' in data['choices'][0]['message']:
                content = data['choices'][0]['message']['content']
                print("Extracted from choices[0].message.content (OpenAI format)")
            elif 'text' in data['choices'][0]:
                content = data['choices'][0]['text']
                print("Extracted from choices[0].text (Completion format)")
        
        # Anthropic format
        elif 'content' in data and isinstance(data['content'], list):
            content_parts = []
            for item in data['content']:
                if 'text' in item:
                    content_parts.append(item['text'])
            content = ''.join(content_parts)
            print("Extracted from content[].text (Anthropic format)")
        
        # Simple content field
        elif 'content' in data and isinstance(data['content'], str):
            content = data['content']
            print("Extracted from content field (Simple format)")
        
        # Response field (common in proxy APIs)
        elif 'response' in data:
            content = data['response']
            print("Extracted from response field (Proxy format)")
        
        # OpenRouter format
        elif 'choices' in data and len(data['choices']) > 0 and 'text' in data['choices'][0]:
            content = data['choices'][0]['text']
            print("Extracted from choices[0].text (OpenRouter format)")
        
        # Check for DeepWiki specific format
        elif 'result' in data:
            if isinstance(data['result'], str):
                content = data['result']
                print("Extracted from result field (string format)")
            elif isinstance(data['result'], dict) and 'content' in data['result']:
                content = data['result']['content']
                print("Extracted from result.content field")
            elif isinstance(data['result'], dict) and 'text' in data['result']:
                content = data['result']['text']
                print("Extracted from result.text field")
        
        # If we found content, write it to the output file
        if content:
            with open(output_file, 'w') as f:
                f.write(content)
            print(f"Successfully extracted content ({len(content)} bytes) to {output_file}")
            sys.exit(0)
        else:
            print("Could not extract content from standard JSON formats")
            
            # If we couldn't extract using standard paths, create a debug dump
            with open(output_file, 'w') as f:
                f.write("# API Response Debug\n\n")
                f.write("The content could not be automatically extracted from the API response.\n\n")
                f.write("## Raw JSON Response\n\n")
                f.write("```json\n")
                f.write(json.dumps(data, indent=2))
                f.write("\n```\n\n")
                f.write("## Available Keys\n\n")
                f.write("Root level keys: " + ", ".join(data.keys()) + "\n\n")
                
                # Try to provide some helpful info about nested structures
                for key in data.keys():
                    if isinstance(data[key], dict):
                        f.write(f"Keys in '{key}': " + ", ".join(data[key].keys()) + "\n")
                    elif isinstance(data[key], list) and len(data[key]) > 0:
                        if isinstance(data[key][0], dict):
                            f.write(f"First item in '{key}' list has keys: " + ", ".join(data[key][0].keys()) + "\n")
            
            sys.exit(1)
                
    except json.JSONDecodeError as e:
        print(f"Failed to parse as JSON: {str(e)}")
        
        # Check if it could be a different format (e.g., streaming newline-delimited JSON)
        if "\n" in raw_content:
            lines = raw_content.strip().split("\n")
            jsonl_items = []
            
            for line in lines:
                if line.strip():
                    try:
                        item = json.loads(line)
                        jsonl_items.append(item)
                    except:
                        pass
            
            if jsonl_items:
                print(f"Parsed as newline-delimited JSON: {len(jsonl_items)} items")
                
                # Extract content from JSONL format
                content_parts = []
                for item in jsonl_items:
                    if 'choices' in item and len(item['choices']) > 0:
                        if 'delta' in item['choices'][0] and 'content' in item['choices'][0]['delta']:
                            content_parts.append(item['choices'][0]['delta']['content'])
                        elif 'text' in item['choices'][0]:
                            content_parts.append(item['choices'][0]['text'])
                    elif 'content' in item:
                        if isinstance(item['content'], list):
                            for content_item in item['content']:
                                if 'text' in content_item:
                                    content_parts.append(content_item['text'])
                        else:
                            content_parts.append(item['content'])
                
                if content_parts:
                    content = ''.join(content_parts)
                    with open(output_file, 'w') as f:
                        f.write(content)
                    print(f"Successfully extracted content from JSONL ({len(content)} bytes)")
                    sys.exit(0)
        
        # If it looks like Markdown, save directly
        if '# ' in raw_content or '## ' in raw_content:
            with open(output_file, 'w') as f:
                f.write(raw_content)
            print(f"Content appears to be Markdown, saved directly ({len(raw_content)} bytes)")
            sys.exit(0)
            
        # Last resort: try to find content between quotes if it looks like JSON
        json_content_pattern = r'"content":\s*"([^"]*)"'
        matches = re.findall(json_content_pattern, raw_content)
        if matches:
            content = matches[0]
            with open(output_file, 'w') as f:
                f.write(content)
            print(f"Extracted content using regex ({len(content)} bytes)")
            sys.exit(0)
        
        # If all else fails, save raw content with note
        with open(output_file, 'w') as f:
            f.write("# Raw API Response\n\n")
            f.write("The system couldn't parse the API response format.\n\n")
            f.write("```\n")
            f.write(raw_content)
            f.write("\n```\n")
        print("Saved raw content with parsing failure notice")
        sys.exit(1)
        
except Exception as e:
    print(f"Error processing file: {str(e)}")
    with open(output_file, 'w') as f:
        f.write(f"# Error Processing API Response\n\n")
        f.write(f"An error occurred: {str(e)}")
    sys.exit(1)
EOF

# Make the extraction script executable
chmod +x "${OUTPUT_DIR}/extract_content.py"

# Run the extraction script
python3 "${OUTPUT_DIR}/extract_content.py" "$RAW_RESPONSE" "$OUTPUT_FILE"
EXTRACT_RESULT=$?

# Show results
if [ $EXTRACT_RESULT -eq 0 ] && [ -f "$OUTPUT_FILE" ]; then
    SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
    echo "✓ Enhanced validation test completed successfully!"
    echo "Result saved to: $OUTPUT_FILE (Size: $SIZE)"
    
    # Show a preview
    echo ""
    echo "Preview of validation result:"
    head -n 20 "$OUTPUT_FILE"
    echo "..."
    
    echo ""
    echo "The extraction script successfully parsed the API response."
    echo "This approach should work for the comprehensive script as well."
    echo ""
    echo "Next steps:"
    echo "1. Update the fixed_score_validation.sh with this improved content extraction"
    echo "2. Run the full validation with the improved extraction"
else
    echo "ERROR: Content extraction failed."
    echo "Please check the debug output in $DEBUG_FILE and $RAW_RESPONSE"
    
    if [ -f "$RAW_RESPONSE" ]; then
        echo ""
        echo "Raw response preview:"
        head -n 20 "$RAW_RESPONSE"
        echo "..."
    fi
    
    exit 1
fi
