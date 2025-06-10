#!/bin/bash
# Project cleanup and reorganization script
# This script reorganizes the CodeQual project structure for better maintainability

# Base directory
BASE_DIR="/Users/alpinro/Code Prjects/codequal"
cd "$BASE_DIR" || exit 1

# Timestamp for reports
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORTS_DIR="$BASE_DIR/reports/report_$TIMESTAMP"
ARCHIVE_DIR="$BASE_DIR/archive/cleanup_$TIMESTAMP"
SCRIPTS_DIR="$BASE_DIR/scripts"
DOCS_DIR="$BASE_DIR/docs/guides"

# Create directories
mkdir -p "$REPORTS_DIR"
mkdir -p "$ARCHIVE_DIR"
mkdir -p "$SCRIPTS_DIR"
mkdir -p "$DOCS_DIR"

echo "Starting project cleanup and reorganization..."

# Step 1: Move all current reports to timestamped archive
echo "Archiving current reports..."
find "$BASE_DIR" -name "*analysis.md" -o -name "*_report.md" -o -name "*scoring*.md" -o -name "comprehensive_*.md" | while read file; do
    destination="$ARCHIVE_DIR/reports/$(basename "$file")"
    mkdir -p "$(dirname "$destination")"
    cp "$file" "$destination"
done

# Step 2: Archive old scripts
echo "Archiving old scripts..."
find "$BASE_DIR" -name "*.sh" -not -path "*/node_modules/*" | while read file; do
    destination="$ARCHIVE_DIR/scripts/$(basename "$file")"
    mkdir -p "$(dirname "$destination")"
    cp "$file" "$destination"
done

# Step 3: Archive old session summaries
echo "Archiving session summaries..."
mkdir -p "$ARCHIVE_DIR/session-summaries"
if [ -d "$BASE_DIR/docs/session-summaries" ]; then
    cp -r "$BASE_DIR/docs/session-summaries/"* "$ARCHIVE_DIR/session-summaries/"
fi

# Step 4: Archive temporary directories
echo "Archiving temporary output directories..."
find "$BASE_DIR" -type d -name "deepwiki_*" -o -name "*_scoring" | while read dir; do
    if [ -d "$dir" ]; then
        destination="$ARCHIVE_DIR/output_dirs/$(basename "$dir")"
        mkdir -p "$destination"
        cp -r "$dir/"* "$destination/" 2>/dev/null || true
    fi
done

# Step 5: Create clean, organized structure with essential scripts
echo "Creating organized script structure..."

# Core script for repository analysis
cat > "$SCRIPTS_DIR/analyze_repository.sh" << 'ENDANALYZE'
#!/bin/bash
# CodeQual Repository Analysis Script
# Usage: ./analyze_repository.sh <repository_url> [model_name]

# Default parameters
REPO_URL="${1:-https://github.com/expressjs/express}"
MODEL="${2:-anthropic/claude-3-opus}"
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
    local fallback_models=("openai/gpt-4.1" "anthropic/claude-3.7-sonnet" "openai/gpt-4")
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
          
          curl -s -X POST "http://localhost:$PORT/chat/completions/stream" \
            -H "Content-Type: application/json" \
            -H "Accept: application/json" \
            -o "$fallback_response" \
            -d @"$request_file" \
            --max-time 300
          
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
echo "Starting specialized analyses of $REPO_NAME repository..."
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
ENDANALYZE

chmod +x "$SCRIPTS_DIR/analyze_repository.sh"

# Simpler script for quick test runs
cat > "$SCRIPTS_DIR/quick_test.sh" << 'ENDTEST'
#!/bin/bash
# Quick test script for CodeQual
# Tests the DeepWiki OpenRouter integration with a minimal request

BASE_DIR="/Users/alpinro/Code Prjects/codequal"
NAMESPACE="codequal-dev"
POD_SELECTOR="deepwiki-fixed"
PORT="8001"
OUTPUT_DIR="$BASE_DIR/reports/quick_test_$(date +%Y%m%d_%H%M%S)"
REPO_URL="${1:-https://github.com/expressjs/express}"
MODEL="${2:-openai/gpt-3.5-turbo}"  # Using a fast model for quick testing

mkdir -p "$OUTPUT_DIR"

# Get the active pod
ACTIVE_POD=$(kubectl get pods -n "$NAMESPACE" | grep "$POD_SELECTOR" | grep Running | head -n 1 | awk '{print $1}')

if [ -z "$ACTIVE_POD" ]; then
  echo "ERROR: No running DeepWiki pod found matching selector: $POD_SELECTOR"
  exit 1
fi

# Create a simple request
REQUEST_FILE="$OUTPUT_DIR/test_request.json"
cat > "$REQUEST_FILE" << EOF
{
  "repo_url": "$REPO_URL",
  "messages": [
    {
      "role": "user",
      "content": "Briefly describe what this repository does and its main features."
    }
  ],
  "stream": false,
  "provider": "openrouter",
  "model": "$MODEL",
  "temperature": 0.2
}
EOF

# Set up port forwarding
kubectl port-forward -n "$NAMESPACE" "pod/$ACTIVE_POD" "$PORT:$PORT" &
PF_PID=$!

# Wait for port forwarding to establish
sleep 5

# Send the request
RESPONSE_FILE="$OUTPUT_DIR/test_response.txt"
curl -s -X POST "http://localhost:$PORT/chat/completions/stream" \
  -H "Content-Type: application/json" \
  -o "$RESPONSE_FILE" \
  -d @"$REQUEST_FILE"

# Terminate port forwarding
kill $PF_PID 2>/dev/null || true

# Check results
if [ -f "$RESPONSE_FILE" ] && [ -s "$RESPONSE_FILE" ]; then
  echo "Test successful! Response saved to $RESPONSE_FILE"
  echo ""
  echo "Response preview:"
  cat "$RESPONSE_FILE"
else
  echo "Test failed. No response received."
  exit 1
fi
ENDTEST

chmod +x "$SCRIPTS_DIR/quick_test.sh"

# Create documentation for the scripts
mkdir -p "$DOCS_DIR"

cat > "$DOCS_DIR/repository_analysis.md" << 'ENDDOC'
# Repository Analysis Guide

This document explains how to use the CodeQual repository analysis tools.

## Quick Start

To analyze a repository:

```bash
./scripts/analyze_repository.sh <repository_url> [model_name]
```

Example:
```bash
./scripts/analyze_repository.sh https://github.com/expressjs/express anthropic/claude-3-opus
```

## Analysis Process

The script performs the following analyses:

1. **Architecture Analysis**: Evaluates the overall design patterns, code organization, component relationships, and modularity.
2. **Code Quality Analysis**: Assesses code style, error handling, documentation, and testing approach.
3. **Security Analysis**: Reviews input handling, authentication, data protection, and error handling from a security perspective.
4. **Dependencies Analysis**: Examines direct dependencies, dependency management, third-party integration, and dependency quality.
5. **Performance Analysis**: Analyzes resource usage, optimization techniques, concurrency handling, and caching strategies.

Each analysis is given a score from 1-10, and these scores are combined to create an overall repository score.

## Output Files

The script generates several output files in a timestamped directory under `/reports`:

- `architecture_analysis.md`: Architecture analysis results
- `code_quality_analysis.md`: Code quality analysis results
- `security_analysis.md`: Security analysis results
- `dependencies_analysis.md`: Dependencies analysis results
- `performance_analysis.md`: Performance analysis results
- `repository_scoring.md`: Summary of scores across all categories
- `comprehensive_analysis.md`: Combined report with all analyses

A symlink to the latest report is created at `/reports/latest` for easy access.

## Fallback Mechanism

The script includes a fallback mechanism that automatically tries alternative models if the primary model fails. The fallback sequence is:

1. Primary model (specified or default)
2. openai/gpt-4.1
3. anthropic/claude-3.7-sonnet
4. openai/gpt-4

## Testing the Integration

To quickly test if the DeepWiki OpenRouter integration is working:

```bash
./scripts/quick_test.sh [repository_url] [model_name]
```

This script sends a minimal request and displays the response, which is useful for troubleshooting.
ENDDOC

# Create a README file in the project root
cat > "$BASE_DIR/README.md" << 'ENDREADME'
# CodeQual

A comprehensive code quality analysis system powered by AI.

## Directory Structure

- `/scripts`: Core scripts for repository analysis and testing
- `/reports`: Generated analysis reports (timestamped)
- `/docs`: Documentation and guides
- `/archive`: Archived files from previous versions

## Getting Started

1. Run a quick test to verify the integration is working:
   ```bash
   ./scripts/quick_test.sh
   ```

2. Analyze a repository:
   ```bash
   ./scripts/analyze_repository.sh <repository_url> [model_name]
   ```
   
3. View the latest report:
   ```bash
   open ./reports/latest/comprehensive_analysis.md
   ```

## Documentation

For detailed documentation, see:

- [Repository Analysis Guide](./docs/guides/repository_analysis.md)

## Architecture

CodeQual uses a multi-agent approach with fallback capabilities to analyze repositories across multiple dimensions:

- Architecture
- Code Quality
- Security
- Dependencies
- Performance

Each analysis produces a score from 1-10, which are combined to create an overall repository score.
ENDREADME

# Step 6: Create a cleanup summary
SUMMARY_FILE="$BASE_DIR/cleanup_summary.md"

cat > "$SUMMARY_FILE" << EOF
# Project Cleanup Summary

Date: $(date)

## Actions Performed

1. Archived old reports to: $ARCHIVE_DIR/reports
2. Archived old scripts to: $ARCHIVE_DIR/scripts
3. Archived old session summaries to: $ARCHIVE_DIR/session-summaries
4. Archived temporary output directories to: $ARCHIVE_DIR/output_dirs
5. Created organized script structure in: $SCRIPTS_DIR
6. Created documentation in: $DOCS_DIR
7. Created a timestamped reports directory structure: $REPORTS_DIR
8. Updated README file with new project structure

## Key Scripts

1. **Repository Analysis Script**: $SCRIPTS_DIR/analyze_repository.sh
   - Performs comprehensive repository analysis
   - Generates reports with architecture, code quality, security, dependencies, and performance analyses
   - Includes fallback mechanism for model reliability
   - Creates timestamped reports

2. **Quick Test Script**: $SCRIPTS_DIR/quick_test.sh
   - Tests the DeepWiki OpenRouter integration
   - Uses a minimal request for quick verification

## New Directory Structure

- /scripts: Core scripts for repository analysis
- /reports: Generated analysis reports (timestamped)
- /docs: Documentation and guides
- /archive: Archived files from previous versions

## Usage

To analyze a repository:
\`\`\`bash
./scripts/analyze_repository.sh <repository_url> [model_name]
\`\`\`

The latest report is always available at: ./reports/latest
EOF

echo "Project cleanup and reorganization complete!"
echo "Cleanup summary saved to: $SUMMARY_FILE"
echo ""
echo "New directory structure:"
echo "- /scripts: Core scripts for repository analysis"
echo "- /reports: Generated analysis reports (timestamped)"
echo "- /docs: Documentation and guides"
echo "- /archive: Archived files from previous versions"
echo ""
echo "To analyze a repository, run:"
echo "./scripts/analyze_repository.sh <repository_url> [model_name]"
