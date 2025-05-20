# DeepWiki Kubernetes Integration Guide

## Overview

Based on our review of the `deepwiki-open` project, DeepWiki is a tool that:

1. Analyzes repositories (GitHub, GitLab, or Bitbucket)
2. Creates code embeddings
3. Generates documentation with context-aware AI
4. Creates visual diagrams
5. Provides a Q&A interface through RAG

The project is already deployed in our Kubernetes cluster in the `codequal-dev` namespace, making it ideal for integration with CodeQual.

## Deployment Architecture

DeepWiki is deployed in Kubernetes with the following components:

1. **Deployment**: `deepwiki` in namespace `codequal-dev`
2. **Services**:
   - `deepwiki-frontend` (port 80 → 3000)
   - `deepwiki-api` (port 8001 → 8001)
3. **Persistent Volume**: `deepwiki-data` mounted at `/root/.adalflow`
4. **Secrets**: `deepwiki-env` containing API keys

## CLI Capabilities

DeepWiki does not have a dedicated CLI tool, but we can interact with it in Kubernetes through:

1. API requests to the backend service
2. Direct execution of Python code inside the container

### Method 1: API Interaction

We can interact with DeepWiki by making HTTP requests to its API endpoints:

```bash
# Using kubectl port-forward to access the API
kubectl port-forward -n codequal-dev svc/deepwiki-api 8001:8001

# Example curl request to generate a wiki
curl -X POST http://localhost:8001/chat/completions/stream \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Analyze repository: https://github.com/example/repo"}
    ],
    "repository_url": "https://github.com/example/repo",
    "stream": true
  }'
```

### Method 2: Direct Container Execution

We can execute Python code directly inside the container:

```bash
# Execute Python code in the container
kubectl exec -it -n codequal-dev $(kubectl get pods -n codequal-dev -l app=deepwiki -o name | head -n 1) -- python -c "
from api.data_pipeline import DatabaseManager
from api.rag import RAG

# Initialize the database manager
db_manager = DatabaseManager()

# Prepare the database for a repository
documents = db_manager.prepare_database('https://github.com/example/repo')

# Print the number of documents
print(f'Found {len(documents)} documents')
"
```

## DeepWiki Integration Implementation

Based on our findings, here's how we should implement the DeepWikiKubernetesService:

```typescript
// packages/core/src/services/deepwiki-kubernetes.service.ts

import { spawn } from 'child_process';
import * as k8s from '@kubernetes/client-node';
import axios from 'axios';
import { Logger } from '@core/logger';
import { ConfigurationManager } from '@core/config';

export class DeepWikiKubernetesService {
  private readonly namespace: string;
  private readonly apiServiceName: string;
  private readonly frontendServiceName: string;
  private readonly logger: Logger;
  
  constructor(config: ConfigurationManager, logger: Logger) {
    this.logger = logger;
    
    // Get DeepWiki configuration from config
    this.namespace = config.get('deepwiki.kubernetes.namespace') || 'codequal-dev';
    this.apiServiceName = config.get('deepwiki.kubernetes.apiService') || 'deepwiki-api';
    this.frontendServiceName = config.get('deepwiki.kubernetes.frontendService') || 'deepwiki-frontend';
  }
  
  /**
   * Analyze a repository using DeepWiki
   */
  public async analyzeRepository(options: {
    repositoryUrl: string;
    mode?: 'comprehensive' | 'concise';
    accessToken?: string;
  }): Promise<any> {
    this.logger.info(`Analyzing repository ${options.repositoryUrl} with DeepWiki`);
    
    try {
      // Method 1: API Approach - Make HTTP request to DeepWiki API
      const response = await this.makeApiRequest('/chat/completions/stream', {
        messages: [
          {
            role: 'user',
            content: `Analyze repository: ${options.repositoryUrl}${options.mode === 'concise' ? ' with concise documentation' : ''}`
          }
        ],
        repository_url: options.repositoryUrl,
        access_token: options.accessToken,
        stream: false
      });
      
      return response.data;
    } catch (error) {
      this.logger.error(`DeepWiki analysis failed: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Query DeepWiki chat for information about a repository
   */
  public async queryChat(options: {
    repositoryUrl: string;
    question: string;
    accessToken?: string;
    deepResearch?: boolean;
  }): Promise<any> {
    this.logger.info(`Querying DeepWiki chat about ${options.repositoryUrl}`);
    
    try {
      const response = await this.makeApiRequest('/chat/completions/stream', {
        messages: [
          {
            role: 'user',
            content: options.question
          }
        ],
        repository_url: options.repositoryUrl,
        access_token: options.accessToken,
        deep_research: options.deepResearch || false,
        stream: false
      });
      
      return response.data;
    } catch (error) {
      this.logger.error(`DeepWiki chat query failed: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Export wiki documentation for a repository
   */
  public async exportWiki(options: {
    repositoryUrl: string;
    format: 'markdown' | 'json';
    accessToken?: string;
  }): Promise<any> {
    this.logger.info(`Exporting wiki for ${options.repositoryUrl} in ${options.format} format`);
    
    try {
      // First, analyze the repository to get wiki pages
      const wikiData = await this.analyzeRepository({
        repositoryUrl: options.repositoryUrl,
        accessToken: options.accessToken
      });
      
      // Then export the wiki
      const response = await this.makeApiRequest('/export/wiki', {
        repo_url: options.repositoryUrl,
        pages: wikiData.pages || [],
        format: options.format
      });
      
      return response.data;
    } catch (error) {
      this.logger.error(`DeepWiki wiki export failed: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Make an API request to the DeepWiki service
   */
  private async makeApiRequest(endpoint: string, data: any): Promise<any> {
    // Get the API service URL
    const apiUrl = await this.getServiceUrl(this.apiServiceName);
    
    // Make the request
    return axios.post(`${apiUrl}${endpoint}`, data, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  
  /**
   * Get the URL for a Kubernetes service
   */
  private async getServiceUrl(serviceName: string): Promise<string> {
    // In Kubernetes, services in the same namespace can be accessed via:
    // http://{service-name}.{namespace}.svc.cluster.local:{port}
    return `http://${serviceName}.${this.namespace}.svc.cluster.local`;
  }
  
  /**
   * Check if DeepWiki is ready
   */
  public async isReady(): Promise<boolean> {
    try {
      const apiUrl = await this.getServiceUrl(this.apiServiceName);
      const response = await axios.get(apiUrl);
      return response.status === 200;
    } catch (error) {
      this.logger.error(`DeepWiki readiness check failed: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Execute a command directly in the DeepWiki pod
   * This is an alternative approach if the API doesn't provide the needed functionality
   */
  private async executeInPod(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Get the DeepWiki pod name
      const kubectl = spawn('kubectl', [
        'get',
        'pods',
        '-n',
        this.namespace,
        '-l',
        'app=deepwiki',
        '-o',
        'jsonpath={.items[0].metadata.name}'
      ]);
      
      let podName = '';
      kubectl.stdout.on('data', (data) => {
        podName += data.toString();
      });
      
      kubectl.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Failed to get DeepWiki pod name`));
          return;
        }
        
        // Execute the command in the pod
        const exec = spawn('kubectl', [
          'exec',
          '-n',
          this.namespace,
          podName.trim(),
          '--',
          'python',
          '-c',
          command
        ]);
        
        let output = '';
        exec.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        let errorOutput = '';
        exec.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });
        
        exec.on('close', (code) => {
          if (code !== 0) {
            reject(new Error(`Command failed with exit code ${code}: ${errorOutput}`));
          } else {
            resolve(output);
          }
        });
      });
    });
  }
}
```

## Integration Approach

Based on our understanding of DeepWiki, our three-tier analysis approach can be implemented as follows:

### Tier 1: Deep Repository Analysis + PR Review

Use DeepWiki to generate a comprehensive wiki for the repository, then analyze the PR changes:

```typescript
// Generate comprehensive documentation
const wikiData = await deepwikiService.analyzeRepository({
  repositoryUrl: 'https://github.com/example/repo',
  mode: 'comprehensive'
});

// Use the wiki data to enhance PR analysis
const prContext = {
  repository: wikiData,
  pr: prData
};

// Run PR analysis with the enhanced context
const analysis = await analyzeWithContext(prContext);
```

### Tier 2: PR-Only Analysis + Cached DeepWiki Data

Use cached DeepWiki data to provide context for a faster PR analysis:

```typescript
// Retrieve cached wiki data from vector database
const cachedWikiData = await vectorDb.getRepositoryData(repositoryUrl);

// Use the cached data for PR analysis
const prContext = {
  repository: cachedWikiData,
  pr: prData
};

// Run PR analysis with the cached context
const analysis = await analyzeWithContext(prContext);
```

### Tier 3: Concise DeepWiki Mode + PR Review

Use DeepWiki's concise mode for a faster but less detailed repository analysis:

```typescript
// Generate concise documentation
const wikiData = await deepwikiService.analyzeRepository({
  repositoryUrl: 'https://github.com/example/repo',
  mode: 'concise'
});

// Use the concise wiki data for PR analysis
const prContext = {
  repository: wikiData,
  pr: prData
};

// Run PR analysis with the concise context
const analysis = await analyzeWithContext(prContext);
```

## Vector Database Integration

DeepWiki already creates vector embeddings of repository code. We can store these in our Supabase vector database:

```typescript
// Extract embeddings from DeepWiki analysis
const extractEmbeddings = async (wikiData) => {
  // Execute a command in the DeepWiki pod to extract embeddings
  const command = `
    from api.data_pipeline import DatabaseManager
    import json
    
    # Initialize the database manager
    db_manager = DatabaseManager()
    
    # Get the repository path
    repo_url = '${repositoryUrl}'
    root_path = get_adalflow_default_root_path()
    repo_name = repo_url.split('/')[-1].replace('.git', '')
    save_repo_dir = os.path.join(root_path, 'repos', repo_name)
    
    # Load the database
    db = LocalDB.load_state(os.path.join(root_path, 'databases', f'{repo_name}.pkl'))
    
    # Get the embeddings
    documents = db.get_transformed_data(key='split_and_embed')
    
    # Convert to JSON
    result = []
    for doc in documents:
      result.append({
        'text': doc.text,
        'embedding': doc.embedding.tolist(),
        'metadata': doc.meta_data
      })
      
    print(json.dumps(result))
  `;
  
  const output = await deepwikiService.executeInPod(command);
  return JSON.parse(output);
};

// Store embeddings in Supabase
const storeEmbeddings = async (embeddings) => {
  for (const embedding of embeddings) {
    await supabase.from('deepwiki_vectors').insert({
      content: embedding.text,
      embedding: embedding.embedding,
      metadata: embedding.metadata,
      repository_url: repositoryUrl
    });
  }
};

// Main function to process and store embeddings
const processRepository = async (repositoryUrl) => {
  const wikiData = await deepwikiService.analyzeRepository({ repositoryUrl });
  const embeddings = await extractEmbeddings(wikiData);
  await storeEmbeddings(embeddings);
};
```

## Implementation Plan

1. **Phase 1: DeepWiki API Integration**
   - Implement DeepWikiKubernetesService with API-based interaction
   - Test repository analysis with different modes
   - Test chat functionality

2. **Phase 2: Vector Database Integration**
   - Implement extraction of embeddings from DeepWiki
   - Store embeddings in Supabase vector database
   - Test retrieval functionality

3. **Phase 3: Three-Tier Analysis Implementation**
   - Implement Tier 1 (Deep Repository Analysis)
   - Implement Tier 2 (Cached Analysis)
   - Implement Tier 3 (Concise Analysis)
   - Create switching mechanism between tiers

4. **Phase 4: User Interface**
   - Implement UI for selecting analysis tiers
   - Add visualization for repository insights
   - Integrate chat functionality into UI

## Next Steps

1. Implement a basic version of the DeepWikiKubernetesService class 
2. Test the service by analyzing a simple repository
3. Validate that we can retrieve meaningful data from DeepWiki
4. Begin implementing the vector database integration
