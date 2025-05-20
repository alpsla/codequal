# Model Version Management System

This document describes the centralized model version management system used in CodeQual to handle AI model versions, selection, and configuration.

## Overview

The Model Version Management System provides a centralized approach to managing AI models across the application. It ensures consistent model versions are used throughout the system, from PR reviews to repository analysis, while making it easy to:

1. Add new models or update existing ones
2. Configure optimal model selection based on repository context
3. Manage model capabilities, pricing, and other metadata
4. Handle model version deprecation and replacement
5. Ensure consistent calibration across the system

## Core Components

The system consists of the following key components:

### 1. ModelVersionSync

The central registry for all model version information. It maintains the canonical list of models with their capabilities, pricing, and metadata. Key features:

- Centralized model registry with detailed metadata
- Methods for registering, updating, and deprecating models
- Model standardization to ensure consistent version usage
- Optimal model selection based on repository context

```typescript
// Example: Getting canonical model information
const modelInfo = modelVersionSync.getCanonicalVersion('anthropic', 'claude-3-7-sonnet');

// Example: Finding optimal model for a repository context
const optimalModel = modelVersionSync.findOptimalModel({
  language: 'typescript',
  sizeCategory: 'medium',
  tags: ['web_app']
});
```

### 2. Model Provider Plugins

Provider-specific plugins that register models with the central registry. Each provider implements the `ModelProviderPlugin` interface:

```typescript
interface ModelProviderPlugin {
  provider: string;
  registerModels(): ModelVersionInfo[];
  validateModelConfig?(config: ModelVersionInfo): boolean;
}
```

The system includes plugins for major providers:
- OpenAI (GPT models)
- Anthropic (Claude models)
- Google (Gemini models)
- DeepSeek (Coder models)

### 3. ModelConfigurationFactory

Factory class that generates different types of model configurations from the canonical registry:

- Repository model configurations
- DeepWiki-compatible configurations
- Agent-compatible configurations
- Calibration model configurations

```typescript
// Example: Creating configuration for a repository context
const repoConfig = configFactory.createRepositoryModelConfig({
  language: 'python',
  sizeCategory: 'large',
  tags: ['ml_project']
});

// Example: Creating DeepWiki configuration
const deepWikiConfig = configFactory.createDeepWikiModelConfig(modelInfo);
```

## Using the System

### Adding a New Model

To add a new model to the system:

1. Create or update a provider plugin:

```typescript
// In GoogleModelProvider.ts
registerModels(): ModelVersionInfo[] {
  return [
    // Existing models...
    
    // New model
    {
      provider: 'google',
      model: 'gemini-3.0-pro',
      versionId: 'gemini-3.0-pro-20250701',
      releaseDate: '2025-07-01',
      description: 'Latest Google Gemini model with enhanced capabilities',
      capabilities: {
        codeQuality: 9.0,
        speed: 8.5,
        contextWindow: 150000,
        reasoning: 9.2,
        detailLevel: 8.9
      },
      pricing: {
        input: 8.00,
        output: 24.00
      },
      tier: ModelTier.PREMIUM,
      preferredFor: ['python', 'java', 'large_repositories']
    }
  ];
}
```

2. Register the provider with the registry:

```typescript
// In your initialization code
const registry = new ModelProviderRegistry(logger, modelVersionSync);
registry.registerProvider(new GoogleModelProvider());
```

### Updating Model Configurations

When model configurations need to be updated:

```typescript
// Update a model's version or capabilities
modelVersionSync.updateModelVersion({
  provider: 'anthropic',
  model: 'claude-3-7-sonnet',
  versionId: 'claude-3-7-sonnet-20250301', // Updated version
  capabilities: {
    // Updated capabilities
    codeQuality: 9.3,
    speed: 7.8,
    contextWindow: 200000,
    reasoning: 9.6,
    detailLevel: 9.4
  }
});
```

### Deprecating Models

When a model should be deprecated:

```typescript
// Deprecate a model and optionally specify a replacement
modelVersionSync.deprecateModel(
  'openai', 
  'gpt-4-turbo',
  'openai/gpt-4o' // Replacement model key
);
```

### Generating Model Configurations

Generate comprehensive model configurations:

```typescript
// Generate configurations for all language/size combinations
const completeConfigs = configFactory.generateCompleteModelConfigs();

// Update static configurations if needed
configFactory.updateStaticModelConfigs();
```

## Integration with Calibration

The system seamlessly integrates with the calibration process:

1. Calibration models are derived from the central registry:
```typescript
const calibrationModels = configFactory.getCalibrationModels();
```

2. Calibration service uses the configuration factory:
```typescript
const calibrationService = new RepositoryCalibrationService(
  logger,
  deepWikiClient,
  configStore,
  configFactory
);
```

## Benefits

This centralized approach offers several benefits:

1. **Single Source of Truth**: All model configurations derive from a central registry
2. **Easy Updates**: Adding or updating models requires changes in just one place
3. **Consistent Versioning**: Ensures the same model versions are used throughout the system
4. **Optimized Selection**: Intelligent model selection based on repository context
5. **Extensible**: New providers can be added through the plugin system
6. **Future-Proof**: Model deprecation and replacement handling built in

## Best Practices

1. Always use the ModelVersionSync to get model configurations rather than hardcoding
2. Use provider plugins to register new models
3. Use the ModelConfigurationFactory to generate specific configurations
4. Update model metadata (capabilities, pricing) when new information is available
5. Deprecate models properly rather than removing them to maintain backward compatibility