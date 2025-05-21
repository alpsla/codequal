#!/bin/bash
# Comprehensive DeepWiki Analysis Using Specialized Prompts
# This script runs a complete analysis with different specialized aspects

# Default parameters
MODEL="openai/gpt-4.1"  # Using GPT-4.1 as requested
NAMESPACE="codequal-dev"
POD_SELECTOR="deepwiki-fixed"
PORT="8001"
OUTPUT_DIR="/Users/alpinro/Code Prjects/codequal/deepwiki_comprehensive_analysis"
TIMEOUT=300  # 5 minutes timeout per analysis
PROMPT_DIR="/Users/alpinro/Code Prjects/codequal/docs/architecture/Deepwiki/prompts"

# Target repository
REPO_URL="https://github.com/nestjs/nest"
REPO_NAME=$(basename "$REPO_URL" .git)

# Create output directory
mkdir -p "$OUTPUT_DIR"
echo "Analysis results will be saved to: $OUTPUT_DIR"

# Function to run a specific analysis
run_analysis() {
    local prompt_file="$1"
    local prompt_type="$2"
    local output_file="${OUTPUT_DIR}/${prompt_type}_${REPO_NAME}_analysis.md"
    
    echo ""
    echo "====================================================="
    echo "Running $prompt_type analysis on repository: $REPO_NAME"
    echo "Using prompt: $prompt_file"
    echo "Model: $MODEL"
    echo "Output file: $output_file"
    echo "====================================================="
    
    # Get the active pod
    ACTIVE_POD=$(kubectl get pods -n "$NAMESPACE" | grep "$POD_SELECTOR" | grep Running | head -n 1 | awk '{print $1}')
    
    if [ -z "$ACTIVE_POD" ]; then
      echo "ERROR: No running DeepWiki pod found matching selector: $POD_SELECTOR"
      return 1
    fi
    
    echo "Using pod: $ACTIVE_POD"
    
    # Read the prompt content
    PROMPT=$(cat "$prompt_file")
    
    # Set up port forwarding
    echo "Setting up port forwarding to DeepWiki API..."
    kubectl port-forward -n "$NAMESPACE" "pod/$ACTIVE_POD" "$PORT:$PORT" &
    PF_PID=$!
    
    # Wait for port forwarding to establish
    sleep 5
    
    # System message specific to the analysis type
    SYSTEM_MSG="You are an expert code analyst specializing in $prompt_type analysis. Provide a detailed, specific analysis with file paths and code examples when possible."
    
    # Execute the analysis
    echo "Running $prompt_type analysis with $MODEL..."
    echo "This may take several minutes. Please be patient."
    
    START_TIME=$(date +%s)
    
    # Use a temporary file for the response
    TEMP_FILE=$(mktemp)
    
    curl -X POST "http://localhost:$PORT/chat/completions/stream" \
      -H "Content-Type: application/json" \
      -H "Accept: application/json" \
      -o "$TEMP_FILE" \
      --max-time $TIMEOUT \
      -d @- << EOF
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
      "max_tokens": 4000
    }
EOF
    
    RESULT=$?
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    # Terminate port forwarding
    kill $PF_PID 2>/dev/null || true
    
    if [ $RESULT -ne 0 ]; then
      echo "ERROR: $prompt_type analysis request failed (exit code: $RESULT)"
      if [ $RESULT -eq 28 ]; then
        echo "The curl operation timed out after $TIMEOUT seconds."
      fi
      return 1
    fi
    
    echo "$prompt_type analysis complete! Took ${DURATION} seconds."
    
    # Process the output - extract content from JSON or use as is
    python3 -c "
import json
import sys
import re

try:
    with open('$TEMP_FILE', 'r') as f:
        content = f.read()
    
    # Check if it looks like valid JSON
    if content.strip().startswith('{') and '}' in content:
        try:
            data = json.loads(content)
            
            # Check various JSON structures
            extracted = None
            if 'choices' in data and len(data['choices']) > 0:
                if 'message' in data['choices'][0] and 'content' in data['choices'][0]['message']:
                    extracted = data['choices'][0]['message']['content']
            elif 'content' in data:
                extracted = data['content']
            elif 'response' in data:
                extracted = data['response']
                
            if extracted:
                with open('$output_file', 'w') as out:
                    out.write(extracted)
                print('Successfully extracted JSON content')
            else:
                # If we couldn't extract using standard paths, just save the whole JSON
                with open('$output_file', 'w') as out:
                    out.write(json.dumps(data, indent=2))
                print('Saved full JSON content')
        except json.JSONDecodeError:
            # If it's not valid JSON, try other formats
            print('Not valid JSON, trying other formats')
            
            # If it looks like Markdown, save directly
            if '## ' in content or '# ' in content:
                with open('$output_file', 'w') as out:
                    out.write(content)
                print('Saved content as Markdown')
            else:
                # Try to extract any readable content
                clean_content = re.sub(r'[^a-zA-Z0-9\s\.\,\:\;\-\(\)\[\]\{\}\"\'\`\~\!\@\#\$\%\^\&\*\_\+\=\n\r]', '', content)
                with open('$output_file', 'w') as out:
                    out.write(clean_content)
                print('Saved cleaned content')
    else:
        # If it doesn't look like JSON, save as is
        with open('$output_file', 'w') as out:
            out.write(content)
        print('Saved raw content')
except Exception as e:
    print(f'Error processing content: {str(e)}')
    # Save raw content as fallback
    try:
        with open('$TEMP_FILE', 'r') as f:
            content = f.read()
        with open('$output_file', 'w') as out:
            out.write(content)
        print('Saved raw content as fallback')
    except Exception as e2:
        print(f'Error in fallback save: {str(e2)}')
"

    # Clean up temp file
    rm -f "$TEMP_FILE"
    
    # Show file size
    if [ -f "$output_file" ]; then
        SIZE=$(du -h "$output_file" | cut -f1)
        echo "$prompt_type analysis saved to: $output_file (Size: $SIZE)"
        
        # Show a preview
        echo ""
        echo "Preview of $prompt_type analysis:"
        head -n 20 "$output_file"
        echo "..."
    else
        echo "ERROR: Failed to save $prompt_type analysis output"
    fi
}

# Run all specialized analyses with delay between them to avoid rate limiting
echo "Starting comprehensive analysis of $REPO_NAME repository..."

# Standard overview analysis
run_analysis "$PROMPT_DIR/standard_prompt.txt" "standard"
sleep 10

# Architecture analysis
run_analysis "$PROMPT_DIR/architecture_prompt.txt" "architecture"
sleep 10

# Code quality analysis
run_analysis "$PROMPT_DIR/code_quality_prompt.txt" "code_quality"
sleep 10

# Security analysis
run_analysis "$PROMPT_DIR/security_prompt.txt" "security"
sleep 10

# Create a combined report
COMBINED_FILE="${OUTPUT_DIR}/combined_${REPO_NAME}_analysis.md"

echo "# Comprehensive Repository Analysis: $REPO_NAME" > "$COMBINED_FILE"
echo "" >> "$COMBINED_FILE"
echo "Generated on: $(date)" >> "$COMBINED_FILE"
echo "Model: $MODEL" >> "$COMBINED_FILE"
echo "" >> "$COMBINED_FILE"

# Add table of contents
echo "## Table of Contents" >> "$COMBINED_FILE"
echo "" >> "$COMBINED_FILE"
echo "1. [Standard Overview](#standard-overview)" >> "$COMBINED_FILE"
echo "2. [Architecture Analysis](#architecture-analysis)" >> "$COMBINED_FILE"
echo "3. [Code Quality Analysis](#code-quality-analysis)" >> "$COMBINED_FILE"
echo "4. [Security Analysis](#security-analysis)" >> "$COMBINED_FILE"
echo "" >> "$COMBINED_FILE"

# Add each section
if [ -f "${OUTPUT_DIR}/standard_${REPO_NAME}_analysis.md" ]; then
    echo "## Standard Overview" >> "$COMBINED_FILE"
    echo "" >> "$COMBINED_FILE"
    cat "${OUTPUT_DIR}/standard_${REPO_NAME}_analysis.md" >> "$COMBINED_FILE"
    echo "" >> "$COMBINED_FILE"
fi

if [ -f "${OUTPUT_DIR}/architecture_${REPO_NAME}_analysis.md" ]; then
    echo "## Architecture Analysis" >> "$COMBINED_FILE"
    echo "" >> "$COMBINED_FILE"
    cat "${OUTPUT_DIR}/architecture_${REPO_NAME}_analysis.md" >> "$COMBINED_FILE"
    echo "" >> "$COMBINED_FILE"
fi

if [ -f "${OUTPUT_DIR}/code_quality_${REPO_NAME}_analysis.md" ]; then
    echo "## Code Quality Analysis" >> "$COMBINED_FILE"
    echo "" >> "$COMBINED_FILE"
    cat "${OUTPUT_DIR}/code_quality_${REPO_NAME}_analysis.md" >> "$COMBINED_FILE"
    echo "" >> "$COMBINED_FILE"
fi

if [ -f "${OUTPUT_DIR}/security_${REPO_NAME}_analysis.md" ]; then
    echo "## Security Analysis" >> "$COMBINED_FILE"
    echo "" >> "$COMBINED_FILE"
    cat "${OUTPUT_DIR}/security_${REPO_NAME}_analysis.md" >> "$COMBINED_FILE"
fi

echo ""
echo "====================================================="
echo "Comprehensive analysis complete!"
echo "Individual analysis files are saved in: $OUTPUT_DIR"
echo "Combined report: $COMBINED_FILE"
echo "====================================================="
