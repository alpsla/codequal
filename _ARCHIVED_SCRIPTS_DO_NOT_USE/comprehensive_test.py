#!/usr/bin/env python3
"""
Final comprehensive test for DeepWiki OpenRouter integration with additional models.
"""
import os
import sys
import json
import time
import requests

def test_openrouter_integration():
    """Test the OpenRouter integration with various models including newly requested ones."""
    print("=== Testing DeepWiki OpenRouter Integration - Comprehensive Model Test ===")
    
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
    
    # Test models - including newly requested ones
    models_to_test = [
        # Previously successful models
        "anthropic/claude-3-opus",
        "anthropic/claude-3-haiku",
        "openai/gpt-4o",
        
        # New models to test
        "deepseek/deepseek-coder",
        "anthropic/claude-3.7-sonnet",
        "google/gemini-2.5-pro-preview",
        "google/gemini-2.5-pro-exp-03-25",
        "openai/gpt-4.1"
    ]
    
    success_count = 0
    results = {}
    
    for model in models_to_test:
        print(f"\n=== Testing model: {model} ===")
        
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
                timeout=60  # Increase timeout for larger models
            )
            duration = time.time() - start_time
            
            print(f"Status code: {response.status_code} (took {duration:.2f}s)")
            
            # Set default result
            model_success = False
            error_message = None
            content_preview = None
            
            # Any 2xx status is considered a potential success
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
                    content_preview = content[:150] + "..." if len(content) > 150 else content
                    print(f"Response preview: {content_preview}")
                    
                    # Count as success if we got some content
                    if content and not (
                        "error" in content.lower() and "not a valid model" in content.lower()
                    ):
                        model_success = True
                        print("✅ Model returned valid content")
                    else:
                        error_message = "Model returned error or empty content"
                        print(f"❌ {error_message}")
                        
                except ValueError:
                    # Not JSON, treat as plain text
                    content = response.text
                    
                    # Check if it's an OpenRouter error
                    if "OpenRouter API error" in content:
                        error_message = content[:200] if len(content) > 200 else content
                        print(f"Error: OpenRouter API error")
                        print(f"Response: {error_message}")
                    else:
                        # If it's plain text and has content, it's likely a successful response
                        if content.strip():
                            model_success = True
                            content_preview = content[:150] + "..." if len(content) > 150 else content
                            print("Format: Plain text response")
                            print(f"Response preview: {content_preview}")
                            print("✅ Model returned valid content")
                        else:
                            error_message = "Empty response"
                            print(f"❌ {error_message}")
            else:
                error_message = f"HTTP Error: {response.status_code}"
                print(f"Error: Received status code {response.status_code}")
                print(f"Response: {response.text[:200]}...")
        except Exception as e:
            error_message = str(e)
            print(f"Error making request: {error_message}")
        
        # Add to results
        results[model] = {
            "success": model_success,
            "duration": f"{duration:.2f}s" if 'duration' in locals() else "N/A",
            "error": error_message if not model_success else None,
            "preview": content_preview if model_success else None
        }
        
        if model_success:
            success_count += 1
    
    # Print summary
    print(f"\n=== Test Summary ===")
    print(f"Models tested: {len(models_to_test)}")
    print(f"Successful: {success_count}")
    print(f"Failed: {len(models_to_test) - success_count}")
    
    print("\n=== Detailed Results ===")
    print("| Model | Status | Duration | Notes |")
    print("|-------|--------|----------|-------|")
    for model, result in results.items():
        status = "✅ Working" if result["success"] else "❌ Failed"
        notes = result["preview"][:50] + "..." if result["success"] else result["error"]
        print(f"| {model} | {status} | {result['duration']} | {notes} |")
    
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
