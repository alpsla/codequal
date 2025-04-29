# ChatGPT Integration

This document outlines how to set up and use the ChatGPT/OpenAI integration in CodeQual.

## Overview

The ChatGPT integration enables CodeQual to use OpenAI's GPT models for analyzing pull requests, providing code quality feedback, security analysis, and educational content.

## Prerequisites

- OpenAI API key
- Node.js 18+ environment

## Setting Up ChatGPT Integration

1. **Get an OpenAI API Key**
   - Sign up at [OpenAI Platform](https://platform.openai.com/)
   - Create an API key in your account settings

2. **Add the API Key to Environment Variables**
   - Add to your `.env.local` file:
     ```
     OPENAI_API_KEY=your-api-key-here
     ```
   - For CI/CD, add as a repository secret

## Configuring ChatGPT in CodeQual

### Model Selection

The integration uses central model version management, so you can select different GPT models:

```typescript
import { OPENAI_MODELS } from '@codequal/core/config/models/model-versions';

// Example configuration with specific model
const agent = AgentFactory.createAgent(
  AgentRole.CODE_QUALITY,
  AgentProvider.OPENAI,
  {
    model: OPENAI_MODELS.GPT_4O // Use GPT-4o
  }
);

// Default will use GPT-4 Turbo
const defaultAgent = AgentFactory.createAgent(
  AgentRole.SECURITY,
  AgentProvider.OPENAI
);
```

### Available Models

- **GPT-4o**: Latest model with strong multimodal capabilities
- **GPT-4 Turbo**: Efficient and powerful model
- **GPT-4**: Original GPT-4 model
- **GPT-3.5 Turbo**: Faster model for less complex tasks

## Role-Specific Configurations

ChatGPT integration provides specialized prompt templates for different roles:

| Role | Prompt Template | Description |
|------|----------------|-------------|
| `ORCHESTRATOR` | `chatgpt_orchestration_template` | Coordinates analysis tasks |
| `CODE_QUALITY` | `chatgpt_code_quality_template` | Analyzes code quality issues |
| `SECURITY` | `chatgpt_security_analysis_template` | Identifies security vulnerabilities |
| `PERFORMANCE` | `chatgpt_performance_analysis_template` | Finds performance optimizations |
| `DEPENDENCY` | `chatgpt_dependency_analysis_template` | Analyzes dependencies |
| `EDUCATIONAL` | `chatgpt_educational_content_template` | Provides educational content |
| `REPORT_GENERATION` | `chatgpt_report_generation_template` | Generates comprehensive reports |

## Strengths and Use Cases

ChatGPT excels at:

1. **Code Pattern Recognition**: Identifying patterns and anti-patterns across languages
2. **Refactoring Suggestions**: Providing specific implementation examples
3. **Educational Content**: Explaining complex technical concepts
4. **Language Coverage**: Supporting a wide range of programming languages
5. **Documentation**: Suggesting documentation improvements

## Example Results

ChatGPT produces standardized results that include:

- **Insights**: Detected code issues with severity ratings
- **Suggestions**: Specific, file-level suggestions for improvement
- **Educational Content**: Explanations of concepts and best practices

## Customization

You can customize the ChatGPT integration by:

1. **Adjusting Prompts**: Modify prompt components in the `chatgpt-specific.txt` file
2. **Temperature Setting**: Change the randomness of responses
3. **Token Limits**: Adjust maximum tokens for responses

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify your OpenAI API key is correct
   - Check if the key has appropriate permissions

2. **Rate Limiting**
   - OpenAI has rate limits for API calls
   - Consider implementing retry logic or batching

3. **Context Length**
   - For large PRs, GPT models have context length limitations
   - The agent automatically handles file chunking for large PRs

### Debugging

Enable debug logging for more information:

```typescript
const agent = AgentFactory.createAgent(
  AgentRole.CODE_QUALITY,
  AgentProvider.OPENAI,
  {
    debug: true
  }
);
```

## Cost Management

OpenAI API usage incurs costs based on tokens processed. To manage costs:

1. Use model version management to select cost-appropriate models
2. Monitor and set API usage limits in OpenAI platform
3. Consider using GPT-3.5 Turbo for initial/draft analyses
4. Implement token usage tracking in the application

## References

- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
- [GPT Models Overview](https://platform.openai.com/docs/models)
- [OpenAI Pricing](https://openai.com/pricing)
- [CodeQual Model Version Management](../architecture/model-version-management.md)