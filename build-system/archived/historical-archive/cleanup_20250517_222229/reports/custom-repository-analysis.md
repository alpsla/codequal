# CodeQual Repository Analysis Strategy
**After DeepWiki Analysis: Implementation Plan**

## Overview

Based on our experience with DeepWiki and its recurring embedding dimension issues, we're pivoting to implement our own customized repository analysis solution that will directly integrate with our existing RAG architecture. This implementation will give us complete control over the model calibration process and ensure consistency across different providers.

## Why This Approach

1. **Current Issues**: DeepWiki is consistently encountering embedding dimension mismatches and provider configuration errors despite multiple configuration attempts
2. **Limited Control**: The current DeepWiki implementation doesn't provide the necessary flexibility for our multi-model calibration requirements
3. **Existing Framework**: Our RAG architecture already contains the necessary components for implementing a repository analysis pipeline
4. **Optimization Goal**: We need a system that can systematically test different models in different code contexts for optimal selection

## Implementation Plan

### 1. Repository Analysis Pipeline

We'll build a modular pipeline with the following components:

```
Repository → Code Parser → Context Chunking → Multi-Agent Analysis → Calibration Metrics → Report Generation
```

#### Implementation Steps:

1. **Repository Loader (Week 1)**
   - Implement a GitLoader component to clone and parse repositories
   - Add selective file filtering based on extensions and relevance
   - Create metadata extraction for repository characteristics

2. **Context Generator (Week 1-2)**
   - Implement intelligent code chunking with context preservation
   - Create strategy for handling different file types (code, docs, config)
   - Develop context relevance scoring for selective processing

3. **Vector Storage Integration (Week 2)**
   - Connect to existing Supabase pgvector implementation
   - Implement selective vector storage based on importance
   - Create repository-specific vector collections

4. **Multi-Model Executor (Week 3)**
   - Integrate with existing multi-agent factory
   - Add provider-specific embedding generation
   - Implement consistent embedding dimensions across providers

5. **Calibration Framework (Week 3-4)**
   - Create metrics collection for model performance
   - Implement context type detection and classification
   - Develop scoring system for model-context matching

### 2. Core Implementation Details

#### Repository Loader Component

```typescript
// src/repository-analysis/loaders/GitRepositoryLoader.ts
import { SimpleGit, simpleGit } from 'simple-git';
import { createReadStream } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline';

export interface RepositoryFile {
  path: string;
  content: string;
  language: string;
  lastModified: Date;
  size: number;
  metadata: {
    isTest: boolean;
    isConfiguration: boolean;
    isDependency: boolean;
    importance: number;
  };
}

export class GitRepositoryLoader {
  private git: SimpleGit;
  private repoPath: string;
  
  constructor(repoUrl: string, localPath: string) {
    this.repoPath = localPath;
    this.git = simpleGit();
  }
  
  async clone(): Promise<void> {
    await this.git.clone(this.repoUrl, this.repoPath);
  }
  
  async loadFiles(fileTypes: string[] = ['ts', 'js', 'py', 'java', 'go', 'rs', 'c', 'cpp', 'jsx', 'tsx']): Promise<RepositoryFile[]> {
    const files: RepositoryFile[] = [];
    
    // Get list of files matching types
    const filePaths = await this.findFiles(fileTypes);
    
    // Load each file
    for (const path of filePaths) {
      const content = await this.readFile(path);
      const stats = await this.getFileStats(path);
      const language = this.detectLanguage(path);
      
      files.push({
        path,
        content,
        language,
        lastModified: stats.lastModified,
        size: stats.size,
        metadata: {
          isTest: this.isTestFile(path),
          isConfiguration: this.isConfigFile(path),
          isDependency: this.isDependencyFile(path),
          importance: this.calculateImportance(path, content, stats)
        }
      });
    }
    
    return files;
  }
  
  private calculateImportance(path: string, content: string, stats: any): number {
    // Implementation details for importance scoring
    // Factors include:
    // - File size
    // - Last modified date
    // - Number of imports/dependencies
    // - Depth in directory structure
    // - References from other files
    // Returns a score from 0-100
  }
}
```

#### Intelligent Context Generator

```typescript
// src/repository-analysis/context/CodeContextGenerator.ts
import { RepositoryFile } from '../loaders/GitRepositoryLoader';

export interface CodeChunk {
  id: string;
  content: string;
  file: string;
  startLine: number;
  endLine: number;
  imports: string[];
  exports: string[];
  functions: string[];
  classes: string[];
  contextualImportance: number;
}

export class CodeContextGenerator {
  // Configuration for different languages and chunk sizes
  private chunkConfig = {
    default: {
      maxChunkSize: 1000,
      overlap: 200
    },
    typescript: {
      maxChunkSize: 1200,
      overlap: 300
    }
    // Other language configs...
  };
  
  async generateChunks(files: RepositoryFile[]): Promise<CodeChunk[]> {
    const chunks: CodeChunk[] = [];
    
    for (const file of files) {
      const config = this.chunkConfig[file.language] || this.chunkConfig.default;
      const fileChunks = this.chunkFile(file, config);
      chunks.push(...fileChunks);
    }
    
    // Add cross-file context
    return this.enrichWithCrossFileContext(chunks, files);
  }
  
  private chunkFile(file: RepositoryFile, config: { maxChunkSize: number, overlap: number }): CodeChunk[] {
    // Implementation to intelligently chunk file
    // Taking into account code structure (functions, classes)
    // Preserving important context
    // Ensuring overlaps contain complete logical units
  }
  
  private enrichWithCrossFileContext(chunks: CodeChunk[], files: RepositoryFile[]): CodeChunk[] {
    // Implementation to add cross-file references
    // Creates connections between related code across different files
    // Adds import/export relationships
    // Builds dependency graph
  }
}
```

#### Embedding Generation with Consistent Dimensions

```typescript
// src/repository-analysis/embeddings/EmbeddingService.ts
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import { CodeChunk } from '../context/CodeContextGenerator';

export class EmbeddingService {
  private supabase;
  private openai;
  private anthropic;
  // Other provider clients
  
  constructor(config: {
    supabaseUrl: string,
    supabaseKey: string,
    openaiKey: string,
    anthropicKey: string,
    // Other provider keys
  }) {
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    this.openai = new OpenAI({ apiKey: config.openaiKey });
    this.anthropic = new Anthropic({ apiKey: config.anthropicKey });
    // Initialize other providers
  }
  
  // Generate embeddings with consistent dimensionality across providers
  async generateEmbeddings(chunks: CodeChunk[], provider: string): Promise<{ id: string, embedding: number[] }[]> {
    const results: { id: string, embedding: number[] }[] = [];
    
    for (const chunk of chunks) {
      let embedding: number[];
      
      switch (provider) {
        case 'openai':
          embedding = await this.generateOpenAIEmbedding(chunk.content);
          break;
        case 'anthropic':
          embedding = await this.generateAnthropicEmbedding(chunk.content);
          break;
        // Other providers
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
      
      // Normalize to 1536 dimensions if needed
      const normalizedEmbedding = this.normalizeDimensions(embedding, 1536);
      
      results.push({
        id: chunk.id,
        embedding: normalizedEmbedding
      });
    }
    
    return results;
  }
  
  private normalizeDimensions(embedding: number[], targetDim: number): number[] {
    // If dimensions match, return as-is
    if (embedding.length === targetDim) {
      return embedding;
    }
    
    // If embedding is smaller, pad with zeros
    if (embedding.length < targetDim) {
      return [...embedding, ...Array(targetDim - embedding.length).fill(0)];
    }
    
    // If embedding is larger, truncate or use dimensionality reduction
    // For simple truncation (faster but less accurate):
    return embedding.slice(0, targetDim);
    
    // For PCA-based reduction (more accurate but slower):
    // return this.applyPCA(embedding, targetDim);
  }
  
  // Store embeddings in Supabase
  async storeEmbeddings(repositoryUrl: string, data: { id: string, embedding: number[] }[]): Promise<void> {
    for (const item of data) {
      await this.supabase.from('repository_embeddings').insert({
        repository_url: repositoryUrl,
        chunk_id: item.id,
        embedding: item.embedding,
        created_at: new Date().toISOString()
      });
    }
  }
}
```

#### Multi-Model Calibration System

```typescript
// src/repository-analysis/calibration/ModelCalibrator.ts
import { CodeChunk } from '../context/CodeContextGenerator';
import { EmbeddingService } from '../embeddings/EmbeddingService';
import { ModelProvider } from '../../agents/ModelProvider';

export interface CalibrationResult {
  contextType: string;
  language: string;
  provider: string;
  model: string;
  performanceScore: number;
  responseTime: number;
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
  costEstimate: number;
}

export class ModelCalibrator {
  private embeddingService: EmbeddingService;
  private providers: ModelProvider[];
  
  constructor(embeddingService: EmbeddingService, providers: ModelProvider[]) {
    this.embeddingService = embeddingService;
    this.providers = providers;
  }
  
  async calibrateForRepository(
    repositoryUrl: string,
    chunks: CodeChunk[],
    contextTypes: string[] = ['architecture', 'algorithm', 'dataFlow', 'security', 'performance']
  ): Promise<CalibrationResult[]> {
    const results: CalibrationResult[] = [];
    
    // Select representative chunks for each context type
    const testChunks = this.selectRepresentativeChunks(chunks, contextTypes);
    
    // Test each provider/model combination
    for (const provider of this.providers) {
      for (const model of provider.getAvailableModels()) {
        // Skip models not suitable for code analysis
        if (!this.isModelSuitableForCode(model)) continue;
        
        for (const [contextType, contextChunks] of Object.entries(testChunks)) {
          for (const chunk of contextChunks) {
            // Generate test prompt for this context type
            const prompt = this.generatePrompt(chunk, contextType);
            
            // Measure performance
            const startTime = Date.now();
            const response = await provider.completePrompt(prompt, model);
            const endTime = Date.now();
            
            // Calculate metrics
            const responseTime = endTime - startTime;
            const performance = this.evaluateResponse(response, chunk, contextType);
            const tokenUsage = {
              prompt: response.usage.prompt_tokens,
              completion: response.usage.completion_tokens,
              total: response.usage.total_tokens
            };
            const cost = this.calculateCost(tokenUsage, provider.getName(), model);
            
            // Record result
            results.push({
              contextType,
              language: chunk.language,
              provider: provider.getName(),
              model,
              performanceScore: performance,
              responseTime,
              tokenUsage,
              costEstimate: cost
            });
          }
        }
      }
    }
    
    return results;
  }
  
  // Calculate optimal model for each context type
  getOptimalModels(results: CalibrationResult[]): Record<string, { provider: string, model: string }> {
    const optimal: Record<string, { provider: string, model: string }> = {};
    
    // Group by context type
    const groupedResults = this.groupByContextType(results);
    
    // Find best model for each context type
    for (const [contextType, contextResults] of Object.entries(groupedResults)) {
      // Apply weighting formula: 50% performance, 30% cost, 20% speed
      const scoredModels = contextResults.map(result => {
        const normalizedPerformance = result.performanceScore;
        const normalizedCost = 1 / (result.costEstimate + 0.001); // Avoid division by zero
        const normalizedSpeed = 1 / (result.responseTime + 0.001);
        
        const weightedScore = 
          normalizedPerformance * 0.5 + 
          normalizedCost * 0.3 + 
          normalizedSpeed * 0.2;
          
        return {
          provider: result.provider,
          model: result.model,
          score: weightedScore
        };
      });
      
      // Sort by score (descending)
      scoredModels.sort((a, b) => b.score - a.score);
      
      // Select best model
      if (scoredModels.length > 0) {
        optimal[contextType] = {
          provider: scoredModels[0].provider,
          model: scoredModels[0].model
        };
      }
    }
    
    return optimal;
  }
}
```

#### Integration with Existing Architecture

```typescript
// src/repository-analysis/RepositoryAnalysisService.ts
import { GitRepositoryLoader } from './loaders/GitRepositoryLoader';
import { CodeContextGenerator } from './context/CodeContextGenerator';
import { EmbeddingService } from './embeddings/EmbeddingService';
import { ModelCalibrator } from './calibration/ModelCalibrator';
import { ModelConfigStore } from '../services/model-selection/ModelConfigStore';
import { MultiAgentFactory } from '../agents/MultiAgentFactory';

export class RepositoryAnalysisService {
  private loader: GitRepositoryLoader;
  private contextGenerator: CodeContextGenerator;
  private embeddingService: EmbeddingService;
  private calibrator: ModelCalibrator;
  private modelConfigStore: ModelConfigStore;
  private multiAgentFactory: MultiAgentFactory;
  
  constructor(
    config: {
      supabaseUrl: string,
      supabaseKey: string,
      // Other config options
    },
    multiAgentFactory: MultiAgentFactory,
    modelConfigStore: ModelConfigStore
  ) {
    // Initialize components
    this.contextGenerator = new CodeContextGenerator();
    this.embeddingService = new EmbeddingService(config);
    this.calibrator = new ModelCalibrator(
      this.embeddingService,
      multiAgentFactory.getAvailableProviders()
    );
    this.modelConfigStore = modelConfigStore;
    this.multiAgentFactory = multiAgentFactory;
  }
  
  async analyzeRepository(repositoryUrl: string, localPath: string): Promise<any> {
    // 1. Clone and load repository
    this.loader = new GitRepositoryLoader(repositoryUrl, localPath);
    await this.loader.clone();
    const files = await this.loader.loadFiles();
    
    // 2. Generate context chunks
    const chunks = await this.contextGenerator.generateChunks(files);
    
    // 3. Generate and store embeddings
    // For analysis, we'll use OpenAI embeddings as default
    const embeddings = await this.embeddingService.generateEmbeddings(chunks, 'openai');
    await this.embeddingService.storeEmbeddings(repositoryUrl, embeddings);
    
    // 4. Calibrate models
    const calibrationResults = await this.calibrator.calibrateForRepository(repositoryUrl, chunks);
    
    // 5. Determine optimal models
    const optimalModels = this.calibrator.getOptimalModels(calibrationResults);
    
    // 6. Store calibration results
    await this.modelConfigStore.storeModelConfigurations(
      repositoryUrl,
      optimalModels
    );
    
    // 7. Generate repository analysis
    const analysis = await this.analyzeWithOptimalModels(
      repositoryUrl,
      chunks,
      optimalModels
    );
    
    return {
      calibrationResults,
      optimalModels,
      analysis
    };
  }
  
  private async analyzeWithOptimalModels(
    repositoryUrl: string,
    chunks: CodeChunk[],
    optimalModels: Record<string, { provider: string, model: string }>
  ) {
    // Implementation to analyze repository using optimal models per context
    // Uses the MultiAgentFactory to create agents with optimal configurations
    // Generates comprehensive analysis results
  }
}
```

### 3. Testing and Validation Process

1. **Unit Testing Each Component**
   - Test repository loader with various repository types
   - Validate context generator produces consistent chunks
   - Ensure embedding service maintains consistent dimensions
   - Verify calibration metrics are calculated correctly

2. **Integration Testing**
   - Test end-to-end pipeline with small repositories
   - Validate multi-model calibration produces expected results
   - Compare performance against baseline (previous DeepWiki approach)

3. **Validation Metrics**
   - Repository processing time
   - Embedding generation time
   - Calibration accuracy
   - Query response time
   - Storage efficiency

### 4. Key Advantages Over DeepWiki

1. **Consistent Embedding Dimensions**: Guaranteed consistency across all providers
2. **Custom Model Selection**: Tailored model selection based on context types
3. **Performance Optimization**: Balanced scoring considering quality, cost, and speed
4. **Enhanced Control**: Complete control over the entire pipeline
5. **RAG Architecture Integration**: Direct integration with existing RAG components

## Timeline and Resources

### Implementation Timeline

**Week 1**:
- Repository loader implementation
- Basic context generator

**Week 2**:
- Enhanced context extraction
- Vector storage integration
- Provider integration

**Week 3**:
- Multi-model executor
- Basic calibration metrics

**Week 4**:
- Advanced calibration framework
- Integration testing
- Performance optimization

### Resource Requirements

- **Development Resources**: 2 developers (1 for core pipeline, 1 for provider integration)
- **Testing Resources**: 1 QA engineer for validation
- **Infrastructure**: Existing Supabase instance with pgvector extension
- **Development Environment**: Local environments with necessary API keys

## Next Steps

1. Establish clean development environment with necessary dependencies
2. Set up provider API keys and ensure access
3. Create project structure aligned with existing architecture
4. Begin implementation of repository loader component
5. Set up continuous testing for embedding dimension consistency
