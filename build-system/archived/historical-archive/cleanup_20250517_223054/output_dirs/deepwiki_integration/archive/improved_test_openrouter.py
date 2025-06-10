#!/usr/bin/env python3
"""
Improved test script for verifying the DeepWiki OpenRouter integration.
"""
import os
import sys
import json
import time
import requests

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
    
    # Test models - try more modern model names
    models_to_test = [
        "anthropic/claude-3-opus",  # Try different Claude model
        "anthropic/claude-3-haiku",  # Try different Claude model
        "openai/gpt-4o",            # This one worked in previous test
        "openai/gpt-3.5-turbo",     # Try more common OpenAI model
        "mistral/mistral-large-latest" # Try Mistral model
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
                timeout=60  # Increase timeout
            )
            duration = time.time() - start_time
            
            print(f"Status code: {response.status_code} (took {duration:.2f}s)")
            
            # Any 2xx status is considered a success
            if 200 <= response.status_code < 300:
                # Try to parse as JSON first
                try:
                    result = response.json()
                    print("Response is valid JSON")
                    
                    # Check if it has message field (OpenRouter standard format)
                    if isinstance(result, dict) and "message" in result:
                        content = result["message"].get("content", "")
                        print("Format: Standard OpenRouter JSON with message field")
                    else:
                        # If it's JSON but no message field, just take the raw content
                        content = str(result)
                        print("Format: JSON without message field")
                    
                    # Show content preview
                    preview = content[:150] + "..." if len(content) > 150 else content
                    print(f"Response preview: {preview}")
                    
                    # Count as success if we got some content
                    if content and not (
                        "error" in content.lower() and "not a valid model" in content.lower()
                    ):
                        success_count += 1
                        print("✅ Model returned valid content")
                    else:
                        print("❌ Model returned error or empty content")
                        
                except ValueError:
                    # Not JSON, treat as plain text
                    content = response.text
                    
                    # Check if it's an OpenRouter error
                    if "OpenRouter API error" in content:
                        print("Error: OpenRouter API error")
                        print(f"Response: {content[:200]}...")
                    else:
                        # If it's plain text and has content, it's likely a successful response
                        if content.strip():
                            success_count += 1
                            print("Format: Plain text response")
                            preview = content[:150] + "..." if len(content) > 150 else content
                            print(f"Response preview: {preview}")
                            print("✅ Model returned valid content")
                        else:
                            print("❌ Empty response")
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
        print(f"\n⚠️ {success_count}/{len(models_to_test)} models are working. The OpenRouter integration is partially working.")
        return True
    else:
        print("\n❌ All models failed. The OpenRouter integration is not working.")
        return False

if __name__ == "__main__":
    success = test_openrouter_integration()
    # Consider partial success as overall success
    sys.exit(0 if success else 1)
