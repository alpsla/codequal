#!/usr/bin/env python3

"""Test OpenRouter integration with a simple streaming request"""

import requests
import json
import sys

# Configuration
deepwiki_url = "http://localhost:8001"
model = "anthropic/claude-3-7-sonnet"

# Simple test message
messages = [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Say hello and identify which AI model you are."}
]

# Test with a simple request to avoid repo cloning issues
print("Testing DeepWiki with simple message...")
try:
    # Using the streaming endpoint which is /chat/completions/stream
    response = requests.post(
        f"{deepwiki_url}/chat/completions/stream",
        json={
            "model": model,
            "messages": messages,
            "max_tokens": 100,
            "temperature": 0.7,
            "stream": False  # Request it as non-streaming for simplicity
        },
        timeout=30
    )
    
    print(f"Status code: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 200:
        try:
            result = response.json()
            print("Test successful!")
            print("Response content:", result["choices"][0]["message"]["content"])
            sys.exit(0)
        except:
            print("Could not parse JSON response")
            sys.exit(1)
    else:
        print(f"Error: {response.status_code}")
        print("Response:", response.text)
        sys.exit(1)
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)