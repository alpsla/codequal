#!/bin/bash
# run_deepwiki_investigation.sh - Script to run the DeepWiki Kubernetes CLI/Console Investigation
# Created: May 16, 2025

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
DOCS_DIR="$ROOT_DIR/docs/Deepwiki/cli-investigation"

echo -e "${BLUE}=== DeepWiki Kubernetes CLI/Console Investigation ===${NC}"
echo -e "This script will guide you through the investigation process."

# Make scripts executable
echo -e "\n${GREEN}Making scripts executable...${NC}"
chmod +x "$SCRIPT_DIR/explore_deepwiki_k8s.sh"
chmod +x "$SCRIPT_DIR/explore_deepwiki_api.sh"

# Step 1: Run the initial exploration script
echo -e "\n${GREEN}Step 1: Run the initial exploration script${NC}"
echo -e "This script will gather basic information about the DeepWiki pod."
echo -e "${YELLOW}Command: $SCRIPT_DIR/explore_deepwiki_k8s.sh${NC}"
read -p "Press Enter to run the script or 'n' to skip: " run_step1
if [[ "$run_step1" != "n" ]]; then
    "$SCRIPT_DIR/explore_deepwiki_k8s.sh"
    echo -e "${GREEN}Initial exploration complete!${NC}"
    echo -e "Review the generated files in the deepwiki_k8s_investigation directory."
else
    echo -e "${YELLOW}Skipping initial exploration.${NC}"
fi

# Step 2: Run the API exploration script
echo -e "\n${GREEN}Step 2: Run the API exploration script${NC}"
echo -e "This script will explore the DeepWiki API capabilities."
echo -e "You may need to provide the namespace and pod name if not using defaults."
echo -e "${YELLOW}Command: $SCRIPT_DIR/explore_deepwiki_api.sh [namespace] [pod-name] [container-name]${NC}"
read -p "Press Enter to run the script or 'n' to skip: " run_step2
if [[ "$run_step2" != "n" ]]; then
    read -p "Enter namespace (default: codequal-dev): " namespace
    read -p "Enter pod name (leave empty for auto-detection): " pod_name
    read -p "Enter container name (default: deepwiki): " container_name
    
    # Run the script with provided or default values
    if [[ -n "$namespace" ]]; then
        cmd="$SCRIPT_DIR/explore_deepwiki_api.sh $namespace"
        if [[ -n "$pod_name" ]]; then
            cmd="$cmd $pod_name"
            if [[ -n "$container_name" ]]; then
                cmd="$cmd $container_name"
            fi
        fi
        eval "$cmd"
    else
        "$SCRIPT_DIR/explore_deepwiki_api.sh"
    fi
    
    echo -e "${GREEN}API exploration complete!${NC}"
    echo -e "Review the generated files in the deepwiki_api_investigation directory."
else
    echo -e "${YELLOW}Skipping API exploration.${NC}"
fi

# Step 3: Set up port forwarding for testing
echo -e "\n${GREEN}Step 3: Set up port forwarding${NC}"
echo -e "This step will set up port forwarding to access the DeepWiki API."
echo -e "${YELLOW}Command: kubectl port-forward -n <namespace> svc/deepwiki-api 8001:8001${NC}"
read -p "Press Enter to set up port forwarding or 'n' to skip: " run_step3
if [[ "$run_step3" != "n" ]]; then
    read -p "Enter namespace (default: codequal-dev): " namespace
    namespace=${namespace:-codequal-dev}
    
    # Check if the service exists
    if kubectl get svc -n "$namespace" deepwiki-api &> /dev/null; then
        echo -e "${GREEN}Setting up port forwarding...${NC}"
        echo -e "The port forwarding will run in the background."
        echo -e "To stop it later, run: pkill -f 'kubectl port-forward.*deepwiki-api'"
        
        # Start port forwarding in the background
        kubectl port-forward -n "$namespace" svc/deepwiki-api 8001:8001 &
        PF_PID=$!
        
        # Give it a moment to start
        sleep 2
        
        if kill -0 $PF_PID 2>/dev/null; then
            echo -e "${GREEN}Port forwarding is active with PID $PF_PID${NC}"
        else
            echo -e "${RED}Failed to start port forwarding.${NC}"
        fi
    else
        echo -e "${RED}Error: Service deepwiki-api not found in namespace $namespace${NC}"
        echo -e "Please check the service name and namespace."
    fi
else
    echo -e "${YELLOW}Skipping port forwarding setup.${NC}"
fi

# Step 4: Prepare test scripts in the pod
echo -e "\n${GREEN}Step 4: Prepare test scripts in the pod${NC}"
echo -e "This step will copy the test scripts to the DeepWiki pod."
echo -e "${YELLOW}Command: kubectl cp <file> <namespace>/<pod>:/tmp/\nkubectl exec -it <pod> -n <namespace> -- python /tmp/<script> <args>${NC}"
read -p "Press Enter to prepare test scripts or 'n' to skip: " run_step4
if [[ "$run_step4" != "n" ]]; then
    read -p "Enter namespace (default: codequal-dev): " namespace
    namespace=${namespace:-codequal-dev}
    
    # Get the pod name if not provided
    if [[ -z "$pod_name" ]]; then
        pod_name=$(kubectl get pods -n "$namespace" -l app=deepwiki -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
        if [[ -z "$pod_name" ]]; then
            echo -e "${RED}Error: Could not find DeepWiki pod in namespace $namespace${NC}"
            echo -e "Please specify the pod name manually."
            read -p "Enter pod name: " pod_name
            if [[ -z "$pod_name" ]]; then
                echo -e "${RED}No pod name provided. Skipping test script preparation.${NC}"
                run_step4="n"
            fi
        else
            echo -e "Found DeepWiki pod: ${YELLOW}$pod_name${NC}"
        fi
    fi
    
    if [[ "$run_step4" != "n" ]]; then
        # Check if the test scripts exist
        if [[ -d "deepwiki_api_investigation" && -f "deepwiki_api_investigation/test_repository_analysis.py" && -f "deepwiki_api_investigation/test_chat_api.py" ]]; then
            echo -e "Copying test scripts to the pod..."
            
            # Copy the test scripts to the pod
            kubectl cp "deepwiki_api_investigation/test_repository_analysis.py" "$namespace/$pod_name:/tmp/test_repository_analysis.py"
            kubectl cp "deepwiki_api_investigation/test_chat_api.py" "$namespace/$pod_name:/tmp/test_chat_api.py"
            
            echo -e "${GREEN}Test scripts copied to the pod!${NC}"
            
            # Provide example commands
            echo -e "\nExample commands to run the test scripts:"
            echo -e "${YELLOW}kubectl exec -it -n $namespace $pod_name -- python /tmp/test_repository_analysis.py https://github.com/AsyncFuncAI/deepwiki-open --mode concise --output /tmp/analysis_results.json${NC}"
            echo -e "${YELLOW}kubectl exec -it -n $namespace $pod_name -- python /tmp/test_chat_api.py https://github.com/AsyncFuncAI/deepwiki-open \"What is the architecture of this repository?\" --output /tmp/chat_results.json${NC}"
        else
            echo -e "${RED}Error: Test scripts not found in deepwiki_api_investigation directory.${NC}"
            echo -e "Please run Step 2 first to generate the test scripts."
        fi
    fi
else
    echo -e "${YELLOW}Skipping test script preparation.${NC}"
fi

# Step 5: Create documentation
echo -e "\n${GREEN}Step 5: Document findings${NC}"
echo -e "This step will help you document your findings."
echo -e "You should review the collected data and fill in the command reference template."
mkdir -p "$DOCS_DIR"

# Check if command reference template exists
if [[ ! -f "$DOCS_DIR/kubernetes-command-reference.md" ]]; then
    # Check if template exists
    if [[ -f "$DOCS_DIR/kubernetes-command-reference-template.md" ]]; then
        # Copy template to new file
        cp "$DOCS_DIR/kubernetes-command-reference-template.md" "$DOCS_DIR/kubernetes-command-reference.md"
        echo -e "Created command reference document: ${YELLOW}$DOCS_DIR/kubernetes-command-reference.md${NC}"
    else
        echo -e "${RED}Command reference template not found at $DOCS_DIR/kubernetes-command-reference-template.md${NC}"
        echo -e "Creating a basic template..."
        
        # Create a basic template
        cat > "$DOCS_DIR/kubernetes-command-reference.md" << EOF
# DeepWiki CLI Command Reference

This document provides a comprehensive reference for all DeepWiki CLI commands available in the Kubernetes deployment.

## Environment Details

- **Namespace:** [Namespace]
- **Pod:** [Pod Name]
- **Container:** [Container Name]
- **Investigation Date:** $(date)

## API Endpoints

| Endpoint | Method | Description | Parameters |
|----------|--------|-------------|------------|
| [Endpoint] | [Method] | [Description] | [Parameters] |

## Repository Analysis

### Using the API
[Document how to analyze repositories using the API]

### Using kubectl exec
[Document how to analyze repositories using kubectl exec]

## Chat Queries

### Using the API
[Document how to query the chat functionality using the API]

### Using kubectl exec
[Document how to query the chat functionality using kubectl exec]

## Configuration

### Environment Variables
[Document required environment variables]

### Configuration Files
[Document configuration files]

## Implementation for DeepWikiKubernetesService

[Provide code examples for implementation]

## Notes and Observations

[Add notes and observations about the DeepWiki CLI/Console]
EOF
        echo -e "Created basic command reference document: ${YELLOW}$DOCS_DIR/kubernetes-command-reference.md${NC}"
    fi
else
    echo -e "Command reference document already exists: ${YELLOW}$DOCS_DIR/kubernetes-command-reference.md${NC}"
fi

echo -e "\n${GREEN}Now you should:${NC}"
echo -e "1. Review the exploration results in the deepwiki_k8s_investigation and deepwiki_api_investigation directories"
echo -e "2. Run test scripts against the DeepWiki API to verify functionality"
echo -e "3. Fill in the command reference document at $DOCS_DIR/kubernetes-command-reference.md"
echo -e "4. Update the DeepWikiKubernetesService implementation based on findings"

echo -e "\n${BLUE}=== Investigation Process Guide Complete ===${NC}"
