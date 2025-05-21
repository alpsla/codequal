#!/usr/bin/env python3

"""
Test with OpenRouter directly
"""

import os
import sys
import requests
import json

# Set API key from environment
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")
if not OPENROUTER_API_KEY:
    print("Error: OPENROUTER_API_KEY environment variable not set")
    sys.exit(1)

print(f"Using OpenRouter API key: {OPENROUTER_API_KEY[:5]}...")

# Function to test a model
def test_model(model):
    print(f"\nTesting model: {model}")
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "HTTP-Referer": "https://github.com/your-username/your-repo",
        "X-Title": "Model Test"
    }
    
    data = {
        "model": model,
        "messages": [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Say hello and identify which model you are."}
        ],
        "max_tokens": 100
    }
    
    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=data
        )
        
        if response.status_code == 200:
            result = response.json()
            print("  Status: SUCCESS")
            print(f"  Response: {result['choices'][0]['message']['content']}")
            return True
        else:
            print(f"  Status: FAILED ({response.status_code})")
            print(f"  Error: {response.text}")
            return False
    
    except Exception as e:
        print(f"  Error: {e}")
        return False

# Test models
models_to_test = [
    "openai/gpt-4o",
    "anthropic/claude-3-7-sonnet",
    "deepseek/deepseek-coder"
]

results = {}

for model in models_to_test:
    results[model] = test_model(model)

# Summary
print("\n=== TEST RESULTS ===")
for model, success in results.items():
    status = "✓" if success else "✗"
    print(f"{status} {model}")

# Recommend working models
working_models = [model for model, success in results.items() if success]
if working_models:
    print("\nWorking models for OpenRouter:")
    for model in working_models:
        print(f"- {model}")
    print("\nRecommendation: Use these models with the OpenRouter integration")
else:
    print("\nNo models are working. Check API key and try again.")