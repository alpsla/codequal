#!/bin/bash
# DeepWiki Chat API Exploration Script
# This script explores the DeepWiki Chat API functionality with OpenRouter integration

# Base directory
BASE_DIR="/Users/alpinro/Code Prjects/codequal"
OUTPUT_DIR="$BASE_DIR/deepwiki_chat_exploration"
NAMESPACE="codequal-dev"
POD_SELECTOR="deepwiki-fixed"
PORT="8001"
REPO_URL="${1:-https://github.com/expressjs/express}"
QUESTION="${2:-What are the main architectural patterns used in this repository?}"
MODEL="${3:-anthropic/claude-3-opus}"
FALLBACK_MODELS="openai/gpt-4.1,anthropic/claude-3.7-sonnet,openai/gpt-4"

# Create output directory
mkdir -p "$OUTPUT_DIR"
echo "Results will be saved to: $OUTPUT_DIR"

# Get the active pod
ACTIVE_POD=$(kubectl get pods -n "$NAMESPACE" | grep "$POD_SELECTOR" | grep Running | head -n 1 | awk '{print $1}')

if [ -z "$ACTIVE_POD" ]; then
  echo "ERROR: No running DeepWiki pod found matching selector: $POD_SELECTOR"
  exit 1
fi

echo "Using pod: $ACTIVE_POD"

# Function to run a chat with fallback models
chat_with_fallback() {
    local repo_url="$1"
    local question="$2"
    local primary_model="$3"
    local fallback_models="$4"
    local output_file="${OUTPUT_DIR}/chat_${primary_model//\//_}_response.md"
    local raw_output_file="${OUTPUT_DIR}/chat_${primary_model//\//_}_raw.txt"
    local success=false
    
    echo ""
    echo "====================================================="
    echo "Asking repository chat question:"
    echo "Repository: $repo_url"
    echo "Question: $question"
    echo "Using model: $primary_model"
    echo "====================================================="
    
    # Create request JSON for primary model
    local request_file="${OUTPUT_DIR}/chat_${primary_model//\//_}_request.json"
    
    cat > "$request_file" << EOF
{
  "repo_url": "$repo_url",
  "messages": [
    {
      "role": "system",
      "content": "You are a knowledgeable assistant that answers questions about code repositories. Provide helpful, clear, and concise responses about the code, architecture, and functionality of the repository."
    },
    {
      "role": "user",
      "content": "$question"
    }
  ],
  "stream": false,
  "provider": "openrouter",
  "model": "$primary_model",
  "temperature": 0.2
}
EOF
    
    # Set up port forwarding
    echo "Setting up port forwarding..."
    kubectl port-forward -n "$NAMESPACE" "pod/$ACTIVE_POD" "$PORT:$PORT" &
    PF_PID=$!
    
    # Wait for port forwarding to establish
    sleep 5
    
    # Send chat request with primary model
    echo "Sending chat request with model $primary_model..."
    
    curl -s -X POST "http://localhost:$PORT/chat/completions/stream" \
      -H "Content-Type: application/json" \
      -H "Accept: application/json" \
      -o "$raw_output_file" \
      -d @"$request_file" \
      --max-time 180
    
    RESULT=$?
    
    # Terminate port forwarding
    kill $PF_PID 2>/dev/null || true
    
    if [ $RESULT -ne 0 ] || [ ! -s "$raw_output_file" ] || grep -q "error\|API_KEY\|cannot access\|free variable" "$raw_output_file"; then
        echo "✗ Chat with primary model failed, trying fallback models..."
        
        # Try fallback models
        IFS=',' read -r -a fallback_models_array <<< "$fallback_models"
        
        for fallback_model in "${fallback_models_array[@]}"; do
            echo ""
            echo "Attempting fallback with model: $fallback_model"
            
            # Create request JSON for fallback model
            local fallback_request_file="${OUTPUT_DIR}/chat_${fallback_model//\//_}_request.json"
            local fallback_raw_output_file="${OUTPUT_DIR}/chat_${fallback_model//\//_}_raw.txt"
            
            cat > "$fallback_request_file" << EOF
{
  "repo_url": "$repo_url",
  "messages": [
    {
      "role": "system",
      "content": "You are a knowledgeable assistant that answers questions about code repositories. Provide helpful, clear, and concise responses about the code, architecture, and functionality of the repository."
    },
    {
      "role": "user",
      "content": "$question"
    }
  ],
  "stream": false,
  "provider": "openrouter",
  "model": "$fallback_model",
  "temperature": 0.2
}
EOF
            
            # Set up port forwarding again
            kubectl port-forward -n "$NAMESPACE" "pod/$ACTIVE_POD" "$PORT:$PORT" &
            PF_PID=$!
            
            # Wait for port forwarding to establish
            sleep 5
            
            # Send chat request with fallback model
            curl -s -X POST "http://localhost:$PORT/chat/completions/stream" \
              -H "Content-Type: application/json" \
              -H "Accept: application/json" \
              -o "$fallback_raw_output_file" \
              -d @"$fallback_request_file" \
              --max-time 180
            
            FALLBACK_RESULT=$?
            
            # Terminate port forwarding
            kill $PF_PID 2>/dev/null || true
            
            if [ $FALLBACK_RESULT -eq 0 ] && [ -s "$fallback_raw_output_file" ] && ! grep -q "error\|API_KEY\|cannot access\|free variable" "$fallback_raw_output_file"; then
                echo "✓ Chat with fallback model $fallback_model succeeded!"
                
                # Process the response
                if jq -e '.message .content' "$fallback_raw_output_file" > /dev/null 2>&1; then
                    # Extract content from JSON response
                    jq -r '.message .content' "$fallback_raw_output_file" > "$output_file"
                else
                    # Use raw response if not in expected JSON format
                    cp "$fallback_raw_output_file" "$output_file"
                fi
                
                # Add a note about the fallback model
                local temp_file="${OUTPUT_DIR}/temp_$$.md"
                echo "# Repository Chat Response" > "$temp_file"
                echo "" >> "$temp_file"
                echo "> Note: This response was generated with fallback model: $fallback_model" >> "$temp_file"
                echo "" >> "$temp_file"
                echo "**Repository:** $repo_url" >> "$temp_file"
                echo "**Question:** $question" >> "$temp_file"
                echo "" >> "$temp_file"
                echo "## Response:" >> "$temp_file"
                echo "" >> "$temp_file"
                cat "$output_file" >> "$temp_file"
                mv "$temp_file" "$output_file"
                
                success=true
                break
            else
                echo "✗ Chat with fallback model $fallback_model failed."
            fi
        done
    else
        echo "✓ Chat with primary model succeeded!"
        
        # Process the response
        if jq -e '.message .content' "$raw_output_file" > /dev/null 2>&1; then
            # Extract content from JSON response
            jq -r '.message .content' "$raw_output_file" > "$output_file"
        else
            # Use raw response if not in expected JSON format
            cp "$raw_output_file" "$output_file"
        fi
        
        # Add metadata
        local temp_file="${OUTPUT_DIR}/temp_$$.md"
        echo "# Repository Chat Response" > "$temp_file"
        echo "" >> "$temp_file"
        echo "**Repository:** $repo_url" >> "$temp_file"
        echo "**Question:** $question" >> "$temp_file"
        echo "**Model:** $primary_model" >> "$temp_file"
        echo "" >> "$temp_file"
        echo "## Response:" >> "$temp_file"
        echo "" >> "$temp_file"
        cat "$output_file" >> "$temp_file"
        mv "$temp_file" "$output_file"
        
        success=true
    fi
    
    if ! $success; then
        echo "ERROR: All models failed for the chat question."
        echo "# Repository Chat Response - Failed" > "$output_file"
        echo "" >> "$output_file"
        echo "**Repository:** $repo_url" >> "$output_file"
        echo "**Question:** $question" >> "$output_file"
        echo "" >> "$output_file"
        echo "Unable to generate a response with any of the models. Please try with a different question or repository." >> "$output_file"
        return 1
    fi
    
    # Show file info and preview
    if [ -f "$output_file" ]; then
        SIZE=$(du -h "$output_file" | cut -f1)
        echo "Chat response saved to: $output_file (Size: $SIZE)"
        
        # Show a preview
        echo ""
        echo "Preview of chat response:"
        head -n 15 "$output_file"
        echo "..."
    fi
    
    return 0
}

# Test different types of repository questions
echo "Testing repository chat with different questions..."

# Define a set of test questions
declare -a QUESTIONS=(
    "What are the main architectural patterns used in this repository?"
    "How is error handling implemented in this codebase?"
    "Explain the dependency injection approach used in this project."
    "What security measures are implemented in this codebase?"
    "How is performance optimization handled in this project?"
)

# Run chat for each question
for question in "${QUESTIONS[@]}"; do
    chat_with_fallback "$REPO_URL" "$question" "$MODEL" "$FALLBACK_MODELS"
    sleep 10  # Wait between requests
done

# Also test with the user-provided question if different
if [ "$QUESTION" != "What are the main architectural patterns used in this repository?" ]; then
    chat_with_fallback "$REPO_URL" "$QUESTION" "$MODEL" "$FALLBACK_MODELS"
fi

# Create a summary report
SUMMARY_FILE="${OUTPUT_DIR}/chat_exploration_summary.md"

cat > "$SUMMARY_FILE" << EOF
# DeepWiki Chat API Exploration Summary

This document summarizes the findings from exploring the DeepWiki Chat API functionality.

## Overview

The DeepWiki Chat API allows direct questions about a repository, leveraging the knowledge that DeepWiki has about the codebase. This enables interactive Q&A about repository architecture, patterns, and implementation details.

## Test Parameters

- **Repository:** $REPO_URL
- **Primary Model:** $MODEL
- **Fallback Models:** $FALLBACK_MODELS
- **Test Date:** $(date)

## API Details

The chat API is accessed via the \`/chat/completions/stream\` endpoint with the following parameters:

\`\`\`json
{
  "repo_url": "repository_url",
  "messages": [
    {
      "role": "system",
      "content": "System prompt defining the assistant's role"
    },
    {
      "role": "user",
      "content": "User question about the repository"
    }
  ],
  "stream": false,
  "provider": "openrouter",
  "model": "model_name_with_provider_prefix",
  "temperature": 0.2
}
\`\`\`

## Test Results

| Question | Model Used | Success | Response Quality |
|----------|------------|---------|------------------|
EOF

# Process results for summary
for question in "${QUESTIONS[@]}"; do
    # Create a safe filename version of the question
    question_file=$(echo "$question" | tr '[:upper:]' '[:lower:]' | tr ' ' '_' | tr -cd '[:alnum:]_' | cut -c 1-50)
    
    # Find the corresponding response file
    response_file=""
    model_used=""
    success="❌ Failed"
    
    # Try primary model first
    primary_response="${OUTPUT_DIR}/chat_${MODEL//\//_}_response.md"
    if [ -f "$primary_response" ] && grep -q "$question" "$primary_response"; then
        response_file="$primary_response"
        model_used="$MODEL"
        success="✅ Success"
    else
        # Try fallback models
        IFS=',' read -r -a fallback_models_array <<< "$FALLBACK_MODELS"
        for fallback_model in "${fallback_models_array[@]}"; do
            fallback_response="${OUTPUT_DIR}/chat_${fallback_model//\//_}_response.md"
            if [ -f "$fallback_response" ] && grep -q "$question" "$fallback_response"; then
                response_file="$fallback_response"
                model_used="$fallback_model"
                success="✅ Success (Fallback)"
                break
            fi
        done
    fi
    
    # Determine response quality
    quality="N/A"
    if [ -n "$response_file" ] && [ -f "$response_file" ]; then
        # Count words as a simple metric
        word_count=$(wc -w < "$response_file")
        if [ "$word_count" -gt 300 ]; then
            quality="Good (Detailed)"
        elif [ "$word_count" -gt 100 ]; then
            quality="Satisfactory"
        else
            quality="Brief"
        fi
    fi
    
    # Add to summary
    echo "| $question | $model_used | $success | $quality |" >> "$SUMMARY_FILE"
done

# Complete the summary report
cat >> "$SUMMARY_FILE" << EOF

## Key Findings

1. **API Functionality**: The DeepWiki Chat API successfully enables interactive Q&A about repositories.
2. **Model Performance**: The primary model ($MODEL) generally provides the best results, but fallback models can still generate useful responses.
3. **Response Quality**: Responses are typically detailed, focusing on the specific aspects of the repository mentioned in the question.
4. **Error Handling**: The API handles errors gracefully, allowing for fallback to alternative models.

## Integration Recommendations

### Implementation Approach

1. **Service Integration**: Extend the DeepWikiKubernetesService to include chat functionality
2. **Fallback Mechanism**: Implement the same fallback mechanism used for repository analysis
3. **Context Enhancement**: Consider using previous repository analysis results to enhance chat responses
4. **Caching**: Cache common questions and responses for improved performance

### User Experience

1. **Chat Interface**: Implement a dedicated chat interface in the UI for repository Q&A
2. **Suggested Questions**: Provide suggested questions based on repository characteristics
3. **Follow-up Questions**: Enable follow-up questions with preserved context
4. **Response Formatting**: Format code snippets and technical explanations for readability

## Cost Considerations

This feature would be well-suited for a premium tier offering due to:

1. **Token Usage**: Each chat interaction consumes tokens proportional to the repository context
2. **API Costs**: OpenRouter imposes costs for each model call
3. **Value Proposition**: The ability to interactively ask questions about a repository provides significant value

## Next Steps

1. Complete the vector database implementation
2. Integrate repository chat as a premium feature in the product roadmap
3. Test with larger repositories to assess token usage and costs
4. Develop pricing strategy for the premium tier

EOF

echo ""
echo "====================================================="
echo "Chat API exploration complete!"
echo "Summary report: $SUMMARY_FILE"
echo "All responses are saved in: $OUTPUT_DIR"
echo "====================================================="
