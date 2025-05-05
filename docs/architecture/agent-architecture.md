# CodeQual Agent Architecture

This document outlines the architecture of the agent system in the CodeQual project, explaining how we unify the process with reusable components across different model providers.

## Overview

The CodeQual agent architecture is designed to provide a consistent interface for code analysis while supporting multiple AI model providers. The system allows for both direct API integration with model providers and optional MCP (Model Context Protocol) server integration for enhanced functionality and performance testing.

## Key Components

### 1. AgentFactory

The main entry point that provides a unified interface for creating agents. It:
- Accepts either a specific model (AgentProvider) or a model family (ProviderGroup)
- Handles configuration settings like premium mode or debug options
- Maps provider groups to specific provider implementations
- Creates the appropriate agent instance based on the role and provider

Example usage:
```typescript
// Using a provider group (recommended)
const agent = AgentFactory.createAgent(
  AgentRole.CODE_QUALITY,
  ProviderGroup.GEMINI,
  { debug: true }
);

// Using a specific model
const agent = AgentFactory.createAgent(
  AgentRole.CODE_QUALITY,
  AgentProvider.GEMINI_2_5_FLASH,
  { debug: true }
);
```

### 2. ProviderGroup

This abstraction unifies similar models from the same provider:
- OPENAI: Groups all OpenAI models (GPT-3.5, GPT-4, etc.)
- CLAUDE: Groups all Anthropic models (Claude 3 Haiku, Sonnet, Opus)
- DEEPSEEK: Groups all DeepSeek models (Coder, Coder Lite, Coder Plus)
- GEMINI: Groups all Google models (1.5 Flash, 2.5 Pro, etc.)

Using provider groups allows for easier switching between models of the same family and simplifies code.

### 3. BaseAgent

A shared parent class that:
- Defines the common interface (analyze method)
- Provides shared utility methods for logging, error handling, etc.
- Ensures all agents return results in a consistent format

All specific agent implementations inherit from this base class, ensuring consistent behavior.

### 4. Model-Specific Agents

Specialized implementations for each model provider:
- **ClaudeAgent**: Interacts with Anthropic's API
- **ChatGPTAgent**: Interacts with OpenAI's API
- **DeepSeekAgent**: Interacts with DeepSeek's API
- **GeminiAgent**: Interacts with Google's Gemini API

Each agent implementation includes:
- **Model Configuration**: Handles model selection and parameters
- **API Client**: Manages communication with the model provider
- **Response Formatting**: Parses and standardizes model outputs
- **Error Handling**: Deals with API errors and rate limits

### 5. Shared Prompt Template System

A unified system for managing prompts that:
- Loads role-specific templates (codeQuality, security, etc.)
- Provides methods to fill templates with PR data
- Supports model-specific optimizations when needed

All agents utilize this shared system to populate prompts with PR data before sending them to the model.

### 6. MCP Server Integration (Optional)

A key feature of our architecture is the ability to integrate with Model Context Protocol (MCP) servers as an alternative to direct API calls. This allows us to:

- Test how agents perform both with and without MCP integration
- Compare cost, quality, and performance between the approaches
- Leverage specialized functionality provided by MCP servers

MCP servers are not separate agents but rather an integration option that existing agents can use. Each agent can choose between:
1. Direct API integration with the model provider
2. Using an MCP server as an intermediary

Specialized MCP servers include:
- Code Quality MCP
- Security MCP
- Performance MCP
- GitHub MCP (primarily for Orchestrator)
- Search MCP (primarily for Orchestrator)

## Data Flow

1. **Creation Flow**:
   - Client code calls AgentFactory.createAgent() with a role and provider
   - Factory creates the appropriate agent instance

2. **Analysis Flow**:
   - Client calls agent.analyze() with PR data
   - Agent loads the appropriate prompt template for its role
   - Agent fills the template with PR data
   - Agent either:
     - Calls the model provider's API directly, or
     - Sends the request to an MCP server
   - Agent parses the response into the standardized format
   - Agent returns a unified AnalysisResult

## Testing Strategy

Our architecture supports comprehensive testing to compare agent performance:

1. **Direct vs. MCP Testing**:
   - Test each agent with both direct API and MCP server integration
   - Measure performance, quality, and cost differences
   - Identify optimal configurations for different scenarios

2. **Cross-Model Comparison**:
   - Compare results across different model providers
   - Evaluate price-to-performance ratio
   - Identify strengths and weaknesses of each provider

## Benefits

1. **Abstraction**: Clients don't need to know model-specific details
2. **Consistency**: All agents return results in the same format
3. **Extensibility**: Easy to add new model providers
4. **Maintainability**: Shared code reduces duplication
5. **Flexibility**: Can use provider groups for abstraction or specific models for fine control
6. **Testing**: Can compare direct API vs. MCP integration
7. **Cost Optimization**: Can select models based on price-performance ratio

## Implementation Guidelines

When implementing a new agent or MCP integration:

1. **New Agent Implementation**:
   - Inherit from BaseAgent
   - Implement the required methods (analyze, formatResult, etc.)
   - Use the shared prompt template system
   - Follow the established error handling patterns

2. **New MCP Integration**:
   - Ensure the MCP server follows the standard protocol
   - Update the agent to support MCP server connections
   - Implement proper error handling for MCP communication

3. **Prompt Templates**:
   - Use role-based templates (e.g., 'claude_code_quality_template')
   - Include model-specific optimizations as needed
   - Ensure templates are reusable across different agents