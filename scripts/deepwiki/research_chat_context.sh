#!/bin/bash
# DeepWiki Chat Context Mechanism Research Script
# This script investigates how DeepWiki manages repository context for chat

# Base directory
BASE_DIR="/Users/alpinro/Code Prjects/codequal"
OUTPUT_DIR="$BASE_DIR/deepwiki_chat_context_research"
NAMESPACE="codequal-dev"
POD_SELECTOR="deepwiki-fixed"
PORT="8001"
REPO_URL="${1:-https://github.com/expressjs/express}"
QUESTION="${2:-What are the main architectural patterns used in this repository?}"
MODEL="${3:-anthropic/claude-3-opus}"
FALLBACK_MODELS="openai/gpt-4.1,anthropic/claude-3.7-sonnet,openai/gpt-4"

# Create output directory
mkdir -p "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR/logs"
echo "Results will be saved to: $OUTPUT_DIR"

# Initialize log file
LOG_FILE="$OUTPUT_DIR/context_research.log"
echo "$(date): Starting DeepWiki chat context research" > "$LOG_FILE"
echo "Repository: $REPO_URL" >> "$LOG_FILE"
echo "Model: $MODEL" >> "$LOG_FILE"
echo "Question: $QUESTION" >> "$LOG_FILE"
echo "---------------------------------------------------" >> "$LOG_FILE"

# Get the active pod
ACTIVE_POD=$(kubectl get pods -n "$NAMESPACE" | grep "$POD_SELECTOR" | grep Running | head -n 1 | awk '{print $1}')

if [ -z "$ACTIVE_POD" ]; then
  echo "ERROR: No running DeepWiki pod found matching selector: $POD_SELECTOR"
  echo "$(date): ERROR - No running DeepWiki pod found matching selector: $POD_SELECTOR" >> "$LOG_FILE"
  exit 1
fi

echo "Using pod: $ACTIVE_POD"
echo "$(date): Using pod: $ACTIVE_POD" >> "$LOG_FILE"

# Function to log and display messages
log_message() {
    local message="$1"
    echo "$message"
    echo "$(date): $message" >> "$LOG_FILE"
}

# Function to analyze a repository
analyze_repository() {
    local repo_url="$1"
    local analysis_file="${OUTPUT_DIR}/analysis_result.json"
    
    log_message "====================================================="
    log_message "Analyzing repository: $repo_url"
    log_message "====================================================="
    
    # Create request JSON
    local request_file="${OUTPUT_DIR}/analysis_request.json"
    
    cat > "$request_file" << EOF
{
  "repo_url": "$repo_url",
  "messages": [
    {
      "role": "user",
      "content": "Analyze this repository and summarize its main components and architecture."
    }
  ],
  "stream": false,
  "provider": "openrouter",
  "model": "$MODEL",
  "temperature": 0.2
}
EOF
    
    # Set up port forwarding
    log_message "Setting up port forwarding..."
    kubectl port-forward -n "$NAMESPACE" "pod/$ACTIVE_POD" "$PORT:$PORT" &
    PF_PID=$!
    
    # Wait for port forwarding to establish
    sleep 5
    
    # Send analysis request
    log_message "Sending repository analysis request..."
    local start_time=$(date +%s)
    
    curl -s -X POST "http://localhost:$PORT/chat/completions/stream" \
      -H "Content-Type: application/json" \
      -H "Accept: application/json" \
      -o "$analysis_file" \
      -d @"$request_file" \
      --max-time 300
    
    RESULT=$?
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Terminate port forwarding
    kill $PF_PID 2>/dev/null || true
    
    if [ $RESULT -ne 0 ] || [ ! -s "$analysis_file" ] || grep -q "error\|API_KEY\|cannot access\|free variable" "$analysis_file"; then
        log_message "✗ Repository analysis failed"
        return 1
    else
        log_message "✓ Repository analysis successful (took ${duration}s)"
        log_message "Analysis saved to: $analysis_file"
        return 0
    fi
}

# Function to chat with repository context
chat_with_repository() {
    local repo_url="$1"
    local question="$2"
    local output_prefix="$3"
    local model="$MODEL"
    
    log_message "====================================================="
    log_message "Chatting with repository: $repo_url"
    log_message "Question: $question"
    log_message "Context check: $output_prefix"
    log_message "====================================================="
    
    # Create request JSON
    local request_file="${OUTPUT_DIR}/${output_prefix}_request.json"
    local output_file="${OUTPUT_DIR}/${output_prefix}_response.json"
    
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
  "model": "$model",
  "temperature": 0.2
}
EOF
    
    # Set up port forwarding
    log_message "Setting up port forwarding..."
    kubectl port-forward -n "$NAMESPACE" "pod/$ACTIVE_POD" "$PORT:$PORT" &
    PF_PID=$!
    
    # Wait for port forwarding to establish
    sleep 5
    
    # Send chat request
    log_message "Sending chat request..."
    local start_time=$(date +%s)
    
    curl -s -X POST "http://localhost:$PORT/chat/completions/stream" \
      -H "Content-Type: application/json" \
      -H "Accept: application/json" \
      -o "$output_file" \
      -d @"$request_file" \
      --max-time 180
    
    RESULT=$?
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Terminate port forwarding
    kill $PF_PID 2>/dev/null || true
    
    # Process and evaluate the response
    if [ $RESULT -ne 0 ] || [ ! -s "$output_file" ]; then
        log_message "✗ Chat request failed (exit code: $RESULT)"
        echo "ERROR: No response received" > "${OUTPUT_DIR}/${output_prefix}_evaluation.txt"
        return 1
    else
        log_message "Chat request completed (took ${duration}s)"
        
        # Check if response contains error messages
        if grep -q "error\|API_KEY\|cannot access\|free variable" "$output_file"; then
            log_message "✗ Chat response contains errors"
            
            # Extract error message
            local error_msg=$(grep -o '"error":.*' "$output_file" | head -n 1)
            if [ -z "$error_msg" ]; then
                error_msg="Unknown error in response"
            fi
            
            # Create evaluation file with error details
            echo "STATUS: ERROR" > "${OUTPUT_DIR}/${output_prefix}_evaluation.txt"
            echo "ERROR: $error_msg" >> "${OUTPUT_DIR}/${output_prefix}_evaluation.txt"
            echo "DURATION: ${duration}s" >> "${OUTPUT_DIR}/${output_prefix}_evaluation.txt"
            echo "CONTEXT: Likely unavailable or invalid" >> "${OUTPUT_DIR}/${output_prefix}_evaluation.txt"
            
            return 2
        fi
        
        # Extract content if available
        if jq -e '.message .content' "$output_file" > /dev/null 2>&1; then
            # Extract content and save to markdown file
            jq -r '.message .content' "$output_file" > "${OUTPUT_DIR}/${output_prefix}_content.md"
            
            # Analyze response quality
            local content_file="${OUTPUT_DIR}/${output_prefix}_content.md"
            local word_count=$(wc -w < "$content_file")
            local line_count=$(wc -l < "$content_file")
            local file_size=$(du -h "$content_file" | cut -f1)
            
            # Check for repository-specific details
            local repo_specificity="LOW"
            if grep -q -i "express\|middleware\|router\|HTTP\|Node.js" "$content_file"; then
                repo_specificity="HIGH"
            fi
            
            # Create evaluation file with metrics
            echo "STATUS: SUCCESS" > "${OUTPUT_DIR}/${output_prefix}_evaluation.txt"
            echo "WORD_COUNT: $word_count" >> "${OUTPUT_DIR}/${output_prefix}_evaluation.txt"
            echo "LINE_COUNT: $line_count" >> "${OUTPUT_DIR}/${output_prefix}_evaluation.txt"
            echo "FILE_SIZE: $file_size" >> "${OUTPUT_DIR}/${output_prefix}_evaluation.txt"
            echo "DURATION: ${duration}s" >> "${OUTPUT_DIR}/${output_prefix}_evaluation.txt"
            echo "REPO_SPECIFICITY: $repo_specificity" >> "${OUTPUT_DIR}/${output_prefix}_evaluation.txt"
            echo "CONTEXT: Likely available and used" >> "${OUTPUT_DIR}/${output_prefix}_evaluation.txt"
            
            log_message "✓ Chat response successful (Words: $word_count, Specificity: $repo_specificity)"
            return 0
        else
            log_message "✗ Chat response does not contain valid content"
            
            # Create evaluation file with error details
            echo "STATUS: ERROR" > "${OUTPUT_DIR}/${output_prefix}_evaluation.txt"
            echo "ERROR: Response missing expected content field" >> "${OUTPUT_DIR}/${output_prefix}_evaluation.txt"
            echo "DURATION: ${duration}s" >> "${OUTPUT_DIR}/${output_prefix}_evaluation.txt"
            echo "CONTEXT: Unknown status" >> "${OUTPUT_DIR}/${output_prefix}_evaluation.txt"
            
            return 3
        fi
    fi
}

# Function to check pod context storage
check_pod_context_storage() {
    log_message "Checking pod context storage..."
    
    # Get information about pod filesystem
    kubectl exec -n "$NAMESPACE" "$ACTIVE_POD" -- df -h > "${OUTPUT_DIR}/pod_filesystem.txt" 2>&1
    
    # Check for repository-related directories or files
    kubectl exec -n "$NAMESPACE" "$ACTIVE_POD" -- find /app -type d -name "*repo*" -o -name "*git*" -o -name "*context*" > "${OUTPUT_DIR}/pod_repo_dirs.txt" 2>&1
    
    # Check logs for context-related messages
    kubectl logs -n "$NAMESPACE" "$ACTIVE_POD" | grep -i "context\|repo\|git\|scan\|analyze" > "${OUTPUT_DIR}/pod_context_logs.txt" 2>&1
    
    # Check for cache configuration
    kubectl exec -n "$NAMESPACE" "$ACTIVE_POD" -- find /app -type f -name "*.json" -o -name "*.yaml" -o -name "*.conf" | xargs kubectl exec -n "$NAMESPACE" "$ACTIVE_POD" -- grep -l "cache\|ttl\|expir\|timeout" > "${OUTPUT_DIR}/pod_cache_config_files.txt" 2>&1
    
    log_message "Pod context storage information saved to ${OUTPUT_DIR}"
}

# Main research flow
main() {
    log_message "Starting DeepWiki Chat Context Mechanism Research"
    
    # Step 1: Check if pod has context information
    check_pod_context_storage
    
    # Step 2: Test with a repository that may not have been analyzed
    log_message "Testing chat without prior analysis..."
    chat_with_repository "$REPO_URL" "$QUESTION" "no_prior_analysis"
    
    # Step 3: Analyze the repository
    log_message "Analyzing repository to ensure context is available..."
    analyze_repository "$REPO_URL"
    
    # Step 4: Immediate chat after analysis
    log_message "Testing chat immediately after analysis..."
    chat_with_repository "$REPO_URL" "$QUESTION" "immediate_chat"
    
    # Step 5: Wait and try again with increasing intervals
    log_message "Testing context persistence over time..."
    
    # Wait 1 minute
    log_message "Waiting 1 minute..."
    sleep 60
    chat_with_repository "$REPO_URL" "$QUESTION" "after_1min"
    
    # Wait 5 minutes more (total 6 minutes from scan)
    log_message "Waiting 5 more minutes..."
    sleep 300
    chat_with_repository "$REPO_URL" "$QUESTION" "after_6min"
    
    # Step 6: Try with a different but related question to test context
    log_message "Testing with a different question..."
    chat_with_repository "$REPO_URL" "How does the routing system work in this repository?" "different_question"
    
    # Step 7: Try with a different repository without analysis
    log_message "Testing with a different repository that hasn't been analyzed..."
    chat_with_repository "https://github.com/fastify/fastify" "What are the main components of this repository?" "different_repo"
    
    # Step 8: Create research summary
    create_research_summary
    
    log_message "Research completed!"
}

# Function to create research summary
create_research_summary() {
    log_message "Creating research summary..."
    
    local summary_file="${OUTPUT_DIR}/research_summary.md"
    
    cat > "$summary_file" << EOF
# DeepWiki Chat Context Mechanism Research Summary

## Research Overview

This summary documents findings from experiments designed to understand how DeepWiki manages repository context for its chat functionality. The research specifically investigated context persistence, requirements for prior analysis, and error patterns when context is unavailable.

## Repository Tested

- Primary Repository: $REPO_URL
- Alternative Repository: https://github.com/fastify/fastify

## Test Scenarios and Results

### 1. Chat Without Prior Analysis

$(cat "${OUTPUT_DIR}/no_prior_analysis_evaluation.txt" 2>/dev/null || echo "Evaluation not available")

### 2. Repository Analysis

- Analysis Duration: $(grep "took" "${LOG_FILE}" | grep "Repository analysis" | grep -o "[0-9]*s" || echo "Unknown")
- Analysis Success: $(grep "Repository analysis successful" "${LOG_FILE}" > /dev/null && echo "Yes" || echo "No")

### 3. Immediate Chat After Analysis

$(cat "${OUTPUT_DIR}/immediate_chat_evaluation.txt" 2>/dev/null || echo "Evaluation not available")

### 4. Chat After 1 Minute

$(cat "${OUTPUT_DIR}/after_1min_evaluation.txt" 2>/dev/null || echo "Evaluation not available")

### 5. Chat After 6 Minutes

$(cat "${OUTPUT_DIR}/after_6min_evaluation.txt" 2>/dev/null || echo "Evaluation not available")

### 6. Different Question (Same Repository)

$(cat "${OUTPUT_DIR}/different_question_evaluation.txt" 2>/dev/null || echo "Evaluation not available")

### 7. Different Repository (Without Analysis)

$(cat "${OUTPUT_DIR}/different_repo_evaluation.txt" 2>/dev/null || echo "Evaluation not available")

## Context Storage Analysis

### Pod Filesystem Information
$(head -n 10 "${OUTPUT_DIR}/pod_filesystem.txt" 2>/dev/null || echo "Information not available")

### Repository-Related Directories
$(cat "${OUTPUT_DIR}/pod_repo_dirs.txt" 2>/dev/null || echo "Information not available")

### Context-Related Log Messages
$(head -n 10 "${OUTPUT_DIR}/pod_context_logs.txt" 2>/dev/null || echo "Information not available")

### Cache Configuration Files
$(cat "${OUTPUT_DIR}/pod_cache_config_files.txt" 2>/dev/null || echo "Information not available")

## Key Findings

1. **Prior Analysis Requirement**: 
   - ${prior_analysis_required:-"Inconclusive - needs manual review of results"}

2. **Context Persistence**: 
   - ${context_persistence:-"Inconclusive - needs manual review of results"}

3. **Context Storage Location**: 
   - ${context_storage:-"Inconclusive - needs manual review of persistence across tests"}

4. **Error Patterns**: 
   - ${error_patterns:-"Inconclusive - needs manual review of error messages"}

## Recommendations for Production Implementation

Based on these findings, the recommended integration approach is:

1. **Context Availability Check**:
   - Before initiating a chat, check if DeepWiki has context for the repository
   - This can be done by examining error patterns from a test question

2. **Context Creation**:
   - If DeepWiki context is unavailable, check if we have repository analysis in our vector database
   - If vector DB has analysis, consider if/how we can provide this to DeepWiki
   - If no analysis exists, trigger a repository analysis through DeepWiki

3. **Caching Strategy**:
   - Cache repository analyses in our vector database
   - Use DeepWiki's native context for chat when available
   - Refresh context if answers suggest context has expired
   - Document the observed context lifetime for maintenance planning

4. **Error Handling**:
   - Implement clear error messaging when context is unavailable
   - Provide options to users for analysis when needed
   - Document expected wait times for analysis completion

## Next Steps

1. Manual review of the results to confirm context behavior patterns
2. Additional testing with longer time intervals to determine maximum context lifetime
3. Deeper investigation of pod storage to identify context file locations
4. Architecture document update based on confirmed findings
5. Development of context management service for production
EOF
    
    log_message "Research summary created: $summary_file"
}

# Execute the main function
main
