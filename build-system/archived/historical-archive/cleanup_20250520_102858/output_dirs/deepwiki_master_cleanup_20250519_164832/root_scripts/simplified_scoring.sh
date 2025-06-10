#!/bin/bash
# Simplified scoring script that builds on the successful minimal API test
# This script uses a gradual approach to build up complexity

# Base directory
BASE_DIR="/Users/alpinro/Code Prjects/codequal"
cd "$BASE_DIR" || exit 1

# Parameters
NAMESPACE="codequal-dev"
POD_SELECTOR="deepwiki-fixed"
PORT="8001"
OUTPUT_DIR="$BASE_DIR/deepwiki_simplified_scoring"
REPO_URL="https://github.com/expressjs/express"
MODEL="anthropic/claude-3-opus"

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

# Function to run an analysis
run_analysis() {
    local analysis_type="$1"
    local prompt="$2"
    local output_file="${OUTPUT_DIR}/${analysis_type}_analysis.md"
    
    echo ""
    echo "====================================================="
    echo "Running $analysis_type analysis"
    echo "====================================================="
    
    # Create request JSON - keeping it simple but with enough structure for scoring
    local request_file="${OUTPUT_DIR}/${analysis_type}_request.json"
    
    cat > "$request_file" << EOF
{
  "repo_url": "$REPO_URL",
  "messages": [
    {
      "role": "user",
      "content": "$prompt"
    }
  ],
  "stream": false,
  "provider": "openrouter",
  "model": "$MODEL",
  "temperature": 0.2
}
EOF
    
    # Set up port forwarding
    echo "Setting up port forwarding..."
    kubectl port-forward -n "$NAMESPACE" "pod/$ACTIVE_POD" "$PORT:$PORT" &
    PF_PID=$!
    
    # Wait for port forwarding to establish
    sleep 5
    
    # Send request
    echo "Sending $analysis_type analysis request..."
    raw_response="${OUTPUT_DIR}/${analysis_type}_raw.txt"
    
    curl -s -X POST "http://localhost:$PORT/chat/completions/stream" \
      -H "Content-Type: application/json" \
      -o "$raw_response" \
      -d @"$request_file"
    
    RESULT=$?
    
    # Terminate port forwarding
    kill $PF_PID 2>/dev/null || true
    
    if [ $RESULT -ne 0 ]; then
      echo "ERROR: $analysis_type analysis request failed (exit code: $RESULT)"
      return 1
    fi
    
    # Save the content
    if [ -f "$raw_response" ]; then
      # Process output - for now, just save directly since it worked in minimal test
      cp "$raw_response" "$output_file"
      
      SIZE=$(du -h "$output_file" | cut -f1)
      echo "$analysis_type analysis saved to: $output_file (Size: $SIZE)"
      
      # Show a preview
      echo ""
      echo "Preview of $analysis_type analysis:"
      head -n 10 "$output_file"
      echo "..."
      
      return 0
    else
      echo "ERROR: No response file created for $analysis_type analysis"
      return 1
    fi
}

# Create concise prompts for each analysis type
ARCHITECTURE_PROMPT="Analyze the architecture of this repository. Focus on:
1. Overall design patterns
2. Code organization
3. Component relationships
4. Modularity and extensibility

After your analysis, provide:
- A score from 1-10 for the architecture
- Key strengths (bullet points)
- Areas for improvement (bullet points)"

CODE_QUALITY_PROMPT="Analyze the code quality of this repository. Focus on:
1. Code style and consistency
2. Error handling
3. Documentation
4. Testing approach

After your analysis, provide:
- A score from 1-10 for code quality
- Key strengths (bullet points)
- Areas for improvement (bullet points)"

SECURITY_PROMPT="Analyze the security of this repository. Focus on:
1. Authentication and authorization
2. Input validation
3. Common vulnerabilities
4. Sensitive data handling

After your analysis, provide:
- A score from 1-10 for security
- Key strengths (bullet points)
- Areas for improvement (bullet points)"

DEPENDENCIES_PROMPT="Analyze the dependencies of this repository. Focus on:
1. Direct dependencies and versions
2. Dependency management
3. Third-party integration
4. Dependency quality and maintenance

After your analysis, provide:
- A score from 1-10 for dependency management
- Key strengths (bullet points)
- Areas for improvement (bullet points)"

PERFORMANCE_PROMPT="Analyze the performance of this repository. Focus on:
1. Resource usage
2. Optimization techniques
3. Concurrency and I/O handling
4. Caching strategies

After your analysis, provide:
- A score from 1-10 for performance
- Key strengths (bullet points)
- Areas for improvement (bullet points)"

# Run each analysis
echo "Starting specialized analyses of Express repository..."
run_analysis "architecture" "$ARCHITECTURE_PROMPT"
sleep 10

run_analysis "code_quality" "$CODE_QUALITY_PROMPT"
sleep 10

run_analysis "security" "$SECURITY_PROMPT"
sleep 10

run_analysis "dependencies" "$DEPENDENCIES_PROMPT"
sleep 10

run_analysis "performance" "$PERFORMANCE_PROMPT"
sleep 10

# Extract and consolidate scores
echo "Extracting scores from analyses..."
SCORING_FILE="${OUTPUT_DIR}/repository_scoring.md"

# Simple extraction with grep - since we kept the scoring format consistent
echo "# Repository Scoring Summary" > "$SCORING_FILE"
echo "Repository: Express" >> "$SCORING_FILE"
echo "Date: $(date)" >> "$SCORING_FILE"
echo "" >> "$SCORING_FILE"
echo "## Scores by Category" >> "$SCORING_FILE"
echo "" >> "$SCORING_FILE"
echo "| Category | Score (1-10) |" >> "$SCORING_FILE"
echo "|----------|--------------|" >> "$SCORING_FILE"

# Extract scores using grep
for analysis_type in "architecture" "code_quality" "security" "dependencies" "performance"; do
    analysis_file="${OUTPUT_DIR}/${analysis_type}_analysis.md"
    if [ -f "$analysis_file" ]; then
        # Look for the score line
        score_line=$(grep -i "score.*[0-9]" "$analysis_file" | head -n 1)
        if [ -n "$score_line" ]; then
            # Extract just the number
            score=$(echo "$score_line" | grep -o -E '[0-9]+' | head -n 1)
            if [ -n "$score" ]; then
                # Capitalize the category name for the table
                category=$(echo "$analysis_type" | sed 's/_/ /g' | awk '{for(i=1;i<=NF;i++)sub(/./,toupper(substr($i,1,1)),$i)}1')
                echo "| $category | $score |" >> "$SCORING_FILE"
            else
                echo "| $analysis_type | ? |" >> "$SCORING_FILE"
            fi
        else
            echo "| $analysis_type | ? |" >> "$SCORING_FILE"
        fi
    else
        echo "| $analysis_type | ? |" >> "$SCORING_FILE"
    fi
done

# Calculate and add overall score
echo "" >> "$SCORING_FILE"
echo "## Strengths" >> "$SCORING_FILE"
echo "" >> "$SCORING_FILE"

# Extract strengths from each analysis
for analysis_type in "architecture" "code_quality" "security" "dependencies" "performance"; do
    analysis_file="${OUTPUT_DIR}/${analysis_type}_analysis.md"
    if [ -f "$analysis_file" ]; then
        # Look for strengths section
        category=$(echo "$analysis_type" | sed 's/_/ /g' | awk '{for(i=1;i<=NF;i++)sub(/./,toupper(substr($i,1,1)),$i)}1')
        echo "### $category" >> "$SCORING_FILE"
        
        # Extract a few lines after strengths keyword
        strength_lines=$(grep -A 5 -i "strength" "$analysis_file" | grep -E "^[-*]" | head -n 3)
        if [ -n "$strength_lines" ]; then
            echo "$strength_lines" >> "$SCORING_FILE"
        else
            echo "- No specific strengths identified" >> "$SCORING_FILE"
        fi
        echo "" >> "$SCORING_FILE"
    fi
done

echo "## Areas for Improvement" >> "$SCORING_FILE"
echo "" >> "$SCORING_FILE"

# Extract areas for improvement from each analysis
for analysis_type in "architecture" "code_quality" "security" "dependencies" "performance"; do
    analysis_file="${OUTPUT_DIR}/${analysis_type}_analysis.md"
    if [ -f "$analysis_file" ]; then
        # Look for improvement section
        category=$(echo "$analysis_type" | sed 's/_/ /g' | awk '{for(i=1;i<=NF;i++)sub(/./,toupper(substr($i,1,1)),$i)}1')
        echo "### $category" >> "$SCORING_FILE"
        
        # Extract a few lines after improvement keyword
        improvement_lines=$(grep -A 5 -i "improvement\|areas to\|could be" "$analysis_file" | grep -E "^[-*]" | head -n 3)
        if [ -n "$improvement_lines" ]; then
            echo "$improvement_lines" >> "$SCORING_FILE"
        else
            echo "- No specific improvements identified" >> "$SCORING_FILE"
        fi
        echo "" >> "$SCORING_FILE"
    fi
done

# Create a combined report
COMBINED_FILE="${OUTPUT_DIR}/comprehensive_analysis.md"

echo "# Comprehensive Analysis: Express" > "$COMBINED_FILE"
echo "" >> "$COMBINED_FILE"
echo "Generated on: $(date)" >> "$COMBINED_FILE"
echo "Model: $MODEL" >> "$COMBINED_FILE"
echo "Repository: $REPO_URL" >> "$COMBINED_FILE"
echo "" >> "$COMBINED_FILE"

# Add scoring summary
if [ -f "$SCORING_FILE" ]; then
    # Extract the table only
    echo "## Scoring Summary" >> "$COMBINED_FILE"
    echo "" >> "$COMBINED_FILE"
    grep -A 10 "| Category" "$SCORING_FILE" | grep "^|" >> "$COMBINED_FILE"
    echo "" >> "$COMBINED_FILE"
fi

# Add each analysis section
for analysis_type in "architecture" "code_quality" "security" "dependencies" "performance"; do
    ANALYSIS_FILE="${OUTPUT_DIR}/${analysis_type}_analysis.md"
    if [ -f "$ANALYSIS_FILE" ]; then
        category=$(echo "$analysis_type" | sed 's/_/ /g' | awk '{for(i=1;i<=NF;i++)sub(/./,toupper(substr($i,1,1)),$i)}1')
        echo "## $category Analysis" >> "$COMBINED_FILE"
        echo "" >> "$COMBINED_FILE"
        cat "$ANALYSIS_FILE" >> "$COMBINED_FILE"
        echo "" >> "$COMBINED_FILE"
        echo "---" >> "$COMBINED_FILE"
        echo "" >> "$COMBINED_FILE"
    fi
done

echo ""
echo "====================================================="
echo "Simplified scoring complete!"
echo "Individual analysis files are saved in: $OUTPUT_DIR"
echo "Scoring summary: $SCORING_FILE"
echo "Combined report: $COMBINED_FILE"
echo "====================================================="
