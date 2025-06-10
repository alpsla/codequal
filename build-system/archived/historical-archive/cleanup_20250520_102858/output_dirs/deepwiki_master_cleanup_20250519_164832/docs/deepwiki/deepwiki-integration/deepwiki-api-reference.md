# DeepWiki API Reference

## Overview

DeepWiki is a dedicated tool that provides repository analysis capabilities using different LLM providers. This document provides a comprehensive reference for interacting with the DeepWiki API and implementing the `DeepWikiKubernetesService` for integration with the calibration system.

## Environment Details

- **Namespace**: codequal-dev
- **Pod**: deepwiki-fixed-6c7f9785d7-57qqm
- **Services**:
  - deepwiki-api (8001/TCP)
  - deepwiki-fixed (8001/TCP, 80/TCP)
  - deepwiki-frontend (80/TCP)

## API Endpoints

DeepWiki exposes the following endpoints:

### Base Information

- `GET /`
  - Returns API information, version, and available endpoints
  - Status: 200 OK
  - No authentication required
  - Response Format: JSON

### Chat Completion with Repository Context

- `POST /chat/completions/stream`
  - Streams a chat completion response based on repository context
  - Status: 200 OK for success, various error codes for failures
  - Response Format: Text stream

### Wiki Export

- `POST /export/wiki`
  - Exports wiki content from a repository
  - Status: 200 OK for success
  - Response Format: JSON or Markdown (based on format parameter)

### Wiki Cache Management

- `GET /api/wiki_cache`
  - Retrieves cached wiki data
  - Status: 200 OK for success
  - Response Format: JSON

- `POST /api/wiki_cache`
  - Stores wiki data to cache
  - Status: 200 OK for success
  - Response Format: JSON

### Local Repository Structure

- `GET /local_repo/structure`
  - Gets structure of a local repository
  - Status: 200 OK for success
  - Response Format: JSON

## Parameters

### Chat Completion Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| provider | string | Yes | LLM provider (openai, anthropic, google, deepseek) |
| model | string | Yes | Model name (gpt-4o, claude-3-7-sonnet, etc.) |
| repo_url | string | Yes | GitHub repository URL |
| messages | array | Yes | Array of message objects with role and content |
| max_tokens | integer | No | Maximum tokens to generate (default: 1000) |
| stream | boolean | No | Whether to stream the response (should be true) |

### Wiki Export Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| repo_url | string | Yes | GitHub repository URL |
| format | string | Yes | Export format (markdown or json) |
| pages | array | Yes | Array of pages to include in the export |

## Error Handling

DeepWiki API returns standard HTTP status codes:

- **200-299**: Successful operation
- **400-499**: Client errors (malformed requests, missing parameters)
- **500-599**: Server errors (provider configuration issues, embedding errors)

Common error patterns:

1. **Provider Configuration Errors**:
   - Error: `Configuration for provider 'X' not found`
   - Solution: Create provider configuration files in `/root/.adalflow/providers/`

2. **Embedding Size Errors**:
   - Error: `All embeddings should be of the same size`
   - Solution: Configure consistent embedding dimensions for all providers

## Provider Configuration

Provider configurations are stored in YAML files at `/root/.adalflow/providers/`. Each provider requires:

1. **OpenAI Configuration** (`openai.yaml`):
   ```yaml
   enabled: true
   api_key: <API_KEY>
   api_base: https://api.openai.com/v1
   api_version: 2023-05-15
   embedding_model: text-embedding-3-small
   embedding_dimension: 1536
   models:
     - name: gpt-4o
       max_tokens: 8192
       supports_functions: true
       supports_vision: true
   ```

2. **Anthropic Configuration** (`anthropic.yaml`):
   ```yaml
   enabled: true
   api_key: <API_KEY>
   api_base: https://api.anthropic.com
   api_version: 2023-06-01
   embedding_model: text-embedding-3-small
   embedding_dimension: 1536
   models:
     - name: claude-3-7-sonnet
       max_tokens: 16384
       supports_functions: true
       supports_vision: true
   ```

3. **Google Configuration** (`google.yaml`):
   ```yaml
   enabled: true
   api_key: <API_KEY>
   api_base: https://generativelanguage.googleapis.com/v1beta
   embedding_model: text-embedding-3-small
   embedding_dimension: 1536
   models:
     - name: gemini-2.5-pro-preview-05-06
       max_tokens: 8192
       supports_functions: true
       supports_vision: true
   ```

4. **DeepSeek Configuration** (`deepseek.yaml`):
   ```yaml
   enabled: true
   api_key: <API_KEY>
   api_base: https://api.deepseek.com/v1
   embedding_model: text-embedding-3-small
   embedding_dimension: 1536
   models:
     - name: deepseek-coder
       max_tokens: 8192
       supports_functions: false
       supports_vision: false
   ```

5. **Global Embedding Configuration** (`/root/.adalflow/config/embeddings.yaml`):
   ```yaml
   default_embedding_model: openai/text-embedding-3-small
   embedding_dimension: 1536
   normalize_embeddings: true
   openai:
     embedding_model: openai/text-embedding-3-small
   anthropic:
     embedding_model: openai/text-embedding-3-small
   google:
     embedding_model: openai/text-embedding-3-small
   deepseek:
     embedding_model: openai/text-embedding-3-small
   ```

## Performance Characteristics

Based on our testing:

1. **Response Times**:
   - Small repositories (like fluentui-emoji): 7-10 seconds
   - Medium repositories (like vscode-extension-samples): 20-30 seconds
   - Large repositories may take 60+ seconds

2. **Timeout Recommendations**:
   - Set timeouts to at least 120 seconds for larger repositories
   - Consider implementing progressive timeouts based on repository size

## Implementation Guidelines for DeepWikiKubernetesService

### Service Interface

```typescript
export interface DeepWikiKubernetesService {
  /**
   * Get chat completion for a repository
   */
  getChatCompletionForRepo(
    repository: Repository,
    options: ChatCompletionOptions
  ): Promise<ChatCompletionResponse>;
  
  /**
   * Generate wiki for a repository
   */
  generateWiki(
    repository: Repository,
    options?: WikiGenerationOptions
  ): Promise<WikiResponse>;
  
  /**
   * Get repository size
   */
  getRepositorySize(
    repository: Repository
  ): Promise<number>;
  
  /**
   * Recommend model configuration based on repository characteristics
   */
  recommendModelConfig(
    language: string,
    sizeBytes: number
  ): ModelConfig;
}
```

### Implementation Example

```typescript
import axios from 'axios';
import { createLogger } from '../../utils/logger';

export class DeepWikiKubernetesServiceImpl implements DeepWikiKubernetesService {
  private apiUrl: string;
  private apiKey: string;
  private logger: any;
  private timeout: number;
  
  constructor(options: {
    apiUrl: string;
    apiKey: string;
    logger?: any;
    timeout?: number;
  }) {
    this.apiUrl = options.apiUrl || 'http://localhost:8001';
    this.apiKey = options.apiKey;
    this.logger = options.logger || createLogger('DeepWikiService');
    this.timeout = options.timeout || 120000; // 2 minutes default
  }
  
  async getChatCompletionForRepo(repository: Repository, options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    try {
      const repoUrl = `https://github.com/${repository.owner}/${repository.repo}`;
      this.logger.info(`Getting chat completion for ${repoUrl}`);
      
      // Calculate timeout based on repository size
      const dynamicTimeout = Math.min(
        600000, // 10 minutes max
        this.timeout + (repository.sizeBytes / 1000000) * 1000 // 1 second per MB
      );
      
      const payload = {
        provider: options.modelConfig.provider,
        model: options.modelConfig.model,
        messages: options.messages,
        repo_url: repoUrl,
        max_tokens: options.max_tokens || 1000,
        stream: true
      };
      
      const response = await axios.post(
        `${this.apiUrl}/chat/completions/stream`,
        payload,
        {
          timeout: dynamicTimeout,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Format response data
      return {
        choices: [{
          message: {
            role: 'assistant',
            content: response.data
          }
        }],
        usage: {
          prompt_tokens: 0, // Not provided by DeepWiki
          completion_tokens: 0,
          total_tokens: 0
        }
      };
    } catch (error) {
      this.logger.error(`Error in getChatCompletionForRepo: ${error.message}`, {
        repository,
        error
      });
      throw error;
    }
  }
  
  async generateWiki(repository: Repository, options?: WikiGenerationOptions): Promise<WikiResponse> {
    try {
      const repoUrl = `https://github.com/${repository.owner}/${repository.repo}`;
      this.logger.info(`Generating wiki for ${repoUrl}`);
      
      const response = await axios.post(
        `${this.apiUrl}/export/wiki`,
        {
          repo_url: repoUrl,
          format: options?.format || 'markdown',
          pages: options?.pages || []
        },
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      return {
        success: true,
        pages: response.data
      };
    } catch (error) {
      this.logger.error(`Error in generateWiki: ${error.message}`, {
        repository,
        error
      });
      throw error;
    }
  }
  
  async getRepositorySize(repository: Repository): Promise<number> {
    // DeepWiki doesn't have a direct endpoint for this
    // Return the sizeBytes if provided, or estimate based on repo type
    return repository.sizeBytes || 50 * 1024 * 1024; // Default to 50MB
  }
  
  recommendModelConfig(language: string, sizeBytes: number): ModelConfig {
    // Determine size category
    let sizeCategory = 'small';
    if (sizeBytes > 50 * 1024 * 1024) {
      sizeCategory = 'large';
    } else if (sizeBytes > 5 * 1024 * 1024) {
      sizeCategory = 'medium';
    }
    
    // Default configurations by size
    const defaultConfigs = {
      'small': {
        provider: 'openai',
        model: 'gpt-4o'
      },
      'medium': {
        provider: 'google',
        model: 'gemini-2.5-pro-preview-05-06'
      },
      'large': {
        provider: 'google',
        model: 'gemini-2.5-pro-preview-05-06'
      }
    };
    
    return defaultConfigs[sizeCategory];
  }
}
```

### Error Handling Strategy

Implement a comprehensive error handling strategy:

1. **Connection Failures**:
   - Retry with exponential backoff for network errors
   - Use circuit breaker pattern for persistent failures

2. **Provider Configuration Errors**:
   - Log detailed error messages
   - Provide clear instructions for fixing provider configurations
   - Consider fallback to alternative providers

3. **Timeouts**:
   - Implement dynamic timeouts based on repository size
   - Log timeout incidents for analysis
   - Consider breaking requests into smaller chunks

## Three-Tier Analysis Approach

For comprehensive repository analysis, implement a three-tier approach:

1. **Basic Analysis** (Tier 1):
   - Repository purpose and structure
   - Primary languages and frameworks
   - High-level architecture
   - Limited to smaller repositories (<10MB)

2. **Standard Analysis** (Tier 2):
   - All Basic Analysis features
   - Code quality assessment
   - Design patterns identification
   - Documentation analysis
   - Suitable for medium repositories (10-50MB)

3. **Comprehensive Analysis** (Tier 3):
   - All Standard Analysis features
   - Security vulnerability scanning
   - Performance optimization suggestions
   - API design evaluation
   - Test coverage analysis
   - Required for large repositories (>50MB)

Implement these tiers by adjusting the prompts sent to the DeepWiki API based on repository size and requested analysis depth.

## Integration with Calibration System

To integrate DeepWikiKubernetesService with the calibration system:

1. Register DeepWikiKubernetesService in your dependency injection container
2. Update the RepositoryCalibrationService to use DeepWikiKubernetesService
3. Implement proper error handling for DeepWiki-specific errors
4. Add configuration options for DeepWiki URL and connection parameters

Example integration in calibration-modes.sh:

```bash
# Ensure DeepWiki connection is active
source ./ensure-deepwiki-connection.sh
main
CONNECTION_EXIT_CODE=$?

if [ $CONNECTION_EXIT_CODE -eq 0 ]; then
  # DeepWiki connection is established, use it for calibration
  export USE_REAL_DEEPWIKI="true"
  export DEEPWIKI_API_URL="http://localhost:8001"
  
  # Run calibration with DeepWiki
  node ./run-calibration.js
else
  # DeepWiki connection failed, fall back to direct calibration
  ./run-direct-calibration.sh
fi
```

## Troubleshooting Guide

Common DeepWiki issues and solutions:

1. **Connection Issues**:
   - Check if port forwarding is active:
     ```bash
     kubectl port-forward -n codequal-dev svc/deepwiki-fixed 8001:8001
     ```
   - Verify the pod is running:
     ```bash
     kubectl get pods -n codequal-dev -l app=deepwiki-fixed
     ```

2. **Provider Configuration Issues**:
   - Fix provider configurations with:
     ```bash
     ./fix-deepwiki-providers.sh
     ```
   - Verify configurations:
     ```bash
     kubectl exec -n codequal-dev POD_NAME -- ls -la /root/.adalflow/providers/
     ```

3. **Embedding Size Errors**:
   - Check embedding configuration:
     ```bash
     kubectl exec -n codequal-dev POD_NAME -- cat /root/.adalflow/config/embeddings.yaml
     ```
   - Ensure consistent dimensions (1536) for all providers

4. **API Key Issues**:
   - Verify API keys are set in provider configurations
   - Test with curl:
     ```bash
     curl -X POST http://localhost:8001/chat/completions/stream \
       -H "Content-Type: application/json" \
       -d '{"provider":"openai","model":"gpt-4o","messages":[{"role":"system","content":"Hello"}],"repo_url":"https://github.com/microsoft/fluentui-emoji","max_tokens":10,"stream":true}'
     ```