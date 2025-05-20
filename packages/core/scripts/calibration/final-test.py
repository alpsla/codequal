#!/usr/bin/env python3

"""
Final test script for OpenRouter integration
This script tests the DeepWiki API with OpenRouter using a small repository
"""

import requests
import json
import sys
import time

# Configuration
deepwiki_url = "http://localhost:8001"
model = "anthropic/claude-3-7-sonnet"
repo_url = "https://github.com/jpadilla/pyjwt"

# Simple test message
messages = [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Please provide a very brief (1-2 sentences) summary of what this repository does."}
]

def test_with_repository():
    """Test the OpenRouter integration using a repository analysis"""
    print(f"Testing with model: {model}")
    print(f"Repository URL: {repo_url}")
    
    try:
        response = requests.post(
            f"{deepwiki_url}/chat/completions/stream",
            json={
                "model": model,
                "repo_url": repo_url,
                "messages": messages,
                "max_tokens": 100,
                "temperature": 0.7,
                "stream": False  # Request it as non-streaming for simplicity
            },
            timeout=60
        )
        
        print(f"Status code: {response.status_code}")
        
        if response.status_code == 200:
            try:
                result = response.json()
                print("\nTest successful!")
                print("Response content:", result["choices"][0]["message"]["content"])
                return True
            except Exception as e:
                print(f"Could not parse JSON response: {e}")
                print("Response:", response.text)
                return False
        else:
            print(f"Error: {response.status_code}")
            print("Response:", response.text)
            return False
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    print("Final OpenRouter Integration Test")
    print("================================")
    
    success = test_with_repository()
    
    if success:
        print("\nTest completed successfully! The OpenRouter integration is working.")
        sys.exit(0)
    else:
        print("\nTest failed. Please check the error messages above.")
        sys.exit(1)