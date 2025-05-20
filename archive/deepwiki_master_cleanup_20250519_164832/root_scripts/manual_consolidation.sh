#!/bin/bash
# Manual consolidation script that uses existing raw responses
# This script bypasses API calls and directly uses content from previous runs

# Base directory
BASE_DIR="/Users/alpinro/Code Prjects/codequal"
cd "$BASE_DIR" || exit 1

# Source and destination directories
SOURCE_DIR="$BASE_DIR/deepwiki_enhanced_scoring"
OUTPUT_DIR="$BASE_DIR/deepwiki_manual_consolidation"

# Create output directory
mkdir -p "$OUTPUT_DIR"
echo "Results will be saved to: $OUTPUT_DIR"

# Function to extract best available content for a category
extract_best_content() {
    local category="$1"
    local output_file="${OUTPUT_DIR}/${category}_analysis.md"
    local model_used="unknown"
    
    echo "Processing $category analysis..."
    
    # First try existing analysis file
    if [ -f "${SOURCE_DIR}/${category}_analysis.md" ]; then
        # Check if it's a failure placeholder
        if grep -q "Analysis - Failed" "${SOURCE_DIR}/${category}_analysis.md"; then
            echo "Existing analysis is a failure placeholder, looking for raw responses..."
        else
            # Use the existing analysis
            cp "${SOURCE_DIR}/${category}_analysis.md" "$output_file"
            echo "✓ Used existing analysis file for $category"
            return 0
        fi
    fi
    
    # Try raw files from different models
    local models=("anthropic/claude-3-opus" "openai/gpt-4.1" "anthropic/claude-3.7-sonnet" "openai/gpt-4")
    
    for model in "${models[@]}"; do
        model_file="${model//\//_}"
        raw_file="${SOURCE_DIR}/${category}_${model_file}_raw.txt"
        
        if [ -f "$raw_file" ] && [ -s "$raw_file" ]; then
            # Check if file contains actual text content and not just JSON error
            if grep -q "score\|Score\|[0-9]/10\|[0-9] out of 10" "$raw_file" || [ "$(wc -l < "$raw_file")" -gt 5 ]; then
                echo "✓ Found usable content in raw response from $model"
                cp "$raw_file" "$output_file"
                model_used="$model"
                
                # Add a note about which model was used
                temp_file="${OUTPUT_DIR}/temp_$$.md"
                echo "> Note: This analysis was performed with model: $model" > "$temp_file"
                echo "" >> "$temp_file"
                cat "$output_file" >> "$temp_file"
                mv "$temp_file" "$output_file"
                
                return 0
            fi
        fi
    done
    
    # If no valid content found, create a placeholder
    echo "✗ No valid content found for $category, creating placeholder"
    echo "# $category Analysis" > "$output_file"
    echo "" >> "$output_file"
    echo "No valid analysis content could be found for this category." >> "$output_file"
    echo "" >> "$output_file"
    echo "## Score" >> "$output_file"
    echo "" >> "$output_file"
    echo "Default score: 5/10" >> "$output_file"
    
    return 1
}

# Process each category
CATEGORIES=("architecture" "code_quality" "security" "dependencies" "performance")

for category in "${CATEGORIES[@]}"; do
    extract_best_content "$category"
done

# Extract and consolidate scores
echo "Creating scoring summary..."
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

for category in "${CATEGORIES[@]}"; do
    analysis_file="${OUTPUT_DIR}/${category}_analysis.md"
    if [ -f "$analysis_file" ]; then
        # Format the category name for display
        display_name=$(echo "$category" | sed 's/_/ /g' | awk '{for(i=1;i<=NF;i++)sub(/./,toupper(substr($i,1,1)),$i)}1')
        
        # Check if a specific model was used
        model_used="Unknown"
        if grep -q "performed with model:" "$analysis_file"; then
            model_note=$(grep "performed with model:" "$analysis_file")
            model_used=$(echo "$model_note" | sed 's/.*model: \(.*\)/\1/')
        fi
        
        # Look for the score - try multiple patterns
        score=""
        
        # Pattern 1: Look for score: X/10 or score: X out of 10
        score_line=$(grep -i "score.*[0-9]/10\|score.*[0-9] out of 10\|overall.*score.*[0-9]" "$analysis_file" | head -n 1)
        if [ -n "$score_line" ]; then
            score=$(echo "$score_line" | grep -o -E '[0-9]+' | head -n 1)
        fi
        
        # Pattern 2: Look for "Score: X" format
        if [ -z "$score" ]; then
            score_line=$(grep -i "score:.*[0-9]" "$analysis_file" | head -n 1)
            if [ -n "$score_line" ]; then
                score=$(echo "$score_line" | grep -o -E '[0-9]+' | head -n 1)
            fi
        fi
        
        # Pattern 3: Look for numbers near "score"
        if [ -z "$score" ]; then
            score_line=$(grep -i -A1 -B1 "score" "$analysis_file" | grep -o -E '[0-9]+' | head -n 1)
            score=$score_line
        fi
        
        # If still not found, check for default score text
        if [ -z "$score" ]; then
            if grep -q "Default score: " "$analysis_file"; then
                score_line=$(grep "Default score: " "$analysis_file")
                score=$(echo "$score_line" | grep -o -E '[0-9]+' | head -n 1)
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
for category in "${CATEGORIES[@]}"; do
    analysis_file="${OUTPUT_DIR}/${category}_analysis.md"
    if [ -f "$analysis_file" ]; then
        # Look for strengths section
        display_name=$(echo "$category" | sed 's/_/ /g' | awk '{for(i=1;i<=NF;i++)sub(/./,toupper(substr($i,1,1)),$i)}1')
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
for category in "${CATEGORIES[@]}"; do
    analysis_file="${OUTPUT_DIR}/${category}_analysis.md"
    if [ -f "$analysis_file" ]; then
        # Look for improvement section
        display_name=$(echo "$category" | sed 's/_/ /g' | awk '{for(i=1;i<=NF;i++)sub(/./,toupper(substr($i,1,1)),$i)}1')
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

echo "# Comprehensive Analysis: Express" > "$COMBINED_FILE"
echo "" >> "$COMBINED_FILE"
echo "Generated on: $(date)" >> "$COMBINED_FILE"
echo "Repository: Express.js" >> "$COMBINED_FILE"
echo "" >> "$COMBINED_FILE"

# Add overall score from scoring file
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
for category in "${CATEGORIES[@]}"; do
    ANALYSIS_FILE="${OUTPUT_DIR}/${category}_analysis.md"
    if [ -f "$ANALYSIS_FILE" ]; then
        display_name=$(echo "$category" | sed 's/_/ /g' | awk '{for(i=1;i<=NF;i++)sub(/./,toupper(substr($i,1,1)),$i)}1')
        echo "## $display_name Analysis" >> "$COMBINED_FILE"
        echo "" >> "$COMBINED_FILE"
        
        # Skip the model note line if it exists (it's already in the scoring table)
        if grep -q "performed with model:" "$ANALYSIS_FILE"; then
            grep -v "performed with model:" "$ANALYSIS_FILE" >> "$COMBINED_FILE"
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
echo "Manual consolidation complete!"
echo "Individual analysis files are saved in: $OUTPUT_DIR"
echo "Scoring summary: $SCORING_FILE"
echo "Combined report: $COMBINED_FILE"
echo "====================================================="
