# Inside DeepWiki's model selection: flexibility over automation

DeepWiki offers a robust, configurable model selection system that prioritizes flexibility through provider-based routing rather than automatic repository-based selection. The system supports multiple AI providers with explicit user control, though it doesn't automatically choose models based on repository characteristics. Here's what you need to know about how it works and how to extend it.

## Current model selection architecture

DeepWiki implements a provider-based model selection system configured through JSON files. The primary configuration happens in `generator.json` located in the `api/config/` directory, which defines available model providers, default models, and model-specific parameters.

DeepWiki supports four main model providers:
- **Google**: Default is `gemini-2.0-flash`, with alternatives like `gemini-1.5-flash`
- **OpenAI**: Used primarily for embeddings but available for text generation
- **OpenRouter**: Provides access to hundreds of models from various providers
- **Ollama**: Supports local open-source models

The default behavior uses Google's Gemini models, with `gemini-2.0-flash` as the preferred choice, but users can easily switch providers and models through configuration.

## Configuration and environment variables

Model selection is controlled through:

1. **Configuration files**:
   ```
   api/config/generator.json  # Defines text generation models and providers
   api/config/embedder.json   # Configures embedding models
   ```

2. **Environment variables**:
   ```
   GOOGLE_API_KEY=your_google_api_key
   OPENAI_API_KEY=your_openai_api_key
   OPENROUTER_API_KEY=your_openrouter_api_key
   DEEPWIKI_CONFIG_DIR=/path/to/custom/configs  # Optional
   ```

3. **Frontend UI**: Users can select their preferred provider and model through the interface.

## OpenRouter integration

OpenRouter integration adds significant model selection flexibility:

1. **Setup and configuration**:
   - Set `OPENROUTER_API_KEY` as an environment variable
   - Check "Use OpenRouter API" option on the homepage
   - Select from available models in the dropdown (GPT-4o, Claude 3.5 Sonnet, etc.)

2. **Behind the scenes**:
   - DeepWiki constructs API calls in OpenAI-compatible format
   - OpenRouter provides access to models from OpenAI, Anthropic, Google, Meta, and Mistral
   - The system allows toggling between different models without changing code
   - OpenRouter handles fallbacks and selects cost-effective options

3. **Architectural flow**:
   ```
   User input → Select Model Provider → OpenRouter → Generate with OpenRouter
   ```

## Implementing automatic model selection

DeepWiki **doesn't currently have built-in automatic selection** based on repository characteristics. To implement this capability, you would need to:

1. **Extend repository analysis**:

```python
# Pseudocode for extending repository analysis in data_pipeline.py
def analyze_repository_characteristics(repo_path):
    characteristics = {
        "primary_language": detect_primary_languages(repo_path),
        "size": calculate_repository_size(repo_path),
        "complexity_score": measure_complexity(repo_path),
        "frameworks": detect_frameworks(repo_path),
        "has_multiple_languages": len(detect_all_languages(repo_path)) > 1
    }
    return characteristics
```

2. **Create a model selection module** (`model_selector.py`):

```python
def select_model(repo_characteristics):
    """Select optimal model based on repository characteristics."""
    config = load_config("model_routing.json")
    
    for rule in config["rules"]:
        if matches_conditions(repo_characteristics, rule["conditions"]):
            return rule["model"]
    
    return config["default"]

def matches_conditions(characteristics, conditions):
    """Check if repository characteristics match specified conditions."""
    # Implementation of condition matching logic
    # ...
```

3. **Define routing rules** in a new configuration file:

```json
// api/config/model_routing.json
{
  "enabled": true,
  "rules": [
    {
      "conditions": {
        "primary_language": ["javascript", "typescript"],
        "size_range": [0, 10000]
      },
      "model": {
        "provider": "google",
        "model": "gemini-2.0-flash",
        "parameters": {
          "temperature": 0.3
        }
      }
    },
    {
      "conditions": {
        "primary_language": ["python", "java"],
        "complexity_score": {"min": 7}
      },
      "model": {
        "provider": "openai",
        "model": "gpt-4o",
        "parameters": {
          "temperature": 0.2
        }
      }
    },
    {
      "conditions": {
        "size_range": [10000, null],
        "has_multiple_languages": true
      },
      "model": {
        "provider": "openrouter",
        "model": "anthropic/claude-3-5-sonnet",
        "parameters": {
          "temperature": 0.1
        }
      }
    }
  ],
  "default": {
    "provider": "google",
    "model": "gemini-2.0-flash"
  }
}
```

4. **Integrate with the existing pipeline** to apply automatic selection when enabled.

## Key factors for effective model selection

When implementing automatic selection, consider these repository characteristics:

- **Programming language**: Different models may have strengths with certain languages
- **Repository size**: Larger repositories might require models with larger context windows
- **Code complexity**: Complex codebases benefit from more sophisticated models
- **Framework detection**: Repositories using specific frameworks may need specialized knowledge
- **Documentation level**: Poorly documented code might benefit from more verbose models
- **Cost-performance balance**: Use expensive models only when necessary

## Conclusion

DeepWiki provides a flexible model selection system through its provider-based configuration, but lacks automatic selection based on repository characteristics. By extending the existing architecture with repository analysis and rule-based routing, you can implement intelligent model selection that optimizes for repository-specific needs while maintaining the flexibility of the current system.
