# Model Version Management

This document outlines our centralized approach to managing AI model versions across the CodeQual project.

## Overview

To maintain consistency and simplify model version updates, we've implemented a centralized model version management system. This ensures that when model versions change (which happens frequently with AI providers), we only need to update the version in one place.

## Key Components

1. **Central Model Registry**
   - `/packages/core/src/config/models/model-versions.ts`
   - Contains all model versions for all providers
   - Updates to model versions are made in this single file

2. **PR-Agent Configuration Utilities**
   - `/packages/core/src/config/models/pr-agent-config.ts`
   - Helps generate and manage PR-Agent configurations
   - Automatically uses the correct model versions from the registry

3. **Command Line Tools**
   - `/scripts/config/generate-pr-agent-config.js`
   - Interactive script to generate PR-Agent configuration
   - Uses the centralized model information

## How It Works

1. All model versions are defined in `model-versions.ts`
2. When you need to reference a model in code, import from this file:
   ```typescript
   import { ANTHROPIC_MODELS } from '@codequal/core/config/models/model-versions';

   // Use the model version
   const model = ANTHROPIC_MODELS.CLAUDE_3_SONNET;
   ```

3. When a model provider releases a new version:
   - Update the version in `model-versions.ts`
   - All references throughout the codebase automatically use the updated version

## Setting Up PR-Agent

To set up PR-Agent with different model providers:

1. Run the interactive configuration generator:
   ```bash
   yarn config:pr-agent --provider=anthropic
   ```

2. This will:
   - Generate a PR-Agent configuration file in `/config/pr-agent.yml`
   - Set up the correct model version for the selected provider
   - Provide instructions to add the path to your `.env.local` file

3. Update your `.env.local` with the path:
   ```
   PR_AGENT_CONFIG_PATH=/path/to/config/pr-agent.yml
   ```

## Supported Models

### OpenAI Models
- GPT-4o (`gpt-4o-2024-05-13`)
- GPT-4 Turbo (`gpt-4-turbo-2024-04-09`)
- GPT-4 (`gpt-4-0613`)
- GPT-3.5 Turbo (`gpt-3.5-turbo-0125`)

### Anthropic Models
- Claude 3 Opus (`claude-3-opus-20240229`)
- Claude 3 Sonnet (`claude-3-sonnet-20240229`)
- Claude 3 Haiku (`claude-3-haiku-20240307`)
- Claude 2 (`claude-2.1`)

### DeepSeek Models
- DeepSeek Coder (`deepseek-coder-33b-instruct`)
- DeepSeek Chat (`deepseek-chat`)

### Gemini Models
- Gemini Pro (`gemini-pro`)
- Gemini Ultra (`gemini-ultra`)

## Best Practices

1. Never hardcode model version strings in your code
2. Always use the constants from the model-versions.ts file
3. When adding support for a new model provider:
   - Add its versions to the central registry
   - Update configuration utilities if needed
4. Keep model versions up to date as providers release new models