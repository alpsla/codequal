# DeepWiki CLI Command Reference

This document provides a comprehensive reference for all DeepWiki CLI commands available in the Kubernetes deployment. This reference is based on the investigation conducted as part of the DeepWiki Kubernetes integration.

## Environment Details

- **Namespace:** [Namespace]
- **Pod:** [Pod Name]
- **Container:** [Container Name]
- **Investigation Date:** May 16, 2025

## Command Overview

| Command | Description | Required Parameters | Optional Parameters |
|---------|-------------|---------------------|---------------------|
| `analyze` | Analyze a GitHub repository | Repository URL | Mode, Provider, Model |
| `chat` | Chat with a repository context | Repository URL, Question | Analysis ID, Provider, Model |
| [Additional commands] | [Description] | [Required Parameters] | [Optional Parameters] |

## Detailed Command Reference

### `analyze` Command

Analyzes a GitHub repository and generates documentation.

**Syntax:**
```
[command] analyze [repository-url] [options]
```

**Required Parameters:**
- `repository-url`: URL of the GitHub repository to analyze

**Optional Parameters:**
- `--mode, -m`: Analysis mode (`comprehensive` or `concise`)
- `--provider, -p`: Model provider to use (e.g., `openrouter`, `google`)
- `--model`: Specific model to use
- `--branch, -b`: Branch to analyze (default: main)
- `--output, -o`: Output format (e.g., `json`, `markdown`)
- [Additional parameters]

**Examples:**
```
[command] analyze https://github.com/example/repo
[command] analyze https://github.com/example/repo --mode concise
[command] analyze https://github.com/example/repo --provider openrouter --model anthropic/claude-3-5-sonnet
```

**Output Format:**
```json
{
  "id": "analysis-123456",
  "repository": "https://github.com/example/repo",
  "status": "success",
  "results": {
    // Detailed result structure
  }
}
```

### `chat` Command

Runs a chat query against a previously analyzed repository.

**Syntax:**
```
[command] chat [options] "question"
```

**Required Parameters:**
- `question`: The question to ask about the repository

**Optional Parameters:**
- `--repository, -r`: Repository URL
- `--analysis-id, -a`: ID of a previous analysis
- `--provider, -p`: Model provider to use
- `--model`: Specific model to use
- `--max-tokens`: Maximum tokens to generate
- [Additional parameters]

**Examples:**
```
[command] chat --repository https://github.com/example/repo "What is the architecture of this project?"
[command] chat --analysis-id analysis-123456 "How does the error handling work?"
```

**Output Format:**
```json
{
  "question": "What is the architecture of this project?",
  "answer": "The project follows a microservices architecture...",
  "repository": "https://github.com/example/repo",
  "usage": {
    "prompt_tokens": 1200,
    "completion_tokens": 500,
    "total_tokens": 1700
  }
}
```

### [Additional Commands]

[Document additional commands in the same format]

## Environment Variables

The following environment variables are used to configure the DeepWiki CLI:

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENROUTER_API_KEY` | API key for OpenRouter | Yes, if using OpenRouter provider |
| `GOOGLE_API_KEY` | API key for Google AI | Yes, if using Google provider |
| `OPENAI_API_KEY` | API key for OpenAI | Yes, if using OpenAI provider |
| [Additional variables] | [Description] | [Required?] |

## Configuration Files

The following configuration files are used by DeepWiki:

| File | Description | Location |
|------|-------------|----------|
| `generator.json` | Configures text generation models and parameters | `/app/api/config/generator.json` |
| `embedder.json` | Configures embedding models | `/app/api/config/embedder.json` |
| [Additional files] | [Description] | [Location] |

## Authentication

Authentication is handled through API keys provided as environment variables. Each provider requires its own API key:

1. **OpenRouter:** Set the `OPENROUTER_API_KEY` environment variable
2. **Google:** Set the `GOOGLE_API_KEY` environment variable
3. **OpenAI:** Set the `OPENAI_API_KEY` environment variable
4. [Additional providers]

## Error Handling

Common error scenarios and their handling:

| Error | Description | Resolution |
|-------|-------------|------------|
| `API Key Error` | Missing or invalid API key | Ensure the relevant API key is provided as an environment variable |
| `Repository Not Found` | The specified repository couldn't be accessed | Verify the repository URL and ensure it's public or the DeepWiki has access |
| [Additional errors] | [Description] | [Resolution] |

## Performance Considerations

- **Comprehensive Mode:** Typically takes 5-10 minutes for a medium-sized repository
- **Concise Mode:** Typically takes 1-3 minutes for a medium-sized repository
- **Repository Size Limits:** Repositories over 500MB may encounter token limitations
- **Concurrent Requests:** The system supports up to [X] concurrent analyses

## Implementation in DeepWikiKubernetesService

The following shows how to implement the commands in the DeepWikiKubernetesService:

```typescript
// Example implementation
public async analyzeRepository(options: DeepWikiAnalysisOptions): Promise<any> {
  let command = `[command] analyze ${options.repositoryUrl}`;
  
  if (options.mode === 'concise') {
    command += ' --mode concise';
  }
  
  if (options.provider) {
    command += ` --provider ${options.provider}`;
  }
  
  if (options.model) {
    command += ` --model ${options.model}`;
  }
  
  // Execute the command
  const output = await this.executeCommandInPod(command, options.timeout || 600);
  
  // Parse the output
  return this.parseOutput(output);
}
```

## Notes and Observations

- [Notable observations about the DeepWiki CLI]
- [Any limitations or considerations]
- [Best practices]

---

## Appendix A: Raw Command Output Examples

### Analyze Command Output Example

```
[Include a complete example of the analyze command output]
```

### Chat Command Output Example

```
[Include a complete example of the chat command output]
```

## Appendix B: API Endpoints

If the DeepWiki exposes HTTP APIs, document them here:

| Endpoint | Method | Description | Parameters |
|----------|--------|-------------|------------|
| `/api/status` | GET | Get the status of the DeepWiki service | None |
| [Additional endpoints] | [Method] | [Description] | [Parameters] |
