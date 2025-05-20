# DeepWiki Chatbot POC

This Proof of Concept (POC) demonstrates how to build a chatbot that interacts with DeepWiki's repository context system. The chatbot allows users to ask questions about code repositories and receive contextual answers based on DeepWiki's deep understanding of the codebase.

## Overview

The POC implements a simple but effective architecture for a DeepWiki-powered chatbot:

1. **Repository Context Provider**: Interfaces with DeepWiki to generate or retrieve repository analyses
2. **Chat Context Manager**: Maintains conversation state and manages chat history
3. **Model Interface**: Handles communication with LLMs through OpenRouter
4. **Integration with Model Context Protocol (MCP)**: Leverages MCP for efficient context handling

## Components

- `deepwiki-kubernetes.js`: Service for interacting with DeepWiki in Kubernetes
- `chat-context-manager.js`: Manages conversation context and history
- `model-interface.js`: Interfaces with language models via OpenRouter
- `repository-context-provider.js`: Retrieves repository context from DeepWiki
- `chat-session.js`: Manages an individual chat session
- `index.js`: Main entry point that ties components together
- `config.js`: Configuration settings for the application

## Getting Started

1. Ensure you have the necessary prerequisites:
   - Node.js v16+
   - Access to DeepWiki in a Kubernetes cluster
   - OpenRouter API key
   - Required npm packages: axios, express (for web UI demo)

2. Set up environment variables:
   ```
   export OPENROUTER_API_KEY="your-openrouter-api-key"
   export KUBERNETES_NAMESPACE="codequal-dev"
   export DEEPWIKI_POD_SELECTOR="deepwiki-fixed"
   export DEEPWIKI_PORT="8001"
   ```

3. Install dependencies:
   ```
   npm install
   ```

4. Run the demo:
   ```
   node index.js
   ```

## Architecture

The chatbot follows a component-based architecture:

```
User Query → Chat Context Manager → Repository Context Provider → Model Interface → Response
                   ↑                          ↑                          ↑
                   |                          |                          |
              Chat History            DeepWiki Kubernetes          OpenRouter API
```

## Key Features

1. **Repository-Aware Conversations**: Chat about specific repositories with context
2. **Memory and Context Management**: Maintains conversation history for contextual responses
3. **Fallback Model Support**: Uses model fallback for reliable responses
4. **Kubernetes Integration**: Works with DeepWiki deployed in Kubernetes

## Implementation Approach

This POC demonstrates two key approaches:

1. **On-demand Analysis**: Generating repository analysis during the conversation
2. **Pre-generated Context**: Using previously generated repository contexts

The POC also includes examples of both direct model prompting and Model Context Protocol (MCP) for context-efficient interactions.

## Next Steps

After this POC, recommended next steps include:

1. Integrate with a vector database for more efficient repository context retrieval
2. Implement streaming responses for improved user experience
3. Develop a more sophisticated web UI for the chatbot
4. Create comprehensive test coverage
5. Set up monitoring and logging for production use

## Limitations

This POC has the following limitations:

1. Limited error handling for production use
2. No persistent storage for chat history
3. Basic model prompting strategies
4. No integration with authentication systems
