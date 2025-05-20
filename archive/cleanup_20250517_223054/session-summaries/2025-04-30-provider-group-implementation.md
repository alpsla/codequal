# Provider Group Implementation - April 30, 2025

## Overview

We've implemented a Provider Group system directly in the AgentFactory to solve TypeScript errors related to model constants and imports. This approach simplifies the creation of agents and provides a more intuitive API for working with different model providers.

## Changes Made

### 1. Added ProviderGroup Enum

Added the ProviderGroup enum directly to the agent-factory.ts file:

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

### 2. Enhanced AgentFactory.createAgent Method

Modified the createAgent method to handle both specific providers and provider groups:

```typescript
static createAgent(role: AgentRole, provider: AgentProvider | ProviderGroup, config: Record<string, unknown> = {}): Agent {
  // Handle provider groups first
  if (Object.values(ProviderGroup).includes(provider as ProviderGroup)) {
    const providerGroupValue = provider as ProviderGroup;
    
    // Map provider group to a specific provider
    switch (providerGroupValue) {
      case ProviderGroup.OPENAI:
        return this.createAgent(role, AgentProvider.OPENAI, config);
        
      case ProviderGroup.CLAUDE:
        return this.createAgent(role, AgentProvider.CLAUDE, config);
        
      case ProviderGroup.DEEPSEEK:
        return this.createAgent(role, AgentProvider.DEEPSEEK_CODER, config);
        
      case ProviderGroup.GEMINI:
        return this.createAgent(role, AgentProvider.GEMINI_1_5_FLASH, config);
        
      case ProviderGroup.SNYK:
        return this.createAgent(role, AgentProvider.SNYK, config);
        
      case ProviderGroup.MCP:
        return this.createAgent(role, AgentProvider.MCP_CODE_REVIEW, config);
        
      default:
        throw new Error(`Unsupported provider group: ${provider}`);
    }
  }
  
  // If not a group, handle specific providers
  const agentProvider = provider as AgentProvider;
  switch (agentProvider) {
    // ... existing provider handling ...
  }
}
```

### 3. Updated Manual Integration Test

1. Changed imports to use the local factory:
   ```typescript
   import { AgentFactory, ProviderGroup } from '../src/factory/agent-factory';
   ```

2. Defined model constants directly in the test file to avoid import issues:
   ```typescript
   const GEMINI_MODELS = {
     GEMINI_1_5_FLASH: 'gemini-1.5-flash',
     GEMINI_1_5_PRO: 'gemini-1.5-pro',
     GEMINI_2_5_PRO: 'gemini-2.5-pro',
     GEMINI_PRO: 'gemini-pro',
     GEMINI_ULTRA: 'gemini-ultra'
   };
   ```

3. Updated agent creation to use ProviderGroup:
   ```typescript
   const deepseekAgent = AgentFactory.createAgent(
     AgentRole.CODE_QUALITY, 
     ProviderGroup.DEEPSEEK,
     {
       model: DEEPSEEK_MODELS.DEEPSEEK_CODER,
       debug: true
     }
   );
   ```

## Benefits

1. **No Module Import Issues**: By defining the ProviderGroup enum directly in the agent-factory.ts file, we eliminate import path issues.
2. **Type Safety**: The code now properly passes TypeScript checking with clear typing for both provider groups and specific providers.
3. **Simplified API**: Users can now create agents using provider groups (DEEPSEEK, GEMINI) rather than specific model names.
4. **Flexibility**: The implementation still allows for specific model selection through the config parameter.
5. **Self-Contained**: The manual integration test is now self-contained with its own model definitions.

## Fixed Issues

- Fixed TypeScript error: `Property 'DEEPSEEK' does not exist on type 'typeof AgentProvider'`
- Fixed TypeScript error: `Property 'GEMINI' does not exist on type 'typeof AgentProvider'` 
- Fixed TypeScript error: `Property 'GEMINI_1_5_FLASH' does not exist on type '{ GEMINI_PRO: string; GEMINI_ULTRA: string; }'`
- Fixed module import errors: `Cannot find module '@codequal/core/config/provider-groups'`
- Fixed module import errors: `Cannot find module '@codequal/core/services/agent-factory'`

## Next Steps

1. **Testing**: Run the integration test to ensure it works correctly with the new implementation.
2. **Documentation**: Update any other examples or documentation to use the ProviderGroup approach.
3. **Core Package Updates**: Consider updating the core package's type declarations to match the actual implementation of model constants.