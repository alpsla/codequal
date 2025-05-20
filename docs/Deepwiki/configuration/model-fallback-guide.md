# Using Model Fallback in DeepWiki OpenRouter Integration

This guide explains how to use the model fallback feature in the DeepWiki OpenRouter integration when executing repository analyses from the orchestrator.

## Overview

The model fallback mechanism allows you to specify both a primary model and a series of fallback models when running repository analyses. If the primary model encounters an error or fails to generate a valid response, the system will automatically try each fallback model in sequence until one succeeds.

## Command-Line Usage

### Basic Command Structure

```bash
./template_command_updated.sh \
  REPO_URL \
  PRIMARY_MODEL \
  PROMPT_TEMPLATE \
  OUTPUT_PATH \
  NAMESPACE \
  POD_SELECTOR \
  PORT \
  FALLBACK_MODELS
```

### Parameter Details

1. `REPO_URL`: URL of the repository to analyze (e.g., "https://github.com/owner/repo")
2. `PRIMARY_MODEL`: Primary model to use with provider prefix (e.g., "anthropic/claude-3-opus")
3. `PROMPT_TEMPLATE`: Name of the prompt template to use (e.g., "standard", "architecture", "code-quality", "security")
4. `OUTPUT_PATH`: Path where the analysis results will be saved (e.g., "./results/analysis.json")
5. `NAMESPACE`: Kubernetes namespace where DeepWiki is running (default: "codequal-dev")
6. `POD_SELECTOR`: Label selector for DeepWiki pod (default: "deepwiki-fixed")
7. `PORT`: Port for DeepWiki API (default: "8001")
8. `FALLBACK_MODELS`: Comma-separated list of fallback models (e.g., "openai/gpt-4.1,anthropic/claude-3.7-sonnet,openai/gpt-4")

### Example Commands

#### Basic Analysis with Default Fallbacks

```bash
./template_command_updated.sh \
  "https://github.com/expressjs/express" \
  "anthropic/claude-3-opus" \
  "standard" \
  "./results/express_analysis.json"
```

This will use the primary model "anthropic/claude-3-opus" and default fallback models if the primary model fails.

#### Analysis with Custom Fallbacks

```bash
./template_command_updated.sh \
  "https://github.com/expressjs/express" \
  "anthropic/claude-3-opus" \
  "standard" \
  "./results/express_analysis.json" \
  "codequal-dev" \
  "deepwiki-fixed" \
  "8001" \
  "openai/gpt-4.1,anthropic/claude-3.7-sonnet,openai/gpt-4"
```

This specifies both primary and custom fallback models.

## Orchestrator Integration

### TypeScript Interface

```typescript
interface DeepWikiAnalysisOptions {
  repositoryUrl: string;
  primaryModel: string;
  fallbackModels?: string[];
  promptTemplate?: string;
  namespace?: string;
  podSelector?: string;
  port?: number;
  outputPath?: string;
}

interface DeepWikiService {
  analyzeRepositoryWithFallback(options: DeepWikiAnalysisOptions): Promise<AnalysisResult>;
}
```

### Example Usage in Orchestrator

```typescript
import { DeepWikiService } from '../services/deepwiki-service';

async function runRepositoryAnalysis(repoUrl: string) {
  const deepwikiService = new DeepWikiService();
  
  const result = await deepwikiService.analyzeRepositoryWithFallback({
    repositoryUrl: repoUrl,
    primaryModel: 'anthropic/claude-3-opus',
    fallbackModels: ['openai/gpt-4.1', 'anthropic/claude-3.7-sonnet', 'openai/gpt-4'],
    promptTemplate: 'standard',
    outputPath: `./results/${repoUrl.split('/').pop()}_analysis.json`
  });
  
  return result;
}
```

### Implementing the DeepWikiService

```typescript
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execFileAsync = promisify(execFile);

export class DeepWikiService {
  private scriptPath = path.resolve(__dirname, '../scripts/template_command_updated.sh');

  async analyzeRepositoryWithFallback(options: DeepWikiAnalysisOptions): Promise<AnalysisResult> {
    const {
      repositoryUrl,
      primaryModel,
      fallbackModels = ['openai/gpt-4.1', 'anthropic/claude-3.7-sonnet', 'openai/gpt-4'],
      promptTemplate = 'standard',
      namespace = 'codequal-dev',
      podSelector = 'deepwiki-fixed',
      port = 8001,
      outputPath = `./results/${repositoryUrl.split('/').pop()}_analysis.json`
    } = options;

    // Make sure output directory exists
    const outputDir = path.dirname(outputPath);
    fs.mkdirSync(outputDir, { recursive: true });

    // Run the script with all parameters
    try {
      await execFileAsync(this.scriptPath, [
        repositoryUrl,
        primaryModel,
        promptTemplate,
        outputPath,
        namespace,
        podSelector,
        port.toString(),
        fallbackModels.join(',')
      ]);

      // Read and parse the results
      const rawResult = fs.readFileSync(outputPath, 'utf8');
      return JSON.parse(rawResult);
    } catch (error) {
      console.error(`Error analyzing repository: ${error.message}`);
      
      // Check if error output was created
      if (fs.existsSync(outputPath)) {
        try {
          const errorOutput = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
          return {
            success: false,
            error: errorOutput.error || 'Unknown error',
            modelsAttempted: errorOutput.models_attempted,
            ...errorOutput
          };
        } catch (parseError) {
          // Unable to parse error output
        }
      }
      
      throw new Error(`Repository analysis failed: ${error.message}`);
    }
  }
}
```

## Fallback Model Selection Strategy

For optimal results, consider these strategies when selecting fallback models:

1. **Use models from different providers** - Alternate between providers (e.g., Anthropic, OpenAI, Google) to mitigate provider-specific issues.

2. **Mix model capabilities** - Include both high-capability (e.g., Claude Opus, GPT-4) and faster (e.g., Claude Haiku, GPT-4o) models to balance between quality and availability.

3. **Order by reliability** - Arrange fallback models in order of reliability based on historical success rates for the specific analysis types.

4. **Consider specific strengths** - For specialized analyses (e.g., security, code quality), prioritize models with strengths in those areas.

### Recommended Fallback Sequences

#### For General Repository Analysis
```
Primary: anthropic/claude-3-opus
Fallbacks: openai/gpt-4.1, anthropic/claude-3.7-sonnet, openai/gpt-4
```

#### For Code-Heavy Repositories
```
Primary: anthropic/claude-3-opus
Fallbacks: deepseek/deepseek-coder, openai/gpt-4.1, anthropic/claude-3.7-sonnet
```

#### For Fast Analysis (When Speed is Critical)
```
Primary: anthropic/claude-3-haiku
Fallbacks: openai/gpt-4o, google/gemini-2.5-pro-preview, anthropic/claude-3.7-sonnet
```

## Understanding the Results

The analysis results will include metadata about which model was used for the analysis. This is added to the output JSON as a `model_used` field:

```json
{
  "analysis": "...",
  "score": 8,
  "model_used": "anthropic/claude-3-opus"
}
```

If a fallback model was used instead of the primary model, the `model_used` field will contain the name of the fallback model that successfully completed the analysis.

## Troubleshooting

### Common Issues

1. **All Models Failed**

If all models fail, check:
- OpenRouter API key validity
- Network connectivity to OpenRouter
- DeepWiki pod status
- Port forwarding status
- Response logs for specific error messages

2. **Primary Model Always Failing**

If the primary model consistently fails:
- Check if the model is available on OpenRouter
- Examine model response for specific error patterns
- Check if you're hitting rate limits or quotas
- Try with a different primary model

3. **Slow Fallback Performance**

If fallback is working but taking too long:
- Consider adjusting the timeout settings
- Re-order fallback models to try faster models first
- Check if DeepWiki pod has sufficient resources

### Debugging Tips

For detailed debugging, examine the raw response files generated for each model attempt:

```bash
cat ./results/repo_name_model_name_raw.json
```

These files contain the full, unprocessed responses from each model attempt and can provide valuable information for diagnosing issues.
