#!/bin/bash
# explore_deepwiki_api.sh - Script to explore DeepWiki API capabilities
# Created: May 16, 2025

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get namespace and pod name from arguments or use defaults
NAMESPACE=${1:-"codequal-dev"}
POD_NAME=${2:-$(kubectl get pods -n "$NAMESPACE" -l app=deepwiki -o jsonpath='{.items[0].metadata.name}')}
CONTAINER_NAME=${3:-"deepwiki"}

# Create results directory
RESULTS_DIR="deepwiki_api_investigation"
mkdir -p "$RESULTS_DIR"

echo -e "${BLUE}=== DeepWiki API Investigation ===${NC}"
echo -e "Using pod ${YELLOW}$POD_NAME${NC} in namespace ${YELLOW}$NAMESPACE${NC}"

# Check if the pod exists
if ! kubectl get pod "$POD_NAME" -n "$NAMESPACE" &> /dev/null; then
    echo -e "${RED}Error: Pod $POD_NAME does not exist in namespace $NAMESPACE${NC}"
    
    # List available pods to help
    echo -e "Available pods in namespace $NAMESPACE:"
    kubectl get pods -n "$NAMESPACE"
    
    exit 1
fi

# Function to execute Python code in the pod
execute_python() {
    local code="$1"
    local output_file="$2"
    
    echo -e "${GREEN}Executing Python code in pod...${NC}"
    kubectl exec "$POD_NAME" -n "$NAMESPACE" -c "$CONTAINER_NAME" -- python -c "$code" > "$RESULTS_DIR/$output_file" 2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Success!${NC} Output saved to $RESULTS_DIR/$output_file"
    else
        echo -e "${RED}Error executing Python code${NC}"
        cat "$RESULTS_DIR/$output_file"
    fi
}

# Step 1: Check for FastAPI application structure
echo -e "\n${GREEN}Checking FastAPI application structure...${NC}"
FASTAPI_CODE=$(cat << 'EOF'
import importlib.util
import sys
import os
import json

# Try to find the FastAPI app
try:
    # Method 1: Try to import api.main
    try:
        from api.main import app
        print("Successfully imported the FastAPI app from api.main")
    except ImportError:
        # Method 2: Try to load the module directly
        main_py_locations = [
            "/app/api/main.py",
            "./api/main.py",
            "/api/main.py",
            "./main.py",
            "/app/main.py"
        ]
        
        for location in main_py_locations:
            if os.path.exists(location):
                spec = importlib.util.spec_from_file_location("main", location)
                main = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(main)
                app = getattr(main, "app", None)
                if app:
                    print(f"Successfully loaded FastAPI app from {location}")
                    break
        else:
            print("Could not find FastAPI app in any of the expected locations")
            app = None
    
    # Print application routes
    if app:
        routes_info = []
        for route in app.routes:
            route_info = {
                "path": getattr(route, "path", "Unknown"),
                "methods": list(getattr(route, "methods", [])),
                "name": getattr(route, "name", "Unknown"),
                "endpoint": str(getattr(route, "endpoint", "Unknown"))
            }
            routes_info.append(route_info)
        
        print("\nAPI Routes:")
        print(json.dumps(routes_info, indent=2))
    
    # Try to find configuration files
    print("\nSearching for configuration files...")
    config_locations = [
        "/app/api/config",
        "./api/config",
        "/api/config",
        "/app/config",
        "./config"
    ]
    
    for location in config_locations:
        if os.path.exists(location):
            print(f"Found config directory: {location}")
            print("Files in the config directory:")
            for filename in os.listdir(location):
                filepath = os.path.join(location, filename)
                print(f"  - {filename}")
                
                if filename.endswith('.json'):
                    try:
                        with open(filepath, 'r') as f:
                            config_data = json.load(f)
                            print(f"  Content of {filename}:")
                            print(f"  {json.dumps(config_data, indent=2)}")
                    except Exception as e:
                        print(f"  Error reading {filename}: {str(e)}")
            break
    else:
        print("Could not find any config directory")
    
except Exception as e:
    print(f"Error exploring FastAPI app: {str(e)}")
    import traceback
    traceback.print_exc()

# Try to find Python modules related to DeepWiki
print("\nSearching for Python modules...")
module_names = [
    "api.data_pipeline",
    "api.rag",
    "api.config",
    "api.simple_chat"
]

for module_name in module_names:
    try:
        module = __import__(module_name, fromlist=["*"])
        print(f"Successfully imported {module_name}")
        print(f"Module contents: {dir(module)}")
    except ImportError as e:
        print(f"Could not import {module_name}: {str(e)}")

# Print current working directory and Python path
print("\nWorking directory:", os.getcwd())
print("Python path:", sys.path)
EOF
)

execute_python "$FASTAPI_CODE" "fastapi_structure.txt"

# Step 2: Try to get environment variables (masked for security)
echo -e "\n${GREEN}Getting environment variables (API keys masked)...${NC}"
ENV_CODE=$(cat << 'EOF'
import os
import re

# Get all environment variables
env_vars = os.environ.copy()

# Mask API keys for security
masked_vars = {}
for key, value in env_vars.items():
    # Check if it might be an API key
    if any(secret_word in key.lower() for secret_word in ['key', 'token', 'secret', 'password', 'auth']):
        # Show just the first and last 4 characters
        if len(value) > 8:
            masked_value = value[:4] + '*' * (len(value) - 8) + value[-4:]
        else:
            masked_value = '*' * len(value)
        masked_vars[key] = masked_value
    else:
        masked_vars[key] = value

# Print variables in alphabetical order
for key in sorted(masked_vars.keys()):
    print(f"{key}={masked_vars[key]}")

# Check for specific API keys needed by DeepWiki
print("\nChecking for required DeepWiki API keys:")
required_keys = [
    "OPENROUTER_API_KEY",
    "GOOGLE_API_KEY",
    "OPENAI_API_KEY",
    "OPENAI_API_BASE",
    "ANTHROPIC_API_KEY",
    "HUGGINGFACE_API_KEY"
]

for key in required_keys:
    if key in env_vars:
        print(f"✅ {key} is set")
    else:
        print(f"❌ {key} is NOT set")
EOF
)

execute_python "$ENV_CODE" "environment_variables.txt"

# Step 3: Explore data structures and model providers
echo -e "\n${GREEN}Exploring data structures and model providers...${NC}"
MODELS_CODE=$(cat << 'EOF'
import sys
import os
import json
import importlib

# Try to locate and read the generator.json file
def find_config_file(filename):
    config_locations = [
        "/app/api/config",
        "./api/config",
        "/api/config",
        "/app/config",
        "./config",
        "."
    ]
    
    for location in config_locations:
        filepath = os.path.join(location, filename)
        if os.path.exists(filepath):
            return filepath
    
    return None

# Check model providers
print("Checking available model providers...")

# Try to find generator.json
generator_path = find_config_file("generator.json")
if generator_path:
    try:
        with open(generator_path, 'r') as f:
            config = json.load(f)
            print(f"Found generator.json at {generator_path}")
            print("Available providers:")
            for provider, details in config.get('providers', {}).items():
                print(f"  - {provider}")
                print(f"    Default model: {details.get('default_model', 'Not specified')}")
                print(f"    Available models: {', '.join(details.get('available_models', []))}")
    except Exception as e:
        print(f"Error reading generator.json: {str(e)}")
else:
    print("Could not find generator.json")

# Try to find embedder.json
embedder_path = find_config_file("embedder.json")
if embedder_path:
    try:
        with open(embedder_path, 'r') as f:
            config = json.load(f)
            print(f"\nFound embedder.json at {embedder_path}")
            print("Embedding configuration:")
            print(json.dumps(config, indent=2))
    except Exception as e:
        print(f"Error reading embedder.json: {str(e)}")
else:
    print("Could not find embedder.json")

# Try to explore data pipeline structure
print("\nExploring DatabaseManager functionality...")
try:
    # Try to import the database manager
    try:
        from api.data_pipeline import DatabaseManager
        print("Successfully imported DatabaseManager")
        
        # List available methods
        print("Available methods in DatabaseManager:")
        dm_methods = [method for method in dir(DatabaseManager) if not method.startswith('__')]
        for method in dm_methods:
            print(f"  - {method}")
        
    except ImportError as e:
        print(f"Could not import DatabaseManager: {str(e)}")

except Exception as e:
    print(f"Error exploring DatabaseManager: {str(e)}")
EOF
)

execute_python "$MODELS_CODE" "model_providers.txt"

# Step 4: Explore repository analysis capability
echo -e "\n${GREEN}Exploring repository analysis capability...${NC}"
REPO_ANALYSIS_CODE=$(cat << 'EOF'
import importlib
import os
import json
import time

print("Testing repository analysis capability...")

# Try to find the relevant modules for repository analysis
try:
    # First try to import the API module
    try:
        import api.data_pipeline
        print("Successfully imported api.data_pipeline")
        
        # Check if repository preparation method exists
        if hasattr(api.data_pipeline, 'DatabaseManager'):
            db_manager_class = api.data_pipeline.DatabaseManager
            
            # Check if the prepare_database method exists
            if hasattr(db_manager_class, 'prepare_database'):
                print("Found prepare_database method - this is likely how repositories are analyzed")
                print("Method signature:", db_manager_class.prepare_database.__doc__ if hasattr(db_manager_class.prepare_database, '__doc__') else "No docstring available")
            else:
                print("DatabaseManager does not have prepare_database method")
            
            # List all methods in DatabaseManager
            print("\nAvailable methods in DatabaseManager:")
            for method_name in dir(db_manager_class):
                if not method_name.startswith('__'):
                    method = getattr(db_manager_class, method_name)
                    print(f"  - {method_name}")
                    if hasattr(method, '__doc__') and method.__doc__:
                        print(f"    {method.__doc__.strip()}")
        else:
            print("api.data_pipeline does not have DatabaseManager class")
        
    except ImportError as e:
        print(f"Could not import api.data_pipeline: {str(e)}")
    
    # Try to find any analysis-related functions
    print("\nSearching for analysis-related functions...")
    try:
        import api.main
        print("Successfully imported api.main")
        
        # Check if there are endpoints for analysis
        for route_name in dir(api.main):
            if 'analyze' in route_name.lower() or 'chat' in route_name.lower() or 'completion' in route_name.lower():
                print(f"Found potential analysis endpoint: {route_name}")
    except ImportError as e:
        print(f"Could not import api.main: {str(e)}")
    
    # Try to test a basic repository analysis using the API
    try:
        import requests
        print("\nTesting API-based repository analysis...")
        
        # Try to find the API port
        api_port = 8001  # Default port based on documentation
        
        try:
            # See if we can access the API locally
            response = requests.get(f"http://localhost:{api_port}")
            print(f"API available at http://localhost:{api_port}, status code: {response.status_code}")
        except Exception as e:
            print(f"Could not access API on port {api_port}: {str(e)}")
            print("This is normal if the API server is not running or using a different port")
        
        # Output how to test repository analysis via API
        print("\nTo analyze a repository via the API, you would use:")
        print(f"""
curl -X POST http://localhost:{api_port}/chat/completions/stream \\
  -H "Content-Type: application/json" \\
  -d '{{
    "repo_url": "https://github.com/example/repo",
    "messages": [
      {{
        "role": "user",
        "content": "Analyze this repository"
      }}
    ],
    "stream": false
  }}'
""")
    except ImportError:
        print("requests module not available, skipping API testing")

except Exception as e:
    print(f"Error exploring repository analysis: {str(e)}")
    import traceback
    traceback.print_exc()
EOF
)

execute_python "$REPO_ANALYSIS_CODE" "repository_analysis.txt"

# Step 5: Explore chat API capabilities
echo -e "\n${GREEN}Exploring chat API capabilities...${NC}"
CHAT_API_CODE=$(cat << 'EOF'
import importlib
import os
import json

print("Exploring chat API capabilities...")

# Try to find the chat-related modules
try:
    # First try to import simple_chat module
    try:
        import api.simple_chat
        print("Successfully imported api.simple_chat")
        
        # List all functions in the module
        print("Functions in api.simple_chat:")
        for func_name in dir(api.simple_chat):
            if not func_name.startswith('__'):
                func = getattr(api.simple_chat, func_name)
                print(f"  - {func_name}")
                if hasattr(func, '__doc__') and func.__doc__:
                    print(f"    {func.__doc__.strip()}")
    except ImportError as e:
        print(f"Could not import api.simple_chat: {str(e)}")
    
    # Try to import RAG module
    try:
        import api.rag
        print("\nSuccessfully imported api.rag")
        
        # Check if RAG class exists
        if hasattr(api.rag, 'RAG'):
            rag_class = api.rag.RAG
            
            # List all methods in RAG class
            print("Methods in api.rag.RAG:")
            for method_name in dir(rag_class):
                if not method_name.startswith('__'):
                    method = getattr(rag_class, method_name)
                    print(f"  - {method_name}")
                    if hasattr(method, '__doc__') and method.__doc__:
                        print(f"    {method.__doc__.strip()}")
        else:
            print("api.rag does not have RAG class")
    except ImportError as e:
        print(f"Could not import api.rag: {str(e)}")
    
    # Try to find the chat API endpoint
    print("\nSearching for chat API endpoints...")
    try:
        import api.main
        
        # Check if there are endpoints for chat
        has_chat_endpoints = False
        for name in dir(api.main):
            if 'chat' in name.lower() or 'completion' in name.lower():
                print(f"Found potential chat endpoint: {name}")
                has_chat_endpoints = True
        
        if not has_chat_endpoints:
            print("No obvious chat endpoints found in api.main")
        
        # Look at the app routes if available
        if hasattr(api.main, 'app'):
            print("\nFastAPI routes that might be chat-related:")
            for route in api.main.app.routes:
                path = getattr(route, 'path', 'Unknown')
                if 'chat' in path.lower() or 'completion' in path.lower():
                    print(f"  - {getattr(route, 'methods', ['Unknown'])} {path}")
    except ImportError as e:
        print(f"Could not import api.main: {str(e)}")
    
    # Output example of how to use chat API
    print("\nTo use the chat API, you would typically use:")
    print("""
curl -X POST http://localhost:8001/chat/completions/stream \\
  -H "Content-Type: application/json" \\
  -d '{
    "repo_url": "https://github.com/example/repo",
    "messages": [
      {
        "role": "user",
        "content": "How does this repository handle error cases?"
      }
    ],
    "stream": false
  }'
""")

except Exception as e:
    print(f"Error exploring chat API: {str(e)}")
    import traceback
    traceback.print_exc()
EOF
)

execute_python "$CHAT_API_CODE" "chat_api.txt"

# Step 6: Create a test script for repository analysis
echo -e "\n${GREEN}Creating test script for repository analysis...${NC}"
cat > "$RESULTS_DIR/test_repository_analysis.py" << 'EOF'
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

echo -e "${GREEN}Created test script: ${YELLOW}$RESULTS_DIR/test_repository_analysis.py${NC}"

# Step 7: Create a test script for chat API
echo -e "\n${GREEN}Creating test script for chat API...${NC}"
cat > "$RESULTS_DIR/test_chat_api.py" << 'EOF'
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

echo -e "${GREEN}Created test script: ${YELLOW}$RESULTS_DIR/test_chat_api.py${NC}"

# Create a consolidated summary
echo -e "\n${GREEN}Creating investigation summary...${NC}"
cat > "$RESULTS_DIR/investigation_summary.md" << EOF
# DeepWiki API Investigation Summary

## Overview

This document summarizes the findings from our investigation of the DeepWiki API in the Kubernetes environment.

## Environment

- **Namespace:** $NAMESPACE
- **Pod:** $POD_NAME
- **Container:** $CONTAINER_NAME
- **Investigation Date:** $(date)

## Investigation Results

- **FastAPI Structure:** See [fastapi_structure.txt](./fastapi_structure.txt)
- **Environment Variables:** See [environment_variables.txt](./environment_variables.txt)
- **Model Providers:** See [model_providers.txt](./model_providers.txt)
- **Repository Analysis:** See [repository_analysis.txt](./repository_analysis.txt)
- **Chat API:** See [chat_api.txt](./chat_api.txt)

## Test Scripts

1. **Repository Analysis:** [test_repository_analysis.py](./test_repository_analysis.py)
2. **Chat API:** [test_chat_api.py](./test_chat_api.py)

## Next Steps

1. Review the investigation results
2. Run the test scripts in the Kubernetes environment
3. Document the command reference
4. Update the DeepWikiKubernetesService implementation

## Notes

The DeepWiki service uses a FastAPI-based API rather than a traditional CLI. The main endpoints appear to be:

- \`/chat/completions/stream\` - For both repository analysis and chat queries
- Additional endpoints will be documented after reviewing the investigation results

The primary method of interaction is through HTTP requests, not command-line arguments.
EOF

echo -e "${GREEN}Created investigation summary: ${YELLOW}$RESULTS_DIR/investigation_summary.md${NC}"

# Create instructions for using the test scripts
echo -e "\n${GREEN}Creating instructions for test scripts...${NC}"
cat > "$RESULTS_DIR/test_scripts_instructions.md" << 'EOF'
# DeepWiki Test Scripts Instructions

This document explains how to use the test scripts to interact with the DeepWiki API in the Kubernetes environment.

## Prerequisites

- Access to the Kubernetes cluster with the DeepWiki service
- kubectl configured to access the cluster
- The pod name and namespace for DeepWiki

## Setting Up Port Forwarding

Before using the test scripts, you need to set up port forwarding to access the DeepWiki API:

```bash
# Forward the DeepWiki API port (typically 8001)
kubectl port-forward -n <namespace> svc/deepwiki-api 8001:8001
```

Leave this terminal window open while you run the tests in another terminal.

## Repository Analysis Script

The `test_repository_analysis.py` script demonstrates how to analyze a repository using DeepWiki.

### Usage

```bash
# Forward the script to the pod
kubectl cp test_repository_analysis.py <namespace>/<pod>:/tmp/

# Execute the script in the pod
kubectl exec -it -n <namespace> <pod> -- python /tmp/test_repository_analysis.py \
  https://github.com/example/repo \
  --mode comprehensive \
  --output /tmp/analysis_results.json

# Copy results back from the pod
kubectl cp <namespace>/<pod>:/tmp/analysis_results.json ./analysis_results.json
```

### Options

- `repo_url`: URL of the GitHub repository to analyze (required)
- `--mode`: Analysis mode (`comprehensive` or `concise`, default: `comprehensive`)
- `--output`: Output file for analysis results
- `--stream`: Use streaming mode

## Chat API Script

The `test_chat_api.py` script demonstrates how to ask questions about a repository using the DeepWiki chat API.

### Usage

```bash
# Forward the script to the pod
kubectl cp test_chat_api.py <namespace>/<pod>:/tmp/

# Execute the script in the pod
kubectl exec -it -n <namespace> <pod> -- python /tmp/test_chat_api.py \
  https://github.com/example/repo \
  "What is the architecture of this repository?" \
  --output /tmp/chat_results.json

# Copy results back from the pod
kubectl cp <namespace>/<pod>:/tmp/chat_results.json ./chat_results.json
```

### Options

- `repo_url`: URL of the GitHub repository to query (required)
- `question`: Question to ask about the repository (required)
- `--output`: Output file for chat results
- `--stream`: Use streaming mode
- `--deep-research`: Use deep research mode

## Example Commands

```bash
# Analyze a repository with concise mode
kubectl exec -it -n <namespace> <pod> -- python /tmp/test_repository_analysis.py \
  https://github.com/AsyncFuncAI/deepwiki-open \
  --mode concise \
  --output /tmp/deepwiki_analysis.json

# Ask a question with deep research
kubectl exec -it -n <namespace> <pod> -- python /tmp/test_chat_api.py \
  https://github.com/AsyncFuncAI/deepwiki-open \
  "How does this repository handle error cases?" \
  --output /tmp/error_handling.json \
  --deep-research
```

## Troubleshooting

If you encounter errors:

1. Check that port forwarding is active
2. Verify that the DeepWiki API service is running (`kubectl get svc -n <namespace>`)
3. Check the pod logs for errors (`kubectl logs -n <namespace> <pod>`)
4. Ensure the necessary API keys are configured in the pod environment
EOF

echo -e "${GREEN}Created test scripts instructions: ${YELLOW}$RESULTS_DIR/test_scripts_instructions.md${NC}"

echo -e "\n${BLUE}=== DeepWiki API Investigation Complete ===${NC}"
echo -e "All results saved to the ${YELLOW}$RESULTS_DIR${NC} directory"
echo -e "Review the investigation summary file for next steps"
