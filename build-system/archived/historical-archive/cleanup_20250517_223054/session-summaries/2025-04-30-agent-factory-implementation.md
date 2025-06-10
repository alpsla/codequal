# Agent Factory Implementation - April 30, 2025

## Overview

We've implemented a new AgentFactory system to simplify the creation and configuration of agent instances in the CodeQual project. This implementation provides a more flexible and intuitive way to work with various agent providers and models.

## Key Components

### 1. Provider Groups

We introduced the concept of Provider Groups to abstract away the specific model details and provide a higher-level grouping of providers. This allows for more maintainable code and easier switching between models from the same provider.

```typescript
export enum ProviderGroup {
  OPENAI = 'openai',
  CLAUDE = 'anthropic',
  DEEPSEEK = 'deepseek',
  GEMINI = 'gemini',
  SNYK = 'snyk',
  MCP = 'mcp'
}
```

### 2. Agent Factory

The `AgentFactory` class provides a static `createAgent` method that handles the instantiation of the appropriate agent based on the specified role and provider:

```typescript
static createAgent(
  role: AgentRole, 
  provider: AgentProvider | ProviderGroup, 
  config: AgentConfig = {}
): Agent
```

This method accepts either a specific agent provider (e.g., `AgentProvider.DEEPSEEK_CODER`) or a provider group (e.g., `ProviderGroup.DEEPSEEK`). When a provider group is used, the factory will automatically select the default model for that group.

### 3. Provider Mappings

The implementation includes mappings to connect individual models to their provider groups, as well as to determine the default and premium models for each provider group:

- `PROVIDER_TO_GROUP`: Maps individual providers to their provider group
- `DEFAULT_MODEL_BY_GROUP`: Defines the default model for each provider group
- `PREMIUM_MODEL_BY_GROUP`: Defines the premium model for each provider group

## Usage Examples

### Using Provider Groups (Recommended)

```typescript
const deepseekAgent = AgentFactory.createAgent(
  AgentRole.CODE_QUALITY, 
  ProviderGroup.DEEPSEEK,
  {
    debug: true
  }
);

const geminiAgent = AgentFactory.createAgent(
  AgentRole.CODE_QUALITY,
  ProviderGroup.GEMINI,
  {
    debug: true
  }
);
```

### Using Specific Models

```typescript
const deepseekAgent = AgentFactory.createAgent(
  AgentRole.CODE_QUALITY, 
  AgentProvider.DEEPSEEK_CODER_PLUS,
  {
    debug: true
  }
);

const geminiAgent = AgentFactory.createAgent(
  AgentRole.CODE_QUALITY,
  AgentProvider.GEMINI_1_5_PRO,
  {
    debug: true
  }
);
```

### Using the Premium Flag

When the `premium` flag is set to `true` in the configuration, the factory will automatically select the premium model for the specified provider group:

```typescript
const premiumAgent = AgentFactory.createAgent(
  AgentRole.CODE_QUALITY,
  ProviderGroup.DEEPSEEK,
  {
    premium: true,
    debug: true
  }
);
```

## Advantages

1. **Simplified API**: The factory provides a simple and consistent way to create agent instances.
2. **Abstraction of Details**: Developers don't need to know the specifics of which model to use for each provider.
3. **Flexibility**: The system supports both high-level provider groups and specific model selection.
4. **Future-Proofing**: As new models are added, they can be easily incorporated into the existing structure.

## Integration with Existing Code

To update existing code that might be using the older approach (trying to use AgentProvider.DEEPSEEK or AgentProvider.GEMINI directly), simply replace these references with the appropriate ProviderGroup enum values:

```typescript
// Old approach (problematic)
const deepseekAgent = AgentFactory.createAgent(
  AgentRole.CODE_QUALITY, 
  AgentProvider.DEEPSEEK, // This doesn't exist
  {
    model: DEEPSEEK_MODELS.DEEPSEEK_CODER,
    debug: true
  }
);

// New approach (recommended)
const deepseekAgent = AgentFactory.createAgent(
  AgentRole.CODE_QUALITY, 
  ProviderGroup.DEEPSEEK,
  {
    debug: true
  }
);
```

See the full example in `/docs/examples/agent-factory-usage.ts` for more details.

## Next Steps

1. **Update Existing Code**: Review and update any code that might be using the non-existent AgentProvider values.
2. **Add Tests**: Create comprehensive tests for the factory to ensure it correctly handles all supported providers and configurations.
3. **Documentation**: Add more examples and documentation to help developers understand how to use the new system effectively.