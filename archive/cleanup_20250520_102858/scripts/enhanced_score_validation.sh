#!/bin/bash
# Enhanced Specialized DeepWiki Analysis Script with Scoring
# This script includes improved content extraction for the API response

# Base directory - this ensures all paths are properly resolved
BASE_DIR="/Users/alpinro/Code Prjects/codequal"
cd "$BASE_DIR" || exit 1

# Default parameters
MODEL="anthropic/claude-3-opus"  # Using a model known to work well with complex analysis
NAMESPACE="codequal-dev"
POD_SELECTOR="deepwiki-fixed"
PORT="8001"
OUTPUT_DIR="$BASE_DIR/deepwiki_enhanced_scoring"
TIMEOUT=300  # 5 minutes timeout per analysis
PROMPT_DIR="$BASE_DIR/docs/architecture/Deepwiki/prompts"

# Make sure the prompt directory exists
if [ ! -d "$PROMPT_DIR" ]; then
  echo "ERROR: Prompt directory does not exist: $PROMPT_DIR"
  exit 1
fi

# Target repository - using a smaller repo for faster validation
REPO_URL="https://github.com/expressjs/express"
REPO_NAME=$(basename "$REPO_URL" .git)

# Create output directory
mkdir -p "$OUTPUT_DIR"
echo "Analysis results will be saved to: $OUTPUT_DIR"

# Create the extraction script for API responses
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
    
    # Verify the prompt file exists
    if [ ! -f "$prompt_file" ]; then
      echo "ERROR: Prompt file does not exist: $prompt_file"
      return 1
    fi
    
    # Get the active pod
    ACTIVE_POD=$(kubectl get pods -n "$NAMESPACE" | grep "$POD_SELECTOR" | grep Running | head -n 1 | awk '{print $1}')
    
    if [ -z "$ACTIVE_POD" ]; then
      echo "ERROR: No running DeepWiki pod found matching selector: $POD_SELECTOR"
      return 1
    fi
    
    echo "Using pod: $ACTIVE_POD"
    
    # Read the prompt content - store in variable
    PROMPT=$(cat "$prompt_file")
    
    # Create a separate scoring prompt to avoid issues with escaping
    SCORING_PROMPT="After your analysis, please provide a scoring assessment for this repository.

1. Rate each area on a scale of 1-10 (10 being best):
   - Score each subcategory in your analysis
   - Provide brief justification for each score
   - Identify high, medium, and low priority issues

2. Create a summary table with the following format:
   | Category | Score (1-10) | Key Strengths | Key Issues |
   |----------|--------------|---------------|------------|
   | Category1 | 8 | Strength1, Strength2 | Issue1, Issue2 |

3. Include vector-ready metadata in this JSON format:
\`\`\`json
{
  \"repository\": \"${REPO_NAME}\",
  \"analysis_date\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\",
  \"analysis_type\": \"${prompt_type}\",
  \"scores\": {
    \"overall\": 8,
    \"subcategories\": [
      {\"name\": \"Subcategory1\", \"score\": 9, \"strengths\": [\"Strength1\"], \"issues\": []},
      {\"name\": \"Subcategory2\", \"score\": 7, \"strengths\": [], \"issues\": [\"Issue1\"]}
    ],
    \"issues\": [
      {\"name\": \"Issue1\", \"severity\": \"high\", \"score_impact\": -1, \"file_paths\": [\"/path/file1\"]}
    ]
  }
}
\`\`\`"
    
    # Combine base prompt with scoring prompt
    FULL_PROMPT="${PROMPT}

${SCORING_PROMPT}"
    
    # Write the full prompt to a file for inspection
    echo "$FULL_PROMPT" > "${OUTPUT_DIR}/${prompt_type}_prompt.txt"
    
    # System message specific to the analysis type
    SYSTEM_MSG="You are an expert code analyst specializing in $prompt_type analysis. Provide a detailed, specific analysis with file paths and code examples when possible. Focus on providing concrete examples rather than general observations. End your analysis with a scoring assessment to quantify the strengths and weaknesses you've identified."
    
    # Create a request file with proper JSON formatting
    REQUEST_JSON_FILE="${OUTPUT_DIR}/${prompt_type}_request.json"
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
      "content": "$FULL_PROMPT"
    }
  ],
  "stream": false,
  "provider": "openrouter",
  "model": "$MODEL",
  "temperature": 0.2,
  "max_tokens": 4000
}
EOF
    
    # Set up port forwarding
    echo "Setting up port forwarding to DeepWiki API..."
    kubectl port-forward -n "$NAMESPACE" "pod/$ACTIVE_POD" "$PORT:$PORT" &
    PF_PID=$!
    
    # Wait for port forwarding to establish
    sleep 5
    
    # Execute the analysis
    echo "Running $prompt_type analysis with $MODEL..."
    echo "This may take several minutes. Please be patient."
    
    START_TIME=$(date +%s)
    
    # Path for raw API response
    RAW_RESPONSE="${OUTPUT_DIR}/${prompt_type}_raw_response.json"
    
    # Run with the request file
    curl -X POST "http://localhost:$PORT/chat/completions/stream" \
      -H "Content-Type: application/json" \
      -H "Accept: application/json" \
      -o "$RAW_RESPONSE" \
      --max-time $TIMEOUT \
      -d @"$REQUEST_JSON_FILE"
    
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
    
    # Process the output using our enhanced extraction script
    python3 "${OUTPUT_DIR}/extract_content.py" "$RAW_RESPONSE" "$output_file"
    EXTRACT_RESULT=$?
    
    # Check extraction result
    if [ $EXTRACT_RESULT -ne 0 ]; then
      echo "WARNING: Content extraction had issues. Check the output file for details."
    fi
    
    # Show file size and preview regardless
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

# Create a dependencies prompt file
DEPENDENCIES_PROMPT_FILE="${OUTPUT_DIR}/dependencies_prompt.txt"

mkdir -p "$OUTPUT_DIR"

cat > "$DEPENDENCIES_PROMPT_FILE" << EOF
Perform a dependency-focused analysis of this repository using the following structured format:

## Direct Dependencies
- List all direct dependencies with their versions from package.json or equivalent
- Categorize dependencies by type (runtime, development, peer, etc.)
- Identify each dependency's purpose in the project

## Dependency Management
- Analyze dependency management approach
- Review dependency injection mechanisms
- Evaluate dependency loading and initialization
- Assess lazy loading and dynamic importing strategies

## Dependency Quality
- Identify outdated or deprecated dependencies
- Flag potentially vulnerable dependencies
- Evaluate dependency maintenance status
- Assess compatibility issues or version conflicts

## Dependency Architecture
- Analyze module dependency graph structure
- Identify dependency coupling patterns
- Assess circular dependencies
- Evaluate import/export patterns

## Third-Party Integration
- Review integration patterns with major libraries
- Analyze middleware or plugin systems
- Assess API client implementations
- Evaluate external service integration approaches

## Dependency Optimization
- Identify opportunities for dependency consolidation
- Assess bundle size impact of dependencies
- Review tree-shaking effectiveness
- Evaluate dependency loading performance

## Recommendations
- Dependency update priorities
- Architectural improvements for dependency management
- Replacement suggestions for problematic dependencies
- Testing recommendations for dependency updates

Please provide specific examples with file paths and code snippets where relevant.
EOF

# Create a performance prompt file
PERFORMANCE_PROMPT_FILE="${OUTPUT_DIR}/performance_prompt.txt"

cat > "$PERFORMANCE_PROMPT_FILE" << EOF
Perform a performance-focused analysis of this repository using the following structured format:

## Performance-Critical Areas
- Identify high-traffic or resource-intensive components
- Analyze main execution paths and bottlenecks
- Assess computational complexity of key algorithms
- Evaluate browser/runtime performance considerations

## Resource Management
- Review memory allocation and garbage collection
- Analyze resource pooling and caching strategies
- Evaluate resource cleanup and disposal
- Assess memory leaks and resource exhaustion prevention

## Concurrency & Parallelism
- Analyze threading or async/await patterns
- Evaluate lock usage and synchronization
- Assess race condition prevention
- Review worker or background job implementations

## I/O Performance
- Evaluate database query efficiency
- Analyze network request batching and optimization
- Review file system operations
- Assess API call patterns and optimization

## Rendering & UI Performance
- Analyze render cycles and optimization (if applicable)
- Evaluate UI component efficiency
- Assess animations and transitions
- Review DOM manipulation patterns

## Caching Strategies
- Review data caching implementations
- Analyze cache invalidation strategies
- Evaluate memoization usage
- Assess HTTP caching configuration

## Performance Testing
- Review existing performance tests
- Identify missing performance test areas
- Evaluate performance metrics collection
- Assess performance regression detection

## Optimization Recommendations
- Prioritized performance improvements
- Algorithm optimization opportunities
- Caching implementation suggestions
- Resource management enhancements

Please provide specific examples with file paths and code snippets where relevant.
EOF

# Print script information
echo "====================================================="
echo "Enhanced Specialized DeepWiki Analysis Script with Scoring"
echo "====================================================="
echo "Base directory: $BASE_DIR"
echo "Output directory: $OUTPUT_DIR"
echo "Prompt directory: $PROMPT_DIR"
echo "Repository: $REPO_URL"
echo "====================================================="

# Run a single analysis test first to validate the fix
echo "Running test analysis on architecture..."
run_analysis "$PROMPT_DIR/architecture_prompt.txt" "architecture"

# Check if the test was successful
if [ -f "${OUTPUT_DIR}/architecture_${REPO_NAME}_analysis.md" ]; then
    SIZE=$(du -h "${OUTPUT_DIR}/architecture_${REPO_NAME}_analysis.md" | cut -f1)
    if [ "$SIZE" != "0" ]; then
        echo "Test successful! Continuing with other analyses..."
        
        # Run the remaining analyses with delay between them
        sleep 10
        
        # Code quality analysis
        echo "Running code quality analysis..."
        run_analysis "$PROMPT_DIR/code_quality_prompt.txt" "code_quality"
        sleep 10
        
        # Security analysis
        echo "Running security analysis..."
        run_analysis "$PROMPT_DIR/security_prompt.txt" "security"
        sleep 10
        
        # Dependencies analysis
        echo "Running dependencies analysis..."
        run_analysis "$DEPENDENCIES_PROMPT_FILE" "dependencies"
        sleep 10
        
        # Performance analysis
        echo "Running performance analysis..."
        run_analysis "$PERFORMANCE_PROMPT_FILE" "performance"
    else
        echo "Test analysis produced an empty file. Please check the outputs in $OUTPUT_DIR for errors."
        exit 1
    fi
else
    echo "Test analysis failed. Please check the outputs in $OUTPUT_DIR for errors."
    exit 1
fi

# Create a consolidated scoring file
SCORING_FILE="${OUTPUT_DIR}/repository_scoring_${REPO_NAME}.json"

# Extract scores from each analysis and consolidate them
python3 -c "
import json
import re
import os
from datetime import datetime

output_dir = '$OUTPUT_DIR'
repo_name = '$REPO_NAME'
analysis_types = ['architecture', 'code_quality', 'security', 'dependencies', 'performance']
consolidated_scores = {
    'repository': repo_name,
    'analysis_date': datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
    'overall_score': 0,
    'categories': []
}

def extract_score_from_file(file_path, analysis_type):
    try:
        with open(file_path, 'r') as f:
            content = f.read()
            
        # Try to find the JSON metadata section
        json_pattern = r'\`\`\`json\s*({[^`]*})\s*\`\`\`'
        json_matches = re.findall(json_pattern, content, re.DOTALL)
        
        if json_matches:
            # Extract the JSON data
            for json_str in json_matches:
                try:
                    data = json.loads(json_str)
                    if 'scores' in data:
                        return data
                except json.JSONDecodeError:
                    continue
        
        # If JSON not found, try to extract from the summary table
        table_pattern = r'\|\s*(\w+)\s*\|\s*(\d+)\s*\|'
        table_matches = re.findall(table_pattern, content)
        
        if table_matches:
            scores = {}
            subcategories = []
            overall_score = 0
            count = 0
            
            for category, score in table_matches:
                if category.lower() != 'category' and score.isdigit():  # Skip header row
                    score_value = int(score)
                    subcategories.append({
                        'name': category,
                        'score': score_value
                    })
                    overall_score += score_value
                    count += 1
            
            if count > 0:
                overall_score = round(overall_score / count, 1)
                
            return {
                'analysis_type': analysis_type,
                'scores': {
                    'overall': overall_score,
                    'subcategories': subcategories
                }
            }
        
        # If no structured data found, look for scores in text
        score_pattern = r'(?:overall|total|final)\s+score:?\s*(\d+(?:\.\d+)?)'
        score_matches = re.findall(score_pattern, content.lower())
        
        if score_matches:
            try:
                overall_score = float(score_matches[0])
                return {
                    'analysis_type': analysis_type,
                    'scores': {
                        'overall': overall_score,
                        'subcategories': []
                    }
                }
            except:
                pass
        
        # If no structured data found, return a default score
        return {
            'analysis_type': analysis_type,
            'scores': {
                'overall': 5,  # Default middle score
                'subcategories': []
            }
        }
    except Exception as e:
        print(f'Error extracting score from {file_path}: {str(e)}')
        return {
            'analysis_type': analysis_type,
            'scores': {
                'overall': 5,  # Default middle score
                'subcategories': []
            }
        }

# Process each analysis type
total_score = 0
category_count = 0

for analysis_type in analysis_types:
    file_path = f'{output_dir}/{analysis_type}_{repo_name}_analysis.md'
    if os.path.exists(file_path):
        category_data = extract_score_from_file(file_path, analysis_type)
        if category_data and 'scores' in category_data and 'overall' in category_data['scores']:
            total_score += category_data['scores']['overall']
            category_count += 1
            consolidated_scores['categories'].append(category_data)

# Calculate overall repository score
if category_count > 0:
    consolidated_scores['overall_score'] = round(total_score / category_count, 1)

# Save consolidated scores
with open('$SCORING_FILE', 'w') as f:
    json.dump(consolidated_scores, f, indent=2)

print(f'Consolidated scores saved to {os.path.basename('$SCORING_FILE')}')
print(f'Overall repository score: {consolidated_scores[\"overall_score\"]:.1f}/10')
"

# Create a combined report
COMBINED_FILE="${OUTPUT_DIR}/comprehensive_${REPO_NAME}_analysis.md"

echo "# Comprehensive Repository Analysis: $REPO_NAME" > "$COMBINED_FILE"
echo "" >> "$COMBINED_FILE"
echo "Generated on: $(date)" >> "$COMBINED_FILE"
echo "Model: $MODEL" >> "$COMBINED_FILE"
echo "Repository: $REPO_URL" >> "$COMBINED_FILE"
echo "" >> "$COMBINED_FILE"

# Add scoring summary
if [ -f "$SCORING_FILE" ]; then
    # Extract and display the overall score
    OVERALL_SCORE=$(python3 -c "
import json
try:
    with open('$SCORING_FILE', 'r') as f:
        data = json.load(f)
    print(data['overall_score'])
except Exception as e:
    print('N/A')
")
    
    echo "## Overall Score: $OVERALL_SCORE/10" >> "$COMBINED_FILE"
    echo "" >> "$COMBINED_FILE"
    
    # Create a summary table of category scores
    echo "## Category Scores" >> "$COMBINED_FILE"
    echo "" >> "$COMBINED_FILE"
    echo "| Category | Score |" >> "$COMBINED_FILE"
    echo "|----------|-------|" >> "$COMBINED_FILE"
    
    python3 -c "
import json
try:
    with open('$SCORING_FILE', 'r') as f:
        data = json.load(f)
    
    for category in data['categories']:
        analysis_type = category['analysis_type'].replace('_', ' ').title()
        score = category['scores']['overall']
        print(f'| {analysis_type} | {score} |')
except Exception as e:
    print(f'| Error | N/A |')
" >> "$COMBINED_FILE"
    
    echo "" >> "$COMBINED_FILE"
fi

# Add each analysis section
for analysis_type in "architecture" "code_quality" "security" "dependencies" "performance"; do
    ANALYSIS_FILE="${OUTPUT_DIR}/${analysis_type}_${REPO_NAME}_analysis.md"
    if [ -f "$ANALYSIS_FILE" ]; then
        echo "## $(echo $analysis_type | sed 's/_/ /g' | awk '{for(i=1;i<=NF;i++)sub(/./,toupper(substr($i,1,1)),$i)}1') Analysis" >> "$COMBINED_FILE"
        echo "" >> "$COMBINED_FILE"
        cat "$ANALYSIS_FILE" >> "$COMBINED_FILE"
        echo "" >> "$COMBINED_FILE"
        echo "---" >> "$COMBINED_FILE"
        echo "" >> "$COMBINED_FILE"
    fi
done

echo ""
echo "====================================================="
echo "Enhanced analysis with scoring complete!"
echo "Individual analysis files are saved in: $OUTPUT_DIR"
echo "Combined report: $COMBINED_FILE"
echo "Repository scoring: $SCORING_FILE"
echo "====================================================="
