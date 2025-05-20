#!/bin/bash
# CodeQual Repository Analysis Script
# Usage: ./analyze_repository.sh <repository_url> [model_name] [fallback_models]

# Default parameters
REPO_URL="${1:-https://github.com/expressjs/express}"
MODEL="${2:-google/gemini-2.5-flash-preview-05-20}"
FALLBACK_MODELS="${3:-anthropic/claude-3-7-sonnet}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BASE_DIR="/Users/alpinro/Code Prjects/codequal"
OUTPUT_DIR="$BASE_DIR/reports/report_$TIMESTAMP"
NAMESPACE="codequal-dev"
POD_SELECTOR="deepwiki-fixed"
PORT="8001"

# Create output directory
mkdir -p "$OUTPUT_DIR"
echo "Analysis results will be saved to: $OUTPUT_DIR"

# Validate inputs
if [ -z "$REPO_URL" ]; then
  echo "ERROR: Repository URL is required"
  echo "Usage: ./analyze_repository.sh <repository_url> [model_name]"
  exit 1
fi

# Extract repository name from URL
REPO_NAME=$(basename "$REPO_URL" .git)

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
    local model="$MODEL"
    # Parse fallback models from comma-separated string
    IFS=',' read -r -a fallback_models <<< "$FALLBACK_MODELS"
    local success=false
    
    echo ""
    echo "====================================================="
    echo "Running $analysis_type analysis on repository: $REPO_NAME"
    echo "Using model: $model"
    echo "====================================================="
    
    # Create request JSON
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
  "model": "$model",
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
    local raw_response="${OUTPUT_DIR}/${analysis_type}_raw.txt"
    
    # Set timeout - longer for performance analysis
    local timeout=300
    if [ "$analysis_type" == "performance" ]; then
      timeout=600  # 10 minutes for performance analysis
      echo "Using extended timeout ($timeout seconds) for performance analysis..."
    fi
    
    curl -s -X POST "http://localhost:$PORT/chat/completions/stream" \
      -H "Content-Type: application/json" \
      -H "Accept: application/json" \
      -o "$raw_response" \
      -d @"$request_file" \
      --max-time $timeout
    
    RESULT=$?
    
    # Terminate port forwarding
    kill $PF_PID 2>/dev/null || true
    
    if [ $RESULT -ne 0 ]; then
      echo "ERROR: $analysis_type analysis request failed (exit code: $RESULT)"
      
      # Try fallback models
      for fallback_model in "${fallback_models[@]}"; do
          echo "Attempting fallback with model: $fallback_model"
          
          # Update request file with fallback model
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
  "model": "$fallback_model",
  "temperature": 0.2
}
EOF
          
          # Set up port forwarding again
          kubectl port-forward -n "$NAMESPACE" "pod/$ACTIVE_POD" "$PORT:$PORT" &
          PF_PID=$!
          
          # Wait for port forwarding to establish
          sleep 5
          
          # Try with fallback model
          echo "Sending $analysis_type analysis request with fallback model $fallback_model..."
          local fallback_response="${OUTPUT_DIR}/${analysis_type}_${fallback_model//\//_}_raw.txt"
          
          # Set timeout - longer for performance analysis
          local timeout=300
          if [ "$analysis_type" == "performance" ]; then
            timeout=600  # 10 minutes for performance analysis
            echo "Using extended timeout ($timeout seconds) for performance analysis with fallback model..."
          fi
          
          curl -s -X POST "http://localhost:$PORT/chat/completions/stream" \
            -H "Content-Type: application/json" \
            -H "Accept: application/json" \
            -o "$fallback_response" \
            -d @"$request_file" \
            --max-time $timeout
          
          FALLBACK_RESULT=$?
          
          # Terminate port forwarding
          kill $PF_PID 2>/dev/null || true
          
          if [ $FALLBACK_RESULT -eq 0 ] && [ -f "$fallback_response" ] && [ -s "$fallback_response" ]; then
              # Check if the response contains actual content
              if grep -q "score\|Score\|[0-9]/10\|[0-9] out of 10" "$fallback_response" || [ "$(wc -l < "$fallback_response")" -gt 5 ]; then
                  cp "$fallback_response" "$output_file"
                  echo "✓ $analysis_type analysis successful with fallback model $fallback_model!"
                  
                  # Add a note about the fallback model
                  local temp_file="${OUTPUT_DIR}/temp_$$.md"
                  echo "> Note: This analysis was performed with fallback model: $fallback_model" > "$temp_file"
                  echo "" >> "$temp_file"
                  cat "$output_file" >> "$temp_file"
                  mv "$temp_file" "$output_file"
                  
                  success=true
                  model="$fallback_model"
                  break
              fi
          fi
      done
      
      if ! $success; then
          echo "ERROR: All models failed for $analysis_type analysis"
          echo "# $analysis_type Analysis - Failed" > "$output_file"
          echo "" >> "$output_file"
          echo "This analysis could not be completed successfully." >> "$output_file"
          echo "" >> "$output_file"
          echo "## Score" >> "$output_file"
          echo "" >> "$output_file"
          echo "Default score: 5/10" >> "$output_file"
          return 1
      fi
    else
      # Process successful response
      if [ -f "$raw_response" ] && [ -s "$raw_response" ]; then
          # Check if the response contains actual content
          if grep -q "error\|Error\|API_KEY\|cannot access\|free variable" "$raw_response" && ! grep -q "score\|Score\|[0-9]/10\|[0-9] out of 10" "$raw_response"; then
              echo "ERROR: $analysis_type analysis returned an error response"
              return 1
          fi
          
          cp "$raw_response" "$output_file"
          echo "✓ $analysis_type analysis successful with primary model!"
          success=true
      else
          echo "ERROR: Empty or missing response for $analysis_type analysis"
          return 1
      fi
    fi
    
    # Show file size and preview
    if [ -f "$output_file" ]; then
        SIZE=$(du -h "$output_file" | cut -f1)
        echo "$analysis_type analysis saved to: $output_file (Size: $SIZE)"
        
        # Show a preview
        echo ""
        echo "Preview of $analysis_type analysis:"
        head -n 10 "$output_file"
        echo "..."
    fi
    
    return 0
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

SECURITY_PROMPT="Analyze the code safety of this repository. Focus on:
1. Input handling practices
2. Authentication methods
3. Data protection
4. Error handling

After your analysis, provide:
- A score from 1-10 for overall code safety
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

PERFORMANCE_PROMPT="Briefly analyze the performance aspects of this repository. Focus on:
1. Resource efficiency (memory, CPU)
2. Key optimization techniques
3. Response time considerations

Limit your analysis to the most critical findings.

After your analysis, provide:
- A score from 1-10 for performance
- 2-3 key strengths (bullet points)
- 2-3 areas for improvement (bullet points)"

# Run each analysis
echo "Starting specialized analyses of $REPO_NAME repository..."

# Run performance analysis first since it's the most likely to timeout
echo "Running performance analysis first (most likely to timeout)..."
run_analysis "performance" "$PERFORMANCE_PROMPT"
sleep 10

run_analysis "architecture" "$ARCHITECTURE_PROMPT"
sleep 10

run_analysis "code_quality" "$CODE_QUALITY_PROMPT"
sleep 10

run_analysis "security" "$SECURITY_PROMPT"
sleep 10

run_analysis "dependencies" "$DEPENDENCIES_PROMPT"
sleep 10

# Extract and consolidate scores
echo "Extracting scores from analyses..."
SCORING_FILE="${OUTPUT_DIR}/repository_scoring.md"

# Create the scoring file header
echo "# Repository Scoring Summary" > "$SCORING_FILE"
echo "Repository: $REPO_NAME" >> "$SCORING_FILE"
echo "Date: $(date)" >> "$SCORING_FILE"
echo "" >> "$SCORING_FILE"
echo "## Scores by Category" >> "$SCORING_FILE"
echo "" >> "$SCORING_FILE"
echo "| Category | Score (1-10) | Model Used |" >> "$SCORING_FILE"
echo "|----------|--------------|------------|" >> "$SCORING_FILE"

# Extract scores using grep
TOTAL_SCORE=0
CATEGORY_COUNT=0
CATEGORIES=("architecture" "code_quality" "security" "dependencies" "performance")

for analysis_type in "${CATEGORIES[@]}"; do
    analysis_file="${OUTPUT_DIR}/${analysis_type}_analysis.md"
    if [ -f "$analysis_file" ]; then
        # Format the category name for display
        display_name=$(echo "$analysis_type" | sed 's/_/ /g' | awk '{for(i=1;i<=NF;i++)sub(/./,toupper(substr($i,1,1)),$i)}1')
        
        # Check if a fallback model was used
        model_used="$MODEL"
        if grep -q "performed with fallback model" "$analysis_file"; then
            model_note=$(grep "performed with fallback model" "$analysis_file")
            model_used=$(echo "$model_note" | sed 's/.*fallback model: \(.*\)/\1/')
        fi
        
        # Look for the score - try multiple patterns
        score=""
        score_line=$(grep -i "score.*[0-9]/10\|score.*[0-9] out of 10\|overall.*score.*[0-9]" "$analysis_file" | head -n 1)
        
        if [ -n "$score_line" ]; then
            # Extract just the number using regex
            score=$(echo "$score_line" | grep -o -E '[0-9]+' | head -n 1)
        fi
        
        # If not found with first pattern, try just looking for numbers near "score"
        if [ -z "$score" ]; then
            score_line=$(grep -i -A1 -B1 "score" "$analysis_file" | grep -o -E '[0-9]+' | head -n 1)
            score=$score_line
        fi
        
        # If still not found, check for default score
        if [ -z "$score" ]; then
            if grep -q "Default score:" "$analysis_file"; then
                score=$(grep "Default score:" "$analysis_file" | grep -o -E '[0-9]+' | head -n 1)
            fi
        fi
        
        # If still not found, use default
        if [ -z "$score" ]; then
            score=5  # Default score
            echo "| $display_name | $score (default) | $model_used |" >> "$SCORING_FILE"
        else
            echo "| $display_name | $score | $model_used |" >> "$SCORING_FILE"
            TOTAL_SCORE=$((TOTAL_SCORE + score))
            CATEGORY_COUNT=$((CATEGORY_COUNT + 1))
        fi
    else
        echo "| $display_name | 5 (analysis failed) | N/A |" >> "$SCORING_FILE"
    fi
done

# Calculate and add overall score
if [ $CATEGORY_COUNT -gt 0 ]; then
    OVERALL_SCORE=$(echo "scale=1; $TOTAL_SCORE / $CATEGORY_COUNT" | bc)
    echo "" >> "$SCORING_FILE"
    echo "## Overall Repository Score: $OVERALL_SCORE / 10" >> "$SCORING_FILE"
else
    echo "" >> "$SCORING_FILE"
    echo "## Overall Repository Score: 5.0 / 10 (default)" >> "$SCORING_FILE"
fi

# Add a note if performance analysis is missing
if [ ! -f "${OUTPUT_DIR}/performance_analysis.md" ]; then
    echo "" >> "$SCORING_FILE"
    echo "## Note" >> "$SCORING_FILE"
    echo "Performance analysis was not completed due to time constraints. Default score of 5/10 was used for overall calculation." >> "$SCORING_FILE"
    
    # Create a placeholder performance analysis file
    echo "# Performance Analysis (Default)" > "${OUTPUT_DIR}/performance_analysis.md"
    echo "" >> "${OUTPUT_DIR}/performance_analysis.md"
    echo "Performance analysis could not be completed successfully." >> "${OUTPUT_DIR}/performance_analysis.md"
    echo "" >> "${OUTPUT_DIR}/performance_analysis.md"
    echo "## Score: 5/10 (Default)" >> "${OUTPUT_DIR}/performance_analysis.md"
    echo "" >> "${OUTPUT_DIR}/performance_analysis.md"
    echo "### Key Strengths" >> "${OUTPUT_DIR}/performance_analysis.md"
    echo "- (Not available)" >> "${OUTPUT_DIR}/performance_analysis.md"
    echo "" >> "${OUTPUT_DIR}/performance_analysis.md"
    echo "### Areas for Improvement" >> "${OUTPUT_DIR}/performance_analysis.md"
    echo "- (Not available)" >> "${OUTPUT_DIR}/performance_analysis.md"
fi

echo "" >> "$SCORING_FILE"
echo "## Strengths" >> "$SCORING_FILE"
echo "" >> "$SCORING_FILE"

# Extract strengths from each analysis
for analysis_type in "${CATEGORIES[@]}"; do
    analysis_file="${OUTPUT_DIR}/${analysis_type}_analysis.md"
    if [ -f "$analysis_file" ]; then
        # Look for strengths section
        display_name=$(echo "$analysis_type" | sed 's/_/ /g' | awk '{for(i=1;i<=NF;i++)sub(/./,toupper(substr($i,1,1)),$i)}1')
        echo "### $display_name" >> "$SCORING_FILE"
        
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
for analysis_type in "${CATEGORIES[@]}"; do
    analysis_file="${OUTPUT_DIR}/${analysis_type}_analysis.md"
    if [ -f "$analysis_file" ]; then
        # Look for improvement section
        display_name=$(echo "$analysis_type" | sed 's/_/ /g' | awk '{for(i=1;i<=NF;i++)sub(/./,toupper(substr($i,1,1)),$i)}1')
        echo "### $display_name" >> "$SCORING_FILE"
        
        # Extract a few lines after improvement keyword
        improvement_lines=$(grep -A 5 -i "improvement\|areas\|could be" "$analysis_file" | grep -E "^[-*]" | head -n 3)
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

echo "# Comprehensive Analysis: $REPO_NAME" > "$COMBINED_FILE"
echo "" >> "$COMBINED_FILE"
echo "Generated on: $(date)" >> "$COMBINED_FILE"
echo "Repository: $REPO_URL" >> "$COMBINED_FILE"
echo "" >> "$COMBINED_FILE"

# Add overall score
if grep -q "Overall Repository Score:" "$SCORING_FILE"; then
    overall_score_line=$(grep "Overall Repository Score:" "$SCORING_FILE")
    echo "## $overall_score_line" >> "$COMBINED_FILE"
else
    echo "## Overall Repository Score: 5.0 / 10 (default)" >> "$COMBINED_FILE"
fi
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
for analysis_type in "${CATEGORIES[@]}"; do
    ANALYSIS_FILE="${OUTPUT_DIR}/${analysis_type}_analysis.md"
    if [ -f "$ANALYSIS_FILE" ]; then
        display_name=$(echo "$analysis_type" | sed 's/_/ /g' | awk '{for(i=1;i<=NF;i++)sub(/./,toupper(substr($i,1,1)),$i)}1')
        echo "## $display_name Analysis" >> "$COMBINED_FILE"
        echo "" >> "$COMBINED_FILE"
        
        # Skip the model note line if it exists (it's already in the scoring table)
        if grep -q "performed with fallback model:" "$ANALYSIS_FILE"; then
            grep -v "performed with fallback model:" "$ANALYSIS_FILE" >> "$COMBINED_FILE"
        else
            cat "$ANALYSIS_FILE" >> "$COMBINED_FILE"
        fi
        
        echo "" >> "$COMBINED_FILE"
        echo "---" >> "$COMBINED_FILE"
        echo "" >> "$COMBINED_FILE"
    fi
done

echo ""
echo "====================================================="
echo "Repository analysis complete!"
echo "Report generated at: $OUTPUT_DIR"
echo "Comprehensive analysis: $COMBINED_FILE"
echo "Scoring summary: $SCORING_FILE"
echo "====================================================="

# Create a symlink to the latest report
ln -sf "$OUTPUT_DIR" "$BASE_DIR/reports/latest"
echo "Symlink to latest report created at: $BASE_DIR/reports/latest"
