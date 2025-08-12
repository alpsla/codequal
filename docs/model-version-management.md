# Dynamic Model Selection System

This document describes the fully dynamic model selection system used in CodeQual. The system has been completely redesigned to eliminate ALL hardcoded models and leverage OpenRouter for real-time model discovery and selection.

## Overview

The Dynamic Model Selection System provides a fully automated approach to managing AI models across the application. It discovers available models from OpenRouter in real-time and intelligently selects optimal models based on context. The system:

1. Dynamically discovers ALL models from OpenRouter (no hardcoded models)
2. Performs context-aware model selection based on programming language and repository size
3. Implements ultra-strict freshness scoring (models older than 6 months score 0/10)
4. Stores discovered model configurations in Supabase for fast access
5. Ensures consistent model selection across all agent systems

## Core Components

The system consists of the following key components:

### 1. ModelVersionSync

The OpenRouter discovery and synchronization engine. It dynamically fetches available models from OpenRouter and maintains fresh model data. Key features:

- Real-time model discovery from OpenRouter API
- Context-aware model selection based on language and repository size
- Ultra-strict freshness scoring (6-month cutoff)
- Automatic model configuration generation for all language/size combinations
- Supabase storage for fast model configuration retrieval

```typescript
// Example: Dynamic model discovery and selection
const modelVersionSync = new ModelVersionSync(logger, supabaseClient);
await modelVersionSync.syncModels(); // Discover models from OpenRouter

// Example: Get optimal model for specific context
const optimalModel = await modelVersionSync.getModelForLanguage('typescript', 'medium');

// Example: Generate all possible configurations
const allConfigs = await modelVersionSync.generateAllConfigurations();
```

### 2. Dynamic Model Evaluator

Real-time model scoring and ranking engine that evaluates models based on multiple criteria:

```typescript
interface ModelEvaluationCriteria {
  language?: string;          // Programming language context
  repositorySize?: string;    // Repository size category (small/medium/large)
  taskType?: string;         // Type of task (analysis/generation/review)
  requiresLatestModels?: boolean; // Whether to prioritize newest models
}
```

The evaluator considers:
- **Freshness**: Ultra-strict 6-month cutoff (0/10 for older models)
- **Language optimization**: Better scores for language-specific models
- **Cost efficiency**: Balances performance vs cost
- **Context window**: Matches required context size
- **Provider reputation**: Weights based on provider reliability

### 3. Context-Aware Model Retrieval

Intelligent model selection system that adapts to specific use cases:

```typescript
// Example: Get model optimized for specific context
const contextAwareModel = await getContextAwareModel({
  language: 'python',
  repositorySize: 'large',
  task: 'code_analysis',
  requiresLatestModels: true
});

// Example: DeepWiki model selection
const deepWikiModel = await getDeepWikiOptimalModel({
  queryComplexity: 'high',
  responseLength: 'detailed'
});
```

## Using the Dynamic System

### Automatic Model Discovery

The system automatically discovers new models from OpenRouter - no manual configuration required:

```typescript
// Run model discovery and sync
const modelSync = new ModelVersionSync(logger, supabaseClient);
await modelSync.syncModels();

// Models are automatically evaluated and configured for all language/size combinations
const allConfigs = await modelSync.generateAllConfigurations();
console.log(`Generated ${allConfigs.length} model configurations`);
```

### Triggering Research for New Models

When new models become available on OpenRouter, trigger research to generate optimal configurations:

```typescript
// Run comprehensive research for all language/size combinations
await runContextualResearch({
  languages: ['javascript', 'typescript', 'python', 'java', 'go', 'rust'],
  sizes: ['small', 'medium', 'large'],
  researchAllCombinations: true
});
```

### Real-Time Model Selection

The system automatically selects optimal models based on context:

```typescript
// Get the best model for a specific language and repository size
const bestModel = await modelSync.getModelForLanguage('typescript', 'medium');

// Models are automatically evaluated based on:
// - Freshness (6-month ultra-strict cutoff)
// - Language optimization scores
// - Cost-performance balance
// - Context window requirements
```

### Monitoring Model Performance

Track model performance and freshness:

```typescript
// Check model statistics
const stats = await modelSync.getModelStats();
console.log(`Total models: ${stats.totalModels}`);
console.log(`Fresh models (< 6 months): ${stats.freshModels}`);
console.log(`Configurations generated: ${stats.configurationsGenerated}`);

// View model freshness scores
const allModels = modelSync.getAllModels();
allModels.forEach(model => {
  console.log(`${model.id}: freshness ${model.getFreshnessScore()}/10`);
});
```

### Integration with Agent Systems

All agents automatically use the dynamic model selection:

```typescript
// Comparison Agent - automatically gets optimal model
const comparisonAgent = new ComparisonAgent({
  // No model configuration needed - uses dynamic selection
  repositoryContext: { language: 'python', size: 'large' }
});

// Researcher Service - leverages context-aware selection
const researcher = new ProductionResearcherService({
  // Automatically selects best models for research tasks
  enableDynamicModelSelection: true
});
```

## Integration with Research System

The dynamic system integrates seamlessly with the research pipeline:

```typescript
// Research system automatically discovers and evaluates new models
const researchRunner = new ScheduledResearchRunner({
  modelSync: modelVersionSync,
  researchConfig: {
    runOnNewModels: true,
    evaluateAllLanguages: true,
    updateConfigurations: true
  }
});

// Automatically generate configurations when new models are discovered
await researchRunner.runComprehensiveResearch();
```

## Key Benefits of Dynamic System

This fully dynamic approach offers significant advantages:

1. **Zero Hardcoding**: No hardcoded models anywhere in the system
2. **Always Fresh**: Automatic discovery of new models from OpenRouter
3. **Ultra-Strict Quality**: 6-month freshness cutoff ensures only current models
4. **Context-Aware**: Intelligent selection based on programming language and repository size
5. **Self-Maintaining**: Automatically updates as new models become available
6. **Performance Optimized**: Configurations stored in Supabase for fast retrieval
7. **Research-Driven**: Continuously evaluates and improves model selections

## Architecture Highlights

- **~198 Configurations Generated**: Comprehensive coverage of all language/size combinations
- **Real-Time Discovery**: OpenRouter integration for immediate model availability
- **Freshness Scoring**: Ultra-strict 6-month cutoff (0/10 for older models)
- **Cost-Performance Balance**: Intelligent scoring considering both quality and cost
- **Supabase Storage**: Fast configuration retrieval for production workloads

## Migration from Hardcoded System

The system has been completely migrated from hardcoded models:

- **Before**: Static model configurations scattered across files
- **After**: Single dynamic system discovering models from OpenRouter
- **Impact**: Zero hardcoded models remain in any agent or service
- **Result**: Always using the latest, most optimal models for each context

This represents a fundamental shift to a self-maintaining, intelligent model selection system that adapts to the rapidly evolving AI landscape.