#!/bin/bash
# Script to diagnose and fix the security scan issue with OpenRouter API

# Base directory
BASE_DIR="/Users/alpinro/Code Prjects/codequal"
cd "$BASE_DIR" || exit 1

# Parameters
NAMESPACE="codequal-dev"
POD_SELECTOR="deepwiki-fixed"
PORT="8001"
OUTPUT_DIR="$BASE_DIR/deepwiki_security_fix"
REPO_URL="https://github.com/expressjs/express"
MODEL="anthropic/claude-3-opus"  # Try a standard model

# Create output directory
mkdir -p "$OUTPUT_DIR"
echo "Output directory: $OUTPUT_DIR"

# Get the active pod
ACTIVE_POD=$(kubectl get pods -n "$NAMESPACE" | grep "$POD_SELECTOR" | grep Running | head -n 1 | awk '{print $1}')

if [ -z "$ACTIVE_POD" ]; then
  echo "ERROR: No running DeepWiki pod found matching selector: $POD_SELECTOR"
  exit 1
fi

echo "Using pod: $ACTIVE_POD"

# Check for the OpenRouter API key
echo "Checking for OpenRouter API key in the pod..."
API_KEY_CHECK=$(kubectl exec -n "$NAMESPACE" "$ACTIVE_POD" -- env | grep OPENROUTER_API_KEY)

if [ -z "$API_KEY_CHECK" ]; then
  echo "WARNING: OPENROUTER_API_KEY environment variable not found in pod"
else
  echo "OPENROUTER_API_KEY is set in the pod environment"
fi

# Create a basic security prompt - avoiding potential trigger words
SECURITY_PROMPT="Analyze the code safety of this repository. Focus on:
1. Input handling practices
2. Authentication methods
3. Data protection
4. Error handling

After your analysis, provide:
- A score from 1-10 for overall code safety
- Key strengths (bullet points)
- Areas for improvement (bullet points)"

# Create a request with the security prompt
REQUEST_FILE="$OUTPUT_DIR/security_request.json"

cat > "$REQUEST_FILE" << EOF
{
  "repo_url": "$REPO_URL",
  "messages": [
    {
      "role": "user",
      "content": "$SECURITY_PROMPT"
    }
  ],
  "stream": false,
  "provider": "openrouter",
  "model": "$MODEL",
  "temperature": 0.1
}
EOF

echo "Created security test request: $REQUEST_FILE"

# Set up port forwarding
echo "Setting up port forwarding..."
kubectl port-forward -n "$NAMESPACE" "pod/$ACTIVE_POD" "$PORT:$PORT" &
PF_PID=$!

# Wait for port forwarding to establish
sleep 5

# Send the security test request
echo "Sending security test request..."
RESPONSE_FILE="$OUTPUT_DIR/security_response.json"
CURL_OUTPUT="$OUTPUT_DIR/curl_output.log"

curl -v -X POST "http://localhost:$PORT/chat/completions/stream" \
  -H "Content-Type: application/json" \
  -o "$RESPONSE_FILE" \
  -d @"$REQUEST_FILE" 2> "$CURL_OUTPUT"

RESULT=$?

# Terminate port forwarding
kill $PF_PID 2>/dev/null || true

# Check the result
if [ $RESULT -ne 0 ]; then
  echo "ERROR: Security test request failed with code $RESULT"
  echo "Curl debug output:"
  cat "$CURL_OUTPUT"
  exit 1
fi

# Check if the response contains an error
if grep -q "Error\|error\|API_KEY\|cannot access free variable" "$RESPONSE_FILE"; then
  echo "ERROR: Security test response contains an error:"
  grep -A 5 -B 5 "Error\|error\|API_KEY\|cannot access free variable" "$RESPONSE_FILE"
  
  # Try with a different model
  echo ""
  echo "Let's try with a different model (gpt-3.5-turbo)..."
  
  ALTERNATIVE_REQUEST_FILE="$OUTPUT_DIR/security_request_gpt.json"
  
  cat > "$ALTERNATIVE_REQUEST_FILE" << EOF
{
  "repo_url": "$REPO_URL",
  "messages": [
    {
      "role": "user",
      "content": "$SECURITY_PROMPT"
    }
  ],
  "stream": false,
  "provider": "openai",
  "model": "gpt-3.5-turbo",
  "temperature": 0.1
}
EOF
  
  # Set up port forwarding again
  kubectl port-forward -n "$NAMESPACE" "pod/$ACTIVE_POD" "$PORT:$PORT" &
  PF_PID=$!
  
  # Wait for port forwarding to establish
  sleep 5
  
  # Send the alternative request
  ALTERNATIVE_RESPONSE_FILE="$OUTPUT_DIR/security_response_gpt.json"
  
  echo "Sending alternative request with GPT-3.5-Turbo..."
  curl -v -X POST "http://localhost:$PORT/chat/completions/stream" \
    -H "Content-Type: application/json" \
    -o "$ALTERNATIVE_RESPONSE_FILE" \
    -d @"$ALTERNATIVE_REQUEST_FILE" 2> "$OUTPUT_DIR/curl_output_gpt.log"
  
  ALT_RESULT=$?
  
  # Terminate port forwarding
  kill $PF_PID 2>/dev/null || true
  
  # Check if the alternative worked
  if [ $ALT_RESULT -eq 0 ] && [ ! -z "$ALTERNATIVE_RESPONSE_FILE" ] && [ ! $(grep -q "Error\|error\|API_KEY" "$ALTERNATIVE_RESPONSE_FILE") ]; then
    echo "SUCCESS: Alternative model worked!"
    echo "Response excerpt:"
    head -n 10 "$ALTERNATIVE_RESPONSE_FILE"
    echo "..."
    
    echo ""
    echo "The issue appears to be specific to using the OpenRouter provider."
    echo "You have two options:"
    echo "1. Continue using the OpenAI provider instead of OpenRouter for security scans"
    echo "2. Fix the OpenRouter API key configuration"
  else
    echo "ERROR: Alternative model also failed."
    echo "This suggests a deeper configuration issue."
  fi
  
  # Create a fixed version of the simplified_scoring.sh script
  echo ""
  echo "Creating a modified version of the scoring script that uses OpenAI for security analysis..."
  
  FIXED_SCRIPT="$BASE_DIR/fixed_simplified_scoring.sh"
  cp "$BASE_DIR/simplified_scoring.sh" "$FIXED_SCRIPT"
  
  # Modify the provider for security analysis
  sed -i '' 's/  "provider": "openrouter",/  "provider": "openai",/g' "$FIXED_SCRIPT"
  sed -i '' 's/MODEL="anthropic\/claude-3-opus"/MODEL="gpt-3.5-turbo"/g' "$FIXED_SCRIPT"
  
  chmod +x "$FIXED_SCRIPT"
  
  echo "Created a fixed script: $FIXED_SCRIPT"
  echo "This script uses OpenAI instead of OpenRouter for all analyses."
  echo "You can run it with: $FIXED_SCRIPT"
else
  echo "SUCCESS: Security test response does not contain errors!"
  echo "Response excerpt:"
  head -n 10 "$RESPONSE_FILE"
  echo "..."
  
  echo ""
  echo "The test was successful! You can now proceed with the simplified scoring script:"
  echo "./simplified_scoring.sh"
fi

echo ""
echo "Diagnostic information has been saved to $OUTPUT_DIR"
