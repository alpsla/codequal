DeepWiki Kubernetes CLI/Console Investigation Guide
1. Environment Overview
Based on the initial investigation, we have identified the following:

Namespace: codequal-dev
Pod: deepwiki-779df6764f-fwcrg
Container: deepwiki
Services:
deepwiki-api (8001/TCP)
deepwiki-fixed (8001/TCP, 80/TCP)
deepwiki-frontend (80/TCP)
Image: ghcr.io/asyncfuncai/deepwiki-open:latest
Data Volume: /root/.adalflow (from PVC deepwiki-data-new)
API Keys: OPENAI_API_KEY and GOOGLE_API_KEY are set from Kubernetes secrets
2. Investigation Steps
Step 1: Explore the DeepWiki API
The DeepWiki service exposes functionality primarily through a REST API rather than a traditional CLI. The main API endpoint is running on port 8001.

bash
# Set up port forwarding to access the API
kubectl port-forward -n codequal-dev svc/deepwiki-api 8001:8001
In a new terminal, verify the API is accessible:

bash
curl http://localhost:8001
Step 2: Identify Available API Endpoints
Run the following Python script to identify the available API endpoints. This will help understand what functionality is available.

bash
# Copy the exploration script to the pod
cat > explore_api.py << 'EOF'
import requests
import json

try:
    # Get the OpenAPI schema
    response = requests.get("http://localhost:8001/openapi.json")
    if response.status_code == 200:
        schema = response.json()
        print("API Endpoints:")
        for path, methods in schema.get("paths", {}).items():
            for method, details in methods.items():
                print(f"{method.upper()} {path}")
                print(f"  Description: {details.get('description', 'No description')}")
                print(f"  Parameters: {json.dumps(details.get('parameters', []), indent=2)}")
                print()
    else:
        print(f"Failed to get OpenAPI schema: {response.status_code}")
        
        # Alternative approach: check common endpoints
        common_endpoints = [
            "/",
            "/docs",
            "/openapi.json",
            "/chat/completions",
            "/chat/completions/stream",
            "/health",
            "/version"
        ]
        print("\nChecking common endpoints:")
        for endpoint in common_endpoints:
            try:
                response = requests.get(f"http://localhost:8001{endpoint}")
                print(f"GET {endpoint}: {response.status_code}")
            except Exception as e:
                print(f"GET {endpoint}: Error - {str(e)}")
except Exception as e:
    print(f"Error exploring API: {str(e)}")
EOF

kubectl cp explore_api.py codequal-dev/deepwiki-779df6764f-fwcrg:/tmp/explore_api.py
kubectl exec -it deepwiki-779df6764f-fwcrg -n codequal-dev -- python /tmp/explore_api.py > api_endpoints.txt
Step 3: Investigate Configuration Files
bash
# Create a script to check configuration files
cat > check_config.py << 'EOF'
import os
import json

def explore_directory(dir_path, max_depth=3, current_depth=0):
    if current_depth > max_depth:
        return
        
    try:
        if not os.path.exists(dir_path):
            print(f"Directory does not exist: {dir_path}")
            return
            
        print(f"\nExploring directory: {dir_path}")
        items = os.listdir(dir_path)
        
        for item in items:
            item_path = os.path.join(dir_path, item)
            
            # Skip if it's a symlink to avoid loops
            if os.path.islink(item_path):
                print(f"  [SYMLINK] {item}")
                continue
                
            if os.path.isdir(item_path):
                print(f"  [DIR] {item}")
                if "config" in item.lower() or "adalflow" in item.lower():
                    explore_directory(item_path, max_depth, current_depth + 1)
            else:
                print(f"  [FILE] {item}")
                
                # Read config files
                if item.endswith(('.json', '.yaml', '.yml', '.conf')) and "config" in item_path.lower():
                    try:
                        with open(item_path, 'r') as f:
                            content = f.read()
                            print(f"\n--- Content of {item_path} ---")
                            print(content[:500] + "..." if len(content) > 500 else content)
                            print("--- End of file ---\n")
                    except Exception as e:
                        print(f"  Error reading {item_path}: {str(e)}")
    except Exception as e:
        print(f"Error exploring {dir_path}: {str(e)}")

# Explore key directories
print("Exploring configuration directories")
explore_directory("/app/api/config")
explore_directory("/app/config")
explore_directory("/root/.adalflow")
EOF

kubectl cp check_config.py codequal-dev/deepwiki-779df6764f-fwcrg:/tmp/check_config.py
kubectl exec -it deepwiki-779df6764f-fwcrg -n codequal-dev -- python /tmp/check_config.py > config_files.txt
Step 4: Test Repository Analysis
bash
# Create an analysis test script
cat > test_analysis.py << 'EOF'
import requests
import json
import time

def analyze_repository(repo_url, mode='comprehensive'):
    """
    Analyze a repository using DeepWiki
    
    Args:
        repo_url: URL of the GitHub repository to analyze
        mode: 'comprehensive' or 'concise'
        
    Returns:
        Analysis results
    """
    start_time = time.time()
    
    # Prepare query based on mode
    content = "Analyze this repository"
    if mode == 'concise':
        content += " with concise documentation"
    
    # Create request payload
    payload = {
        "repo_url": repo_url,
        "messages": [
            {
                "role": "user",
                "content": content
            }
        ],
        "stream": False
    }
    
    print(f"Analyzing repository: {repo_url}")
    print(f"Mode: {mode}")
    
    try:
        # Make request
        response = requests.post(
            "http://localhost:8001/chat/completions/stream",
            json=payload
        )
        
        # Check for success
        if response.status_code == 200:
            end_time = time.time()
            duration = end_time - start_time
            
            print(f"Analysis completed in {duration:.2f} seconds")
            
            # For non-streaming, return parsed JSON
            result = response.json()
            print(f"Analysis result received ({len(json.dumps(result))} bytes)")
            
            # Save results
            with open("/tmp/analysis_results.json", "w") as f:
                json.dump(result, f, indent=2)
            print("Results saved to /tmp/analysis_results.json")
            
            return result
        else:
            print(f"Error: Received status code {response.status_code}")
            print(response.text)
            return None
            
    except Exception as e:
        print(f"Error analyzing repository: {str(e)}")
        return None

# Test with DeepWiki's own repository (concise mode for faster results)
analyze_repository("https://github.com/AsyncFuncAI/deepwiki-open", mode="concise")
EOF

kubectl cp test_analysis.py codequal-dev/deepwiki-779df6764f-fwcrg:/tmp/test_analysis.py
kubectl exec -it deepwiki-779df6764f-fwcrg -n codequal-dev -- python /tmp/test_analysis.py > analysis_test_output.txt
kubectl cp codequal-dev/deepwiki-779df6764f-fwcrg:/tmp/analysis_results.json ./analysis_results.json
Step 5: Test Chat Queries
bash
# Create a chat test script
cat > test_chat.py << 'EOF'
import requests
import json
import time

def query_repository(repo_url, question, deep_research=False):
    """
    Ask a question about a repository using DeepWiki
    
    Args:
        repo_url: URL of the GitHub repository to query
        question: Question to ask about the repository
        deep_research: Whether to use deep research mode
        
    Returns:
        Chat response
    """
    start_time = time.time()
    
    # Create request payload
    payload = {
        "repo_url": repo_url,
        "messages": [
            {
                "role": "user",
                "content": question
            }
        ],
        "stream": False,
        "deep_research": deep_research
    }
    
    print(f"Repository: {repo_url}")
    print(f"Question: {question}")
    print(f"Deep research: {deep_research}")
    
    try:
        # Make request
        response = requests.post(
            "http://localhost:8001/chat/completions/stream",
            json=payload
        )
        
        # Check for success
        if response.status_code == 200:
            end_time = time.time()
            duration = end_time - start_time
            
            print(f"Query completed in {duration:.2f} seconds")
            
            # For non-streaming, return parsed JSON
            result = response.json()
            print(f"Chat response received ({len(json.dumps(result))} bytes)")
            
            # Save results
            with open("/tmp/chat_results.json", "w") as f:
                json.dump(result, f, indent=2)
            print("Results saved to /tmp/chat_results.json")
            
            return result
        else:
            print(f"Error: Received status code {response.status_code}")
            print(response.text)
            return None
            
    except Exception as e:
        print(f"Error querying repository: {str(e)}")
        return None

# Test with DeepWiki's own repository
query_repository(
    "https://github.com/AsyncFuncAI/deepwiki-open", 
    "What is the architecture of this repository?"
)
EOF

kubectl cp test_chat.py codequal-dev/deepwiki-779df6764f-fwcrg:/tmp/test_chat.py
kubectl exec -it deepwiki-779df6764f-fwcrg -n codequal-dev -- python /tmp/test_chat.py > chat_test_output.txt
kubectl cp codequal-dev/deepwiki-779df6764f-fwcrg:/tmp/chat_results.json ./chat_results.json
Step 6: Check Model Provider Configuration
bash
# Create a script to check model providers
cat > check_models.py << 'EOF'
import os
import json
import importlib.util
import sys

# Try to find config files
def find_config_file(filename, search_dirs):
    for dir_path in search_dirs:
        filepath = os.path.join(dir_path, filename)
        if os.path.exists(filepath):
            return filepath
    return None

# Explore environment variables
print("Environment Variables (API Keys masked):")
for key, value in os.environ.items():
    if any(secret_word in key.lower() for secret_word in ['key', 'token', 'secret', 'password']):
        # Mask API keys for security
        print(f"{key}=****")
    else:
        print(f"{key}={value}")

# Check for config files
search_dirs = [
    "/app/api/config",
    "/app/config",
    "/root/.adalflow/config",
    ".",
    "/app",
    "/root/.adalflow"
]

# Try to find generator.json
generator_path = find_config_file("generator.json", search_dirs)
if generator_path:
    try:
        with open(generator_path, 'r') as f:
            config = json.load(f)
            print(f"\nFound generator.json at {generator_path}")
            print("Available providers:")
            for provider, details in config.get('providers', {}).items():
                print(f"  - {provider}")
                print(f"    Default model: {details.get('default_model', 'Not specified')}")
                print(f"    Available models: {', '.join(details.get('available_models', []))}")
    except Exception as e:
        print(f"Error reading generator.json: {str(e)}")
else:
    print("\nCould not find generator.json")

# Try to find embedder.json
embedder_path = find_config_file("embedder.json", search_dirs)
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
    print("\nCould not find embedder.json")

# Try to find Python modules
try:
    # Check if we can import the modules
    spec = importlib.util.find_spec("api.main")
    if spec:
        print("\nFound api.main module")
        try:
            import api.main
            if hasattr(api.main, 'app'):
                print("FastAPI app found in api.main")
                
                # Try to get routes
                routes = getattr(api.main.app, 'routes', [])
                print(f"Number of routes: {len(routes)}")
                for route in routes[:5]:  # Show first 5 routes
                    print(f"  {getattr(route, 'methods', 'Unknown')} {getattr(route, 'path', 'Unknown')}")
        except Exception as e:
            print(f"Error importing api.main: {str(e)}")
    else:
        print("\napi.main module not found")
except Exception as e:
    print(f"Error checking for modules: {str(e)}")

# Try to find the database directory
adalflow_dir = "/root/.adalflow"
if os.path.exists(adalflow_dir):
    print(f"\nFound .adalflow directory: {adalflow_dir}")
    try:
        subdirs = os.listdir(adalflow_dir)
        print("Subdirectories:")
        for subdir in subdirs:
            print(f"  - {subdir}")
            
        # Check for databases
        databases_dir = os.path.join(adalflow_dir, "databases")
        if os.path.exists(databases_dir):
            print(f"\nFound databases directory: {databases_dir}")
            db_files = os.listdir(databases_dir)
            print("Database files:")
            for db_file in db_files:
                print(f"  - {db_file}")
    except Exception as e:
        print(f"Error exploring .adalflow directory: {str(e)}")
else:
    print(f"\n.adalflow directory not found")
EOF

kubectl cp check_models.py codequal-dev/deepwiki-779df6764f-fwcrg:/tmp/check_models.py
kubectl exec -it deepwiki-779df6764f-fwcrg -n codequal-dev -- python /tmp/check_models.py > model_providers.txt
Step 7: Retrieve and Analyze Results
bash
# Get all the generated files
kubectl cp codequal-dev/deepwiki-779df6764f-fwcrg:/tmp/analysis_results.json ./analysis_results.json
kubectl cp codequal-dev/deepwiki-779df6764f-fwcrg:/tmp/chat_results.json ./chat_results.json

# Analyze the JSON structure of the results
python -c "
import json
import sys

def analyze_json_structure(file_path):
    print(f'Analyzing {file_path}:')
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
        
        # Print top-level keys
        print('Top-level keys:')
        for key in data.keys():
            print(f'  - {key}')
        
        # Print structure recursively with max depth
        def print_structure(obj, prefix='', max_depth=3, current_depth=0):
            if current_depth > max_depth:
                return
            
            if isinstance(obj, dict):
                for key, value in obj.items():
                    if isinstance(value, (dict, list)):
                        print(f'{prefix}{key}: {type(value).__name__}')
                        print_structure(value, prefix + '  ', max_depth, current_depth + 1)
                    else:
                        value_str = str(value)
                        if len(value_str) > 50:
                            value_str = value_str[:47] + '...'
                        print(f'{prefix}{key}: {type(value).__name__} = {value_str}')
            elif isinstance(obj, list) and len(obj) > 0:
                print(f'{prefix}[0]: {type(obj[0]).__name__}')
                if len(obj) > 1:
                    print(f'{prefix}... ({len(obj)} items total)')
                print_structure(obj[0], prefix + '  ', max_depth, current_depth + 1)
        
        print('\nStructure:')
        print_structure(data)
    except Exception as e:
        print(f'Error analyzing {file_path}: {str(e)}')

if len(sys.argv) > 1:
    for file_path in sys.argv[1:]:
        analyze_json_structure(file_path)
        print()
else:
    analyze_json_structure('./analysis_results.json')
    print('\\n' + '-'*40 + '\\n')
    analyze_json_structure('./chat_results.json')
" ./analysis_results.json ./chat_results.json > json_structure_analysis.txt
3. Key Findings and Implementation Recommendations
Based on the investigation, we can make the following conclusions and recommendations:

API Structure
DeepWiki uses a FastAPI-based REST API with these key endpoints:

/chat/completions/stream - Main endpoint for both repository analysis and chat queries
Additional endpoints discovered during investigation
Authentication and Configuration
API keys are set via environment variables
Configuration is stored in JSON files (generator.json, embedder.json)
Model selection is controlled via request parameters
Implementation
The DeepWikiKubernetesService implementation should follow this approach:

typescript
import axios from 'axios';
import { Logger } from '@core/logger';
import { ConfigurationManager } from '@core/config';

export class DeepWikiKubernetesService {
  private readonly namespace: string;
  private readonly apiServiceName: string;
  
  constructor(config: ConfigurationManager, logger: Logger) {
    this.namespace = config.get('deepwiki.kubernetes.namespace') || 'codequal-dev';
    this.apiServiceName = config.get('deepwiki.kubernetes.apiService') || 'deepwiki-api';
  }
  
  public async analyzeRepository(options: {
    repositoryUrl: string;
    provider: string;  // From repository-model-config.ts via orchestrator
    model: string;     // From repository-model-config.ts via orchestrator
    mode?: 'comprehensive' | 'concise';
  }): Promise<any> {
    // Use the model information from the calibration system
    const content = options.mode === 'concise' 
      ? 'Analyze this repository with concise documentation'
      : 'Analyze this repository';
    
    const response = await this.makeApiRequest('/chat/completions/stream', {
      messages: [
        { role: 'user', content }
      ],
      repository_url: options.repositoryUrl,
      provider: options.provider,
      model: options.model,
      stream: false
    });
    
    return response;
  }
  
  public async queryChat(options: {
    repositoryUrl: string;
    question: string;
    provider: string;  // From calibration system
    model: string;     // From calibration system
    deepResearch?: boolean;
  }): Promise<any> {
    const response = await this.makeApiRequest('/chat/completions/stream', {
      messages: [
        { role: 'user', content: options.question }
      ],
      repository_url: options.repositoryUrl,
      provider: options.provider,
      model: options.model,
      deep_research: options.deepResearch || false,
      stream: false
    });
    
    return response;
  }
  
  private async makeApiRequest(endpoint: string, data: any): Promise<any> {
    const apiUrl = `http://${this.apiServiceName}.${this.namespace}.svc.cluster.local:8001`;
    
    const response = await axios.post(`${apiUrl}${endpoint}`, data, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    return response.data;
  }
  
  public async isReady(): Promise<boolean> {
    try {
      const apiUrl = `http://${this.apiServiceName}.${this.namespace}.svc.cluster.local:8001`;
      const response = await axios.get(apiUrl);
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}
4. Three-Tier Analysis Implementation
Tier 1: Comprehensive Repository + PR Analysis
Use DeepWiki for in-depth analysis with the repository context:

typescript
async function performComprehensiveAnalysis(repository, pr) {
  // Get optimal configuration from calibration system
  const repoConfig = getRepositoryModelConfig(repository);
  
  // Do deep repository analysis
  const repoAnalysis = await deepwikiService.analyzeRepository({
    repositoryUrl: repository.url,
    provider: repoConfig.deepwiki.provider,
    model: repoConfig.deepwiki.model,
    mode: 'comprehensive'
  });
  
  // Store in vector database for future use
  await vectorDbService.storeRepositoryAnalysis(repository, repoAnalysis);
  
  // Analyze PR with repository context
  const prAnalysis = await analyzePRWithContext(pr, repoAnalysis);
  
  return {
    repositoryAnalysis: repoAnalysis,
    prAnalysis
  };
}
Tier 2: PR-Only Analysis + Cached DeepWiki Data
Use cached repository analysis for faster PR analysis:

typescript
async function performPRFocusedAnalysis(repository, pr) {
  // Get cached repository analysis
  const cachedAnalysis = await vectorDbService.getRepositoryAnalysis(repository);
  
  if (!cachedAnalysis) {
    // Fall back to Tier 1 if no cached analysis
    return performComprehensiveAnalysis(repository, pr);
  }
  
  // Analyze PR with cached context
  const prAnalysis = await analyzePRWithContext(pr, cachedAnalysis);
  
  return {
    repositoryAnalysis: cachedAnalysis,
    prAnalysis
  };
}
Tier 3: Targeted Architectural Deep Dives
Focus on specific aspects using DeepWiki chat:

typescript
async function performTargetedAnalysis(repository, pr, aspect) {
  // Get optimal configuration
  const repoConfig = getRepositoryModelConfig(repository);
  
  // Get cached analysis if available
  const cachedAnalysis = await vectorDbService.getRepositoryAnalysis(repository);
  
  // Create targeted question
  const question = `Analyze the ${aspect} architecture of this repository, focusing on aspects relevant to the changes in PR ${pr.number}.`;
  
  // Use deep research for targeted query
  const aspectAnalysis = await deepwikiService.queryChat({
    repositoryUrl: repository.url,
    question,
    provider: repoConfig.deepwiki.provider,
    model: repoConfig.deepwiki.model,
    deepResearch: true
  });
  
  // Analyze PR with targeted context
  const prAnalysis = await analyzePRWithTargetedContext(pr, aspectAnalysis, aspect);
  
  return {
    repositoryAnalysis: cachedAnalysis || null,
    targetedAnalysis: aspectAnalysis,
    prAnalysis
  };
}
5. Next Steps
Complete the DeepWikiKubernetesService implementation
Update repository-model-config.ts to include DeepWiki configurations
Integrate with the vector database for analysis caching
Implement the three-tier analysis approach in the orchestrator
Create unit and integration tests
Add monitoring and error handling
Document the API interface for other components
Appendix: Command Reference
See kubernetes-command-reference.md for a comprehensive reference of all DeepWiki commands and API endpoints discovered during this investigation.

