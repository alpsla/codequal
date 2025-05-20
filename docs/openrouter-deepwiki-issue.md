# DeepWiki-OpenRouter Integration Issue

## Problem Description

When using DeepWiki with OpenRouter as a provider, the API returns a 400 error with the message: "GenerateContentRequest.model: unexpected model name format". This occurs when trying to use models with the OpenRouter format `provider/model-name` (e.g., `anthropic/claude-3-7-sonnet` or `deepseek/deepseek-coder`).

## Technical Root Cause

DeepWiki's `simple_chat.py` correctly uses the OpenRouterClient to send requests to OpenRouter, but the underlying integration with Google Generative AI doesn't handle the OpenRouter model format (`provider/model-name`). Although the OpenRouterClient has a direct integration with OpenRouter, the error suggests that somewhere in the model handling logic, the full model name with provider prefix is being passed to a Google GenAI component that expects a standard model name.

## Key Code Sections

### 1. From `/app/api/simple_chat.py` - Model Setup

```python
elif request.provider == "openrouter":
    logger.info(f"Using OpenRouter with model: {request.model}")

    # Check if OpenRouter API key is set
    if not os.environ.get("OPENROUTER_API_KEY"):
        logger.warning("OPENROUTER_API_KEY environment variable is not set, but continuing with request")
        # We'll let the OpenRouterClient handle this and return a friendly error message

    model = OpenRouterClient()
    model_kwargs = {
        "model": request.model,  # Here, request.model contains the full OpenRouter model name (e.g., anthropic/claude-3-7-sonnet)
        "stream": True,
        "temperature": model_config["temperature"],
        "top_p": model_config["top_p"]
    }

    api_kwargs = model.convert_inputs_to_api_kwargs(
        input=prompt,
        model_kwargs=model_kwargs,
        model_type=ModelType.LLM
    )
```

### 2. From `/app/api/simple_chat.py` - Response Stream

```python
# Create a streaming response
async def response_stream():
    try:
        if request.provider == "ollama":
            # Ollama handling...
        elif request.provider == "openai" or request.provider == "openrouter":
            # Get the response and handle it properly using the previously created api_kwargs
            response = await model.acall(api_kwargs=api_kwargs, model_type=ModelType.LLM)
            
            # Handle streaming response from Openai/OpenRouter
            async for chunk in response:
                if isinstance(chunk, str):
                    yield chunk
                else:
                    # Try to extract content from the chunk based on expected formats
                    text = getattr(chunk, 'content', None) or getattr(chunk, 'text', None) or str(chunk)
                    yield text
        else:
            # Initialize Google Generative AI model
            # This branch appears to be executed even for OpenRouter requests,
            # causing the model format error
            # ...
    except Exception as e_outer:
        logger.error(f"Error in streaming response: {str(e_outer)}")
        error_message = str(e_outer)
        # ...
```

### 3. From `/app/api/openrouter_client.py` - Key Parts

```python
def convert_inputs_to_api_kwargs(
    self, input: Any, model_kwargs: Dict = None, model_type: ModelType = None
) -> Dict:
    """Convert AdalFlow inputs to OpenRouter API format."""
    model_kwargs = model_kwargs or {}

    if model_type == ModelType.LLM:
        # Handle LLM generation
        messages = []

        # Convert input to messages format if it's a string
        if isinstance(input, str):
            messages = [{"role": "user", "content": input}]
        elif isinstance(input, list) and all(isinstance(msg, dict) for msg in input):
            messages = input
        else:
            raise ValueError(f"Unsupported input format for OpenRouter: {type(input)}")

        # For debugging
        log.info(f"Messages for OpenRouter: {messages}")

        api_kwargs = {
            "messages": messages,
            **model_kwargs
        }

        # Ensure model is specified
        if "model" not in api_kwargs:
            api_kwargs["model"] = "openai/gpt-3.5-turbo"

        return api_kwargs
```

## Error Log

```
Error in streaming response: 400 * GenerateContentRequest.model: unexpected model name format
```

This error is coming from Google's GenerativeAI when it tries to parse the OpenRouter model format.

## Research Questions

1. How can we modify DeepWiki to properly handle OpenRouter model formats?

2. Is there a configuration setting in DeepWiki that allows mapping between OpenRouter model formats and internal model names?

3. What's the best approach to patch the OpenRouterClient to prevent the model format error?

## Recommendations for Investigation

1. Look into modifying the `simple_chat.py` file to correctly handle the OpenRouter provider case and use the appropriate model initialization.

2. Check if the model_config mapping in DeepWiki can be updated to handle OpenRouter model formats.

3. Consider patching the OpenRouterClient implementation to strip the provider prefix before the model is passed to the underlying GenAI components.

4. Explore if DeepWiki has a plugin or extension system that would allow adding a custom model provider handler without modifying the core code.