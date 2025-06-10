#!/usr/bin/env python3
# Comprehensive DeepWiki direct API test

import requests
import json
import os
import sys
import time

def test_deepwiki_api():
    """Comprehensive test of DeepWiki API functionality"""
    print("DeepWiki Comprehensive API Test")
    print("=============================")
    
    # Get API key from environment
    api_key = os.environ.get("DEEPSEEK_API_KEY", "mock-key-for-testing")
    
    # Try both internal and external URLs
    urls = [
        "http://localhost:8001",             # For port-forwarded access
        "http://deepwiki-api:8001",          # For in-cluster service
        "http://deepwiki-fixed:8001",        # For fixed service
        "http://127.0.0.1:8001"              # Alternative localhost
    ]
    
    api_url = None
    
    for url in urls:
        print(f"\nTrying URL: {url}")
        try:
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                print(f"✅ Connected to {url}")
                api_url = url
                endpoints = response.json().get("endpoints", {})
                print("\nAvailable endpoint categories:")
                for category, endpoints_list in endpoints.items():
                    print(f"- {category}:")
                    for endpoint in endpoints_list:
                        print(f"  • {endpoint}")
                break
            else:
                print(f"❌ Failed with status {response.status_code}")
        except Exception as e:
            print(f"❌ Connection error: {e}")
    
    if not api_url:
        print("\nFailed to connect to DeepWiki API")
        return None
    
    # Test repository analysis - try different repositories
    test_repositories = [
        {
            "name": "Small repo",
            "url": "https://github.com/microsoft/fluentui-emoji"
        },
        {
            "name": "Medium repo",
            "url": "https://github.com/microsoft/vscode-extension-samples"
        }
    ]
    
    for repo in test_repositories:
        print(f"\n\nTesting repository analysis for {repo['name']}: {repo['url']}")
        print("=" * 50)
        
        # Test with different providers
        providers = ["openai", "anthropic", "google", "deepseek"]
        
        for provider in providers:
            # Set model based on provider
            if provider == "openai":
                model = "gpt-4o"
            elif provider == "anthropic":
                model = "claude-3-7-sonnet"
            elif provider == "google":
                model = "gemini-2.5-pro-preview-05-06"
            elif provider == "deepseek":
                model = "deepseek-coder"
            else:
                model = "default"
            
            print(f"\nTesting provider: {provider} / {model}")
            
            # Create a standard test payload
            payload = {
                "provider": provider,
                "model": model,
                "messages": [
                    {"role": "system", "content": "You are a helpful code assistant."},
                    {"role": "user", "content": "Describe this repository briefly. What is its purpose?"}
                ],
                "repo_url": repo["url"],
                "max_tokens": 150,
                "stream": True
            }
            
            # Test the chat completion endpoint
            print(f"Sending request to {api_url}/chat/completions/stream")
            start_time = time.time()
            
            try:
                response = requests.post(
                    f"{api_url}/chat/completions/stream",
                    json=payload,
                    timeout=120,
                    headers={"Content-Type": "application/json"}
                )
                
                elapsed = time.time() - start_time
                print(f"Response received in {elapsed:.2f} seconds")
                print(f"Status code: {response.status_code}")
                
                if response.status_code >= 200 and response.status_code < 300:
                    print("✅ Request successful")
                    
                    # Parse response
                    try:
                        response_text = response.text
                        print(f"Response preview: {response_text[:200]}...")
                        
                        # Extract timing information
                        total_time = elapsed
                        print(f"\nPerformance metrics:")
                        print(f"- Total response time: {total_time:.2f} seconds")
                    except Exception as e:
                        print(f"Error processing response: {e}")
                else:
                    print(f"❌ Request failed with status {response.status_code}")
                    try:
                        error_content = response.json()
                        print(f"Error details: {json.dumps(error_content, indent=2)}")
                    except:
                        print(f"Error content: {response.text}")
            except Exception as e:
                print(f"❌ Request error: {e}")
    
    # Test export/wiki endpoint
    print("\n\nTesting /export/wiki endpoint")
    print("=" * 50)
    
    export_payload = {
        "repo_url": test_repositories[0]["url"],
        "format": "markdown"
    }
    
    try:
        response = requests.post(
            f"{api_url}/export/wiki",
            json=export_payload,
            timeout=120,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status code: {response.status_code}")
        
        if response.status_code >= 200 and response.status_code < 300:
            print("✅ Wiki export successful")
            try:
                wiki_content = response.json()
                print(f"Wiki content preview: {json.dumps(wiki_content)[:200]}...")
            except:
                print(f"Content preview: {response.text[:200]}...")
        else:
            print(f"❌ Wiki export failed with status {response.status_code}")
            try:
                error_content = response.json()
                print(f"Error details: {json.dumps(error_content, indent=2)}")
            except:
                print(f"Error content: {response.text}")
    except Exception as e:
        print(f"❌ Wiki export error: {e}")
    
    # Generate analysis results for implementation guide
    print("\n\nDeepWikiKubernetesService Implementation Guide")
    print("==========================================")
    print("Based on this testing, here are the key components for implementing DeepWikiKubernetesService:\n")
    
    print("1. API Endpoints:")
    print("   - Base URL: " + api_url)
    print("   - Chat Completion: POST /chat/completions/stream")
    print("   - Wiki Export: POST /export/wiki")
    
    print("\n2. Required Parameters:")
    print("   - provider: The LLM provider (openai, anthropic, google, deepseek)")
    print("   - model: The specific model to use")
    print("   - repo_url: GitHub repository URL (with https://github.com/ prefix)")
    print("   - messages: Array of message objects with role and content")
    print("   - max_tokens: Maximum tokens to generate")
    print("   - stream: Boolean (set to true)")
    
    print("\n3. Response Handling:")
    print("   - Responses are in text format")
    print("   - Proper error handling is needed for different status codes")
    print("   - Timeouts should be set to at least 120 seconds for larger repositories")
    
    print("\n4. Provider Configuration:")
    print("   - Each provider requires proper configuration in the DeepWiki pod")
    print("   - Use fix-deepwiki-providers.sh to set up provider configurations")
    
    return {
        "api_url": api_url,
        "endpoints": {
            "chat_completion": f"{api_url}/chat/completions/stream",
            "wiki_export": f"{api_url}/export/wiki"
        },
        "parameters": {
            "required": ["provider", "model", "repo_url", "messages"],
            "optional": ["max_tokens", "stream", "temperature"]
        }
    }

def main():
    api_info = test_deepwiki_api()
    
    if api_info:
        print("\nDeepWiki API testing completed successfully")
        print(f"API URL for DeepWikiKubernetesService: {api_info['api_url']}")
    else:
        print("\nDeepWiki API testing failed")
        print("Check DeepWiki pod status and networking")

if __name__ == "__main__":
    main()