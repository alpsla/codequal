#!/bin/bash
# Enhanced version of explore_deepwiki_k8s.sh with better debugging
# Created: May 15, 2025

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== DeepWiki Kubernetes CLI Investigation ===${NC}"
echo -e "Debug mode: Enabled - showing all commands and output"

# Check if kubectl is installed and working
echo -e "\n${GREEN}Checking kubectl availability...${NC}"
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}Error: kubectl is not installed or not in PATH${NC}"
    echo "Please install kubectl and try again"
    exit 1
fi

echo -e "kubectl command found, testing cluster access..."
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}Error: Cannot connect to Kubernetes cluster${NC}"
    echo "Please check your kubeconfig and cluster access"
    kubectl cluster-info
    exit 1
fi

echo -e "${GREEN}Successfully connected to Kubernetes cluster${NC}"

# Step 1: Find the DeepWiki pods with verbose output
echo -e "\n${GREEN}Finding DeepWiki pods in the cluster...${NC}"
echo -e "Running: ${YELLOW}kubectl get pods -A | grep -i deepwiki${NC}"
PODS_OUTPUT=$(kubectl get pods -A 2>&1)
echo -e "All pods output:\n$PODS_OUTPUT"

PODS=$(echo "$PODS_OUTPUT" | grep -i deepwiki || true)

if [[ -z "$PODS" ]]; then
  echo -e "${RED}No DeepWiki pods found in the cluster!${NC}"
  echo "Please check the pod name and try again."
  echo "Listing all pods for reference:"
  kubectl get pods -A
  
  # Ask user for manual input
  echo -e "\n${YELLOW}Would you like to manually specify the pod to investigate?${NC} (y/n)"
  read -p "> " manual_input
  
  if [[ "$manual_input" == "y" ]]; then
    read -p "Enter namespace: " NAMESPACE
    read -p "Enter pod name: " POD_NAME
  else
    exit 1
  fi
else
  echo -e "${YELLOW}DeepWiki pods found:${NC}"
  echo "$PODS"

  # Determine the namespace and pod name
  # We'll use the first DeepWiki pod found
  NAMESPACE=$(echo "$PODS" | head -1 | awk '{print $1}')
  POD_NAME=$(echo "$PODS" | head -1 | awk '{print $2}')
fi

echo -e "\n${GREEN}Using pod ${YELLOW}$POD_NAME${GREEN} in namespace ${YELLOW}$NAMESPACE${NC}"

# Step 2: Describe the pod to get details
echo -e "\n${GREEN}Getting pod details...${NC}"
echo -e "Running: ${YELLOW}kubectl describe pod \"$POD_NAME\" -n \"$NAMESPACE\"${NC}"
POD_DETAILS=$(kubectl describe pod "$POD_NAME" -n "$NAMESPACE" 2>&1)
echo -e "$POD_DETAILS" > deepwiki_pod_details.txt
echo "Pod details saved to deepwiki_pod_details.txt"

# Step 3: Get container names
echo -e "\n${GREEN}Identifying containers in the pod...${NC}"
echo -e "Running: ${YELLOW}kubectl get pod \"$POD_NAME\" -n \"$NAMESPACE\" -o jsonpath='{.spec.containers[*].name}'${NC}"
CONTAINERS_OUTPUT=$(kubectl get pod "$POD_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.containers[*].name}' 2>&1)
echo -e "Container output: ${YELLOW}$CONTAINERS_OUTPUT${NC}"

if [[ -z "$CONTAINERS_OUTPUT" ]] || [[ "$CONTAINERS_OUTPUT" == *"error"* ]]; then
    echo -e "${RED}Error getting container names${NC}"
    echo "$CONTAINERS_OUTPUT"
    echo -e "\n${YELLOW}Would you like to manually specify the container to investigate?${NC} (y/n)"
    read -p "> " manual_container
    
    if [[ "$manual_container" == "y" ]]; then
        read -p "Enter container name: " CONTAINER_NAME
    else
        exit 1
    fi
else
    CONTAINERS="$CONTAINERS_OUTPUT"
    echo -e "Containers: ${YELLOW}$CONTAINERS${NC}"

    # Ask which container to explore
    if [[ "$CONTAINERS" == *" "* ]]; then
        # Multiple containers
        echo -e "\n${GREEN}Multiple containers found. Which container would you like to explore? ${NC}"
        read -p "Container name (press Enter for the first one): " CONTAINER_NAME
        
        if [[ -z "$CONTAINER_NAME" ]]; then
            CONTAINER_NAME=$(echo "$CONTAINERS" | awk '{print $1}')
            echo -e "Using container: ${YELLOW}$CONTAINER_NAME${NC}"
        fi
    else
        # Single container
        CONTAINER_NAME="$CONTAINERS"
        echo -e "Using the only container: ${YELLOW}$CONTAINER_NAME${NC}"
    fi
fi

# Step 4: Check if the container exists
if ! echo "$CONTAINERS" | grep -qw "$CONTAINER_NAME"; then
  echo -e "${YELLOW}Warning: Container '$CONTAINER_NAME' not found in returned list!${NC}"
  echo -e "Available containers: ${YELLOW}$CONTAINERS${NC}"
  echo -e "Proceeding anyway with container: ${YELLOW}$CONTAINER_NAME${NC}"
fi

# Create results directory
RESULTS_DIR="deepwiki_k8s_investigation"
mkdir -p "$RESULTS_DIR"

# Step 5: Check what commands are available in the container
echo -e "\n${GREEN}Checking available commands in the container...${NC}"
echo -e "Testing common command-line tools..."

COMMANDS="ls cat grep find pwd ps env bash sh ls-la which"

for CMD in $COMMANDS; do
  echo -n "Checking $CMD... "
  echo -e "Running: ${YELLOW}kubectl exec \"$POD_NAME\" -n \"$NAMESPACE\" -c \"$CONTAINER_NAME\" -- which \"$CMD\" 2>&1${NC}"
  CMD_OUTPUT=$(kubectl exec "$POD_NAME" -n "$NAMESPACE" -c "$CONTAINER_NAME" -- which "$CMD" 2>&1)
  
  if [[ "$CMD_OUTPUT" == *"command not found"* ]] || [[ "$CMD_OUTPUT" == *"error"* ]]; then
    echo -e "${RED}Not available${NC}"
    echo "  Error: $CMD_OUTPUT"
  else
    echo -e "${GREEN}Available${NC}"
    echo "  Path: $CMD_OUTPUT"
  fi
done

# Step 6: Explore the filesystem
echo -e "\n${GREEN}Exploring container filesystem...${NC}"
echo -e "Running: ${YELLOW}kubectl exec \"$POD_NAME\" -n \"$NAMESPACE\" -c \"$CONTAINER_NAME\" -- ls -la / 2>&1${NC}"
ROOT_LISTING=$(kubectl exec "$POD_NAME" -n "$NAMESPACE" -c "$CONTAINER_NAME" -- ls -la / 2>&1)

if [[ "$ROOT_LISTING" == *"command not found"* ]] || [[ "$ROOT_LISTING" == *"error"* ]]; then
    echo -e "${RED}Error listing root directory${NC}"
    echo "$ROOT_LISTING"
else
    echo "$ROOT_LISTING" > "$RESULTS_DIR/root_directory.txt"
    echo "Root directory listing saved to $RESULTS_DIR/root_directory.txt"
fi

# Check common directories
DIRS="/app /usr/local/bin /bin /opt"
for DIR in $DIRS; do
  echo -n "Checking $DIR... "
  echo -e "Running: ${YELLOW}kubectl exec \"$POD_NAME\" -n \"$NAMESPACE\" -c \"$CONTAINER_NAME\" -- ls -la \"$DIR\" 2>&1${NC}"
  DIR_OUTPUT=$(kubectl exec "$POD_NAME" -n "$NAMESPACE" -c "$CONTAINER_NAME" -- ls -la "$DIR" 2>&1)
  
  if [[ "$DIR_OUTPUT" == *"No such file"* ]] || [[ "$DIR_OUTPUT" == *"command not found"* ]] || [[ "$DIR_OUTPUT" == *"error"* ]]; then
    echo -e "${RED}Not available or empty${NC}"
    echo "  Error: $DIR_OUTPUT"
  else
    echo -e "${GREEN}Available${NC}"
    echo "$DIR_OUTPUT" > "$RESULTS_DIR/dir_${DIR//\//_}.txt"
    echo "  Directory listing saved to $RESULTS_DIR/dir_${DIR//\//_}.txt"
  fi
done

# Step 7: Check environment variables
echo -e "\n${GREEN}Checking environment variables...${NC}"
echo -e "Running: ${YELLOW}kubectl exec \"$POD_NAME\" -n \"$NAMESPACE\" -c \"$CONTAINER_NAME\" -- env 2>&1${NC}"
ENV_OUTPUT=$(kubectl exec "$POD_NAME" -n "$NAMESPACE" -c "$CONTAINER_NAME" -- env 2>&1)

if [[ "$ENV_OUTPUT" == *"command not found"* ]] || [[ "$ENV_OUTPUT" == *"error"* ]]; then
    echo -e "${RED}Error getting environment variables${NC}"
    echo "$ENV_OUTPUT"
else
    echo "$ENV_OUTPUT" > "$RESULTS_DIR/environment_variables.txt"
    echo "Environment variables saved to $RESULTS_DIR/environment_variables.txt"
fi

# Step 8: Look for executable scripts or binaries
echo -e "\n${GREEN}Looking for DeepWiki executables...${NC}"
echo -e "Running: ${YELLOW}kubectl exec \"$POD_NAME\" -n \"$NAMESPACE\" -c \"$CONTAINER_NAME\" -- find / -name \"*deepwiki*\" -type f 2>/dev/null${NC}"
EXEC_OUTPUT=$(kubectl exec "$POD_NAME" -n "$NAMESPACE" -c "$CONTAINER_NAME" -- find / -name "*deepwiki*" -type f 2>/dev/null || echo "")

if [[ -z "$EXEC_OUTPUT" ]]; then
    echo -e "${YELLOW}No DeepWiki executables found with direct name match${NC}"
    echo "Trying broader search..."
    echo -e "Running: ${YELLOW}kubectl exec \"$POD_NAME\" -n \"$NAMESPACE\" -c \"$CONTAINER_NAME\" -- find /app /usr/local/bin /bin -type f -executable 2>/dev/null | grep -v \"Permission denied\"${NC}"
    EXEC_OUTPUT=$(kubectl exec "$POD_NAME" -n "$NAMESPACE" -c "$CONTAINER_NAME" -- find /app /usr/local/bin /bin -type f -executable 2>/dev/null | grep -v "Permission denied" || echo "")
fi

echo "$EXEC_OUTPUT" > "$RESULTS_DIR/executables.txt"
echo "Executable search results saved to $RESULTS_DIR/executables.txt"

# Step 9: Check running processes
echo -e "\n${GREEN}Checking running processes...${NC}"
echo -e "Running: ${YELLOW}kubectl exec \"$POD_NAME\" -n \"$NAMESPACE\" -c \"$CONTAINER_NAME\" -- ps aux 2>&1${NC}"
PS_OUTPUT=$(kubectl exec "$POD_NAME" -n "$NAMESPACE" -c "$CONTAINER_NAME" -- ps aux 2>&1)

if [[ "$PS_OUTPUT" == *"command not found"* ]] || [[ "$PS_OUTPUT" == *"error"* ]]; then
    echo -e "${YELLOW}ps command not available, trying alternative${NC}"
    echo -e "Running: ${YELLOW}kubectl exec \"$POD_NAME\" -n \"$NAMESPACE\" -c \"$CONTAINER_NAME\" -- ps 2>&1${NC}"
    PS_OUTPUT=$(kubectl exec "$POD_NAME" -n "$NAMESPACE" -c "$CONTAINER_NAME" -- ps 2>&1)
fi

if [[ "$PS_OUTPUT" == *"command not found"* ]] || [[ "$PS_OUTPUT" == *"error"* ]]; then
    echo -e "${RED}Process listing not available${NC}"
else
    echo "$PS_OUTPUT" > "$RESULTS_DIR/processes.txt"
    echo "Process list saved to $RESULTS_DIR/processes.txt"
fi

# Step 10: Try to find documentation
echo -e "\n${GREEN}Looking for documentation or README files...${NC}"
echo -e "Running: ${YELLOW}kubectl exec \"$POD_NAME\" -n \"$NAMESPACE\" -c \"$CONTAINER_NAME\" -- find / -name \"README*\" -o -name \"*.md\" -o -name \"HELP*\" -o -name \"*.txt\" 2>/dev/null | grep -v \"Permission denied\"${NC}"
DOC_OUTPUT=$(kubectl exec "$POD_NAME" -n "$NAMESPACE" -c "$CONTAINER_NAME" -- find / -name "README*" -o -name "*.md" -o -name "HELP*" -o -name "*.txt" 2>/dev/null | grep -v "Permission denied" || echo "")

echo "$DOC_OUTPUT" > "$RESULTS_DIR/documentation_files.txt"
echo "Documentation file search results saved to $RESULTS_DIR/documentation_files.txt"

# Step 11: Look for API keys or configuration files
echo -e "\n${GREEN}Looking for configuration files...${NC}"
echo -e "Running: ${YELLOW}kubectl exec \"$POD_NAME\" -n \"$NAMESPACE\" -c \"$CONTAINER_NAME\" -- find / -name \"*.conf\" -o -name \"*.json\" -o -name \"*.yaml\" -o -name \"*.yml\" -o -name \"*.env\" 2>/dev/null | grep -v \"Permission denied\"${NC}"
CONFIG_OUTPUT=$(kubectl exec "$POD_NAME" -n "$NAMESPACE" -c "$CONTAINER_NAME" -- find / -name "*.conf" -o -name "*.json" -o -name "*.yaml" -o -name "*.yml" -o -name "*.env" 2>/dev/null | grep -v "Permission denied" || echo "")

echo "$CONFIG_OUTPUT" > "$RESULTS_DIR/config_files.txt"
echo "Configuration file search results saved to $RESULTS_DIR/config_files.txt"

# Step 12: Get pod logs
echo -e "\n${GREEN}Getting container logs...${NC}"
echo -e "Running: ${YELLOW}kubectl logs \"$POD_NAME\" -n \"$NAMESPACE\" -c \"$CONTAINER_NAME\"${NC}"
LOGS_OUTPUT=$(kubectl logs "$POD_NAME" -n "$NAMESPACE" -c "$CONTAINER_NAME" 2>&1)

echo "$LOGS_OUTPUT" > "$RESULTS_DIR/container_logs.txt"
echo "Container logs saved to $RESULTS_DIR/container_logs.txt"

echo -e "\n${BLUE}=== Initial exploration complete ===${NC}"
echo -e "All results saved to the ${YELLOW}$RESULTS_DIR${NC} directory"
echo -e "Use the following command to run an interactive shell in the container (if available):"
echo -e "${YELLOW}kubectl exec -it $POD_NAME -n $NAMESPACE -c $CONTAINER_NAME -- /bin/bash${NC} (or /bin/sh if bash is not available)"
echo -e "\nDetails of the investigation:"
echo -e "- Namespace: ${YELLOW}$NAMESPACE${NC}"
echo -e "- Pod: ${YELLOW}$POD_NAME${NC}"
echo -e "- Container: ${YELLOW}$CONTAINER_NAME${NC}"
echo -e "- Results directory: ${YELLOW}$RESULTS_DIR${NC}"

# Create a summary file
cat > "$RESULTS_DIR/investigation_summary.md" << EOF
# DeepWiki Kubernetes Investigation Summary
**Date:** $(date)

## Environment Details
- **Namespace:** $NAMESPACE
- **Pod:** $POD_NAME
- **Container:** $CONTAINER_NAME

## Investigation Files
- Pod details: [deepwiki_pod_details.txt](../deepwiki_pod_details.txt)
- Root directory listing: [root_directory.txt](root_directory.txt)
- Environment variables: [environment_variables.txt](environment_variables.txt)
- Executable files: [executables.txt](executables.txt)
- Running processes: [processes.txt](processes.txt)
- Documentation files: [documentation_files.txt](documentation_files.txt)
- Configuration files: [config_files.txt](config_files.txt)
- Container logs: [container_logs.txt](container_logs.txt)

## Next Steps
1. Review the files to identify DeepWiki CLI commands
2. Test running commands using \`kubectl exec\`
3. Document the command interface
4. Run test analyses on sample repositories
EOF

echo -e "\n${GREEN}Investigation summary created: ${YELLOW}$RESULTS_DIR/investigation_summary.md${NC}"

# Make this script executable
chmod +x /Users/alpinro/Code\ Prjects/codequal/scripts/explore_deepwiki_k8s.sh
