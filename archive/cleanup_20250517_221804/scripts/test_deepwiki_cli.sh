#!/bin/bash
# DeepWiki CLI Command Tester
# This script helps with systematically testing and documenting DeepWiki CLI commands
# Created: May 16, 2025

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if jq is installed for JSON formatting
JQ_AVAILABLE=false
if command -v jq &> /dev/null; then
    JQ_AVAILABLE=true
fi

# Default values
NAMESPACE=""
POD_NAME=""
CONTAINER_NAME=""
RESULTS_DIR="deepwiki_cli_test_results_$(date +%Y%m%d_%H%M%S)"
TEST_REPO="https://github.com/AsyncFuncAI/deepwiki-open"
TEST_MODE="comprehensive"
PROVIDER=""
MODEL=""
TIMEOUT=600  # 10 minutes

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -n|--namespace)
      NAMESPACE="$2"
      shift 2
      ;;
    -p|--pod)
      POD_NAME="$2"
      shift 2
      ;;
    -c|--container)
      CONTAINER_NAME="$2"
      shift 2
      ;;
    -r|--repo)
      TEST_REPO="$2"
      shift 2
      ;;
    -m|--mode)
      TEST_MODE="$2"
      shift 2
      ;;
    --provider)
      PROVIDER="$2"
      shift 2
      ;;
    --model)
      MODEL="$2"
      shift 2
      ;;
    -o|--output)
      RESULTS_DIR="$2"
      shift 2
      ;;
    -t|--timeout)
      TIMEOUT="$2"
      shift 2
      ;;
    -h|--help)
      echo "DeepWiki CLI Command Tester"
      echo ""
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  -n, --namespace NAMESPACE     Kubernetes namespace"
      echo "  -p, --pod POD_NAME            DeepWiki pod name"
      echo "  -c, --container CONTAINER     Container name"
      echo "  -r, --repo REPO_URL           Repository URL to test (default: deepwiki-open)"
      echo "  -m, --mode MODE               Analysis mode: comprehensive or concise (default: comprehensive)"
      echo "  --provider PROVIDER           Provider to use (e.g., openrouter, google)"
      echo "  --model MODEL                 Model to use"
      echo "  -o, --output DIR              Results directory (default: timestamped directory)"
      echo "  -t, --timeout SECONDS         Timeout in seconds (default: 600)"
      echo "  -h, --help                    Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Create results directory
mkdir -p "$RESULTS_DIR"
echo -e "${BLUE}=== DeepWiki CLI Command Tester ===${NC}"
echo -e "Results will be saved to: ${YELLOW}$RESULTS_DIR${NC}"

# Auto-detect if values not provided
if [[ -z "$NAMESPACE" || -z "$POD_NAME" || -z "$CONTAINER_NAME" ]]; then
    echo -e "${YELLOW}Some parameters not provided. Attempting auto-detection...${NC}"
    
    # Find DeepWiki pods
    PODS_OUTPUT=$(kubectl get pods -A 2>&1 | grep -i deepwiki || true)
    
    if [[ -z "$PODS_OUTPUT" ]]; then
        echo -e "${RED}No DeepWiki pods found in the cluster!${NC}"
        echo "Please specify the namespace, pod name, and container manually."
        exit 1
    else
        echo -e "${GREEN}DeepWiki pods found:${NC}"
        echo "$PODS_OUTPUT"
        
        # Use the first pod if not specified
        if [[ -z "$NAMESPACE" ]]; then
            NAMESPACE=$(echo "$PODS_OUTPUT" | head -1 | awk '{print $1}')
            echo -e "Using namespace: ${YELLOW}$NAMESPACE${NC}"
        fi
        
        if [[ -z "$POD_NAME" ]]; then
            POD_NAME=$(echo "$PODS_OUTPUT" | head -1 | awk '{print $2}')
            echo -e "Using pod: ${YELLOW}$POD_NAME${NC}"
        fi
        
        # Get container name if not specified
        if [[ -z "$CONTAINER_NAME" ]]; then
            CONTAINERS=$(kubectl get pod "$POD_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.containers[*].name}' 2>&1)
            CONTAINER_NAME=$(echo "$CONTAINERS" | awk '{print $1}')
            echo -e "Using container: ${YELLOW}$CONTAINER_NAME${NC}"
        fi
    fi
fi

# Verify that the pod and container exist
echo -e "\n${GREEN}Verifying pod and container...${NC}"
if ! kubectl get pod "$POD_NAME" -n "$NAMESPACE" &>/dev/null; then
    echo -e "${RED}Pod $POD_NAME not found in namespace $NAMESPACE${NC}"
    exit 1
fi

CONTAINERS=$(kubectl get pod "$POD_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.containers[*].name}' 2>&1)
if ! echo "$CONTAINERS" | grep -qw "$CONTAINER_NAME"; then
    echo -e "${RED}Container $CONTAINER_NAME not found in pod $POD_NAME${NC}"
    echo -e "Available containers: ${YELLOW}$CONTAINERS${NC}"
    exit 1
fi

echo -e "${GREEN}Pod and container verified.${NC}"

# Save test parameters
cat > "$RESULTS_DIR/test_parameters.json" << EOF
{
  "namespace": "$NAMESPACE",
  "pod_name": "$POD_NAME",
  "container_name": "$CONTAINER_NAME",
  "test_repository": "$TEST_REPO",
  "test_mode": "$TEST_MODE",
  "provider": "$PROVIDER",
  "model": "$MODEL",
  "timeout": $TIMEOUT,
  "timestamp": "$(date)"
}
EOF

echo -e "\n${BLUE}Test parameters saved to ${YELLOW}$RESULTS_DIR/test_parameters.json${NC}"

# Function to execute command in pod and save output
execute_command() {
  local command="$1"
  local output_file="$2"
  local description="$3"
  local timeout="$4"
  
  echo -e "\n${GREEN}$description${NC}"
  echo -e "Command: ${YELLOW}$command${NC}"
  echo -e "Timeout: ${YELLOW}$timeout seconds${NC}"
  
  # Record start time
  local start_time=$(date +%s)
  
  # Execute command with timeout
  echo -e "Executing command... (this may take a while)"
  local temp_output_file=$(mktemp)
  
  # Use timeout command to enforce the timeout
  timeout "$timeout"s kubectl exec "$POD_NAME" -n "$NAMESPACE" -c "$CONTAINER_NAME" -- sh -c "$command" > "$temp_output_file" 2>&1
  local status=$?
  
  # Record end time
  local end_time=$(date +%s)
  local duration=$((end_time - start_time))
  
  # Save output
  cat "$temp_output_file" > "$output_file"
  rm "$temp_output_file"
  
  echo -e "Execution time: ${YELLOW}$duration seconds${NC}"
  echo -e "Output saved to: ${YELLOW}$output_file${NC}"
  
  # Check if command was successful
  if [[ $status -eq 0 ]]; then
    echo -e "${GREEN}Command executed successfully${NC}"
  else
    echo -e "${RED}Command failed with status $status${NC}"
  fi
  
  # Format JSON if applicable and jq is available
  if [[ "$JQ_AVAILABLE" == "true" && "$output_file" == *".json" ]]; then
    if jq . "$output_file" > "$output_file.formatted" 2>/dev/null; then
      mv "$output_file.formatted" "$output_file"
      echo -e "${GREEN}JSON output formatted successfully${NC}"
    else
      echo -e "${YELLOW}Output is not valid JSON or is empty${NC}"
    fi
  fi
  
  # Save execution metadata
  cat > "${output_file}.meta.json" << EOF
{
  "command": "$command",
  "description": "$description",
  "start_time": "$start_time",
  "end_time": "$end_time",
  "duration_seconds": $duration,
  "exit_status": $status,
  "output_file": "$output_file"
}
EOF
  
  echo -e "Execution metadata saved to: ${YELLOW}${output_file}.meta.json${NC}"
  
  # Return the exit status
  return $status
}

# Step 1: Check environment variables
execute_command "env | grep -E 'API|TOKEN|KEY|SECRET|OPENAI|ANTHROPIC|GOOGLE|GEMINI|OPENROUTER'" \
  "$RESULTS_DIR/environment_variables.txt" \
  "Checking environment variables" \
  30

# Step 2: Look for DeepWiki-related executables
execute_command "find /app /usr/local/bin /bin -type f -executable 2>/dev/null | grep -i -E 'deep|wiki|analysis|api|cli'" \
  "$RESULTS_DIR/executables.txt" \
  "Looking for DeepWiki executables" \
  60

# Step 3: Check for configuration files
execute_command "find / -name \"*.json\" -o -name \"*.yaml\" -o -name \"*.yml\" -o -name \"*.config\" 2>/dev/null | grep -v Permission | head -50" \
  "$RESULTS_DIR/config_files.txt" \
  "Looking for configuration files" \
  60

# Step 4: Try to find a help command
echo -e "\n${GREEN}Attempting to find and run help commands...${NC}"

# List of possible executable paths and help commands
EXEC_PATHS=("/app/deepwiki" "/usr/local/bin/deepwiki" "deepwiki" "python -m deepwiki" "node /app/index.js" "npm start -- --help")
HELP_COMMANDS=("--help" "-h" "help" "--version" "commands" "list")

# Try each combination
for exec_path in "${EXEC_PATHS[@]}"; do
  for help_cmd in "${HELP_COMMANDS[@]}"; do
    cmd="$exec_path $help_cmd"
    output_file="$RESULTS_DIR/help_${exec_path//\//_}_${help_cmd//-/_}.txt"
    
    echo -e "\nTrying: ${YELLOW}$cmd${NC}"
    kubectl exec "$POD_NAME" -n "$NAMESPACE" -c "$CONTAINER_NAME" -- sh -c "$cmd" > "$output_file" 2>&1 || true
    
    # Check if the output has useful content
    if [[ -s "$output_file" ]]; then
      file_content=$(cat "$output_file")
      if [[ "$file_content" != *"command not found"* && "$file_content" != *"not found"* && "$file_content" != *"No such file"* ]]; then
        echo -e "${GREEN}Command '$cmd' returned useful output!${NC}"
        echo -e "Output saved to: ${YELLOW}$output_file${NC}"
      else
        echo -e "${RED}Command failed or returned error${NC}"
        rm "$output_file"  # Remove empty or error files
      fi
    else
      echo -e "${RED}Command returned no output${NC}"
      rm "$output_file"  # Remove empty files
    fi
  done
done

# Step 5: Try to find working commands based on previous results
echo -e "\n${GREEN}Analyzing results to find working command syntax...${NC}"

# Analyze executables.txt for potential commands
if [[ -f "$RESULTS_DIR/executables.txt" ]]; then
  POTENTIAL_COMMANDS=$(cat "$RESULTS_DIR/executables.txt" | grep -v "Permission denied")
  echo "$POTENTIAL_COMMANDS" > "$RESULTS_DIR/potential_commands.txt"
  echo -e "Potential commands saved to: ${YELLOW}$RESULTS_DIR/potential_commands.txt${NC}"
fi

# Step 6: Attempt to run analysis with either found commands or common patterns
echo -e "\n${GREEN}Attempting to run repository analysis...${NC}"

# Construct analysis command based on found information or common patterns
ANALYSIS_CMD=""

# Try to determine the command from help outputs
for help_file in "$RESULTS_DIR"/help_*.txt; do
  if [[ -f "$help_file" ]]; then
    if grep -q "analyze\|repository\|repo" "$help_file"; then
      help_content=$(cat "$help_file")
      command_base=$(basename "$help_file" | sed 's/help_//g' | sed 's/\.txt//g' | sed 's/_/ /g')
      if [[ "$help_content" =~ analyze|repository|repo ]]; then
        ANALYSIS_CMD="$command_base analyze $TEST_REPO"
        echo -e "Found potential analysis command: ${YELLOW}$ANALYSIS_CMD${NC}"
        break
      fi
    fi
  fi
done

# If no command found, try common patterns
if [[ -z "$ANALYSIS_CMD" ]]; then
  echo -e "${YELLOW}No analysis command found in help outputs. Trying common patterns...${NC}"
  # Try a few common patterns
  ANALYSIS_PATTERNS=(
    "deepwiki analyze"
    "deepwiki repo analyze"
    "node /app/index.js analyze"
    "python -m deepwiki analyze"
    "/app/deepwiki analyze"
    "npm start -- analyze"
  )
  
  for pattern in "${ANALYSIS_PATTERNS[@]}"; do
    ANALYSIS_CMD="$pattern $TEST_REPO"
    echo -e "Trying pattern: ${YELLOW}$ANALYSIS_CMD${NC}"
    
    # Add mode parameter if specified
    if [[ "$TEST_MODE" == "concise" ]]; then
      ANALYSIS_CMD="$ANALYSIS_CMD --concise"
    elif [[ "$TEST_MODE" == "comprehensive" ]]; then
      ANALYSIS_CMD="$ANALYSIS_CMD --comprehensive"
    fi
    
    # Add provider parameter if specified
    if [[ -n "$PROVIDER" ]]; then
      ANALYSIS_CMD="$ANALYSIS_CMD --provider $PROVIDER"
    fi
    
    # Add model parameter if specified
    if [[ -n "$MODEL" ]]; then
      ANALYSIS_CMD="$ANALYSIS_CMD --model $MODEL"
    fi
    
    # Try the command
    output_file="$RESULTS_DIR/analysis_${pattern//\//_}.txt"
    kubectl exec "$POD_NAME" -n "$NAMESPACE" -c "$CONTAINER_NAME" -- sh -c "$ANALYSIS_CMD" > "$output_file" 2>&1 || true
    
    # Check if the output looks promising
    if [[ -s "$output_file" ]]; then
      file_content=$(cat "$output_file")
      if [[ "$file_content" != *"command not found"* && "$file_content" != *"not found"* && "$file_content" != *"No such file"* ]]; then
        echo -e "${GREEN}Analysis command '$ANALYSIS_CMD' appears to be working!${NC}"
        echo -e "Output saved to: ${YELLOW}$output_file${NC}"
        break
      else
        echo -e "${RED}Analysis command failed or returned error${NC}"
        rm "$output_file"  # Remove error files
      fi
    else
      echo -e "${RED}Analysis command returned no output${NC}"
      rm "$output_file"  # Remove empty files
    fi
  done
fi

# Step 7: Try to access the API directly
echo -e "\n${GREEN}Attempting to access DeepWiki API directly...${NC}"

# Common API endpoints to check
API_ENDPOINTS=(
  "GET http://localhost:8000/api/status"
  "GET http://localhost:8001/api/status"
  "GET http://localhost:3000/api/status"
  "GET http://127.0.0.1:8000/api/status"
  "GET http://127.0.0.1:8001/api/status"
  "GET http://127.0.0.1:3000/api/status"
)

for endpoint in "${API_ENDPOINTS[@]}"; do
  method=$(echo "$endpoint" | awk '{print $1}')
  url=$(echo "$endpoint" | awk '{print $2}')
  
  echo -e "\nTrying API endpoint: ${YELLOW}$method $url${NC}"
  output_file="$RESULTS_DIR/api_$(echo "$url" | sed 's/[:/]/_/g').txt"
  
  # Using curl if available
  kubectl exec "$POD_NAME" -n "$NAMESPACE" -c "$CONTAINER_NAME" -- sh -c "curl -s -X $method $url" > "$output_file" 2>&1 || true
  
  # Check if the output looks like a valid response
  if [[ -s "$output_file" ]]; then
    file_content=$(cat "$output_file")
    if [[ "$file_content" == *"{"* || "$file_content" == *"<html"* ]]; then
      echo -e "${GREEN}API endpoint '$endpoint' returned a response!${NC}"
      echo -e "Output saved to: ${YELLOW}$output_file${NC}"
    else
      echo -e "${RED}API endpoint returned unexpected response${NC}"
      rm "$output_file"  # Remove unsuccessful responses
    fi
  else
    echo -e "${RED}API endpoint returned no output${NC}"
    rm "$output_file"  # Remove empty files
  fi
done

# Step 8: Create a summary of findings
echo -e "\n${BLUE}Creating investigation summary...${NC}"

# Create a markdown summary file
cat > "$RESULTS_DIR/investigation_summary.md" << EOF
# DeepWiki CLI Investigation Summary

## Environment Details
- **Namespace:** $NAMESPACE
- **Pod:** $POD_NAME
- **Container:** $CONTAINER_NAME
- **Test Repository:** $TEST_REPO
- **Test Mode:** $TEST_MODE
- **Provider:** ${PROVIDER:-None specified}
- **Model:** ${MODEL:-None specified}
- **Investigation Date:** $(date)

## Investigation Results

### Environment Variables
$(if [[ -f "$RESULTS_DIR/environment_variables.txt" ]]; then
  echo "Found relevant environment variables:"
  echo '```'
  cat "$RESULTS_DIR/environment_variables.txt"
  echo '```'
else
  echo "No relevant environment variables found."
fi)

### Discovered Executables
$(if [[ -f "$RESULTS_DIR/executables.txt" ]]; then
  echo "Found potential executables:"
  echo '```'
  cat "$RESULTS_DIR/executables.txt"
  echo '```'
else
  echo "No executables found."
fi)

### Configuration Files
$(if [[ -f "$RESULTS_DIR/config_files.txt" ]]; then
  echo "Found configuration files:"
  echo '```'
  cat "$RESULTS_DIR/config_files.txt"
  echo '```'
else
  echo "No configuration files found."
fi)

### Help Commands
$(
  help_files=("$RESULTS_DIR"/help_*.txt)
  if [[ -f "${help_files[0]}" ]]; then
    echo "Found help command outputs:"
    for file in "${help_files[@]}"; do
      if [[ -f "$file" ]]; then
        cmd_name=$(basename "$file" | sed 's/help_//g' | sed 's/\.txt//g' | sed 's/_/ /g')
        echo "#### $cmd_name"
        echo '```'
        cat "$file"
        echo '```'
      fi
    done
  else
    echo "No help command outputs found."
  fi
)

### Analysis Commands
$(
  analysis_files=("$RESULTS_DIR"/analysis_*.txt)
  if [[ -f "${analysis_files[0]}" ]]; then
    echo "Found working analysis commands:"
    for file in "${analysis_files[@]}"; do
      if [[ -f "$file" ]]; then
        cmd_name=$(basename "$file" | sed 's/analysis_//g' | sed 's/\.txt//g' | sed 's/_/ /g')
        echo "#### $cmd_name"
        echo '```'
        head -n 20 "$file"
        if [[ $(wc -l < "$file") -gt 20 ]]; then
          echo "... (output truncated, see full output in file)"
        fi
        echo '```'
      fi
    done
  else
    echo "No working analysis commands found."
  fi
)

### API Endpoints
$(
  api_files=("$RESULTS_DIR"/api_*.txt)
  if [[ -f "${api_files[0]}" ]]; then
    echo "Found working API endpoints:"
    for file in "${api_files[@]}"; do
      if [[ -f "$file" ]]; then
        endpoint=$(basename "$file" | sed 's/api_//g' | sed 's/\.txt//g' | sed 's/_/:/g' | sed 's/_/\//g' | sed 's/_/\//g')
        echo "#### $endpoint"
        echo '```'
        cat "$file"
        echo '```'
      fi
    done
  else
    echo "No working API endpoints found."
  fi
)

## Conclusions and Next Steps

Based on this investigation, the following appear to be the working commands and APIs for DeepWiki:

1. **Executable Path**: [Determine from results]
2. **Analysis Command**: [Determine from results]
3. **API Endpoints**: [Determine from results]
4. **Configuration Method**: [Determine from results]

### Recommended Implementation

\`\`\`typescript
// Skeleton implementation for DeepWikiKubernetesService

public async analyzeRepository(options: DeepWikiAnalysisOptions): Promise<any> {
  // Build command based on investigation findings
  const command = "[Determine from results]";
  
  // Execute command in Kubernetes pod
  const output = await this.executeCommandInPod(command, options.timeout || 600);
  
  // Parse output
  return this.parseOutput(output);
}
\`\`\`

### Additional Findings

[Add any other observations or conclusions here]
EOF

echo -e "${GREEN}Investigation summary created: ${YELLOW}$RESULTS_DIR/investigation_summary.md${NC}"

echo -e "\n${BLUE}=== DeepWiki CLI investigation complete ===${NC}"
echo -e "All results saved to: ${YELLOW}$RESULTS_DIR${NC}"
echo -e "Review the ${YELLOW}$RESULTS_DIR/investigation_summary.md${NC} file for a summary of findings"
echo -e "\nNext steps:"
echo -e "1. Review the findings in detail"
echo -e "2. Update the DeepWikiKubernetesService implementation based on the findings"
echo -e "3. Create test scripts for different DeepWiki operations"
echo -e "4. Document the command interface for future reference"

# Make this script executable
chmod +x "$0"
