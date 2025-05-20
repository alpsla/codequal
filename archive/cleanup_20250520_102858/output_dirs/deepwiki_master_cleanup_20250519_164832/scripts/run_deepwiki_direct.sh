#!/bin/bash
# run_deepwiki_direct.sh - Direct execution of DeepWiki investigation without interactive prompts
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

echo -e "${BLUE}=== DeepWiki Kubernetes CLI/Console Investigation (Direct Mode) ===${NC}"
echo -e "This script will execute the investigation steps without requiring interactive input."

# Make scripts executable
echo -e "\n${GREEN}Making scripts executable...${NC}"
chmod +x "$SCRIPT_DIR/explore_deepwiki_k8s.sh"
chmod +x "$SCRIPT_DIR/explore_deepwiki_api.sh"

# Step 1: Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}Error: kubectl is not installed or not in PATH${NC}"
    echo "Please install kubectl and try again"
    exit 1
fi

echo -e "kubectl command found, checking access..."

# Get available namespaces
NAMESPACES=$(kubectl get namespaces -o name | cut -d "/" -f 2)
if [[ -z "$NAMESPACES" ]]; then
    echo -e "${RED}Error: Cannot access Kubernetes cluster or no namespaces available${NC}"
    exit 1
fi

# Choose a namespace for investigation
echo -e "${GREEN}Available namespaces:${NC}"
echo "$NAMESPACES"

# Default to codequal-dev if available, otherwise use first namespace
if echo "$NAMESPACES" | grep -q "codequal-dev"; then
    NAMESPACE="codequal-dev"
else
    NAMESPACE=$(echo "$NAMESPACES" | head -1)
fi

echo -e "Using namespace: ${YELLOW}$NAMESPACE${NC}"

# Create documentation directories
mkdir -p "$DOCS_DIR/findings"
mkdir -p "deepwiki_k8s_investigation"
mkdir -p "deepwiki_api_investigation"

# Copy template files
if [[ -f "$DOCS_DIR/kubernetes-command-reference-template.md" ]]; then
    cp "$DOCS_DIR/kubernetes-command-reference-template.md" "$DOCS_DIR/kubernetes-command-reference.md"
    echo -e "Created command reference document from template"
else
    echo -e "${YELLOW}Warning: Command reference template not found. Creating basic template.${NC}"
    
    # Create a basic template
    cat > "$DOCS_DIR/kubernetes-command-reference.md" << EOF
# DeepWiki CLI Command Reference

This document provides a comprehensive reference for all DeepWiki CLI commands available in the Kubernetes deployment.

## Environment Details

- **Namespace:** $NAMESPACE
- **Investigation Date:** $(date)

## API Endpoints

| Endpoint | Method | Description | Parameters |
|----------|--------|-------------|------------|
| [Endpoint] | [Method] | [Description] | [Parameters] |

## Additional sections will be filled during the investigation...
EOF
    echo -e "Created basic command reference document"
fi

# Step 2: Gather DeepWiki pod information
echo -e "\n${GREEN}Checking for DeepWiki pods in namespace $NAMESPACE...${NC}"
PODS=$(kubectl get pods -n "$NAMESPACE" -l app=deepwiki -o name 2>/dev/null)

if [[ -z "$PODS" ]]; then
    echo -e "${YELLOW}Warning: No pods with label app=deepwiki found in namespace $NAMESPACE${NC}"
    echo -e "Checking for pods with 'deepwiki' in the name..."
    PODS=$(kubectl get pods -n "$NAMESPACE" | grep -i deepwiki | awk '{print $1}' 2>/dev/null)
    
    if [[ -z "$PODS" ]]; then
        echo -e "${RED}Error: No DeepWiki pods found in namespace $NAMESPACE${NC}"
        echo -e "Creating a sample command reference document with placeholder information."
        
        cat > "$DOCS_DIR/findings/deepwiki_pod_not_found.md" << EOF
# DeepWiki Pod Not Found

No DeepWiki pods were found in namespace $NAMESPACE. 

## Possible reasons:
1. DeepWiki is not deployed in this namespace
2. DeepWiki pods have different labels or naming conventions
3. DeepWiki is deployed in a different namespace

## Next steps:
1. Check other namespaces for DeepWiki pods
2. Verify the deployment status of DeepWiki
3. Check with the team for the correct namespace and pod information
EOF
        
        echo -e "Created findings document at $DOCS_DIR/findings/deepwiki_pod_not_found.md"
        echo -e "Please review the Kubernetes environment and update the investigation plan."
        exit 1
    fi
else
    # Extract the pod name from the output
    POD_NAME=$(echo "$PODS" | head -1 | cut -d "/" -f 2)
    echo -e "Found DeepWiki pod: ${YELLOW}$POD_NAME${NC}"
fi

# Step 3: Create findings document
cat > "$DOCS_DIR/findings/initial_investigation.md" << EOF
# DeepWiki Initial Investigation Findings

## Environment Details
- **Namespace:** $NAMESPACE
- **Pod:** $POD_NAME
- **Investigation Date:** $(date)

## Pod Information
\`\`\`
$(kubectl describe pod $POD_NAME -n $NAMESPACE 2>/dev/null || echo "Error retrieving pod information")
\`\`\`

## Container Information
\`\`\`
$(kubectl get pod $POD_NAME -n $NAMESPACE -o jsonpath='{.spec.containers[*].name}' 2>/dev/null || echo "Error retrieving container information")
\`\`\`

## Service Information
\`\`\`
$(kubectl get svc -n $NAMESPACE | grep -i deepwiki 2>/dev/null || echo "No DeepWiki services found")
\`\`\`
EOF

echo -e "Created initial findings document at $DOCS_DIR/findings/initial_investigation.md"

# Step 4: Write test scripts for later execution

# Repository analysis script
cat > "deepwiki_api_investigation/test_repository_analysis.py" << 'EOF'
#!/usr/bin/env python3
"""
DeepWiki Repository Analysis Test Script

This script demonstrates how to analyze a repository using DeepWiki's API.
"""

import requests
import json
import argparse
import os
import time

def analyze_repository(repo_url, mode='comprehensive', stream=False):
    """
    Analyze a repository using DeepWiki
    
    Args:
        repo_url: URL of the GitHub repository to analyze
        mode: 'comprehensive' or 'concise'
        stream: Whether to stream the response
        
    Returns:
        Analysis results
    """
    start_time = time.time()
    
    # Prepare the query based on mode
    content = "Analyze this repository"
    if mode == 'concise':
        content += " with concise documentation"
    
    # Create the request payload
    payload = {
        "repo_url": repo_url,
        "messages": [
            {
                "role": "user",
                "content": content
            }
        ],
        "stream": stream
    }
    
    print(f"Analyzing repository: {repo_url}")
    print(f"Mode: {mode}")
    
    try:
        # Make the request
        response = requests.post(
            "http://localhost:8001/chat/completions/stream",
            json=payload
        )
        
        # Check for success
        if response.status_code == 200:
            end_time = time.time()
            duration = end_time - start_time
            
            print(f"Analysis completed in {duration:.2f} seconds")
            
            if stream:
                # For streaming responses, we'd need to process the stream
                print("Streaming response received (partial content):")
                print(response.text[:500] + "...")
                return response.text
            else:
                # For non-streaming, return the parsed JSON
                result = response.json()
                print(f"Analysis result received ({len(json.dumps(result))} bytes)")
                return result
        else:
            print(f"Error: Received status code {response.status_code}")
            print(response.text)
            return None
            
    except Exception as e:
        print(f"Error analyzing repository: {str(e)}")
        return None

def main():
    parser = argparse.ArgumentParser(description='Test DeepWiki repository analysis')
    parser.add_argument('repo_url', help='GitHub repository URL')
    parser.add_argument('--mode', choices=['comprehensive', 'concise'], default='comprehensive',
                        help='Analysis mode')
    parser.add_argument('--output', help='Output file for analysis results')
    parser.add_argument('--stream', action='store_true', help='Use streaming mode')
    
    args = parser.parse_args()
    
    # Run the analysis
    result = analyze_repository(args.repo_url, args.mode, args.stream)
    
    # Save the results if requested
    if args.output and result:
        with open(args.output, 'w') as f:
            if isinstance(result, str):
                f.write(result)
            else:
                json.dump(result, f, indent=2)
        print(f"Results saved to {args.output}")

if __name__ == "__main__":
    main()
EOF

# Chat API script
cat > "deepwiki_api_investigation/test_chat_api.py" << 'EOF'
#!/usr/bin/env python3
"""
DeepWiki Chat API Test Script

This script demonstrates how to ask questions about a repository using DeepWiki's chat API.
"""

import requests
import json
import argparse
import os
import time

def query_repository(repo_url, question, stream=False, deep_research=False):
    """
    Ask a question about a repository using DeepWiki
    
    Args:
        repo_url: URL of the GitHub repository to query
        question: Question to ask about the repository
        stream: Whether to stream the response
        deep_research: Whether to use deep research mode
        
    Returns:
        Chat response
    """
    start_time = time.time()
    
    # Create the request payload
    payload = {
        "repo_url": repo_url,
        "messages": [
            {
                "role": "user",
                "content": question
            }
        ],
        "stream": stream,
        "deep_research": deep_research
    }
    
    print(f"Repository: {repo_url}")
    print(f"Question: {question}")
    print(f"Deep research: {deep_research}")
    
    try:
        # Make the request
        response = requests.post(
            "http://localhost:8001/chat/completions/stream",
            json=payload
        )
        
        # Check for success
        if response.status_code == 200:
            end_time = time.time()
            duration = end_time - start_time
            
            print(f"Query completed in {duration:.2f} seconds")
            
            if stream:
                # For streaming responses, we'd need to process the stream
                print("Streaming response received (partial content):")
                print(response.text[:500] + "...")
                return response.text
            else:
                # For non-streaming, return the parsed JSON
                result = response.json()
                print(f"Chat response received ({len(json.dumps(result))} bytes)")
                return result
        else:
            print(f"Error: Received status code {response.status_code}")
            print(response.text)
            return None
            
    except Exception as e:
        print(f"Error querying repository: {str(e)}")
        return None

def main():
    parser = argparse.ArgumentParser(description='Test DeepWiki chat API')
    parser.add_argument('repo_url', help='GitHub repository URL')
    parser.add_argument('question', help='Question to ask about the repository')
    parser.add_argument('--output', help='Output file for chat results')
    parser.add_argument('--stream', action='store_true', help='Use streaming mode')
    parser.add_argument('--deep-research', action='store_true', help='Use deep research mode')
    
    args = parser.parse_args()
    
    # Run the chat query
    result = query_repository(args.repo_url, args.question, args.stream, args.deep_research)
    
    # Save the results if requested
    if args.output and result:
        with open(args.output, 'w') as f:
            if isinstance(result, str):
                f.write(result)
            else:
                json.dump(result, f, indent=2)
        print(f"Results saved to {args.output}")

if __name__ == "__main__":
    main()
EOF

echo -e "${GREEN}Created test scripts in deepwiki_api_investigation directory${NC}"

# Instructions document
cat > "$DOCS_DIR/findings/investigation_guide.md" << EOF
# DeepWiki Kubernetes CLI/Console Investigation Guide

## Environment Details
- **Namespace:** $NAMESPACE
- **Pod:** $POD_NAME
- **Investigation Date:** $(date)

## Test Scripts

Test scripts have been created in the \`deepwiki_api_investigation\` directory:

1. \`test_repository_analysis.py\` - For testing repository analysis
2. \`test_chat_api.py\` - For testing chat queries

## Next Steps

### 1. Set up port forwarding

```bash
kubectl port-forward -n $NAMESPACE svc/deepwiki-api 8001:8001
```

### 2. Copy the test scripts to the pod

```bash
kubectl cp deepwiki_api_investigation/test_repository_analysis.py $NAMESPACE/$POD_NAME:/tmp/test_repository_analysis.py
kubectl cp deepwiki_api_investigation/test_chat_api.py $NAMESPACE/$POD_NAME:/tmp/test_chat_api.py
```

### 3. Run the test scripts

```bash
# Test repository analysis
kubectl exec -it $POD_NAME -n $NAMESPACE -- python /tmp/test_repository_analysis.py https://github.com/AsyncFuncAI/deepwiki-open --mode concise --output /tmp/analysis_results.json

# Test chat queries
kubectl exec -it $POD_NAME -n $NAMESPACE -- python /tmp/test_chat_api.py https://github.com/AsyncFuncAI/deepwiki-open "What is the architecture of this repository?" --output /tmp/chat_results.json
```

### 4. Retrieve the results

```bash
kubectl cp $NAMESPACE/$POD_NAME:/tmp/analysis_results.json ./analysis_results.json
kubectl cp $NAMESPACE/$POD_NAME:/tmp/chat_results.json ./chat_results.json
```

### 5. Complete the command reference document at:
\`$DOCS_DIR/kubernetes-command-reference.md\`

## Implementation Notes

Based on the investigation, update the \`DeepWikiKubernetesService\` implementation in:
\`/Users/alpinro/Code Prjects/codequal/packages/core/src/services/deepwiki-kubernetes.service.ts\`
EOF

echo -e "${GREEN}Created investigation guide at $DOCS_DIR/findings/investigation_guide.md${NC}"

# Final summary
echo -e "\n${BLUE}=== Investigation Preparation Complete ===${NC}"
echo -e "Investigation documents and test scripts have been created."
echo -e "\nThe following files are ready for your review:"
echo -e "1. Initial findings: ${YELLOW}$DOCS_DIR/findings/initial_investigation.md${NC}"
echo -e "2. Investigation guide: ${YELLOW}$DOCS_DIR/findings/investigation_guide.md${NC}"
echo -e "3. Command reference template: ${YELLOW}$DOCS_DIR/kubernetes-command-reference.md${NC}"
echo -e "4. Test scripts: ${YELLOW}deepwiki_api_investigation/test_*.py${NC}"

echo -e "\n${YELLOW}Note:${NC} The full exploration of DeepWiki requires an active Kubernetes cluster."
echo -e "Follow the instructions in the investigation guide to complete the investigation."
