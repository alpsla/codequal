#!/usr/bin/env python3

"""
Test script for Claude via OpenRouter
This script directly tests the Claude model via OpenRouter without going through DeepWiki
"""

import requests
import json
import sys
import os

# Get API key from environment
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY") or "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"
MODEL = "anthropic/claude-3-7-sonnet"
REPO_URL = "https://github.com/jpadilla/pyjwt"

def test_openrouter_direct():
    """Test OpenRouter API directly"""
    print(f"Testing OpenRouter API directly with model: {MODEL}")

    messages = [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": f"Please analyze this GitHub repository: {REPO_URL} and provide a very brief (1-2 sentences) summary of what it does."}
    ]

    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            json={
                "model": MODEL,
                "messages": messages,
                "max_tokens": 100,
                "temperature": 0.7
            },
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "HTTP-Referer": "https://github.com/your-username/your-repo",
                "X-Title": "DeepWiki Integration Test"
            },
            timeout=30
        )

        print(f"Status code: {response.status_code}")

        if response.status_code == 200:
            result = response.json()
            print("\nTest successful!")
            print("Response:", result["choices"][0]["message"]["content"])
            return True
        else:
            print(f"Error: {response.status_code}")
            print("Response:", response.text)
            return False
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    print("Claude via OpenRouter Direct Test")
    print("================================")

    success = test_openrouter_direct()

    if success:
        print("\nDirect test completed successfully!")
        sys.exit(0)
    else:
        print("\nDirect test failed.")
        sys.exit(1)