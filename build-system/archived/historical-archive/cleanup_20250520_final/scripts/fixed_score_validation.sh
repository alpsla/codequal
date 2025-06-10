#!/bin/bash
# Fixed Specialized DeepWiki Analysis Script with Scoring
# This script addresses JSON formatting issues in the API request

# Base directory - this ensures all paths are properly resolved
BASE_DIR="/Users/alpinro/Code Prjects/codequal"
cd "$BASE_DIR" || exit 1

# Default parameters
MODEL="anthropic/claude-3-opus"  # Using a model known to work well with complex analysis
NAMESPACE="codequal-dev"
POD_SELECTOR="deepwiki-fixed"
PORT="8001"
OUTPUT_DIR="$BASE_DIR/deepwiki_score_validation"
TIMEOUT=300  # 5 minutes timeout per analysis
PROMPT_DIR="$BASE_DIR/docs/architecture/Deepwiki/prompts"

# Make sure the prompt directory exists
if [ ! -d "$PROMPT_DIR" ]; then
  echo "ERROR: Prompt directory does not exist: $PROMPT_DIR"
  exit 1
fi

# Target repository - using React for validation
REPO_URL="https://github.com/facebook/react"
REPO_NAME=$(basename "$REPO_URL" .git)

# Create output directory
mkdir -p "$OUTPUT_DIR"
echo "Analysis results will be saved to: $OUTPUT_DIR"

# Function to run a specific analysis with fixed JSON formatting
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
    
    # Set up port forwarding
    echo "Setting up port forwarding to DeepWiki API..."
    kubectl port-forward -n "$NAMESPACE" "pod/$ACTIVE_POD" "$PORT:$PORT" &
    PF_PID=$!
    
    # Wait for port forwarding to establish
    sleep 5
    
    # Create a temporary JSON file for the request payload
    REQUEST_JSON_FILE="${OUTPUT_DIR}/${prompt_type}_request.json"
    
    # Create the request JSON with proper formatting
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
    
    echo "Using request file: $REQUEST_JSON_FILE"
    
    # Execute the analysis
    echo "Running $prompt_type analysis with $MODEL..."
    echo "This may take several minutes. Please be patient."
    
    START_TIME=$(date +%s)
    
    # Use a temporary file for the response
    TEMP_FILE=$(mktemp)
    
    # Run with the request file instead of inline JSON
    curl -X POST "http://localhost:$PORT/chat/completions/stream" \
      -H "Content-Type: application/json" \
      -H "Accept: application/json" \
      -o "$TEMP_FILE" \
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
      
      # Save the error response if there is any content
      if [ -s "$TEMP_FILE" ]; then
        cp "$TEMP_FILE" "${OUTPUT_DIR}/${prompt_type}_error_response.json"
        echo "Error response saved to: ${OUTPUT_DIR}/${prompt_type}_error_response.json"
        echo "Error content preview:"
        head -n 20 "$TEMP_FILE"
      fi
      
      return 1
    fi
    
    echo "$prompt_type analysis complete! Took ${DURATION} seconds."
    
    # Save the raw response for debugging
    cp "$TEMP_FILE" "${OUTPUT_DIR}/${prompt_type}_raw_response.json"
    
    # Process the output - extract content from JSON
    python3 -c "
import json
import sys
import re
import os

try:
    with open('$TEMP_FILE', 'r') as f:
        content = f.read()
    
    print(f'Processing response content ({len(content)} bytes)')
    
    # Save the raw content for debugging
    with open('${OUTPUT_DIR}/${prompt_type}_debug_content.txt', 'w') as debug_file:
        debug_file.write(content)
    
    # Check if it looks like valid JSON
    if content.strip().startswith('{') and '}' in content:
        try:
            data = json.loads(content)
            print('Successfully parsed as JSON')
            
            # Check various JSON structures
            extracted = None
            if 'choices' in data and len(data['choices']) > 0:
                if 'message' in data['choices'][0] and 'content' in data['choices'][0]['message']:
                    extracted = data['choices'][0]['message']['content']
                    print('Extracted from choices[0].message.content')
            elif 'choices' in data and len(data['choices']) > 0:
                if 'text' in data['choices'][0]:
                    extracted = data['choices'][0]['text']
                    print('Extracted from choices[0].text')
            elif 'message' in data:
                if 'content' in data['message']:
                    extracted = data['message']['content']
                    print('Extracted from message.content')
            elif 'content' in data:
                extracted = data['content']
                print('Extracted from content')
            elif 'response' in data:
                extracted = data['response']
                print('Extracted from response')
            elif 'text' in data:
                extracted = data['text']
                print('Extracted from text')
                
            if extracted:
                with open('$output_file', 'w') as out:
                    out.write(extracted)
                print('Successfully extracted and saved content')
            else:
                # If couldn't extract using standard paths, just save the whole JSON
                with open('$output_file', 'w') as out:
                    json_string = json.dumps(data, indent=2)
                    out.write(f'```json\n{json_string}\n```\n\nRaw API Response (debugging output)')
                print('Saved full JSON content for debugging')
        except json.JSONDecodeError as e:
            # If it's not valid JSON, try other formats
            print(f'Invalid JSON: {str(e)}')
            print('Trying other formats')
            
            # If it looks like Markdown, save directly
            if '## ' in content or '# ' in content:
                with open('$output_file', 'w') as out:
                    out.write(content)
                print('Saved content as Markdown')
            else:
                # Try to extract any readable content
                with open('$output_file', 'w') as out:
                    out.write(content)
                print('Saved raw content')
    else:
        # If it doesn't look like JSON, save as is
        with open('$output_file', 'w') as out:
            out.write(content)
        print('Saved raw content')
        
    # Verify the output file was created and has content
    if os.path.exists('$output_file'):
        size = os.path.getsize('$output_file')
        print(f'Output file created: {size} bytes')
    else:
        print('WARNING: Output file was not created')
        
except Exception as e:
    print(f'Error processing content: {str(e)}')
    # Save raw content as fallback
    try:
        with open('$TEMP_FILE', 'r') as f:
            content = f.read()
        with open('$output_file', 'w') as out:
            out.write(f'Error processing: {str(e)}\n\n--- Raw Content ---\n\n{content}')
        print('Saved raw content as fallback with error message')
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
echo "Fixed Specialized DeepWiki Analysis Script with Scoring"
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
                overall_score = overall_score / count
                
            return {
                'analysis_type': analysis_type,
                'scores': {
                    'overall': overall_score,
                    'subcategories': subcategories
                }
            }
        
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

echo ""
echo "====================================================="
echo "Analysis completed!"
echo "Results saved to: $OUTPUT_DIR"
echo "Repository scoring: $SCORING_FILE"
echo "====================================================="
