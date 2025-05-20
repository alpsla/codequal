# DeepWiki Chat Service - Proof of Concept

This document describes the proof of concept implementation for a chat service that allows developers to interact with and query repositories using DeepWiki.

## Overview

The DeepWiki Chat Service builds on our existing DeepWiki integration to provide an interactive way to explore and understand repositories. This implementation focuses on:

1. **Interactive Code Exploration**: Ask questions about repositories and receive detailed responses
2. **Conversation History**: Maintain context across multiple questions
3. **Perspective-Based Questions**: Ask targeted questions from specific viewpoints (architecture, security, etc.)
4. **Multiple Model Support**: Use different AI models for different types of analysis

## Implementation Details

The proof of concept consists of the following components:

### 1. DeepWikiChatService Class

A service class that provides methods for interacting with repositories through chat:

- `sendMessage()`: Send a chat message about a repository
- `continueConversation()`: Continue an existing chat thread
- `askPerspectiveQuestion()`: Ask questions from specific analytical perspectives
- `getAvailablePerspectives()`: List available analytical perspectives

The service handles:
- Creating appropriate system prompts
- Managing conversation context
- Formatting responses from different AI providers

### 2. CLI Tools for Testing

Two command-line tools for testing the chat functionality:

- **chat-example.ts**: A simple script demonstrating basic usage patterns
- **interactive-chat.ts**: A full interactive CLI tool with support for conversation history, perspectives, and more

### 3. Integration with Existing Architecture

The chat service works with our existing DeepWiki integration:
- Uses the DeepWikiClient for API communication
- Follows the same patterns as our ThreeTierAnalysisService
- Integrates with the same initialization flow

## Usage

### Basic Usage

```typescript
// Create the client and chat service
const client = new DeepWikiClient(deepWikiUrl, logger);
const chatService = new DeepWikiChatService(client, logger);

// Define repository
const repository = {
  owner: 'AsyncFuncAI',
  repo: 'deepwiki-open',
  repoType: 'github' as const
};

// Ask a question
const response = await chatService.sendMessage(
  repository,
  'What are the main components of this repository?'
);

console.log(response.content);
```

### Targeted Perspective Questions

```typescript
// Ask about architecture
const architectureResponse = await chatService.askPerspectiveQuestion(
  repository,
  'architecture',
  'How does the component structure promote maintainability?'
);

// Ask about security
const securityResponse = await chatService.askPerspectiveQuestion(
  repository,
  'security'
);
```

### Interactive CLI

The interactive CLI provides a convenient way to test the chat functionality:

```bash
# Start a chat with a repository
ts-node interactive-chat.ts --repo AsyncFuncAI/deepwiki-open

# Use a specific model
ts-node interactive-chat.ts --repo AsyncFuncAI/deepwiki-open --provider openai --model gpt-4o

# Start with a specific perspective
ts-node interactive-chat.ts --repo AsyncFuncAI/deepwiki-open --perspective architecture
```

## Next Steps

1. **Production Integration**: Integrate chat functionality with the orchestrator
2. **UI Development**: Create a user interface for the chat functionality
3. **Vector Database Integration**: Connect with our Supabase vector database to enhance context
4. **Enhanced Context**: Improve context quality by including more repository structure data
5. **Chat Streaming**: Implement streaming responses for a better user experience
6. **Repository Caching**: Add caching to improve response times for frequently accessed repositories

## Testing Instructions

1. Ensure the DeepWiki server is running
2. Run the chat example script:
   ```bash
   ts-node scripts/chat-example.ts
   ```
3. Try the interactive CLI:
   ```bash
   ts-node scripts/interactive-chat.ts --repo AsyncFuncAI/deepwiki-open
   ```
