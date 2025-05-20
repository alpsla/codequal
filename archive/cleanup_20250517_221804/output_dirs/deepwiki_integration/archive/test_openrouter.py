#!/usr/bin/env python3
"""
Test script for verifying the DeepWiki OpenRouter integration.
"""
import os
import sys
import json
import time
import requests  # Added the missing import

def test_openrouter_integration():
    """Test the OpenRouter integration with various models."""
    print("=== Testing DeepWiki OpenRouter Integration ===")
    
    # Check API endpoint
    base_url = "http://localhost:8001"
    
    # Try to access the base URL
    try:
        response = requests.get(base_url)
        print(f"Base URL accessible: {response.status_code}")
    except Exception as e:
        print(f"Error accessing base URL: {str(e)}")
        print("Make sure port forwarding is set up correctly:")
        print("kubectl port-forward -n codequal-dev svc/deepwiki-api 8001:8001")
        return False
    
    # Test models
    models_to_test = [
        "anthropic/claude-3-5-sonnet",  # Default model
        "openai/gpt-4o",
        "google/gemini-1.5-pro",
        "deepseek/deepseek-coder"
    ]
    
    success_count = 0
    
    for model in models_to_test:
        print(f"\nTesting model: {model}")
        
        # Create payload
        payload = {
            "repo_url": "https://github.com/AsyncFuncAI/deepwiki-open",
            "messages": [
                {
                    "role": "user",
                    "content": "What is this repository about? Give a brief one-paragraph summary."
                }
            ],
            "stream": False,
            "provider": "openrouter",
            "model": model
        }
        
        try:
            # Make the request
            start_time = time.time()
            response = requests.post(
                f"{base_url}/chat/completions/stream",
                json=payload,
                timeout=30
            )
            duration = time.time() - start_time
            
            print(f"Status code: {response.status_code} (took {duration:.2f}s)")
            
            if response.status_code == 200:
                try:
                    result = response.json()
                    success_count += 1
                    print("Success! Response received.")
                    if isinstance(result, dict) and "message" in result:
                        content = result["message"].get("content", "")
                        preview = content[:150] + "..." if len(content) > 150 else content
                        print(f"Response preview: {preview}")
                except Exception as e:
                    print(f"Error parsing JSON response: {str(e)}")
                    print(f"Raw response: {response.text[:200]}...")
            else:
                print(f"Error: Received status code {response.status_code}")
                print(f"Response: {response.text[:200]}...")
        except Exception as e:
            print(f"Error making request: {str(e)}")
    
    # Print summary
    print(f"\n=== Test Summary ===")
    print(f"Models tested: {len(models_to_test)}")
    print(f"Successful: {success_count}")
    print(f"Failed: {len(models_to_test) - success_count}")
    
    if success_count == len(models_to_test):
        print("\n✅ All models are working correctly with OpenRouter!")
        return True
    elif success_count > 0:
        print("\n⚠️ Some models are working, but not all. Check the logs for details.")
        return True
    else:
        print("\n❌ All models failed. The OpenRouter integration is not working.")
        return False

if __name__ == "__main__":
    success = test_openrouter_integration()
    sys.exit(0 if success else 1)
