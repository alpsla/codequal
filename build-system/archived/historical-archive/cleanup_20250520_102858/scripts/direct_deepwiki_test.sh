#!/bin/bash
# Direct manual DeepWiki testing script
# This script directly interacts with a DeepWiki container without relying on other scripts

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}===== Direct DeepWiki Container Test =====${NC}"

# Get DeepWiki pod details
echo -e "${GREEN}Please enter DeepWiki pod details:${NC}"
read -p "Namespace: " NAMESPACE
read -p "Pod name: " POD_NAME
read -p "Container name: " CONTAINER_NAME
read -p "Repository URL for testing (or leave empty to skip): " REPO_URL

# Validate inputs
if [ -z "$NAMESPACE" ] || [ -z "$POD_NAME" ] || [ -z "$CONTAINER_NAME" ]; then
  echo -e "${RED}Error: Namespace, pod name, and container name are required.${NC}"
  exit 1
fi

# Try to get pod information
echo -e "\n${GREEN}Checking that pod exists...${NC}"
kubectl get pod "$POD_NAME" -n "$NAMESPACE" || {
  echo -e "${RED}Failed to get pod. Please check the pod name and namespace.${NC}"
  exit 1
}

# Create results directory
RESULTS_DIR="direct_deepwiki_test_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$RESULTS_DIR"
echo -e "Saving results to ${YELLOW}$RESULTS_DIR${NC}"

# Function to execute command in pod and save output
execute_in_pod() {
  local cmd="$1"
  local output_file="$2"
  local success_msg="$3"
  
  echo -e "\n${GREEN}Executing: ${YELLOW}$cmd${NC}"
  kubectl exec "$POD_NAME" -n "$NAMESPACE" -c "$CONTAINER_NAME" -- sh -c "$cmd" > "$output_file" 2>&1
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}$success_msg${NC}"
    echo -e "Output saved to ${YELLOW}$output_file${NC}"
    return 0
  else
    echo -e "${RED}Command failed. See ${YELLOW}$output_file${NC} for details.${NC}"
    return 1
  fi
}

# Basic container info
echo -e "\n${GREEN}Getting basic container information...${NC}"
execute_in_pod "ls -la / && echo -e '\n--- Environment ---' && env" "$RESULTS_DIR/container_info.txt" "Container information collected"

# Check for DeepWiki executables
echo -e "\n${GREEN}Looking for DeepWiki executables...${NC}"
execute_in_pod "find / -name '*deepwiki*' -type f 2>/dev/null || echo 'No DeepWiki executables found'" "$RESULTS_DIR/deepwiki_executables.txt" "DeepWiki executable search completed"

# Look for any executable files
echo -e "\n${GREEN}Looking for executable files in common directories...${NC}"
execute_in_pod "find /bin /usr/bin /usr/local/bin /app -type f -executable 2>/dev/null | sort || echo 'No executables found'" "$RESULTS_DIR/all_executables.txt" "Executable files search completed"

# Look for configuration files
echo -e "\n${GREEN}Looking for configuration files...${NC}"
execute_in_pod "find / -name '*.json' -o -name '*.yaml' -o -name '*.yml' -o -name '*.config' 2>/dev/null | grep -v 'node_modules' || echo 'No config files found'" "$RESULTS_DIR/config_files.txt" "Configuration files search completed"

# Look for documentation files
echo -e "\n${GREEN}Looking for documentation files...${NC}"
execute_in_pod "find / -name 'README*' -o -name '*.md' 2>/dev/null || echo 'No documentation files found'" "$RESULTS_DIR/documentation_files.txt" "Documentation files search completed"

# Get container logs
echo -e "\n${GREEN}Getting container logs...${NC}"
kubectl logs "$POD_NAME" -n "$NAMESPACE" -c "$CONTAINER_NAME" > "$RESULTS_DIR/container_logs.txt" 2>&1
echo -e "Container logs saved to ${YELLOW}$RESULTS_DIR/container_logs.txt${NC}"

# If repo URL was provided, try to run an analysis
if [ -n "$REPO_URL" ]; then
  echo -e "\n${GREEN}Attempting to run repository analysis...${NC}"
  
  # Try common command structures for DeepWiki
  commands=(
    "deepwiki analyze '$REPO_URL'"
    "deepwiki-cli analyze '$REPO_URL'"
    "node /app/index.js analyze '$REPO_URL'"
    "python /app/main.py analyze '$REPO_URL'"
    "./deepwiki analyze '$REPO_URL'"
    "./app analyze '$REPO_URL'"
    "npm run analyze -- '$REPO_URL'"
    "yarn analyze '$REPO_URL'"
  )
  
  for cmd in "${commands[@]}"; do
    echo -e "\n${GREEN}Trying: ${YELLOW}$cmd${NC}"
    kubectl exec "$POD_NAME" -n "$NAMESPACE" -c "$CONTAINER_NAME" -- sh -c "$cmd" > "$RESULTS_DIR/analysis_attempt_$(echo "$cmd" | tr ' /' '_').txt" 2>&1
    
    if [ $? -eq 0 ]; then
      echo -e "${GREEN}Command succeeded!${NC}"
      echo -e "Output saved to ${YELLOW}$RESULTS_DIR/analysis_attempt_$(echo "$cmd" | tr ' /' '_').txt${NC}"
      
      # Save the successful command
      echo "$cmd" > "$RESULTS_DIR/successful_command.txt"
      break
    else
      echo -e "${RED}Command failed.${NC}"
    fi
  done
fi

# Create summary file
cat > "$RESULTS_DIR/README.md" << EOF
# Direct DeepWiki Container Test Results
**Date:** $(date)

## Pod Details
- **Namespace:** $NAMESPACE
- **Pod:** $POD_NAME
- **Container:** $CONTAINER_NAME
- **Repository URL:** ${REPO_URL:-"None provided"}

## Files
- **container_info.txt** - Basic container information
- **deepwiki_executables.txt** - DeepWiki executables search results
- **all_executables.txt** - All executable files in common directories
- **config_files.txt** - Configuration files search results
- **documentation_files.txt** - Documentation files search results
- **container_logs.txt** - Container logs

## Analysis Test Results
The following commands were tested to run a repository analysis:
$(for cmd in "${commands[@]}"; do echo "- \`$cmd\`"; done)

$(if [ -f "$RESULTS_DIR/successful_command.txt" ]; then 
  echo "**Successful command:** \`$(cat "$RESULTS_DIR/successful_command.txt")\`"
else 
  echo "**None of the commands succeeded**"
fi)

## Next Steps
1. Review the files to understand the DeepWiki container structure
2. Check the successful command (if any) for running analyses
3. Manually test additional commands in the container
4. Update the DeepWikiKubernetesService implementation
EOF

echo -e "\n${BLUE}===== Direct test complete =====${NC}"
echo -e "Results saved to the ${YELLOW}$RESULTS_DIR${NC} directory"
echo -e "Check ${YELLOW}$RESULTS_DIR/README.md${NC} for a summary of the test results"
