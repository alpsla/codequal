# DeepWiki Chat POC

This proof-of-concept implements a chat interface for DeepWiki that leverages vector database retrieval to enhance responses with repository context.

## Features

- Vector database integration for storing and retrieving repository information
- Chat interface that connects with DeepWiki
- Model selection with fallback options
- Support for multiple repositories

## Getting Started

1. Configure the `.env` file with appropriate API keys
2. Run `npm install` to install dependencies
3. Run `npm run start:chat-poc` to start the POC service

## Testing Different Models

The POC supports multiple models with fallback capability:
- Primary: DeepSeek
- Fallbacks: Gemini 2.5 Flash, Claude 3 Haiku

## Architecture

This POC implements the Message Control Program (MCP) design pattern that:
1. Authenticates users and their repository access
2. Retrieves relevant context from vector database based on user queries
3. Formats prompts with repository context for the LLM
4. Processes and returns responses to users
