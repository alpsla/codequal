#!/bin/bash
# Improved fallback scoring script that fixes the content validation issue
# This script better handles responses from DeepWiki and includes all valid content

# Base directory
BASE_DIR="/Users/alpinro/Code Prjects/codequal"
cd "$BASE_DIR" || exit 1

# Parameters
NAMESPACE="codequal-dev"
POD_SELECTOR="deepwiki-fixed"
PORT="8001"
OUTPUT_DIR="$BASE_DIR/deepwiki_fixed_scoring"
REPO_URL="https://github.com/expressjs/express"
PRIMARY_MODEL="anthropic/claude-3-opus"
FALLBACK_MODELS=("openai/gpt-4.1" "anthropic/claude-3.7-sonnet" "openai/gpt-4")

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

# Function to run an analysis with fallback
run_analysis_with_fallback() {
    local analysis_type="$1"
    local prompt="$2"
    local output_file="${OUTPUT_DIR}/${analysis_type}_analysis.md"
    local success=false
    local used_model="$PRIMARY_MODEL"
    
    echo ""
    echo "====================================================="
    echo "Running $analysis_type analysis"
    echo "====================================================="
    
    # Try with primary model first
    echo "Attempting with primary model: $PRIMARY_MODEL"
    if run_single_analysis "$analysis_type" "$prompt" "$PRIMARY_MODEL" "$output_file"; then
        echo "✓ $analysis_type analysis successful with $PRIMARY_MODEL!"
        success=true
    else
        echo "✗ $analysis_type analysis failed with $PRIMARY_MODEL"
        
        # Try fallback models in sequence
        for fallback_model in "${FALLBACK_MODELS[@]}"; do
            echo ""
            echo "Attempting fallback with model: $fallback_model"
            if run_single_analysis "$analysis_type" "$prompt" "$fallback_model" "$output_file"; then
                echo "✓ $analysis_type analysis successful with fallback model $fallback_model!"
                used_model="$fallback_model"
                success=true
                break
            else
                echo "✗ $analysis_type analysis failed with fallback model $fallback_model"
            fi
        done
    fi
    
    if ! $success; then
        # Check raw response files directly for usable content
        echo "Checking raw response files for usable content..."
        
        for model in "$PRIMARY_MODEL" "${FALLBACK_MODELS[@]}"; do
            raw_file="${OUTPUT_DIR}/${analysis_type}_${model//\//_}_raw.txt"
            if [ -f "$raw_file" ] && [ -s "$raw_file" ]; then
                # Check if file contains actual text content and not just JSON error
                if grep -q "score\|Score\|[0-9]/10\|[0-9] out of 10" "$raw_file"; then
                    echo "✓ Found usable content in raw response from $model!"
                    cp "$raw_file" "$output_file"
                    used_model="$model"
                    success=true
                    break
                fi
            fi
        done
    fi
    
    if ! $success; then
        echo "ERROR: All models failed for $analysis_type analysis"
        # Create a placeholder file with error information
        echo "# $analysis_type Analysis - Failed" > "$output_file"
        echo "" >> "$output_file"
        echo "This analysis could not be completed successfully with any of the following models:" >> "$output_file"
        echo "- $PRIMARY_MODEL (primary)" >> "$output_file"
        for fallback_model in "${FALLBACK_MODELS[@]}"; do
            echo "- $fallback_model (fallback)" >> "$output_file"
        done
        echo "" >> "$output_file"
        echo "## Score" >> "$output_file"
        echo "" >> "$output_file"
        echo "Due to analysis failure, a default score of 5 out of 10 has been assigned." >> "$output_file"
        return 1
    fi
    
    # Add a note about which model was used
    if [ "$used_model" != "$PRIMARY_MODEL" ]; then
        # Add a note at the top of the file
        temp_file="${OUTPUT_DIR}/temp_$$.md"
        echo "> Note: This analysis was performed with fallback model: $used_model" > "$temp_file"
        echo "" >> "$temp_file"
        cat "$output_file" >> "$temp_file"
        mv "$temp_file" "$output_file"
    fi
    
    return 0
}

# Function to run a single analysis with a specific model
run_single_analysis() {
    local analysis_type="$1"
    local prompt="$2"
    local model="$3"
    local output_file="$4"
    local temp_output="${OUTPUT_DIR}/${analysis_type}_${model//\//_}_temp.md"
    
    # Create request JSON
    local request_file="${OUTPUT_DIR}/${analysis_type}_${model//\//_}_request.json"
    
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
    echo "Sending $analysis_type analysis request with model $model..."
    raw_response="${OUTPUT_DIR}/${analysis_type}_${model//\//_}_raw.txt"
    
    curl -s -X POST "http://localhost:$PORT/chat/completions/stream" \
      -H "Content-Type: application/json" \
      -H "Accept: application/json" \
      -o "$raw_response" \
      -d @"$request_file" \
      --max-time 300
    
    RESULT=$?
    
    # Terminate port forwarding
    kill $PF_PID 2>/dev/null || true
    
    if [ $RESULT -ne 0 ]; then
      echo "ERROR: $analysis_type analysis request failed with model $model (exit code: $RESULT)"
      return 1
    fi
    
    # Save the content
    if [ -f "$raw_response" ]; then
      # Check for error messages - only consider it an error if it ONLY contains an error message
      if grep -q "error\|Error\|API_KEY\|cannot access\|free variable" "$raw_response" && ! grep -q "score\|Score\|[0-9]/10\|[0-9] out of 10" "$raw_response"; then
        echo "ERROR: $analysis_type analysis with model $model returned an error:"
        grep -i "error\|API_KEY\|cannot access\|free variable" "$raw_response"
        return 1
      fi
      
      # Process output - save to temp file
      cp "$raw_response" "$temp_output"
      
      SIZE=$(du -h "$temp_output" | cut -f1)
      echo "$analysis_type analysis with $model saved to temporary file (Size: $SIZE)"
      
      # IMPROVED VALIDATION: Check if the content has any analysis regardless of format
      if grep -q "score\|Score\|[0-9]/10\|[0-9] out of 10" "$temp_output" || [ "$(wc -l < "$temp_output")" -gt 5 ]; then
        # Content looks valid, copy to final output file
        cp "$temp_output" "$output_file"
        echo "✓ Valid content detected, saved to: $output_file"
        
        # Show a preview
        echo ""
        echo "Preview of $analysis_type analysis:"
        head -n 10 "$output_file"
        echo "..."
        
        return 0
      else
        echo "✗ Invalid content detected in response"
        return 1
      fi
    else
      echo "ERROR: No response file created for $analysis_type analysis with model $model"
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

PERFORMANCE_PROMPT="Analyze the performance of this repository. Focus on:
1. Resource usage
2. Optimization techniques
3. Concurrency and I/O handling
4. Caching strategies

After your analysis, provide:
- A score from 1-10 for performance
- Key strengths (bullet points)
- Areas for improvement (bullet points)"

# Run each analysis with fallback
echo "Starting specialized analyses of Express repository with improved fallback capability..."
run_analysis_with_fallback "architecture" "$ARCHITECTURE_PROMPT"
sleep 10

run_analysis_with_fallback "code_quality" "$CODE_QUALITY_PROMPT"
sleep 10

run_analysis_with_fallback "security" "$SECURITY_PROMPT"
sleep 10

run_analysis_with_fallback "dependencies" "$DEPENDENCIES_PROMPT"
sleep 10

run_analysis_with_fallback "performance" "$PERFORMANCE_PROMPT"
sleep 10

# Extract and consolidate scores
echo "Extracting scores from analyses..."
SCORING_FILE="${OUTPUT_DIR}/repository_scoring.md"

# Create the scoring file header
echo "# Repository Scoring Summary" > "$SCORING_FILE"
echo "Repository: Express" >> "$SCORING_FILE"
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
        category=$(echo "$analysis_type" | sed 's/_/ /g' | awk '{for(i=1;i<=NF;i++)sub(/./,toupper(substr($i,1,1)),$i)}1')
        
        # Check if a fallback model was used
        model_used="$PRIMARY_MODEL"
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
        
        # If still not found, use default
        if [ -z "$score" ]; then
            score=5  # Default score
            echo "| $category | $score (default) | $model_used |" >> "$SCORING_FILE"
        else
            echo "| $category | $score | $model_used |" >> "$SCORING_FILE"
            TOTAL_SCORE=$((TOTAL_SCORE + score))
            CATEGORY_COUNT=$((CATEGORY_COUNT + 1))
        fi
    else
        echo "| $category | 5 (analysis failed) | N/A |" >> "$SCORING_FILE"
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

echo "" >> "$SCORING_FILE"
echo "## Strengths" >> "$SCORING_FILE"
echo "" >> "$SCORING_FILE"

# Extract strengths from each analysis
for analysis_type in "${CATEGORIES[@]}"; do
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
for analysis_type in "${CATEGORIES[@]}"; do
    analysis_file="${OUTPUT_DIR}/${analysis_type}_analysis.md"
    if [ -f "$analysis_file" ]; then
        # Look for improvement section
        category=$(echo "$analysis_type" | sed 's/_/ /g' | awk '{for(i=1;i<=NF;i++)sub(/./,toupper(substr($i,1,1)),$i)}1')
        echo "### $category" >> "$SCORING_FILE"
        
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

echo "# Comprehensive Analysis: Express" > "$COMBINED_FILE"
echo "" >> "$COMBINED_FILE"
echo "Generated on: $(date)" >> "$COMBINED_FILE"
echo "Primary Model: $PRIMARY_MODEL with fallback capability" >> "$COMBINED_FILE"
echo "Repository: $REPO_URL" >> "$COMBINED_FILE"
echo "" >> "$COMBINED_FILE"

# Add overall score
if [ $CATEGORY_COUNT -gt 0 ]; then
    echo "## Overall Repository Score: $OVERALL_SCORE / 10" >> "$COMBINED_FILE"
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
echo "Improved fallback scoring complete!"
echo "Individual analysis files are saved in: $OUTPUT_DIR"
echo "Scoring summary: $SCORING_FILE"
echo "Combined report: $COMBINED_FILE"
echo "====================================================="
