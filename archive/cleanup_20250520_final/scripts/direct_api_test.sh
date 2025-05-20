#!/bin/bash
# Direct API Test for DeepWiki
# This script uses direct kubectl exec to call the DeepWiki API within the pod
# This eliminates potential issues with port forwarding or curl

# Base directory
BASE_DIR="/Users/alpinro/Code Prjects/codequal"
cd "$BASE_DIR" || exit 1

# Test parameters
NAMESPACE="codequal-dev"
POD_SELECTOR="deepwiki-fixed"
OUTPUT_DIR="$BASE_DIR/deepwiki_direct_api_test"
REPO_URL="https://github.com/expressjs/express"
MODEL="anthropic/claude-3-opus"

# Create output directory
mkdir -p "$OUTPUT_DIR"
echo "Test results will be saved to: $OUTPUT_DIR"

# Get the active pod
ACTIVE_POD=$(kubectl get pods -n "$NAMESPACE" | grep "$POD_SELECTOR" | grep Running | head -n 1 | awk '{print $1}')

if [ -z "$ACTIVE_POD" ]; then
  echo "ERROR: No running DeepWiki pod found matching selector: $POD_SELECTOR"
  exit 1
fi

echo "Using pod: $ACTIVE_POD"

# Create simplified request JSON
REQUEST_FILE="$OUTPUT_DIR/direct_request.json"

# Create extremely simplified JSON without unecessary features
cat > "$REQUEST_FILE" << EOF
{
  "repo_url": "$REPO_URL",
  "messages": [
    {"role": "user", "content": "Provide a simple 3-point summary of this repository."}
  ],
  "model": "$MODEL",
  "provider": "openrouter",
  "stream": false,
  "temperature": 0.1
}
EOF

echo "Created request file: $REQUEST_FILE"

# Copy the request JSON to the pod
echo "Copying request file to pod..."
kubectl cp "$REQUEST_FILE" "$NAMESPACE/$ACTIVE_POD:/tmp/direct_request.json"

if [ $? -ne 0 ]; then
  echo "ERROR: Failed to copy request file to pod"
  exit 1
fi

# Function to check if a command exists in the pod
pod_command_exists() {
  kubectl exec -n "$NAMESPACE" "$ACTIVE_POD" -- which "$1" > /dev/null 2>&1
}

# Execute API call directly within the pod
echo "Executing API call inside the pod..."
RESPONSE_FILE="$OUTPUT_DIR/direct_response.json"

# Check if curl is available in the pod
if pod_command_exists curl; then
  # Use curl inside the pod
  kubectl exec -n "$NAMESPACE" "$ACTIVE_POD" -- \
    curl -v -X POST "http://localhost:8001/chat/completions/stream" \
      -H "Content-Type: application/json" \
      -d @/tmp/direct_request.json > "$RESPONSE_FILE" 2> "$OUTPUT_DIR/pod_curl_debug.log"
      
  RESULT=$?
elif pod_command_exists wget; then
  # Try wget if curl isn't available
  kubectl exec -n "$NAMESPACE" "$ACTIVE_POD" -- \
    wget -O - --header="Content-Type: application/json" \
      --post-file=/tmp/direct_request.json \
      "http://localhost:8001/chat/completions/stream" > "$RESPONSE_FILE" 2> "$OUTPUT_DIR/pod_wget_debug.log"
      
  RESULT=$?
else
  # Fallback to Python if available
  kubectl exec -n "$NAMESPACE" "$ACTIVE_POD" -- python3 -c '
import json
import sys
import urllib.request

with open("/tmp/direct_request.json", "r") as f:
    data = json.load(f)

req = urllib.request.Request(
    "http://localhost:8001/chat/completions/stream",
    data=json.dumps(data).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)

try:
    with urllib.request.urlopen(req) as response:
        sys.stdout.buffer.write(response.read())
except Exception as e:
    sys.stderr.write(f"Error: {str(e)}\n")
    sys.exit(1)
' > "$RESPONSE_FILE" 2> "$OUTPUT_DIR/pod_python_debug.log"

  RESULT=$?
fi

if [ $RESULT -ne 0 ]; then
  echo "ERROR: API call inside pod failed with code $RESULT"
  echo "Check debug logs in $OUTPUT_DIR for details"
  exit 1
fi

# Output details
if [ -f "$RESPONSE_FILE" ]; then
  echo "Response received. Content:"
  cat "$RESPONSE_FILE"
  echo ""
  echo "Size: $(stat -f%z "$RESPONSE_FILE") bytes"
else
  echo "No response file created"
  exit 1
fi

# Try to extract the actual content if it's JSON
EXTRACTED_CONTENT="$OUTPUT_DIR/extracted_content.txt"

# Use a very simple approach to extract content
python3 -c '
import json
import sys

try:
    with open("'"$RESPONSE_FILE"'", "r") as f:
        content = f.read()
    
    try:
        data = json.loads(content)
        
        # Try multiple possible JSON structures
        extracted = None
        
        if "choices" in data and len(data["choices"]) > 0:
            if "message" in data["choices"][0] and "content" in data["choices"][0]["message"]:
                extracted = data["choices"][0]["message"]["content"]
            elif "text" in data["choices"][0]:
                extracted = data["choices"][0]["text"]
        elif "content" in data:
            extracted = data["content"]
        elif "response" in data:
            extracted = data["response"]
        
        if extracted:
            with open("'"$EXTRACTED_CONTENT"'", "w") as out:
                out.write(extracted)
            print("Successfully extracted content")
        else:
            with open("'"$EXTRACTED_CONTENT"'", "w") as out:
                out.write("Could not find content in JSON response:\n\n")
                out.write(json.dumps(data, indent=2))
            print("Could not extract content")
            
    except json.JSONDecodeError as e:
        with open("'"$EXTRACTED_CONTENT"'", "w") as out:
            out.write(f"Not valid JSON: {str(e)}\n\n")
            out.write(content)
        print("Not valid JSON")
        
except Exception as e:
    print(f"Error: {str(e)}")
'

if [ -f "$EXTRACTED_CONTENT" ]; then
  echo ""
  echo "Extracted content:"
  cat "$EXTRACTED_CONTENT"
fi

echo ""
echo "Direct API test complete. Check $OUTPUT_DIR for results."
