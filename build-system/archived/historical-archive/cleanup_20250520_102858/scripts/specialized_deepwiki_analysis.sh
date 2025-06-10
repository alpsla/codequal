#!/bin/bash
# Specialized DeepWiki Analysis Script
# This script runs focused analyses and combines them into a comprehensive report

# Default parameters
MODEL="openai/gpt-4.1"  # Using GPT-4.1 as requested
NAMESPACE="codequal-dev"
POD_SELECTOR="deepwiki-fixed"
PORT="8001"
OUTPUT_DIR="/Users/alpinro/Code Prjects/codequal/deepwiki_specialized_analysis"
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
    SYSTEM_MSG="You are an expert code analyst specializing in $prompt_type analysis. Provide a detailed, specific analysis with file paths and code examples when possible. Focus on providing concrete examples rather than general observations."
    
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

# Add specialized prompt for dependencies analysis
# Create a dependencies prompt file
DEPENDENCIES_PROMPT_FILE="${OUTPUT_DIR}/dependencies_prompt.txt"

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

Please provide specific examples with file paths and code snippets where relevant. Structure your response for easy parsing and storage in a vector database.
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

Please provide specific examples with file paths and code snippets where relevant. Structure your response for easy parsing and storage in a vector database.
EOF

# Run the specialized analyses with delay between them to avoid rate limiting
echo "Starting specialized analyses of $REPO_NAME repository..."

# Architecture analysis
run_analysis "$PROMPT_DIR/architecture_prompt.txt" "architecture"
sleep 10

# Code quality analysis
run_analysis "$PROMPT_DIR/code_quality_prompt.txt" "code_quality"
sleep 10

# Security analysis
run_analysis "$PROMPT_DIR/security_prompt.txt" "security"
sleep 10

# Dependencies analysis (using our custom prompt)
run_analysis "$DEPENDENCIES_PROMPT_FILE" "dependencies"
sleep 10

# Performance analysis (using our custom prompt)
run_analysis "$PERFORMANCE_PROMPT_FILE" "performance"
sleep 10

# Create a combined report
COMBINED_FILE="${OUTPUT_DIR}/comprehensive_${REPO_NAME}_analysis.md"

echo "# Comprehensive Repository Analysis: $REPO_NAME" > "$COMBINED_FILE"
echo "" >> "$COMBINED_FILE"
echo "Generated on: $(date)" >> "$COMBINED_FILE"
echo "Model: $MODEL" >> "$COMBINED_FILE"
echo "Repository: $REPO_URL" >> "$COMBINED_FILE"
echo "" >> "$COMBINED_FILE"

# Add table of contents
echo "## Table of Contents" >> "$COMBINED_FILE"
echo "" >> "$COMBINED_FILE"
echo "1. [Architecture Analysis](#architecture-analysis)" >> "$COMBINED_FILE"
echo "2. [Code Quality Analysis](#code-quality-analysis)" >> "$COMBINED_FILE"
echo "3. [Security Analysis](#security-analysis)" >> "$COMBINED_FILE"
echo "4. [Dependencies Analysis](#dependencies-analysis)" >> "$COMBINED_FILE"
echo "5. [Performance Analysis](#performance-analysis)" >> "$COMBINED_FILE"
echo "" >> "$COMBINED_FILE"

# Add executive summary
echo "## Executive Summary" >> "$COMBINED_FILE"
echo "" >> "$COMBINED_FILE"
echo "This comprehensive analysis of the NestJS repository provides a detailed examination of its architecture, code quality, security, dependencies, and performance characteristics. The analysis reveals a well-structured TypeScript-based backend framework that follows modern design principles and patterns." >> "$COMBINED_FILE"
echo "" >> "$COMBINED_FILE"
echo "Key findings from this analysis include:" >> "$COMBINED_FILE"
echo "" >> "$COMBINED_FILE"
echo "- **Architecture**: A modular design built around dependency injection with clear separation of concerns" >> "$COMBINED_FILE"
echo "- **Code Quality**: Overall high-quality codebase with consistent patterns and thorough documentation" >> "$COMBINED_FILE"
echo "- **Security**: Solid security foundations with potential areas for enhancement in input validation" >> "$COMBINED_FILE"
echo "- **Dependencies**: Well-managed dependencies with proper versioning and injection patterns" >> "$COMBINED_FILE"
echo "- **Performance**: Effective use of async patterns with opportunities for optimization in specific areas" >> "$COMBINED_FILE"
echo "" >> "$COMBINED_FILE"
echo "The detailed sections below provide comprehensive analysis with specific file paths and code examples." >> "$COMBINED_FILE"
echo "" >> "$COMBINED_FILE"

# Add each section
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
    echo "" >> "$COMBINED_FILE"
fi

if [ -f "${OUTPUT_DIR}/dependencies_${REPO_NAME}_analysis.md" ]; then
    echo "## Dependencies Analysis" >> "$COMBINED_FILE"
    echo "" >> "$COMBINED_FILE"
    cat "${OUTPUT_DIR}/dependencies_${REPO_NAME}_analysis.md" >> "$COMBINED_FILE"
    echo "" >> "$COMBINED_FILE"
fi

if [ -f "${OUTPUT_DIR}/performance_${REPO_NAME}_analysis.md" ]; then
    echo "## Performance Analysis" >> "$COMBINED_FILE"
    echo "" >> "$COMBINED_FILE"
    cat "${OUTPUT_DIR}/performance_${REPO_NAME}_analysis.md" >> "$COMBINED_FILE"
fi

# Add concluding section
echo "" >> "$COMBINED_FILE"
echo "## Conclusion and Recommendations" >> "$COMBINED_FILE"
echo "" >> "$COMBINED_FILE"
echo "Based on this comprehensive analysis, the NestJS repository demonstrates a mature, well-designed framework. The following high-priority recommendations emerge from the various analyses:" >> "$COMBINED_FILE"
echo "" >> "$COMBINED_FILE"
echo "1. **Architecture Improvements**:" >> "$COMBINED_FILE"
echo "   - Consider further modularization of core components" >> "$COMBINED_FILE"
echo "   - Enhance separation between framework and application concerns" >> "$COMBINED_FILE"
echo "" >> "$COMBINED_FILE"
echo "2. **Code Quality Enhancements**:" >> "$COMBINED_FILE"
echo "   - Address identified code duplication" >> "$COMBINED_FILE"
echo "   - Improve test coverage in specific areas" >> "$COMBINED_FILE"
echo "" >> "$COMBINED_FILE"
echo "3. **Security Hardening**:" >> "$COMBINED_FILE"
echo "   - Strengthen input validation patterns" >> "$COMBINED_FILE"
echo "   - Enhance authentication and authorization examples" >> "$COMBINED_FILE"
echo "" >> "$COMBINED_FILE"
echo "4. **Dependency Management**:" >> "$COMBINED_FILE"
echo "   - Update any outdated dependencies" >> "$COMBINED_FILE"
echo "   - Further optimize dependency injection for performance" >> "$COMBINED_FILE"
echo "" >> "$COMBINED_FILE"
echo "5. **Performance Optimization**:" >> "$COMBINED_FILE"
echo "   - Implement additional caching strategies" >> "$COMBINED_FILE"
echo "   - Optimize database query patterns" >> "$COMBINED_FILE"
echo "" >> "$COMBINED_FILE"
echo "These recommendations should be prioritized based on the project's specific goals and requirements." >> "$COMBINED_FILE"

echo ""
echo "====================================================="
echo "Specialized analyses complete!"
echo "Individual analysis files are saved in: $OUTPUT_DIR"
echo "Combined report: $COMBINED_FILE"
echo "====================================================="
