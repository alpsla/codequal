# Solving DeepWiki's OpenRouter integration in Kubernetes

Based on extensive research into DeepWiki's architecture, OpenRouter's API requirements, and Kubernetes configuration best practices, I've identified the key issues and solutions for properly integrating DeepWiki with OpenRouter in a Kubernetes environment.

## The problem decoded

Although we couldn't directly access the specific issue document, my analysis indicates the core problem likely involves a **configuration mismatch between DeepWiki's provider system and the Kubernetes deployment methodology**. OpenRouter requires specific authentication parameters that need to be properly passed to DeepWiki's model selection system within the Kubernetes environment.

DeepWiki uses a flexible provider-based model selection system that supports multiple LLM providers including OpenRouter. The integration issue is likely occurring because:

1. OpenRouter API keys aren't being properly passed to the DeepWiki container
2. The DeepWikiKubernetesService may not be correctly handling OpenRouter's authentication requirements
3. Model prefix formatting may be inconsistent when DeepWiki makes requests to OpenRouter

## How DeepWiki selects model providers

DeepWiki implements a modular architecture for interfacing with different AI model providers:

1. **Environment variables** are used for authentication (e.g., `OPENROUTER_API_KEY`)
2. **JSON configuration files** (in `api/config/` directory) define available providers, models, and parameters
3. **Provider-specific modules** handle formatting requests and parsing responses

The provider selection system supports four main providers:
- **Google**: Default gemini-2.0-flash (requires `GOOGLE_API_KEY`)
- **OpenAI**: Default gpt-4o (requires `OPENAI_API_KEY`)
- **OpenRouter**: Access to multiple models via unified API (requires `OPENROUTER_API_KEY`)
- **Ollama**: Support for locally running open-source models

## Configuring OpenRouter as a provider

OpenRouter requires **Bearer token authentication** with API keys typically in the format `sk-or-v1-XXXXXXXX`. To properly configure OpenRouter as a provider in DeepWiki:

1. The API key must be available to the DeepWiki container
2. Model identifiers must include organization prefixes (e.g., `openai/gpt-4o`, `anthropic/claude-3-opus`)
3. The base URL should be set to `https://openrouter.ai/api/v1`

## Kubernetes implementation solution

### 1. Create a Kubernetes Secret for API keys

First, create a Secret to securely store the OpenRouter API key:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: deepwiki-api-keys
  namespace: your-namespace
type: Opaque
data:
  openrouter-api-key: <base64-encoded-key>
  openai-api-key: <base64-encoded-key>  # Required for embeddings
```

### 2. Update DeepWiki Kubernetes Deployment

Modify your DeepWiki deployment to properly inject the API keys as environment variables:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: deepwiki
  namespace: your-namespace
spec:
  replicas: 1
  selector:
    matchLabels:
      app: deepwiki
  template:
    metadata:
      labels:
        app: deepwiki
    spec:
      containers:
      - name: deepwiki
        image: deepwiki:latest
        env:
        # Required for OpenRouter integration
        - name: OPENROUTER_API_KEY
          valueFrom:
            secretKeyRef:
              name: deepwiki-api-keys
              key: openrouter-api-key
        # Required for embeddings even when using OpenRouter
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: deepwiki-api-keys
              key: openai-api-key
        # Optional: Custom config directory location
        - name: DEEPWIKI_CONFIG_DIR
          value: "/app/config"
        volumeMounts:
        - name: deepwiki-config
          mountPath: /app/config
      volumes:
      - name: deepwiki-config
        configMap:
          name: deepwiki-config
```

### 3. Create a ConfigMap for DeepWiki configuration

Create a ConfigMap that holds DeepWiki's provider configuration files:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: deepwiki-config
  namespace: your-namespace
data:
  "generator.json": |
    {
      "providers": {
        "openrouter": {
          "default_model": "openai/gpt-4o",
          "available_models": [
            "openai/gpt-4o",
            "anthropic/claude-3-opus",
            "anthropic/claude-3-sonnet",
            "meta-llama/llama-3-70b-instruct"
          ],
          "parameters": {
            "temperature": 0.7,
            "top_p": 1.0
          }
        },
        "openai": {
          "default_model": "gpt-4o",
          "available_models": ["gpt-4o", "gpt-4o-mini"]
        }
      },
      "default_provider": "openrouter"
    }
```

## DeepWikiKubernetesService implementation

Here's a sample implementation for the `DeepWikiKubernetesService` that properly handles OpenRouter integration:

```typescript
// src/services/DeepWikiKubernetesService.ts

import axios, { AxiosInstance } from 'axios';
import fs from 'fs';
import path from 'path';

// Provider interface for different model providers
interface LLMProvider {
  name: string;
  baseUrl: string;
  apiKey: string;
  getHeaders(): Record<string, string>;
  formatRequest(prompt: string, options: any): any;
  parseResponse(response: any): string;
}

// OpenRouter provider implementation
class OpenRouterProvider implements LLMProvider {
  name = 'openrouter';
  baseUrl: string;
  apiKey: string;
  
  constructor() {
    this.baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
    
    // Get API key from environment variable
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    
    // Optional: Fallback to file-based secret if environment variable not set
    if (!this.apiKey && process.env.OPENROUTER_API_KEY_FILE) {
      try {
        this.apiKey = fs.readFileSync(process.env.OPENROUTER_API_KEY_FILE, 'utf8').trim();
      } catch (err) {
        console.error('Failed to read OpenRouter API key from file:', err);
      }
    }
  }
  
  getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.SERVICE_URL || 'https://deepwiki.example.com'
    };
  }
  
  formatRequest(prompt: string, options: any): any {
    // Ensure model name has proper prefix if not already included
    let model = options.model || 'openai/gpt-4o';
    if (!model.includes('/')) {
      model = `openai/${model}`;  // Default to OpenAI if no prefix
    }
    
    return {
      model: model,
      messages: [{ role: 'user', content: prompt }],
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 1000
    };
  }
  
  parseResponse(response: any): string {
    return response.data.choices[0].message.content;
  }
}

// Main service class for DeepWiki Kubernetes integration
export class DeepWikiKubernetesService {
  private providers: Map<string, LLMProvider>;
  private primaryProvider: string;
  private httpClients: Map<string, AxiosInstance>;
  private maxRetries: number;
  
  constructor() {
    this.providers = new Map();
    this.httpClients = new Map();
    
    // Initialize providers
    const openRouterProvider = new OpenRouterProvider();
    
    // You would add other providers here as needed
    // const openAIProvider = new OpenAIProvider();
    
    this.providers.set(openRouterProvider.name, openRouterProvider);
    
    // Set primary provider from environment or default to OpenRouter
    this.primaryProvider = process.env.PRIMARY_PROVIDER || 'openrouter';
    this.maxRetries = parseInt(process.env.MAX_RETRY_ATTEMPTS || '3', 10);
    
    // Initialize HTTP clients for each provider
    this.initHttpClients();
  }
  
  private initHttpClients() {
    for (const [name, provider] of this.providers.entries()) {
      if (!provider.apiKey) {
        console.warn(`No API key for provider ${name}, skipping client creation`);
        continue;
      }
      
      const timeoutMs = parseInt(process.env.API_REQUEST_TIMEOUT || '10000', 10);
      
      const client = axios.create({
        baseURL: provider.baseUrl,
        timeout: timeoutMs,
        headers: provider.getHeaders()
      });
      
      // Add response interceptor for logging
      client.interceptors.response.use(
        response => response,
        error => {
          console.error(`Error from ${name} provider:`, error.message);
          return Promise.reject(error);
        }
      );
      
      this.httpClients.set(name, client);
    }
  }
  
  async generateResponse(
    prompt: string, 
    options: any = {}
  ): Promise<string> {
    const provider = this.providers.get(this.primaryProvider);
    const client = this.httpClients.get(this.primaryProvider);
    
    if (!provider || !client) {
      throw new Error(`Provider ${this.primaryProvider} not configured properly`);
    }
    
    try {
      const requestData = provider.formatRequest(prompt, options);
      console.log(`Sending request to ${this.primaryProvider} with model ${requestData.model}`);
      
      const response = await client.post('/chat/completions', requestData);
      return provider.parseResponse(response);
    } catch (error: any) {
      console.error(`Error generating response: ${error.message}`);
      
      // If response includes details about the error, log them
      if (error.response?.data) {
        console.error('API error details:', error.response.data);
      }
      
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }
  
  // Helper method to validate provider configuration
  validateProviderConfig(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check if primary provider exists
    if (!this.providers.has(this.primaryProvider)) {
      issues.push(`Primary provider "${this.primaryProvider}" not configured`);
    }
    
    // Check OpenRouter configuration specifically
    const openRouterProvider = this.providers.get('openrouter');
    if (openRouterProvider) {
      if (!openRouterProvider.apiKey) {
        issues.push('OpenRouter API key not configured');
      }
    } else {
      issues.push('OpenRouter provider not configured');
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  }
}
```

## Implementation steps summary

1. **Store credentials securely**: Create Kubernetes Secrets to store API keys
2. **Configure environment variables**: Ensure `OPENROUTER_API_KEY` is properly injected into the DeepWiki container
3. **Update DeepWiki configuration**: Set up the provider configuration in a ConfigMap mounted to DeepWiki
4. **Implement DeepWikiKubernetesService**: Create a service that handles provider selection, authentication, and error handling
5. **Handle model prefixes**: Ensure models are properly prefixed with organization names (e.g., `openai/gpt-4o`) when making requests to OpenRouter

## Testing the implementation

To verify the implementation:

1. Check logs to ensure DeepWiki can read the OpenRouter API key
2. Validate that requests to OpenRouter include proper Authorization headers
3. Confirm that model names include organization prefixes when sent to OpenRouter
4. Test the fallback mechanism to ensure resilience if OpenRouter is temporarily unavailable

By following these steps, DeepWiki should successfully integrate with OpenRouter in your Kubernetes environment, providing access to a wide range of AI models through a single, consistent API.