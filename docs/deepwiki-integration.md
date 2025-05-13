# DeepWiki Integration

This document provides an overview of the DeepWiki integration with CodeQual, including our testing methodology, implementation approach, and usage guidelines.

## Overview

DeepWiki is an open-source tool that provides detailed repository analysis capabilities, generating comprehensive documentation and insights for codebases. We've integrated DeepWiki into CodeQual to power our repository analysis features, enhancing PR evaluation with deep understanding of code structure and architecture.

## Three-Tier Analysis Approach

Our integration uses a three-tier analysis approach to provide flexibility and optimal performance:

### 1. Quick PR-Only Analysis

* **Focus**: Only on PR and changed files
* **Time**: Completes in 1-3 minutes
* **Use Case**: Day-to-day development feedback
* **Features**: Syntax checking, code quality, basic security scanning
* **Implementation**: Uses focused DeepWiki Chat API calls

### 2. Comprehensive Repository + PR Analysis

* **Focus**: Deep repository analysis followed by PR analysis
* **Time**: Takes 5-10 minutes for complete results
* **Use Case**: Major features, architectural changes, periodic reviews
* **Features**: Architectural insights, dependency analysis, pattern consistency checking
* **Implementation**: Combines DeepWiki full wiki generation with PR-specific queries

### 3. Targeted Architectural Deep Dives

* **Focus**: Specific architectural aspects or concerns
* **Time**: Varies based on depth (typically 3-7 minutes)
* **Use Case**: Exploring specific code areas or patterns
* **Features**: Presented as architectural perspectives rather than technical queries
* **Implementation**: Uses DeepWiki Chat API with targeted architectural queries

## DeepWiki API Integration

### Available Endpoints

The DeepWiki API provides several endpoints that we utilize:

1. **Wiki Generation**: `/export/wiki`
   - Generates complete wiki for a repository
   - Supports various formats (JSON, Markdown, HTML)
   - Can specify provider and model

2. **Chat Completions**: `/chat/completions`
   - Provides targeted analysis of a repository
   - Supports conversation format with messages
   - Can specify provider and model

3. **Streaming Chat**: `/chat/completions/stream`
   - Streaming version of chat completions
   - Useful for real-time UI feedback

### Provider and Model Selection

DeepWiki supports multiple AI providers and models:

#### Google AI
- `gemini-2.0-flash`
- `gemini-2.5-flash-preview-04-17`
- `gemini-2.5-pro-preview-05-06`

#### OpenAI
- `gpt-4o`
- `gpt-4.1`
- `o1`
- `o3`
- `o4-mini`

#### OpenRouter (for Claude and other models)
- `openai/gpt-4o`
- `openai/gpt-4.1`
- `anthropic/claude-3.7-sonnet`
- `anthropic/claude-3.5-sonnet`

#### Ollama (for local open-source models)
- `qwen3:1.7b`
- `llama3:8b`
- `qwen3:8b`

### Optimal Model Selection Strategy

Based on our testing, we've implemented a model selection strategy that optimizes for:

1. **Repository Size**: Different models perform better for different repository sizes
2. **Language**: Some models have better understanding of specific programming languages
3. **Analysis Type**: Wiki generation vs. targeted queries
4. **Performance**: Balancing response time with quality

Our `DeepWikiClient` automatically selects the optimal model based on these parameters, but you can override this behavior by explicitly specifying a model.

## Implementation Components

### Core Components

1. **DeepWikiClient**: Client for interacting with DeepWiki API
   - Handles authentication, retries, and error cases
   - Provides methods for wiki generation and chat completions
   - Implements automatic model selection

2. **ThreeTierAnalysisService**: Orchestrates the three-tier analysis approach
   - Determines analysis depth based on context
   - Manages caching for repository analysis
   - Coordinates perspective-based targeted analyses

3. **Database Schema**: Stores analysis results and metrics
   - Repository analyses
   - PR analyses
   - Targeted perspective analyses
   - Model performance metrics

### Key Features

1. **Intelligent Caching**: Repository analyses are cached and reused when appropriate
   - Cache invalidation based on repository changes
   - Performance metrics to optimize cache usage

2. **Adaptive Model Selection**: Automatically selects the best model based on context
   - Language-specific optimizations
   - Size-based model selection
   - Performance tracking for continuous improvement

3. **Targeted Perspectives**: Predefined architectural perspectives for deep dives
   - Architecture
   - Design Patterns
   - Performance
   - Security
   - Testing
   - Dependencies
   - Maintainability

4. **Large Repository Handling**: Strategies for dealing with large repositories
   - Chunking for repositories exceeding token limits
   - Priority component analysis
   - Strategic token usage

## Usage Examples

### Quick PR Analysis

```typescript
const analysisService = new ThreeTierAnalysisService(deepWikiClient, logger);

const result = await analysisService.analyzePullRequest(
  {
    owner: 'organization',
    repo: 'repository',
    repoType: 'github'
  },
  {
    depth: AnalysisDepth.QUICK,
    prNumber: 123
  }
);

// Process the result
const prAnalysis = result.results.prAnalysis;
```

### Comprehensive Repository Analysis

```typescript
const result = await analysisService.analyzeRepository(
  {
    owner: 'organization',
    repo: 'repository',
    repoType: 'github'
  },
  {
    depth: AnalysisDepth.COMPREHENSIVE,
    useCache: true
  }
);

// Access the full repository wiki
const repositoryWiki = result.results.repositoryWiki;
```

### Targeted Architectural Analysis

```typescript
const result = await analysisService.analyzeRepository(
  {
    owner: 'organization',
    repo: 'repository',
    repoType: 'github'
  },
  {
    depth: AnalysisDepth.TARGETED,
    perspectives: [
      TargetedPerspective.ARCHITECTURE,
      TargetedPerspective.PERFORMANCE
    ]
  }
);

// Access the perspective results
const architectureAnalysis = result.results.perspectiveResults[TargetedPerspective.ARCHITECTURE];
const performanceAnalysis = result.results.perspectiveResults[TargetedPerspective.PERFORMANCE];
```

## Configuration

### Environment Variables

```
DEEPWIKI_API_URL=http://deepwiki-api.codequal-dev.svc.cluster.local:8001
DEEPWIKI_DEFAULT_PROVIDER=openai
DEEPWIKI_DEFAULT_MODEL=gpt-4o
DEEPWIKI_CACHE_EXPIRY_HOURS=72
```

### Kubernetes Configuration

DeepWiki is deployed in our Kubernetes cluster with the following components:

- Frontend: `deepwiki-frontend.codequal-dev.svc.cluster.local`
- API: `deepwiki-api.codequal-dev.svc.cluster.local:8001`

### Provider API Keys

DeepWiki requires API keys for the various providers:

- `GITHUB_TOKEN`: For accessing repositories
- `OPENAI_API_KEY`: For OpenAI models
- `GOOGLE_API_KEY`: For Google AI models
- `OPENROUTER_API_KEY`: For OpenRouter models

## Testing Results

Our comprehensive testing has established optimal model configurations for different scenarios. See the [DeepWiki Testing Results](/docs/deepwiki-testing/quality-evaluation.md) for detailed findings.

## Limitations and Future Improvements

### Current Limitations

1. **Repository Size**: Repositories exceeding ~300,000 tokens may require chunking
2. **Model Pricing**: Different providers have different pricing structures that affect our costs
3. **Language Coverage**: Some languages may have better analysis quality than others

### Planned Improvements

1. **Improved Chunking Strategies**: Better handling of large repositories
2. **Multi-Repository Analysis**: Support for analyzing relationships between repositories
3. **Cost Optimization**: Smarter model selection to optimize for cost vs. quality
4. **User Feedback Loop**: Incorporate user feedback to improve model selection
5. **Custom Perspectives**: Allow users to define custom architectural perspectives

## Integration with CodeQual Architecture

DeepWiki integration enhances CodeQual's multi-agent architecture:

1. **Repository Data Provider**: Uses DeepWiki for comprehensive repository analysis
2. **Analysis Agents**: Leverage DeepWiki insights for code quality assessment
3. **Reporting Agent**: Incorporates DeepWiki architectural insights into reports

## Troubleshooting

### Common Issues

1. **Slow Response Times**: 
   - Check repository size
   - Verify network connectivity to DeepWiki API
   - Consider using a different model

2. **API Errors**:
   - Verify API keys are correctly configured
   - Check DeepWiki logs for errors
   - Ensure GitHub token has required permissions

3. **Low Quality Analysis**:
   - Try a different provider/model
   - Check if repository is too large
   - Consider using targeted analysis instead of full wiki

## Resources

- [DeepWiki GitHub Repository](https://github.com/asyncfuncai/deepwiki-open)
- [DeepWiki API Documentation](https://github.com/asyncfuncai/deepwiki-open/wiki/API)
- [CodeQual Integration Testing](/docs/deepwiki-testing/test-plan.md)
