#!/usr/bin/env python3

"""
Replace OpenRouter client in DeepWiki with a completely new implementation
This script creates a fixed version of openrouter_client.py
"""

import sys
import os

# New implementation of the OpenRouter client
NEW_OPENROUTER_CLIENT = '''
# IMPORTANT: This file has been completely replaced to fix OpenRouter integration

import json
import logging
import os
from typing import Any, Dict, Union, Optional, List, AsyncGenerator, Tuple

import aiohttp
import requests
from langchain_text_splitters import RecursiveCharacterTextSplitter

from adalflow.components.model_client.base import BaseModelClient, ModelType
from adalflow.types import LLMResponse, EmbeddingResponse, ToolsResponse

logger = logging.getLogger(__name__)

class OpenRouterClient(BaseModelClient):
    """OpenRouter Client for handling API calls to OpenRouter."""

    def __init__(self, api_key=None, base_url=None):
        """Initialize the OpenRouter client."""
        self.async_client = None
        self.api_key = api_key or self._get_api_key()
        self.base_url = base_url or self._get_base_url()

    def _get_api_key(self):
        """Get the API key for OpenRouter."""
        api_key = os.environ.get("OPENROUTER_API_KEY")
        if not api_key:
            logger.warning("OPENROUTER_API_KEY not found in environment variables")
        return api_key

    def _get_base_url(self):
        """Get the base URL for OpenRouter."""
        return os.environ.get("OPENROUTER_API_BASE", "https://openrouter.ai/api/v1")

    def init_async_client(self):
        """Initialize the async client."""
        return {
            "api_key": self.api_key,
            "base_url": self.base_url,
        }

    def ensure_model_prefix(self, model_name):
        """Ensure the model name has the provider prefix."""
        if not model_name:
            return "openai/gpt-3.5-turbo"
        
        # If the model name already has a prefix (contains "/"), return it unchanged
        if "/" in model_name:
            return model_name
        
        # Default to OpenAI prefix
        return f"openai/{model_name}"

    def convert_inputs_to_api_kwargs(
        self, input: Any, model_kwargs: Dict = None, model_type: ModelType = None
    ) -> Dict:
        """Convert AdalFlow inputs to OpenRouter API format."""
        model_kwargs = model_kwargs or {}

        if model_type == ModelType.LLM:
            # Handle LLM generation
            messages = []

            if isinstance(input, str):
                messages = [{"role": "user", "content": input}]
            elif isinstance(input, list):
                messages = input
            else:
                raise ValueError(
                    f"OpenRouter client expects string or list of messages, got {type(input)}"
                )

            # Convert to API kwargs
            api_kwargs = {
                "messages": messages,
                "stream": model_kwargs.get("stream", False),
            }

            # Copy additional parameters from model_kwargs
            for key in ["temperature", "top_p", "max_tokens", "presence_penalty", "frequency_penalty"]:
                if key in model_kwargs:
                    api_kwargs[key] = model_kwargs[key]

            # Ensure model is specified and has proper prefix
            if "model" not in api_kwargs:
                api_kwargs["model"] = "openai/gpt-3.5-turbo"
            else:
                api_kwargs["model"] = self.ensure_model_prefix(api_kwargs["model"])
            
            # Log the API kwargs for debugging
            logger.info(f"OpenRouter API kwargs: {api_kwargs}")

            return api_kwargs

        elif model_type == ModelType.EMBEDDING:
            # OpenRouter doesn't support embeddings directly
            # We could potentially use a specific model through OpenRouter for embeddings
            # but for now, we'll raise an error
            raise NotImplementedError("OpenRouter client does not support embeddings yet")

        else:
            raise ValueError(f"Unsupported model type: {model_type}")

    async def acall(self, api_kwargs: Dict = None, model_type: ModelType = None) -> Any:
        """Make an asynchronous call to the OpenRouter API."""
        if not self.async_client:
            self.async_client = self.init_async_client()

        # Check if API key is set
        if not self.async_client.get("api_key"):
            error_msg = "OPENROUTER_API_KEY not found in environment variables. Please set this environment variable to use OpenRouter."
            logger.error(error_msg)
            raise ValueError(error_msg)

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.async_client['api_key']}",
            "HTTP-Referer": "https://github.com/adalflow/adalflow",
            "X-Title": "AdalFlow with DeepWiki"
        }

        async with aiohttp.ClientSession(headers=headers) as session:
            url = f"{self.async_client['base_url']}/chat/completions"
            
            logger.info(f"Making OpenRouter API call to {url}")
            logger.info(f"Request headers: {headers}")
            logger.info(f"Request body: {api_kwargs}")
            
            # Log the model being used
            logger.info(f"Using model: {api_kwargs.get('model', 'default')}")
            
            is_streaming = api_kwargs.get("stream", False)

            if is_streaming:
                return self._handle_streaming_call(session, url, api_kwargs)
            else:
                async with session.post(url, json=api_kwargs) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"Error calling OpenRouter API: {error_text}")
                        raise ValueError(f"Error calling OpenRouter API: {error_text}")
                    
                    result = await response.json()
                    return result

    async def _handle_streaming_call(self, session, url, api_kwargs):
        """Handle a streaming call to the OpenRouter API."""
        try:
            async with session.post(url, json=api_kwargs) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"Error in streaming call to OpenRouter API: {error_text}")
                    raise ValueError(f"Error in streaming call to OpenRouter API: {error_text}")
                
                # Process the stream
                async for line in response.content:
                    line = line.decode('utf-8').strip()
                    if line.startswith('data: '):
                        data = line[6:]  # Remove 'data: ' prefix
                        if data == '[DONE]':
                            break
                        try:
                            json_data = json.loads(data)
                            yield json_data
                        except json.JSONDecodeError:
                            logger.error(f"Error decoding JSON: {data}")
                            continue
        except Exception as e:
            logger.error(f"Error in streaming call: {str(e)}")
            raise

    def call(self, api_kwargs: Dict = None, model_type: ModelType = None) -> Any:
        """Make a synchronous call to the OpenRouter API."""
        # Check if API key is set
        api_key = self._get_api_key()
        if not api_key:
            error_msg = "OPENROUTER_API_KEY not found in environment variables. Please set this environment variable to use OpenRouter."
            logger.error(error_msg)
            raise ValueError(error_msg)

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "HTTP-Referer": "https://github.com/adalflow/adalflow",
            "X-Title": "AdalFlow with DeepWiki"
        }

        url = f"{self.base_url}/chat/completions"
        
        # Log the model being used
        logger.info(f"Using model: {api_kwargs.get('model', 'default')}")
        
        response = requests.post(url, headers=headers, json=api_kwargs)
        
        if response.status_code != 200:
            logger.error(f"Error calling OpenRouter API: {response.text}")
            raise ValueError(f"Error calling OpenRouter API: {response.text}")
        
        return response.json()
'''

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 replace-openrouter-client.py <pod_name>")
        sys.exit(1)
    
    pod_name = sys.argv[1]
    
    # Write the new client to a temporary file
    with open('/tmp/new_openrouter_client.py', 'w') as f:
        f.write(NEW_OPENROUTER_CLIENT)
    
    print(f"Created new OpenRouter client implementation")
    
    # Copy it to the pod
    cmd = f"kubectl cp /tmp/new_openrouter_client.py codequal-dev/{pod_name}:/app/api/openrouter_client.py"
    print(f"Copying to pod: {cmd}")
    os.system(cmd)
    
    # Create the OpenRouter configuration
    print("Creating OpenRouter configuration")
    openrouter_config = """
enabled: true
api_key: ${OPENROUTER_API_KEY}
api_base: https://openrouter.ai/api/v1
embedding_model: text-embedding-ada-002
embedding_dimension: 1536

# Define models with correct naming format
models:
  - name: openai/gpt-4o
    max_tokens: 8192
    supports_functions: true
    supports_vision: true
  - name: anthropic/claude-3-7-sonnet
    max_tokens: 16384
    supports_functions: true
    supports_vision: true
  - name: anthropic/claude-3-opus
    max_tokens: 32768
    supports_functions: true
    supports_vision: true
  - name: deepseek/deepseek-coder
    max_tokens: 16384
    supports_functions: false
    supports_vision: false
"""
    
    with open('/tmp/openrouter.yaml', 'w') as f:
        f.write(openrouter_config)
    
    # Copy the configuration to the pod
    cmd = f"kubectl cp /tmp/openrouter.yaml codequal-dev/{pod_name}:/root/.adalflow/providers/openrouter.yaml"
    print(f"Copying configuration: {cmd}")
    os.system(cmd)
    
    # Reset the database
    print("Resetting database")
    cmd = f"kubectl exec -n codequal-dev {pod_name} -- bash -c \"rm -rf /root/.adalflow/data/* || true; mkdir -p /root/.adalflow/data; touch /root/.adalflow/data/.reset_marker\""
    os.system(cmd)
    
    print("OpenRouter client and configuration updated successfully")
    print("Please restart the pod to apply the changes")

if __name__ == "__main__":
    main()